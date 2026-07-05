/* Schema (step 12, Schemă electrică) — React port of schema.html using the
   LEGACY-DRIVER pattern (Economics.jsx exemplar): the page is the editor UI
   over the SHARED window.SchemaSVG engine (js/schema-svg.js + js/iec-symbols.js),
   and its render pipeline is inherently DOM-driven (innerHTML lists rebuilt per
   render, per-row addEventListener, focus-preserving label inputs), so the
   entire inline IIFE is transplanted verbatim into a mount effect that owns the
   DOM below the React-rendered skeleton. React owns: layout/labels (t()), the
   learn toggle (useLearn — legacy used Explain.wireToggle on #sx-learn), and
   re-render on language/learn switches. Persistence stays identical to legacy:
   every SchemaSVG setter (setCell/setLabel/setEdges/setCable) and
   persistProiectant Project.patch immediately, so no saveStep hook is needed. */
import { useEffect, useRef } from 'react';
import { useI18n } from '../store/useI18n.js';
import { useLearn, setLearn } from '../store/useLearn.js';
import './Schema.css';

export default function Schema() {
  const { t, lang } = useI18n();
  const { on: learnOn } = useLearn();
  const api = useRef(null);   // { render, destroy } from the transplanted engine

  useEffect(() => {
    api.current = setupSchema();   // full legacy init (prefill + wiring + first render + markDone)
    return () => { api.current && api.current.destroy(); api.current = null; };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  /* language / learn-mode changes → legacy re-render (its output caches translated
     text; learn also drives the SVG cable labels + the rule-detail .xpl-on class) */
  useEffect(() => { api.current && api.current.render(); }, [lang, learnOn]);

  return (
    <>
      <div className="sn-crumb"><b>{t('nav.phaseD')}</b> › <span>{t('nav.schema')}</span></div>

      <div className="sx-scroll">
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="sec" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <span>{t('sx.title')}</span>
            <label className="xpl-toggle" style={{ fontWeight: 400 }}>
              <input type="checkbox" id="sx-learn" checked={learnOn} onChange={(e) => setLearn(e.target.checked)} />
              {' '}<span>{t('xpl.learnmode')}</span>
            </label>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>{t('sx.intro')}</div>
          <div className="sx-rulebook">
            <div className="sx-rb-h">{t('sx.rules')}</div>
            <div id="sx-rules" />
            <label className="sx-force"><input type="checkbox" id="sx-force-fuses" /> <span>{t('sx.forcefuses')}</span></label>
          </div>
        </div>

        {/* top row: placement · connections · designer */}
        <div className="sx-top">
          <div className="card">
            <div className="sec">{t('sx.placement')}</div>
            <div className="sx-head">
              <span>{t('sx.element')}</span><span>{t('sx.col')}</span><span>{t('sx.row')}</span>
            </div>
            <div id="sx-place" className="sx-place" />
            <div className="sx-btns">
              <button id="sx-reset">{t('sx.reset')}</button>
              <button id="sx-export">{t('sx.export_svg')}</button>
            </div>
          </div>

          <div className="card">
            <div className="sec">{t('sx.connections')}</div>
            <div className="sx-head" style={{ gridTemplateColumns: '1fr 12px 1fr 22px' }}>
              <span>{t('sx.from')}</span><span /><span>{t('sx.to')}</span><span />
            </div>
            <div id="sx-edges" />
            <div className="sx-btns">
              <button id="sx-add-edge">{t('sx.addedge')}</button>
              <button id="sx-reset-edges">{t('sx.resetedges')}</button>
            </div>
          </div>

          <div className="card">
            <div className="sec">{t('sx.extras')}</div>
            <div className="sx-field">
              <label>{t('sx.numeproiectant')}</label>
              <input type="text" id="sx-proiectant" placeholder={t('sx.numeproiectant_ph')} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, lineHeight: 1.5 }}>{t('sx.designernote')}</div>
            <div className="sx-rb-h" style={{ marginTop: 12 }}>{t('sx.cablerules')}</div>
            <div id="sx-cables" />
          </div>
        </div>

        {/* schematic: full width, below the top three */}
        <div className="card" style={{ marginTop: 14 }}>
          <div className="sec">{t('sx.diagram')}</div>
          <div id="sx-wrap" className="sx-wrap" />
        </div>
      </div>
    </>
  );
}

/* ═══ Transplanted legacy engine (schema.html inline IIFE, verbatim except:
   window.renderList/saveStep hooks removed — React drives re-renders, and every
   SchemaSVG setter + persistProiectant already Project.patch on each edit;
   Explain.wireToggle removed — the React #sx-learn toggle + useLearn drive it;
   SiteNav.refresh() after markDone removed — the React stepper reads the store;
   `dead` guard + destroy added; addEventListener wiring unchanged (the nodes
   die with the component). ═══ */
