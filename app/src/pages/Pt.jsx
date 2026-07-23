/* Pt (step 18) — React port of pt.html using the LEGACY-DRIVER pattern with a
   REF-MOUNTED DOC HOST: React renders the toolbar / admin-form / preflight
   skeleton 1:1 plus an EMPTY #pt-pages host div; the page's entire inline IIFE
   transplants verbatim into setupPt() (mount effect → { render, destroy }).
   PTDoc.build() (js/pt-doc.js) owns everything inside #pt-pages — it builds
   detached A4 page DOM and appends it into the host; React NEVER renders in
   there (no JSX for document output).

   Engine deps (classic globals, must be in the shell script set): iec-symbols.js
   → schema-svg.js and pt-text-ro.js/pt-text-en.js → pt-doc.js, on top of
   string-ui.js (MODULE_LIST/INVERTER_LIST) and Chart.js.

   Deviations from legacy: window.saveStep / window.renderList / SiteNav.refresh()
   dropped (persistence is live per-input via setPath; the Stepper is reactive
   through Project.onChange). The page's own #pt-lang select is a DOCUMENT
   setting and stays; the UI language switch re-renders via api.render() (the
   legacy renderList hook). The print-only @page rule is injected at runtime on
   mount (an @page rule in bundled CSS cannot be scoped by body[data-page] and
   would force margin:0 onto every route's printout). Chart cleanup: pt-doc.js
   keeps NO chart references (legacy leaked instances on every rebuild), so
   destroy()/rebuild best-effort Chart.getChart(canvas).destroy() over the host. */
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../store/useI18n.js';
import './Pt.css';

/* Manual bill-of-quantities rows editor. The auto-derived quantities live in
   js/pt-doc.js (panels/cables/protections from the project); THIS edits the
   extra rows the engineer types in — persisted at Project.section('boq').rows
   as [{cap,um,cant,sec}] and merged into the matching document section. A
   debounced onRebuild re-runs PTDoc.build so the document reflects edits. */
