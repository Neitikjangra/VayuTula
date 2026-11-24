import { appConfig } from '@/config';
import { format, isMessageKey, t, type Lang } from '@/i18n';
import { actionTitle } from './ActionCard';

/** Purifier name in the user's language (placeholder entries are translated, brands are not). */
export function purifierName(lang: Lang, id: string): string {
  const key = `purifierName.${id}`;
  if (isMessageKey(key)) return t(lang, key);
  const p = appConfig.purifiers.find((x) => x.id === id);
  return p ? `${p.brand} ${p.model}` : id;
}

/**
 * Plain-language label (with unit) for a config value, e.g. "factors.airExchange.leaky" →
 * "Air exchange, leaky windows (per hour)", in English or Hindi. Falls back to the key.
 */
export function configLabel(lang: Lang, key: string): string {
  const direct = `cfg.${key}`;
  if (isMessageKey(direct)) return t(lang, direct);
  const [file, id, field] = key.split('.');
  const fieldKey = `cfgField.${field ?? ''}`;
  if (file === 'purifiers' && id && isMessageKey(fieldKey)) {
    return format(lang, 'why.purifierValue', {
      model: purifierName(lang, id),
      field: t(lang, fieldKey),
    });
  }
  if (file === 'actions' && id && field === 'oneOffRupees') {
    return format(lang, 'why.actionPrice', { action: actionTitle(lang, id) });
  }
  return key;
}
