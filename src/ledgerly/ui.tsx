"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowLeft, Bus, ChevronRight, Clapperboard, HeartPulse, House, Plane, ReceiptText, Shapes, ShoppingBag, ShoppingBasket,
  Sparkles, TrendingDown, TrendingUp, Utensils, WifiOff, CloudAlert, X, ArrowDownLeft, Repeat, type LucideIcon,
} from "lucide-react";
import { CAT, catColor, type CatId, type Txn } from "./data";
import { fmtDay, fmtTime, METHOD_LABEL, type Bar } from "./lib";
import { useApp } from "./store";

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

export const CAT_ICON: Record<CatId, LucideIcon> = {
  food: Utensils, groceries: ShoppingBasket, transport: Bus, shopping: ShoppingBag, bills: ReceiptText,
  home: House, fun: Clapperboard, health: HeartPulse, travel: Plane, other: Shapes,
};

export function CatIcon({ cat, size = 40, income }: { cat: CatId; size?: number; income?: boolean }) {
  const I = income ? ArrowDownLeft : CAT_ICON[cat];
  return (
    <span aria-hidden="true" className="grid shrink-0 place-items-center rounded-full text-white" style={{ width: size, height: size, background: income ? "var(--l-pos)" : catColor(cat) }}>
      <I size={size * 0.46} strokeWidth={2} />
    </span>
  );
}

/** Every amount goes through here so "hide amounts" blurs them everywhere at once. */
export function Amt({ n, className, compact, sign, round }: { n: number; className?: string; compact?: boolean; sign?: boolean; round?: boolean }) {
  const { m, s } = useApp();
  if (s.settings.hide) return <span className={cx("l-blur", className)} aria-label="Amount hidden">{m(8888, { compact, round: true })}</span>;
  return <span className={className}>{m(n, { compact, sign, round })}</span>;
}

export function Card({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <div className={cx("rounded-2xl border border-l-rule bg-l-card p-4", className)} style={style}>{children}</div>;
}

type BtnProps = { children: ReactNode; onClick?: () => void; variant?: "primary" | "soft" | "ghost" | "outline"; className?: string; disabled?: boolean; label?: string; full?: boolean };
export function Btn({ children, onClick, variant = "primary", className, disabled, label, full }: BtnProps) {
  const v = {
    primary: "bg-l-pri text-l-onpri hover:bg-l-pri2",
    soft: "bg-l-tint text-l-pri hover:brightness-95",
    ghost: "text-l-pri hover:bg-l-tint",
    outline: "border border-l-ctrl text-l-ink hover:bg-l-sunk",
  }[variant];
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label}
      className={cx("inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-base font-medium transition-colors disabled:opacity-40", v, full && "w-full", className)}>
      {children}
    </button>
  );
}
export function IconBtn({ icon: I, label, onClick, badge, className }: { icon: LucideIcon; label: string; onClick?: () => void; badge?: number; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={badge ? `${label}, ${badge} new` : label} className={cx("relative grid size-11 shrink-0 place-items-center rounded-full text-l-ink hover:bg-l-sunk", className)}>
      <I size={22} strokeWidth={1.8} />
      {!!badge && <span className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-l-pri px-1 text-[11px] font-semibold text-l-onpri">{badge}</span>}
    </button>
  );
}
export function Chip({ children, active, onClick, className, label }: { children: ReactNode; active?: boolean; onClick?: () => void; className?: string; label?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} aria-label={label}
      className={cx("inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[15px] font-medium transition-colors",
        active ? "border-l-pri bg-l-tint text-l-pri" : "border-l-rule bg-l-card text-l-ink hover:bg-l-sunk", className)}>
      {children}
    </button>
  );
}
export function Seg<T extends string>({ options, value, onChange, label, className }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  return (
    <div role="group" aria-label={label} className={cx("l-scroll flex gap-1 overflow-x-auto rounded-xl bg-l-sunk p-1", className)}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={o.id === value} onClick={() => onChange(o.id)}
          className={cx("min-h-10 min-w-11 whitespace-nowrap rounded-lg font-medium transition-colors", options.length > 5 ? "flex-auto px-1 text-[14px]" : "flex-1 px-2.5 text-[15px]", o.id === value ? "bg-l-card text-l-ink shadow-sm" : "text-l-mute hover:text-l-ink")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className="grid h-11 w-14 shrink-0 place-items-center">
      <span className={cx("flex h-7 w-12 items-center rounded-full border px-0.5 transition-colors", on ? "border-l-pri bg-l-pri" : "border-l-ctrl bg-l-sunk")}>
        <span className={cx("size-5 rounded-full transition-transform", on ? "translate-x-[22px] bg-l-onpri" : "bg-l-ctrl")} />
      </span>
    </button>
  );
}
export function Row({ icon, title, sub, right, onClick, chevron }: { icon?: ReactNode; title: ReactNode; sub?: ReactNode; right?: ReactNode; onClick?: () => void; chevron?: boolean }) {
  const inner = (
    <>
      {icon}
      <span className="min-w-0 flex-1 text-start">
        <span className="block truncate text-base font-medium">{title}</span>
        {sub && <span className="block truncate text-[13px] text-l-mute">{sub}</span>}
      </span>
      {right}
      {chevron && <ChevronRight size={18} className="shrink-0 text-l-mute rtl:rotate-180" aria-hidden="true" />}
    </>
  );
  const cls = "flex min-h-14 w-full items-center gap-3 py-2";
  return onClick ? <button type="button" onClick={onClick} className={cx(cls, "rounded-lg hover:bg-l-sunk/60")}>{inner}</button> : <div className={cls}>{inner}</div>;
}
export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-2 flex min-h-8 items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-l-mute">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Link({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="-my-2 min-h-11 rounded-lg px-1 text-[15px] font-medium text-l-pri hover:underline">{children}</button>;
}
export function Progress({ value, max, over }: { value: number; max: number; over?: boolean }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-l-sunk" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx("h-full rounded-full", over && "l-hatch")} style={{ width: `${pct}%`, background: over ? "var(--l-ambmark)" : "var(--l-pri)" }} />
    </div>
  );
}
export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "pos" | "amb" | "crit" | "pri" }) {
  const c = { neutral: "bg-l-sunk text-l-mute", pos: "bg-l-postint text-l-pos", amb: "bg-l-ambtint text-l-amb", crit: "bg-l-crittint text-l-crit", pri: "bg-l-tint text-l-pri" }[tone];
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-medium", c)}>{children}</span>;
}

