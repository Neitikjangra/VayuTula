# VayuTula — air balance for your home

> A daily, room-by-room smog plan that weighs what your family **breathes in**, what your home **emits out**, and what each step costs or saves in **₹**.

**Live:** <https://vayutula.vercel.app> · English and हिन्दी · works on a 360 px phone.

Families in smog-hit Indian cities describe their home once (in their own words or a form). Every day VayuTula gives a short, room-by-room plan. Each step is weighed on three pans: how much less the family **breathes in**, how much less the home **emits**, and what it **saves or costs in ₹**. Free steps always come first, and every number is computed by tested code, never by the AI.

## 1. Chosen vertical

**PromptWars Virtual — Challenge 6: Urban Air Quality Assistant.**

## 2. Brief-to-feature table

Every clause of the Challenge 6 brief maps to a feature, the code that implements it and the test that proves it.

| Brief clause | Feature (requirement) | File | Test |
| --- | --- | --- | --- |
| GenAI-powered assistant | Conversational setup (FR-1): Gemini extracts a home profile from English or Hindi text and asks one question at a time | `src/ai/intake.ts`, `src/ai/prompts/intake.ts`, `src/app/api/intake/route.ts` | `tests/ai/intake.test.ts`, `tests/api/intake.test.ts`, `tests/e2e/intake.spec.ts` |
| GenAI-powered assistant | Daily plan (FR-6): Gemini picks 3–5 of the engine's top 8 and writes one reason each, every number checked | `src/ai/plan.ts`, `src/ai/validators.ts`, `src/app/api/plan/route.ts` | `tests/ai/plan.test.ts`, `tests/api/plan.test.ts` |
| Families and communities | Household with members, ages and sensitivity; breathe-in per person; double weight for children, elders and sensitive members | `src/domain/profile.ts`, `src/engine/rank.ts` | `tests/engine/rank.test.ts` |
| Low-emission daily routines | Commute and cooking actions with emit-out and ₹ pans (FR-4, FR-5, FR-13) | `src/config/actions.json`, `src/engine/emissions.ts`, `src/engine/cost.ts` | `tests/engine/tula.test.ts` |
| Indoor air quality hacks | Hourly indoor model per room (FR-3); purifier, airing, kitchen door, incense and coil actions; purifier nudge (FR-16) | `src/engine/indoor.ts`, `src/engine/sources.ts`, `src/engine/nudge.ts`, `src/ui/plan/NudgeBanner.tsx` | `tests/engine/indoor.test.ts`, `tests/engine/nudge.test.ts`, `tests/ui/PlanSection.test.tsx` |
| Sustainable alternatives | Induction, LPG instead of biomass, vaporiser instead of coils, metro or bus instead of the car | `src/config/actions.json`, `src/engine/scenario.ts` | `tests/engine/tula.test.ts` (LPG → induction golden case) |
| Tailored to location | City search or browser location; 4-day hourly PM2.5 forecast with source and time (FR-2) | `src/data/openMeteo.ts`, `src/app/api/forecast/route.ts`, `src/ui/ForecastPanel.tsx` | `tests/data/openMeteo.test.ts`, `tests/api/routes.test.ts`, `tests/e2e/forecast.spec.ts` |
| Tailored to lifestyle | Rooms, windows, purifier, cooking, smoke sources, commute and budget drive applicability, budget filter and time windows | `src/engine/applicability.ts`, `src/engine/plan.ts` | `tests/engine/rank.test.ts`, `tests/engine/plan.test.ts` |
| Clearly explain the direct impact of choices | Tula scale on every action (FR-5, FR-13), free-first ranking (FR-14), why panel with inputs, formula, assumptions and confidence (FR-7) | `src/ui/plan/TulaScale.tsx`, `src/ui/plan/WhyPanel.tsx`, `src/engine/display.ts` | `tests/engine/tula.test.ts`, property test in `tests/engine/rank.test.ts`, `tests/ui/PlanSection.test.tsx`, `tests/e2e/setup.spec.ts` |

## 3. Approach and logic

Numbers come from code; words come from the model. Every number on screen is computed by pure, tested functions in `src/engine/` from the household profile, the hourly forecast and the cited config in `src/config/`.

### Tula scale

Each action is weighed on three pans against **today's habits** (the baseline):

| Pan | What it measures | Period | Code |
| --- | --- | --- | --- |
| Breathe in | Exposure avoided per member: Σ indoor PM2.5 over the hours each person spends in each room (µg·h/m³) | next 24 h (forecast-driven) | `engine/exposure.ts` |
| Emit out | PM2.5 (g) and CO₂ (kg) that leave the home: transport, cooking fuel, grid electricity | per month | `engine/emissions.ts` |
| ₹ | Running cost from tariffs, plus one-off purchases spread over 12 months and filter replacements; positive = saves | per month | `engine/cost.ts` |

