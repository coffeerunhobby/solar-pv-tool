/* Yield (step 6) — React port of yield.html using the LEGACY-DRIVER pattern
   (exemplar: Economics.jsx). The page is DOM-driven end to end: the multi-string
   runner runYieldMulti reads every input by id, renders metrics/charts/tables via
   innerHTML, and the per-string cards are HTML-string builders with delegated
   wiring. React owns: the skeleton (all legacy ids/classes), static labels (t()),
   the learn toggle, re-render on language/theme/learn switches, chart destruction
   on unmount. The entire inline IIFE is transplanted VERBATIM into setupYield()
   below, except: window.runYield/renderList/saveStep/onThemeChange/doRunYield/
   drawDaily globals removed (React + local wiring drive those), SiteNav.refresh()
   removed, Explain.wireToggle replaced by the React toggle, and the 5 page-level
   helpers from js/yield-ui.js (syncDeclinModel, getIrradianceModel, getDeclinFn,
   getTransposeName, toggleTcModel) are INLINED so yield-ui.js — whose global
   runYield() reads removed legacy ids and is invoked by applyI18n's re-run hook —
   must NOT be loaded in the SPA shell. Persistence/markDone stay identical to
   legacy (doRunYield persists sizing + strings and marks the step done). */
import { useEffect, useRef } from 'react';
import { useI18n } from '../store/useI18n.js';
import { useTheme } from '../store/useTheme.js';
import { useLearn, setLearn } from '../store/useLearn.js';
import SmartLink from '../components/SmartLink.jsx';
import './Yield.css';

export default function Yield() {
  const { t, lang } = useI18n();
  const { dark } = useTheme();
  const { on: learnOn } = useLearn();
  const api = useRef(null);   // { render, destroy } from the transplanted engine

  useEffect(() => {
    api.current = setupYield();   // full legacy init (location + cards + model restore + autoRun)
    return () => { api.current && api.current.destroy(); api.current = null; };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  /* language / theme / learn-mode changes → legacy re-render (rebuild the string
     cards in the new language and, if results are shown, recompute — this is the
     legacy window.renderList body, which also repaints both charts). */
  useEffect(() => { api.current && api.current.render(); }, [lang, dark, learnOn]);

  const h10 = { fontSize: 10, color: 'var(--text3)' };
  const info = { fontSize: 14, color: 'var(--text3)', textDecoration: 'none', opacity: 0.7, lineHeight: 1 };
  const hoverOn = (e) => { e.currentTarget.style.opacity = '1'; };
  const hoverOff = (e) => { e.currentTarget.style.opacity = '.7'; };
  const grp = { marginTop: '.7rem', paddingTop: '.6rem', borderTop: '0.5px solid var(--border)' };
  const chartTitle = { fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: '.6rem' };

  return (
    <>
      <div className="sn-crumb"><b>{t('nav.phaseB')}</b> › <span>{t('nav.yield')}</span></div>
      <div className="pv-scroll">
        <div id="loc-note" className="loc-note" />
        <div className="row g-3">
          {/* ── left panel: per-string cards + shared model card ── */}
          <div className="col-md-3 col-12 panel">
            <div id="pv-panel">
              {/* per-String PV system + orientation cards injected here */}
              <div id="pv-strings" />

              {/* shared model card */}
              <div className="card">
                <div className="sec">{t('pv.irr_model')}</div>
                <div className="rg">
                  <label>
                    <input type="radio" name="irr-model" value="hofierka" defaultChecked />
                    {' '}PVGIS Hofierka/Suri (2002) <span style={h10}>(Linke turbidity T<sub>L</sub>)</span>
                  </label>
                  <label>
                    <input type="radio" name="irr-model" value="ineichen" />
                    {' '}Ineichen/Perez <span style={h10}>(clear-sky + K<sub>t</sub> cloud index)</span>
                    {' '}<SmartLink href="ktViz.html" newTab title="View Kₜ clearness index map" style={info} onMouseOver={hoverOn} onMouseOut={hoverOff}>ⓘ</SmartLink>
                  </label>
                </div>
                {/* shared hidden file input for the PER-STRING PVGIS imports (cards set the target string) */}
                <input type="file" id="pvgis-file" accept=".json,application/json" style={{ display: 'none' }} />
                <div id="tl-row" style={{ display: 'none', marginTop: '.5rem' }}>
                  <div className="field">
                    <label>
                      Linke turbidity T<sub>L</sub> <span style={h10}>leave blank for auto (2-7)</span>
                      {' '}<SmartLink href="tlViz.html" newTab title="View Tₗ climatology map" style={info} onMouseOver={hoverOn} onMouseOut={hoverOff}>ⓘ</SmartLink>
                    </label>
                    <input type="number" id="pv-tl" placeholder="auto" min="1" max="9" step="0.1" />
                  </div>
                </div>
                <div style={grp}>
                  <div className="sec" style={{ marginBottom: '.4rem' }}><span>{t('pv.declin')}</span> <span style={h10}>(auto)</span></div>
                  <div className="rg" id="declin-rg" style={{ pointerEvents: 'none', opacity: 0.6 }}>
                    <label>
                      <input type="radio" name="declin-model" value="hofierka" defaultChecked />
                      {' '}Hofierka/Suri (2002) <span style={h10}>±0.2° - PVGIS native</span>
                    </label>
                    <label>
                      <input type="radio" name="declin-model" value="spencer" />
                      {' '}Spencer (1971) <span style={h10}>±0.035° - 7-term Fourier series</span>
                    </label>
                  </div>
                </div>
                <div style={grp}>
                  <div className="sec" style={{ marginBottom: '.4rem' }}><span>{t('pvs.transp')}</span> <span style={h10}>(auto)</span></div>
                  <div className="rg" id="transpose-rg" style={{ pointerEvents: 'none', opacity: 0.6 }}>
                    <label>
                      <input type="radio" name="transpose-model" value="muneer" defaultChecked />
                      {' '}Muneer (1990) <span style={h10}>N-term anisotropic - PVGIS native algorithm</span>
                    </label>
                    <label>
                      <input type="radio" name="transpose-model" value="haydavies" />
                      {' '}Hay-Davies (1980) <span style={h10}>circumsolar only</span>
                    </label>
                  </div>
                </div>
                <div style={grp}>
                  <div className="sec" style={{ marginBottom: '.4rem' }}>{t('pv.constants')}</div>
                  <div className="field">
                    <label>Solar constant G<sub>sc</sub> (W/m²) <span style={h10}>WRC=1361 · PVGIS=1360.8 · TIS=1361.5</span></label>
                    <input type="number" id="pv-gsc" defaultValue="1361" min="1350" max="1380" step="0.1" />
                  </div>
                  <div className="rg" style={{ marginTop: '.5rem' }}>
                    <label>
                      <input type="checkbox" id="pv-usetemp" defaultChecked />
                      {' '}<span>Apply temperature derating</span>
                      {' '}<SmartLink href="tempViz.html" newTab title="View monthly temperature grid" style={info} onMouseOver={hoverOn} onMouseOut={hoverOff}>ⓘ</SmartLink>
                    </label>
                  </div>
                  <div className="rg" style={{ marginTop: '.4rem' }}>
                    <div style={{ fontSize: 11 }}><span>{t('pv.pow_huld')}</span> <span style={h10}>{t('pv.pow_huldhint')}</span></div>
                  </div>
                  <div className="field" id="pv-huld-set-row" style={{ marginTop: '.3rem' }}>
                    <select id="pv-huld-set" defaultValue="csi2025" style={{ fontSize: 11 }}>
                      <option value="csi2025">c-Si 2025 (PVGIS implicit)</option>
                      <option value="csi">c-Si original (Huld 2010)</option>
                    </select>
                  </div>
                  <div id="pv-temp-fields">
                    <div className="rg" style={{ marginBottom: '.4rem' }}>
                      <label>
                        <input type="radio" name="tc-model" value="noct" defaultChecked />
                        {' '}NOCT <span style={h10}>IEC 61215 standard</span>
                      </label>
                      <label>
                        <input type="radio" name="tc-model" value="faiman" />
                        {' '}Faiman <span style={h10}>U<sub>c</sub>+U<sub>v</sub>·wind - more accurate</span>
                        {' '}<SmartLink href="windViz.html" newTab title="View monthly wind speed grid" style={info} onMouseOver={hoverOn} onMouseOut={hoverOff}>ⓘ</SmartLink>
                      </label>
                    </div>
                    {/* NOCT mode needs no shared input: NOCT is taken per-module */}
                    <div id="tc-noct-fields" />
                    <div id="tc-faiman-fields" style={{ display: 'none' }}>
                      <div className="row2">
                        <div className="field">
                          <label>U<sub>c</sub> (W/m²K) <span style={h10}>constant loss · PVGIS 26.9</span></label>
                          <input type="number" id="pv-uc" defaultValue="26.9" min="10" max="50" step="0.1" />
                        </div>
                        <div className="field">
                          <label>U<sub>v</sub> (W/m²K/ms⁻¹) <span style={h10}>wind · PVGIS 6.2</span></label>
                          <input type="number" id="pv-uv" defaultValue="6.2" min="0" max="20" step="0.1" />
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: '.3rem' }}>{t('pvs.temphint')}</div>
                  </div>
                  <div className="field" id="pv-t2m-row" style={{ display: 'none' }}>
                    <label>Site T<sub>2m</sub> <span style={h10}>NASA POWER monthly mean</span></label>
                    <div id="pv-t2m-info" style={{ fontSize: 12, color: 'var(--text2)', padding: '3px 0', letterSpacing: '.01em' }} />
                  </div>
                </div>
                <button id="pv-calc-btn" className="btn btn-p w-100" style={{ marginTop: '.5rem' }}>{t('pv.calc')}</button>
              </div>
            </div>
          </div>

          {/* ── results ── */}
          <div className="col-md-9 col-12">
            <div id="pvgis-area" className="pvgis-wrap">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                <label className="xpl-toggle">
                  <input type="checkbox" id="pv-learn" checked={learnOn} onChange={(e) => setLearn(e.target.checked)} />
                  {' '}<span>{t('xpl.learnmode')}</span>
                </label>
              </div>
              <div className="metric-grid" id="pv-metrics" />
              <div className="chart-row">
                <div className="pvgis-chart-wrap">
                  <div style={chartTitle}>{t('chart.monthly_energy')}</div>
                  <div style={{ position: 'relative', height: 220 }}><canvas id="pv-chart" role="img" aria-label="Monthly PV energy bar chart" /></div>
                </div>
                <div className="pvgis-chart-wrap">
                  <div className="day-bar">
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{t('pvs.dailycurve')}</div>
                    <select id="day-season" className="form-select form-select-sm" defaultValue="equinox">
                      <option value="summer">{t('pvs.season_summer')}</option>
                      <option value="equinox">{t('pvs.season_equinox')}</option>
                      <option value="winter">{t('pvs.season_winter')}</option>
                    </select>
                  </div>
                  <div style={{ position: 'relative', height: 220 }}><canvas id="day-chart" role="img" aria-label="Daily production curve" /></div>
                </div>
              </div>
              <div className="pvgis-chart-wrap">
                <div style={chartTitle}>{t('pvs.breakdown')}</div>
                <table id="pv-breakdown" />
              </div>
              <div className="pvgis-chart-wrap">
                <div style={chartTitle}>{t('chart.monthly_table')}</div>
                <div id="pv-table-tabs" />
                <table className="month-table" id="pv-table" />
              </div>
              <div className="note" id="pv-note" />
              <div id="pv-explain" className="xpl-host" />
            </div>
          </div>
        </div>

        {/* hidden location inputs consumed by the grid stack (filled from the project) */}
        <input type="hidden" id="lat" /><input type="hidden" id="lon" />
        <input type="hidden" id="tz" defaultValue="0" /><input type="hidden" id="site-elevation" defaultValue="0" />
      </div>
    </>
  );
}

