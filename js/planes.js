/* planes.js — roof planes: 4-length trapezoid solver, panel packing, and the
   effective-orientation resolver (plane + mount mode → string tilt/azimuth).

   Convention: every roof plane has the ridge (top) PARALLEL to the eave (bottom).
   With the eave laid on the X-axis the four slope-measured lengths define the shape
   uniquely (see memory project_roof_planes_spec.md / CONTEXT.md):

       P1=(0,0)  P2=(B,0)  P3=(x+T,h)  P4=(x,h)
       x = (L² - R² + (B-T)²) / (2(B-T))      h = √(L² - x²)

   Lengths are measured ALONG THE SLOPE (tape on the roof), so the polygon lives in
   true plane coordinates — exactly the space panel packing needs. Tilt/azimuth only
   matter for yield, never for fitting.

   Mount modes (string.mount.mode) reuse the mounting-page values. BOTH azimuths stay
   configurable and ADD: eff γ = plane γ + panel γ (mount.rackAz; coplanar presets it to 0,
   E-W presets ∓90 alternating - mount.face 'E'/'W' is the legacy fallback when rackAz is null):
     'flush'  coplanar      → eff = plane β            @ plane γ + panel γ
     'single' tilted racks  → eff = plane β + panel Δβ @ plane γ + panel γ (same axis ⇒ exact sum)
     'ew'     east-west     → eff = plane β + panel Δβ @ plane γ + panel γ (γ preset ∓90)
   'single'/'ew' want a (near-)flat plane: β ≤ FLAT_MAX, warn above (no 3D composition).

   string.planeId == null ⇒ legacy free string: callers keep using the string's own
   stored tilt/azimuth (effOrient falls through to them). */

var PLANE_COLORS = ['#475569', '#0e7490', '#7c2d12', '#4d7c0f', '#86198f', '#1e40af'];

