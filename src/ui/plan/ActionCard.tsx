'use client';

import type { Member } from '@/domain';
import { displayTula, type RankedAction } from '@/engine';
import { format, isMessageKey, t, type Lang } from '@/i18n';
import { TulaScale } from './TulaScale';

/** Translated action title; falls back to the id if a title is missing (tested not to happen). */
export function actionTitle(lang: Lang, id: string): string {
  const key = `action.${id}`;
  return isMessageKey(key) ? t(lang, key) : id;
}

/** Cost tier, confidence and the provisional badge for an action. */
export function Badges({ lang, ranked }: { lang: Lang; ranked: RankedAction }) {
  const tula = displayTula(ranked.tula);
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-slate-800">
      <span className="rounded-full border border-slate-500 px-2 py-0.5">
        {t(lang, `tier.${ranked.action.costTier}`)}
      </span>
      <span>
        {format(lang, 'tula.confidence', { level: t(lang, `confidence.${tula.confidence}`) })}
      </span>
      {tula.provisional && (
        <span
          className="rounded-full border border-amber-800 bg-amber-50 px-2 py-0.5 font-medium text-amber-950"
          title={t(lang, 'tula.provisionalHint')}
        >
          {t(lang, 'tula.provisional')}
        </span>
      )}
    </p>
  );
}

/** One ranked action with its cost tier, confidence, provisional badge and Tula scale. */
export function ActionCard({
  lang,
  ranked,
  members,
}: {
  lang: Lang;
  ranked: RankedAction;
  members: Member[];
}) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-slate-300 bg-white p-4">
      <h3 className="text-lg font-semibold text-slate-900">
        {actionTitle(lang, ranked.action.id)}
      </h3>
      <Badges lang={lang} ranked={ranked} />
      <TulaScale lang={lang} tula={displayTula(ranked.tula)} members={members} />
    </li>
  );
}
