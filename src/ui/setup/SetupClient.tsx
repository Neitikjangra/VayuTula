'use client';

import dynamic from 'next/dynamic';

/** Loads the setup screen in the browser only: it reads the saved profile from localStorage. */
export const SetupClient = dynamic(() => import('./SetupScreen'), { ssr: false });
