import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type LimitDecision =
  | { ok: true }
  | { ok: false; reason: "rate_limited" | "usage_cap"; retryAfterSeconds: number };

export interface UsageLimiter {
  /**
   * "shared" limits hold across server instances. "memory" limits apply to a
   * single process only and are not a reliable production safeguard.
   */
  kind: "shared" | "memory";
  check(clientId: string): Promise<LimitDecision>;
}

export interface LimitSettings {
  /** Requests each client may make per minute. */
  perMinute: number;
  /** Total live analyses allowed per day across all clients. */
  dailyCap: number;
}

export const DEFAULT_LIMITS: LimitSettings = { perMinute: 5, dailyCap: 200 };

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function limitSettings(env: Record<string, string | undefined>): LimitSettings {
  return {
    perMinute: positiveInt(env.RATE_LIMIT_PER_MINUTE, DEFAULT_LIMITS.perMinute),
    dailyCap: positiveInt(env.DAILY_REQUEST_CAP, DEFAULT_LIMITS.dailyCap),
  };
}

const MINUTE = 60_000;
const DAY = 86_400_000;

/**
 * Single-process limiter for local development and tests. Counters live in
 * this process's memory, so they reset on restart and are not shared between
 * serverless instances. Do not rely on it to protect a public deployment.
 */
export function createMemoryLimiter(
  settings: LimitSettings,
  now: () => number = Date.now,
): UsageLimiter {
  const clients = new Map<string, { windowStart: number; count: number }>();
  let day = { windowStart: now(), count: 0 };

  return {
    kind: "memory",
    async check(clientId) {
      const t = now();
      if (t - day.windowStart >= DAY) day = { windowStart: t, count: 0 };

      let entry = clients.get(clientId);
      if (!entry || t - entry.windowStart >= MINUTE) {
        entry = { windowStart: t, count: 0 };
        clients.set(clientId, entry);
      }
      if (entry.count >= settings.perMinute) {
        return {
          ok: false,
          reason: "rate_limited",
          retryAfterSeconds: Math.ceil((entry.windowStart + MINUTE - t) / 1000),
        };
      }
      // The per-client check comes first so a blocked client cannot use up
      // the shared daily allowance.
      if (day.count >= settings.dailyCap) {
        return {
          ok: false,
          reason: "usage_cap",
          retryAfterSeconds: Math.ceil((day.windowStart + DAY - t) / 1000),
        };
      }
      entry.count += 1;
      day.count += 1;
      if (clients.size > 5_000) {
        for (const [key, value] of clients)
          if (t - value.windowStart >= MINUTE) clients.delete(key);
      }
      return { ok: true };
    },
  };
}

export interface UpstashCredentials {
  url: string;
  token: string;
}

/** Reads Upstash Redis credentials (either naming used by Vercel's integration). */
export function upstashCredentials(
  env: Record<string, string | undefined>,
): UpstashCredentials | null {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

/** Limiter backed by Upstash Redis, shared across every server instance. */
export function createUpstashLimiter(
  credentials: UpstashCredentials,
  settings: LimitSettings,
): UsageLimiter {
  const redis = new Redis(credentials);
  const perClient = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(settings.perMinute, "60 s"),
    prefix: "brief-decoder:client",
  });
  const daily = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(settings.dailyCap, "1 d"),
    prefix: "brief-decoder:daily",
  });
  const secondsUntil = (reset: number) =>
    Math.max(1, Math.ceil((reset - Date.now()) / 1000));

  return {
    kind: "shared",
    async check(clientId) {
      const client = await perClient.limit(clientId);
      if (!client.success)
        return {
          ok: false,
          reason: "rate_limited",
          retryAfterSeconds: secondsUntil(client.reset),
        };
      const total = await daily.limit("all");
      if (!total.success)
        return {
          ok: false,
          reason: "usage_cap",
          retryAfterSeconds: secondsUntil(total.reset),
        };
      return { ok: true };
    },
  };
}
