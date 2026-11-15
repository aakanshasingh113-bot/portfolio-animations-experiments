/**
 * Ledgerly sample data: two personas (India ₹, US $), generated deterministically
 * so every reload shows the same 12 months of history.
 */

export type Cur = "INR" | "USD";
export type PersonaId = "in" | "us";
export type CatId =
  | "food" | "groceries" | "transport" | "shopping" | "bills"
  | "home" | "fun" | "health" | "travel" | "other";
export type Method = "upi" | "card" | "cash" | "bank" | "wallet";
export type Kind = "expense" | "income" | "transfer";

/** The prototype's fixed "now", so the sample data never goes stale. */
export const TODAY = new Date(2026, 10, 15, 19, 40);
export const DATA_START = new Date(2025, 10, 1);

export interface Category {
  id: CatId; name: string; hi: string; slot: number; fixed: boolean;
}
/** Ten broad default buckets — research 1a: too many categories overwhelm. */
export const CATEGORIES: Category[] = [
  { id: "food", name: "Food & dining", hi: "खाना-पीना", slot: 1, fixed: false },
  { id: "groceries", name: "Groceries", hi: "किराना", slot: 2, fixed: false },
  { id: "transport", name: "Transport", hi: "आना-जाना", slot: 3, fixed: false },
  { id: "shopping", name: "Shopping", hi: "खरीदारी", slot: 4, fixed: false },
  { id: "bills", name: "Bills & EMIs", hi: "बिल और EMI", slot: 5, fixed: true },
  { id: "home", name: "Rent & home", hi: "किराया और घर", slot: 6, fixed: true },
  { id: "fun", name: "Entertainment", hi: "मनोरंजन", slot: 7, fixed: false },
  { id: "health", name: "Health", hi: "सेहत", slot: 8, fixed: false },
  { id: "travel", name: "Travel", hi: "यात्रा", slot: 9, fixed: false },
  { id: "other", name: "Everything else", hi: "बाकी सब", slot: 10, fixed: false },
];
export const CAT: Record<CatId, Category> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CatId, Category>;
export const catColor = (id: CatId) => `var(--c${CAT[id].slot})`;

export interface Txn {
  id: string; ts: number; amount: number; kind: Kind; cat: CatId; merchant: string;
  method: Method; account: string; raw?: string; note?: string; tags?: string[];
  recurring?: boolean; fixed?: boolean; excluded?: boolean; receipt?: boolean;
  auto?: { source: "sms" | "email" | "bank"; confidence: number };
  mood?: "worth" | "neutral" | "regret"; splitWith?: string[]; flag?: "duplicate" | "spike";
}
export interface ReviewItem extends Txn { why?: string }

export interface Account {
  id: string; name: string; type: "savings" | "card" | "wallet" | "cash";
  balance: number; source: string; status: "ok" | "attention" | "manual"; synced: string;
  limit?: number; dueDay?: number;
}
export interface Bill {
  id: string; name: string; cat: CatId; amount: number; day: number; method: Method;
  sub: boolean; was?: number; annualMonth?: number; variable?: boolean;
}
export interface Goal {
  id: string; name: string; target: number; saved: number; monthly: number; due: string; icon: "shield" | "plane" | "laptop" | "star";
}
export interface Loan { name: string; emi: number; paid: number; tenure: number; interestPaid: number; principal: number }
export interface Notif { id: string; type: string; title: string; body: string; when: string; route?: string }

/** [merchant, category, min, max, method, timesPerWeek, weekendMultiplier, typicalHours] */
type Tpl = [string, CatId, number, number, Method, number, number, number[]];

export interface Persona {
  id: PersonaId; name: string; full: string; city: string; cur: Cur; locale: string; blurb: string;
  accounts: Account[]; bills: Bill[]; goals: Goal[]; loan: Loan; cap: number;
  catBudgets: Partial<Record<CatId, number>>; salary: number; monthlyIncome: number; employer: string;
  flatmate: string; methodAccount: Record<Method, string>;
}

