/**
 * global.setup.ts
 *
 * Runs ONCE before the 'authenticated' project. Logs in via the gate UI with a
 * REAL solar-pv key, waits for the live Lambda to validate, saves storageState.
 *
 * Requires env: SPV_TEST_EMAIL, SPV_TEST_KEY  (see playwright.config.ts).
 * Output: .playwright-auth/user.json  (gitignored — contains live credentials)
 */

import { test as setup, expect } from '@playwright/test';
import {
  BASE_URL, GATE_SELECTOR, AUTH_FILE,
  TEST_EMAIL, TEST_PASSWORD,
} from '../playwright.config';

setup('authenticate', async ({ page }) => {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error(
      'Missing solar-pv test credentials. Set SPV_TEST_EMAIL and SPV_TEST_KEY ' +
      '(a valid solar-pv email + key) to run the authenticated project. ' +
      'The mocked/screenshots projects need no credentials.'
    );
  }

  await page.goto(BASE_URL);

  // Gate should appear
  await expect(page.locator(GATE_SELECTOR)).toBeVisible({ timeout: 5000 });

  await page.fill('#gate-email', TEST_EMAIL);
  await page.fill('#gate-key',   TEST_PASSWORD);
  await page.click('#gate-btn');

  // Wait for the live Lambda to validate and the gate to dismiss (cold start up to 12 s)
  await expect(page.locator(GATE_SELECTOR)).toBeHidden({ timeout: 12_000 });

  // The stepper shell (multi-page workflow chrome) should now be visible
  await expect(page.locator('#site-stepper')).toBeVisible();

  await page.context().storageState({ path: AUTH_FILE });
  console.log(`✓  Auth saved → ${AUTH_FILE}`);
});
