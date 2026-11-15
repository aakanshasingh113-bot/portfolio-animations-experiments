import { describe, expect, it } from "vitest";
import { DEMO_EXAMPLES, resolveDemoAnalysis } from "@/lib/demo";
import {
  applyUpdate,
  editedSections,
  generateSections,
  initialReview,
  questionsToText,
  toMarkdown,
  updateConflicts,
  type ReviewState,
} from "@/lib/working-brief";

const analysis = resolveDemoAnalysis(DEMO_EXAMPLES[1].brief)!;
const [presentation, fixedDate] = analysis.assumptions;
const firstQuestion = analysis.questions[0];

function review(patch: Partial<ReviewState> = {}): ReviewState {
  const initial = initialReview(analysis);
  return {
    answers: { ...initial.answers, ...patch.answers },
    assumptions: { ...initial.assumptions, ...patch.assumptions },
  };
}

describe("confirmed versus rejected assumptions", () => {
  it("starts with every assumption unresolved and out of the facts", () => {
    const sections = generateSections(analysis, review());
    expect(sections.constraints).not.toContain(presentation.statement);
    expect(sections.openQuestions).toContain(`Unconfirmed assumption: ${presentation.statement} (unresolved)`);
  });

  it("adds a confirmed assumption, marked as confirmed by the user", () => {
    const sections = generateSections(
      analysis,
      review({ assumptions: { [presentation.id]: { status: "confirmed", text: presentation.statement } } }),
    );
    expect(sections.constraints).toContain(`${presentation.statement} (confirmed by you)`);
    expect(sections.openQuestions).not.toContain(presentation.statement);
    expect(sections.constraints).not.toMatch(/stakeholder approved/i);
  });

  it("uses the user's reworded text when confirmed", () => {
    const sections = generateSections(
      analysis,
      review({ assumptions: { [fixedDate.id]: { status: "confirmed", text: "The date is fixed by the sale." } } }),
    );
    expect(sections.timing).toContain("The date is fixed by the sale. (confirmed by you)");
    expect(sections.timing).not.toContain(fixedDate.statement);
  });

  it("leaves a rejected assumption out of every section and the export", () => {
    const sections = generateSections(
      analysis,
      review({ assumptions: { [presentation.id]: { status: "rejected", text: presentation.statement } } }),
    );
    const markdown = toMarkdown(sections, DEMO_EXAMPLES[1].brief);
    expect(markdown).not.toContain(presentation.statement);
    expect(Object.values(sections).join("\n")).not.toContain(presentation.statement);
  });
});

describe("questions", () => {
  it("keeps unanswered questions visible as unresolved", () => {
    const sections = generateSections(analysis, review());
    for (const q of analysis.questions)
      expect(sections.openQuestions).toContain(`${q.question} (unresolved)`);
  });

  it("moves an answered question into its section", () => {
    const sections = generateSections(
      analysis,
      review({ answers: { [firstQuestion.id]: "At the payment step." } }),
    );
    expect(sections[firstQuestion.section]).toContain(
      `${firstQuestion.question} — At the payment step. (confirmed by you)`,
    );
    expect(sections.openQuestions).not.toContain(firstQuestion.question);
  });

  it("treats a whitespace-only answer as unanswered", () => {
    const sections = generateSections(analysis, review({ answers: { [firstQuestion.id]: "   " } }));
    expect(sections.openQuestions).toContain(firstQuestion.question);
  });

  it("copies questions as a numbered list", () => {
    const text = questionsToText(analysis, review());
    expect(text.split("\n")).toHaveLength(analysis.questions.length);
    expect(text.startsWith(`1. ${firstQuestion.question}`)).toBe(true);
  });
});

describe("updating without losing manual edits", () => {
  const baseline = generateSections(analysis, review());
  const next = generateSections(
    analysis,
    review({ answers: { [firstQuestion.id]: "At the payment step." } }),
  );
  // The answer changes two sections: the question's own section and Open questions.
  const target = firstQuestion.section;

  it("updates untouched sections and reports no conflict", () => {
    expect(updateConflicts(baseline, baseline, next)).toEqual([]);
    expect(applyUpdate(baseline, baseline, next, { replaceEdited: false })).toEqual(next);
  });

  it("keeps a manual edit in a section the update does not touch", () => {
    const current = { ...baseline, goal: "My own goal wording" };
    expect(updateConflicts(current, baseline, next)).toEqual([]);
    const updated = applyUpdate(current, baseline, next, { replaceEdited: true });
    expect(updated.goal).toBe("My own goal wording");
    expect(updated[target]).toBe(next[target]);
  });

  it("flags a conflict when an edited section would be rewritten", () => {
    const current = { ...baseline, [target]: "Hand-written context" };
    expect(editedSections(current, baseline)).toEqual([target]);
    expect(updateConflicts(current, baseline, next)).toEqual([target]);
  });

  it("preserves the edit unless the user accepts the replacement", () => {
    const current = { ...baseline, [target]: "Hand-written context" };
    const kept = applyUpdate(current, baseline, next, { replaceEdited: false });
    expect(kept[target]).toBe("Hand-written context");
    expect(kept.openQuestions).toBe(next.openQuestions);

    const replaced = applyUpdate(current, baseline, next, { replaceEdited: true });
    expect(replaced[target]).toBe(next[target]);
  });
});

describe("markdown export", () => {
  it("includes every section, the original brief and a provenance note", () => {
    const markdown = toMarkdown(generateSections(analysis, review()), DEMO_EXAMPLES[1].brief);
    for (const title of ["Context", "Intended audience", "Goal", "Deliverables", "Constraints", "Timing", "Success measures", "Open questions", "Original brief"])
      expect(markdown).toContain(`## ${title}`);
    expect(markdown).toContain("## Intended audience\n\nNot specified");
    expect(markdown).toContain(`> ${DEMO_EXAMPLES[1].brief}`);
    expect(markdown).toContain("not been approved by the stakeholder");
  });
});
