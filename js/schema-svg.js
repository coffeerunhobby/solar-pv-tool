/* schema-svg.js — the single-line schematic MODEL + SVG builder, extracted from schema.html so it
   is a SINGLE SOURCE OF TRUTH shared by the editor (schema.html) and the Proiect Tehnic document
   (pt.html → pt-doc.js, which embeds the same drawing as a landscape plate).

   The schematic is NOT hand-drawn: an ordered, auditable RULE BOOK (R-001 … R-009) reads the
   Project state, builds a directed device graph, and the renderer lays it on a cartouche zone grid
   and routes orthogonal wires port-to-port (IEC 60617 symbols from js/iec-symbols.js).

   PUBLIC API (window.SchemaSVG):
     build(opts) -> { svg, hasStrings, model:{devs,edges,hasStrings}, report }
        opts.nodeIds (default true)  — draw the n# scaffolding ids (editor); pass false for the PT plate
        opts.learn   (default Explain.isOn() if present, else false) — draw the per-wire cable-type labels
        opts.plateNo (default null) — stamp 'Planșa <id>' in the title cell instead of 'pag. 1/1'
                                     (the PT passes its borderou plate id; standalone stays 1/1)
     STATE I/O used by the editor UI (schema.html): cellOf/setCell, labelOf/setLabel,
     effectiveEdges/setEdges, cableOf/setCable, persist, plus COLS/ROWS/rowLetter/LABEL_RULES.

   Depends on: Project (project-state.js), MODULE_LIST/INVERTER_LIST (string-ui.js),
   IEC (iec-symbols.js); Explain (explain.js) is optional. */
