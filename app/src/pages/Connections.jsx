/* Electrical connections (step 9) — React port of connections.html: per-string
   DC cable sizing (ΔU + ampacity at the string's own Tc,max), cold-Voc cable
   check, gPV fuse verdict, generator fault-current summary, PER-INVERTER AC
   cable + MCB (resolveInverterUnits), compliance accordion, learning-mode
   working. The heavy per-string / AC card HTML stays as the legacy verbatim
   string builders (pixel parity + print CSS) injected via
   dangerouslySetInnerHTML; the cable-length inputs are wired by delegated
   onInput on the wrapper. Persists the SAME payload to
   Project.section('connections') as the legacy saveState. */
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../store/useI18n.js';
import { useLearn } from '../store/useLearn.js';
import { useProject } from '../store/useProject.js';
import { LearnToggle } from '../components/ExplainHost.jsx';
import './Connections.css';

/* ── Constants (verbatim from the legacy IIFE) ─────────────────────────── */
const RHO_CU      = 0.0179;   // Ω·mm²/m copper (course value, ~20°C)
const RHO_CU_AC   = 0.0179;
const RHO_AL_AC   = 0.0294;
const CABLE_VMAX  = 1500;     // H1Z2Z2-K DC voltage rating (V)
const DEFAULT_LV  = -0.29;    // %/°C Voc coeff fallback (monocrystalline typical)
/* §11 site-input fallbacks (same defaults as strings.html) - used when §11 never ran */
const DEFAULT_TAMIN = -20;    // °C ambient minimum
const DEFAULT_TAMAX = 45;     // °C ambient maximum
const DEFAULT_GMIN  = 100;    // W/m² cold-morning irradiance
const DEFAULT_GMAX  = 1000;   // W/m² peak irradiance
const DEFAULT_NMOT  = 45;     // °C NMOT fallback when the module lacks it

const STD_CROSS  = [2.5, 4, 6, 10, 16, 25, 35, 50];
const STD_FUSE   = [6, 8, 10, 12, 15, 16, 20, 25, 32];
const STD_MCB    = [6, 10, 16, 20, 25, 32, 40, 50, 63];

/* H1Z2Z2-K single cable, free air (approx IEC 60364-5-52 method B) */
const AMP_DC = { 2.5: 35, 4: 45, 6: 57, 10: 75, 16: 100, 25: 130 };

/* NYY/CYY copper AC (method B2, typical) */
const AMP_AC_CU = { 1.5: 15.5, 2.5: 21, 4: 28, 6: 36, 10: 50, 16: 68, 25: 89 };
/* ACYY aluminium AC */
const AMP_AC_AL = { 2.5: 16, 4: 21, 6: 28, 10: 40, 16: 55, 25: 73 };

const CABLE_LEN_DEFAULT = 20;   /* one-way string cable length default (m) */

/* ── Helpers (verbatim) ────────────────────────────────────────────────── */
function nextStd(arr, minVal) {
  for (var i = 0; i < arr.length; i++) if (arr[i] >= minVal) return arr[i];
  return arr[arr.length - 1];
}

function minCrossForAmpacity(tbl, minA) {
  var keys = Object.keys(tbl).map(Number).sort(function (a, b) { return a - b; });
  for (var i = 0; i < keys.length; i++) if (tbl[keys[i]] >= minA) return keys[i];
  return keys[keys.length - 1];
}

function recommendFuse(isc) {
  var mn = isc * 1.25, mx = isc * 2.4;
  for (var i = 0; i < STD_FUSE.length; i++) {
    if (STD_FUSE[i] >= mn && STD_FUSE[i] <= mx) return STD_FUSE[i];
  }
  return nextStd(STD_FUSE, mn);
}

function getModule(id) {
  if (!id || typeof MODULE_LIST === 'undefined') return null;
  for (var i = 0; i < MODULE_LIST.length; i++) if (MODULE_LIST[i].id === id) return MODULE_LIST[i];
  return null;
}

/* House number format: round to 2 decimals, strip trailing zeros
   (23.7 not 23.70, 43.63 not 43.6, 13 not 13.00). See the dev guide. */
function fnum(v) { return (+v).toFixed(2).replace(/\.?0+$/, ''); }
const f2 = fnum, f1 = fnum;   /* aliases - every numeric display goes through fnum */
/* conductor resistances are ~0.0x Ω - 2 dp would collapse them; 4 dp, same stripping */
function fnum4(v) { return (+v).toFixed(4).replace(/\.?0+$/, ''); }
function tr(k) { return (typeof t === 'function') ? t(k) : k; }
/* tr() + {placeholder} substitution, e.g. fmt('cx.fuse_req', {n: 2, a: 20}) */
function fmt(key, subs) {
  var s = tr(key);
  Object.keys(subs).forEach(function (k) { s = s.replace('{' + k + '}', subs[k]); });
  return s;
}

