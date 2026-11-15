import { CATEGORIES, DATA_START, TODAY, type Bill, type CatId, type Cur, type Goal, type Method, type Txn } from "./data";

/* ───────── formatting ───────── */
const trim = (s: string) => s.replace(/\.0$/, "");
export function money(n: number, cur: Cur, o: { compact?: boolean; sign?: boolean; round?: boolean } = {}): string {
  const neg = n < 0;
  const v = Math.abs(n);
  const sym = cur === "INR" ? "₹" : "$";
  let body: string;
  if (o.compact) {
    if (cur === "INR") body = v >= 1e7 ? trim((v / 1e7).toFixed(1)) + "Cr" : v >= 1e5 ? trim((v / 1e5).toFixed(1)) + "L" : v >= 1e3 ? trim((v / 1e3).toFixed(v >= 1e4 ? 0 : 1)) + "K" : String(Math.round(v));
    else body = v >= 1e6 ? trim((v / 1e6).toFixed(1)) + "M" : v >= 1e3 ? trim((v / 1e3).toFixed(v >= 1e4 ? 0 : 1)) + "K" : String(Math.round(v));
  } else if (cur === "INR") body = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v);
  else {
    const whole = o.round || Number.isInteger(v);
    body = new Intl.NumberFormat("en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 }).format(v);
  }
  return `${neg ? "−" : o.sign ? "+" : ""}${sym}${body}`;
}
export const METHOD_LABEL: Record<Method, string> = { upi: "UPI", card: "Card", cash: "Cash", bank: "Bank transfer", wallet: "Wallet" };
const DAY = 864e5;
const sod = (d: Date | number) => { const x = new Date(d); return new Date(x.getFullYear(), x.getMonth(), x.getDate()); };
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const f = (d: Date | number, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", o).format(d);
export const fmtTime = (ts: number) => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(ts).toLowerCase();
export const fmtDay = (ts: number | Date) => f(ts, { weekday: "short", day: "numeric", month: "short" });
export const fmtDate = (ts: number | Date) => f(ts, { day: "numeric", month: "short", year: "numeric" });
export const isoDay = (d: Date | number) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
export function dayLabel(ts: number): string {
  const diff = Math.round((sod(TODAY).getTime() - sod(ts).getTime()) / DAY);
  return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : fmtDay(ts);
}

/* ───────── time ranges ───────── */
export type RangeKind = "day" | "week" | "month" | "3m" | "6m" | "year" | "custom";
export const RANGE_KINDS: { id: RangeKind; label: string }[] = [
  { id: "day", label: "Day" }, { id: "week", label: "Week" }, { id: "month", label: "Month" },
  { id: "3m", label: "3M" }, { id: "6m", label: "6M" }, { id: "year", label: "Year" }, { id: "custom", label: "Custom" },
];
export interface Cal { weekStart: number; monthStart: number }
export interface Range { kind: RangeKind; start: number; end: number; label: string; current: boolean; unit: string }
export interface RangeSel { kind: RangeKind; offset: number; from?: number; to?: number }

export function finMonthStart(d: Date, ms: number) {
  return d.getDate() >= ms ? new Date(d.getFullYear(), d.getMonth(), ms) : new Date(d.getFullYear(), d.getMonth() - 1, ms);
}
export function getRange(sel: RangeSel, cal: Cal): Range {
  const { kind, offset } = sel;
  const now = TODAY.getTime();
  let s: Date, e: Date, label: string, unit = "period";
  if (kind === "day") {
    s = addDays(sod(TODAY), offset); e = addDays(s, 1); unit = "day";
    label = offset === 0 ? "Today" : offset === -1 ? "Yesterday" : fmtDay(s);
  } else if (kind === "week") {
    const t = sod(TODAY);
    s = addDays(t, -((t.getDay() - cal.weekStart + 7) % 7) + offset * 7); e = addDays(s, 7); unit = "week";
    label = offset === 0 ? "This week" : offset === -1 ? "Last week" : `${f(s, { day: "numeric", month: "short" })} – ${f(addDays(e, -1), { day: "numeric", month: "short" })}`;
  } else if (kind === "custom") {
    s = sod(sel.from ?? addDays(TODAY, -13)); e = addDays(sod(sel.to ?? TODAY), 1);
    label = `${f(s, { day: "numeric", month: "short" })} – ${f(addDays(e, -1), { day: "numeric", month: "short" })}`;
  } else {
    const n = kind === "month" ? 1 : kind === "3m" ? 3 : kind === "6m" ? 6 : 12;
    const b = finMonthStart(TODAY, cal.monthStart);
    s = new Date(b.getFullYear(), b.getMonth() + offset * n - (n - 1), cal.monthStart);
    e = new Date(b.getFullYear(), b.getMonth() + offset * n + 1, cal.monthStart);
    unit = n === 1 ? "month" : n === 12 ? "year" : `${n} months`;
    const last = addDays(e, -1);
    if (n === 1) label = cal.monthStart === 1 ? f(s, { month: "long", year: "numeric" }) : `${f(s, { day: "numeric", month: "short" })} – ${f(last, { day: "numeric", month: "short" })}`;
    else label = `${f(s, { month: "short", ...(s.getFullYear() !== last.getFullYear() ? { year: "numeric" } : {}) })} – ${f(last, { month: "short", year: "numeric" })}`;
  }
  return { kind, start: s.getTime(), end: e.getTime(), label, current: s.getTime() <= now && now < e.getTime(), unit };
}
export function prevRange(sel: RangeSel, cal: Cal): Range {
  if (sel.kind !== "custom") return getRange({ ...sel, offset: sel.offset - 1 }, cal);
  const r = getRange(sel, cal);
  const len = r.end - r.start;
  return { ...r, start: r.start - len, end: r.start, label: "previous period", current: false };
}

/* ───────── summaries ───────── */
export interface Summary {
  spent: number; income: number; net: number; count: number;
  byCat: { id: CatId; total: number; count: number }[];
  byMethod: { id: Method; total: number }[];
  merchants: { name: string; total: number; count: number; cat: CatId }[];
  recurring: number; oneTime: number; fixed: number; flexible: number;
}
export const isFixed = (t: Txn) => t.fixed ?? (t.cat === "home" || t.cat === "bills");
export function inRange(txns: Txn[], start: number, end: number) {
  return txns.filter((t) => t.ts >= start && t.ts < end);
}
export function summarize(list: Txn[]): Summary {
  const cat = new Map<CatId, { total: number; count: number }>();
  const meth = new Map<Method, number>();
  const mer = new Map<string, { total: number; count: number; cat: CatId }>();
  let spent = 0, income = 0, recurring = 0, fixed = 0, count = 0;
  for (const t of list) {
    if (t.kind === "income") { income += t.amount; continue; }
    if (t.kind !== "expense" || t.excluded) continue;
    spent += t.amount; count++;
    const c = cat.get(t.cat) ?? { total: 0, count: 0 }; c.total += t.amount; c.count++; cat.set(t.cat, c);
    meth.set(t.method, (meth.get(t.method) ?? 0) + t.amount);
    const m = mer.get(t.merchant) ?? { total: 0, count: 0, cat: t.cat }; m.total += t.amount; m.count++; mer.set(t.merchant, m);
    if (t.recurring) recurring += t.amount;
    if (isFixed(t)) fixed += t.amount;
  }
  return {
    spent, income, net: income - spent, count,
    byCat: [...cat].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.total - a.total),
    byMethod: [...meth].map(([id, total]) => ({ id, total })).sort((a, b) => b.total - a.total),
    merchants: [...mer].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total),
    recurring, oneTime: spent - recurring, fixed, flexible: spent - fixed,
  };
}
const spentIn = (txns: Txn[], s: number, e: number) => inRange(txns, s, e).reduce((a, t) => a + (t.kind === "expense" && !t.excluded ? t.amount : 0), 0);

