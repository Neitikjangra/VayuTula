'use client';

import { t } from '@/i18n';
import { useLang } from './useLang';

const PREFIX = 'vayutula.';

/** Removes everything VayuTula saved on this device (PRD 7, Privacy). */
export function deleteLocalData(storage: Storage = window.localStorage): void {
  const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter(
    (key): key is string => key !== null && key.startsWith(PREFIX),
  );
  for (const key of keys) storage.removeItem(key);
}

/** "Delete my data": asks first, then clears this device's VayuTula data and reloads. */
export function DeleteDataButton() {
  const lang = useLang();
  const onClick = () => {
    if (!window.confirm(t(lang, 'data.confirm'))) return;
    deleteLocalData();
    window.location.reload();
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 self-start rounded-lg border border-red-900 px-4 py-2 text-base font-medium text-red-900 hover:bg-red-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-800"
    >
      {t(lang, 'data.delete')}
    </button>
  );
}