Confidence is **high** when every room's window type and purifier CADR are known, **medium** when one is defaulted and **low** when both are. Every number shows an "Estimate" label, and a "Provisional" badge while any value it uses is unverified.

### Engine formulas

Per room, hourly, single well-mixed zone (`engine/indoor.ts`):

- λ = a + k + f·q / V
- C_ss = (P·a·C_out + S/V) / λ
- C(t+1) = C_ss + (C(t) − C_ss)·e^(−λ·1 h)

C indoor PM2.5 (µg/m³), C_out forecast, a air exchange (1/h, by window type; an airing hour uses a high value with P = 1), k deposition (1/h), P penetration, q purifier CADR (m³/h), f share of the hour it runs, V room volume (m³), S indoor emissions (µg/h). The simulation runs 48 h from the current hour and starts from the first hour's steady state. Inputs out of range throw `RangeError`.

Indoor sources (`engine/sources.ts`): cooking goes to the kitchen (a share leaks to the living room when the kitchen door is open; a chimney removes a share), incense and indoor smoking go to the living room at fixed hours, and mosquito coils go to bedrooms at night.

### Ranking (free-first)

`engine/rank.ts`:

1. Keep actions whose `appliesWhen` holds for this home and whose one-off price fits the budget (₹0 → free only; ₹2,000; ₹15,000).
2. Drop actions with no visible benefit on any pan.
3. Score = Σ weight × (pan ÷ its reference amount) − 0.1 × effort. References: 250 µg·h/m³ breathed in over 24 h, 50 g PM2.5 and 50 kg CO₂ a month, ₹500 a month each count as one point. Breathe-in weight doubles if anyone is a child, an elder or sensitive. All in `config/ranking.json`, provisional. Fixed references replaced "divide by the largest candidate" in R2, which let a ₹88/month running cost cancel a 500 µg·h/m³ health gain.
4. **Free-first, enforced in code:** sort by cost tier, then score. A property test checks 1,000 random homes: no paid action ever comes before an applicable free one.
5. Actions with identical effects in this home are shown once.

### AI guardrails

Principle: **numbers from code, words from the model.** Gemini (Flash-class, via the official `@google/genai` SDK, server-only) is used to understand people and write for them; it never calculates.

| Guardrail | How | Code | Test |
| --- | --- | --- | --- |
| Structured output | JSON-schema response, then a Zod schema and checks in `ai/validators.ts`; one retry with the errors, then the fallback (setup: the manual form; plan: the template plan) | `ai/intake.ts`, `ai/plan.ts`, `ai/validators.ts` | `tests/ai/intake.test.ts`, `tests/ai/plan.test.ts`, `tests/ai/validators.test.ts` |
| Number check | Every number in a plan reason must equal one of that action's displayed engine values (or its time window, or 24 h); "about ₹2,000" for ₹2,065 is rejected | `ai/numbers.ts`, `ai/validators.ts` | `tests/ai/numbers.test.ts`, `tests/ai/plan.test.ts` |
| Action and free-first check | Plan items must come from the engine's top 8, appear once, and never put a paid action before a free one | `ai/validators.ts` | `tests/ai/plan.test.ts` |
| Minimum data to the AI | The plan request carries a profile hash, counts and engine numbers only: no names, no location | `engine/plan.ts`, `ui/plan/planData.ts` | `tests/engine/plan.test.ts`, `tests/ui/PlanSection.test.tsx` |
| AI never computes | The model copies stated numbers (e.g. "110 sq ft" → `areaValue: 110, areaUnit: "sqft"`); unit conversion, default sizes, purifier matching and occupancy hours are code with config values | `engine/intakeMerge.ts` | `tests/engine/intakeMerge.test.ts` |
| Injection safety | Fixed server-side system prompt; user text wrapped in `<user_text>` with `<` and `>` neutralised so it cannot close the wrapper; the model is told text inside is data | `ai/prompts/intake.ts` | "ignore previous instructions" cases |
| Health | No diagnosis, medicine or dosage in AI text (blocklist, English and Hindi); a symptom mention shows the fixed consult-a-doctor sentence from `health-library.json` | `ai/health.ts` | `tests/ai/health.test.ts` |
| Topic control | The next question must be about a topic still missing; code picks the topic and stops after 6 questions | `ai/intake.ts` | cap and topic tests |
| Cost and abuse | Temperature 0.2, output-token cap, low thinking, 8 s timeout per model call, 20 AI requests per minute per IP, one model call per plan (cached per profile hash and forecast hour on the server and the device) | `ai/client.ts`, `lib/rateLimit.ts`, `app/api/plan/route.ts` | `tests/ai/client.test.ts`, `tests/api/intake.test.ts`, `tests/api/plan.test.ts` |
| Resilience | If the main model is over quota or overloaded (HTTP 429/503/404), the client tries `GEMINI_FALLBACK_MODEL` (default `gemini-3.5-flash-lite`); if that fails too, the app keeps working with the manual form | `ai/client.ts` | fallback-model tests |
| Transparency | AI-written questions and reasons carry an "AI-written" label; built-in ones do not; every number shows "Estimate" and, while unverified, "Provisional" | `ui/setup/ChatLog.tsx`, `ui/plan/PlanItemCard.tsx` | `tests/ui/intake.test.tsx`, `tests/ui/PlanSection.test.tsx` |

