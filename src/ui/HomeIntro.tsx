'use client';

import { useState } from 'react';
import type { Forecast } from '@/domain';
import { t } from '@/i18n';
import { ForecastPanel } from './ForecastPanel';
import { LanguageToggle } from './LanguageToggle';
import { PlanSectionClient } from './plan/PlanSectionClient';
import { SiteFooter } from './SiteFooter';
import { useLang } from './useLang';

/** Home page: name, promise, language switch, today's plan, the forecast and "delete my data". */
export function HomeIntro() {
  const lang = useLang();
  const [forecast, setForecast] = useState<Forecast | null>(null);
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t(lang, 'app.name')}</h1>
          <p className="text-base text-slate-700">{t(lang, 'app.tagline')}</p>
        </div>
        <LanguageToggle />
      </header>
      <p className="text-lg leading-relaxed text-slate-900">{t(lang, 'home.promise')}</p>
      <PlanSectionClient forecast={forecast} />
      <ForecastPanel onForecast={setForecast} />
      <SiteFooter lang={lang} />
    </main>
  );
}
