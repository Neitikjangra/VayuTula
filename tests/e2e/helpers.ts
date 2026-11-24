// Shared Playwright helpers: API mocks so end-to-end tests never call Open-Meteo or Gemini.
import type { Page } from '@playwright/test';

const HOUR_MS = 3_600_000;

/** 120 hours of PM2.5 starting two hours ago, so the 48-hour engine window is always covered. */
function liveForecast() {
  const start = Math.floor(Date.now() / HOUR_MS) * HOUR_MS - 2 * HOUR_MS;
  return {
    source: 'Open-Meteo Air Quality API (CAMS)',
    fetchedAt: new Date().toISOString(),
    timezone: 'Asia/Kolkata',
    lat: 28.58,
    lon: 77.33,
    hours: Array.from({ length: 120 }, (_, i) => ({
      time: new Date(start + i * HOUR_MS).toISOString(),
      pm25: 120 + 60 * Math.sin(i / 4),
    })),
  };
}

const places = [
  { id: 7279746, name: 'Noida', admin1: 'Uttar Pradesh', country: 'India', lat: 28.58, lon: 77.33 },
];

export async function mockApi(page: Page) {
  await page.route('**/api/geocode?*', (route) => route.fulfill({ json: { places } }));
  await page.route('**/api/forecast?*', (route) =>
    route.fulfill({ json: { forecast: liveForecast(), stale: false, ageMinutes: 0 } }),
  );
  // The AI is mocked as unavailable here, so the template plan is shown (no Gemini calls in tests).
  await page.route('**/api/plan', (route) => route.fulfill({ status: 503, json: { error: 'x' } }));
}
