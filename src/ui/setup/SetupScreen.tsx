'use client';

import Link from 'next/link';
import { t } from '@/i18n';
import { LanguageToggle } from '../LanguageToggle';
import { useLang } from '../useLang';
import { ProfileForm } from './ProfileForm';

/** /setup: header, intro and the manual profile form. Client-only (reads localStorage). */
export default function SetupScreen() {
  const lang = useLang();
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="text-base font-medium text-sky-900 underline">
          {t(lang, 'nav.back')}
        </Link>
        <LanguageToggle />
      </header>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900">{t(lang, 'setup.title')}</h1>
        <p className="text-base text-slate-700">{t(lang, 'setup.intro')}</p>
      </div>
      <ProfileForm lang={lang} />
    </main>
  );
}
