'use client';

import { useEffect } from 'react';
import type { Forecast } from '@/domain';
import { t, type Lang } from '@/i18n';
import { ForecastView } from './ForecastView';
import { loadPlace } from './forecastStorage';
import { LocationSearch } from './LocationSearch';
import { useForecast, type ForecastState } from './useForecast';
import { useLang } from './useLang';

function StatusLine({
  lang,
  state,
  onRetry,
}: {
  lang: Lang;
  state: ForecastState;
  onRetry: () => void;
}) {
  if (state.status === 'idle')
    return <p className="text-base text-slate-700">{t(lang, 'forecast.empty')}</p>;
  if (state.status === 'loading')
    return <p className="text-base text-slate-700">{t(lang, 'forecast.loading')}</p>;
  if (state.status !== 'error') return null;
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-red-700 bg-red-50 p-3">
      <p className="text-base text-red-950">{t(lang, 'forecast.failed')}</p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 rounded-lg bg-red-900 px-4 py-2 text-base font-medium text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-800"
      >
        {t(lang, 'forecast.retry')}
      </button>
    </div>
  );
}

/** FR-2 panel: choose a place, then see its 4-day hourly outdoor PM2.5 forecast. */
export function ForecastPanel({
  onForecast,
}: {
  onForecast?: (forecast: Forecast | null) => void;
}) {
  const lang = useLang();
  const { state, load } = useForecast();

  useEffect(() => {
    void loadPlace().then((saved) => {
      if (saved) void load(saved);
    });
  }, [load]);

  useEffect(() => {
    onForecast?.(state.status === 'ready' ? state.forecast : null);
  }, [state, onForecast]);

  const retry = () => {
    if (state.status === 'error') void load(state.place);
  };

  return (
    <section aria-labelledby="forecast-heading" className="flex flex-col gap-4">
      <h2 id="forecast-heading" className="text-2xl font-bold text-slate-900">
        {t(lang, 'forecast.heading')}
      </h2>
      <LocationSearch onSelect={(place) => void load(place)} />
      <div aria-live="polite" className="flex flex-col gap-4">
        <StatusLine lang={lang} state={state} onRetry={retry} />
        {state.status === 'ready' && (
          <ForecastView
            lang={lang}
            place={state.place}
            forecast={state.forecast}
            notice={state.notice}
            ageMinutes={state.ageMinutes}
          />
        )}
      </div>
    </section>
  );
}