/* ── Per-string G_min/G_max: clear-sky POA for THIS string's β/γ ─────────
   Same estimator as strings.html "Auto from location":
     G_min = avg POA over the first hour after sunrise, mid-January (TL=3)
     G_max = POA at solar noon on the June solstice (TL=4)
   Tilt/azimuth change the plane-of-array irradiance, so an E/W string gets a
   different G than a S string. Falls back to the shared §11 inputs when the
   location or the engine isn't available. Memoised per mount (cache ref) - G
   doesn't depend on the page inputs, so it's computed once per string. */
function stringG(s, Gmin, Gmax, cache) {
  var key = (s.id != null) ? s.id : (s.tilt + '/' + s.azimuth);
  if (cache[key]) return cache[key];
  var out = { gmin: Gmin, gmax: Gmax, est: false };
  var loc = Project.section('location') || {};
  var mnt = Project.section('mounting') || {};
  if (loc.lat != null && loc.lon != null &&
      typeof sunPos === 'function' && typeof clearSkyHofierka === 'function' &&
      typeof transposeHayDavies === 'function' && typeof doy === 'function') {
    var lat = loc.lat, lon = loc.lon, tz = loc.tz != null ? loc.tz : 2, elev = loc.elevation || 0;
    var tilt = (s.tilt != null) ? s.tilt : (mnt.tilt != null ? mnt.tilt : 30);
    var az   = (s.azimuth != null) ? s.azimuth : (mnt.azimuth != null ? mnt.azimuth : 0);
    var alb  = (s.albedo != null) ? s.albedo : 0.2;
    /* G_min - first hour after sunrise, mid-January */
    var nW = doy(2025, 1, 15), hSR = null;
    for (var h = 4; h <= 12; h += 0.1) { if (sunPos(lat, lon, tz, nW, h, 'lst')) { hSR = h; break; } }
    if (hSR != null) {
      var sum = 0, cnt = 0;
      for (var k = 0; k <= 6; k++) {
        var sun = sunPos(lat, lon, tz, nW, hSR + k / 6, 'lst');
        if (!sun) continue;
        sum += transposeHayDavies(sun, clearSkyHofierka(sun.el, nW, lat, 3.0, elev), tilt, az, alb, nW); cnt++;
      }
      if (cnt) { out.gmin = Math.max(50, Math.min(400, Math.round(sum / cnt))); out.est = true; }
    }
    /* G_max - clear-sky POA at solar noon, summer solstice */
    var nS = doy(2025, 6, 21);
    var sunNoon = sunPos(lat, lon, tz, nS, 12, 'lst');
    if (sunNoon) {
      out.gmax = Math.max(700, Math.min(1200, Math.round(
        transposeHayDavies(sunNoon, clearSkyHofierka(sunNoon.el, nS, lat, 4.0, elev), tilt, az, alb, nS))));
      out.est = true;
    }
    out.tilt = tilt; out.az = az;
  }
  cache[key] = out;
  return out;
}

/* ── Per-string DC cards (verbatim HTML builder from legacy renderStrings;
   seeding/persist moved to the component, Explain gated on learnOn) ─────── */
