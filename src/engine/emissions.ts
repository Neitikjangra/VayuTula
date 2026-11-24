import type { AppConfig } from '@/config';
import type { MonthlyUse } from './usage';

/** Emissions that leave the home in a month (PRD 4.3, emit-out pan). */
export interface MonthlyEmissions {
  pmG: number;
  co2Kg: number;
}

/**
 * Transport, cooking fuel and grid electricity only. Indoor sources (incense, coils)
 * count in breathe-in; their outdoor share is ignored in v1.
 */
export function monthlyEmissions(use: MonthlyUse, cfg: AppConfig): MonthlyEmissions {
  const f = cfg.factors;
  const mode = f.transport[use.commuteMode];
  const co2Kg =
    use.lpgKg * f.co2.lpgKgPerKg.value +
    use.pngM3 * f.co2.pngKgPerM3.value +
    use.biomassKg * f.co2.biomassKgPerKg.value +
    use.electricityKwh * f.co2.gridKgPerKwh.value +
    use.commuteKm * mode.co2KgPerKm.value;
  const pmG = use.electricityKwh * f.pm.gridGPerKwh.value + use.commuteKm * mode.pmGPerKm.value;
  return { pmG, co2Kg };
}
