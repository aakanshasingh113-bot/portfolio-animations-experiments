"use client";

import { useEffect, useId, useLayoutEffect, useRef } from "react";
import { X } from "lucide-react";

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "quiet";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-strong border border-accent hover:border-accent-strong",
  secondary: "bg-surface text-ink border border-control hover:bg-page",
  quiet: "text-ink border border-transparent hover:bg-ink/5 underline-offset-4",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  ref?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150",
        "aria-disabled:cursor-not-allowed aria-disabled:opacity-55 disabled:cursor-not-allowed disabled:opacity-55",
        size === "md" ? "min-h-11 px-4 text-[0.9375rem]" : "min-h-9 px-3 text-sm",
        BUTTON_STYLES[variant],
        className,
      )}
      {...props}
    />
  );
}

type TagTone = "neutral" | "accent" | "caution" | "danger";

const TAG_STYLES: Record<TagTone, string> = {
  neutral: "border-line bg-page text-muted",
  accent: "border-accent/25 bg-accent-tint text-accent-strong",
  caution: "border-caution-line bg-caution-tint text-caution",
  danger: "border-danger-line bg-danger-tint text-danger",
};

/** A text label, optionally with an icon. Meaning never relies on colour alone. */
export function Tag({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: TagTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[0.8125rem] font-medium leading-5 whitespace-nowrap",
        TAG_STYLES[tone],
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Modal built on the native dialog element: focus is trapped and restored by the browser. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(34rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-line bg-surface p-0 text-ink shadow-[0_12px_32px_rgba(32,40,36,0.14)] backdrop:bg-ink/45"
    >
      {open && (
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-lg font-semibold leading-snug">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-ink/5"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="mt-3 space-y-3 text-[0.9375rem] text-ink">{children}</div>
          {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

/** A textarea that grows with its content, so the page never needs nested scrolling. */
export function AutoTextarea({
  className,
  value,
  ref,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  value: string;
  ref?: React.Ref<HTMLTextAreaElement>;
}) {
  const inner = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const resize = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight + 2}px`;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el.parentElement ?? el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <textarea
      ref={(node) => {
        inner.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      value={value}
      className={cn("block w-full resize-none overflow-hidden", className)}
      {...props}
    />
  );
}

export const FIELD_STYLES =
  "rounded-lg border border-control bg-surface px-3 py-2.5 text-base text-ink placeholder:text-muted";
