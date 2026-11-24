'use client';

import type { IntakeField } from '@/domain';
import { format, t, type Lang } from '@/i18n';
import { formatNumber } from '../format';
import type { Draft } from './draft';
import { FieldGroup, SECONDARY_BUTTON } from './fields';

function peopleLine(lang: Lang, draft: Draft): string {
  const list = draft.members.map((m) =>
    format(lang, 'summary.person', { name: m.label, age: t(lang, `age.${m.ageGroup}`) }),
  );
  return format(lang, 'summary.people', { list: list.join(', ') });
}

function roomsLine(lang: Lang, draft: Draft): string {
  const list = draft.rooms.map((r) =>
    format(lang, 'summary.room', {
      name: r.name,
      kind: t(lang, `kind.${r.kind}`),
      area: formatNumber(r.areaM2, lang),
      purifier: r.purifierId ? t(lang, 'summary.withPurifier') : '',
    }),
  );
  return format(lang, 'summary.rooms', { list: list.join(', ') });
}

function habitLines(lang: Lang, draft: Draft, answered: IntakeField[]): string[] {
  const { cooking, sources, commute } = draft;
  const lines: string[] = [];
  if (answered.includes('cooking')) {
    lines.push(
      format(lang, 'summary.cooking', {
        fuel: t(lang, `fuel.${cooking.fuel}`),
        meals: formatNumber(cooking.mealsPerDay, lang),
      }),
    );
  }
  if (answered.includes('sources')) {
    const smoker = sources.smokerIndoors ? t(lang, 'summary.smoker') : '';
    lines.push(
      format(lang, 'summary.smoke', {
        incense: formatNumber(sources.incensePerDay, lang),
        coil: formatNumber(sources.coilNightsPerWeek, lang),
        smoker,
      }),
    );
  }
  if (answered.includes('commute'))
    lines.push(format(lang, 'summary.travel', { mode: t(lang, `mode.${commute.mode}`) }));
  if (answered.includes('budget'))
    lines.push(format(lang, 'summary.budget', { budget: t(lang, `budget.${draft.budgetTier}`) }));
  return lines;
}

interface Props {
  lang: Lang;
  draft: Draft;
  answered: IntakeField[];
  onEdit: () => void;
}

/** Live summary of what the conversation has filled in so far; every field is editable in the form. */
export function ProfileSummary({ lang, draft, answered, onEdit }: Props) {
  const lines = [
    ...(answered.includes('members') ? [peopleLine(lang, draft)] : []),
    ...(answered.some((f) => ['rooms', 'purifier', 'windows'].includes(f))
      ? [roomsLine(lang, draft)]
      : []),
    ...habitLines(lang, draft, answered),
  ];
  return (
    <FieldGroup legend={t(lang, 'summary.heading')}>
      <ul aria-live="polite" className="flex flex-col gap-1 text-base text-slate-900">
        {lines.length === 0 ? (
          <li>{t(lang, 'summary.empty')}</li>
        ) : (
          lines.map((line) => <li key={line}>{line}</li>)
        )}
      </ul>
      <button type="button" onClick={onEdit} className={`${SECONDARY_BUTTON} self-start`}>
        {t(lang, 'summary.edit')}
      </button>
    </FieldGroup>
  );
}
