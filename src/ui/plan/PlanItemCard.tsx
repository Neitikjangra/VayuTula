'use client';

import { useId, useState } from 'react';
import type { Member, PlanCandidate } from '@/domain';
import { displayTula } from '@/engine/display';
import type { RankedAction } from '@/engine/rank';
import { format, t, type Lang } from '@/i18n';
import { formatNumber, hourLabel } from '../format';
import { Badges, actionTitle } from './ActionCard';
import type { PlanData } from './planData';
import { TulaScale } from './TulaScale';
import { WhyPanel } from './WhyPanel';

/** Built-in reason from the engine's displayed numbers, used when there is no AI text. */
export function templateReason(lang: Lang, c: PlanCandidate): string {
  const { inhaledTotal, rupees, co2Kg } = c.numbers;
  if (inhaledTotal > 0)
    return format(lang, 'plan.reasonInhaled', { value: formatNumber(inhaledTotal, lang) });
  if (rupees > 0) return format(lang, 'plan.reasonRupees', { value: formatNumber(rupees, lang) });
  if (co2Kg > 0) return format(lang, 'plan.reasonCo2', { value: formatNumber(co2Kg, lang) });
  return t(lang, 'plan.reasonGeneric');
}

function windowText(lang: Lang, c: PlanCandidate): string {
  const w = c.timeWindow;
  return w
    ? format(lang, 'plan.window', { from: hourLabel(w.fromHour), to: hourLabel(w.toHour) })
    : t(lang, 'plan.anyTime');
}

function Reason({
  lang,
  whyText,
  candidate,
}: {
  lang: Lang;
  whyText: string | null;
  candidate: PlanCandidate;
}) {
  return (
    <p className="flex flex-col gap-1 text-base text-slate-900">
      {whyText && (
        <span className="self-start rounded-full border border-slate-500 px-2 text-xs text-slate-800">
          {t(lang, 'plan.aiWritten')}
        </span>
      )}
      <span>{whyText ?? templateReason(lang, candidate)}</span>
    </p>
  );
}

interface Props {
  lang: Lang;
  ranked: RankedAction;
  candidate: PlanCandidate;
  whyText: string | null;
  members: Member[];
  data: PlanData;
  budget: string;
}

/** One plan item (FR-6): title, badges, time window, reason, Tula scale and the why panel (FR-7). */
export function PlanItemCard({ lang, ranked, candidate, whyText, members, data, budget }: Props) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-slate-300 bg-white p-4">
      <h3 className="text-lg font-semibold text-slate-900">
        {actionTitle(lang, candidate.actionId)}
      </h3>
      <Badges lang={lang} ranked={ranked} />
      <p className="text-base font-medium text-sky-900">{windowText(lang, candidate)}</p>
      <Reason lang={lang} whyText={whyText} candidate={candidate} />
      <TulaScale lang={lang} tula={displayTula(ranked.tula)} members={members} />
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="min-h-11 self-start rounded-lg border border-sky-900 px-4 py-2 text-base font-medium text-sky-900 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-800"
      >
        {t(lang, 'plan.why')}
      </button>
      {open && (
        <WhyPanel
          lang={lang}
          id={panelId}
          ranked={ranked}
          candidate={candidate}
          data={data}
          budget={budget}
        />
      )}
    </li>
  );
}
