#!/usr/bin/env node
/* build-db-json.cjs — export the bundled SEED equipment registries to the served
   CDN catalog: content-hashed immutable JSON files + one tiny manifest.

   The registries (MODULE_LIST / INVERTER_LIST / BATTERY_LIST + their *_BRANDS)
   are classic-script globals in js/string-ui.js + js/battery-list.js. We execute
   those files in a vm sandbox (browser shims) and capture the arrays — no edit to
   the seed files, and the JSON is guaranteed == the seed on first export.

   Output (js/catalog.js reverses this at runtime):
     data/db/manifest.json                       { version, date, files, counts }
     data/db/<registry>.<hash>.json              { brands, rows }  (immutable)
   A registry's filename is <registry>.<sha256(content)[0:8]>.json, so unchanged
   data ⇒ identical filename (idempotent); a change ⇒ a new immutable file.

   Usage:  node scripts/build-db-json.cjs            # write data/db/
           node scripts/build-db-json.cjs --check    # report only, exit 1 on drift */

'use strict';
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');
const crypto = require('crypto');

const REPO   = path.join(__dirname, '..');
const OUT    = path.join(REPO, 'data', 'db');
const CHECK  = process.argv.includes('--check');

/* ── load the seed globals from the classic scripts (browser shims) ─────────── */
function loadSeed() {
  const noop = () => {};
  const el = () => ({ style: {}, classList: { add: noop, remove: noop, toggle: noop },
                      appendChild: noop, setAttribute: noop, addEventListener: noop, querySelector: () => null,
                      querySelectorAll: () => [] });
  const documentShim = {
    addEventListener: noop, removeEventListener: noop, createElement: el, createElementNS: el,
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    body: el(), head: el(), documentElement: el(),
  };
  const sandbox = {
    console, Math, Date, JSON, Object, Array, Number, String, Boolean, RegExp, parseInt, parseFloat, isNaN,
    window: {}, self: {}, document: documentShim, navigator: { userAgent: 'node' },
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    location: { href: '', hash: '', search: '' }, setTimeout: noop, clearTimeout: noop,
  };
  sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const files = ['js/battery-list.js', 'js/string-ui.js'];         // battery-list BEFORE string-ui
  const src = files.map((f) => fs.readFileSync(path.join(REPO, f), 'utf8')).join('\n;\n');
  const capture = `;globalThis.__SEED__ = {
    modules:       typeof MODULE_LIST     !== 'undefined' ? MODULE_LIST     : null,
    inverters:     typeof INVERTER_LIST   !== 'undefined' ? INVERTER_LIST   : null,
    batteries:     typeof BATTERY_LIST    !== 'undefined' ? BATTERY_LIST    : null,
    moduleBrands:  typeof MODULE_BRANDS   !== 'undefined' ? MODULE_BRANDS   : [],
    inverterBrands:typeof INVERTER_BRANDS !== 'undefined' ? INVERTER_BRANDS : [],
    batteryBrands: typeof BATTERY_BRANDS  !== 'undefined' ? BATTERY_BRANDS  : [],
  };`;
  vm.runInContext(src + capture, sandbox, { filename: 'seed-bundle.js' });
  const s = sandbox.__SEED__;
  for (const k of ['modules', 'inverters', 'batteries']) {
    if (!Array.isArray(s[k]) || !s[k].length) throw new Error(`seed load: ${k} missing/empty`);
  }
  return s;
}

/* ── content hash of the exact bytes we write ───────────────────────────────── */
function hash8(str) { return crypto.createHash('sha256').update(str).digest('hex').slice(0, 8); }

const REGISTRIES = [
  { key: 'modules',   rows: 'modules',   brands: 'moduleBrands' },
  { key: 'inverters', rows: 'inverters', brands: 'inverterBrands' },
  { key: 'batteries', rows: 'batteries', brands: 'batteryBrands' },
];

function build() {
  const seed = loadSeed();
  const prevManifest = readJsonOrNull(path.join(OUT, 'manifest.json'));
  const files = {}, counts = {}, contents = {};
  for (const r of REGISTRIES) {
    const payload = { brands: seed[r.brands], rows: seed[r.rows] };
    const json = JSON.stringify(payload, null, 2) + '\n';
    const name = `${r.key}.${hash8(json)}.json`;
    files[r.key] = name; counts[r.key] = seed[r.rows].length; contents[name] = json;
  }

  /* monotonic version: bump only when the file set changed */
  const changed = !prevManifest || REGISTRIES.some((r) => prevManifest.files?.[r.key] !== files[r.key]);
  const version = changed ? ((prevManifest && prevManifest.version) || 0) + 1 : prevManifest.version;

  if (CHECK) {
    console.log(`check: version ${version}${changed ? ' (WOULD CHANGE)' : ' (up to date)'}`);
    for (const r of REGISTRIES) console.log(`  ${r.key.padEnd(10)} ${counts[r.key]} rows → ${files[r.key]}`);
    process.exit(changed && prevManifest ? 1 : 0);
  }

  fs.mkdirSync(OUT, { recursive: true });
  /* write hashed files (skip if identical name already present) */
  for (const [name, json] of Object.entries(contents)) {
    const p = path.join(OUT, name);
    if (!fs.existsSync(p)) fs.writeFileSync(p, json);
  }
  const manifest = { version, date: new Date().toISOString().slice(0, 10), files, counts };
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  /* stamp the seed floor into js/catalog.js so the bundled seed's version+files
     match this export (the offline precedence floor). */
  const catPath = path.join(REPO, 'js', 'catalog.js');
  const seedLit = JSON.stringify({ version, files });
  const cat = fs.readFileSync(catPath, 'utf8');
  const stamped = cat.replace(/var CATALOG_SEED = \{.*?\};/, `var CATALOG_SEED = ${seedLit};`);
  if (stamped !== cat) fs.writeFileSync(catPath, stamped);

  /* prune old unreferenced <registry>.<hash>.json LOCALLY (no CDN-propagation
     window locally; the S3-side prune in deploy.sh handles the live grace). */
  const keep = new Set(Object.values(files));
  let pruned = 0;
  for (const f of fs.readdirSync(OUT)) {
    if (f === 'manifest.json' || keep.has(f)) continue;
    if (/^(modules|inverters|batteries)\.[0-9a-f]{8}\.json$/.test(f)) { fs.unlinkSync(path.join(OUT, f)); pruned++; }
  }
  console.log(`build-db-json: manifest v${version} (${manifest.date})`);
  for (const r of REGISTRIES) console.log(`  ${r.key.padEnd(10)} ${counts[r.key]} rows → ${files[r.key]}`);
  if (pruned) console.log(`  pruned ${pruned} superseded hashed file(s) locally`);
}

function readJsonOrNull(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }

build();