/* ───────── screens, sheets, states ───────── */
export function Page({ title, sub, right, children, back = true }: { title: string; sub?: string; right?: ReactNode; children: ReactNode; back?: boolean }) {
  const { pop } = useApp();
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-32 @3xl:px-8">
      <header className="sticky top-0 z-10 -mx-4 flex min-h-16 items-center gap-1 bg-l-bg/95 px-2 backdrop-blur @3xl:-mx-8 @3xl:px-6">
        {back && <IconBtn icon={ArrowLeft} label="Back" onClick={pop} className="rtl:rotate-180" />}
        <div className={cx("min-w-0 flex-1", !back && "ps-2")}>
          <h1 className="truncate text-xl font-semibold">{title}</h1>
          {sub && <p className="truncate text-[13px] text-l-mute">{sub}</p>}
        </div>
        {right}
      </header>
      <div className="l-fade space-y-5 pt-1">{children}</div>
    </div>
  );
}
export function Sheet({ title, onClose, children, tall, onKey }: { title: string; onClose: () => void; children: ReactNode; tall?: boolean; onKey?: (e: React.KeyboardEvent) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="l-fade absolute inset-0 z-40 flex items-end justify-center bg-black/45 @3xl:items-center" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Escape") onClose(); else if (!(e.target as HTMLElement).closest("input,textarea")) onKey?.(e); }}
        className={cx("l-sheet l-scroll flex max-h-[92%] w-full flex-col overflow-y-auto rounded-t-3xl bg-l-card p-4 pb-6 shadow-2xl outline-none @3xl:max-w-lg @3xl:rounded-3xl", tall && "min-h-[70%] @3xl:min-h-0")}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="ps-1 text-lg font-semibold">{title}</h2>
          <IconBtn icon={X} label="Close" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}
export function ToastHost() {
  const { s, set } = useApp();
  const toast = s.toast;
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => set((c) => (c.toast?.id === toast.id ? { toast: null } : {})), 5000);
    return () => clearTimeout(id);
  }, [toast, set]);
  if (!toast) return null;
  return (
    <div role="status" aria-live="polite" className={cx("l-sheet absolute inset-x-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-l-ink py-2 pe-2 ps-4 text-l-bg shadow-xl @3xl:bottom-8", s.stack.length || s.sheet ? "bottom-24" : "bottom-[156px]")}>
      <span className="flex-1 text-[15px]">{toast.msg}</span>
      {toast.undo && (
        <button type="button" onClick={() => { toast.undo!(); set({ toast: { id: Date.now(), msg: "Undone" } }); }} className="min-h-11 rounded-xl px-3 text-[15px] font-semibold underline underline-offset-4">Undo</button>
      )}
    </div>
  );
}
export function Skel({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-4">
      <div className="l-skel h-28 rounded-2xl" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="l-skel size-10 rounded-full" />
          <div className="flex-1 space-y-2"><div className="l-skel h-4 w-2/3" /><div className="l-skel h-3 w-1/3" /></div>
          <div className="l-skel h-4 w-14" />
        </div>
      ))}
    </div>
  );
}
export function Empty({ icon: I = Sparkles, title, body, cta, onCta }: { icon?: LucideIcon; title: string; body: string; cta?: string; onCta?: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="mb-1 grid size-14 place-items-center rounded-full bg-l-tint text-l-pri" aria-hidden="true"><I size={26} strokeWidth={1.7} /></span>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-xs text-[15px] text-l-mute">{body}</p>
      {cta && <Btn className="mt-3" onClick={onCta}>{cta}</Btn>}
    </Card>
  );
}
/** Shows the loading or first-use state for a screen when the prototype is switched to it. */
export function Gate({ empty, children, rows }: { empty: { icon?: LucideIcon; title: string; body: string; cta?: string; onCta?: () => void }; children: ReactNode; rows?: number }) {
  const { s } = useApp();
  if (s.demo === "loading") return <Skel rows={rows} />;
  if (s.demo === "empty") return <Empty {...empty} />;
  return <>{children}</>;
}
export function StatusBanner() {
  const { s, toast, p } = useApp();
  if (s.demo === "offline")
    return (
      <div role="status" className="flex items-center gap-3 bg-l-sunk px-4 py-2.5 text-[15px]">
        <WifiOff size={18} aria-hidden="true" className="shrink-0" />
        <span className="flex-1">You&apos;re offline. Keep logging — everything is saved on this device and will sync when you&apos;re back.</span>
      </div>
    );
  if (s.demo === "error")
    return (
      <div role="alert" className="flex items-center gap-3 bg-l-crittint px-4 py-2.5 text-[15px] text-l-crit">
        <CloudAlert size={18} aria-hidden="true" className="shrink-0" />
        <span className="flex-1">Couldn&apos;t reach {p.accounts[0].name.split(" ··")[0]}. Your data is safe — showing what we had 2 hours ago.</span>
        <button type="button" onClick={() => toast("Trying again… still no luck. We'll keep retrying quietly.")} className="min-h-11 rounded-lg px-2 font-semibold underline underline-offset-4">Retry</button>
      </div>
    );
  return null;
}

