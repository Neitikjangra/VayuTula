'use client';

import { useEffect, useState } from 'react';
import { t, type Lang } from '@/i18n';

/** Chromium's install prompt event (not in the DOM typings). */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type State = 'hidden' | 'ready' | 'installed';

/** Listens for the browser's install offer; shows nothing where installing is not offered. */
function useInstall() {
  const [state, setState] = useState<State>('hidden');
  const [offer, setOffer] = useState<InstallPromptEvent | null>(null);
  useEffect(() => {
    const onOffer = (event: Event) => {
      event.preventDefault();
      setOffer(event as InstallPromptEvent);
      setState('ready');
    };
    const onInstalled = () => setState('installed');
    window.addEventListener('beforeinstallprompt', onOffer);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onOffer);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  const install = async () => {
    if (!offer) return;
    await offer.prompt();
    const { outcome } = await offer.userChoice;
    setOffer(null);
    setState(outcome === 'accepted' ? 'installed' : 'hidden');
  };
  return { state, install };
}

/** "Install VayuTula as an app", shown only when the browser offers it. */
export function InstallButton({ lang }: { lang: Lang }) {
  const { state, install } = useInstall();
  if (state === 'installed')
    return (
      <p role="status" className="text-sm text-slate-800">
        {t(lang, 'install.done')}
      </p>
    );
  if (state === 'hidden') return null;
  return (
    <button
      type="button"
      onClick={() => void install()}
      className="min-h-11 self-start rounded-lg border border-sky-900 px-4 py-2 text-base font-medium text-sky-900 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-800"
    >
      {t(lang, 'install.button')}
    </button>
  );
}
