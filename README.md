# Brief Decoder

Brief Decoder helps product designers understand a vague stakeholder brief before they start designing. Paste a brief, see what it actually says, what is unclear or missing, answer the questions you can, and take away an editable working brief.

Its one rule: **make uncertainty visible, and never make a brief look complete by inventing information.**

It runs in two modes:

- **Demo** (default, no setup): three hand-written examples.
- **Live AI**: analyses your own text with Claude, once you add an API key.

## 1. Install and run

You need [Node.js](https://nodejs.org) 20.9 or newer.

```bash
npm install
```

```bash
npm run dev
```

## 2. Open the local preview

Go to <http://localhost:3000> in your browser. The page reloads as you edit files. Stop the server with `Ctrl + C`.

## 3. How demo mode works

With no API key, the header shows **Demo** and the app offers three prepared briefs under **Try an example** (dashboard, checkout, onboarding).

- Each example has an analysis written by hand for that exact text (`src/lib/demo.ts`). It goes through the same validation and quote checking as live output.
- If you edit an example or type your own brief, the app says live analysis isn't connected. It does not guess, match keywords, or reuse an example's analysis.
- Results appear instantly. No fake "thinking" delay is added.
- Nothing you type leaves your browser.

Everything else works in the demo: viewing source quotes, answering questions, confirming or rejecting assumptions, editing the working brief, copying and downloading.

## 4. Configure live AI

1. Create an API key at <https://platform.claude.com/>.
2. Copy the template: `cp .env.example .env.local`
3. In `.env.local`, set:

   ```
   ANTHROPIC_API_KEY=your-key-here
   ANTHROPIC_MODEL=claude-opus-5-5
   ```

   `ANTHROPIC_MODEL` is optional and defaults to `claude-opus-5-5`. Any current Claude model that supports structured outputs works; cheaper models cost less per analysis. Check identifiers in the [models overview](https://platform.claude.com/docs/en/about-claude/models/overview).
4. Restart `npm run dev`. The header now shows **Live AI**.

The key is only read on the server (`src/app/api/analyse/route.ts`). It is never sent to the browser, and `.env.local` is ignored by git.

Locally, live mode uses a simple in-memory request limit. That is fine on your own machine but is **not** a safeguard for a public site — see the next section.

### Free alternative: Google Gemini

Instead of `ANTHROPIC_API_KEY`, set `GEMINI_API_KEY` (free key from <https://aistudio.google.com/> → API keys). Optionally set `GEMINI_MODEL` (default `gemini-4-hydrogen`). If both keys are set, Claude is used. Free-tier keys have daily limits, and Google may use free-tier inputs to improve its models, so use non-confidential briefs.

## 5. Configure public request limits

Each live analysis costs money, so a public deployment must cap usage. In production the app **stays in demo mode** unless a shared limit store is configured, even if an API key is present.

The store is [Upstash Redis](https://upstash.com) (a free tier is enough):

1. Create a Redis database at Upstash, or add the Upstash integration from the Vercel Marketplace.
2. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (the integration's `KV_REST_API_URL` / `KV_REST_API_TOKEN` names are also recognised).
3. Optionally tune:
   - `RATE_LIMIT_PER_MINUTE` — requests per visitor per minute (default `5`)
   - `DAILY_REQUEST_CAP` — total live analyses per day for everyone (default `200`)

Limits are checked **before** the AI provider is called, and if the store can't be reached the request is refused rather than allowed. Visitors are identified by a hash of their IP address; the raw address is not stored.

Also set a monthly spend limit in the Anthropic Console as a backstop.

`ALLOW_UNMETERED_LIVE=true` turns live mode on in production without Upstash. Limits then exist only in one server's memory and don't hold across instances, so use it only for private deployments.

## 6. Deploy to Vercel

1. Push this repository to GitHub.
2. At <https://vercel.com/new>, import the repository. The defaults work (framework: Next.js).
3. Deploy. With no environment variables you get the public demo.
4. For live AI, open **Project → Settings → Environment Variables** and add `ANTHROPIC_API_KEY`, optionally `ANTHROPIC_MODEL`, and the Upstash variables from section 5. Redeploy.

The analysis route allows up to 120 seconds per request (`maxDuration`); check that your Vercel plan permits this.

## 7. What is sent to the AI provider

In live mode, when you press **Decode brief**:

- **Sent to Anthropic:** the full text of your brief, plus this app's fixed instructions. Nothing else — not your answers, edits or working brief (those are combined in your browser without another AI call).
- **Sent to Upstash (if configured):** a hashed visitor identifier and counters. No brief text.
- **Not stored by this app:** there is no database, no `localStorage`, no analytics and no session replay. The server logs only error codes, never brief text or AI output. Your work disappears when you close or reload the page.

How long Anthropic keeps request data depends on your Anthropic account's terms; this app makes no promise about that. Use non-confidential briefs.

In demo mode nothing is sent anywhere.

## Checks

```bash
npm run check
```

This runs type checking, linting, the tests (`tests/`) and a production build. Run them separately with `npm run typecheck`, `npm run lint`, `npm test` and `npm run build`.

## How it fits together

| Path | What it does |
| --- | --- |
| `src/lib/schema.ts` | Data shapes and limits, shared by browser and server |
| `src/lib/normalise.ts` | Validates analysis output, checks every quote against the brief, assigns IDs |
| `src/lib/quotes.ts` | Literal quote matching (no fuzzy matching) |
| `src/lib/demo.ts` | The three curated examples |
| `src/lib/working-brief.ts` | Builds and updates the working brief; Markdown export |
| `src/lib/analyse.ts` | The single Anthropic request and its system prompt |
| `src/lib/analyse-handler.ts` | Request validation → limits → provider → output validation |
| `src/lib/rate-limit.ts`, `config.ts` | Request limits and demo/live decision |
| `src/components/` | The interface |

## 8. Known limitations

- **Live analysis has not been run end-to-end against the real API in development of this version** — no key was available. Validation, limits, error handling and the request up to authentication were tested; expect to review the first real results.
- AI analysis can still be wrong or incomplete. Quotes are verified word-for-word, but statements, questions and priorities are the model's judgement. Requirements whose quote can't be found are set aside under "Needs your review".
- If a quote appears more than once in the brief, "Show in brief" highlights the first occurrence.
- One request per analysis, with no automatic retries. If the output is invalid or the provider times out, you choose whether to try again. Slow models may time out (100 seconds).
- If the provider declines a brief, no analysis is shown; no fallback model is tried.
- Nothing is saved. Reloading the page clears the brief, answers and edits.
- "Confirmed by you" records your own confirmation, not the stakeholder's approval.
- The working brief is updated by fixed rules, not rewritten by AI, so answers are added as "question — answer" lines for you to tidy.
- No accounts, file uploads, sharing or integrations.
- Accessibility was checked by keyboard and automated browser runs, not with a screen reader or a formal WCAG audit.
