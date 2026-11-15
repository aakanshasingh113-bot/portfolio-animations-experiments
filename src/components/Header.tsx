"use client";

import { useState } from "react";
import { CircleDot, Radio } from "lucide-react";
import type { Mode } from "@/lib/schema";
import { Button, Dialog, Tag } from "./ui";

function Mark() {
  // Two offset frames: what the brief says, and what sits just outside it.
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <rect x="1.5" y="1.5" width="15" height="15" rx="2.5" fill="none" stroke="#285747" strokeWidth="2" />
      <rect x="9.5" y="9.5" width="15" height="15" rx="2.5" fill="#285747" />
    </svg>
  );
}

export function Header({ mode }: { mode: Mode }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-3 px-4 py-2.5 sm:px-8 lg:px-10">
        <div className="flex min-w-0 items-center gap-2.5">
          <Mark />
          <span className="truncate text-[1.0625rem] font-semibold tracking-[-0.01em]">
            Brief Decoder
          </span>
          {mode === "live" ? (
            <Tag tone="accent" icon={<Radio size={13} aria-hidden="true" />}>
              Live AI
            </Tag>
          ) : (
            <Tag icon={<CircleDot size={13} aria-hidden="true" />}>Demo</Tag>
          )}
        </div>
        <Button variant="quiet" size="sm" className="min-h-11" onClick={() => setOpen(true)}>
          How it works
        </Button>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="How Brief Decoder works"
        footer={
          <Button variant="primary" onClick={() => setOpen(false)}>
            Got it
          </Button>
        }
      >
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <strong className="font-semibold">Add a brief.</strong> Paste a stakeholder
            message or rough notes{mode === "demo" && ", or pick a prepared example"}.
          </li>
          <li>
            <strong className="font-semibold">See what it actually says.</strong> Stated
            requirements are shown with the exact words they came from, so you can check
            each one against the brief.
          </li>
          <li>
            <strong className="font-semibold">See what it leaves open.</strong> Unclear
            wording, missing details, possible conflicts and unconfirmed assumptions are
            kept separate from the facts.
          </li>
          <li>
            <strong className="font-semibold">Answer what you can.</strong> Your answers
            are added to an editable working brief, marked “confirmed by you”. Everything
            else stays marked unresolved.
          </li>
        </ol>
        <p>
          Brief Decoder never fills gaps with guesses. Where the brief is silent, the
          working brief says “Not specified”.
        </p>
        <p className="text-muted">
          {mode === "live"
            ? "Live analysis sends your text to an AI provider, so use a non-confidential brief. Nothing is saved: your brief and edits last only until you close or reload this page."
            : "This is an interactive demo with three hand-written examples. Your own text isn’t analysed, and nothing you type leaves your browser. Nothing is saved when you close or reload this page."}
        </p>
      </Dialog>
    </header>
  );
}
