/* Protections (step 10) — React port of protections.html: switchgear &
   protection selection per the Neamt course formula (20) — per-string gPV
   fuse/MCB window, fuse-link body pick, DC SPD, DC array disconnect, per-
   inverter AC MCB, shared RCD/AC-SPD, MCB breaking capacity vs Icc. Reads
   strings/components/connections reactively (useProject); design inputs are
   React state persisted to Project.section('protections') on every change
   (identical payload to legacy saveState). The per-string DC cards, DC-gear
   card and AC results stay verbatim HTML-string builders (legacy renderers)
   injected via dangerouslySetInnerHTML; their embedded Explain blocks are
   gated by useLearn (legacy Explain.isOn()). */
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../store/useI18n.js';
import { useProject } from '../store/useProject.js';
import { useLearn } from '../store/useLearn.js';
import { LearnToggle } from '../components/ExplainHost.jsx';
import './Protections.css';

/* ── Standard rating series (legacy IIFE, verbatim) ───────────────────── */
const GPV_FUSE = [4, 6, 8, 10, 12, 15, 16, 20, 25, 30, 32];   // gPV string fuse (A)
const STD_MCB  = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63];     // AC MCB (A)
const DC_UC    = [600, 800, 1000, 1200, 1500];                 // DC SPD Uc steps (V)
const AC_UC    = [275, 320, 350, 385];                         // AC SPD Uc per line (V)

/* gPV fuse-link bodies / holders - IEC 60269-6 consolidated envelope (vendor-neutral,
   typical of Mersen HelioProtection / Eaton Bussmann / DF Electric). Ordered smallest
   to largest: pick the first whose vmax >= Vmax,inv AND imax >= chosen fuse rating.
   imax = the body's top gPV current at that voltage class. Cylindrical = string level,
   NH = combiner/array level. */
const GPV_BODY = [
  { size: '10x38', vmax: 1000, imax: 30,  holder: 'cilindric DIN 10x38' },
  { size: '14x51', vmax: 1000, imax: 50,  holder: 'cilindric DIN 14x51' },   // 1000V max per Mersen/Bussmann/DF/ETI
  { size: '10x85', vmax: 1500, imax: 25,  holder: 'cilindric 1500V 10x85' }, // compact 1500V string fuse
  { size: '14x85', vmax: 1500, imax: 32,  holder: 'cilindric 1500V 14x85' },
  { size: '22x58', vmax: 1500, imax: 63,  holder: 'cilindric 22x58' },       // array / sub-combiner
  { size: 'NH1',   vmax: 1500, imax: 160, holder: 'soclu NH1' },
  { size: 'NH2',   vmax: 1500, imax: 315, holder: 'soclu NH2' },
  { size: 'NH3',   vmax: 1500, imax: 500, holder: 'soclu NH3' },
];
/* NOTE: 14x51 gPV tops out at 1000V with compliant vendors - "1500V" 14x51 holders are sold but
   not standard-backed (IEC 60269-6); for 1500V systems use 10x85 / 14x85. */
/* smallest body that clears both the system voltage (body.vmax >= Vmax,inv) and the fuse current */
function pickBody(vmaxInv, fuseA) {
  for (var i = 0; i < GPV_BODY.length; i++) {
    if (GPV_BODY[i].vmax >= (vmaxInv || 1000) && GPV_BODY[i].imax >= fuseA) return GPV_BODY[i];
  }
  return GPV_BODY[GPV_BODY.length - 1];
}

