'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import type { Lang } from '@/i18n';
import { readPlaceRaw, savePlace, type SelectedPlace } from '../forecastStorage';
import { placeLabel } from '../format';
import { loadProfile, saveProfile } from '../profileStorage';
import { parsePlace } from '../selectedPlace';
import { defaultDraft, toProfile, withPlace, type Draft } from './draft';

/** The saved profile for editing, else a default home at the last chosen place. */
export function initialDraft(lang: Lang): Draft {
  const saved = loadProfile();
  return saved ? { ...saved, lang } : defaultDraft(lang, parsePlace(readPlaceRaw()));
}

/** The draft shared by the chat and the form, plus place selection and saving. */
export function useSetupDraft(lang: Lang) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => initialDraft(lang));
  const [invalid, setInvalid] = useState(false);
  const onPlace = useCallback(
    (place: SelectedPlace) => {
      savePlace(place);
      setDraft((d) => withPlace(d, { ...place, name: place.name || placeLabel(place, lang) }));
    },
    [lang],
  );
  const save = useCallback(() => {
    const profile = toProfile({ ...draft, lang });
    setInvalid(profile === null);
    if (profile && saveProfile(profile)) router.push('/');
  }, [draft, lang, router]);
  return { draft, setDraft, onPlace, save, invalid };
}
