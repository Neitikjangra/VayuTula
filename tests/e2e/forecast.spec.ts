import { expect, test } from '@playwright/test';
import airQuality from '../fixtures/openMeteo/airQuality.noida.json';
import geocode from '../fixtures/openMeteo/geocode.noida.json';
import { fetchPm25Forecast } from '../../src/data/openMeteo';

const places = geocode.results.map((r) => ({
  id: r.id,
  name: r.name,
  admin1: r.admin1,
  country: r.country,
  lat: r.latitude,
  lon: r.longitude,
}));

test('search Noida and see a 4-day hourly PM2.5 forecast with its source (FR-2)', async ({
  page,
}) => {
  const forecast = await fetchPm25Forecast(28.58, 77.33, {
    fetchImpl: async () => Response.json(airQuality),
  });
  await page.route('**/api/geocode?*', (route) => route.fulfill({ json: { places } }));
  await page.route('**/api/forecast?*', (route) =>
    route.fulfill({ json: { forecast, stale: false, ageMinutes: 0 } }),
  );

  await page.goto('/');
  await page.getByLabel('City or area').fill('Noida');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('button', { name: 'Noida, Uttar Pradesh, India' }).click();

  await expect(page.getByRole('heading', { name: 'Forecast for Noida' })).toBeVisible();
  await expect(page.getByRole('region', { name: /^Hourly PM2.5 for/ })).toHaveCount(4);
  await expect(page.getByText(/^Source: Open-Meteo Air Quality API/)).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  await page.getByRole('button', { name: 'हिन्दी' }).click();
  await expect(page.getByRole('heading', { name: 'Noida का पूर्वानुमान' })).toBeVisible();
});
