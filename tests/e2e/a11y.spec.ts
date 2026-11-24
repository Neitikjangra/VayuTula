import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './helpers';

const profile = {
  city: 'Noida',
  lat: 28.58,
  lon: 77.33,
  lang: 'en',
  members: [
    { id: 'm1', label: 'Me', ageGroup: 'adult', sensitive: false },
    { id: 'm2', label: 'Kid', ageGroup: 'child', sensitive: true },
  ],
  rooms: [
    {
      id: 'r1',
      name: 'Bedroom',
      kind: 'bedroom',
      areaM2: 12,
      heightM: 2.8,
      purifierId: 'philips-ac1215',
      occupancy: [
        { memberId: 'm1', fromHour: 0, toHour: 24 },
        { memberId: 'm2', fromHour: 0, toHour: 24 },
      ],
    },
    { id: 'r2', name: 'Kitchen', kind: 'kitchen', areaM2: 7, heightM: 2.8, occupancy: [] },
  ],
  cooking: { fuel: 'lpg', mealsPerDay: 2, mealHours: [8, 20], chimney: false, kitchenDoor: false },
  sources: { incensePerDay: 2, coilNightsPerWeek: 0, smokerIndoors: false },
  commute: { mode: 'car', kmPerDay: 20, daysPerWeek: 5 },
  budgetTier: 2000,
};

async function seed(page: Page, lang = 'en') {
  await page.addInitScript(
    ({ p, l }) => {
      localStorage.setItem('vayutula.profile', JSON.stringify(p));
      localStorage.setItem(
        'vayutula.place',
        JSON.stringify({ kind: 'search', name: 'Noida', lat: 28.58, lon: 77.33 }),
      );
      localStorage.setItem('vayutula.lang', l);
    },
    { p: profile, l: lang },
  );
  await mockApi(page);
}

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const summary = results.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`);
  expect(summary).toEqual([]);
}

test('home with today’s plan and an open why panel has no axe violations', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  const plan = page.getByRole('list', { name: "Today's plan" });
  await plan.getByRole('button', { name: 'Why this step?' }).first().click();
  await expect(plan.getByText('What we used')).toBeVisible();
  await expect(page.getByText(/Purifier hours logged this week/)).toBeVisible();
  await expectNoViolations(page);
});

test('setup chat and form have no axe violations', async ({ page }) => {
  await mockApi(page);
  await page.goto('/setup');
  await expect(page.getByLabel('Your message')).toBeVisible();
  await expectNoViolations(page);
  await page.getByRole('button', { name: 'Use the form instead' }).click();
  await expect(page.getByRole('button', { name: 'Save and see actions' })).toBeVisible();
  await expectNoViolations(page);
});

test('the Hindi home page has no axe violations', async ({ page }) => {
  await seed(page, 'hi');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'आज की योजना' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  await expectNoViolations(page);
});
