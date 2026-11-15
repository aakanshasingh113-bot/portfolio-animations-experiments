import type { Mode } from "./schema";
import { upstashCredentials } from "./rate-limit";

export const DEFAULT_MODEL = "claude-opus-5-5";

export interface ServerConfig {
  mode: Mode;
  apiKey: string | null;
  model: string;
  /** Which request limiter live mode uses. "none" only in demo mode. */
  limiter: "shared" | "memory" | "none";
}

type Env = Record<string, string | undefined>;

/**
 * Decide what this deployment can honestly offer.
 *
 * Live analysis needs an API key. In production it also needs a shared
 * request-limit store, because an in-memory counter cannot protect a public,
 * billable endpoint. Without one the app stays in curated demo mode unless
 * the operator explicitly opts in with ALLOW_UNMETERED_LIVE=true (for
 * private deployments only).
 */
export function getServerConfig(env: Env = process.env): ServerConfig {
  const apiKey = env.ANTHROPIC_API_KEY?.trim() || null;
  const model = env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
  const demo: ServerConfig = { mode: "demo", apiKey: null, model, limiter: "none" };

  if (!apiKey) return demo;
  if (upstashCredentials(env)) return { mode: "live", apiKey, model, limiter: "shared" };
  if (env.NODE_ENV !== "production" || env.ALLOW_UNMETERED_LIVE === "true")
    return { mode: "live", apiKey, model, limiter: "memory" };
  return demo;
}
