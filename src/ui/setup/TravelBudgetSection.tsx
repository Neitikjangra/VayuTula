'use client';

import { BUDGET_TIERS, COMMUTE_MODES } from '@/domain';
import { t, type Lang } from '@/i18n';
import type { Draft } from './draft';
import { FieldGroup, NumberField, SelectField } from './fields';

interface Props {
  lang: Lang;
  draft: Draft;
  onChange: (draft: Draft) => void;
}

/** Main commute: mode, distance and days. */
export function CommuteSection({ lang, draft, onChange }: Props) {
  const commute = draft.commute;
  const set = (patch: Partial<Draft['commute']>) =>
    onChange({ ...draft, commute: { ...commute, ...patch } });
  const modes = COMMUTE_MODES.map((value) => ({ value, label: t(lang, `mode.${value}`) }));
  return (
    <FieldGroup legend={t(lang, 'commute.heading')}>
      <SelectField
        label={t(lang, 'commute.mode')}
        value={commute.mode}
        options={modes}
        onChange={(mode) => set({ mode })}
      />
      {commute.mode !== 'none' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NumberField
            label={t(lang, 'commute.km')}
            value={commute.kmPerDay}
            min={0}
            max={200}
            step={0.5}
            onChange={(kmPerDay) => set({ kmPerDay })}
          />
          <NumberField
            label={t(lang, 'commute.days')}
            value={commute.daysPerWeek}
            min={0}
            max={7}
            onChange={(daysPerWeek) => set({ daysPerWeek })}
          />
        </div>
      )}
    </FieldGroup>
  );
}

/** Budget tier: free only, up to ₹2,000, or up to ₹15,000. */
export function BudgetSection({ lang, draft, onChange }: Props) {
  const tiers = BUDGET_TIERS.map((value) => ({ value, label: t(lang, `budget.${value}`) }));
  return (
    <FieldGroup legend={t(lang, 'budget.heading')}>
      <SelectField
        label={t(lang, 'budget.heading')}
        hideLabel
        value={draft.budgetTier}
        options={tiers}
        onChange={(budgetTier) => onChange({ ...draft, budgetTier })}
      />
    </FieldGroup>
  );
}
