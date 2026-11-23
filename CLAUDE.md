# VayuTula — rules for Claude Code

Read PRD.md before any work. It is the source of truth. SRS.md holds the research and requirement IDs.

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
- Secrets only in server env (.env.local locally, host env vars in production). Never print, log or commit keys. .env* is git-ignored; keep .env.example current.
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
