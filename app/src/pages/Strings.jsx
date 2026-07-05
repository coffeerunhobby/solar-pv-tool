/* String sizing (step 8) — React port of strings.html using the LEGACY-DRIVER
   pattern (like Obstacles): the §11 calculator lives untouched in string-ui.js
   (populateModule/InverterSelect, loadModule/InverterTemplate, calcString,
   renderStringResults — all reading/writing this page's DOM by id). React
   renders the form skeleton + result containers; a mount effect replays the
   legacy init sequence (prefill from project, string selector, saved site
   values, auto-calc); handlers call the legacy globals. The auto-estimate
   (estimateSite/applySiteEstimate) is copied verbatim below — it drives the
   clear-sky engine (Hofierka + Hay-Davies) + the temperature grid. */
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../store/useI18n.js';
import { useLearn } from '../store/useLearn.js';
import { useCatalog } from '../store/useCatalog.js';
import './Strings.css';

export default function Strings() {
  const { t } = useI18n();
  const { on: learnOn, setLearn } = useLearn();
  useCatalog();   // re-render when a catalog sync updates MODULE_LIST / INVERTER_LIST
  const [projectMode, setProjectMode] = useState(false);
  const stateRef = useRef({ pStrings: [], selStringIdx: 0, prefMod: false, prefInv: false });

  /* the derivation + method note are the "working" — re-gate on the learn flag
     (renderStringResults reveals them; legacy applyLearn re-hides) */
  function applyLearn(on) {
    const iv = document.getElementById('ss-intermediate');
    const note = document.getElementById('ss-method');
    if (iv)   iv.style.display   = (on && iv.innerHTML.trim()) ? '' : 'none';
    if (note) note.style.display = on ? '' : 'none';
  }
  useEffect(() => { applyLearn(learnOn); }, [learnOn]);

  function doCalc() {
    calcString();                       // legacy §11 calc — reads the form, renders results, persists stringSizing
    applyLearn(Explain.isOn());
    Project.markDone('strings');
  }

  /* ── legacy init sequence (verbatim port of the inline IIFE) ── */
  useEffect(() => {
    const S = stateRef.current;
    populateModuleSelect();
    populateInverterSelect();

    /* Prefill from the project */
    const comp = Project.section('components') || {};
    if (comp.inverterId && typeof INVERTER_LIST !== 'undefined' && INVERTER_LIST.some((i) => i.id === comp.inverterId)) {
      document.getElementById('ss-inverter').value = comp.inverterId;
      loadInverterTemplate(comp.inverterId);
      document.getElementById('ss-inverter-from').textContent = '↳ ' + t('ss.fromproject');
      S.prefInv = true;
    }
    if (comp.moduleId && typeof MODULE_LIST !== 'undefined' && MODULE_LIST.some((m) => m.id === comp.moduleId)) {
      document.getElementById('ss-module').value = comp.moduleId;
      loadModuleTemplate(comp.moduleId);
      document.getElementById('ss-module-from').textContent = '↳ ' + t('ss.fromproject');
      S.prefMod = true;
    }

    /* Project mode: pick between the project's Strings */
    let pStrings = Project.section('strings') || [];
    if (!Array.isArray(pStrings)) pStrings = [];
    S.pStrings = pStrings;
    const strModById = (id) => (id && typeof MODULE_LIST !== 'undefined')
      ? MODULE_LIST.find((m) => m.id === id) || null : null;

    function applyStringSel(idx) {
      S.selStringIdx = idx;
      const s = pStrings[idx]; if (!s) return;
      const tag = document.getElementById('ss-str-tag');
      if (tag) {
        tag.textContent = 'S' + (idx + 1);
        if (typeof STR_COLORS !== 'undefined') tag.style.background = STR_COLORS[idx % STR_COLORS.length];
      }
      const mod = strModById(s.moduleId);
      if (mod) {
        loadModuleTemplate(mod.id);
        document.getElementById('ss-module-from').textContent =
          '↳ ' + t('ss.fromproject') + ' · ' + t('cmp.stringlbl') + ' ' + (idx + 1) + ' (' + (s.count || 0) + '×)';
        S.prefMod = true;
      }
      Project.patch('stringSizing', { stringId: s.id });
    }

    if (pStrings.length) {
      setProjectMode(true);
      const strSel = document.getElementById('ss-string');
      strSel.innerHTML = pStrings.map((s, i) => {
        const mod = strModById(s.moduleId);
        const nm = mod ? mod.name.replace(/\s*\(.*\)$/, '') : (s.moduleId || '?');
        return '<option value="' + i + '">' + nm + ' (' + (s.count || 0) + '×)</option>';
      }).join('');
      const ssPrev = Project.section('stringSizing');
      if (ssPrev && ssPrev.stringId != null) {
        const pi = pStrings.map((s) => s.id).indexOf(ssPrev.stringId);
        if (pi >= 0) { S.selStringIdx = pi; strSel.value = String(pi); }
      }
      applyStringSel(S.selStringIdx);
      strSel.addEventListener('change', function () {
        applyStringSel(+this.value);
        if (S.prefMod && S.prefInv) { calcString(); applyLearn(Explain.isOn()); }
      });
    }

    /* Saved site values restore (NO auto-estimate on load — explicit button only) */
    const ssSaved0 = Project.section('stringSizing') || {};
    if (ssSaved0.tamin != null) document.getElementById('ss-tamin').value = ssSaved0.tamin;
    if (ssSaved0.tamax != null) document.getElementById('ss-tamax').value = ssSaved0.tamax;
    if (ssSaved0.gmin  != null) document.getElementById('ss-gmin').value  = ssSaved0.gmin;
    if (ssSaved0.gmax  != null) document.getElementById('ss-gmax').value  = ssSaved0.gmax;

    /* Auto-compute on load so the step is never blank (both prefilled from project) */
    if (S.prefMod && S.prefInv) { calcString(); applyLearn(Explain.isOn()); }
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  /* ── auto-estimate (verbatim from the legacy IIFE) ── */
  function estimateSite() {
    if (typeof sunPos !== 'function' || typeof clearSkyHofierka !== 'function' ||
        typeof transposeHayDavies !== 'function' || typeof doy !== 'function') return null;
    const S = stateRef.current;
    const loc = Project.section('location') || {};
    const lat = loc.lat, lon = loc.lon;
    if (lat == null || lon == null) return null;
    const tz = loc.tz != null ? loc.tz : 2, elev = loc.elevation || 0;
    const sSel = S.pStrings[S.selStringIdx], mnt = Project.section('mounting') || {};
    const tilt = (sSel && sSel.tilt != null) ? sSel.tilt : (mnt.tilt != null ? mnt.tilt : 30);
    const az   = (sSel && sSel.azimuth != null) ? sSel.azimuth : (mnt.azimuth != null ? mnt.azimuth : 0);

    let gmin = null; const nW = doy(2025, 1, 15); let hSR = null;
    for (let h = 4; h <= 12; h += 0.1) { if (sunPos(lat, lon, tz, nW, h, 'lst')) { hSR = h; break; } }
    if (hSR != null) {
      let sum = 0, cnt = 0;
      for (let s = 0; s <= 6; s++) {
        const sun = sunPos(lat, lon, tz, nW, hSR + s / 6, 'lst');
        if (!sun) continue;
        sum += transposeHayDavies(sun, clearSkyHofierka(sun.el, nW, lat, 3.0, elev), tilt, az, 0.2, nW); cnt++;
      }
      if (cnt) gmin = Math.max(50, Math.min(400, Math.round(sum / cnt)));
    }
    let gmax = null; const nS = doy(2025, 6, 21);
    const sunNoon = sunPos(lat, lon, tz, nS, 12, 'lst');
    if (sunNoon) gmax = Math.max(700, Math.min(1200,
      Math.round(transposeHayDavies(sunNoon, clearSkyHofierka(sunNoon.el, nS, lat, 4.0, elev), tilt, az, 0.2, nS))));

    let tamin = null, tamax = null;
    if (typeof TEMP_DATA !== 'undefined' && TEMP_DATA && typeof resolveTemp === 'function') {
      const means = [];
      for (let m = 0; m < 12; m++) { const tv = resolveTemp(lat, lon, m); if (tv != null) means.push(tv); }
      if (means.length) {
        tamin = Math.round(Math.min(...means) - 21);   // record cold below the coldest monthly mean
        tamax = Math.round(Math.max(...means) + 24);   // record heat above the warmest monthly mean
      }
    }
    return { gmin, gmax, tamin, tamax, tilt, az };
  }
  function applySiteEstimate() {
    const note = document.getElementById('ss-gmin-note');
    const r = estimateSite();
    if (!r) { if (note) note.textContent = t('ss.gauto.nogeo'); return false; }
    if (r.gmin  != null) document.getElementById('ss-gmin').value  = r.gmin;
    if (r.gmax  != null) document.getElementById('ss-gmax').value  = r.gmax;
    if (r.tamin != null) document.getElementById('ss-tamin').value = r.tamin;
    if (r.tamax != null) document.getElementById('ss-tamax').value = r.tamax;
    if (note) {
      const parts = [];
      if (r.gmin != null) parts.push('G<sub>min</sub> ' + r.gmin);
      if (r.gmax != null) parts.push('G<sub>max</sub> ' + r.gmax + ' W/m²');
      if (r.tamin != null) parts.push('T<sub>a</sub> ' + r.tamin + '…' + r.tamax + ' °C');
      note.innerHTML = parts.join(' · ') + ' · ' + t('ss.gauto.note') + ' (β ' + Math.round(r.tilt) + '° / γ ' + Math.round(r.az) + '°)';
    }
    return r.tamin != null;
  }

  /* manual T_a edits persist immediately + recompute live (legacy behavior) */
  function onTaInput() {
    const ta = parseFloat(document.getElementById('ss-tamin').value);
    const tx = parseFloat(document.getElementById('ss-tamax').value);
    Project.patch('stringSizing', { tamin: isNaN(ta) ? null : ta, tamax: isNaN(tx) ? null : tx });
    const S = stateRef.current;
    if (S.prefMod && S.prefInv) { calcString(); applyLearn(Explain.isOn()); }
  }

  const ro = Project.isReadOnly();
  const field = (label, id, def, step, extra = {}) => (
    <div className="field">
      <label dangerouslySetInnerHTML={{ __html: label }} />
      <input type="number" id={id} defaultValue={def} step={step} {...extra} />
    </div>
  );

  return (
    <>
      <div className="sn-crumb"><b>{t('nav.phaseC')}</b> › <span>{t('nav.strings')}</span></div>
      <div className="ss-scroll">
        <div className="row g-3">
          {/* forms */}
          <div className="col-lg-4">
            <div className="card">
              <div className="sec" id="ss-src-title">{t(projectMode ? 'mnt.string' : 'ss.module.template.title')}</div>
              {/* project mode: pick one of the project's strings */}
              <div id="ss-string-row" style={{ display: projectMode ? 'flex' : 'none', alignItems: 'center', gap: 8 }}>
                <span id="ss-str-tag" className="str-tag">S1</span>
                <select id="ss-string" style={{ flex: 1, fontSize: 12, padding: '5px 7px', background: 'var(--input-bg)', color: 'var(--text)', border: '0.5px solid var(--border)', borderRadius: 6 }} />
              </div>
              {/* standalone mode: pick any module from the DB */}
              <select id="ss-module" onChange={(e) => loadModuleTemplate(e.target.value)}
                      style={{ display: projectMode ? 'none' : '', width: '100%', fontSize: 12, padding: '5px 7px', background: 'var(--input-bg)', color: 'var(--text)', border: '0.5px solid var(--border)', borderRadius: 6 }}>
                <option value="">{t('ss.module.template.ph')}</option>
              </select>
              <div id="ss-module-note" style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5, lineHeight: 1.6 }} />
              <div id="ss-module-from" className="from-project" />
            </div>
            <div className="card">
              <div className="sec">{t('ss.module')}</div>
              <div className="row2">
                {field('V<sub>OC,STC</sub> (V)', 'ss-voc', 37.5, 0.1)}
                {field('V<sub>mp,STC</sub> (V)', 'ss-vmp', 31.0, 0.1)}
              </div>
              <div className="row2">
                {field('I<sub>SC,STC</sub> (A)', 'ss-isc', 13.8, 0.1)}
                {field('I<sub>mp,STC</sub> (A)', 'ss-imp', 12.9, 0.1)}
              </div>
              <div className="row2">
                {field('λ<sub>V</sub> (%/°C)', 'ss-lv', -0.30, 0.01)}
                {field('λ<sub>I</sub> (%/°C)', 'ss-li', 0.05, 0.01)}
              </div>
              {field('N<sub>MOT</sub> (°C)', 'ss-nmot', 44, 1)}
            </div>
            <div className="card">
              <div className="sec">{t('ss.template.title')}</div>
              <select id="ss-inverter" onChange={(e) => loadInverterTemplate(e.target.value)}
                      style={{ width: '100%', fontSize: 12, padding: '5px 7px', background: 'var(--input-bg)', color: 'var(--text)', border: '0.5px solid var(--border)', borderRadius: 6 }}>
                <option value="">{t('ss.template.ph')}</option>
              </select>
              <div id="ss-inverter-note" style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5, lineHeight: 1.6 }} />
              <div id="ss-inverter-from" className="from-project" />
            </div>
            <div className="card">
              <div className="sec">{t('ss.inverter')}</div>
              <div className="row2">
                {field('V<sub>max,inv</sub> (V)', 'ss-vinvmax', 900, 10)}
                {field('V<sub>r,MPPT</sub> (V)', 'ss-vrmppt', 620, 10)}
              </div>
              <div className="row2">
                {field('V<sub>min,MPPT</sub> (V)', 'ss-vmpptmin', 200, 10)}
                {field('V<sub>max,MPPT</sub> (V)', 'ss-vmpptmax', 800, 10)}
              </div>
              <div className="row2">
                {field('I<sub>max,MPPT</sub> (A)', 'ss-impptmax', 20, 1)}
                {field('I<sub>sc,MPPT</sub> (A)', 'ss-iscmppt', 25, 1)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6, lineHeight: 1.5 }}
                   dangerouslySetInnerHTML={{ __html: t('ss.vmaxnote') }} />
            </div>
            <div className="card">
              <div className="sec">{t('ss.site')}</div>
              <div className="row2">
                {field('T<sub>a,min</sub> (°C)', 'ss-tamin', -20, 1, { onInput: onTaInput })}
                {field('T<sub>a,max</sub> (°C)', 'ss-tamax', 45, 1, { onInput: onTaInput })}
              </div>
              <div className="row2">
                {field('G<sub>min</sub> (W/m²)', 'ss-gmin', 100, 50)}
                {field('G<sub>max</sub> (W/m²)', 'ss-gmax', 1000, 50)}
              </div>
              <button type="button" id="ss-gmin-auto" className="btn btn-outline-secondary btn-sm w-100" style={{ marginTop: 4 }}
                      onClick={() => { applySiteEstimate(); doCalc(); }}>{t('ss.gauto')}</button>
              <div id="ss-gmin-note" style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, lineHeight: 1.4 }} />
              {!ro && (
                <button id="ss-calc-btn" className="btn btn-p w-100" style={{ marginTop: '.5rem' }} onClick={doCalc}>
                  {t('ss.calc')}
                </button>
              )}
            </div>
          </div>

          {/* results (legacy renderStringResults owns these containers) */}
          <div className="col-lg-8">
            <div className="ss-wrap">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <label className="xpl-toggle">
                  <input type="checkbox" id="ss-learn" checked={learnOn} onChange={(e) => setLearn(e.target.checked)} />
                  {' '}<span>{t('xpl.learnmode')}</span>
                </label>
              </div>
              <div className="metric-grid" id="ss-metrics">
                <div className="metric" style={{ gridColumn: '1/-1' }}>
                  <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '.5rem 0' }}>{t('ss.prompt')}</div>
                </div>
              </div>
              <div className="pvgis-chart-wrap" id="ss-intermediate" style={{ display: 'none' }} />
              <div className="pvgis-chart-wrap" id="ss-table-wrap" style={{ display: 'none' }} />
              <div id="ss-warnings" />
              <div className="note" id="ss-method" style={{ display: 'none' }}>{t('ss.methodref')}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
