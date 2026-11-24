'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Forecast, PlanResponse, Profile } from '@/domain';
import { t, type Lang, type MessageKey } from '@/i18n';
import { loadProfile } from '../profileStorage';
import { useLang } from '../useLang';
import { ActionCard } from './ActionCard';
import { NudgeBanner } from './NudgeBanner';
import { planData, type PlanData } from './planData';
import { PlanItemCard } from './PlanItemCard';
import { usePlan } from './usePlan';

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

interface ListProps {
  lang: Lang;
  profile: Profile;
  data: PlanData;
  plan: PlanResponse;
}

function PlanList({ lang, profile, data, plan }: ListProps) {
  const budget = t(lang, `budget.${profile.budgetTier}`);
  return (
    <ol aria-labelledby="plan-heading" className="flex flex-col gap-3">
      {plan.items.map((item) => {
        const ranked = data.ranked.find((r) => r.action.id === item.actionId);
        const candidate = data.candidates.find((c) => c.actionId === item.actionId);
        if (!ranked || !candidate) return null;
        return (
          <PlanItemCard
            key={item.actionId}
            {...{ lang, ranked, candidate, data, budget }}
            whyText={item.whyText}
            members={profile.members}
          />
        );
      })}
    </ol>
  );
}

function AllActions({ lang, profile, data }: Omit<ListProps, 'plan'>) {
  return (
    <details className="rounded-xl border border-slate-300 bg-white p-4">
      <summary className="min-h-11 cursor-pointer py-2 text-lg font-semibold text-slate-900">
        {t(lang, 'plan.allActions')}
      </summary>
      <p className="mb-3 text-base text-slate-700">{t(lang, 'plan.intro')}</p>
      <ol className="flex flex-col gap-3">
        {data.ranked.map((r) => (
          <ActionCard key={r.action.id} lang={lang} ranked={r} members={profile.members} />
        ))}
      </ol>
    </details>
  );
}

function TodayPlan({ lang, profile, data }: Omit<ListProps, 'plan'>) {
  const { plan, writing } = usePlan(profile, data);
  return (
    <>
      <p className="text-base text-slate-700">{t(lang, 'plan.todayIntro')}</p>
      {writing && (
        <p role="status" className="text-sm text-slate-700">
          {t(lang, 'plan.writing')}
        </p>
      )}
      <PlanList {...{ lang, profile, data, plan }} />
      <AllActions {...{ lang, profile, data }} />
    </>
  );
}

/** Home: purifier nudge (FR-16), today's 3–5 actions (FR-6) with why panels (FR-7), all actions. */
export default function PlanSection({ forecast }: { forecast: Forecast | null }) {
  const lang = useLang();
  const [profile] = useState(loadProfile);
  const [nowIso] = useState(() => new Date().toISOString());
  const result = useMemo(
    () => planData(profile, forecast, nowIso, lang),
    [profile, forecast, nowIso, lang],
  );
  return (
    <section aria-labelledby="plan-heading" className="flex flex-col gap-4">
      {profile && <NudgeBanner lang={lang} profile={profile} />}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="plan-heading" className="text-2xl font-bold text-slate-900">
          {t(lang, 'plan.todayHeading')}
        </h2>
        {profile && (
          <Link href="/setup" className="text-base font-medium text-sky-900 underline">
            {t(lang, 'nav.editHome')}
          </Link>
        )}
      </div>
      <div aria-live="polite" className="flex flex-col gap-3">
        {result.ok && profile ? (
          <TodayPlan lang={lang} profile={profile} data={result.data} />
        ) : (
          <Message lang={lang} message={result.ok ? 'plan.none' : result.message} />
        )}
      </div>
    </section>
  );
}
