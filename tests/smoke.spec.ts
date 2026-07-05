/**
 * smoke.spec.ts  — 'authenticated' project (real Lambda + saved session)
 *
 * Fast sanity checks against the live site. Requires the 'setup' project to
 * have logged in with a real solar-pv key (SPV_TEST_EMAIL / SPV_TEST_KEY).
 */

import { test, expect } from '@playwright/test';
import { GATE_SELECTOR } from '../playwright.config';

test.describe('Homepage', () => {
  test('loads without gate after login, shows the stepper shell + step 1 content', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(GATE_SELECTOR)).toBeHidden({ timeout: 12_000 });
    await expect(page.locator('#site-stepper')).toBeVisible();   // workflow sidebar (site-nav.js)
    await expect(page.locator('#C')).toBeVisible();              // sun-path canvas
    await expect(page.locator('#map')).toBeVisible();            // location mini-map
  });
});

test.describe('Gate (logged out, real Lambda)', () => {
  // Override the project's saved session so the gate actually shows.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('gate appears with email + key fields', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(GATE_SELECTOR)).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#gate-email')).toBeVisible();
    await expect(page.locator('#gate-key')).toBeVisible();
  });

  test('gate shows Get access button + Newsletter / Discord / Technical support', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(GATE_SELECTOR)).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('link', { name: 'Get access' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Newsletter' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Discord' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Technical support' })).toBeVisible();
  });

  test('wrong credentials show an error', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#gate-email')).toBeVisible({ timeout: 8000 });
    await page.fill('#gate-email', 'wrong@example.com');
    await page.fill('#gate-key',   'NOPE-NOPE-NOPE');
    await page.click('#gate-btn');
    await expect(page.locator('#gate-err')).toContainText('Invalid', { timeout: 12_000 });
  });
});
