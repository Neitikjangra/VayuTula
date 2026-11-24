'use client';

import { t, type Lang } from '@/i18n';

const SAVE_BUTTON =
  'min-h-12 rounded-lg bg-sky-900 px-5 py-3 text-lg font-semibold text-white hover:bg-sky-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-800';

interface Props {
  lang: Lang;
  invalid: boolean;
  /** Without onSave the button submits its form; with it, it is a plain button. */
  onSave?: () => void;
}

/** The "Save and see actions" button with its error message, shared by chat and form. */
export function SaveArea({ lang, invalid, onSave }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <p role="alert" className="min-h-6 text-base font-medium text-red-900">
        {invalid ? t(lang, 'setup.invalid') : ''}
      </p>
      <button type={onSave ? 'button' : 'submit'} onClick={onSave} className={SAVE_BUTTON}>
        {t(lang, 'setup.save')}
      </button>
    </div>
  );
}
