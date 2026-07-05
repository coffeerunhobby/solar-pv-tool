/* Wind loads (step 15) — React port of wind.html: EN 1991-1-4 / CR 1-1-4 peak
   velocity pressure + indicative ballast screening. Reads the building card
   from Project.section('building') (set in step 3), strings/mounting for the
   layout, location for the NASA wind-at-site card (wind-grid.js, optional —
   the card stays hidden if the grid scripts are not loaded). Own persisted
   input = the ballast block weight, Project.section('wind').bw — exact legacy
   payload, no markDone (legacy has none). The .formula-card / .xpl reference
   cards stay ALWAYS VISIBLE outside the learning-mode toggle (the dev guide rule);
   only Explain.block live-value substitutions live inside <ExplainHost/>. */
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../store/useI18n.js';
import { useProject } from '../store/useProject.js';
import ExplainHost, { LearnToggle } from '../components/ExplainHost.jsx';
import SmartLink from '../components/SmartLink.jsx';
import './Wind.css';

/* ── pure helpers, verbatim from the legacy IIFE ─────────────────────────── */
function num(v, d) { return (v == null || isNaN(v)) ? '-' : (+v).toFixed(d != null ? d : 2); }
function fmt0(v) { return (v == null || isNaN(v)) ? '-' : Math.round(v).toLocaleString(); }

/* ── Terrain exposure coefficient c_e(z) - EN 1991-1-4 §4.5 ─────────── */
/* zmin = minimum reference height per EN 1991-1-4 Table 4.1 (terrain cat 0,I,II,III,IV).
   The wind profile is floored at zmin: for h < zmin, cr/Iv use zmin, not h. */
const TERRAIN_PARAMS = {
  0: { z0: 0.003, kr: 0.156, zmin: 1 },
  1: { z0: 0.01,  kr: 0.170, zmin: 1 },
  2: { z0: 0.05,  kr: 0.190, zmin: 2 },
  3: { z0: 0.3,   kr: 0.215, zmin: 5 },
  4: { z0: 1.0,   kr: 0.234, zmin: 10 },
};
function ceH(h, cat) {
  /* EN 1991-1-4 §4.5: ce(z) = cr²·(1+7·Iv) = kr²·ln(z/z0)·(ln(z/z0) + 7), with cr = kr·ln(z/z0)
     and Iv = 1/ln(z/z0) (co = kI = 1). z is floored at zmin (EN §4.3.2 / Table 4.1) - using
     z0·2 instead under-predicted for roofs below zmin. Validated to <0.5% against the
     EuroCodeApplied EN1991-1-4 calculator over 9 scenarios (scripts/test-wind-eurocode.js). */
  const T = TERRAIN_PARAMS[cat] || TERRAIN_PARAMS[2];
  const z = Math.max(h, T.zmin);
  const ln = Math.log(z / T.z0);
  return T.kr * T.kr * ln * (ln + 7);
}

/* ── Indicative ballast intensity (kg/m² of array) ──────────────────────────
   NOT a per-module structural calculation. These are typical engineered-practice
   bands for low-tilt ballasted flat-roof PV, calibrated so a system at the
   reference peak pressure (~1000 N/m²) and ~12.5° tilt lands in the 10-30 kg/m²
   range seen in engineered NEN 7250 reports (e.g. Avasco Solar: ~15 kg/m² avg
   at qp≈1122 N/m²). Scaled linearly by qp and mildly by tilt. A real ballast
   plan models the array as interconnected segments with friction + shared
   self-weight and must be done by a structural engineer. */
const BAL_BASE = { F: 40, G: 20, H: 8 };   /* central kg/m² @ qp=1000 Pa, tilt 12.5° */
const Q_REF    = 1000;                     /* N/m² reference */
const BAND     = 0.35;                     /* ±35% uncertainty spread */
/* Fallback zone split when no module grid is available (medium array). */
const FALLBACK_FRAC = { F: 0.06, G: 0.24, H: 0.70 };
/* System self-weight: per-module weight comes from MODULE_LIST[].weight (kg) once the module DB
   carries it; until then estimate from glass-foil mono-Si areal mass. Frame/rail allowance is a
   kg/m² band calibrated to the Avasco report (frame 300 kg / 116 m² ≈ 2.6 kg/m²). */
const AREAL_MASS  = 12.5;   /* kg/m² fallback module areal mass */
const FRAME_KG_M2 = 2.6;    /* kg/m² mounting frame/rail allowance */

