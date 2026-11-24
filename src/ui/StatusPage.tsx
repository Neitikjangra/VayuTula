'use client';

import Link from 'next/link';
import { t, type MessageKey } from '@/i18n';
import { LanguageToggle } from './LanguageToggle';
import { useLang } from './useLang';

interface Props {
  heading: MessageKey;
  body: MessageKey;
  /** Shown as a "Try again" button when given (error page). */
  onRetry?: () => void;
}

const BUTTON =
  'min-h-11 rounded-lg px-4 py-2 text-base font-medium focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-800';

/** A friendly full page for "not found" and "something went wrong", in the chosen language. */
export function StatusPage({ heading, body, onRetry }: Props) {
  const lang = useLang();
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xl font-bold text-slate-900">{t(lang, 'app.name')}</p>
        <LanguageToggle />
      </header>
      <h1 className="text-3xl font-bold text-slate-900">{t(lang, heading)}</h1>
      <p className="text-lg text-slate-800">{t(lang, body)}</p>
      <div className="flex flex-wrap gap-3">
        {onRetry && (
          <button type="button" onClick={onRetry} className={`${BUTTON} bg-sky-900 text-white`}>
            {t(lang, 'status.retry')}
          </button>
        )}
        <Link
          href="/"
          className={`${BUTTON} ${onRetry ? 'border border-sky-900 text-sky-900' : 'bg-sky-900 text-white'}`}
        >
          {t(lang, 'nav.back')}
        </Link>
      </div>
    </main>
  );
}
