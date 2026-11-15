"use client";

import { useMemo } from "react";
import { BarChart3, Lightbulb } from "lucide-react";
import { CAT, catColor, TODAY, type CatId, type Txn } from "./data";
import { annualCost, compare, fmtDay, fmtTime, getRange, inRange, METHOD_LABEL, summarize, trend, type Bar, type Cal, type Range, type RangeSel, type Summary } from "./lib";
import { useApp } from "./store";
import { Amt, Bars, Btn, Card, CatIcon, CumChart, Delta, Donut, Gate, Page, Pill, Progress, Row, Section, SplitBar, TxnRow } from "./ui";
import { RangeBar, useSwipe } from "./screens-core";

export function monthlyBars(list: Txn[], n: number, cal: Cal): Bar[] {
  return Array.from({ length: n }, (_, i) => {
    const r = getRange({ kind: "month", offset: i - n + 1 }, cal);
    const d = new Date(r.start);
    return {
      label: new Intl.DateTimeFormat("en-GB", { month: "short" }).format(d).slice(0, 3), hint: new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(d),
      value: list.reduce((a, t) => a + (t.ts >= r.start && t.ts < r.end && t.kind === "expense" ? t.amount : 0), 0),
    };
  });
}

interface Standout { text: string; cta?: string; go?: () => void }

