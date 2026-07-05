/* cap-prep.mjs — prepare dist/ for the Capacitor webview bundle.

   Capacitor's webview serves webDir (dist/) as static files with NO SPA
   fallback. In-app navigation is pure History-API pushState so it never
   touches the file server, but a HARD load of a deep .html path (app cold
   start deep-linked, or a full reload) makes the webview fetch that literal
   file. So we mirror the S3 shell-copy trick locally: every PORTED route's
   .html becomes a byte copy of dist/index.html. React Router then boots at
   that path and renders the right route — identical to production on S3.

   Run AFTER `vite build`, BEFORE `cap sync`. See MOBILE.md. */

import { copyFileSync, existsSync, cpSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORTED_PATHS } from '../src/ported.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = resolve(ROOT, '..');
const DIST = resolve(ROOT, 'dist');
const SHELL = resolve(DIST, 'index.html');

if (!existsSync(SHELL)) {
  console.error('cap-prep: dist/index.html missing — run `npm run build` first.');
  process.exit(1);
}

/* 1) Shell copies for deep .html routing (mirrors the S3 deploy trick).
   '/' and '/index.html' are already served by dist/index.html; the dev-only
   pilot route is never bundled. Everything else gets a shell copy. */
const SKIP = new Set(['/', '/index.html', '/app-pilot.html']);
let n = 0;
for (const p of PORTED_PATHS) {
  if (SKIP.has(p)) continue;
  const name = p.replace(/^\//, '');       // '/yield.html' -> 'yield.html'
  copyFileSync(SHELL, resolve(DIST, name));
  n++;
}
console.log(`cap-prep: mirrored the shell into ${n} route file(s) under dist/.`);

/* 2) Stage the legacy static layer the shell loads by absolute path
   (/js /css /vendor /data). On S3/dev these are served alongside; a bundled
   webview has no such server, so they must live inside webDir. For a FULLY OFFLINE
   app we bundle ALL of data/, INCLUDING the data/horizon/ terrain-horizon tiles
   (needed so mountain shading works with no network) — no lazy-fetch from the
   production origin. Only the gate Lambda (auth) + PVGIS import (user-initiated) +
   the Leaflet basemap tiles remain network. See MOBILE.md. */
for (const dir of ['js', 'css', 'vendor']) {
  cpSync(resolve(REPO, dir), resolve(DIST, dir), { recursive: true });
}
cpSync(resolve(REPO, 'data'), resolve(DIST, 'data'), { recursive: true });
/* Obfuscate the value grids IN THE BUNDLE so the offline APK never ships pristine
   grids — the SAME block-shuffle + per-block XOR (js/grid-deshuffle.js, in-memory
   key blob) deploy.sh applies for S3. Overwrites the plain copies staged above;
   horizon-index.png + everything else stays plain. The loaders reverse it via the
   tEXt 'obf' marker. Keep this list in sync with OBF_GRIDS in deploy.sh. */
const OBF_GRIDS = ['elevation.png', 'kt-global.png', 'temp1.png', 'tl1.png', 'wind1.png', 'extremewind1.png'];
execFileSync(process.execPath,
  [resolve(REPO, 'scripts', 'shuffle-grids.cjs'), '--dir', resolve(REPO, 'data'), resolve(DIST, 'data'), ...OBF_GRIDS],
  { stdio: 'inherit' });
console.log(`cap-prep: obfuscated ${OBF_GRIDS.length} value grids in the bundle (offline scraping deterrent).`);
/* root statics the shell references by absolute path */
for (const f of ['favicon.ico', 'logo.png']) {
  const src = resolve(REPO, f);
  if (existsSync(src)) copyFileSync(src, resolve(DIST, f));
}
console.log('cap-prep: staged /js /css /vendor /data (excl. horizon tiles) + root statics into dist/.');

/* 3) Standalone reference pages the nav links to but that are NOT ported React
   routes (site-map.js phaseMaps — the "Harti" grid-map viz pages). They are
   self-contained and load /js /vendor /data by absolute path — all staged above
   — so copying the HTML is enough. Without this they 404 in the bundled webview
   (no file server, no SPA fallback), e.g. tapping tempViz from the menu. Keep in
   sync with the phaseMaps entries in js/site-map.js. */
const STANDALONE_PAGES = [
  'elevationViz.html', 'ktViz.html', 'tlViz.html',
  'tempViz.html', 'windViz.html', 'extremeWindViz.html',
];
let m = 0;
for (const f of STANDALONE_PAGES) {
  const src = resolve(REPO, f);
  if (existsSync(src)) { copyFileSync(src, resolve(DIST, f)); m++; }
}
console.log(`cap-prep: staged ${m} standalone reference page(s) into dist/.`);
