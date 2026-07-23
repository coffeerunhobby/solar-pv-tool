/* Mounting (step 5) — React port of mounting.html using the LEGACY-DRIVER
   pattern (like Economics): the placement calculator (inter-row spacing math,
   single/flush/E-W layout modes, to-scale SVG side/top views), the roof-plane
   editor (4-length trapezoid via the global Planes API: solve/pack/inset/
   effOrient) and the per-string plane linking with eff β/γ sync back into
   Project.strings are inherently DOM-driven (getElementById everywhere, the
   plane editor mutates rows in place to keep input focus, SVGs are verbatim
   string builders into innerHTML). React owns: the 1:1 skeleton (ids/classes
   preserved, t() labels), the learn toggle, re-render on language/theme
   switches. Persistence (compute(true) on every edit) + markDone stay
   identical to legacy.

   ⚠ js/planes.js is NOT in the shell's legacy script set — it is lazy-loaded
   here once (Planes + PLANE_COLORS globals) before the engine transplant runs. */
import { useEffect, useRef } from 'react';
import { useI18n } from '../store/useI18n.js';
import { useTheme } from '../store/useTheme.js';
import { useLearn, setLearn } from '../store/useLearn.js';
import './Mounting.css';

/* one-shot loader for the roof-plane geometry lib (classic script → globals) */
let planesLib = null;
function ensurePlanesLib() {
  if (window.Planes) return Promise.resolve();
  if (!planesLib) {
    planesLib = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      const v = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : '';
      s.src = '/js/planes.js' + (v ? '?v=' + v : '');
      s.onload = resolve;
      s.onerror = () => { planesLib = null; reject(new Error('planes.js failed to load')); };
      document.head.appendChild(s);
    });
  }
  return planesLib;
}

