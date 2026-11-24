'use client';

import type { Member } from '@/domain';
import type { DisplayTula } from '@/engine';
import { format, t, type Lang, type MessageKey } from '@/i18n';
import { formatNumber } from '../format';

type Direction = 'Less' | 'More' | 'Same';

function direction(value: number): Direction {
  if (value > 0) return 'Less';
  return value < 0 ? 'More' : 'Same';
}

/** "x less" / "x more" / "no change" for an avoided amount (positive = improvement). */
export function changeText(
  lang: Lang,
  base: 'tula.inhaled' | 'tula.pm' | 'tula.co2',
  value: number,
): string {
  const key = `${base}${direction(value)}` as const satisfies MessageKey;
  return format(lang, key, { value: formatNumber(Math.abs(value), lang) });
}

export function rupeeText(lang: Lang, rupees: number): string {
  if (rupees === 0) return t(lang, 'tula.rupeesSame');
  return format(lang, rupees > 0 ? 'tula.saves' : 'tula.costs', {
    value: formatNumber(Math.abs(rupees), lang),
  });
}

function Pan({ title, lang, lines }: { title: string; lang: Lang; lines: string[] }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-300 bg-slate-50 p-3">
      <dt className="flex items-baseline justify-between gap-2 text-sm font-semibold text-slate-900">
        <span>{title}</span>
        <span className="text-xs font-normal text-slate-700">{t(lang, 'tula.estimate')}</span>
      </dt>
      {lines.map((line) => (
        <dd key={line} className="text-base text-slate-900">
          {line}
        </dd>
      ))}
    </div>
  );
}

interface Props {
  lang: Lang;
  tula: DisplayTula;
  members: Member[];
}

/** The three Tula pans (FR-5, FR-13): breathe in, emit out, ₹. Every value is shown as text. */
export function TulaScale({ lang, tula, members }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Pan
          title={t(lang, 'tula.breatheIn')}
          lang={lang}
          lines={[changeText(lang, 'tula.inhaled', tula.inhaledTotal)]}
        />
        <Pan
          title={t(lang, 'tula.emitOut')}
          lang={lang}
          lines={[changeText(lang, 'tula.pm', tula.pmG), changeText(lang, 'tula.co2', tula.co2Kg)]}
        />
        <Pan title={t(lang, 'tula.rupees')} lang={lang} lines={[rupeeText(lang, tula.rupees)]} />
      </dl>
      {tula.inhaledTotal !== 0 && (
        <details className="text-sm text-slate-800">
          <summary className="min-h-11 cursor-pointer py-2 font-medium">
            {t(lang, 'tula.perPerson')}
          </summary>
          <ul className="flex flex-col gap-1 pl-4">
            {members.map((m) => (
              <li key={m.id}>
                {format(lang, 'tula.personValue', {
                  name: m.label,
                  value: formatNumber(tula.inhaledByMember[m.id] ?? 0, lang),
                })}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
