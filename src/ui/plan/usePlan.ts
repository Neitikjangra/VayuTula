'use client';

import { useEffect, useState } from 'react';
import { templatePlan, type PlanResponse, type Profile } from '@/domain';
import { cachedPlan, fetchPlan, profileHash } from './planClient';
import type { PlanData } from './planData';

/**
 * Today's plan. The template plan shows at once (no waiting on the AI); it is replaced by the
 * device copy or the /api/plan reply when that arrives. `writing` is true until then.
 */
export function usePlan(
  profile: Profile,
  data: PlanData,
): { plan: PlanResponse; writing: boolean } {
  const [result, setResult] = useState<{ for: PlanData; plan: PlanResponse } | null>(null);
  useEffect(() => {
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
  const ready = result !== null && result.for === data;
  return { plan: ready ? result.plan : templatePlan(data.candidates), writing: !ready };
}
