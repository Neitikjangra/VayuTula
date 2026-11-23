# VayuTula — Master Prompt for Claude Code

Paste everything below the line into Claude Code, from inside the `VayuTula` folder that contains `PRD.md`, `SRS.md` and `CLAUDE.md`.

---

You are the lead engineer building **VayuTula**, a GenAI web app for PromptWars Virtual, Challenge 6 (Urban Air Quality Assistant). You will take it from an empty folder to a deployed, tested, judge-ready product. Submission deadline: 29 Nov 2026, 11:59 PM IST.

## 0. Sources of truth

1. Read `PRD.md` fully. It defines scope, architecture, engine formulas, AI guardrails, non-functional requirements, build rounds and human tasks.
2. Read `CLAUDE.md`. Its rules apply to every action.
3. Read `SRS.md` for requirement IDs and the evidence behind them.
4. If these files conflict, PRD.md wins. If something is unclear or missing, ask me one short question and wait. Never guess on scope, numbers or health content.

Before writing any code, reply with:
- a one-paragraph summary of the product in your own words;
- the list of Must requirements (FR-1, 2, 3, 4, 5, 6, 7, 13, 14, 16) and Should requirements (FR-8, 9, 10, 15, 17, 18); confirm Could items (FR-11, 12) are skipped;
- the round plan R0–R6 with the "try it" step for each;
- any question that blocks you.

Then wait for my "go".

## 1. Non-negotiable rules