/* ── Helpers (legacy IIFE, verbatim) ──────────────────────────────────── */
function fnum(v) { return (+v).toFixed(2).replace(/\.?0+$/, ''); }
const f2 = fnum, f1 = fnum;
function tr(k) { return (typeof t === 'function') ? t(k) : k; }
function fmt(key, subs) {
  var s = tr(key);
  Object.keys(subs).forEach(function (k) { s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), subs[k]); });
  return s;
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
function nextStd(arr, minVal) {
  for (var i = 0; i < arr.length; i++) if (arr[i] >= minVal) return arr[i];
  return arr[arr.length - 1];
}
function getModule(id) {
  if (!id || typeof MODULE_LIST === 'undefined') return null;
  for (var i = 0; i < MODULE_LIST.length; i++) if (MODULE_LIST[i].id === id) return MODULE_LIST[i];
  return null;
}
function getInverter(id) {
  if (!id || typeof INVERTER_LIST === 'undefined') return null;
  for (var i = 0; i < INVERTER_LIST.length; i++) if (INVERTER_LIST[i].id === id) return INVERTER_LIST[i];
  return null;
}
function strColor(idx) { return (typeof STR_COLORS !== 'undefined') ? STR_COLORS[idx % STR_COLORS.length] : '#888'; }

/* ── PURE per-string DC protection selection (course relation (20)) ──────────
   Lifted out of the render loop so the page can PERSIST what it selects
   (`protections.dc`) — the Proiect Tehnic "Protecții" chapter quotes the window
   bounds, the chosen gPV fuse and the verdict instead of re-deriving them, and the
   parts list can carry the fuse rating. Same single-source-of-truth pattern as
   acLinesFor() in Connections.jsx and sizeString() in string-ui.js.
     max(Isc-STC ; 1.25·Imp-STC) <= Inf <= min(2·Isc-STC ; IprodFV ; IprodInv)
   IprodFV = module max series fuse (mod.maxfuse, from the datasheet DB) unless the
   design card overrides it; IprodInv is manual-only. */
function dcProtectionFor(mod, s, inp, Vmax) {
  var np  = s.np || 1;
  var ns  = s.ns || (s.count ? Math.max(1, Math.round(s.count / np)) : 1);
  var Isc = +mod.isc, Imp = +mod.imp;
  var fvVal  = (inp.iprodFV > 0) ? inp.iprodFV : (+mod.maxfuse > 0 ? +mod.maxfuse : 0);
  var fvAuto = !(inp.iprodFV > 0) && +mod.maxfuse > 0;      // came from the module DB
  var lo   = Math.max(Isc, 1.25 * Imp);
  var caps = [{ v: 2 * Isc, lbl: '2·I<sub>sc</sub>' }];
  if (fvVal > 0)        caps.push({ v: fvVal,        lbl: 'I<sub>prod,FV</sub>' });
  if (inp.iprodInv > 0) caps.push({ v: inp.iprodInv, lbl: 'I<sub>prod,inv</sub>' });
  var hiCap = caps.reduce(function (a, b) { return b.v < a.v ? b : a; });
  var fuse  = pickFuse(lo, hiCap.v);
  return {
    ns: ns, np: np, isc: Isc, imp: Imp,
    fvVal: fvVal, fvAuto: fvAuto, lo: lo, hi: hiCap.v, hiLbl: hiCap.lbl, caps: caps,
    fuse: fuse,
    inWin: fuse >= lo && fuse <= hiCap.v,
    required: np >= 2,                    // reverse fault current only with >=2 parallel strings
    iscMppt: np * Isc,
    ucDc: Vmax ? nextStd(DC_UC, Vmax) : null,   // DC SPD Uc >= highest inverter Vmax
  };
}

/* gPV fuse in the formula-(20) window [lo, hi]; smallest standard ≥ lo within window. */
function pickFuse(lo, hi) {
  for (var i = 0; i < GPV_FUSE.length; i++) if (GPV_FUSE[i] >= lo && GPV_FUSE[i] <= hi) return GPV_FUSE[i];
  return nextStd(GPV_FUSE, lo);   // window too tight → smallest above the lower bound (flag)
}

/* null when the field is blank (so the optional datasheet caps stay "not set") */
function numOrNull(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }

