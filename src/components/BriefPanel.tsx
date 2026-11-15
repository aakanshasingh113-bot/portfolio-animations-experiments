"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { AlertTriangle, ChevronDown, Info, Loader2, X } from "lucide-react";
import { DEMO_EXAMPLES, type DemoExample } from "@/lib/demo";
import { DEMO_NOTICE } from "@/lib/errors";
import { findQuote } from "@/lib/quotes";
import { MAX_BRIEF_CHARS, type Mode } from "@/lib/schema";
import { AutoTextarea, Button, cn } from "./ui";

const number = new Intl.NumberFormat("en-GB");
const noopSubscribe = () => () => {};

function useIsMac(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false,
  );
}

function ExampleMenu({ onChoose }: { onChoose: (example: DemoExample) => void }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative">
      <Button
        ref={trigger}
        size="sm"
        className="min-h-11"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        Try an example
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cn("transition-transform duration-150", open && "rotate-180")}
        />
      </Button>
      <ul
        id={listId}
        hidden={!open}
        className="absolute right-0 z-20 mt-1.5 w-[min(20rem,calc(100vw-3rem))] rounded-xl border border-line bg-surface p-1.5 shadow-[0_8px_24px_rgba(32,40,36,0.1)]"
      >
        {DEMO_EXAMPLES.map((example) => (
          <li key={example.id}>
            <button
              type="button"
              className="block w-full rounded-lg px-3 py-2.5 text-left hover:bg-accent-tint"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
                onChoose(example);
              }}
            >
              <span className="block text-[0.9375rem] font-medium">{example.label}</span>
              <span className="block text-sm text-muted">{example.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface BriefPanelProps {
  mode: Mode;
  text: string;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  onChooseExample: (example: DemoExample) => void;
  loading: boolean;
  hasAnalysis: boolean;
  /** Validation message for the input itself (empty or too long). */
  inputError: string | null;
  showDemoNotice: boolean;
  highlight: string | null;
  onClearHighlight: () => void;
  highlightNoticeRef: React.Ref<HTMLDivElement>;
  textareaRef: React.Ref<HTMLTextAreaElement>;
}

export function BriefPanel({ highlightNoticeRef, textareaRef, ...props }: BriefPanelProps) {
  const { mode, text, loading, highlight } = props;
  const isMac = useIsMac();
  const helpId = useId();
  const errorId = useId();
  const countId = useId();
  const markRef = useRef<HTMLElement>(null);

  const over = text.length - MAX_BRIEF_CHARS;
  const match = highlight ? findQuote(text, highlight) : null;

  useEffect(() => {
    if (match) markRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    // Scroll once per highlighted quote, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight]);

  const primaryLabel = loading
    ? "Decoding…"
    : mode === "demo"
      ? "Explore example"
      : props.hasAnalysis
        ? "Decode again"
        : "Decode brief";

  const fieldText =
    "px-4 py-3.5 text-base leading-[1.65] font-sans whitespace-pre-wrap break-words";

  return (
    <section
      aria-labelledby="brief-heading"
      className="rounded-xl border border-line bg-surface p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 id="brief-heading" className="text-lg font-semibold leading-snug">
            Original brief
          </h2>
          <p id={helpId} className="mt-0.5 text-[0.9375rem] text-muted">
            {mode === "demo"
              ? "Choose a prepared example to see how a brief is decoded."
              : "Paste it exactly as you received it. Rough is fine."}
          </p>
        </div>
        <ExampleMenu onChoose={props.onChooseExample} />
      </div>

      {mode === "demo" && (
        <p className="mt-4 flex gap-2.5 rounded-lg border border-line bg-page px-3.5 py-3 text-[0.9375rem]">
          <Info size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
          <span>
            <strong className="font-semibold">Interactive demo.</strong> Three prepared
            examples have hand-written analyses. Other text isn’t analysed.
          </span>
        </p>
      )}

      {highlight && (
        <div
          ref={highlightNoticeRef}
          tabIndex={-1}
          className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-accent/25 bg-accent-tint py-1 pl-3.5 pr-1 text-[0.9375rem]"
        >
          <span>
            {match
              ? "Source quote highlighted in the brief below."
              : "That quote is no longer in the brief — it has been edited since the analysis."}
          </span>
          <button
            type="button"
            onClick={props.onClearHighlight}
            aria-label="Clear highlight"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-ink/5"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="mt-4">
        <label htmlFor="brief-input" className="mb-1.5 block text-[0.9375rem] font-medium">
          Brief text
        </label>
        <div className="relative rounded-lg bg-surface">
          {/* Mirror layer: draws the highlight behind the textarea using plain text nodes. */}
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 overflow-hidden rounded-lg border border-transparent text-transparent",
              fieldText,
            )}
          >
            {match && (
              <>
                {text.slice(0, match.start)}
                <mark
                  ref={markRef}
                  className="rounded-[3px] bg-[#cfe3d6] text-transparent shadow-[0_0_0_2px_#cfe3d6,0_2px_0_2px_#285747]"
                >
                  {text.slice(match.start, match.end)}
                </mark>
                {text.slice(match.end)}
              </>
            )}
          </div>
          <AutoTextarea
            id="brief-input"
            ref={textareaRef}
            value={text}
            onChange={(e) => props.onTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                (e.metaKey || e.ctrlKey) &&
                !e.nativeEvent.isComposing &&
                e.keyCode !== 229
              ) {
                e.preventDefault();
                if (!loading) props.onSubmit();
              }
            }}
            placeholder="Paste a stakeholder message, project brief or a few rough notes…"
            aria-describedby={`${helpId} ${countId}${props.inputError ? ` ${errorId}` : ""}`}
            aria-invalid={props.inputError ? true : undefined}
            spellCheck
            className={cn(
              "relative min-h-52 rounded-lg border bg-transparent text-ink placeholder:text-muted lg:min-h-64",
              props.inputError ? "border-danger" : "border-control",
              fieldText,
            )}
          />
        </div>

        <div className="mt-1.5 flex flex-wrap items-start justify-between gap-x-4 gap-y-1 text-sm">
          <p id={errorId} role="alert" className="flex min-h-5 items-start gap-1.5 font-medium text-danger">
            {props.inputError && (
              <>
                <AlertTriangle size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
                {props.inputError}
              </>
            )}
          </p>
          <p
            id={countId}
            className={cn(
              "ml-auto font-mono text-[0.8125rem] tabular-nums",
              over > 0 ? "font-medium text-danger" : "text-muted",
            )}
          >
            {number.format(text.length)} / {number.format(MAX_BRIEF_CHARS)} characters
            {over > 0 && ` — ${number.format(over)} over the limit`}
          </p>
        </div>
      </div>

      <div role="status" className="empty:hidden">
        {props.showDemoNotice && (
          <p className="mt-3 flex gap-2.5 rounded-lg border border-caution-line bg-caution-tint px-3.5 py-3 text-[0.9375rem] text-caution">
            <Info size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
            {DEMO_NOTICE}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <Button
          variant="primary"
          aria-disabled={loading}
          onClick={() => {
            if (!loading) props.onSubmit();
          }}
          className="max-sm:flex-1"
        >
          {loading && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
          {primaryLabel}
        </Button>
        <Button
          onClick={props.onClear}
          disabled={text.length === 0 && !props.hasAnalysis}
        >
          Clear
        </Button>
        <kbd className="ml-auto hidden rounded-md border border-line bg-page px-2 py-1 font-mono text-[0.8125rem] text-muted sm:max-lg:inline-block xl:inline-block">
          {isMac ? "⌘ Enter" : "Ctrl + Enter"}
        </kbd>
      </div>

      <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
        {mode === "live"
          ? "Live analysis sends your text to an AI provider. Use a non-confidential brief."
          : "Nothing you type in this demo leaves your browser."}{" "}
        Nothing is saved after you close or reload the page.
      </p>
    </section>
  );
}
