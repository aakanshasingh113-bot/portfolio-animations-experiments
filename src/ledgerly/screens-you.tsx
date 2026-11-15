"use client";

import { useMemo, useState } from "react";
import {
  Banknote, Bell, BellOff, CalendarDays, ChevronLeft, ChevronRight, CircleCheck, CreditCard, Download, EyeOff, FileSpreadsheet, FileText, Globe, Landmark,
  Languages, Lock, Mail, MessageSquareText, Palette, RefreshCw, Send, Share2, ShieldCheck, Sparkles, Trash2, TriangleAlert, Users, Wallet, Wand2, X,
} from "lucide-react";
import { CAT, TODAY, type Account, type Txn } from "./data";
import { annualCost, compare, fmtDate, getRange, inRange, isoDay, LANGS, METHOD_LABEL, safeToSpend, summarize } from "./lib";
import { NOTIF_TYPES, newId, useApp } from "./store";
import { Amt, Btn, Card, CatIcon, Chip, cx, Gate, IconBtn, Link, Page, Pill, Progress, Row, Section, Seg, Sheet, Toggle } from "./ui";

const Ico = ({ i: I }: { i: typeof Bell }) => <span className="grid size-10 shrink-0 place-items-center rounded-full bg-l-sunk text-l-ink" aria-hidden="true"><I size={19} strokeWidth={1.8} /></span>;

