"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, History, RotateCcw } from "lucide-react";
import { resolveDemoAnalysis, findExample, type DemoExample } from "@/lib/demo";
import { ERROR_COPY, isErrorCode, type ErrorCode } from "@/lib/errors";
import { AnalysisSchema, MAX_BRIEF_CHARS, type Analysis, type Mode } from "@/lib/schema";
import {
  applyUpdate,
  changedSections,
  editedSections,
  generateSections,
  initialReview,
  questionsToText,
  toMarkdown,
  toPlainText,
  updateConflicts,
  type BriefSections,
  type ReviewState,
} from "@/lib/working-brief";
import { AnalysisSections, CATEGORY_PREVIEW } from "./AnalysisPanel";
import { BriefPanel } from "./BriefPanel";
import { Header } from "./Header";
import { WorkingBrief } from "./WorkingBrief";
import { Button, Dialog, Tag, cn } from "./ui";

interface Result {
  analysis: Analysis;
  /** The exact text this analysis was produced from. */
  analysedText: string;
  review: ReviewState;
  sections: BriefSections;
  /** The generated text the sections were last built from. */
  baseline: BriefSections;
}

interface ConfirmRequest {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  alternative?: { label: string; onChoose: () => void };
}

type Toast = { id: number; message: string; tone: "success" | "error" };

function buildResult(analysis: Analysis, analysedText: string): Result {
  const review = initialReview(analysis);
  const sections = generateSections(analysis, review);
  return { analysis, analysedText, review, sections, baseline: sections };
}

function hasReviewWork(result: Result | null): boolean {
  if (!result) return false;
  const { analysis, review, sections, baseline } = result;
  return (
    Object.values(review.answers).some((a) => a.trim().length > 0) ||
    analysis.assumptions.some((a) => {
      const d = review.assumptions[a.id];
      return d && (d.status !== "unconfirmed" || d.text !== a.statement);
    }) ||
    editedSections(sections, baseline).length > 0
  );
}

/** Stick the brief beside the analysis only while it fits in the viewport. */
function useFitsViewport(ref: React.RefObject<HTMLElement | null>): boolean {
  const [fits, setFits] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setFits(el.offsetHeight <= window.innerHeight - 48);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref]);
  return fits;
}

