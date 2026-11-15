import { z } from "zod";

/** Limits shared by the browser and the server. */
export const MAX_BRIEF_CHARS = 12_000;
/** Raw request body cap. 12,000 characters can be up to ~48 KB of UTF-8. */
export const MAX_BODY_BYTES = 64_000;
/** Longest single string we accept from the model. */
export const MAX_FIELD_CHARS = 700;

export const SECTION_KEYS = [
  "context",
  "audience",
  "goal",
  "deliverables",
  "constraints",
  "timing",
  "successMeasures",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const SectionKeySchema = z.enum(SECTION_KEYS);
export const PrioritySchema = z.enum(["before_designing", "later"]);
export type Priority = z.infer<typeof PrioritySchema>;

/**
 * The shape requested from the model (and used to author the curated demo
 * analyses). Deliberately plain — no length or count constraints — so it can
 * be used as a structured-output schema. Limits are enforced afterwards in
 * `normaliseAnalysis`.
 */
export const ModelOutputSchema = z.object({
  summary: z.string(),
  sparse: z.boolean(),
  statedRequirements: z.array(
    z.object({
      statement: z.string(),
      sourceQuote: z.string(),
      section: SectionKeySchema,
    }),
  ),
  ambiguities: z.array(
    z.object({
      wording: z.string(),
      sourceQuote: z.string(),
      whyItMatters: z.string(),
      question: z.string(),
    }),
  ),
  missingInformation: z.array(
    z.object({
      detail: z.string(),
      whyItMatters: z.string(),
      question: z.string(),
      priority: PrioritySchema,
    }),
  ),
  assumptions: z.array(
    z.object({
      statement: z.string(),
      basis: z.string(),
      section: SectionKeySchema,
    }),
  ),
  conflicts: z.array(
    z.object({
      title: z.string(),
      quoteA: z.string(),
      quoteB: z.string(),
      tension: z.string(),
      question: z.string(),
    }),
  ),
  questions: z.array(
    z.object({
      question: z.string(),
      priority: PrioritySchema,
      section: SectionKeySchema,
    }),
  ),
});
export type ModelOutput = z.infer<typeof ModelOutputSchema>;

/** A quote checked against the brief with literal string matching. */
export const SourceQuoteSchema = z.object({
  text: z.string().min(1).max(MAX_FIELD_CHARS),
  /** True only when `text` occurs word-for-word in the analysed brief. */
  verified: z.boolean(),
});
export type SourceQuote = z.infer<typeof SourceQuoteSchema>;

const text = z.string().min(1).max(MAX_FIELD_CHARS);
const id = z.string().min(1);

const RequirementSchema = z.object({
  id,
  statement: text,
  source: SourceQuoteSchema,
  section: SectionKeySchema,
});

/** The validated structure the interface renders — for demo and live alike. */
export const AnalysisSchema = z.object({
  summary: text,
  sparse: z.boolean(),
  /** Only requirements whose quote was found word-for-word. */
  statedRequirements: z.array(RequirementSchema),
  /** Claimed requirements whose quote could not be found. Never treated as fact. */
  unverifiedRequirements: z.array(RequirementSchema),
  ambiguities: z.array(
    z.object({
      id,
      wording: text,
      source: SourceQuoteSchema,
      whyItMatters: text,
      question: text,
    }),
  ),
  missingInformation: z.array(
    z.object({
      id,
      detail: text,
      whyItMatters: text,
      question: text,
      priority: PrioritySchema,
    }),
  ),
  assumptions: z.array(
    z.object({ id, statement: text, basis: text, section: SectionKeySchema }),
  ),
  conflicts: z.array(
    z.object({
      id,
      title: text,
      sourceA: SourceQuoteSchema,
      sourceB: SourceQuoteSchema,
      tension: text,
      question: text,
    }),
  ),
  questions: z.array(
    z.object({
      id,
      question: text,
      priority: PrioritySchema,
      section: SectionKeySchema,
    }),
  ),
});
export type Analysis = z.infer<typeof AnalysisSchema>;
export type Requirement = Analysis["statedRequirements"][number];
export type Assumption = Analysis["assumptions"][number];
export type Question = Analysis["questions"][number];

export const AnalyseRequestSchema = z.object({
  brief: z.string(),
});

export type Mode = "demo" | "live";