/* ───────── You tab ───────── */
export function You() {
  const { s, p, push, t, empty } = useApp();
  const attention = s.accounts.filter((a) => a.status === "attention").length;
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-32 @3xl:px-8">
      <header className="flex min-h-16 items-center pt-2"><h1 className="flex-1 text-xl font-semibold">{t("You")}</h1></header>
      <div className="grid gap-5 @4xl:grid-cols-2">
        <div className="space-y-5">
          <Card className="flex items-center gap-4 p-5">
            <span className="grid size-14 place-items-center rounded-full bg-l-pri text-2xl font-semibold text-l-onpri" aria-hidden="true">{p.name[0]}</span>
            <div className="flex-1"><p className="text-lg font-semibold">{p.full}</p><p className="text-[15px] text-l-mute">{s.settings.plus ? "Ledgerly Plus · trial" : "Free forever plan"} · {p.city}</p></div>
          </Card>
          <Section title="Your money">
            <Card className="py-1">
              <Row chevron onClick={() => push("accounts")} icon={<Ico i={Landmark} />} title="Accounts & sync" sub={empty ? "Nothing connected — manual is fine" : attention ? `${attention} needs attention · others up to date` : "All up to date"} />
              <Row chevron onClick={() => push("shared")} icon={<Ico i={Users} />} title="Shared space & splits" sub={`With ${p.flatmate} · mine / yours / ours`} />
              <Row chevron onClick={() => push("assistant")} icon={<Ico i={Sparkles} />} title="Ask Ledgerly" sub="Plain-language questions about your money" />
              <Row chevron onClick={() => push("recap", "week")} icon={<Ico i={CalendarDays} />} title="Weekly recap" sub="30 seconds · ready on Sunday evening" />
              <Row chevron onClick={() => push("recap", "month")} icon={<Ico i={CalendarDays} />} title="Monthly recap" sub="Arrives on payday" />
              <Row chevron onClick={() => push("rules")} icon={<Ico i={Wand2} />} title="Rules it has learned" sub={`${s.rules.length} ${s.rules.length === 1 ? "rule" : "rules"} from your corrections`} />
            </Card>
          </Section>
        </div>
        <div className="space-y-5">
          <Section title="Settings">
            <Card className="py-1">
              <Row chevron onClick={() => push("privacy")} icon={<Ico i={ShieldCheck} />} title="Privacy & your data" sub="What's stored, where, and what never is" />
              <Row chevron onClick={() => push("settings", "notifications")} icon={<Ico i={Bell} />} title="Notifications" sub="At most one a day · you choose which" />
              <Row chevron onClick={() => push("settings", "appearance")} icon={<Ico i={Palette} />} title="Appearance" sub={`${s.settings.theme === "dark" ? "Dark" : "Light"}${s.settings.large ? " · large text" : ""}${s.settings.hide ? " · amounts hidden" : ""}`} />
              <Row chevron onClick={() => push("settings", "language")} icon={<Ico i={Languages} />} title="Language" sub={LANGS.find((l) => l.id === s.settings.lang)!.name} />
              <Row chevron onClick={() => push("settings", "calendar")} icon={<Ico i={CalendarDays} />} title="Week & month start" sub={`Month starts on day ${s.settings.monthStart} · week on ${["Sunday", "Monday", "", "", "", "", "Saturday"][s.settings.weekStart]}`} />
              <Row chevron onClick={() => push("settings", "security")} icon={<Ico i={Lock} />} title="Security" sub={s.settings.lock ? `App lock on · ${s.settings.autoLock.toLowerCase()}` : "App lock off"} />
              <Row chevron onClick={() => push("settings", "export")} icon={<Ico i={Download} />} title="Export" sub="CSV, PDF statement, Sheets — always free" />
              <Row chevron onClick={() => push("settings", "plus")} icon={<Ico i={Sparkles} />} title="Ledgerly Plus" sub="Optional extras · no ads either way" />
              <Row chevron onClick={() => push("settings", "delete")} icon={<Ico i={Trash2} />} title="Delete account" sub="Self-serve, takes one minute" />
            </Card>
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ───────── Accounts & sync ───────── */
export function Accounts() {
  const { s, set, toast, open, setting, p } = useApp();
  const failed = s.demo === "error";
  const fix = (a: Account) => { const before = s.accounts; set({ accounts: s.accounts.map((x) => (x.id === a.id ? { ...x, status: "ok", synced: "just now" } : x)) }); toast(`${a.name} reconnected`, () => set({ accounts: before })); };
  const icon = { savings: Landmark, card: CreditCard, wallet: Wallet, cash: Banknote };
  const src = [
    { k: "sms" as const, i: MessageSquareText, name: p.cur === "INR" ? "SMS & UPI alerts" : "Bank notifications", body: "Read on this phone only. Nothing is uploaded." },
    { k: "email" as const, i: Mail, name: "Email receipts", body: "Only receipts from shops — never personal mail." },
    { k: "bank" as const, i: Landmark, name: p.cur === "INR" ? "Bank link (Account Aggregator)" : "Bank link", body: "Read-only by design. Ledgerly can never move money." },
  ];
  return (
    <Page title="Accounts & sync">
      <Gate empty={{ icon: Landmark, title: "No accounts yet — and that's fine", body: "Ledgerly works fully by hand. Add a cash wallet now, or connect a bank later if you'd like less typing.", cta: "Add cash wallet", onCta: () => toast("Cash wallet added") }}>
        <div className="grid gap-5 @4xl:grid-cols-2">
          <Section title="Accounts">
            <div className="space-y-3">
              {s.accounts.map((a, i) => {
                const I = icon[a.type];
                const bad = failed && i === 0;
                return (
                  <Card key={a.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Ico i={I} />
                      <div className="min-w-0 flex-1"><p className="truncate text-base font-semibold">{a.name}</p><p className="text-[13px] text-l-mute">{a.source}</p></div>
                      <Amt n={a.balance} className="text-base font-semibold" />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      {bad ? <Pill tone="crit"><TriangleAlert size={13} />Sync failed 2 hrs ago</Pill> : a.status === "ok" ? <Pill tone="pos"><CircleCheck size={13} />Synced {a.synced}</Pill> : a.status === "attention" ? <Pill tone="amb"><TriangleAlert size={13} />Needs attention · last synced {a.synced}</Pill> : <Pill>{a.synced}</Pill>}
                      {bad ? <Link onClick={() => toast("Still can't reach the bank. Your earlier data is safe, and we'll retry quietly.")}>Retry</Link> : a.status === "attention" ? <Link onClick={() => fix(a)}>Reconnect</Link> : a.type === "cash" ? <Link onClick={() => open("cash")}>Cash check</Link> : null}
                    </div>
                    {a.type === "card" && a.limit && (
                      <div className="mt-3 border-t border-l-rule pt-3">
                        <Progress value={-a.balance} max={a.limit} />
                        <p className="mt-1.5 text-[13px] text-l-mute">{Math.round((-a.balance / a.limit) * 100)}% of limit used · payment due on the {a.dueDay}th</p>
                      </div>
                    )}
                  </Card>
                );
              })}
              <Btn variant="soft" full onClick={() => toast("Travel currency added · EUR, converted at the day's rate")}><Globe size={18} />Add an account or travel currency</Btn>
            </div>
          </Section>
          <Section title="Auto-capture (all optional)">
            <Card className="py-1">
              {src.map((x) => <Row key={x.k} icon={<Ico i={x.i} />} title={x.name} sub={x.body} right={<Toggle label={x.name} on={s.settings.sources[x.k]} onChange={(v) => { setting({ sources: { ...s.settings.sources, [x.k]: v } }); toast(v ? `${x.name} is on · new entries go to “To review” first` : `${x.name} is off · nothing more will be read`); }} />} />)}
            </Card>
            <p className="mt-3 text-[13px] text-l-mute">Auto-captured entries always show where they came from and how sure we are. You can correct any of them in one tap.</p>
          </Section>
        </div>
      </Gate>
    </Page>
  );
}
export function CashSheet() {
  const { s, set, close, toast, p, m, addTxn } = useApp();
  const cash = s.accounts.find((a) => a.type === "cash")!;
  const [v, setV] = useState(String(cash.balance));
  const diff = cash.balance - (parseFloat(v) || 0);
  return (
    <Sheet title="Cash check" onClose={close}>
      <p className="text-[15px] text-l-mute">Count the cash in your wallet. We think you have {m(cash.balance)}.</p>
      <label className="mt-3 block text-[13px] font-medium text-l-mute">Cash in hand
        <input inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} className="mt-1 block min-h-14 w-full rounded-xl border border-l-ctrl bg-l-card px-3 text-2xl font-semibold text-l-ink" />
      </label>
      <p className="mt-3 min-h-12 text-[15px]">{Math.abs(diff) < 1 ? "Spot on. Nothing to adjust." : diff > 0 ? `${m(diff)} isn't accounted for. That's normal with cash — we'll log it as one “Untracked cash” entry.` : `You have ${m(-diff)} more than expected. We'll add it to your wallet.`}</p>
      <Btn full className="mt-2" onClick={() => {
        const before = s.accounts;
        set({ accounts: s.accounts.map((a) => (a.id === cash.id ? { ...a, balance: parseFloat(v) || 0, synced: "Cash check just now" } : a)) });
        close();
        if (diff >= 1) addTxn({ id: newId(), ts: TODAY.getTime(), amount: diff, kind: "expense", cat: "other", merchant: "Untracked cash", method: "cash", account: p.methodAccount.cash }, "Cash wallet matched up");
        else toast("Cash wallet matched up", () => set({ accounts: before }));
      }}>Match it up</Btn>
    </Sheet>
  );
}

/* ───────── Shared space ───────── */
export function Shared() {
  const { s, set, txns, cal, p, m, toast } = useApp();
  const [view, setView] = useState<"ours" | "mine" | "yours">("ours");
  const [share, setShare] = useState(false);
  const mo = getRange({ kind: "month", offset: 0 }, cal);
  const inr = p.cur === "INR";
  const sharedNames = inr ? ["BigBasket", "ACT Fibernet", "BESCOM electricity"] : ["H-E-B", "Google Fiber", "Austin Energy"];
  const ours = inRange(txns, mo.start, mo.end).filter((t) => t.kind === "expense" && (sharedNames.includes(t.merchant) || t.splitWith?.includes(p.flatmate)));
  const theirs = inr ? [{ name: "Gas cylinder", amount: 1100 }, { name: "Cleaning supplies", amount: 460 }] : [{ name: "Cleaning supplies", amount: 24 }, { name: "Costco run", amount: 61.5 }];
  const owed = ours.reduce((a, t) => a + t.amount / 2, 0) - theirs.reduce((a, t) => a + t.amount / 2, 0);
  return (
    <Page title="Shared space" sub={`You & ${p.flatmate}`}>
      <Seg label="Whose spending" value={view} onChange={setView} options={[{ id: "ours", label: "Ours" }, { id: "mine", label: "Mine" }, { id: "yours", label: `${p.flatmate}'s` }]} />
      <Gate empty={{ icon: Users, title: "Share only what you choose", body: "Invite a partner or flatmate to a shared space for rent and groceries. Your personal spending stays yours.", cta: "Invite someone", onCta: () => toast("Invite link copied") }}>
        {view === "ours" ? (
          <div className="grid gap-5 @4xl:grid-cols-2">
            <Card className="p-5">
              {s.settled ? (
                <><p className="flex items-center gap-2 text-lg font-semibold"><CircleCheck size={22} className="text-l-pos" aria-hidden="true" />All settled up</p><p className="mt-1 text-[15px] text-l-mute">Nothing owed either way this month.</p></>
              ) : (
                <>
                  <p className="text-[15px] font-medium text-l-mute">{owed >= 0 ? `${p.flatmate} owes you` : `You owe ${p.flatmate}`}</p>
                  <Amt n={Math.abs(owed)} className="text-[40px] font-semibold leading-tight" />
                  <p className="text-[15px] text-l-mute">Split evenly across {ours.length + theirs.length} shared spends this month. No line-by-line auditing needed.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Btn onClick={() => { set({ settled: true }); toast("Marked as settled", () => set({ settled: false })); }}>Mark as settled</Btn>
                    <Btn variant="outline" onClick={() => toast(`A friendly nudge is ready to send to ${p.flatmate}`)}><Send size={18} />Send a nudge</Btn>
                  </div>
                </>
              )}
            </Card>
            <Section title="Shared this month">
              <Card className="py-1">
                {ours.slice(0, 6).map((t) => <Row key={t.id} icon={<CatIcon cat={t.cat} size={36} />} title={t.merchant} sub={`You paid · ${fmtDate(t.ts)}`} right={<span className="text-end"><Amt n={t.amount} className="block font-semibold" /><span className="block text-[13px] text-l-mute">{m(t.amount / 2)} each</span></span>} />)}
                {theirs.map((t) => <Row key={t.name} icon={<Ico i={Users} />} title={t.name} sub={`${p.flatmate} paid`} right={<span className="text-end"><Amt n={t.amount} className="block font-semibold" /><span className="block text-[13px] text-l-mute">{m(t.amount / 2)} each</span></span>} />)}
              </Card>
            </Section>
          </div>
        ) : view === "mine" ? (
          <Card className="space-y-3 p-5">
            <p className="flex items-center gap-2 text-base font-semibold"><EyeOff size={20} aria-hidden="true" />Your personal spending is private</p>
            <p className="text-[15px] text-l-mute">{p.flatmate} sees only what you put in Ours. Not your coffees, not your shopping, not your balance.</p>
            <Row title="Share my category totals" sub="Totals only, never individual spends" right={<Toggle label="Share my category totals" on={share} onChange={setShare} />} />
          </Card>
        ) : (
          <Card className="p-5"><p className="text-base font-semibold">{p.flatmate} keeps personal spending private</p><p className="mt-1 text-[15px] text-l-mute">You&apos;ll see only what {p.flatmate} adds to Ours. Fairness without checking up on each other.</p></Card>
        )}
      </Gate>
    </Page>
  );
}

/* ───────── AI assistant ───────── */
interface Msg { me: boolean; text: string; steps?: string[] }
export function Assistant() {
  const { s, txns, cal, p, m, empty } = useApp();
  const inr = p.cur === "INR";
  const trip = inr ? 40000 : 600;
  const qs = [`Can I afford a ${m(trip, { compact: true })} trip in March?`, "Where did my money go this week?", "Any charges that look off?", "What do my subscriptions cost?"];
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const R = { round: true };
  const answer = (q: string): Msg => {
    const l = q.toLowerCase();
    if (/afford|trip/.test(l)) {
      const months = [-1, -2, -3].map((o) => summarize(inRange(txns, getRange({ kind: "month", offset: o }, cal).start, getRange({ kind: "month", offset: o }, cal).end)));
      const left = months.reduce((a, x) => a + x.net, 0) / 3 - s.goals.reduce((a, g) => a + g.monthly, 0);
      const need = trip / 4;
      return { me: false, text: left >= need ? `Yes — comfortably. Setting aside ${m(need, R)} a month from December gets you to ${m(trip, R)} by March, and you usually have about ${m(left, R)} left over each month after your goals.` : `It's doable with a little planning. You'd need ${m(need, R)} a month until March, and you usually have about ${m(Math.max(0, left), R)} left after goals. Easing one flexible category or pushing the trip to April would close the gap.`,
        steps: [`Looked at your last 3 full months: average left over after spending was ${m(months.reduce((a, x) => a + x.net, 0) / 3, R)}.`, `Took off the ${m(s.goals.reduce((a, g) => a + g.monthly, 0), R)} a month already going to goals.`, `Divided ${m(trip, R)} by the 4 months until March.`, "This is an estimate, not advice. I can't see future income changes."] };
    }
    if (/week|where/.test(l)) {
      const r = getRange({ kind: "week", offset: 0 }, cal), sum = summarize(inRange(txns, r.start, r.end)), c = compare(txns, { kind: "week", offset: 0 }, cal);
      return { me: false, text: `This week you've spent ${m(sum.spent, R)}. Most went to ${sum.byCat.slice(0, 3).map((x) => `${CAT[x.id].name} (${m(x.total, R)})`).join(", ")}. ${c.prev !== null ? `That's ${m(Math.abs(sum.spent - c.prev), R)} ${sum.spent < c.prev ? "less" : "more"} than the same point last week.` : ""}`, steps: [`Added up ${sum.count} spends since ${fmtDate(r.start)}.`, "Left out transfers to your cash wallet and anything you excluded from budget."] };
    }
    if (/off|duplicate|unusual|charge/.test(l)) {
      const f = txns.filter((t) => t.flag);
      const dup = s.review.find((x) => x.flag === "duplicate");
      return { me: false, text: `${dup ? `One to check: two ${m(dup.amount)} charges at ${dup.merchant}, a minute apart — it's waiting in your review inbox. ` : ""}${f.length ? `Also, ${m(f[0].amount, R)} at ${f[0].merchant} was larger than your usual there, though it looks like a planned purchase.` : "Nothing else looks unusual."}`, steps: ["Compared each charge with your usual amount at that merchant.", "Looked for the same amount at the same merchant within 5 minutes."] };
    }
    if (/subscription/.test(l)) {
      const up = s.bills.find((b) => b.was);
      return { me: false, text: `Your subscriptions come to ${m(annualCost(s.bills), R)} a year across ${s.bills.filter((b) => b.sub).length} services.${up ? ` ${up.name} recently went up from ${m(up.was!)} to ${m(up.amount)}.` : ""}`, steps: ["Multiplied each monthly subscription by 12 and added the yearly ones."] };
    }
    return { me: false, text: "In this prototype I can answer the suggested questions below. In the real app you could ask anything about your own spending — and I'd always show my working." };
  };
  const ask = (q: string) => { if (!q.trim()) return; setMsgs((x) => [...x, { me: true, text: q }, empty ? { me: false, text: "There isn't any spending to look at yet. Once you've logged a few days, ask me anything." } : answer(q)]); setInput(""); };
  return (
    <Page title="Ask Ledgerly" sub="Explains its reasoning · can never move money">
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        {msgs.length === 0 && <Card className="p-5 text-[15px] text-l-mute"><Sparkles size={22} className="mb-2 text-l-pri" aria-hidden="true" />Ask in plain language. Answers come from your own data, on your terms — nothing is sold or used for ads.</Card>}
        <div className="space-y-3" aria-live="polite">
          {msgs.map((x, i) => (
            <div key={i} className={cx("l-fade max-w-[88%] rounded-2xl px-4 py-3 text-base", x.me ? "ms-auto bg-l-pri text-l-onpri" : "border border-l-rule bg-l-card")}>
              <p className={cx(!x.me && s.settings.hide && "l-blur")}>{x.text}</p>
              {x.steps && (
                <details className="mt-2 text-[14px] text-l-mute"><summary className="min-h-8 cursor-pointer font-medium text-l-pri">How I worked this out</summary><ol className="mt-1 list-decimal space-y-1 ps-5">{x.steps.map((st) => <li key={st}>{st}</li>)}</ol></details>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">{qs.map((q) => <Chip key={q} onClick={() => ask(q)} className="h-auto min-h-11 py-2 text-start text-[14px]">{q}</Chip>)}</div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
          <label className="flex-1"><span className="sr-only">Your question</span><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your money" className="min-h-12 w-full rounded-xl border border-l-ctrl bg-l-card px-3 text-base placeholder:text-l-mute" /></label>
          <button type="submit" aria-label="Send" className="grid size-12 place-items-center rounded-xl bg-l-pri text-l-onpri"><Send size={20} /></button>
        </form>
      </div>
    </Page>
  );
}

/* ───────── Recap (story) ───────── */
export function Recap({ kind }: { kind: string }) {
  const { s, txns, cal, p, m, toast, pop } = useApp();
  const [i, setI] = useState(0);
  const [noAmt, setNoAmt] = useState(false);
  const week = kind !== "month";
  const sel = { kind: week ? ("week" as const) : ("month" as const), offset: week ? 0 : -1 };
  const r = getRange(sel, cal);
  const list = inRange(txns, r.start, r.end);
  const sum = summarize(list), cmp = compare(txns, sel, cal);
  const visits = sum.merchants.slice().sort((a, b) => b.count - a.count)[0];
  const worth = list.filter((t) => t.mood === "worth").length;
  const A = (n: number) => (noAmt ? "•••" : m(n, { round: true }));
  const pctPrev = cmp.prev ? Math.round(((sum.spent - cmp.prev) / cmp.prev) * 100) : 0;
  const g = s.goals[0];
  const slides = sum.count === 0 ? [{ k: "Nothing yet", big: "A quiet one", body: "No spends logged for this period. Your recap will fill in as you go." }] : [
    { k: week ? "Your week" : `Your ${r.label}`, big: A(sum.spent), body: cmp.prev ? `${Math.abs(pctPrev)}% ${pctPrev <= 0 ? "lighter" : "fuller"} than ${cmp.prevLabel}. ${pctPrev < -25 ? "A much quieter stretch." : pctPrev <= 0 ? "Nicely steady." : "Some weeks are like that."}` : "Your first recap — a baseline to look back on." },
    { k: "Where most of it went", big: CAT[sum.byCat[0].id].name, body: `${Math.round((sum.byCat[0].total / sum.spent) * 100)}% of spending${noAmt ? "" : ` · ${m(sum.byCat[0].total, { round: true })}`}. Then ${sum.byCat.slice(1, 3).map((c) => CAT[c.id].name).join(" and ")}.` },
    { k: "Your regular", big: visits.name, body: `${visits.count} visits${noAmt ? "" : `, about ${m(visits.total / visits.count, { round: true })} each`}.${worth ? ` You marked ${worth} ${worth === 1 ? "spend" : "spends"} as “worth it”.` : ""}` },
    ...(g ? [{ k: "Quietly adding up", big: `${Math.round((g.saved / g.target) * 100)}%`, body: `${g.name} is ${Math.round((g.saved / g.target) * 100)}% funded${noAmt ? "" : ` — ${m(g.saved, { round: true })} so far`}.` }] : []),
    { k: "That's it", big: "See you next " + (week ? "Sunday" : "payday"), body: "No homework. If you'd like one small thing: glance at your review inbox." },
  ];
  const cur = slides[Math.min(i, slides.length - 1)];
  const next = () => (i < slides.length - 1 ? setI(i + 1) : pop());
  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col p-4">
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-3xl bg-l-pri p-6 text-l-onpri">
        <div className="flex gap-1.5" role="progressbar" aria-label={`Slide ${i + 1} of ${slides.length}`} aria-valuenow={i + 1} aria-valuemin={1} aria-valuemax={slides.length}>
          {slides.map((_, k) => <span key={k} className="h-1 flex-1 rounded-full bg-current" style={{ opacity: k <= i ? 1 : 0.3 }} />)}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[15px] font-medium opacity-90">{p.name}&apos;s {week ? "weekly" : "monthly"} recap</span>
          <button type="button" onClick={pop} aria-label="Close recap" className="grid size-11 place-items-center rounded-full hover:bg-black/10"><X size={22} /></button>
        </div>
        <div key={i} className="l-fade flex flex-1 flex-col justify-center" aria-live="polite">
          <p className="text-[15px] font-semibold uppercase tracking-wide opacity-80">{cur.k}</p>
          <p className="mt-2 text-[44px] font-semibold leading-[1.05] tracking-tight">{cur.big}</p>
          <p className="mt-4 text-lg leading-snug opacity-95">{cur.body}</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} aria-label="Previous" className="grid size-12 place-items-center rounded-full border border-current disabled:opacity-30"><ChevronLeft size={22} /></button>
          <button type="button" onClick={() => toast(noAmt ? "Share card ready — amounts hidden" : "Share card ready — includes amounts")} className="flex min-h-12 items-center gap-2 rounded-full border border-current px-4 text-[15px] font-medium"><Share2 size={18} />Share</button>
          <button type="button" onClick={next} aria-label={i < slides.length - 1 ? "Next" : "Finish"} className="grid size-12 place-items-center rounded-full bg-l-onpri text-l-pri"><ChevronRight size={22} /></button>
        </div>
      </div>
      <div className="flex items-center justify-between px-2 pt-3"><span className="text-[15px]">Hide amounts when sharing</span><Toggle label="Hide amounts when sharing" on={noAmt} onChange={setNoAmt} /></div>
    </div>
  );
}

/* ───────── Notifications centre ───────── */
export function Notifications() {
  const { s, set, push, toast, empty } = useApp();
  const list = empty ? [] : s.notifs;
  const go = (route?: string) => (route === "recap" ? push("recap", "week") : route ? push(route) : undefined);
  return (
    <Page title="Notifications" right={<IconBtn icon={BellOff} label="Notification settings" onClick={() => push("settings", "notifications")} />}>
      <Gate empty={{ icon: Bell, title: "All quiet", body: "Ledgerly sends at most one notification a day, and only the kinds you've switched on." }}>
        <div className="mx-auto max-w-2xl space-y-3">
          {list.length === 0 && <Card className="py-8 text-center text-l-mute">You&apos;re all caught up.</Card>}
          {list.map((n) => (
            <Card key={n.id} className="p-4">
              <div className="flex items-start justify-between gap-2"><Pill tone={n.type === "Unusual charge" ? "amb" : "neutral"}>{n.type}</Pill><span className="text-[13px] text-l-mute">{n.when}</span></div>
              <p className="mt-2 text-base font-semibold">{n.title}</p>
              <p className="text-[15px] text-l-mute">{n.body}</p>
              <div className="mt-2 flex items-center gap-1">
                <Link onClick={() => go(n.route)}>Open</Link>
                <span className="flex-1" />
                <Link onClick={() => { const before = s.notifs; set({ notifs: s.notifs.filter((x) => x.id !== n.id) }); toast("Dismissed", () => set({ notifs: before })); }}>Dismiss</Link>
                <Link onClick={() => toast(`“${n.type}” notifications turned off`, () => undefined)}>Turn off this type</Link>
              </div>
            </Card>
          ))}
          <p className="text-center text-[13px] text-l-mute">At most one proactive notification a day. Quiet hours 10 pm – 8 am.</p>
        </div>
      </Gate>
    </Page>
  );
}

/* ───────── Rules ───────── */
export function Rules() {
  const { s, set, toast } = useApp();
  return (
    <Page title="Rules it has learned">
      <div className="mx-auto max-w-2xl">
        {s.rules.length === 0 ? (
          <Card className="py-10 text-center"><Wand2 size={28} className="mx-auto mb-2 text-l-pri" aria-hidden="true" /><p className="text-lg font-semibold">No rules yet</p><p className="mx-auto mt-1 max-w-xs text-[15px] text-l-mute">When you correct a category, Ledgerly offers to remember it for that merchant. Those show up here.</p></Card>
        ) : (
          <Card className="py-1">{s.rules.map((r) => <Row key={r.merchant} icon={<CatIcon cat={r.cat} size={36} />} title={r.merchant} sub={`Always ${CAT[r.cat].name}`} right={<Link onClick={() => { const before = s.rules; set({ rules: s.rules.filter((x) => x.merchant !== r.merchant) }); toast("Rule removed", () => set({ rules: before })); }}>Remove</Link>} />)}</Card>
        )}
      </div>
    </Page>
  );
}

/* ───────── Privacy ───────── */
export function Privacy() {
  const { s, setting, push, p } = useApp();
  const rows = [
    ["Your transactions", "On this device, encrypted. Backed up only if you turn on sync — encrypted end to end, so we can't read them."],
    [p.cur === "INR" ? "Bank & UPI messages" : "Bank notifications", "Read on this phone to spot spends. The messages themselves never leave it."],
    ["Bank login details", `Never seen by Ledgerly. ${p.cur === "INR" ? "India's Account Aggregator framework" : "The bank link"} gives read-only access you can revoke anytime.`],
    ["Receipts & notes", "Stored with the transaction, encrypted the same way."],
  ];
  return (
    <Page title="Privacy & your data">
      <div className="grid gap-5 @4xl:grid-cols-2">
        <div className="space-y-5">
          <Card className="border-l-pri/30 bg-l-tint p-5"><ShieldCheck size={26} className="text-l-pri" aria-hidden="true" /><p className="mt-2 text-lg font-semibold">Your money data is yours.</p><p className="mt-1 text-[15px]">Ledgerly earns from an optional Plus plan — not from your data. No ads, no data sales, no loan or card offers. Ever.</p></Card>
          <Section title="What's stored, and where">
            <Card className="divide-y divide-l-rule py-1">{rows.map(([k, v]) => <div key={k} className="py-3"><p className="text-base font-medium">{k}</p><p className="text-[15px] text-l-mute">{v}</p></div>)}</Card>
          </Section>
        </div>
        <div className="space-y-5">
          <Section title="Ledgerly can never">
            <Card className="space-y-2 p-5 text-[15px]">{["Move, send or withdraw money", "Sell or share your data", "Show ads or recommend loans and cards", "Read personal messages or email"].map((x) => <p key={x} className="flex items-center gap-2"><X size={18} className="shrink-0 text-l-mute" aria-hidden="true" />{x}</p>)}</Card>
          </Section>
          <Section title="Your controls">
            <Card className="py-1">
              <Row title="Hide amounts" sub="Blurs every number — handy on the metro" right={<Toggle label="Hide amounts" on={s.settings.hide} onChange={(v) => setting({ hide: v })} />} />
              <Row chevron onClick={() => push("accounts")} title="What's connected" sub="Turn any source off in one tap" />
              <Row chevron onClick={() => push("settings", "export")} title="Download everything" sub="Your full history, in open formats" />
              <Row chevron onClick={() => push("settings", "delete")} title="Delete account & data" sub="Self-serve · no call, no form" />
            </Card>
          </Section>
          <p className="text-[13px] text-l-mute">Built to comply with India&apos;s DPDP Act and RBI Account Aggregator rules, and GDPR where it applies.</p>
        </div>
      </div>
    </Page>
  );
}

/* ───────── Settings sections ───────── */
function csv(txns: Txn[]) {
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return ["Date,Merchant,Category,Type,Amount,Paid with,Note", ...txns.map((t) => [isoDay(t.ts), q(t.merchant), q(CAT[t.cat].name), t.kind, t.amount, METHOD_LABEL[t.method], q(t.note ?? "")].join(","))].join("\n");
}
export function Settings({ section }: { section: string }) {
  const { s, set, setting, toast, txns, p, cal, pop } = useApp();
  const [confirm, setConfirm] = useState(false);
  const st = s.settings;
  const safe = useMemo(() => safeToSpend(txns, s.bills, s.goals, cal, p.monthlyIncome), [txns, s.bills, s.goals, cal, p.monthlyIncome]);
  const title = { appearance: "Appearance", language: "Language", calendar: "Week & month start", security: "Security", notifications: "Notifications", export: "Export", plus: "Ledgerly Plus", delete: "Delete account" }[section] ?? "Settings";
  const download = () => {
    const url = URL.createObjectURL(new Blob([csv(txns)], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `ledgerly-${p.name.toLowerCase()}.csv`; a.click(); URL.revokeObjectURL(url);
    toast(`Exported ${txns.length} transactions as CSV`);
  };
  return (
    <Page title={title}>
      <div className="mx-auto max-w-2xl space-y-5">
        {section === "appearance" && (
          <>
            <Section title="Theme"><Seg label="Theme" value={st.theme} onChange={(theme) => setting({ theme })} options={[{ id: "light", label: "Light" }, { id: "dark", label: "Dark" }]} /></Section>
            <Card className="py-1">
              <Row title="Hide amounts" sub="Blur numbers when you're in public" right={<Toggle label="Hide amounts" on={st.hide} onChange={(v) => setting({ hide: v })} />} />
              <Row title="Larger text, simpler screens" sub="Bigger type and fewer things per screen" right={<Toggle label="Larger text and simpler screens" on={st.large} onChange={(v) => setting({ large: v })} />} />
              <Row title="Reflections" sub="Optionally tag a spend as worth it, neutral or would skip" right={<Toggle label="Reflections" on={st.moods} onChange={(v) => setting({ moods: v })} />} />
            </Card>
            <p className="text-[13px] text-l-mute">Ledgerly follows your device&apos;s text size up to 200% and its reduce-motion setting.</p>
          </>
        )}
        {section === "language" && (
          <>
            <Card className="py-1" >
              <div role="radiogroup" aria-label="Language">
                {LANGS.map((l) => <Row key={l.id} onClick={() => { setting({ lang: l.id }); if (!l.ready) toast(`${l.name} is selected. This prototype shows English until the translation is complete.`); }} title={l.name} sub={l.ready ? undefined : "Translation in progress — shows English for now"} right={st.lang === l.id ? <CircleCheck size={20} className="text-l-pri" aria-label="Selected" /> : undefined} />)}
              </div>
            </Card>
            <p className="text-[13px] text-l-mute">Layouts use logical directions throughout, so right-to-left languages can be added without redesign.</p>
          </>
        )}
        {section === "calendar" && (
          <>
            <Section title="Week starts on"><Seg label="Week starts on" value={String(st.weekStart)} onChange={(v) => setting({ weekStart: +v })} options={[{ id: "1", label: "Monday" }, { id: "0", label: "Sunday" }, { id: "6", label: "Saturday" }]} /></Section>
            <Section title="Your month starts on">
              <div className="flex flex-wrap gap-2">{[1, 5, 7, 10, 15, 25, 28].map((d) => <Chip key={d} active={st.monthStart === d} onClick={() => { setting({ monthStart: d }); set({ range: { kind: "month", offset: 0 } }); }}>{d === 1 ? "1st" : `${d}th`}</Chip>)}</div>
              <p className="mt-3 text-[15px] text-l-mute">Match this to payday and every “month” in Ledgerly runs payday to payday. Right now it&apos;s <span className="font-medium text-l-ink">{getRange({ kind: "month", offset: 0 }, cal).label}</span>, with {safe.daysLeft} days to go.</p>
            </Section>
          </>
        )}
        {section === "security" && (
          <>
            <Card className="py-1">
              <Row title="App lock" sub="Fingerprint, face or PIN to open Ledgerly" right={<Toggle label="App lock" on={st.lock} onChange={(v) => setting({ lock: v })} />} />
              <Row title="Change PIN" chevron onClick={() => toast("PIN updated")} />
            </Card>
            {st.lock && <Section title="Lock automatically"><Seg label="Auto-lock" value={st.autoLock} onChange={(autoLock) => setting({ autoLock })} options={["Immediately", "After 1 minute", "After 5 minutes"].map((x) => ({ id: x, label: x }))} /></Section>}
            <p className="text-[13px] text-l-mute">Data is encrypted on this device and in transit. Bank access is read-only.</p>
          </>
        )}
        {section === "notifications" && (
          <>
            <Card className="py-1">{NOTIF_TYPES.map((n) => <Row key={n.id} title={n.label} sub={n.hint} right={<Toggle label={n.label} on={st.notif[n.id]} onChange={(v) => setting({ notif: { ...st.notif, [n.id]: v } })} />} />)}</Card>
            <Card className="py-1"><Row title="Quiet hours" sub="Nothing between 10 pm and 8 am" right={<Toggle label="Quiet hours" on={st.quiet} onChange={(v) => setting({ quiet: v })} />} /></Card>
            <p className="text-[13px] text-l-mute">Ledgerly sends at most one proactive notification a day. No streaks, no nagging about individual spends.</p>
          </>
        )}
        {section === "export" && (
          <>
            <Card className="py-1">
              <Row icon={<Ico i={FileSpreadsheet} />} title="CSV — every transaction" sub={`${txns.length} entries · opens in any spreadsheet`} right={<Btn variant="soft" onClick={download}><Download size={18} />Download</Btn>} />
              <Row icon={<Ico i={FileText} />} title="PDF monthly statement" sub="A clean one-page summary" right={<Btn variant="soft" onClick={() => toast("Statement for this month is ready in Downloads")}>Create</Btn>} />
              <Row icon={<Ico i={RefreshCw} />} title="Google Sheets / Excel" sub="Keeps a sheet up to date" right={<Btn variant="soft" onClick={() => toast("Linked · a new sheet “Ledgerly export” was created")}>Link</Btn>} />
            </Card>
            <p className="text-[13px] text-l-mute">Exports are free on every plan and always will be. It&apos;s your data.</p>
          </>
        )}
        {section === "plus" && (
          <>
            <Card className="p-5">
              <h2 className="text-base font-semibold">Free forever</h2>
              <p className="mt-1 text-[15px] text-l-mute">Manual tracking, auto-capture, every time range, basic budgets, bills & subscriptions, and all exports. No ads.</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-baseline justify-between"><h2 className="text-base font-semibold">Plus</h2><p className="text-[15px]"><span className="text-xl font-semibold">{p.cur === "INR" ? "₹99" : "$4"}</span> a month · or {p.cur === "INR" ? "₹799" : "$36"} a year</p></div>
              <p className="mt-1 text-[15px] text-l-mute">Ask Ledgerly, shared spaces, goals, net worth, advanced rules and unlimited history.</p>
              <ul className="mt-3 space-y-1 text-[15px]">{["14-day trial, no card needed", "We remind you 3 days before it ends", "Cancel in one tap, right here"].map((x) => <li key={x} className="flex items-center gap-2"><CircleCheck size={17} className="text-l-pos" aria-hidden="true" />{x}</li>)}</ul>
              <Btn full variant={st.plus ? "outline" : "primary"} className="mt-4" onClick={() => { setting({ plus: !st.plus }); toast(st.plus ? "Plus cancelled · you keep everything on Free" : "Trial started · ends 29 Nov, we'll remind you on the 26th", () => setting({ plus: st.plus })); }}>{st.plus ? "Cancel Plus" : "Start free trial"}</Btn>
            </Card>
            <p className="text-[13px] text-l-mute">This prototype keeps Plus features unlocked so you can explore them.</p>
          </>
        )}
        {section === "delete" && (
          <Card className="space-y-3 p-5">
            <h2 className="text-lg font-semibold">Delete your account and all data</h2>
            <p className="text-[15px] text-l-mute">This removes your transactions, goals and connections from this device and our servers. You have 30 days to change your mind; after that it&apos;s gone for good.</p>
            <Btn variant="soft" onClick={() => { pop(); set((c) => ({ stack: [...c.stack, { name: "settings", id: "export" }] })); }}>Download my data first</Btn>
            {!confirm ? <Btn variant="outline" className="border-l-crit text-l-crit" onClick={() => setConfirm(true)}>Delete my account</Btn> : (
              <div className="rounded-xl bg-l-crittint p-3 text-l-crit"><p className="text-[15px] font-medium">Are you sure? This can be undone for 30 days.</p><div className="mt-2 flex gap-2"><Btn variant="outline" className="border-current text-current" onClick={() => { setConfirm(false); toast("Account scheduled for deletion on 15 Dec", () => undefined); }}>Yes, delete</Btn><Btn variant="ghost" className="text-current" onClick={() => setConfirm(false)}>Keep my account</Btn></div></div>
            )}
          </Card>
        )}
      </div>
    </Page>
  );
}
