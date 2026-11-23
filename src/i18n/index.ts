import en from './en.json';
import hi from './hi.json';

/** Supported UI languages. */
export const LANGS = ['en', 'hi'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

/** Every UI string key; en.json is the reference set. */
export type MessageKey = keyof typeof en;

const MESSAGES: Record<Lang, Record<MessageKey, string>> = { en, hi };
const LOCALES: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN' };

/** Type guard for values read from storage or input. */
export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}

/** Returns the UI string for `key` in `lang`, falling back to English. */
export function t(lang: Lang, key: MessageKey): string {
  return MESSAGES[lang][key] ?? MESSAGES.en[key];
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