window.SchemaSVG = (function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  /* ── Cartouche / zone grid geometry ─────────────────────────────────────── */
  var COLS = 10, ROWS = 8;                 // columns 0-9, rows A-H
  var W = 1480, H = 940;
  var M = 30;                              // frame margin (rulers live here)
  var TITLE_H = 120;                       // title block strip at the bottom
  var gx0 = M, gx1 = W - M;                // grid x extent
  var gy0 = M + 14, gy1 = H - M - TITLE_H; // grid y extent (room for the top number ruler)
  var cellW = (gx1 - gx0) / COLS;
  var cellH = (gy1 - gy0) / ROWS;
  var SYMW = 78, SYMH = 40;
  var STRCOL = ['#1a5c2a', '#2563eb', '#d97706', '#7c3aed', '#0891b2', '#be123c', '#65a30d', '#c026d3'];

  function rowLetter(r) { return String.fromCharCode(65 + r); }
  function cellCX(col) { return gx0 + col * cellW + cellW / 2; }
  function cellCY(row) { return gy0 + row * cellH + cellH / 2; }

  /* ── Build the device list from the project ─────────────────────────────── */
  function strInfo(s) {
    var np = s.np || 1, ns = s.ns || (s.count ? Math.max(1, Math.round(s.count / np)) : 1);
    return ns + 's×' + np + 'p';
  }
  function r2(v) { return Math.round(v * 10) / 10; }
  function moduleOf(s) { return (typeof MODULE_LIST !== 'undefined' && s) ? MODULE_LIST.find(function (m) { return m.id === s.moduleId; }) : null; }
  function invById(id) { return (typeof INVERTER_LIST !== 'undefined' && id) ? INVERTER_LIST.find(function (i) { return i.id === id; }) : null; }
  /* the chosen inverter UNITS: the explicit components.inverters list (I1, I2, …) when present,
     else the legacy single components.inverterId. */
  function invUnits(project) {
    var c = project.components || {}, list = Array.isArray(c.inverters) ? c.inverters : [];
    var units = list.map(function (v) { return invById(v.inverterId); }).filter(Boolean);
    if (!units.length && c.inverterId) { var u = invById(c.inverterId); if (u) units = [u]; }
    return units;
  }
  function invOf(project) { return invUnits(project)[0] || null; }   // representative (first)
  /* MPP-tracker capacity: each string is an independent orientation needing its own tracker. The
     single-line draws exactly the user's inverter UNITS; a shortfall (Σ strings > Σ MPP trackers) is
     flagged by R-009 (not auto-filled - the schema reflects the real BOM). */
  function invCapacity(project) {
    var units = invUnits(project), nStr = (project.strings || []).length;
    var nm = units.filter(function (u) { return u.type !== 'micro'; }).reduce(function (a, u) { return a + (u.nmppt || 0); }, 0);
    return { units: units, nStr: nStr, nInv: units.length, nmppt: nm || null, short: !!(nm && nStr > nm) };
  }
  /* IEC 62548 string overcurrent check: a faulted string can see reverse current (Sa-1)*Isc from the
     other parallel strings; a gPV fuse is required when that exceeds the module max series fuse rating
     (module `maxfuse`, else the protections override, else a typical 15 A). Falls back to >=3 strings
     if no module Isc is known. (Note: Sa here = total strings - per-MPPT grouping isn't modelled yet.) */
  function fuseAnalysis(strings, prot) {
    var n = strings.length, isc = 0, maxfuse = null;
    strings.forEach(function (s) {
      var m = moduleOf(s);
      if (m && m.isc) isc = Math.max(isc, +m.isc);
      if (m && m.maxfuse) maxfuse = (maxfuse == null) ? +m.maxfuse : Math.min(maxfuse, +m.maxfuse);
    });
    if (maxfuse == null) maxfuse = (prot && prot.iprodFV) ? +prot.iprodFV : 15;
    var hasIsc = isc > 0, revI = (n - 1) * isc;
    return { n: n, isc: r2(isc), maxfuse: maxfuse, revI: r2(revI), needed: hasIsc ? (revI > maxfuse) : (n >= 3), hasIsc: hasIsc };
  }
  /* ── Rule book ──────────────────────────────────────────────────────────────
     The graph is NOT hand-built; it is assembled by an ordered list of named RULES. Each rule reads
     the project + the graph-so-far, ADDS nodes/edges, and carries an i18n explanation of what it
     does (so the linking logic is transparent and documented). Later rules see earlier nodes.
     `makeGraph` is the builder context the rules write to (auto node numbering, link, byKind/byRole). */
  var MIDROW = Math.floor(ROWS / 2);
  /* DC branches skip a row (stride 2) when the grid has room, so each SPD's PE earth gets the empty
     row directly beneath it; packs tight (stride 1) only when there are too many strings to fit. */
  function rowStep(n) { return (n * 2 < ROWS) ? 2 : 1; }
  function why(key, vals) { return { key: key, vals: vals || {} }; }   // a (dynamic) reason for the audit report

  /* Builder context the rules write to. KEY IDEA: each PV string keeps a BRANCH with a moving TAIL.
     A rule appends to the tail (string -> [fuse] -> [spd] -> ...). If a CONDITIONAL rule doesn't fire
     (e.g. no fuse needed), the tail is unchanged, so the next rule attaches to whatever IS there -
     the schematic never breaks. The DC disconnector then collects every branch tail. */
  function makeGraph(project) {
    var devs = [], edges = [], n = 0, branches = [];
    var G = {
      project: project, devs: devs, edges: edges, branches: branches,
      add:  function (props) { var d = Object.assign({ node: ++n }, props); devs.push(d); return d; },  // node = 1-based graph id
      link: function (a, b, fromPort, toPort) { if (a && b) edges.push({ from: a.node, to: b.node, fromPort: fromPort, toPort: toPort }); },   // directed; optional named ports
      byKind: function (kind) { return devs.filter(function (d) { return d.kind === kind; }); },
      addBranch: function (node, row) { var br = { head: node, tail: node, row: row }; branches.push(br); return br; },
      append: function (br, node) { G.link(br.tail, node); br.tail = node; return node; }
    };
    return G;
  }

  /* ── The rule book ──────────────────────────────────────────────────────────
     Each rule is AUDITABLE: id + ref + standard[] + clause + justification, a condition() that
     decides IF it applies (with a human reason), and apply() that mutates the graph. The report
     panel renders this so an ANRE verifier sees not just F1-F3, but WHY they exist and under which
     normative. */
  var RULES = [
    { id: 'pv_strings', ref: 'R-001', title: 'rule.strings.title',
      standard: ['IEC 62548'], clause: 'rule.strings.clause', justification: 'rule.strings.justif',
      condition: function (G) { var n = G.project.strings.length; return { applies: n > 0, reason: why(n > 0 ? 'rule.strings.reason' : 'rule.none', { n: n }) }; },
      apply: function (G) { var st = rowStep(G.project.strings.length); G.project.strings.forEach(function (s, i) { G.addBranch(G.add({ kind: 'string', label: 'S' + (i + 1), sub: strInfo(s), color: STRCOL[i % STRCOL.length], defCol: 0, defRow: i * st }), i * st); }); } },

    { id: 'pv_string_overcurrent', ref: 'R-002', title: 'rule.overcurrent.title', forceable: 'forceFuses',
      standard: ['IEC 62548', 'IEC 60364-7-712', 'I7'], clause: 'rule.overcurrent.clause', justification: 'rule.overcurrent.justif',
      /* gPV fuse required when reverse current (Sa-1)*Isc exceeds the module max series fuse. The
         `forceFuses` flag (default on) includes them anyway when not strictly required. */
      condition: function (G) {
        var a = fuseAnalysis(G.project.strings, G.project.protections);
        return { applies: a.needed, reason: why(a.needed ? 'rule.overcurrent.reason_yes' : 'rule.overcurrent.reason_no', { n: a.n, rev: a.revI, mf: a.maxfuse }) };
      },
      apply: function (G) { G.branches.forEach(function (br, i) { G.append(br, G.add({ kind: 'fuse', label: 'F' + (i + 1), sub: 'gPV', defCol: 1, defRow: br.row })); }); } },

    { id: 'pv_string_spd', ref: 'R-003', title: 'rule.spd.title',
      standard: ['IEC 61643-31', 'IEC 60364-7-712'], clause: 'rule.spd.clause', justification: 'rule.spd.justif',
      condition: function (G) { return { applies: G.branches.length > 0, reason: why('rule.spd.reason') }; },
      apply: function (G) { G.branches.forEach(function (br, i) { G.append(br, G.add({ kind: 'spd', role: 'dc', label: 'SPD' + (i + 1), sub: 'CC', defCol: 2, defRow: br.row })); }); } },

    { id: 'dc_disconnect', ref: 'R-004', title: 'rule.disc.title',
      standard: ['IEC 60364-7-712', 'IEC 62548'], clause: 'rule.disc.clause', justification: 'rule.disc.justif',
      /* one load-break switch-disconnector PER STRING (after its SPD): at high DC voltage the
         disconnector needs several poles in series for arc extinction, so a single shared unit for
         all strings is impractical. */
      condition: function (G) { return { applies: G.branches.length > 0, reason: why('rule.disc.reason', { n: G.branches.length }) }; },
      apply: function (G) { G.branches.forEach(function (br, i) { G.append(br, G.add({ kind: 'disc', label: 'Q' + (i + 1), sub: 'sep. CC', defCol: 3, defRow: br.row })); }); } },

    { id: 'ac_chain', ref: 'R-005', title: 'rule.acchain.title',
      standard: ['IEC 60364-4-41', 'IEC 60364-5-53'], clause: 'rule.acchain.clause', justification: 'rule.acchain.justif',
      condition: function (G) { return { applies: G.branches.length > 0, reason: why('rule.acchain.reason') }; },
      apply: function (G) {
        var c = G.project.components || {}, conn = G.project.connections || {}, prot = G.project.protections || {};
        var units = invCapacity(G.project).units, nBr = G.branches.length;
        var nInv = Math.max(1, units.length);   // always draw at least one inverter
        var st = rowStep(G.project.strings.length);
        var rowOf = function (k) { return Math.min(ROWS - 1, k * st); };   // top-aligned, same skip-row stride as the strings
        var chainRow = 0;                                                  // shared AC chain sits on the top row (with INV1)
        var fallbackKw = c.pacInv ? Math.round(c.pacInv / 1000) + 'kW' : '';
        /* draw EACH chosen inverter (I1, I2, …) with its own kW; strings chunk across them by capacity */
        var invs = [], caps = [];
        for (var k = 0; k < nInv; k++) {
          var u = units[k];
          invs.push(G.add({ kind: 'inv', label: nInv > 1 ? 'INV' + (k + 1) : 'INV',
            sub: u ? (Math.round(u.pac / 1000) + 'kW') : fallbackKw, defCol: 4, defRow: rowOf(k) }));
          caps.push(u && u.type !== 'micro' && u.nmppt ? u.nmppt : Math.max(1, Math.ceil(nBr / nInv)));   // even split when nmppt unknown
        }
        var ui = 0, used = 0;   // greedily fill each inverter to its MPPT capacity, overflow to the last
        G.branches.forEach(function (br) { while (ui < nInv - 1 && used >= caps[ui]) { ui++; used = 0; } G.link(br.tail, invs[ui]); used++; });
        /* AC side: each inverter gets its own MCB; all MCBs converge on a shared RCD -> [SPD~] -> meter -> grid */
        var rcd = G.add({ kind: 'rcd', label: 'RCD', sub: 'A', defCol: 6, defRow: chainRow });
        invs.forEach(function (inv, k) {
          var mcb = G.add({ kind: 'mcb', label: nInv > 1 ? 'MCB' + (k + 1) : 'MCB', sub: 'CA', defCol: 5, defRow: rowOf(k) });
          G.link(inv, mcb); G.link(mcb, rcd);
        });
        var seq = [];
        if ((conn.lenAC || 0) > 10 || prot.distAC > 10) seq.push({ kind: 'spd', role: 'ac', label: 'SPD~', sub: 'CA' });
        seq.push({ kind: 'meter', label: 'METER', sub: '' });   // "Wh" is drawn inside the symbol; designator below = METER
        seq.push({ kind: 'grid', label: 'MAIN', sub: '', phases: (+(conn.phases || 1) === 3 ? 3 : 1) });   // mains symbol: 1- or 3-phase from project state
        var prev = rcd, col = 7;
        seq.forEach(function (props) { props.defCol = Math.min(COLS - 1, col++); props.defRow = chainRow; var d = G.add(props); G.link(prev, d); prev = d; });
      } },

    { id: 'storage', ref: 'R-006', title: 'rule.storage.title',
      standard: ['IEC 62548', 'IEC 60364-7-712'], clause: 'rule.storage.clause', justification: 'rule.storage.justif',
      /* a battery (storage) connects to the inverter's bidirectional DC port - demonstrates a node
         with a THIRD connection (in + out + bat). Only when the project carries a battery. */
      condition: function (G) { var has = !!(G.project.components && G.project.components.batteryId); return { applies: has, reason: why(has ? 'rule.storage.reason_yes' : 'rule.storage.reason_no') }; },
      apply: function (G) {
        var inv = G.byKind('inv')[0]; if (!inv) return;
        var bat = G.add({ kind: 'battery', label: 'BAT', sub: 'c.c.', defCol: inv.defCol, defRow: Math.min(ROWS - 1, (inv.defRow || 0) + 1) });
        G.link(inv, bat, 'bat');   // multi-port edge: inverter battery port -> storage (bidirectional DC link)
      } },

    { id: 'spd_earthing', ref: 'R-007', title: 'rule.spdearth.title',
      standard: ['IEC 61643-31', 'IEC 60364-5-54'], clause: 'rule.spdearth.clause', justification: 'rule.spdearth.justif',
      /* each SPD gets its OWN PE node + earth wire from its earth port (a real multi-port connection,
         not the embedded ground). */
      condition: function (G) { var n = G.byKind('spd').length; return { applies: n > 0, reason: why('rule.spdearth.reason', { n: n }) }; },
      apply: function (G) {
        var st = rowStep(G.project.strings.length);
        G.byKind('spd').forEach(function (p, i) {
          /* a REAL grid-placed PE node per SPD - listed in the placement card (source of truth) and movable.
             With the skip-row layout (stride 2) the PE sits on the empty row DIRECTLY BELOW its SPD; when
             packed (stride 1, many strings) it stacks in the lower grid so it doesn't land on the next string. */
          var row = st > 1 ? Math.min(ROWS - 1, (p.defRow != null ? p.defRow : 0) + 1) : Math.min(ROWS - 1, MIDROW + 1 + i);
          var e = G.add({ kind: 'earth', label: 'PE' + (i + 1), sub: '', defCol: (p.defCol != null ? p.defCol : 2), defRow: row });
          G.link(p, e, 'earth');   // SPD earth port -> its own PE node
        });
      } },

    { id: 'earthing', ref: 'R-008', title: 'rule.earth.title',
      standard: ['IEC 60364-5-54'], clause: 'rule.earth.clause', justification: 'rule.earth.justif',
      condition: function (G) { return { applies: true, reason: why('rule.earth.reason') }; },
      apply: function (G) { G.add({ kind: 'earth', label: 'PE', sub: '', defCol: 0, defRow: ROWS - 1 }); } },

    { id: 'mppt_capacity', ref: 'R-009', title: 'rule.mpptcap.title',
      standard: ['IEC 62548'], clause: 'rule.mpptcap.clause', justification: 'rule.mpptcap.justif',
      /* AUDIT-ONLY (ac_chain already instantiates the units): verdict ✔ when the strings fit the
         inverter's MPP trackers, ✖ when there's a shortfall (and the single-line shows N inverters). */
      condition: function (G) {
        var cap = invCapacity(G.project);
        if (!cap.nmppt) return { applies: true, reason: why('rule.mpptcap.reason_na', { n: cap.nStr }) };
        return { applies: !cap.short, reason: why(cap.short ? 'rule.mpptcap.reason_short' : 'rule.mpptcap.reason_ok',
          { n: cap.nStr, m: cap.nmppt, u: cap.nInv }) };
      },
      apply: function (G) {} }
  ];

  /* Run the rule book: evaluate each condition, apply if it holds, and record an audit report
     (verdict + reason + the nodes that rule created). Returns the graph + the report. */
  function runRules(project) {
    var G = makeGraph(project), report = [], schema = Project.section('schema') || {};
    RULES.forEach(function (rule) {
      var before = G.devs.length;
      var cond = rule.condition ? rule.condition(G) : { applies: true, reason: null };
      var forced = rule.forceable ? (schema[rule.forceable] !== false) : false;   // forceFuses default ON
      var applies = cond.applies || forced;
      if (applies) rule.apply(G);
      report.push({ rule: rule, applies: applies, needed: cond.applies, forced: forced && !cond.applies, reason: cond.reason, created: G.devs.slice(before) });
    });
    return { devs: G.devs, edges: G.edges, report: report };
  }

  function buildDevices() {
    var project = {
      strings: (Project.section('strings') || []).slice(0, 6),
      components: Project.section('components') || {},
      connections: Project.section('connections') || {},
      protections: Project.section('protections') || {}
    };
    var r = runRules(project);
    return { devs: r.devs, edges: r.edges, hasStrings: project.strings.length > 0, report: r.report };
  }

  /* ── State: cartouche-cell overrides ────────────────────────────────────── */
  function layout() { return (Project.section('schema') || {}).layout || {}; }
  function cellOf(d) { var L = layout()[d.node]; return { col: L ? L.col : d.defCol, row: L ? L.row : d.defRow }; }
  function persist() { Project.patch('schema', { layout: layout() }); }
  function setCell(node, col, row) {
    var L = Object.assign({}, layout()); L[node] = { col: +col, row: +row };
    Project.patch('schema', { layout: L });
  }

  /* ── State: per-node custom labels (editable in the placement list; default = the rule's label) ── */
  function labelsMap() { return (Project.section('schema') || {}).labels || {}; }
  function labelOf(d) { var v = labelsMap()[d.node]; return (v != null && v !== '') ? v : d.label; }
  function setLabel(node, val) {
    var L = Object.assign({}, labelsMap());
    if (val == null || val === '') delete L[node]; else L[node] = val;
    Project.patch('schema', { labels: L });
  }

  /* ── Graph edges: a custom edge list (schema.edges) overrides the auto defaults ─────────── */
  function effectiveEdges(model) {
    var ce = (Project.section('schema') || {}).edges;
    if (ce && ce.length != null) return ce.map(function (e) { return { from: +e.from, to: +e.to, fromPort: e.fromPort, toPort: e.toPort }; });
    return (model && model.edges) ? model.edges.map(function (e) { return { from: +e.from, to: +e.to, fromPort: e.fromPort, toPort: e.toPort }; }) : [];
  }
  function setEdges(arr) { Project.patch('schema', { edges: arr.map(function (e) { return { from: +e.from, to: +e.to }; }) }); }

  /* ── Cable label rules: each wire gets a designator (W#) + a cable type by category ───────────
     The cable per category is editable (schema.cables overrides the default). DC solar default is
     H1Z2Z2-K (EN 50618 PV cable); AC default a generic copper LV cable. */
  function sideOf(d) { if (!d) return 'dc'; if (d.role === 'ac') return 'ac'; return ['inv', 'mcb', 'rcd', 'meter', 'grid'].indexOf(d.kind) >= 0 ? 'ac' : 'dc'; }
  function isBattEdge(a, c, e) {
    return (c && c.kind === 'battery') || (a && a.kind === 'battery') ||
           (e && (e.fromPort === 'bat' || e.toPort === 'bat'));
  }
  /* Battery DC cable default is architecture-aware: HV stacks (200-600 V DC) need the 1.5 kV PV
     cable, an LV 48 V pack is fine on the 450/750 V rubber flex. Falls back to H1Z2Z2-K. */
  function batteryCableDefault() {
    var comp = Project.section('components') || {}, id = comp.batteryId;
    if (id && typeof BATTERY_LIST !== 'undefined') {
      var b = BATTERY_LIST.filter(function (x) { return x.id === id; })[0];
      if (b && b.architecture === 'lv') return 'H07RN-F';
    }
    return 'H1Z2Z2-K';
  }
  var LABEL_RULES = [
    { id: 'dc_string', i18n: 'lbl.dcstring', def: 'H1Z2Z2-K', match: function (a) { return sideOf(a) === 'dc' && a.kind !== 'disc'; } },
    { id: 'dc_main',   i18n: 'lbl.dcmain',   def: 'H1Z2Z2-K', match: function (a) { return a.kind === 'disc'; } },
    { id: 'dc_batt',   i18n: 'lbl.dcbatt',   def: batteryCableDefault, match: function (a, c, e) { return isBattEdge(a, c, e); } },
    { id: 'ac',        i18n: 'lbl.ac',       def: 'NYY-J',    match: function (a) { return sideOf(a) === 'ac'; } }
  ];
  function cablesMap() { return (Project.section('schema') || {}).cables || {}; }
  function cableOf(id) {
    var c = cablesMap()[id], r = LABEL_RULES.filter(function (x) { return x.id === id; })[0];
    if (c != null && c !== '') return c;
    if (!r) return '';
    return (typeof r.def === 'function') ? r.def() : r.def;
  }
  function cableForEdge(a, c, e) { for (var i = 0; i < LABEL_RULES.length; i++) { if (LABEL_RULES[i].match(a, c, e)) return cableOf(LABEL_RULES[i].id); } return ''; }
  function setCable(id, val) { var c = Object.assign({}, cablesMap()); c[id] = val; Project.patch('schema', { cables: c }); }

  /* ── SVG symbol glyphs (centred at cx,cy) ───────────────────────────────── */
  function glyph(d, cx, cy) {
    var x = cx - SYMW / 2, y = cy - SYMH / 2, g = '';
    var stroke = '#333', txt = '#111';
    if (d.kind === 'string') {
      g += '<rect x="' + x + '" y="' + y + '" rx="6" width="' + SYMW + '" height="' + SYMH + '" fill="' + d.color + '22" stroke="' + d.color + '" stroke-width="1.5"/>';
      g += '<rect x="' + x + '" y="' + y + '" rx="6" width="6" height="' + SYMH + '" fill="' + d.color + '"/>';
      g += '<text x="' + (x + 14) + '" y="' + (cy - 1) + '" font-size="15" font-weight="600" fill="' + txt + '">' + esc(labelOf(d)) + '</text>';
      g += '<text x="' + (x + 14) + '" y="' + (cy + 12) + '" font-size="11.5" fill="#666">' + esc(d.sub) + '</text>';
      return g;
    }
    if (d.kind === 'earth') {
      g += '<line x1="' + cx + '" y1="' + (cy - 10) + '" x2="' + cx + '" y2="' + cy + '" stroke="' + stroke + '"/>';
      g += '<line x1="' + (cx - 11) + '" y1="' + cy + '" x2="' + (cx + 11) + '" y2="' + cy + '" stroke="' + stroke + '" stroke-width="1.6"/>';
      g += '<line x1="' + (cx - 7) + '" y1="' + (cy + 4) + '" x2="' + (cx + 7) + '" y2="' + (cy + 4) + '" stroke="' + stroke + '"/>';
      g += '<line x1="' + (cx - 3) + '" y1="' + (cy + 8) + '" x2="' + (cx + 3) + '" y2="' + (cy + 8) + '" stroke="' + stroke + '"/>';
      g += '<text x="' + (cx + 16) + '" y="' + (cy + 4) + '" font-size="12" fill="#666">' + esc(labelOf(d)) + '</text>';
      return g;
    }
    if (d.kind === 'grid') {
      /* mains supply (IEC 60617): the conductor crossed by oblique strokes - one per conductor, ALL
         EQUALLY SPACED: `phases` phase strokes, then the neutral (stroke + dot), then the protective
         conductor PE (stroke + a short cap bar = the "T"). 1- or 3-phase from project state. */
      var ph = (d.phases === 3) ? 3 : 1, ticks = ph + 2, sp = 5, span = (ticks - 1) * sp, hwG = SYMW / 2, mx0 = cx - span / 2;
      g += '<line x1="' + (cx - hwG) + '" y1="' + cy + '" x2="' + (mx0 + span + 9) + '" y2="' + cy + '" stroke="' + stroke + '" stroke-width="1.3"/>';
      for (var gi = 0; gi < ticks; gi++) {
        var tx = mx0 + gi * sp;
        g += '<line x1="' + (tx - 3.5) + '" y1="' + (cy + 5) + '" x2="' + (tx + 3.5) + '" y2="' + (cy - 5) + '" stroke="' + stroke + '"/>';   // oblique conductor stroke
        if (gi === ph) g += '<circle cx="' + (tx + 3.5) + '" cy="' + (cy - 5) + '" r="1.6" fill="' + stroke + '"/>';                       // neutral: dot at the top (same end as the PE cap)
        else if (gi === ph + 1) g += '<line x1="' + (tx + 1) + '" y1="' + (cy - 5) + '" x2="' + (tx + 6) + '" y2="' + (cy - 5) + '" stroke="' + stroke + '"/>';   // PE: cap bar (the "T")
      }
      g += '<text x="' + cx + '" y="' + (cy + SYMH / 2 + 12) + '" text-anchor="middle" font-size="13" font-weight="600" fill="' + txt + '">' + esc(labelOf(d)) + '</text>';
      return g;
    }
    var fill = '#fafafa';
    var sq = (d.kind === 'inv' || d.kind === 'meter' || d.kind === 'battery');   // square devices (side = SYMH), square corners
    var rx = sq ? 0 : 6;
    var bw = sq ? SYMH : SYMW;
    var bx = cx - bw / 2;
    g += '<rect x="' + bx + '" y="' + y + '" rx="' + rx + '" width="' + bw + '" height="' + SYMH + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.3"/>';
    if (d.kind === 'fuse') {
      g += '<rect x="' + (cx - 8) + '" y="' + (cy - 9) + '" width="16" height="18" fill="none" stroke="' + stroke + '"/>';
    } else if (d.kind === 'spd') {
      g += '<path d="M' + (cx - 5) + ' ' + (cy - 8) + ' L' + (cx + 5) + ' ' + cy + ' L' + (cx - 5) + ' ' + (cy + 8) + '" fill="none" stroke="' + stroke + '"/>';
      g += '<line x1="' + (cx + 5) + '" y1="' + (cy - 8) + '" x2="' + (cx + 5) + '" y2="' + (cy + 8) + '" stroke="' + stroke + '"/>';
    } else if (d.kind === 'disc') {
      g += '<circle cx="' + (cx - 13) + '" cy="' + cy + '" r="2.5" fill="' + stroke + '"/>';
      g += '<circle cx="' + (cx + 13) + '" cy="' + cy + '" r="2.5" fill="' + stroke + '"/>';
      g += '<line x1="' + (cx - 13) + '" y1="' + cy + '" x2="' + (cx + 11) + '" y2="' + (cy - 11) + '" stroke="' + stroke + '" stroke-width="1.3"/>';
    } else if (d.kind === 'inv') {
      /* IEC inverter (DC→AC): SQUARE box split by a corner-to-corner diagonal, DC (⎓) upper-left,
         AC (∼) lower-right. Connects at the square edges (left DC in / right AC out / bottom battery). */
      var ih = SYMH / 2;   // square half-side
      g += '<line x1="' + (cx - ih) + '" y1="' + (cy + ih) + '" x2="' + (cx + ih) + '" y2="' + (cy - ih) + '" stroke="' + stroke + '" stroke-width="1.1"/>';      // diagonal corner-to-corner
      g += '<line x1="' + (cx - 15) + '" y1="' + (cy - 6) + '" x2="' + (cx - 6) + '" y2="' + (cy - 6) + '" stroke="' + stroke + '"/>';                            // DC solid (upper-left)
      g += '<line x1="' + (cx - 15) + '" y1="' + (cy - 1) + '" x2="' + (cx - 6) + '" y2="' + (cy - 1) + '" stroke="' + stroke + '" stroke-dasharray="2.5 1.8"/>';  // DC dashed (upper-left)
      g += '<path d="M' + (cx + 4) + ' ' + (cy + 6) + ' q 2.5 -5 5 0 t 5 0" fill="none" stroke="' + stroke + '"/>';                                               // AC sine (lower-right)
    } else if (d.kind === 'rcd') {
      g += '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="none" stroke="' + stroke + '"/>';
    } else if (d.kind === 'meter') {
      /* energy meter: SQUARE box, a top sub-box (25% of the height) holding a bidirectional (import/export)
         DOUBLE arrow, and "Wh" filling the lower 75%. */
      var mh = SYMH / 2, divY = cy - mh + SYMH * 0.25;   // divider at 25% from the top
      g += '<line x1="' + (cx - mh) + '" y1="' + divY + '" x2="' + (cx + mh) + '" y2="' + divY + '" stroke="' + stroke + '"/>';
      var ay = cy - mh + 5;                              // centre of the top sub-box
      g += '<line x1="' + (cx - 9) + '" y1="' + ay + '" x2="' + (cx + 9) + '" y2="' + ay + '" stroke="' + stroke + '"/>';        // shaft
      g += '<path d="M' + (cx + 5) + ' ' + (ay - 3) + ' L' + (cx + 9) + ' ' + ay + ' L' + (cx + 5) + ' ' + (ay + 3) + '" fill="none" stroke="' + stroke + '"/>';  // right head
      g += '<path d="M' + (cx - 5) + ' ' + (ay - 3) + ' L' + (cx - 9) + ' ' + ay + ' L' + (cx - 5) + ' ' + (ay + 3) + '" fill="none" stroke="' + stroke + '"/>';  // left head
      g += '<text x="' + cx + '" y="' + (cy + 9) + '" text-anchor="middle" font-size="13" font-weight="700" fill="' + txt + '">Wh</text>';
    } else if (d.kind === 'battery') {
      var yy = cy - 7;   // two battery cells: long-thin (+) over short-thick (-)
      for (var bi = 0; bi < 2; bi++) {
        g += '<line x1="' + (cx - 8) + '" y1="' + yy + '" x2="' + (cx + 8) + '" y2="' + yy + '" stroke="' + stroke + '"/>';
        g += '<line x1="' + (cx - 4) + '" y1="' + (yy + 3.5) + '" x2="' + (cx + 4) + '" y2="' + (yy + 3.5) + '" stroke="' + stroke + '" stroke-width="2.2"/>';
        yy += 8;
      }
    }
    g += '<text x="' + cx + '" y="' + (y + SYMH + 12) + '" text-anchor="middle" font-size="13" font-weight="600" fill="' + txt + '">' + esc(labelOf(d)) + '</text>';
    if (d.sub) g += '<text x="' + cx + '" y="' + (y - 4) + '" text-anchor="middle" font-size="11" fill="#666">' + esc(d.sub) + '</text>';
    return g;
  }

  /* orthogonal route between two EXACT ports (already at the symbol edges). `chan` staggers the
     vertical leg sideways for COLUMN-SPANNING jogs, so two parallel feeds (e.g. S2→INV1 and S3→INV2,
     which otherwise share a mid-x point on the row between them and look electrically joined) run on
     their own lanes. Pure verticals (earth/battery, same column) and straight horizontals are unaffected. */
  function route(sx, sy, tx, ty, chan) {
    if (Math.abs(sy - ty) < 2) return [[sx, sy], [tx, ty]];
    var midX = (sx + tx) / 2;
    if (Math.abs(tx - sx) > 20) midX += (chan || 0);
    return [[sx, sy], [midX, sy], [midX, ty], [tx, ty]];
  }

  /* ── Ports & orientation (the directed entry/exit model) ─────────────────
     Direction (where the wire ENTERS d, i.e. toward the upstream device); the symbol is rotated
     so its ENTRY faces that way. The wire then runs upstream.out → this.in, port to port. */
  var OPP = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };
  function dirToward(from, d) {
    var dx = from._cx - d._cx, dy = from._cy - d._cy;
    if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'left' : 'right';
    return dy < 0 ? 'top' : 'bottom';
  }
  function portsOf(d, inDir) {
    var cx = d._cx, cy = d._cy;
    var iecName = d.kind === 'fuse' ? 'fuseDisconnector' : d.kind === 'spd' ? 'spd' : d.kind === 'disc' ? 'switchDisconnector' : d.kind === 'mcb' ? 'mcb' : d.kind === 'rcd' ? 'rccb' : null;
    if (iecName && typeof IEC !== 'undefined' && IEC.has(iecName)) {
      var r = IEC.render(iecName, cx, cy, { rot: IEC.ROT[inDir] || 0, h: SYMH, stroke: '#333' });
      var g;
      if (d.kind === 'spd') {   // SPD: label + sub to the RIGHT, dropped clear of the line above and the arrester box
        g = '<text x="' + (cx + 12) + '" y="' + (cy + 17) + '" font-size="13" font-weight="600" fill="#111">' + esc(labelOf(d)) + '</text>';
        if (d.sub) g += '<text x="' + (cx + 12) + '" y="' + (cy + 28) + '" font-size="11" fill="#666">' + esc(d.sub) + '</text>';
      } else {
        g = '<text x="' + cx + '" y="' + (cy + SYMH / 2 + 12) + '" text-anchor="middle" font-size="13" font-weight="600" fill="#111">' + esc(labelOf(d)) + '</text>';
        if (d.sub) g += '<text x="' + cx + '" y="' + (cy - SYMH / 2 - 4) + '" text-anchor="middle" font-size="11" fill="#666">' + esc(d.sub) + '</text>';
      }
      var pp = { in: r.in, out: r.out };
      if (r.earth) pp.earth = r.earth;   // SPD 3rd port -> per-SPD PE node
      return { svg: r.svg + g, in: r.in, out: r.out, ports: pp };
    }
    if (d.kind === 'earth') {            // earth node: wire attaches at the glyph's lead top
      var ep = { x: cx, y: cy - 10 };
      return { svg: glyph(d, cx, cy), in: ep, out: ep, ports: { in: ep, out: ep } };
    }
    var hw = (d.kind === 'inv' || d.kind === 'meter' || d.kind === 'battery') ? SYMH / 2 : SYMW / 2, hh = SYMH / 2;   // square devices -> ports at their own (narrower) edges
    var P = { left: { x: cx - hw, y: cy }, right: { x: cx + hw, y: cy }, top: { x: cx, y: cy - hh }, bottom: { x: cx, y: cy + hh } };
    var inP = P[inDir], outP = P[OPP[inDir]], ports = { in: inP, out: outP };
    if (d.kind === 'inv') ports.bat = { x: cx, y: cy + hh };   // 3rd port: bidirectional DC link to storage, at the bottom
    return { svg: glyph(d, cx, cy), in: inP, out: outP, ports: ports };
  }

  /* ── Cartouche frame, rulers, title block ───────────────────────────────── */
  var _plateNo = null;    // set by build({plateNo}) — stamps the plate id in the title cell
  function cartouche() {
    var meta = Project.section('meta') || {};
    var pj = meta.proiectant || {}, s = '';
    /* faint cell grid */
    for (var c = 1; c < COLS; c++) s += '<line x1="' + (gx0 + c * cellW) + '" y1="' + gy0 + '" x2="' + (gx0 + c * cellW) + '" y2="' + gy1 + '" stroke="#e5e5e5"/>';
    for (var r = 1; r < ROWS; r++) s += '<line x1="' + gx0 + '" y1="' + (gy0 + r * cellH) + '" x2="' + gx1 + '" y2="' + (gy0 + r * cellH) + '" stroke="#e5e5e5"/>';
    /* outer frame */
    s += '<rect x="' + M + '" y="' + M + '" width="' + (W - 2 * M) + '" height="' + (H - 2 * M) + '" fill="none" stroke="#333" stroke-width="1.4"/>';
    /* column ruler (0-9) top + bottom */
    for (var c2 = 0; c2 < COLS; c2++) {
      var nx = gx0 + c2 * cellW + cellW / 2;
      s += '<text x="' + nx + '" y="' + (M + 11) + '" text-anchor="middle" font-size="12" fill="#888">' + c2 + '</text>';
      s += '<text x="' + nx + '" y="' + (gy1 + 11) + '" text-anchor="middle" font-size="12" fill="#888">' + c2 + '</text>';
    }
    /* row ruler (A-H) left + right */
    for (var r2v = 0; r2v < ROWS; r2v++) {
      var ny = gy0 + r2v * cellH + cellH / 2 + 3;
      s += '<text x="' + (M + 9) + '" y="' + ny + '" text-anchor="middle" font-size="12" fill="#888">' + rowLetter(r2v) + '</text>';
      s += '<text x="' + (W - M - 9) + '" y="' + ny + '" text-anchor="middle" font-size="12" fill="#888">' + rowLetter(r2v) + '</text>';
    }
    /* title block (bottom strip) */
    var ty0 = gy1, tx0 = M, tx1 = W - M;
    function field(x, w, lbl, val) {
      var o = '<rect x="' + x + '" y="' + ty0 + '" width="' + w + '" height="' + TITLE_H + '" fill="none" stroke="#333"/>';
      o += '<text x="' + (x + 6) + '" y="' + (ty0 + 14) + '" font-size="10.5" fill="#888">' + esc(lbl) + '</text>';
      o += '<text x="' + (x + 6) + '" y="' + (ty0 + 32) + '" font-size="14" font-weight="600" fill="#111">' + esc(val || '[de completat]') + '</text>';
      return o;
    }
    s += '<line x1="' + tx0 + '" y1="' + ty0 + '" x2="' + tx1 + '" y2="' + ty0 + '" stroke="#333" stroke-width="1.4"/>';
    var fw = (tx1 - tx0);
    s += field(tx0,            fw * 0.26, 'Proiect', (meta.projectName || '') + (meta.address ? ' · ' + meta.address : ''));
    s += field(tx0 + fw * 0.26, fw * 0.20, 'Beneficiar', meta.name);
    s += field(tx0 + fw * 0.46, fw * 0.22, 'Proiectant / atestat ANRE', (pj.nume || pj.firma || '') + (pj.atestatProiectant ? ' · ' + pj.atestatProiectant : ''));
    s += field(tx0 + fw * 0.68, fw * 0.14, 'Faza', meta.faza || 'PTh+DDE');
    /* title cell */
    var tcx = tx0 + fw * 0.82, tcw = fw * 0.18;
    s += '<rect x="' + tcx + '" y="' + ty0 + '" width="' + tcw + '" height="' + TITLE_H + '" fill="none" stroke="#333"/>';
    s += '<text x="' + (tcx + tcw / 2) + '" y="' + (ty0 + 46) + '" text-anchor="middle" font-size="15" font-weight="700" fill="#111">SCHEMĂ</text>';
    s += '<text x="' + (tcx + tcw / 2) + '" y="' + (ty0 + 64) + '" text-anchor="middle" font-size="15" font-weight="700" fill="#111">MONOFILARĂ</text>';
    /* Bottom line of the title cell: standalone (editor / export) the drawing is its own
       one-page document -> "pag. 1/1". Inside the Proiect Tehnic it is a NUMBERED PLATE of a
       multi-page document, so the caller passes plateNo and we stamp the plate id instead. */
    s += '<text x="' + (tcx + tcw / 2) + '" y="' + (ty0 + 92) + '" text-anchor="middle" font-size="12" fill="#666">' +
         esc(meta.codDoc || '') + '  ·  ' + (_plateNo ? 'Planșa ' + esc(_plateNo) : 'pag. 1/1') + '</text>';
    return s;
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  function build(opts) {
    opts = opts || {};
    var showIds = opts.nodeIds !== false;   // editor scaffolding ids; the PT plate passes nodeIds:false
    _plateNo = opts.plateNo || null;        // PT passes the borderou plate id (e.g. 'IE002')
    var learnOn = (opts.learn != null) ? opts.learn : ((typeof Explain !== 'undefined') && Explain.isOn());
    var b = buildDevices();
    if (!b.hasStrings) return { svg: '', hasStrings: false, model: b, report: b.report };
    var byId = {}; b.devs.forEach(function (d) { d._cell = cellOf(d); d._cx = cellCX(d._cell.col); d._cy = cellCY(d._cell.row); byId[d.node] = d; });

    /* connectivity: first upstream (where this is the target) / downstream (where this is the source) */
    var eds = effectiveEdges(b);   // custom connections override the auto defaults
    var up = {}, dn = {};
    eds.forEach(function (e) { if (up[e.to] == null) up[e.to] = e.from; if (dn[e.from] == null) dn[e.from] = e.to; });

    /* derive each device's ENTRY-facing direction from the wire that reaches it, then build its
       ports (the symbol is rotated so its entry faces the incoming line - node N.out → N+1.in). */
    b.devs.forEach(function (d) {
      var inDir;
      if (up[d.node] != null && byId[up[d.node]]) inDir = dirToward(byId[up[d.node]], d);        // entry toward upstream
      else if (dn[d.node] != null && byId[dn[d.node]]) inDir = OPP[dirToward(byId[dn[d.node]], d)]; // a source: entry opposite its exit
      else inDir = 'left';
      d._dir = inDir;
      d._p = portsOf(d, inDir);
    });

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,sans-serif">';
    s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#fff"/>';
    s += cartouche();
    /* wires first (under symbols) — exit of source to entry of target; each labelled with its CABLE TYPE
       (only under "mod explicativ"; no W# designators - just the cable). */
    eds.forEach(function (e) {
      var a = byId[e.from], c = byId[e.to]; if (!a || !c) return;
      var sp = (a._p.ports && a._p.ports[e.fromPort || 'out']) || a._p.out;
      var tp = (c._p.ports && c._p.ports[e.toPort || 'in']) || c._p.in;
      var pts = route(sp.x, sp.y, tp.x, tp.y, ((a._cell && a._cell.row) || 0) * 4);   // per-source-row lane so parallel feeds don't merge
      var dd = 'M' + pts[0][0] + ' ' + pts[0][1];
      for (var i = 1; i < pts.length; i++) dd += ' L' + pts[i][0] + ' ' + pts[i][1];
      s += '<path d="' + dd + '" fill="none" stroke="#444" stroke-width="1.3"/>';
      if (c.kind === 'earth' || !learnOn) return;   // PE conductors aren't in the cable schedule; labels only under mod explicativ
      var cab = cableForEdge(a, c, e);
      if (!cab) return;
      s += '<text x="' + (pts[0][0] + 6) + '" y="' + (pts[0][1] - 4) + '" font-size="10" fill="#1565c0">' + esc(cab) + '</text>';
    });
    b.devs.forEach(function (d) {
      s += d._p.svg;
      if (showIds) s += '<text x="' + (d._cx - SYMW / 2 + 1) + '" y="' + (d._cy - SYMH / 2 - 6) + '" font-size="10" fill="#9aa">n' + d.node + '</text>';
    });
    s += '</svg>';
    return { svg: s, hasStrings: true, model: b, report: b.report };
  }

  return {
    build: build,
    COLS: COLS, ROWS: ROWS, rowLetter: rowLetter, LABEL_RULES: LABEL_RULES,
    cellOf: cellOf, setCell: setCell, persist: persist,
    labelOf: labelOf, setLabel: setLabel,
    effectiveEdges: effectiveEdges, setEdges: setEdges,
    cableOf: cableOf, setCable: setCable
  };
})();
