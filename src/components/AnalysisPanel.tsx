"use client";

import { useId, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  CircleDashed,
  Copy,
  Flag,
  LocateFixed,
  Pencil,
  Undo2,
  X,
} from "lucide-react";
import { findQuote } from "@/lib/quotes";
import type { Analysis, Priority, SectionKey, SourceQuote } from "@/lib/schema";
import type { AssumptionStatus, ReviewState } from "@/lib/working-brief";
import { AutoTextarea, Button, FIELD_STYLES, Tag, cn } from "./ui";

const SECTION_LABEL: Record<SectionKey, string> = {
  context: "Context",
  audience: "Audience",
  goal: "Goal",
  deliverables: "Deliverable",
  constraints: "Constraint",
  timing: "Timing",
  successMeasures: "Success measure",
};

function Section({
  title,
  count,
  note,
  action,
  children,
}: {
  title: string;
  count?: number;
  note?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="border-b border-line py-7 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h3 id={id} className="text-[1.0625rem] font-semibold">
            {title}
            {count !== undefined && (
              <span className="ml-2 font-mono text-sm font-normal text-muted">
                {count}
                <span className="sr-only"> {count === 1 ? "item" : "items"}</span>
              </span>
            )}
          </h3>
          {note && <p className="mt-0.5 max-w-prose text-[0.9375rem] text-muted">{note}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PriorityTag({ priority }: { priority: Priority }) {
  return priority === "before_designing" ? (
    <Tag tone="caution" icon={<Flag size={13} aria-hidden="true" />}>
      Before designing
    </Tag>
  ) : (
    <Tag>Can clarify later</Tag>
  );
}

function Ask({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-[0.9375rem]">
      <span className="font-medium text-accent-strong">Ask: </span>
      {children}
    </p>
  );
}

/** A source quote, kept visually distinct from analysis. Rendered as plain text. */
function QuoteBlock({
  source,
  briefText,
  onShow,
  label,
}: {
  source: SourceQuote;
  briefText: string;
  onShow: (quote: string) => void;
  label?: string;
}) {
  const inBrief = source.verified && findQuote(briefText, source.text) !== null;
  return (
    <figure className="border-l-2 border-accent bg-page py-2.5 pl-3.5 pr-3">
      {label && <figcaption className="mb-1 text-sm font-medium text-muted">{label}</figcaption>}
      <blockquote className="font-mono text-[0.875rem] leading-relaxed whitespace-pre-wrap break-words">
        “{source.text}”
      </blockquote>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {!source.verified ? (
          <Tag tone="caution" icon={<AlertTriangle size={13} aria-hidden="true" />}>
            Unverified — not found word-for-word
          </Tag>
        ) : inBrief ? (
          <button
            type="button"
            onClick={() => onShow(source.text)}
            className="-ml-1.5 inline-flex min-h-9 items-center gap-1.5 rounded-md px-1.5 text-sm font-medium text-accent-strong underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
          >
            <LocateFixed size={14} aria-hidden="true" />
            Show in brief
          </button>
        ) : (
          <span className="text-sm text-muted">No longer in the edited brief.</span>
        )}
      </div>
    </figure>
  );
}

function SourceToggle(props: {
  source: SourceQuote;
  briefText: string;
  onShow: (quote: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="mt-1.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="-ml-1.5 inline-flex min-h-9 items-center gap-1 rounded-md px-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ChevronRight
          size={15}
          aria-hidden="true"
          className={cn("transition-transform duration-150", open && "rotate-90")}
        />
        View source
      </button>
      <div id={id} hidden={!open} className="mt-1">
        <QuoteBlock {...props} />
      </div>
    </div>
  );
}

const ITEM = "py-4 first:pt-0 last:pb-0";
const LIST = "divide-y divide-line";

function AssumptionItem({
  statement,
  basis,
  decision,
  onChange,
}: {
  statement: string;
  basis: string;
  decision: { status: AssumptionStatus; text: string };
  onChange: (next: { status: AssumptionStatus; text: string }) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const editId = useId();
  const { status, text } = decision;
  const editedText = text !== statement;

  return (
    <li className={ITEM}>
      <div className="flex flex-wrap items-center gap-2">
        {status === "unconfirmed" && (
          <Tag tone="caution" icon={<CircleDashed size={13} aria-hidden="true" />}>
            Unconfirmed
          </Tag>
        )}
        {status === "confirmed" && (
          <Tag tone="accent" icon={<Check size={13} aria-hidden="true" />}>
            Confirmed by you
          </Tag>
        )}
        {status === "rejected" && (
          <Tag icon={<X size={13} aria-hidden="true" />}>Rejected by you</Tag>
        )}
        {editedText && <Tag>Reworded by you</Tag>}
      </div>

      {draft === null ? (
        <p className={cn("mt-2 font-medium", status === "rejected" && "text-muted line-through")}>
          {text}
        </p>
      ) : (
        <div className="mt-2">
          <label htmlFor={editId} className="mb-1 block text-sm font-medium">
            Reword this assumption
          </label>
          <AutoTextarea
            id={editId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            className={FIELD_STYLES}
          />
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={draft.trim().length === 0}
              onClick={() => {
                onChange({ status, text: draft.trim() });
                setDraft(null);
              }}
            >
              Save wording
            </Button>
            <Button size="sm" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <p className="mt-1 text-[0.9375rem] text-muted">
        <span className="font-medium">Basis: </span>
        {basis}
      </p>

      {draft === null && (
        <div className="mt-3 flex flex-wrap gap-2">
          {status === "unconfirmed" ? (
            <>
              <Button size="sm" onClick={() => onChange({ status: "confirmed", text })}>
                <Check size={15} aria-hidden="true" />
                Confirm
              </Button>
              <Button size="sm" onClick={() => onChange({ status: "rejected", text })}>
                <X size={15} aria-hidden="true" />
                Reject
              </Button>
              <Button size="sm" variant="quiet" onClick={() => setDraft(text)}>
                <Pencil size={14} aria-hidden="true" />
                Edit
              </Button>
            </>
          ) : (
            <Button size="sm" variant="quiet" onClick={() => onChange({ status: "unconfirmed", text })}>
              <Undo2 size={14} aria-hidden="true" />
              Undo
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

export interface AnalysisSectionsProps {
  analysis: Analysis;
  review: ReviewState;
  /** The brief as it is now, which may have been edited since the analysis. */
  briefText: string;
  onShowSource: (quote: string) => void;
  onAnswer: (id: string, value: string) => void;
  onAssumption: (id: string, next: { status: AssumptionStatus; text: string }) => void;
  onCopyQuestions: () => void;
}

export function AnalysisSections({
  analysis,
  review,
  briefText,
  onShowSource,
  onAnswer,
  onAssumption,
  onCopyQuestions,
}: AnalysisSectionsProps) {
  const quote = { briefText, onShow: onShowSource };

  return (
    <>
      <Section title="Brief at a glance">
        <p className="max-w-prose">{analysis.summary}</p>
        {analysis.sparse && (
          <p className="mt-3 flex max-w-prose gap-2.5 rounded-lg border border-caution-line bg-caution-tint px-3.5 py-3 text-[0.9375rem] text-caution">
            <AlertTriangle size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
            This brief is sparse. Most of what you need to start designing isn’t in it yet.
          </p>
        )}
      </Section>

      <Section
        title="Stated requirements"
        count={analysis.statedRequirements.length}
        note="From the original brief. Each one is backed by the exact words it came from."
      >
        {analysis.statedRequirements.length === 0 ? (
          <p className="text-muted">Nothing in the brief could be confirmed as a stated requirement.</p>
        ) : (
          <ul className={LIST}>
            {analysis.statedRequirements.map((r) => (
              <li key={r.id} className={ITEM}>
                <p className="text-sm font-medium text-muted">{SECTION_LABEL[r.section]}</p>
                <p className="mt-0.5 font-medium">{r.statement}</p>
                <SourceToggle source={r.source} {...quote} />
              </li>
            ))}
          </ul>
        )}

        {analysis.unverifiedRequirements.length > 0 && (
          <div className="mt-5 rounded-lg border border-caution-line p-4">
            <h4 className="flex items-center gap-2 font-semibold">
              <AlertTriangle size={16} aria-hidden="true" className="text-caution" />
              Needs your review
            </h4>
            <p className="mt-1 text-[0.9375rem] text-muted">
              The quoted evidence for these wasn’t found word-for-word in the brief, so
              they are not treated as stated and are left out of the working brief.
            </p>
            <ul className={cn(LIST, "mt-3")}>
              {analysis.unverifiedRequirements.map((r) => (
                <li key={r.id} className={ITEM}>
                  <p className="font-medium">{r.statement}</p>
                  <div className="mt-2">
                    <QuoteBlock source={r.source} {...quote} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {analysis.ambiguities.length > 0 && (
        <Section
          title="Unclear points"
          count={analysis.ambiguities.length}
          note="Wording that could reasonably be read more than one way."
        >
          <ul className={LIST}>
            {analysis.ambiguities.map((a) => (
              <li key={a.id} className={ITEM}>
                <p className="font-medium">“{a.wording}”</p>
                <p className="mt-1 max-w-prose text-[0.9375rem]">{a.whyItMatters}</p>
                <Ask>{a.question}</Ask>
                <SourceToggle source={a.source} {...quote} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {analysis.missingInformation.length > 0 && (
        <Section
          title="Missing information"
          count={analysis.missingInformation.length}
          note="Not in the brief at all, so there is nothing to quote. Priorities are suggestions."
        >
          <ul className={LIST}>
            {analysis.missingInformation.map((m) => (
              <li key={m.id} className={ITEM}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{m.detail}</p>
                  <PriorityTag priority={m.priority} />
                </div>
                <p className="mt-1 max-w-prose text-[0.9375rem]">{m.whyItMatters}</p>
                <Ask>{m.question}</Ask>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {analysis.assumptions.length > 0 && (
        <Section
          title="Assumptions to verify"
          count={analysis.assumptions.length}
          note="Plausible readings, not facts. They stay out of the working brief unless you confirm them."
        >
          <ul className={LIST}>
            {analysis.assumptions.map((a) => (
              <AssumptionItem
                key={a.id}
                statement={a.statement}
                basis={a.basis}
                decision={review.assumptions[a.id] ?? { status: "unconfirmed", text: a.statement }}
                onChange={(next) => onAssumption(a.id, next)}
              />
            ))}
          </ul>
        </Section>
      )}

      {analysis.conflicts.length > 0 && (
        <Section
          title="Potential conflicts"
          count={analysis.conflicts.length}
          note="Parts of the brief that may pull against each other. Neither side is assumed to win."
        >
          <ul className={LIST}>
            {analysis.conflicts.map((c) => (
              <li key={c.id} className={ITEM}>
                <p className="font-medium">{c.title}</p>
                <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                  <QuoteBlock source={c.sourceA} label="The brief says" {...quote} />
                  <QuoteBlock source={c.sourceB} label="It also says" {...quote} />
                </div>
                <p className="mt-2.5 max-w-prose text-[0.9375rem]">{c.tension}</p>
                <Ask>{c.question}</Ask>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {analysis.questions.length > 0 && (
        <Section
          title="Questions to ask"
          count={analysis.questions.length}
          note="In suggested order. Add answers as you get them."
          action={
            <Button size="sm" className="min-h-11" onClick={onCopyQuestions}>
              <Copy size={15} aria-hidden="true" />
              Copy questions
            </Button>
          }
        >
          <ol className={LIST}>
            {analysis.questions.map((q, i) => {
              const answer = review.answers[q.id] ?? "";
              const answered = answer.trim().length > 0;
              return (
                <li key={q.id} className={cn(ITEM, "flex gap-3")}>
                  <span aria-hidden="true" className="w-5 shrink-0 pt-0.5 font-mono text-sm text-muted">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`answer-${q.id}`} className="block font-medium">
                      <span className="sr-only">Question {i + 1}: </span>
                      {q.question}
                    </label>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <PriorityTag priority={q.priority} />
                      {answered ? (
                        <Tag tone="accent" icon={<Check size={13} aria-hidden="true" />}>
                          Answered — confirmed by you
                        </Tag>
                      ) : (
                        <Tag icon={<CircleDashed size={13} aria-hidden="true" />}>Unresolved</Tag>
                      )}
                    </div>
                    <AutoTextarea
                      id={`answer-${q.id}`}
                      value={answer}
                      onChange={(e) => onAnswer(q.id, e.target.value)}
                      rows={1}
                      placeholder="Add the answer once you have it"
                      className={cn(FIELD_STYLES, "mt-2.5")}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </Section>
      )}
    </>
  );
}

export const CATEGORY_PREVIEW: { title: string; text: string }[] = [
  { title: "Stated requirements", text: "What the brief actually says, with the exact words." },
  { title: "Unclear points", text: "Wording that could be read more than one way." },
  { title: "Missing information", text: "Details that could change the work." },
  { title: "Assumptions to verify", text: "Readings you might act on without noticing." },
  { title: "Potential conflicts", text: "Requests that pull against each other." },
  { title: "Questions to ask", text: "A short, prioritised list for the stakeholder." },
];
