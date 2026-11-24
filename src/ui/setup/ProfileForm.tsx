'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { appConfig } from '@/config';
import { format, t, type Lang } from '@/i18n';
import { readPlaceRaw, savePlace, type SelectedPlace } from '../forecastStorage';
import { parsePlace } from '../selectedPlace';
import { placeLabel } from '../format';
import { LocationSearch } from '../LocationSearch';
import { loadProfile, saveProfile } from '../profileStorage';
import { defaultDraft, toProfile, withPlace, type Draft } from './draft';
import { FieldGroup } from './fields';
import { MembersSection } from './MembersSection';
import { CookingSection, SourcesSection } from './HabitsSection';
import type { PurifierChoice } from './RoomCard';
import { RoomsSection } from './RoomsSection';
import { BudgetSection, CommuteSection } from './TravelBudgetSection';

const NAMED_PURIFIERS: PurifierChoice[] = appConfig.purifiers
  .filter((p) => !['unknown', 'diy-box-fan'].includes(p.id) && !p.id.startsWith('generic-'))
  .map((p) => ({ id: p.id, label: `${p.brand} ${p.model}` }));

function initialDraft(lang: Lang): Draft {
  const saved = loadProfile();
  return saved ? { ...saved, lang } : defaultDraft(lang, parsePlace(readPlaceRaw()));
}

function PlaceSection({
  lang,
  draft,
  onPlace,
}: {
  lang: Lang;
  draft: Draft;
  onPlace: (p: SelectedPlace) => void;
}) {
  return (
    <FieldGroup legend={t(lang, 'place.heading')}>
      <p className="text-base text-slate-900">
        {draft.city ? format(lang, 'place.current', { place: draft.city }) : t(lang, 'place.none')}
      </p>
      <LocationSearch onSelect={onPlace} />
    </FieldGroup>
  );
}

/** FR-1 fallback / R2 manual setup: the full profile as an accessible form, saved on this device. */
export function ProfileForm({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => initialDraft(lang));
  const [invalid, setInvalid] = useState(false);
  const onPlace = (place: SelectedPlace) => {
    savePlace(place);
    setDraft((d) => withPlace(d, { ...place, name: place.name || placeLabel(place, lang) }));
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const profile = toProfile({ ...draft, lang });
    setInvalid(profile === null);
    if (profile && saveProfile(profile)) router.push('/');
  };
  const section = { lang, draft, onChange: setDraft };
  // The city search is its own <form>, so it sits outside the profile form (no nested forms).
  return (
    <div className="flex flex-col gap-4">
      <PlaceSection lang={lang} draft={draft} onPlace={onPlace} />
      <form onSubmit={submit} className="flex flex-col gap-4">
        <MembersSection {...section} />
        <RoomsSection {...section} purifiers={NAMED_PURIFIERS} />
        <CookingSection {...section} />
        <SourcesSection {...section} />
        <CommuteSection {...section} />
        <BudgetSection {...section} />
        <p role="alert" className="min-h-6 text-base font-medium text-red-900">
          {invalid ? t(lang, 'setup.invalid') : ''}
        </p>
        <button
          type="submit"
          className="min-h-12 rounded-lg bg-sky-900 px-5 py-3 text-lg font-semibold text-white hover:bg-sky-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-800"
        >
          {t(lang, 'setup.save')}
        </button>
      </form>
    </div>
  );
}
