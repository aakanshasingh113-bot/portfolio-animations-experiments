"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bell, CalendarDays, Camera, Check, ChevronLeft, ChevronRight, Delete, Eye, EyeOff, Inbox, Mic, PencilLine, Receipt, Search,
  ShieldCheck, Sparkles, Split, Trash2, Wand2, CircleCheckBig, MessageSquareText, Mail, Landmark,
} from "lucide-react";
import { CAT, CATEGORIES, TODAY, type CatId, type Method, type ReviewItem, type Txn } from "./data";
import { dayLabel, daysUntil, fmtDate, fmtTime, getRange, inRange, METHOD_LABEL, nextDue, parseQuery, RANGE_KINDS, runQuery, safeToSpend, suggestCats, suggestMerchants, summarize, type RangeKind } from "./lib";
import { newId, useApp } from "./store";
import { Amt, Btn, Card, CatIcon, Chip, cx, Gate, IconBtn, Link, Page, Pill, Row, Section, Seg, Sheet, Toggle, TxnRow } from "./ui";

function useCountUp(target: number) {
  const [v, setV] = useState(target);
  const from = useRef(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { from.current = target; return; }
    const start = performance.now(), a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 600), e = 1 - Math.pow(1 - k, 3);
      setV(a + (target - a) * e);
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? target : v;
}

/* ───────── Today ───────── */
export function Today() {
  const { s, p, txns, cal, t, push, open, setting, m, empty } = useApp();
  const [why, setWhy] = useState(false);
  const safe = useMemo(() => safeToSpend(txns, s.bills, s.goals, cal, p.monthlyIncome), [txns, s.bills, s.goals, cal, p.monthlyIncome]);
  const day = getRange({ kind: "day", offset: 0 }, cal);
  const todays = inRange(txns, day.start, day.end);
  const spentToday = summarize(todays).spent;
  const upcoming = s.bills.map((b) => ({ b, due: nextDue(b) })).filter((x) => daysUntil(x.due) <= 14).sort((a, b) => a.due.getTime() - b.due.getTime()).slice(0, 5);
  const perDay = useCountUp(Math.round(safe.perDay));
  const reviewN = empty ? 0 : s.review.length;
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-32 @3xl:px-8">
      <header className="flex min-h-16 items-center gap-1 pt-2">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{t("Good evening")}, {p.name}</h1>
          <p className="text-[13px] text-l-mute">{fmtDate(TODAY)} · {p.city}</p>
        </div>
        <IconBtn icon={s.settings.hide ? EyeOff : Eye} label={s.settings.hide ? "Show amounts" : "Hide amounts"} onClick={() => setting({ hide: !s.settings.hide })} />
        <IconBtn icon={Bell} label="Notifications" badge={empty ? 0 : 2} onClick={() => push("notifications")} />
      </header>
      <Gate rows={3} empty={{ icon: Sparkles, title: "Let's log your first spend", body: "Tap + and enter an amount. That's it — your safe-to-spend number appears as soon as there's something to work with.", cta: "Add a spend", onCta: () => open("add") }}>
        <div className="l-fade grid gap-5 @4xl:grid-cols-[1.1fr_1fr]">
          <div className="space-y-5">
            <Card className="p-5">
              <p className="text-[15px] font-medium text-l-mute">{t("Safe to spend")}</p>
              <p className="mt-1 flex items-baseline gap-2">
                <Amt n={perDay} round className="text-[44px] font-semibold leading-none tracking-tight" />
                <span className="text-base text-l-mute">{t("a day")}</span>
              </p>
              {safe.left >= 0 ? (
                <p className="mt-3 text-base"><Amt n={safe.left} round className="font-semibold" /> left for the next {safe.daysLeft} days, after bills and goals.</p>
              ) : (
                <p className="mt-3 rounded-xl bg-l-ambtint px-3 py-2 text-base text-l-amb">You&apos;re <Amt n={-safe.left} round className="font-semibold" /> past this month&apos;s plan. It happens — goals can flex if you&apos;d like.</p>
              )}
              <button type="button" onClick={() => setWhy(!why)} aria-expanded={why} className="mt-2 min-h-11 text-[15px] font-medium text-l-pri hover:underline">{why ? "Hide the working" : "How is this worked out?"}</button>
              {why && (
                <dl className="l-fade space-y-1.5 border-t border-l-rule pt-3 text-[15px]">
                  {([["Income this month", safe.income, ""], ["Spent so far", -safe.spent, ""], ["Bills still to come", -safe.upcoming, ""], ["Set aside for goals", -safe.goals, ""]] as const).map(([k, v]) => (
                    <div key={k} className="flex justify-between"><dt className="text-l-mute">{k}</dt><dd><Amt n={v} round /></dd></div>
                  ))}
                  <div className="flex justify-between border-t border-l-rule pt-1.5 font-semibold"><dt>Left to spend</dt><dd><Amt n={safe.left} round /></dd></div>
                </dl>
              )}
            </Card>
            {reviewN > 0 && (
              <Card className="py-1">
                <Row onClick={() => push("review")} chevron icon={<span className="grid size-10 place-items-center rounded-full bg-l-tint text-l-pri" aria-hidden="true"><Inbox size={20} /></span>}
                  title={`${reviewN} ${t("To review").toLowerCase()}`} sub="Auto-captured · a few swipes, whenever suits you" />
              </Card>
            )}
            <Section title={t("Coming up")} action={<Link onClick={() => { push("bills"); }}>{t("See all")}</Link>}>
              <div className="l-scroll -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 @3xl:mx-0 @3xl:px-0">
                {upcoming.map(({ b, due }) => (
                  <button key={b.id} type="button" onClick={() => push("bills")} className="w-40 shrink-0 rounded-2xl border border-l-rule bg-l-card p-3 text-start hover:bg-l-sunk">
                    <span className="block text-[13px] text-l-mute">{daysUntil(due) === 0 ? "Today" : daysUntil(due) === 1 ? "Tomorrow" : `In ${daysUntil(due)} days`}</span>
                    <span className="mt-0.5 block truncate text-[15px] font-medium">{b.name}</span>
                    <Amt n={b.amount} className="mt-1 block text-base font-semibold" />
                    {b.was && <span className="mt-1 block text-[13px] text-l-amb">Up from {m(b.was)}</span>}
                  </button>
                ))}
              </div>
            </Section>
          </div>
          <Section title={t("Today's spends")} action={<span className="text-[15px] text-l-mute">{t("Spent today")} <Amt n={spentToday} className="font-semibold text-l-ink" /></span>}>
            <Card className="py-1">
              {todays.length === 0 ? <p className="py-5 text-center text-[15px] text-l-mute">Nothing logged today yet. Tap + whenever you spend.</p> : todays.map((x) => <TxnRow key={x.id} t={x} />)}
            </Card>
          </Section>
        </div>
      </Gate>
    </div>
  );
}