Prompts are versioned constants (`intake-v1`, `plan-v2`) with worked examples. Live checks during the build found and fixed three issues, each now covered by a test: text with no words made the model invent a family (now answered without the model), `gemini-3.8-flash` rejects the `MINIMAL` thinking level (now `LOW`, with a retry without thinking), and Hindi reasons wrote times as "19: से 20:" (now rejected).

## 4. How it works

1. **Choose your city** (search or browser location). The forecast panel shows 4 days of hourly outdoor PM2.5 from Open-Meteo, with its source and fetch time. Only the location rounded to 2 decimals leaves the phone.
2. **Describe your home** at `/setup`, in English or Hindi: "We are four in a 2BHK, my mother coughs at night, Philips purifier in our room…". Gemini extracts facts; code converts units, matches the purifier model and works out who is in which room when. A live summary fills in; "Use the form instead" is always one tap away, and the form opens automatically if the AI is unavailable.
3. **Today's plan** on the home page: 3–5 steps, free first, each with a time window ("When: 22:00–07:00"), a one-line reason (labelled when AI-written) and the Tula scale: breathe in, emit out, ₹.
4. **Why this step?** opens the inputs used (outdoor average, home, budget), the formula in plain words, every config value with its source or "Provisional", and the confidence level.
5. **Purifier nudge:** during the planned hours a banner says "Switch on the purifier now in Master bedroom"; "Done, it's on" logs the hours and the banner counts this week's purifier hours. Browser notifications are optional.
6. **Delete my data** clears everything VayuTula stored on the device. There are no accounts and no database.

Screenshots of each step are added with the final polish (R7).

## 5. Assumptions

### Modelling assumptions

- Indoor levels are **estimates** from a single well-mixed zone per room; no indoor monitor is assumed.
- Rooms have a type (bedroom, living, kitchen, other) so sources land in the right room (agreed in R2; not in PRD 4.1).
- An existing purifier is assumed **off** unless the profile gives the hours it usually runs (agreed in R2).
- Hours outside the home count zero exposure; commuting exposure is not modelled.
- Indoor sources (incense, coils, smoking) count in breathe-in only; their outdoor share is ignored in v1.
- Cooking PM2.5 that leaves the home is not counted; cooking fuel counts as CO₂, induction as grid power.
- Filter wear from running an existing purifier longer is not counted; added purifiers include filter cost.
- The forecast keeps every hour from local midnight today (at least 96 h, agreed in R1); the engine uses the 48 h from now.

### Config values

Every config value with its unit, source and status. All are **provisional** until a person checks them against a primary source (see `docs/CHECKPOINT_B.md`). The UI shows a "Provisional" badge on any number that depends on one. Regenerate with `node scripts/assumptions.mjs`.

