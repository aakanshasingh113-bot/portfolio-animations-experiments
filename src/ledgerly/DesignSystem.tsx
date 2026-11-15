"use client";

import { useState } from "react";
import { Check, Inbox, Plus } from "lucide-react";
import { CATEGORIES, catColor } from "./data";
import { money } from "./lib";
import { AppProvider } from "./store";
import { Bars, Btn, Card, CatIcon, Chip, Donut, Empty, Pill, Progress, Row, Seg, Skel, SplitBar, Toggle } from "./ui";

const COLORS: [string, string, string][] = [
  ["--l-bg", "Background", "Warm off-white / deep ink"], ["--l-card", "Surface", "Cards, sheets"], ["--l-sunk", "Sunken", "Tracks, keypad, skeletons"],
  ["--l-ink", "Ink", "Primary text"], ["--l-mute", "Muted", "Secondary text (≥4.5:1)"], ["--l-rule", "Line", "Hairlines"], ["--l-ctrl", "Control", "Input borders (≥3:1)"],
  ["--l-pri", "Primary", "Deep teal — actions"], ["--l-tint", "Primary tint", "Selected, insight cards"],
  ["--l-pos", "Positive", "Income, synced, done"], ["--l-amb", "Attention", "Over plan, price rise — never red"], ["--l-ambtint", "Attention tint", ""],
  ["--l-crit", "Critical", "Fraud or failed sync only"], ["--l-crittint", "Critical tint", ""],
];
const TYPE: [string, string, string][] = [
  ["Hero amount", "text-[44px] font-semibold leading-none tracking-tight", "₹909"], ["Screen amount", "text-[34px] font-semibold leading-tight", "₹62,480"],
  ["Title", "text-xl font-semibold", "Good evening, Aanya"], ["Section", "text-[13px] font-semibold uppercase tracking-wide", "Today's spends"],
  ["Body · 16", "text-base", "You've spent a little more on food than usual this week."], ["Supporting · 15", "text-[15px]", "Left for 15 days, after bills and goals."], ["Caption · 13", "text-[13px]", "Synced 2 min ago · UPI"],
];
const TOKENS: [string, string][] = [
  ["Grid", "4 / 8 pt"], ["Screen padding", "16 px phone · 32 px tablet+"], ["Card radius", "16 px"], ["Sheet radius", "24 px"], ["Control radius", "12 px"], ["Chip radius", "999 px"],
  ["Touch target", "≥ 44 × 44 px"], ["Transitions", "200–300 ms, off with reduce-motion"], ["Breakpoints", "container ≥768 rail · ≥896 two columns"], ["Numerals", "Tabular everywhere"],
];
const SAMPLE = [820, 460, 1240, 300, 980, 2140, 1760].map((value, i) => ({ value, label: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i], hint: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i], alt: i > 4 }));

function H({ children }: { children: string }) {
  return <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wide text-l-mute first:mt-0">{children}</h2>;
}