export function TxnRow({ t, onClick, showDay }: { t: Txn; onClick?: () => void; showDay?: boolean }) {
  const { push } = useApp();
  const income = t.kind === "income";
  return (
    <Row
      onClick={onClick ?? (() => push("txn", t.id))}
      icon={t.kind === "transfer" ? <span className="grid size-10 shrink-0 place-items-center rounded-full bg-l-sunk text-l-mute" aria-hidden="true"><Repeat size={18} /></span> : <CatIcon cat={t.cat} income={income} />}
      title={t.merchant}
      sub={<>{showDay ? `${fmtDay(t.ts)} · ` : `${fmtTime(t.ts)} · `}{METHOD_LABEL[t.method]}{t.kind === "expense" ? ` · ${CAT[t.cat].name}` : t.kind === "transfer" ? " · Not counted as spending" : " · Income"}{t.auto ? "" : " · Added by you"}</>}
      right={
        <span className="shrink-0 text-end">
          <Amt n={income ? t.amount : t.amount} sign={income} className={cx("block text-base font-semibold", income && "text-l-pos", t.kind === "transfer" && "text-l-mute")} />
          {t.flag && <span className="block text-[13px] text-l-amb">{t.flag === "duplicate" ? "Possible duplicate" : "Larger than usual"}</span>}
        </span>
      }
    />
  );
}
export function Delta({ now, base, label }: { now: number; base: number | null; label: string }) {
  const { m, s } = useApp();
  if (base === null) return <p className="text-[15px] text-l-mute">Nothing earlier to compare with {label} yet.</p>;
  const diff = now - base;
  const pct = base > 0 ? Math.round((Math.abs(diff) / base) * 100) : 0;
  const I = diff <= 0 ? TrendingDown : TrendingUp;
  if (Math.abs(diff) < 1) return <p className="text-[15px] text-l-mute">About the same as {label}.</p>;
  return (
    <p className="flex items-start gap-2 text-[15px]">
      <I size={18} className="mt-0.5 shrink-0 text-l-mute" aria-hidden="true" />
      <span><span className={cx("font-semibold", s.settings.hide && "l-blur")}>{m(Math.abs(diff), { round: true })} {diff < 0 ? "less" : "more"}</span> than {label} <span className="text-l-mute">({diff < 0 ? "↓" : "↑"} {pct}%)</span></span>
    </p>
  );
}

