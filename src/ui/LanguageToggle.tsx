'use client';

import { LANGS, t, type Lang } from '@/i18n';
import { setLang } from './langStore';
import { useLang } from './useLang';

const BUTTON_BASE =
  'min-h-11 min-w-11 rounded-full px-4 py-2 text-sm font-medium focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-800';

/** Two-button English / Hindi switch. Each label is shown in its own script. */
export function LanguageToggle() {
  const lang = useLang();
  return (
    <div
      role="group"
      aria-label={t(lang, 'lang.groupLabel')}
      className="inline-flex gap-1 rounded-full border border-slate-400 bg-white p-1"
    >
      {LANGS.map((option: Lang) => {
        const active = option === lang;
        return (
          <button
            key={option}
            type="button"
            lang={option}
            aria-pressed={active}
            onClick={() => void setLang(option)}
            className={`${BUTTON_BASE} ${active ? 'bg-sky-900 text-white' : 'text-slate-900 hover:bg-slate-100'}`}
          >
            {t(option, option === 'en' ? 'lang.en' : 'lang.hi')}
          </button>
        );
      })}
    </div>
  );
}
