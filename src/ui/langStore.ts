import { DEFAULT_LANG, isLang, type Lang } from '@/i18n';

/** localStorage key holding the chosen UI language. */
export const LANG_STORAGE_KEY = 'vayutula.lang';

const listeners = new Set<() => void>();
let current: Lang | null = null;

function readStored(): Lang {
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    return isLang(stored) ? stored : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

/** Subscribes to language changes (useSyncExternalStore contract). */
export function subscribeLang(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Current language in the browser; read from storage once, then kept in memory. */
export function getLang(): Lang {
  current ??= readStored();
  return current;
}

/** Language used during server rendering and hydration. */
export function getServerLang(): Lang {
  return DEFAULT_LANG;
}

/** Persists the language (best effort), updates <html lang> and notifies subscribers. */
export function setLang(lang: Lang): void {
  current = lang;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Storage can be blocked (private mode); the in-memory value still switches the UI.
  }
  document.documentElement.lang = lang;
  listeners.forEach((listener) => listener());
}

/** Test helper: forgets the in-memory value so storage is read again. */
export function resetLangForTests(): void {
  current = null;
}
