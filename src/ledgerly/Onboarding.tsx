"use client";

import { useState } from "react";
import { ArrowLeft, Eye, HandHeart, Landmark, Mail, MessageSquareText, ShieldCheck, Zap } from "lucide-react";
import { LANGS } from "./lib";
import { useApp } from "./store";
import { StylePicker } from "./screens-plan";
import { Btn, Card, Chip, cx, IconBtn, Row, Toggle } from "./ui";

const VALUE = [
  { icon: Eye, title: "See where your money went in 3 seconds", body: "One calm number on the home screen tells you how you're doing. Everything else is a tap away, when you want it." },
  { icon: Zap, title: "Log a spend in 3 taps", body: "Amount, category, save. Faster than finding the receipt." },
  { icon: HandHeart, title: "Never feel judged", body: "No red alarms, no streaks, no nagging about coffee. Just a kind, honest picture." },
];

export function Onboarding() {
  const { s, set, setting, switchPersona, p, open } = useApp();
  const [step, setStep] = useState(0);
  const [card, setCard] = useState(0);
  const [varies, setVaries] = useState(false);
  const src = s.settings.sources;
  const anySrc = src.sms || src.email || src.bank;
  const finish = () => { set({ onboarded: true, tab: "today", stack: [] }); open("add"); };
  const next = () => setStep(step + 1);
  const V = VALUE[card];
  const sources = [
    { k: "sms" as const, i: MessageSquareText, name: p.cur === "INR" ? "SMS & UPI alerts" : "Bank notifications", why: "We read bank alerts on this phone to log spends for you. Messages never leave the device." },
    { k: "email" as const, i: Mail, name: "Email receipts", why: "We look only for receipts from shops. Personal mail is ignored." },
    { k: "bank" as const, i: Landmark, name: p.cur === "INR" ? "Bank link · Account Aggregator" : "Bank link", why: "Read-only access you approve at your bank. Ledgerly can never move money." },
  ];
  return (
    <div className="l-scroll flex h-full flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-6 pt-3">
        <div className="flex min-h-12 items-center gap-2">
          {step > 0 ? <IconBtn icon={ArrowLeft} label="Back" onClick={() => setStep(step - 1)} className="rtl:rotate-180" /> : <span className="text-lg font-semibold text-l-pri">Ledgerly</span>}
          <div className="flex flex-1 justify-center gap-1.5" role="progressbar" aria-label={`Step ${step + 1} of 6`} aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={6}>
            {Array.from({ length: 6 }, (_, i) => <span key={i} className={cx("h-1.5 w-6 rounded-full", i <= step ? "bg-l-pri" : "bg-l-rule")} />)}
          </div>
          {step === 0 ? <button type="button" onClick={next} className="min-h-11 px-2 text-[15px] font-medium text-l-pri">Skip</button> : <span className="w-11" />}
        </div>

        {step === 0 && (
          <div className="flex flex-1 flex-col">
            <div key={card} className="l-fade flex flex-1 flex-col justify-center">
              <span className="grid size-16 place-items-center rounded-2xl bg-l-tint text-l-pri" aria-hidden="true"><V.icon size={30} strokeWidth={1.7} /></span>
              <h1 className="mt-6 text-[32px] font-semibold leading-tight tracking-tight">{V.title}</h1>
              <p className="mt-3 text-lg text-l-mute">{V.body}</p>
            </div>
            <div className="mb-4 flex justify-center gap-2" aria-hidden="true">{VALUE.map((_, i) => <span key={i} className={cx("size-2 rounded-full", i === card ? "bg-l-pri" : "bg-l-rule")} />)}</div>
            <Btn full className="min-h-13 text-lg" onClick={() => (card < 2 ? setCard(card + 1) : next())}>{card < 2 ? "Next" : "Get started"}</Btn>
          </div>
        )}

        {step === 1 && (
          <Step title="Currency and language" sub="You can change both later. Travelling? Add more currencies anytime.">
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Currency">
              {([["in", "₹", "Indian Rupee", "₹1,25,000"], ["us", "$", "US Dollar", "$125,000"]] as const).map(([id, sym, name, ex]) => (
                <button key={id} type="button" role="radio" aria-checked={s.persona === id} onClick={() => s.persona !== id && switchPersona(id)}
                  className={cx("rounded-2xl border p-4 text-start", s.persona === id ? "border-l-pri bg-l-tint" : "border-l-rule bg-l-card")}>
                  <span className="block text-3xl font-semibold">{sym}</span><span className="block text-base font-medium">{name}</span><span className="block text-[13px] text-l-mute">{ex}</span>
                </button>
              ))}
            </div>
            <p className="mt-6 text-[13px] font-semibold uppercase tracking-wide text-l-mute">Language</p>
            <div className="mt-2 flex flex-wrap gap-2">{LANGS.map((l) => <Chip key={l.id} active={s.settings.lang === l.id} onClick={() => setting({ lang: l.id })}>{l.name}</Chip>)}</div>
            <Next onClick={next} />
          </Step>
        )}

        {step === 2 && (
          <Step title="When does your money come in?" sub="We'll line your month up with payday, so “this month” means what it means to you.">
            <div className="flex flex-wrap gap-2">
              {[1, 5, 7, 25, 28].map((d) => <Chip key={d} active={!varies && s.settings.monthStart === d} onClick={() => { setVaries(false); setting({ monthStart: d }); }}>{d === 1 ? "1st" : `${d}th`} of the month</Chip>)}
              <Chip active={varies} onClick={() => { setVaries(true); setting({ monthStart: 1 }); }}>It varies</Chip>
            </div>
            {varies && <Card className="mt-4 bg-l-tint text-[15px]">No problem. Ledgerly will average your income over a few months and suggest a steady amount to “pay yourself”, so lean months feel like any other.</Card>}
            <Next onClick={next} />
          </Step>
        )}

        {step === 3 && (
          <Step title="How would you like to budget?" sub="There's no right answer. Most people start simple, and you can switch anytime.">
            <StylePicker value={s.settings.budgetStyle} onChange={(budgetStyle) => setting({ budgetStyle })} />
            <Next onClick={next} />
          </Step>
        )}

        {step === 4 && (
          <Step title="Want less typing?" sub="Entirely optional. Ledgerly works fully by hand — connect something later if you ever want to.">
            <Card className="py-1">
              {sources.map((x) => <Row key={x.k} icon={<span className="grid size-10 shrink-0 place-items-center rounded-full bg-l-sunk" aria-hidden="true"><x.i size={19} /></span>} title={x.name} sub={<span className="whitespace-normal">{x.why}</span>} right={<Toggle label={x.name} on={src[x.k]} onChange={(v) => setting({ sources: { ...src, [x.k]: v } })} />} />)}
            </Card>
            <div className="mt-auto space-y-2 pt-6">
              <Btn full className="min-h-13 text-lg" onClick={() => { if (!anySrc) setting({ sources: { sms: false, email: false, bank: false } }); next(); }}>{anySrc ? "Continue with these" : "Start manually"}</Btn>
              {anySrc && <Btn full variant="ghost" onClick={() => { setting({ sources: { sms: false, email: false, bank: false } }); next(); }}>Start manually instead</Btn>}
            </div>
          </Step>
        )}

        {step === 5 && (
          <Step title="Your data stays yours" sub="Three promises, in plain language.">
            <div className="space-y-3">
              {[["Kept on your device, encrypted", "Processing happens on your phone. Backups are end-to-end encrypted."], ["Never sold, no ads", "No loan or credit-card offers either. Ledgerly earns only from an optional Plus plan."], ["Read-only, always", "The app can look at transactions if you let it. It can never move money."]].map(([t, b]) => (
                <Card key={t} className="flex gap-3"><ShieldCheck size={22} className="mt-0.5 shrink-0 text-l-pri" aria-hidden="true" /><div><p className="text-base font-semibold">{t}</p><p className="text-[15px] text-l-mute">{b}</p></div></Card>
              ))}
            </div>
            <div className="mt-auto pt-6"><Btn full className="min-h-13 text-lg" onClick={finish}>Log my first spend</Btn></div>
          </Step>
        )}
      </div>
    </div>
  );
}
function Step({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return <div className="l-fade flex flex-1 flex-col pt-4"><h1 className="text-[28px] font-semibold leading-tight tracking-tight">{title}</h1><p className="mb-6 mt-2 text-base text-l-mute">{sub}</p>{children}</div>;
}
function Next({ onClick }: { onClick: () => void }) {
  return <div className="mt-auto pt-6"><Btn full className="min-h-13 text-lg" onClick={onClick}>Continue</Btn></div>;
}
