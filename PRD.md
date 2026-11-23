# VayuTula — PRD for Claude Code (v1.0)

Build a deployable VayuTula: Must features first, Should features if time remains, Could features skipped. Submission deadline Nov 29, 2026, 11:59 PM IST.

## 1. Product summary and scope

**VayuTula** ("air balance") is a free GenAI web app for families in smog-hit cities. A family describes its home once; every day VayuTula gives a short, room-by-room plan. Each action is weighed on three pans: **breathe in** (estimated exposure avoided), **emit out** (PM2.5 and CO₂ avoided), and **₹** (money saved or spent).

**Primary user:** the household's "air manager" (parent, 25–45, smartphone, English or Hindi), Delhi-NCR first; any city with a forecast.

**Goals for v1.0**

1. Score high on the two High-impact judging areas: problem alignment and code quality.
2. Ship a deployed, working product that a real family can use end to end on a phone.
3. Never show a number the code didn't compute; never give medical advice.

### Scope

| Priority | Requirements | Rule |
| --- | --- | --- |
| **Must** | FR-1 home setup by conversation · FR-2 location forecast · FR-3 indoor estimator · FR-4 action library · FR-5 Tula score · FR-6 daily plan · FR-7 explain panel · FR-13 rupee pan · FR-14 free-first ranking · FR-16 purifier nudge | Build all before any Should |
| **Should** | FR-8 what-if · FR-9 replan diff · FR-10 community share · FR-15 "your home's air" explainer · FR-17 society pack · FR-18 "is my purifier enough?" | Only after Must is deployed and tested |
| Could | FR-11 weekly chart · FR-12 monitor calibration | **Skipped** |
| Out of scope | Accounts, payments, native apps, hardware, medical advice, multiple homes | — |

### What "ready to sell" honestly means

The code will be production-grade: deployed, tested, secure, accessible, bilingual. That is necessary but not sufficient to sell. Before charging anyone, these non-code items must be done (owners in Section 9):

- **Data licence:** Open-Meteo's free API is for non-commercial use ([Open-Meteo](https://github.com/schicho/open-meteo)). Commercial launch needs its paid plan or the Google Air Quality API with billing.
- **Legal:** privacy policy, terms of use, a clear "not medical advice" notice, and a review against India's data-protection law.
- **Verified constants:** every tariff, emission factor and purifier rating must be checked and cited by a person.
- **Validation:** at least 5 real families use it for a week; 2–3 RWAs see the society pack; at least one brand conversation.

The hackathon build delivers the product; these steps turn it into a business.

## 2. Rule-book compliance (check before every submission)

| Rule (from Instructions.docx and the submission page) | How the build meets it | Who checks |
| --- | --- | --- |
| Public GitHub repo | Created public on day 0 | Human |
| Only one branch | Work on `main` only; Claude Code never creates branches | Claude Code + human |
| Repo under 10 MB | `.gitignore` excludes `node_modules`, `.next`, coverage, videos; no images over 200 KB; CI job fails if tracked size > 8 MB | CI |
| Max 3 submissions | #1 on 26 Nov, #2 on 28 Nov, #3 reserved for the final fix by 29 Nov 9 PM | Human |
| Video link: unlisted YouTube or shared Drive | 2–3 min demo recorded on 28 Nov | Human |
| README: vertical, approach and logic, how it works, assumptions | Required sections listed in Section 10; plus brief-to-feature table | Claude Code |
| "Smart, dynamic assistant"; "logical decision making based on user context" | Plan changes with forecast, home and budget; reasoning shown per action | Claude Code |
| "Practical and real-world usability" | Deployed URL; works on a 360 px phone; Hindi/English | Claude Code + human test |
| Code quality (High) | Layered modules, strict TypeScript, lint/format clean, small functions | CI |
| Problem alignment (High) | Every brief clause maps to a feature, file and test (README table) | Claude Code |
| Security (Medium), Efficiency (Medium) | Section 7 | CI + review |
| Testing (Low), Accessibility (Low) | Section 7 | CI |
| No plagiarism | All code written for this repo; third-party libraries via package manager only | Human |

## 3. Tech stack, architecture and repo structure

