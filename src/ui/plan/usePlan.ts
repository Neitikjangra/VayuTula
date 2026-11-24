'use client';

import { useEffect, useState } from 'react';
import { templatePlan, type PlanResponse, type Profile } from '@/domain';
import { cachedPlan, fetchPlan, profileHash } from './planClient';
import type { PlanData } from './planData';

/**
 * Today's plan for the given data: the device copy if fresh, else /api/plan, else the
 * template plan. Null while it is being written.
 */
export function usePlan(profile: Profile, data: PlanData | null): PlanResponse | null {
  const [result, setResult] = useState<{ for: PlanData; plan: PlanResponse } | null>(null);
  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    void (async () => {
      const req = { ...data.request, profileHash: await profileHash(profile) };
      const plan = cachedPlan(req) ?? (await fetchPlan(req)) ?? templatePlan(data.candidates);
      if (!cancelled) setResult({ for: data, plan });
    })();
    return () => {
      cancelled = true;
    };
  }, [profile, data]);
  return result && result.for === data ? result.plan : null;
}
