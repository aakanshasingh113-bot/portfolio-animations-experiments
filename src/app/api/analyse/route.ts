import { createHash } from "node:crypto";
import { analyseBrief } from "@/lib/analyse";
import { analyseBriefGemini } from "@/lib/analyse-gemini";
import { handleAnalyse } from "@/lib/analyse-handler";
import { getServerConfig } from "@/lib/config";
import {
  createMemoryLimiter,
  createUpstashLimiter,
  limitSettings,
  upstashCredentials,
  type UsageLimiter,
} from "@/lib/rate-limit";

export const maxDuration = 120;

let limiter: UsageLimiter | null = null;

function getLimiter(kind: "shared" | "memory"): UsageLimiter {
  if (limiter?.kind === kind) return limiter;
  const settings = limitSettings(process.env);
  const credentials = upstashCredentials(process.env);
  limiter =
    kind === "shared" && credentials
      ? createUpstashLimiter(credentials, settings)
      : createMemoryLimiter(settings);
  return limiter;
}

/** A hashed client address, so raw IP addresses are not stored in the limiter. */
function clientId(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(address).digest("hex").slice(0, 32);
}

export async function POST(request: Request): Promise<Response> {
  const config = getServerConfig();
  const apiKey = config.apiKey;
  const live = config.mode === "live" && apiKey !== null;

  return handleAnalyse(request, {
    live,
    limiter: live && config.limiter !== "none" ? getLimiter(config.limiter) : null,
    clientId: clientId(request),
    analyse: (brief, signal) =>
      (config.provider === "gemini" ? analyseBriefGemini : analyseBrief)(brief, {
        apiKey: apiKey ?? "",
        model: config.model,
        signal,
      }),
    // Codes only. Request bodies and model output are never logged.
    log: (code) => console.error(`[analyse] ${code}`),
  });
}