export interface Compare { prev: number | null; prevLabel: string; typical: number | null; partial: boolean }
/** Compares like with like: a part-way period is measured against the same point of earlier ones. */
export function compare(txns: Txn[], sel: RangeSel, cal: Cal): Compare {
  const r = getRange(sel, cal);
  const elapsed = Math.min(r.end, TODAY.getTime() + 1) - r.start;
  const p = prevRange(sel, cal);
  const prev = p.start >= DATA_START.getTime() ? spentIn(txns, p.start, Math.min(p.end, p.start + elapsed)) : null;
  const vals: number[] = [];
  if (sel.kind !== "custom") {
    for (let k = 1; k <= 6; k++) {
      const q = getRange({ ...sel, offset: sel.offset - (sel.kind === "day" ? 7 * k : k) }, cal);
      if (q.start < DATA_START.getTime()) break;
      vals.push(spentIn(txns, q.start, Math.min(q.end, q.start + elapsed)));
    }
  }
  const names: Record<string, string> = { day: "yesterday", week: "last week", month: "last month" };
  const prevLabel = sel.kind === "custom" ? "the period before" : sel.offset === 0 && names[sel.kind] ? names[sel.kind] : `the previous ${r.unit}`;
  return { prev, prevLabel: (r.current && sel.kind !== "day" ? "the same point " : "") + prevLabel, typical: vals.length >= 2 ? vals.reduce((a, b) => a + b, 0) / vals.length : null, partial: r.current };
}

