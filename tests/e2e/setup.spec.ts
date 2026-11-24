import { expect, test, type Page } from '@playwright/test';

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

async function mockApi(page: Page) {
  await page.route('**/api/geocode?*', (route) => route.fulfill({ json: { places } }));
  await page.route('**/api/forecast?*', (route) =>
    route.fulfill({ json: { forecast: liveForecast(), stale: false, ageMinutes: 0 } }),
  );
}

test('fill the form for a 2BHK with one purifier and see ranked actions (R2)', async ({ page }) => {
  await mockApi(page);
  await page.goto('/setup');
  await page.getByLabel('City or area').fill('Noida');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('button', { name: 'Noida, Uttar Pradesh, India' }).click();
  await expect(page.getByText('Using Noida.')).toBeVisible();

  await page.getByRole('button', { name: 'Add person' }).click();
  await page.getByLabel('Name or nickname').nth(1).fill('Kid');
  await page.getByLabel('Age group').nth(1).selectOption('child');
  await page.getByLabel('Air purifier').first().selectOption('philips-ac1215');
  await page.getByLabel('Incense sticks a day').fill('2');
  await page.getByLabel('Budget for air improvements').selectOption('2000');
  await page.getByRole('button', { name: 'Save and see actions' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Actions for your home' })).toBeVisible();
  const cards = page.getByRole('heading', { level: 3 });
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThan(3);
  await expect(page.getByText('Breathe in').first()).toBeVisible();
  await expect(page.getByText('Provisional').first()).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
