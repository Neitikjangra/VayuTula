import type { AppConfig } from '@/config';
import { numberValue } from '@/domain';
import type { MonthlyUse } from './usage';

function commuteRupees(use: MonthlyUse, cfg: AppConfig): number {
  const t = cfg.tariffs;
  switch (use.commuteMode) {
    case 'car':
      return (use.commuteKm / t.carKmPerLitre.value) * t.petrolPerLitre.value;
    case 'twoWheeler':
      return (use.commuteKm / t.twoWheelerKmPerLitre.value) * t.petrolPerLitre.value;
    case 'bus':
      return use.commuteKm * t.busFarePerKm.value;
    case 'metro':
      return use.commuteKm * t.metroFarePerKm.value;
    default:
      return 0;
  }
}

/** Running cost of a scenario in ₹ per month, straight from tariffs.json (FR-13). */
export function monthlyCost(use: MonthlyUse, cfg: AppConfig): number {
  const t = cfg.tariffs;
  return (
    use.electricityKwh * t.electricityPerKwh.value +
    use.lpgKg * (t.lpgPerCylinder.value / t.lpgCylinderKg.value) +
    use.pngM3 * t.pngPerM3.value +
    use.biomassKg * t.biomassPerKg.value +
    use.coilNights * t.coilRupees.value +
    use.vaporiserNights * t.vaporiserRefillPerNight.value +
    use.incenseSticks * t.incensePerStick.value +
    commuteRupees(use, cfg)
  );
}

/** Monthly filter cost of a purifier: filter price / filter life in months. */
export function filterRupeesPerMonth(purifierId: string, cfg: AppConfig): number {
  const p = cfg.purifiers.find((x) => x.id === purifierId);
  return p ? numberValue(p.filterRupees) / numberValue(p.filterLifeMonths) : 0;
}
