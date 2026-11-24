import type { AppConfig } from '@/config';
import type { CommuteMode } from '@/domain';
import type { RoomHourly } from './indoor';
import type { Scenario } from './scenario';
import { EXPOSURE_HOURS } from './timeline';

export const DAYS_PER_MONTH = 30;
const WEEKS_PER_MONTH = DAYS_PER_MONTH / 7;

/** Monthly quantities of fuel, power, travel and consumables for one scenario. */
export interface MonthlyUse {
  electricityKwh: number;
  lpgKg: number;
  pngM3: number;
  biomassKg: number;
  commuteKm: number;
  commuteMode: CommuteMode;
  coilNights: number;
  vaporiserNights: number;
  incenseSticks: number;
}

/** Purifier energy per month from the first 24 simulated hours: Σ W × hours on / 1000 × 30. */
export function purifierKwhPerMonth(s: Scenario, inputs: RoomHourly[]): number {
  return s.rooms.reduce((total, room, i) => {
    if (!room.purifier) return total;
    const hoursOn = (inputs[i]?.purifierFraction ?? [])
      .slice(0, EXPOSURE_HOURS)
      .reduce((a, f) => a + f, 0);
    return total + ((room.purifier.watts * hoursOn) / 1000) * DAYS_PER_MONTH;
  }, 0);
}

function cookingUse(s: Scenario, cfg: AppConfig) {
  const meals = s.cooking.mealsPerDay * DAYS_PER_MONTH * s.cooking.scale;
  const use = cfg.factors.fuelUse;
  const fuel = s.cooking.fuel;
  return {
    lpgKg: fuel === 'lpg' ? meals * use.lpgKgPerMeal.value : 0,
    pngM3: fuel === 'png' ? meals * use.pngM3PerMeal.value : 0,
    biomassKg: fuel === 'biomass' ? meals * use.biomassKgPerMeal.value : 0,
    inductionKwh: fuel === 'induction' ? meals * use.inductionKwhPerMeal.value : 0,
  };
}

/** Everything a scenario uses in a month, from habits and the simulated purifier hours. */
export function monthlyUse(s: Scenario, inputs: RoomHourly[], cfg: AppConfig): MonthlyUse {
  const cooking = cookingUse(s, cfg);
  const nights = s.coilNightsPerWeek * WEEKS_PER_MONTH;
  const vaporiserNights = s.vaporiser ? nights : 0;
  const coilHours = cfg.factors.schedules.coilHours.value.length;
  const vaporiserKwh =
    (cfg.factors.devices.vaporiserWatts.value * coilHours * vaporiserNights) / 1000;
  return {
    electricityKwh: purifierKwhPerMonth(s, inputs) + cooking.inductionKwh + vaporiserKwh,
    lpgKg: cooking.lpgKg,
    pngM3: cooking.pngM3,
    biomassKg: cooking.biomassKg,
    commuteKm: s.commute.kmPerDay * s.commute.daysPerWeek * WEEKS_PER_MONTH,
    commuteMode: s.commute.mode,
    coilNights: s.vaporiser ? 0 : nights,
    vaporiserNights,
    incenseSticks: s.incensePerDay * DAYS_PER_MONTH,
  };
}
