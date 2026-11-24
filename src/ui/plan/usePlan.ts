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
    // Cancelled when the page closes or the inputs change: no late request, no stale result.
    const abort = new AbortController();
    void (async () => {
      const req = { ...data.request, profileHash: await profileHash(profile) };
      if (abort.signal.aborted) return;
      const plan =
        cachedPlan(req) ?? (await fetchPlan(req, abort.signal)) ?? templatePlan(data.candidates);
      if (!abort.signal.aborted) setResult({ for: data, plan });
    })();
    return () => abort.abort();
  }, [profile, data]);
  const ready = result !== null && result.for === data;
  return { plan: ready ? result.plan : templatePlan(data.candidates), writing: !ready };
}
