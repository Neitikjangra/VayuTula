'use client';

import { useCallback, useState } from 'react';
import { GEOCODE_MAX_CHARS, GEOCODE_MIN_CHARS, roundCoord, type Place } from '@/domain';
import type { Lang, MessageKey } from '@/i18n';
import { fetchPlaces } from './forecastClient';
import type { SelectedPlace } from './forecastStorage';

/** A message kept as a key so it re-renders in the current language. */
export interface UiMessage {
  key: MessageKey;
  vars?: Record<string, string>;
}

type SetMessage = (message: UiMessage | null) => void;

function usePlaceSearch(lang: Lang, setMessage: SetMessage) {
  const [busy, setBusy] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const search = useCallback(
    async (raw: string) => {
      const query = raw.trim().slice(0, GEOCODE_MAX_CHARS);
      setPlaces([]);
      if (query.length < GEOCODE_MIN_CHARS) return setMessage({ key: 'search.tooShort' });
      setBusy(true);
      setMessage({ key: 'search.searching' });
      try {
        const found = await fetchPlaces(query, lang);
        setPlaces(found);
        setMessage(found.length === 0 ? { key: 'search.noResults', vars: { query } } : null);
      } catch {
        setMessage({ key: 'search.failed' });
      } finally {
        setBusy(false);
      }
    },
    [lang, setMessage],
  );
  return { busy, places, setPlaces, search };
}

function useDeviceLocation(onSelect: (place: SelectedPlace) => void, setMessage: SetMessage) {
  return useCallback(() => {
    if (!('geolocation' in navigator)) return setMessage({ key: 'location.unavailable' });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setMessage(null);
        const lat = roundCoord(coords.latitude);
        onSelect({ kind: 'device', name: '', lat, lon: roundCoord(coords.longitude) });
      },
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED;
        setMessage({ key: denied ? 'location.denied' : 'location.unavailable' });
      },
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }, [onSelect, setMessage]);
}

/** City search plus optional browser location. Only rounded coordinates leave the device. */
export function useLocationSearch(lang: Lang, onSelect: (place: SelectedPlace) => void) {
  const [message, setMessage] = useState<UiMessage | null>(null);
  const { busy, places, setPlaces, search } = usePlaceSearch(lang, setMessage);
  const locate = useDeviceLocation(onSelect, setMessage);
  const clear = useCallback(() => {
    setPlaces([]);
    setMessage(null);
  }, [setPlaces]);
  return { busy, places, message, search, locate, clear };
}