export default function Protections() {
  const { t } = useI18n();
  const { on: learnOn } = useLearn();

  /* ── Project state (reactive — legacy read these once at load) ──────── */
  const comp    = useProject((s) => s.components  || {});
  const strings = useProject((s) => s.strings     || []);
  const cx      = useProject((s) => s.connections || {});

  const invUnits = (typeof resolveInverterUnits === 'function') ? resolveInverterUnits(comp) : (getInverter(comp.inverterId) ? [getInverter(comp.inverterId)] : []);
  const inv      = invUnits[0] || getInverter(comp.inverterId);   // representative (DC gear, schematic)
  const Vmax     = invUnits.length ? Math.max.apply(null, invUnits.map(function (u) { return +u.vinvmax || 0; })) : (inv ? +inv.vinvmax : 0);  // DC gear Un ≥ highest inverter Vmax
  const phases   = +(cx.phases || 1);          // set in step 9 (Connections)
  const pacW     = comp.pacInv || (inv ? inv.pac : 0);

  /* ── Design inputs — seeded once from saved state (legacy seed block) ── */
  const px = Project.section('protections') || {};
  const [icc, setIcc]                   = useState(px.iccKA   != null ? px.iccKA   : 6);
  const [distDC, setDistDC]             = useState(px.distDC  != null ? px.distDC  : 5);
  const [distAC, setDistAC]             = useState(px.distAC  != null ? px.distAC  : 5);
  const [iprodFV, setIprodFV]           = useState(px.iprodFV  != null ? px.iprodFV  : '');
  const [iprodInv, setIprodInv]         = useState(px.iprodInv != null ? px.iprodInv : '');
  const [bodyOverride, setBodyOverride] = useState(px.bodyOverride || '');
  const [net, setNet]                   = useState(px.net || 'tns');
  const [acc, setAcc]                   = useState({});   // compliance accordion open state

  /* mirrors legacy readInputs() exactly */
  const inp = {
    iccKA:    +icc || 6,
    distDC:   +distDC,
    distAC:   +distAC,
    iprodFV:  numOrNull(iprodFV),
    iprodInv: numOrNull(iprodInv),
    bodyOverride: bodyOverride || '',
    net:      net,
  };

  /* persist on every input change (skip mount — legacy saved only on events) */
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    Project.patch('protections', { ...inp });   // exact legacy saveState payload
  }, [icc, distDC, distAC, iprodFV, iprodInv, bodyOverride, net]);  // eslint-disable-line react-hooks/exhaustive-deps

  /* Persist the COMPUTED per-string DC protection selection so the Proiect Tehnic
     ("Protecții" chapter) and the parts list can quote the formula-(20) window, the
     chosen gPV fuse and the verdict without re-deriving them. Written on every visit
     (no first-render skip) since the document needs them even if nothing is edited;
     the deep-equality guard stops a patch→re-render→patch loop. */
  useEffect(() => {
    const dc = strings.map((s, i) => {
      const mod = getModule(s.moduleId);
      if (!mod) return null;
      const P = dcProtectionFor(mod, s, inp, Vmax);
      return { id: s.id != null ? s.id : i, label: 'S' + (i + 1), ns: P.ns, np: P.np,
               isc: P.isc, imp: P.imp, lo: P.lo, hi: P.hi, fuse: P.fuse,
               inWin: P.inWin, required: P.required, iprodFV: P.fvVal || null, ucDc: P.ucDc };
    }).filter(Boolean);
    const prev = (Project.section('protections') || {}).dc || [];
    if (JSON.stringify(prev) !== JSON.stringify(dc)) Project.patch('protections', { dc });
  }, [JSON.stringify(strings), icc, iprodFV, iprodInv, bodyOverride, Vmax]);  // eslint-disable-line react-hooks/exhaustive-deps

  /* legacy: mark done at render end once strings + inverter exist */
  useEffect(() => {
    if (strings.length && inv && !Project.isDone('protections')) Project.markDone('protections');
  }, [strings.length, inv]);  // eslint-disable-line react-hooks/exhaustive-deps

  /* AC current from an inverter's rated power and the phase count (cosφ = 1). */
  function acCurrentFor(pac) {
    if (!pac) return { iac: 0, vref: phases === 3 ? 400 : 230, vphase: 230 };
    return phases === 3
      ? { iac: pac / (1.732 * 400), vref: 400, vphase: 230 }
      : { iac: pac / 230,           vref: 230, vphase: 230 };
  }

  /* ── DC per-string fuse + SPD cards (legacy renderDCStrings, verbatim) ── */
  function dcStringsHtml() {
    if (!strings.length) {
      return '<div class="card"><span class="no-data">' + tr('px.nostrings') + '</span></div>';
    }
    var html = '';

    strings.forEach(function (s, idx) {
      var mod = getModule(s.moduleId);
      if (!mod) return;
      var np  = s.np || 1;
      var ns  = s.ns || (s.count ? Math.max(1, Math.round(s.count / np)) : 1);
      var Isc = +mod.isc, Imp = +mod.imp;

      /* Course formula (20):
         max(Isc-STC ; 1.25·Imp-STC) ≤ Inf ≤ min(2·Isc-STC ; IprodFV ; IprodInv)
         IprodFV = the module's max series fuse (mod.maxfuse, auto from the datasheet DB when
         present); the manual design-card input overrides it. IprodInv (inverter max fuse) is a
         datasheet value, manual only. The binding upper term = the smallest of the ones we have. */
      /* selection math lives in the shared dcProtectionFor() above — do NOT re-implement it */
      var P = dcProtectionFor(mod, s, inp, Vmax);
      var fvVal = P.fvVal, fvAuto = P.fvAuto, lo = P.lo, caps = P.caps;
      var hiCap = { v: P.hi, lbl: P.hiLbl }, hi = P.hi;
      var fuse = P.fuse, inWin = P.inWin, required = P.required, iscMppt = P.iscMppt;
      /* fuse-link body/holder: manual override (design card) else auto pick by voltage + current */
      var ovr = null;
      for (var bi = 0; inp.bodyOverride && bi < GPV_BODY.length; bi++) if (GPV_BODY[bi].size === inp.bodyOverride) ovr = GPV_BODY[bi];
      var body = ovr || pickBody(Vmax, fuse);
      var bodyUnder = ovr && (ovr.vmax < (Vmax || 1000) || ovr.imax < fuse);   // override is under-rated
      var bodyHtml = fmt('px.fuse_body', { size: body.size, v: body.vmax })
        + (ovr ? ' <span style="opacity:.6">(' + tr('px.body_manual') + ')</span>' : '')
        + (bodyUnder ? ' <b style="color:#e0533c">' + tr('px.body_under') + '</b>' : '');

      /* DC SPD: Type 2, Uc ≥ Vmax, In ≥ 10 kA (8/20 µs), Up as low as possible. */
      var ucDc = Vmax ? nextStd(DC_UC, Vmax) : null;

      var sColor = strColor(idx);
      html += '<div class="card">';
      html += '<div class="str-hdr">';
      html += '<span class="str-tag" style="background:' + sColor + '">S' + (idx + 1) + '</span>';
      html += '<span class="str-mod">' + esc(mod.name || mod.id) + '</span>';
      html += '<span class="str-np">' + ns + ' ser. × ' + np + ' par.</span>';
      html += '</div>';

      html += '<div class="res-grid">';

      /* fuse rating cell */
      var fuseClass = required ? (inWin ? '' : ' warn') : '';
      html += '<div class="metric' + fuseClass + '">';
      html += '<div class="metric-val">' + (required ? 'gPV ' + fuse : '-') + (required ? ' <span style="font-size:12px">A</span>' : '') + '</div>';
      html += '<div class="metric-lbl">' + tr('px.fuse_lbl') + '</div>';
      html += '<div class="metric-sub">' + (required
                ? fmt('px.fuse_win', { lo: f2(lo), hi: f2(hi) })
                : tr('px.fuse_notreq')) + '</div>';
      html += '</div>';

      /* fuse nominal voltage cell */
      html += '<div class="metric">';
      html += '<div class="metric-val">' + (Vmax ? '≥ ' + Vmax : '-') + (Vmax ? ' <span style="font-size:12px">V</span>' : '') + '</div>';
      html += '<div class="metric-lbl">U<sub>n</sub> ' + tr('px.fuse_un') + '</div>';
      html += '<div class="metric-sub">U<sub>n</sub> ≥ V<sub>max,inv</sub>' + (Vmax ? '' : ' (' + tr('px.noinv_short') + ')') + '</div>';
      html += '</div>';

      /* DC SPD cell */
      html += '<div class="metric">';
      html += '<div class="metric-val">' + (ucDc ? 'Uc ' + ucDc : 'SPD') + (ucDc ? ' <span style="font-size:12px">V</span>' : '') + '</div>';
      html += '<div class="metric-lbl">' + tr('px.spd_lbl') + '</div>';
      html += '<div class="metric-sub">' + tr('px.spd_dc_sub') + '</div>';
      html += '</div>';

      /* I_sc at MPPT cell */
      html += '<div class="metric">';
      html += '<div class="metric-val">' + f2(iscMppt) + ' <span style="font-size:12px">A</span></div>';
      html += '<div class="metric-lbl">I<sub>sc</sub> ' + tr('px.at_mppt') + '</div>';
      html += '<div class="metric-sub">' + (np > 1 ? np + ' × ' + f2(Isc) + ' A' : '1 × ' + f2(Isc) + ' A') + '</div>';
      html += '</div>';

      html += '</div>'; /* /res-grid */

      /* verdict */
      if (required) {
        html += '<div class="v-box ' + (inWin ? 'v-ok' : 'v-warn') + '">';
        html += '<b>gPV ' + fuse + ' A</b> · ';
        html += fmt('px.fuse_chk', { lo: f2(lo), f: fuse, hi: f2(hi), bound: hiCap.lbl });
        html += inWin ? ' ✓' : '<br>' + tr('px.fuse_outwin');
        html += '<br>' + bodyHtml;
        html += '<br>' + fmt('px.fuse_mfr', { ds: esc(mod.datasheet || '') });
        html += '</div>';
      } else {
        html += '<div class="v-box v-info">' + tr('px.fuse_single') +
                '<br>' + bodyHtml + '</div>';
      }

      /* explain */
      if (typeof Explain !== 'undefined' && learnOn) {
        var xp = '';
        /* full min() substitution: 2·Isc always; Iprod,FV from the module DB (auto) or the
           manual input shown with its value, else muted "(datasheet)" so the formula reads
           complete; Iprod,inv from the manual input or muted */
        var dsMark = ' <span style="opacity:.55">' + tr('px.dsmark') + '</span>';
        var autoMark = ' <span style="opacity:.55">' + tr('px.automark') + '</span>';
        var minHtml = '2×' + f2(Isc) + ' = ' + f2(2 * Isc)
          + ' ; ' + (fvVal > 0       ? 'I<sub>prod,FV</sub> = ' + f2(fvVal) + (fvAuto ? autoMark : '') : 'I<sub>prod,FV</sub>' + dsMark)
          + ' ; ' + (inp.iprodInv > 0 ? 'I<sub>prod,inv</sub> = ' + f2(inp.iprodInv) : 'I<sub>prod,inv</sub>' + dsMark);
        xp += Explain.block(
          'max(I<sub>sc</sub> ; 1.25·I<sub>mp</sub>) ≤ I<sub>nf</sub> ≤ min(2·I<sub>sc</sub> ; I<sub>prod,FV</sub> ; I<sub>prod,inv</sub>)',
          'max(' + f2(Isc) + ' ; ' + f2(1.25 * Imp) + ') = <b>' + f2(lo) + ' A</b> ≤ I<sub>nf</sub> ≤ min(' + minHtml + ') = <b>' + f2(hi) + ' A</b> (' + hiCap.lbl + ') → <b>gPV ' + (required ? fuse : '-') + ' A</b>',
          'px.note_fuse');
        xp += Explain.block(
          'U<sub>n,sig</sub> ≥ V<sub>max,inv</sub>',
          (Vmax ? '<b>≥ ' + Vmax + ' V</b>' : '-'),
          'px.note_un');
        xp += Explain.block(
          'SPD tip 2 CC: U<sub>c</sub> ≥ V<sub>max,inv</sub> · I<sub>n</sub> ≥ 10 kA',
          (ucDc ? 'U<sub>c</sub> = <b>' + ucDc + ' V</b>, I<sub>n</sub> ≥ 10 kA' : '-'),
          'px.note_spddc');
        html += '<div class="xpl-host" style="display:block">' + xp + '</div>';
      }

      html += '</div>'; /* /card */
    });

    return html || '<div class="card"><span class="no-data">' + tr('px.nomodule') + '</span></div>';
  }

  /* ── DC array disconnect + SPD-at-inverter rule (legacy renderDCCard) ── */
  function dcCardHtml() {
    if (!strings.length || !inv) return '';

    /* Generator I_sc = Σ np·Isc over strings; disconnect In ≥ 1.25·Isc_gen, Un ≥ Vmax. */
    var iscGen = strings.reduce(function (a, s) {
      var m = getModule(s.moduleId); return a + (m ? (s.np || 1) * +m.isc : 0);
    }, 0);
    var inDisc = 1.25 * iscGen;
    var addSpdInv = inp.distDC > 10;

    var html = '<div class="card"><div class="sec">' + tr('px.dc_sw_title') + '</div>';

    html += '<div class="px-row"><span class="k">' + tr('px.disc_un') + '</span><span class="v">≥ ' + Vmax + ' V</span></div>';
    html += '<div class="px-row"><span class="k">' + tr('px.disc_in') + ' (1.25 · I<sub>sc,gen</sub>)</span><span class="v">≥ ' + f2(inDisc) + ' A</span></div>';
    html += '<div class="px-row"><span class="k">I<sub>sc,gen</sub> = Σ n<sub>p</sub>·I<sub>sc</sub></span><span class="v">' + f2(iscGen) + ' A</span></div>';
    html += '<div class="px-row"><span class="k">' + tr('px.disc_type') + '</span><span class="v">' + tr('px.disc_type_v') + '</span></div>';
    html += '</div>';

    html += '<div class="v-box ' + (addSpdInv ? 'v-warn' : 'v-ok') + '" style="margin-top:0">';
    html += addSpdInv
      ? fmt('px.spd_far', { d: f2(inp.distDC) })
      : fmt('px.spd_near', { d: f2(inp.distDC) });
    html += '</div>';

    return html;
  }

  /* ── AC protection: per-inverter MCB (each unit has its own AC line) + shared RCD + SPD
     (legacy renderAC, verbatim) ── */
  function acHtml() {
    var units = invUnits.length ? invUnits : (inv ? [inv] : []);
    if (!units.length) return '<span class="no-data">' + tr('px.noinv') + '</span>';
    var ac0 = acCurrentFor(units[0].pac || pacW);               // for the shared SPD Uc (phase voltage)
    var iccA  = inp.iccKA * 1000;
    var addSpdAc = inp.distAC > 10;
    var ucAc  = nextStd(AC_UC, 1.1 * ac0.vphase);               // Uc ≥ 1.1·Vphase
    var rcdType = (inp.net === 'tt') ? 'A (≤ 30 mA)' : 'A';
    var multi = units.length > 1;

    var html = '<div class="res-grid">';

    /* one I_inv,ca + MCB pair per inverter (each inverter feeds its own AC circuit) */
    units.forEach(function (u, k) {
      var pac = u.pac || pacW;
      var iac = acCurrentFor(pac).iac;
      var mcb = nextStd(STD_MCB, iac);
      var brkOk = mcb >= iac;
      var tag = multi ? '<span class="px-itag" style="display:inline-block;font-size:9px;font-weight:700;color:#fff;background:#5b6cff;border-radius:4px;padding:1px 5px;margin-bottom:3px">I' + (k + 1) + '</span><br>' : '';
      html += '<div class="metric">' + tag +
        '<div class="metric-val">' + mcb + ' <span style="font-size:12px">A</span></div>' +
        '<div class="metric-lbl">MCB ' + (multi ? 'I' + (k + 1) + ' ' : '') + '(' + tr('px.curve') + ' B/C)</div>' +
        '<div class="metric-sub">I<sub>inv,ca</sub> ' + f1(iac) + ' A · ' + f1(pac / 1000) + ' kW · I<sub>n</sub> ≥ I<sub>inv,ca</sub> ' + (brkOk ? '✓' : '!') + '</div>' +
      '</div>';
    });

    html += '<div class="metric">';
    html += '<div class="metric-val">' + tr('px.rcd_type') + ' ' + rcdType + '</div>';
    html += '<div class="metric-lbl">' + tr('px.rcd_lbl') + '</div>';
    html += '<div class="metric-sub">' + tr('px.rcd_sub') + '</div>';
    html += '</div>';

    html += '<div class="metric">';
    html += '<div class="metric-val">Uc ' + ucAc + ' <span style="font-size:12px">V</span></div>';
    html += '<div class="metric-lbl">' + tr('px.spd_ac_lbl') + '</div>';
    html += '<div class="metric-sub">' + (addSpdAc ? tr('px.spd_ac_req') : tr('px.spd_ac_bmp')) + '</div>';
    html += '</div>';

    html += '</div>'; /* /res-grid */

    /* MCB breaking-capacity verdict against I_cc at the connection point */
    html += '<div class="v-box ' + (inp.iccKA <= 6 ? 'v-ok' : 'v-warn') + '" style="margin-bottom:0">';
    html += fmt('px.mcb_brk', { icc: f2(inp.iccKA), icn: (inp.iccKA <= 6 ? 6 : 10) });
    html += '</div>';

    if (typeof Explain !== 'undefined' && learnOn) {
      var xp = '';
      var div = phases === 3 ? '(1.732 × 400)' : '230';
      units.forEach(function (u, k) {
        var pac = u.pac || pacW, iac = acCurrentFor(pac).iac, mcb = nextStd(STD_MCB, iac);
        xp += Explain.block(
          (multi ? 'I' + (k + 1) + ': ' : '') + (phases === 3 ? 'I<sub>inv,ca</sub> = P / (√3 · 400)' : 'I<sub>inv,ca</sub> = P / 230'),
          Math.round(pac) + ' / ' + div + ' = <b>' + f1(iac) + ' A</b> → MCB I<sub>n</sub> = <b>' + mcb + ' A</b> ≥ ' + f1(iac) + ' A ✓',
          'px.note_iac');
      });
      xp += Explain.block(
        'SPD tip 2 CA: U<sub>c</sub> ≥ 1.1 · V<sub>inv,ca</sub>',
        '1.1 × ' + ac0.vphase + ' = ' + f2(1.1 * ac0.vphase) + ' → U<sub>c</sub> = <b>' + ucAc + ' V</b>, I<sub>n</sub> ≥ max(10 kA ; ' + f2(inp.iccKA) + ' kA)',
        'px.note_spdac');
      html += '<div class="xpl-host" style="display:block">' + xp + '</div>';
    }

    return html;
  }

  /* compliance accordion item (legacy pxToggle → React open-state) */
  const accItem = (key, title, bodyKey) => (
    <div className="acc-item">
      <div className="acc-hdr" onClick={() => setAcc((a) => ({ ...a, [key]: !a[key] }))}>
        <span>{title}</span><span>{acc[key] ? '▾' : '▸'}</span>
      </div>
      <div className={'acc-body' + (acc[key] ? ' open' : '')}
           dangerouslySetInnerHTML={{ __html: t(bodyKey) }} />
    </div>
  );

  return (
    <>
      <div className="sn-crumb"><b>{t('nav.phaseC')}</b> › <span>{t('nav.protections')}</span></div>

      <div className="px-scroll">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <LearnToggle id="px-learn" />
        </div>

        <div className="row g-3">

          {/* Left: DC protection */}
          <div className="col-lg-7">
            <div id="px-strings" dangerouslySetInnerHTML={{ __html: dcStringsHtml() }} />
            <div id="px-dc-card" dangerouslySetInnerHTML={{ __html: dcCardHtml() }} />
          </div>

          {/* Right: design inputs + AC protection */}
          <div className="col-lg-5">

            <div className="card">
              <div className="sec">{t('px.inputs_title')}</div>

              <div className="field">
                <label>{t('px.network')}</label>
                <div className="px-seg">
                  <label><input type="radio" name="px-net" value="tns" checked={net === 'tns'}
                                onChange={() => setNet('tns')} /><span>TN-S</span></label>
                  <label><input type="radio" name="px-net" value="tncs" checked={net === 'tncs'}
                                onChange={() => setNet('tncs')} /><span>TN-C-S</span></label>
                  <label><input type="radio" name="px-net" value="tt" checked={net === 'tt'}
                                onChange={() => setNet('tt')} /><span>TT</span></label>
                </div>
              </div>

              <div className="field-row">
                <label>{t('px.icc')}</label>
                <input type="number" id="px-icc" value={icc} min="1" max="50" step="0.5"
                       onChange={(e) => setIcc(e.target.value)} />
                <span className="unit">kA</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: -4, marginBottom: 10 }}>
                {t('px.icc_note')}
              </div>
              <div className="field-row">
                <label>{t('px.distdc')}</label>
                <input type="number" id="px-distdc" value={distDC} min="0" max="100" step="1"
                       onChange={(e) => setDistDC(e.target.value)} />
                <span className="unit">m</span>
              </div>
              <div className="field-row">
                <label>{t('px.distac')}</label>
                <input type="number" id="px-distac" value={distAC} min="0" max="200" step="1"
                       onChange={(e) => setDistAC(e.target.value)} />
                <span className="unit">m</span>
              </div>
              <div className="field-row">
                <label>{t('px.iprodfv')}</label>
                <input type="number" id="px-iprodfv" placeholder="-" min="0" max="100" step="1"
                       value={iprodFV} onChange={(e) => setIprodFV(e.target.value)} />
                <span className="unit">A</span>
              </div>
              <div className="field-row">
                <label>{t('px.iprodinv')}</label>
                <input type="number" id="px-iprodinv" placeholder="-" min="0" max="100" step="1"
                       value={iprodInv} onChange={(e) => setIprodInv(e.target.value)} />
                <span className="unit">A</span>
              </div>
              <div className="field">
                <label>{t('px.body_label')}</label>
                <select id="px-body" className="px-bodysel" value={bodyOverride}
                        onChange={(e) => setBodyOverride(e.target.value)}>
                  <option value="">{t('px.body_auto')}</option>
                  {GPV_BODY.map((b) => (
                    <option key={b.size} value={b.size}>{b.size + ' · ' + b.vmax + ' V (≤' + b.imax + ' A)'}</option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                {t('px.phasenote')}
              </div>
            </div>

            <div className="card">
              <div className="sec">{t('px.ac_title')}</div>
              <div id="px-ac-results" dangerouslySetInnerHTML={{ __html: acHtml() }} />
            </div>

          </div>
        </div>

        {/* compliance accordion */}
        <div style={{ marginTop: 12 }}>
          {accItem('dc',  t('px.acc_dc_t'), 'px.acc_dc')}
          {accItem('ac',  t('px.acc_ac_t'), 'px.acc_ac')}
          {accItem('spd', t('nav.spd'),     'px.acc_spd')}
        </div>
      </div>
    </>
  );
}
