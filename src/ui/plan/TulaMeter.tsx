'use client';

import type { Member } from '@/domain';
import { meterTilt, type MeterTotals } from '@/engine/meter';
import { format, t, type Lang } from '@/i18n';
import { formatNumber } from '../format';
import { changeText, rupeeText } from './TulaScale';

const MAX_TILT_DEG = 12;

/** A beam that tips toward the clean-air side as steps are done. Decorative only. */
function Beam({ tilt }: { tilt: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col items-center py-2">
      <div
        className="h-2 w-48 rounded-full bg-sky-900 transition-transform duration-500 motion-reduce:transition-none"
        style={{ transform: `rotate(${-tilt * MAX_TILT_DEG}deg)` }}
      />
      <div className="h-0 w-0 border-x-8 border-b-[14px] border-x-transparent border-b-sky-900" />
    </div>
  );
}

function PerPerson({
  lang,
  totals,
  members,
}: {
  lang: Lang;
  totals: MeterTotals;
  members: Member[];
}) {
  if (totals.inhaledTotal === 0) return null;
  return (
    <details className="text-sm text-slate-800">
      <summary className="min-h-11 cursor-pointer py-2 font-medium">
        {t(lang, 'meter.perPerson')}
      </summary>
      <ul className="flex flex-col gap-1 pl-4">
        {members.map((m) => (
          <li key={m.id}>
            {format(lang, 'tula.personValue', {
              name: m.label,
              value: formatNumber(totals.inhaledByMember[m.id] ?? 0, lang),
            })}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Today's Tula meter: live totals of the steps ticked "Done" today, as text (aria-live). */
export function TulaMeter({
  lang,
  totals,
  members,
}: {
  lang: Lang;
  totals: MeterTotals;
  members: Member[];
}) {
  return (
    <section
      aria-labelledby="meter-heading"
      className="flex flex-col gap-1 rounded-xl border-2 border-emerald-800 bg-emerald-50 p-4"
    >
      <h3 id="meter-heading" className="text-lg font-semibold text-slate-900">
        {t(lang, 'meter.heading')}
      </h3>
      <Beam tilt={meterTilt(totals)} />
      <div aria-live="polite" className="flex flex-col gap-1 text-base text-slate-900">
        <p className="font-medium">
          {format(lang, 'meter.progress', { done: totals.done, total: totals.total })}
        </p>
        {totals.done === 0 ? (
          <p>{t(lang, 'meter.empty')}</p>
        ) : (
          <>
            <p>{changeText(lang, 'tula.inhaled', totals.inhaledTotal)}</p>
            <p>{changeText(lang, 'tula.pm', totals.pmG)}</p>
            <p>{changeText(lang, 'tula.co2', totals.co2Kg)}</p>
            <p>{rupeeText(lang, totals.rupees)}</p>
          </>
        )}
      </div>
      <PerPerson lang={lang} totals={totals} members={members} />
      <p className="text-sm text-slate-700">{t(lang, 'meter.note')}</p>
    </section>
  );
}