function setupSchema() {
  'use strict';
  function tr(k) { return (typeof t === 'function') ? t(k) : k; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  /* ── Single-line model + SVG: built by the SHARED js/schema-svg.js (window.SchemaSVG), so the
     editor and the Proiect Tehnic plate (pt.html) render from ONE source of truth. Thin local
     aliases keep the editor UI below unchanged; _model/_report hold the latest build for the
     placement / connections / rule panels. ─────────────────────────────────── */
  var SX = window.SchemaSVG;
  var COLS = SX.COLS, ROWS = SX.ROWS, LABEL_RULES = SX.LABEL_RULES;
  function rowLetter(r) { return SX.rowLetter(r); }
  function cellOf(d) { return SX.cellOf(d); }
  function setCell(node, col, row) { SX.setCell(node, col, row); }
  function labelOf(d) { return SX.labelOf(d); }
  function setLabel(node, val) { SX.setLabel(node, val); }
  function effectiveEdges(model) { return SX.effectiveEdges(model); }
  function setEdges(arr) { SX.setEdges(arr); }
  function cableOf(id) { return SX.cableOf(id); }
  function setCable(id, val) { SX.setCable(id, val); }

  var _model = null, _report = null;
  function buildSVG() {
    var r = SX.build({ nodeIds: true });   // editor view: show the n# scaffolding ids; cable labels follow Explain
    _model = r.model; _report = r.report;
    return r.hasStrings ? r.svg : '';
  }

  function colOptions(sel) { var o = ''; for (var c = 0; c < COLS; c++) o += '<option value="' + c + '"' + (c === sel ? ' selected' : '') + '>' + c + '</option>'; return o; }
  function rowOptions(sel) { var o = ''; for (var r = 0; r < ROWS; r++) o += '<option value="' + r + '"' + (r === sel ? ' selected' : '') + '>' + rowLetter(r) + '</option>'; return o; }

  function renderPlacement() {
    var host = document.getElementById('sx-place');
    if (!_model || !_model.hasStrings) { host.innerHTML = ''; return; }
    var html = '';
    _model.devs.forEach(function (d) {
      var c = cellOf(d);
      html += '<div class="sx-row"><span class="lbl"><b style="color:var(--text3);font-weight:600">n' + d.node + '</b> ' +
        '<input class="sx-lbl-inp" data-node="' + d.node + '" value="' + esc(labelOf(d)) + '" title="' + esc(d.label) + '">' +
        (d.sub ? ' <small>' + esc(d.sub) + '</small>' : '') + '</span>' +
        '<select data-node="' + d.node + '" data-axis="col">' + colOptions(c.col) + '</select>' +
        '<select data-node="' + d.node + '" data-axis="row">' + rowOptions(c.row) + '</select></div>';
    });
    host.innerHTML = html;
    host.querySelectorAll('select').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var node = this.dataset.node;   // read BOTH selects so the unchanged axis keeps its shown value
        var colSel = host.querySelector('select[data-node="' + node + '"][data-axis="col"]');
        var rowSel = host.querySelector('select[data-node="' + node + '"][data-axis="row"]');
        setCell(node, +colSel.value, +rowSel.value);
        render();
      });
    });
    /* editable labels: update the drawing live WITHOUT re-rendering this list (so the input keeps focus) */
    host.querySelectorAll('.sx-lbl-inp').forEach(function (inp) {
      inp.addEventListener('input', function () {
        setLabel(this.dataset.node, this.value);
        var svg = buildSVG();
        document.getElementById('sx-wrap').innerHTML = _model.hasStrings ? svg : '<span class="no-data">' + tr('sx.nostrings') + '</span>';
      });
    });
  }

  /* ── Edge (connection) editor: pick any node as source / any as destination ──────────────── */
  function nodeOptions(sel) {
    var o = '';
    _model.devs.forEach(function (d) { o += '<option value="' + d.node + '"' + (d.node === sel ? ' selected' : '') + '>n' + d.node + ' ' + esc(labelOf(d)) + '</option>'; });
    return o;
  }
  function renderEdges() {
    var host = document.getElementById('sx-edges');
    if (!_model || !_model.hasStrings) { host.innerHTML = ''; return; }
    var es = effectiveEdges(_model), html = '';
    es.forEach(function (e, i) {
      html += '<div class="sx-erow">' +
        '<select data-i="' + i + '" data-end="from">' + nodeOptions(e.from) + '</select>' +
        '<span class="arr">→</span>' +
        '<select data-i="' + i + '" data-end="to">' + nodeOptions(e.to) + '</select>' +
        '<button class="sx-del" data-i="' + i + '" title="×">×</button></div>';
    });
    host.innerHTML = html;
    host.querySelectorAll('select').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var arr = effectiveEdges(_model); arr[+this.dataset.i][this.dataset.end] = +this.value;
        setEdges(arr); render();
      });
    });
    host.querySelectorAll('.sx-del').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var arr = effectiveEdges(_model); arr.splice(+this.dataset.i, 1); setEdges(arr); render();
      });
    });
  }

  /* Translate a (possibly dynamic) reason {key, vals} with {placeholder} substitution. */
  function trv(rsn) {
    if (!rsn) return '';
    var s = tr(rsn.key);
    Object.keys(rsn.vals || {}).forEach(function (k) { s = s.split('{' + k + '}').join(rsn.vals[k]); });
    return s;
  }
  /* The rule book as an AUDIT REPORT: ref + title + verdict; under "mod explicativ" also the
     standards/clause, why the condition fired (or not), and the nodes the rule created. */
  function renderRules() {
    var host = document.getElementById('sx-rules'); if (!host) return;
    host.innerHTML = (_report || []).map(function (R) {
      var rule = R.rule;
      var verdict = R.needed
        ? '<span class="sx-v-yes">✔ ' + esc(tr('sx.applied')) + '</span>'
        : (R.applies
          ? '<span class="sx-v-forced">✔ ' + esc(tr('sx.applied')) + ' (' + esc(tr('sx.forced')) + ')</span>'
          : '<span class="sx-v-no">✖ ' + esc(tr('sx.notapplied')) + '</span>');
      var actions = R.created.length ? R.created.map(function (d) { return 'n' + d.node + ' ' + esc(d.label); }).join(' · ') : '–';
      return '<div class="sx-rule ' + (R.applies ? 'is-yes' : 'is-no') + '">' +
        '<div class="sx-rule-top"><span class="sx-rule-ref">' + esc(rule.ref) + '</span>' +
          '<span class="sx-rule-title">' + esc(tr(rule.title)) + '</span>' + verdict + '</div>' +
        '<div class="sx-rule-detail">' +
          '<div class="sx-kv"><b>' + esc(tr('sx.refs')) + ':</b> ' + esc(rule.standard.join(' · ')) + ' — ' + esc(tr(rule.clause)) + '</div>' +
          '<div class="sx-kv"><b>' + esc(tr('sx.reason')) + ':</b> ' + esc(trv(R.reason)) + '</div>' +
          '<div class="sx-kv"><b>' + esc(tr('sx.actions')) + ':</b> ' + actions + '</div>' +
          '<div class="sx-justif">' + esc(tr(rule.justification)) + '</div>' +
        '</div></div>';
    }).join('');
    host.classList.toggle('xpl-on', (typeof Explain !== 'undefined') ? Explain.isOn() : false);
  }

  /* Cable label rules editor (Extras pane): each category -> editable cable type. */
  function renderCables() {
    var host = document.getElementById('sx-cables'); if (!host) return;
    host.innerHTML = LABEL_RULES.map(function (r) {
      return '<div class="sx-crow"><span class="sx-crow-l">' + esc(tr(r.i18n)) + '</span>' +
        '<input data-rule="' + r.id + '" value="' + esc(cableOf(r.id)) + '"></div>';
    }).join('');
    host.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('input', function () { setCable(this.dataset.rule, this.value); render(); });
    });
  }

  var dead = false;

  function render() {
    if (dead || !document.getElementById('sx-wrap')) return;
    var svg = buildSVG();
    document.getElementById('sx-wrap').innerHTML = _model.hasStrings ? svg : '<span class="no-data">' + tr('sx.nostrings') + '</span>';
    renderPlacement();
    renderEdges();
    renderRules();
    renderCables();
    if (_model.hasStrings && !Project.isDone('schema')) Project.markDone('schema');
  }

  /* Designer name -> meta.proiectant.nume (shows in the cartouche title block; reused by pt.html) */
  function persistProiectant() {
    var el = document.getElementById('sx-proiectant'); if (!el) return;
    var meta = Project.section('meta') || {};
    var p = Object.assign({}, meta.proiectant || {});
    p.nume = el.value.trim();
    Project.patch('meta', { proiectant: p });
  }
  (function () {
    var el = document.getElementById('sx-proiectant'), meta = Project.section('meta') || {};
    if (el && meta.proiectant && meta.proiectant.nume) el.value = meta.proiectant.nume;
    if (el) el.addEventListener('input', function () { persistProiectant(); render(); });
  })();

  function download(name, mime, data) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: mime }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  document.getElementById('sx-export').addEventListener('click', function () { if (_model && _model.hasStrings) download('schema-monofilara.svg', 'image/svg+xml', buildSVG()); });
  document.getElementById('sx-reset').addEventListener('click', function () { Project.patch('schema', { layout: {} }); render(); });
  document.getElementById('sx-add-edge').addEventListener('click', function () {
    if (!_model || !_model.devs.length) return;
    var arr = effectiveEdges(_model), a = _model.devs[0].node, b = (_model.devs[1] || _model.devs[0]).node;
    arr.push({ from: a, to: b }); setEdges(arr); render();
  });
  document.getElementById('sx-reset-edges').addEventListener('click', function () { Project.patch('schema', { edges: null }); render(); });
  (function () {
    var cb = document.getElementById('sx-force-fuses'); if (!cb) return;
    cb.checked = ((Project.section('schema') || {}).forceFuses !== false);   // default ON: fuses allowed even when not required
    cb.addEventListener('change', function () { Project.patch('schema', { forceFuses: cb.checked }); render(); });
  })();

  render();

  return {
    render: render,
    destroy: function () { dead = true; },
  };
}
