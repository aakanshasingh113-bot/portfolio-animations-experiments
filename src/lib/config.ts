import type { Mode } from "./schema";
import { upstashCredentials } from "./rate-limit";

export const DEFAULT_MODEL = "claude-opus-5-5";
export const DEFAULT_GEMINI_MODEL = "gemini-4-hydrogen";

export type Provider = "anthropic" | "gemini";

export interface ServerConfig {
  mode: Mode;
  provider: Provider;
  apiKey: string | null;
  model: string;
  /** Which request limiter live mode uses. "none" only in demo mode. */
  limiter: "shared" | "memory" | "none";
}

type Env = Record<string, string | undefined>;

/**
 * Decide what this deployment can honestly offer.
 *
 * Live analysis needs an API key: ANTHROPIC_API_KEY (Claude) or
 * GEMINI_API_KEY (Google Gemini). If both are set, Claude is used.
 * In production it also needs a shared request-limit store, because an
 * in-memory counter cannot protect a public endpoint. Without one the app
 * stays in curated demo mode unless the operator explicitly opts in with
 * ALLOW_UNMETERED_LIVE=true.
 */
export function getServerConfig(env: Env = process.env): ServerConfig {
  const anthropicKey = env.ANTHROPIC_API_KEY?.trim() || null;
  const geminiKey = env.GEMINI_API_KEY?.trim() || null;

  const provider: Provider = anthropicKey || !geminiKey ? "anthropic" : "gemini";
  const apiKey = provider === "anthropic" ? anthropicKey : geminiKey;
  const model =
    provider === "anthropic"
      ? env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL
      : env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const demo: ServerConfig = { mode: "demo", provider, apiKey: null, model, limiter: "none" };

  if (!apiKey) return demo;
  if (upstashCredentials(env)) return { mode: "live", provider, apiKey, model, limiter: "shared" };
  if (env.NODE_ENV !== "production" || env.ALLOW_UNMETERED_LIVE === "true")
    return { mode: "live", provider, apiKey, model, limiter: "memory" };
  return demo;
}
