"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Check, Laptop, Minus, Plane, Plus, Shield, Star, Target, Trash2, TrendingUp, Wallet } from "lucide-react";
import { CAT, CATEGORIES, TODAY, type CatId, type Goal } from "./data";
import { annualCost, daysUntil, fmtDay, getRange, inRange, nextDue, safeToSpend, summarize } from "./lib";
import { newId, useApp, type BudgetStyle } from "./store";
import { Amt, Btn, Card, CatIcon, Chip, cx, Gate, IconBtn, Link, Page, Pill, Progress, Row, Section, Seg, Sheet } from "./ui";

export const STYLES: { id: BudgetStyle; name: string; body: string }[] = [
  { id: "track", name: "Just track", body: "No limits. See where money goes — that's already most of the benefit." },
  { id: "cap", name: "Simple monthly cap", body: "One number for the whole month. The easiest budget to keep." },
  { id: "category", name: "Category budgets", body: "A soft limit for the flexible categories you care about." },
  { id: "envelope", name: "Envelopes (advanced)", body: "Give every rupee a job before the month begins. More effort, more control." },
];
const GOAL_ICON = { shield: Shield, plane: Plane, laptop: Laptop, star: Star };
const monthsLeft = (g: Goal) => (g.monthly > 0 ? Math.ceil(Math.max(0, g.target - g.saved) / g.monthly) : Infinity);
const eta = (g: Goal) => { const n = monthsLeft(g); return n === Infinity ? "when you add a monthly amount" : n === 0 ? "now" : new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(TODAY.getFullYear(), TODAY.getMonth() + n, 1)); };

export function StylePicker({ value, onChange }: { value: BudgetStyle; onChange: (v: BudgetStyle) => void }) {
  return (
    <div role="radiogroup" aria-label="Budgeting style" className="space-y-2">
      {STYLES.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={o.id === value} onClick={() => onChange(o.id)}
          className={cx("flex w-full items-start gap-3 rounded-2xl border p-4 text-start", o.id === value ? "border-l-pri bg-l-tint" : "border-l-rule bg-l-card hover:bg-l-sunk")}>
          <span className={cx("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2", o.id === value ? "border-l-pri bg-l-pri text-l-onpri" : "border-l-ctrl")}>{o.id === value && <Check size={12} strokeWidth={3} />}</span>
          <span><span className="block text-base font-semibold">{o.name}</span><span className="block text-[15px] text-l-mute">{o.body}</span></span>
        </button>
      ))}
    </div>
  );
}

/* ───────── Plan tab ───────── */
export function Plan() {
  const { s, set, t } = useApp();
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-32 @3xl:px-8">
      <header className="flex min-h-16 items-center pt-2"><h1 className="flex-1 text-xl font-semibold">{t("Plan")}</h1></header>
      <div className="space-y-5">
        <Seg label="Plan section" value={s.planTab} onChange={(planTab) => set({ planTab })} options={[{ id: "budgets", label: t("Budgets") }, { id: "goals", label: t("Goals") }, { id: "bills", label: t("Bills") }]} />
        {s.planTab === "budgets" ? <BudgetsView /> : s.planTab === "goals" ? <GoalsView /> : <BillsView />}
      </div>
    </div>
  );
}

