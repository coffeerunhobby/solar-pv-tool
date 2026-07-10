import { defineConfig, devices } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Site constants — update here if infrastructure changes
// ─────────────────────────────────────────────────────────────────────────────
export const BASE_URL      = process.env.SPV_BASE_URL ?? 'https://solar.coffeerunhobby.ro';
export const LAMBDA_URL    = 'https://n3ky9b78wh.execute-api.eu-central-1.amazonaws.com/';
export const GATE_SELECTOR = '#gate-overlay';
export const LS_KEY        = 'spv_t';                       // localStorage session key (gate.js GATE_KEY)

// Live solar-pv test credentials — used ONLY by the 'setup'/'authenticated' projects.
// Kept OUT of the repo: supply via env so no secret is committed.
//   SPV_TEST_EMAIL=you@example.com SPV_TEST_KEY=XXXX-XXXX-XXXX npm test
// The 'mocked'/'screenshots'/'mobile' projects need NO credentials (they self-seed).
export const TEST_EMAIL    = process.env.SPV_TEST_EMAIL ?? '';
export const TEST_PASSWORD = process.env.SPV_TEST_KEY   ?? '';
export const AUTH_FILE     = '.playwright-auth/user.json'; // saved after global setup

export default defineConfig({
  testDir:   './tests',
  outputDir: './tests/results',
  timeout:   30_000,
  retries:   process.env.CI ? 2 : 0,
  workers:   process.env.CI ? 1 : 2,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/report', open: 'never' }],
  ],

  use: {
    baseURL:           BASE_URL,
    // Use an installed browser channel when set (e.g. PW_CHANNEL=chrome) — needed on
    // macOS 12, where Playwright can no longer download a fresh Chromium. Unset in CI
    // (Linux runners), where the bundled Chromium is used.
    channel:           process.env.PW_CHANNEL || undefined,
    trace:             'on-first-retry',
    screenshot:        'only-on-failure',
    video:             'off',
    viewport:          { width: 1280, height: 800 },
    ignoreHTTPSErrors: false,
  },

  projects: [
    // ── 1. Auth setup — real gate login, saves localStorage to AUTH_FILE ─────
    //    Requires SPV_TEST_EMAIL / SPV_TEST_KEY. Only the 'authenticated'
    //    project depends on this.
    {
      name:      'setup',
      testMatch: /global\.setup\.ts/,
    },

    // ── 2. Authenticated — real Lambda, uses saved session ───────────────────
    //    Good for: smoke tests, confirming the live Lambda + a real key work.
    {
      name:         'authenticated',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
      testMatch: /smoke\.spec\.ts/,
    },

    // ── 3. Mocked — Lambda intercepted, session self-seeded ──────────────────
    //    Needs NO real credentials. UI tests, offline / CI without Lambda.
    {
      name: 'mocked',
      use:  { ...devices['Desktop Chrome'] },
      testMatch: /mocked\.spec\.ts/,
    },

    // ── 4. Screenshots — desktop, mocked + self-seeded ───────────────────────
    {
      name: 'screenshots',
      use:  { ...devices['Desktop Chrome'] },
      testMatch: /screenshots\.spec\.ts/,
    },

    // ── 5. Mobile — screenshots at a narrow viewport ─────────────────────────
    {
      name: 'mobile',
      use:  { ...devices['Pixel 5'] },
      testMatch: /screenshots\.spec\.ts/,
    },

    // ── 6. Accuracy — engine vs PVGIS gate (loads testViz.html) ──────────────
    //    No credentials. Hits TESTVIZ_URL (default :8091), not BASE_URL.
    {
      name: 'accuracy',
      use:  { ...devices['Desktop Chrome'] },
      testMatch: /accuracy\.spec\.ts/,
    },
  ],
});
