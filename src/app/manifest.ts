import type { MetadataRoute } from 'next';
import { DEFAULT_LANG, t } from '@/i18n';

/** Web app manifest: lets the browser install VayuTula on the home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: t(DEFAULT_LANG, 'app.name'),
    short_name: t(DEFAULT_LANG, 'app.name'),
    description: t(DEFAULT_LANG, 'app.description'),
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0c4a6e',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
