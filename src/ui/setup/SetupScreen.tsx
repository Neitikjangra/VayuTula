'use client';

import Link from 'next/link';
import { useState } from 'react';
import { t, type Lang } from '@/i18n';
import { LanguageToggle } from '../LanguageToggle';
import { loadProfile } from '../profileStorage';
import { useLang } from '../useLang';
import { SECONDARY_BUTTON } from './fields';
import { IntakePanel } from './IntakePanel';
import { PlaceSection } from './PlaceSection';
import { ProfileForm } from './ProfileForm';
import { useSetupDraft } from './useSetupDraft';

type Mode = 'chat' | 'form';

function SetupHeader({ lang }: { lang: Lang }) {
  return (
    <>
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
    </>
  );
}

function ModeToggle({ lang, mode, onToggle }: { lang: Lang; mode: Mode; onToggle: () => void }) {
  return (
    <button type="button" className={`${SECONDARY_BUTTON} self-start`} onClick={onToggle}>
      {t(lang, mode === 'chat' ? 'setup.modeForm' : 'setup.modeChat')}
    </button>
  );
}

function FallbackNotice({ lang }: { lang: Lang }) {
  return (
    <p
      role="status"
      className="rounded-lg border border-slate-500 bg-white p-3 text-base text-slate-900"
    >
      {t(lang, 'setup.fallback')}
    </p>
  );
}

/** /setup: chat first (FR-1), with the manual form always one tap away. Client-only. */
export default function SetupScreen() {
  const lang = useLang();
  const setup = useSetupDraft(lang);
  const [mode, setMode] = useState<Mode>(() => (loadProfile() ? 'form' : 'chat'));
  const [fallback, setFallback] = useState(false);
  const { draft, setDraft, save, invalid } = setup;
  const common = { lang, draft, onChange: setDraft, onSave: save, invalid };
  const toForm = () => setMode('form');
  const fallBack = () => {
    setFallback(true);
    toForm();
  };
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-8">
      <SetupHeader lang={lang} />
      <PlaceSection lang={lang} draft={draft} onPlace={setup.onPlace} />
      <ModeToggle
        lang={lang}
        mode={mode}
        onToggle={() => setMode(mode === 'chat' ? 'form' : 'chat')}
      />
      {mode === 'chat' && <IntakePanel {...common} onEdit={toForm} onFallback={fallBack} />}
      {mode === 'form' && fallback && <FallbackNotice lang={lang} />}
      {mode === 'form' && <ProfileForm {...common} />}
    </main>
  );
}
