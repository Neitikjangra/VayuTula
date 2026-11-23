'use client';

import { useEffect, useSyncExternalStore } from 'react';
import type { Lang } from '@/i18n';
import { getLang, getServerLang, subscribeLang } from './langStore';

/** Current UI language; keeps <html lang> in sync with it. */
export function useLang(): Lang {
  const lang = useSyncExternalStore(subscribeLang, getLang, getServerLang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return lang;
}
