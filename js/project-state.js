/* project-state.js — the single client-side project object (Model 2).
   One JSON blob in localStorage; every step page reads/writes it; the final
   client PDF (Phase 5) is generated from it. No backend, works on file://.

   API:
     Project.get()              → the live state object (read freely)
     Project.section(key)       → one top-level section
     Project.patch(key, obj)    → shallow-merge into a section, persist
     Project.markDone(id [,v])  → flag a step complete (drives stepper status)
     Project.isDone(id)         → bool
     Project.reset()            → wipe back to blank
     Project.export()           → deep copy (for PDF / JSON download)
     Project.importState(obj)   → replace the whole state from a parsed JSON export (any version)

   Read-only / shared-view mode (collaboration links):
     Project.enterReadOnly(obj, token) → view a shared snapshot WITHOUT touching the user's own
                                          project; the snapshot lives in its own key, writes become
                                          no-ops. Returns false if obj isn't a compatible export.
     Project.exitReadOnly()            → drop the shared snapshot; the user's own project returns.
     Project.isReadOnly()              → bool
     Project.readOnlyToken()           → the share token currently being viewed (or null) */

const PROJECT_KEY     = 'spv_project';
const PROJECT_RO_KEY  = 'spv_ro';        // share token while viewing a shared design
const PROJECT_RO_DATA = 'spv_ro_data';   // the shared snapshot (separate from the user's own project)
const PROJECT_VERSION = 2;   /* informational tag written into saves; NOT a gate — migrate()
                                accepts any version (saves are fully forward/backward compatible). */