function buildStringsHtml(strings, cables, dropDC, TaMin, TaMax, Gmin, Gmax, gCache, learnOn) {
  if (!strings.length) {
    return '<div class="card"><span class="no-data">' + tr('cx.nostrings') + '</span></div>';
  }

  var html = '';

  strings.forEach(function (s, idx) {
    var mod = getModule(s.moduleId);
    if (!mod) return;

    /* Series count: §11 result if set, else all `count` modules in series (np=1 default).
       Voc_cold is the STRING sum - ns × per-module cold Voc - not one panel. */
    var np   = s.np || 1;
    var ns   = s.ns || (s.count ? Math.max(1, Math.round(s.count / np)) : 1);
    var lenM = cables[s.id] != null ? +cables[s.id] : CABLE_LEN_DEFAULT;
    var lv   = (mod.lv  != null && mod.lv  !== 0) ? +mod.lv  : DEFAULT_LV;

    /* Per-string §11 cell temperatures: THIS module's NMOT (∓3% tolerance) and THIS
       string's G_min/G_max (clear-sky POA at its own β/γ). Shared ambient Ta inputs. */
    var nmot  = (mod.nmot != null) ? +mod.nmot : DEFAULT_NMOT;
    var g     = stringG(s, Gmin, Gmax, gCache);
    var gmin  = g.gmin, gmax = g.gmax;
    var tcMin = TaMin + (0.97 * nmot - 20) * gmin / 800;
    var tcMax = TaMax + (1.03 * nmot - 20) * gmax / 800;
    var kT    = tcMax > 30 ? Math.sqrt(Math.max(0, 90 - tcMax) / 60) : 1;

    /* Voc at this string's coldest cell temperature */
    var vocCold = ns * mod.voc * (1 + lv / 100 * (tcMin - 25));
    var cabOk   = vocCold < CABLE_VMAX;
    var cabWarn = vocCold >= CABLE_VMAX * 0.95 && vocCold < CABLE_VMAX;

    /* Currents per the course (§14): one string circuit of N_S modules in series
       carries the MODULE currents I_mp-STC / I_sc-STC. np > 1 = np identical cable
       runs; the combined np·I only appears at the MPPT input (fuse/inverter checks). */
    var impStr  = mod.imp;        // I_mp-STC - one circuit
    var iscStr  = mod.isc;        // I_sc-STC - one circuit
    var iscMppt = np * mod.isc;   // combined at the MPPT input
    var vmpS    = ns * mod.vmp;   // N_S · U_mp-STC

    /* S from voltage drop - course relations (15)+(16) rearranged for S at the limit:
       ΔU(%) = 2·R_C·I_mp-STC/(N_S·U_mp-STC)·100, R_C = ρ·l_C/S_C
       → S_VD = 2·ρ·l_C·I_mp-STC·100 / (ΔU%·N_S·U_mp-STC) */
    var S_vd   = (2 * RHO_CU * lenM * impStr * 100) / (dropDC * vmpS);

    /* S from ampacity: Iz · k_T ≥ 1.25 · Isc (k_T = derating at THIS string's Tc,max) */
    var S_amp  = minCrossForAmpacity(AMP_DC, 1.25 * iscStr / kT);

    /* Final: take larger of both, enforce 4 mm² minimum for solar cable */
    var S_min   = Math.max(S_vd, S_amp, 4);
    var S_final = nextStd(STD_CROSS, S_min);
    /* Verify with the chosen section, exactly as the course does it: (16) then (15) */
    var R_C     = RHO_CU * lenM / S_final;                  // (16)
    var dropAct = 2 * R_C * impStr / vmpS * 100;            // (15)

    /* Fuse sizing (IEC 62548 / course formula) */
    var fuseNeeded = np > 1;
    var fuseRating = fuseNeeded ? recommendFuse(mod.isc) : null;
    var Imax       = (np - 1) * mod.isc;

    var modLabel = mod.name || mod.id;
    var sColor = (typeof STR_COLORS !== 'undefined') ? STR_COLORS[idx % STR_COLORS.length] : '';

    html += '<div class="card">';
    html += '<div class="str-hdr">';
    html += '<span class="str-tag"' + (sColor ? ' style="background:' + sColor + '"' : '') + '>S' + (idx + 1) + '</span>';
    html += '<span class="str-mod">' + modLabel + '</span>';
    html += '<span class="str-np">' + ns + ' ser. × ' + np + ' par.</span>';
    html += '</div>';

    /* Cable length input */
    html += '<div class="len-row">';
    html += '<label>' + tr('cx.cablelen') + '</label>';
    html += '<input type="number" class="cx-cable-len" data-sid="' + s.id + '" value="' + lenM + '" min="1" max="500" step="1">';
    html += '<span class="unit">m</span>';
    html += '</div>';

    /* 2×2 result grid — shared .metric cells; tint only when something is wrong */
    var vocClass = cabOk ? (cabWarn ? ' warn' : '') : ' err';
    html += '<div class="res-grid">';

    html += '<div class="metric' + vocClass + '">';
    html += '<div class="metric-val">' + fnum(vocCold) + ' <span style="font-size:12px">V</span></div>';
    html += '<div class="metric-lbl">' + tr('cx.voccold') + ' (T<sub>c,min</sub> ' + f1(tcMin) + '°C)</div>';
    html += '<div class="metric-sub">H1Z2Z2-K: ' + CABLE_VMAX + ' V DC ' + (cabOk ? '✓' : tr('cx.exceeded')) + '</div>';
    html += '</div>';

    html += '<div class="metric">';
    html += '<div class="metric-val">' + f2(impStr) + ' / ' + f2(iscStr) + ' <span style="font-size:12px">A</span></div>';
    html += '<div class="metric-lbl">I<sub>mp-STC</sub> / I<sub>sc-STC</sub></div>';
    html += '<div class="metric-sub">N<sub>S</sub>·U<sub>mp</sub> = ' + f1(vmpS) + ' V' +
            (np > 1 ? ' · ' + fmt('cx.circuits', { n: np }) + ' · MPPT: ' + f2(iscMppt) + ' A' : '') + '</div>';
    html += '</div>';

    html += '<div class="metric">';
    html += '<div class="metric-val">' + S_final + ' <span style="font-size:12px">mm²</span></div>';
    html += '<div class="metric-lbl">' + tr('cx.section') + '</div>';
    html += '<div class="metric-sub">S<sub>VD</sub>=' + f2(S_vd) + ' · S<sub>amp</sub>=' + S_amp + ' mm²' +
            (kT < 1 ? ' · k<sub>T</sub>=' + fnum(kT) + ' @T<sub>c,max</sub> ' + f1(tcMax) + '°C' : '') + '</div>';
    html += '</div>';

    var dropClass = dropAct > dropDC + 0.01 ? ' warn' : '';
    html += '<div class="metric' + dropClass + '">';
    html += '<div class="metric-val">' + f2(dropAct) + ' <span style="font-size:12px">%</span></div>';
    html += '<div class="metric-lbl">' + tr('cx.dropdc_lbl') + '</div>';
    html += '<div class="metric-sub">' + tr('cx.at') + ' ' + S_final + ' mm² · L=' + lenM + ' m</div>';
    html += '</div>';

    html += '</div>'; /* /res-grid */

    /* Fuse verdict */
    if (!fuseNeeded) {
      html += '<div class="fuse-box fuse-none">';
      html += tr('cx.fuse_no');
      html += '<br>' + fmt('cx.fuse_chk', { i: f2(iscMppt) });
      html += '</div>';
    } else {
      html += '<div class="fuse-box fuse-req">';
      html += '<b>' + fmt('cx.fuse_req', { n: np, a: fuseRating }) + '</b><br>';
      html += 'I<sub>max</sub> = I<sub>SC,PV</sub> - I<sub>SC,string</sub> = (' + np + '-1) × ' + f2(mod.isc) + ' = <b>' + f2(Imax) + ' A</b><br>';
      html += '1.25 × I<sub>sc</sub> = ' + f2(mod.isc * 1.25) + ' A ≤ <b>' + fuseRating + ' A</b> ≤ 2.4 × I<sub>sc</sub> = ' + f2(mod.isc * 2.4) + ' A ✓';
      html += '</div>';
    }

    /* ── "Mod explicativ": the working behind each result, live values ── */
    if (learnOn && typeof Explain !== 'undefined') {
      var xp = '';
      if (g.est) {
        xp += Explain.block(
          'G<sub>min</sub> / G<sub>max</sub> (β ' + Math.round(g.tilt) + '° / γ ' + Math.round(g.az) + '°)',
          '<b>' + gmin + ' / ' + gmax + ' W/m²</b>',
          'cxn.g');
      }
      xp += Explain.block(
        'T<sub>c,min</sub> = T<sub>a,min</sub> + (0.97 · NMOT - 20) · G<sub>min</sub> / 800',
        f1(TaMin) + ' + (0.97 × ' + nmot + ' - 20) × ' + gmin + ' / 800 = <b>' + f1(tcMin) + ' °C</b>',
        'cxn.tcmin');
      xp += Explain.block(
        'T<sub>c,max</sub> = T<sub>a,max</sub> + (1.03 · NMOT - 20) · G<sub>max</sub> / 800',
        f1(TaMax) + ' + (1.03 × ' + nmot + ' - 20) × ' + gmax + ' / 800 = <b>' + f1(tcMax) + ' °C</b>',
        'cxn.tcmax');
      xp += Explain.block(
        'V<sub>OC,rece</sub> = n<sub>s</sub> · V<sub>OC</sub> · (1 + λ<sub>V</sub>/100 · (T<sub>c,min</sub> - 25))',
        ns + ' × ' + mod.voc + ' × (1 + (' + lv + '/100) × (' + f1(tcMin) + ' - 25)) = <b>' + fnum(vocCold) + ' V</b>',
        'cxn.voccold');
      xp += Explain.block(
        'S<sub>VD</sub> = 2 · ρ · l<sub>C</sub> · I<sub>mp-STC</sub> · 100 / (ΔU%<sub>max</sub> · N<sub>S</sub> · U<sub>mp-STC</sub>)',
        '2 × ' + RHO_CU + ' × ' + lenM + ' × ' + f2(impStr) + ' × 100 / (' + dropDC + ' × ' + ns + ' × ' + f2(mod.vmp) + ') = <b>' + f2(S_vd) + ' mm²</b>',
        'cxn.svd');
      xp += Explain.block(
        'I<sub>nec</sub> = 1.25 · I<sub>sc-STC</sub> / k<sub>T</sub>',
        '1.25 × ' + f2(iscStr) + ' / ' + fnum(kT) + ' = <b>' + fnum(1.25 * iscStr / kT) + ' A</b> → ' + S_amp + ' mm² (I<sub>z</sub> = ' + AMP_DC[S_amp] + ' A)',
        'cxn.samp');
      xp += Explain.block(
        'R<sub>C</sub> = ρ · l<sub>C</sub> / S<sub>C</sub>',
        RHO_CU + ' × ' + lenM + ' / ' + S_final + ' = <b>' + fnum4(R_C) + ' Ω</b>',
        'cxn.rc');
      xp += Explain.block(
        'ΔU(%) = 2 · R<sub>C</sub> · I<sub>mp-STC</sub> / (N<sub>S</sub> · U<sub>mp-STC</sub>) · 100',
        '2 × ' + fnum4(R_C) + ' × ' + f2(impStr) + ' / (' + ns + ' × ' + f2(mod.vmp) + ') × 100 = <b>' + f2(dropAct) + ' %</b>',
        'cxn.drop');
      if (fuseNeeded) {
        xp += Explain.block(
          'I<sub>max</sub> = (N<sub>p</sub> - 1) · I<sub>sc,mod</sub>',
          '(' + np + ' - 1) × ' + f2(mod.isc) + ' = <b>' + f2(Imax) + ' A</b>',
          'cxn.imax');
      }
      html += '<div class="xpl-host" style="display:block">' + xp + '</div>';
    }

    html += '</div>'; /* /card */
  });

  return html || '<div class="card"><span class="no-data">' + tr('cx.nomodule') + '</span></div>';
}