export function Workspace({ mode }: { mode: Mode }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [demoNotice, setDemoNotice] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [view, setView] = useState<"brief" | "analysis">("brief");
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const requestId = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const analysisHeading = useRef<HTMLHeadingElement>(null);
  const highlightNotice = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const briefColumn = useRef<HTMLDivElement>(null);
  const focusAnalysis = useRef(false);
  const briefFits = useFitsViewport(briefColumn);

  const hasPanel = result !== null || loading || error !== null;
  const stale = result !== null && result.analysedText !== text;

  const notify = useCallback((message: string, tone: Toast["tone"] = "success") => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.tone === "error" ? 8000 : 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // After a successful analysis, move focus to the result heading.
  useEffect(() => {
    if (focusAnalysis.current && result) {
      focusAnalysis.current = false;
      analysisHeading.current?.focus();
    }
  }, [result]);

  useEffect(() => {
    if (highlight) highlightNotice.current?.focus({ preventScroll: true });
  }, [highlight]);

  const showResult = (analysis: Analysis, analysedText: string) => {
    focusAnalysis.current = true;
    setResult(buildResult(analysis, analysedText));
    setError(null);
    setHighlight(null);
    setView("analysis");
  };

  const execute = async () => {
    const brief = text;
    setInputError(null);
    setDemoNotice(false);
    setError(null);

    if (mode === "demo") {
      // Curated analyses only, and only for the exact example text. No delay is added.
      const analysis = resolveDemoAnalysis(brief);
      if (analysis) showResult(analysis, brief);
      else setDemoNotice(true);
      return;
    }

    const id = ++requestId.current;
    const controller = new AbortController();
    abort.current = controller;
    setLoading(true);
    setView("analysis");

    let outcome: { analysis: Analysis } | { error: ErrorCode };
    try {
      const response = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
        signal: controller.signal,
      });
      const data: unknown = await response.json().catch(() => null);
      const body = (data ?? {}) as { analysis?: unknown; error?: unknown };
      if (response.ok) {
        // Validate again in the browser: never render an unexpected shape.
        const parsed = AnalysisSchema.safeParse(body.analysis);
        outcome = parsed.success
          ? { analysis: parsed.data }
          : { error: "invalid_response" };
      } else {
        outcome = { error: isErrorCode(body.error) ? body.error : "unknown" };
      }
    } catch {
      if (controller.signal.aborted) return; // Cancelled by the user.
      outcome = { error: "network" };
    }

    // Ignore responses from requests that have since been replaced or cancelled.
    if (id !== requestId.current) return;
    setLoading(false);
    if ("analysis" in outcome) showResult(outcome.analysis, brief);
    else if (outcome.error === "empty_input" || outcome.error === "too_long")
      setInputError(ERROR_COPY[outcome.error].detail);
    else setError(outcome.error);
  };

  const submit = () => {
    if (loading) return;
    if (text.trim().length === 0) {
      setDemoNotice(false);
      setInputError(
        mode === "demo"
          ? "Choose an example to explore."
          : ERROR_COPY.empty_input.detail,
      );
      textarea.current?.focus();
      return;
    }
    if (text.length > MAX_BRIEF_CHARS) {
      setInputError(ERROR_COPY.too_long.detail);
      textarea.current?.focus();
      return;
    }
    if (mode === "demo" && !findExample(text)) {
      setInputError(null);
      setDemoNotice(true);
      return;
    }
    if (hasReviewWork(result)) {
      setConfirm({
        title: "Replace the current analysis?",
        body: "A new analysis starts a fresh review. Your answers, assumption decisions and edits to the working brief will be discarded.",
        confirmLabel: "Replace analysis",
        onConfirm: () => void execute(),
      });
      return;
    }
    void execute();
  };

  const cancel = () => {
    requestId.current += 1;
    abort.current?.abort();
    setLoading(false);
    if (!result) setView("brief");
  };

  const reset = () => {
    requestId.current += 1;
    abort.current?.abort();
    setText("");
    setResult(null);
    setLoading(false);
    setError(null);
    setInputError(null);
    setDemoNotice(false);
    setHighlight(null);
    setView("brief");
    textarea.current?.focus();
  };

  const requestReset = (title: string) => {
    if (text.length > 200 || hasReviewWork(result)) {
      setConfirm({
        title,
        body: hasReviewWork(result)
          ? "This removes the brief, the analysis, and your answers and edits. It can’t be undone."
          : "This removes the brief and any analysis. It can’t be undone.",
        confirmLabel: "Clear everything",
        onConfirm: reset,
      });
    } else reset();
  };

  const loadExample = (example: DemoExample) => {
    setText(example.brief);
    setInputError(null);
    setDemoNotice(false);
    setHighlight(null);
  };

  const chooseExample = (example: DemoExample) => {
    const typed = text.trim().length > 0 && !findExample(text);
    if (typed) {
      setConfirm({
        title: "Replace your brief with this example?",
        body: "The text you’ve entered will be replaced by the example.",
        confirmLabel: "Use example",
        onConfirm: () => loadExample(example),
      });
    } else loadExample(example);
  };

  const patch = (update: (r: Result) => Result) =>
    setResult((r) => (r ? update(r) : r));

  const pending = useMemo(() => {
    if (!result) return 0;
    return changedSections(
      result.baseline,
      generateSections(result.analysis, result.review),
    ).length;
  }, [result]);

  const updateWorkingBrief = () => {
    if (!result) return;
    const next = generateSections(result.analysis, result.review);
    const apply = (replaceEdited: boolean) => {
      patch((r) => ({
        ...r,
        sections: applyUpdate(r.sections, r.baseline, next, { replaceEdited }),
        baseline: next,
      }));
      notify("Working brief updated.");
    };
    const conflicts = updateConflicts(result.sections, result.baseline, next);
    if (conflicts.length === 0) return apply(false);
    setConfirm({
      title: "Some sections have your edits",
      body: `Updating would rewrite ${conflicts.length === 1 ? "1 section" : `${conflicts.length} sections`} you edited by hand. You can keep your edits (other sections still update), or replace them with the regenerated text.`,
      confirmLabel: "Replace my edits",
      onConfirm: () => apply(true),
      alternative: { label: "Keep my edits", onChoose: () => apply(false) },
    });
  };

  const copy = async (value: string, success: string) => {
    try {
      await navigator.clipboard.writeText(value);
      notify(success);
    } catch {
      notify("Couldn’t copy to the clipboard. Select the text and copy it manually.", "error");
    }
  };

  const download = () => {
    if (!result) return;
    const blob = new Blob([toMarkdown(result.sections, result.analysedText)], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "working-brief.md";
    link.click();
    URL.revokeObjectURL(url);
    notify("Working brief downloaded.");
  };

  const showSource = (quote: string) => {
    setHighlight(quote);
    setView("brief");
  };

  const closeConfirm = () => setConfirm(null);
  const errorCopy = error ? ERROR_COPY[error] : null;
  const canRedecode = mode === "live" || findExample(text) !== null;

  return (
    <>
      <Header mode={mode} />

      <main className="mx-auto max-w-[1320px] px-4 pb-24 pt-7 sm:px-8 lg:px-10 lg:pt-9">
        <div className="max-w-2xl">
          <p className="font-mono text-[0.8125rem] font-medium tracking-[0.06em] text-accent">
            FROM VAGUE TO ACTIONABLE
          </p>
          <h1 className="mt-1.5 text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] sm:text-[2.125rem]">
            Make sense of the brief.
          </h1>
          <p className="mt-1.5 text-[1.0625rem] text-muted">
            Separate what’s stated from what needs a conversation.
          </p>
        </div>

        {hasPanel && (
          <nav
            aria-label="Workspace views"
            className="sticky top-0 z-10 -mx-4 mt-5 border-b border-line bg-page px-4 sm:-mx-8 sm:px-8 lg:hidden"
          >
            <div className="flex gap-6">
              {(["brief", "analysis"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-current={view === v ? "page" : undefined}
                  onClick={() => setView(v)}
                  className={cn(
                    "-mb-px min-h-12 border-b-2 px-1 text-[0.9375rem] font-medium",
                    view === v
                      ? "border-accent text-ink"
                      : "border-transparent text-muted hover:text-ink",
                  )}
                >
                  {v === "brief" ? "Brief" : "Analysis"}
                </button>
              ))}
            </div>
          </nav>
        )}

        <div className="mt-6 grid items-start gap-6 lg:mt-8 lg:grid-cols-[minmax(0,42fr)_minmax(0,58fr)] lg:gap-7">
          <div
            ref={briefColumn}
            className={cn(
              hasPanel && view !== "brief" && "max-lg:hidden",
              briefFits && "lg:sticky lg:top-6",
            )}
          >
            <BriefPanel
              mode={mode}
              text={text}
              onTextChange={(value) => {
                setText(value);
                setInputError(null);
                setDemoNotice(false);
              }}
              onSubmit={submit}
              onClear={() => requestReset("Clear the brief?")}
              onChooseExample={chooseExample}
              loading={loading}
              hasAnalysis={result !== null}
              inputError={inputError}
              showDemoNotice={demoNotice}
              highlight={highlight}
              onClearHighlight={() => setHighlight(null)}
              highlightNoticeRef={highlightNotice}
              textareaRef={textarea}
            />
          </div>

          <section
            aria-labelledby="analysis-heading"
            aria-busy={loading}
            className={cn(
              "rounded-xl border border-line bg-surface p-5 sm:p-6",
              hasPanel && view !== "analysis" && "max-lg:hidden",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2
                id="analysis-heading"
                ref={analysisHeading}
                tabIndex={-1}
                className="rounded text-lg font-semibold leading-snug"
              >
                Analysis
              </h2>
              {result && !loading && (
                <Tag>{mode === "demo" ? "Prepared example" : "Live AI analysis"}</Tag>
              )}
            </div>

            <div role="alert">
              {errorCopy && !loading && (
                <div className="mt-4 flex gap-3 rounded-lg border border-danger-line bg-danger-tint px-4 py-3.5">
                  <AlertTriangle size={19} aria-hidden="true" className="mt-0.5 shrink-0 text-danger" />
                  <div className="min-w-0">
                    <p className="font-semibold text-danger">{errorCopy.title}</p>
                    <p className="mt-0.5 text-[0.9375rem]">{errorCopy.detail}</p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {errorCopy.retryable && (
                        <Button size="sm" onClick={submit}>
                          Try again
                        </Button>
                      )}
                      <Button size="sm" variant="quiet" onClick={() => setError(null)}>
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {loading ? (
              <div className="mt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p role="status" className="text-[0.9375rem] font-medium">
                    Analysing your brief…
                  </p>
                  <Button size="sm" onClick={cancel}>
                    Cancel
                  </Button>
                </div>
                <div aria-hidden="true" className="mt-5 space-y-7">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="space-y-3">
                      <div className="h-4 w-40 animate-pulse rounded bg-line" />
                      <div className="h-3.5 w-full animate-pulse rounded bg-line/70" />
                      <div className="h-3.5 w-5/6 animate-pulse rounded bg-line/70" />
                      <div className="h-3.5 w-2/3 animate-pulse rounded bg-line/70" />
                    </div>
                  ))}
                </div>
              </div>
            ) : result ? (
              <>
                {stale && (
                  <div
                    role="status"
                    className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-caution-line bg-caution-tint px-4 py-3"
                  >
                    <p className="flex gap-2.5 text-[0.9375rem] text-caution">
                      <History size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
                      <span>
                        <strong className="font-semibold">Based on an earlier version.</strong>{" "}
                        The brief has changed since this analysis.
                      </span>
                    </p>
                    {canRedecode && (
                      <Button size="sm" onClick={submit}>
                        {mode === "demo" ? "Explore this example" : "Decode updated brief"}
                      </Button>
                    )}
                  </div>
                )}

                <div className="mt-6">
                  <AnalysisSections
                    analysis={result.analysis}
                    review={result.review}
                    briefText={text}
                    onShowSource={showSource}
                    onAnswer={(id, value) =>
                      patch((r) => ({
                        ...r,
                        review: { ...r.review, answers: { ...r.review.answers, [id]: value } },
                      }))
                    }
                    onAssumption={(id, next) =>
                      patch((r) => ({
                        ...r,
                        review: {
                          ...r.review,
                          assumptions: { ...r.review.assumptions, [id]: next },
                        },
                      }))
                    }
                    onCopyQuestions={() =>
                      void copy(questionsToText(result.analysis, result.review), "Questions copied.")
                    }
                  />
                  <WorkingBrief
                    sections={result.sections}
                    baseline={result.baseline}
                    pendingCount={pending}
                    onEdit={(key, value) =>
                      patch((r) => ({ ...r, sections: { ...r.sections, [key]: value } }))
                    }
                    onUpdate={updateWorkingBrief}
                    onCopy={() => void copy(toPlainText(result.sections), "Working brief copied.")}
                    onDownload={download}
                  />
                </div>

                <div className="mt-8 flex justify-end border-t border-line pt-5">
                  <Button onClick={() => requestReset("Start again?")}>
                    <RotateCcw size={16} aria-hidden="true" />
                    Start again
                  </Button>
                </div>
              </>
            ) : (
              <div className="mt-6 lg:py-4">
                <p className="text-xl font-semibold tracking-[-0.01em]">Clarity starts here.</p>
                <p className="mt-1 max-w-prose text-muted">
                  Add a brief to see what’s clear, what’s missing and what to ask next.
                </p>
                <p className="mt-7 text-sm font-medium text-muted">What you’ll get</p>
                <dl className="mt-2 grid gap-x-8 sm:grid-cols-2">
                  {CATEGORY_PREVIEW.map((c) => (
                    <div key={c.title} className="border-t border-line py-3">
                      <dt className="text-[0.9375rem] font-medium">{c.title}</dt>
                      <dd className="text-[0.9375rem] text-muted">{c.text}</dd>
                    </div>
                  ))}
                </dl>
                <p className="border-t border-line pt-3 text-[0.9375rem] text-muted">
                  Plus an editable working brief you can copy or download.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      <Dialog
        open={confirm !== null}
        onClose={closeConfirm}
        title={confirm?.title ?? ""}
        footer={
          confirm && (
            <>
              <Button onClick={closeConfirm}>Cancel</Button>
              {confirm.alternative && (
                <Button
                  onClick={() => {
                    confirm.alternative?.onChoose();
                    closeConfirm();
                  }}
                >
                  {confirm.alternative.label}
                </Button>
              )}
              <Button
                variant="primary"
                onClick={() => {
                  confirm.onConfirm();
                  closeConfirm();
                }}
              >
                {confirm.confirmLabel}
              </Button>
            </>
          )
        }
      >
        <p>{confirm?.body}</p>
      </Dialog>

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex justify-center px-4"
      >
        {toast && (
          <p
            key={toast.id}
            className="pointer-events-auto flex max-w-md items-start gap-2.5 rounded-lg bg-ink px-4 py-3 text-[0.9375rem] font-medium text-white shadow-[0_6px_20px_rgba(32,40,36,0.2)]"
          >
            {toast.tone === "success" ? (
              <Check size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
            )}
            {toast.message}
          </p>
        )}
      </div>
    </>
  );
}
