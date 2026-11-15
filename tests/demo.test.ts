import { describe, expect, it } from "vitest";
import { getServerConfig } from "@/lib/config";
import { DEMO_EXAMPLES, findExample, resolveDemoAnalysis } from "@/lib/demo";
import { generateSections, initialReview, NOT_SPECIFIED } from "@/lib/working-brief";

const [dashboard, checkout, onboarding] = DEMO_EXAMPLES;

describe("demo examples", () => {
  it("returns a curated analysis for each exact example", () => {
    for (const example of DEMO_EXAMPLES) {
      expect(resolveDemoAnalysis(example.brief)).not.toBeNull();
      expect(resolveDemoAnalysis(`\n  ${example.brief}  \n`)).not.toBeNull();
    }
  });

  it("gives no analysis for changed example text", () => {
    expect(resolveDemoAnalysis(dashboard.brief + " Thanks!")).toBeNull();
    expect(resolveDemoAnalysis(dashboard.brief.replace("Friday", "Monday"))).toBeNull();
    expect(resolveDemoAnalysis(dashboard.brief.toLowerCase())).toBeNull();
    expect(resolveDemoAnalysis(dashboard.brief.slice(0, -1))).toBeNull();
  });

  it("gives no analysis for arbitrary text, even with matching keywords", () => {
    expect(findExample("Please improve our health app dashboard by Friday")).toBeNull();
    expect(findExample("Create an onboarding flow")).toBeNull();
    expect(findExample("")).toBeNull();
  });

  it("dashboard: keeps Friday relative and flags what is missing", () => {
    const analysis = resolveDemoAnalysis(dashboard.brief)!;
    const all = JSON.stringify(analysis);
    expect(all).not.toMatch(/\b\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December)\b/);
    expect(analysis.ambiguities.map((a) => a.wording)).toEqual(
      expect.arrayContaining(["modern", "engaging", "Friday"]),
    );
    const sections = generateSections(analysis, initialReview(analysis));
    expect(sections.audience).toBe(NOT_SPECIFIED);
    expect(sections.successMeasures).toBe(NOT_SPECIFIED);
    expect(sections.timing).toContain("Friday");
  });

  it("checkout: separates goal, constraints and timing, and surfaces the tension", () => {
    const analysis = resolveDemoAnalysis(checkout.brief)!;
    const bySection = (s: string) => analysis.statedRequirements.filter((r) => r.section === s);
    expect(bySection("goal")).toHaveLength(1);
    expect(bySection("constraints")).toHaveLength(2);
    expect(bySection("timing")).toHaveLength(1);
    expect(analysis.conflicts).toHaveLength(1);
    expect(JSON.stringify(analysis)).not.toMatch(/impossible/i);
  });

  it("onboarding: one stated request and nothing invented", () => {
    const analysis = resolveDemoAnalysis(onboarding.brief)!;
    expect(analysis.statedRequirements).toHaveLength(1);
    expect(analysis.assumptions).toEqual([]);
    expect(analysis.conflicts).toEqual([]);
    expect(analysis.sparse).toBe(true);
    const sections = generateSections(analysis, initialReview(analysis));
    for (const key of ["context", "audience", "goal", "constraints", "timing", "successMeasures"] as const)
      expect(sections[key]).toBe(NOT_SPECIFIED);
  });
});

describe("server configuration", () => {
  const upstash = { UPSTASH_REDIS_REST_URL: "https://x.upstash.io", UPSTASH_REDIS_REST_TOKEN: "t" };

  it("is demo mode without an API key", () => {
    expect(getServerConfig({}).mode).toBe("demo");
    expect(getServerConfig({ ANTHROPIC_API_KEY: "  ", ...upstash }).mode).toBe("demo");
  });

  it("stays in demo mode in production without a shared limit store", () => {
    const config = getServerConfig({ ANTHROPIC_API_KEY: "key", NODE_ENV: "production" });
    expect(config).toMatchObject({ mode: "demo", apiKey: null, limiter: "none" });
  });

  it("goes live in production once shared limits are configured", () => {
    const config = getServerConfig({ ANTHROPIC_API_KEY: "key", NODE_ENV: "production", ...upstash });
    expect(config).toMatchObject({ mode: "live", limiter: "shared" });
  });

  it("allows local development and explicit opt-in with in-memory limits", () => {
    expect(getServerConfig({ ANTHROPIC_API_KEY: "key", NODE_ENV: "development" }).limiter).toBe("memory");
    expect(
      getServerConfig({ ANTHROPIC_API_KEY: "key", NODE_ENV: "production", ALLOW_UNMETERED_LIVE: "true" }).mode,
    ).toBe("live");
  });

  it("uses the configured model", () => {
    expect(getServerConfig({ ANTHROPIC_MODEL: "some-model" }).model).toBe("some-model");
  });
});

describe("Gemini provider", () => {
  it("uses Gemini when only GEMINI_API_KEY is set", () => {
    const config = getServerConfig({ GEMINI_API_KEY: "g", NODE_ENV: "production", ALLOW_UNMETERED_LIVE: "true" });
    expect(config.mode).toBe("live");
    expect(config.provider).toBe("gemini");
    expect(config.model).toBe("gemini-4-hydrogen");
  });
  it("stays in demo in production without limits or opt-in", () => {
    expect(getServerConfig({ GEMINI_API_KEY: "g", NODE_ENV: "production" }).mode).toBe("demo");
  });
  it("prefers Claude when both keys are set", () => {
    expect(getServerConfig({ GEMINI_API_KEY: "g", ANTHROPIC_API_KEY: "a" }).provider).toBe("anthropic");
  });
});
