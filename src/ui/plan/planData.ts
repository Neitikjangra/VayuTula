import { appConfig } from '@/config';
import type { Forecast, PlanCandidate, PlanRequest, Profile } from '@/domain';
import { localDate } from '@/engine/forecastDays';
import { householdSummary, outdoorMean, planCandidates } from '@/engine/plan';
import { rankActions, type RankedAction } from '@/engine/rank';
import { buildTimeline } from '@/engine/timeline';
import type { Lang, MessageKey } from '@/i18n';
import { actionTitle } from './ActionCard';

/** Everything the home plan needs, computed once by the engine. */
export interface PlanData {
  ranked: RankedAction[];
  candidates: PlanCandidate[];
  /** The /api/plan body without the profile hash (added asynchronously). */
  request: Omit<PlanRequest, 'profileHash'>;
  forecastSource: string;
}

export type PlanDataResult = { ok: true; data: PlanData } | { ok: false; message: MessageKey };

function build(profile: Profile, forecast: Forecast, nowIso: string, lang: Lang): PlanData | null {
  const ranked = rankActions(profile, forecast, nowIso);
  if (ranked.length === 0) return null;
  const timeline = buildTimeline(forecast, nowIso);
  const candidates = planCandidates(
    profile,
    ranked,
    timeline,
    (id) => actionTitle(lang, id),
    appConfig,
  );
  const first = timeline.times[0] ?? nowIso;
  const hour = String(timeline.localHours[0] ?? 0).padStart(2, '0');
  const request = {
    forecastHour: `${localDate(first, forecast.timezone)}T${hour}`,
    lang,
    household: householdSummary(profile),
    outdoorMean: outdoorMean(timeline),
    candidates,
  };
  return { ranked, candidates, request, forecastSource: forecast.source };
}

/** Ranked actions and the plan request, or the message to show instead. */
export function planData(
  profile: Profile | null,
  forecast: Forecast | null,
  nowIso: string,
  lang: Lang,
): PlanDataResult {
  if (!profile) return { ok: false, message: 'plan.noProfile' };
  if (!forecast) return { ok: false, message: 'plan.needsForecast' };
  try {
    const data = build(profile, forecast, nowIso, lang);
    return data ? { ok: true, data } : { ok: false, message: 'plan.none' };
  } catch (error) {
    if (error instanceof RangeError) return { ok: false, message: 'plan.forecastTooOld' };
    throw error;
  }
}