| Layer | Choice | Why |
| --- | --- | --- |
| App | Next.js (App Router) + TypeScript `strict` | One repo for UI and server routes; API key stays server-side; easy deploy |
| Styling | Tailwind CSS | Small, consistent, accessible defaults |
| Validation | Zod | One schema for API input, AI output and profile |
| AI | Google Gemini (Flash-class model) via the official `@google/genai` SDK, JSON-schema output | Fast, cheap, structured output; Google-run challenge |
| Air data | Open-Meteo Air Quality API (primary); Google Air Quality API (optional, behind an adapter) | Free for the hackathon; swappable for commercial |
| Storage | Browser `localStorage` (profile, plan history) | Privacy by default; no database to secure |
| Tests | Vitest (unit), Playwright (one end-to-end path) | Fast, standard |
| Quality | ESLint, Prettier, `tsc --noEmit`, GitHub Actions CI | Enforces the High-impact code-quality score |
| Deploy | Vercel (default) or Google Cloud Run | Live URL in minutes |

**Request flow:** browser → `/api/forecast` (cached) → engine computes indoor levels and Tula scores → `/api/plan` sends **only computed numbers** to Gemini → Zod validates the reply → UI renders. The engine runs on both server and client (pure functions), so what-ifs are instant.

### Repo structure

```
vayutula/
  README.md            # judged: vertical, approach, logic, assumptions, brief table
  CLAUDE.md            # rules for Claude Code (Section 10)
  PRD.md               # this document, exported
  .env.example         # GEMINI_API_KEY=, AIR_PROVIDER=openmeteo
  .github/workflows/ci.yml
  src/
    app/               # pages and API routes only (thin)
      page.tsx         # home / today's plan
      setup/page.tsx   # conversational setup
      api/forecast/route.ts
      api/intake/route.ts
      api/plan/route.ts
    domain/            # types + Zod schemas (Profile, Forecast, Action, Plan)
    engine/            # pure functions: indoor.ts, exposure.ts, emissions.ts, cost.ts, rank.ts
    data/              # adapters: openMeteo.ts, googleAq.ts, cache.ts
    ai/                # client.ts, prompts/, validators.ts, fallback.ts
    config/            # cited JSON: purifiers.json, factors.json, tariffs.json, actions.json, health-library.json
    i18n/              # en.json, hi.json
    ui/                # components (TulaScale, ActionCard, WhyPanel, NudgeBanner...)
    lib/               # rateLimit.ts, logger.ts, errors.ts
  tests/
    engine/  ai/  api/  e2e/
```

Rule: `app/` may import from every layer; `engine/` imports only `domain/` and `config/`; `ai/` never imports `ui/`.

## 4. Data model, engine and config

All numbers come from pure, tested functions in `engine/`. The AI never computes.

### 4.1 Core types (in `domain/`, each with a Zod schema)

| Type | Key fields |
| --- | --- |
| `Profile` | `city`, `lat`, `lon`, `lang` (en/hi), `members[]` {id, label, ageGroup: child/adult/elder, sensitive: bool}, `rooms[]` {id, name, areaM2, heightM = 2.8, windowType: leaky/average/sealed, purifierId?, occupancy: \[{memberId, fromHour, toHour}\]}, `cooking` {fuel: lpg/png/induction/biomass, mealsPerDay, mealHours\[\], chimney: bool, kitchenDoor: bool}, `sources` {incensePerDay, coilNightsPerWeek, smokerIndoors: bool}, `commute` {mode, kmPerDay, daysPerWeek}, `budgetTier`: 0/2000/15000 |
| `Forecast` | `source`, `fetchedAt`, `hours[]` {time, pm25 µg/m³} (≥ 96 h) |
| `ActionDef` (config) | `id`, `category`: indoor / routine / alternative, `costTier`: 0 / 1 (≤ ₹2,000) / 2, `effort`: 1–3, `appliesWhen`, `modifies` (scenario change), `citation` |
| `TulaScore` | `inhaledAvoided` (µg·h/m³ per member), `pmEmittedAvoidedG`, `co2AvoidedKg`, `rupeesPerMonth` (+ saves / − costs), `confidence`: high/med/low, `assumptions[]` |
| `Plan` | `date`, `items[]` {actionId, tula, whyText, timeWindow}, `forecastSource`, `generatedAt`, `version` |

### 4.2 Indoor estimator (FR-3)

Per room, hourly, single well-mixed zone:

```latex
\lambda = a + k + \frac{f\,q}{V}, \qquad C_{ss} = \frac{P\,a\,C_{out} + S/V}{\lambda}, \qquad C_{t+1} = C_{ss} + (C_t - C_{ss})\,e^{-\lambda \cdot 1\,\mathrm{h}}
```

