import en from './en.json';

/** Supported UI languages. */
export const LANGS = ['en', 'hi'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

/** Every UI string key; en.json is the reference set. */
export type MessageKey = keyof typeof en;
type Catalog = Record<MessageKey, string>;

const LOCALES: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN' };

/**
 * English ships with the page; Hindi is fetched on first use so English-only visits stay
 * within the first-load budget. The type check below still requires hi.json to have every key.
 */
const LOADERS: Record<Lang, () => Promise<Catalog>> = {
  en: async () => en,
  hi: async () => (await import('./hi.json')).default,
};
const catalogs: Partial<Record<Lang, Catalog>> = { en };

/** Type guard for values read from storage or input. */
export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}

/** True for keys present in the English catalogue (used for keys built from ids). */
export function isMessageKey(key: string): key is MessageKey {
  return Object.hasOwn(en, key);
}

/** True once a language's strings are available to t(). */
export function isLangLoaded(lang: Lang): boolean {
  return catalogs[lang] !== undefined;
}

/** Loads a language's strings (once). */
export async function loadLang(lang: Lang): Promise<void> {
  catalogs[lang] ??= await LOADERS[lang]();
}

/** Returns the UI string for `key` in `lang`, falling back to English. */
export function t(lang: Lang, key: MessageKey): string {
  return catalogs[lang]?.[key] ?? en[key];
}

/** Like t(), replacing `{name}` placeholders with `vars`. Unknown placeholders stay as-is. */
export function format(lang: Lang, key: MessageKey, vars: Record<string, string | number>): string {
  return t(lang, key).replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/** BCP 47 locale for dates and numbers. */
export function localeOf(lang: Lang): string {
  return LOCALES[lang];
}
