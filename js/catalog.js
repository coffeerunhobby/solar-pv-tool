/* catalog.js — runtime loader for the equipment DB (modules / inverters /
   batteries), so the catalog updates WITHOUT an app release and works offline.

   PRECEDENCE:  bundled seed  <  localStorage cache  <  remote (CDN manifest)
     - Seed: the inline MODULE_LIST / INVERTER_LIST / BATTERY_LIST (+ *_BRANDS)
       globals from string-ui.js / battery-list.js (loaded BEFORE this file).
     - Cache: applied SYNCHRONOUSLY at load if newer than the seed → the DB shows
       the latest known catalog instantly, offline.
     - Remote: a background (or button-triggered) fetch of data/db/manifest.json;
       for each registry whose hashed filename DIFFERS, the immutable hashed file
       is fetched, validated, cached, and applied. Any failure → keep current.

   In-place mutation (`arr.length=0; push(...)`) keeps the SAME array reference the
   React DB pages captured (`const DATA = MODULE_LIST`), so a sync updates them once
   a re-render is triggered via Catalog.onChange (useCatalog store).

   CDN layout (see scripts/build-db-json.cjs):
     data/db/manifest.json                 { version, date, files, counts }  (short cache)
     data/db/<registry>.<hash>.json        { brands, rows }                  (immutable)

   Loads in BOTH the browser (classic global `Catalog`) and Node (require, for
   tests). MUST load AFTER string-ui.js + battery-list.js. */

