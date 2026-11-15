import {
  AnalysisSchema,
  MAX_FIELD_CHARS,
  ModelOutputSchema,
  type Analysis,
} from "./schema";
import { verifyQuote } from "./quotes";

/** Output limits. Longer lists are a sign of a generic checklist. */
export const LIST_LIMITS = {
  statedRequirements: 14,
  ambiguities: 10,
  missingInformation: 10,
  assumptions: 6,
  conflicts: 5,
  questions: 10,
} as const;

export type NormaliseResult =
  | { ok: true; analysis: Analysis }
  | { ok: false; reason: string };

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === "object")
    Object.values(value).forEach((v) => collectStrings(v, out));
}

const questionKey = (q: string) =>
  q.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/**
 * Turn untrusted analysis output (from the model, or a curated example) into
 * the validated structure the interface renders:
 *
 * - rejects output that does not match the schema or exceeds field limits
 * - checks every source quote against the brief with literal matching
 * - moves requirements with unmatched quotes out of the stated facts
 * - assigns stable IDs and removes repeated questions
 *
 * It never repairs or invents content. Invalid output is an error.
 */
export function normaliseAnalysis(raw: unknown, brief: string): NormaliseResult {
  const parsed = ModelOutputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "schema_mismatch" };
  const out = parsed.data;

  const strings: string[] = [];
  collectStrings(out, strings);
  if (strings.some((s) => s.length > MAX_FIELD_CHARS))
    return { ok: false, reason: "field_too_long" };

  const requirements = out.statedRequirements
    .slice(0, LIST_LIMITS.statedRequirements)
    .map((r, i) => ({
      id: `req-${i + 1}`,
      statement: r.statement.trim(),
      source: verifyQuote(brief, r.sourceQuote),
      section: r.section,
    }));

  const seen = new Set<string>();
  const questions = out.questions
    .filter((q) => {
      const key = questionKey(q.question);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, LIST_LIMITS.questions)
    .map((q, i) => ({
      id: `q-${i + 1}`,
      question: q.question.trim(),
      priority: q.priority,
      section: q.section,
    }));
  // Stable sort: recommended-first, otherwise the order given.
  questions.sort(
    (a, b) =>
      Number(a.priority !== "before_designing") -
      Number(b.priority !== "before_designing"),
  );

  const candidate = {
    summary: out.summary.trim(),
    sparse: out.sparse,
    statedRequirements: requirements.filter((r) => r.source.verified),
    unverifiedRequirements: requirements.filter((r) => !r.source.verified),
    ambiguities: out.ambiguities.slice(0, LIST_LIMITS.ambiguities).map((a, i) => ({
      id: `amb-${i + 1}`,
      wording: a.wording.trim(),
      source: verifyQuote(brief, a.sourceQuote),
      whyItMatters: a.whyItMatters.trim(),
      question: a.question.trim(),
    })),
    missingInformation: out.missingInformation
      .slice(0, LIST_LIMITS.missingInformation)
      .map((m, i) => ({
        id: `miss-${i + 1}`,
        detail: m.detail.trim(),
        whyItMatters: m.whyItMatters.trim(),
        question: m.question.trim(),
        priority: m.priority,
      })),
    assumptions: out.assumptions.slice(0, LIST_LIMITS.assumptions).map((a, i) => ({
      id: `asm-${i + 1}`,
      statement: a.statement.trim(),
      basis: a.basis.trim(),
      section: a.section,
    })),
    conflicts: out.conflicts.slice(0, LIST_LIMITS.conflicts).map((c, i) => ({
      id: `con-${i + 1}`,
      title: c.title.trim(),
      sourceA: verifyQuote(brief, c.quoteA),
      sourceB: verifyQuote(brief, c.quoteB),
      tension: c.tension.trim(),
      question: c.question.trim(),
    })),
    questions,
  };

  const validated = AnalysisSchema.safeParse(candidate);
  if (!validated.success) return { ok: false, reason: "invalid_content" };
  return { ok: true, analysis: validated.data };
}
