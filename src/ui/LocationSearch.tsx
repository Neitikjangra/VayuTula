'use client';

import { useId, useState, type FormEvent } from 'react';
import type { Place } from '@/domain';
import { GEOCODE_MAX_CHARS } from '@/domain/limits';
import { format, t, type Lang } from '@/i18n';
import type { SelectedPlace } from './forecastStorage';
import { useLang } from './useLang';
import { useLocationSearch } from './useLocationSearch';

const BUTTON =
  'min-h-11 rounded-lg px-4 py-2 text-base font-medium disabled:opacity-60 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-800';

function placeDetail(place: Place): string {
  return [place.admin1, place.country].filter(Boolean).join(', ');
}

function toSelected(place: Place): SelectedPlace {
  const detail = placeDetail(place);
  return { kind: 'search', name: place.name, detail, lat: place.lat, lon: place.lon };
}

interface ListProps {
  lang: Lang;
  places: Place[];
  onPick: (place: Place) => void;
}

function PlaceList({ lang, places, onPick }: ListProps) {
  if (places.length === 0) return null;
  return (
    <ul aria-label={t(lang, 'search.results')} className="flex flex-col gap-2">
      {places.map((place) => (
        <li key={place.id}>
          <button
            type="button"
            onClick={() => onPick(place)}
            className={`${BUTTON} w-full border border-slate-300 bg-white text-left text-slate-900 hover:bg-slate-50`}
          >
            {[place.name, placeDetail(place)].filter(Boolean).join(', ')}
          </button>
        </li>
      ))}
    </ul>
  );
}

interface FormProps {
  lang: Lang;
  busy: boolean;
  onSearch: (query: string) => void;
}

function SearchForm({ lang, busy, onSearch }: FormProps) {
  const inputId = useId();
  const [query, setQuery] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(query);
  };
  return (
    <form role="search" onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-base font-medium text-slate-900">
        {t(lang, 'search.label')}
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="search"
          value={query}
          maxLength={GEOCODE_MAX_CHARS}
          autoComplete="off"
          enterKeyHint="search"
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-500 bg-white px-3 text-base text-slate-900"
        />
        <button
          type="submit"
          disabled={busy}
          className={`${BUTTON} bg-sky-900 text-white hover:bg-sky-800`}
        >
          {t(lang, 'search.submit')}
        </button>
      </div>
    </form>
  );
}

/** City search, "use my location" and the result list (FR-2). */
export function LocationSearch({ onSelect }: { onSelect: (place: SelectedPlace) => void }) {
  const lang = useLang();
  const { busy, places, message, search, locate, clear } = useLocationSearch(lang, onSelect);
  const pick = (place: Place) => {
    clear();
    onSelect(toSelected(place));
  };
  return (
    <div className="flex flex-col gap-3">
      <SearchForm lang={lang} busy={busy} onSearch={(q) => void search(q)} />
      <button
        type="button"
        onClick={locate}
        className={`${BUTTON} self-start border border-sky-900 text-sky-900`}
      >
        {t(lang, 'location.useMine')}
      </button>
      <p role="status" className="min-h-6 text-base text-slate-800">
        {message ? format(lang, message.key, message.vars ?? {}) : ''}
      </p>
      <PlaceList lang={lang} places={places} onPick={pick} />
    </div>
  );
}
