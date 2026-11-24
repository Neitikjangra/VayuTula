import { PlanResponseSchema, type PlanRequest, type PlanResponse, type Profile } from '@/domain';

const CACHE_KEY = 'vayutula.plan';

/** 64-bit FNV-1a, used only where Web Crypto is unavailable (old browsers, tests). */
function fnv1a(text: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(text)) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, '0');
}

/** Short SHA-256 of the profile: lets the server cache plans without seeing the profile. */
export async function profileHash(profile: Profile): Promise<string> {
  const text = JSON.stringify(profile);
  if (!globalThis.crypto?.subtle) return fnv1a(text);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function cacheId(req: PlanRequest): string {
  return `${req.profileHash}:${req.forecastHour}:${req.lang}`;
}

/** The last AI plan saved on this device, if it is for the same profile, hour and language. */
export function cachedPlan(req: PlanRequest): PlanResponse | null {
  try {
    const raw = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? 'null') as {
      id?: string;
      plan?: unknown;
    } | null;
    if (raw?.id !== cacheId(req)) return null;
    const parsed = PlanResponseSchema.safeParse(raw.plan);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function remember(req: PlanRequest, plan: PlanResponse): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ id: cacheId(req), plan }));
  } catch {
    // Storage blocked: the plan still shows, it is just fetched again next time.
  }
}

/** POST /api/plan; null on any failure (the caller then uses the template plan). */
export async function fetchPlan(req: PlanRequest): Promise<PlanResponse | null> {
  try {
    const response = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(req),
    });
    if (!response.ok) return null;
    const parsed = PlanResponseSchema.safeParse(await response.json());
    if (!parsed.success) return null;
    if (parsed.data.source === 'ai') remember(req, parsed.data);
    return parsed.data;
  } catch {
    return null;
  }
}
