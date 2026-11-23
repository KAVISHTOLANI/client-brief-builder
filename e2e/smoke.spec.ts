import { expect, test } from '@playwright/test';
import { checkMobile, snap } from './helpers';

test('create a brief, fix gaps, export', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Agree the work');
  await expect(page.locator('.hero .sec-list li').first()).toBeVisible();
  await page.waitForTimeout(900);
  await snap(page, 'landing');
  await checkMobile(page, 'landing-mobile');

  await page.getByRole('link', { name: 'Open your briefs' }).click();
  await page.getByLabel('Client', { exact: true }).fill('Riverside Library');
  await page.getByLabel('Project', { exact: true }).fill('Events website');
  await page.getByRole('button', { name: 'Create brief' }).click();
  await page.getByLabel('Background').fill('The library runs forty events a month but lists them in a PDF that is hard to search, especially on phones, and staff update it by hand every week.');
  await page.getByRole('button', { name: 'Goals →' }).click();
  await page.getByRole('button', { name: '+ Add goal' }).click();
  await page.getByLabel('Goal 1', { exact: true }).fill('Make events easy to find');
  await page.getByLabel(/How you’ll know it worked/).fill('Event page visits up 50% within 6 months');
  await snap(page, 'wizard');
  await checkMobile(page);
  await page.reload();
  await expect(page.getByLabel('Goal 1', { exact: true })).toHaveValue('Make events easy to find');

  await page.goto('./#/brief/demo-bakery/risks');
  await expect(page.getByRole('img', { name: /Risk matrix/ })).toBeVisible();
  await snap(page, 'risks');
  await page.getByRole('link', { name: 'Review & export' }).click();
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download .md' }).click();
  expect((await dl).suggestedFilename()).toBe('online-ordering-for-collection.md');
  await snap(page, 'review');
  await checkMobile(page, 'review-mobile');
});