/* ───────── charts ───────── */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(320);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function Bars({ bars, everyNth = 1, summary, altLabel, height = 150 }: { bars: Bar[]; everyNth?: number; summary: string; altLabel?: string; height?: number }) {
  const { m, s } = useApp();
  const [sel, setSel] = useState<number | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.value));
  const top = bars.reduce((best, b, i) => (b.value > bars[best].value ? i : best), 0);
  const shown = sel ?? top;
  const hasAlt = bars.some((b) => b.alt);
  return (
    <div>
      <p className="mb-2 min-h-6 text-[15px]" aria-live="polite">
        <span className="text-l-mute">{bars[shown]?.hint}{sel === null && bars[top]?.value > 0 ? " · highest" : ""} · </span>
        <span className={cx("font-semibold", s.settings.hide && "l-blur")}>{m(bars[shown]?.value ?? 0, { round: true })}</span>
      </p>
      <div role="group" aria-label={summary} className="flex items-end" style={{ height, gap: bars.length > 30 ? 1 : bars.length > 14 ? 2 : 6 }} onPointerLeave={() => setSel(null)}>
        {bars.map((b, i) => (
          <button key={i} type="button" aria-label={`${b.hint}: ${s.settings.hide ? "hidden" : m(b.value, { round: true })}`} onPointerEnter={() => setSel(i)} onFocus={() => setSel(i)} onBlur={() => setSel(null)} onClick={() => setSel(i)}
            className="group flex h-full min-w-0 flex-1 flex-col justify-end rounded-t outline-offset-0">
            <span className={cx("block w-full rounded-t-[4px] transition-[height] duration-300", b.alt && "l-hatch")}
              style={{ height: b.future ? 2 : `${Math.max(b.value > 0 ? 3 : 1.5, (b.value / max) * 100)}%`, background: b.future || b.value === 0 ? "var(--l-rule)" : i === shown ? "var(--l-pri)" : "color-mix(in srgb, var(--l-pri) 55%, var(--l-card))" }} />
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex" style={{ gap: bars.length > 30 ? 1 : bars.length > 14 ? 2 : 6 }} aria-hidden="true">
        {bars.map((b, i) => (
          <span key={i} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center text-[12px] text-l-mute">{i % everyNth === 0 ? b.label : ""}</span>
        ))}
      </div>
      {hasAlt && altLabel && <p className="mt-2 flex items-center gap-2 text-[13px] text-l-mute"><span className="l-hatch inline-block size-3 rounded-sm" style={{ background: "color-mix(in srgb, var(--l-pri) 55%, var(--l-card))" }} aria-hidden="true" />{altLabel}</p>}
    </div>
  );
}

export function CumChart({ cum, days, cap, summary, startLabel, endLabel }: { cum: number[]; days: number; cap?: number; summary: string; startLabel: string; endLabel: string }) {
  const { m, s } = useApp();
  const [ref, w] = useWidth<HTMLDivElement>();
  const [sel, setSel] = useState<number | null>(null);
  const H = 170, padT = 26, padB = 6, padR = 8;
  const last = cum.length - 1;
  const max = Math.max(cap ?? 0, cum[last] ?? 0, 1) * 1.08;
  const x = (i: number) => ((i + 1) / days) * (w - padR);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  const path = cum.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const i = sel ?? last;
  const onPace = cap ? cap * ((i + 1) / days) : 0;
  return (
    <div ref={ref}>
      <p className="mb-1 min-h-6 text-[15px]" aria-live="polite">
        <span className="text-l-mute">Day {i + 1} · </span>
        <span className={cx("font-semibold", s.settings.hide && "l-blur")}>{m(cum[i] ?? 0, { round: true })}</span>
        {cap ? <span className="text-l-mute"> · pace would be <span className={cx(s.settings.hide && "l-blur")}>{m(onPace, { round: true })}</span></span> : null}
      </p>
      <svg width={w} height={H} role="img" aria-label={summary} className="touch-none overflow-visible"
        onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setSel(Math.max(0, Math.min(last, Math.round(((e.clientX - r.left) / (w - padR)) * days) - 1))); }}
        onPointerLeave={() => setSel(null)}>
        <line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke="var(--l-rule)" />
        {cap && (
          <>
            <polygon points={`0,${y(0)} ${w - padR},${y(cap * 1.07)} ${w - padR},${y(cap * 0.9)}`} fill="var(--l-tint)" />
            <line x1={0} y1={y(0)} x2={w - padR} y2={y(cap)} stroke="var(--l-ctrl)" strokeWidth={1.5} strokeDasharray="4 4" />
            <text x={w - padR} y={y(cap * 1.07) - 6} textAnchor="end" fontSize={12} fill="var(--l-mute)">On-pace band · {s.settings.hide ? "budget" : m(cap, { compact: true })}</text>
          </>
        )}
        {cum.length > 0 && (
          <>
            <path d={path} fill="none" stroke="var(--l-pri)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {sel !== null && <line x1={x(i)} x2={x(i)} y1={padT} y2={y(0)} stroke="var(--l-ctrl)" strokeWidth={1} />}
            <circle cx={x(i)} cy={y(cum[i])} r={5} fill="var(--l-pri)" stroke="var(--l-card)" strokeWidth={2} />
          </>
        )}
      </svg>
      <div className="mt-1 flex justify-between text-[12px] text-l-mute" aria-hidden="true"><span>{startLabel}</span><span>{endLabel}</span></div>
    </div>
  );
}

