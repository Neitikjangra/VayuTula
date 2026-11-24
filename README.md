# VayuTula — air balance for your home

> A daily, room-by-room smog plan that weighs what your family **breathes in**, what your home **emits out**, and what each step costs or saves in **₹**.

_Status: Round R2 (engine). Live at <https://vayutula.vercel.app>. Sections below are filled in as each round lands._

## 1. Chosen vertical

**PromptWars Virtual — Challenge 6: Urban Air Quality Assistant.**

## 2. Brief-to-feature table

| Brief clause | Feature | File | Test |
| --- | --- | --- | --- |
| _To be completed in R4._ | | | |

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
3. Score = weights × each pan normalised by the largest candidate − 0.1 × effort. Breathe-in weight doubles if anyone is a child, an elder or sensitive (`config/ranking.json`, provisional).
4. **Free-first, enforced in code:** sort by cost tier, then score. A property test checks 1,000 random homes: no paid action ever comes before an applicable free one.
5. Actions with identical effects in this home are shown once.

### AI guardrails

_R3–R4._

## 4. How it works

_User journey with screenshots — R4 and R7._

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