function BoqEditor({ t, onRebuild }) {
  /* Project is a classic-script global binding (not a window property) — reference it bare,
     the same way Strings.jsx / useProject.js do. */
  const boq = Project.section('boq');
  const initial = (boq && Array.isArray(boq.rows)) ? boq.rows : [];
  const [rows, setRows] = useState(initial);
  const timer = useRef(null);

  const SECTIONS = [
    ['civ', t('pt.boqSecCiv')], ['echip', t('pt.boqSecEchip')],
    ['elec', t('pt.boqSecElec')], ['tabl', t('pt.boqSecTabl')],
  ];

  function commit(next) {
    setRows(next);
    Project.set('boq', { rows: next });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { onRebuild && onRebuild(); }, 500);
  }
  const add = () => commit([...rows, { cap: '', um: 'buc', cant: '', sec: 'civ' }]);
  const upd = (i, k, v) => commit(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const del = (i) => commit(rows.filter((_, j) => j !== i));

  const inp = { width: '100%', fontSize: 12, background: 'var(--input-bg)', color: 'var(--text)',
                border: '0.5px solid var(--border)', borderRadius: 6, padding: '4px 6px' };

  return (
    <div className="card">
      <div className="sec">{t('pt.boqTitle')}</div>
      <div className="pt-calc-note" style={{ marginTop: 0, marginBottom: 8 }}>{t('pt.boqHint')}</div>
      {rows.length === 0 && (
        <div className="pt-calc-hint" style={{ marginBottom: 8 }}>{t('pt.boqEmpty')}</div>
      )}
      {rows.map((r, i) => (
        <div key={i} style={{ border: '0.5px solid var(--border)', borderRadius: 8, padding: 8, marginBottom: 8 }}>
          <input style={{ ...inp, marginBottom: 6 }} type="text" placeholder={t('pt.boqDesc')}
                 value={r.cap || ''} onChange={(e) => upd(i, 'cap', e.target.value)} />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input style={{ ...inp, width: 56 }} type="text" placeholder={t('pt.boqUm')}
                   value={r.um || ''} onChange={(e) => upd(i, 'um', e.target.value)} title={t('pt.boqUm')} />
            <input style={{ ...inp, width: 64 }} type="text" inputMode="decimal" placeholder={t('pt.boqQty')}
                   value={r.cant == null ? '' : r.cant} onChange={(e) => upd(i, 'cant', e.target.value)} title={t('pt.boqQty')} />
            <select style={{ ...inp, flex: 1 }} value={r.sec || 'civ'} onChange={(e) => upd(i, 'sec', e.target.value)} title={t('pt.boqSec')}>
              {SECTIONS.map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}
            </select>
            <button type="button" className="btn btn-sm btn-outline-danger" style={{ padding: '2px 8px', lineHeight: 1 }}
                    onClick={() => del(i)} title={t('pt.boqDel')} aria-label={t('pt.boqDel')}>×</button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={add}>{t('pt.boqAdd')}</button>
    </div>
  );
}

export default function Pt() {
  const { t, lang } = useI18n();
  const api = useRef(null);   // { render, destroy } from the transplanted engine

  useEffect(() => {
    /* print-only @page rule, route-scoped at runtime (see header comment) */
    const pageRule = document.createElement('style');
    pageRule.textContent = '@media print{@page{size:A4;margin:0}}';
    document.head.appendChild(pageRule);
    api.current = setupPt();   // full legacy init (ensure + selects + bind + first build + markDone)
    return () => {
      api.current && api.current.destroy();
      api.current = null;
      pageRule.remove();
    };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  /* UI language change → rebuild (legacy: applyI18n() → window.renderList → buildDoc).
     The DOCUMENT language stays whatever #pt-lang says — only preflight/labels flip. */
  useEffect(() => { api.current && api.current.render(); }, [lang]);

  const F = ({ lbl, children }) => (
    <div className="field">
      <label>{lbl}</label>
      {children}
    </div>
  );

  return (
    <>
      <div className="sn-crumb"><b>{t('nav.phaseD')}</b> › <span>{t('nav.pt')}</span></div>

      <div className="pt-scroll">
        <div className="row g-3">
          <div className="col-lg-3 col-12 pt-form-col">

            <div className="card">
              <div className="sec">{t('pt.beneficiar')}</div>
              <F lbl={t('pt.ben_firma')}><input type="text" id="pt-ben-firma" data-path="meta.beneficiar.firma" /></F>
              <F lbl={t('pt.ben_adresa')}><input type="text" id="pt-ben-adresa" data-path="meta.beneficiar.adresa" /></F>
              <F lbl={t('pt.ben_contact')}><input type="text" id="pt-ben-contact" data-path="meta.beneficiar.contact" /></F>
            </div>

            <div className="card">
              <div className="sec">{t('pt.proiectant')}</div>
              <F lbl={t('pt.pro_firma')}><input type="text" id="pt-pro-firma" data-path="meta.proiectant.firma" /></F>
              <F lbl={t('pt.pro_nume')}><input type="text" id="pt-pro-nume" data-path="meta.proiectant.nume" /></F>
              <F lbl={t('pt.pro_atsoc')}><input type="text" id="pt-pro-atsoc" data-path="meta.proiectant.atestatSocietate" placeholder="ANRE tip B nr. …" /></F>
              <F lbl={t('pt.pro_atpro')}><input type="text" id="pt-pro-atpro" data-path="meta.proiectant.atestatProiectant" placeholder="ANRE grad IVA/IVB nr. …" /></F>
              <F lbl={t('pt.pro_adresa')}><input type="text" id="pt-pro-adresa" data-path="meta.proiectant.adresa" /></F>
            </div>

            <div className="card">
              <div className="sec">{t('pt.verificator')}</div>
              <F lbl={t('pt.ver_nume')}><input type="text" id="pt-ver-nume" data-path="meta.verificator.nume" /></F>
              <div className="row2">
                <F lbl={t('pt.ver_atestat')}><input type="text" id="pt-ver-atestat" data-path="meta.verificator.atestat" /></F>
                <F lbl={t('pt.ver_domeniu')}><input type="text" id="pt-ver-domeniu" data-path="meta.verificator.domeniu" placeholder="Ie" /></F>
              </div>
              <F lbl={t('pt.ver_firma')}><input type="text" id="pt-ver-firma" data-path="meta.verificator.firma" /></F>
            </div>

            <div className="card">
              <div className="sec">{t('pt.document')}</div>
              <F lbl={t('nav.projectname')}><input type="text" data-path="meta.projectName" /></F>
              <div className="row2">
                <F lbl={t('pt.faza')}><input type="text" id="pt-faza" data-path="meta.faza" placeholder="PTh+DDE" /></F>
                <F lbl={t('pt.coddoc')}><input type="text" id="pt-coddoc" data-path="meta.codDoc" placeholder="MT-…" /></F>
              </div>
              <div className="row2">
                <F lbl={t('pt.editie')}><input type="number" id="pt-editie" data-path="meta.editie" min="1" step="1" /></F>
                <F lbl={t('pt.revizie')}><input type="number" id="pt-revizie" data-path="meta.revizie" min="0" step="1" /></F>
              </div>
              <div className="row2">
                <F lbl={t('pt.categoria')}>
                  <select id="pt-categoria" data-path="meta.categoriaImportanta">
                    <option value=""></option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                  </select>
                </F>
                <F lbl={t('pt.data')}><input type="date" id="pt-data" data-path="meta.dataIntocmirii" /></F>
              </div>
            </div>

            <div className="card">
              <div className="sec">{t('pt.racordare')}</div>
              <F lbl={t('pt.gridmode')}>
                <select id="pt-gridmode" data-path="grid.mode">
                  <option value=""></option>
                  <option value="no-injection">{t('pt.noinj')}</option>
                  <option value="injection">{t('pt.inj')}</option>
                </select>
              </F>
              <div className="row2">
                <F lbl={t('pt.tensiune')}><input type="number" id="pt-tensiune" data-path="grid.tensiuneRacord" step="0.1" placeholder="0.4" /></F>
                <F lbl={t('pt.consum')}><input type="number" id="pt-consum" data-path="grid.consumAnualKwh" min="0" step="100" /></F>
              </div>
              <F lbl={t('pt.tablou')}><input type="text" id="pt-tablou" data-path="grid.tablouRacord" placeholder="TGD …" /></F>
              <F lbl={t('pt.ptalim')}>
                <textarea id="pt-ptalim" data-path="grid.ptAlimentare" rows="3"
                  style={{ width: '100%', fontSize: 12, background: 'var(--input-bg)', color: 'var(--text)',
                           border: '0.5px solid var(--border)', borderRadius: 6, padding: '5px 7px' }} />
              </F>
              <div className="row2">
                <F lbl={t('pt.atrnr')}><input type="text" id="pt-atrnr" data-path="grid.atrNr" /></F>
                <F lbl={t('pt.atrdata')}><input type="date" id="pt-atrdata" data-path="grid.atrData" /></F>
              </div>
            </div>

            {/* source-data cards: every state value the document injects has an input here,
                grouped under the SOURCE STEP's name; derived values are disabled "(calculat)" */}
            <div className="card">
              <div className="sec">{t('nav.location')}</div>
              <F lbl={t('nav.address')}><input type="text" data-path="meta.address" /></F>
              <div className="row2">
                <F lbl={t('loc.lat')}><input type="number" data-path="location.lat" step="0.0001" /></F>
                <F lbl={t('loc.lon')}><input type="number" data-path="location.lon" step="0.0001" /></F>
              </div>
              <F lbl={t('loc.elev')}><input type="number" data-path="location.elevation" step="1" /></F>
            </div>

            <div className="card">
              <div className="sec">{t('nav.components')}</div>
              <F lbl={t('cmp.inverter')}><select id="pt-inv" data-path="components.inverterId" /></F>
              <div className="field" id="pt-mod-wrap" style={{ display: 'none' }}>
                <label><span>{t('cmp.module')}</span> (S1)</label>
                <select id="pt-mod" data-path="strings.0.moduleId" />
              </div>
              <div className="row2">
                <F lbl={<><span>{t('pt.nrmod')}</span> <span className="pt-calc-hint">{t('pt.calc')}</span></>}>
                  <input type="text" id="pt-out-nrmod" disabled />
                </F>
                <F lbl={<>kWp <span className="pt-calc-hint">{t('pt.calc')}</span></>}>
                  <input type="text" id="pt-out-kwp" disabled />
                </F>
              </div>
            </div>

            <div className="card">
              <div className="sec">{t('nav.strings')}</div>
              <div className="row2">
                <F lbl={<>T<sub>a,min</sub> (°C)</>}><input type="number" data-path="stringSizing.tamin" step="1" /></F>
                <F lbl={<>T<sub>a,max</sub> (°C)</>}><input type="number" data-path="stringSizing.tamax" step="1" /></F>
              </div>
            </div>

            <div className="card">
              <div className="sec">{t('nav.yield')}</div>
              <div className="row2">
                <F lbl={<><span>{t('pt.anual')}</span> <span className="pt-calc-hint">{t('pt.calc')}</span></>}>
                  <input type="text" id="pt-out-anual" disabled />
                </F>
                <F lbl={<><span>{t('pt.spec')}</span> <span className="pt-calc-hint">{t('pt.calc')}</span></>}>
                  <input type="text" id="pt-out-spec" disabled />
                </F>
              </div>
              <F lbl={<><span>{t('pt.co2')}</span> <span className="pt-calc-hint">{t('pt.calc')}</span></>}>
                <input type="text" id="pt-out-co2" disabled />
              </F>
              <div className="pt-calc-note">{t('pt.calcnote')}</div>
            </div>

            <BoqEditor t={t} onRebuild={() => api.current && api.current.render()} />

            <div className="card">
              <div className="sec">{t('pt.preflight')}</div>
              <div id="pt-preflight" />
            </div>
          </div>

          <div className="col-lg-9 col-12">
            <div className="pt-toolbar">
              {/* DOCUMENT language — a document setting, deliberately separate from UI i18n */}
              <select id="pt-lang" defaultValue="ro">
                <option value="ro">Română (document oficial)</option>
                <option value="en">English (informative)</option>
              </select>
              <button className="btn btn-sm btn-p" id="pt-build">{t('pt.build')}</button>
              <button className="btn btn-sm btn-outline-secondary" id="pt-print">{t('pt.print')}</button>
              <span id="pt-pageinfo" style={{ fontSize: 11, color: 'var(--text3)' }} />
            </div>
            {/* PTDoc.build() owns this subtree — React must never render inside it */}
            <div id="pt-pages" />
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══ Transplanted legacy engine (pt.html inline IIFE, verbatim except:
   window.saveStep / window.renderList / SiteNav.refresh() removed — React
   drives re-render (useEffect[lang] → render) and the Stepper is reactive;
   buildDoc gains a dead/host guard + best-effort Chart cleanup (pt-doc.js
   retains no chart handles — legacy leaked an instance per rebuilt canvas);
   addEventListener wiring unchanged (nodes die with the component). ═══ */
function setupPt() {
  'use strict';
  function tr(k) { return (typeof t === 'function') ? t(k) : k; }

  /* ── form ↔ state binding via data-path="section.sub.key" ──
     meta sub-objects may be absent on older projects (top-level Object.assign in load()),
     so ensure the containers exist before reading/writing. */
  /* Create the PT containers when an older project lacks them — EMPTY, never seeded:
     every PT value comes from the state as the user entered it; missing stays missing. */
  function ensure() {
    var st = Project.get();
    var meta = st.meta || (st.meta = {});
    var defs = { beneficiar: { firma: '', adresa: '', contact: '' },
                 proiectant: { firma: '', nume: '', atestatSocietate: '', atestatProiectant: '', adresa: '' },
                 verificator: { nume: '', atestat: '', domeniu: '', firma: '' } };
    Object.keys(defs).forEach(function (k) {
      if (!meta[k] || typeof meta[k] !== 'object') meta[k] = defs[k];
    });
    if (!st.grid || typeof st.grid !== 'object') {
      st.grid = { mode: '', tensiuneRacord: null, tablouRacord: '', ptAlimentare: '',
                  consumAnualKwh: null, atrNr: '', atrData: '' };
    }
    Project.set('meta', meta);
    Project.set('grid', st.grid);
  }
  ensure();

  function getPath(path) {
    var cur = Project.get();
    path.split('.').forEach(function (k) { cur = cur != null ? cur[k] : null; });
    return cur;
  }
  function setPath(path, val) {
    var parts = path.split('.');
    var section = parts[0];
    var obj = Project.section(section);
    var cur = obj;
    for (var i = 1; i < parts.length - 1; i++) cur = cur[parts[i]] || (cur[parts[i]] = {});
    cur[parts[parts.length - 1]] = val;
    Project.set(section, obj);
  }

  /* selects for the source steps' equipment (same state the Components step edits) */
  (function () {
    var invSel = document.getElementById('pt-inv');
    if (invSel && typeof INVERTER_LIST !== 'undefined') {
      invSel.innerHTML = '<option value=""></option>' + INVERTER_LIST.map(function (i) {
        return '<option value="' + i.id + '">' + i.name + '</option>';
      }).join('');
    }
    var modSel = document.getElementById('pt-mod');
    var hasStrings = Array.isArray(Project.section('strings')) && Project.section('strings').length;
    if (modSel && hasStrings && typeof MODULE_LIST !== 'undefined') {
      document.getElementById('pt-mod-wrap').style.display = '';
      modSel.innerHTML = '<option value=""></option>' + MODULE_LIST.map(function (m) {
        return '<option value="' + m.id + '">' + m.name + '</option>';
      }).join('');
    }
  })();

  var fields = Array.prototype.slice.call(document.querySelectorAll('[data-path]'));
  fields.forEach(function (f) {
    var v = getPath(f.dataset.path);
    if (v != null && v !== '') f.value = v;
    function onEdit() {
      var val = f.type === 'number' ? (f.value === '' ? null : parseFloat(f.value)) : f.value;
      /* array paths (strings.0.*) need the row to exist */
      var parts = f.dataset.path.split('.');
      if (parts.length > 2) {
        var container = getPath(parts.slice(0, -1).join('.'));
        if (container == null) return;
      }
      setPath(f.dataset.path, val);
      scheduleBuild();
    }
    f.addEventListener('input', onEdit);
    f.addEventListener('change', onEdit);
  });

  /* ── build + preflight ── */
  var _t = null;
  var dead = false;
  function scheduleBuild() { clearTimeout(_t); _t = setTimeout(buildDoc, 600); }

  /* pt-doc.js keeps no references to the Chart instances it mounts, so before
     wiping the host (PTDoc.build does host.innerHTML='') and on unmount we
     destroy whatever the Chart registry still tracks on the host's canvases. */
  function destroyCharts() {
    var host = document.getElementById('pt-pages');
    if (!host || typeof Chart === 'undefined' || typeof Chart.getChart !== 'function') return;
    host.querySelectorAll('canvas').forEach(function (c) {
      var ch = Chart.getChart(c);
      if (ch) { try { ch.destroy(); } catch (e) {} }
    });
  }

  function buildDoc() {
    if (dead) return;
    var host = document.getElementById('pt-pages');
    var langSel = document.getElementById('pt-lang');
    if (!host || !langSel) return;
    destroyCharts();
    var res = PTDoc.build(host, langSel.value);
    document.getElementById('pt-pageinfo').textContent = res.pages + ' pag.';
    var V = res.values || {};
    [['pt-out-nrmod', V.nrModule], ['pt-out-kwp', V.kwp], ['pt-out-anual', V.anualKwh],
     ['pt-out-spec', V.specYield], ['pt-out-co2', V.co2]].forEach(function (o) {
      var e = document.getElementById(o[0]);
      if (e) e.value = o[1] != null ? String(o[1]) : '';
    });
    var pf = document.getElementById('pt-preflight');
    if (!res.missing.length) {
      pf.innerHTML = '<span class="pf-ok">✓ ' + tr('pt.pf_ok') + '</span>';
    } else {
      pf.innerHTML = '<div style="color:var(--text3);margin-bottom:4px">' + tr('pt.pf_missing') + ' (' + res.missing.length + '):</div>' +
        res.missing.map(function (m) { return '<div class="pf-item">• ' + m.chapter + ' → ' + m.field + '</div>'; }).join('');
    }
    if (!Project.isDone('pt') && !res.missing.length) Project.markDone('pt');
  }

  document.getElementById('pt-build').addEventListener('click', buildDoc);
  document.getElementById('pt-lang').addEventListener('change', buildDoc);
  document.getElementById('pt-print').addEventListener('click', function () { window.print(); });

  /* default document language follows the UI language on first load */
  if (typeof LANG_CURRENT !== 'undefined' && LANG_CURRENT === 'en') document.getElementById('pt-lang').value = 'en';
  buildDoc();

  return {
    render: buildDoc,
    destroy: function () {
      dead = true;
      clearTimeout(_t);
      destroyCharts();   // React cleanup runs before the host leaves the DOM
    },
  };
}
