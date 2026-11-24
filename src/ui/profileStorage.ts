import { ProfileSchema, type Profile } from '@/domain';

const PROFILE_KEY = 'vayutula.profile';

/** The saved household profile, or null if none or invalid. Stays on this device (PRD 7, Privacy). */
export function loadProfile(): Profile | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (raw === null) return null;
    const parsed = ProfileSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Saves the profile; returns false if storage is blocked or full. */
export function saveProfile(profile: Profile): boolean {
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}