const IN_TPL: Tpl[] = [
  ["Chai Point", "food", 40, 140, "upi", 7, 0.4, [9, 11, 16, 17]],
  ["HungerBox canteen", "food", 90, 160, "upi", 4.5, 0, [13]],
  ["Swiggy", "food", 180, 560, "upi", 2, 1.5, [13, 20, 21, 22]],
  ["Zomato", "food", 220, 640, "upi", 0.8, 1.6, [20, 21]],
  ["Third Wave Coffee", "food", 240, 420, "card", 0.6, 2, [11, 17]],
  ["Toit Brewpub", "food", 1400, 2900, "card", 0.18, 4, [21, 22]],
  ["Truffles", "food", 450, 1100, "upi", 0.3, 2, [14, 20]],
  ["Juice Junction", "food", 50, 90, "upi", 2, 1, [10, 18]],
  ["Pani puri stall", "food", 40, 120, "cash", 1.2, 1.3, [18, 19]],
  ["Blinkit", "groceries", 160, 780, "upi", 1.8, 1, [8, 19, 22]],
  ["Zepto", "groceries", 140, 620, "upi", 1.2, 1, [7, 21]],
  ["BigBasket", "groceries", 900, 2400, "card", 0.45, 1.5, [10, 11]],
  ["Sri Sai Kirana", "groceries", 30, 180, "upi", 4, 1, [8, 20]],
  ["Vegetable vendor", "groceries", 80, 260, "cash", 1.5, 1.2, [8, 9, 18]],
  ["Namma Metro", "transport", 28, 60, "upi", 8, 0.3, [9, 19]],
  ["Auto rickshaw", "transport", 60, 240, "upi", 4, 1.2, [9, 14, 20]],
  ["Uber", "transport", 180, 520, "upi", 0.9, 1.6, [10, 22, 23]],
  ["Rapido", "transport", 60, 160, "upi", 1.5, 1, [9, 18]],
  ["Amazon", "shopping", 350, 3200, "card", 0.35, 1, [12, 22]],
  ["Myntra", "shopping", 800, 3600, "card", 0.15, 1.3, [22, 23]],
  ["Nykaa", "shopping", 400, 1800, "upi", 0.25, 1, [21]],
  ["BookMyShow", "fun", 320, 900, "upi", 0.35, 3, [18, 19]],
  ["Apollo Pharmacy", "health", 120, 900, "upi", 0.45, 1, [19, 20]],
  ["Dr. Rao's Clinic", "health", 600, 1200, "upi", 0.08, 1, [11]],
  ["Urban Company", "other", 400, 1400, "upi", 0.15, 2, [11]],
  ["Tumbledry Laundry", "other", 180, 420, "upi", 0.5, 1.5, [10, 19]],
  ["Gift (cash)", "other", 500, 2100, "cash", 0.08, 2, [19]],
];
const US_TPL: Tpl[] = [
  ["Merit Coffee", "food", 4.5, 7.5, "card", 4, 0.8, [8, 9, 15]],
  ["Chipotle", "food", 11, 17, "card", 1.2, 0.6, [12, 13]],
  ["Torchy's Tacos", "food", 12, 24, "card", 0.7, 2, [13, 19]],
  ["DoorDash", "food", 18, 42, "card", 0.8, 1.4, [19, 20, 21]],
  ["Loro", "food", 28, 64, "card", 0.25, 3, [19, 20]],
  ["Taco truck", "food", 6, 14, "cash", 0.8, 1.5, [22, 23]],
  ["H-E-B", "groceries", 38, 135, "card", 1.1, 1.4, [10, 18]],
  ["Trader Joe's", "groceries", 24, 78, "card", 0.4, 1.5, [11, 17]],
  ["Farmers market", "groceries", 12, 35, "cash", 0.4, 6, [10]],
  ["Shell", "transport", 32, 54, "card", 0.6, 1, [8, 18]],
  ["Uber", "transport", 9, 31, "wallet", 0.8, 2, [22, 23]],
  ["CapMetro", "transport", 1.25, 2.5, "wallet", 1, 0.5, [8, 18]],
  ["Amazon", "shopping", 12, 140, "card", 0.6, 1, [12, 21]],
  ["Target", "shopping", 18, 95, "card", 0.3, 1.6, [14, 16]],
  ["AMC Theatres", "fun", 14, 32, "card", 0.25, 3, [19]],
  ["Steam", "fun", 10, 40, "card", 0.15, 1.5, [21]],
  ["CVS Pharmacy", "health", 8, 46, "card", 0.4, 1, [17, 18]],
  ["Venmo · friends", "other", 15, 60, "wallet", 0.4, 2, [20]],
  ["Tips (cash)", "other", 3, 10, "cash", 0.8, 1.5, [13, 20]],
  ["Birds Barbershop", "other", 32, 38, "card", 0.2, 2, [11]],
];