export interface Bar { label: string; value: number; hint: string; alt?: boolean; future?: boolean }
export interface Trend { type: "bars" | "cumulative"; bars: Bar[]; title: string; months?: { label: string; value: number }[]; cum?: number[]; days?: number; everyNth?: number }
export function trend(txns: Txn[], r: Range): Trend {
  const list = inRange(txns, r.start, r.end).filter((t) => t.kind === "expense" && !t.excluded);
  const now = TODAY.getTime();
  const days = Math.round((r.end - r.start) / DAY);
  const bucket = (starts: Date[], labelOf: (d: Date, i: number) => string, hintOf: (d: Date) => string): Bar[] =>
    starts.map((d, i) => {
      const e = i + 1 < starts.length ? starts[i + 1].getTime() : r.end;
      return { label: labelOf(d, i), hint: hintOf(d), value: list.reduce((a, t) => a + (t.ts >= d.getTime() && t.ts < e ? t.amount : 0), 0), future: d.getTime() > now, alt: false };
    });
  const kind = r.kind === "custom" ? (days <= 1 ? "day" : days <= 14 ? "week" : days <= 45 ? "daily" : days <= 200 ? "3m" : "year") : r.kind;
  if (kind === "day") {
    const s = new Date(r.start);
    const hrs = Array.from({ length: 24 }, (_, h) => new Date(s.getFullYear(), s.getMonth(), s.getDate(), h));
    const hl = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;
    return { type: "bars", title: "Through the day", everyNth: 3, bars: bucket(hrs, (d) => hl(d.getHours()), (d) => `${hl(d.getHours())}–${hl((d.getHours() + 1) % 24)}`) };
  }
  if (kind === "week" || kind === "daily") {
    const ds = Array.from({ length: days }, (_, i) => addDays(new Date(r.start), i));
    const bars = bucket(ds, (d) => (days <= 14 ? f(d, { weekday: "short" }) : String(d.getDate())), (d) => fmtDay(d));
    ds.forEach((d, i) => (bars[i].alt = d.getDay() === 0 || d.getDay() === 6));
    return { type: "bars", title: "Day by day", bars, everyNth: days > 14 ? 5 : 1 };
  }
  if (kind === "month") {
    const cum: number[] = []; let run = 0;
    for (let i = 0; i < days; i++) {
      const s = r.start + i * DAY;
      if (s > now) break;
      run += list.reduce((a, t) => a + (t.ts >= s && t.ts < s + DAY ? t.amount : 0), 0);
      cum.push(run);
    }
    return { type: "cumulative", title: "Running total vs your pace", bars: [], cum, days };
  }
  const monthStarts: Date[] = [];
  for (let d = new Date(r.start); d.getTime() < r.end; d = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate())) monthStarts.push(d);
  const months = bucket(monthStarts, (d) => f(d, { month: "short" }).slice(0, 3), (d) => f(d, { month: "long", year: "numeric" }));
  if (kind === "year") return { type: "bars", title: "Month by month", bars: months, months };
  const ws = Array.from({ length: Math.ceil(days / 7) }, (_, i) => addDays(new Date(r.start), i * 7));
  return { type: "bars", title: "Week by week", everyNth: ws.length > 14 ? 4 : 2, bars: bucket(ws, (d) => f(d, { day: "numeric", month: "short" }), (d) => `Week of ${f(d, { day: "numeric", month: "short" })}`), months };
}

