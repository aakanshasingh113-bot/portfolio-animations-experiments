import { describe, expect, it, vi } from "vitest";
import { AnalyseError } from "@/lib/analyse";
import { handleAnalyse, type AnalyseDeps } from "@/lib/analyse-handler";
import { DEMO_EXAMPLES } from "@/lib/demo";
import { createMemoryLimiter } from "@/lib/rate-limit";
import { MAX_BRIEF_CHARS } from "@/lib/schema";

const example = DEMO_EXAMPLES[1];

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/analyse", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function deps(overrides: Partial<AnalyseDeps> = {}): AnalyseDeps {
  return {
    live: true,
    limiter: null,
    clientId: "client-a",
    analyse: vi.fn(async () => example.output),
    ...overrides,
  };
}

async function errorOf(response: Response) {
  return ((await response.json()) as { error: string }).error;
}

describe("input validation", () => {
  it("rejects an empty brief without calling the provider", async () => {
    const d = deps();
    const response = await handleAnalyse(post({ brief: "   \n " }), d);
    expect(response.status).toBe(400);
    expect(await errorOf(response)).toBe("empty_input");
    expect(d.analyse).not.toHaveBeenCalled();
  });

  it("rejects an oversized brief rather than truncating it", async () => {
    const d = deps();
    const response = await handleAnalyse(post({ brief: "a".repeat(MAX_BRIEF_CHARS + 1) }), d);
    expect(response.status).toBe(413);
    expect(await errorOf(response)).toBe("too_long");
    expect(d.analyse).not.toHaveBeenCalled();
  });

  it("accepts a brief exactly at the limit and a very short one", async () => {
    const atLimit = "a".repeat(MAX_BRIEF_CHARS);
    const analyse = vi.fn(async () => ({ ...example.output, statedRequirements: [], ambiguities: [], conflicts: [] }));
    expect((await handleAnalyse(post({ brief: atLimit }), deps({ analyse }))).status).toBe(200);
    expect(analyse).toHaveBeenCalledWith(atLimit, expect.anything());
    expect((await handleAnalyse(post({ brief: "Fix nav" }), deps({ analyse }))).status).toBe(200);
  });

  it("rejects an oversized request body", async () => {
    const response = await handleAnalyse(post({ brief: "é".repeat(40_000) }), deps());
    expect(response.status).toBe(413);
  });

  it("rejects malformed JSON, wrong shapes and wrong content types", async () => {
    expect(await errorOf(await handleAnalyse(post("{not json"), deps()))).toBe("bad_request");
    expect(await errorOf(await handleAnalyse(post({ brief: 42 }), deps()))).toBe("bad_request");
    const text = await handleAnalyse(post("hello", { "content-type": "text/plain" }), deps());
    expect(text.status).toBe(415);
  });
});

describe("missing API configuration", () => {
  it("reports that live analysis is not configured and makes no provider call", async () => {
    const d = deps({ live: false });
    const response = await handleAnalyse(post({ brief: example.brief }), d);
    expect(response.status).toBe(503);
    expect(await errorOf(response)).toBe("not_configured");
    expect(d.analyse).not.toHaveBeenCalled();
  });
});

describe("request limits", () => {
  it("blocks a client over the per-minute limit before any billable call", async () => {
    const d = deps({ limiter: createMemoryLimiter({ perMinute: 2, dailyCap: 100 }) });
    const send = () => handleAnalyse(post({ brief: example.brief }), d);
    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(200);
    const blocked = await send();
    expect(blocked.status).toBe(429);
    expect(await errorOf(blocked)).toBe("rate_limited");
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(d.analyse).toHaveBeenCalledTimes(2);
  });

  it("enforces the overall usage cap across clients", async () => {
    const limiter = createMemoryLimiter({ perMinute: 10, dailyCap: 2 });
    const send = (clientId: string) =>
      handleAnalyse(post({ brief: example.brief }), deps({ limiter, clientId }));
    expect((await send("a")).status).toBe(200);
    expect((await send("b")).status).toBe(200);
    const capped = await send("c");
    expect(capped.status).toBe(429);
    expect(await errorOf(capped)).toBe("usage_cap");
  });

  it("does not count invalid requests against the limit", async () => {
    const d = deps({ limiter: createMemoryLimiter({ perMinute: 1, dailyCap: 100 }) });
    await handleAnalyse(post({ brief: "" }), d);
    expect((await handleAnalyse(post({ brief: example.brief }), d)).status).toBe(200);
  });

  it("fails closed when the limit store cannot be reached", async () => {
    const d = deps({
      limiter: { kind: "shared", check: async () => { throw new Error("store down"); } },
    });
    const response = await handleAnalyse(post({ brief: example.brief }), d);
    expect(response.status).toBe(503);
    expect(d.analyse).not.toHaveBeenCalled();
  });
});

describe("provider and output handling", () => {
  it("returns a validated analysis with verified quotes", async () => {
    const response = await handleAnalyse(post({ brief: example.brief }), deps());
    expect(response.status).toBe(200);
    const { analysis } = (await response.json()) as { analysis: { statedRequirements: { id: string; source: { verified: boolean } }[] } };
    expect(analysis.statedRequirements.length).toBeGreaterThan(0);
    expect(analysis.statedRequirements.every((r) => r.source.verified)).toBe(true);
    expect(analysis.statedRequirements[0].id).toBe("req-1");
  });

  it.each([
    ["a string", "Sure! Here is the analysis…"],
    ["a wrong shape", { summary: "x", statedRequirements: "none" }],
    ["null", null],
    ["an over-long field", { ...example.output, summary: "x".repeat(5000) }],
  ])("returns invalid_response for malformed output (%s) and no fallback analysis", async (_, output) => {
    const response = await handleAnalyse(post({ brief: example.brief }), deps({ analyse: async () => output }));
    expect(response.status).toBe(502);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ error: "invalid_response" });
  });

  it.each([
    ["provider_timeout", 504],
    ["provider_rate_limited", 429],
    ["provider_unavailable", 502],
    ["declined", 422],
  ] as const)("maps %s to a safe error code", async (code, status) => {
    const response = await handleAnalyse(
      post({ brief: example.brief }),
      deps({ analyse: async () => { throw new AnalyseError(code); } }),
    );
    expect(response.status).toBe(status);
    expect(await errorOf(response)).toBe(code);
  });

  it("never leaks internal error details", async () => {
    const log = vi.fn();
    const response = await handleAnalyse(
      post({ brief: example.brief }),
      deps({ analyse: async () => { throw new Error("sk-ant-secret leaked at /srv/app.js:1"); }, log }),
    );
    const body = await response.text();
    expect(body).toBe(JSON.stringify({ error: "unknown" }));
    expect(log).toHaveBeenCalledWith("unknown");
    expect(JSON.stringify(log.mock.calls)).not.toContain(example.brief);
  });
});
