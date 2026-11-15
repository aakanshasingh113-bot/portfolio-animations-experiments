import { AnalyseError } from "./analyse";
import type { ErrorCode } from "./errors";
import { normaliseAnalysis } from "./normalise";
import type { UsageLimiter } from "./rate-limit";
import { AnalyseRequestSchema, MAX_BODY_BYTES, MAX_BRIEF_CHARS } from "./schema";

export interface AnalyseDeps {
  /** Whether live analysis is available on this deployment. */
  live: boolean;
  limiter: UsageLimiter | null;
  clientId: string;
  /** Performs the single billable provider request. */
  analyse: (brief: string, signal: AbortSignal) => Promise<unknown>;
  /** Receives an error code only — never request or response content. */
  log?: (code: string) => void;
}

function fail(code: ErrorCode, status: number, headers?: HeadersInit): Response {
  return Response.json({ error: code }, { status, headers });
}

/**
 * POST /api/analyse. Order matters: cheap validation first, then request
 * limits, and only then the billable provider call.
 */
export async function handleAnalyse(request: Request, deps: AnalyseDeps): Promise<Response> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    return fail("bad_request", 415);

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return fail("too_long", 413);

  let body: string;
  try {
    body = await request.text();
  } catch {
    return fail("bad_request", 400);
  }
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES)
    return fail("too_long", 413);

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return fail("bad_request", 400);
  }
  const parsed = AnalyseRequestSchema.safeParse(json);
  if (!parsed.success) return fail("bad_request", 400);

  const brief = parsed.data.brief;
  if (brief.trim().length === 0) return fail("empty_input", 400);
  if (brief.length > MAX_BRIEF_CHARS) return fail("too_long", 413);

  if (!deps.live) return fail("not_configured", 503);

  if (deps.limiter) {
    try {
      const decision = await deps.limiter.check(deps.clientId);
      if (!decision.ok)
        return fail(decision.reason, 429, {
          "Retry-After": String(decision.retryAfterSeconds),
        });
    } catch {
      // Fail closed: if limits cannot be checked, do not spend money.
      deps.log?.("limiter_unavailable");
      return fail("unknown", 503);
    }
  }

  let raw: unknown;
  try {
    raw = await deps.analyse(brief, request.signal);
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    const code: ErrorCode = error instanceof AnalyseError ? error.code : "unknown";
    deps.log?.(code);
    const status =
      code === "provider_rate_limited" ? 429
      : code === "provider_timeout" ? 504
      : code === "declined" ? 422
      : 502;
    return fail(code, status);
  }

  const result = normaliseAnalysis(raw, brief);
  if (!result.ok) {
    deps.log?.(`invalid_response:${result.reason}`);
    return fail("invalid_response", 502);
  }
  return Response.json({ analysis: result.analysis }, { headers: { "Cache-Control": "no-store" } });
}
