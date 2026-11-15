"use client";

import { useState } from "react";
import { BarChart3, Eye, EyeOff, House, List, Moon, NotebookPen, Plus, RotateCcw, Sun, Target, User, type LucideIcon } from "lucide-react";
import type { CatId, PersonaId } from "./data";
import { NOTES } from "./annotations";
import { AppProvider, useApp, type Demo, type Tab } from "./store";
import { Onboarding } from "./Onboarding";
import { Activity, QuickAdd, RangeSheet, Review, Today, TxnDetail } from "./screens-core";
import { CategoryDetail, Insights, MerchantDetail } from "./screens-insights";
import { BillsView, BudgetSheet, GoalDetail, GoalNew, GoalsView, Plan, StyleSheet } from "./screens-plan";
import { Accounts, Assistant, CashSheet, Notifications, Privacy, Recap, Rules, Settings, Shared, You } from "./screens-you";
import { cx, Page, StatusBanner, ToastHost } from "./ui";

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "today", label: "Today", icon: House }, { id: "activity", label: "Activity", icon: List }, { id: "insights", label: "Insights", icon: BarChart3 },
  { id: "plan", label: "Plan", icon: Target }, { id: "you", label: "You", icon: User },
];

function Screen() {
  const { s } = useApp();
  const top = s.stack[s.stack.length - 1];
  if (!top) return { today: <Today />, activity: <Activity />, insights: <Insights />, plan: <Plan />, you: <You /> }[s.tab];
  switch (top.name) {
    case "review": return <Review />;
    case "txn": return <TxnDetail id={top.id!} />;
    case "category": return <CategoryDetail id={top.id as CatId} />;
    case "merchant": return <MerchantDetail name={top.id!} />;
    case "goal": return <GoalDetail id={top.id!} />;
    case "goalNew": return <GoalNew />;
    case "goals": return <Page title="Goals"><GoalsView /></Page>;
    case "bills": return <Page title="Bills & subscriptions"><BillsView /></Page>;
    case "accounts": return <Accounts />;
    case "shared": return <Shared />;
    case "assistant": return <Assistant />;
    case "recap": return <Recap kind={top.id ?? "week"} />;
    case "notifications": return <Notifications />;
    case "privacy": return <Privacy />;
    case "rules": return <Rules />;
    case "settings": return <Settings section={top.id ?? "appearance"} />;
    default: return <Today />;
  }
}

/** Which annotation set applies to what is on screen right now. */
function useNoteKey() {
  const { s } = useApp();
  if (!s.onboarded) return "onboarding";
  if (s.sheet?.name === "add") return "add";
  const top = s.stack[s.stack.length - 1];
  if (!top) return s.tab;
  if (top.name === "goals" || top.name === "bills") return "plan";
  return NOTES[top.name] ? top.name : "you";
}

function Shell() {
  const { s, go, open, t, setting } = useApp();
  const top = s.stack[s.stack.length - 1];
  const main = !top;
  const immersive = top?.name === "recap";
  return (
    <div className="ledgerly @container relative flex h-full w-full overflow-hidden text-base" data-theme={s.settings.theme} lang={s.settings.lang} dir="ltr">
      {!s.onboarded ? <div className="h-full w-full"><Onboarding /></div> : (
        <>
          <nav aria-label="Main" className={cx("hidden w-56 shrink-0 flex-col gap-1 border-e border-l-rule bg-l-card p-3 @3xl:flex", immersive && "@3xl:hidden")}>
            <p className="px-3 pb-3 pt-2 text-xl font-semibold text-l-pri">Ledgerly</p>
            <button type="button" onClick={() => open("add")} className="mb-2 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-l-pri text-base font-medium text-l-onpri hover:bg-l-pri2"><Plus size={20} />{t("Add a spend")}</button>
            {TABS.map((x) => (
              <button key={x.id} type="button" onClick={() => go(x.id)} aria-current={s.tab === x.id ? "page" : undefined}
                className={cx("flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-medium", s.tab === x.id ? "bg-l-tint text-l-pri" : "text-l-mute hover:bg-l-sunk hover:text-l-ink")}>
                <x.icon size={21} strokeWidth={1.8} />{t(x.label)}
              </button>
            ))}
            <span className="flex-1" />
            <button type="button" onClick={() => setting({ hide: !s.settings.hide })} aria-pressed={s.settings.hide} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] text-l-mute hover:bg-l-sunk">
              {s.settings.hide ? <EyeOff size={20} /> : <Eye size={20} />}{s.settings.hide ? "Show amounts" : "Hide amounts"}
            </button>
          </nav>
          <div className="relative flex min-w-0 flex-1 flex-col">
            <StatusBanner />
            <main key={`${s.tab}/${s.stack.map((r) => r.name + (r.id ?? "")).join("/")}`} className="l-scroll flex-1 overflow-y-auto" style={s.settings.large ? { zoom: 1.14 } : undefined}>
              <Screen />
            </main>
            {main && (
              <button type="button" onClick={() => open("add")} aria-label={t("Add a spend")}
                className="absolute bottom-[88px] end-4 z-20 grid size-14 place-items-center rounded-full bg-l-pri text-l-onpri shadow-lg shadow-black/20 transition-transform hover:bg-l-pri2 active:scale-95 @3xl:bottom-8 @3xl:end-8">
                <Plus size={28} />
              </button>
            )}
            {!immersive && (
              <nav aria-label="Main" className="absolute inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-l-rule bg-l-card/95 pb-1 backdrop-blur @3xl:hidden">
                {TABS.map((x) => (
                  <button key={x.id} type="button" onClick={() => go(x.id)} aria-current={s.tab === x.id && main ? "page" : undefined}
                    className={cx("flex min-h-16 flex-col items-center justify-center gap-0.5 text-[13px] font-medium", s.tab === x.id ? "text-l-pri" : "text-l-mute")}>
                    <span className={cx("grid h-8 w-14 place-items-center rounded-full", s.tab === x.id && "bg-l-tint")}><x.icon size={21} strokeWidth={s.tab === x.id ? 2.2 : 1.8} /></span>
                    {t(x.label)}
                  </button>
                ))}
              </nav>
            )}
            {s.sheet?.name === "add" && <QuickAdd />}
            {s.sheet?.name === "range" && <RangeSheet />}
            {s.sheet?.name === "style" && <StyleSheet />}
            {s.sheet?.name === "budget" && <BudgetSheet id={s.sheet.id!} />}
            {s.sheet?.name === "cash" && <CashSheet />}
            <ToastHost />
          </div>
        </>
      )}
    </div>
  );
}