/* ── Generator-level fault current summary (verbatim) ─────────────────── */
function buildGenHtml(strings) {
  var hasParallel = strings.some(function (s) { return (s.np || 1) > 1; });
  if (!hasParallel) return '';

  var html = '<div class="card"><div class="sec">' + tr('cx.gen_title') + '</div>';
  strings.forEach(function (s, idx) {
    var mod = getModule(s.moduleId);
    if (!mod || (s.np || 1) <= 1) return;
    var np = s.np, Imax = (np - 1) * mod.isc;
    html += '<div class="cx-row">';
    html += '<span class="k">S' + (idx + 1) + ': I<sub>max</sub> = (' + np + '-1) × ' + f2(mod.isc) + ' A</span>';
    html += '<span class="v">' + f2(Imax) + ' A</span>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

/* ── PURE AC sizing, one line per inverter unit ──────────────────────────────
   Lifted out of buildAcHtml so the page can PERSIST what it computes (cable section +
   MCB rating) instead of only rendering it — the Proiect Tehnic quotes those numbers in
   "Soluția propusă pentru racordare" and the parts list uses the MCB rating. Keeping the
   math here (one place) is why the PT does NOT re-derive it.
   One AC cable + MCB per inverter (each inverter has its own run to the board).
   Course relations (17)/(18) 1F, (19)/(20) 3F, cosφ = 1. */
function acLinesFor(comp, ph, mat, lenM, dMax) {
  var units = (typeof resolveInverterUnits === 'function') ? resolveInverterUnits(comp) : [];
  if (!units.length && comp && comp.pacInv) units = [{ pac: comp.pacInv }];   // legacy single-inverter fallback
  var rho    = mat === 'cu' ? RHO_CU_AC : RHO_AL_AC;
  var ampTbl = mat === 'cu' ? AMP_AC_CU : AMP_AC_AL;
  var vRef   = ph === 3 ? 400 : 230, factor = ph === 3 ? 1.732 : 2;
  var lines = units.map(function (u) {
    var pac = u.pac;
    var iac = pac / (ph === 3 ? 1.732 * 400 : 230);
    var S_vd  = (factor * rho * lenM * iac * 100) / (dMax * vRef);
    var S_amp = minCrossForAmpacity(ampTbl, iac);
    var S_final = nextStd(STD_CROSS, Math.max(S_vd, S_amp, 1.5));
    var R_C = rho * lenM / S_final;
    var dropAct = factor * R_C * iac / vRef * 100;
    return { pac: pac, iac: iac, S_vd: S_vd, S_final: S_final, R_C: R_C, dropAct: dropAct, mcb: nextStd(STD_MCB, iac) };
  });
  return { units: units, lines: lines };
}

/* ── AC cable + protection, PER INVERTER (verbatim from legacy renderAC) ── */
function buildAcHtml(comp, ph, mat, lenM, dMax, learnOn) {
  var sized = acLinesFor(comp, ph, mat, lenM, dMax);
  var units = sized.units, lines = sized.lines;
  if (!units.length) {
    return '<p class="no-data" style="margin-top:8px">' + tr('cx.noac') + '</p>';
  }

  var rho    = mat === 'cu' ? RHO_CU_AC : RHO_AL_AC;
  var ampTbl = mat === 'cu' ? AMP_AC_CU : AMP_AC_AL;
  var vRef   = ph === 3 ? 400 : 230, factor = ph === 3 ? 1.732 : 2;
  var multi  = units.length > 1;

  var html = '<div class="res-grid" style="margin-top:8px">';
  lines.forEach(function (L, k) {
    var tag = multi ? '<span style="display:inline-block;font-size:9px;font-weight:700;color:#fff;background:#5b6cff;border-radius:4px;padding:1px 5px;margin-bottom:3px">I' + (k + 1) + '</span><br>' : '';
    html += '<div class="metric">' + tag +
      '<div class="metric-val">' + f1(L.iac) + ' <span style="font-size:12px">A</span></div>' +
      '<div class="metric-lbl">' + tr('cx.ac_current') + (multi ? ' I' + (k + 1) : '') + '</div>' +
      '<div class="metric-sub">' + (ph === 3 ? '3F 400V' : '1F 230V') + ' · P=' + f1(L.pac / 1000) + ' kW</div></div>';
    html += '<div class="metric">' + (multi ? '<span style="visibility:hidden;font-size:9px">I</span><br>' : '') +
      '<div class="metric-val">' + L.S_final + ' <span style="font-size:12px">mm²</span></div>' +
      '<div class="metric-lbl">' + tr('cx.ac_section') + '</div>' +
      '<div class="metric-sub">' + mat.toUpperCase() + ' · S<sub>VD</sub>=' + f2(L.S_vd) + ' mm²</div></div>';
    html += '<div class="metric' + (L.dropAct > dMax + 0.01 ? ' warn' : '') + '">' + (multi ? '<span style="visibility:hidden;font-size:9px">I</span><br>' : '') +
      '<div class="metric-val">' + f2(L.dropAct) + ' <span style="font-size:12px">%</span></div>' +
      '<div class="metric-lbl">' + tr('cx.ac_drop') + '</div>' +
      '<div class="metric-sub">L=' + lenM + ' m · ' + tr('cx.max') + ' ' + dMax + ' %</div></div>';
    html += '<div class="metric">' + (multi ? '<span style="visibility:hidden;font-size:9px">I</span><br>' : '') +
      '<div class="metric-val">' + L.mcb + ' <span style="font-size:12px">A</span></div>' +
      '<div class="metric-lbl">' + tr('cx.mcb') + '</div>' +
      '<div class="metric-sub">' + tr('cx.mcb_sub') + '</div></div>';
  });
  html += '</div>';

  /* ── "Mod explicativ": AC working per inverter, course relations (17)-(20), cosφ = 1 ── */
  if (learnOn && typeof Explain !== 'undefined') {
    var xp = '';
    lines.forEach(function (L, k) {
      var p = multi ? 'I' + (k + 1) + ': ' : '';
      xp += Explain.block(
        p + (ph === 3 ? 'I<sub>inv,ca</sub> = P / (√3 · V)' : 'I<sub>inv,ca</sub> = P / V'),
        Math.round(L.pac) + ' / ' + (ph === 3 ? '(1.732 × 400)' : '230') + ' = <b>' + f1(L.iac) + ' A</b>',
        'cxn.iac');
      xp += Explain.block(
        p + 'S<sub>VD</sub> = ' + (ph === 3 ? '√3' : '2') + ' · ρ · l · I · 100 / (ΔU%<sub>max</sub> · V)',
        fnum(factor) + ' × ' + rho + ' × ' + lenM + ' × ' + f1(L.iac) + ' × 100 / (' + dMax + ' × ' + vRef + ') = <b>' + f2(L.S_vd) + ' mm²</b> → ' + L.S_final + ' mm²',
        'cxn.svd');
      xp += Explain.block(
        p + 'ΔU(%) = ' + (ph === 3 ? '√3' : '2') + ' · R<sub>C</sub> · I / V · 100',
        fnum(factor) + ' × ' + fnum4(L.R_C) + ' × ' + f1(L.iac) + ' / ' + vRef + ' × 100 = <b>' + f2(L.dropAct) + ' %</b> → MCB ' + L.mcb + ' A',
        'cxn.duac');
    });
    html += '<div class="xpl-host" style="display:block">' + xp + '</div>';
  }

  return html;
}

/* ── Compliance accordion item (legacy cxToggle class-flip, React state) ── */
function AccItem({ title, html }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="acc-item">
      <div className="acc-hdr" onClick={() => setOpen(!open)}>
        <span>{title}</span><span>{open ? '▾' : '▸'}</span>
      </div>
      <div className={'acc-body' + (open ? ' open' : '')} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export default function Connections() {
  const { t } = useI18n();
  const { on: learnOn } = useLearn();

  /* reactive reads (legacy read once per page load; SPA reads track the store) */
  const strings = useProject((s) => (Array.isArray(s.strings) ? s.strings : []));
  const comp    = useProject((s) => s.components || {});
  const ss      = useProject((s) => s.stringSizing || {});

  /* §11 site design inputs (ambient °C + irradiance W/m²) — see legacy note */
  const TaMin = ss.tamin != null ? +ss.tamin : DEFAULT_TAMIN;
  const TaMax = ss.tamax != null ? +ss.tamax : DEFAULT_TAMAX;
  const Gmin  = ss.gmin  != null ? +ss.gmin  : DEFAULT_GMIN;
  const Gmax  = ss.gmax  != null ? +ss.gmax  : DEFAULT_GMAX;

  /* init once from state (page remounts on project identity change) */
  const cx0 = Project.section('connections') || {};
  const seededRef = useRef(false);
  const [cables, setCables] = useState(() => {
    /* Normalise to a plain { stringId: oneWayLengthM } object. Legacy/empty state
       was persisted as [] (array) or could carry holes; coerce so lookups + JSON
       are stable. Seed the displayed default so an un-edited step persists its
       cable lengths (legacy renderStrings seeding). */
    const out = {};
    const raw = (Project.section('connections') || {}).cables || {};
    Object.keys(raw).forEach((k) => { if (raw[k] != null) out[k] = +raw[k]; });
    (Project.section('strings') || []).forEach((s) => {
      if (out[s.id] == null) { out[s.id] = CABLE_LEN_DEFAULT; seededRef.current = true; }
    });
    return out;
  });
  const [dropDC, setDropDC] = useState(cx0.dropDC != null ? cx0.dropDC : 1.5);
  const [phases, setPhases] = useState(+(cx0.phases || 1));
  const [matAC, setMatAC]   = useState(cx0.matAC || 'cu');
  const [lenAC, setLenAC]   = useState(cx0.lenAC != null ? cx0.lenAC : 10);
  const [dropAC, setDropAC] = useState(cx0.dropAC != null ? cx0.dropAC : 1.0);

  /* strings added while mounted get the default length too (legacy seeded on render) */
  useEffect(() => {
    const missing = strings.filter((s) => cables[s.id] == null);
    if (missing.length) {
      const next = { ...cables };
      missing.forEach((s) => { next[s.id] = CABLE_LEN_DEFAULT; });
      setCables(next);
    }
  }, [strings]);  // eslint-disable-line react-hooks/exhaustive-deps

  /* persist — SAME payload as the legacy saveState(); skip the untouched first
     render UNLESS the mount seeded default cable lengths (legacy saved those) */
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; if (!seededRef.current) return; }
    Project.patch('connections', {
      cables: { ...cables },
      dropDC: +dropDC,
      phases: +phases,
      matAC,
      lenAC: +lenAC,
      dropAC: +dropAC,
    });
  }, [JSON.stringify(cables), dropDC, phases, matAC, lenAC, dropAC]);  // eslint-disable-line react-hooks/exhaustive-deps

  /* Persist the COMPUTED AC sizing (section + MCB per inverter) — same idea as the mounting
     step saving its derived pitch/rows, so the Proiect Tehnic ("Soluția propusă pentru
     racordare") and the parts list can quote real numbers without re-deriving the math.
     Deliberately SEPARATE from the input persist above and WITHOUT its first-render skip:
     these must be written even when the engineer only opens this step and changes nothing.
     The deep-equality guard stops the patch→re-render→patch loop. */
  useEffect(() => {
    const ac = acLinesFor(comp, +phases, matAC, +lenAC || 10, +dropAC || 1.0).lines
      .map((L) => ({ pac: L.pac, iac: L.iac, section: L.S_final, mcb: L.mcb, drop: L.dropAct }));
    const prev = (Project.section('connections') || {}).ac || [];
    if (JSON.stringify(prev) !== JSON.stringify(ac)) Project.patch('connections', { ac });
  }, [JSON.stringify(comp.inverters), comp.inverterId, comp.pacInv, phases, matAC, lenAC, dropAC]);  // eslint-disable-line react-hooks/exhaustive-deps

  /* Done once there is at least one sized string to cable (legacy trigger). */
  useEffect(() => {
    if (strings.length && !Project.isDone('connections')) Project.markDone('connections');
  }, [strings.length]);

  /* per-string G memo — per mount (location can change between visits) */
  const gCache = useRef({}).current;

  const stringsHtml = buildStringsHtml(strings, cables, +dropDC || 1.5, TaMin, TaMax, Gmin, Gmax, gCache, learnOn);
  const genHtml     = buildGenHtml(strings);
  const acHtml      = buildAcHtml(comp, +phases, matAC, +lenAC || 10, +dropAC || 1.0, learnOn);

  /* delegated handler for the injected per-string cable-length inputs */
  function onCableInput(e) {
    const inp = e.target.closest ? e.target.closest('.cx-cable-len') : null;
    if (!inp) return;
    setCables({ ...cables, [inp.dataset.sid]: +inp.value });
  }

  return (
    <>
      <div className="sn-crumb"><b>{t('nav.phaseC')}</b> › <span>{t('nav.connections')}</span></div>

      <div className="cx-scroll">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <LearnToggle id="cx-learn" />
        </div>
        <div className="row g-3">

          {/* Left: per-string DC cards + shared DC settings */}
          <div className="col-lg-7">

            <div id="cx-strings" onInput={onCableInput}
                 dangerouslySetInnerHTML={{ __html: stringsHtml }} />

            <div className="card">
              <div className="sec">{t('cx.dc_settings')}</div>
              <div className="field">
                <label>{t('cx.dropdc')}</label>
                <input type="number" id="cx-drop-dc" value={dropDC} min="0.5" max="5" step="0.5"
                       onChange={(e) => setDropDC(e.target.value)} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{t('cx.dcnote')}</div>
            </div>

            <div id="cx-gen-card" dangerouslySetInnerHTML={{ __html: genHtml }} />

          </div>

          {/* Right: AC */}
          <div className="col-lg-5">
            <div className="card">
              <div className="sec">{t('cx.ac_title')}</div>

              <div className="field">
                <label>{t('cx.phases')}</label>
                <div className="cx-seg">
                  <label><input type="radio" name="cx-phases" value="1" checked={+phases === 1}
                                onChange={() => setPhases(1)} /><span>{t('cx.phase1')}</span></label>
                  <label><input type="radio" name="cx-phases" value="3" checked={+phases === 3}
                                onChange={() => setPhases(3)} /><span>{t('cx.phase3')}</span></label>
                </div>
              </div>

              <div className="field">
                <label>{t('cx.acmat')}</label>
                <div className="cx-seg">
                  <label><input type="radio" name="cx-mat-ac" value="cu" checked={matAC === 'cu'}
                                onChange={() => setMatAC('cu')} /><span>{t('cx.cu')}</span></label>
                  <label><input type="radio" name="cx-mat-ac" value="al" checked={matAC === 'al'}
                                onChange={() => setMatAC('al')} /><span>{t('cx.al')}</span></label>
                </div>
              </div>

              <div className="len-row">
                <label>{t('cx.aclen')}</label>
                <input type="number" id="cx-len-ac" value={lenAC} min="1" max="500" step="1"
                       onChange={(e) => setLenAC(e.target.value)} />
                <span className="unit">m</span>
              </div>

              <div className="field">
                <label>{t('cx.dropac')}</label>
                <input type="number" id="cx-drop-ac" value={dropAC} min="0.2" max="3" step="0.1"
                       onChange={(e) => setDropAC(e.target.value)} />
              </div>

              <div id="cx-ac-results" dangerouslySetInnerHTML={{ __html: acHtml }} />
            </div>
          </div>
        </div>

        {/* compliance accordion — bodies are HTML i18n values (legacy data-i18n-html) */}
        <div style={{ marginTop: 12 }}>
          <AccItem title={t('nav.earthing')}   html={t('cx.acc_earthing')} />
          <AccItem title={t('nav.spd')}        html={t('cx.acc_spd')} />
          <AccItem title={t('nav.disconnect')} html={t('cx.acc_disconnect')} />
          <AccItem title={t('nav.metering')}   html={t('cx.acc_metering')} />
          <AccItem title={t('nav.gridconn')}   html={t('cx.acc_grid')} />
        </div>
      </div>
    </>
  );
}