export const PERSONAS: Record<PersonaId, Persona> = {
  in: {
    id: "in", name: "Aanya", full: "Aanya Krishnan", city: "Bengaluru", cur: "INR", locale: "en-IN",
    blurb: "Salaried designer · 50+ UPI payments a week", salary: 92000, monthlyIncome: 92000, employer: "Fernhill Design Co.",
    flatmate: "Ishita", cap: 78000,
    methodAccount: { upi: "hdfc", bank: "hdfc", card: "icici", cash: "cash", wallet: "paytm" },
    accounts: [
      { id: "hdfc", name: "HDFC Savings ··4821", type: "savings", balance: 68420, source: "Account Aggregator · read-only", status: "ok", synced: "2 min ago" },
      { id: "icici", name: "ICICI Credit Card ··7730", type: "card", balance: -23480, limit: 150000, dueDay: 22, source: "SMS on this phone", status: "ok", synced: "1 hr ago" },
      { id: "paytm", name: "Paytm Wallet", type: "wallet", balance: 312, source: "Email receipts", status: "attention", synced: "3 days ago" },
      { id: "cash", name: "Cash wallet", type: "cash", balance: 1850, source: "You log this", status: "manual", synced: "Cash check 9 days ago" },
    ],
    bills: [
      { id: "rent", name: "Rent · Mrs. Iyer", cat: "home", amount: 24000, day: 3, method: "bank", sub: false },
      { id: "help", name: "Lakshmi (house help)", cat: "home", amount: 3000, day: 2, method: "cash", sub: false },
      { id: "emi", name: "Laptop EMI · HDFC", cat: "bills", amount: 6450, day: 5, method: "bank", sub: false },
      { id: "netflix", name: "Netflix", cat: "fun", amount: 649, day: 8, method: "card", sub: true },
      { id: "cult", name: "Cult.fit", cat: "health", amount: 1499, day: 10, method: "card", sub: true },
      { id: "yt", name: "YouTube Premium", cat: "fun", amount: 149, day: 12, method: "card", sub: true },
      { id: "act", name: "ACT Fibernet", cat: "bills", amount: 1049, day: 14, method: "upi", sub: false },
      { id: "spotify", name: "Spotify", cat: "fun", amount: 139, was: 119, day: 17, method: "card", sub: true },
      { id: "bescom", name: "BESCOM electricity", cat: "bills", amount: 1180, day: 18, method: "upi", sub: false, variable: true },
      { id: "icloud", name: "iCloud+", cat: "bills", amount: 75, day: 20, method: "card", sub: true },
      { id: "jio", name: "Jio prepaid", cat: "bills", amount: 349, day: 22, method: "upi", sub: false },
      { id: "prime", name: "Amazon Prime (yearly)", cat: "fun", amount: 1499, day: 9, method: "card", sub: true, annualMonth: 6 },
    ],
    goals: [
      { id: "g1", name: "Emergency fund", target: 276000, saved: 118000, monthly: 8000, due: "2028-07-01", icon: "shield" },
      { id: "g2", name: "Japan trip", target: 150000, saved: 62000, monthly: 6000, due: "2028-02-01", icon: "plane" },
    ],
    loan: { name: "Laptop EMI · HDFC", emi: 6450, paid: 10, tenure: 18, interestPaid: 5120, principal: 108000 },
    catBudgets: { food: 10000, groceries: 7000, transport: 4500, shopping: 6000, fun: 3000, health: 3500, travel: 4000, other: 3000 },
  },
  us: {
    id: "us", name: "Jordan", full: "Jordan Ellis", city: "Austin, TX", cur: "USD", locale: "en-US",
    blurb: "Nurse coordinator · card-first, paid every other Friday", salary: 2850, monthlyIncome: 5700, employer: "Brightline Health",
    flatmate: "Sam", cap: 5200,
    methodAccount: { upi: "chase", bank: "chase", card: "sapphire", cash: "cash", wallet: "venmo" },
    accounts: [
      { id: "chase", name: "Chase Checking ··2209", type: "savings", balance: 3184.22, source: "Bank link · read-only", status: "ok", synced: "2 min ago" },
      { id: "sapphire", name: "Sapphire Card ··6014", type: "card", balance: -842.6, limit: 6000, dueDay: 24, source: "Bank link · read-only", status: "ok", synced: "1 hr ago" },
      { id: "venmo", name: "Venmo", type: "wallet", balance: 46.5, source: "Email receipts", status: "attention", synced: "3 days ago" },
      { id: "cash", name: "Cash wallet", type: "cash", balance: 62, source: "You log this", status: "manual", synced: "Cash check 9 days ago" },
    ],
    bills: [
      { id: "rent", name: "Rent · Eastside Flats", cat: "home", amount: 1650, day: 1, method: "bank", sub: false },
      { id: "emi", name: "Car loan · Toyota Financial", cat: "bills", amount: 312, day: 5, method: "bank", sub: false },
      { id: "netflix", name: "Netflix", cat: "fun", amount: 17.99, day: 8, method: "card", sub: true },
      { id: "cult", name: "Crux Climbing", cat: "health", amount: 79, day: 10, method: "card", sub: true },
      { id: "geico", name: "GEICO car insurance", cat: "bills", amount: 128, day: 12, method: "bank", sub: false },
      { id: "act", name: "Google Fiber", cat: "bills", amount: 70, day: 14, method: "card", sub: false },
      { id: "spotify", name: "Spotify", cat: "fun", amount: 12.99, was: 11.99, day: 17, method: "card", sub: true },
      { id: "bescom", name: "Austin Energy", cat: "bills", amount: 104, day: 18, method: "bank", sub: false, variable: true },
      { id: "icloud", name: "iCloud+", cat: "bills", amount: 2.99, day: 20, method: "card", sub: true },
      { id: "jio", name: "T-Mobile", cat: "bills", amount: 65, day: 22, method: "card", sub: false },
      { id: "prime", name: "Amazon Prime (yearly)", cat: "fun", amount: 139, day: 9, method: "card", sub: true, annualMonth: 6 },
    ],
    goals: [
      { id: "g1", name: "Emergency fund", target: 9600, saved: 4150, monthly: 300, due: "2028-05-01", icon: "shield" },
      { id: "g2", name: "Lisbon trip", target: 3200, saved: 1240, monthly: 180, due: "2027-10-01", icon: "plane" },
    ],
    loan: { name: "Car loan · Toyota Financial", emi: 312, paid: 22, tenure: 60, interestPaid: 1486, principal: 16400 },
    catBudgets: { food: 520, groceries: 420, transport: 260, shopping: 300, fun: 120, health: 160, travel: 200, other: 160 },
  },
};

