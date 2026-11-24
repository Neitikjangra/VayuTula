'use client';

import dynamic from 'next/dynamic';

/** The engine, config and plan UI load only after the page is up, keeping first-load JS small. */
export const PlanSectionClient = dynamic(() => import('./PlanSection'), { ssr: false });
