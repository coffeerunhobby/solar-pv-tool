/* iec-symbols.js — small IEC 60617 symbol library for the single-line editor (schema.html).

   PORT MODEL (the important bit): every symbol is a DIRECTED two-port device with a defined
   ENTRY (`in`) and EXIT (`out`). It is defined ONCE in a canonical VERTICAL orientation, current
   flowing top→bottom: `in` at the top, `out` at the bottom. Rotation is NOT a free choice — it is
   derived from connectivity so the ENTRY faces the wire arriving from the upstream device's EXIT
   (device N.out → device N+1.in). e.g. for the fuse-disconnector the entry is the fixed-contact
   bar (the little line) and the exit is the blade hinge.

   API:  IEC.render(name, cx, cy, { rot, h, stroke }) -> { svg, in:{x,y}, out:{x,y} }
         rot = rotation in degrees CW (0/90/180/270). The returned in/out are WORLD coords AFTER
         rotation+translation, so the caller wires upstream.out → this.in exactly.
   Helpers: IEC.ROT maps an entry-facing side -> the rotation that points `in` that way
            ({ top:0, right:90, bottom:180, left:270 }); IEC.has(name); IEC.rotPt(x,y,deg). */
window.IEC = (function () {
  'use strict';
  var ROT = { top: 0, right: 90, bottom: 180, left: 270 };   // rotation that makes `in` face that side
  function rotPt(x, y, deg) { var r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return { x: x * c - y * s, y: x * s + y * c }; }
  function L(x1, y1, x2, y2, s) {
    return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
           '" stroke="' + s + '" stroke-width="1.4" stroke-linecap="round"/>';
  }

  /* Symbol definitions — drawn centred at the LOCAL origin (0,0), canonical vertical.
     port(half) returns the in/out terminal offsets from the origin; body(s,half) returns the glyph. */
  var DEFS = {
    /* Fuse-switch-disconnector / fuse-isolator (IEC 60617, ProfiCAD form).
       ENTRY = fixed-contact bar at the top (the "little line"); EXIT = blade hinge (pivot dot) at the
       bottom. The moving blade pivots at the hinge and stands off the fixed contact (the disconnect
       gap), carrying the fuse rectangle. */
    fuseDisconnector: {
      port: function (half) { return { in: { x: 0, y: -half }, out: { x: 0, y: half } }; },
      body: function (s, half) {
        var topC = -13, hinge = 11, btx = -7, bty = -9, g = '';   // contact y, hinge y, open blade-top
        g += L(0, -half, 0, topC, s);            // top lead -> fixed contact
        g += L(-6, topC, 6, topC, s);            // fixed-contact bar  (= ENTRY, the little line)
        g += L(0, hinge, btx, bty, s);           // moving blade (hinge -> open top)
        g += L(0, hinge, 0, half, s);            // bottom lead from the hinge (= EXIT)
        /* fuse rectangle astride the blade (outline only - the blade is the conductor through it) */
        var mx = btx / 2, my = (hinge + bty) / 2, ang = Math.atan2(bty - hinge, btx) * 180 / Math.PI;
        g += '<g transform="translate(' + mx.toFixed(1) + ' ' + my.toFixed(1) + ') rotate(' + ang.toFixed(1) + ')">' +
             '<rect x="-8.5" y="-4" width="17" height="8" rx="1" fill="none" stroke="' + s + '" stroke-width="1.2"/></g>';
        return g;
      }
    },

    /* Switch-disconnector / on-load isolating switch (IEC 60617): top lead -> a small fixed-contact
       CIRCLE (= ENTRY, "the little circle is the input"), the moving blade swings open, hinge -> bottom
       lead (= EXIT). Like the fuse-disconnector but without the fuse element. */
    switchDisconnector: {
      port: function (half) { return { in: { x: 0, y: -half }, out: { x: 0, y: half } }; },
      body: function (s, half) {
        var topC = -10, hinge = 11, btx = -7, bty = -7, g = '';
        g += L(0, -half, 0, topC - 2.6, s);      // top lead to just above the circle
        g += '<circle cx="0" cy="' + topC + '" r="2.6" fill="#fff" stroke="' + s + '" stroke-width="1.2"/>';   // fixed contact = ENTRY
        g += L(0, hinge, btx, bty, s);           // moving blade (open)
        g += L(0, hinge, 0, half, s);            // bottom lead from the hinge = EXIT
        return g;
      }
    },

    /* Miniature circuit breaker (MCB), IEC 60617: a switch contact (the moving blade shown open) with
       the "✳" trip-element star at the fixed contact, then the thermal-magnetic release - a small
       rectangle (thermal) over a curved hook (magnetic) - on the conductor. ENTRY = top fixed contact,
       EXIT = bottom lead. */
    mcb: {
      port: function (half) { return { in: { x: 0, y: -half }, out: { x: 0, y: half } }; },
      body: function (s, half) {
        var g = '';
        g += L(0, -half, 0, -13, s);                 // top lead - stops AT the X (no line poking past it)
        g += L(-3, -16, 3, -10, s);                  // X fixed contact (clean cross, like the RCCB - not a star)
        g += L(3, -16, -3, -10, s);
        g += L(0, -2, -7, -8, s);                    // open moving blade (hinge -> up-left, gap to the contact)
        /* thermal element: the conductor DETOURS into a rectangle and back (open on the conductor/left
           side) - drawn as the conductor path so it rotates rigidly with the symbol in any orientation */
        g += L(0, -2, 0, 2, s);                      // conductor down to the bump
        g += L(0, 2, 5, 2, s);                       // bump out (right)
        g += L(5, 2, 5, 7, s);                       // bump along (down)
        g += L(5, 7, 0, 7, s);                       // bump back to the conductor (left)  -> OPEN on the left
        g += L(0, 7, 0, 9.5, s);                     // conductor continues to the hook
        g += '<path d="M0 9.5 q 6 3.2 0 6.5" fill="none" stroke="' + s + '" stroke-width="1.4"/>';            // magnetic operating hook (bulges right)
        g += L(0, 16, 0, half, s);                   // bottom lead = EXIT
        return g;
      }
    },

    /* Residual-current circuit breaker (RCCB / RCD), IEC 60617 - the logical shape only (no letters):
       the toroid CIRCLE (current sensor) on the conductor, a feedback loop to a SQUARE (trip relay) that
       pulls the LEVER open, and the X output contact. ENTRY (`in`, top) = the X/output end (faces the MCB
       in our chain); EXIT (`out`, bottom) = the toroid/input end (faces the main line). */
    rccb: {
      port: function (half) { return { in: { x: 0, y: -half }, out: { x: 0, y: half } }; },
      body: function (s, half) {
        var g = '';
        g += L(0, -half, 0, -11, s);                 // top lead (in / output / toward MCB)
        g += L(-3, -14, 3, -8, s);                   // X output contact
        g += L(3, -14, -3, -8, s);
        g += L(0, 3, -7, -5, s);                     // open lever (pivots at the hinge, free end meets the relay square)
        g += '<rect x="-13" y="-8" width="6" height="6" fill="none" stroke="' + s + '" stroke-width="1.2"/>';   // trip-relay square (pulls the lever)
        g += L(0, 3, 0, 5, s);                       // conductor from the hinge to the toroid
        g += '<circle cx="0" cy="9" r="4" fill="none" stroke="' + s + '" stroke-width="1.2"/>';                 // toroid current sensor
        g += L(0, 13, 0, half, s);                   // bottom lead (out / input / toward the main line)
        g += L(-10, -2, -10, 9, s);                  // feedback loop: square -> down ...
        g += L(-10, 9, -4, 9, s);                    // ... across to the toroid
        return g;
      }
    },

    /* Surge protective device (SPD / arrester), IEC 60617 - a SHUNT device: the protected line passes
       straight through (in -> out), and the arrester element + its protective-earth connection hang
       DOWN from the tap (always screen-down, regardless of the line's rotation - embedded PE). */
    spd: {
      shunt: true,
      shuntBody: function (s, cx, cy) {
        var g = '', y1 = cy + 10, bh = 20, y2 = y1 + bh;  // arrester box top / height / bottom (dropped a few px below the line)
        g += L(cx, cy, cx, y1, s);                        // tap down to the box
        g += '<rect x="' + (cx - 7) + '" y="' + y1 + '" width="14" height="' + bh + '" rx="1" fill="#fff" stroke="' + s + '" stroke-width="1.2"/>';
        /* bidirectional arrester: two filled triangles pointing AT each other (▼ top, ▲ bottom) */
        g += '<path d="M' + (cx - 5) + ' ' + (y1 + 2.5) + ' L' + (cx + 5) + ' ' + (y1 + 2.5) + ' L' + cx + ' ' + (y1 + 9.5) + ' Z" fill="' + s + '"/>';
        g += '<path d="M' + (cx - 5) + ' ' + (y2 - 2.5) + ' L' + (cx + 5) + ' ' + (y2 - 2.5) + ' L' + cx + ' ' + (y2 - 9.5) + ' Z" fill="' + s + '"/>';
        g += L(cx, y2, cx, y2 + 6, s);                    // box -> earth PORT (PE wire continues to the earth node)
        return g;
      }
    }
  };

  function has(name) { return !!DEFS[name]; }

  function render(name, cx, cy, o) {
    o = o || {};
    var def = DEFS[name];
    if (!def) return { svg: '', in: { x: cx, y: cy }, out: { x: cx, y: cy } };
    var s = o.stroke || '#222', h = o.h || 40, half = h / 2, deg = o.rot || 0;
    if (def.shunt) {
      /* SHUNT device: the line in->out rotates with the chain; the arrester always hangs DOWN and ends
         in an EARTH port (a real PE wire then routes to a per-device earth node). */
      var pi = rotPt(0, -half, deg), po = rotPt(0, half, deg);
      var inP = { x: cx + pi.x, y: cy + pi.y }, outP = { x: cx + po.x, y: cy + po.y };
      return { svg: L(inP.x, inP.y, outP.x, outP.y, s) + def.shuntBody(s, cx, cy), in: inP, out: outP, earth: { x: cx, y: cy + 36 } };
    }
    var svg = '<g transform="translate(' + cx + ' ' + cy + ') rotate(' + deg + ')">' + def.body(s, half) + '</g>';
    var p = def.port(half), pin = rotPt(p.in.x, p.in.y, deg), pout = rotPt(p.out.x, p.out.y, deg);
    return { svg: svg, in: { x: cx + pin.x, y: cy + pin.y }, out: { x: cx + pout.x, y: cy + pout.y } };
  }

  return { ROT: ROT, render: render, has: has, rotPt: rotPt };
})();