/* ───────── Quick add ───────── */
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];
export function QuickAdd() {
  const { s, p, txns, close, addTxn, m, toast } = useApp();
  const hour = TODAY.getHours();
  const ranked = useMemo(() => suggestCats(s.txns, hour), [s.txns, hour]);
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [cat, setCat] = useState<CatId>(ranked[0]);
  const [allCats, setAllCats] = useState(false);
  const [merchant, setMerchant] = useState("");
  const [method, setMethod] = useState<Method>(p.cur === "INR" ? "upi" : "card");
  const [when, setWhen] = useState(0);
  const [note, setNote] = useState("");
  const [more, setMore] = useState(false);
  const [receipt, setReceipt] = useState(false);
  const [split, setSplit] = useState(false);
  const started = useRef(0);
  useEffect(() => { started.current = performance.now(); }, []);
  const merchants = useMemo(() => suggestMerchants(s.txns, cat, hour), [s.txns, cat, hour]);
  const press = (k: string) => setAmount((a) => (k === "⌫" ? a.slice(0, -1) : k === "." ? (a.includes(".") || p.cur === "INR" ? a : (a || "0") + ".") : a.replace(".", "").length >= 7 || (a.includes(".") && a.split(".")[1].length >= 2) ? a : a === "0" ? k : a + k));
  const value = parseFloat(amount) || 0;
  const save = () => {
    if (!value) return;
    const secs = ((performance.now() - started.current) / 1000).toFixed(1);
    const name = merchant || (kind === "income" ? "Income" : CAT[cat].name);
    const tx: Txn = { id: newId(), ts: TODAY.getTime() - when * 864e5 + txns.length, amount: split ? value / 2 : value, kind, cat, merchant: name, method, account: p.methodAccount[method], note: note || undefined, receipt, splitWith: split ? [p.flatmate] : undefined };
    addTxn(tx, `Saved ${m(tx.amount)} · ${name} · logged in ${secs}s${s.demo === "offline" ? " · will sync later" : ""}`);
    close();
  };
  const methods = (["upi", "card", "cash", "bank", "wallet"] as Method[]).filter((x) => p.cur === "INR" || x !== "upi");
  return (
    <Sheet title="Add a spend" onClose={close} onKey={(e) => { if (/^[0-9.]$/.test(e.key)) press(e.key); else if (e.key === "Backspace") press("⌫"); else if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON") save(); }}>
      <div className="flex items-center justify-between gap-2">
        <Seg label="Type" className="w-44" options={[{ id: "expense", label: "Spent" }, { id: "income", label: "Received" }]} value={kind} onChange={setKind} />
        <IconBtn icon={Mic} label="Add by voice" onClick={() => { setAmount(p.cur === "INR" ? "250" : "12"); setCat("transport"); setMerchant(p.cur === "INR" ? "Auto rickshaw" : "Uber"); toast(`Heard: “Spent ${p.cur === "INR" ? "250 on auto" : "12 on Uber"}”`); }} />
      </div>
      <p className="py-3 text-center text-[46px] font-semibold leading-none tracking-tight" aria-live="polite" aria-label={`Amount ${value}`}>
        <span className="text-l-mute">{p.cur === "INR" ? "₹" : "$"}</span>{amount || "0"}
      </p>
      {kind === "expense" && (
        <>
          <div className="l-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-2" role="group" aria-label="Category, suggested for this time of day">
            {(allCats ? ranked : ranked.slice(0, 4)).map((c) => (
              <Chip key={c} active={c === cat} onClick={() => { setCat(c); setMerchant(""); }}><CatIcon cat={c} size={24} />{CAT[c].name}</Chip>
            ))}
            {!allCats && <Chip onClick={() => setAllCats(true)}>More</Chip>}
          </div>
          <div className="l-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-2" role="group" aria-label="Where, optional">
            {merchants.map((x) => <Chip key={x} active={x === merchant} onClick={() => setMerchant(x === merchant ? "" : x)} className="min-h-9 text-[14px]">{x}</Chip>)}
          </div>
        </>
      )}
      <button type="button" onClick={() => setMore(!more)} aria-expanded={more} className="min-h-11 self-start text-[15px] font-medium text-l-pri hover:underline">
        {more ? "Fewer details" : `${METHOD_LABEL[method]} · ${when ? "Yesterday" : "Today"} · Add details`}
      </button>
      {more && (
        <div className="l-fade mb-2 space-y-3">
          <div className="l-scroll flex gap-2 overflow-x-auto" role="group" aria-label="Paid with">{methods.map((x) => <Chip key={x} active={x === method} onClick={() => setMethod(x)} className="min-h-9 text-[14px]">{METHOD_LABEL[x]}</Chip>)}</div>
          <div className="flex gap-2" role="group" aria-label="Date">{["Today", "Yesterday"].map((d, i) => <Chip key={d} active={when === i} onClick={() => setWhen(i)} className="min-h-9 text-[14px]">{d}</Chip>)}</div>
          <label className="block text-[13px] font-medium text-l-mute">Note
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Lunch with Kavya" className="mt-1 block min-h-11 w-full rounded-xl border border-l-ctrl bg-l-card px-3 text-base text-l-ink" />
          </label>
          <div className="flex gap-2">
            <Chip active={receipt} onClick={() => setReceipt(!receipt)} className="min-h-9 text-[14px]"><Camera size={16} />{receipt ? "Receipt attached" : "Receipt"}</Chip>
            <Chip active={split} onClick={() => setSplit(!split)} className="min-h-9 text-[14px]"><Split size={16} />{split ? `Split with ${p.flatmate}` : "Split"}</Chip>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2" aria-label="Number pad">
        {KEYS.map((k) => (
          <button key={k} type="button" onClick={() => press(k)} aria-label={k === "⌫" ? "Delete" : k === "." ? "Decimal point" : k} disabled={k === "." && p.cur === "INR"}
            className="grid min-h-13 place-items-center rounded-xl bg-l-sunk text-2xl font-medium hover:brightness-95 active:scale-[0.97] disabled:opacity-0">
            {k === "⌫" ? <Delete size={24} /> : k}
          </button>
        ))}
      </div>
      <Btn full className="mt-3 min-h-13 text-lg" disabled={!value} onClick={save}><Check size={20} />Save{split && value ? ` · your half ${m(value / 2)}` : ""}</Btn>
    </Sheet>
  );
}

/* ───────── Review inbox ───────── */
const SRC = { sms: { icon: MessageSquareText, label: "SMS on this phone" }, email: { icon: Mail, label: "Email receipt" }, bank: { icon: Landmark, label: "Bank feed" } };
export function Review() {
  const { s, set, toast, push, empty } = useApp();
  const [dx, setDx] = useState(0);
  const [editing, setEditing] = useState(false);
  const [rule, setRule] = useState(true);
  const [draft, setDraft] = useState<Partial<ReviewItem>>({});
  const drag = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const item = empty ? undefined : s.review[0];
  const cur = item ? { ...item, ...draft } : undefined;
  const done = (keep: boolean) => {
    if (!cur || !item) return;
    const restore = { review: s.review, txns: s.txns, rules: s.rules };
    const addRule = keep && rule && cur.merchant !== "Someone new" && (editing || cur.auto!.confidence < 0.8);
    set((c) => ({
      review: c.review.slice(1),
      txns: keep ? [{ ...cur, auto: { ...cur.auto!, confidence: 1 } }, ...c.txns].sort((a, b) => b.ts - a.ts) : c.txns,
      rules: addRule ? [...c.rules, { merchant: cur.merchant, cat: cur.cat }] : c.rules,
    }));
    toast(keep ? `Confirmed ${cur.merchant}${addRule ? ` · we'll remember it's ${CAT[cur.cat].name}` : ""}` : "Skipped — not counted", () => set(restore));
    setDx(0); setEditing(false); setDraft({}); setRule(true);
  };
  const Src = cur ? SRC[cur.auto!.source] : SRC.sms;
  const conf = cur ? Math.round(cur.auto!.confidence * 100) : 0;
  return (
    <Page title="To review" sub={item ? `${s.review.length} left · swipe right to confirm, left to edit` : undefined}>
      <Gate rows={2} empty={{ icon: Inbox, title: "Nothing to review", body: "When you turn on auto-capture, new transactions wait here for a quick yes or no. Until then, everything you add by hand is already confirmed." }}>
        {!cur ? (
          <Card className="flex flex-col items-center gap-2 py-12 text-center">
            <CircleCheckBig size={44} className="text-l-pos" aria-hidden="true" />
            <h2 className="text-lg font-semibold">All caught up</h2>
            <p className="max-w-xs text-[15px] text-l-mute">Everything is confirmed. Ledgerly will remember the corrections you made.</p>
            <Btn variant="soft" className="mt-3" onClick={() => push("rules")}>See what it has learned</Btn>
          </Card>
        ) : (
          <div className="mx-auto max-w-md">
            <div className="relative">
              {s.review.length > 1 && <div className="absolute inset-x-4 -bottom-2 h-10 rounded-2xl border border-l-rule bg-l-card" aria-hidden="true" />}
              <div
                onPointerDown={(e) => { if (editing || (e.target as HTMLElement).closest("button,input")) return; drag.current = e.clientX; setDragging(true); e.currentTarget.setPointerCapture(e.pointerId); }}
                onPointerMove={(e) => drag.current !== null && setDx(e.clientX - drag.current)}
                onPointerUp={() => { if (drag.current === null) return; drag.current = null; setDragging(false); if (dx > 90) done(true); else if (dx < -90) { setEditing(true); setDx(0); } else setDx(0); }}
                style={{ transform: `translateX(${dx}px) rotate(${dx / 40}deg)`, transition: dragging ? "none" : "transform .25s" }}
                className="relative touch-pan-y select-none rounded-2xl border border-l-rule bg-l-card p-5 shadow-sm">
                {dx > 30 && <span className="absolute start-4 top-4 rounded-lg bg-l-postint px-2 py-1 text-[13px] font-semibold text-l-pos">Confirm</span>}
                {dx < -30 && <span className="absolute end-4 top-4 rounded-lg bg-l-tint px-2 py-1 text-[13px] font-semibold text-l-pri">Edit</span>}
                <div className="flex flex-col items-center gap-1 text-center">
                  <CatIcon cat={cur.cat} size={52} />
                  {editing ? (
                    <input aria-label="Merchant name" value={cur.merchant} onChange={(e) => setDraft({ ...draft, merchant: e.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-l-ctrl bg-l-card px-3 text-center text-lg font-semibold" />
                  ) : <h2 className="mt-2 text-xl font-semibold">{cur.merchant}</h2>}
                  <p className="text-[13px] text-l-mute">Cleaned up from <span className="rounded bg-l-sunk px-1.5 py-0.5 font-mono text-[12px]">{cur.raw}</span></p>
                  <Amt n={cur.amount} className="my-2 text-[40px] font-semibold leading-none" />
                  <p className="text-[15px] text-l-mute">{dayLabel(cur.ts)}, {fmtTime(cur.ts)} · {METHOD_LABEL[cur.method]}</p>
                </div>
                {editing ? (
                  <div className="mt-4 flex flex-wrap justify-center gap-2" role="group" aria-label="Category">
                    {CATEGORIES.map((c) => <Chip key={c.id} active={c.id === cur.cat} onClick={() => setDraft({ ...draft, cat: c.id })} className="min-h-9 text-[14px]">{c.name}</Chip>)}
                  </div>
                ) : <p className="mt-3 flex justify-center"><Pill tone="pri">{CAT[cur.cat].name}</Pill></p>}
                <div className="mt-4 space-y-2 border-t border-l-rule pt-3 text-[14px]">
                  <p className="flex items-center gap-2 text-l-mute"><Src.icon size={16} aria-hidden="true" />{Src.label} · {conf >= 85 ? `${conf}% sure` : `Only ${conf}% sure — please check`}</p>
                  {cur.why && <p className={cx("rounded-xl px-3 py-2", cur.flag ? "bg-l-ambtint text-l-amb" : "bg-l-sunk text-l-ink")}>{cur.why}</p>}
                  {(editing || conf < 80) && !cur.flag && (
                    <div className="flex items-center justify-between gap-2"><span>Always categorise {cur.merchant} as {CAT[cur.cat].name}</span><Toggle on={rule} onChange={setRule} label="Always categorise this merchant this way" /></div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {cur.flag === "duplicate" ? (
                <><Btn variant="outline" onClick={() => done(false)}>It&apos;s a duplicate — skip</Btn><Btn onClick={() => done(true)}>Both are real</Btn></>
              ) : editing ? (
                <><Btn variant="outline" onClick={() => { setEditing(false); setDraft({}); }}>Cancel</Btn><Btn onClick={() => done(true)}><Check size={18} />Save &amp; confirm</Btn></>
              ) : (
                <><Btn variant="outline" onClick={() => setEditing(true)}><PencilLine size={18} />Edit</Btn><Btn onClick={() => done(true)}><Check size={18} />Looks right</Btn></>
              )}
            </div>
            <p className="mt-4 flex items-center justify-center gap-2 text-center text-[13px] text-l-mute"><ShieldCheck size={15} aria-hidden="true" />Messages are read on this phone only. They never leave it.</p>
          </div>
        )}
      </Gate>
    </Page>
  );
}

/* ───────── shared range control ───────── */
export function RangeBar() {
  const { s, set, cal, open } = useApp();
  const r = getRange(s.range, cal);
  const step = (d: number) => set((c) => ({ range: { ...c.range, offset: Math.min(0, c.range.offset + d) } }));
  return (
    <div className="space-y-2">
      <Seg label="Time range" options={RANGE_KINDS} value={s.range.kind} onChange={(kind: RangeKind) => { set({ range: { kind, offset: 0 } }); if (kind === "custom") open("range"); }} />
      <div className="flex items-center justify-between">
        <IconBtn icon={ChevronLeft} label={`Previous ${r.unit}`} onClick={() => step(-1)} className={cx("rtl:rotate-180", s.range.kind === "custom" && "invisible")} />
        <button type="button" onClick={() => open("range")} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-base font-semibold hover:bg-l-sunk" aria-label={`${r.label}. Change dates`}>
          <CalendarDays size={18} className="text-l-mute" aria-hidden="true" />{r.label}
        </button>
        <IconBtn icon={ChevronRight} label={`Next ${r.unit}`} onClick={() => step(1)} className={cx("rtl:rotate-180", (s.range.offset >= 0 || s.range.kind === "custom") && "invisible")} />
      </div>
    </div>
  );
}
export function useSwipe() {
  const { set, s } = useApp();
  const x = useRef<number | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => { x.current = e.touches[0].clientX; },
    onTouchEnd: (e: React.TouchEvent) => {
      if (x.current === null || s.range.kind === "custom") return;
      const d = e.changedTouches[0].clientX - x.current; x.current = null;
      if (Math.abs(d) > 70) set((c) => ({ range: { ...c.range, offset: Math.min(0, c.range.offset + (d > 0 ? -1 : 1)) } }));
    },
  };
}
export function RangeSheet() {
  const { s, set, cal, close } = useApp();
  const iso = (n: number) => { const d = new Date(n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const cur = getRange(s.range.kind === "custom" ? s.range : { kind: "custom", offset: 0 }, cal);
  const [from, setFrom] = useState(iso(cur.start));
  const [to, setTo] = useState(iso(cur.end - 864e5));
  const parse = (v: string) => { const [y, mo, d] = v.split("-").map(Number); return new Date(y, mo - 1, d).getTime(); };
  if (s.range.kind !== "custom")
    return (
      <Sheet title={`Jump to a ${getRange(s.range, cal).unit}`} onClose={close}>
        <div>
          {Array.from({ length: 8 }, (_, i) => -i).map((o) => {
            const r = getRange({ ...s.range, offset: o }, cal);
            return <Row key={o} title={r.label} sub={`${fmtDate(r.start)} – ${fmtDate(r.end - 864e5)}`} onClick={() => { set({ range: { ...s.range, offset: o } }); close(); }} right={o === s.range.offset ? <Check size={18} className="text-l-pri" aria-label="Selected" /> : undefined} />;
          })}
        </div>
      </Sheet>
    );
  return (
    <Sheet title="Custom dates" onClose={close}>
      <div className="grid grid-cols-2 gap-3">
        {([["From", from, setFrom], ["To", to, setTo]] as const).map(([l, v, fn]) => (
          <label key={l} className="text-[13px] font-medium text-l-mute">{l}
            <input type="date" value={v} min="2025-11-01" max="2026-11-15" onChange={(e) => fn(e.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-l-ctrl bg-l-card px-3 text-base text-l-ink" />
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {[["Last 14 days", 13], ["Last 30 days", 29], ["Last 90 days", 89]].map(([l, n]) => (
          <Chip key={l} className="min-h-9 text-[14px]" onClick={() => { setFrom(iso(TODAY.getTime() - (n as number) * 864e5)); setTo(iso(TODAY.getTime())); }}>{l}</Chip>
        ))}
      </div>
      <Btn full className="mt-4" disabled={!from || !to || parse(from) > parse(to)} onClick={() => { set({ range: { kind: "custom", offset: 0, from: parse(from), to: parse(to) } }); close(); }}>Show these dates</Btn>
    </Sheet>
  );
}

/* ───────── Activity ───────── */
export function Activity() {
  const { s, txns, cal, open } = useApp();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CatId | "all">("all");
  const [limit, setLimit] = useState(60);
  const swipe = useSwipe();
  const r = getRange(s.range, cal);
  const parsed = useMemo(() => parseQuery(q, cal), [q, cal]);
  const list = useMemo(() => {
    const base = q.trim() ? runQuery(txns, parsed) : inRange(txns, r.start, r.end);
    return cat === "all" ? base : base.filter((t) => t.cat === cat && t.kind === "expense");
  }, [txns, q, parsed, r.start, r.end, cat]);
  const groups = useMemo(() => {
    const g: { key: string; ts: number; items: Txn[]; total: number }[] = [];
    for (const t of list.slice(0, limit)) {
      const key = new Date(t.ts).toDateString();
      let last = g[g.length - 1];
      if (!last || last.key !== key) { last = { key, ts: t.ts, items: [], total: 0 }; g.push(last); }
      last.items.push(t);
      if (t.kind === "expense" && !t.excluded) last.total += t.amount;
    }
    return g;
  }, [list, limit]);
  const sum = summarize(list);
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-32 @3xl:px-8" {...swipe}>
      <header className="flex min-h-16 items-center pt-2"><h1 className="flex-1 text-xl font-semibold">Activity</h1></header>
      <div className="space-y-3">
        <label className="relative block">
          <span className="sr-only">Search transactions</span>
          <Search size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-l-mute" aria-hidden="true" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(60); }} placeholder="Try “food last weekend over 500”" className="min-h-12 w-full rounded-xl border border-l-ctrl bg-l-card pe-3 ps-10 text-base placeholder:text-l-mute" />
        </label>
        {q.trim() ? (
          <p className="flex flex-wrap items-center gap-2 text-[14px] text-l-mute">
            {parsed.understood.length ? <>Understood as {parsed.understood.map((u) => <Pill key={u} tone="pri">{u}</Pill>)}{parsed.text && <Pill>“{parsed.text}”</Pill>}</> : <>Searching merchants, notes and tags for “{parsed.text}”</>}
          </p>
        ) : <RangeBar />}
        <div className="l-scroll -mx-4 flex gap-2 overflow-x-auto px-4 @3xl:mx-0 @3xl:px-0" role="group" aria-label="Filter by category">
          <Chip active={cat === "all"} onClick={() => setCat("all")} className="min-h-9 text-[14px]">All</Chip>
          {CATEGORIES.map((c) => <Chip key={c.id} active={cat === c.id} onClick={() => setCat(cat === c.id ? "all" : c.id)} className="min-h-9 text-[14px]">{c.name}</Chip>)}
        </div>
        <Gate rows={6} empty={{ icon: Receipt, title: "Your spends will show up here", body: "Grouped by day, with a total for each. Add one by hand, or turn on auto-capture later — both are fine.", cta: "Add a spend", onCta: () => open("add") }}>
          <p className="text-[15px] text-l-mute">{list.length} {list.length === 1 ? "entry" : "entries"} · spent <Amt n={sum.spent} round className="font-semibold text-l-ink" />{sum.income > 0 && <> · received <Amt n={sum.income} round className="font-semibold text-l-ink" /></>}</p>
          {groups.length === 0 && <Card className="py-8 text-center text-[15px] text-l-mute">Nothing matches. Try a wider range or fewer filters.</Card>}
          {groups.map((g) => (
            <section key={g.key} aria-label={dayLabel(g.ts)}>
              <h2 className="sticky top-0 z-[5] -mx-4 flex items-center justify-between bg-l-bg/95 px-4 py-2 text-[14px] font-semibold backdrop-blur @3xl:mx-0 @3xl:px-1">
                <span>{dayLabel(g.ts)}</span><Amt n={g.total} round className="text-l-mute" />
              </h2>
              <Card className="py-1">{g.items.map((t) => <TxnRow key={t.id} t={t} />)}</Card>
            </section>
          ))}
          {list.length > limit && <Btn variant="soft" full onClick={() => setLimit(limit + 100)}>Show more ({list.length - limit} left)</Btn>}
        </Gate>
      </div>
    </div>
  );
}

/* ───────── Transaction detail & edit ───────── */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex min-h-12 items-center justify-between gap-3 border-b border-l-rule py-1 last:border-0"><span className="shrink-0 text-[15px] text-l-mute">{label}</span><div className="min-w-0 text-end text-base">{children}</div></div>;
}
export function TxnDetail({ id }: { id: string }) {
  const { s, p, set, updateTxn, deleteTxn, toast, push, m } = useApp();
  const t = s.txns.find((x) => x.id === id);
  if (!t) return <Page title="Transaction"><Card className="py-8 text-center text-l-mute">This entry was removed. You can restore it from Recently deleted for 30 days.</Card></Page>;
  const exp = t.kind === "expense";
  const friends = [p.flatmate, "Rohan", "Meera"];
  const setCat = (cat: CatId) => { const was = t.cat; updateTxn(id, { cat }); toast(`Moved to ${CAT[cat].name}`, () => updateTxn(id, { cat: was })); };
  const makeRule = () => {
    const before = s.txns, rules = s.rules;
    const n = s.txns.filter((x) => x.merchant === t.merchant && x.cat !== t.cat).length;
    set((c) => ({ rules: [...c.rules.filter((r) => r.merchant !== t.merchant), { merchant: t.merchant, cat: t.cat }], txns: c.txns.map((x) => (x.merchant === t.merchant ? { ...x, cat: t.cat } : x)) }));
    toast(`${t.merchant} will always be ${CAT[t.cat].name}${n ? ` · updated ${n} earlier` : ""}`, () => set({ txns: before, rules }));
  };
  return (
    <Page title={exp ? "Spend" : t.kind === "income" ? "Income" : "Transfer"} right={<IconBtn icon={Trash2} label="Delete" onClick={() => deleteTxn(id)} />}>
      <div className="grid gap-5 @4xl:grid-cols-2">
        <div className="space-y-5">
          <Card className="flex flex-col items-center gap-1 py-6 text-center">
            <CatIcon cat={t.cat} size={52} income={t.kind === "income"} />
            <input aria-label="Merchant" value={t.merchant} onChange={(e) => updateTxn(id, { merchant: e.target.value })} className="mt-2 w-full rounded-lg bg-transparent text-center text-xl font-semibold hover:bg-l-sunk" />
            <Amt n={t.amount} className="text-[40px] font-semibold leading-tight" />
            <p className="text-[15px] text-l-mute">{dayLabel(t.ts)}, {fmtTime(t.ts)}</p>
            {t.auto ? <Pill tone="pri"><Wand2 size={13} aria-hidden="true" />Auto-captured · {SRC[t.auto.source].label} · {Math.round(t.auto.confidence * 100)}% sure</Pill> : <Pill>Added by you</Pill>}
            {t.raw && <p className="text-[13px] text-l-mute">Originally “{t.raw}”</p>}
            {t.flag && <p className="mt-2 rounded-xl bg-l-ambtint px-3 py-2 text-[14px] text-l-amb">{t.flag === "spike" ? "This is larger than your usual spend here. Nothing wrong with that — just flagging it." : "This looks similar to another charge nearby."}</p>}
          </Card>
          <Card className="py-1">
            <Field label="Amount"><input aria-label="Amount" inputMode="decimal" value={t.amount} onChange={(e) => updateTxn(id, { amount: parseFloat(e.target.value) || 0 })} className="w-28 rounded-lg bg-l-sunk px-2 py-1.5 text-end font-semibold" /></Field>
            <Field label="Paid with">{METHOD_LABEL[t.method]} · {s.accounts.find((a) => a.id === t.account)?.name ?? t.account}</Field>
            <Field label="Note"><input aria-label="Note" value={t.note ?? ""} placeholder="Add a note" onChange={(e) => updateTxn(id, { note: e.target.value })} className="w-44 rounded-lg bg-l-sunk px-2 py-1.5 text-end placeholder:text-l-mute" /></Field>
            <Field label="Tags">{t.tags?.length ? t.tags.map((x) => <Pill key={x}>#{x}</Pill>) : <button type="button" className="min-h-11 font-medium text-l-pri" onClick={() => updateTxn(id, { tags: ["work"] })}>Add tag</button>}</Field>
            <Field label="Receipt"><button type="button" className="min-h-11 font-medium text-l-pri" onClick={() => { updateTxn(id, { receipt: !t.receipt }); toast(t.receipt ? "Receipt removed" : "Receipt attached"); }}>{t.receipt ? "receipt-photo.jpg · Remove" : "Attach photo"}</button></Field>
          </Card>
        </div>
        {exp && (
          <div className="space-y-5">
            <Section title="Category">
              <div className="flex flex-wrap gap-2">{CATEGORIES.map((c) => <Chip key={c.id} active={c.id === t.cat} onClick={() => c.id !== t.cat && setCat(c.id)} className="min-h-10 text-[14px]">{c.name}</Chip>)}</div>
              <Btn variant="soft" className="mt-3" onClick={makeRule}><Wand2 size={18} />Always categorise {t.merchant} as {CAT[t.cat].name}</Btn>
            </Section>
            <Card className="py-1">
              <Row title="Repeats every month" sub="Shows in Bills & subscriptions" right={<Toggle label="Mark as recurring" on={!!t.recurring} onChange={(v) => updateTxn(id, { recurring: v })} />} />
              <Row title="Leave out of budget" sub="Still listed, not counted in totals" right={<Toggle label="Exclude from budget" on={!!t.excluded} onChange={(v) => updateTxn(id, { excluded: v })} />} />
            </Card>
            <Section title="Split">
              <div className="flex flex-wrap gap-2">
                {friends.map((fr) => {
                  const on = t.splitWith?.includes(fr);
                  return <Chip key={fr} active={on} onClick={() => updateTxn(id, { splitWith: on ? t.splitWith!.filter((x) => x !== fr) : [...(t.splitWith ?? []), fr] })} className="min-h-10 text-[14px]">{fr}</Chip>;
                })}
              </div>
              {!!t.splitWith?.length && <p className="mt-2 text-[15px]">Your share is <span className="font-semibold">{m(t.amount / (t.splitWith.length + 1))}</span>. {t.splitWith.join(" and ")} {t.splitWith.length > 1 ? "each owe" : "owes"} you the same. <button type="button" className="font-medium text-l-pri underline" onClick={() => push("shared")}>Settle up</button></p>}
            </Section>
            {s.settings.moods && (
              <Section title="How did this one feel? (optional)">
                <div className="flex gap-2">
                  {([["worth", "Worth it"], ["neutral", "Neutral"], ["regret", "Would skip"]] as const).map(([k, l]) => <Chip key={k} active={t.mood === k} onClick={() => updateTxn(id, { mood: t.mood === k ? undefined : k })} className="min-h-10 text-[14px]">{l}</Chip>)}
                </div>
              </Section>
            )}
            <Btn variant="ghost" onClick={() => push("merchant", t.merchant)}>See everything at {t.merchant}</Btn>
          </div>
        )}
      </div>
    </Page>
  );
}
