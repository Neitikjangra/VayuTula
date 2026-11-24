'use client';

import dynamic from 'next/dynamic';

/** Loaded only when an error happens, so the error page adds nothing to every page's first load. */
const StatusPage = dynamic(() => import('@/ui/StatusPage').then((m) => m.StatusPage), {
  ssr: false,
});

/** Shown when a page fails to render; error details are not shown to the user. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <StatusPage heading="status.errorHeading" body="status.errorBody" onRetry={reset} />;
}
