'use client';

import type { FormEvent } from 'react';
import { appConfig } from '@/config';
import type { Lang } from '@/i18n';
import type { Draft } from './draft';
import { CookingSection, SourcesSection } from './HabitsSection';
import { MembersSection } from './MembersSection';
import type { PurifierChoice } from './RoomCard';
import { RoomsSection } from './RoomsSection';
import { SaveArea } from './SaveArea';
import { BudgetSection, CommuteSection } from './TravelBudgetSection';

const NAMED_PURIFIERS: PurifierChoice[] = appConfig.purifiers
  .filter((p) => !['unknown', 'diy-box-fan'].includes(p.id) && !p.id.startsWith('generic-'))
  .map((p) => ({ id: p.id, label: `${p.brand} ${p.model}` }));

interface Props {
  lang: Lang;
  draft: Draft;
  onChange: (draft: Draft) => void;
  onSave: () => void;
  invalid: boolean;
}

/** FR-1 fallback: the full profile as an accessible form, saved on this device. */
export function ProfileForm({ lang, draft, onChange, onSave, invalid }: Props) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave();
  };
  const section = { lang, draft, onChange };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <MembersSection {...section} />
      <RoomsSection {...section} purifiers={NAMED_PURIFIERS} />
      <CookingSection {...section} />
      <SourcesSection {...section} />
      <CommuteSection {...section} />
      <BudgetSection {...section} />
      <SaveArea lang={lang} invalid={invalid} />
    </form>
  );
}
