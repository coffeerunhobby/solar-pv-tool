/* panel-svg.js — SHARED switchboard PANEL drawings (window.PanelSVG).
   ---------------------------------------------------------------------------
   A to-scale-ish device layout of the DC combiner board TE-CC (and later the AC
   board TE-CEF), drawn on the SAME cartouche zone-grid as the single-line
   schematic (js/schema-svg.js) so the plates share one visual system. Same
   single-source-of-truth pattern as schema-svg.js / mounting-svg.js: the drawing
   is DATA-BOUND — one row per PV string, each with a 2-pole switch-disconnector
   (Q, diagonal SB216PV pins 1/3 top, 4/2 bottom), a per-pole gPV fuse pair (F),
   and a 3-terminal Type-2 surge arrester (SPD, shunt: + / − in, PE out to earth).

   build reads Project:
     · Project.section('strings')      → row count + S# labels
     · Project.section('protections').dc → per-string { fuse, ucDc, np } (persisted
       by the Protecții step); falls back to a default fuse when absent.
   The title block binds to Project.meta (beneficiar / proiectant / faza), exactly
   like the schematic's cartouche. opts.plateNo stamps the borderou id in the title
   cell (the PT passes 'IE004'); standalone omits it.

   PanelSVG.buildDC(opts) -> { svg, hasData, nStrings }
   Depends on: Project (project-state.js). No other engine deps. */
