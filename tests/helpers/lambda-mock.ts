/**
 * helpers/lambda-mock.ts
 *
 * Intercepts Lambda calls and (optionally) seeds a logged-in session, so UI
 * tests run with NO real credentials and no dependency on the live Lambda.
 *
 * Usage:
 *   import { mockLambda, seedSession } from './helpers/lambda-mock';
 *   test('...', async ({ page }) => {
 *     await seedSession(page);   // gate will silently pass
 *     await mockLambda(page);    // silent re-validation returns { valid: true }
 *     await page.goto('/');
 *   });
 */

import { Page } from '@playwright/test';
import { LAMBDA_URL, LS_KEY } from '../../playwright.config';

const LAMBDA_BASE = LAMBDA_URL.replace(/\/$/, '');

async function _fulfill(page: Page, pattern: string, body: object, status = 200) {
  await page.route(pattern, route =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  );
}

/**
 * Seed a stored gate session BEFORE the page loads, so gate.js finds it on
 * startup and (with mockLambda) silently re-validates → gate never shows.
 * Must be called before page.goto(). The key is fake — it only works together
 * with mockLambda(); against the real Lambda it would be cleared as invalid.
 */
export async function seedSession(
  page: Page,
  email = 'test@example.com',
  key   = 'TEST-TEST-TEST'
) {
  await page.addInitScript(
    ([k, e, key]) => {
      try { localStorage.setItem(k, JSON.stringify({ email: e, key, ts: Date.now() })); } catch {}
    },
    [LS_KEY, email, key] as const
  );
}

/** Catch-all: returns { valid: true } for every Lambda call. */
export async function mockLambda(page: Page, response = { valid: true }) {
  await _fulfill(page, `${LAMBDA_URL}**`, response);
}

export async function mockLambdaInvalid(page: Page) {
  return mockLambda(page, { valid: false });
}

/** Mock POST /subscribe — default: success with a test token. */
export async function mockSubscribe(
  page: Page,
  response: object = { success: true, token: 'test-token-abc123', already_subscribed: false }
) {
  await _fulfill(page, `${LAMBDA_BASE}/subscribe`, response);
}

/** Mock POST /unsubscribe — default: success. */
export async function mockUnsubscribe(
  page: Page,
  response: object = { success: true }
) {
  await _fulfill(page, `${LAMBDA_BASE}/unsubscribe`, response);
}
