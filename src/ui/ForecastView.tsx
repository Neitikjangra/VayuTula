'use client';

import type { Forecast } from '@/domain';
import { format, t, type Lang } from '@/i18n';
import { ForecastDays } from './ForecastDays';
import type { SelectedPlace } from './forecastStorage';
import { formatDateTime, formatNumber, placeLabel } from './format';
import type { ForecastNotice } from './useForecast';

const ATTRIBUTION_URL = 'https://open-meteo.com/';

interface Props {
  lang: Lang;
  place: SelectedPlace;
  forecast: Forecast;
  notice: ForecastNotice;
  ageMinutes: number;
}

function StaleNotice({ lang, notice, ageMinutes }: Pick<Props, 'lang' | 'notice' | 'ageMinutes'>) {
  if (notice === 'none') return null;
  const key = notice === 'staleServer' ? 'forecast.staleServer' : 'forecast.staleLocal';
  return (
    <p className="rounded-lg border border-amber-700 bg-amber-50 p-3 text-base text-amber-950">
      {format(lang, key, { minutes: formatNumber(ageMinutes, lang) })}
    </p>
  );
}

/** Forecast for one place: stale notice, 4-day strip, source and fetch time (FR-2). */
export function ForecastView({ lang, place, forecast, notice, ageMinutes }: Props) {
  return (
    <article className="flex flex-col gap-4">
      <h3 className="text-xl font-semibold text-slate-900">
        {format(lang, 'forecast.for', { place: placeLabel(place, lang) })}
      </h3>
      <StaleNotice lang={lang} notice={notice} ageMinutes={ageMinutes} />
      <ForecastDays forecast={forecast} lang={lang} />
      <footer className="flex flex-col gap-1 text-sm text-slate-700">
        <p>{format(lang, 'forecast.source', { source: forecast.source })}</p>
        <p>
          {format(lang, 'forecast.fetchedAt', {
            time: formatDateTime(forecast.fetchedAt, forecast.timezone, lang),
          })}
        </p>
        <p>
          <a
            href={ATTRIBUTION_URL}
            className="text-sky-900 underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            {t(lang, 'forecast.attribution')}
          </a>
        </p>
      </footer>
    </article>
  );
}