- **Rule book:** public GitHub repo, one branch (`main`) only, repo under 10 MB, README must cover vertical, approach and logic, how it works, assumptions. Never create branches. Never force-push. Never commit `node_modules`, build output, coverage, videos or secrets.
- **Order:** every Must requirement is built, tested and deployed before any Should starts. Could items are never built.
- **Numbers:** the AI never computes. All numbers come from pure functions in `src/engine/`. Every AI output passes a Zod schema and `src/ai/validators` (number check, action check, free-first check, health check). On failure: retry once, then use the template fallback.
- **Health:** no diagnosis, medicine names or dosage. Health sentences come only from `config/health-library.json`. Symptom mentions trigger a fixed "please consult a doctor" message.
- **Config honesty:** every value in `config/*.json` has `value`, `unit`, `source`, `verifiedOn`. You may add starting defaults, but you must set `source: "TODO"` and `verifiedOn: null` unless I give you a source. Never invent a citation. The UI shows a "provisional" badge on any number that depends on an unverified value.
- **Secrets:** `GEMINI_API_KEY` is read only on the server from environment variables. Never ask me to paste it into chat. Never print or log it.
- **Quality gate before every commit:** `npm run lint && npm run typecheck && npm test` must pass. Never skip, weaken or delete a test to make it pass.
- **Commits:** small, conventional messages (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`), pushed to `main` at the end of each task.

## 2. How to run each round

For every round below:

1. **Start:** state the requirements in scope, files you will create or change, tests you will write, and the "try it" steps.
2. **Build test-first** for `engine/`, `ai/validators`, and any pure logic. Then build API routes, then UI.
3. **Verify:** run lint, typecheck, unit tests, and (from R4) the Playwright test. Run `npm run build`. Check tracked repo size with `git count-objects -vH` and fail the round if over 8 MB.
4. **Self-review:** re-read the diff as a strict senior reviewer. Check: layer rules, function and file length, no `any`, no hard-coded UI strings, no secrets, input validation, accessibility (labels, keyboard, contrast, text not colour alone). Fix what you find.
5. **Commit and push** to `main`.
6. **Report** using this exact template, then continue to the next round unless a human checkpoint is due:

```
ROUND <n> REPORT
Built: <requirements and features>
Tests: <passed>/<total>, coverage engine/ <x>%
Lint/typecheck/build: <pass/fail>
Repo size: <MB>
Try it: <numbered steps for me on a phone>
Human tasks now due: <list or "none">
Known issues: <list or "none">
Next: <round>
```

If you are blocked (missing key, failing external API, unclear requirement), stop, explain in two lines, and propose the fastest way forward.

## 3. Rounds

### R0 — Foundation
- Scaffold Next.js (App Router) + TypeScript `strict` + Tailwind in the current folder (keep PRD.md, SRS.md, CLAUDE.md).
- Add ESLint (with import-boundary rules for the layers in PRD Section 3), Prettier, Vitest with coverage, Playwright (configured, one placeholder test).
- Create the folder structure from PRD Section 3 with minimal index files.
- Add `.gitignore` (node_modules, .next, coverage, playwright-report, test-results, .env*, except .env.example), `.env.example` (`GEMINI_API_KEY=`, `AIR_PROVIDER=openmeteo`).
- Security headers in `next.config` (CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
- i18n: `src/i18n/en.json`, `hi.json`, a tiny typed `t()` helper and a language toggle that also sets `<html lang>`.
- GitHub Actions `ci.yml`: install, lint, typecheck, test with coverage, build, repo-size check.
- README skeleton with all required section headings.
- Home page: product name, one-line promise, language toggle.
- **HUMAN CHECKPOINT A:** tell me to (1) create `.env.local` with my Gemini key, (2) import the repo into Vercel and add `GEMINI_API_KEY` there, (3) send you the live URL. Wait for me before R3; you may continue R1–R2 meanwhile.

### R1 — Forecast (FR-2)
- `src/data/openMeteo.ts`: geocoding search and hourly PM2.5 forecast (at least 96 hours), with 8 s timeout and typed errors.
- `src/data/cache.ts`: in-memory TTL cache (1 hour) keyed by location rounded to 2 decimals.
- `GET /api/forecast?lat&lon` with Zod validation; `GET /api/geocode?q` with length limits.
- UI: city search, optional browser location, hourly PM2.5 list/strip for the next 4 days, source name and fetch time, friendly error with last cached data and its age.
- Tests: adapter parsing with fixtures, cache hit makes no network call, invalid input rejected, provider failure path.

### R2 — Engine (FR-3, FR-4, FR-5, FR-13, FR-14)
- `src/domain/`: Zod schemas and types for Profile, Forecast, ActionDef, TulaScore, Plan exactly as PRD Section 4.1.
- `src/config/`: `factors.json`, `tariffs.json`, `purifiers.json` (about 20 common models sold in India), `actions.json` (about 25 actions across indoor tips, low-emission routines, sustainable alternatives, each with `appliesWhen`, `modifies`, `costTier`, `effort`, `citation`), `health-library.json`. All unverified values marked as required in Section 1.
- `src/engine/indoor.ts`: the single-zone hourly model from PRD 4.2 for 48 hours per room.
- `src/engine/exposure.ts`, `emissions.ts`, `cost.ts`: the three Tula pans from PRD 4.3, plus confidence and assumptions list.
- `src/engine/rank.ts`: applicability filter, budget filter, weighted score, breathe-in weight doubled for child/elder/sensitive, free-first ordering enforced in code (PRD 4.4).
- UI: manual profile form (all fields, accessible, saved to localStorage), action list showing a Tula scale component with three pans (breathe in, emit out, ₹), "estimate" label and "provisional" badge where needed.
- Tests: steady-state convergence, purifier lowers indoor level, airing in a clean hour lowers level, out-of-range inputs rejected, golden hand-calculated Tula cases, property test (1,000 random profiles) that no paid action precedes an applicable free one, ₹ values equal config, engine benchmark under 50 ms for 48 h × 6 rooms. Target ≥ 90% line coverage on `engine/`.
- **HUMAN CHECKPOINT B:** list every config value with `verifiedOn: null` in a table (file, key, current default, suggested primary source to check). I will verify and send you sources and values; update them when I do.

### R3 — AI intake (FR-1)
- `src/ai/client.ts`: Gemini via the official `@google/genai` SDK, server-only, JSON-schema output, temperature ≤ 0.3, max output tokens set, 8 s timeout.
- `src/ai/prompts/intake.ts`: versioned system prompt, JSON schema, two worked examples (English and Hindi). User text wrapped as quoted data; the model is told to ignore any instructions inside it.
- `src/ai/validators.ts` (start): schema validation, profile sanity checks.
- `src/lib/rateLimit.ts`: 20 AI requests per minute per IP (note in README that production needs a shared store).
- `POST /api/intake`: input ≤ 2,000 chars; returns `{ profileDelta, nextQuestion, lang }`; ≤ 6 follow-up questions; falls back to the manual form on failure.
- UI `/setup`: chat-style intake, live profile summary the user can edit, "use form instead" link always visible.
- Tests: mocked model returns for English, Hindi, nonsense and malicious ("ignore previous instructions") input; invalid model output triggers fallback; rate limit works.

### R4 — Plan, why panel, nudge (FR-6, FR-7, FR-16) → completes Must
- `src/ai/prompts/plan.ts` and full validators: every number in AI text must match an engine value as displayed; actionIds must come from the supplied top 8; free-first order must hold; health blocklist; retry once then template fallback (`src/ai/fallback.ts`).
- `POST /api/plan`: input is profile hash + computed top-8 actions with numbers (no names, rounded location only); cached per profile hash + forecast hour.
- Home screen: today's 3–5 actions with time window, Tula scale, one-line reason, AI-written label; `aria-live` updates.
- Why panel: inputs, formula in plain words, assumptions with sources or "provisional", confidence.
- Purifier nudge: banner at planned hours while the app is open, optional browser notification after permission, "done" tap logging hours in localStorage, weekly hours count.
- "Delete my data" button.
- Playwright: setup (manual form path) → plan → open why panel; axe accessibility check on these pages.
- Write the full README (all 7 sections from CLAUDE.md, including the brief-to-feature-to-file-to-test table and assumptions table).
- Create `docs/SUBMISSION_CHECKLIST.md` from PRD Section 2.
- **HUMAN CHECKPOINT C — SUBMISSION #1:** report that all Must requirements pass, give me the checklist, and wait while I submit. Do not start Should work until I confirm.

### R5 — Quick Shoulds (FR-15, FR-18, FR-10)
- FR-15 "Your home's air": estimated nightly bedroom level vs WHO guideline, text only from `health-library.json` + engine values.
- FR-18 "Is my purifier enough?": air changes per hour from room volume and CADR, brand-neutral verdict.
- FR-10 Community share: WhatsApp-ready message (EN/HI) with tomorrow's outlook and 3 collective actions via a `wa.me` link; under 1,000 characters; no personal data.
- Tests for each.

### R6 — Bigger Shoulds (FR-8, FR-9, FR-17)
- FR-8 What-if: AI maps the question to an allowed scenario change → engine computes → AI explains with validated numbers; out-of-scope questions politely declined.
- FR-9 Replan diff: when the forecast changes beyond a threshold, show only changed items and why.
- FR-17 Society pack: export a compact plan code from each flat (no server storage); merge codes from several flats into one society summary, collective actions and a group-order list with per-flat cost; WhatsApp export.
- Tests for each.

If time is short, skip R6 first, then R5. Never break a Must to add a Should.

### R7 — Final polish and deliverables
- Full self-review pass across the codebase against PRD Section 7; fix issues.
- Lighthouse-style checks you can run locally: build size (first-load JS < 200 KB gzipped), no console errors, accessibility checks pass.
- Update README (final screenshots as small PNGs < 200 KB each, final assumptions table, business model and roadmap, CI badge, live URL).
- Create `docs/DEMO_SCRIPT.md` (2–3 minute video script following PRD Section 8) and `docs/LINKEDIN_POST.md` (build-in-public draft, under 250 words, no exaggerated claims).
- Final checks: only `main` exists, repo < 10 MB, no secrets in history (`git log -p | grep -i "api_key"` returns nothing), CI green.
- **HUMAN CHECKPOINT D — FINAL SUBMISSION:** give me the final checklist with every item ticked or flagged, and what I must do myself (record and upload video unlisted, post on LinkedIn, submit the repo link, keep one attempt in reserve).

## 4. Final deliverables (you are done only when all exist)

1. Public repo on `main` only, under 10 MB, CI green.
2. Live deployed URL working on a 360 px phone, English and Hindi.
3. All Must requirements working and tested; Should requirements as time allowed, each tested.
4. README with: chosen vertical, brief-to-feature-to-file-to-test table, approach and logic, how it works, assumptions (every config value, source, status), setup, scripts, testing, deployment, security, accessibility, business model.
5. `PRD.md`, `SRS.md`, `CLAUDE.md`, `docs/SUBMISSION_CHECKLIST.md`, `docs/DEMO_SCRIPT.md`, `docs/LINKEDIN_POST.md`.
6. A final report listing anything still provisional or unverified, so nothing is presented as fact that is not.

Begin with the summary and questions in Section 0, then wait for my "go".
