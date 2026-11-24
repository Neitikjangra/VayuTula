'use client';

import { useState } from 'react';
import type { Forecast } from '@/domain';
import { t } from '@/i18n';
import { ForecastPanel } from './ForecastPanel';
import { LanguageToggle } from './LanguageToggle';
import { ActionListClient } from './plan/ActionListClient';
import { useLang } from './useLang';

/** Home page: name, promise, language switch, the forecast and the actions ranked for this home. */
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
      <ForecastPanel onForecast={setForecast} />
      <ActionListClient forecast={forecast} />
    </main>
  );
}