export function Insights() {
  const { s, set, txns, cal, m, push, open, p } = useApp();
  const swipe = useSwipe();
  const sel = s.range;
  const r = getRange(sel, cal);
  const list = useMemo(() => inRange(txns, r.start, r.end), [txns, r.start, r.end]);
  const sum = useMemo(() => summarize(list), [list]);
  const cmp = useMemo(() => compare(txns, sel, cal), [txns, sel, cal]);
  const tr = useMemo(() => trend(txns, r), [txns, r]);
  const cap = s.settings.budgetStyle === "track" ? undefined : s.cap;
  const top = sum.byCat.slice(0, 5);
  const other = sum.byCat.slice(5).reduce((a, c) => a + c.total, 0);
  const typicalLabel = sel.kind === "day" ? `a typical ${new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(r.start)}` : `your usual ${r.unit}${cmp.partial ? " by now" : ""}`;
  const hi = tr.bars.reduce((b, x) => (x.value > b.value ? x : b), tr.bars[0] ?? { label: "", hint: "", value: 0 });
  const pct = cmp.prev ? Math.round(((sum.spent - cmp.prev) / cmp.prev) * 100) : 0;
  const a11y = `Spending ${r.label.toLowerCase()}: ${m(sum.spent, { round: true })}${cmp.prev ? `, ${Math.abs(pct)}% ${pct <= 0 ? "lower" : "higher"} than ${cmp.prevLabel}` : ""}${hi.value ? `, highest ${hi.hint}` : ""}.`;
  const stood = standout(sel, r, sum, list, txns, cal, tr.bars, m, { push, set, subs: annualCost(s.bills) });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-32 @3xl:px-8" {...swipe}>
      <header className="flex min-h-16 items-center pt-2"><h1 className="flex-1 text-xl font-semibold">Insights</h1></header>
      <div className="space-y-5">
        <RangeBar />
        <Gate rows={4} empty={{ icon: BarChart3, title: "Insights grow as you log", body: "After a few days you'll see where money goes by day, week and month — with one plain-language takeaway, never a lecture.", cta: "Add a spend", onCta: () => open("add") }}>
          <div className="l-fade grid gap-5 @4xl:grid-cols-2" key={`${sel.kind}${sel.offset}${r.start}`}>
            <Card className="space-y-3 p-5">
              <div>
                <p className="text-[15px] font-medium text-l-mute">Spent</p>
                <Amt n={sum.spent} round className="text-[40px] font-semibold leading-tight tracking-tight" />
              </div>
              <div className="grid grid-cols-2 gap-3 border-y border-l-rule py-3">
                <div><p className="text-[13px] text-l-mute">Income</p><Amt n={sum.income} round className="text-lg font-semibold" /></div>
                <div><p className="text-[13px] text-l-mute">Net (income − spent)</p><Amt n={sum.net} round sign={sum.net > 0} className="text-lg font-semibold" /></div>
              </div>
              <Delta now={sum.spent} base={cmp.prev} label={cmp.prevLabel} />
              {cmp.typical !== null && <Delta now={sum.spent} base={cmp.typical} label={typicalLabel} />}
            </Card>

            <Card className="p-5">
              <h2 className="mb-2 text-base font-semibold">{tr.title}</h2>
              {sum.count === 0 ? <p className="py-10 text-center text-[15px] text-l-mute">No spending recorded for {r.label.toLowerCase()}.</p> : tr.type === "cumulative" ? (
                <>
                  <CumChart cum={tr.cum!} days={tr.days!} cap={cap} summary={a11y} startLabel={fmtDay(r.start)} endLabel={fmtDay(r.end - 864e5)} />
                  {cap && tr.cum!.length > 0 && (() => {
                    const pace = cap * (tr.cum!.length / tr.days!), now = tr.cum![tr.cum!.length - 1];
                    return <p className="mt-3 text-[15px]">{now <= pace * 1.07 ? <><Pill tone="pos">On pace</Pill> You&apos;re within your usual rhythm for day {tr.cum!.length}.</> : <><Pill tone="amb">Ahead of pace</Pill> About <Amt n={now - pace} round className="font-semibold" /> ahead of an even pace — some months front-load, and that&apos;s fine.</>}</p>;
                  })()}
                </>
              ) : (
                <>
                  <Bars bars={tr.bars} everyNth={tr.everyNth} summary={a11y} altLabel="Hatched bars are weekends" />
                  {tr.months && sel.kind !== "year" && (
                    <div className="mt-3 flex flex-wrap gap-2">{tr.months.map((x) => <Pill key={x.label}>{x.label} · <Amt n={x.value} compact /></Pill>)}</div>
                  )}
                </>
              )}
            </Card>

            {stood && (
              <Card className="flex gap-3 border-l-pri/30 bg-l-tint p-5 @4xl:col-span-2">
                <Lightbulb size={22} className="mt-0.5 shrink-0 text-l-pri" aria-hidden="true" />
                <div className="flex-1">
                  <h2 className="text-[13px] font-semibold uppercase tracking-wide text-l-pri">What stood out</h2>
                  <p className="mt-1 text-base">{s.settings.hide ? "Amounts are hidden — turn them back on to read this insight." : stood.text}</p>
                  {stood.cta && <Btn variant="outline" className="mt-3 bg-l-card" onClick={stood.go}>{stood.cta}</Btn>}
                </div>
              </Card>
            )}

            {sum.count > 0 && (
              <>
                <Card className="p-5">
                  <h2 className="mb-3 text-base font-semibold">By category</h2>
                  <div className="flex items-center gap-4">
                    <Donut label={`Category breakdown: ${top.map((c) => `${CAT[c.id].name} ${Math.round((c.total / sum.spent) * 100)}%`).join(", ")}`}
                      segs={[...top.map((c) => ({ value: c.total, color: catColor(c.id) })), { value: other, color: "var(--c-other)" }]} />
                    <p className="text-[15px] text-l-mute">{CAT[top[0].id].name} leads at <span className="font-semibold text-l-ink">{Math.round((top[0].total / sum.spent) * 100)}%</span> of spending.</p>
                  </div>
                  <div className="mt-2">
                    {top.map((c) => (
                      <Row key={c.id} onClick={() => push("category", c.id)} chevron icon={<CatIcon cat={c.id} size={32} />} title={CAT[c.id].name} sub={`${Math.round((c.total / sum.spent) * 100)}% · ${c.count} ${c.count === 1 ? "spend" : "spends"}`} right={<Amt n={c.total} round className="font-semibold" />} />
                    ))}
                    {other > 0 && <Row icon={<span className="size-8 shrink-0 rounded-full" style={{ background: "var(--c-other)" }} aria-hidden="true" />} title="Other" sub={`${sum.byCat.length - 5} more categories`} right={<Amt n={other} round className="font-semibold" />} />}
                  </div>
                </Card>

                <div className="space-y-5">
                  <Card className="p-5">
                    <h2 className="mb-3 text-base font-semibold">How you paid</h2>
                    <div className="space-y-3">
                      {sum.byMethod.map((x) => (
                        <div key={x.id}>
                          <div className="mb-1 flex justify-between text-[15px]"><span className="font-medium">{METHOD_LABEL[x.id]}</span><span><span className="text-l-mute">{Math.round((x.total / sum.spent) * 100)}% · </span><Amt n={x.total} round /></span></div>
                          <div className="h-2.5 rounded-full bg-l-sunk"><div className="h-full rounded-full bg-l-pri" style={{ width: `${(x.total / sum.byMethod[0].total) * 100}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <Card className="space-y-5 p-5">
                    <div><h2 className="mb-2 text-base font-semibold">Recurring vs one-time</h2><SplitBar a={{ label: "Recurring", value: sum.recurring }} b={{ label: "One-time", value: sum.oneTime }} /></div>
                    <div><h2 className="mb-2 text-base font-semibold">Fixed vs flexible</h2><SplitBar a={{ label: "Fixed", value: sum.fixed }} b={{ label: "Flexible", value: sum.flexible }} /><p className="mt-2 text-[13px] text-l-mute">Fixed is rent, EMIs and bills. Flexible is the part you can actually steer.</p></div>
                  </Card>
                </div>

                <Card className="p-5 @4xl:col-span-2">
                  <h2 className="mb-1 text-base font-semibold">Top merchants</h2>
                  <div className="grid gap-x-8 @4xl:grid-cols-2">
                    {sum.merchants.slice(0, 6).map((x) => (
                      <Row key={x.name} onClick={() => push("merchant", x.name)} chevron icon={<CatIcon cat={x.cat} size={32} />} title={x.name} sub={`${x.count} ${x.count === 1 ? "time" : "times"} · avg ${m(x.total / x.count, { round: true })}`} right={<Amt n={x.total} round className="font-semibold" />} />
                    ))}
                  </div>
                  {sel.kind === "year" && <p className="mt-2 border-t border-l-rule pt-3 text-[15px]">Subscriptions come to <Amt n={annualCost(s.bills)} round className="font-semibold" /> a year for {p.name}.</p>}
                </Card>
              </>
            )}
          </div>
        </Gate>
      </div>
    </div>
  );
}

function standout(
  sel: RangeSel, r: Range, sum: Summary, list: Txn[], txns: Txn[], cal: Cal, bars: Bar[],
  m: (n: number, o?: { round?: boolean }) => string,
  x: { push: (n: string, id?: string) => void; set: (p: { range: RangeSel }) => void; subs: number },
): Standout | null {
  const spends = list.filter((t) => t.kind === "expense" && !t.excluded);
  if (!spends.length) return null;
  const R = { round: true };
  if (sel.kind === "day") {
    const big = spends.reduce((a, b) => (b.amount > a.amount ? b : a));
    return { text: `Your biggest spend ${r.label === "Today" ? "today" : "that day"} was ${m(big.amount)} at ${big.merchant}, at ${fmtTime(big.ts)}. ${spends.length} spends in all.`, cta: "Open it", go: () => x.push("txn", big.id) };
  }
  if (sel.kind === "week" && (!r.current || TODAY.getTime() - r.start > 4 * 864e5)) {
    const wk = spends.filter((t) => [0, 6].includes(new Date(t.ts).getDay()));
    const share = Math.round((wk.reduce((a, t) => a + t.amount, 0) / sum.spent) * 100);
    const topCat = summarize(wk).byCat[0];
    if (topCat && share >= 25) return { text: `Saturday and Sunday made up ${share}% of this week's spending — mostly ${CAT[topCat.id].name}. Weekends tend to run this way for you.`, cta: `See ${CAT[topCat.id].name}`, go: () => x.push("category", topCat.id) };
  }
  if (sel.kind === "year") {
    const full = bars.filter((b) => b.value > 0);
    const lo = full.reduce((a, b) => (b.value < a.value ? b : a)), hi = full.reduce((a, b) => (b.value > a.value ? b : a));
    return { text: `Your lightest month was ${lo.hint} (${m(lo.value, R)}) and your fullest was ${hi.hint} (${m(hi.value, R)}). Subscriptions add up to ${m(x.subs, R)} a year.`, cta: "Review subscriptions", go: () => x.push("bills") };
  }
  if (sel.kind === "3m" || sel.kind === "6m") {
    const hi = bars.reduce((a, b) => (b.value > a.value ? b : a));
    const festive = /Nov$/.test(hi.label) && parseInt(hi.label) <= 9 && hi.value > 30000;
    const trip = /Aug$/.test(hi.label);
    return { text: `${hi.hint} was your fullest week (${m(hi.value, R)})${festive ? " — festive shopping and gifts. That's seasonal, not a new habit." : trip ? " — that was your trip. One-offs like this are easier with a small travel pot." : "."}`, cta: trip ? "Set up a travel goal" : "See shopping", go: () => (trip ? x.push("goalNew") : x.push("category", "shopping")) };
  }
  // Month / custom: the category that moved most against the previous equivalent period.
  const len = Math.min(r.end, TODAY.getTime()) - r.start;
  const prevStart = sel.kind === "month" ? getRange({ kind: "month", offset: sel.offset - 1 }, cal).start : r.start - (r.end - r.start);
  const prev = summarize(inRange(txns, prevStart, prevStart + len));
  let best: { id: CatId; diff: number } | null = null;
  for (const c of sum.byCat) {
    if (CAT[c.id].fixed) continue;
    const diff = c.total - (prev.byCat.find((p) => p.id === c.id)?.total ?? 0);
    if (!best || diff > best.diff) best = { id: c.id, diff };
  }
  if (best && best.diff > 0) return { text: `You've spent ${m(best.diff, R)} more on ${CAT[best.id].name} than at this point last time. Want to see what's behind it?`, cta: "See why", go: () => x.push("category", best!.id) };
  return { text: `Spending is running lighter than last time across every flexible category. Nothing needs doing.` };
}

/* ───────── Category detail ───────── */
export function CategoryDetail({ id }: { id: CatId }) {
  const { s, set, txns, cal, push, m } = useApp();
  const c = CAT[id];
  const all = useMemo(() => txns.filter((t) => t.cat === id && t.kind === "expense"), [txns, id]);
  const bars = useMemo(() => monthlyBars(all, 6, cal), [all, cal]);
  const mo = getRange({ kind: "month", offset: 0 }, cal);
  const thisMonth = summarize(inRange(all, mo.start, mo.end));
  const recent = summarize(inRange(all, TODAY.getTime() - 90 * 864e5, TODAY.getTime() + 1));
  const budget = s.catBudgets[id];
  const avg = bars.slice(0, 5).reduce((a, b) => a + b.value, 0) / 5;
  return (
    <Page title={c.name} sub={c.fixed ? "Fixed — mostly the same each month" : "Flexible — yours to steer"}>
      <Gate empty={{ title: `Nothing in ${c.name} yet`, body: "Spends you put in this category will collect here with a trend and your usual places." }}>
        <div className="grid gap-5 @4xl:grid-cols-2">
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-3"><CatIcon cat={id} /><div><p className="text-[13px] text-l-mute">This month so far</p><Amt n={thisMonth.spent} round className="text-2xl font-semibold" /></div></div>
            <Bars bars={bars} summary={`${c.name} by month for the last six months. Monthly average ${m(avg, { round: true })}.`} height={120} />
            <p className="mt-3 text-[15px] text-l-mute">You usually spend about <Amt n={avg} round className="font-semibold text-l-ink" /> a month here.</p>
          </Card>
          <div className="space-y-5">
            {!c.fixed && (
              <Card className="p-5">
                <h2 className="mb-2 text-base font-semibold">Budget</h2>
                {budget ? (
                  <>
                    <Progress value={thisMonth.spent} max={budget} over={thisMonth.spent > budget} />
                    <p className="mt-2 text-[15px]"><Amt n={thisMonth.spent} round className="font-semibold" /> of <Amt n={budget} round />{thisMonth.spent > budget ? <> · <span className="text-l-amb">{m(thisMonth.spent - budget, { round: true })} over — want to move some from another category?</span></> : <> · {m(budget - thisMonth.spent, { round: true })} left</>}</p>
                  </>
                ) : <p className="text-[15px] text-l-mute">No budget for this category. That&apos;s completely fine.</p>}
                <Btn variant="soft" className="mt-3" onClick={() => { set({ planTab: "budgets", tab: "plan", stack: [] }); }}>{budget ? "Adjust budget" : "Set a budget"}</Btn>
              </Card>
            )}
            <Section title="Where it goes · last 90 days">
              <Card className="py-1">{recent.merchants.slice(0, 5).map((x) => <Row key={x.name} chevron onClick={() => push("merchant", x.name)} title={x.name} sub={`${x.count} times`} right={<Amt n={x.total} round className="font-semibold" />} />)}</Card>
            </Section>
          </div>
          <Section title="Recent" className="@4xl:col-span-2"><Card className="py-1">{all.slice(0, 8).map((t) => <TxnRow key={t.id} t={t} />)}</Card></Section>
        </div>
      </Gate>
    </Page>
  );
}

/* ───────── Merchant detail ───────── */
export function MerchantDetail({ name }: { name: string }) {
  const { s, txns, cal, m, push } = useApp();
  const all = useMemo(() => txns.filter((t) => t.merchant === name && t.kind === "expense"), [txns, name]);
  const bars = useMemo(() => monthlyBars(all, 6, cal), [all, cal]);
  const last90 = inRange(all, TODAY.getTime() - 90 * 864e5, TODAY.getTime() + 1);
  const total = all.reduce((a, t) => a + t.amount, 0);
  const perWeek = last90.length / (90 / 7);
  const freq = perWeek >= 0.9 ? `about ${Math.round(perWeek)}× a week` : last90.length ? `about ${Math.max(1, Math.round(last90.length / 3))}× a month` : "not in the last 3 months";
  const cat = all[0]?.cat ?? "other";
  const rule = s.rules.find((r) => r.merchant === name);
  return (
    <Page title={name} sub={CAT[cat].name}>
      <Gate empty={{ title: "No history here yet", body: "Once you've spent somewhere twice, you'll see your average and how often you go." }}>
        <div className="grid gap-5 @4xl:grid-cols-2">
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {[["Average", all.length ? m(total / all.length, { round: true }) : "—"], ["How often", freq], ["Visits", String(all.length)]].map(([k, v]) => (
                <Card key={k} className="p-3"><p className="text-[13px] text-l-mute">{k}</p><p className={`mt-0.5 text-[17px] font-semibold leading-snug ${s.settings.hide && k === "Average" ? "l-blur" : ""}`}>{v}</p></Card>
              ))}
            </div>
            <Card className="p-5"><h2 className="mb-2 text-base font-semibold">Month by month</h2><Bars bars={bars} height={120} summary={`Spending at ${name} for the last six months, total ${m(total, { round: true })}.`} /></Card>
            <Card className="py-1"><Row icon={<CatIcon cat={cat} size={32} />} title={rule ? `Always ${CAT[rule.cat].name}` : `Usually ${CAT[cat].name}`} sub={rule ? "A rule you made — change it from any transaction" : "Learned from your history"} right={<Btn variant="ghost" onClick={() => push("rules")}>Rules</Btn>} /></Card>
          </div>
          <Section title="History"><Card className="py-1">{all.slice(0, 12).map((t) => <TxnRow key={t.id} t={t} showDay onClick={() => push("txn", t.id)} />)}{all.length === 0 && <p className="py-6 text-center text-l-mute">No spends here.</p>}</Card></Section>
        </div>
      </Gate>
    </Page>
  );
}
