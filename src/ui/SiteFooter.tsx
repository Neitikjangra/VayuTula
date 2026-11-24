'use client';

import health from '@/config/health-library.json';
import { t, type Lang } from '@/i18n';
import { DeleteDataButton } from './DeleteDataButton';
import { InstallButton } from './InstallButton';

const FOOTER_STATEMENTS = ['not-medical-advice', 'consult-doctor'];

/** Footer health statements, word for word from the health library (never written here). */
function healthLines(lang: Lang): string[] {
  return health.statements
    .filter((s) => FOOTER_STATEMENTS.includes(s.id))
    .map((s) => (lang === 'hi' ? s.hi : s.en));
}

/** Footer: install, delete my data, not-medical-advice note and what leaves the device. */
export function SiteFooter({ lang }: { lang: Lang }) {
  return (
    <footer className="mt-8 flex flex-col gap-3 border-t border-slate-300 pt-6">
      <InstallButton lang={lang} />
      <DeleteDataButton />
      {healthLines(lang).map((line) => (
        <p key={line} className="text-sm text-slate-800">
          {line}
        </p>
      ))}
      <p className="text-sm text-slate-700">{t(lang, 'footer.privacy')}</p>
    </footer>
  );
}
