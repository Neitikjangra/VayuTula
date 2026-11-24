'use client';

import dynamic from 'next/dynamic';

/** The engine and config load only after the page is up, keeping first-load JS small. */
export const ActionListClient = dynamic(() => import('./ActionList'), { ssr: false });