/* ═══ Transplanted legacy engine (yield.html inline IIFE, verbatim except:
   window.runYield/renderList/saveStep/onThemeChange/doRunYield/drawDaily removed
   (render() below = the legacy renderList body; React's [lang,dark,learnOn]
   effect calls it); SiteNav.refresh() removed; Explain.wireToggle removed (the
   React toggle + useLearn drive re-renders; Explain.render still gates #pv-explain
   visibility on Explain.isOn()); inline onchange/onclick attributes rewired via
   addEventListener (nodes die with the component — no leak); yield-ui.js's five
   page helpers inlined at the top; the lazy terrain-tile callback calls the local
   runYieldMulti (legacy referenced the neutralised window.runYield no-op);
   dead-flag guards added to the async paths (autoRun poll, FileReader, tile). ═══ */
function setupYield() {
  'use strict';

  var dead = false;

  /* ── inlined from js/yield-ui.js (page-level model helpers) ── */
  function syncDeclinModel() {
    var irr = (document.querySelector('input[name="irr-model"]:checked') || {}).value || 'hofierka';
    /* 'pvgis' = manual PVGIS import: the comparison engine runs the PVGIS-native chain */
    var isHof = irr === 'hofierka' || irr === 'pvgis';
    var declin = document.querySelector('input[name="declin-model"][value="' + (isHof ? 'hofierka' : 'spencer') + '"]');
    if (declin) declin.checked = true;
    var transpose = document.querySelector('input[name="transpose-model"][value="' + (isHof ? 'hofierka' : 'haydavies') + '"]');
    if (transpose) transpose.checked = true;
  }
  function getIrradianceModel() {
    var modelName  = (document.querySelector('input[name="irr-model"]:checked') || {}).value || 'ineichen';
    var tlOverride = parseFloat((document.getElementById('pv-tl') || {}).value);
    var siteElevM  = parseFloat((document.getElementById('site-elevation') || {}).value) || 0;
    if (modelName === 'hofierka') {
      return function (elDeg, n, lat) { return clearSkyHofierka(elDeg, n, lat, isNaN(tlOverride) ? null : tlOverride, siteElevM); };
    }
    return clearSkyIneichen;
  }
  function getDeclinFn() {
    var sel = (document.querySelector('input[name="declin-model"]:checked') || {}).value || 'spencer';
    return sel === 'hofierka' ? declinationHofierka : declinationSpencer;
  }
  function getTransposeName() {
    return (document.querySelector('input[name="transpose-model"]:checked') || {}).value || 'muneer';
  }
  function toggleTcModel() {
    var faiman = (document.querySelector('input[name="tc-model"]:checked') || {}).value === 'faiman';
    document.getElementById('tc-noct-fields').style.display   = faiman ? 'none' : '';
    document.getElementById('tc-faiman-fields').style.display = faiman ? '' : 'none';
  }

  /* STR_COLORS comes from js/constants.js (shared per-string palette) */
  var SEASONS = { summer: { n: 172, mo: 5 }, equinox: { n: 80, mo: 2 }, winter: { n: 355, mo: 11 } };
  function tr(k) { return (typeof t === 'function') ? t(k) : k; }

  /* ── Location + elevation from Step 1 ── */
  var loc = Project.section('location');
  var noteEl = document.getElementById('loc-note');
  if (loc && loc.lat != null && loc.lon != null) {
    document.getElementById('lat').value = loc.lat;
    document.getElementById('lon').value = loc.lon;
    if (loc.tz != null) document.getElementById('tz').value = loc.tz;
    if (loc.elevation != null && !isNaN(loc.elevation)) document.getElementById('site-elevation').value = loc.elevation;
    noteEl.textContent = '📍 ' + (+loc.lat).toFixed(4) + ', ' + (+loc.lon).toFixed(4) +
      (loc.elevation != null ? ' · ' + Math.round(loc.elevation) + ' m' : '');
  } else {
    document.getElementById('lat').value = 45.9432;
    document.getElementById('lon').value = 24.9668;
    document.getElementById('tz').value = 2;
    noteEl.innerHTML = '⚠ <a href="index.html" style="color:var(--clr-primary)">' +
      (typeof t === 'function' ? t('nav.location') : 'Location') + '</a> - set your site location first (using a default for now).';
  }

  /* ── Feed saved obstacles/horizon so "Apply horizon" uses buildHorizonArr() ── */
  var orient = Project.section('orientation');
  if (orient) {
    if (Array.isArray(orient.obstacles) && orient.obstacles.length) {
      setObstacles(orient.obstacles.map(function (o) { return Object.assign({}, o); }));
    }
    if (Array.isArray(orient.importedHorizon)) {
      setImportedHorizon(orient.importedHorizon.slice());
    } else if (Array.isArray(orient.horizon) && orient.horizon.some(function (v) { return v > 0; }) &&
               !(orient.obstacles && orient.obstacles.length)) {
      setImportedHorizon(orient.horizon.slice());
    }
  }

  /* ── Strings (source of truth from Components) ── */
  function defaultString() {
    var m = (typeof MODULE_LIST !== 'undefined' && MODULE_LIST[0]) ? MODULE_LIST[0].id : '';
    return { id: 1, moduleId: m, count: 10, azimuth: 0, tilt: 35, losses: 14, optimizer: 0, albedo: 0.2 };
  }
  var strings = Project.section('strings');
  if (!Array.isArray(strings) || !strings.length) strings = [defaultString()];

  function modById(id) {
    return (typeof MODULE_LIST !== 'undefined') ? MODULE_LIST.find(function (m) { return m.id === id; }) : null;
  }

  /* ── Model-UI helpers (legacy window.* for HTML onclick — local here, wired below) ── */
  function onModelChange() {
    var sel = (document.querySelector('input[name="irr-model"]:checked') || {}).value;
    var row = document.getElementById('tl-row');
    if (row) row.style.display = sel === 'hofierka' ? '' : 'none';
  }
  function toggleTempDerating() {
    var on = (document.getElementById('pv-usetemp') || {}).checked;
    var f = document.getElementById('pv-temp-fields');
    var r = document.getElementById('pv-t2m-row');
    if (f) f.style.display = on ? '' : 'none';
    if (r && !on) r.style.display = 'none';
  }
  function togglePowModel() {
    var huld = (document.querySelector('input[name="pow-model"]:checked') || {}).value !== 'gamma';
    var row = document.getElementById('pv-huld-set-row');
    if (row) row.style.display = huld ? '' : 'none';
  }

  /* legacy inline onchange="syncDeclinModel()" + the onModelChange listener */
  document.querySelectorAll('input[name="irr-model"]').forEach(function (r) {
    r.addEventListener('change', function () { syncDeclinModel(); onModelChange(); });
  });
  document.querySelectorAll('input[name="tc-model"]').forEach(function (r) {
    r.addEventListener('change', toggleTcModel);
  });
  document.getElementById('pv-usetemp').addEventListener('change', toggleTempDerating);

  /* Restore saved model-card settings (so export/import round-trips them). */
  (function () {
    var sm = (Project.section('sizing') || {}).model;
    if (!sm) return;
    if (sm.irrModel) { var rr = document.querySelector('input[name="irr-model"][value="' + sm.irrModel + '"]'); if (rr) rr.checked = true; }
    if (sm.tl != null && sm.tl !== '') document.getElementById('pv-tl').value = sm.tl;
    if (sm.gsc != null) document.getElementById('pv-gsc').value = sm.gsc;
    if (sm.useTemp != null) document.getElementById('pv-usetemp').checked = !!sm.useTemp;
    if (sm.tcModel) { var tm = document.querySelector('input[name="tc-model"][value="' + sm.tcModel + '"]'); if (tm) tm.checked = true; }
    if (sm.uc != null) document.getElementById('pv-uc').value = sm.uc;
    if (sm.uv != null) document.getElementById('pv-uv').value = sm.uv;
    if (sm.powModel) { var pm = document.querySelector('input[name="pow-model"][value="' + sm.powModel + '"]'); if (pm) pm.checked = true; }
    if (sm.huldSet) document.getElementById('pv-huld-set').value = sm.huldSet;
  })();

  onModelChange();
  togglePowModel();
  syncDeclinModel();
  toggleTcModel();
  toggleTempDerating();

  /* ── PER-STRING PVGIS references (imported "json" exports from re.jrc.ec.europa.eu) ──
     One PVGIS run = one orientation = one STRING. Each string card has its own import
     button; the parsed reference lives on the string (s.pvgisRef) with a per-string
     s.usePvgis checkbox that makes the imported monthly E_m that string's OFFICIAL data
     (display, totals, persisted sizing → report). The engine ALWAYS runs per string, so
     the monthly table's "vs PVGIS" tabs show engine-vs-import deltas aggregated over the
     strings that have an import - energy AND in-plane irradiance. */
  function fnum(v) { return (+v).toFixed(2).replace(/\.?0+$/, ''); }
  function validRef(r) { return !!(r && Array.isArray(r.monthlyE) && r.monthlyE.length === 12); }

  /* legacy migration: the short-lived GLOBAL sizing.pvgisRef (one orientation) is moved to
     the string whose β/γ match the import (±1°); sizing.model.irrModel 'pvgis' → usePvgis */
  (function () {
    var sz = Project.section('sizing') || {};
    var r = sz.pvgisRef;
    if (!validRef(r)) return;
    var inp = r.inputs || {};
    var tgt = strings.find(function (s) {
      return Math.abs((s.tilt != null ? s.tilt : 999) - (inp.slope != null ? inp.slope : -999)) <= 1 &&
             Math.abs((s.azimuth != null ? s.azimuth : 999) - (inp.azimuth != null ? inp.azimuth : -999)) <= 1;
    });
    if (tgt && !tgt.pvgisRef) {
      tgt.pvgisRef = r;
      if (sz.model && sz.model.irrModel === 'pvgis') tgt.usePvgis = true;
      Project.set('strings', strings);
    }
    Project.patch('sizing', { pvgisRef: null });
  })();

  function parsePvgisJson(obj) {
    try {
      var rows = obj && obj.outputs && obj.outputs.monthly && obj.outputs.monthly.fixed;
      var tot  = obj && obj.outputs && obj.outputs.totals && obj.outputs.totals.fixed;
      if (!Array.isArray(rows) || rows.length !== 12 || !tot) return null;
      var mE = new Array(12).fill(null), mH = new Array(12).fill(null);
      rows.forEach(function (r) {
        var m = (r.month | 0) - 1;
        if (m >= 0 && m < 12) { mE[m] = +r.E_m; mH[m] = +r['H(i)_m']; }
      });
      if (mE.some(function (v) { return v == null || isNaN(v); })) return null;
      var inp = obj.inputs || {};
      var locn = inp.location || {}, met = inp.meteo_data || {}, pv = inp.pv_module || {};
      var mnt = ((inp.mounting_system || {}).fixed) || {};
      return {
        monthlyE: mE, monthlyH: mH,
        annualE: +tot.E_y || mE.reduce(function (a, b) { return a + b; }, 0),
        annualH: +tot['H(i)_y'] || mH.reduce(function (a, b) { return a + b; }, 0),
        sdY: tot.SD_y != null ? +tot.SD_y : null,
        inputs: {
          lat: locn.latitude, lon: locn.longitude, elevation: locn.elevation,
          slope: mnt.slope && mnt.slope.value, azimuth: mnt.azimuth && mnt.azimuth.value,
          peakKwp: pv.peak_power, loss: pv.system_loss, tech: pv.technology,
          db: met.radiation_db, meteoDb: met.meteo_db,
          yearMin: met.year_min, yearMax: met.year_max, useHorizon: !!met.use_horizon,
        },
      };
    } catch (e) { return null; }
  }

  /* Per-string summary line under the import button: source DB + period, kWp, β/γ,
     annual, clear link, plus ⚠ when the import's kWp or β/γ disagree with the string. */
  function pvgisSumHtml(s) {
    if (!validRef(s.pvgisRef)) return tr('pv.pvgisnone');
    var ref = s.pvgisRef, inp = ref.inputs || {};
    var mod = modById(s.moduleId);
    var kwpStr = mod ? mod.pmax * (s.count || 0) / 1000 : 0;
    var warns = '';
    if (inp.peakKwp != null && kwpStr > 0 && Math.abs(inp.peakKwp - kwpStr) / kwpStr > 0.01)
      warns += '<br><span style="color:#c47d12">' + tr('pv.pvgiskwp') + ': ' + fnum(inp.peakKwp) + ' vs ' + fnum(kwpStr) + ' kWp</span>';
    if ((inp.slope != null && s.tilt != null && Math.abs(inp.slope - s.tilt) > 1) ||
        (inp.azimuth != null && s.azimuth != null && Math.abs(inp.azimuth - s.azimuth) > 1))
      warns += '<br><span style="color:#c47d12">' + tr('pv.pvgisang') + ': β ' + fnum(inp.slope || 0) + '°/γ ' + fnum(inp.azimuth || 0) +
               '° vs ' + fnum(s.tilt || 0) + '°/' + fnum(s.azimuth || 0) + '°</span>';
    return '✓ <b>' + (inp.db || 'PVGIS') + '</b>' +
      (inp.yearMin ? ' ' + inp.yearMin + '-' + inp.yearMax : '') +
      ' · ' + fnum(inp.peakKwp || 0) + ' kWp · β ' + fnum(inp.slope || 0) + '° / γ ' + fnum(inp.azimuth || 0) + '°' +
      (inp.useHorizon ? ' · ' + tr('pv.pvgishz') : '') +
      ' · <b>' + fmt0(ref.annualE) + '</b> ' + tr('pv.pvgisyr') +
      ' · <a href="#" class="pvg-clear" style="color:var(--clr-primary)">' + tr('pv.pvgisclear') + '</a>' + warns;
  }

  function rerunIfShown() {
    var m = document.getElementById('pv-metrics');
    if (m && m.children.length) runYieldMulti();
  }

  /* the shared hidden file input serves whichever card requested the import */
  var _pvgisImportSid = null;
  document.getElementById('pvgis-file').addEventListener('change', function () {
    var f = this.files && this.files[0]; this.value = '';
    var s = strings.find(function (x) { return x.id === _pvgisImportSid; });
    if (!f || !s) return;
    var rd = new FileReader();
    rd.onload = function () {
      if (dead) return;
      var ref = null;
      try { ref = parsePvgisJson(JSON.parse(rd.result)); } catch (e) { ref = null; }
      var card = document.querySelector('.pv-str[data-sid="' + s.id + '"] .pvg-sum');
      if (!ref) {
        if (card) card.innerHTML = '<span style="color:#e53935">' + tr('pv.pvgisbad') + '</span>';
        return;
      }
      s.pvgisRef = ref;
      Project.set('strings', strings);
      renderStringCards(); rerunIfShown();
    };
    rd.readAsText(f);
  });

  /* ── Render per-String cards ── */
  function albedoOpts(v) {
    var opts = [['0.2', 'pv.albedo.grass'], ['0.1', 'pv.albedo.dark'], ['0.3', 'pv.albedo.concrete'], ['0.6', 'pv.albedo.snow']];
    return opts.map(function (o) {
      return '<option value="' + o[0] + '"' + (Math.abs(+o[0] - (+v)) < 1e-9 ? ' selected' : '') + '>' + tr(o[1]) + '</option>';
    }).join('');
  }

  function renderStringCards() {
    var host = document.getElementById('pv-strings');
    host.innerHTML = strings.map(function (s, i) {
      var mod = modById(s.moduleId);
      var kwp = mod ? (mod.pmax * (s.count || 0) / 1000).toFixed(2) : '0.00';
      var color = STR_COLORS[i % STR_COLORS.length];
      var multi = strings.length > 1;
      return '' +
        '<div class="card pv-str" data-sid="' + s.id + '">' +
          '<div class="sec"><span class="str-tag" style="background:' + color + ';margin-right:6px">S' + (i + 1) + '</span>' +
            '<span style="font-size:10px;color:var(--text3);font-weight:400">' + (mod ? mod.name : '-') + '</span></div>' +
          '<div class="row2">' +
            '<div class="field"><label>' + tr('pvs.panels') + '</label><input type="number" data-f="count" value="' + (s.count || 0) + '" min="1" max="100000" step="1"></div>' +
            '<div class="field"><label>' + tr('pvs.strpower') + '</label><input type="text" class="kwp-out" value="' + kwp + ' kWp" disabled></div>' +
          '</div>' +
          '<div class="field"><label>' + tr('pvs.losses') + ' <span style="font-size:10px;color:var(--text3)">' + tr('pvs.losseshint') + '</span></label>' +
            '<input type="number" data-f="losses" value="' + (s.losses != null ? s.losses : 14) + '" min="0" max="80" step="1"></div>' +
          '<div class="field"><label>' + tr('pvs.optimizer') + ' <span style="font-size:10px;color:var(--text3)">' + tr('pvs.optimizerhint') + '</span></label>' +
            '<input type="number" data-f="optimizer" value="' + (s.optimizer || 0) + '" min="0" max="30" step="0.5"></div>' +
          '<div class="field"><label>' + tr('pvs.albedo') + '</label><select data-f="albedo">' + albedoOpts(s.albedo != null ? s.albedo : 0.2) + '</select></div>' +
          '<div class="row2">' +
            '<div class="field"><label>' + tr('mnt.tilt') + '</label><input type="number" data-f="tilt" value="' + (s.tilt != null ? s.tilt : 35) + '" min="0" max="90" step="1"' + (s.planeId != null ? ' disabled' : '') + '></div>' +
            '<div class="field"><label>' + tr('pvs.azimuth') + ' <span style="font-size:10px;color:var(--text3)">' + tr('pvs.azimuthhint') + '</span></label>' +
              '<input type="number" data-f="azimuth" value="' + (s.azimuth != null ? s.azimuth : 0) + '" min="-180" max="180" step="5"' + (s.planeId != null ? ' disabled' : '') + '></div>' +
          '</div>' +
          (s.planeId != null ? '<div style="font-size:10px;color:var(--text3);margin-top:2px">' + tr('pln.locknote') + '</div>' : '') +
          '<div style="margin-top:.45rem;padding-top:.45rem;border-top:0.5px solid var(--border)">' +
            '<button type="button" class="btn btn-sm btn-outline-secondary w-100 pvg-imp">' + tr('pv.pvgisimport') + '</button>' +
            '<div class="pvg-sum" style="font-size:10px;color:var(--text3);margin-top:3px;line-height:1.55">' + pvgisSumHtml(s) + '</div>' +
            (validRef(s.pvgisRef)
              ? '<label style="font-size:11px;margin-top:2px;display:flex;gap:5px;align-items:center"><input type="checkbox" data-f="usepvgis"' + (s.usePvgis ? ' checked' : '') + '> ' + tr('pvs.usepvgis') + '</label>'
              : '') +
          '</div>' +
          '<div class="rg" style="margin-top:.3rem">' +
            '<label><input type="checkbox" data-f="optangle"' + (s.optangle ? ' checked' : '') + (s.planeId != null ? ' disabled' : '') + '> ' + tr('pv.opt') + '</label>' +
            '<label><input type="checkbox" data-f="usehorizon"' + (s.usehorizon === false ? '' : ' checked') + '> ' + tr('pv.usehorizon') + '</label>' +
          '</div>' +
        '</div>';
    }).join('');
  }
  renderStringCards();

  /* Keep the strings array in sync with card edits */
  /* per-string PVGIS import / clear (delegated - cards re-render) */
  document.getElementById('pv-strings').addEventListener('click', function (e) {
    var card = e.target.closest('.pv-str'); if (!card) return;
    var s = strings.find(function (x) { return x.id === +card.dataset.sid; }); if (!s) return;
    if (e.target.closest('.pvg-imp')) {
      _pvgisImportSid = s.id;
      document.getElementById('pvgis-file').click();
    } else if (e.target.closest('.pvg-clear')) {
      e.preventDefault();
      s.pvgisRef = null; s.usePvgis = false;
      Project.set('strings', strings);
      renderStringCards(); rerunIfShown();
    }
  });

  document.getElementById('pv-strings').addEventListener('input', function (e) {
    var card = e.target.closest('.pv-str'); if (!card) return;
    var s = strings.find(function (x) { return x.id === +card.dataset.sid; }); if (!s) return;
    var f = e.target.dataset.f; if (!f) return;
    if (f === 'count')          s.count     = parseInt(e.target.value, 10) || 0;
    else if (f === 'losses')    s.losses    = parseFloat(e.target.value) || 0;
    else if (f === 'optimizer') s.optimizer = parseFloat(e.target.value) || 0;
    else if (f === 'albedo')    s.albedo    = parseFloat(e.target.value) || 0.2;
    else if (f === 'tilt')      s.tilt      = parseFloat(e.target.value) || 0;
    else if (f === 'azimuth')   s.azimuth   = parseFloat(e.target.value) || 0;
    else if (f === 'usepvgis')  { s.usePvgis = e.target.checked; Project.set('strings', strings); rerunIfShown(); }
    if (f === 'count') {
      var mod = modById(s.moduleId);
      var out = card.querySelector('.kwp-out');
      if (out && mod) out.value = (mod.pmax * s.count / 1000).toFixed(2) + ' kWp';
    }
  });

  /* ── Daily clear-sky profile for one string on a representative day ── */
  var _daily = null;   // { perStr:[{label,color,power[]}], hours[], lat, lon, tz, clearSkyFn, declinFn, transposeName, tcOpts, useTemp }
  var dailyChart = null;

  function stringDailyProfile(ctx, p, n, mo) {
    var hours = [], power = [];
    var T2m = (typeof resolveTemp === 'function') ? resolveTemp(ctx.lat, ctx.lon, mo) : null;
    for (var h = 4; h <= 20.0001; h += 0.25) {
      var sun = sunPos(ctx.lat, ctx.lon, ctx.tz, n, h, 'lst', ctx.declinFn);
      var dc = 0;
      if (sun && sun.el > 0 && !(p.useHz && typeof isShaded === 'function' && isShaded(sun.az, sun.el, ctx.hzArr))) {
        var cs = ctx.clearSkyFn(sun.el, n, ctx.lat, ctx.lon);
        var tp = {};
        if (ctx.transposeName === 'hofierka' || ctx.transposeName === 'muneer') transposeHofierka(sun, cs, p.tilt, p.az, p.albedo, n, tp);
        else if (ctx.transposeName === 'perez')    transposePerez(sun, cs, p.tilt, p.az, p.albedo, n, tp);
        else                                        transposeHayDavies(sun, cs, p.tilt, p.az, p.albedo, n, tp);
        /* same power chain as calcYield: effective irradiance (IAM) + huld/gamma model */
        var gammaEff = ctx.useTemp ? p.gamma : 0;
        dc = _powerSample(tp.geff, T2m, p.noct, gammaEff, ctx.tcOpts, ctx.lat, ctx.lon, mo) * p.peakKwp * p.pr;   // kW (DC, clear-sky)
      }
      hours.push(h); power.push(dc);
    }
    return { hours: hours, power: power };
  }

  function drawDaily() {
    if (dead || !_daily) return;
    var season = document.getElementById('day-season').value;
    var sd = SEASONS[season] || SEASONS.equinox;
    var dark = (typeof isDark === 'function') ? isDark() : false;

    var hours = null;
    var datasets = _daily.perStr.map(function (p, i) {
      var prof = stringDailyProfile(_daily, p, sd.n, sd.mo);
      hours = prof.hours;
      return {
        label: p.label, data: prof.power.map(function (v) { return +v.toFixed(3); }),
        borderColor: p.color, backgroundColor: p.color, borderWidth: 1.5, pointRadius: 0, tension: 0.35, fill: false,
      };
    });
    // combined (sum) curve - only meaningful with >1 string
    if (_daily.perStr.length > 1 && hours) {
      var total = hours.map(function (_, k) {
        return _daily.perStr.reduce(function (a, p, i) { return a + (datasets[i].data[k] || 0); }, 0);
      });
      datasets.push({
        label: tr('pvs.total'), data: total.map(function (v) { return +v.toFixed(3); }),
        borderColor: dark ? '#fff' : '#111', backgroundColor: 'rgba(0,0,0,0.04)', borderWidth: 2.5, pointRadius: 0, tension: 0.35, fill: true,
      });
    }

    if (dailyChart) { dailyChart.destroy(); dailyChart = null; }
    dailyChart = new Chart(document.getElementById('day-chart'), {
      type: 'line',
      data: { labels: hours.map(function (h) { return h; }), datasets: datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: datasets.length > 1, labels: { color: dark ? '#ccc' : '#444', boxWidth: 12, font: { size: 10 } } },
          tooltip: { callbacks: { title: function (c) { return 'Ora ' + (+c[0].label).toFixed(2); }, label: function (c) { return c.dataset.label + ': ' + (c.raw).toFixed(2) + ' kW'; } } },
        },
        scales: {
          x: { title: { display: true, text: tr('pvs.localtime'), color: dark ? '#aaa' : '#555' }, grid: { color: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }, ticks: { color: dark ? '#aaa' : '#555', maxTicksLimit: 9, callback: function (v, i) { var h = hours[i]; return (h % 2 === 0) ? h + 'h' : ''; } } },
          y: { beginAtZero: true, grid: { color: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }, ticks: { color: dark ? '#aaa' : '#555', callback: function (v) { return v + ' kW'; } } },
        },
      },
    });
  }
  document.getElementById('day-season').addEventListener('change', drawDaily);

  /* ── Main multi-String run ── */
  var monthlyChart = null;
  var lastTotals = { kwp: null, annual: null };
  var lastByString = null;

  var _running = false;
  function runYieldMulti() {
    if (dead || !strings.length || _running) return;
    _running = true;
    try { _runYieldMultiInner(); } finally { _running = false; }
  }
  function _runYieldMultiInner() {
    GSC = parseFloat(document.getElementById('pv-gsc').value) || 1361;
    var lat = parseFloat(document.getElementById('lat').value);
    var lon = parseFloat(document.getElementById('lon').value);
    var tz  = parseFloat(document.getElementById('tz').value) || 0;
    var useTemp = document.getElementById('pv-usetemp') ? document.getElementById('pv-usetemp').checked : true;
    var tcModel = (document.querySelector('input[name="tc-model"]:checked') || {}).value || 'noct';
    var uc = parseFloat(document.getElementById('pv-uc').value) || 26.9;
    var uv = parseFloat(document.getElementById('pv-uv').value) || 6.2;
    var powModel = (document.querySelector('input[name="pow-model"]:checked') || {}).value || 'huld';
    var huldSet  = (document.getElementById('pv-huld-set') || {}).value || 'csi2025';
    var tcOpts = { tcModel: tcModel, uc: uc, uv: uv, powModel: powModel, huldSet: huldSet };
    var clearSkyFn    = getIrradianceModel();
    var declinFn      = getDeclinFn();
    var transposeName = getTransposeName();
    var hzArr = (typeof buildHorizonArr === 'function') ? buildHorizonArr() : new Array(36).fill(0);
    var terrHz = (typeof resolveHorizon === 'function') ? resolveHorizon(lat, lon) : null;   // terrain mountains
    if (terrHz && typeof mergeTerrainHorizon === 'function') hzArr = mergeTerrainHorizon(hzArr, lat, lon);
    else if (!terrHz && typeof ensureHorizonTile === 'function')   // lazy: fetch this location's 1° tile, re-run once loaded
      ensureHorizonTile(lat, lon).then(function (tile) { if (tile && !dead) runYieldMulti(); });

    var per = strings.map(function (s, i) {
      var mod  = modById(s.moduleId);
      var card = document.querySelector('.pv-str[data-sid="' + s.id + '"]');
      var useHz = (card ? (card.querySelector('[data-f="usehorizon"]') || {}).checked : true) || !!terrHz;
      var doOpt = card ? (card.querySelector('[data-f="optangle"]') || {}).checked : false;
      if (s.planeId != null) doOpt = false;   // plane-linked: β/γ are owned by the roof plane (mounting step)
      s.usehorizon = useHz; s.optangle = doOpt;   // persist per-string toggles into strings[] (saved on run)
      if (s.albedo == null) s.albedo = 0.2;   // hardening: strings from old exports may lack albedo -> NaN annuals
      var peakKwp = mod ? mod.pmax * (s.count || 0) / 1000 : 0;
      var pr   = Math.max(0, 1 - ((s.losses || 0) + (s.optimizer || 0)) / 100);
      var noct = mod ? mod.nmot : 45;
      var gamma = (useTemp && mod) ? mod.gamma / 100 : 0;
      var tilt = s.tilt, az = s.azimuth;

      if (doOpt) {
        var o = findOptimal(lat, lon, tz, peakKwp, pr, s.albedo, hzArr, useHz, clearSkyFn, declinFn, noct, gamma, transposeName, tcOpts);
        tilt = o.optTilt; az = o.optAz; s.tilt = tilt; s.azimuth = az;
        if (card) {
          if (card.querySelector('[data-f="tilt"]'))    card.querySelector('[data-f="tilt"]').value = tilt;
          if (card.querySelector('[data-f="azimuth"]')) card.querySelector('[data-f="azimuth"]').value = az;
        }
      }

      var res = calcYield(lat, lon, tz, tilt, az, peakKwp, pr, s.albedo, hzArr, useHz,
                          clearSkyFn, declinFn, noct, gamma, transposeName, tcOpts);
      /* per-string PVGIS import: keep BOTH series. Display = official when usePvgis;
         the engine series always feeds the "vs PVGIS" delta tabs. */
      var ref = validRef(s.pvgisRef) ? s.pvgisRef : null;
      var official = !!(ref && s.usePvgis);
      return {
        s: s, mod: mod, i: i, label: tr('cmp.stringlbl') + ' ' + (i + 1), color: STR_COLORS[i % STR_COLORS.length],
        peakKwp: peakKwp, pr: pr, tilt: tilt, az: az, noct: noct, gamma: gamma, albedo: s.albedo, useHz: useHz,
        engMonthly: res.monthly, engIrrad: res.monthlyIrrad,
        monthly:      official ? ref.monthlyE.slice() : res.monthly,
        monthlyIrrad: official ? ref.monthlyH.slice() : res.monthlyIrrad,
        annual:       official ? ref.monthlyE.reduce(function (a, b) { return a + b; }, 0) : res.annual,
        ref: ref, official: official,
      };
    });

    /* Aggregate */
    var totalMonthly = new Array(12).fill(0);
    var totalIrrMonthly = new Array(12).fill(0);          // kWp-weighted in-plane kWh/m² per month
    var totalIrrW = 0, totalKwp = 0;
    per.forEach(function (p) {
      p.monthly.forEach(function (v, m) { totalMonthly[m] += v; });
      p.monthlyIrrad.forEach(function (v, m) { totalIrrMonthly[m] += v * p.peakKwp; });
      totalKwp += p.peakKwp;
      var ann = p.monthlyIrrad.reduce(function (a, b) { return a + b; }, 0);
      totalIrrW += ann * p.peakKwp;   // kWp-weighted in-plane irradiance
    });
    if (totalKwp > 0) totalIrrMonthly = totalIrrMonthly.map(function (v) { return v / totalKwp; });
    var totalAnnual = totalMonthly.reduce(function (a, b) { return a + b; }, 0);
    var totalPanels = strings.reduce(function (a, s) { return a + (s.count || 0); }, 0);
    var wAvgIrrad = totalKwp > 0 ? totalIrrW / totalKwp : 0;
    var specYield = totalKwp > 0 ? totalAnnual / totalKwp : 0;

    /* "vs PVGIS" comparison aggregate: ENGINE vs IMPORT over the strings that have an
       import (regardless of the usePvgis display choice). Irradiance is kWp-weighted. */
    var refStr = per.filter(function (p) { return p.ref; });
    var cmp = null;
    if (refStr.length) {
      var refE = new Array(12).fill(0), refHw = new Array(12).fill(0);
      var engE = new Array(12).fill(0), engHw = new Array(12).fill(0), kwRef = 0;
      refStr.forEach(function (p) {
        for (var m = 0; m < 12; m++) {
          refE[m] += p.ref.monthlyE[m];          refHw[m] += p.ref.monthlyH[m] * p.peakKwp;
          engE[m] += p.engMonthly[m];            engHw[m] += p.engIrrad[m] * p.peakKwp;
        }
        kwRef += p.peakKwp;
      });
      var kdiv = kwRef > 0 ? kwRef : 1;
      cmp = {
        eng: { monthly: engE, irrM: engHw.map(function (v) { return v / kdiv; }),
               annual: engE.reduce(function (a, b) { return a + b; }, 0) },
        ref: { monthlyE: refE, monthlyH: refHw.map(function (v) { return v / kdiv; }),
               annualE: refE.reduce(function (a, b) { return a + b; }, 0),
               annualH: refHw.reduce(function (a, b) { return a + b; }, 0) / kdiv },
        chips: refStr.map(function (p) { return 'S' + (p.i + 1); }).join(' '),
        partial: refStr.length < per.length,
        showOverlay: refStr.some(function (p) { return !p.official; }),
      };
    }
    /* officialState: 0 = engine only, 1 = mixed, 2 = every string on official data */
    var nOfficial = per.filter(function (p) { return p.official; }).length;
    var officialState = nOfficial === 0 ? 0 : (nOfficial === per.length ? 2 : 1);

    /* "Optim" reference system (Neamț pt 18): SAME panels repositioned to azimut 0 (South) +
       optimal tilt, summed over all strings (engine only - a hypothetical re-orientation has no
       PVGIS import). Feeds the economic analysis (step 11) as the reference production. */
    var optMonthly = new Array(12).fill(0), optAnnual = 0;
    per.forEach(function (p) {
      if (!(p.peakKwp > 0)) return;
      var o = findOptimalTilt(lat, lon, tz, p.peakKwp, p.pr, p.albedo, hzArr, p.useHz,
                              clearSkyFn, declinFn, p.noct, p.gamma, transposeName, tcOpts, 0);
      optAnnual += o.annual;
      o.monthly.forEach(function (v, m) { optMonthly[m] += v; });
    });

    lastTotals = { kwp: +totalKwp.toFixed(3), annual: Math.round(totalAnnual), monthly: totalMonthly.map(function (v) { return Math.round(v); }),
                   optimalAnnual: Math.round(optAnnual), optimalMonthly: optMonthly.map(function (v) { return Math.round(v); }) };
    /* per-string monthly (with colour/label) so the client PDF can stack the production bars like the UI */
    lastByString = per.map(function (p) { return { label: p.label, color: p.color, monthly: p.monthly.map(function (v) { return Math.round(v); }) }; });

    renderMetrics(totalAnnual, totalKwp, specYield, totalPanels, per.length, officialState);
    renderMonthlyChart(per, cmp);
    renderBreakdown(per, totalMonthly, totalAnnual, totalKwp);
    renderMonthlyTable(totalMonthly, totalAnnual, cmp ? cmp.eng : null, cmp ? cmp.ref : null, cmp);
    renderNote(per, transposeName);
    renderExplain(per, totalAnnual, totalKwp, specYield, useTemp);

    /* Stash context for the daily-curve season selector */
    _daily = {
      perStr: per, lat: lat, lon: lon, tz: tz, hzArr: hzArr,
      clearSkyFn: clearSkyFn, declinFn: declinFn, transposeName: transposeName, tcOpts: tcOpts, useTemp: useTemp,
    };
    drawDaily();
  }

  function fmt0(v) { return Math.round(v).toLocaleString(); }

  /* ── "Mod explicativ": live per-string + aggregate yield working ── */
  function renderExplain(per, totalAnnual, totalKwp, specYield, useTemp) {
    if (typeof Explain === 'undefined') return;
    var multi = per.length > 1;
    var xp = '';
    per.forEach(function (p) {
      var lbl = multi ? ' <span style="color:var(--text3)">(' + p.label + ')</span>' : '';
      xp += Explain.block('PR' + lbl + ' = 1 − (pierderi + opt) / 100',
        '1 − (' + (p.s.losses || 0) + ' + ' + (p.s.optimizer || 0) + ') / 100 = <b>' + p.pr.toFixed(2) + '</b>', 'yxp.pr');
      if (p.mod) {
        xp += Explain.block('P<sub>peak</sub>' + lbl + ' = P<sub>mod</sub> · n / 1000',
          p.mod.pmax + ' · ' + (p.s.count || 0) + ' / 1000 = <b>' + p.peakKwp.toFixed(2) + ' kWp</b>', 'yxp.peak');
      }
    });
    var powModel = (document.querySelector('input[name="pow-model"]:checked') || {}).value || 'huld';
    if (useTemp) {
      xp += Explain.block('T<sub>cell</sub> = T<sub>2m</sub> + (N<sub>MOT</sub> − 20) / 800 · G', '', 'yxp.tcell');
      if (powModel === 'huld') {
        xp += Explain.block('η<sub>rel</sub>(G\',T\') = 1 + k₁lnG\' + k₂ln²G\' + T\'(k₃ + k₄lnG\' + k₅ln²G\')', '', 'yxp.huld');
      } else {
        xp += Explain.block('derate = 1 + γ · (T<sub>cell</sub> − 25)', '', 'yxp.derate');
      }
    } else if (powModel === 'huld') {
      xp += Explain.block('η<sub>rel</sub>(G\') = 1 + k₁lnG\' + k₂ln²G\'', '', 'yxp.huldlow');
    }
    xp += Explain.block('E<sub>an</sub> = Σ E<sub>lună</sub>', '<b>' + fmt0(totalAnnual) + ' kWh</b>', 'yxp.annual');
    xp += Explain.block('y<sub>specific</sub> = E<sub>an</sub> / P<sub>FV</sub>',
      fmt0(totalAnnual) + ' / ' + totalKwp.toFixed(2) + ' = <b>' + fmt0(specYield) + ' kWh/kWp</b>', 'yxp.specyield');
    Explain.render(document.getElementById('pv-explain'), xp);
  }

  function renderMetrics(annual, kwp, spec, panels, nStr, officialState) {
    var offBadge = officialState === 2 ? ' · <b style="color:#f0a020">' + tr('pv.pvgisofficial') + '</b>'
                 : (officialState === 1 ? ' · <b style="color:#f0a020">' + tr('pv.pvgispartial') + '</b>' : '');
    document.getElementById('pv-metrics').innerHTML =
      '<div class="metric"><div class="metric-val">' + fmt0(annual) + ' <span style="font-size:12px">kWh</span></div><div class="metric-lbl">' + tr('rec.prod') + '</div><div class="metric-sub">' + nStr + ' ' + (nStr === 1 ? tr('pvs.str_one') : tr('pvs.str_many')) + ' · ' + panels + ' ' + tr('cmp.panels') + offBadge + '</div></div>' +
      '<div class="metric"><div class="metric-val">' + kwp.toFixed(2) + ' <span style="font-size:12px">kWp</span></div><div class="metric-lbl">' + tr('rec.installed') + '</div><div class="metric-sub">' + tr('pvs.dcnom') + '</div></div>' +
      '<div class="metric"><div class="metric-val">' + fmt0(spec) + ' <span style="font-size:12px">kWh/kWp</span></div><div class="metric-lbl">' + tr('pvs.specyield') + '</div><div class="metric-sub">' + tr('pvs.specsub') + '</div></div>' +
      '<div class="metric"><div class="metric-val">' + fmt0(annual / 12) + ' <span style="font-size:12px">kWh</span></div><div class="metric-lbl">' + tr('pvs.monthlyavg') + '</div><div class="metric-sub">' + tr('pvs.monthlyavgsub') + '</div></div>';
  }

  function renderMonthlyChart(per, cmp) {
    var dark = (typeof isDark === 'function') ? isDark() : false;
    var datasets = per.map(function (p) {
      return { label: p.label + (p.official ? ' (PVGIS)' : ''), data: p.monthly.map(function (v) { return Math.round(v); }), backgroundColor: p.color, stack: 'kwh', borderRadius: 3 };
    });
    var overlay = !!(cmp && cmp.showOverlay);
    if (overlay) {
      /* Σ imported PVGIS bars (strings with imports) side by side with the display stack */
      datasets.push({ label: 'PVGIS', data: cmp.ref.monthlyE.map(function (v) { return Math.round(v); }),
        backgroundColor: 'rgba(240,160,32,0.75)', stack: 'pvgis', borderRadius: 3 });
    }
    if (monthlyChart) { monthlyChart.destroy(); monthlyChart = null; }
    monthlyChart = new Chart(document.getElementById('pv-chart'), {
      type: 'bar',
      data: { labels: MNAMES, datasets: datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: per.length > 1 || overlay, labels: { color: dark ? '#ccc' : '#444', boxWidth: 12, font: { size: 10 } } },
          tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': ' + c.raw + ' kWh'; } } },
        },
        scales: {
          x: { stacked: true, grid: { color: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }, ticks: { color: dark ? '#aaa' : '#555' } },
          y: { stacked: true, grid: { color: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }, ticks: { color: dark ? '#aaa' : '#555', callback: function (v) { return v + ' kWh'; } } },
        },
      },
    });
  }

  function renderBreakdown(per, totalMonthly, totalAnnual, totalKwp) {
    var rows = per.map(function (p) {
      var ann = p.monthly.reduce(function (a, b) { return a + b; }, 0);
      var spec = p.peakKwp > 0 ? ann / p.peakKwp : 0;
      return '<tr>' +
        '<td><span class="str-tag" style="background:' + p.color + ';margin-right:6px">S' + (p.i + 1) + '</span>' + p.label +
          (p.official ? ' <b style="color:#f0a020;font-size:10px">PVGIS</b>' : '') + '</td>' +
        '<td>' + (p.mod ? p.mod.name.replace(/\s*\(.*\)$/, '') : '-') + '</td>' +
        '<td>' + (p.s.count || 0) + '</td>' +
        '<td>' + p.peakKwp.toFixed(2) + '</td>' +
        '<td>' + Math.round(p.tilt) + '° / ' + Math.round(p.az) + '°</td>' +
        '<td>' + p.pr.toFixed(2) + '</td>' +
        '<td>' + fmt0(ann) + '</td>' +
        '<td>' + fmt0(spec) + '</td>' +
      '</tr>';
    }).join('');
    var totSpec = totalKwp > 0 ? totalAnnual / totalKwp : 0;
    document.getElementById('pv-breakdown').innerHTML =
      '<thead><tr><th>' + tr('cmp.stringlbl') + '</th><th>' + tr('cmp.module') + '</th><th>' + tr('pvs.bd_pan') + '</th><th>kWp</th><th>' + tr('pvs.bd_tiltaz') + '</th><th>PR</th><th>' + tr('pvs.bd_kwhyr') + '</th><th>kWh/kWp</th></tr></thead>' +
      '<tbody>' + rows +
      '<tr class="total"><td>' + tr('pvs.total') + '</td><td></td><td>' + per.reduce(function (a, p) { return a + (p.s.count || 0); }, 0) + '</td><td>' + totalKwp.toFixed(2) + '</td><td></td><td></td><td>' + fmt0(totalAnnual) + '</td><td>' + fmt0(totSpec) + '</td></tr>' +
      '</tbody>';
  }

  /* ── Monthly table with tabs: Energie (display data) / vs PVGIS Energie / vs PVGIS Iradiere.
     The comparison tabs always pit the ENGINE values against the imported PVGIS reference,
     so the deltas measure our algorithm even when the official PVGIS numbers are displayed. */
  var _tbl = null, tblTab = 'energy';

  function renderMonthlyTable(dispMonthly, dispAnnual, eng, ref, cmp) {
    _tbl = { disp: dispMonthly, dispAnnual: dispAnnual, eng: eng, ref: ref, cmp: cmp };
    paintMonthlyTable();
  }

  function deltaCell(ours, refv) {
    if (!(refv > 0)) return '<td></td>';
    var d = (ours - refv) / refv * 100;
    var col = Math.abs(d) <= 5 ? 'var(--ok,#1f9d4d)' : (Math.abs(d) <= 12 ? '#c47d12' : '#e53935');
    return '<td style="color:' + col + ';font-weight:600">' + (d >= 0 ? '+' : '') + d.toFixed(1) + '%</td>';
  }

  function cmpTableHtml(ours, refs, oursAnn, refAnn, oursHdr, fmtFn) {
    var rows = ours.map(function (o, i) {
      return '<tr><td>' + MNAMES[i] + '</td><td>' + fmtFn(o) + '</td><td>' + fmtFn(+refs[i]) + '</td>' + deltaCell(o, +refs[i]) + '</tr>';
    }).join('');
    return '<thead><tr><th>' + tr('tbl.month') + '</th><th>' + oursHdr + '</th><th>PVGIS</th><th>Δ</th></tr></thead>' +
      '<tbody>' + rows +
      '<tr><td><b>' + tr('tbl.annual') + '</b></td><td><b>' + fmtFn(oursAnn) + '</b></td><td><b>' + fmtFn(+refAnn) + '</b></td>' + deltaCell(oursAnn, +refAnn) + '</tr></tbody>';
  }

  function paintMonthlyTable() {
    if (!_tbl) return;
    var ref = _tbl.ref;
    if (!ref && tblTab !== 'energy') tblTab = 'energy';
    var tabsEl = document.getElementById('pv-table-tabs');
    tabsEl.innerHTML = !ref ? '' :
      [['energy', tr('tbl.tab_energy')], ['cmpE', tr('tbl.tab_cmpe')], ['cmpH', tr('tbl.tab_cmph')]]
        .map(function (d) { return '<button type="button" class="tbl-tab' + (tblTab === d[0] ? ' on' : '') + '" data-tab="' + d[0] + '">' + d[1] + '</button>'; }).join('') +
      (_tbl.cmp ? '<span style="font-size:10px;color:var(--text3);align-self:center">' + _tbl.cmp.chips +
        (_tbl.cmp.partial ? ' · ' + tr('tbl.cmpnote') : '') + '</span>' : '');

    var html;
    if (tblTab === 'cmpE' && ref) {
      html = cmpTableHtml(_tbl.eng.monthly, ref.monthlyE, _tbl.eng.annual, ref.annualE, tr('tbl.ours_kwh'), fmt0);
    } else if (tblTab === 'cmpH' && ref) {
      var engAnnH = _tbl.eng.irrM.reduce(function (a, b) { return a + b; }, 0);
      html = cmpTableHtml(_tbl.eng.irrM, ref.monthlyH, engAnnH, ref.annualH, tr('tbl.ours_irr'), fnum);
    } else {
      var maxMo = Math.max.apply(null, _tbl.disp);
      var rows = _tbl.disp.map(function (e, i) {
        var pct = maxMo > 0 ? Math.round(e / maxMo * 100) : 0;
        return '<tr><td>' + MNAMES[i] + '</td><td>' + Math.round(e) + '</td><td><div class="bar-bg"><div class="bar-fill" style="width:' + pct + '%"></div></div></td></tr>';
      }).join('');
      html = '<thead><tr><th>' + tr('tbl.month') + '</th><th>' + tr('tbl.energy') + '</th><th>' + tr('tbl.relative') + '</th></tr></thead>' +
        '<tbody>' + rows + '<tr><td><b>' + tr('tbl.annual') + '</b></td><td><b>' + fmt0(_tbl.dispAnnual) + '</b></td><td></td></tr></tbody>';
    }
    document.getElementById('pv-table').innerHTML = html;
  }

  document.getElementById('pv-table-tabs').addEventListener('click', function (e) {
    var b = e.target.closest('.tbl-tab'); if (!b) return;
    tblTab = b.dataset.tab;
    paintMonthlyTable();
  });

  function renderNote(per, transposeName) {
    var el = document.getElementById('pv-note');
    if (!el) return;
    var modelName = (document.querySelector('input[name="irr-model"]:checked') || {}).value || 'hofierka';
    var transLabel = transposeName === 'haydavies' ? 'Hay-Davies (1980)' : (transposeName === 'perez' ? 'Perez (1990)' : 'Muneer (1990) (N-term anisotropic, PVGIS native)');
    var offs = per.filter(function (p) { return p.official; });
    var offNote = offs.length
      ? '<b>' + offs.map(function (p) { return 'S' + (p.i + 1); }).join(' ') + '</b> ' + tr('pv.pvgisofficial') +
        ' (' + (((offs[0].ref || {}).inputs || {}).db || 'PVGIS') + ') · '
      : '';
    var modelLabel = offNote + (modelName === 'hofierka' ? 'PVGIS Hofierka/Suri (2002) clear-sky' : 'Ineichen/Perez clear-sky');
    var mods = {};
    per.forEach(function (p) { if (p.mod) mods[p.mod.name] = (p.gamma * 100).toFixed(2); });
    var gammaList = Object.keys(mods).map(function (k) { return k.replace(/\s*\(.*\)$/, '') + ' γ=' + mods[k] + '%/°C'; }).join(' · ');
    var powModel = (document.querySelector('input[name="pow-model"]:checked') || {}).value || 'huld';
    var powLabel = powModel === 'huld'
      ? tr('pvs.note_pow_huld') + ' (' + ((document.getElementById('pv-huld-set') || {}).value === 'csi' ? 'c-Si original' : 'c-Si 2025') + ') · IAM Martin-Ruiz'
      : tr('pvs.note_derate') + ' (' + gammaList + ') · IAM Martin-Ruiz';
    el.innerHTML = '<b>Model:</b> ' + modelLabel + ' · ' + tr('pvs.note_trans') + ' ' + transLabel +
      ' · ' + tr('pvs.note_kt') + ' · ' + powLabel +
      ' · ' + tr('pvs.note_horizon') + ' · ' + tr('pvs.note_daily') + '.<br>' +
      tr('pvs.note_accuracy') + ' ' + tr('pvs.note_final_pre') +
      '<a href="https://re.jrc.ec.europa.eu/pvg_tools/en/tools.html" target="_blank" rel="noopener" style="color:var(--clr-primary)">PVGIS</a>' +
      tr('pvs.note_final_post');
  }

  /* Language / theme / learn re-render (legacy window.renderList body — React's
     [lang, dark, learnOn] effect calls this via the returned api). Rebuild the
     per-String cards in the current language and, if results are already shown,
     recompute to re-translate metrics/breakdown/note and repaint both charts. */
  function render() {
    if (dead || !document.getElementById('pv-strings')) return;
    renderStringCards();
    var m = document.getElementById('pv-metrics');
    if (m && m.children.length) runYieldMulti();
  }

  /* Build a representative (equinox) daily clear-sky series for the client PDF report.
     Mirrors drawDaily()'s per-string profiles + combined total, stored as plain arrays. */
  function buildDailySeries() {
    if (!_daily) return null;
    var sd = SEASONS.equinox, hours = null;
    var series = _daily.perStr.map(function (p) {
      var prof = stringDailyProfile(_daily, p, sd.n, sd.mo);
      hours = prof.hours;
      return { label: p.label, color: p.color, power: prof.power.map(function (v) { return +v.toFixed(3); }) };
    });
    if (series.length > 1 && hours) {
      var total = hours.map(function (_, k) { return series.reduce(function (a, s) { return a + (s.power[k] || 0); }, 0); });
      series.push({ label: tr('pvs.total'), color: '#111', power: total.map(function (v) { return +v.toFixed(3); }) });
    }
    return { season: 'equinox', hours: hours, series: series };
  }

  /* ── run + persist + progress (legacy window.doRunYield, wired to the button) ── */
  function doRunYield() {
    runYieldMulti();
    Project.set('strings', strings);
    Project.patch('sizing', {
      pvgisKwp: lastTotals.kwp, annualProdKwh: lastTotals.annual, monthlyProd: lastTotals.monthly || null,
      optimalProdKwh: lastTotals.optimalAnnual, optimalMonthlyProd: lastTotals.optimalMonthly || null,
      monthlyByString: lastByString,
      daily: buildDailySeries(),
      model: {
        irrModel: (document.querySelector('input[name="irr-model"]:checked') || {}).value || 'hofierka',
        tl: document.getElementById('pv-tl').value || null,
        gsc: parseFloat(document.getElementById('pv-gsc').value) || 1361,
        useTemp: !!document.getElementById('pv-usetemp').checked,
        tcModel: (document.querySelector('input[name="tc-model"]:checked') || {}).value || 'noct',
        uc: parseFloat(document.getElementById('pv-uc').value) || 25,
        uv: parseFloat(document.getElementById('pv-uv').value) || 6.84,
        powModel: (document.querySelector('input[name="pow-model"]:checked') || {}).value || 'huld',
        huldSet: (document.getElementById('pv-huld-set') || {}).value || 'csi2025',
      },
    });
    Project.markDone('yield');
  }
  document.getElementById('pv-calc-btn').addEventListener('click', doRunYield);

  /* ── Auto-compute on load so the step is never blank ──
     The yield is a pure function of the saved project (location + strings +
     model), so there's nothing for the user to type here - the button only
     gated the maths behind a click. Render automatically on load; the explicit
     "Calculate" button still persists the result + marks the step done.
     Read-only share viewers can't click, so this is what lets them see anything. */
  (function autoRun() {
    var ro  = (typeof Project !== 'undefined') && Project.isReadOnly();
    var btn = document.getElementById('pv-calc-btn');
    if (ro && btn) btn.style.display = 'none';   // no dead button for viewers

    var saved = Project.section('strings');
    var hasReal = Array.isArray(saved) && saved.length > 0;
    if (!hasReal) {
      // brand-new project (only the synthesised default string) - guide, don't fake a result
      if (!ro) document.getElementById('pv-metrics').innerHTML =
        '<div class="metric" style="grid-column:1/-1"><div style="font-size:12px;color:var(--text3);text-align:center;padding:.5rem 0">' +
        tr('pv.autohint') + '</div></div>';
      return;
    }

    /* Wait for the data grids a manual click would use (so the auto-result equals
       the clicked result), then render once. Falls back after 6 s on a cold load. */
    var t0 = Date.now();
    (function whenReady() {
      if (dead) return;
      var ktOk   = (typeof KT_DATA   !== 'undefined') && KT_DATA;
      var tempOk = (typeof TEMP_DATA !== 'undefined') && TEMP_DATA;
      if ((ktOk && tempOk) || Date.now() - t0 > 6000) runYieldMulti();
      else setTimeout(whenReady, 80);
    })();
  })();

  return {
    render: render,
    destroy: function () {
      dead = true;
      if (monthlyChart) { try { monthlyChart.destroy(); } catch (e) {} monthlyChart = null; }
      if (dailyChart)   { try { dailyChart.destroy(); }   catch (e) {} dailyChart = null; }
    },
  };
}