var Planes = (function () {
  'use strict';

  var FLAT_MAX = 5;          // max plane tilt (°) for 'single'/'ew' mounting before warning
  var EPS = 1e-9;

  /* 4 slope lengths → polygon in plane coordinates. Returns
     { ok:true, poly:[[x,y]..] CCW, x, h, area } or { ok:false, err:'range'|'rect'|'invalid' }. */
  function solve(top, bottom, left, right) {
    var T = parseFloat(top), B = parseFloat(bottom), L = parseFloat(left), R = parseFloat(right);
    if (!(B > 0) || !(L > 0) || !(R > 0) || !(T >= 0) || !isFinite(T)) return { ok: false, err: 'range' };
    var x, h;
    if (Math.abs(B - T) < EPS) {               // ridge = eave ⇒ rectangle, needs L = R
      if (Math.abs(L - R) > 0.01) return { ok: false, err: 'rect' };
      x = 0; h = (L + R) / 2;
    } else {
      x = (L * L - R * R + (B - T) * (B - T)) / (2 * (B - T));
      var h2 = L * L - x * x;
      if (h2 <= EPS) return { ok: false, err: 'invalid' };
      h = Math.sqrt(h2);
    }
    var poly = T < EPS ? [[0, 0], [B, 0], [x, h]]                    // triangle (hip end)
                       : [[0, 0], [B, 0], [x + T, h], [x, h]];
    return { ok: true, poly: poly, x: x, h: h, area: (T + B) / 2 * h };
  }

  /* [xmin, xmax] of the polygon at height y (horizontal line ∩ convex polygon). */
  function spanAt(poly, y) {
    var xs = [];
    for (var i = 0; i < poly.length; i++) {
      var a = poly[i], b = poly[(i + 1) % poly.length];
      if ((a[1] - y) * (b[1] - y) > 0) continue;        // edge entirely above or below
      if (Math.abs(b[1] - a[1]) < EPS) { xs.push(a[0], b[0]); }
      else xs.push(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]));
    }
    if (!xs.length) return null;
    return [Math.min.apply(null, xs), Math.max.apply(null, xs)];
  }

  /* True inward offset of a convex CCW polygon by margin m (every edge shifted along its
     inward normal, adjacent offset lines re-intersected). Returns the inset polygon or
     null when the margin swallows the shape. Exact perpendicular clearance on EVERY edge —
     a plain horizontal x-inset would under-clear slanted hip edges. */
  function inset(poly, m) {
    if (!(m > 0)) return poly;
    var n = poly.length, lines = [], i;
    for (i = 0; i < n; i++) {
      var a = poly[i], b = poly[(i + 1) % n];
      var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      if (len < EPS) continue;
      lines.push({ x: a[0] - dy / len * m, y: a[1] + dx / len * m, dx: dx, dy: dy });  // (-dy,dx)/len = inward normal (CCW)
    }
    if (lines.length < 3) return null;
    var out = [];
    for (i = 0; i < lines.length; i++) {
      var L1 = lines[(i + lines.length - 1) % lines.length], L2 = lines[i];
      var det = L1.dx * L2.dy - L1.dy * L2.dx;
      if (Math.abs(det) < 1e-12) return null;             // adjacent edges parallel ⇒ degenerate
      var t = ((L2.x - L1.x) * L2.dy - (L2.y - L1.y) * L2.dx) / det;
      out.push([L1.x + L1.dx * t, L1.y + L1.dy * t]);
    }
    var area = 0;
    for (i = 0; i < out.length; i++) { var p = out[i], q = out[(i + 1) % out.length]; area += p[0] * q[1] - q[0] * p[1]; }
    return area > EPS ? out : null;                        // flipped/zero area ⇒ margin ate the polygon
  }

  /* Scanline row packing. w = panel width across the row, d = row depth on the plane,
     step = row pitch (≥ d), setback = edge clearance (true perpendicular inset, see above).
     The plane polygon is convex, so a row band [y, y+d] fits where BOTH its edges fit ⇒
     intersect the two spans. Returns { total, rows:[{ x, y, n }] } (row origin = lower-left,
     plane coords). */
  function pack(sol, w, d, step, setback) {
    if (!sol || !sol.ok || !(w > 0) || !(d > 0) || !(step > 0)) return { total: 0, rows: [] };
    var poly = inset(sol.poly, setback > 0 ? setback : 0);
    if (!poly) return { total: 0, rows: [] };
    var ys = poly.map(function (q) { return q[1]; });
    var yMin = Math.min.apply(null, ys), yMax = Math.max.apply(null, ys);
    var rows = [], total = 0;
    for (var y = yMin; y + d <= yMax + EPS; y += step) {
      var s0 = spanAt(poly, y), s1 = spanAt(poly, y + d);
      if (!s0 || !s1) break;
      var x0 = Math.max(s0[0], s1[0]), x1 = Math.min(s0[1], s1[1]);
      var n = Math.floor((x1 - x0 + EPS) / w);
      if (n > 0) { rows.push({ x: x0, y: y, n: n }); total += n; }
    }
    return { total: total, rows: rows };
  }

  function byId(planes, id) {
    if (!Array.isArray(planes)) return null;
    for (var i = 0; i < planes.length; i++) if (planes[i] && planes[i].id === id) return planes[i];
    return null;
  }

  /* Effective orientation of a string. Unlinked → the string's own stored values
     byte-for-byte (legacy behaviour, incl. the E-W ±90 overwrite). Linked → derived
     from the plane + mount mode; mounting.html syncs the result back into
     string.tilt/azimuth so every other page keeps reading the same fields. */
  function effOrient(s, planes) {
    var p = (s && s.planeId != null) ? byId(planes, s.planeId) : null;
    if (!p) return { tilt: s ? s.tilt : null, azimuth: s ? s.azimuth : null, linked: false };
    var mode = (s.mount && s.mount.mode) || 'flush';
    var pt = parseFloat(p.tilt) || 0, pa = parseFloat(p.azimuth) || 0;
    /* panel γ: explicit rackAz; legacy fallback = ew face ∓90, else 0 (panels follow the plane) */
    var ra = (s.mount && s.mount.rackAz != null) ? parseFloat(s.mount.rackAz) || 0
           : (mode === 'ew' ? ((s.mount && s.mount.face === 'W') ? 90 : -90) : 0);
    var az = pa + ra;
    if (mode === 'flush') return { tilt: pt, azimuth: az, rackAz: ra, linked: true, mode: mode };
    var dt = (s.mount && s.mount.rackTilt != null) ? parseFloat(s.mount.rackTilt) || 0
                                                   : (mode === 'ew' ? 10 : 30);
    return { tilt: pt + dt, azimuth: az, rackAz: ra, linked: true, mode: mode };   // 'single' / 'ew'
  }

  return { solve: solve, spanAt: spanAt, inset: inset, pack: pack, byId: byId, effOrient: effOrient, FLAT_MAX: FLAT_MAX };
})();