/* ───────── prototype chrome (outside the product UI) ───────── */
type Device = "phone" | "tablet" | "desktop";
const sel = "min-h-9 rounded-lg border border-white/20 bg-white/10 px-2 text-[13px] text-white [&>option]:text-black";

function Proto() {
  const { s, set, setting, switchPersona, restart } = useApp();
  const [device, setDevice] = useState<Device>("phone");
  const [notes, setNotes] = useState(true);
  const key = useNoteKey();
  const n = NOTES[key] ?? NOTES.you;
  const size = device === "phone" ? { width: 390, height: 844 } : device === "tablet" ? { width: 834, height: 1112 } : { width: "100%", height: "100%" };
  return (
    <div className="flex h-dvh flex-col bg-[#161b1a] text-white">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/10 px-3 py-2 text-[13px]">
        <span className="font-semibold">Ledgerly <span className="font-normal text-white/60">prototype</span></span>
        <label className="flex items-center gap-1.5"><span className="text-white/60">User</span>
          <select className={sel} value={s.persona} onChange={(e) => switchPersona(e.target.value as PersonaId)}><option value="in">Aanya · India ₹</option><option value="us">Jordan · US $</option></select>
        </label>
        <label className="hidden items-center gap-1.5 md:flex"><span className="text-white/60">Device</span>
          <select className={sel} value={device} onChange={(e) => setDevice(e.target.value as Device)}><option value="phone">Phone 390×844</option><option value="tablet">Tablet 834×1112</option><option value="desktop">Desktop / web</option></select>
        </label>
        <label className="flex items-center gap-1.5"><span className="text-white/60">State</span>
          <select className={sel} value={s.demo} onChange={(e) => set({ demo: e.target.value as Demo })}>
            <option value="default">Default</option><option value="empty">Empty · first use</option><option value="loading">Loading</option><option value="error">Sync failed</option><option value="offline">Offline</option>
          </select>
        </label>
        <button type="button" className={cx(sel, "flex items-center gap-1.5")} onClick={() => setting({ theme: s.settings.theme === "dark" ? "light" : "dark" })}>{s.settings.theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}{s.settings.theme === "dark" ? "Light" : "Dark"}</button>
        <button type="button" className={cx(sel, "flex items-center gap-1.5")} aria-pressed={notes} onClick={() => setNotes(!notes)}><NotebookPen size={14} />Research notes</button>
        <button type="button" className={cx(sel, "flex items-center gap-1.5")} onClick={restart}><RotateCcw size={14} />Restart onboarding</button>
        {!s.onboarded && <button type="button" className={cx(sel, "flex items-center gap-1.5")} onClick={() => set({ onboarded: true })}>Skip to app</button>}
        <a className="ms-auto text-white/80 underline underline-offset-4 hover:text-white" href="/ledgerly/design-system">Design system</a>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 items-center justify-center overflow-auto md:p-4">
          <div className={cx("h-full w-full shrink-0 overflow-hidden max-md:!h-full max-md:!w-full", device !== "desktop" && "md:rounded-[28px] md:shadow-2xl md:ring-1 md:ring-white/15")} style={{ ...size, maxHeight: "100%", maxWidth: "100%" }}>
            <Shell key={s.persona} />
          </div>
        </div>
        {notes && (
          <aside aria-label="Research notes" className="hidden w-80 shrink-0 overflow-y-auto border-s border-white/10 p-4 lg:block">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-white/50">Why this screen is the way it is</p>
            <h2 className="mt-1 text-lg font-semibold">{n.title}</h2>
            <ul className="mt-4 space-y-4">
              {n.notes.map((x) => <li key={x.ref}><p className="text-[12px] font-semibold text-[#7dd6ca]">{x.ref}</p><p className="mt-0.5 text-[14px] leading-snug text-white/85">{x.text}</p></li>)}
            </ul>
            <p className="mt-6 border-t border-white/10 pt-4 text-[12px] leading-snug text-white/50">Sample data is generated for 1 Nov 2025 – 15 Nov 2026. “Today” is fixed at Sun 15 Nov 2026, 7:40 pm. Sync, SMS parsing and AI answers are simulated.</p>
          </aside>
        )}
      </div>
    </div>
  );
}

export default function LedgerlyApp() {
  return <AppProvider><Proto /></AppProvider>;
}