function BudgetsView() {
  const { s, txns, cal, open, m, p } = useApp();
  const mo = getRange({ kind: "month", offset: 0 }, cal);
  const sum = useMemo(() => summarize(inRange(txns, mo.start, mo.end)), [txns, mo.start, mo.end]);
  const style = s.settings.budgetStyle;
  const flex = CATEGORIES.filter((c) => !c.fixed);
  const spentOf = (id: CatId) => sum.byCat.find((c) => c.id === id)?.total ?? 0;
  const assigned = flex.reduce((a, c) => a + (s.catBudgets[c.id] ?? 0), 0);
  const safe = safeToSpend(txns, s.bills, s.goals, cal, p.monthlyIncome);
  const fixedTotal = s.bills.filter((b) => b.annualMonth === undefined).reduce((a, b) => a + b.amount, 0);
  const toAssign = safe.income - fixedTotal - safe.goals - assigned;
  return (
    <Gate empty={{ icon: Wallet, title: "No budget needed to start", body: "Track for a couple of weeks first. When you're ready, Ledgerly will suggest a cap based on what you actually spend.", cta: "Choose a style", onCta: () => open("style") }}>
      <div className="grid gap-5 @4xl:grid-cols-[1fr_1.2fr]">
        <div className="space-y-5">
          <Card className="py-1"><Row title={STYLES.find((x) => x.id === style)!.name} sub="Your budgeting style · switch anytime, nothing is lost" right={<Link onClick={() => open("style")}>Change</Link>} /></Card>
          {style === "track" && (
            <Card className="p-5"><p className="text-[15px] text-l-mute">Spent this month</p><Amt n={sum.spent} round className="text-[40px] font-semibold leading-tight" /><p className="mt-1 text-[15px] text-l-mute">You&apos;re just tracking — no limits, nothing to keep up with.</p></Card>
          )}
          {(style === "cap" || style === "category") && (
            <Card className="p-5">
              <div className="flex items-baseline justify-between"><p className="text-[15px] font-medium text-l-mute">Monthly cap</p><Link onClick={() => open("budget", "cap")}>Edit</Link></div>
              <p className="mt-1"><Amt n={sum.spent} round className="text-[34px] font-semibold leading-tight" /> <span className="text-l-mute">of <Amt n={s.cap} round /></span></p>
              <div className="mt-3"><Progress value={sum.spent} max={s.cap} over={sum.spent > s.cap} /></div>
              <p className="mt-2 text-[15px]">{sum.spent > s.cap ? <span className="text-l-amb">{m(sum.spent - s.cap, { round: true })} past the cap this month. Next month starts fresh — or nudge the cap if it was too tight.</span> : <>{m(s.cap - sum.spent, { round: true })} left, with {safe.daysLeft} days to go.</>}</p>
            </Card>
          )}
          {style === "envelope" && (
            <Card className="p-5">
              <p className="text-[15px] font-medium text-l-mute">Left to assign</p>
              <Amt n={toAssign} round className="text-[34px] font-semibold leading-tight" />
              <dl className="mt-2 space-y-1 text-[15px] text-l-mute">
                {[["Income", safe.income], ["Fixed bills", -fixedTotal], ["Goals", -safe.goals], ["In envelopes", -assigned]].map(([k, v]) => <div key={k as string} className="flex justify-between"><dt>{k}</dt><dd><Amt n={v as number} round /></dd></div>)}
              </dl>
              <p className="mt-2 text-[13px] text-l-mute">Whatever&apos;s left in an envelope rolls into next month.</p>
            </Card>
          )}
        </div>
        <Section title={style === "envelope" ? "Envelopes" : style === "category" ? "Category budgets" : "This month by category"}>
          <Card className="divide-y divide-l-rule py-1">
            {flex.map((c) => {
              const spent = spentOf(c.id), b = s.catBudgets[c.id] ?? 0;
              const limits = style === "category" || style === "envelope";
              return (
                <button key={c.id} type="button" onClick={() => open("budget", c.id)} className="block w-full py-3 text-start hover:bg-l-sunk/60">
                  <span className="flex items-center gap-3">
                    <CatIcon cat={c.id} size={32} />
                    <span className="flex-1 text-base font-medium">{c.name}</span>
                    <span className="text-[15px]"><Amt n={spent} round className="font-semibold" />{limits && b > 0 && <span className="text-l-mute"> / <Amt n={b} round /></span>}</span>
                  </span>
                  {limits && b > 0 && (
                    <span className="mt-2 block ps-11">
                      <Progress value={spent} max={b} over={spent > b} />
                      <span className={cx("mt-1 block text-[13px]", spent > b ? "text-l-amb" : "text-l-mute")}>{spent > b ? `${m(spent - b, { round: true })} over — tap to adjust or cover it from another category` : `${m(b - spent, { round: true })} left`}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </Card>
        </Section>
      </div>
    </Gate>
  );
}

export function StyleSheet() {
  const { s, setting, close, toast } = useApp();
  return (
    <Sheet title="Budgeting style" onClose={close}>
      <p className="mb-3 text-[15px] text-l-mute">Pick what feels sustainable. You can switch whenever you like — your history and limits are kept.</p>
      <StylePicker value={s.settings.budgetStyle} onChange={(v) => { const was = s.settings.budgetStyle; setting({ budgetStyle: v }); close(); if (v !== was) toast(`Switched to ${STYLES.find((x) => x.id === v)!.name}`, () => setting({ budgetStyle: was })); }} />
    </Sheet>
  );
}
export function BudgetSheet({ id }: { id: string }) {
  const { s, set, close, toast, p, m } = useApp();
  const isCap = id === "cap";
  const start = isCap ? s.cap : s.catBudgets[id as CatId] ?? 0;
  const [v, setV] = useState(start);
  const step = p.cur === "INR" ? (isCap ? 2000 : 500) : isCap ? 100 : 20;
  const save = () => {
    const before = { cap: s.cap, catBudgets: s.catBudgets };
    set(isCap ? { cap: v } : { catBudgets: { ...s.catBudgets, [id]: v } });
    close();
    toast(v === 0 ? "Budget removed" : `Budget set to ${m(v, { round: true })}`, () => set(before));
  };
  return (
    <Sheet title={isCap ? "Monthly cap" : `${CAT[id as CatId].name} budget`} onClose={close}>
      <div className="flex items-center justify-center gap-4 py-4">
        <IconBtn icon={Minus} label={`Lower by ${step}`} onClick={() => setV(Math.max(0, v - step))} className="border border-l-ctrl" />
        <label><span className="sr-only">Amount</span><input inputMode="numeric" value={v} onChange={(e) => setV(parseInt(e.target.value.replace(/\D/g, "")) || 0)} className="w-44 rounded-xl bg-l-sunk py-2 text-center text-[34px] font-semibold" /></label>
        <IconBtn icon={Plus} label={`Raise by ${step}`} onClick={() => setV(v + step)} className="border border-l-ctrl" />
      </div>
      <p className="mb-4 text-center text-[15px] text-l-mute">{isCap ? "Covers everything, including rent and bills." : "A soft limit — going over just turns the bar amber."}</p>
      <div className="grid grid-cols-2 gap-3">
        {!isCap && <Btn variant="outline" onClick={() => { setV(0); }}>No budget</Btn>}
        <Btn onClick={save} className={isCap ? "col-span-2" : ""}>Save</Btn>
      </div>
    </Sheet>
  );
}

/* ───────── Goals ───────── */
export function GoalsView() {
  const { s, push, empty, p, m } = useApp();
  const goals = empty ? [] : s.goals;
  const suggested = Math.round((p.cur === "INR" ? 92000 : 3200) * 3);
  return (
    <Gate empty={{ icon: Shield, title: "Start with a safety net", body: `Most people begin with an emergency fund — three months of essentials, about ${m(suggested, { round: true })} for you. Small, steady amounts get there.`, cta: "Set up emergency fund", onCta: () => push("goalNew") }}>
      <div className="grid gap-4 @4xl:grid-cols-2">
        {goals.map((g) => {
          const I = GOAL_ICON[g.icon];
          const pct = Math.round((g.saved / g.target) * 100);
          return (
            <button key={g.id} type="button" onClick={() => push("goal", g.id)} className="rounded-2xl border border-l-rule bg-l-card p-5 text-start hover:bg-l-sunk/60">
              <span className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-l-tint text-l-pri" aria-hidden="true"><I size={20} /></span><span className="flex-1 text-lg font-semibold">{g.name}</span><Pill tone={pct >= 100 ? "pos" : "pri"}>{pct}%</Pill></span>
              <span className="mt-3 block"><Progress value={g.saved} max={g.target} /></span>
              <span className="mt-2 block text-[15px]"><Amt n={g.saved} round className="font-semibold" /> <span className="text-l-mute">of <Amt n={g.target} round /> · <Amt n={g.monthly} round /> a month · there by {eta(g)}</span></span>
            </button>
          );
        })}
        <button type="button" onClick={() => push("goalNew")} className="flex min-h-28 items-center justify-center gap-2 rounded-2xl border border-dashed border-l-ctrl p-5 text-base font-medium text-l-pri hover:bg-l-tint"><Plus size={20} />New goal</button>
      </div>
    </Gate>
  );
}
export function GoalDetail({ id }: { id: string }) {
  const { s, set, toast, pop, p } = useApp();
  const g = s.goals.find((x) => x.id === id);
  if (!g) return <Page title="Goal"><Card className="py-8 text-center text-l-mute">This goal was removed.</Card></Page>;
  const I = GOAL_ICON[g.icon];
  const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
  const step = p.cur === "INR" ? 500 : 20;
  const upd = (patch: Partial<Goal>) => set((c) => ({ goals: c.goals.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const add = () => {
    const was = g.saved, now = Math.min(g.target, g.saved + g.monthly);
    upd({ saved: now });
    const crossed = [25, 50, 75, 100].find((k) => (was / g.target) * 100 < k && (now / g.target) * 100 >= k);
    if (navigator.vibrate) navigator.vibrate(crossed ? [20, 40, 20] : 10);
    toast(crossed ? (crossed === 100 ? `${g.name} is fully funded. That's a big one.` : `${g.name} just passed ${crossed}%. Quietly adding up.`) : "Added this month's amount", () => upd({ saved: was }));
  };
  return (
    <Page title={g.name} right={<IconBtn icon={Trash2} label="Delete goal" onClick={() => { const before = s.goals; set({ goals: s.goals.filter((x) => x.id !== id) }); pop(); toast("Goal removed · the money stays where it is", () => set({ goals: before })); }} />}>
      <div className="grid gap-5 @4xl:grid-cols-2">
        <Card className="flex flex-col items-center gap-2 py-8 text-center">
          <div className="relative grid size-40 place-items-center">
            <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" role="img" aria-label={`${pct}% of the way there`}>
              <circle cx={60} cy={60} r={52} fill="none" stroke="var(--l-sunk)" strokeWidth={10} />
              <circle cx={60} cy={60} r={52} fill="none" stroke="var(--l-pri)" strokeWidth={10} strokeLinecap="round" strokeDasharray={`${(pct / 100) * 326.7} 326.7`} className="transition-all duration-500" />
            </svg>
            <div><I size={26} className="mx-auto text-l-pri" aria-hidden="true" /><p className="text-3xl font-semibold">{pct}%</p></div>
          </div>
          <p className="text-base"><Amt n={g.saved} round className="font-semibold" /> <span className="text-l-mute">of <Amt n={g.target} round /></span></p>
          <p className="text-[15px] text-l-mute">{pct >= 100 ? "Fully funded." : <>At this pace you&apos;ll be there by <span className="font-medium text-l-ink">{eta(g)}</span>.</>}</p>
          {pct < 100 && <Btn className="mt-2" onClick={add}><Plus size={18} />Add this month&apos;s <Amt n={g.monthly} round /></Btn>}
        </Card>
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-base font-semibold">Monthly amount</h2>
            <div className="mt-3 flex items-center justify-between gap-3">
              <IconBtn icon={Minus} label="Lower monthly amount" className="border border-l-ctrl" onClick={() => upd({ monthly: Math.max(0, g.monthly - step) })} />
              <Amt n={g.monthly} round className="text-3xl font-semibold" />
              <IconBtn icon={Plus} label="Raise monthly amount" className="border border-l-ctrl" onClick={() => upd({ monthly: g.monthly + step })} />
            </div>
            <p className="mt-3 text-[15px] text-l-mute">{monthsLeft(g) === Infinity ? "Paused. Pick it back up whenever you like." : `${monthsLeft(g)} more months at this amount. Tight month? Lower it — the goal just takes a little longer.`}</p>
          </Card>
          <Card className="py-1">
            <Row icon={<CalendarClock size={20} className="text-l-mute" aria-hidden="true" />} title="Set aside on payday" sub="Counted before your safe-to-spend number" right={<Pill tone="pos"><Check size={13} />On</Pill>} />
            <Row icon={<TrendingUp size={20} className="text-l-mute" aria-hidden="true" />} title="Ledgerly never moves money" sub="You transfer it yourself; we just keep count" />
          </Card>
        </div>
      </div>
    </Page>
  );
}
export function GoalNew() {
  const { s, set, toast, p, m, txns, cal } = useApp();
  const inr = p.cur === "INR";
  const presets: { name: string; icon: Goal["icon"]; target: number }[] = [
    { name: "Emergency fund", icon: "shield", target: inr ? 276000 : 9600 }, { name: "A trip", icon: "plane", target: inr ? 40000 : 1500 },
    { name: "New laptop", icon: "laptop", target: inr ? 90000 : 1400 }, { name: "Something else", icon: "star", target: inr ? 25000 : 500 },
  ];
  const [pi, setPi] = useState(1);
  const [name, setName] = useState(presets[1].name);
  const [target, setTarget] = useState(presets[1].target);
  const [months, setMonths] = useState(6);
  const monthly = Math.ceil(target / months / (inr ? 100 : 5)) * (inr ? 100 : 5);
  const safe = safeToSpend(txns, s.bills, s.goals, cal, p.monthlyIncome);
  const due = new Date(TODAY.getFullYear(), TODAY.getMonth() + months, 1);
  const create = () => {
    const g: Goal = { id: newId(), name: name.trim() || "My goal", target, saved: 0, monthly, due: due.toISOString().slice(0, 10), icon: presets[pi].icon };
    set((c) => ({ goals: [...c.goals, g], stack: [...c.stack.slice(0, -1), { name: "goal", id: g.id }] }));
    toast(`${g.name} created · ${m(monthly, { round: true })} a month`, () => set((c) => ({ goals: c.goals.filter((x) => x.id !== g.id), stack: c.stack.filter((r) => r.id !== g.id) })));
  };
  return (
    <Page title="New goal" sub="Three quick choices">
      <div className="mx-auto max-w-xl space-y-6">
        <Section title="1 · What's it for?">
          <div className="flex flex-wrap gap-2">{presets.map((x, i) => { const I = GOAL_ICON[x.icon]; return <Chip key={x.name} active={i === pi} onClick={() => { setPi(i); setName(i === 3 ? "" : x.name); setTarget(x.target); }}><I size={18} />{x.name}</Chip>; })}</div>
          <label className="mt-3 block text-[13px] font-medium text-l-mute">Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Goa in March" className="mt-1 block min-h-12 w-full rounded-xl border border-l-ctrl bg-l-card px-3 text-base text-l-ink" /></label>
        </Section>
        <Section title="2 · How much?">
          <label className="block"><span className="sr-only">Target amount</span>
            <span className="flex items-center gap-2 rounded-xl border border-l-ctrl bg-l-card px-3"><span className="text-2xl text-l-mute">{inr ? "₹" : "$"}</span><input inputMode="numeric" value={target || ""} onChange={(e) => setTarget(parseInt(e.target.value.replace(/\D/g, "")) || 0)} className="min-h-14 w-full bg-transparent text-2xl font-semibold outline-none" /></span>
          </label>
          {pi === 0 && <p className="mt-2 text-[14px] text-l-mute">Suggested: about three months of your essentials.</p>}
        </Section>
        <Section title="3 · By when?">
          <div className="flex flex-wrap gap-2">{[3, 6, 12, 18, 24].map((n) => <Chip key={n} active={n === months} onClick={() => setMonths(n)}>{n} months</Chip>)}</div>
        </Section>
        <Card className="border-l-pri/30 bg-l-tint p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-l-pri"><Target size={16} aria-hidden="true" />Worked out for you</p>
          <p className="mt-1 text-2xl font-semibold">{m(monthly, { round: true })} a month</p>
          <p className="mt-1 text-[15px]">Ready by {new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(due)}. Your daily safe-to-spend goes from {m(safe.perDay, { round: true })} to about {m(Math.max(0, safe.left - monthly) / safe.daysLeft, { round: true })}.</p>
        </Card>
        <Btn full className="min-h-13 text-lg" disabled={!target} onClick={create}>Create goal</Btn>
      </div>
    </Page>
  );
}

/* ───────── Bills & subscriptions ───────── */
export function BillsView() {
  const { s, cal, m, p, toast, set, empty } = useApp();
  const [day, setDay] = useState<number | null>(null);
  const y = TODAY.getFullYear(), mo = TODAY.getMonth(), today = TODAY.getDate();
  const first = new Date(y, mo, 1), nDays = new Date(y, mo + 1, 0).getDate();
  const lead = (first.getDay() - cal.weekStart + 7) % 7;
  const monthly = s.bills.filter((b) => b.annualMonth === undefined);
  const byDay = (d: number) => monthly.filter((b) => b.day === d);
  const upcoming = s.bills.map((b) => ({ b, due: nextDue(b) })).sort((a, b) => a.due.getTime() - b.due.getTime());
  const shown = day ? byDay(day).map((b) => ({ b, due: new Date(y, mo, day) })) : upcoming.filter((x) => daysUntil(x.due) <= 31).slice(0, 6);
  const subs = s.bills.filter((b) => b.sub);
  const raised = s.bills.find((b) => b.was);
  const names = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat("en-GB", { weekday: "narrow" }).format(new Date(2026, 10, 1 + ((i + cal.weekStart) % 7))));
  const loan = p.loan;
  return (
    <Gate empty={{ icon: CalendarClock, title: "Bills find their own way here", body: "Mark any spend as “repeats every month” and it appears on this calendar with a gentle reminder two days before." }}>
      <div className="grid gap-5 @4xl:grid-cols-2">
        <div className="space-y-5">
          <Card className="p-4">
            <h2 className="mb-3 text-base font-semibold">{new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(TODAY)}</h2>
            <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label="Bills due this month">
              {names.map((n, i) => <span key={i} className="pb-1 text-[12px] font-medium text-l-mute" aria-hidden="true">{n}</span>)}
              {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
              {Array.from({ length: nDays }, (_, i) => i + 1).map((d) => {
                const bs = byDay(d);
                return (
                  <button key={d} type="button" disabled={!bs.length} onClick={() => setDay(day === d ? null : d)} aria-pressed={day === d}
                    aria-label={`${d}${bs.length ? `, ${bs.length} due: ${bs.map((b) => b.name).join(", ")}${d < today ? ", paid" : ""}` : ""}${d === today ? ", today" : ""}`}
                    className={cx("flex aspect-square min-h-11 flex-col items-center justify-center rounded-xl text-[15px]", d === today && "ring-2 ring-l-pri", day === d ? "bg-l-pri text-l-onpri" : bs.length ? "bg-l-tint font-semibold text-l-pri hover:brightness-95" : "text-l-mute")}>
                    {d}
                    {bs.length > 0 && <span className="text-[11px] leading-none">{d < today ? "✓" : bs.length > 1 ? `${bs.length} due` : "due"}</span>}
                  </button>
                );
              })}
            </div>
          </Card>
          <Section title={day ? `Due on ${fmtDay(new Date(y, mo, day))}` : "Next up"} action={day ? <Link onClick={() => setDay(null)}>Show all</Link> : undefined}>
            <Card className="py-1">
              {shown.map(({ b, due }) => (
                <Row key={b.id} icon={<CatIcon cat={b.cat} size={36} />} title={b.name} sub={`${fmtDay(due)} · ${daysUntil(due) < 0 ? "paid" : daysUntil(due) === 0 ? "today" : `in ${daysUntil(due)} days`}${b.variable ? " · estimate" : ""}`}
                  right={<span className="text-end"><Amt n={b.amount} className="block font-semibold" />{b.was && <span className="block text-[13px] text-l-amb">was {m(b.was)}</span>}</span>} />
              ))}
            </Card>
          </Section>
        </div>
        <div className="space-y-5">
          {raised && !empty && (
            <Card className="bg-l-ambtint p-5 text-l-amb" style={{ borderColor: "transparent" }}>
              <h2 className="text-base font-semibold">{raised.name} went up by {m(raised.amount - raised.was!)}</h2>
              <p className="mt-1 text-[15px]">It&apos;s now {m(raised.amount)} a month — {m((raised.amount - raised.was!) * 12, { round: true })} more over a year. No action needed if it&apos;s still worth it to you.</p>
              <div className="mt-3 flex gap-2">
                <Btn variant="outline" className="border-current bg-transparent text-current" onClick={() => { const before = s.bills; set({ bills: s.bills.map((b) => (b.id === raised.id ? { ...b, was: undefined } : b)) }); toast("Got it — we won't mention this again", () => set({ bills: before })); }}>Keep it</Btn>
                <Btn variant="ghost" className="text-current" onClick={() => toast(`Cancel in the ${raised.name} app under Account → Plan. We'll stop tracking it once it ends.`)}>How to cancel</Btn>
              </div>
            </Card>
          )}
          <Card className="p-5">
            <p className="text-[15px] font-medium text-l-mute">Your subscriptions cost</p>
            <p><Amt n={annualCost(s.bills)} round className="text-[34px] font-semibold leading-tight" /> <span className="text-l-mute">a year</span></p>
            <div className="mt-2">
              {subs.map((b) => <Row key={b.id} title={b.name} sub={b.annualMonth !== undefined ? "Yearly" : `${m(b.amount * 12, { round: true })} a year`} right={<span className="text-[15px]"><Amt n={b.amount} className="font-semibold" /><span className="text-l-mute">{b.annualMonth !== undefined ? "/yr" : "/mo"}</span></span>} />)}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-base font-semibold">{loan.name}</h2>
            <div className="mt-3"><Progress value={loan.paid} max={loan.tenure} /></div>
            <p className="mt-2 text-[15px]">{loan.paid} of {loan.tenure} EMIs paid · <span className="font-semibold">{loan.tenure - loan.paid} months to go</span></p>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-[13px] text-l-mute">
              <div><dt>EMI</dt><dd className="text-base font-semibold text-l-ink"><Amt n={loan.emi} /></dd></div>
              <div><dt>Interest so far</dt><dd className="text-base font-semibold text-l-ink"><Amt n={loan.interestPaid} round /></dd></div>
              <div><dt>Still to pay</dt><dd className="text-base font-semibold text-l-ink"><Amt n={loan.emi * (loan.tenure - loan.paid)} round /></dd></div>
            </dl>
          </Card>
        </div>
      </div>
    </Gate>
  );
}
