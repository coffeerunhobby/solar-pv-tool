/* Defectoscopy (phase E · Maintenance) — React port of defectoscopy.html using
   the LEGACY-DRIVER pattern (see Economics.jsx): the page's pipeline is
   inherently DOM-driven (picker/points rebuilt as innerHTML, metrics/verdict/
   explain written by id, Chart.js overlay), so the entire inline IIFE is
   transplanted verbatim into a mount effect that owns the DOM below the
   React-rendered skeleton. React owns: layout/labels (t()), the learn toggle,
   re-render on language/theme/learn switches, chart destruction on unmount.
   Persistence (verbatim rows via persist()) + markDone stay identical to
   legacy (markDone at the end of a successful analyze()). */
import { useEffect, useRef } from 'react';
import { useI18n } from '../store/useI18n.js';
import { useTheme } from '../store/useTheme.js';
import { useLearn, setLearn } from '../store/useLearn.js';
import './Defectoscopy.css';

export default function Defectoscopy() {
  const { t, lang } = useI18n();
  const { dark } = useTheme();
  const { on: learnOn } = useLearn();
  const api = useRef(null);   // { render, destroy } from the transplanted engine

  useEffect(() => {
    api.current = setupDefectoscopy();   // full legacy init (picker + points + listeners + auto-run)
    return () => { api.current && api.current.destroy(); api.current = null; };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  /* language / theme / learn-mode changes → legacy re-render (= legacy renderList:
     repaint picker + points, re-analyze if a run already happened so the verdict,
     metrics, chart colors and Explain blocks pick up the new language/theme). */
  useEffect(() => { api.current && api.current.render(); }, [lang, dark, learnOn]);

  return (
    <>
      <div className="sn-crumb"><b>{t('nav.phaseE')}</b> › <span>{t('nav.defectoscopy')}</span></div>
      <div className="dfx-scroll">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <label className="xpl-toggle">
            <input type="checkbox" id="dfx-learn" checked={learnOn} onChange={(e) => setLearn(e.target.checked)} />
            {' '}<span>{t('xpl.learnmode')}</span>
          </label>
        </div>
        <div className="row g-3">

          {/* ── inputs ── */}
          <div className="col-lg-4">
            <div className="card">
              <div className="sec">{t('dfx.module')}</div>
              <select id="dfx-brand" className="cmp-sel" />
              <div className="cmp-child"><span className="cmp-arrow">↳</span>
                <select id="dfx-module" className="cmp-sel" /></div>
              <div id="dfx-modlink" className="mod-db-row" style={{ display: 'none' }} />
              <div id="dfx-ds" className="ds-note" />
            </div>

            <div className="card">
              <div className="sec">{t('dfx.points')}</div>
              <div className="appl-row appl-head">
                <span>I (A)</span><span>V (V)</span><span>G (W/m²)</span><span>T (°C)</span><span></span>
              </div>
              <div id="dfx-points" />
              <button className="btn btn-outline-secondary btn-sm w-100" id="dfx-addpt">{t('dfx.addpoint')}</button>
              <button className="btn btn-p w-100" id="dfx-run" style={{ marginTop: '.5rem' }}>{t('dfx.analyze')}</button>
              <div className="ds-note" dangerouslySetInnerHTML={{ __html: t('dfx.condnote') }} />
            </div>
          </div>

          {/* ── results ── */}
          <div className="col-lg-8">
            <div className="card">
              <div className="sec">{t('dfx.chart')}</div>
              <div style={{ position: 'relative', height: 340 }}><canvas id="dfx-chart" role="img" aria-label="I-V curve chart" /></div>
            </div>
            <div className="dfx-grid" id="dfx-metrics" />
            <div id="dfx-verdict" className="ratio-box ratio-none">{t('dfx.prompt')}</div>
            <div id="dfx-explain" className="xpl-host" />
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══ Transplanted legacy engine (defectoscopy.html inline IIFE, verbatim except:
   window.renderList/saveStep/onThemeChange hooks removed — React drives those via
   the returned render(); Explain.wireToggle removed — the React toggle + useLearn
   drive re-renders (Explain.render() reads the flag itself); SiteNav.refresh()
   after markDone removed — the Stepper subscribes to Project.onChange;
   addEventListener wiring unchanged (nodes die with the component). ═══ */
function setupDefectoscopy() {
  'use strict';

  function tr(k) { return (typeof t === 'function') ? t(k) : k; }
  /* house number format (the dev guide): 2 dp, trailing zeros stripped; 4 dp for resistances */
  function fnum(v)  { return (+v).toFixed(2).replace(/\.?0+$/, ''); }
  function fnum4(v) { return (+v).toFixed(4).replace(/\.?0+$/, ''); }
  function escTxt(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  var MODS = (typeof MODULE_LIST !== 'undefined') ? MODULE_LIST : [];
  var MOD_BRANDS = (typeof MODULE_BRANDS !== 'undefined') ? MODULE_BRANDS : [];
  function modById(id) { return MODS.filter(function (m) { return m.id === id; })[0] || null; }

  var saved = Project.section('defectoscopy') || {};

  /* ── Module picker: brand → model cascade + spec link, identical to components.html.
     Not string-based - the tested module is chosen directly from the DB. ── */
  var curModId = saved.moduleId || null;
  var brandSel = document.getElementById('dfx-brand');
  var modSel   = document.getElementById('dfx-module');
  var linkRow  = document.getElementById('dfx-modlink');

  function selTxt() { return (typeof LANG_CURRENT !== 'undefined' && LANG_CURRENT === 'en') ? 'Select…' : 'Selectează…'; }
  function bName(id) { var b = MOD_BRANDS.filter(function (x) { return x.id === id; })[0]; return b ? b.name : (id || '?'); }
  function brandsPresent() {
    var p = {}; MODS.forEach(function (it) { if (it.brandId) p[it.brandId] = true; });
    return Object.keys(p).sort(function (a, b) { return bName(a).localeCompare(bName(b)); });
  }
  function brandOf(id) { var it = MODS.filter(function (x) { return x.id === id; })[0]; return it ? it.brandId : null; }
  function brandOptions(selBrand) {
    return '<option value=""' + (selBrand ? '' : ' selected') + '>' + escTxt(selTxt()) + '</option>' +
      brandsPresent().map(function (id) {
        return '<option value="' + escTxt(id) + '"' + (id === selBrand ? ' selected' : '') + '>' + escTxt(bName(id)) + '</option>';
      }).join('');
  }
  function modelOptions(brandId, selId) {
    var opts = '<option value=""' + (selId ? '' : ' selected') + '>' + escTxt(selTxt()) + '</option>';
    if (!brandId) return opts;
    return opts + MODS.filter(function (it) { return it.brandId === brandId; }).map(function (it) {
      return '<option value="' + escTxt(it.id) + '"' + (it.id === selId ? ' selected' : '') + '>' + escTxt(it.name) + '</option>';
    }).join('');
  }
  function showDatasheet() {
    var mod = modById(curModId), el = document.getElementById('dfx-ds');
    el.innerHTML = mod
      ? 'I<sub>sc</sub> ' + mod.isc + ' A · V<sub>OC</sub> ' + mod.voc + ' V · I<sub>mp</sub> ' + mod.imp +
        ' A · V<sub>mp</sub> ' + mod.vmp + ' V · λ<sub>I</sub> ' + mod.li + ' · λ<sub>V</sub> ' + mod.lv + ' %/°C'
      : '';
  }
  function renderLink() {
    if (curModId) {
      linkRow.innerHTML = '<a class="mod-db-link" href="modules.html#' + escTxt(curModId) + '">▦ ' + escTxt(tr('cmp.modspecs')) + ' →</a>';
      linkRow.style.display = '';
    } else { linkRow.innerHTML = ''; linkRow.style.display = 'none'; }
  }
  /* paint (re)builds both selects from curModId - also used on language switch */
  function paintPicker() {
    var b = curModId ? brandOf(curModId) : (brandSel.value || '');
    brandSel.innerHTML  = brandOptions(b);
    modSel.innerHTML    = modelOptions(b, curModId);
    showDatasheet(); renderLink();
  }
  paintPicker();
  brandSel.addEventListener('change', function () {
    curModId = null;
    modSel.innerHTML = modelOptions(this.value, '');
    showDatasheet(); renderLink(); persist();
  });
  modSel.addEventListener('change', function () {
    curModId = this.value || null;
    showDatasheet(); renderLink(); persist();
  });

  /* ── Measured points - consumption-style rows {i, v, g, t} ──
     G and T are PER POINT: the rows are read one at a time with a variable load, and
     irradiance/temperature drift between readings - each point is translated to STC
     with ITS OWN conditions (SCIENCE.md §11.3). Rows are restored VERBATIM from the
     project (raw strings, original order, exact count - empties included), so the list
     survives a refresh exactly as the user left it. A project with no saved points
     starts with one empty row (G/T prefilled 1000/25); new rows inherit the previous
     row's G/T since conditions drift slowly. Legacy {v,i}-only blobs get G/T filled
     from the old page-level saved.g/saved.tc. */
  var points = (Array.isArray(saved.points) && saved.points.length)
    ? saved.points.map(function (p) {
        return {
          i: p.i == null ? '' : p.i,
          v: p.v == null ? '' : p.v,
          g: p.g != null ? p.g : (saved.g  != null ? saved.g  : ''),
          t: p.t != null ? p.t : (saved.tc != null ? saved.tc : ''),
        };
      })
    : [{ i: '', v: '', g: '1000', t: '25' }];

  /* Persist the live UI rows verbatim (count + order + empties) plus the module, on every
     edit - no need to press Analyse for the list to survive a refresh. The old page-level
     g/tc fields are obsoleted (conditions live per point now). */
  function persist() {
    Project.patch('defectoscopy', {
      moduleId: curModId, g: null, tc: null,
      points: points.map(function (p) { return { i: p.i, v: p.v, g: p.g, t: p.t }; }),
    });
  }

  function renderPoints() {
    var host = document.getElementById('dfx-points');
    host.innerHTML = points.map(function (p, i) {
      return '<div class="appl-row" data-pi="' + i + '">' +
        '<input type="number" data-f="i" value="' + escTxt(p.i) + '" step="0.01" min="0" placeholder="A">' +
        '<input type="number" data-f="v" value="' + escTxt(p.v) + '" step="0.1" min="0" placeholder="V">' +
        '<input type="number" data-f="g" value="' + escTxt(p.g) + '" step="10" min="0" placeholder="W/m²">' +
        '<input type="number" data-f="t" value="' + escTxt(p.t) + '" step="0.5" placeholder="°C">' +
        '<button class="appl-rm" data-rm="' + i + '" title="&times;">&times;</button>' +
      '</div>';
    }).join('');
  }
  document.getElementById('dfx-points').addEventListener('input', function (e) {
    var row = e.target.closest('.appl-row'); if (!row) return;
    var p = points[+row.dataset.pi]; if (!p) return;
    p[e.target.dataset.f] = e.target.value;
    persist();
  });
  document.getElementById('dfx-points').addEventListener('click', function (e) {
    var rm = e.target.closest('.appl-rm'); if (!rm) return;
    points.splice(+rm.dataset.rm, 1);
    if (!points.length) points.push({ i: '', v: '', g: '1000', t: '25' });   // never blank - keep one row
    renderPoints();
    persist();
  });
  document.getElementById('dfx-addpt').addEventListener('click', function () {
    var last = points[points.length - 1] || {};
    points.push({ i: '', v: '', g: last.g != null ? last.g : '1000', t: last.t != null ? last.t : '25' });
    renderPoints();
    persist();
  });
  renderPoints();

  /* ── Factory reference: single-diode model fitted to the datasheet (Villalva-style) ──
     a (modified ideality) from the explicit datasheet estimate, then Rs swept upward,
     Rsh forced so P(Vmp)=Pmax, stop when the model's max power meets the datasheet. */
  function modelI(p, V) {
    var I = p.Iph;
    for (var k = 0; k < 30; k++) {
      var e = Math.exp((V + I * p.Rs) / p.a);
      var f = p.Iph - p.I0 * (e - 1) - (V + I * p.Rs) / p.Rsh - I;
      var fp = -p.I0 * e * p.Rs / p.a - p.Rs / p.Rsh - 1;
      var d = f / fp; I -= d;
      if (Math.abs(d) < 1e-7) break;
    }
    return I;
  }
  function modelCurve(p, vmax, n) {
    var pts = [], best = { p: 0, v: 0, i: 0 };
    for (var k = 0; k <= n; k++) {
      var V = vmax * k / n, I = modelI(p, V);
      if (I < 0) I = 0;
      pts.push({ x: +V.toFixed(3), y: +I.toFixed(4) });
      if (V * I > best.p) best = { p: V * I, v: V, i: I };
    }
    return { pts: pts, pmax: best };
  }
  function fitFactory(mod) {
    var Isc = +mod.isc, Voc = +mod.voc, Imp = +mod.imp, Vmp = +mod.vmp;
    var a = (2 * Vmp - Voc) / (Math.log((Isc - Imp) / Isc) + Imp / (Isc - Imp));
    /* Feasibility cap: the ideal-diode current at Vmp must not exceed Isc - Imp,
       i.e. a < (Voc - Vmp) / ln(Isc / (Isc - Imp)) - otherwise the Rs sweep has no
       room at Rs = 0 (diagnosed on LONGi LR5-54HTH-415M / Aiko Neostar datasheets). */
    var aCap = 0.98 * (Voc - Vmp) / Math.log(Isc / (Isc - Imp));
    if (!(a > 0) || a > aCap) a = aCap;
    if (!(a > 0)) return null;
    var I0 = Isc * Math.exp(-Voc / a);
    var Pexp = Vmp * Imp, best = null;
    for (var Rs = 0; Rs <= 1.5; Rs += 0.005) {
      var den = Vmp * Isc - Vmp * I0 * (Math.exp((Vmp + Imp * Rs) / a) - 1) - Pexp;
      if (den <= 0) break;
      var Rsh = Vmp * (Vmp + Imp * Rs) / den;
      if (Rsh <= 0) break;
      var p = { a: a, Rs: Rs, Rsh: Rsh, I0: I0, Iph: (Rsh + Rs) / Rsh * Isc };
      var c = modelCurve(p, Voc * 1.02, 60);
      best = { p: p, pmax: c.pmax };
      if (c.pmax.p <= Pexp) break;
    }
    return best;
  }

  /* ── Measured-curve helpers ── */
  function interpAt0V(pts) {     /* Isc: I at V=0 (extrapolate the first segment) */
    if (pts[0].v <= 0.001) return pts[0].i;
    if (pts.length < 2) return pts[0].i;
    var a = pts[0], b = pts[1];
    return a.i - (b.i - a.i) / (b.v - a.v) * a.v;
  }
  function interpAt0I(pts) {     /* Voc: V at I=0 (extrapolate the last segment) */
    var n = pts.length;
    if (pts[n - 1].i <= 0.001) return pts[n - 1].v;
    if (n < 2) return pts[n - 1].v;
    var a = pts[n - 2], b = pts[n - 1];
    if (a.i === b.i) return b.v;
    return b.v + b.i * (b.v - a.v) / (a.i - b.i);
  }
  function curvePmax(pts) {
    var best = { p: 0, v: 0, i: 0 };
    for (var k = 0; k < pts.length - 1; k++) {
      for (var s = 0; s <= 10; s++) {
        var f = s / 10;
        var V = pts[k].v + f * (pts[k + 1].v - pts[k].v);
        var I = pts[k].i + f * (pts[k + 1].i - pts[k].i);
        if (V * I > best.p) best = { p: V * I, v: V, i: I };
      }
    }
    return best;
  }
  function slopeFit(pts) {       /* least-squares dI/dV */
    if (pts.length < 2) return null;
    var n = pts.length, sv = 0, si = 0, svv = 0, svi = 0;
    pts.forEach(function (p) { sv += p.v; si += p.i; svv += p.v * p.v; svi += p.v * p.i; });
    var d = n * svv - sv * sv;
    if (Math.abs(d) < 1e-9) return null;
    return (n * svi - sv * si) / d;
  }
  function findNotch(pts, voc, isc) {
    /* a step = an unusually steep segment followed by a much flatter one, mid-curve */
    var seg = [];
    for (var k = 0; k < pts.length - 1; k++) {
      var dv = pts[k + 1].v - pts[k].v;
      if (dv <= 0) continue;
      seg.push({ s: (pts[k + 1].i - pts[k].i) / dv, vm: (pts[k].v + pts[k + 1].v) / 2 });
    }
    var mid = seg.filter(function (g) { return g.vm > 0.15 * voc && g.vm < 0.8 * voc; });
    if (mid.length < 4) return false;
    var mags = mid.map(function (g) { return Math.abs(g.s); }).sort(function (a, b) { return a - b; });
    var med = mags[Math.floor(mags.length / 2)] || 0;
    for (var j = 0; j < mid.length - 1; j++) {
      if (Math.abs(mid[j].s) > Math.max(4 * med, 0.08 * isc / (0.05 * voc)) &&
          Math.abs(mid[j + 1].s) < 0.5 * Math.abs(mid[j].s)) return true;
    }
    return false;
  }

  /* ── Chart ── */
  var chart = null;
  var dead = false;
  function drawChart(meas, corr, fact) {
    var dark = (typeof isDark === 'function') ? isDark() : false;
    var grid = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    var tick = dark ? '#aaa' : '#555';
    if (chart) { chart.destroy(); chart = null; }
    chart = new Chart(document.getElementById('dfx-chart'), {
      type: 'scatter',
      data: { datasets: [
        { label: tr('dfx.factory'),   data: fact, showLine: true, borderColor: '#1a5c2a', backgroundColor: '#1a5c2a', pointRadius: 0, borderWidth: 2, tension: 0.25 },
        { label: tr('dfx.corrected'), data: corr, showLine: true, borderColor: '#2563eb', backgroundColor: '#2563eb', pointRadius: 3, borderWidth: 1.5 },
        { label: tr('dfx.measured'),  data: meas, showLine: true, borderColor: '#d97706', backgroundColor: '#d97706', pointRadius: 3, borderWidth: 1, borderDash: [4, 3] },
      ]},
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: tick, boxWidth: 12, font: { size: 11 } } } },
        scales: {
          x: { title: { display: true, text: 'V (V)', color: tick }, grid: { color: grid }, ticks: { color: tick }, min: 0 },
          y: { title: { display: true, text: 'I (A)', color: tick }, grid: { color: grid }, ticks: { color: tick }, min: 0 },
        },
      },
    });
  }

  /* ── Analysis ── */
  var lastRun = false;
  function metricCell(val, unit, lbl, sub, warn) {
    return '<div class="metric' + (warn ? ' warn' : '') + '">' +
      '<div class="metric-val">' + val + (unit ? ' <span style="font-size:12px">' + unit + '</span>' : '') + '</div>' +
      '<div class="metric-lbl">' + lbl + '</div>' +
      (sub ? '<div class="metric-sub">' + sub + '</div>' : '') + '</div>';
  }
  /* The React skeleton renders the static prompt; a computed verdict replaces it
     via innerHTML (React never patches these children again - the engine's render()
     repaints them after every language/theme pass). */
  function verdict(msgs, ok) {
    var v = document.getElementById('dfx-verdict');
    v.className = 'ratio-box ' + (ok ? 'ratio-ok' : 'ratio-warn');
    v.innerHTML = msgs.join('<br><br>');
  }
  function verdictNone(key) {
    var v = document.getElementById('dfx-verdict');
    v.className = 'ratio-box ratio-none';
    v.textContent = tr(key);
  }

  function analyze() {
    var mod = modById(curModId);
    if (!mod) { verdictNone('dfx.needmod'); return; }
    /* each point carries its own measurement conditions; blank G/T default to STC */
    var raw = points.map(function (p) {
      var g = parseFloat(p.g), t = parseFloat(p.t);
      return {
        i: parseFloat(p.i), v: parseFloat(p.v),
        g: (isFinite(g) && g > 0) ? g : 1000,
        t: isFinite(t) ? t : 25,
      };
    })
      .filter(function (p) { return isFinite(p.v) && isFinite(p.i) && p.v >= 0 && p.i >= 0; })
      .sort(function (a, b) { return a.v - b.v; });
    if (raw.length < 5) { verdictNone('dfx.needpts'); return; }

    /* factory reference */
    var fit = fitFactory(mod);
    if (!fit) { verdictNone('dfx.needmod'); return; }
    var fc = modelCurve(fit.p, mod.voc * 1.02, 80);
    var P_f = fc.pmax.p, FF_f = P_f / (mod.isc * mod.voc);

    /* ── Point-wise IEC 60891 procedure-1 translation to STC (κ=0; Rs from the fit) ──
       Points are read one at a time, so each has its own (G_k, T_k). The irradiance
       term needs the module's Isc AT THAT POINT's conditions, so first anchor Isc at
       STC from the V≈0 row (measured at its own G₁, T₁), then shift each point:
         Isc,STC = Isc,m·1000/G₁ + α·(25 − T₁)
         I₂ = I₁ + Isc,STC·(1 − G_k/1000) + α·(25 − T_k)·G_k/1000
         V₂ = V₁ + β·(25 − T_k) − Rs·(I₂ − I₁)
       (exact: substituting the V≈0 row reproduces Isc,STC identically - SCIENCE §11.3) */
    var IscMeas  = interpAt0V(raw);
    var g1 = raw[0].g, t1 = raw[0].t;        /* conditions of the V≈0 (lowest-V) row */
    var alphaAbs = mod.li / 100 * mod.isc;   /* A/°C */
    var betaAbs  = mod.lv / 100 * mod.voc;   /* V/°C */
    var IscSTC   = IscMeas * 1000 / g1 + alphaAbs * (25 - t1);
    var corr = raw.map(function (p) {
      var I2 = p.i + IscSTC * (1 - p.g / 1000) + alphaAbs * (25 - p.t) * p.g / 1000;
      var V2 = p.v + betaAbs * (25 - p.t) - fit.p.Rs * (I2 - p.i);
      return { v: Math.max(0, V2), i: Math.max(0, I2) };
    }).sort(function (a, b) { return a.v - b.v; });

    /* measured metrics at STC */
    var Isc_m = interpAt0V(corr), Voc_m = interpAt0I(corr);
    var mpp = curvePmax(corr);
    var FF_m = (Isc_m > 0 && Voc_m > 0) ? mpp.p / (Isc_m * Voc_m) : 0;
    var deficit = (1 - mpp.p / P_f) * 100;

    /* slope estimates: Rs near Voc, Rsh near Isc */
    var hiPts = corr.filter(function (p) { return p.v > 0.85 * Voc_m; });
    var loPts = corr.filter(function (p) { return p.v < 0.2 * Voc_m; });
    var sHi = slopeFit(hiPts), sLo = slopeFit(loPts);
    var Rs_est  = (sHi && sHi < 0) ? -1 / sHi : null;
    var Rsh_est = (sLo != null && sLo < -1e-4) ? -1 / sLo : null;   /* near-flat → very high Rsh */
    var notch = findNotch(corr, Voc_m, Isc_m);

    /* verdict rules (most specific first) */
    var msgs = [], iscRatio = Isc_m / mod.isc, vocRatio = Voc_m / mod.voc;
    if (notch) msgs.push(tr('dfx.v_shadow'));
    if (vocRatio < 0.85) msgs.push(tr('dfx.v_substring'));
    if (!notch && vocRatio >= 0.85 && iscRatio < 0.92) msgs.push(tr('dfx.v_soil'));
    if (Rs_est != null && fit.p.Rs > 0 && Rs_est > 2.5 * fit.p.Rs && FF_m < 0.95 * FF_f) msgs.push(tr('dfx.v_rs'));
    if (Rsh_est != null && Rsh_est < Math.min(0.3 * fit.p.Rsh, 100)) msgs.push(tr('dfx.v_rsh'));
    var ok = false;
    if (!msgs.length) {
      if (deficit <= 5) { msgs.push(tr('dfx.v_ok')); ok = true; }
      else msgs.push(tr('dfx.v_degraded'));
    }
    verdict(msgs, ok);

    /* metrics */
    document.getElementById('dfx-metrics').innerHTML =
      metricCell(fnum(mpp.p), 'W', tr('dfx.pmax'), tr('dfx.fromds') + ': ' + fnum(P_f) + ' W', false) +
      metricCell(fnum(deficit), '%', tr('dfx.deficit'), 'FF ' + fnum(FF_m * 100) + '% · ' + tr('dfx.fromds') + ' ' + fnum(FF_f * 100) + '%', deficit > 5) +
      metricCell(fnum(Isc_m) + ' / ' + fnum(Voc_m), 'A / V', 'I<sub>sc</sub> / V<sub>OC</sub> @STC',
        tr('dfx.fromds') + ': ' + mod.isc + ' A / ' + mod.voc + ' V', iscRatio < 0.92 || vocRatio < 0.85) +
      metricCell(Rs_est != null ? fnum4(Rs_est) : '-', 'Ω', tr('dfx.rs'),
        tr('dfx.fromds') + ': ' + fnum4(fit.p.Rs) + ' Ω', Rs_est != null && Rs_est > 2.5 * fit.p.Rs) +
      metricCell(Rsh_est != null ? fnum(Rsh_est) : '> 10³', 'Ω', tr('dfx.rsh'),
        tr('dfx.fromds') + ': ' + fnum(fit.p.Rsh) + ' Ω', Rsh_est != null && Rsh_est < Math.min(0.3 * fit.p.Rsh, 100)) +
      (function () {
        /* per-point conditions → show the measured ranges */
        var gs = raw.map(function (p) { return p.g; }), ts = raw.map(function (p) { return p.t; });
        var gmn = Math.min.apply(null, gs), gmx = Math.max.apply(null, gs);
        var tmn = Math.min.apply(null, ts), tmx = Math.max.apply(null, ts);
        var gTxt = gmn === gmx ? fnum(gmn) : fnum(gmn) + '-' + fnum(gmx);
        var tTxt = tmn === tmx ? fnum(tmn) : fnum(tmn) + '-' + fnum(tmx);
        return metricCell(gTxt + ' / ' + tTxt, 'W/m² / °C', 'G / T (' + raw.length + ' pct)', 'IEC 60891 → STC', false);
      })();

    /* chart */
    drawChart(
      raw.map(function (p) { return { x: p.v, y: p.i }; }),
      corr.map(function (p) { return { x: p.v, y: p.i }; }),
      fc.pts
    );

    /* "Mod explicativ" - the working with the MPP-nearest measured point as the example,
       substituting THAT point's own (G, T) into the point-wise translation. */
    if (typeof Explain !== 'undefined') {
      var xp = '';
      var ex = raw.reduce(function (b, p) { return (p.v * p.i > b.v * b.i) ? p : b; }, raw[0]);
      var exI2 = ex.i + IscSTC * (1 - ex.g / 1000) + alphaAbs * (25 - ex.t) * ex.g / 1000;
      xp += Explain.block('STC: G = 1000 W/m², T = 25 °C', '', 'dfxp.g');
      xp += Explain.block(
        'I<sub>sc,STC</sub> = I<sub>sc,m</sub> · 1000/G₁ + α<sub>abs</sub> · (25 - T₁)',
        fnum(IscMeas) + ' × 1000/' + fnum(g1) + ' + ' + fnum4(alphaAbs) + ' × (25 - ' + fnum(t1) + ') = <b>' + fnum(IscSTC) + ' A</b>',
        'dfxp.iscstc');
      xp += Explain.block(
        'I<sub>STC</sub> = I + I<sub>sc,STC</sub> · (1 - G/1000) + α<sub>abs</sub> · (25 - T) · G/1000',
        fnum(ex.i) + ' + ' + fnum(IscSTC) + ' × (1 - ' + fnum(ex.g) + '/1000) + ' + fnum4(alphaAbs) + ' × (25 - ' + fnum(ex.t) + ') × ' + fnum(ex.g) + '/1000 = <b>' + fnum(exI2) + ' A</b>',
        'dfxp.ti');
      xp += Explain.block(
        'V<sub>STC</sub> = V + β<sub>abs</sub> · (25 - T) - R<sub>s</sub> · (I<sub>STC</sub> - I)',
        fnum(ex.v) + ' + ' + fnum4(betaAbs) + ' × (25 - ' + fnum(ex.t) + ') - ' + fnum4(fit.p.Rs) + ' × (' + fnum(exI2) + ' - ' + fnum(ex.i) + ') = <b>' + fnum(ex.v + betaAbs * (25 - ex.t) - fit.p.Rs * (exI2 - ex.i)) + ' V</b>',
        'dfxp.tv');
      xp += Explain.block(
        'FF = P<sub>max</sub> / (I<sub>sc</sub> · V<sub>OC</sub>)',
        fnum(mpp.p) + ' / (' + fnum(Isc_m) + ' × ' + fnum(Voc_m) + ') = <b>' + fnum(FF_m * 100) + ' %</b>',
        'dfxp.ff');
      xp += Explain.block(
        'deficit = 1 - P<sub>max,m</sub> / P<sub>max,f</sub>',
        '1 - ' + fnum(mpp.p) + ' / ' + fnum(P_f) + ' = <b>' + fnum(deficit) + ' %</b>',
        'dfxp.def');
      if (Rs_est != null) {
        xp += Explain.block(
          'R<sub>s,est</sub> = -1 / (dI/dV)|<sub>V→V<sub>OC</sub></sub>',
          '-1 / (' + fnum4(sHi) + ') = <b>' + fnum4(Rs_est) + ' Ω</b>',
          'dfxp.rs');
      }
      Explain.render(document.getElementById('dfx-explain'), xp);
    }

    /* persist (verbatim rows, via persist()) + mark the step done
       (the React Stepper subscribes to Project.onChange - no SiteNav.refresh) */
    persist();
    if (!Project.isDone('defectoscopy')) Project.markDone('defectoscopy');
    lastRun = true;
  }

  document.getElementById('dfx-run').addEventListener('click', analyze);

  /* auto-run only when the saved set has enough VALID points (avoids flashing the
     "need points" warning on a half-entered, persisted table). */
  if (saved.moduleId && Array.isArray(saved.points)) {
    var validCnt = saved.points.filter(function (p) {
      return isFinite(parseFloat(p.v)) && isFinite(parseFloat(p.i));
    }).length;
    if (validCnt >= 5) analyze();
  }

  return {
    /* = legacy window.renderList: repaint picker + rows, re-analyze if already run
       (refreshes verdict/metrics/Explain text and chart colors after a language,
       theme or learn-mode switch). */
    render: function () {
      if (dead || !document.getElementById('dfx-points')) return;
      paintPicker(); renderPoints();
      if (lastRun) analyze();
      else if (typeof Explain !== 'undefined') Explain.render(document.getElementById('dfx-explain'), '');
    },
    destroy: function () { dead = true; if (chart) { try { chart.destroy(); } catch (e) {} chart = null; } },
  };
}
