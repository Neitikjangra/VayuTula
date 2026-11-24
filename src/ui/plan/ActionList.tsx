'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Forecast, Profile } from '@/domain';
import { rankActions, type RankedAction } from '@/engine';
import { t, type Lang, type MessageKey } from '@/i18n';
import { loadProfile } from '../profileStorage';
import { useLang } from '../useLang';
import { ActionCard } from './ActionCard';

type Result = { ranked: RankedAction[] } | { message: MessageKey };

function rank(profile: Profile | null, forecast: Forecast | null, nowIso: string): Result {
  if (!profile) return { message: 'plan.noProfile' };
  if (!forecast) return { message: 'plan.needsForecast' };
  try {
    const ranked = rankActions(profile, forecast, nowIso);
    return ranked.length > 0 ? { ranked } : { message: 'plan.none' };
  } catch (error) {
    if (error instanceof RangeError) return { message: 'plan.forecastTooOld' };
    throw error;
  }
}

function Message({ lang, message }: { lang: Lang; message: MessageKey }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-base text-slate-800">{t(lang, message)}</p>
      {message === 'plan.noProfile' && (
        <Link
          href="/setup"
          className="min-h-11 rounded-lg bg-sky-900 px-4 py-2 text-base font-medium text-white"
        >
          {t(lang, 'nav.setup')}
        </Link>
      )}
    </div>
  );
}

/** R2 action list: every applicable action for this home, ranked free-first, with Tula scales. */
export default function ActionList({ forecast }: { forecast: Forecast | null }) {
  const lang = useLang();
  const [profile] = useState(loadProfile);
  const [nowIso] = useState(() => new Date().toISOString());
  const result = useMemo(() => rank(profile, forecast, nowIso), [profile, forecast, nowIso]);
  return (
    <section aria-labelledby="plan-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="plan-heading" className="text-2xl font-bold text-slate-900">
          {t(lang, 'plan.heading')}
        </h2>
        {profile && (
          <Link href="/setup" className="text-base font-medium text-sky-900 underline">
            {t(lang, 'nav.editHome')}
          </Link>
        )}
      </div>
      <div aria-live="polite" className="flex flex-col gap-3">
        {'message' in result ? (
          <Message lang={lang} message={result.message} />
        ) : (
          <>
            <p className="text-base text-slate-700">{t(lang, 'plan.intro')}</p>
            <ol className="flex flex-col gap-3">
              {result.ranked.map((r) => (
                <ActionCard
                  key={r.action.id}
                  lang={lang}
                  ranked={r}
                  members={profile?.members ?? []}
                />
              ))}
            </ol>
          </>
        )}
      </div>
    </section>
  );
}