(function (root) {
  'use strict';

  /* Stamped by scripts/build-db-json.cjs — the seed's version + the hashed
     filenames it was generated from. DO NOT hand-edit. */
  var CATALOG_SEED = {"version":3,"files":{"modules":"modules.d57e08fe.json","inverters":"inverters.c7fb3b02.json","batteries":"batteries.b507f97f.json"}};

  var CACHE_KEY = 'spv_catalog';
  var CDN_ORIGIN = 'https://solar.coffeerunhobby.ro/';   // absolute for the mobile WebView (localhost origin)
  var DB_PATH = 'data/db/';

  /* registry key ↔ the global arrays it feeds. Referenced directly (they are
     lexical globals from the preceding classic scripts, mutated in place); the
     `typeof` guard avoids a ReferenceError if a page loaded catalog.js without
     them, and keeps us CSP-safe (no eval). */
  function registries() {
    return [
      { key: 'modules',   list: (typeof MODULE_LIST     !== 'undefined') ? MODULE_LIST     : undefined,
                          brands: (typeof MODULE_BRANDS   !== 'undefined') ? MODULE_BRANDS   : undefined },
      { key: 'inverters', list: (typeof INVERTER_LIST   !== 'undefined') ? INVERTER_LIST   : undefined,
                          brands: (typeof INVERTER_BRANDS !== 'undefined') ? INVERTER_BRANDS : undefined },
      { key: 'batteries', list: (typeof BATTERY_LIST     !== 'undefined') ? BATTERY_LIST     : undefined,
                          brands: (typeof BATTERY_BRANDS  !== 'undefined') ? BATTERY_BRANDS  : undefined },
    ];
  }

  /* ── state ──────────────────────────────────────────────────────────────── */
  var _files = clone(CATALOG_SEED.files);   // currently-applied hashed filenames per registry
  var _catVersion = CATALOG_SEED.version;   // manifest version currently applied (precedence)
  var _tick = 0;                            // snapshot for useSyncExternalStore (bumps on every apply)
  var _subs = [];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function onChange(cb) { _subs.push(cb); return function () { _subs = _subs.filter(function (f) { return f !== cb; }); }; }
  function version() { return _tick; }
  function dataVersion() { return _catVersion; }
  function notify() { _tick++; for (var i = 0; i < _subs.length; i++) { try { _subs[i](); } catch (e) {} } }

  /* ── apply a {modules?,inverters?,batteries?} bundle IN PLACE ─────────────── */
  function applyOne(listArr, brandsArr, data) {
    if (!listArr || !data || !Array.isArray(data.rows)) return;
    listArr.length = 0; Array.prototype.push.apply(listArr, data.rows);
    if (brandsArr && Array.isArray(data.brands)) { brandsArr.length = 0; Array.prototype.push.apply(brandsArr, data.brands); }
  }
  function applyCatalog(bundle) {
    var reg = registries();
    for (var i = 0; i < reg.length; i++) if (bundle[reg[i].key]) applyOne(reg[i].list, reg[i].brands, bundle[reg[i].key]);
  }
  function validate(key, data) {
    if (!data || !Array.isArray(data.rows) || !data.rows.length) throw new Error('catalog ' + key + ': empty/invalid');
    for (var i = 0; i < data.rows.length; i++) if (!data.rows[i] || !data.rows[i].id || !data.rows[i].name)
      throw new Error('catalog ' + key + ': row ' + i + ' missing id/name');
    return data;
  }

  /* ── snapshot the live globals into the localStorage cache ────────────────── */
  function persist() {
    try {
      var reg = registries(), data = {};
      for (var i = 0; i < reg.length; i++) if (reg[i].list) data[reg[i].key] = { brands: reg[i].brands || [], rows: reg[i].list };
      root.localStorage.setItem(CACHE_KEY, JSON.stringify({ version: _catVersion, files: _files, data: data }));
    } catch (e) {}
  }

  /* ── fetch (web: same-origin relative; mobile: absolute CDN via CapacitorHttp) ── */
  function isNative() { return !!(root.Capacitor && root.Capacitor.isNativePlatform && root.Capacitor.isNativePlatform()); }
  function fetchJson(rel, noCache) {
    if (isNative() && root.CapacitorHttp) {
      var url = CDN_ORIGIN + rel + (noCache ? ('?_=' + _tick + '_' + rel.length) : '');
      return root.CapacitorHttp.get({ url: url, headers: noCache ? { 'Cache-Control': 'no-cache' } : {} })
        .then(function (r) { return typeof r.data === 'string' ? JSON.parse(r.data) : r.data; });
    }
    return root.fetch(rel, noCache ? { cache: 'no-cache' } : {}).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + rel); return r.json();
    });
  }

  /* ── sync: fetch manifest, hash-diff, fetch+apply only changed registries ─── */
  function check() {
    return fetchJson(DB_PATH + 'manifest.json', true).then(function (man) {
      if (!man || !man.files || typeof man.version !== 'number') throw new Error('bad manifest');
      if (man.version <= _catVersion) return { updated: false, version: _catVersion };
      var reg = registries();
      var jobs = reg.filter(function (r) { return man.files[r.key] && man.files[r.key] !== _files[r.key]; })
        .map(function (r) {
          return fetchJson(DB_PATH + man.files[r.key], false).then(function (d) {
            validate(r.key, d); return { key: r.key, file: man.files[r.key], data: d };
          });
        });
      return Promise.all(jobs).then(function (res) {
        if (!res.length) { _catVersion = man.version; return { updated: false, version: man.version }; }
        var bundle = {};
        for (var i = 0; i < res.length; i++) { bundle[res[i].key] = res[i].data; _files[res[i].key] = res[i].file; }
        applyCatalog(bundle);
        _catVersion = man.version;
        persist();
        notify();
        return { updated: true, version: man.version, changed: res.map(function (r) { return r.key; }), counts: man.counts };
      });
    });
  }

  /* ── boot: synchronous cache overlay, then a non-blocking background refresh ── */
  function boot() {
    try {
      var c = JSON.parse(root.localStorage.getItem(CACHE_KEY));
      if (c && typeof c.version === 'number' && c.version > _catVersion && c.data) {
        applyCatalog(c.data);
        _catVersion = c.version;
        if (c.files) _files = c.files;
      }
    } catch (e) {}
    if (root.setTimeout) root.setTimeout(function () { check().catch(function () {}); }, 0);
  }

  var Catalog = {
    onChange: onChange, version: version, dataVersion: dataVersion, sync: check,
    _applyCatalog: applyCatalog, _validate: validate, SEED: CATALOG_SEED,   // exposed for tests
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Catalog; }
  else { root.Catalog = Catalog; root.CatalogSync = { check: check }; boot(); }
})(typeof self !== 'undefined' ? self : this);
