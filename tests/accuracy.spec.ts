/**
 * accuracy.spec.ts  — 'accuracy' project — the engine-vs-PVGIS CI gate.
 *
 * Loads testViz.html, which runs the FULL yield engine against the 69 PVGIS
 * reference points (terrain horizon ON), and asserts the aggregate deltas stay
 * within threshold. This protects the physics from SILENT regressions: a
 * refactor (or a stray concurrent edit) that degrades accuracy fails CI here,
 * instead of only being caught by eyeball on testViz.
 *
 * Baseline (v1.2.4, horizon ON): mean |ΔE| 3.02% · mean |ΔH| 2.61% ·
 * max |ΔE| 11.1% (Sydney — S-hemisphere outlier, not horizon) · max |ΔH| 8.25%.
 * Thresholds sit ~0.5 pp (means) / ~2 pp (maxes) above baseline — pass today,
 * trip on a real regression. Re-baseline deliberately (and note why in CHANGELOG)
 * if a genuine model improvement moves them.
 *
 * Fixtures: testViz.html + the core grids + the 17 test-point horizon tiles
 * (committed via `git add -f`) + horizon-index.png, served at TESTVIZ_URL
 * (default :8091, repo root — the observability server). Runs horizon-ON;
 * testViz.html?flat is the horizon-independent variant (much looser, not used here).
 */
import { test, expect } from '@playwright/test';

const TESTVIZ = process.env.TESTVIZ_URL ?? 'http://localhost:8091/testViz.html';

test('engine vs PVGIS: aggregate accuracy within thresholds', async ({ page }) => {
  test.setTimeout(120_000);
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(e.message));

  await page.goto(TESTVIZ, { waitUntil: 'load' });
  const r: any = await page
    .waitForFunction(() => (window as any).__TESTVIZ__, null, { timeout: 100_000 })
    .then((h) => h.jsonValue());

  console.log('accuracy:', JSON.stringify(r));
  expect(errs, 'testViz page errors').toEqual([]);
  expect(r.n, 'PVGIS reference point count (fixture is exactly 69 — guard against silently dropping points)').toBe(69);

  expect(r.meanAbsDE, 'mean |ΔE| % (energy)').toBeLessThan(3.5);
  expect(r.meanAbsDH, 'mean |ΔH| % (irradiance)').toBeLessThan(3.2);
  expect(r.maxAbsDE, `max |ΔE| % — worst: ${JSON.stringify(r.worst5?.[0])}`).toBeLessThan(13);
  expect(r.maxAbsDH, 'max |ΔH| %').toBeLessThan(10);
});