<!-- assumptions:start -->
| Key | Value | Unit | Source | Status |
| --- | --- | --- | --- | --- |
| `factors.airExchange.leaky` | 1.5 | 1/h | TODO | provisional |
| `factors.airExchange.average` | 0.8 | 1/h | TODO | provisional |
| `factors.airExchange.sealed` | 0.3 | 1/h | TODO | provisional |
| `factors.airExchange.airing` | 6 | 1/h | TODO | provisional |
| `factors.penetration.leaky` | 0.9 | fraction | TODO | provisional |
| `factors.penetration.average` | 0.8 | fraction | TODO | provisional |
| `factors.penetration.sealed` | 0.6 | fraction | TODO | provisional |
| `factors.penetration.airing` | 1 | fraction | TODO | provisional |
| `factors.deposition` | 0.2 | 1/h | TODO | provisional |
| `factors.emission.cookingLpgPerMeal` | 20000 | µg PM2.5 per meal-hour | TODO | provisional |
| `factors.emission.cookingPngPerMeal` | 20000 | µg PM2.5 per meal-hour | TODO | provisional |
| `factors.emission.cookingInductionPerMeal` | 12000 | µg PM2.5 per meal-hour | TODO | provisional |
| `factors.emission.cookingBiomassPerMeal` | 300000 | µg PM2.5 per meal-hour | TODO | provisional |
| `factors.emission.incensePerStick` | 20000 | µg PM2.5 per stick (burns 1 h) | TODO | provisional |
| `factors.emission.coilPerNight` | 50000 | µg PM2.5 per coil-night | TODO | provisional |
| `factors.emission.cigarette` | 12000 | µg PM2.5 per cigarette | TODO | provisional |
| `factors.behaviour.chimneyCapture` | 0.5 | fraction of cooking PM2.5 removed | TODO | provisional |
| `factors.behaviour.kitchenLeakShare` | 0.3 | fraction of kitchen PM2.5 reaching living room with door open | TODO | provisional |
| `factors.behaviour.lidFactor` | 0.8 | multiplier on cooking PM2.5 and fuel | TODO | provisional |
| `factors.behaviour.cigarettesPerDayIndoors` | 5 | cigarettes/day | TODO | provisional |
| `factors.schedules.incenseHours` | 7, 19 | local hours | TODO | provisional |
| `factors.schedules.coilHours` | 21, 22, 23, 0, 1, 2, 3, 4 | local hours | TODO | provisional |
| `factors.schedules.smokingHours` | 8, 13, 18, 20, 22 | local hours | TODO | provisional |
| `factors.schedules.airingWindow` | 7, 18 | first and last local hour for airing | TODO | provisional |
| `factors.fuelUse.lpgKgPerMeal` | 0.12 | kg LPG/meal | TODO | provisional |
| `factors.fuelUse.pngM3PerMeal` | 0.14 | m³ PNG/meal | TODO | provisional |
| `factors.fuelUse.inductionKwhPerMeal` | 0.9 | kWh/meal | TODO | provisional |
| `factors.fuelUse.biomassKgPerMeal` | 2 | kg/meal | TODO | provisional |
| `factors.co2.lpgKgPerKg` | 2.98 | kg CO₂/kg LPG | TODO | provisional |
| `factors.co2.pngKgPerM3` | 1.9 | kg CO₂/m³ PNG | TODO | provisional |
| `factors.co2.biomassKgPerKg` | 1.5 | kg CO₂/kg biomass | TODO | provisional |
| `factors.co2.gridKgPerKwh` | 0.71 | kg CO₂/kWh | TODO | provisional |
| `factors.pm.gridGPerKwh` | 0.3 | g PM2.5/kWh | TODO | provisional |
| `factors.transport.none.co2KgPerKm` | 0 | kg CO₂/km | TODO | provisional |
| `factors.transport.none.pmGPerKm` | 0 | g PM2.5/km | TODO | provisional |
| `factors.transport.car.co2KgPerKm` | 0.17 | kg CO₂/passenger-km | TODO | provisional |
| `factors.transport.car.pmGPerKm` | 0.03 | g PM2.5/passenger-km | TODO | provisional |
| `factors.transport.twoWheeler.co2KgPerKm` | 0.05 | kg CO₂/passenger-km | TODO | provisional |
| `factors.transport.twoWheeler.pmGPerKm` | 0.02 | g PM2.5/passenger-km | TODO | provisional |
| `factors.transport.bus.co2KgPerKm` | 0.03 | kg CO₂/passenger-km | TODO | provisional |
| `factors.transport.bus.pmGPerKm` | 0.005 | g PM2.5/passenger-km | TODO | provisional |
| `factors.transport.metro.co2KgPerKm` | 0.02 | kg CO₂/passenger-km | TODO | provisional |
| `factors.transport.metro.pmGPerKm` | 0.002 | g PM2.5/passenger-km | TODO | provisional |
| `factors.transport.walkCycle.co2KgPerKm` | 0 | kg CO₂/km | TODO | provisional |
| `factors.transport.walkCycle.pmGPerKm` | 0 | g PM2.5/km | TODO | provisional |
| `factors.devices.vaporiserWatts` | 5 | W | TODO | provisional |
| `factors.intakeDefaults.roomAreaSmall` | 9 | m² for a room described as small | TODO | provisional |
| `factors.intakeDefaults.roomAreaMedium` | 12 | m² for a room of unstated size | TODO | provisional |
| `factors.intakeDefaults.roomAreaLarge` | 16 | m² for a room described as large | TODO | provisional |
| `factors.intakeDefaults.sleepAdult` | 22, 7 | local hours asleep (from, until) for adults and elders | TODO | provisional |
| `factors.intakeDefaults.sleepChild` | 21, 7 | local hours asleep (from, until) for children | TODO | provisional |
| `factors.intakeDefaults.dayAtHomeFrom` | 7 | local hour people at home all day move to the living room | TODO | provisional |
| `factors.intakeDefaults.eveningFrom` | 18 | local hour people away in the day are back home | TODO | provisional |
| `factors.intakeDefaults.mealHours` | 8, 20, 13, 17, 11, 15 | default cooking hours, in order of meals | TODO | provisional |
| `tariffs.electricityPerKwh` | 6.5 | ₹/kWh (Delhi domestic, marginal slab) | TODO | provisional |
| `tariffs.lpgPerCylinder` | 853 | ₹ per 14.2 kg cylinder (Delhi) | TODO | provisional |
| `tariffs.lpgCylinderKg` | 14.2 | kg/cylinder | TODO | provisional |
| `tariffs.pngPerM3` | 48.6 | ₹/SCM (Delhi) | TODO | provisional |
| `tariffs.biomassPerKg` | 0 | ₹/kg (assumed collected) | TODO | provisional |
| `tariffs.petrolPerLitre` | 94.77 | ₹/L (Delhi) | TODO | provisional |
| `tariffs.carKmPerLitre` | 15 | km/L | TODO | provisional |
| `tariffs.twoWheelerKmPerLitre` | 45 | km/L | TODO | provisional |
| `tariffs.busFarePerKm` | 1.5 | ₹/km | TODO | provisional |
| `tariffs.metroFarePerKm` | 2.5 | ₹/km | TODO | provisional |
| `tariffs.coilRupees` | 4 | ₹/coil | TODO | provisional |
| `tariffs.vaporiserRefillPerNight` | 3 | ₹/night | TODO | provisional |
| `tariffs.incensePerStick` | 1 | ₹/stick | TODO | provisional |
| `ranking.weights.breatheIn` | 1 | weight | TODO | provisional |
| `ranking.weights.breatheInVulnerable` | 2 | weight | TODO | provisional |
| `ranking.weights.emitOut` | 1 | weight | TODO | provisional |
| `ranking.weights.rupees` | 1 | weight | TODO | provisional |
| `ranking.weights.effortPenalty` | 0.1 | score per effort level | TODO | provisional |
| `ranking.references.breatheIn` | 250 | µg·h/m³ over 24 h counted as 1 score point | TODO | provisional |
| `ranking.references.pmG` | 50 | g PM2.5 a month counted as 1 score point | TODO | provisional |
| `ranking.references.co2Kg` | 50 | kg CO₂ a month counted as 1 score point | TODO | provisional |
| `ranking.references.rupees` | 500 | ₹ a month counted as 1 score point | TODO | provisional |
| `health.whoAnnualPm25` | 5 | µg/m³ annual mean | TODO | provisional |
| `health.who24hPm25` | 15 | µg/m³ 24-hour mean | TODO | provisional |
| `purifiers.philips-ac1215.cadr` | 270 | m³/h | TODO | provisional |
| `purifiers.philips-ac1215.watts` | 50 | W | TODO | provisional |
| `purifiers.philips-ac1215.filterRupees` | 2500 | ₹ | TODO | provisional |
| `purifiers.philips-ac1215.filterLifeMonths` | 12 | months | TODO | provisional |
| `purifiers.philips-ac1215.priceRupees` | 9000 | ₹ | TODO | provisional |
| `purifiers.philips-ac0920.cadr` | 250 | m³/h | TODO | provisional |
| `purifiers.philips-ac0920.watts` | 25 | W | TODO | provisional |
| `purifiers.philips-ac0920.filterRupees` | 2300 | ₹ | TODO | provisional |
| `purifiers.philips-ac0920.filterLifeMonths` | 12 | months | TODO | provisional |
| `purifiers.philips-ac0920.priceRupees` | 9000 | ₹ | TODO | provisional |
| `purifiers.philips-ac1711.cadr` | 300 | m³/h | TODO | provisional |
| `purifiers.philips-ac1711.watts` | 25 | W | TODO | provisional |
| `purifiers.philips-ac1711.filterRupees` | 2500 | ₹ | TODO | provisional |
| `purifiers.philips-ac1711.filterLifeMonths` | 12 | months | TODO | provisional |
| `purifiers.philips-ac1711.priceRupees` | 11000 | ₹ | TODO | provisional |
| `purifiers.philips-ac2887.cadr` | 333 | m³/h | TODO | provisional |
| `purifiers.philips-ac2887.watts` | 56 | W | TODO | provisional |
| `purifiers.philips-ac2887.filterRupees` | 3500 | ₹ | TODO | provisional |
| `purifiers.philips-ac2887.filterLifeMonths` | 12 | months | TODO | provisional |
| `purifiers.philips-ac2887.priceRupees` | 15000 | ₹ | TODO | provisional |
| `purifiers.xiaomi-4.cadr` | 400 | m³/h | TODO | provisional |
| `purifiers.xiaomi-4.watts` | 30 | W | TODO | provisional |
| `purifiers.xiaomi-4.filterRupees` | 1500 | ₹ | TODO | provisional |
| `purifiers.xiaomi-4.filterLifeMonths` | 6 | months | TODO | provisional |
| `purifiers.xiaomi-4.priceRupees` | 13000 | ₹ | TODO | provisional |
| `purifiers.xiaomi-4-lite.cadr` | 360 | m³/h | TODO | provisional |
| `purifiers.xiaomi-4-lite.watts` | 33 | W | TODO | provisional |
| `purifiers.xiaomi-4-lite.filterRupees` | 1300 | ₹ | TODO | provisional |
| `purifiers.xiaomi-4-lite.filterLifeMonths` | 6 | months | TODO | provisional |
| `purifiers.xiaomi-4-lite.priceRupees` | 9000 | ₹ | TODO | provisional |
| `purifiers.xiaomi-4-pro.cadr` | 500 | m³/h | TODO | provisional |
| `purifiers.xiaomi-4-pro.watts` | 50 | W | TODO | provisional |
| `purifiers.xiaomi-4-pro.filterRupees` | 2000 | ₹ | TODO | provisional |
| `purifiers.xiaomi-4-pro.filterLifeMonths` | 6 | months | TODO | provisional |
| `purifiers.xiaomi-4-pro.priceRupees` | 16000 | ₹ | TODO | provisional |
| `purifiers.honeywell-air-touch-v2.cadr` | 250 | m³/h | TODO | provisional |
| `purifiers.honeywell-air-touch-v2.watts` | 45 | W | TODO | provisional |
| `purifiers.honeywell-air-touch-v2.filterRupees` | 2000 | ₹ | TODO | provisional |
| `purifiers.honeywell-air-touch-v2.filterLifeMonths` | 12 | months | TODO | provisional |
| `purifiers.honeywell-air-touch-v2.priceRupees` | 8000 | ₹ | TODO | provisional |
| `purifiers.honeywell-air-touch-i8.cadr` | 300 | m³/h | TODO | provisional |
| `purifiers.honeywell-air-touch-i8.watts` | 55 | W | TODO | provisional |
| `purifiers.honeywell-air-touch-i8.filterRupees` | 2500 | ₹ | TODO | provisional |
| `purifiers.honeywell-air-touch-i8.filterLifeMonths` | 12 | months | TODO | provisional |
| `purifiers.honeywell-air-touch-i8.priceRupees` | 12000 | ₹ | TODO | provisional |
| `purifiers.coway-ap-1019c.cadr` | 238 | m³/h | TODO | provisional |
| `purifiers.coway-ap-1019c.watts` | 32 | W | TODO | provisional |
| `purifiers.coway-ap-1019c.filterRupees` | 2500 | ₹ | TODO | provisional |
| `purifiers.coway-ap-1019c.filterLifeMonths` | 12 | months | TODO | provisional |
| `purifiers.coway-ap-1019c.priceRupees` | 11000 | ₹ | TODO | provisional |
| `purifiers.coway-airmega-150.cadr` | 214 | m³/h | TODO | provisional |
| `purifiers.coway-airmega-150.watts` | 30 | W | TODO | provisional |
| `purifiers.coway-airmega-150.filterRupees` | 2200 | ₹ | TODO | provisional |
| `purifiers.coway-airmega-150.filterLifeMonths` | 12 | months | TODO | provisional |
| `purifiers.coway-airmega-150.priceRupees` | 9000 | ₹ | TODO | provisional |
| `purifiers.sharp-fp-j30m.cadr` | 180 | m³/h | TODO | provisional |
| `purifiers.sharp-fp-j30m.watts` | 45 | W | TODO | provisional |
| `purifiers.sharp-fp-j30m.filterRupees` | 3000 | ₹ | TODO | provisional |
| `purifiers.sharp-fp-j30m.filterLifeMonths` | 24 | months | TODO | provisional |
| `purifiers.sharp-fp-j30m.priceRupees` | 9000 | ₹ | TODO | provisional |
| `purifiers.blueair-411.cadr` | 161 | m³/h | TODO | provisional |
| `purifiers.blueair-411.watts` | 10 | W | TODO | provisional |
| `purifiers.blueair-411.filterRupees` | 2500 | ₹ | TODO | provisional |
| `purifiers.blueair-411.filterLifeMonths` | 6 | months | TODO | provisional |
| `purifiers.blueair-411.priceRupees` | 13000 | ₹ | TODO | provisional |
| `purifiers.levoit-core-300.cadr` | 240 | m³/h | TODO | provisional |
| `purifiers.levoit-core-300.watts` | 45 | W | TODO | provisional |
| `purifiers.levoit-core-300.filterRupees` | 2500 | ₹ | TODO | provisional |
| `purifiers.levoit-core-300.filterLifeMonths` | 6 | months | TODO | provisional |
| `purifiers.levoit-core-300.priceRupees` | 9000 | ₹ | TODO | provisional |
| `purifiers.levoit-core-400s.cadr` | 400 | m³/h | TODO | provisional |
| `purifiers.levoit-core-400s.watts` | 38 | W | TODO | provisional |
| `purifiers.levoit-core-400s.filterRupees` | 3500 | ₹ | TODO | provisional |
| `purifiers.levoit-core-400s.filterLifeMonths` | 6 | months | TODO | provisional |
| `purifiers.levoit-core-400s.priceRupees` | 18000 | ₹ | TODO | provisional |
| `purifiers.qubo-q200.cadr` | 200 | m³/h | TODO | provisional |
| `purifiers.qubo-q200.watts` | 40 | W | TODO | provisional |
| `purifiers.qubo-q200.filterRupees` | 1500 | ₹ | TODO | provisional |
| `purifiers.qubo-q200.filterLifeMonths` | 6 | months | TODO | provisional |
| `purifiers.qubo-q200.priceRupees` | 7000 | ₹ | TODO | provisional |
| `purifiers.samsung-ax40r3030.cadr` | 400 | m³/h | TODO | provisional |
| `purifiers.samsung-ax40r3030.watts` | 40 | W | TODO | provisional |
| `purifiers.samsung-ax40r3030.filterRupees` | 3000 | ₹ | TODO | provisional |
| `purifiers.samsung-ax40r3030.filterLifeMonths` | 12 | months | TODO | provisional |
| `purifiers.samsung-ax40r3030.priceRupees` | 15000 | ₹ | TODO | provisional |
| `purifiers.dyson-tp07.cadr` | 290 | m³/h | TODO | provisional |
| `purifiers.dyson-tp07.watts` | 40 | W | TODO | provisional |
| `purifiers.dyson-tp07.filterRupees` | 6000 | ₹ | TODO | provisional |
| `purifiers.dyson-tp07.filterLifeMonths` | 12 | months | TODO | provisional |
| `purifiers.dyson-tp07.priceRupees` | 45000 | ₹ | TODO | provisional |
| `purifiers.generic-small.cadr` | 150 | m³/h | TODO | provisional |
| `purifiers.generic-small.watts` | 30 | W | TODO | provisional |
| `purifiers.generic-small.filterRupees` | 1500 | ₹ | TODO | provisional |
| `purifiers.generic-small.filterLifeMonths` | 6 | months | TODO | provisional |
| `purifiers.generic-small.priceRupees` | 6000 | ₹ | TODO | provisional |
| `purifiers.generic-medium.cadr` | 300 | m³/h | TODO | provisional |
| `purifiers.generic-medium.watts` | 45 | W | TODO | provisional |
| `purifiers.generic-medium.filterRupees` | 2500 | ₹ | TODO | provisional |
| `purifiers.generic-medium.filterLifeMonths` | 12 | months | TODO | provisional |
| `purifiers.generic-medium.priceRupees` | 9000 | ₹ | TODO | provisional |
| `purifiers.diy-box-fan.cadr` | 150 | m³/h | TODO | provisional |
| `purifiers.diy-box-fan.watts` | 55 | W | TODO | provisional |
| `purifiers.diy-box-fan.filterRupees` | 800 | ₹ | TODO | provisional |
| `purifiers.diy-box-fan.filterLifeMonths` | 4 | months | TODO | provisional |
| `purifiers.diy-box-fan.priceRupees` | 2000 | ₹ | TODO | provisional |
| `purifiers.unknown.cadr` | 200 | m³/h | TODO | provisional |
| `purifiers.unknown.watts` | 45 | W | TODO | provisional |
| `purifiers.unknown.filterRupees` | 2500 | ₹ | TODO | provisional |
| `purifiers.unknown.filterLifeMonths` | 12 | months | TODO | provisional |
| `purifiers.unknown.priceRupees` | 9000 | ₹ | TODO | provisional |
| `actions.run-purifier-when-occupied.oneOffRupees` | 0 | ₹ | TODO | provisional |
| `actions.run-purifier-bedroom-sleep.oneOffRupees` | 0 | ₹ | TODO | provisional |
| `actions.air-at-cleanest-hour.oneOffRupees` | 0 | ₹ | TODO | provisional |
| `actions.air-kitchen-after-meals.oneOffRupees` | 0 | ₹ | TODO | provisional |
| `actions.close-kitchen-door.oneOffRupees` | 0 | ₹ | TODO | provisional |
| `actions.cook-with-lid.oneOffRupees` | 0 | ₹ | TODO | provisional |
| `actions.skip-incense.oneOffRupees` | 0 | ₹ | TODO | provisional |
| `actions.one-incense-stick.oneOffRupees` | 0 | ₹ | TODO | provisional |
| `actions.smoke-outside.oneOffRupees` | 0 | ₹ | TODO | provisional |
| `actions.seal-window-gaps.oneOffRupees` | 500 | ₹ | TODO | provisional |
| `actions.fit-exhaust-fan.oneOffRupees` | 1800 | ₹ | TODO | provisional |
| `actions.diy-box-fan-filter.oneOffRupees` | 2000 | ₹ | TODO | provisional |
| `actions.buy-purifier-bedroom.oneOffRupees` | 9000 | ₹ | TODO | provisional |
| `actions.buy-purifier-living.oneOffRupees` | 9000 | ₹ | TODO | provisional |
| `actions.metro-instead-of-car.oneOffRupees` | 0 | ₹ | TODO | provisional |
| `actions.bus-instead-of-car.oneOffRupees` | 0 | ₹ | TODO | provisional |
| `actions.carpool.oneOffRupees` | 0 | ₹ | TODO | provisional |
| `actions.combine-trips.oneOffRupees` | 0 | ₹ | TODO | provisional |
| `actions.walk-cycle-short-trips.oneOffRupees` | 0 | ₹ | TODO | provisional |
| `actions.work-from-home-one-day.oneOffRupees` | 0 | ₹ | TODO | provisional |
| `actions.switch-to-induction.oneOffRupees` | 3000 | ₹ | TODO | provisional |
| `actions.lpg-instead-of-biomass.oneOffRupees` | 3500 | ₹ | TODO | provisional |
| `actions.vaporiser-instead-of-coil.oneOffRupees` | 250 | ₹ | TODO | provisional |
<!-- assumptions:end -->

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
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm test` / `npm run test:coverage` | Vitest unit tests (with coverage) |
| `npm run test:e2e` | Playwright end-to-end test at 360 px width |
| `npm run size:check` | Fails if tracked files exceed 8 MB |
| `npm run bundle:check` | After a build, fails if first-load JS exceeds 200 KB gzipped |

### Tooling

- Node 26 (`.nvmrc`, `engines`, CI).
- TypeScript stays on 6.0.x until typescript-eslint supports TypeScript 7.
- ESLint stays on 9.x until all of Next's ESLint plugins (import, jsx-a11y, react) support ESLint 10.

### Testing

| Layer | What is tested | Where |
| --- | --- | --- |
| Engine | Steady state, purifier and airing effects, out-of-range inputs, hand-calculated Tula values, ₹ equal to config, 1,000-home free-first property test, 48 h × 6 rooms under 50 ms, time windows, nudge slots and weekly hours | `tests/engine/` (line coverage above 99%) |
| AI | Validators, number extraction, health and symptom checks, English, Hindi, nonsense and "ignore previous instructions" inputs, retry then fallback, model fallback, thinking-level retry | `tests/ai/` (100% line coverage on `ai/`) |
| API routes | Input validation, body limits, rate limits, provider failures, plan cache, no user data in logs | `tests/api/` |
| UI | Forecast, chat setup, form, today's plan, why panel, nudge, delete my data, English and Hindi | `tests/ui/` (jsdom) |
| End to end | 360 px phone: forecast search, chat setup in Hindi, form setup → plan → why panel, axe WCAG 2.1 AA checks on home (with an open why panel), setup (chat and form) and the Hindi home | `tests/e2e/` (Playwright + `@axe-core/playwright`) |

External services are always mocked in tests: no test calls Open-Meteo or Gemini. CI runs lint, format check, typecheck, unit tests with coverage thresholds, build, first-load JS budget, dependency audit, Playwright and the repo-size check on every push.

### Deployment

Vercel, from `main`. Set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`) as environment variables; Node 26 comes from `engines` in `package.json`. Without a key the app still works: setup uses the form and plans use built-in reasons.

