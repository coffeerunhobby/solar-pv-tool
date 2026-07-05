/**
 * mocked.spec.ts  — 'mocked' project
 *
 * UI tests with the Lambda intercepted and the session self-seeded.
 * Needs NO real credentials and no dependency on the live Lambda.
 * (Static assets + data grids still load from BASE_URL.)
 *
 * Multi-page stepper structure — each step is a separate HTML page:
 *   /              → step 1 (Location + sun-path canvas)
 *   /obstacles.html → step 2 (Horizon / Obstacles)
 *   /yield.html    → step 6 (Yield Calc)
 *   /strings.html  → step 8 (String Sizing)
 */

import { test, expect } from '@playwright/test';
import { mockLambda, mockLambdaInvalid, seedSession } from './helpers/lambda-mock';
import { GATE_SELECTOR } from '../playwright.config';

test.describe('App shell (seeded + mocked)', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await mockLambda(page);
  });

  test('step 1 (Location) loads — gate hidden and sun-path canvas visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(GATE_SELECTOR)).toBeHidden({ timeout: 10_000 });
    await expect(page.locator('#C')).toBeVisible();
  });

  test('draw chart renders without error', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(GATE_SELECTOR)).toBeHidden({ timeout: 10_000 });
    await page.locator('#sp-draw').click();
    await expect(page.locator('#C')).toBeVisible();
  });

  test('yield page (step 6) loads with calc button', async ({ page }) => {
    await page.goto('/yield.html');
    await expect(page.locator(GATE_SELECTOR)).toBeHidden({ timeout: 10_000 });
    await expect(page.locator('#pv-calc-btn')).toBeVisible();
  });

  test('obstacles page (step 2) loads with azimuth field', async ({ page }) => {
    await page.goto('/obstacles.html');
    await expect(page.locator(GATE_SELECTOR)).toBeHidden({ timeout: 10_000 });
    await expect(page.locator('#hz-az1')).toBeVisible();
  });

  test('strings page (step 8) loads with Voc field', async ({ page }) => {
    await page.goto('/strings.html');
    await expect(page.locator(GATE_SELECTOR)).toBeHidden({ timeout: 10_000 });
    await expect(page.locator('#ss-voc')).toBeVisible();
  });

  test('gate stays hidden across step-page navigations', async ({ page }) => {
    for (const url of ['/', '/yield.html', '/obstacles.html', '/strings.html']) {
      await page.goto(url);
      await expect(page.locator(GATE_SELECTOR)).toBeHidden({ timeout: 10_000 });
    }
  });
});

test.describe('Gate behaviour (mocked)', () => {
  test('invalid Lambda + no session shows the gate', async ({ page }) => {
    await mockLambdaInvalid(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator(GATE_SELECTOR)).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#gate-email')).toBeVisible();
  });
});
