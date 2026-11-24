import { DEFAULT_LANG, isLang, isLangLoaded, loadLang, type Lang } from '@/i18n';

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

function apply(lang: Lang): void {
  current = lang;
  document.documentElement.lang = lang;
  listeners.forEach((listener) => listener());
}

/** Subscribes to language changes (useSyncExternalStore contract). */
export function subscribeLang(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Current language. Read from storage once; a saved language whose strings are not loaded
 * yet starts as English and switches as soon as they arrive, so text is never half-translated.
 */
export function getLang(): Lang {
  if (current === null) {
    const stored = readStored();
    current = isLangLoaded(stored) ? stored : DEFAULT_LANG;
    if (stored !== current) void loadLang(stored).then(() => apply(stored));
  }
  return current;
}

/** Language used during server rendering and hydration. */
export function getServerLang(): Lang {
  return DEFAULT_LANG;
}

/** Saves the choice (best effort), loads its strings, then switches the UI and <html lang>. */
export async function setLang(lang: Lang): Promise<void> {
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Storage can be blocked (private mode); the in-memory value still switches the UI.
  }
  await loadLang(lang);
  apply(lang);
}

/** Test helper: forgets the in-memory value so storage is read again. */
export function resetLangForTests(): void {
  current = null;
}
