# VayuTula — air balance for your home

> A daily, room-by-room smog plan that weighs what your family **breathes in**, what your home **emits out**, and what each step costs or saves in **₹**.

_Status: Round R0 (foundation). Sections below are filled in as each round lands._

## 1. Chosen vertical

**PromptWars Virtual — Challenge 6: Urban Air Quality Assistant.**

## 2. Brief-to-feature table

| Brief clause | Feature | File | Test |
| --- | --- | --- | --- |
| _To be completed in R4._ | | | |

## 3. Approach and logic

### Tula scale

_R2._

### Engine formulas

_R2._

### Ranking (free-first)

_R2._

### AI guardrails

_R3–R4._

## 4. How it works

_User journey with screenshots — R4 and R7._

## 5. Assumptions

Every config value with its source and status (`verified` or `provisional`). _Table added in R2._

## 6. Setup, scripts, testing, deployment, security, accessibility

### Setup

```bash
npm ci
cp .env.example .env.local   # then add GEMINI_API_KEY locally; never commit it
npm run dev
```

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` | ESLint, including layer-boundary and string-literal rules |
| `npm run typecheck` | Strict type-check with TypeScript 7 (TypeScript 6 stays installed only as the library API that ESLint and Next.js load) |
| `npm test` / `npm run test:coverage` | Vitest unit tests (with coverage) |
| `npm run test:e2e` | Playwright end-to-end test at 360 px width |
| `npm run size:check` | Fails if tracked files exceed 8 MB |

### Testing

_Details in R4._

### Deployment

_Vercel — R0 checkpoint._

### Security

- Security headers on every route: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` (`src/lib/securityHeaders.ts`).
- Secrets only in server environment variables; `.env*` is git-ignored, `.env.example` is committed.

### Accessibility

- English / Hindi toggle sets `<html lang>`; every UI string comes from `src/i18n/`.
- Visible focus outline; 44 px minimum touch targets on controls.

## 7. Business model and roadmap

_R7._
