import { expect, test } from '@playwright/test';

const HOUR_MS = 3_600_000;

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
      pm25: 140,
    })),
  };
}

const hindiReply = {
  profileDelta: {
    members: [
      { label: 'मैं', ageGroup: 'adult', sleepsIn: 'बेडरूम' },
      { label: 'दादी', ageGroup: 'elder', sleepsIn: 'बेडरूम' },
    ],
    rooms: [
      { name: 'बेडरूम', kind: 'bedroom', hasPurifier: true, purifierModel: 'Philips AC1215' },
      { name: 'बैठक', kind: 'living' },
      { name: 'रसोई', kind: 'kitchen' },
    ],
    cooking: { fuel: 'lpg', mealsPerDay: 2 },
    sources: { incensePerDay: 2 },
  },
  nextField: 'done',
  question: null,
  lang: 'hi',
  symptomNotice: false,
};

test('type a Hindi description and watch the profile fill in (R3, FR-1)', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('vayutula.lang', 'hi');
    localStorage.setItem(
      'vayutula.place',
      JSON.stringify({ kind: 'search', name: 'नोएडा', lat: 28.58, lon: 77.33 }),
    );
  });
  await page.route('**/api/intake', (route) => route.fulfill({ json: hindiReply }));
  await page.route('**/api/forecast?*', (route) =>
    route.fulfill({ json: { forecast: liveForecast(), stale: false, ageMinutes: 0 } }),
  );

  await page.goto('/setup');
  await expect(page.getByRole('button', { name: 'इसके बजाय फ़ॉर्म इस्तेमाल करें' })).toBeVisible();
  await page
    .getByLabel('आपका संदेश')
    .fill(
      'मैं और दादी, एक बेडरूम में फिलिप्स AC1215 प्यूरीफ़ायर, बैठक और रसोई। LPG पर दो बार खाना, दो अगरबत्ती।',
    );
  await page.getByRole('button', { name: 'भेजें' }).click();

  await expect(page.getByText('लोग: मैं (वयस्क), दादी (बुज़ुर्ग (60+))')).toBeVisible();
  await expect(page.getByText(/कमरे: बेडरूम \(बेडरूम, 12 m², प्यूरीफ़ायर\)/)).toBeVisible();
  await page.getByRole('button', { name: 'सहेजें और कदम देखें' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'आपके घर के लिए कदम' })).toBeVisible();
  expect(await page.getByRole('heading', { level: 3 }).count()).toBeGreaterThan(2);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
