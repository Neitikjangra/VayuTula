'use client';

import { configRegistry } from '@/config';
import { isProvisional, type PlanCandidate } from '@/domain';
import type { RankedAction } from '@/engine/rank';
import { configLabel } from './configLabel';
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

/** The source as a link showing its site, or "source not yet verified". */
function SourceLink({ lang, source }: { lang: Lang; source: string }) {
  if (!/^https?:\/\//.test(source)) {
    return (
      <span className="text-slate-700">
        {source === 'TODO' ? t(lang, 'why.sourceTodo') : source}
      </span>
    );
  }
  return (
    <a href={source} target="_blank" rel="noopener noreferrer" className="text-sky-900 underline">
      {new URL(source).hostname.replace(/^www\./, '')}
    </a>
  );
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
        const line = format(lang, 'why.valueOnly', {
          label: configLabel(lang, key),
          value: show(entry.value, lang),
        });
        return (
          <li key={key} title={key} className="flex flex-wrap gap-x-2 break-words">
            <span>{line}</span>
            <SourceLink lang={lang} source={entry.source} />
            <strong>{status}</strong>
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