### Security

- Security headers on every route: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` (`src/lib/securityHeaders.ts`).
- Secrets only in server environment variables; `.env*` is git-ignored, `.env.example` is committed. The Gemini client imports `server-only`, so it can never ship to the browser.
- Every API input is validated with Zod; the intake body is capped at 32 KB and the message at 2,000 characters.
- Rate limits: 20 AI requests per minute per IP on `/api/intake`; 60 per minute on `/api/forecast` and `/api/geocode` so they cannot be used as free relays. The limiter is in memory per server instance; production with several instances needs a shared store (e.g. Redis).
- Logs record only a failure category, never user text, locations or keys (tested).
- Only the rounded location (2 decimals) leaves the browser for the forecast; the profile stays in the browser.

### Accessibility

- English / Hindi toggle sets `<html lang>`; every UI string comes from `src/i18n/` (a lint rule blocks hard-coded text in components).
- Visible focus outline; 44 px minimum touch targets; every input has a label; the why panel is a button with `aria-expanded`.
- Every value is shown as text, never by colour alone; plan, forecast and chat updates are announced with `aria-live`.
- Works at 360 px with no sideways scrolling (tested); axe finds no WCAG 2.1 A or AA violations on the tested pages.

## 7. Business model and roadmap

**Free for families.** Demand for protection is very price-sensitive, so families pay nothing. Revenue would come from those who gain when families follow the plan; none of this is validated yet.

| Payer | What they get | Status |
| --- | --- | --- |
| Families | Everything, free | Decided |
| Housing societies / RWAs | Society pack (combined plans, collective actions, group orders) | To validate with 2–3 RWAs |
| Purifier and filter brands | Paid per actively used household (usage nudges, filter-change timing); never paid ranking, and any partner link labelled | Hypothesis |
| Insurers / employers | Wellness programme | Untested |

**Before charging anyone:** a commercial air-data licence (Open-Meteo's free API is non-commercial), a lawyer-reviewed privacy policy and "not medical advice" notice, every config value verified against a primary source, and a week-long trial with 5 families.

**Roadmap:** what-if questions, a plan diff when the forecast changes, a WhatsApp share and society pack, a home-air explainer and an "is my purifier enough?" check (the PRD's Should list), then indoor-monitor calibration and a weekly chart.
