"use client";

import { Check, CircleDashed, Copy, Download, PencilLine, Quote, RefreshCw } from "lucide-react";
import {
  BRIEF_SECTIONS,
  type BriefSectionKey,
  type BriefSections,
} from "@/lib/working-brief";
import { AutoTextarea, Button, FIELD_STYLES, Tag } from "./ui";

export function WorkingBrief({
  sections,
  baseline,
  pendingCount,
  onEdit,
  onUpdate,
  onCopy,
  onDownload,
}: {
  sections: BriefSections;
  baseline: BriefSections;
  /** Sections that would change if the brief were updated now. */
  pendingCount: number;
  onEdit: (key: BriefSectionKey, value: string) => void;
  onUpdate: () => void;
  onCopy: () => void;
  onDownload: () => void;
}) {
  return (
    <section aria-labelledby="working-brief-heading" className="pt-7">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div>
          <h3 id="working-brief-heading" className="text-[1.0625rem] font-semibold">
            Working brief
          </h3>
          <p className="mt-0.5 max-w-prose text-[0.9375rem] text-muted">
            Built only from the original brief and what you’ve confirmed. Edit any
            section — your edits are never replaced without asking.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="min-h-11" onClick={onCopy}>
            <Copy size={15} aria-hidden="true" />
            Copy
          </Button>
          <Button size="sm" className="min-h-11" onClick={onDownload}>
            <Download size={15} aria-hidden="true" />
            Download Markdown
          </Button>
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-2" aria-label="How to read this brief">
        <li>
          <Tag icon={<Quote size={13} aria-hidden="true" />}>From original brief</Tag>
        </li>
        <li>
          <Tag tone="accent" icon={<Check size={13} aria-hidden="true" />}>
            Confirmed by you
          </Tag>
        </li>
        <li>
          <Tag tone="caution" icon={<CircleDashed size={13} aria-hidden="true" />}>
            Unresolved
          </Tag>
        </li>
      </ul>
      <p className="mt-2 text-sm text-muted">
        Unmarked lines come from the original brief. Lines you added are marked
        “(confirmed by you)” — that is your confirmation, not the stakeholder’s. Open
        items are marked “(unresolved)”.
      </p>

      <div
        role="status"
        className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-page px-3.5 py-2.5"
      >
        <p className="text-[0.9375rem]">
          {pendingCount > 0
            ? "You have answers or decisions that aren’t in the working brief yet."
            : "The working brief includes everything you’ve confirmed so far."}
        </p>
        <Button
          variant={pendingCount > 0 ? "primary" : "secondary"}
          size="sm"
          className="min-h-11"
          disabled={pendingCount === 0}
          onClick={onUpdate}
        >
          <RefreshCw size={15} aria-hidden="true" />
          Update working brief
        </Button>
      </div>

      <div className="mt-5 grid gap-x-5 gap-y-4 sm:grid-cols-2">
        {BRIEF_SECTIONS.map(({ key, title }) => {
          const edited = sections[key] !== baseline[key];
          const wide = key === "openQuestions" || key === "context";
          return (
            <div key={key} className={wide ? "sm:col-span-2" : undefined}>
              <div className="mb-1.5 flex min-h-6 items-center justify-between gap-2">
                <label htmlFor={`wb-${key}`} className="text-[0.9375rem] font-medium">
                  {title}
                </label>
                {edited && (
                  <Tag icon={<PencilLine size={13} aria-hidden="true" />}>Edited by you</Tag>
                )}
              </div>
              <AutoTextarea
                id={`wb-${key}`}
                value={sections[key]}
                onChange={(e) => onEdit(key, e.target.value)}
                rows={1}
                className={`${FIELD_STYLES} leading-[1.6]`}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
