/**
 * screenshots.spec.ts  — 'screenshots' (desktop) + 'mobile' projects
 *
 * Generates reference screenshots. Lambda mocked, session self-seeded.
 * Output: tests/screenshots/
 */

import { test } from '@playwright/test';
import * as fs from 'fs';
import { mockLambda, seedSession } from './helpers/lambda-mock';
import { GATE_SELECTOR } from '../playwright.config';

const OUT = 'tests/screenshots';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

function slug(page: import('@playwright/test').Page): string {
  const vp = page.viewportSize();
  return vp && vp.width < 600 ? 'mobile' : 'desktop';
}

/* Seed a session + mock the Lambda, then open a (step) page past the gate.
   Selectors are id/onclick-based: the UI is RO-first, so EN text names won't match. */
async function enterApp(page: import('@playwright/test').Page, path = '/') {
  await seedSession(page);
  await mockLambda(page);
  await page.goto(path);
  await page.locator(GATE_SELECTOR).waitFor({ state: 'hidden', timeout: 10_000 });
}

test('01 — gate / login screen', async ({ page }) => {
  await page.goto('/');
  await page.locator(GATE_SELECTOR).waitFor({ state: 'visible', timeout: 5000 });
  await page.screenshot({ path: `${OUT}/01-gate-${slug(page)}.png` });
});

test('02 — step 1 Locație (sun path)', async ({ page }) => {
  await enterApp(page);
  await page.locator('button[onclick="drawCanvas()"]').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/02-sunpath-${slug(page)}.png`, fullPage: true });
});

test('03 — step 6 Producție (yield)', async ({ page }) => {
  await enterApp(page, '/yield.html');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/03-yield-${slug(page)}.png`, fullPage: true });
});

test('04 — step 8 Conectare șiruri (string sizing)', async ({ page }) => {
  await enterApp(page, '/strings.html');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/04-string-${slug(page)}.png`, fullPage: true });
});

test('05 — pay page', async ({ page }) => {
  await page.goto('/pay.html');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/05-pay-${slug(page)}.png`, fullPage: true });
});

test('06 — newsletter signup', async ({ page }) => {
  await page.goto('/subscribe.html');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/06-subscribe-${slug(page)}.png`, fullPage: true });
});