function tiltFactor(tilt) {
  const f = 0.6 + 0.4 * ((tilt || 12.5) / 12.5);
  return Math.max(0.7, Math.min(1.6, f));
}
function intensity(zone, qp, tilt) {
  return BAL_BASE[zone] * (qp / Q_REF) * tiltFactor(tilt);
}

/* ── Zone classification for a single panel at (r, c) ─────────────────── */
function zoneOf(r, c, rows, perRow, eRowsH, eRowsG, eCols) {
  const edgeCol = (c < eCols || c >= perRow - eCols);
  const cornerRow = (r < eRowsH || r >= rows - eRowsH);
  if (cornerRow && edgeCol) return 'F';
  if (edgeCol) return 'G';
  if (r < eRowsG || r >= rows - eRowsG) return 'G';
  return 'H';
}

/* Representative module tilt across the configured strings (fallback to mounting). */
function repTilt(strs, mnt) {
  const tilts = strs.map((s) => s.tilt).filter((v) => v != null);
  if (tilts.length) return tilts.reduce((a, b) => a + b, 0) / tilts.length;
  return mnt.tilt != null ? mnt.tilt : 15;
}

/* ── Helpers ───────────────────────────────────────────────────────────── */
function modById(id) { return (typeof MODULE_LIST !== 'undefined') ? MODULE_LIST.filter((m) => m.id === id)[0] : null; }
function modl_from_roof(perRow, roofW) { return (perRow > 0 && roofW > 0) ? roofW / perRow : 0; }
function avgModArea(strs) {
  const areas = strs.map((s) => { const m = modById(s.moduleId); return m ? (m.length || 0) * (m.width || 0) / 1e6 : 0; }).filter((a) => a > 0);
  return areas.length ? areas.reduce((a, b) => a + b, 0) / areas.length : 1.8;
}
function arrayArea(strs, fallbackAmod) {
  return strs.reduce((s, str) => {
    const m = modById(str.moduleId);
    const a = m ? (m.length || 0) * (m.width || 0) / 1e6 : fallbackAmod;
    return s + a * (str.count || 0);
  }, 0);
}
/* Per-module weight (kg): MODULE_LIST[].weight once available, else areal-mass estimate. */
function modWeight(m, area) { return (m && m.weight) ? m.weight : (area || 0) * AREAL_MASS; }

/* ── Zone SVG (verbatim string builder — rendered via dangerouslySetInnerHTML) ── */
function line(x1, y1, x2, y2, stroke, sw, da) {
  return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+stroke+'" stroke-width="'+sw+'" stroke-dasharray="'+da+'"/>';
}
function drawZoneSVG(rows, perRow, pitch, modl, roofW, roofD, eRowsH, eRowsG, eCols) {
  const W = 560, H = 260, mx = 32, my = 24;
  if (!rows || !perRow || !pitch || !modl) return '';
  let sw = Math.min(W - 2*mx, (H - 2*my) * (roofW / (roofD || 1)));
  let sh = sw * ((roofD || rows*pitch) / (roofW || perRow*modl));
  if (sh > H - 2*my) { sh = H - 2*my; sw = sh * ((roofW || perRow*modl) / (roofD || rows*pitch)); }
  const ox = mx + ((W-2*mx) - sw) / 2;
  const oy = my + ((H-2*my) - sh) / 2;
  const pw = (modl  / (roofW || perRow*modl)) * sw;
  const ph = (pitch / (roofD || rows*pitch))  * sh;

  let s = '<rect x="'+ox.toFixed(1)+'" y="'+oy.toFixed(1)+'" width="'+sw.toFixed(1)+'" height="'+sh.toFixed(1)+'" rx="3" fill="var(--bg2)" stroke="var(--border)" stroke-width="1.5"/>';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < perRow; c++) {
      const z = zoneOf(r, c, rows, perRow, eRowsH, eRowsG, eCols);
      const fill = z==='F' ? '#e07b20' : z==='G' ? '#e09050' : 'var(--clr-primary)';
      const op   = z==='F' ? '0.88'   : z==='G' ? '0.65'   : '0.48';
      const px = ox + c * pw, py = oy + r * ph;
      s += '<rect x="'+px.toFixed(1)+'" y="'+py.toFixed(1)+'" width="'+(pw-1.5).toFixed(1)+'" height="'+(ph-1.5).toFixed(1)+'" rx="1" fill="'+fill+'" opacity="'+op+'"/>';
    }
  }

  const ec = eCols * pw, erG = eRowsG * ph, erH = eRowsH * ph;
  const lc = 'color-mix(in srgb,#e07b20 80%,transparent)', da = '4 3', sw1 = '1.2';
  if (ec < sw/2) {
    s += line(ox+ec, oy, ox+ec, oy+sh, lc, sw1, da);
    s += line(ox+sw-ec, oy, ox+sw-ec, oy+sh, lc, sw1, da);
  }
  if (erG < sh/2) {
    s += line(ox, oy+erG, ox+sw, oy+erG, lc, sw1, da);
    s += line(ox, oy+sh-erG, ox+sw, oy+sh-erG, lc, sw1, da);
  }
  if (erH > erG && erH < sh/2 && ec < sw/2) {
    s += line(ox, oy+erH, ox+ec, oy+erH, lc, '1', da);
    s += line(ox+sw-ec, oy+erH, ox+sw, oy+erH, lc, '1', da);
    s += line(ox, oy+sh-erH, ox+ec, oy+sh-erH, lc, '1', da);
    s += line(ox+sw-ec, oy+sh-erH, ox+sw, oy+sh-erH, lc, '1', da);
  }

  function lbl(x, y, t) { return '<text x="'+x.toFixed(0)+'" y="'+y.toFixed(0)+'" text-anchor="middle" font-size="10" font-weight="700" fill="rgba(255,255,255,.85)">'+t+'</text>'; }
  if (eCols >= 1 && eRowsH >= 1) s += lbl(ox+ec/2, oy+erH/2+4, 'F');
  if (eRowsG >= 1 && sw > 80) s += lbl(ox+sw/2, oy+erG/2+4, 'G');
  s += lbl(ox+sw/2, oy+sh/2+4, 'H');

  return s;
}

