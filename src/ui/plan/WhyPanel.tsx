'use client';

import { configRegistry } from '@/config';
import { isProvisional, type PlanCandidate } from '@/domain';
import type { RankedAction } from '@/engine/rank';
import { format, t, type Lang } from '@/i18n';
import { formatNumber } from '../format';
import type { PlanData } from './planData';

const CONFIDENCE_TEXT = {
  high: 'why.confidenceHigh',
  med: 'why.confidenceMed',
  low: 'why.confidenceLow',
} as const satisfies Record<PlanCandidate['confidence'], string>;

function show(value: number | number[], lang: Lang): string {
  return Array.isArray(value) ? value.join(', ') : formatNumber(value, lang);
}

/** Every config value the numbers depend on, with its source or "provisional" (FR-7). */
function Assumptions({ lang, keys }: { lang: Lang; keys: string[] }) {
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {keys.map((key) => {
        const entry = configRegistry.get(key);
        if (!entry) return null;
        const status = isProvisional(entry)
          ? t(lang, 'tula.provisional')
          : format(lang, 'why.verified', { date: entry.verifiedOn ?? '' });
        const source = entry.source === 'TODO' ? t(lang, 'why.sourceTodo') : entry.source;
        const line = format(lang, 'why.value', {
          key,
          value: show(entry.value, lang),
          unit: entry.unit,
          source,
          status,
        });
        return (
          <li key={key} className="break-words">
            {line}
          </li>
        );
      })}
    </ul>
  );
}

interface Props {
  lang: Lang;
  id: string;
  ranked: RankedAction;
  candidate: PlanCandidate;
  data: PlanData;
  budget: string;
}

/** FR-7 why panel: inputs, the formula in plain words, assumptions with sources, confidence. */
export function WhyPanel({ lang, id, ranked, candidate, data, budget }: Props) {
  const h = data.request.household;
  return (
    <div
      id={id}
      className="flex flex-col gap-3 rounded-lg border border-slate-300 bg-slate-50 p-3 text-base text-slate-900"
    >
      <h4 className="font-semibold">{t(lang, 'why.inputs')}</h4>
      <ul className="flex flex-col gap-1 text-sm">
        <li>
          {format(lang, 'why.outdoor', {
            value: formatNumber(data.request.outdoorMean, lang),
            source: data.forecastSource,
          })}
        </li>
        <li>
          {format(lang, 'why.household', {
            people: h.people,
            rooms: h.rooms,
            purifiers: h.purifiers,
          })}
        </li>
        <li>{format(lang, 'why.budget', { budget })}</li>
      </ul>
      <h4 className="font-semibold">{t(lang, 'why.formula')}</h4>
      <p className="text-sm">{t(lang, 'why.formulaBreathe')}</p>
      <p className="text-sm">{t(lang, 'why.formulaEmit')}</p>
      <p className="text-sm">{t(lang, 'why.formulaRupees')}</p>
      <h4 className="font-semibold">{t(lang, 'why.assumptions')}</h4>
      <Assumptions lang={lang} keys={ranked.tula.assumptions} />
      <p className="text-sm font-medium">{t(lang, CONFIDENCE_TEXT[candidate.confidence])}</p>
    </div>
  );
}
