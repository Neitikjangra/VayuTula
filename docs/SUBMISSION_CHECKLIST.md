# Submission checklist

From PRD Section 2 (rule-book compliance) and Section 9 (human tasks). Tick each item before every submission. ✅ = checked by Claude Code in R4; ☐ = for you.

## Rule book

| Rule | How the build meets it | Status | Who checks |
| --- | --- | --- | --- |
| Public GitHub repo | `github.com/Neitikjangra/VayuTula` is public (readable without login) | ✅ | Human, confirm before submitting |
| Only one branch | All work on `main`; no other branches created | ✅ | Human: delete any extra branch on GitHub |
| Repo under 10 MB | `npm run size:check` in CI fails above 8 MB; tracked size is under 1 MB | ✅ | CI |
| Max 3 submissions | #1 on 26 Nov, #2 on 28 Nov, #3 kept for a final fix by 29 Nov 9 PM | ☐ | Human |
| Video link (unlisted YouTube or shared Drive) | 2–3 min demo recorded on 28 Nov (script in R7: `docs/DEMO_SCRIPT.md`) | ☐ | Human |
| README: vertical, approach and logic, how it works, assumptions | Sections 1–7 in `README.md`, including the brief-to-feature table and every config value; a test checks the sections, the cited files and the values | ✅ | Claude Code + test |
| "Smart, dynamic assistant"; "logical decision making based on user context" | Plan changes with forecast, home and budget; reasons and a why panel per action | ✅ | Claude Code |
| "Practical and real-world usability" | Live URL; 360 px tested; English and Hindi | ✅ | Claude Code + human phone test |
| Code quality (High) | Layered modules with lint-enforced boundaries, strict TypeScript, no `any`, functions ≤ 40 lines, files ≤ 250 lines, Prettier | ✅ | CI |
| Problem alignment (High) | Every brief clause → feature → file → test (README Section 2) | ✅ | Claude Code |
| Security (Medium) | Security headers, Zod on every input, rate limits, server-only key, no user data in logs, `npm audit` clean | ✅ | CI + review |
| Efficiency (Medium) | Forecast cached 1 h, plan cached per profile hash and hour, engine under 50 ms, first-load JS under 200 KB (CI budget) | ✅ | CI |
| Testing (Low) | Unit, API, UI and Playwright tests; coverage thresholds on `engine/` and `ai/validators` | ✅ | CI |
| Accessibility (Low) | axe WCAG 2.1 AA checks in Playwright; labels, focus, `aria-live`, text not colour alone, `lang` switches | ✅ | CI |
| No plagiarism | All code written for this repo; libraries only via npm | ✅ | Human |

## Before submission #1 (you)

- ☐ Verify config values against primary sources (`docs/CHECKPOINT_B.md`) and send them for the config files, so fewer numbers show "Provisional".
- ☐ Review `actions.json` wording and citations; approve the health sentences in `health-library.json`.
- ☐ Ask a native Hindi speaker to review `src/i18n/hi.json` and one Hindi plan.
- ☐ On your phone: open the live URL, set up your home in Hindi, read today's plan, tap "Why this step?", check the purifier banner in its hours.
- ☐ Confirm CI is green on the commit you submit.
- ☐ Submit the repo link; note the attempt number (1/2/3) and time.

## Before the final submission (you)

- ☐ Record the 2–3 min demo; upload unlisted.
- ☐ Post the LinkedIn build-in-public update (draft in R7: `docs/LINKEDIN_POST.md`).
- ☐ Keep one submission attempt in reserve until 29 Nov, 9 PM.
