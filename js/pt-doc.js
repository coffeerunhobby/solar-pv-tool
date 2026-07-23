/* pt-doc.js — Proiect Tehnic document engine (PT-SPEC.md, Phase PT-1).

   PTDoc.build(hostEl, lang) renders the whole document as a sequence of explicit A4 page
   boxes (D7: browsers lack @page margin boxes, so WE own the per-page header strip
   "Cod | MEMORIU TEHNIC | Ediția/Revizia | Pag. X/Y" and the page breaks). Flow:

     1. collect values from the Project state (one pass, pure);
     2. chapters (registry below) emit BLOCKS: {html} | {table:{head,rows}} splittable with
        repeated header | {canvas:{h,mount}} for Chart.js | {pageBreak};
     3. paginator appends blocks to the current .pt-body, measuring overflow; tables split
        row-by-row, a block never straddles a page;
     4. pass 2 fills page numbers, the cuprins (data-pt-toc) and borderou page counts
        (data-pt-bord) — all fixed-size cells, so pagination stays stable;
     5. chart mounts run last (animation off, fixed pixel size).

   Prose comes from PT_TEXT_RO / PT_TEXT_EN ({placeholder} substitution); a missing value
   renders as a red [de completat] and is reported in build().missing (pre-flight).
   Depends on: Project, MODULE_LIST/INVERTER_LIST (string-ui.js), Chart.js, fnum-style
   formatting (local), PT_TEXT_* (pt-text-ro.js / pt-text-en.js). */

