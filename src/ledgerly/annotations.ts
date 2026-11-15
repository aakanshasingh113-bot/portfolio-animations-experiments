/** How each screen answers a research finding (brief §1). Shown in the prototype's Notes panel. */
export interface Note { ref: string; text: string }

export const NOTES: Record<string, { title: string; notes: Note[] }> = {
  onboarding: { title: "Splash & onboarding", notes: [
    { ref: "1b · Fear of sharing credentials", text: "Connecting anything is optional and off by default. “Start manually” is the primary button, not a small link." },
    { ref: "1a · Irregular income", text: "Payday sets the financial month. “It varies” switches on income smoothing instead of forcing a date." },
    { ref: "1a · Abandonment", text: "Six short steps, three skippable value cards, and it ends inside quick add — first spend logged well under 60 seconds." },
    { ref: "1b · Distrust of free apps", text: "The last step states how Ledgerly earns money before the user has to wonder." },
  ] },
  today: { title: "Today (home)", notes: [
    { ref: "1a · The 80% case", text: "One hero number answers “how am I doing?” in under 3 seconds. Only five metrics appear on this screen." },
    { ref: "1a · Category precision doesn't drive outcomes", text: "Safe-to-spend leads; categories are nowhere on the home screen." },
    { ref: "1b · Shame and anxiety", text: "Going past plan shows calm amber and “it happens”, never red. The working is one tap away so the number is trusted, not feared." },
    { ref: "1b · Informed and helpless", text: "The review badge and bills strip each lead to one clear, optional action." },
  ] },
  add: { title: "Quick add", notes: [
    { ref: "1a · Logging friction", text: "Keypad is live on open, the likeliest category is pre-selected from time-of-day history, and Save is one tap. Typing digits and Enter works on desktop." },
    { ref: "1a · Cash is real", text: "Cash is a first-class payment method, and voice add covers hands-full moments." },
    { ref: "Success metric", text: "The confirmation shows the actual seconds taken, and always carries Undo." },
  ] },
  review: { title: "Review inbox", notes: [
    { ref: "1a · Sync reliability", text: "Every auto-captured entry shows its source, the raw text it came from, and a confidence level. Low confidence asks for a check rather than guessing silently." },
    { ref: "Competitor gap · unreadable UPI names", text: "“PAYTM*Q8237XY” becomes “Chai Point”, with the original kept visible." },
    { ref: "1a · Miscategorisation", text: "One correction can become an “always” rule. Possible duplicates are flagged neutrally, with both outcomes one tap away." },
  ] },
  activity: { title: "Activity", notes: [
    { ref: "1a · The 80% case", text: "Day groups with daily totals answer “where did it go?” by scrolling alone." },
    { ref: "1a · Logging friction", text: "Natural-language search shows how it understood the query, so a wrong guess is obvious and fixable." },
    { ref: "§4 · Time ranges", text: "The same range control as Insights; swipe to move a period, tap the label to jump." },
  ] },
  txn: { title: "Transaction detail", notes: [
    { ref: "1a · One-tap correction", text: "Category, amount, merchant and note are all editable in place. Every change is undoable." },
    { ref: "1a · Smart categorisation", text: "“Always categorise…” applies to past entries too and reports how many changed." },
    { ref: "1b · No judgement", text: "The optional feeling tag surfaces what was worth it — a value signal, not a score." },
  ] },
  insights: { title: "Insights", notes: [
    { ref: "1a · Trends over minutiae", text: "Total, comparison and trend come first; categories are capped at five plus Other." },
    { ref: "1b · Shame and anxiety", text: "Comparisons are like-for-like (same point in the period) and phrased neutrally with arrow and percentage — never good/bad colours." },
    { ref: "1b · Informed and helpless", text: "Exactly one “What stood out” card per range, each with a single optional action." },
    { ref: "§9 · Accessibility", text: "Each chart has a spoken summary, selectable bars with exact values, hatching for weekends, and labels beside every colour." },
  ] },
  category: { title: "Category detail", notes: [
    { ref: "1a · Flexible vs fixed", text: "The header says whether this category is steerable, so effort goes where it can matter." },
    { ref: "1b · No guilt", text: "Over budget turns the bar amber with a hatch pattern and offers to move money — no alarm." },
  ] },
  merchant: { title: "Merchant detail", notes: [
    { ref: "1b · “Little app man”", text: "Frequency and average are shown as facts. No commentary on whether it's too much." },
    { ref: "1a · Learns from corrections", text: "Shows whether the category is a learned guess or a rule the user made." },
  ] },
  plan: { title: "Plan · budgets, goals, bills", notes: [
    { ref: "1a · Rigid budgeting creates stress", text: "Four styles from “just track” to envelopes; switching keeps all data and is undoable." },
    { ref: "Competitor gap · Rocket Money", text: "Subscriptions show annual cost and price rises, with “keep it” as a perfectly good answer — no upsell." },
    { ref: "1a · EMIs", text: "Loans show tenure left and interest paid, alongside bills on one calendar." },
  ] },
  goal: { title: "Goal detail", notes: [
    { ref: "1a · Irregular income", text: "The monthly amount flexes; lowering it is framed as “takes a little longer”, not failure." },
    { ref: "§10 · Read-only", text: "States plainly that Ledgerly counts progress but never moves money." },
  ] },
  goalNew: { title: "Goal creation", notes: [
    { ref: "1a · Progressive disclosure", text: "Three choices, with the monthly amount worked out automatically." },
    { ref: "1b · Feeling capable", text: "Shows the effect on daily safe-to-spend before committing, so the trade-off is the user's call." },
  ] },
  accounts: { title: "Accounts & sync", notes: [
    { ref: "1a · Sync reliability", text: "Each source shows its real status and last sync time. Red is reserved for an actual failed sync." },
    { ref: "1a · Cash", text: "Cash is a wallet with a periodic “cash check” that reconciles the gap in one entry." },
    { ref: "1b · Privacy", text: "Every source explains what it reads in one sentence and can be switched off in a tap." },
  ] },
  shared: { title: "Shared space", notes: [
    { ref: "Persona · Meera & Karan", text: "Mine / Yours / Ours keeps personal spending private by default — fairness without micro-auditing." },
    { ref: "1b · No nagging", text: "Settling up is a single balance, and the reminder is the user's choice to send." },
  ] },
  assistant: { title: "AI assistant", notes: [
    { ref: "1b · Feeling capable", text: "Answers are concrete and end with what would close a gap, not a verdict." },
    { ref: "1a · Honest automation", text: "Every answer has “How I worked this out”. The header restates that it can never move money." },
  ] },
  recap: { title: "Weekly & monthly recap", notes: [
    { ref: "1a · Week 2–6 retention", text: "A 30-second story is the weekly habit — lighter than opening a dashboard." },
    { ref: "1b · Shame", text: "No streaks or scores. It can be shared with amounts hidden." },
  ] },
  settings: { title: "Settings", notes: [
    { ref: "1b · Notifications", text: "At most one proactive notification a day; only bills and unusual charges are on by default; quiet hours included." },
    { ref: "Persona · Sunita", text: "Hindi and regional languages, plus a larger-text, simpler mode." },
    { ref: "§12 · Monetisation", text: "Free and Plus are described side by side, with trial terms and one-tap cancel. Exports are never paywalled." },
  ] },
  privacy: { title: "Privacy", notes: [
    { ref: "1b · Fear of sharing", text: "Plain-language table of what is stored and where, a list of things the app can never do, and controls on the same screen." },
    { ref: "1b · Distrust of free apps", text: "Says how Ledgerly makes money in the first card." },
  ] },
  notifications: { title: "Notifications centre", notes: [
    { ref: "1b · “Little app man”", text: "Each item can be dismissed or its whole type turned off right here — no hunting through settings." },
    { ref: "§11 · No dark patterns", text: "Copy states facts and says when no action is needed." },
  ] },
  you: { title: "You", notes: [
    { ref: "1a · Progressive disclosure", text: "Advanced features (sharing, assistant, rules) live here until they're wanted, away from the daily flow." },
    { ref: "1b · Privacy as UI", text: "Privacy is the first settings row, not buried under “Legal”." },
  ] },
  rules: { title: "Learned rules", notes: [
    { ref: "1a · Honest automation", text: "Everything the app has learned is listed and removable, so automation never feels opaque." },
  ] },
};