/* ───────── deterministic generator ───────── */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const at = (y: number, m: number, d: number, h = 12, mi = 0) => new Date(y, m, d, h, mi).getTime();

export function generate(pid: PersonaId): Txn[] {
  const p = PERSONAS[pid];
  const inr = p.cur === "INR";
  const r = rng(inr ? 20261115 : 77123);
  const tpl = inr ? IN_TPL : US_TPL;
  const out: Txn[] = [];
  let n = 0;
  const round = (v: number) => (inr ? Math.round(v) : Math.round(v * 100) / 100);
  const push = (t: Omit<Txn, "id" | "account" | "kind"> & { kind?: Kind; account?: string }) => {
    if (t.ts > TODAY.getTime()) return;
    out.push({ kind: "expense", account: p.methodAccount[t.method], ...t, id: `${pid}${n++}` });
  };
  const autoFor = (m: Method): Txn["auto"] =>
    m === "cash" ? undefined : { source: m === "card" && !inr ? "bank" : m === "wallet" ? "email" : inr ? "sms" : "bank", confidence: 0.9 + r() * 0.09 };

  for (let day = new Date(DATA_START); day <= TODAY; day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)) {
    const y = day.getFullYear(), m = day.getMonth(), d = day.getDate(), dow = day.getDay();
    const weekend = dow === 0 || dow === 6;
    // Seasonal lift: festive shopping (Diwali week / holidays) and a quieter monsoon.
    const festive = inr ? (m === 10 && d >= 2 && d <= 9 ? 1.5 : 1) : m === 11 && d > 12 ? 1.4 : 1;
    const away = m === 7 && d >= 14 && d <= 17; // trip in August

    for (const [merchant, cat, min, max, method, perWeek, wk, hours] of tpl) {
      if (away && cat !== "food") continue;
      let prob = (perWeek / 7) * (weekend ? wk : 1) * (cat === "shopping" ? festive : 1);
      while (prob > 0) {
        if (r() < prob) {
          const h = hours[Math.floor(r() * hours.length)];
          let amt = min + (max - min) * Math.pow(r(), 2.6);
          if (inr && amt > 100) amt = Math.round(amt / 5) * 5;
          push({
            ts: at(y, m, d, h, Math.floor(r() * 60)), amount: round(amt), cat: away ? "travel" : cat,
            merchant: away ? `${merchant}` : merchant, method, auto: autoFor(method),
            mood: r() < 0.06 ? (r() < 0.6 ? "worth" : r() < 0.6 ? "neutral" : "regret") : undefined,
            tags: away ? [inr ? "goa-trip" : "denver-trip"] : undefined,
          });
        }
        prob -= 1;
      }
    }

    // Income
    if (inr && d === 1) push({ ts: at(y, m, d, 9, 30), amount: p.salary, kind: "income", cat: "other", merchant: `${p.employer} · salary`, method: "bank", recurring: true, auto: { source: "bank", confidence: 0.99 } });
    if (!inr) {
      const days = Math.round((day.getTime() - at(2025, 10, 7, 0)) / 864e5);
      if (dow === 5 && days >= 0 && Math.round(days / 7) % 2 === 0) push({ ts: at(y, m, d, 6, 0), amount: p.salary, kind: "income", cat: "other", merchant: `${p.employer} · payroll`, method: "bank", recurring: true, auto: { source: "bank", confidence: 0.99 } });
    }
    if (d === 21 && [1, 5, 8].includes(m)) push({ ts: at(y, m, d, 15, 10), amount: inr ? 12000 : 260, kind: "income", cat: "other", merchant: inr ? "Logo project · Kavya" : "Etsy payout", method: "bank", auto: { source: "bank", confidence: 0.9 } });

    // Bills & subscriptions
    for (const b of p.bills) {
      if (b.day !== d) continue;
      if (b.annualMonth !== undefined && b.annualMonth !== m) continue;
      let amt = b.amount;
      if (b.was && (y < 2026 || m < 9)) amt = b.was; // price went up in October
      if (b.variable) amt = round(b.amount * (0.75 + r() * 0.3 + (m >= 3 && m <= 5 ? 0.35 : 0)));
      push({ ts: at(y, m, d, 7, 15), amount: amt, cat: b.cat, merchant: b.name.replace(/ \(yearly\)/, ""), method: b.method, recurring: true, fixed: !b.sub, auto: b.method === "cash" ? undefined : { source: inr ? "sms" : "bank", confidence: 0.98 } });
    }
    // Cash withdrawals are transfers into the cash wallet, not spending.
    if (d === 4 || d === 19) push({ ts: at(y, m, d, 18, 5), amount: inr ? 4000 : 80, kind: "transfer", cat: "other", merchant: "ATM withdrawal → Cash wallet", method: "bank", auto: { source: inr ? "sms" : "bank", confidence: 0.99 } });
  }

  // Events & anomalies
  const big = (mo: number, d: number, h: number, merchant: string, cat: CatId, a: number, extra: Partial<Txn> = {}) =>
    push({ ts: at(2026, mo, d, h, 12), amount: a, cat, merchant, method: "card", auto: { source: inr ? "sms" : "bank", confidence: 0.96 }, ...extra });
  if (inr) {
    big(7, 2, 21, "IndiGo", "travel", 9840, { tags: ["goa-trip"], mood: "worth" });
    big(7, 5, 20, "Airbnb · Goa", "travel", 11200, { tags: ["goa-trip"], mood: "worth" });
    big(9, 28, 22, "IndiGo", "travel", 6200, { note: "BLR → DEL, home for Diwali" });
    big(10, 5, 17, "FabIndia", "shopping", 2150, { tags: ["diwali"] });
    big(10, 6, 19, "Croma", "shopping", 7899, { tags: ["diwali"], flag: "spike", note: "Air fryer for Amma" });
    big(10, 7, 18, "Anand Sweets", "other", 1850, { tags: ["diwali"], method: "upi", account: "hdfc" });
    push({ ts: at(2026, 10, 8, 11, 0), amount: 1500, cat: "other", merchant: "Diwali gifts (cash)", method: "cash", tags: ["diwali"] });
    push({ ts: at(2026, 10, 13, 20, 42), amount: 486, cat: "food", merchant: "Swiggy", method: "upi", auto: { source: "sms", confidence: 0.97 } });
    push({ ts: at(2026, 10, 15, 13, 20), amount: 340, cat: "food", merchant: "Swiggy", method: "upi", auto: { source: "sms", confidence: 0.97 } });
    push({ ts: at(2026, 10, 15, 9, 10), amount: 45, cat: "transport", merchant: "Namma Metro", method: "upi", auto: { source: "sms", confidence: 0.98 } });
    push({ ts: at(2026, 10, 15, 17, 30), amount: 60, cat: "food", merchant: "Pani puri stall", method: "cash" });
  } else {
    big(7, 2, 21, "Southwest Airlines", "travel", 286, { tags: ["denver-trip"], mood: "worth" });
    big(7, 5, 20, "Airbnb · Denver", "travel", 412, { tags: ["denver-trip"], mood: "worth" });
    big(10, 6, 19, "Best Buy", "shopping", 429, { flag: "spike", note: "Headphones" });
    big(10, 13, 12, "Chipotle", "food", 14.85);
    big(10, 15, 9, "Merit Coffee", "food", 5.75);
    big(10, 15, 13, "Torchy's Tacos", "food", 16.4);
    push({ ts: at(2026, 10, 15, 11, 5), amount: 22, cat: "groceries", merchant: "Farmers market", method: "cash" });
  }
  return out.sort((a, b) => b.ts - a.ts);
}

