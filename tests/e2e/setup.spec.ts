import { expect, test } from '@playwright/test';
import { mockApi } from './helpers';

test('setup with the form, then today’s plan and its why panel (R4)', async ({ page }) => {
  await mockApi(page);
  await page.goto('/setup');
  await page.getByLabel('City or area').fill('Noida');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('button', { name: 'Noida, Uttar Pradesh, India' }).click();
  await expect(page.getByText('Using Noida.')).toBeVisible();
  await page.getByRole('button', { name: 'Use the form instead' }).click();

  await page.getByRole('button', { name: 'Add person' }).click();
  await page.getByLabel('Name or nickname').nth(1).fill('Kid');
  await page.getByLabel('Age group').nth(1).selectOption('child');
  await page.getByLabel('Air purifier').first().selectOption('philips-ac1215');
  await page.getByLabel('Incense sticks a day').fill('2');
  await page.getByLabel('Budget for air improvements').selectOption('2000');
  await page.getByRole('button', { name: 'Save and see actions' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: "Today's plan" })).toBeVisible();
  const plan = page.getByRole('list', { name: "Today's plan" });
  const items = plan.getByRole('heading', { level: 3 });
  await expect(items.first()).toBeVisible();
  expect(await items.count()).toBeGreaterThanOrEqual(3);
  expect(await items.count()).toBeLessThanOrEqual(5);
  await expect(plan.getByText(/^When: /).first()).toBeVisible();
  await expect(plan.getByText('Breathe in').first()).toBeVisible();
  await expect(plan.getByText('Provisional').first()).toBeVisible();

  await plan.getByRole('button', { name: 'Why this step?' }).first().click();
  await expect(plan.getByText('What we used')).toBeVisible();
  await expect(plan.getByText('Values used')).toBeVisible();
  await expect(plan.getByTitle('factors.deposition').first()).toContainText(
    'Particles settling indoors (per hour)',
  );

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