function Specimen({ theme }: { theme: "light" | "dark" }) {
  const [seg, setSeg] = useState("week");
  const [on, setOn] = useState(true);
  const [chip, setChip] = useState("food");
  return (
    <div className="ledgerly @container min-w-0 flex-1 p-5 md:p-8" data-theme={theme}>
      <p className="text-2xl font-semibold">{theme === "light" ? "Light" : "Dark"}</p>
      <p className="mb-6 text-[15px] text-l-mute">{theme === "light" ? "Warm off-white base, deep teal primary." : "Designed separately on deep ink — not an inverted light theme."}</p>

      <H>Colour</H>
      <div className="grid grid-cols-2 gap-3 @xl:grid-cols-3">
        {COLORS.map(([v, name, use]) => (
          <div key={v} className="overflow-hidden rounded-2xl border border-l-rule bg-l-card">
            <div className="h-12" style={{ background: `var(${v})` }} />
            <div className="p-2.5"><p className="text-[15px] font-medium">{name}</p><p className="font-mono text-[12px] text-l-mute">{v}</p>{use && <p className="text-[13px] text-l-mute">{use}</p>}</div>
          </div>
        ))}
      </div>

      <H>Category palette · 10 defaults, colour-blind validated</H>
      <Card className="grid grid-cols-2 gap-x-4 gap-y-3">
        {CATEGORIES.map((c) => <div key={c.id} className="flex items-center gap-2.5"><CatIcon cat={c.id} size={34} /><span className="text-[15px]">{c.name}</span></div>)}
      </Card>
      <p className="mt-2 text-[13px] text-l-mute">Each colour stays with its category in every chart, and is always paired with an icon and a label.</p>

      <H>Type · Geist, tabular numerals</H>
      <Card className="space-y-3">
        {TYPE.map(([name, cls, sample]) => <div key={name}><p className="text-[12px] text-l-mute">{name}</p><p className={cls}>{sample}</p></div>)}
        <div className="border-t border-l-rule pt-3 text-[15px]"><p className="text-[12px] text-l-mute">Locale-aware amounts</p>
          <p>{money(125000, "INR")} · {money(125000, "USD")} · compact {money(120000, "INR", { compact: true })} · {money(12000, "USD", { compact: true })}</p></div>
      </Card>

      <H>Buttons</H>
      <div className="flex flex-wrap gap-2"><Btn><Check size={18} />Save</Btn><Btn variant="soft">See why</Btn><Btn variant="outline">Edit</Btn><Btn variant="ghost">Skip</Btn><Btn disabled>Disabled</Btn>
        <span className="grid size-14 place-items-center rounded-full bg-l-pri text-l-onpri shadow-lg" aria-label="Quick add button"><Plus size={28} /></span></div>

      <H>Chips, segmented control, switch</H>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">{CATEGORIES.slice(0, 3).map((c) => <Chip key={c.id} active={chip === c.id} onClick={() => setChip(c.id)}><CatIcon cat={c.id} size={24} />{c.name}</Chip>)}</div>
        <Seg label="Range" value={seg} onChange={setSeg} options={["Day", "Week", "Month", "3M", "6M", "Year"].map((l) => ({ id: l.toLowerCase(), label: l }))} />
        <Card className="py-1"><Row title="Hide amounts" sub="Blur numbers in public" right={<Toggle label="Hide amounts" on={on} onChange={setOn} />} /></Card>
      </div>

      <H>Status · never colour alone</H>
      <div className="flex flex-wrap gap-2"><Pill tone="pos">✓ Synced 2 min ago</Pill><Pill tone="amb">Needs attention</Pill><Pill tone="crit">Sync failed</Pill><Pill tone="pri">Auto-captured · 94% sure</Pill><Pill>Added by you</Pill></div>
      <div className="mt-3 space-y-3">
        <Card><p className="mb-2 text-[15px]">Within budget</p><Progress value={62} max={100} /></Card>
        <Card><p className="mb-2 text-[15px]">Over budget — amber with hatch, calm copy</p><Progress value={120} max={100} over /><p className="mt-2 text-[13px] text-l-amb">₹840 over — tap to adjust or cover it from another category</p></Card>
      </div>

      <H>Charts</H>
      <Card><Bars bars={SAMPLE} summary="Sample week of spending" altLabel="Hatched bars are weekends" height={110} /></Card>
      <Card className="mt-3 flex items-center gap-4">
        <Donut size={104} label="Sample category split" segs={[{ value: 40, color: catColor("food") }, { value: 25, color: catColor("groceries") }, { value: 20, color: catColor("transport") }, { value: 15, color: "var(--c-other)" }]} />
        <div className="flex-1"><SplitBar a={{ label: "Fixed", value: 38000 }} b={{ label: "Flexible", value: 24000 }} /></div>
      </Card>

      <H>Feedback</H>
      <div className="flex items-center gap-3 rounded-2xl bg-l-ink py-2 pe-2 ps-4 text-l-bg"><span className="flex-1 text-[15px]">Saved ₹250 · Auto rickshaw · logged in 2.6s</span><span className="grid min-h-11 place-items-center px-3 text-[15px] font-semibold underline underline-offset-4">Undo</span></div>
      <div className="mt-3"><Skel rows={2} /></div>
      <div className="mt-3"><Empty icon={Inbox} title="Nothing to review" body="New auto-captured transactions wait here for a quick yes or no." /></div>

      <H>Tokens</H>
      <Card className="divide-y divide-l-rule py-1">{TOKENS.map(([k, v]) => <div key={k} className="flex justify-between gap-3 py-2 text-[15px]"><span className="text-l-mute">{k}</span><span className="text-end">{v}</span></div>)}</Card>
    </div>
  );
}

export default function DesignSystem() {
  return (
    <AppProvider>
      <div className="min-h-dvh bg-[#161b1a]">
        <header className="flex flex-wrap items-center gap-3 px-5 py-4 text-white md:px-8">
          <h1 className="text-xl font-semibold">Ledgerly design system</h1>
          <p className="text-[14px] text-white/60">Calm, warm, premium — “a kind friend who&apos;s good with money.”</p>
          <a href="/ledgerly" className="ms-auto text-[14px] underline underline-offset-4">Back to the prototype</a>
        </header>
        <div className="flex flex-col lg:flex-row"><Specimen theme="light" /><Specimen theme="dark" /></div>
      </div>
    </AppProvider>
  );
}