export function reviewSeed(pid: PersonaId): ReviewItem[] {
  const p = PERSONAS[pid];
  const inr = pid === "in";
  const mk = (i: number, ts: number, raw: string, merchant: string, amount: number, cat: CatId, method: Method, source: "sms" | "email" | "bank", confidence: number, extra: Partial<ReviewItem> = {}): ReviewItem => ({
    id: `${pid}r${i}`, ts, raw, merchant, amount, cat, method, kind: "expense", account: p.methodAccount[method], auto: { source, confidence }, ...extra,
  });
  return inr
    ? [
        mk(1, at(2026, 10, 15, 16, 12), "PAYTM*Q8237XY", "Chai Point", 85, "food", "upi", "sms", 0.94),
        mk(2, at(2026, 10, 15, 8, 40), "UPI/P2M/431882/BLINKIT", "Blinkit", 412, "groceries", "upi", "sms", 0.97),
        mk(3, at(2026, 10, 15, 10, 5), "VPA rzp.auto8812@icici", "Auto rickshaw", 140, "transport", "upi", "sms", 0.71, { why: "New UPI ID — matched by amount and time of day." }),
        mk(4, at(2026, 10, 13, 20, 43), "POS 4521XX SWIGGY BANGALORE", "Swiggy", 486, "food", "upi", "sms", 0.9, { flag: "duplicate", why: "Same amount at Swiggy one minute earlier (8:42 pm). It may be a double charge." }),
        mk(5, at(2026, 10, 14, 19, 22), "UPI/9845XXXX12@ybl", "Someone new", 1200, "other", "upi", "sms", 0.42, { why: "Looks like a payment to a person. We weren't sure what it was for." }),
        mk(6, at(2026, 10, 14, 12, 51), "AMAZON PAY INDIA PRIVA", "Amazon", 1299, "shopping", "card", "email", 0.9),
      ]
    : [
        mk(1, at(2026, 10, 15, 15, 12), "SQ *MERIT COFFEE CO", "Merit Coffee", 6.25, "food", "card", "bank", 0.95),
        mk(2, at(2026, 10, 15, 10, 40), "HEB #482 AUSTIN TX", "H-E-B", 64.12, "groceries", "card", "bank", 0.97),
        mk(3, at(2026, 10, 14, 22, 5), "TST* TORCHYS 0142", "Torchy's Tacos", 18.4, "food", "card", "bank", 0.74, { why: "New terminal ID — matched by name and location." }),
        mk(4, at(2026, 10, 13, 12, 13), "CHIPOTLE 2214", "Chipotle", 14.85, "food", "card", "bank", 0.9, { flag: "duplicate", why: "Same amount at Chipotle one minute earlier (12:12 pm). It may be a double charge." }),
        mk(5, at(2026, 10, 14, 19, 22), "VENMO PAYMENT 1038", "Someone new", 45, "other", "wallet", "email", 0.42, { why: "Looks like a payment to a person. We weren't sure what it was for." }),
        mk(6, at(2026, 10, 14, 12, 51), "AMZN Mktp US*2K4", "Amazon", 23.99, "shopping", "card", "email", 0.9),
      ];
}

export function notifSeed(pid: PersonaId): Notif[] {
  const inr = pid === "in";
  return [
    { id: "n1", type: "Unusual charge", title: inr ? "Two ₹486 charges at Swiggy" : "Two $14.85 charges at Chipotle", body: "They were a minute apart on Friday. Worth a quick look — it may just be two orders.", when: "Today, 9:05 am", route: "review" },
    { id: "n2", type: "Bill reminder", title: inr ? "Spotify renews in 2 days · ₹139" : "Spotify renews in 2 days · $12.99", body: inr ? "That's ₹20 more than last time. Nothing to do if you're happy with it." : "That's $1 more than last time. Nothing to do if you're happy with it.", when: "Today, 9:00 am", route: "bills" },
    { id: "n3", type: "Weekly recap", title: "Your week in 30 seconds", body: "A quick look back, no homework.", when: "Today, 6:00 pm", route: "recap" },
    { id: "n4", type: "Review", title: "6 transactions to review", body: "Swipe through them whenever suits you.", when: "Yesterday", route: "review" },
    { id: "n5", type: "Goal milestone", title: "Emergency fund passed 40%", body: "Quietly adding up. Nice.", when: "Mon 9 Nov", route: "goals" },
  ];
}
