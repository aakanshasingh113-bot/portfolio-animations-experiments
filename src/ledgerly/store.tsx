"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { generate, notifSeed, PERSONAS, reviewSeed, TODAY, type Account, type Bill, type CatId, type Goal, type Notif, type PersonaId, type ReviewItem, type Txn } from "./data";
import { money, tr, type Cal, type RangeSel } from "./lib";

export type Tab = "today" | "activity" | "insights" | "plan" | "you";
export type BudgetStyle = "track" | "cap" | "category" | "envelope";
export type Demo = "default" | "empty" | "loading" | "error" | "offline";
export interface Route { name: string; id?: string }
export interface Settings {
  theme: "light" | "dark"; hide: boolean; lang: string; weekStart: number; monthStart: number;
  budgetStyle: BudgetStyle; large: boolean; lock: boolean; autoLock: string; quiet: boolean;
  notif: Record<string, boolean>; sources: { sms: boolean; email: boolean; bank: boolean }; plus: boolean; moods: boolean;
}
export interface Toast { id: number; msg: string; undo?: () => void }
export interface State {
  persona: PersonaId; onboarded: boolean; settings: Settings; txns: Txn[]; review: ReviewItem[];
  goals: Goal[]; bills: Bill[]; accounts: Account[]; rules: { merchant: string; cat: CatId }[]; notifs: Notif[];
  cap: number; catBudgets: Partial<Record<CatId, number>>; tab: Tab; stack: Route[]; sheet: Route | null;
  toast: Toast | null; demo: Demo; range: RangeSel; planTab: "budgets" | "goals" | "bills"; settled: boolean;
}

export const NOTIF_TYPES: { id: string; label: string; hint: string; on: boolean }[] = [
  { id: "bills", label: "Bill due in 2 days", hint: "Rent, EMIs, utilities", on: true },
  { id: "subs", label: "Renewals & price changes", hint: "Before a subscription renews or costs more", on: true },
  { id: "unusual", label: "Unusual or duplicate charge", hint: "Only when something looks off", on: true },
  { id: "review", label: "Transactions to review", hint: "At most once a day", on: false },
  { id: "recap", label: "Weekly 30-second recap", hint: "Sunday, 6:00 pm", on: false },
  { id: "low", label: "Low balance", hint: "When an account dips below a level you set", on: false },
  { id: "goals", label: "Goal milestones", hint: "25%, 50%, 75% and done", on: false },
];

function seed(persona: PersonaId, keep?: Partial<State>): State {
  const p = PERSONAS[persona];
  return {
    persona, onboarded: false,
    settings: {
      theme: "light", hide: false, lang: "en", weekStart: persona === "in" ? 1 : 0, monthStart: 1, budgetStyle: "cap", large: false,
      lock: true, autoLock: "After 1 minute", quiet: true, notif: Object.fromEntries(NOTIF_TYPES.map((n) => [n.id, n.on])),
      sources: { sms: false, email: false, bank: false }, plus: false, moods: true,
    },
    txns: generate(persona), review: reviewSeed(persona), goals: p.goals, bills: p.bills, accounts: p.accounts, rules: [],
    notifs: notifSeed(persona), cap: p.cap, catBudgets: p.catBudgets, tab: "today", stack: [], sheet: null, toast: null,
    demo: "default", range: { kind: "week", offset: 0 }, planTab: "budgets", settled: false, ...keep,
  };
}

function useStore(initial: PersonaId) {
  const [s, setS] = useState<State>(() => seed(initial));
  const set = useCallback((patch: Partial<State> | ((s: State) => Partial<State>)) => setS((cur) => ({ ...cur, ...(typeof patch === "function" ? patch(cur) : patch) })), []);
  const actions = useMemo(() => {
    const toast = (msg: string, undo?: () => void) => set({ toast: { id: Date.now(), msg, undo } });
    return {
      set, toast,
      setting: (patch: Partial<Settings>) => set((c) => ({ settings: { ...c.settings, ...patch } })),
      go: (tab: Tab) => set({ tab, stack: [], sheet: null }),
      push: (name: string, id?: string) => set((c) => ({ stack: [...c.stack, { name, id }], sheet: null })),
      pop: () => set((c) => ({ stack: c.stack.slice(0, -1) })),
      open: (name: string, id?: string) => set({ sheet: { name, id } }),
      close: () => set({ sheet: null }),
      addTxn: (t: Txn, msg: string) => { set((c) => ({ txns: [t, ...c.txns].sort((a, b) => b.ts - a.ts) })); toast(msg, () => set((c) => ({ txns: c.txns.filter((x) => x.id !== t.id) }))); },
      updateTxn: (id: string, patch: Partial<Txn>) => set((c) => ({ txns: c.txns.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      deleteTxn: (id: string) => set((c) => {
        const gone = c.txns.find((t) => t.id === id);
        if (!gone) return {};
        return { txns: c.txns.filter((t) => t.id !== id), stack: c.stack.filter((r) => !(r.name === "txn" && r.id === id)), toast: { id: Date.now(), msg: "Moved to Recently deleted · kept for 30 days", undo: () => set((d) => ({ txns: [...d.txns, gone].sort((a, b) => b.ts - a.ts) })) } };
      }),
      switchPersona: (persona: PersonaId) => setS((c) => seed(persona, { onboarded: c.onboarded, demo: c.demo, settings: { ...seed(persona).settings, theme: c.settings.theme, budgetStyle: c.settings.budgetStyle, sources: c.settings.sources } })),
      restart: () => setS((c) => seed(c.persona, { settings: { ...seed(c.persona).settings, theme: c.settings.theme } })),
    };
  }, [set]);
  return { s, ...actions };
}

type Ctx = ReturnType<typeof useStore> & {
  p: (typeof PERSONAS)[PersonaId]; cal: Cal; txns: Txn[]; empty: boolean;
  m: (n: number, o?: { compact?: boolean; sign?: boolean; round?: boolean }) => string; t: (k: string) => string;
};
const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children, persona = "in" }: { children: ReactNode; persona?: PersonaId }) {
  const store = useStore(persona);
  const { s } = store;
  const value = useMemo<Ctx>(() => {
    const p = PERSONAS[s.persona];
    const empty = s.demo === "empty";
    return {
      ...store, p, empty, cal: { weekStart: s.settings.weekStart, monthStart: s.settings.monthStart },
      txns: empty ? [] : s.txns, m: (n, o) => money(n, p.cur, o), t: (k) => tr(s.settings.lang, k),
    };
  }, [store, s]);
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside AppProvider");
  return c;
}
export const newId = () => `m${TODAY.getTime()}${Math.round(performance.now() * 1000)}`;
