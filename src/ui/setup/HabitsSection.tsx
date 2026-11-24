'use client';

import { FUELS } from '@/domain';
import { format, t, type Lang } from '@/i18n';
import { setMeals, type Draft } from './draft';
import { CheckboxField, FieldGroup, NumberField, SelectField, hourOptions } from './fields';

interface Props {
  lang: Lang;
  draft: Draft;
  onChange: (draft: Draft) => void;
}

type Cooking = Draft['cooking'];

const MEAL_COUNTS = [0, 1, 2, 3, 4];

function MealHours({
  lang,
  cooking,
  set,
}: {
  lang: Lang;
  cooking: Cooking;
  set: (p: Partial<Cooking>) => void;
}) {
  const setHour = (i: number, hour: number) =>
    set({ mealHours: cooking.mealHours.map((h, j) => (i === j ? hour : h)) });
  return (
    <div className="grid grid-cols-2 gap-2">
      {cooking.mealHours.map((hour, i) => (
        <SelectField
          key={i}
          label={format(lang, 'cooking.mealHour', { n: i + 1 })}
          value={hour}
          options={hourOptions()}
          onChange={(h) => setHour(i, h)}
        />
      ))}
    </div>
  );
}

/** Cooking fuel, meals, chimney and kitchen door. */
export function CookingSection({ lang, draft, onChange }: Props) {
  const cooking = draft.cooking;
  const set = (patch: Partial<Cooking>) =>
    onChange({ ...draft, cooking: { ...cooking, ...patch } });
  const fuels = FUELS.map((value) => ({ value, label: t(lang, `fuel.${value}`) }));
  const meals = MEAL_COUNTS.map((n) => ({ value: n, label: String(n) }));
  return (
    <FieldGroup legend={t(lang, 'cooking.heading')}>
      <SelectField
        label={t(lang, 'cooking.fuel')}
        value={cooking.fuel}
        options={fuels}
        onChange={(fuel) => set({ fuel })}
      />
      <SelectField
        label={t(lang, 'cooking.meals')}
        value={cooking.mealsPerDay}
        options={meals}
        onChange={(n) => onChange(setMeals(draft, n))}
      />
      <MealHours lang={lang} cooking={cooking} set={set} />
      <CheckboxField
        label={t(lang, 'cooking.chimney')}
        checked={cooking.chimney}
        onChange={(chimney) => set({ chimney })}
      />
      <CheckboxField
        label={t(lang, 'cooking.kitchenDoor')}
        checked={cooking.kitchenDoor}
        onChange={(kitchenDoor) => set({ kitchenDoor })}
      />
    </FieldGroup>
  );
}

/** Incense, mosquito coils and indoor smoking. */
export function SourcesSection({ lang, draft, onChange }: Props) {
  const sources = draft.sources;
  const set = (patch: Partial<Draft['sources']>) =>
    onChange({ ...draft, sources: { ...sources, ...patch } });
  return (
    <FieldGroup legend={t(lang, 'sources.heading')}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NumberField
          label={t(lang, 'sources.incense')}
          value={sources.incensePerDay}
          min={0}
          max={10}
          onChange={(incensePerDay) => set({ incensePerDay })}
        />
        <NumberField
          label={t(lang, 'sources.coil')}
          value={sources.coilNightsPerWeek}
          min={0}
          max={7}
          onChange={(coilNightsPerWeek) => set({ coilNightsPerWeek })}
        />
      </div>
      <CheckboxField
        label={t(lang, 'sources.smoker')}
        checked={sources.smokerIndoors}
        onChange={(smokerIndoors) => set({ smokerIndoors })}
      />
    </FieldGroup>
  );
}
