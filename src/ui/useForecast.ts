'use client';

import { useCallback, useRef, useState } from 'react';
import type { Forecast } from '@/domain';
import { minutesSince } from '@/engine';
import { fetchForecast } from './forecastClient';
import { loadSavedForecast, saveForecast, savePlace, type SelectedPlace } from './forecastStorage';

/** Why older data is shown: the server's cache or this device's saved copy. */
export type ForecastNotice = 'none' | 'staleServer' | 'staleLocal';

export type ForecastState =
  | { status: 'idle' }
  | { status: 'loading'; place: SelectedPlace }
  | { status: 'error'; place: SelectedPlace }
  | {
      status: 'ready';
      place: SelectedPlace;
      forecast: Forecast;
      notice: ForecastNotice;
      ageMinutes: number;
    };

async function resolveForecast(place: SelectedPlace): Promise<ForecastState> {
  try {
    const result = await fetchForecast(place.lat, place.lon);
    saveForecast(result.forecast);
    const notice: ForecastNotice = result.stale ? 'staleServer' : 'none';
    return {
      status: 'ready',
      place,
      forecast: result.forecast,
      notice,
      ageMinutes: result.ageMinutes,
    };
  } catch {
    const saved = loadSavedForecast(place.lat, place.lon);
    if (!saved) return { status: 'error', place };
    const ageMinutes = minutesSince(saved.fetchedAt, Date.now());
    return { status: 'ready', place, forecast: saved, notice: 'staleLocal', ageMinutes };
  }
}

/** Loads forecasts; only the latest request may update the state. */
export function useForecast(): {
  state: ForecastState;
  load: (place: SelectedPlace) => Promise<void>;
} {
  const [state, setState] = useState<ForecastState>({ status: 'idle' });
  const latest = useRef(0);
  const load = useCallback(async (place: SelectedPlace) => {
    const id = ++latest.current;
    savePlace(place);
    setState({ status: 'loading', place });
    const next = await resolveForecast(place);
    if (id === latest.current) setState(next);
  }, []);
  return { state, load };
}