const Project = (function () {
  function blank() {
    return {
      _v:          PROJECT_VERSION,
      /* meta.name = auto "first last" (client). projectName = user-facing project title
         (report/PDF headline, save-list display). projectRef = the STABLE SAVE KEY for the
         backend project store - share.js sends it to share-save/load/delete; auto-generated
         once by Share.ref(), do not edit (overwrite-in-place keys on it). Replaces the
         legacy meta.shareRef name (share.js migrates old blobs). */
      meta:        { first: '', last: '', name: '', address: '',
                     projectName: '', projectRef: '',
                     /* ── Proiect Tehnic admin block (PT-SPEC.md §2). NO seeded defaults:
                        every PT field comes from the state as entered by the user; missing
                        values stay EMPTY and surface as [de completat] in pt.html. ── */
                     beneficiar:  { firma: '', adresa: '', contact: '' },
                     proiectant:  { firma: '', nume: '', atestatSocietate: '',
                                    atestatProiectant: '', adresa: '' },
                     verificator: { nume: '', atestat: '', domeniu: '', firma: '' },
                     faza: '', codDoc: '', editie: null, revizie: null,
                     categoriaImportanta: '', dataIntocmirii: '' },     // pts 1–2 + PT cover
      /* Racordare / grid connection (PT cap. 6 + CEFND) - PT-SPEC.md §2; no defaults */
      grid:        { mode: '',                      // 'no-injection' (SEM) | 'injection'
                     tensiuneRacord: null, tablouRacord: '', ptAlimentare: '',
                     consumAnualKwh: null, atrNr: '', atrData: '' },
      location:    { lat: null, lon: null, elevation: null, tz: 0, terrainHorizon: null, countryCode: null },   // pt 3 (terrainHorizon = deg[36] Nav, auto from horizon tiles; countryCode = ISO2 from reverse-geocode, drives economics e1 prefill)
      orientation: {                                                   // pt 4
        azimuth: null, tilt: null,
        obstacles: [],            // source of truth: [{navAz1,navAz2,pvgisAz1,pvgisAz2,el,lbl}]
        importedHorizon: null,    // a separately-imported 36-value horizon.txt (or null)
        horizon: null,            // derived merged 36-value array (for yield.html / export)
      },
      consumption: { mode: 'simple', monthly: null, annualKwh: null, pricePerKwh: null,
                     appliances: null, coverage: 100, specificYield: null,
                     targetKwp: null, maxPowerKw: null, designKwh: null }, // pt 3 (Consum)
      sizing:      { pvgisKwp: null, annualProdKwh: null, monthlyProd: null,    // pts 7, 10
                     optimalProdKwh: null, optimalMonthlyProd: null,  // "optim" ref (az 0 + opt tilt) for step 11 economics
                     /* Yield model-card settings (so export/import round-trips them):
                        { irrModel, tl, gsc, useTemp, tcModel, uc, uv, powModel, huldSet }.
                        PVGIS imports are PER STRING (strings[].pvgisRef + usePvgis); a
                        legacy global sizing.pvgisRef is migrated to the matching string
                        by yield.html and nulled. */
                     model: null },
      components:  { inverters: [], pfvW: null, pacInv: null, pacInvTotal: null,  // pt 8 — chosen inverter(s) (+ optional battery banks) + totals
                     /* inverters = [{id, inverterId}] (source of truth). inverterId/pacInv mirror the
                        FIRST (representative) inverter, for pages that design around one inverter line. */
                     inverterId: null,
                     /* batteries = [{id, batteryId, count}] (source of truth, OPTIONAL - may be empty for no storage),
                        edited as a B1/B2 bank list like the inverters. batteryId mirrors the FIRST bank (for
                        economics' Expert autoconsum sim); batteryKwhTotal = Σ usable kWh across banks. */
                     batteries: [], batteryId: null, batteryKwhTotal: null,
                     /* representative mirror of strings[0]'s module, for pages that read one module */
                     moduleId: null, count: null, pmax: null, moduleLength: null, moduleWidth: null },
      /* Strings = the array carried through the app. Each String = one inverter input = a group of
         panels of a single type + orientation. Created at Components, refined at Yield/Mounting/§11.
         { id, moduleId, count, azimuth, tilt, losses, optimizer, albedo, ns, np, optangle, usehorizon,
           planeId, mount } — planeId links the string to a roof plane (null/absent = free/legacy);
         mount = { mode:'flush'|'single'|'ew', rackTilt, rackAz, face:'E'|'W' }.
         pvgisRef = per-string imported PVGIS JSON reference { monthlyE[12], monthlyH[12],
         annualE, annualH, sdY, inputs{...} } (one PVGIS run = one orientation = one string);
         usePvgis = bool, makes that string's display/report data the imported E_m. When linked,
         tilt/azimuth are DERIVED (Planes.effOrient: eff γ = plane γ + panel rackAz - the SUM is
         what gets stored here; eff β = plane β [+ rackTilt]) and synced back into these same two
         fields by mounting.html, so every other page (yield, connections, report) keeps reading
         them unchanged. face is the legacy ew fallback when rackAz is null. */
      strings:     [],
      /* Roof planes (optional) — the physical faces panels sit on. Ridge ∥ eave convention, the 4
         lengths in m measured ALONG THE SLOPE (planes.js solves the polygon + packs panels).
         The plane owns tilt/azimuth once strings are linked to it. */
      planes:      [],   // [{ id, top, bottom, left, right, tilt, azimuth, setback }]
      mounting:    { tilt: null, azimuth: null, mode: null, orient: null, hour: null, roofW: null, roofD: null,
                     pitch: null, gap: null, gcr: null, rows: null, total: null, kwp: null }, // pt 9
      stringSizing:{ nsMin: null, nsMax: null, nopt: null, npMax: null, recNs: null,          // pt 11 (§11)
                     vocMax: null, vmpMin: null, tmin: null, tmax: null, vinvmax: null,
                     tamin: null, tamax: null, gmin: null, gmax: null,   // site design inputs (ambient °C, W/m²)
                     nmot: null, voc: null, vmp: null, lv: null,         // module datasheet coeffs (reused by theory.html)
                     isc: null, imp: null, li: null,                     // module current specs + temp coeff (theory.html)
                     stringId: null,                                     // which string §11 analysed
                     stringVocCold: null, valid: null },
      connections: { cables: {}, dropDC: null, phases: null, matAC: null, // step 9 - electrical connections
                     lenAC: null, dropAC: null },                         // cables = { stringId: one-way m }
      protections: { net: null, iccKA: null, distDC: null, distAC: null, // step 10 - switchgear/protection design inputs
                     iprodFV: null, iprodInv: null, bodyOverride: '' },   // datasheet fuse caps + manual fuse-body format override
      economics:   { currency: 'RON', wProdReal: null, wProdOptim: null, wConsum: null,  // step 11 - Analiză economică
                     cfv: null, aprogram: null, e1: null, e2: null, n: null, rate: null,  // Neamț pts 18-19, rel. (21)-(28)
                     scMode: null, rac: null, dayFrac: null, battId: null,               // self-consumption model: 'rata'|'lunar'|'zinoapte'|'baterie'; Rac %; daytime-consumption %; battId = BATTERY_LIST id for the expert battery sim
                     country: null, eurPerWp: null },                                    // country = ISO2 for e1 prefill; eurPerWp = turnkey benchmark for C_FV estimate
      schema:      { layout: {} },                                       // single-line editor: { deviceId: {col,row} } cartouche-cell placement overrides
      defectoscopy:{ moduleId: null, g: null, tc: null, points: [] },     // step 17 - I-V diagnostics; points = VERBATIM UI rows
                                                                          // ({i,v,g,t} raw strings, incl. empties + order) - G/T are PER POINT (readings
                                                                          // drift between rows); top-level g/tc are legacy (migrated into rows on load)
      progress:    {},                                                 // { stepId: true }
    };
  }

  /* Saves are FULLY forward- and backward-compatible — there is no version gate, ever. Any
     project blob loads: a deep-fill overlays the saved values onto blank(), so missing keys
     (older saves) are filled and unknown keys (newer saves) are preserved untouched. The only
     reshaping is the one historical structural break (v1 strings/planes were objects, now arrays).
     `_v` is written as an informational tag only and NEVER decides whether a blob is accepted.
     Returns null only for JSON that isn't an object at all. */
  function _isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
  function _deepFill(base, over) {
    if (!_isObj(over)) return over;                  // arrays/scalars from the save replace the default
    const out = _isObj(base) ? Object.assign({}, base) : {};
    for (const k in over) {
      out[k] = (_isObj(over[k]) && _isObj(out[k])) ? _deepFill(out[k], over[k]) : over[k];
    }
    return out;                                      // base-only keys kept (fill); over-only keys kept (preserve)
  }
  function migrate(obj) {
    if (!_isObj(obj)) return null;
    /* version-AGNOSTIC file-type sanity (NOT a version check): just confirm it's one of our
       blobs, so a wrong file still shows "invalid file" instead of silently wiping to blank. */
    if (!('_v' in obj) && !obj.location && !obj.strings && !obj.sizing && !obj.meta && !obj.progress) return null;
    const o = _deepFill(blank(), obj);
    if (!Array.isArray(o.strings)) o.strings = [];   // v1 {ns,np} → incompatible shape, reset
    if (!Array.isArray(o.planes))  o.planes  = [];
    if (!_isObj(o.progress))       o.progress = {};
    o._v = PROJECT_VERSION;                          // informational stamp only — not a gate
    return o;
  }

  function readOnly() { try { return !!localStorage.getItem(PROJECT_RO_KEY); } catch (e) { return false; } }
  /* In read-only mode the active blob is the shared snapshot, not the user's own project. */
  function load() {
    try {
      const raw = localStorage.getItem(readOnly() ? PROJECT_RO_DATA : PROJECT_KEY);
      if (!raw) return blank();
      return migrate(JSON.parse(raw)) || blank();   // tolerant: migrate across version bumps instead of wiping
    } catch (e) {
      return blank();
    }
  }

  let state = load();

  /* ── Change notification (SPA reactivity — additive, legacy pages unaffected) ──────────
     _version bumps on EVERY mutation (even in read-only mode, where nothing persists but the
     in-memory state changed); _identity bumps when the WHOLE project is replaced (import /
     reset / enter/exit read-only) so UIs can fully remount. Subscribers are notified after
     each bump; React's useSyncExternalStore uses version() as its snapshot. */
  const _subs = new Set();
  let _version = 0, _identity = 0;
  function _emit() { _subs.forEach(cb => { try { cb(); } catch (e) {} }); }

  function save() {
    _version++;
    if (!readOnly()) {   // viewing a shared design — never persist (keeps it read-only + the user's own project untouched)
      try { localStorage.setItem(PROJECT_KEY, JSON.stringify(state)); } catch (e) { /* quota / private mode */ }
    }
    _emit();
  }

  return {
    get()           { return state; },
    section(k)      { return state[k]; },
    set(k, v)       { state[k] = v; save(); },                         // replace a whole section (e.g. the strings array)
    patch(k, obj)   { state[k] = Object.assign(state[k] || {}, obj); save(); },
    markDone(id, v) { if (readOnly()) return; state.progress[id] = v !== false; save(); },
    isDone(id)      { return !!state.progress[id]; },
    reset()         { state = blank(); _identity++; save(); },
    isReadOnly()    { return readOnly(); },
    /* ── SPA reactivity hooks (additive) ── */
    onChange(cb)    { _subs.add(cb); return () => _subs.delete(cb); },
    version()       { return _version; },    // bumps on every mutation
    identity()      { return _identity; },   // bumps when the whole project is replaced
    readOnlyToken() { try { return localStorage.getItem(PROJECT_RO_KEY) || null; } catch (e) { return null; } },
    enterReadOnly(obj, token) {
      try {
        const m = migrate(obj);
        if (!m) return false;
        localStorage.setItem(PROJECT_RO_DATA, JSON.stringify(m));
        localStorage.setItem(PROJECT_RO_KEY, String(token || '1'));
        state = load();
        _identity++; _version++; _emit();
        return true;
      } catch (e) { return false; }
    },
    exitReadOnly() {
      try { localStorage.removeItem(PROJECT_RO_KEY); localStorage.removeItem(PROJECT_RO_DATA); } catch (e) {}
      state = load();
      _identity++; _version++; _emit();
    },
    export()        { return JSON.parse(JSON.stringify(state)); },
    /* Replace the whole state from a parsed JSON export of ANY version (deep-filled onto
       blank()). Returns false only if it isn't one of our project blobs at all. */
    importState(obj) {
      try {
        const m = migrate(obj);
        if (!m) return false;
        state = m;
        _identity++;
        save();
        return true;
      } catch (e) { return false; }
    },
  };
})();