/* wind-grid.js is a classic script loaded (or not) by the shell — guard like legacy. */
function siteWindReady() { return typeof WIND_DATA !== 'undefined' && !!WIND_DATA; }

export default function Wind() {
  const { t } = useI18n();                                        // subscribes → re-render on language switch (legacy renderList)
  const bld  = useProject((s) => s.building || {});
  const strs = useProject((s) => s.strings || []);
  const mnt  = useProject((s) => s.mounting || {});
  const loc  = useProject((s) => s.location || {});

  /* own input: ballast block weight — init once from Project.section('wind').bw */
  const W0 = Project.section('wind') || {};
  const [bw, setBw] = useState(W0.bw != null ? W0.bw : 35);
  const [windTick, setWindTick] = useState(0);                    // Recalculate → re-poll the NASA card
  const [siteMonthly, setSiteMonthly] = useState(null);           // wind-at-site card data (or null = hidden)

  /* persist on change (skip mount — legacy saveStep only fired on events); EXACT legacy payload */
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const v = parseFloat(bw);
    Project.patch('wind', { bw: isFinite(v) ? v : null });
  }, [bw]);   // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Wind-at-site card (NASA grid; wind1.png decodes async — poll like legacy) ── */
  useEffect(() => {
    let iv = null, to = null;
    function tryRender() {
      const lat = loc.lat, lon = loc.lon;
      if (!lat || !lon || typeof resolveWind !== 'function') return true;   /* grid scripts absent → give up */
      if (!siteWindReady()) return false;   /* don't show the 1.0 m/s fallback */
      const monthly = [];
      for (let m = 0; m < 12; m++) monthly.push(resolveWind(lat, lon, m));
      const avg = monthly.reduce((a, b) => a + b, 0) / 12;
      if (avg > 0) setSiteMonthly(monthly);
      return true;
    }
    if (!tryRender()) {
      iv = setInterval(() => { if (tryRender()) clearInterval(iv); }, 250);
      to = setTimeout(() => clearInterval(iv), 12000);   /* give up after 12 s */
    }
    return () => { if (iv) clearInterval(iv); if (to) clearTimeout(to); };
  }, [loc.lat, loc.lon, windTick]);

  /* ── Building params (legacy getBld) ── */
  const B = {
    h:       bld.h       != null ? bld.h       : null,
    vb0:     bld.vb0     != null ? bld.vb0     : null,
    terrain: bld.terrain != null ? bld.terrain : null,
    parapet: bld.parapet != null ? bld.parapet : 0,
  };
  const ok = B.h != null && B.vb0 != null && B.terrain != null;
  const tilt = repTilt(strs, mnt);

  /* ── Main compute (verbatim from legacy compute(), values only) ── */
  let R = null;   /* computed results when ok */
  if (ok) {
    const h   = B.h + (B.parapet || 0);     /* effective reference height */
    const vb  = B.vb0;
    const cat = B.terrain;
    const bwN = parseFloat(bw) || 35;

    let rows   = mnt.rows   || 0;
    let perRow = mnt.perRow || 0;
    let roofW  = mnt.roofW  || 0;
    let roofD  = mnt.roofD  || 0;
    let pitch  = mnt.pitch  || 0;

    /* Roof planes (or any layout without a rectangle grid) leave rows/perRow = 0, which used to blank
       the indicative zone diagram. Synthesise a representative ~square grid from the total module count
       so F/G/H zones still render; module side ≈ sqrt(avg module area), pitch/footprint follow. */
    if (!rows || !perRow) {
      const nTot0 = strs.reduce((s, x) => s + (x.count || 0), 0) || (mnt.total || 0);
      if (nTot0 > 0) {
        const side = Math.sqrt(avgModArea(strs)) || 1.7;
        perRow = Math.max(1, Math.round(Math.sqrt(nTot0)));
        rows   = Math.max(1, Math.ceil(nTot0 / perRow));
        if (!pitch) pitch = side;
        if (!roofW) roofW = perRow * side;
        if (!roofD) roofD = rows * pitch;
      }
    }

    /* Wind pressure (EN 1991-1-4) - this part is a genuine code calculation. */
    const qb = 0.5 * 1.25 * vb * vb;
    const ce = ceH(h, cat);
    const qp = ce * qb;

    /* Zone geometry (e = min(b, 2h)) - drives how panels split into F/G/H. */
    const b  = Math.min(roofW || 1, roofD || 1);
    const e  = Math.min(b, 2 * h);
    const eEdge   = e / 10;
    const eCorner = e / 4;
    const modl    = modl_from_roof(perRow, roofW);
    const eColsF  = Math.max(1, Math.ceil(modl  > 0 ? eEdge   / modl  : 1));
    const eRowsG  = Math.max(1, Math.ceil(pitch > 0 ? eEdge   / pitch : 1));
    const eRowsH  = Math.max(1, Math.ceil(pitch > 0 ? eCorner / pitch : 1));

    /* Count panels per zone over the roof grid (if known). */
    const counts = { F: 0, G: 0, H: 0 };
    if (rows && perRow) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < perRow; c++) counts[zoneOf(r, c, rows, perRow, eRowsH, eRowsG, eColsF)]++;
      }
    }
    const nGrid = counts.F + counts.G + counts.H;

    /* Total configured array area (m²). */
    const avgAmod = avgModArea(strs);
    let aArr = arrayArea(strs, avgAmod);
    if (aArr <= 0) aArr = nGrid * avgAmod;        /* fall back to roof grid capacity */
    const nMods = strs.reduce((s, x) => s + (x.count || 0), 0) || nGrid;

    /* Zone fractions: from the grid if available, else a typical split. */
    const frac = (nGrid > 0)
      ? { F: counts.F / nGrid, G: counts.G / nGrid, H: counts.H / nGrid }
      : FALLBACK_FRAC;

    /* Per-zone area, intensity (kg/m²) and ballast mass (kg). */
    const tf = tiltFactor(tilt);
    const zoneRow = (z, cls) => {
      const area = aArr * frac[z];
      const inten = intensity(z, qp, tilt);
      const mass = area * inten;
      const nP = (nGrid > 0) ? counts[z] : Math.round(nMods * frac[z]);
      const blocks = Math.ceil(mass / bwN);
      return { z, cls, area, inten, mass, nP, blocks };
    };
    const ZF = zoneRow('F', 'f'), ZG = zoneRow('G', 'g'), ZH = zoneRow('H', 'h');
    const zoneList = [ZF, ZG, ZH];
    const totalMass = zoneList.reduce((s, x) => s + x.mass, 0);
    const totalBlk  = zoneList.reduce((s, x) => s + x.blocks, 0);
    const avgInten  = aArr > 0 ? totalMass / aArr : 0;

    /* System self-weight (Module + Frame) - needed for both roof types. */
    let anyEst = false;
    let wMod;
    if (strs.length) {
      wMod = strs.reduce((s, str) => {
        const m = modById(str.moduleId);
        const a = m ? (m.length || 0) * (m.width || 0) / 1e6 : avgAmod;
        if (!(m && m.weight)) anyEst = true;
        return s + modWeight(m, a) * (str.count || 0);
      }, 0);
    } else {
      anyEst = true;
      wMod = nMods * avgAmod * AREAL_MASS;
    }
    const wFrame = FRAME_KG_M2 * aArr;

    /* ── Roof type: pitched (coplanar/flush) = mechanically fixed, NO ballast;
          single-tilt or E-W on flat ground = ballasted. ─────────────────────── */
    const isPitched = (mnt.mode === 'flush');
    const wDead = wMod + wFrame;
    const deadAvg = aArr > 0 ? wDead / aArr : 0;
    const wTotal = wMod + wFrame + totalMass;
    const wSysAvg = aArr > 0 ? wTotal / aArr : 0;

    const svg = isPitched ? '' : drawZoneSVG(rows, perRow, pitch, modl, roofW, roofD, eRowsH, eRowsG, eColsF);

    /* Mod explicativ - live working (legacy Explain.block builders, live values). */
    let xp = '';
    if (typeof Explain !== 'undefined') {
      if (isPitched) {
        xp += Explain.block('q<sub>b</sub> = ½ · 1.25 · v<sub>b</sub>² = ½ · 1.25 · ' + vb + '²', '<b>' + fmt0(qb) + ' N/m²</b>', 'wind.xpl.qb');
        xp += Explain.block('c<sub>e</sub>(z = ' + num(h, 1) + ' m, cat. ' + cat + ')', '<b>' + num(ce, 3) + '</b>', 'wind.xpl.ce');
        xp += Explain.block('q<sub>p</sub> = c<sub>e</sub> · q<sub>b</sub>', '<b>' + fmt0(qp) + ' N/m²</b>', 'wind.xpl.qp');
        xp += Explain.block('G<sub>proprie</sub> = G<sub>module</sub> + G<sub>structură</sub>',
          fmt0(wMod) + ' + ' + fmt0(wFrame) + ' = <b>' + fmt0(wDead) + ' kg</b> (' + num(deadAvg, 1) + ' kg/m²)', 'wind.xpl.deadload');
      } else {
        xp += Explain.block('b = min(lungime, lățime) planșeu',
          num(roofW, 2) + ' × ' + num(roofD, 2) + ' m → b = <b>' + num(b, 2) + ' m</b>', 'wind.xpl.bgeom');
        xp += Explain.block('e = min(b, 2·h<sub>ef</sub>)',
          'min(' + num(b, 2) + ', 2·' + num(h, 1) + ') = <b>' + num(e, 2) + ' m</b>', 'wind.xpl.e');
        xp += Explain.block('e/10 = ' + num(eEdge, 2) + ' m &nbsp;·&nbsp; e/4 = ' + num(eCorner, 2) + ' m',
          'F ' + (nGrid ? counts.F : '~' + Math.round(nMods * frac.F)) + ' &nbsp;·&nbsp; G ' + (nGrid ? counts.G : '~' + Math.round(nMods * frac.G)) + ' &nbsp;·&nbsp; H ' + (nGrid ? counts.H : '~' + Math.round(nMods * frac.H)), 'wind.xpl.zones_calc');
        xp += Explain.block('q<sub>b</sub> = ½ · 1.25 · v<sub>b</sub>² = ½ · 1.25 · ' + vb + '²',
          '<b>' + fmt0(qb) + ' N/m²</b>', 'wind.xpl.qb');
        xp += Explain.block('c<sub>e</sub>(z = ' + num(h, 1) + ' m, cat. ' + cat + ')',
          '<b>' + num(ce, 3) + '</b>', 'wind.xpl.ce');
        xp += Explain.block('q<sub>p</sub> = c<sub>e</sub> · q<sub>b</sub> = ' + num(ce, 3) + ' × ' + fmt0(qb),
          '<b>' + fmt0(qp) + ' N/m²</b>', 'wind.xpl.qp');
        xp += Explain.block('f<sub>β</sub> (β = ' + num(tilt, 0) + '°)',
          '<b>' + num(tf, 2) + '</b>', 'wind.xpl.tilt');
        xp += Explain.block('i<sub>F</sub> = ' + BAL_BASE.F + ' · (q<sub>p</sub>/' + Q_REF + ') · f<sub>β</sub>',
          num(BAL_BASE.F, 0) + ' · ' + num(qp / Q_REF, 2) + ' · ' + num(tf, 2) + ' = <b>' + num(ZF.inten, 1) + ' kg/m²</b>', 'wind.xpl.intensity');
        xp += Explain.block('balast ≈ Σ (A<sub>zonă</sub> · i<sub>zonă</sub>)',
          '<b>' + fmt0(totalMass) + ' kg</b> → ' + num(avgInten, 1) + ' kg/m²', 'wind.xpl.total');
      }
    }

    R = { h, vb, cat, bwN, qp, aArr, nMods, ZF, ZG, ZH, zoneList, totalMass, totalBlk, avgInten,
          wMod, wFrame, wDead, deadAvg, wTotal, wSysAvg, anyEst, isPitched, svg, xp };
  }

  const isPitched = !!(R && R.isPitched);
  const lo = 1 - BAND, hi = 1 + BAND;
  const siteMax = siteMonthly ? Math.max.apply(null, siteMonthly) : 0;
  const siteAvg = siteMonthly ? siteMonthly.reduce((a, b) => a + b, 0) / 12 : 0;

  const kv = (k, v) => <div className="kv"><span className="k">{k}</span><span className="v">{v}</span></div>;
  const estNote = R && R.anyEst
    ? <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{t('wind.westimate')}</div> : null;

  const forceRecalc = () => {                       /* legacy Recalculate: re-read + refresh + save */
    setWindTick((x) => x + 1);
    const v = parseFloat(bw);
    Project.patch('wind', { bw: isFinite(v) ? v : null });
  };

  return (
    <>
      <div className="sn-crumb"><b>{t('nav.phaseD')}</b> › <span>{t('nav.wind')}</span></div>

      <div className="wind-scroll">
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>{t('wind.subtitle')}</div>

        <div className="row g-3">

          {/* ── LEFT: inputs ── */}
          <div className="col-lg-4">

            {/* Building structure (from Premises) */}
            <div className="card">
              <div className="sec">{t('con.building')}</div>
              <div id="w-premises-warn" className="warn-inline" style={{ display: ok ? 'none' : '' }}>
                <span>{t('wind.incomplete')}</span>
                {' '}<SmartLink href="consumption.html">→ <span>{t('nav.consumption')}</span></SmartLink>
              </div>
              <div id="w-param-banner" style={{ display: ok ? '' : 'none' }}>
                {ok && (
                  <>
                    <div className="kv"><span className="k">h</span><span className="v" id="pb-h">{B.h + ' m' + (B.parapet ? ' + ' + B.parapet + ' m parapet' : '')}</span></div>
                    <div className="kv"><span className="k">{t('con.windzone')}</span><span className="v" id="pb-wz">{'v° = ' + B.vb0 + ' m/s'}</span></div>
                    <div className="kv"><span className="k">{t('con.terrain')}</span><span className="v" id="pb-ter">{'Cat ' + B.terrain}</span></div>
                    <div className="kv" id="pb-par-row" style={{ display: B.parapet ? '' : 'none' }}><span className="k">{t('con.parapet')}</span><span className="v" id="pb-par">{B.parapet + ' m'}</span></div>
                    <div className="kv"><span className="k">{t('wind.tilt')}</span><span className="v" id="pb-tilt">{num(tilt, 0) + '°'}</span></div>
                    <div style={{ marginTop: 8 }}><SmartLink href="consumption.html" className="editlink">{t('wind.editbld')}</SmartLink></div>
                  </>
                )}
              </div>
            </div>

            {/* Mean wind at site (NASA grid) */}
            <div className="card" id="w-site-card" style={{ display: siteMonthly ? '' : 'none' }}>
              <div className="sec">{t('wind.windatsite')}</div>
              <div className="kv" style={{ borderBottom: 0, alignItems: 'flex-end' }}>
                <span className="big" id="ws-annual" style={{ color: 'var(--clr-primary)' }}>{siteMonthly ? num(siteAvg, 1) + ' m/s' : '- m/s'}</span>
                <span className="wsc-bars" id="ws-bars">
                  {siteMonthly && siteMonthly.map((v, i) => (
                    <div key={i} className="wsc-bar" style={{ height: Math.round((v / siteMax) * 26) }} title={num(v, 1) + ' m/s'} />
                  ))}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{t('wind.nasanote')}</div>
            </div>

            {/* Ballast estimate settings (flat-roof / ballasted only) */}
            <div className="card" id="w-ballast-input" style={{ display: isPitched ? 'none' : '' }}>
              <div className="sec">{t('wind.params')}</div>
              <div className="field">
                <label>{t('wind.bwrow')}</label>
                <input type="number" id="w-bw" min="5" max="100" step="0.5" value={bw}
                       onChange={(e) => setBw(e.target.value)} />
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{t('wind.bwnote')}</div>
              </div>
              <button className="btn-prim" id="w-calc" onClick={forceRecalc}>{t('wind.recalc')}</button>
            </div>

          </div>

          {/* ── RIGHT: results ── */}
          <div className="col-lg-8">

            {/* Results summary + explain toggle */}
            <div className="card">
              <div className="sec" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t('con.results')}</span>
                <LearnToggle id="wind-learn" />
              </div>
              <div className="indic-banner" id="w-banner">
                <b>{t(isPitched ? 'wind.pitch_title' : 'wind.indic_title')}</b>
                {' '}<span>{t(isPitched ? 'wind.pitch_body' : 'wind.indic_body')}</span>
              </div>
              <div className="nodata-msg" id="w-nodata" style={{ display: ok ? 'none' : '' }}><span>{t('wind.nodata')}</span></div>
              <div id="w-summary">
                {R && isPitched && (
                  <>
                    {kv(t('wind.qp'), <><b>{fmt0(R.qp)}</b> N/m²</>)}
                    {kv(t('wind.arrayarea'), num(R.aArr, 1) + ' m² · ' + R.nMods + ' ' + t('wind.nmod').toLowerCase())}
                  </>
                )}
                {R && !isPitched && (
                  <>
                    {kv(t('wind.qp'), <><b>{fmt0(R.qp)}</b> N/m²</>)}
                    {kv(t('wind.arrayarea'), num(R.aArr, 1) + ' m² · ' + R.nMods + ' ' + t('wind.nmod').toLowerCase())}
                    {kv(t('wind.balintensity'), <><b>{num(R.avgInten, 1)}</b> kg/m² ({num(R.avgInten * lo, 0)}-{num(R.avgInten * hi, 0)})</>)}
                    {kv(t('wind.baltotal'), <><b>{fmt0(R.totalMass)}</b> kg ({fmt0(R.totalMass * lo)}-{fmt0(R.totalMass * hi)})</>)}
                    {kv(t('wind.balblocks'), <>≈ <b>{R.totalBlk}</b> × {num(R.bwN, 0)} kg</>)}
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{t('wind.typicalband')}</div>
                  </>
                )}
              </div>
              <ExplainHost id="xpl-wind-host" html={R ? R.xp : ''} />
            </div>

            {/* zone diagram + table (revealed once computed) */}
            <div id="w-diagram" style={{ display: ok ? '' : 'none' }}>

              {/* ballast-only block: hidden for pitched (flush) roofs */}
              <div id="w-ballast-block" style={{ display: isPitched ? 'none' : '' }}>
                <div className="diagram-card">
                  <div className="sec">{t('wind.zonehead')}</div>
                  <svg id="zone-svg" viewBox="0 0 560 260"
                       dangerouslySetInnerHTML={{ __html: R && !isPitched ? R.svg : '' }} />
                  <div className="zone-legend">
                    <span><span className="zl-dot" style={{ background: '#e07b20', opacity: .9 }}></span> <span>{t('wind.ref.fcorner')}</span> (F)</span>
                    <span><span className="zl-dot" style={{ background: '#e09050', opacity: .7 }}></span> <span>{t('wind.ref.gedge')}</span> (G)</span>
                    <span><span className="zl-dot" style={{ background: 'var(--clr-primary)', opacity: .5 }}></span> <span>{t('wind.ref.hint')}</span> (H)</span>
                  </div>
                </div>

                <div className="card">
                  <div className="sec">{t('wind.zonetbl')}</div>
                  <table className="zone-tbl">
                    <thead><tr>
                      <th>{t('wind.zone')}</th>
                      <th className="num">{t('wind.nmod')}</th>
                      <th className="num">{t('wind.zonearea')}</th>
                      <th className="num">{t('wind.zoneintensity')}</th>
                      <th className="num">{t('wind.zoneballast')}</th>
                      <th className="num">{t('wind.zoneblocks')}</th>
                    </tr></thead>
                    <tbody id="zone-tbody">
                      {R && !isPitched && R.zoneList.map((x) => (
                        <tr key={x.z}>
                          <td><span className={'bd-badge bd-' + x.cls}>{x.z}</span></td>
                          <td className="num">{x.nP}</td>
                          <td className="num">{num(x.area, 1)}</td>
                          <td className="num">{num(x.inten, 1)}</td>
                          <td className="num">{fmt0(x.mass)}</td>
                          <td className="num">{x.blocks}</td>
                        </tr>
                      ))}
                      {R && !isPitched && (
                        <tr>
                          <td colSpan={2} style={{ color: 'var(--text3)', fontSize: 12 }}>{t('wind.total')}</td>
                          <td className="num" style={{ color: 'var(--text3)' }}>{num(R.aArr, 1)}</td>
                          <td className="num" style={{ color: 'var(--text3)' }}>{num(R.avgInten, 1)}</td>
                          <td className="num" style={{ fontWeight: 700 }}>{fmt0(R.totalMass)}</td>
                          <td className="num" style={{ fontWeight: 700 }}>{R.totalBlk}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>{t('wind.zonenote')}</div>
                </div>
              </div>{/* /w-ballast-block */}

              <div className="card">
                <div className="sec" id="w-weights-title">{t(isPitched ? 'wind.deadload' : 'wind.weights')}</div>
                <div id="w-weights">
                  {R && (
                    <>
                      {kv(t('wind.wmod'), fmt0(R.wMod) + ' kg')}
                      {kv(t('wind.wframe'), fmt0(R.wFrame) + ' kg')}
                      {!isPitched && kv(t('wind.wballast'), fmt0(R.totalMass) + ' kg')}
                      <div className="kv w-total"><span className="k">{t('wind.wtotal')}</span><span className="v big">{fmt0(isPitched ? R.wDead : R.wTotal)} kg</span></div>
                      {kv(t('wind.wsysavg'), num(isPitched ? R.deadAvg : R.wSysAvg, 1) + ' kg/m²')}
                      {estNote}
                    </>
                  )}
                </div>
              </div>

            </div>

            {/* Formula reference (always visible — OUTSIDE the learning-mode toggle) */}
            <div className="card">
              <div className="sec">{t('wind.refhead')}</div>

              <div className="xpl">
                <div className="xpl-f">q<sub>b</sub> = ½ · ρ · v<sub>b</sub>² &nbsp;[N/m²]<br />q<sub>p</sub>(z) = c<sub>e</sub>(z) · q<sub>b</sub></div>
                <div className="xpl-d">{t('wind.ref.chain')}</div>
              </div>

              <table className="ref-tbl">
                <thead><tr>
                  <th>{t('wind.zone')}</th>
                  <th>{t('wind.ref.pos')}</th>
                  <th>{t('wind.ref.dim')}</th>
                  <th className="num">{t('wind.ref.band')}</th>
                  <th>{t('wind.ref.mean')}</th>
                </tr></thead>
                <tbody>
                  <tr><td><span className="bd-badge bd-f">F</span></td><td>{t('wind.ref.fcorner')}</td><td>e/10 × e/4</td><td className="num">30-50</td><td style={{ color: 'var(--text3)' }}>{t('wind.ref.fmean')}</td></tr>
                  <tr><td><span className="bd-badge bd-g">G</span></td><td>{t('wind.ref.gedge')}</td><td>{t('wind.ref.gdim')}</td><td className="num">15-25</td><td style={{ color: 'var(--text3)' }}>{t('wind.ref.gmean')}</td></tr>
                  <tr><td><span className="bd-badge bd-h">H</span></td><td>{t('wind.ref.hint')}</td><td>{t('wind.ref.rest')}</td><td className="num">5-12</td><td style={{ color: 'var(--text3)' }}>{t('wind.ref.hmean')}</td></tr>
                </tbody>
              </table>
              <div className="xpl-d" style={{ marginTop: 6 }}>
                <span dangerouslySetInnerHTML={{ __html: t('wind.ref.geom') }} />{' '}
                <span>{t('wind.ref.scalenote')}</span>
              </div>

              <div className="indic-banner" style={{ marginTop: 10, marginBottom: 0 }}>
                <span>{t('wind.ref.engineered')}</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