window.PanelSVG = (function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]; }); }

  /* ── cartouche geometry (identical to schema-svg.js) ── */
  var W = 1480, H = 940, M = 30, TITLE_H = 120, COLS = 10, ROWS = 8;
  var gx0 = M, gx1 = W - M, gy0 = M + 14, gy1 = H - M - TITLE_H;
  var cellW = (gx1 - gx0) / COLS, cellH = (gy1 - gy0) / ROWS;
  /* device geometry */
  var MW = 56, MH = 112, GAP = 38, PIN = 16, PADW = 22, PADH = 11;

  function rowLetter(r) { return String.fromCharCode(65 + r); }
  function T(x, y, t, c) { return '<text class="' + c + '" x="' + x + '" y="' + y + '">' + t + '</text>'; }
  function P(pts, c) { return '<path class="' + c + '" d="M' + pts.map(function (p) { return p.join(','); }).join(' L') + '"/>'; }
  function dot(x, y, f) { return '<circle cx="' + x + '" cy="' + y + '" r="4.2" fill="' + f + '"/>'; }
  function pad(x, y) { return '<rect class="tm" x="' + (x - PADW / 2) + '" y="' + (y - PADH / 2) + '" width="' + PADW + '" height="' + PADH + '" rx="1.5"/>'; }
  function earth(x, y) { return '<path class="wPE" d="M' + x + ',' + y + ' v12"/><path class="wPE" d="M' + (x - 14) + ',' + (y + 12) + ' h28 M' + (x - 9) + ',' + (y + 18) + ' h18 M' + (x - 4) + ',' + (y + 24) + ' h8"/>'; }

  /* ── cartouche frame, rulers, faint grid, title block ── */
  function cartouche(plateNo) {
    var meta = (typeof Project !== 'undefined' && Project.section) ? (Project.section('meta') || {}) : {};
    var pj = meta.proiectant || {}, ben = meta.beneficiar || {};
    var s = '';
    for (var c = 1; c < COLS; c++) s += '<path class="grid" d="M' + (gx0 + c * cellW) + ',' + gy0 + ' V' + gy1 + '"/>';
    for (var r = 1; r < ROWS; r++) s += '<path class="grid" d="M' + gx0 + ',' + (gy0 + r * cellH) + ' H' + gx1 + '"/>';
    s += '<rect class="frame" x="' + M + '" y="' + M + '" width="' + (W - 2 * M) + '" height="' + (H - 2 * M) + '"/>';
    for (var c2 = 0; c2 < COLS; c2++) { var nx = gx0 + c2 * cellW + cellW / 2; s += T(nx, M + 12, c2, 'ruler') + T(nx, gy1 - 6, c2, 'ruler'); }
    for (var r2 = 0; r2 < ROWS; r2++) { var ny = gy0 + r2 * cellH + cellH / 2 + 4; s += T(M + 10, ny, rowLetter(r2), 'ruler') + T(W - M - 10, ny, rowLetter(r2), 'ruler'); }
    s += '<path class="frame2" d="M' + M + ',' + gy1 + ' H' + (W - M) + '"/>';
    var fw = W - 2 * M;
    function field(x, w, lbl, val) {
      return '<rect class="tcell" x="' + x + '" y="' + gy1 + '" width="' + w + '" height="' + TITLE_H + '"/>'
        + '<text class="tlbl" x="' + (x + 7) + '" y="' + (gy1 + 18) + '">' + esc(lbl) + '</text>'
        + '<text class="tval" x="' + (x + 7) + '" y="' + (gy1 + 40) + '">' + esc(val || '[de completat]') + '</text>';
    }
    s += field(M, fw * 0.26, 'Proiect', (meta.projectName || 'Instalație de producere a energiei electrice - CEF'));
    s += field(M + fw * 0.26, fw * 0.20, 'Beneficiar', ben.firma || meta.name);
    s += field(M + fw * 0.46, fw * 0.22, 'Proiectant / atestat ANRE', (pj.nume || pj.firma || '') + (pj.atestatProiectant ? ' · ' + pj.atestatProiectant : ''));
    s += field(M + fw * 0.68, fw * 0.14, 'Faza', meta.faza || 'PTh+DDE');
    var tcx = M + fw * 0.82, tcw = fw * 0.18;
    s += '<rect class="tcell" x="' + tcx + '" y="' + gy1 + '" width="' + tcw + '" height="' + TITLE_H + '"/>';
    s += T(tcx + tcw / 2, gy1 + 44, 'TABLOU ELECTRIC', 'ttitle');
    s += T(tcx + tcw / 2, gy1 + 66, 'CURENT CONTINUU', 'ttitle');
    s += T(tcx + tcw / 2, gy1 + 94, plateNo ? 'Planșa ' + esc(plateNo) : 'TE-CC', 'tplate');
    return s;
  }

  /* one string row */
  function stringRow(i, st, y0) {
    var s = '';
    var y2 = y0 + MH, L1 = y2 + 22, L2 = y2 + 40, lnP = y0 - 24, lnN = y0 - 46, yT = y0 + 9, yB = y0 + MH - 9;
    s += T(gx0 + 16, y0 - 70, esc(st.label) + ' — șir ' + (i + 1), 'rowl');
    var xIn = gx0 + 40, xQ = gx0 + 120, xF1 = xQ + 2 * MW + GAP, xF2 = xF1 + MW + 10, xSp = xF2 + MW + GAP, xOut = xSp + 2 * MW + GAP + 20;
    var inP = xIn + 11, inN = xIn + 39;
    function tb(x, y) { return '<rect class="tb" x="' + x + '" y="' + y + '" width="22" height="26" rx="1.5"/>'; }
    s += tb(xIn, y0 + 26) + tb(xIn + 28, y0 + 26);
    s += T(inP, y0 + 18, '+', 'tl') + T(inN, y0 + 18, '−', 'tl') + T(xIn + 25, y0 + 70, 'intrare șir', 'tl');

    /* Q — SB216PV: pins 1,3 below top pads · 4,2 above bottom pads (poles diagonal) */
    var wq = 2 * MW - 8, cq = xQ + wq / 2, ql = cq - PIN, qr = cq + PIN;
    s += '<rect class="mod" x="' + xQ + '" y="' + y0 + '" width="' + wq + '" height="' + MH + '" rx="3" fill="#eef0f2"/>';
    s += pad(ql, yT) + pad(qr, yT) + pad(ql, yB) + pad(qr, yB);
    s += T(ql, y0 + 28, '1', 'pin') + T(qr, y0 + 28, '3', 'pin') + T(ql, y0 + MH - 20, '4', 'pin') + T(qr, y0 + MH - 20, '2', 'pin');
    s += T(cq, y0 + MH / 2 + 6, 'Q' + (i + 1), 'des') + T(cq, y0 + MH + 17, '2P · ' + (st.un || 1100) + 'V c.c.', 'sub');

    function dev1(x, des, sub, fill) {
      var w = MW - 8, c = x + w / 2;
      var d = '<rect class="mod" x="' + x + '" y="' + y0 + '" width="' + w + '" height="' + MH + '" rx="3" fill="' + fill + '"/>';
      d += pad(c, yT) + pad(c, yB) + T(c, y0 + MH / 2 + 6, des, 'des') + T(c, y0 + MH + 17, sub, 'sub');
      return { svg: d, c: c };
    }
    var fuseSub = st.fuse != null ? st.fuse + 'A' : 'gPV';
    var F1 = dev1(xF1, 'F' + (i * 2 + 1), fuseSub, '#f7dcda'); s += F1.svg;
    var F2 = dev1(xF2, 'F' + (i * 2 + 2), fuseSub, '#e6e7e9'); s += F2.svg;
    var w3 = 2 * MW - 8, c3 = xSp + w3 / 2;
    s += '<rect class="mod" x="' + xSp + '" y="' + y0 + '" width="' + w3 + '" height="' + MH + '" rx="3" fill="#fdeecd"/>';
    s += pad(c3 - PIN, yT) + pad(c3 + PIN, yT) + pad(c3, yB);
    s += T(c3 - PIN, y0 + 28, '+', 'pin') + T(c3 + PIN, y0 + 28, '−', 'pin') + T(c3, y0 + MH - 20, 'PE', 'pin');
    s += T(c3, y0 + MH / 2 + 6, 'SPD' + (i + 1), 'des') + T(c3, y0 + MH + 17, 'T2 · ' + (st.ucDc || 1000) + 'V', 'sub');
    s += tb(xOut, y0 + 26) + tb(xOut + 28, y0 + 26);
    s += T(xOut + 11, y0 + 18, '+', 'tl') + T(xOut + 39, y0 + 18, '−', 'tl') + T(xOut + 25, y0 + 70, '→ invertor', 'tl');

    var g1 = xQ + 2 * MW - 8 + GAP / 2, g2 = xF2 + MW - 8 + GAP / 2;
    s += P([[inP, y0 + 26], [inP, lnP], [ql, lnP], [ql, yT]], 'wP');   // + -> pin1
    s += P([[inN, y0 + 26], [inN, lnN], [qr, lnN], [qr, yT]], 'wN');   // − -> pin3
    s += P([[qr, yB], [qr, L1], [g1 - 6, L1], [g1 - 6, lnP], [F1.c, lnP], [F1.c, yT]], 'wP');   // pin2 (red) -> F1
    s += P([[ql, yB], [ql, L2], [g1 + 6, L2], [g1 + 6, lnN], [F2.c, lnN], [F2.c, yT]], 'wN');   // pin4 (black) -> F2
    s += P([[F1.c, yB], [F1.c, L1], [g2 - 6, L1], [g2 - 6, lnP], [xOut + 11, lnP], [xOut + 11, y0 + 26]], 'wP');
    s += P([[F2.c, yB], [F2.c, L2], [g2 + 6, L2], [g2 + 6, lnN], [xOut + 39, lnN], [xOut + 39, y0 + 26]], 'wN');
    s += P([[c3 - PIN, lnP], [c3 - PIN, yT]], 'wP') + dot(c3 - PIN, lnP, '#d32f2f');
    s += P([[c3 + PIN, lnN], [c3 + PIN, yT]], 'wN') + dot(c3 + PIN, lnN, '#17181a');
    s += P([[c3, yB], [c3, y2 + 30]], 'wPE') + earth(c3, y2 + 30);
    return s;
  }

  var CSS = '<style>'
    + ' text{font-family:Arial,Helvetica,sans-serif;text-anchor:middle}'
    + ' .frame{fill:none;stroke:#333;stroke-width:1.4}.frame2{stroke:#333;stroke-width:1.4;fill:none}'
    + ' .grid{stroke:#e5e5e5;stroke-width:1;fill:none}.ruler{font-size:12px;fill:#888}'
    + ' .tcell{fill:none;stroke:#333;stroke-width:1}'
    + ' .tlbl{font-size:10.5px;fill:#888;text-anchor:start}.tval{font-size:14px;font-weight:600;fill:#111;text-anchor:start}'
    + ' .ttitle{font-size:15px;font-weight:700;fill:#111}.tplate{font-size:12px;fill:#666}'
    + ' .rowl{font-size:13px;font-weight:700;fill:#444;text-anchor:start}'
    + ' .des{font-size:14px;font-weight:700;fill:#111}.sub{font-size:10px;fill:#555}.tl{font-size:10px;fill:#333}'
    + ' .pin{font-size:9px;font-weight:700;fill:#444}'
    + ' .mod{stroke:#4a4f57;stroke-width:1.3}.tm{fill:#c2c7cd;stroke:#8d9299;stroke-width:.8}'
    + ' .tb{fill:#93a3b6;stroke:#637182;stroke-width:1}'
    + ' .wP{stroke:#d32f2f;stroke-width:2.4;fill:none;stroke-linejoin:round;stroke-linecap:round}'
    + ' .wN{stroke:#17181a;stroke-width:2.4;fill:none;stroke-linejoin:round;stroke-linecap:round}'
    + ' .wPE{stroke:#1b8a3a;stroke-width:2.4;fill:none;stroke-linejoin:round;stroke-linecap:round}'
    + '</style>';

  function buildDC(opts) {
    opts = opts || {};
    var st = (typeof Project !== 'undefined' && Project.get) ? Project.get() : {};
    var strings = Array.isArray(st.strings) ? st.strings : [];
    if (!strings.length) return { svg: '', hasData: false, nStrings: 0 };
    /* per-string protection data (fuse rating + SPD Uc), persisted by the Protecții step */
    var dc = ((st.protections || {}).dc) || [];
    var inv = (st.components && Array.isArray(st.components.inverters) && st.components.inverters.length)
      ? st.components.inverters[0] : null;
    var rows = strings.map(function (s, i) {
      var d = dc.filter(function (x) { return x.label === 'S' + (i + 1) || x.id === s.id; })[0] || {};
      return { label: 'S' + (i + 1), fuse: d.fuse != null ? d.fuse : null, ucDc: d.ucDc != null ? d.ucDc : 1000, un: 1100 };
    });
    var n = rows.length;
    /* fit rows into the content band; pitch clamps so 1-4 strings sit comfortably */
    var top = gy0 + 90, bottom = gy1 - 40;
    var pitch = Math.min(300, Math.max(150, (bottom - top) / n));
    var body = '';
    rows.forEach(function (r, i) { body += stringRow(i, r, top + i * pitch); });
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">'
      + CSS + '<rect width="100%" height="100%" fill="#fff"/>' + cartouche(opts.plateNo) + body + '</svg>';
    return { svg: svg, hasData: true, nStrings: n };
  }

  return { buildDC: buildDC };
})();
