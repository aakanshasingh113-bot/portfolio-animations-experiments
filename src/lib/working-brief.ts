import type { Analysis, SectionKey } from "./schema";
import { SECTION_KEYS } from "./schema";

export type BriefSectionKey = SectionKey | "openQuestions";

export const BRIEF_SECTIONS: { key: BriefSectionKey; title: string }[] = [
  { key: "context", title: "Context" },
  { key: "audience", title: "Intended audience" },
  { key: "goal", title: "Goal" },
  { key: "deliverables", title: "Deliverables" },
  { key: "constraints", title: "Constraints" },
  { key: "timing", title: "Timing" },
  { key: "successMeasures", title: "Success measures" },
  { key: "openQuestions", title: "Open questions" },
];

export type BriefSections = Record<BriefSectionKey, string>;

export type AssumptionStatus = "unconfirmed" | "confirmed" | "rejected";

export interface ReviewState {
  /** Answers typed by the user, keyed by question ID. */
  answers: Record<string, string>;
  /** The user's decision and (possibly edited) wording per assumption ID. */
  assumptions: Record<string, { status: AssumptionStatus; text: string }>;
}

export const NOT_SPECIFIED = "Not specified";
export const NO_OPEN_QUESTIONS = "None recorded";
export const CONFIRMED_TAG = "(confirmed by you)";
export const UNRESOLVED_TAG = "(unresolved)";

export function initialReview(analysis: Analysis): ReviewState {
  return {
    answers: {},
    assumptions: Object.fromEntries(
      analysis.assumptions.map((a) => [
        a.id,
        { status: "unconfirmed" as const, text: a.statement },
      ]),
    ),
  };
}

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
const bullets = (items: string[]) => items.map((i) => `- ${i}`).join("\n");

/**
 * Build the working brief from the analysis and the user's review, with no
 * AI call. The rules are fixed:
 *
 * - verified stated requirements appear as written (from the original brief)
 * - answers and confirmed assumptions are added, marked "(confirmed by you)"
 * - rejected assumptions never appear
 * - unanswered questions and undecided assumptions stay under Open questions,
 *   marked "(unresolved)"
 * - a section with nothing in it reads "Not specified"
 */
export function generateSections(
  analysis: Analysis,
  review: ReviewState,
): BriefSections {
  const lines = Object.fromEntries(
    SECTION_KEYS.map((k) => [k, [] as string[]]),
  ) as Record<SectionKey, string[]>;
  const open: string[] = [];

  for (const r of analysis.statedRequirements)
    lines[r.section].push(oneLine(r.statement));

  for (const a of analysis.assumptions) {
    const decision = review.assumptions[a.id];
    const status = decision?.status ?? "unconfirmed";
    const text = oneLine(decision?.text || a.statement);
    if (status === "confirmed") lines[a.section].push(`${text} ${CONFIRMED_TAG}`);
    else if (status === "unconfirmed")
      open.push(`Unconfirmed assumption: ${text} ${UNRESOLVED_TAG}`);
  }

  for (const q of analysis.questions) {
    const answer = oneLine(review.answers[q.id] ?? "");
    if (answer) lines[q.section].push(`${q.question} — ${answer} ${CONFIRMED_TAG}`);
    else open.push(`${q.question} ${UNRESOLVED_TAG}`);
  }

  const sections = { openQuestions: open.length ? bullets(open) : NO_OPEN_QUESTIONS } as BriefSections;
  for (const key of SECTION_KEYS)
    sections[key] = lines[key].length ? bullets(lines[key]) : NOT_SPECIFIED;
  return sections;
}

const KEYS = BRIEF_SECTIONS.map((s) => s.key);

/** Sections the user has changed by hand since they were last generated. */
export function editedSections(
  current: BriefSections,
  baseline: BriefSections,
): BriefSectionKey[] {
  return KEYS.filter((k) => current[k] !== baseline[k]);
}

/** Sections whose generated text differs between two generations. */
export function changedSections(
  baseline: BriefSections,
  next: BriefSections,
): BriefSectionKey[] {
  return KEYS.filter((k) => baseline[k] !== next[k]);
}

/**
 * Hand-edited sections that an update would overwrite. If this is non-empty
 * the interface must ask before replacing anything.
 */
export function updateConflicts(
  current: BriefSections,
  baseline: BriefSections,
  next: BriefSections,
): BriefSectionKey[] {
  const changed = new Set(changedSections(baseline, next));
  return editedSections(current, baseline).filter((k) => changed.has(k));
}

/**
 * Apply a regenerated brief. Untouched sections always take the new text.
 * Hand-edited sections are kept unless `replaceEdited` is set, and even then
 * only where the generated text actually changed.
 */
export function applyUpdate(
  current: BriefSections,
  baseline: BriefSections,
  next: BriefSections,
  options: { replaceEdited: boolean },
): BriefSections {
  const result = { ...current };
  for (const k of KEYS) {
    const edited = current[k] !== baseline[k];
    const changed = baseline[k] !== next[k];
    if (!edited) result[k] = next[k];
    else if (changed && options.replaceEdited) result[k] = next[k];
  }
  return result;
}

export function toMarkdown(sections: BriefSections, originalBrief: string): string {
  const body = BRIEF_SECTIONS.map(
    ({ key, title }) => `## ${title}\n\n${sections[key].trim() || NOT_SPECIFIED}`,
  ).join("\n\n");
  const quoted = originalBrief
    .trim()
    .split("\n")
    .map((l) => `> ${l}`.trimEnd())
    .join("\n");
  return [
    "# Working brief",
    "_Draft. Items marked “(confirmed by you)” were added by the person preparing this brief and have not been approved by the stakeholder. Items marked “(unresolved)” still need an answer._",
    body,
    `## Original brief\n\n${quoted}`,
  ].join("\n\n") + "\n";
}

export function toPlainText(sections: BriefSections): string {
  return BRIEF_SECTIONS.map(
    ({ key, title }) => `${title}\n${sections[key].trim() || NOT_SPECIFIED}`,
  ).join("\n\n");
}

export function questionsToText(analysis: Analysis, review: ReviewState): string {
  return analysis.questions
    .map((q, i) => {
      const answer = oneLine(review.answers[q.id] ?? "");
      return `${i + 1}. ${q.question}${answer ? `\n   Answer: ${answer}` : ""}`;
    })
    .join("\n");
}
