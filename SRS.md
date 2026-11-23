# VayuTula — Market Findings & SRS

## Findings

**Verdict:** VayuTula is useful and fills a real gap, but families are unlikely to pay for it directly. Build it free for families and earn later from purifier and filter brands. For the hackathon, what matters is usefulness and the gap, and both are well supported.

### 1. Competitors: nobody weighs "breathe in" against "emit out"

| Category | Examples | What they do | Gap for VayuTula |
| --- | --- | --- | --- |
| Outdoor AQI apps | [IQAir AirVisual](https://play.google.com/store/apps/details/?id=com.airvisual), [AQI.in / Prana Air](https://apps.apple.com/us/app/-/id1439684571), [CPCB Sameer](https://play.google.com/store/apps/details?id=com.cpcb), [Air Matters](https://apps.apple.com/au/app/id477700080?l=en-au) | Station or sensor AQI, maps, alerts, generic health tips; some link to their own monitors | Outdoor-first; readings disagree between apps; no home-specific plan |
| Purifier brand apps | [Philips Air+](https://apps.apple.com/app/id1487415423), [Mi Home](https://www.mi.com/global/air/app/) | Remote control, filter reminders; Mi Home compares indoor with street air and says when to open windows | Locked to one brand's device; no cooking/incense advice, no emissions side; Philips Air+ reviews complain about dropped connections and notification spam ([App Store](https://apps.apple.com/be/app/clean-home/id1487415423?ls=1)) |
| Carbon-footprint apps | [CarbonWatch (Chandigarh govt)](https://www.verdict.co.uk/carbonwatch-launches-mobile-app-to-calculate-individuals-carbon-footprint/) | Self-reported 0–10 footprint score | Ignores what you breathe; criticised as possibly inaccurate ([Business Insider India](https://www.businessinsider.in/tech/apps/news/carbonwatch-indias-first-mobile-app-to-calculate-your-carbon-footprint-falls-short-of-what-it-is-promising/articleshow/81203364.cms)) |
| Hackathon rivals | [Clearday](https://github.com/Auenchanters/Week6), [SmogSense](https://github.com/kartikjoshi7/SmogSense) | Family plans; Clearday shows both PM2.5 avoided and CO₂ per choice | **Clearday already shows both sides.** VayuTula must win on the home model, honesty of numbers and code quality, not on the idea alone |

**Gap:** exposure tools and emissions tools are separate products. The one rival that combines them (Clearday) is a hackathon prototype. No brand-independent app models the household's own rooms, devices and habits. (Based on what we searched; not exhaustive.)

### 2. Will people pay? Not much, directly

- **Demand for protection is very price-sensitive.** In 3,533 low-income Delhi respondents, \~80% took a free mask; at ₹10 only \~30% did, and \~10% at about ₹50 ([Baylis, Greenstone et al., NBER](https://conference.nber.org/conf_papers/f195064/f195064.pdf)).
- **Information raises demand.** A two-minute health video raised willingness to pay for cleaner air more than five-fold in the same study.
- **Even free tools see low uptake.** 56% of Delhi households showed no interest in a free indoor monitor ([Deccan Herald on EPIC](https://www.deccanherald.com/india/study-reveals-hazardous-indoor-pm25-levels-in-both-rich-and-poor-households-in-delhi-1059013.html)).
- **But people do spend on hardware.** Indian purifier market about USD 579 million in 2025, mostly residential ([IMARC](https://www.imarcgroup.com/india-air-purifier-market)); estimates vary a lot by firm ([MarkNtel: USD 63 million](https://www.marknteladvisors.com/research-library/india-air-purifier-market.html)). Croma reported 30% higher purifier sales in 2025, led by Delhi-NCR ([MySmartPrice](https://www.mysmartprice.com/gear/air-purifiers/air-purifiers-features/air-purifier-sales-at-croma-jump-30-in-2025-as-delhi-ncr-drives-bulk-of-demand/)).
- **Brands need engagement.** Price cuts squeeze margins, making filter subscriptions strategically important ([Ken Research](https://www.kenresearch.com/consumer-products-and-retail/home-and-office-furnishings/india-air-purifier-market-outlook/335278-95.html)).
- **Indian app payments are rising but conversion is weak** in a price-sensitive market ([TechRepublic on Sensor Tower](https://www.techrepublic.com/article/news-apac-india-app-boom-revenue-problem/)).

**Implication:** free for families; revenue from brand partnerships ("is my purifier enough?", filter reorders), insurers or employers. Not validated with real buyers yet.

### 3. Is it actually useful? Yes, and the strongest lever is using what people already own

- **The home is the problem.** Delhi indoor PM2.5 was far above WHO limits, and purifier-owning homes were only \~10% cleaner ([EPIC](https://epic.uchicago.edu/news/delhi-homes-record-poor-indoor-air-quality-low-willingness-for-demanding-clean-air/)).
- **People don't use what they have.** In Dhaka, two in three households given a free purifier ran it under 30 minutes a day; adding a monitor raised use by 270% ([IGC brief](https://www.theigc.org/sites/default/files/2025-05/Mattsson-et-al-Policy-Brief-May-2025.pdf)). The same brief found purifiers cut indoor particles by almost three-quarters within 30–45 minutes with doors and windows shut.
- **Information changes behaviour modestly.** Homes given real-time indoor data saw an \~8% fall in indoor PM2.5 ([Deccan Herald on EPIC](https://www.deccanherald.com/india/study-reveals-hazardous-indoor-pm25-levels-in-both-rich-and-poor-households-in-delhi-1059013.html)).
- **Caveat:** WHO treats personal measures as the least-preferred tier; cutting emissions at the source comes first ([WHO](https://www.who.int/publications/i/item/9789240000278)). That is why VayuTula's "emit out" side matters, and why claims must stay modest.

**What this means for the build:** the key feature is the nudge ("run the purifier in the kids' room now, here's why"), not more data. Show both sides of the balance for every action. Never claim health outcomes.

## SRS — VayuTula v1.0 (hackathon build)

### 1. Purpose and scope

VayuTula is a GenAI web app that gives a household a daily, room-level plan for winter smog. For every action it shows the balance: **how much less the family breathes in, how much less it emits, and what it saves or costs in rupees**. It covers the full Challenge 6 brief: low-emission routines, indoor tips, sustainable alternatives, tailoring to location and lifestyle, and the impact of choices. Deadline: 29 Nov 2026, 11:59 PM IST.

### 2. Users

| User | Need |
| --- | --- |
| Household air manager (parent, 25–45, smartphone, English or Hindi) | A short, trustworthy plan for today; know which actions are worth it |
| Vulnerable members (child, elder, asthmatic), as profile entries | Their rooms and hours get priority |
| Community (society or neighbour WhatsApp group) | Receives a shareable summary and a collective action list |

### 3. Constraints and assumptions

- Public GitHub repo, one branch, under 10 MB; README covers vertical, approach, logic, assumptions; demo video (unlisted).
- Max 3 submissions. No paid credits provided: free data sources first.
- Assumption: users have no indoor monitor; indoor values are **estimates** with stated assumptions.
- Assumption: emission factors and infiltration rates come from published sources, listed in the README.

### 4. Functional requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | **Home setup by conversation:** user describes home in free text (EN/HI); AI extracts a validated profile (city, rooms with size, windows, purifier model/CADR, cooking fuel and times, incense/coil use, commute mode, members and vulnerabilities, budget). Missing fields are asked for, one at a time | Must |
| FR-2 | **Location data:** fetch hourly PM2.5 forecast (≥4 days) for the user's coordinates; show the data source and time | Must |
| FR-3 | **Indoor estimator:** deterministic per-room model estimates hourly indoor PM2.5 from outdoor forecast, infiltration, purifier CADR and source events | Must |
| FR-4 | **Action library:** curated, cited actions in three groups: indoor tips (purifier placement, ventilation timing, chimney), low-emission routines (commute switch, trip timing), sustainable alternatives (induction vs gas, vaporiser vs coil, no-burn) | Must |
| FR-5 | **Tula score per action:** estimated exposure avoided (µg·h, per member) and emissions avoided (g PM2.5 and kg CO₂), cost (₹) and effort; all computed in code | Must |
| FR-6 | **Daily plan:** AI ranks 3–5 actions for today under budget and constraints and writes the plan with reasons | Must |
| FR-7 | **Explain:** each action has a "why" panel showing inputs, assumptions and confidence | Must |
| FR-8 | **What-if:** user asks a question (e.g. "buy a second purifier?"); system simulates and AI answers using computed numbers only | Should |
| FR-9 | **Replan on change:** when the forecast changes, show a plan diff ("what changed and why") | Should |
| FR-10 | **Community share:** generate a WhatsApp-ready message with tomorrow's outlook and 3 collective actions (EN/HI) | Should |
| FR-11 | **Weekly balance:** chart of estimated breathed-in vs emitted, against a "do nothing" baseline | Could |
| FR-12 | **Calibration:** user enters or photographs an indoor monitor reading; estimator adjusts infiltration | Could |

### 4a. Adoption and business requirements (new)

These answer the "families won't pay" finding: the app stays free for families, pays for itself in rupees, and is funded by those who gain when families follow the plan.

| ID | Requirement | Priority | Why (evidence) |
| --- | --- | --- | --- |
| FR-13 | **Rupee pan on the Tula scale:** every action shows estimated ₹ saved or spent per month (electricity at local tariff, LPG vs induction cost per meal, purchase cost spread over 12 months). Tariffs and prices stored as cited, dated config | Must | Demand is very price-sensitive ([NBER](https://conference.nber.org/conf_papers/f195064/f195064.pdf)) |
| FR-14 | **Free-first ranking:** the plan always lists ₹0 actions first; paid actions appear only if free ones are exhausted or the user asks; a ₹2,000 DIY filter option is shown before any purchase | Must | Low uptake even of free tools ([EPIC](https://epic.uchicago.edu/news/delhi-homes-record-poor-indoor-air-quality-low-willingness-for-demanding-clean-air/)) |
| FR-15 | **"Your home's air" explainer:** after setup, a short, cited explanation of this home's estimated indoor levels against the WHO guideline, using fixed library text plus the user's own estimates; no personal health predictions | Should | Health information raised willingness to pay more than five-fold ([NBER](https://conference.nber.org/conf_papers/f195064/f195064.pdf)) |
| FR-16 | **Purifier use nudge:** timed reminders ("switch on in the kids' room now"), a "done" tap, and a weekly purifier-hours count | Must | Free purifiers ran under 30 min/day in most homes; a monitor raised use by 270% ([IGC](https://www.theigc.org/sites/default/files/2025-05/Mattsson-et-al-Policy-Brief-May-2025.pdf)) |
| FR-17 | **Society pack:** combine shared plans from several flats into one society summary, a collective action list, and a group-order list (filters, DIY kits) with an estimated per-flat cost; exportable as a WhatsApp message | Should | RWAs already invest in air measures ([Outlook](https://www.outlookindia.com/national/gurugram-air-pollution-aqi-320-luxury-societies-anti-smog-guns-sprinklers)); possible neighbour effects ([IGC](https://www.theigc.org/sites/default/files/2025-05/Mattsson-et-al-Policy-Brief-May-2025.pdf)) |
| FR-18 | **Brand-neutral "Is my purifier enough?":** verdict from room volume and CADR only; no sponsored ranking; any future partner link is labelled | Should | Trust gap in AQI data ([Tribune](https://www.tribuneindia.com/news/explainers/concerns-raised-over-micro-management-of-air-quality-data/amp)) |

**Extra acceptance checks:** the free-first rule holds in every generated plan (tested); ₹ figures match config values exactly; a society pack from 3 sample flats produces one message under 1,000 characters.

### 5. AI requirements and guardrails

- AI used for: profile extraction (FR-1), ranking and plan wording (FR-6), what-if answers (FR-8), plan diffs (FR-9), community message (FR-10).
- **AI never produces numbers.** Every number in AI output must match a computed value; output is checked against a schema and rejected or retried otherwise. If both attempts fail, use a template.
- Health text comes only from a fixed, cited library. No diagnosis, no dosage, no health-outcome claims. Symptom keywords show a "consult a doctor" message.
- User text is passed as data, never as instructions; system prompt is fixed server-side.

### 6. Non-functional requirements (mapped to judging)

| ID | Area (weight) | Requirement |
| --- | --- | --- |
| NFR-1 | Code quality (High) | Layered modules: `data/`, `engine/`, `ai/`, `ui/`; typed code; linter and formatter clean; functions small; no dead code |
| NFR-2 | Alignment (High) | README table maps every brief clause → feature → file → test |
| NFR-3 | Security (Medium) | API keys server-side only, `.env.example` committed, `.env` ignored; input validation; rate limit on AI routes; no secrets or personal data in logs |
| NFR-4 | Efficiency (Medium) | Forecast cached per location for 1 hour; one AI call per plan; plan render < 3 s after data is cached; minimal dependencies; repo < 10 MB |
| NFR-5 | Testing (Low) | Unit tests for estimator and Tula scores (≥ 90% coverage of `engine/`); schema tests for AI outputs with mocked model; one end-to-end happy path |
| NFR-6 | Accessibility (Low) | WCAG 2.1 AA contrast; keyboard navigation; labels on all inputs; AQI levels shown by text as well as colour; Hindi/English toggle; works on a 360 px phone |
| NFR-7 | Privacy | Profile stored locally in the browser by default; no account needed |

### 7. Data and interfaces

- **Air quality:** Open-Meteo Air Quality API (free, no key) as primary; optional Google Air Quality API.
- **AI:** one LLM API (e.g. Gemini) behind a server route.
- **Static data (JSON, cited):** purifier CADR list, infiltration ranges, source emission estimates (cooking, incense, coil), transport and cooking emission factors.

### 7a. Business model (README section, not built in v1)

| Payer | What they get | Status |
| --- | --- | --- |
| Families | Everything, free | Decided |
| Housing societies / RWAs | Society pack, group orders; small annual fee from maintenance fund | To validate with 2–3 RWAs |
| Purifier and filter brands | Paid per actively used household (usage nudges, filter-change timing); never paid ranking | Hypothesis; brands face margin pressure and value filter subscriptions ([Ken Research](https://www.kenresearch.com/consumer-products-and-retail/home-and-office-furnishings/india-air-purifier-market-outlook/335278-95.html)) |
| Insurers / employers | Wellness programme | Untested; no evidence yet |

### 8. Out of scope (v1)

Accounts, hardware integration, native apps, medical advice, payments, multiple homes.

### 9. Acceptance criteria (demo)

1. Two sample households (budget vs well-off, same city, same day) get different, sensible plans with Tula scores.
2. Changing the forecast updates the plan and shows a diff.
3. A what-if question returns numbers identical to the engine's.
4. Hindi plan and WhatsApp message render correctly.
5. All tests pass in CI; lint clean; repo < 10 MB; README complete.

### 10. Brief traceability

| Brief clause | Covered by |
| --- | --- |
| GenAI-powered assistant | FR-1, FR-6, FR-8, FR-9, FR-10 |
| Families and communities | Section 2, FR-10, FR-17 |
| Low-emission daily routines | FR-4, FR-5, FR-6 |
| Indoor air quality hacks | FR-3, FR-4, FR-14, FR-16 |
| Sustainable alternatives | FR-4, FR-5 |
| Tailored to location and lifestyle | FR-1, FR-2 |
| Clearly explain direct impact of choices | FR-5, FR-7, FR-11, FR-13, FR-15 |

## Sources

All sources are linked inline above. Earlier research (exposure studies, Challenge 6 rules, rival repos) is in [Challenge 06 — 3 Product Opportunities](https://claude.ai/artifact/2aovmwFpwwNEoY5zST3FPw).

**Gaps:** no direct survey of willingness to pay for an advice app; Reddit unreachable from our tools; market-size estimates disagree by about 10× between firms. A 20-person survey of target families would close the first gap.