/* ───────── safe to spend & bills ───────── */
export function nextDue(b: Bill, from = TODAY): Date {
  const t = sod(from);
  if (b.annualMonth !== undefined) {
    const d = new Date(t.getFullYear(), b.annualMonth, b.day);
    return d >= t ? d : new Date(t.getFullYear() + 1, b.annualMonth, b.day);
  }
  const d = new Date(t.getFullYear(), t.getMonth(), b.day);
  return d >= t ? d : new Date(t.getFullYear(), t.getMonth() + 1, b.day);
}
export const daysUntil = (d: Date) => Math.round((sod(d).getTime() - sod(TODAY).getTime()) / DAY);
export const annualCost = (bills: Bill[]) => bills.filter((b) => b.sub).reduce((a, b) => a + (b.annualMonth !== undefined ? b.amount : b.amount * 12), 0);

export interface Safe { left: number; perDay: number; daysLeft: number; income: number; spent: number; upcoming: number; goals: number; flexSpent: number }
export function safeToSpend(txns: Txn[], bills: Bill[], goals: Goal[], cal: Cal, fallbackIncome: number): Safe {
  const r = getRange({ kind: "month", offset: 0 }, cal);
  const s = summarize(inRange(txns, r.start, r.end));
  const upcoming = bills.reduce((a, b) => { const d = nextDue(b).getTime(); return a + (d > TODAY.getTime() && d < r.end ? b.amount : 0); }, 0);
  const g = goals.reduce((a, x) => a + (x.saved < x.target ? x.monthly : 0), 0);
  const income = Math.max(s.income, fallbackIncome);
  const left = income - s.spent - upcoming - g;
  const daysLeft = Math.max(1, Math.round((r.end - sod(TODAY).getTime()) / DAY));
  return { left, perDay: Math.max(0, left) / daysLeft, daysLeft, income, spent: s.spent, upcoming, goals: g, flexSpent: s.flexible };
}

/* ───────── natural-language search ───────── */
export interface Query { text: string; cat?: CatId; min?: number; max?: number; method?: Method; start?: number; end?: number; weekend?: boolean; understood: string[] }
const CAT_WORDS: Record<string, CatId> = {
  food: "food", dining: "food", eating: "food", restaurant: "food", restaurants: "food", coffee: "food", groceries: "groceries", grocery: "groceries",
  transport: "transport", travel: "travel", trip: "travel", cab: "transport", auto: "transport", shopping: "shopping", bills: "bills", emi: "bills",
  rent: "home", entertainment: "fun", fun: "fun", movies: "fun", health: "health", medical: "health", pharmacy: "health",
};
export function parseQuery(q: string, cal: Cal): Query {
  const out: Query = { text: "", understood: [] };
  let s = " " + q.toLowerCase().replace(/[₹$,]/g, "") + " ";
  const take = (re: RegExp, fn: (m: RegExpMatchArray) => void) => { const m = s.match(re); if (m) { fn(m); s = s.replace(m[0], " "); } };
  take(/ (?:over|above|more than|>) ?(\d+(?:\.\d+)?)(k)? /, (m) => { out.min = +m[1] * (m[2] ? 1000 : 1); out.understood.push(`over ${out.min}`); });
  take(/ (?:under|below|less than|<) ?(\d+(?:\.\d+)?)(k)? /, (m) => { out.max = +m[1] * (m[2] ? 1000 : 1); out.understood.push(`under ${out.max}`); });
  const t = sod(TODAY);
  const set = (a: Date, b: Date, label: string) => { out.start = a.getTime(); out.end = b.getTime(); out.understood.push(label); };
  take(/ (last|this) weekend /, (m) => {
    const sat = addDays(t, -((t.getDay() + 1) % 7) - (m[1] === "last" && (t.getDay() === 6 || t.getDay() === 0) ? 7 : 0));
    set(sat, addDays(sat, 2), `${m[1]} weekend`); out.weekend = true;
  });
  take(/ today /, () => set(t, addDays(t, 1), "today"));
  take(/ yesterday /, () => set(addDays(t, -1), t, "yesterday"));
  take(/ (this|last) (week|month) /, (m) => {
    const r = getRange({ kind: m[2] as RangeKind, offset: m[1] === "last" ? -1 : 0 }, cal);
    set(new Date(r.start), new Date(r.end), `${m[1]} ${m[2]}`);
  });
  take(/ (upi|cash|card|wallet) /, (m) => { out.method = m[1] as Method; out.understood.push(METHOD_LABEL[out.method]); });
  for (const w of s.trim().split(/\s+/)) {
    if (!out.cat && CAT_WORDS[w]) { out.cat = CAT_WORDS[w]; out.understood.push(CATEGORIES.find((c) => c.id === out.cat)!.name); s = s.replace(` ${w} `, " "); }
  }
  out.text = s.replace(/ (on|in|at|for|from|spent|spends|spending|the) /g, " ").trim();
  return out;
}
export function runQuery(txns: Txn[], q: Query): Txn[] {
  return txns.filter((t) =>
    (!q.cat || t.cat === q.cat) && (q.min === undefined || t.amount > q.min) && (q.max === undefined || t.amount < q.max) &&
    (!q.method || t.method === q.method) && (q.start === undefined || (t.ts >= q.start && t.ts < q.end!)) &&
    (!q.text || `${t.merchant} ${t.note ?? ""} ${(t.tags ?? []).join(" ")}`.toLowerCase().includes(q.text)));
}