var PTDoc = (function () {
  'use strict';

  var CONTENT_W = 700;            // px, chart width inside the page body
  var MISS_CLS = 'pt-miss';

  var _lang, _missing, _mounts, _pages, _host, _curBody, _sections, _chapStart;

  function fnum(v) { return (+v).toFixed(2).replace(/\.?0+$/, ''); }
  /* 4 dp for values where 2 dp collapses the information — temperature coefficients
     (-0.265 %/°C would print as -0.27 and a hand-check of the printed substitution
     would then NOT reproduce the printed result). Dev-guide typography rule. */
  function fnum4(v) { return (+v).toFixed(4).replace(/\.?0+$/, ''); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ── text access with RO fallback ── */
  function txt(path) {
    var roots = [(_lang === 'en' ? window.PT_TEXT_EN : window.PT_TEXT_RO), window.PT_TEXT_RO];
    for (var r = 0; r < roots.length; r++) {
      var cur = roots[r], parts = path.split('.');
      for (var i = 0; i < parts.length && cur != null; i++) cur = cur[parts[i]];
      if (cur != null) return cur;
    }
    return path;
  }
  function missTag() { return '<span class="' + MISS_CLS + '">' + esc(txt('common.missing')) + '</span>'; }

  /* One inverter datasheet field, formatted for the technical table. 'vmppt' is the MPP
     window rendered as a range; 'pac' converts the stored watts to kW. An absent field is a
     DATABASE gap (not something the user fills in the PT form) -> plain "-", no missing marker. */
  function invField(u, key) {
    if (key === 'vmppt') {
      return (u.vmpptmin != null && u.vmpptmax != null) ? fnum(u.vmpptmin) + '÷' + fnum(u.vmpptmax) : '-';
    }
    if (key === 'pac') return u.pac != null ? fnum(u.pac / 1000) : '-';
    return u[key] != null ? fnum(u[key]) : '-';
  }

  /* Panel orientation as a cardinal direction. strings[].azimuth is the PVGIS/solar
     convention — 0 = S, -90 = E, +90 = V/W (see i18n 'pvs.azimuthhint'). A multi-orientation
     system (E-W tents) legitimately faces more than one way, so the distinct names are
     joined ("E/V") rather than pretending there is a single direction. */
  var CARD_RO = ['S', 'SV', 'V', 'NV', 'N', 'NE', 'E', 'SE'];
  var CARD_EN = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];
  function orientName(strings) {
    var C = (_lang === 'en' ? CARD_EN : CARD_RO), names = [], seen = {};
    (strings || []).forEach(function (s) {
      if (s.azimuth == null || isNaN(+s.azimuth)) return;
      var n = C[Math.round((((+s.azimuth % 360) + 360) % 360) / 45) % 8];
      if (!seen[n]) { seen[n] = 1; names.push(n); }
    });
    return names.length ? names.join('/') : null;
  }

  /* UI-dictionary lookup in the DOCUMENT's language (not the UI language). Shared engine
     builders (MountingSVG) label their drawings with `mnt.*` keys, which live in the UI
     dictionaries (i18n_ro/en.js), not in PT_TEXT. */
  function uiTxt(key) {
    var d = (typeof I18N_MAPS !== 'undefined') ? I18N_MAPS[_lang] : null;
    if (d && d[key] !== undefined) return d[key];
    return (typeof t === 'function') ? t(key) : key;
  }

  /* substitute {key}; empty/null values become the red missing marker + pre-flight entry */
  function sub(tpl, vals, chapter) {
    return String(tpl).replace(/\{(\w+)\}/g, function (_, k) {
      var v = vals[k];
      if (v == null || v === '') {
        _missing.push({ chapter: chapter, field: k });
        return missTag();
      }
      return esc(String(v));
    });
  }

  /* ── value collection (one pass over the Project state) ── */
  function modById(id) { return (typeof MODULE_LIST !== 'undefined' ? MODULE_LIST : []).find(function (m) { return m.id === id; }) || null; }
  function invById(id) { return (typeof INVERTER_LIST !== 'undefined' ? INVERTER_LIST : []).find(function (i) { return i.id === id; }) || null; }

  function collect() {
    var st = Project.get();
    var meta = st.meta || {}, ben = meta.beneficiar || {}, pro = meta.proiectant || {}, ver = meta.verificator || {};
    var grid = st.grid || {}, loc = st.location || {}, cons = st.consumption || {};
    var sizing = st.sizing || {}, comp = st.components || {}, ss = st.stringSizing || {};
    var strings = Array.isArray(st.strings) ? st.strings : [];

    var nrModule = strings.reduce(function (a, s) { return a + (s.count || 0); }, 0);
    var kwpCalc = strings.reduce(function (a, s) { var m = modById(s.moduleId); return a + (m ? m.pmax * (s.count || 0) : 0); }, 0) / 1000;
    var kwp = kwpCalc || sizing.pvgisKwp || null;
    var anual = sizing.annualProdKwh || null;
    var inv = invById(comp.inverterId);
    var mod0 = strings.length ? modById(strings[0].moduleId) : null;
    var consAnual = grid.consumAnualKwh != null ? grid.consumAnualKwh : cons.annualKwh;
    /* 6.1 "Date tehnice de intrare": Σ inverter AC power (stored in W), the working voltage
       (the racord voltage is entered in kV) and the occupied footprint + panel orientation.
       The footprint comes from the SHARED MountingSVG so it equals the IE005 plate's dimension. */
    var pinvW = comp.pacInvTotal != null ? comp.pacInvTotal : (comp.pacInv != null ? comp.pacInv : null);
    var mgeo = (typeof MountingSVG !== 'undefined') ? MountingSVG.build({ tr: uiTxt }) : null;
    var conn = st.connections || {};
    var tmin = ss.tmin != null ? ss.tmin : (ss.tamin != null ? ss.tamin : null);   // cell/ambient min for Voc,cold
    var locale = _lang === 'en' ? 'en-GB' : 'ro-RO';
    var catNames = { A: _lang === 'en' ? 'exceptional' : 'excepțională', B: _lang === 'en' ? 'special' : 'deosebită',
                     C: _lang === 'en' ? 'normal' : 'normală', D: _lang === 'en' ? 'reduced' : 'redusă' };

    var perString = strings.map(function (s, i) {
      var m = modById(s.moduleId);
      var np = s.np || 1;
      var ns = s.ns || (s.count && np ? Math.round(s.count / np) : null);
      var vocCold = (m && ns != null && tmin != null)
        ? ns * m.voc * (1 + (m.lv / 100) * (tmin - 25)) : null;
      return {
        label: 'S' + (i + 1),
        modName: m ? m.name.replace(/\s*\(.*\)$/, '') : null,
        cfg: ns != null ? (ns + '×' + np) : (s.count || '?'),
        p: m ? m.pmax * (s.count || 0) : null,
        imp: m ? m.imp * np : null,
        ump: (m && ns != null) ? m.vmp * ns : null,
        isc: m ? m.isc * np : null,
        vocCold: vocCold,
        ba: (s.tilt != null ? fnum(s.tilt) : '?') + ' / ' + (s.azimuth != null ? fnum(s.azimuth) : '?'),
        official: !!(s.usePvgis && s.pvgisRef),
      };
    });

    return {
      meta: meta, grid: grid, sizing: sizing, cons: cons, strings: strings, perString: perString,
      mgeo: mgeo, comp: comp, conn: conn, ss: ss, prot: st.protections || {}, eco: st.economics || {},
      v: {  // flat substitution map
        kwp: kwp != null ? fnum(kwp) : null,
        pinvKw: pinvW != null ? fnum(pinvW / 1000) : null,
        unV: grid.tensiuneRacord != null ? Math.round(grid.tensiuneRacord * 1000) : null,
        suprafata: (mgeo && mgeo.area) ? Math.round(mgeo.area) : null,
        orientare: orientName(strings),
        lenAC: conn.lenAC != null ? fnum(conn.lenAC) : null,
        matACNume: conn.matAC ? txt(conn.matAC === 'al' ? 'prezentare.matAl' : 'prezentare.matCu') : null,
        nrModule: nrModule || null,
        anualKwh: anual != null ? Math.round(anual).toLocaleString(locale) : null,
        specYield: (anual && kwp) ? Math.round(anual / kwp) : null,
        co2: anual ? Math.round(anual * 0.265).toLocaleString(locale) : null,
        adresaObiectiv: meta.address || null,
        beneficiarFirma: ben.firma || null,
        beneficiarAdresa: ben.adresa || null,
        proiectantFirma: pro.firma || null,
        proiectantNume: pro.nume || null,
        proiectantAdresa: pro.adresa || null,
        atestatSocietate: pro.atestatSocietate || null,
        atestatProiectant: pro.atestatProiectant || null,
        faza: meta.faza || null,
        categoria: meta.categoriaImportanta || null,
        categoriaNume: meta.categoriaImportanta ? (catNames[meta.categoriaImportanta] || null) : null,
        tensiune: grid.tensiuneRacord != null ? fnum(grid.tensiuneRacord) : null,
        tablou: grid.tablouRacord || null,
        ptAlimentare: grid.ptAlimentare || null,
        consumAnual: consAnual != null ? Math.round(consAnual).toLocaleString(locale) : null,
        lat: loc.lat != null ? fnum(loc.lat) : null,
        lon: loc.lon != null ? fnum(loc.lon) : null,
        alt: loc.elevation != null ? Math.round(loc.elevation) : null,
        tamin: ss.tamin != null ? fnum(ss.tamin) : null,
        tamax: ss.tamax != null ? fnum(ss.tamax) : null,
        modulNume: mod0 ? mod0.name.replace(/\s*\(.*\)$/, '') : null,
        modulPmax: mod0 ? mod0.pmax : null,
        invNume: inv ? inv.name : null,
        nrInv: inv ? 1 : null,
        domeniu: ver.domeniu || null,
        verificatorNume: ver.nume || null,
        verificatorAtestat: ver.atestat || null,
        projectName: meta.projectName || null,
        codDoc: meta.codDoc || null,
        editie: meta.editie != null ? meta.editie : null,
        revizie: meta.revizie != null ? meta.revizie : null,
        data: meta.dataIntocmirii ? new Date(meta.dataIntocmirii).toLocaleDateString(locale) : null,
      },
    };
  }

  /* ── page machinery ── */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function headStrip(v) {
    return '<table class="pt-headtbl"><tr>' +
      '<td class="ph-l">' + esc(txt('common.cod')) + ': ' + (v.codDoc ? esc(v.codDoc) : '-') + '</td>' +
      '<td class="ph-c"><b>' + esc(txt('common.docTitle')) + '</b><br>' + (v.projectName ? esc(v.projectName) : missTag()) + '</td>' +
      '<td class="ph-r">' + esc(txt('common.editia')) + ': ' + (v.editie != null ? esc(String(v.editie)) : '-') + ' · ' + esc(txt('common.revizia')) + ': ' + (v.revizie != null ? esc(String(v.revizie)) : '-') +
        '<br>' + esc(txt('common.pag')) + ' <span class="pt-pagno"></span></td>' +
      '</tr></table>';
  }

  function newPage(bare, v) {
    var pg = el('div', 'pt-page' + (bare ? ' pt-bare' : ''));
    if (!bare) pg.appendChild(el('div', 'pt-head', headStrip(v)));
    var body = el('div', 'pt-body');
    pg.appendChild(body);
    _host.appendChild(pg);
    _pages.push(pg);
    _curBody = body;
    return body;
  }

  function fits() { return _curBody.scrollHeight <= _curBody.clientHeight + 1; }

  function makeTable(t) {
    var html = '<thead><tr>' + t.head.map(function (h, i) {
      return '<th' + (t.widths && t.widths[i] ? ' style="width:' + t.widths[i] + '"' : '') + '>' + h + '</th>';
    }).join('') + '</tr></thead><tbody></tbody>';
    return el('table', 'pt-tbl ' + (t.cls || ''), html);
  }

  function addTable(t, v) {
    var tbl = makeTable(t);
    _curBody.appendChild(tbl);
    if (!fits()) { _curBody.removeChild(tbl); newPage(false, v); _curBody.appendChild(tbl); }
    var tb = tbl.tBodies[0];
    t.rows.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.innerHTML = r.map(function (c) { return '<td>' + c + '</td>'; }).join('');
      if (r._attr) Object.keys(r._attr).forEach(function (k) { tr.setAttribute(k, r._attr[k]); });
      tb.appendChild(tr);
      if (!fits()) {                       // split: move the row to a fresh table on a new page
        tb.removeChild(tr);
        if (!tb.rows.length) tbl.parentNode.removeChild(tbl);
        newPage(false, v);
        tbl = makeTable(t); _curBody.appendChild(tbl); tb = tbl.tBodies[0];
        tb.appendChild(tr);
      }
    });
  }

  /* a full-page LANDSCAPE plate (the single-line schematic): the page stays portrait A4, the drawing
     is rotated 90° to fill it (CSS .pt-plate-rot). A plate is exactly one page - no fit/measure. The
     SVG carries its OWN cartouche/title block, so the page is bare (no header strip). */
  function addPlate(plate) {
    var pg = _curBody.parentNode;
    if (pg) pg.classList.add('pt-plate-page');
    var wrap = el('div', 'pt-plate');
    if (plate.svg) {
      wrap.appendChild(el('div', 'pt-plate-rot', plate.svg));
    } else {
      wrap.appendChild(el('div', 'pt-plate-miss', esc(plate.missing || '')));
    }
    _curBody.appendChild(wrap);
  }

  function addBlock(b, v) {
    if (b.pageBreak) { newPage(!!b.bare, v); return; }
    if (b.plate) { addPlate(b.plate); return; }
    if (b.table) { addTable(b.table, v); return; }
    var node;
    if (b.canvas) {
      node = el('div', 'pt-chart');
      var c = document.createElement('canvas');
      c.width = CONTENT_W; c.height = b.canvas.h || 280;
      c.style.width = CONTENT_W + 'px'; c.style.height = (b.canvas.h || 280) + 'px';
      node.appendChild(c);
      if (b.canvas.caption) node.appendChild(el('div', 'pt-caption', esc(b.canvas.caption)));
      _mounts.push({ canvas: c, mount: b.canvas.mount });
    } else {
      node = el('div', null, b.html);
    }
    _curBody.appendChild(node);
    if (!fits()) {
      _curBody.removeChild(node);
      newPage(false, v);
      _curBody.appendChild(node);          // a single block taller than a page stays (rare; visible overflow)
    }
  }

  /* ── chart configs (the graphs carried over from the retired client PDF) ── */
  var MN_RO = ['Ian','Feb','Mar','Apr','Mai','Iun','Iul','Aug','Sep','Oct','Noi','Dec'];
  var MN_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function mnames() { return _lang === 'en' ? MN_EN : MN_RO; }
  function chartOpts(stacked) {
    return { responsive: false, animation: false,
      plugins: { legend: { display: true, labels: { color: '#444', boxWidth: 12, font: { size: 10 } } } },
      scales: { x: { stacked: stacked, grid: { color: '#eee' }, ticks: { color: '#555', font: { size: 10 } } },
                y: { stacked: stacked, grid: { color: '#eee' }, ticks: { color: '#555', font: { size: 10 } } } } };
  }
  function mountBarProd(byString, totals) {
    return function (c) {
      var ds = (byString && byString.length)
        ? byString.map(function (s) { return { label: s.label, data: s.monthly, backgroundColor: s.color, stack: 'kwh', borderRadius: 2 }; })
        : [{ label: 'kWh', data: totals, backgroundColor: '#e8842c', borderRadius: 2 }];
      new Chart(c, { type: 'bar', data: { labels: mnames(), datasets: ds }, options: chartOpts(true) });
    };
  }
  function mountCvP(cons, prod) {
    return function (c) {
      new Chart(c, { type: 'bar', data: { labels: mnames(), datasets: [
        { label: _lang === 'en' ? 'Consumption' : 'Consum', data: cons, backgroundColor: '#7da7d9', borderRadius: 2 },
        { label: _lang === 'en' ? 'Production' : 'Producție', data: prod, backgroundColor: '#e8842c', borderRadius: 2 },
      ] }, options: chartOpts(false) });
    };
  }
  function mountDaily(daily) {
    return function (c) {
      var ds = daily.series.map(function (s) {
        return { label: s.label, data: s.power, borderColor: s.color, backgroundColor: s.color,
                 borderWidth: 1.5, pointRadius: 0, tension: 0.35, fill: false };
      });
      new Chart(c, { type: 'line', data: { labels: daily.hours, datasets: ds },
        options: { responsive: false, animation: false,
          plugins: { legend: { display: ds.length > 1, labels: { color: '#444', boxWidth: 12, font: { size: 10 } } } },
          scales: { x: { grid: { color: '#eee' }, ticks: { color: '#555', font: { size: 10 },
                     callback: function (val, i) { var h = daily.hours[i]; return h % 2 === 0 ? h + 'h' : ''; } } },
                    y: { grid: { color: '#eee' }, ticks: { color: '#555', font: { size: 10 } } } } } });
    };
  }

  /* ── chapter builders — each returns an array of blocks ── */
  function h2(numAndTitle) { return { html: '<h2 class="pt-h2">' + numAndTitle + '</h2>' }; }
  function h3(t) { return { html: '<h3 class="pt-h3">' + t + '</h3>' }; }
  function p(html) { return { html: '<p class="pt-p">' + html + '</p>' }; }
  function ul(items) { return { html: '<ul class="pt-ul">' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>' }; }

  function buildChapters(C) {
    var v = C.v, S = function (tpl, ch) { return sub(tpl, v, ch); };
    var chapters = [];
    var num = 0;
    function chap(id, opts) { var c = Object.assign({ id: id, blocks: [] }, opts || {}); chapters.push(c); return c; }

    /* 0 — cover (bare page) */
    var cover = chap('cover', { bare: true, pageBreak: false });
    cover.blocks.push({ html:
      '<div class="pt-cover">' +
        '<div class="pt-cv-pre">' + esc(txt('cover.titlePre')) + '</div>' +
        '<div class="pt-cv-title">' + S(txt('cover.titleTpl'), 'cover') + '</div>' +
        '<div class="pt-cv-spec">' + esc(txt('cover.spec')) + '</div>' +
        '<table class="pt-cv-tbl">' +
          [['lblBeneficiar', v.beneficiarFirma], ['lblAdresa', v.adresaObiectiv],
           ['lblProiectant', v.proiectantFirma ? (v.proiectantFirma + (v.proiectantNume ? ' - ' + v.proiectantNume : '')) : null],
           ['lblFaza', v.faza], ['lblData', v.data]].map(function (r) {
            var val = r[1];
            if (val == null || val === '') { _missing.push({ chapter: 'cover', field: r[0] }); val = null; }
            return '<tr><td>' + esc(txt('cover.' + r[0])) + '</td><td>' + (val != null ? esc(val) : missTag()) + '</td></tr>';
          }).join('') +
        '</table>' +
        (txt('common.legalNote') ? '<div class="pt-cv-note">' + esc(txt('common.legalNote')) + '</div>' : '') +
      '</div>' });

    /* borderou + lista semnături */
    var bord = chap('borderou', { pageBreak: true });
    bord.blocks.push(h2(txt('borderou.title')));
    var bordRows = [];
    bordRows.push(['1', esc(txt('borderou.memoriu')), v.codDoc ? esc(v.codDoc) : missTag(), '<span data-pt-bord="memoriu"></span>', 'A4']);
    bordRows.push(['2', esc(txt('borderou.anexa1')), 'BC-01', '<span data-pt-bord="anexa1"></span>', 'A4']);
    txt('borderou.planse').forEach(function (pl, i) {
      bordRows.push([String(3 + i), esc(pl[0]), esc(pl[1]), '1', esc(pl[2])]);
    });
    bord.blocks.push({ table: { head: txt('borderou.cols').map(esc), rows: bordRows,
      widths: ['8%', '46%', '18%', '12%', '16%'] } });
    bord.blocks.push(h2(txt('semnaturi.title')));
    bord.blocks.push({ table: { head: txt('semnaturi.cols').map(esc), rows: [
      [esc(txt('semnaturi.rows.atestatSoc')), v.proiectantFirma ? esc(v.proiectantFirma) : missTag(), v.atestatSocietate ? esc(v.atestatSocietate) : missTag(), ''],
      [esc(txt('semnaturi.rows.proiectant')), v.proiectantNume ? esc(v.proiectantNume) : missTag(), v.atestatProiectant ? esc(v.atestatProiectant) : missTag(), ''],
      [S(txt('semnaturi.rows.verificator'), 'semnaturi'), v.verificatorNume ? esc(v.verificatorNume) : missTag(), v.verificatorAtestat ? esc(v.verificatorAtestat) : missTag(), ''],
    ], widths: ['30%', '26%', '28%', '16%'], cls: 'pt-sigtbl' } });
    bord.blocks.push(p('<i>' + esc(txt('semnaturi.note')) + '</i>'));

    /* 1 — atestate (placeholder) */
    num++;
    var at = chap('atestate', { pageBreak: true, num: num, title: txt('atestate.title') });
    at.blocks.push(h2(num + ' ' + esc(txt('atestate.title'))));
    at.blocks.push(h3(num + '.1 ' + esc(txt('atestate.s1')) + ' · ' + num + '.2 ' + esc(txt('atestate.s2'))));
    at.blocks.push(p(S(txt('atestate.body'), 'atestate')));

    /* cuprins (filled in pass 2) */
    var toc = chap('cuprins', { pageBreak: true });
    toc.blocks.push(h2(txt('cuprins.title')));
    // rows added at the end of buildChapters when all numbered chapters are known

    /* 2 — date generale */
    num++;
    var dg = chap('dategen', { num: num, title: txt('dategen.title'), pageBreak: true });
    dg.blocks.push(h2(num + ' ' + esc(txt('dategen.title'))));
    txt('dategen.s').forEach(function (s, i) {
      dg.blocks.push(h3(num + '.' + (i + 1) + ' ' + esc(s[0])));
      dg.blocks.push(p(S(s[1], 'dategen')));
    });

    /* 3 — necesitatea */
    num++;
    var nec = chap('necesitate', { num: num, title: txt('necesitate.title'), pageBreak: true });
    nec.blocks.push(h2(num + ' ' + esc(txt('necesitate.title'))));
    nec.blocks.push(h3(num + '.1 ' + esc(txt('necesitate.s1title'))));
    nec.blocks.push(p(S(txt('necesitate.p1'), 'necesitate')));
    nec.blocks.push(p(S(txt('necesitate.p2'), 'necesitate')));
    nec.blocks.push(h3(num + '.2 ' + esc(txt('necesitate.s2title'))));
    nec.blocks.push(p(S(txt('necesitate.p3'), 'necesitate')));
    nec.blocks.push(h3(num + '.3 ' + esc(txt('necesitate.s3title'))));
    nec.blocks.push(p(S(txt('necesitate.p4'), 'necesitate')));
    nec.blocks.push(h3(num + '.4 ' + esc(txt('necesitate.s4title'))));
    nec.blocks.push(ul(txt('necesitate.bullets').map(function (b) { return S(b, 'necesitate'); })));

    /* 4 — abrevieri */
    num++;
    var ab = chap('abrevieri', { num: num, title: txt('abrevieri.title'), pageBreak: true });
    ab.blocks.push(h2(num + ' ' + esc(txt('abrevieri.title'))));
    ab.blocks.push({ table: { head: ['', ''], rows: txt('abrevieri.rows').map(function (r) { return ['<b>' + esc(r[0]) + '</b>', esc(r[1])]; }),
      widths: ['16%', '84%'], cls: 'pt-abbr' } });

    /* 5 — normative */
    num++;
    var nor = chap('normative', { num: num, title: txt('normative.title'), pageBreak: true });
    nor.blocks.push(h2(num + ' ' + esc(txt('normative.title'))));
    nor.blocks.push(p(esc(txt('normative.intro'))));
    var norRows = txt('normative.rows') || window.PT_TEXT_RO.normative.rows;
    nor.blocks.push({ table: { head: ['', ''], rows: norRows.map(function (r) { return ['<b>' + esc(r[0]) + '</b>', esc(r[1])]; }),
      widths: ['24%', '76%'], cls: 'pt-abbr' } });

    /* 6 — prezentarea proiectului + date tehnice CEF + șiruri */
    num++;
    var pr = chap('prezentare', { num: num, title: txt('prezentare.title'), pageBreak: true });
    pr.blocks.push(h2(num + ' ' + esc(txt('prezentare.title'))));
    pr.blocks.push(p(S(txt('prezentare.p1'), 'prezentare')));
    pr.blocks.push(p(S(txt('prezentare.p2'), 'prezentare')));
    if (C.grid.mode) pr.blocks.push(p(S(txt(C.grid.mode === 'injection' ? 'prezentare.p3inj' : 'prezentare.p3noinj'), 'prezentare')));
    else { _missing.push({ chapter: 'prezentare', field: 'gridmode' }); pr.blocks.push(p(missTag())); }
    pr.blocks.push(p(S(txt('prezentare.p4'), 'prezentare')));
    var sn = 0;
    /* 6.1 — date tehnice de intrare: the nameplate values a reviewer checks first
       (Pi modules / Pi inverters / Un / f / cos φ), then the occupied footprint + orientation. */
    sn++; pr.blocks.push(h3(num + '.' + sn + ' ' + esc(txt('prezentare.sIntrare'))));
    pr.blocks.push({ table: { head: txt('prezentare.intrareCols').map(esc),
      rows: txt('prezentare.intrareRows').map(function (r) { return [esc(r[0]), S(r[1], 'prezentare')]; }),
      widths: ['58%', '42%'] } });
    pr.blocks.push(p(S(txt('prezentare.pSuprafata'), 'prezentare')));
    pr.blocks.push(p(esc(txt('prezentare.pBransament'))));
    sn++; pr.blocks.push(h3(num + '.' + sn + ' ' + esc(txt('prezentare.sAmplasament'))));
    pr.blocks.push(p(S(txt('prezentare.pAmpl'), 'prezentare')));
    sn++; pr.blocks.push(h3(num + '.' + sn + ' ' + esc(txt('prezentare.sIradiere'))));
    pr.blocks.push(p(S(txt('prezentare.pIrad'), 'prezentare')));
    sn++; pr.blocks.push(h3(num + '.' + sn + ' ' + esc(txt('prezentare.sConsum'))));
    pr.blocks.push(p(S(txt('prezentare.pConsum'), 'prezentare')));
    sn++; pr.blocks.push(h3(num + '.' + sn + ' ' + esc(txt('prezentare.sRacordare'))));
    /* Derived connection solution: the AC cable section + breaker rating are read from
       connections.ac (PERSISTED by the Conexiuni step — the PT never re-derives the sizing).
       The engineer's own free text (grid.ptAlimentare) is appended for the site-specific
       routing the tool cannot know (trench, existing board, metering point). */
    var acL = (C.conn && Array.isArray(C.conn.ac)) ? C.conn.ac : [];
    if (acL.length) {
      pr.blocks.push(p(S(txt('prezentare.pRacord1'), 'prezentare')));
      pr.blocks.push({ table: { head: txt('prezentare.racordCols').map(esc),
        rows: acL.map(function (L, i) {
          return ['I' + (i + 1), L.pac != null ? fnum(L.pac / 1000) : '-', L.iac != null ? fnum(L.iac) : '-',
                  L.section != null ? fnum(L.section) : '-', L.mcb != null ? fnum(L.mcb) : '-',
                  L.drop != null ? fnum(L.drop) : '-'];
        }) } });
      pr.blocks.push(p(esc(txt('prezentare.pRacord2'))));
      if (C.grid.mode === 'no-injection') pr.blocks.push(p(esc(txt('prezentare.pRacordNoinj'))));
      pr.blocks.push(p(esc(txt('prezentare.pRacordPlansa'))));
    }
    pr.blocks.push(p(S(txt('prezentare.pRacordare'), 'prezentare')));
    sn++; pr.blocks.push(h3(num + '.' + sn + ' ' + esc(txt('prezentare.sCEF'))));
    pr.blocks.push(p(S(txt('prezentare.pCEF'), 'prezentare')));
    /* one module line PER DISTINCT MODULE (multi-string systems list every module type,
       with the strings that use it) — the first cefList template item is expanded */
    var modGroups = [];
    C.strings.forEach(function (s, i) {
      var m = modById(s.moduleId);
      var key = m ? m.id : '?' + i;
      var g = modGroups.find(function (x) { return x.key === key; });
      if (!g) { g = { key: key, name: m ? m.name.replace(/\s*\(.*\)$/, '') : null, pmax: m ? m.pmax : null, n: 0, strs: [] }; modGroups.push(g); }
      g.n += s.count || 0; g.strs.push('S' + (i + 1));
    });
    var cefItems = [];
    txt('prezentare.cefList').forEach(function (item, idx) {
      if (idx === 0 && modGroups.length) {
        modGroups.forEach(function (g) {
          var line = item
            .replace('{modulNume}', g.name != null ? esc(g.name) : (_missing.push({ chapter: 'prezentare', field: 'modulNume' }), missTag()))
            .replace('{modulPmax}', g.pmax != null ? fnum(g.pmax) : missTag())
            .replace('{nrModule}', String(g.n));
          cefItems.push(line + (C.strings.length > 1 ? ' <i>(' + g.strs.join(', ') + ')</i>' : ''));
        });
        return;
      }
      var semTxt;
      if (item.indexOf('{semItem}') >= 0) {
        if (C.grid.mode) semTxt = txt(C.grid.mode === 'injection' ? 'prezentare.semInj' : 'prezentare.semNoinj');
        else { _missing.push({ chapter: 'prezentare', field: 'gridmode' }); semTxt = missTag(); }
        item = item.replace('{semItem}', semTxt);
      }
      cefItems.push(S(item, 'prezentare'));
    });
    pr.blocks.push(ul(cefItems));
    sn++; pr.blocks.push(h3(num + '.' + sn + ' ' + esc(txt('prezentare.sStrings'))));
    pr.blocks.push(p(S(txt('prezentare.pStrings'), 'prezentare')));
    pr.blocks.push({ table: { head: txt('prezentare.strCols').map(esc), rows: C.perString.map(function (s) {
      function cell(x, dp) { return x != null ? fnum(x) : missTag(); }
      return ['<b>' + esc(s.label) + '</b>', s.modName ? esc(s.modName) : missTag(), esc(String(s.cfg)),
              s.p != null ? fnum(s.p) : missTag(), cell(s.imp), cell(s.ump), cell(s.isc), cell(s.vocCold), esc(s.ba)];
    }), cls: 'pt-strtbl' } });

    /* inverter technical characteristics — the MPP-tracker window a verifier checks the string
       sizing against. Values come straight from INVERTER_LIST (datasheet scrape), so an absent
       field prints "-" (a DB gap) rather than the red "[de completat]" user-input marker.
       One value column PER INVERTER UNIT (I1, I2, …) so a multi-inverter BOM lists each unit. */
    var iunits = (typeof resolveInverterUnits === 'function') ? resolveInverterUnits(C.comp) : [];
    if (iunits.length) {
      sn++; pr.blocks.push(h3(num + '.' + sn + ' ' + esc(txt('prezentare.sInvertor'))));
      pr.blocks.push(p(esc(txt('prezentare.pInvertor'))));
      pr.blocks.push(p('<i>' + iunits.map(function (u, i) {
        return (iunits.length > 1 ? 'I' + (i + 1) + ' = ' : '') + esc(u.name);
      }).join(' · ') + '</i>'));
      var ihead = txt('prezentare.invCols').concat(iunits.length > 1
        ? iunits.map(function (u, i) { return 'I' + (i + 1); })
        : [txt('prezentare.invValCol')]);
      pr.blocks.push({ table: { head: ihead.map(esc), rows: txt('prezentare.invRows').map(function (r) {
        return [esc(r[0]), esc(r[1])].concat(iunits.map(function (u) { return invField(u, r[2]); }));
      }) } });
    }

    /* 7 — protecții: the switchgear selection + verification (course pt. 16). Values are
       READ from what the steps persisted — protections.dc (relation-(20) window + chosen
       gPV fuse, per string) and connections.ac (per-inverter breaker) — so the document
       never re-derives the selection. */
    var pdc = ((C.prot || {}).dc) || [];
    var pac = ((C.conn || {}).ac) || [];
    if (pdc.length || pac.length) {
      num++;
      var pz = chap('protectii', { num: num, title: txt('protectii.title'), pageBreak: true });
      pz.blocks.push(h2(num + ' ' + esc(txt('protectii.title'))));
      pz.blocks.push(p(esc(txt('protectii.intro'))));

      if (pdc.length) {
        var sn2 = 1;
        pz.blocks.push(h3(num + '.' + sn2 + ' ' + esc(txt('protectii.dcTitle'))));
        pz.blocks.push(p(esc(txt('protectii.dcRule'))));
        pz.blocks.push({ table: { head: txt('protectii.dcCols').map(esc), rows: pdc.map(function (d) {
          return [esc(d.label), fnum(d.isc), fnum(1.25 * d.imp), fnum(d.lo), fnum(d.hi),
                  '<b>' + fnum(d.fuse) + '</b>',
                  esc(txt(d.required ? 'protectii.dcReq' : 'protectii.dcOpt')),
                  d.inWin ? esc(txt('protectii.ok')) : '<span class="pt-miss">' + esc(txt('protectii.bad')) + '</span>'];
        }), cls: 'pt-strtbl' } });
        if (pdc.some(function (d) { return !d.required; })) pz.blocks.push(p('<i>' + esc(txt('protectii.dcSingle')) + '</i>'));
        var vmaxDc = (C.comp && invById(C.comp.inverterId)) ? invById(C.comp.inverterId).vinvmax : null;
        var ucDc = pdc[0] ? pdc[0].ucDc : null;
        if (vmaxDc) pz.blocks.push(p(sub(txt('protectii.dcNoteUn'), { vmax: fnum(vmaxDc) }, 'protectii')));
        if (ucDc)   pz.blocks.push(p(sub(txt('protectii.dcNoteSpd'), { ucdc: fnum(ucDc) }, 'protectii')));
        if (vmaxDc) pz.blocks.push(p(sub(txt('protectii.dcNoteSep'), { vmax: fnum(vmaxDc) }, 'protectii')));
      }

      if (pac.length) {
        var sn3 = pdc.length ? 2 : 1;
        pz.blocks.push(h3(num + '.' + sn3 + ' ' + esc(txt('protectii.acTitle'))));
        pz.blocks.push(p(esc(txt('protectii.acRule'))));
        pz.blocks.push({ table: { head: txt('protectii.acCols').map(esc), rows: pac.map(function (L, i) {
          var ok = L.mcb != null && L.iac != null && L.mcb >= L.iac;
          return ['I' + (i + 1), fnum(L.iac), '<b>' + fnum(L.mcb) + '</b>',
                  ok ? esc(txt('protectii.ok')) : '<span class="pt-miss">' + esc(txt('protectii.bad')) + '</span>'];
        }) } });
        pz.blocks.push(p(esc(txt('protectii.acNoteRcd'))));
        pz.blocks.push(p(esc(txt('protectii.acNoteSpd'))));
        var icc = (C.prot || {}).iccKA;
        if (icc != null) pz.blocks.push(p(sub(txt('protectii.acNoteIcc'), { icc: fnum(icc) }, 'protectii')));
      }
    }

    /* 8 — teste / PIF */
    num++;
    var ts = chap('teste', { num: num, title: txt('teste.title'), pageBreak: true });
    ts.blocks.push(h2(num + ' ' + esc(txt('teste.title'))));
    ts.blocks.push(p(esc(txt('teste.intro'))));
    ts.blocks.push(ul(txt('teste.bullets').map(esc)));

    /* 8 — faze determinante */
    num++;
    var fz = chap('faze', { num: num, title: txt('faze.title'), pageBreak: true });
    fz.blocks.push(h2(num + ' ' + esc(txt('faze.title'))));
    fz.blocks.push(p(esc(txt('faze.intro'))));
    fz.blocks.push({ table: { head: txt('faze.cols').map(esc), rows: txt('faze.rows').map(function (r, i) {
      return [String(i + 1), esc(r[0]), esc(r[1]), esc(r[2])];
    }), widths: ['7%', '63%', '14%', '16%'] } });
    fz.blocks.push(p('<i>' + esc(txt('faze.note')) + '</i>'));

    /* 9 — Lista de cantități (bill of quantities / parts list). Quantities are AUTO-DERIVED from the
       project (strings + components + connections) — the engineer refines them; the civil-works section
       is left for manual entry. Grouped into 4 sections per PT-SPEC §4/§5.3. */
    num++;
    var boqC = chap('boq', { num: num, title: txt('boq.title'), pageBreak: true });
    boqC.blocks.push(h2(num + ' ' + esc(txt('boq.title'))));
    boqC.blocks.push(p(esc(txt('boq.intro'))));
    (function () {
      var stB = (typeof Project !== 'undefined' && Project.get) ? Project.get() : {};
      var strs = Array.isArray(stB.strings) ? stB.strings : [];
      var cmp = stB.components || {}, cn = stB.connections || {};
      var IT = function (k) { return txt('boq.it.' + k); };
      var SLK = 0.10;                          // 10% cable slack allowance
      var echip = [], elec = [], tabl = [], civ = [];
      var nStr = strs.length;

      /* — equipment (montaj echipamente): panels, inverters, mounting structure — */
      var byMod = {};
      strs.forEach(function (s) { if (s.moduleId) byMod[s.moduleId] = (byMod[s.moduleId] || 0) + (s.count || 0); });
      Object.keys(byMod).forEach(function (id) { var m = modById(id); echip.push([(m ? m.name : id), 'buc', byMod[id]]); });
      var invU = (Array.isArray(cmp.inverters) && cmp.inverters.length) ? cmp.inverters
               : (cmp.inverterId ? [{ inverterId: cmp.inverterId }] : []);
      var byInv = {};
      invU.forEach(function (u) { if (u.inverterId) byInv[u.inverterId] = (byInv[u.inverterId] || 0) + 1; });
      Object.keys(byInv).forEach(function (id) { var iv = invById(id); echip.push([(iv ? iv.name : id), 'buc', byInv[id]]); });
      var nInv = Object.keys(byInv).reduce(function (a, k) { return a + byInv[k]; }, 0) || (nStr ? 1 : 0);
      if (nStr) echip.push([IT('struct'), 'set', 1]);

      /* — electrical (instalații electrice): DC/AC cable, MC4, grounding — */
      var dc1 = 0;
      strs.forEach(function (s) { var L = cn.cables && cn.cables[s.id]; if (typeof L === 'number') dc1 += L; });
      if (dc1 > 0) {
        var perPole = Math.ceil(dc1 * (1 + SLK));         // one-way × slack, per polarity
        elec.push([IT('dcRed'), 'm', perPole]);
        elec.push([IT('dcBlack'), 'm', perPole]);
      }
      if (typeof cn.lenAC === 'number' && cn.lenAC > 0) elec.push([IT('ac') + (cn.matAC ? ' (' + cn.matAC + ')' : ''), 'm', Math.ceil(cn.lenAC * (1 + SLK))]);
      if (nStr) elec.push([IT('mc4'), 'buc', 2 * nStr + Math.max(2, Math.ceil(nStr * 0.1))]);
      if (nStr) elec.push([IT('ground'), 'set', 1]);

      /* — switchboard equipping (echipare tablouri): fuses, SPDs, disconnect, MCB, RCD — */
      var nFused = strs.filter(function (s) { return (s.np || 1) > 1; }).length;
      if (nFused) tabl.push([IT('fuse'), 'buc', 2 * nFused]);
      if (nStr) { tabl.push([IT('spdDC'), 'buc', 1]); tabl.push([IT('discDC'), 'buc', 1]); }
      /* MCB rows carry the RATING when the Conexiuni step has computed one (connections.ac,
         persisted per inverter); identical ratings collapse to a single quantity row. */
      var acR = Array.isArray(cn.ac) ? cn.ac : [];
      if (acR.length) {
        var byRating = {};
        acR.forEach(function (L) { var k = L.mcb != null ? fnum(L.mcb) : '?'; byRating[k] = (byRating[k] || 0) + 1; });
        Object.keys(byRating).forEach(function (k) {
          tabl.push([IT('mcb') + (k !== '?' ? ' ' + k + ' A' : ''), 'buc', byRating[k]]);
        });
      } else if (nInv) tabl.push([IT('mcb'), 'buc', nInv]);
      if (nStr) { tabl.push([IT('rcd'), 'buc', 1]); tabl.push([IT('spdAC'), 'buc', 1]); }

      /* manual rows the engineer added in the PT form (Project.section('boq').rows),
         appended into their chosen section — this is how the civil-works section fills. */
      var manual = (stB.boq && Array.isArray(stB.boq.rows)) ? stB.boq.rows : [];

      /* render the four sections; each = auto-derived rows + the user's manual rows for that section */
      [['echip', echip], ['elec', elec], ['tabl', tabl], ['civ', civ]].forEach(function (sec) {
        var rows = sec[1].slice();
        manual.forEach(function (r) {
          if (r && r.sec === sec[0] && (r.cap || (r.cant != null && r.cant !== ''))) rows.push([r.cap || '-', r.um || '-', (r.cant != null && r.cant !== '') ? r.cant : '-']);
        });
        boqC.blocks.push(h3(esc(txt('boq.sec.' + sec[0]))));
        if (rows.length) boqC.blocks.push({ table: { head: txt('boq.cols').map(esc),
          rows: rows.map(function (r, i) { return [String(i + 1), esc(r[0]), esc(r[1]), esc(String(r[2]))]; }),
          widths: ['7%', '61%', '14%', '18%'] } });
        else boqC.blocks.push(p('<i>' + esc(txt('boq.manualNote')) + '</i>'));
      });
      boqC.blocks.push(p('<i>' + esc(txt('boq.foot')) + '</i>'));
      if (!nStr) _missing.push({ chapter: 'boq', field: 'strings' });
    })();

    /* 11 — analiză economică (course pt. 19). Values are READ from economics.results,
       which the Economics step persists — the payback / IRR bisection / NPV and the
       4-mode self-consumption model live only in that page, and are not re-derived here. */
    var eres = ((C.eco || {}).results) || null;
    if (eres && eres.real) {
      num++;
      var ec = chap('economic', { num: num, title: txt('economic.title'), pageBreak: true });
      var cur = eres.currency || '';
      ec.blocks.push(h2(num + ' ' + esc(txt('economic.title'))));
      ec.blocks.push(p(sub(txt('economic.intro'), { n: eres.n, rate: fnum(eres.rate) }, 'economic')));
      var ER = txt('economic.rows');
      function ecell(x, dp) { return x == null || !isFinite(x) ? '-' : fnum(x); }
      function erow(lbl, um, a, b) {
        return [esc(lbl), esc(um), ecell(a), ecell(b)];
      }
      var R1 = eres.real, R2 = eres.optim;
      ec.blocks.push({ table: { head: txt('economic.cols').map(esc), rows: [
        erow(ER.prod,  txt('economic.umKwh'), (R1.eauto + R1.einj), R2 ? (R2.eauto + R2.einj) : null),
        erow(ER.eauto, txt('economic.umKwh'), R1.eauto, R2 ? R2.eauto : null),
        erow(ER.einj,  txt('economic.umKwh'), R1.einj,  R2 ? R2.einj : null),
        erow(ER.scr,   txt('economic.umPct'), R1.scRate * 100, R2 ? R2.scRate * 100 : null),
        erow(ER.b,     cur, R1.B, R2 ? R2.B : null),
        erow(ER.inv,   cur, R1.Iprog, R2 ? R2.Iprog : null),
        erow(ER.tr,    txt('economic.umAni'), R1.trProg, R2 ? R2.trProg : null),
        erow(ER.rir,   txt('economic.umPct'), R1.rirProg != null ? R1.rirProg * 100 : null,
                                              R2 && R2.rirProg != null ? R2.rirProg * 100 : null),
        erow(ER.vna,   cur, R1.vnaProg, R2 ? R2.vnaProg : null),
      ], widths: ['46%', '14%', '20%', '20%'] } });
      var rirPct = R1.rirProg != null ? R1.rirProg * 100 : null;
      var good = rirPct != null && eres.rate != null && rirPct >= eres.rate && R1.vnaProg > 0;
      ec.blocks.push(p(sub(txt(good ? 'economic.verdictOk' : 'economic.verdictBad'),
        { rir: rirPct != null ? fnum(rirPct) : '-', rate: fnum(eres.rate),
          vna: fnum(R1.vnaProg) + ' ' + cur, n: eres.n }, 'economic')));
      ec.blocks.push(p('<i>' + esc(txt('economic.note')) + '</i>'));
    }

    /* 12 — protecția muncii + PSI (course pt. 21). Normative content: the risks are
       inherent to every PV installation (permanent DC live parts, non-self-extinguishing
       DC arc, work at height), so the text is standard rather than project-derived. */
    num++;
    var pm = chap('psi', { num: num, title: txt('psi.title'), pageBreak: true });
    pm.blocks.push(h2(num + ' ' + esc(txt('psi.title'))));
    pm.blocks.push(p(esc(txt('psi.intro'))));
    var pmn = 0;
    pmn++; pm.blocks.push(h3(num + '.' + pmn + ' ' + esc(txt('psi.sLegal'))));
    pm.blocks.push(ul(txt('psi.legal').map(esc)));
    pmn++; pm.blocks.push(h3(num + '.' + pmn + ' ' + esc(txt('psi.sRisc'))));
    pm.blocks.push(ul(txt('psi.risc').map(esc)));
    pmn++; pm.blocks.push(h3(num + '.' + pmn + ' ' + esc(txt('psi.sPsi'))));
    pm.blocks.push(ul(txt('psi.psi').map(esc)));

    /* 13 — protecția mediului (course pt. 22) */
    num++;
    var mz = chap('mediu', { num: num, title: txt('mediu.title'), pageBreak: true });
    mz.blocks.push(h2(num + ' ' + esc(txt('mediu.title'))));
    mz.blocks.push(p(S(txt('mediu.intro'), 'mediu')));
    var mzn = 0;
    mzn++; mz.blocks.push(h3(num + '.' + mzn + ' ' + esc(txt('mediu.sExpl'))));
    mz.blocks.push(ul(txt('mediu.expl').map(esc)));
    mzn++; mz.blocks.push(h3(num + '.' + mzn + ' ' + esc(txt('mediu.sExec'))));
    mz.blocks.push(ul(txt('mediu.exec').map(esc)));
    mzn++; mz.blocks.push(h3(num + '.' + mzn + ' ' + esc(txt('mediu.sDeee'))));
    mz.blocks.push(ul(txt('mediu.deee').map(esc)));
    mz.blocks.push(p('<i>' + esc(txt('mediu.note')) + '</i>'));

    /* Anexa 1 — graphs carried over from the retired client PDF */
    var ax = chap('anexa1', { pageBreak: true, sectionMark: 'anexa1', tocTitle: txt('anexa1.title') });
    ax.blocks.push(h2(esc(txt('anexa1.title'))));
    /* the source statement is conditional: official PVGIS imports per string vs the in-house
       model (the model text appears ONLY when no string uses official PVGIS data) */
    var offIdx = [], modIdx = [];
    C.strings.forEach(function (s, i) {
      var ok = s.usePvgis && s.pvgisRef && Array.isArray(s.pvgisRef.monthlyE);
      (ok ? offIdx : modIdx).push('S' + (i + 1));
    });
    var introTxt;
    if (offIdx.length && !modIdx.length) introTxt = txt('anexa1.introOfficial');
    else if (offIdx.length)              introTxt = txt('anexa1.introMixed');
    else                                 introTxt = txt('anexa1.introModel');
    var ref0 = C.strings.filter(function (s) { return s.usePvgis && s.pvgisRef; }).map(function (s) { return s.pvgisRef; })[0];
    var dbinfo = ref0 ? (((ref0.inputs || {}).db) || 'PVGIS') + ((ref0.inputs || {}).yearMin ? ' ' + ref0.inputs.yearMin + '-' + ref0.inputs.yearMax : '') : 'PVGIS';
    introTxt = String(introTxt)
      .replace('{dbinfo}', esc(dbinfo))
      .replace('{offList}', esc(offIdx.join(', ')))
      .replace('{modList}', esc(modIdx.join(', ')));
    ax.blocks.push(p(introTxt));
    var sz = C.sizing, locale2 = _lang === 'en' ? 'en-GB' : 'ro-RO';
    var prodM = Array.isArray(sz.monthlyProd) ? sz.monthlyProd : null;
    var consM = Array.isArray(C.cons.monthly) ? C.cons.monthly : null;
    if (v.anualKwh || v.kwp) {
      ax.blocks.push({ html: '<div class="pt-metrics">' + [
        [v.anualKwh ? v.anualKwh + ' kWh' : null, txt('anexa1.mProd')],
        [v.kwp ? v.kwp + ' kWp' : null, txt('anexa1.mKwp')],
        [v.specYield ? v.specYield + ' kWh/kWp' : null, txt('anexa1.mSpec')],
        [(sz.annualProdKwh ? Math.round(sz.annualProdKwh / 12).toLocaleString(locale2) + ' kWh' : null), txt('anexa1.mAvg')],
      ].filter(function (m) { return m[0]; }).map(function (m) {
        return '<div class="pt-metric"><div class="pt-mv">' + esc(m[0]) + '</div><div class="pt-ml">' + esc(m[1]) + '</div></div>';
      }).join('') + '</div>' });
    }
    if (prodM) {
      ax.blocks.push({ canvas: { h: 280, caption: txt('anexa1.cProd'),
        mount: mountBarProd(Array.isArray(sz.monthlyByString) ? sz.monthlyByString : null, prodM) } });
    }
    if (prodM && consM) {
      ax.blocks.push({ canvas: { h: 280, caption: txt('anexa1.cCvsP'), mount: mountCvP(consM.map(Math.round), prodM) } });
    }
    if (sz.daily && Array.isArray(sz.daily.series)) {
      ax.blocks.push({ canvas: { h: 260, caption: txt('anexa1.cDaily'), mount: mountDaily(sz.daily) } });
    }
    if (prodM) {
      var maxMo = Math.max.apply(null, prodM);
      var mrows = prodM.map(function (e, i) {
        var pct = maxMo > 0 ? Math.round(e / maxMo * 100) : 0;
        return [mnames()[i], Math.round(e).toLocaleString(locale2),
                consM ? Math.round(consM[i] || 0).toLocaleString(locale2) : '-',
                '<div class="pt-bar"><div class="pt-barf" style="width:' + pct + '%"></div></div>'];
      });
      mrows.push(['<b>' + esc(txt('anexa1.tAnual')) + '</b>',
        '<b>' + Math.round(prodM.reduce(function (a, b) { return a + b; }, 0)).toLocaleString(locale2) + '</b>',
        consM ? '<b>' + Math.round(consM.reduce(function (a, b) { return a + (b || 0); }, 0)).toLocaleString(locale2) + '</b>' : '-', '']);
      ax.blocks.push(h3(esc(txt('anexa1.cTable'))));
      ax.blocks.push({ table: { head: txt('anexa1.tCols').map(esc), rows: mrows, widths: ['22%', '24%', '24%', '30%'] } });
    }
    /* ── Breviar de calcul: the §11 string sizing, formula + numeric substitution +
       result + the inverter-window verdict, PER STRING. The math is the SHARED
       sizeString() (string-ui.js) - the same function the Strings page and the Teorie
       page call, so the document can never disagree with the app. */
    /* Conductor power losses (course pt. 15 / rel. (21)-(23)) — read from what the
       Conexiuni step persisted (connections.losses); the PT never re-derives them. */
    var lss = (C.conn || {}).losses || {};
    if (Array.isArray(lss.dc) && lss.dc.length) {
      ax.blocks.push(h3(esc(txt('anexa1.lossTitle'))));
      ax.blocks.push(p(esc(txt('anexa1.lossIntro'))));
      var lrows = lss.dc.map(function (d) {
        return [esc(d.label + ' (c.c.)'), fnum(d.len), fnum(d.section), fnum4(d.R), fnum(d.imp), fnum(d.dP)];
      });
      ((C.conn || {}).ac || []).forEach(function (L, i) {
        lrows.push(['I' + (i + 1) + ' (c.a.)', fnum(C.conn.lenAC), fnum(L.section),
                    fnum4(L.section ? (0.0179 * (C.conn.lenAC || 0) / L.section) : 0), fnum(L.iac),
                    L.dP != null ? fnum(L.dP) : '-']);
      });
      ax.blocks.push({ table: { head: txt('anexa1.lossCols').map(esc), rows: lrows, cls: 'pt-strtbl' } });
      ax.blocks.push(p(sub(txt('anexa1.lossTot'), {
        dcw: fnum(lss.dcW), dcpct: lss.dcPct != null ? fnum(lss.dcPct) : '-',
        acw: fnum(lss.acW), acpct: lss.acPct != null ? fnum(lss.acPct) : '-',
        totw: fnum(lss.totalW) }, 'anexa1')));
      ax.blocks.push(p('<i>' + esc(txt('anexa1.lossNote')) + '</i>'));
    }

    if (C.strings.length && typeof sizeString === 'function') {
      var ssv = C.ss || {};
      var gmn = ssv.gmin != null ? +ssv.gmin : 100, gmx = ssv.gmax != null ? +ssv.gmax : 1000;
      var ivB = invById((C.comp || {}).inverterId);
      if (ssv.tamin == null || ssv.tamax == null) _missing.push({ chapter: 'anexa1', field: 'tamin/tamax' });
      ax.blocks.push(h3(esc(txt('anexa1.brevTitle'))));
      ax.blocks.push(p(esc(txt('anexa1.brevIntro'))));
      C.strings.forEach(function (s, i) {
        var m = modById(s.moduleId);
        if (!m || !ivB || ssv.tamin == null || ssv.tamax == null) return;
        var np = s.np || 1, ns = s.ns || (s.count && np ? Math.round(s.count / np) : null);
        var R = sizeString({ voc: m.voc, vmp: m.vmp, isc: m.isc, imp: m.imp, lv: m.lv, li: m.li,
          nmot: m.nmot, vinvmax: ivB.vinvmax, vrmppt: ivB.vrmppt, vmpptmin: ivB.vmpptmin,
          impptmax: ivB.impptmax, iscmppt: ivB.iscmppt,
          tamin: +ssv.tamin, tamax: +ssv.tamax, gmin: gmn, gmax: gmx });
        var L = txt('anexa1.brevLbl');
        var vocStr = (ns != null) ? ns * R.voc_max : null;
        function row(lbl, rel, subst, res) { return [esc(lbl), esc(rel), esc(subst), '<b>' + esc(res) + '</b>']; }
        var rows = [
          row(L.tcmin, 'Tc,min = Ta,min + (NMOT-3% - 20) · Gmin/800',
              fnum(ssv.tamin) + ' + (' + fnum(R.nmot_lo) + ' - 20) · ' + fnum(gmn) + '/800', fnum(R.tmin) + ' °C'),
          row(L.tcmax, 'Tc,max = Ta,max + (NMOT+3% - 20) · Gmax/800',
              fnum(ssv.tamax) + ' + (' + fnum(R.nmot_hi) + ' - 20) · ' + fnum(gmx) + '/800', fnum(R.tmax) + ' °C'),
          row(L.vocmax, 'Voc,max = Voc · [1 + βVoc/100 · (Tc,min - 25)]',
              fnum(m.voc) + ' · [1 + (' + fnum4(m.lv) + ')/100 · (' + fnum(R.tmin) + ' - 25)]', fnum(R.voc_max) + ' V'),
          row(L.vmpmin, 'Vmp,min = Vmp · [1 + βVoc/100 · (Tc,max - 25)]',
              fnum(m.vmp) + ' · [1 + (' + fnum4(m.lv) + ')/100 · (' + fnum(R.tmax) + ' - 25)]', fnum(R.vmp_min) + ' V'),
          row(L.iscmax, 'Isc,max = Isc · [1 + αIsc/100 · (Tc,max - 25)] · Gmax/1000',
              fnum(m.isc) + ' · [1 + ' + fnum4(m.li) + '/100 · (' + fnum(R.tmax) + ' - 25)] · ' + fnum(gmx) + '/1000', fnum(R.isc_max) + ' A'),
          row(L.impmax, 'Imp,max = Imp · [1 + αIsc/100 · (Tc,max - 25)] · Gmax/1000',
              fnum(m.imp) + ' · [1 + ' + fnum4(m.li) + '/100 · (' + fnum(R.tmax) + ' - 25)] · ' + fnum(gmx) + '/1000', fnum(R.imp_max) + ' A'),
        ];
        if (vocStr != null) rows.push(row(L.vocstr, 'Voc,șir = Ns · Voc,max',
          String(ns) + ' · ' + fnum(R.voc_max), fnum(vocStr) + ' V'));
        ax.blocks.push(p('<b>' + esc('S' + (i + 1)) + '</b> - ' + esc(m.name) + ' / ' + esc(ivB.name)));
        ax.blocks.push({ table: { head: txt('anexa1.brevCols').map(esc), rows: rows,
          widths: ['24%', '30%', '30%', '16%'], cls: 'pt-strtbl' } });
        ax.blocks.push(p(sub(txt('anexa1.brevNs'),
          { nsmin: R.ns_min, nsmax: R.ns_max, ns: ns != null ? ns : '-', np: np, npmax: R.np_max }, 'anexa1')));
        /* verdict uses the ACTUAL adopted Ns/Np, not just the generic window */
        var okV = (vocStr == null) || (vocStr <= ivB.vinvmax);
        var vals = { vocstr: vocStr != null ? fnum(vocStr) : '-', vinvmax: fnum(ivB.vinvmax),
                     impmax: fnum(R.imp_max * np), impptmax: fnum(ivB.impptmax),
                     iscmax: fnum(R.isc_max * np), iscmppt: fnum(ivB.iscmppt) };
        var pass = okV && (R.imp_max * np <= ivB.impptmax) && (R.isc_max * np <= ivB.iscmppt);
        ax.blocks.push(p((pass ? '' : '<span class="pt-miss">') +
          esc(sub(txt(pass ? 'anexa1.brevOk' : 'anexa1.brevBad'), vals, 'anexa1')) + (pass ? '' : '</span>')));
      });
    }

    if (C.perString.length) {
      ax.blocks.push(h3(esc(txt('anexa1.bdTitle'))));
      var bs = Array.isArray(sz.monthlyByString) ? sz.monthlyByString : [];
      ax.blocks.push({ table: { head: txt('anexa1.bdCols').map(esc), rows: C.perString.map(function (s, i) {
        var ann = bs[i] && Array.isArray(bs[i].monthly) ? bs[i].monthly.reduce(function (a, b) { return a + b; }, 0) : null;
        var kw = s.p != null ? s.p / 1000 : null;
        var st = C.strings[i] || {};
        var pr0 = Math.max(0, 1 - ((st.losses || 0) + (st.optimizer || 0)) / 100);
        return ['<b>' + esc(s.label) + '</b>' + (s.official ? ' <span class="pt-pvgis">' + esc(txt('anexa1.pvgisTag')) + '</span>' : ''),
                s.modName ? esc(s.modName) : '-', esc(String(st.count || '-')),
                kw != null ? fnum(kw) : '-', esc(s.ba), fnum(pr0),
                ann != null ? Math.round(ann).toLocaleString(locale2) : '-',
                (ann != null && kw) ? Math.round(ann / kw).toLocaleString(locale2) : '-'];
      }), cls: 'pt-strtbl' } });
    }

    /* Planșe — placeholder pages with title block (P-A per PT-SPEC §6) */
    var plChap = chap('planse', { pageBreak: true, sectionMark: 'planse', tocTitle: txt('planse.title') });
    plChap.blocks.push(h2(esc(txt('planse.title'))));
    plChap.blocks.push(p(esc(txt('planse.note'))));
    /* Two of the borderou plates are DRAWN by shared engine builders instead of being
       "se anexează" placeholders — and they are emitted IN BORDEROU ORDER inside the loop
       below, so the plates follow the borderou (IE001 … IE005):
         · IE002 — the single-line schematic (SchemaSVG, same builder as the schema editor).
           It carries its OWN full title block, so it goes on a BARE page rotated 90° to lie
           landscape (addPlate/CSS); we stamp it with the plate id so it reads "Planșa IE002"
           instead of the standalone drawing's "pag. 1/1".
         · IE005 — the two to-scale mounting views (MountingSVG), inside the normal plate frame.
       Both fall back to the placeholder + a pre-flight entry when their step has no data yet. */
    var sres = (typeof SchemaSVG !== 'undefined') ? SchemaSVG.build({ nodeIds: false, learn: false, plateNo: 'IE002' }) : null;
    var pres = (typeof PanelSVG !== 'undefined') ? PanelSVG.buildDC({ plateNo: 'IE004' }) : null;   // DC combiner board
    var mres = C.mgeo;   // built once in collect() (also feeds 6.1's occupied-area figure)
    txt('borderou.planse').forEach(function (pl) {
      /* IE002 — bare landscape plate, the schematic supplies its own cartouche */
      if (pl[1] === 'IE002' && sres) {
        plChap.blocks.push({ pageBreak: true, bare: true });
        if (sres.hasStrings) { plChap.blocks.push({ plate: { svg: sres.svg } }); }
        else {
          _missing.push({ chapter: 'planse', field: 'schemaMonofilara' });
          plChap.blocks.push({ plate: { missing: txt('planse.schemaMissing') } });
        }
        return;
      }
      /* IE004 — TE-CC combiner board layout, bare landscape plate (own cartouche) */
      if (pl[1] === 'IE004' && pres) {
        plChap.blocks.push({ pageBreak: true, bare: true });
        if (pres.hasData) { plChap.blocks.push({ plate: { svg: pres.svg } }); }
        else {
          _missing.push({ chapter: 'planse', field: 'tabloulTECC' });
          plChap.blocks.push({ plate: { missing: txt('planse.seAnexeaza') } });
        }
        return;
      }
      var drawn = (pl[1] === 'IE005' && mres && mres.hasData)
        ? '<div class="pt-pl-draw">' +
            '<div class="pt-pl-view"><div class="pt-pl-vt">' + esc(txt('planse.viewSide')) + '</div>' + mres.side + '</div>' +
            '<div class="pt-pl-view"><div class="pt-pl-vt">' + esc(txt('planse.viewPlan')) + '</div>' +
              (mres.hasPlan ? mres.plan
                            : '<div class="pt-pl-nodata">' + esc(txt('planse.noPlan')) + '</div>') + '</div>' +
          '</div>'
        : null;
      if (pl[1] === 'IE005' && !drawn) _missing.push({ chapter: 'planse', field: 'planAmplasamentPanouri' });
      plChap.blocks.push({ pageBreak: true });
      plChap.blocks.push({ html:
        '<div class="pt-plansa">' + (drawn || '<div class="pt-pl-empty">' + esc(txt('planse.seAnexeaza')) + '</div>') +
        '<table class="pt-cartus"><tr>' +
          '<td>' + esc(txt('planse.cartus.proiectat')) + ': ' + (v.proiectantNume ? esc(v.proiectantNume) : missTag()) + '<br>' +
                   esc(txt('planse.cartus.aprobat')) + ': ' + (v.proiectantNume ? esc(v.proiectantNume) : missTag()) + '</td>' +
          '<td>' + (v.beneficiarFirma ? esc(v.beneficiarFirma) : missTag()) + '<br>' + (v.adresaObiectiv ? esc(v.adresaObiectiv) : missTag()) + '</td>' +
          '<td>' + esc(txt('planse.cartus.faza')) + ': ' + (v.faza ? esc(v.faza) : missTag()) + '<br>' + esc(txt('planse.cartus.plansa')) + ': <b>' + esc(pl[1]) + '</b></td>' +
          '<td>' + esc(pl[0]) + '</td>' +
        '</tr></table></div>' });
    });

    /* cuprins rows (now that numbering is known) */
    var tocRows = chapters.filter(function (c) { return c.num || c.tocTitle; }).map(function (c) {
      var label = c.num ? (c.num + ' ' + c.title) : c.tocTitle;
      return [esc(label), '<span data-pt-toc="' + c.id + '"></span>'];
    });
    toc.blocks.push({ table: { head: ['', txt('common.pag')].map(esc), rows: tocRows, widths: ['86%', '14%'], cls: 'pt-toctbl' } });

    return chapters;
  }

  /* ── main build ── */
  function build(host, lang) {
    _lang = lang === 'en' ? 'en' : 'ro';
    _missing = []; _mounts = []; _pages = []; _sections = {}; _chapStart = {};
    _host = host;
    host.innerHTML = '';

    var C = collect();
    if (!C.v.projectName) _missing.push({ chapter: 'header', field: 'projectName' });
    var chapters = buildChapters(C);

    chapters.forEach(function (c, ci) {
      if (ci === 0) newPage(!!c.bare, C.v);
      else if (c.pageBreak) newPage(!!c.bare, C.v);
      _chapStart[c.id] = _pages.length;            // 1-based page where the chapter starts
      if (c.sectionMark) _sections[c.sectionMark] = _pages.length;
      c.blocks.forEach(function (b) { addBlock(b, C.v); });
      _chapStart[c.id] = Math.min(_chapStart[c.id], _pages.length); // (start recorded before blocks)
    });

    /* pass 2 — page numbers, TOC, borderou section page counts */
    var total = _pages.length;
    _pages.forEach(function (pg, i) {
      var n = pg.querySelector('.pt-pagno');
      if (n) n.textContent = (i + 1) + ' / ' + total;
    });
    Object.keys(_chapStart).forEach(function (id) {
      host.querySelectorAll('[data-pt-toc="' + id + '"]').forEach(function (cell) { cell.textContent = _chapStart[id]; });
    });
    var anexaStart = _sections.anexa1 || total + 1;
    var planseStart = _sections.planse || total + 1;
    var counts = { memoriu: anexaStart - 1, anexa1: Math.max(0, planseStart - anexaStart) };
    Object.keys(counts).forEach(function (k) {
      host.querySelectorAll('[data-pt-bord="' + k + '"]').forEach(function (cell) { cell.textContent = counts[k]; });
    });

    /* mount charts last (fixed-size canvases — pagination already measured them) */
    if (typeof Chart !== 'undefined') {
      _mounts.forEach(function (m) { try { m.mount(m.canvas); } catch (e) { /* chart data absent */ } });
    }

    /* dedupe missing list for the pre-flight */
    var seen = {}, miss = [];
    _missing.forEach(function (m) {
      var k = m.chapter + ':' + m.field;
      if (!seen[k]) { seen[k] = 1; miss.push(m); }
    });
    return { pages: total, missing: miss, values: C.v };
  }

  return { build: build };
})();