export default function Mounting() {
  const { t, lang } = useI18n();
  const { dark } = useTheme();
  const { on: learnOn } = useLearn();
  const api = useRef(null);   // { render, destroy } from the transplanted engine

  useEffect(() => {
    let cancelled = false;
    ensurePlanesLib().then(() => {
      if (!cancelled) api.current = setupMounting();   // full legacy init (prefill + planes + first compute + markDone)
    }).catch((e) => console.error(e));
    return () => { cancelled = true; if (api.current) { api.current.destroy(); api.current = null; } };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  /* language / theme / learn-mode changes → legacy re-render (= legacy window.renderList) */
  useEffect(() => { api.current && api.current.render(); }, [lang, dark, learnOn]);

  return (
    <>
      <div className="sn-crumb"><b>{t('nav.phaseB')}</b> › <span>{t('nav.mounting')}</span></div>
      <div className="mnt-scroll">
        <div className="row g-3">
          {/* ── inputs ── */}
          <div className="col-lg-4">
            <div className="card">
              <div className="sec">{t('mnt.layout')}</div>
              <div className="field" id="mnt-string-wrap">
                <label>
                  <span id="mnt-str-tag" className="str-tag" style={{ marginRight: 6, display: 'none' }} />
                  <span>{t('mnt.string')}</span>
                </label>
                <select id="mnt-string" />
              </div>
              <div id="mnt-modname" style={{ fontSize: 12, color: 'var(--text2)', marginBottom: '.5rem' }} />
              <div className="field">
                <label>{t('mnt.orient')}</label>
                <select id="mnt-orient">
                  <option value="portrait">{t('mnt.portrait')}</option>
                  <option value="landscape">{t('mnt.landscape')}</option>
                </select>
              </div>
              <div className="field">
                <label>{t('mnt.mode')}</label>
                <select id="mnt-mode">
                  <option value="single">{t('mnt.single')}</option>
                  <option value="flush">{t('mnt.flush')}</option>
                  <option value="ew">{t('mnt.accordion')}</option>
                </select>
                <div id="mnt-ew-az" className="ewaz-note" style={{ display: 'none' }}>{t('mnt.ewaz')}</div>
                <div id="mnt-ew-hint" className="ewhint" style={{ display: 'none' }}
                     dangerouslySetInnerHTML={{ __html: t('mnt.ewhint') }} />
              </div>
              <div className="field" id="mnt-hour-field">
                <label>{t('mnt.designhour')}</label>
                <select id="mnt-hour">
                  <option value="12">{t('mnt.noon')}</option>
                  <option value="10">10:00</option>
                  <option value="9">09:00</option>
                </select>
              </div>
              <div className="field" id="mnt-plane-wrap" style={{ display: 'none' }}>
                <label>{t('pln.plane')}</label>
                <select id="mnt-plane" />
                <div id="mnt-eff-note" className="ewaz-note" style={{ display: 'none' }} />
                <div id="mnt-plane-note" className="ewaz-note" style={{ display: 'none' }}>{t('pln.locknote')}</div>
                <div id="mnt-flat-warn" className="ewhint" style={{ display: 'none' }}>{t('pln.flatwarn')}</div>
              </div>
            </div>
            <div className="card">
              <div className="sec">
                <span>{t('mnt.strorient')}</span>{' '}
                <span id="mnt-str-which" style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400 }} />
              </div>
              <div className="field">
                <label><span>{t('mnt.tilt')}</span> <span className="mnt-sym">β</span></label>
                <input type="number" id="mnt-tilt" defaultValue={35} min={1} max={80} step={1} />
              </div>
              <div className="field">
                <label><span>{t('mnt.azimuth')}</span> <span className="mnt-sym">γ</span></label>
                <input type="number" id="mnt-az" defaultValue={0} min={-180} max={180} step={5} />
              </div>
              <div id="mnt-str-summary" className="strsum" style={{ display: 'none' }} />
            </div>
            <div className="card" id="mnt-area-card">
              <div className="sec">{t('mnt.area')}</div>
              <div className="row2">
                <div className="field"><label>{t('mnt.roofw')}</label><input type="number" id="mnt-roofw" defaultValue={20} min={0} max={1000} step={0.5} /></div>
                <div className="field"><label>{t('mnt.roofd')}</label><input type="number" id="mnt-roofd" defaultValue={12} min={0} max={1000} step={0.5} /></div>
              </div>
            </div>
            <div className="card">
              <div className="sec">{t('pln.card')}</div>
              <div id="mnt-planes" />
              <button type="button" className="btn btn-sm btn-outline-secondary addbtn" id="mnt-addplane">{t('pln.add')}</button>
              <div className="str-note">{t('pln.note')}</div>
            </div>
            <div className="card">
              <div className="sec" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t('mnt.results')}</span>
                <label className="xpl-toggle">
                  <input type="checkbox" id="mnt-learn" checked={learnOn} onChange={(e) => setLearn(e.target.checked)} />
                  {' '}<span>{t('xpl.learnmode')}</span>
                </label>
              </div>
              <div id="mnt-results" />
              <div id="mnt-explain" className="xpl-host" />
            </div>
          </div>

          {/* ── diagrams ── */}
          <div className="col-lg-8">
            <div className="diagram-card">
              <h3>{t('mnt.diagram')}</h3>
              <div id="mnt-side" />
              <div id="mnt-acc-note" className="accnote" style={{ display: 'none' }}>{t('mnt.accnote')}</div>
            </div>
            <div className="diagram-card" id="mnt-plan-card">
              <h3>{t('mnt.plan')}</h3>
              <div id="mnt-plan" />
            </div>
            <div className="diagram-card" id="mnt-planes-card" style={{ display: 'none' }}>
              <h3>{t('pln.diagram')}</h3>
              <div id="mnt-planes-svg" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══ Transplanted legacy engine (mounting.html inline IIFE, verbatim except:
   window.renderList/saveStep hooks removed — React drives re-render, and every
   edit already persists via compute(true); Explain.wireToggle removed — the
   React toggle + useLearn drive re-renders (Explain.render sets .xpl-host
   visibility from Explain.isOn() on every compute); SiteNav.refresh() removed;
   a dead flag + root-element guard added; addEventListener wiring unchanged
   (nodes die with the component). ═══ */
function setupMounting() {
  'use strict';
  var dead = false;
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var comp = Project.section('components');
  var loc  = Project.section('location') || {};
  var lat = loc.lat != null ? loc.lat : 45.9432, lon = loc.lon != null ? loc.lon : 24.9668, tz = loc.tz != null ? loc.tz : 2;

  /* Strings + module registry - the layout's geometry follows the chosen String. */
  var strings = Project.section('strings');
  if (!Array.isArray(strings)) strings = [];
  var MODS = (typeof MODULE_LIST !== 'undefined') ? MODULE_LIST : [];
  function modById(id) { return MODS.filter(function (m) { return m.id === id; })[0] || null; }

  /* Roof planes - the physical faces strings sit on (planes.js: solver/packing/effOrient).
     A linked string's tilt/azimuth are DERIVED from its plane + mount mode and synced back
     into s.tilt/s.azimuth, so yield/connections/report keep reading the same fields. */
  var planes = Project.section('planes');
  if (!Array.isArray(planes)) planes = [];
  function savePlanes() { Project.set('planes', planes); }
  function fnum(v) { return (+v).toFixed(2).replace(/\.?0+$/, ''); }

  function syncLinked() {
    var changed = false;
    strings.forEach(function (s) {
      if (s.planeId == null) return;
      if (!Planes.byId(planes, s.planeId)) { s.planeId = null; changed = true; return; }  // plane was deleted
      var eff = Planes.effOrient(s, planes);
      if (s.tilt !== eff.tilt || s.azimuth !== eff.azimuth) { s.tilt = eff.tilt; s.azimuth = eff.azimuth; changed = true; }
    });
    if (changed) Project.set('strings', strings);
  }

  var elModName = document.getElementById('mnt-modname');
  var strSel    = document.getElementById('mnt-string');
  var strWrap   = document.getElementById('mnt-string-wrap');

  /* module geometry - set by applyString(), with comp-mirror / default fallback */
  var maxDim = 1.762, minDim = 1.134, pmax = 455, curModName = '', hasModule = false, selStringIdx = 0;

  function applyString(idx) {
    selStringIdx = idx;
    var s = strings[idx];
    var mod = s ? modById(s.moduleId) : null;
    if (mod && mod.length && mod.width) {
      maxDim = Math.max(mod.length, mod.width) / 1000;
      minDim = Math.min(mod.length, mod.width) / 1000;
      pmax   = mod.pmax || pmax;
      curModName = mod.name.replace(/\s*\(.*\)$/, '');
      hasModule = true;
    } else if (comp && comp.moduleLength != null) {
      maxDim = Math.max(comp.moduleLength, comp.moduleWidth) / 1000;
      minDim = Math.min(comp.moduleLength, comp.moduleWidth) / 1000;
      pmax   = comp.pmax || pmax;
      curModName = '';
      hasModule = true;
    } else {
      hasModule = false;
    }
    /* β/γ are per-String: load the selected String's tilt/azimuth into the inputs. */
    if (s) {
      if (s.tilt != null)    document.getElementById('mnt-tilt').value = s.tilt;
      if (s.azimuth != null) document.getElementById('mnt-az').value   = s.azimuth;
    }
    /* S-chip (shared STR_COLORS palette, like components/yield/connections) - the chip sits
       OUTSIDE the label's text span so React's t() re-render can't wipe it on language switch */
    var sCol = (typeof STR_COLORS !== 'undefined') ? STR_COLORS[idx % STR_COLORS.length] : '';
    var tag = document.getElementById('mnt-str-tag');
    if (tag) {
      tag.style.display = strings.length ? '' : 'none';
      tag.textContent = 'S' + (idx + 1);
      if (sCol) tag.style.background = sCol;
    }
    var which = document.getElementById('mnt-str-which');
    if (which) which.innerHTML = strings.length
      ? '<span class="str-tag"' + (sCol ? ' style="background:' + sCol + '"' : '') + '>S' + (idx + 1) + '</span>' : '';
    applyLinkUI();
  }

  /* Live "effective β/γ" line: γ_eff = plane γ + panel γ, shown without rewriting the
     inputs (safe to call while the user is typing in them). */
  function updateEffNote() {
    var s = strings[selStringIdx];
    var effNote = document.getElementById('mnt-eff-note');
    var p = (s && s.planeId != null) ? Planes.byId(planes, s.planeId) : null;
    if (!p) { effNote.style.display = 'none'; return; }
    var eff = Planes.effOrient(s, planes);
    effNote.textContent = tr('pln.eff') + ': β ' + fnum(eff.tilt) + '° · γ ' + fnum(p.azimuth || 0) +
      '° + ' + fnum(eff.rackAz) + '° = ' + fnum(eff.azimuth) + '°';
    effNote.style.display = '';
  }

  /* Plane-link UI for the selected string: populate the plane dropdown and re-purpose the
     β/γ inputs when linked. β: flush → read-only from the plane; single/ew → the RACK tilt
     Δβ relative to the plane. γ: ALWAYS editable = the PANEL azimuth (mount.rackAz), which
     ADDS to the plane azimuth - the stored s.azimuth is the sum (synced by syncLinked()).
     A dynamic line shows the effective β/γ; the flat-plane warning stays. */
  function applyLinkUI() {
    var s = strings[selStringIdx];
    var wrap = document.getElementById('mnt-plane-wrap');
    var sel = document.getElementById('mnt-plane');
    var tiltEl = document.getElementById('mnt-tilt'), azEl = document.getElementById('mnt-az');
    var note = document.getElementById('mnt-plane-note'), warn = document.getElementById('mnt-flat-warn');
    var effNote = document.getElementById('mnt-eff-note');
    var show = !!(strings.length && planes.length);
    wrap.style.display = show ? '' : 'none';
    if (show) {
      sel.innerHTML = '<option value="">' + tr('pln.none') + '</option>' + planes.map(function (p, i) {
        return '<option value="' + p.id + '">P' + (i + 1) + ' - β ' + fnum(p.tilt || 0) + '° / γ ' + fnum(p.azimuth || 0) + '°</option>';
      }).join('');
      sel.value = (s && s.planeId != null && Planes.byId(planes, s.planeId)) ? String(s.planeId) : '';
    }
    var p = (s && s.planeId != null) ? Planes.byId(planes, s.planeId) : null;
    if (p) {
      if (s.mount && s.mount.mode) document.getElementById('mnt-mode').value = s.mount.mode;
      var mode = document.getElementById('mnt-mode').value;
      var eff = Planes.effOrient(s, planes);
      if (mode === 'flush') { tiltEl.value = parseFloat(p.tilt) || 0; tiltEl.disabled = true; }
      else {
        tiltEl.value = (s.mount && s.mount.rackTilt != null) ? s.mount.rackTilt : (mode === 'ew' ? 10 : 30);
        tiltEl.disabled = false;
      }
      azEl.value = eff.rackAz; azEl.disabled = false;
      updateEffNote();
      note.style.display = '';
      warn.style.display = (mode !== 'flush' && (parseFloat(p.tilt) || 0) > Planes.FLAT_MAX) ? '' : 'none';
    } else {
      tiltEl.disabled = false; azEl.disabled = false;
      if (s) { if (s.tilt != null) tiltEl.value = s.tilt; if (s.azimuth != null) azEl.value = s.azimuth; }
      effNote.style.display = 'none'; note.style.display = 'none'; warn.style.display = 'none';
    }
  }

  /* Read-only summary of every String's β/γ (the array Yield consumes). */
  function renderStrSummary() {
    var el = document.getElementById('mnt-str-summary');
    if (!el) return;
    if (!strings.length) { el.style.display = 'none'; return; }
    el.style.display = '';
    el.innerHTML = '<span style="color:var(--text3)">' + tr('mnt.persum') + ':</span> ' +
      strings.map(function (s, i) {
        var col = (typeof STR_COLORS !== 'undefined') ? STR_COLORS[i % STR_COLORS.length] : '';
        return '<span class="str-tag"' + (col ? ' style="background:' + col + '"' : '') + '>S' + (i + 1) + '</span> ' +
          (s.tilt != null ? s.tilt : '?') + '° / ' + (s.azimuth != null ? s.azimuth : '?') + '°';
      }).join(' · ');
  }

  /* populate the String dropdown (hidden when there are no strings) */
  if (strings.length) {
    strSel.innerHTML = strings.map(function (s, i) {
      var mod = modById(s.moduleId);
      var nm = mod ? mod.name.replace(/\s*\(.*\)$/, '') : (s.moduleId || '?');
      return '<option value="' + i + '">' + nm + ' (' + (s.count || 0) + '×)</option>';
    }).join('');
    if (strWrap) strWrap.style.display = '';
  } else if (strWrap) {
    strWrap.style.display = 'none';
  }

  /* restore the previously chosen String (by id), then resolve its module */
  var mntPrev = Project.section('mounting');
  if (mntPrev && mntPrev.stringId != null && strings.length) {
    var pi = strings.map(function (s) { return s.id; }).indexOf(mntPrev.stringId);
    if (pi >= 0) { selStringIdx = pi; strSel.value = String(pi); }
  }
  applyString(selStringIdx);

  if (!hasModule) {
    elModName.innerHTML = '<span class="needmod">' + (typeof t === 'function' ? t('mnt.needmod') : 'Pick a module first.') +
      ' <a href="components.html" style="color:var(--clr-primary)">→ ' + (typeof t === 'function' ? t('nav.components') : 'Components') + '</a></span>';
  }

  strSel.addEventListener('change', function () {
    applyString(parseInt(strSel.value, 10) || 0);
    compute(true);
  });

  function tr(k) { return (typeof t === 'function') ? t(k) : k; }
  function num(v, d) { return v.toFixed(d == null ? 2 : d); }

  /* ── Winter-solstice sun position at the design hour ── */
  function winterSun(hour) {
    var n = (typeof doy === 'function') ? doy(2025, 12, 21) : 355;
    var p = sunPos(lat, lon, tz, n, hour, 'lst');   // {az, el}
    return p && p.el > 0 ? { alt: p.el, az: p.az } : { alt: 1, az: 180 };
  }

  /* ── SVG helpers — only `txt` is still local (the roof-plane diagrams below use it);
     line/arc moved to js/mounting-svg.js with the four to-scale view builders. ── */
  function txt(x, y, s, cls, anchor) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="11" text-anchor="' + (anchor || 'middle') + '" class="' + cls + '">' + s + '</text>'; }

  /* ── To-scale views: the four builders live in the SHARED js/mounting-svg.js so the
     Proiect Tehnic plate renders the SAME drawing (single source of truth, exactly like
     schema-svg.js). These are thin delegates - the call sites below are unchanged. ── */
  function sideSingle(L, tilt, X, foot, Y, pitch, alt) { return MountingSVG.sideSingle(L, tilt, X, foot, Y, pitch, alt); }
  function sideAccordion(L, tilt, X, foot) { return MountingSVG.sideAccordion(L, tilt, X, foot); }
  function sideFlush(L, tilt, rows) { return MountingSVG.sideFlush(L, tilt, rows); }
  function planSVG(rows, perRow, pitch, perp, mode, foot) { return MountingSVG.planSVG(rows, perRow, pitch, perp, mode, foot); }

  function compute(persist) {
    if (dead || !document.getElementById('mnt-results')) return;
    var portrait = document.getElementById('mnt-orient').value === 'portrait';
    var mode = document.getElementById('mnt-mode').value;
    var tilt = parseFloat(document.getElementById('mnt-tilt').value) || 35;
    var azDev = parseFloat(document.getElementById('mnt-az').value) || 0;
    var hour = parseFloat(document.getElementById('mnt-hour').value) || 12;
    /* linked string: geometry follows the EFFECTIVE orientation (plane + mount mode) -
       in single/ew the β input holds the rack Δβ, not the final tilt */
    var selStr = strings[selStringIdx];
    if (selStr && selStr.planeId != null && Planes.byId(planes, selStr.planeId)) {
      var selEff = Planes.effOrient(selStr, planes);
      tilt = selEff.tilt; azDev = selEff.azimuth;
    }
    var roofW = parseFloat(document.getElementById('mnt-roofw').value) || 0;
    var roofD = parseFloat(document.getElementById('mnt-roofd').value) || 0;

    var coplanar = mode === 'flush';            // panels flush on a pitched roof - no inter-row gap
    var L = portrait ? maxDim : minDim;        // slope length
    var perp = portrait ? minDim : maxDim;     // width across the row
    var X = L * Math.sin(tilt * D2R);
    var foot = L * Math.cos(tilt * D2R);
    var sun = winterSun(hour);
    var alt = sun.az != null ? sun.alt : sun.alt;
    var Y = coplanar ? 0 : X * Math.cos(azDev * D2R) / Math.tan(alt * D2R);
    if (!isFinite(Y) || Y < 0) Y = 0;
    /* coplanar: rows touch along the slope → pitch = module length, GCR = 100%.
       single: tilted rows on flat ground → pitch = footprint + shading gap. ew: rows pack at footprint. */
    var pitch = coplanar ? L : (mode === 'ew' ? foot : (foot + Y));
    var gcr = coplanar ? 1 : (pitch > 0 ? L / pitch : 0);
    /* E-W and coplanar both pack with NO inter-row gap → hide the shading rows + tag the pitch.
       (E-W rows touch at the footprint, pitch = foot; only single-direction needs a shading gap Y.) */
    var noGap = coplanar || mode === 'ew';

    /* On a pitched roof, roofD is the length available ALONG the slope, so modules tile it directly
       (no foot projection, no gap). Flat-mount modes subtract the first row's footprint + step by pitch. */
    var rows = coplanar
      ? (roofD > 0 && L > 0 ? Math.floor(roofD / L) : 0)
      : (function () { var sd = mode === 'ew' ? foot : pitch; return (roofD > 0 && sd > 0) ? Math.max(0, Math.floor((roofD - foot) / sd) + 1) : 0; })();
    var perRow = roofW > 0 && perp > 0 ? Math.floor(roofW / perp) : 0;
    var total = rows * perRow;
    var kwp = total * pmax / 1000;

    /* When roof planes are defined they REPLACE the rectangle capacity: the modules that
       fit = Σ of every plane's packed capacity (each with its own linked module + mode). */
    var planeTotals = null;
    if (planes.length) {
      var pcs = planes.map(function (p) { return planeCalc(p, portrait, hour); });
      planeTotals = {
        fits: pcs.reduce(function (a, c) { return a + c.pk.total; }, 0),
        kwp:  pcs.reduce(function (a, c) { return a + c.pk.total * c.pmaxP; }, 0) / 1000,
        breakdown: pcs.map(function (c, j) { return 'P' + (j + 1) + ' ' + c.pk.total; }).join(' + '),
      };
      rows = 0; perRow = 0; total = planeTotals.fits; kwp = planeTotals.kwp;
    }

    /* Modules actually configured across the strings (independent of roof capacity).
       Future: geometric constraints + multiple top-down cards may refine per-string placement. */
    var usedCounts = strings.map(function (s) { return s.count || 0; });
    var usedTotal  = usedCounts.reduce(function (a, b) { return a + b; }, 0);
    var usedKwp    = strings.reduce(function (a, s) { var m = modById(s.moduleId); return a + (m ? m.pmax * (s.count || 0) : 0); }, 0) / 1000;
    var usedBreak  = usedCounts.length > 1 ? (usedCounts.join('+') + '=' + usedTotal) : String(usedTotal);

    if (hasModule) {
      /* L = side along the slope (the one that casts the inter-row shadow), l = width across the row.
         Flips with portrait/landscape, so it always matches the L used in the formulas below. */
      document.getElementById('mnt-modname').innerHTML =
        (curModName ? '<b>' + curModName + '</b> · ' : '') +
        '<span class="mnt-sym">L</span>=' + num(L, 3) + ' × <span class="mnt-sym">l</span>=' + num(perp, 3) + ' m · ' + pmax + ' W';
    }

    document.getElementById('mnt-results').innerHTML =
      /* shading-only rows (sun altitude, rise, inter-row gap) are meaningless without a gap */
      (noGap ? '' : kv('mnt.sunalt', num(alt, 1) + '°')) +
      kv('mnt.modlen', num(L) + ' m') +
      (noGap ? '' : kv('mnt.rise', num(X) + ' m')) +
      (noGap ? '' : kv('mnt.gap', '<b>' + num(Y) + ' m</b>')) +
      kv('mnt.pitch', num(pitch) + ' m' + (coplanar ? ' · ' + tr('mnt.flushtag') : (mode === 'ew' ? ' · ' + tr('mnt.ewtag') : ''))) +
      kv('mnt.gcr', (gcr * 100).toFixed(0) + ' %') +
      (planeTotals
        ? kv('mnt.fit', '<b>' + planeTotals.fits + '</b> · ' + num(planeTotals.kwp) + ' kWp' +
            (planes.length > 1 ? ' <span style="color:var(--text3);font-weight:400">(' + planeTotals.breakdown + ')</span>' : ''))
        : (roofW > 0 && roofD > 0 ? (
            kv('mnt.rows', String(rows)) + kv('mnt.permod', String(perRow)) +
            kv('mnt.fit', '<b>' + total + '</b> · ' + num(kwp) + ' kWp') ) : '')) +
      (strings.length ? kv('mnt.used', '<b>' + usedBreak + '</b> · ' + num(usedKwp) + ' kWp') : '');

    /* ── "Mod explicativ": live formula substitution (β=tilt, γ=azimuth dev., α=sun altitude) ── */
    if (typeof Explain !== 'undefined') {
      var b = num(tilt, 0) + '°', g = num(azDev, 0) + '°', a = num(alt, 1) + '°';
      var xp = '';
      if (coplanar) {
        /* coplanar pitched roof: no shading geometry - modules tile the slope */
        xp += Explain.block('pas = L', num(L) + ' m · ' + tr('mnt.flushtag'), 'mxp.flush');
        xp += Explain.block('GCR = 100 %', '', 'mxp.gcr');
      } else if (mode === 'ew') {
        /* East–West tents pack at the footprint - no inter-row gap, GCR > 100% from the tilt */
        xp += Explain.block('foot = L · cos β', num(L) + ' · cos ' + b + ' = <b>' + num(foot) + ' m</b>', 'mxp.foot');
        xp += Explain.block('pas ≈ foot', '<b>' + num(pitch) + ' m</b> · ' + tr('mnt.ewtag'), 'mxp.pitch');
        xp += Explain.block('GCR = L / pas', num(L) + ' / ' + num(pitch) + ' = <b>' + (gcr * 100).toFixed(0) + ' %</b>', 'mxp.gcr');
      } else {
        xp += Explain.block('X = L · sin β', num(L) + ' · sin ' + b + ' = <b>' + num(X) + ' m</b>', 'mxp.rise');
        xp += Explain.block('foot = L · cos β', num(L) + ' · cos ' + b + ' = <b>' + num(foot) + ' m</b>', 'mxp.foot');
        xp += Explain.block('α = sunPos(21 dec, ' + hour + 'h)', '<b>' + a + '</b>', 'mxp.alt');
        xp += Explain.block('Y = X · cos γ / tan α',
          num(X) + ' · cos ' + g + ' / tan ' + a + ' = <b>' + num(Y) + ' m</b>', 'mxp.gap');
        xp += Explain.block(mode === 'ew' ? 'pas ≈ foot' : 'pas = foot + Y',
          mode === 'ew' ? '<b>' + num(pitch) + ' m</b>'
                        : num(foot) + ' + ' + num(Y) + ' = <b>' + num(pitch) + ' m</b>', 'mxp.pitch');
        xp += Explain.block('GCR = L / pas', num(L) + ' / ' + num(pitch) + ' = <b>' + (gcr * 100).toFixed(0) + ' %</b>', 'mxp.gcr');
      }
      Explain.render(document.getElementById('mnt-explain'), xp);
    }

    document.getElementById('mnt-side').innerHTML = coplanar
      ? sideFlush(L, tilt, rows || 4)
      : (mode === 'ew' ? sideAccordion(L, tilt, X, foot) : sideSingle(L, tilt, X, foot, Y, pitch, alt));
    document.getElementById('mnt-acc-note').style.display = mode === 'ew' ? '' : 'none';
    var hourField = document.getElementById('mnt-hour-field');
    if (hourField) hourField.style.display = noGap ? 'none' : '';   // design hour is shading-only (single direction)
    document.getElementById('mnt-ew-az').style.display = (mode === 'ew' && strings.length >= 2) ? '' : 'none';
    document.getElementById('mnt-ew-hint').style.display = (mode === 'ew' && strings.length < 2) ? '' : 'none';
    document.getElementById('mnt-plan').innerHTML = planSVG(rows, perRow, pitch, perp, mode, foot);
    renderStrSummary();

    if (persist) {
      Project.patch('mounting', { tilt: tilt, azimuth: azDev, mode: mode,
        orient: document.getElementById('mnt-orient').value, hour: hour, roofW: roofW, roofD: roofD,
        rise: X, gap: Y, pitch: pitch, gcr: gcr, sunAlt: alt, rows: rows, perRow: perRow, total: total, kwp: kwp,
        stringId: (strings[selStringIdx] && strings[selStringIdx].id) != null ? strings[selStringIdx].id : null });
      if (hasModule && !Project.isDone('mounting')) Project.markDone('mounting');
    }
    drawPlanes();
  }
  function kv(key, val) { return '<div class="kv"><span class="k">' + tr(key) + '</span><span class="v">' + val + '</span></div>'; }

  /* ── Roof-plane editor + to-scale plane diagrams ── */
  function planeStat(p) {
    var sol = Planes.solve(p.top, p.bottom, p.left, p.right);
    if (sol.ok) return { cls: 'pln-stat ok', html: 'h = ' + fnum(sol.h) + ' m · ' + tr('pln.area') + ' ' + fnum(sol.area) + ' m²' };
    var any = [p.top, p.bottom, p.left, p.right].some(function (v) { return v != null && v !== ''; });
    return { cls: 'pln-stat err', html: any ? tr(sol.err === 'rect' ? 'pln.needlr' : 'pln.invalid') : '' };
  }

  function renderPlanes() {
    var host = document.getElementById('mnt-planes');
    function fld(key, f, v, mn, mx, st) {
      return '<div><label>' + tr(key) + '</label><input type="number" data-f="' + f + '" value="' + (v != null ? v : '') +
        '" min="' + mn + '" max="' + mx + '" step="' + st + '"></div>';
    }
    host.innerHTML = planes.map(function (p, i) {
      var col = PLANE_COLORS[i % PLANE_COLORS.length];
      var st = planeStat(p);
      /* chips of the strings assigned to this plane (assignment lives on the string side:
         pick the string in the Layout card, then its plane in the "Roof plane" dropdown) */
      var chips = strings.map(function (s, si) {
        if (s.planeId !== p.id) return '';
        var sc = (typeof STR_COLORS !== 'undefined') ? STR_COLORS[si % STR_COLORS.length] : 'var(--clr-primary)';
        return '<span class="str-tag" style="background:' + sc + '">S' + (si + 1) + '</span>';
      }).join(' ');
      /* "Choose string" link reflects assignment: empty -> "Alege șir →"; assigned -> "Șir S1 ales" */
      var asg = [];
      strings.forEach(function (s, si) { if (s.planeId === p.id) asg.push('S' + (si + 1)); });
      var chooseTxt = asg.length === 0 ? tr('pln.choosestr')
        : (asg.length === 1 ? tr('pln.strchosen') : tr('pln.strschosen')).replace('{s}', asg.join(', '));
      return '<div class="str-row" data-pid="' + p.id + '">' +
        '<div class="str-head"><span style="display:flex;gap:4px;align-items:center"><span class="str-tag" style="background:' + col + '">P' + (i + 1) + '</span>' + chips + '</span>' +
          '<button class="str-rm" data-rm="' + p.id + '" title="&times;">&times;</button></div>' +
        '<div class="pln-grid">' +
          fld('pln.top', 'top', p.top, 0, 1000, 0.1) + fld('pln.bottom', 'bottom', p.bottom, 0, 1000, 0.1) +
          fld('pln.left', 'left', p.left, 0, 1000, 0.1) + fld('pln.right', 'right', p.right, 0, 1000, 0.1) +
          fld('pln.tilt', 'tilt', p.tilt, 0, 80, 1) + fld('pln.az', 'azimuth', p.azimuth, -180, 180, 5) +
          fld('pln.setback', 'setback', p.setback, 0, 5, 0.1) +
          '<div class="pln-choose"><a class="pln-chooselink' + (asg.length ? ' pln-chosen' : '') + '" data-choose="' + p.id + '">' + chooseTxt + '</a></div>' +
        '</div>' +
        '<div class="' + st.cls + '">' + st.html + '</div>' +
      '</div>';
    }).join('');
  }

  /* Per-plane packing: row geometry follows the FIRST linked string's mount mode + module
     (with no string linked it previews coplanar packing with the page's module). Shared by
     the plane diagrams AND the Placement-results totals. */
  function planeCalc(p, portrait, hour) {
    var sol = Planes.solve(p.top, p.bottom, p.left, p.right);
    var linked = strings.filter(function (s) { return s.planeId === p.id; });
    var ref = linked[0] || null;
    var dims = { max: maxDim, min: minDim }, pmaxP = pmax;
    if (ref) {
      var rm = modById(ref.moduleId);
      if (rm && rm.length) { dims = { max: Math.max(rm.length, rm.width) / 1000, min: Math.min(rm.length, rm.width) / 1000 }; pmaxP = rm.pmax || pmax; }
    }
    var L = portrait ? dims.max : dims.min, perp = portrait ? dims.min : dims.max;
    var mode = (ref && ref.mount && ref.mount.mode) || 'flush';
    var eff = ref ? Planes.effOrient(ref, planes) : { tilt: parseFloat(p.tilt) || 0, azimuth: parseFloat(p.azimuth) || 0 };
    var d, step;
    if (mode === 'flush') { d = L; step = L; }
    else if (mode === 'ew') { d = L * Math.cos(eff.tilt * D2R); step = d; }
    else {
      var X = L * Math.sin(eff.tilt * D2R), foot = L * Math.cos(eff.tilt * D2R);
      var sun = winterSun(hour);
      var Y = X * Math.cos(eff.azimuth * D2R) / Math.tan(sun.alt * D2R);
      if (!isFinite(Y) || Y < 0) Y = 0;
      d = foot; step = foot + Y;
    }
    var sb = parseFloat(p.setback) > 0 ? parseFloat(p.setback) : 0;
    var pk = sol.ok ? Planes.pack(sol, perp, d, step, sb) : { total: 0, rows: [] };
    var used = linked.reduce(function (a, s) { return a + (s.count || 0); }, 0);
    return { sol: sol, linked: linked, perp: perp, d: d, pk: pk, used: used, pmaxP: pmaxP, setback: sb };
  }

  /* One dotted to-scale polygon per plane with the packed panels inside and a capacity
     verdict (Σ linked string counts vs how many fit). */
  function planeSVG(p, i, portrait, hour) {
    var col = PLANE_COLORS[i % PLANE_COLORS.length];
    var headOpen = '<div style="font-size:12px;margin:10px 0 4px;display:flex;gap:6px;align-items:center;flex-wrap:wrap">' +
      '<span class="str-tag" style="background:' + col + '">P' + (i + 1) + '</span> ' +
      '<span style="color:var(--text3)">β = ' + fnum(p.tilt || 0) + '° · γ = ' + fnum(p.azimuth || 0) + '°</span>';
    var pc = planeCalc(p, portrait, hour);
    var sol = pc.sol;
    if (!sol.ok) {
      var st = planeStat(p);
      return headOpen + '</div>' + (st.html ? '<div class="' + st.cls + '">' + st.html + '</div>' : '');
    }
    var linked = pc.linked, perp = pc.perp, d = pc.d, pk = pc.pk, used = pc.used;

    /* verdict goes IN THE HEADER (above this plane's drawing) - below the SVG it reads
       as if it belonged to the NEXT plane's P-chip */
    var chips = linked.map(function (s) {
      var idx = strings.indexOf(s);
      var sc = (typeof STR_COLORS !== 'undefined') ? STR_COLORS[idx % STR_COLORS.length] : 'var(--clr-primary)';
      return '<span class="str-tag" style="background:' + sc + '">S' + (idx + 1) + '</span>';
    }).join(' ');
    var verdict;
    if (!linked.length) verdict = '<span style="color:var(--text3)">' + tr('pln.nostr') + ' · ' + pk.total + ' ' + tr('pln.fits') + '</span>';
    else if (used <= pk.total) verdict = chips + ' <span class="pln-verdict" style="margin-top:0">' + used + ' ' + tr('pln.linkedmod') + ' · ' + pk.total + ' ' + tr('pln.fits') +
      ' · <b style="color:var(--ok,#1f9d4d)">OK</b></span>';
    else verdict = chips + ' <span class="pln-verdict" style="margin-top:0">' + used + ' ' + tr('pln.linkedmod') + ' · ' + pk.total + ' ' + tr('pln.fits') +
      ' · <b style="color:#e53935">' + tr('pln.over') + ' ' + (used - pk.total) + '</b></span>';
    var head = headOpen + ' <span style="color:var(--text3)">·</span> ' + verdict + '</div>';

    var xs = sol.poly.map(function (q) { return q[0]; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var W = 560, padL = 46, padR = 46, padT = 20, padB = 26;
    var scale = Math.min((W - padL - padR) / ((maxX - minX) || 1), 260 / (sol.h || 1));
    var H = sol.h * scale + padT + padB;
    function sx(x) { return padL + (x - minX) * scale; }
    function sy(y) { return padT + (sol.h - y) * scale; }
    var pts = sol.poly.map(function (q) { return sx(q[0]).toFixed(1) + ',' + sy(q[1]).toFixed(1); }).join(' ');
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H.toFixed(0) + '">';
    pk.rows.forEach(function (r) {
      for (var c = 0; c < r.n; c++) {
        svg += '<rect x="' + sx(r.x + c * perp).toFixed(1) + '" y="' + sy(r.y + d).toFixed(1) +
          '" width="' + Math.max(0.5, perp * scale - 1.2).toFixed(1) + '" height="' + Math.max(0.5, d * scale - 1.2).toFixed(1) +
          '" rx="1.2" fill="var(--clr-primary)" opacity="0.8"/>';
      }
    });
    svg += '<polygon points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="1.6" stroke-dasharray="6 4"/>';
    /* edge-setback boundary: the inner polygon panels must stay inside (faint, finer dash) */
    if (pc.setback > 0) {
      var ip = Planes.inset(sol.poly, pc.setback);
      if (ip) {
        var ipts = ip.map(function (q) { return sx(q[0]).toFixed(1) + ',' + sy(q[1]).toFixed(1); }).join(' ');
        svg += '<polygon points="' + ipts + '" fill="none" stroke="' + col + '" stroke-width="1" stroke-dasharray="2 3" opacity="0.55"/>';
      }
    }
    /* dimension labels on the four sides */
    var T = parseFloat(p.top) || 0, B = parseFloat(p.bottom) || 0;
    svg += txt(sx(B / 2), sy(0) + 16, 'B = ' + fnum(B) + ' m', 'svg-dimtxt');
    if (T > 0) svg += txt(sx(sol.x + T / 2), sy(sol.h) - 7, 'T = ' + fnum(T) + ' m', 'svg-dimtxt');
    svg += txt(sx(Math.min(0, sol.x) + 0) - 6, (sy(0) + sy(sol.h)) / 2 - 4, 'L = ' + fnum(p.left) + ' m', 'svg-dimtxt', 'end');
    svg += txt(sx(Math.max(B, sol.x + T)) + 6, (sy(0) + sy(sol.h)) / 2 - 4, 'R = ' + fnum(p.right) + ' m', 'svg-dimtxt', 'start');
    svg += '</svg>';

    return head + svg;
  }

  function drawPlanes() {
    var card = document.getElementById('mnt-planes-card');
    var host = document.getElementById('mnt-planes-svg');
    /* planes REPLACE the legacy rectangle: hide the area card + the rectangle top view */
    document.getElementById('mnt-area-card').style.display = planes.length ? 'none' : '';
    document.getElementById('mnt-plan-card').style.display = planes.length ? 'none' : '';
    if (!planes.length) { card.style.display = 'none'; host.innerHTML = ''; return; }
    card.style.display = '';
    var portrait = document.getElementById('mnt-orient').value === 'portrait';
    var hour = parseFloat(document.getElementById('mnt-hour').value) || 12;
    host.innerHTML = planes.map(function (p, i) { return planeSVG(p, i, portrait, hour); }).join('');
  }

  ['mnt-orient', 'mnt-tilt', 'mnt-az', 'mnt-hour', 'mnt-roofw', 'mnt-roofd'].forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener('change', function () { compute(true); });
    el.addEventListener('input', function () { compute(true); });
  });

  /* β/γ are per-String - write edits back into the selected String (the array Yield reads).
     Linked string: the β input edits the RACK tilt Δβ (single/ew; flush is read-only) and the
     γ input edits the PANEL azimuth (mount.rackAz) which ADDS to the plane azimuth - the
     stored s.azimuth is always the SUM (written by syncLinked()). */
  document.getElementById('mnt-tilt').addEventListener('input', function () {
    var s = strings[selStringIdx]; if (!s) return;
    if (s.planeId != null && Planes.byId(planes, s.planeId)) {
      var mode = document.getElementById('mnt-mode').value;
      if (mode === 'flush') return;                       // read-only (disabled)
      s.mount = s.mount || { mode: mode };
      s.mount.rackTilt = parseFloat(this.value) || 0;
      Project.set('strings', strings);
      syncLinked(); updateEffNote(); renderStrSummary();
      return;
    }
    s.tilt = parseFloat(this.value) || 0; Project.set('strings', strings); renderStrSummary();
  });
  document.getElementById('mnt-az').addEventListener('input', function () {
    var s = strings[selStringIdx]; if (!s) return;
    if (s.planeId != null && Planes.byId(planes, s.planeId)) {
      s.mount = s.mount || { mode: document.getElementById('mnt-mode').value };
      s.mount.rackAz = parseFloat(this.value) || 0;
      Project.set('strings', strings);
      syncLinked(); updateEffNote(); renderStrSummary();
      return;
    }
    s.azimuth = parseFloat(this.value) || 0; Project.set('strings', strings); renderStrSummary();
  });

  /* Layout mode. Linked string → it becomes the string's MOUNT mode (s.mount.mode); ew
     auto-assigns alternating E/W faces among the strings on the same plane. Unlinked →
     legacy behaviour byte-for-byte: ew pre-sets String 1 → −90° (East), String 2 → +90°
     (West), only on the explicit choice, never clobbering plane-derived values. */
  document.getElementById('mnt-mode').addEventListener('change', function () {
    var s = strings[selStringIdx];
    if (s && s.planeId != null && Planes.byId(planes, s.planeId)) {
      s.mount = s.mount || {};
      s.mount.mode = this.value;
      if (this.value === 'flush') {
        s.mount.rackAz = 0;                 // coplanar: panels follow the plane (γ_eff = plane γ)
      } else if (this.value === 'ew') {
        if (s.mount.rackTilt == null) s.mount.rackTilt = 10;
        var face = 'E';                     // alternate panel γ ∓90 among the plane's ew strings
        strings.forEach(function (o) {
          if (o.planeId === s.planeId && o.mount && o.mount.mode === 'ew') {
            o.mount.face = face; o.mount.rackAz = face === 'E' ? -90 : 90;
            face = face === 'E' ? 'W' : 'E';
          }
        });
      } else if (this.value === 'single') {
        if (s.mount.rackTilt == null) s.mount.rackTilt = 30;
        if (s.mount.rackAz == null) s.mount.rackAz = 0;
      }
      Project.set('strings', strings);
      syncLinked(); applyLinkUI(); renderStrSummary();
    } else if (this.value === 'ew' && strings.length) {
      if (strings[0] && strings[0].planeId == null) strings[0].azimuth = -90;
      if (strings[1] && strings[1].planeId == null) strings[1].azimuth = 90;
      Project.set('strings', strings);
      applyString(selStringIdx);   // refresh the γ input for the selected string
      renderStrSummary();
    }
    compute(true);
  });

  /* Link the selected string to a plane. On link the default mount is coplanar; a pitched
     plane (β > FLAT_MAX) forces coplanar (no 3D tilt composition - see planes.js). */
  document.getElementById('mnt-plane').addEventListener('change', function () {
    var s = strings[selStringIdx]; if (!s) return;
    if (this.value === '') {
      s.planeId = null;
    } else {
      s.planeId = parseInt(this.value, 10);
      s.mount = s.mount || {};
      if (!s.mount.mode) s.mount.mode = 'flush';
      var p = Planes.byId(planes, s.planeId);
      if (p && (parseFloat(p.tilt) || 0) > Planes.FLAT_MAX && s.mount.mode !== 'flush') s.mount.mode = 'flush';
    }
    Project.set('strings', strings);
    syncLinked(); renderPlanes(); applyLinkUI(); renderStrSummary();
    compute(true);
  });

  /* Plane editor: in-place field updates (no re-render → keeps input focus). */
  document.getElementById('mnt-planes').addEventListener('input', function (e) {
    var row = e.target.closest('.str-row'); if (!row) return;
    var p = Planes.byId(planes, parseInt(row.dataset.pid, 10)); if (!p) return;
    var f = e.target.dataset.f; if (!f) return;
    p[f] = e.target.value === '' ? null : parseFloat(e.target.value);
    savePlanes();
    var st = planeStat(p), stEl = row.querySelector('.pln-stat');
    if (stEl) { stEl.className = st.cls; stEl.innerHTML = st.html; }
    syncLinked(); applyLinkUI(); renderStrSummary();
    compute(true);
  });
  document.getElementById('mnt-planes').addEventListener('click', function (e) {
    /* "Choose string" link -> jump to the Layout card's string selector to assign a string to this
       plane (assignment is string-first: pick a string, then its plane in the Roof plane dropdown). */
    var ch = e.target.getAttribute && e.target.getAttribute('data-choose');
    if (ch != null) {
      e.preventDefault();
      var ss = document.getElementById('mnt-string');
      if (ss) { ss.scrollIntoView({ behavior: 'smooth', block: 'center' }); try { ss.focus(); } catch (x) {} }
      return;
    }
    var rm = e.target.getAttribute && e.target.getAttribute('data-rm');
    if (rm == null) return;
    planes = planes.filter(function (p) { return p.id !== parseInt(rm, 10); });
    savePlanes();
    syncLinked(); renderPlanes(); applyLinkUI(); renderStrSummary();
    compute(true);
  });
  document.getElementById('mnt-addplane').addEventListener('click', function () {
    var id = planes.reduce(function (m, p) { return Math.max(m, p.id || 0); }, 0) + 1;
    planes.push({ id: id, top: null, bottom: null, left: null, right: null, tilt: 35, azimuth: 0, setback: null });
    savePlanes(); renderPlanes(); applyLinkUI();
    compute(true);
  });

  /* (legacy window.renderList / window.saveStep / Explain.wireToggle removed —
     React re-renders via the returned render(), every edit persists via
     compute(true), and Explain.render() gates .xpl-host on Explain.isOn().) */

  /* prefill tilt from a prior mounting choice */
  var mnt = Project.section('mounting');
  if (mnt) {
    /* β/γ come from the selected String (applyString), not from mounting.* - see above. */
    if (mnt.mode) document.getElementById('mnt-mode').value = mnt.mode;
    if (mnt.orient) document.getElementById('mnt-orient').value = mnt.orient;
    if (mnt.hour != null) document.getElementById('mnt-hour').value = String(mnt.hour);
    if (mnt.roofW != null) document.getElementById('mnt-roofw').value = mnt.roofW;
    if (mnt.roofD != null) document.getElementById('mnt-roofd').value = mnt.roofD;
  }
  renderPlanes();
  syncLinked();        // re-derive linked strings' β/γ in case planes changed elsewhere
  applyLinkUI();       // after the mode prefill above, so the lock state matches it
  compute(hasModule);   // persist + mark done on load when a module is set

  return {
    /* = legacy window.renderList (language switch): re-render WITHOUT persisting */
    render: function () {
      if (dead || !document.getElementById('mnt-results')) return;
      renderPlanes(); applyLinkUI(); compute(false);
    },
    destroy: function () { dead = true; },
  };
}