C = indoor PM2.5 (µg/m³); C\_out = forecast; a = air exchange rate (1/h, by window type; airing hour uses a high value); k = deposition rate (1/h); P = penetration factor; q = purifier CADR (m³/h); f = fraction of the hour it runs; V = room volume (m³); S = indoor source emission (µg/h, from cooking, incense, coil, smoking schedules).

### 4.3 Tula pans (FR-5, FR-13)

- **Breathe in:** for each member, sum indoor C over the hours they spend in each room = exposure (µg·h/m³). Avoided = baseline scenario (today's habits) − action scenario.
- **Emit out:** only emissions that leave the home: transport (per-km factors by mode), cooking fuel (LPG kg × factor vs induction kWh × grid factor), electricity for purifiers. Indoor sources (incense, coil) count in breathe-in, and their outdoor share is ignored in v1 (stated in README).
- **₹:** kWh × tariff, LPG kg × price, fuel per km, one-off purchases spread over 12 months, filter replacements. Positive = saves.
- **Confidence:** high if purifier CADR and window type are known; medium if one is defaulted; low if both are.

### 4.4 Ranking (FR-6, FR-14)

1. Filter actions to those that apply to this home and fit `budgetTier`.
2. Score = weighted, normalised (breathe-in, emit-out, ₹) − effort. Breathe-in weight doubles if any member is a child, elder or `sensitive`.
3. **Free-first, enforced in code:** sort by `costTier` ascending, then by score. Paid actions appear only after all applicable free ones.
4. Pass the top 8 to the AI, which chooses 3–5 and writes the text. A validator rejects any plan that breaks free-first order.

### 4.5 Config files (`config/*.json`, each value has `value`, `unit`, `source`, `verifiedOn`)

| File | Contents | Status |
| --- | --- | --- |
| `factors.json` | P, k, a per window type and airing, source emission rates, transport and fuel emission factors, grid CO₂ factor | Claude Code fills starting defaults marked `"verifiedOn": null`; **a person must cite and verify each before submission #1** |
| `tariffs.json` | Electricity ₹/kWh (Delhi slab), LPG ₹/cylinder, petrol ₹/L | Same |
| `purifiers.json` | \~20 common models sold in India: CADR m³/h, watts, filter ₹ | Same |
| `actions.json` | \~25 actions across the three categories, each with a citation | Claude Code drafts; person reviews |
| `health-library.json` | Fixed health sentences with source (WHO, CPCB) | Person approves wording |

The UI shows "estimate" beside every number and a link to its assumptions. Unverified values (`verifiedOn: null`) display a visible "provisional" badge, so nothing unverified looks final.

## 5. Functional specification

### 5.1 Must

| ID | Behaviour | Acceptance tests |
| --- | --- | --- |
| FR-1 Home setup | Chat-style setup at `/setup`. User types or pastes a description (EN or HI). `/api/intake` returns a partial `Profile` + the next single question. Repeats until required fields are filled (≤ 6 questions). User can edit any field in a summary form before saving. A manual form is always available as a fallback | Hindi and English sample texts produce valid profiles; nonsense input asks a clarifying question, never crashes; invalid AI output falls back to the form |
| FR-2 Forecast | `/api/forecast?lat&lon` returns ≥ 96 h PM2.5, cached 1 h per rounded location. City search via Open-Meteo geocoding; browser location optional. Source name and fetch time shown on screen | Cache hit makes no network call (mocked test); provider error shows a friendly message and the last cached data with its age |
| FR-3 Indoor estimator | Hourly indoor PM2.5 per room for 48 h under baseline habits | Unit tests: no purifier and sealed room converge to the expected steady state; purifier lowers C; airing during a low outdoor hour lowers C; inputs out of range rejected |
| FR-4 Action library | \~25 actions in three groups: indoor tips, low-emission routines, sustainable alternatives. Each has `appliesWhen` and a citation | Every action has a citation; filtering returns only relevant actions (e.g. no induction tip if already induction) |
| FR-5 Tula score | For each applicable action: breathe-in avoided per member, PM and CO₂ emitted avoided, confidence, assumptions | Known inputs produce hand-calculated outputs (golden tests); per-member values sum correctly |
| FR-13 Rupee pan | ₹/month per action from `tariffs.json` and purchase costs | Values match config exactly; "provisional" badge shown when `verifiedOn` is null |
| FR-14 Free-first | Ranking enforces cost tier order | Property test: for 1,000 random profiles, no paid action precedes an applicable free one |
| FR-6 Daily plan | Home screen shows today's 3–5 actions, each with a time window, Tula scale and one-line reason, written by the AI from computed numbers | Every number in AI text equals an engine value (validator); AI failure uses a template plan |
| FR-7 Why panel | Tap an action to see inputs, formula in words, assumptions with sources, confidence | Panel lists every assumption used for that action |
| FR-16 Purifier nudge | If a purifier exists, banner shows "switch on now in \<room>" at planned hours (while app is open; optional browser notification with permission). "Done" tap logs hours; weekly hours shown | Banner appears in the right window (time mocked); hours accumulate in localStorage |

### 5.2 Should (only after Must is deployed)

| ID | Behaviour | Acceptance tests |
| --- | --- | --- |
| FR-8 What-if | Free-text question ("second purifier?", "switch to induction?") → AI maps it to a scenario change → engine computes → AI explains | Numbers in answer equal engine output; out-of-scope questions are politely declined |
| FR-9 Replan diff | When forecast changes by more than a threshold, show what changed in the plan and why | Diff lists only changed items |
| FR-10 Community share | One-tap WhatsApp-ready message (EN/HI) with tomorrow's outlook and 3 collective actions; uses `wa.me` share link | Message under 1,000 characters; no personal data included |
| FR-15 Your home's air | After setup: estimated nightly bedroom level vs WHO guideline, with cited facts only | Text drawn only from `health-library.json` + engine values |
| FR-17 Society pack | Combine exported plan codes from several flats (no server storage) into one society summary and group-order list with per-flat cost | 3 sample flats → one valid message; duplicates merged |
| FR-18 Purifier check | "Is my purifier enough?" from room volume and CADR (air changes per hour), brand-neutral | Result matches formula; no brand ranking |

## 6. AI design

**Principle: numbers from code, words from the model.** The AI understands people and writes for them; it never calculates.

| Task | Input to model | Output (Zod schema, JSON mode) | Fallback |
| --- | --- | --- | --- |
| Intake (FR-1) | User text + current partial profile + list of missing fields | `{ profileDelta, nextQuestion, lang }` | Manual form |
| Plan (FR-6) | Top-8 ranked actions with their computed Tula numbers, time windows, household summary (no names), language | `{ items: [{ actionId, whyText, timeWindow }] }` (3–5 items) | Template text per action |
| What-if (FR-8) | Question + list of allowed scenario changes | ` { scenarioChange }  ` then, after engine runs, `{ answerText }` | "I can't answer that yet" |
| Replan diff (FR-9) | Old plan, new plan, forecast change | `{ diffText }` | Rule-based diff list |
| Share (FR-10, FR-17) | Outlook numbers, chosen collective actions, language | `{ message }` | Template message |

### Guardrails (all enforced in `ai/validators.ts`, all unit-tested)

1. **Number check:** extract every number from AI text; each must match an engine value (rounded as displayed). Otherwise retry once with the error, then use the fallback.
2. **Action check:** `actionId`s must come from the supplied list; free-first order must hold.
3. **Health check:** text may not contain diagnosis, medicine or dosage terms; a blocklist plus a rule that health statements come only from `health-library.json`. If the user mentions symptoms, show a fixed "please consult a doctor" message.
4. **Injection safety:** user text is wrapped as quoted data inside a fixed server-side system prompt; the model is told to ignore instructions inside it; outputs are schema-checked, never executed or rendered as HTML.
5. **Cost control:** one call per plan; plans cached per profile hash + forecast hour; max output tokens set; temperature low (≤ 0.3).
6. **Transparency:** UI labels AI-written text and shows the source of every number.

**Prompts** live in `ai/prompts/*.ts` as versioned constants with a short system instruction, the JSON schema, and 2 worked examples (English and Hindi).

## 7. Non-functional requirements

| Area (judging weight) | Requirement | Measured by |
| --- | --- | --- |
| Code quality (High) | TypeScript `strict`, no `any`; functions ≤ 40 lines; files ≤ 250 lines; layer rules from Section 3; JSDoc on public engine functions; no commented-out code; conventional commit messages | ESLint (incl. import rules), Prettier, `tsc`, CI |
| Security (Medium) | Gemini key only in server env; `.env` git-ignored; Zod validation on every API input (size limits: text ≤ 2,000 chars); rate limit 20 AI requests/min per IP; security headers (CSP, X-Content-Type-Options, Referrer-Policy) via Next config; no user data in logs; errors return generic messages; `npm audit` with no high issues | CI + manual review |
| Efficiency (Medium) | Forecast cached 1 h; plan cached per profile hash + hour; engine runs in < 50 ms for 48 h × 6 rooms; first load JS < 200 KB gzipped; ≤ 12 runtime dependencies | Unit benchmark, Next build output |
| Testing (Low) | ≥ 90% line coverage on `engine/` and `ai/validators`; API route tests with mocked providers; 1 Playwright path: setup → plan → why panel | CI coverage report |
| Accessibility (Low) | WCAG 2.1 AA contrast; full keyboard use; visible focus; labels on all inputs; `aria-live` for plan updates; AQI and Tula values shown in text, not colour alone; `lang` attribute switches for Hindi; works at 360 px width and 200% zoom | axe check in Playwright; manual keyboard pass |
| Privacy | No accounts; profile stays in the browser; only the minimum (rounded location, anonymised household summary) is sent to the server and AI; "delete my data" button | Manual review |
| Reliability | Every external call has a timeout (8 s) and fallback; app usable with AI down (template plans) | Tests with mocked failures |
| Localisation | All UI strings in `i18n/en.json` and `hi.json`; no hard-coded text | Lint rule / test that flags literal strings in `ui/` |

## 8. Build rounds

Every round ends deployed, with something you can click. **Definition of done for every round:** lint, type-check and tests pass in CI; pushed to `main`; live URL updated; the round's "try it" steps work on a phone.

| Round | Date | Builds | Try it at the end |
| --- | --- | --- | --- |
| R0 Foundation | 24 Nov AM | Next.js + TS strict, Tailwind, ESLint/Prettier, Vitest, CI, `.env.example`, i18n skeleton, security headers, README skeleton; deploy | Open the live URL; switch English/Hindi |
| R1 Forecast (FR-2) | 24 Nov PM | Geocoding search, forecast adapter, cache, hourly PM2.5 view with source and time | Search "Noida"; see 4-day hourly PM2.5 and its source |
| R2 Engine (FR-3, 4, 5, 13, 14) | 25 Nov | Domain schemas, config files with provisional values, indoor estimator, Tula scores, ₹ pan, free-first ranking; manual profile form; action list with Tula scales (no AI yet) | Fill the form for a 2BHK with one purifier; see ranked actions with breathe-in / emit-out / ₹ |
| R3 AI intake (FR-1) | 26 Nov AM | Gemini client, intake prompt, validators, rate limit, chat setup with form fallback | Type a Hindi description of your home; watch the profile fill in |
| R4 Plan + nudge (FR-6, 7, 16) | 26 Nov PM | Plan prompt, number and health validators, template fallback, home screen, why panel, purifier banner and hours log | Today's plan in Hindi; tap "why"; see the purifier banner |
| **Submission #1** | 26 Nov night | All Must done; README complete; Playwright path; size check | Submit the repo link |
| R5 Quick Shoulds (FR-15, 18, 10) | 27 Nov | Home-air explainer, purifier check, WhatsApp share | Share tomorrow's outlook to WhatsApp |
| R6 Bigger Shoulds (FR-8, 9, 17) | 28 Nov | What-if, replan diff, society pack | Ask "should we buy induction?"; change forecast and see the diff; merge 3 flats |
| **Submission #2** + video | 28 Nov night | Final README, accessibility pass, demo video | Submit with video link |
| Buffer | 29 Nov | Fixes only, no new features; submission #3 only if #2 has a defect; stop by 9 PM | — |

**If behind schedule:** drop R6 first, then R5. Never start a Should before Submission #1 is in.

**Demo script (video, 2–3 min):** problem in one sentence → setup in Hindi → today's plan with the Tula scale → why panel → forecast change and replan → two homes (budget vs well-off) get different free-first plans → WhatsApp share → README brief table.

## 9. Human tasks (Claude Code can't do these)

### Before R0 (tonight or 24 Nov morning)

- [ ] Create a **public** GitHub repo `vayutula` with only `main`; add this PRD as `PRD.md`
- [ ] Get a Gemini API key (Google AI Studio); never paste it into chat or commit it
- [ ] Create a Vercel (or Cloud Run) project linked to the repo; add `GEMINI_API_KEY` as an environment variable
- [ ] Confirm whether teams are allowed; the earlier explainer said individual only

### During the build

- [ ] **Verify every value in `factors.json`, `tariffs.json`, `purifiers.json`** against a primary source (CEA for grid CO₂, DERC/discom for Delhi tariffs, IOCL for LPG price, manufacturer pages for CADR, peer-reviewed papers for P, k, air exchange and source rates); fill `source` and `verifiedOn`. Target: before submission #1
- [ ] Review `actions.json` wording and citations; approve `health-library.json` text
- [ ] Have a native Hindi speaker review `hi.json` and two sample plans
- [ ] Test each round on your own phone; report bugs to Claude Code with steps
- [ ] Ask 3–5 families to try the live app; note what confused them

### Submission

- [ ] Run the size check; delete any extra branches on GitHub
- [ ] Record the 2–3 min demo; upload as unlisted YouTube or shared Drive link
- [ ] Write the LinkedIn build-in-public post (and blog if required)
- [ ] Submit on the platform; log which attempt (1/2/3) was used and when

### Before selling (after the hackathon)

- [ ] Switch to a commercial data licence (Open-Meteo paid plan or Google Air Quality API with billing)
- [ ] Lawyer-reviewed privacy policy and terms; data-protection compliance review for India; "not medical advice" notice
- [ ] Domain, analytics with consent, error monitoring, uptime alerts
- [ ] Pilot with 2–3 RWAs; at least one purifier or filter brand conversation
- [ ] Survey 20 families on willingness to pay and preferred features

## 10. Instructions for Claude Code

Save the block below as `CLAUDE.md` in the repo root. Export this doc as Markdown and save it as `PRD.md` next to it.

```markdown
# VayuTula — rules for Claude Code

Read PRD.md before any work. It is the source of truth.

## Process
- Work one round at a time (PRD Section 8). At the start of a round, restate its scope and its "try it" steps; at the end, report what was built, test results, and how to try it.
- Build every Must before any Should. Never build Could items (FR-11, FR-12).
- Write tests first for engine/ and ai/validators. Keep CI green; never skip or delete a failing test to pass.
- Commit small, with conventional messages (feat:, fix:, test:, docs:, chore:). Push to main only. Never create branches. Never force-push.
- Before each commit run: npm run lint && npm run typecheck && npm test.
- If something in the PRD is unclear or conflicts, stop and ask; do not guess.

## Architecture
- Layers: app/ (thin routes and pages), domain/, engine/ (pure functions), data/ (adapters), ai/, config/, i18n/, ui/, lib/.
- engine/ imports only domain/ and config/. ai/ never imports ui/.
- TypeScript strict, no any. Functions <= 40 lines, files <= 250 lines.
- All UI text from i18n/en.json and i18n/hi.json.

## Numbers and AI
- The AI never computes. Every number shown comes from engine/.
- Every AI output goes through a Zod schema and ai/validators (number, action, health, free-first checks). On failure: retry once, then template fallback.
- Health statements only from config/health-library.json. No diagnosis, medicine or dosage.
- Config values carry value, unit, source, verifiedOn. Never invent a source; leave source as "TODO" and verifiedOn null so the UI shows "provisional".

## Security and size
- Secrets only in server env. Never print, log or commit keys. .env is git-ignored; keep .env.example current.
- Validate every API input with Zod; rate-limit AI routes; set security headers.
- Keep the repo under 10 MB: no binaries, videos or large images; check tracked size before each push.

## README (judged) must contain
1. Chosen vertical: Challenge 6, Urban Air Quality Assistant
2. Brief-to-feature table: clause -> feature -> file -> test
3. Approach and logic: Tula scale, engine formulas, ranking, AI guardrails
4. How it works: user journey with screenshots (small PNGs)
5. Assumptions: every config value with source and status
6. Setup, scripts, testing, deployment, security, accessibility notes
7. Business model and roadmap (short)
```

### Prompt to start each round

> Read PRD.md and CLAUDE.md. Start Round **R\_n**. List the requirements in scope and the "try it" steps, then build with tests first. Stop at the end of the round, deploy, and report: what works, test and lint results, what I should try on my phone, and any human task now due.
