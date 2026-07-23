/* mounting-svg.js — SHARED to-scale mounting drawings (window.MountingSVG).
   ---------------------------------------------------------------------------
   Extracted from the mounting step (app/src/pages/Mounting.jsx) so the EDITOR and
   the Proiect Tehnic render ONE drawing — the same single-source-of-truth pattern
   as js/schema-svg.js (schema editor + PT plate).

   Two views, both drawn TO SCALE:
     · side  — "Secțiune laterală": sideSingle (tilted rows on flat ground, with the
               winter-solstice shading geometry X/Y/pitch), sideAccordion (E-W tents)
               or sideFlush (coplanar on a pitched roof), picked by mounting.mode.
     · plan  — "Vedere de sus": the rows × per-row module grid.

   build() needs NO DOM: the mounting step persists every derived value it uses
   (tilt/mode/orient/rise/gap/pitch/sunAlt/rows/perRow) into Project.section('mounting'),
   so the drawings can be rebuilt from state alone. Module dimensions come from the
   string's module (MODULE_LIST) with the components.moduleLength/Width fallback.

   Colours come from the .svg-* classes in Mounting.css (theme CSS vars). Those vars
   are DARK-theme-relative, so a consumer painting on white paper (the PT plate) must
   override them — see the .pt-plansa .svg-* block in app/src/pages/Pt.css.

   Load order: needs D2R (solar-geometry.js), MODULE_LIST (string-ui.js) and Project
   (project-state.js); optional t() for labels. */