export function Donut({ segs, label, size = 132 }: { segs: { value: number; color: string }[]; label: string; size?: number }) {
  const r = 50, c = 2 * Math.PI * r;
  const total = segs.reduce((a, x) => a + x.value, 0) || 1;
  const offs = segs.map((_, i) => segs.slice(0, i).reduce((a, x) => a + (x.value / total) * c, 0));
  return (
    <svg width={size} height={size} viewBox="0 0 132 132" role="img" aria-label={label} className="shrink-0 -rotate-90">
      <circle cx={66} cy={66} r={r} fill="none" stroke="var(--l-sunk)" strokeWidth={18} />
      {segs.map((sg, i) => (
        <circle key={i} cx={66} cy={66} r={r} fill="none" stroke={sg.color} strokeWidth={18} strokeDasharray={`${Math.max(0, (sg.value / total) * c - 2)} ${c}`} strokeDashoffset={-offs[i]} />
      ))}
    </svg>
  );
}

export function SplitBar({ a, b }: { a: { label: string; value: number }; b: { label: string; value: number } }) {
  const total = a.value + b.value || 1;
  const pa = Math.round((a.value / total) * 100);
  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        <div style={{ width: `${pa}%`, background: "var(--l-pri)" }} />
        <div className="l-hatch flex-1" style={{ background: "var(--l-ctrl)" }} />
      </div>
      <div className="mt-2 flex justify-between gap-3 text-[15px]">
        <span><span className="font-medium">{a.label}</span> <span className="text-l-mute">{pa}% · </span><Amt n={a.value} round /></span>
        <span className="text-end"><span className="font-medium">{b.label}</span> <span className="text-l-mute">{100 - pa}% · </span><Amt n={b.value} round /></span>
      </div>
    </div>
  );
}
