import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { DEFAULT_LANG, t } from '@/i18n';
import './globals.css';

export const metadata: Metadata = {
  title: t(DEFAULT_LANG, 'app.name'),
  description: t(DEFAULT_LANG, 'app.description'),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0c4a6e',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang={DEFAULT_LANG}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