window.MountingSVG = (function () {
  'use strict';

  var _tr = null;
  function tr(k) {
    if (_tr) return _tr(k);
    return (typeof t === 'function') ? t(k) : k;
  }
  function num(v, d) { return (+v).toFixed(d == null ? 2 : d); }
  function modById(id) {
    if (typeof MODULE_LIST === 'undefined') return null;
    return MODULE_LIST.filter(function (m) { return m.id === id; })[0] || null;
  }

  /* ── SVG helpers (verbatim from the mounting step) ── */
  function line(x1, y1, x2, y2, cls, extra) { return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" ' + (extra || '') + ' class="' + cls + '"/>'; }
  function txt(x, y, s, cls, anchor) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="11" text-anchor="' + (anchor || 'middle') + '" class="' + cls + '">' + s + '</text>'; }
  function arc(cx, cy, r, a0, a1, cls) { // angles in deg measured CCW from +x, SVG y-down
    var x0 = cx + r * Math.cos(-a0 * D2R), y0 = cy + r * Math.sin(-a0 * D2R);
    var x1 = cx + r * Math.cos(-a1 * D2R), y1 = cy + r * Math.sin(-a1 * D2R);
    var large = Math.abs(a1 - a0) > 180 ? 1 : 0, sweep = a1 > a0 ? 0 : 1;
    return '<path d="M' + x0.toFixed(1) + ',' + y0.toFixed(1) + ' A' + r + ',' + r + ' 0 ' + large + ' ' + sweep + ' ' + x1.toFixed(1) + ',' + y1.toFixed(1) + '" fill="none" stroke-width="1.2" class="' + cls + '" style="stroke:currentColor"/>';
  }

  /* ── Side elevation (single direction), to scale ── */
  function sideSingle(L, tilt, X, foot, Y, pitch, alt) {
    var W = 560, H = 322, m = 46, mb = 68, groundY = H - mb, x0 = m;   // mb = taller bottom band for the Y + pitch dimension labels
    var realW = pitch + foot, realH = X;
    var scale = Math.min((W - 2 * m) / (realW || 1), (H - m - mb) / (realH || 1));
    var p1f = [x0, groundY], p1b = [x0 + foot * scale, groundY - X * scale];
    var p2f = [x0 + pitch * scale, groundY], p2b = [p2f[0] + foot * scale, groundY - X * scale];
    var footEnd = [p1b[0], groundY], shadowTip = p2f;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '">';
    s += '<g stroke-width="1">';
    // shadow band under sun ray (row1 top edge to next row foot)
    s += '<polygon points="' + p1b[0].toFixed(1) + ',' + p1b[1].toFixed(1) + ' ' + footEnd[0].toFixed(1) + ',' + footEnd[1].toFixed(1) + ' ' + shadowTip[0].toFixed(1) + ',' + shadowTip[1].toFixed(1) + '" class="svg-shadow" stroke-width="1"/>';
    // ground
    s += line(x0 - 6, groundY, W - m + 6, groundY, 'svg-ground', 'stroke-width="1.3"');
    // modules
    s += line(p1f[0], p1f[1], p1b[0], p1b[1], 'svg-mod', 'stroke-width="5" stroke-linecap="round"');
    s += line(p2f[0], p2f[1], p2b[0], p2b[1], 'svg-mod', 'stroke-width="5" stroke-linecap="round"');
    // rise X (dashed)
    s += line(p1b[0], p1b[1], footEnd[0], footEnd[1], 'svg-dim', 'stroke-dasharray="3 3"');
    s += txt(p1b[0] + 8, (p1b[1] + footEnd[1]) / 2, 'X=' + num(X) + ' m', 'svg-dimtxt', 'start');
    // sun ray from shadowTip up-left through p1b, extended
    var dx = (p1b[0] - shadowTip[0]), dy = (p1b[1] - shadowTip[1]), len = Math.hypot(dx, dy);
    var ext = 64 / (len || 1);
    var sunPt = [p1b[0] + dx * ext, p1b[1] + dy * ext];
    s += line(shadowTip[0], shadowTip[1], sunPt[0], sunPt[1], 'svg-sun', 'stroke-dasharray="5 3" stroke-width="1.4"');
    s += '<circle cx="' + sunPt[0].toFixed(1) + '" cy="' + sunPt[1].toFixed(1) + '" r="9" fill="#f0a020"/>';
    // tilt angle arc at p1f
    s += '<g class="svg-ang" style="color:var(--clr-primary)">' + arc(p1f[0], p1f[1], 26, 0, tilt, 'svg-ang') + '</g>';
    s += txt(p1f[0] + 34, p1f[1] - 6, 'β = ' + tilt + '°', 'svg-ang', 'start');
    // altitude angle arc at shadowTip
    s += '<g class="svg-angsun" style="color:#f0a020">' + arc(shadowTip[0], shadowTip[1], 30, 180 - alt, 180, 'svg-angsun') + '</g>';
    s += txt(shadowTip[0] - 40, shadowTip[1] - 8, 'α = ' + num(alt, 1) + '°', 'svg-angsun', 'end');
    // Y dimension (gap) along ground
    var dimY = groundY + 16;
    s += line(footEnd[0], dimY, shadowTip[0], dimY, 'svg-dim', 'stroke-width="1" marker-start="" ');
    s += line(footEnd[0], dimY - 3, footEnd[0], dimY + 3, 'svg-dim', '');
    s += line(shadowTip[0], dimY - 3, shadowTip[0], dimY + 3, 'svg-dim', '');
    s += txt((footEnd[0] + shadowTip[0]) / 2, dimY + 13, 'Y=' + num(Y) + ' m', 'svg-dimtxt');
    // pitch dimension
    var dimP = groundY + 34;
    s += line(p1f[0], dimP, p2f[0], dimP, 'svg-dim', '');
    s += line(p1f[0], dimP - 3, p1f[0], dimP + 3, 'svg-dim', '');
    s += line(p2f[0], dimP - 3, p2f[0], dimP + 3, 'svg-dim', '');
    s += txt((p1f[0] + p2f[0]) / 2, dimP + 13, tr('mnt.pitch') + ' ' + num(pitch) + ' m', 'svg-dimtxt');
    // module length label along module 1
    s += txt((p1f[0] + p1b[0]) / 2 - 6, (p1f[1] + p1b[1]) / 2 - 8, 'L=' + num(L) + ' m', 'svg-dimtxt');
    s += '</g></svg>';
    return s;
  }

  /* ── Side elevation (accordion E-W tent), to scale ── */
  function sideAccordion(L, tilt, X, foot) {
    var W = 560, H = 300, m = 50, groundY = H - m, x0 = m;
    var pairW = 2 * foot, pairs = 3;
    var scale = Math.min((W - 2 * m) / (pairs * pairW || 1), (H - 2 * m) / (X || 1));
    var WEST = 'var(--clr-primary)', EAST = '#2bb3a3';
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '">';
    s += line(x0 - 6, groundY, W - m + 6, groundY, 'svg-ground', 'stroke-width="1.3"');
    for (var i = 0; i < pairs; i++) {
      var bx = x0 + i * pairW * scale;
      var ridge = [bx + foot * scale, groundY - X * scale];
      // left slope "/" faces West, right slope "\" faces East
      s += line(bx, groundY, ridge[0], ridge[1], '', 'stroke-width="5" stroke-linecap="round" stroke="' + WEST + '"');
      s += line(ridge[0], ridge[1], bx + 2 * foot * scale, groundY, '', 'stroke-width="5" stroke-linecap="round" stroke="' + EAST + '"');
      if (i === 0) {
        s += '<text x="' + (bx + foot * scale * 0.4) + '" y="' + (groundY - X * scale * 0.5 + 2) + '" font-size="11" text-anchor="end" fill="' + WEST + '" font-weight="600">V</text>';
        s += '<text x="' + (ridge[0] + foot * scale * 0.6) + '" y="' + (groundY - X * scale * 0.5 + 2) + '" font-size="11" text-anchor="start" fill="' + EAST + '" font-weight="600">E</text>';
      }
    }
    s += '<circle cx="' + (x0 + 26) + '" cy="' + (m - 4) + '" r="9" fill="#f0a020"/>';
    // wiring legend
    s += '<rect x="' + (x0) + '" y="' + (m + 6) + '" width="11" height="5" fill="' + EAST + '"/>' + txt(x0 + 16, m + 11, 'E → MPPT 1', 'svg-dimtxt', 'start');
    s += '<rect x="' + (x0 + 96) + '" y="' + (m + 6) + '" width="11" height="5" fill="' + WEST + '"/>' + txt(x0 + 112, m + 11, 'V → MPPT 2', 'svg-dimtxt', 'start');
    s += txt(W - m, m + 11, 'X=' + num(X) + ' m · ' + tr('mnt.pitch') + ' ' + num(foot) + ' m', 'svg-dimtxt', 'end');
    s += '</svg>';
    return s;
  }

  /* ── Side elevation (pitched roof, coplanar / flush), to scale ── */
  function sideFlush(L, tilt, rows) {
    var W = 560, H = 300, m = 50, groundY = H - m, x0 = m;
    var n = Math.max(1, Math.min(rows || 4, 8));        // show up to 8 modules along the slope
    var run = n * L * Math.cos(tilt * D2R);             // horizontal extent of the slope
    var riseTot = n * L * Math.sin(tilt * D2R);         // vertical extent
    var scale = Math.min((W - 2 * m) / (run || 1), (H - 2 * m) / (riseTot || 1));
    var bx = x0, by = groundY, ex = x0 + run * scale, ey = groundY - riseTot * scale;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '">';
    // ground/eave + the roof rafter (dashed) + a wall down from the ridge
    s += line(x0 - 6, groundY, ex + 24, groundY, 'svg-ground', 'stroke-width="1.3"');
    s += line(bx, by, ex, ey, 'svg-ground', 'stroke-width="1" stroke-dasharray="2 2"');
    s += line(ex, ey, ex, groundY, 'svg-ground', 'stroke-width="1" stroke-dasharray="2 2"');
    // modules laid flush along the slope, touching (butt caps), alternating shade
    for (var i = 0; i < n; i++) {
      var t0 = i / n, t1 = (i + 1) / n;
      s += line(bx + (ex - bx) * t0, by + (ey - by) * t0, bx + (ex - bx) * t1, by + (ey - by) * t1,
        'svg-mod', 'stroke-width="7" stroke-linecap="butt"' + (i % 2 ? ' opacity="0.78"' : ''));
    }
    // tilt arc + labels
    s += '<g class="svg-ang" style="color:var(--clr-primary)">' + arc(bx, by, 28, 0, tilt, 'svg-ang') + '</g>';
    s += txt(bx + 36, by - 6, 'β = ' + tilt + '°', 'svg-ang', 'start');
    s += txt(bx + (ex - bx) / n / 2 + 6, by + (ey - by) / n / 2 - 9, 'L=' + num(L) + ' m', 'svg-dimtxt', 'start');
    s += txt(W - m, m, tr('mnt.flushtag'), 'svg-dimtxt', 'end');
    s += '</svg>';
    return s;
  }

  /* ── Top view, to scale ── */
  function planSVG(rows, perRow, pitch, perp, mode, foot) {
    var W = 560, H = 220, m = 26;
    var stepDeep = (mode === 'ew' || mode === 'flush') ? foot : pitch;
    var totalDeep = rows * stepDeep, totalWide = perRow * perp;
    if (!rows || !perRow) return '<svg viewBox="0 0 ' + W + ' ' + H + '"><text x="' + (W / 2) + '" y="' + (H / 2) + '" text-anchor="middle" font-size="12" class="svg-dimtxt">-</text></svg>';
    var scale = Math.min((W - 2 * m) / (totalWide || 1), (H - 2 * m) / (totalDeep || 1));
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '">';
    var modDeep = (mode === 'flush') ? foot : foot * 0.92;  // coplanar rows touch (no gap); flat-mount rows leave a hint of gap
    for (var r = 0; r < rows; r++) {
      var y = m + r * stepDeep * scale;
      for (var c = 0; c < perRow; c++) {
        var x = m + c * perp * scale;
        s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (perp * scale - 1.5).toFixed(1) + '" height="' + (modDeep * scale).toFixed(1) + '" rx="1.5" fill="var(--clr-primary)" opacity="0.85"/>';
      }
    }
    s += txt(W / 2, H - 6, num(totalWide) + ' × ' + num(totalDeep) + ' m', 'svg-dimtxt');
    s += '</svg>';
    return s;
  }

  /* ── Rebuild both views from Project state alone (no DOM) ──
     opts.tr — label translator (the PT passes its DOCUMENT language, which may
     differ from the UI language). Returns {hasData, hasPlan, side, plan, …geometry}. */
  function build(opts) {
    opts = opts || {};
    var prevTr = _tr;
    if (opts.tr) _tr = opts.tr;
    try {
      var st = (typeof Project !== 'undefined' && Project.get) ? Project.get() : {};
      var mt = st.mounting || {};
      var strings = Array.isArray(st.strings) ? st.strings : [];
      var comp = st.components || {};

      /* module dims — prefer the string the mounting step was configured against */
      var s0 = null;
      if (mt.stringId != null) s0 = strings.filter(function (s) { return s.id === mt.stringId; })[0];
      if (!s0) s0 = strings[0];
      var mod = (s0 && s0.moduleId) ? modById(s0.moduleId) : null;
      var maxDim, minDim;
      if (mod && mod.length && mod.width) {
        maxDim = Math.max(mod.length, mod.width) / 1000;
        minDim = Math.min(mod.length, mod.width) / 1000;
      } else if (comp.moduleLength && comp.moduleWidth) {
        maxDim = Math.max(comp.moduleLength, comp.moduleWidth) / 1000;
        minDim = Math.min(comp.moduleLength, comp.moduleWidth) / 1000;
      } else {
        return { hasData: false, hasPlan: false, side: '', plan: '' };
      }
      if (mt.tilt == null) return { hasData: false, hasPlan: false, side: '', plan: '' };

      var portrait = (mt.orient || 'portrait') === 'portrait';
      var L = portrait ? maxDim : minDim;      // slope length
      var perp = portrait ? minDim : maxDim;   // width across the row
      var tilt = mt.tilt;
      var mode = mt.mode || 'single';
      var foot = L * Math.cos(tilt * D2R);
      var X = mt.rise != null ? mt.rise : L * Math.sin(tilt * D2R);
      var Y = mt.gap != null ? mt.gap : 0;
      var pitch = mt.pitch != null ? mt.pitch
                : (mode === 'flush' ? L : (mode === 'ew' ? foot : foot + Y));
      var alt = mt.sunAlt != null ? mt.sunAlt : 20;
      var rows = mt.rows || 0, perRow = mt.perRow || 0;

      var side = (mode === 'flush') ? sideFlush(L, tilt, rows || 4)
               : (mode === 'ew' ? sideAccordion(L, tilt, X, foot)
                                : sideSingle(L, tilt, X, foot, Y, pitch, alt));

      /* OCCUPIED FOOTPRINT — the extent the array actually takes up, INCLUDING the
         inter-row shading gaps (single-direction steps by `pitch`; E-W and coplanar rows
         touch, so they step by the footprint). Identical to the dimension the top view
         prints, so the PT's "suprafață ocupată" can never disagree with the plate. */
      var stepDeep = (mode === 'ew' || mode === 'flush') ? foot : pitch;
      var wide = perRow * perp, deep = rows * stepDeep;
      return {
        hasData: true, hasPlan: !!(rows && perRow),
        side: side, plan: planSVG(rows, perRow, pitch, perp, mode, foot),
        mode: mode, L: L, perp: perp, tilt: tilt, pitch: pitch, foot: foot,
        rows: rows, perRow: perRow, total: rows * perRow,
        wide: wide || null, deep: deep || null, area: (wide && deep) ? wide * deep : null,
      };
    } finally { _tr = prevTr; }
  }

  return {
    build: build,
    /* raw builders — the mounting editor delegates to these (one source of truth) */
    sideSingle: sideSingle, sideAccordion: sideAccordion, sideFlush: sideFlush, planSVG: planSVG,
    line: line, text: txt, arc: arc,
  };
})();
