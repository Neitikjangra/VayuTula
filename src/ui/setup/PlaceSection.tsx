'use client';

import { format, t, type Lang } from '@/i18n';
import type { SelectedPlace } from '../forecastStorage';
import { LocationSearch } from '../LocationSearch';
import type { Draft } from './draft';
import { FieldGroup } from './fields';

interface Props {
  lang: Lang;
  draft: Draft;
  onPlace: (place: SelectedPlace) => void;
}

/** "Where you live". Its search is its own <form>, so it never sits inside the profile form. */
export function PlaceSection({ lang, draft, onPlace }: Props) {
  return (
    <FieldGroup legend={t(lang, 'place.heading')}>
      <p className="text-base text-slate-900">
        {draft.city ? format(lang, 'place.current', { place: draft.city }) : t(lang, 'place.none')}
      </p>
      <LocationSearch onSelect={onPlace} />
    </FieldGroup>
  );
}