/* ───────── suggestions ───────── */
/** Category chips ranked by what this person usually buys around this time of day. */
export function suggestCats(txns: Txn[], hour: number): CatId[] {
  const score = new Map<CatId, number>();
  for (const t of txns) {
    if (t.kind !== "expense" || t.recurring) continue;
    const h = new Date(t.ts).getHours();
    if (Math.abs(h - hour) <= 2) score.set(t.cat, (score.get(t.cat) ?? 0) + 1);
  }
  const ranked = [...score].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  for (const c of CATEGORIES) if (!ranked.includes(c.id)) ranked.push(c.id);
  return ranked;
}
export function suggestMerchants(txns: Txn[], cat: CatId, hour: number): string[] {
  const score = new Map<string, number>();
  for (const t of txns) {
    if (t.cat !== cat || t.kind !== "expense" || t.recurring) continue;
    const near = Math.abs(new Date(t.ts).getHours() - hour) <= 2 ? 3 : 1;
    score.set(t.merchant, (score.get(t.merchant) ?? 0) + near);
  }
  return [...score].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([m]) => m);
}

/* ───────── i18n (English + Hindi for core UI; others fall back) ───────── */
export const LANGS = [
  { id: "en", name: "English", ready: true }, { id: "hi", name: "हिन्दी", ready: true }, { id: "ta", name: "தமிழ்", ready: false },
  { id: "te", name: "తెలుగు", ready: false }, { id: "bn", name: "বাংলা", ready: false }, { id: "mr", name: "मराठी", ready: false }, { id: "kn", name: "ಕನ್ನಡ", ready: false },
];
const HI: Record<string, string> = {
  Today: "आज", Activity: "लेन-देन", Insights: "झलक", Plan: "योजना", You: "आप",
  "Safe to spend": "खर्च के लिए सुरक्षित", "Today's spends": "आज के खर्च", "Coming up": "आने वाले बिल",
  "Add a spend": "खर्च जोड़ें", Save: "सेव करें", "To review": "जाँच के लिए", "Good evening": "शुभ संध्या",
  "a day": "रोज़", "See all": "सब देखें", "Spent today": "आज खर्च",
  Spent: "खर्च", Income: "आय", Net: "बचत", Budgets: "बजट", Goals: "लक्ष्य", Bills: "बिल",
};
export const tr = (lang: string, s: string) => (lang === "hi" ? HI[s] ?? s : s);
