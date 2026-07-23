/* Economics (step 11) — React port of economics.html using the LEGACY-DRIVER
   pattern: the page's calc/render pipeline is inherently DOM-driven (readNum by
   id everywhere, currency switches FX-convert field VALUES in place, C_FV is
   recomputed INTO its field), so the entire IIFE is transplanted verbatim into
   a mount effect that owns the DOM below the React-rendered skeleton. React
   owns: layout/labels (t()), the learn toggle, re-render on language/theme
   switches, chart destruction on unmount. Persistence/markDone stay identical
   to legacy (persist() at the end of every render()). */
import { useEffect, useRef } from 'react';
import { useI18n } from '../store/useI18n.js';
import { useTheme } from '../store/useTheme.js';
import { useLearn, setLearn } from '../store/useLearn.js';
import './Economics.css';

export default function Economics() {
  const { t, lang } = useI18n();
  const { dark } = useTheme();
  const { on: learnOn } = useLearn();
  const api = useRef(null);   // { render, destroy } from the transplanted engine

  useEffect(() => {
    api.current = setupEconomics();   // full legacy init (prefill + dropdowns + first render + markDone)
    return () => { api.current && api.current.destroy(); api.current = null; };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  /* language / theme / learn-mode changes → legacy re-render (its output caches translated text) */
  useEffect(() => { api.current && api.current.render(); }, [lang, dark, learnOn]);

  const F = ({ lblKey, children, id, style }) => (
    <div className="eco-field" id={id} style={style}>
      <label dangerouslySetInnerHTML={{ __html: t(lblKey) }} />
      {children}
    </div>
  );

  return (
    <>
      <div className="sn-crumb"><b>{t('nav.phaseC')}</b> › <span>{t('nav.economics')}</span></div>
      <div className="eco-scroll">
        <div className="metric-grid" id="eco-metrics" />
        <div id="eco-optnote" className="ratio-box ratio-warn" style={{ display: 'none', marginTop: 10 }} />
        <div className="row g-3" style={{ marginTop: 2 }}>
          {/* ── Inputs ── */}
          <div className="col-lg-5">
            <div className="card">
              <div className="sec">{t('eco.inputs')}</div>
              <div className="eco-grp">
                <div className="lbl">{t('eco.sys')}</div>
                <F lblKey="eco.wpReal"><input type="number" id="eco-wp" step="1" min="0" placeholder="kWh" /></F>
                <F lblKey="eco.wpOptim"><input type="number" id="eco-wpo" step="1" min="0" placeholder="kWh" /></F>
                <F lblKey="eco.wc"><input type="number" id="eco-wc" step="1" min="0" placeholder="kWh" /></F>
              </div>
              <div className="eco-grp">
                <div className="lbl">{t('eco.scTitle')}</div>
                <F lblKey="eco.scMode">
                  <select id="eco-scmode">
                    <option value="rata">{t('eco.scRata')}</option>
                    <option value="lunar">{t('eco.scLunar')}</option>
                    <option value="zinoapte">{t('eco.scZN')}</option>
                    <option value="baterie">{t('eco.scBaterie')}</option>
                  </select>
                </F>
                <F lblKey="eco.scRac" id="eco-rac-row"><input type="number" id="eco-rac" step="5" min="0" max="100" placeholder="40" /></F>
                <F lblKey="eco.scDay" id="eco-dayfrac-row"><input type="number" id="eco-dayfrac" step="5" min="0" max="100" placeholder="35" /></F>
                <F lblKey="eco.scBatt" id="eco-batt-row"><select id="eco-batt" /></F>
                <div className="eco-note" id="eco-sc-note" />
              </div>
              <div className="eco-grp">
                <div className="lbl">{t('eco.costs')}</div>
                <F lblKey="eco.currency">
                  <select id="eco-cur"><option value="RON">lei (RON)</option><option value="EUR">EUR</option><option value="USD">USD</option></select>
                </F>
                <F lblKey="eco.costMode">
                  <select id="eco-costmode">
                    <option value="reference">{t('eco.costRef')}</option>
                    <option value="bom">{t('eco.costBom')}</option>
                  </select>
                </F>
                <F lblKey="eco.eurwp" id="eco-eurwp-row"><input type="number" id="eco-eurwp" step="0.05" min="0" placeholder="1.1" /></F>
                <F lblKey="eco.cfv"><input type="number" id="eco-cfv" step="100" min="0" placeholder="cost" /></F>
                <div className="eco-note" id="eco-cfv-hint" />
                <F lblKey="eco.aprogram"><input type="number" id="eco-aprog" step="100" min="0" placeholder="0" /></F>
              </div>
              <div className="eco-grp">
                <div className="lbl">{t('eco.prices')}</div>
                <F lblKey="eco.country"><select id="eco-country" /></F>
                <F lblKey="eco.e1"><input type="number" id="eco-e1" step="0.01" min="0" placeholder="/kWh" /></F>
                <F lblKey="eco.e2"><input type="number" id="eco-e2" step="0.01" min="0" placeholder="/kWh" /></F>
                <div className="eco-note" id="eco-price-src" />
              </div>
              <div className="eco-grp">
                <div className="lbl">{t('eco.params')}</div>
                <F lblKey="eco.n"><input type="number" id="eco-n" step="1" min="1" max="40" placeholder="25" /></F>
                <F lblKey="eco.rate"><input type="number" id="eco-rate" step="0.1" min="0" placeholder="7" /></F>
              </div>
              <div className="eco-note" dangerouslySetInnerHTML={{ __html: t('eco.cfvNote') }} />
            </div>
          </div>

          {/* ── Results ── */}
          <div className="col-lg-7">
            <div className="card">
              <div className="sec" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t('eco.compare')}</span>
                <label className="xpl-toggle">
                  <input type="checkbox" id="eco-learn" checked={learnOn} onChange={(e) => setLearn(e.target.checked)} />
                  {' '}<span>{t('xpl.learnmode')}</span>
                </label>
              </div>
              <table className="eco-table">
                <thead><tr><th>{t('eco.metric')}</th><th>{t('eco.real')}</th><th>{t('eco.optim')}</th></tr></thead>
                <tbody id="eco-rows" />
              </table>
              <div id="eco-verdict" className="ratio-box ratio-none">{t('eco.need')}</div>
              <div id="eco-explain" className="xpl-host" />
            </div>
            <div className="card">
              <div className="sec">{t('eco.chart')}</div>
              <div style={{ position: 'relative', height: 280 }}>
                <canvas id="eco-chart" role="img" aria-label="Discounted cash flow" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══ Transplanted legacy engine (economics.html inline IIFE, verbatim except:
   window.renderList/saveStep/onThemeChange hooks removed — React drives those;
   Explain.wireToggle removed — the React toggle + useLearn drive re-renders;
   addEventListener wiring unchanged (nodes die with the component). ═══ */
function setupEconomics() {
  'use strict';
  function tr(k) { return (typeof t === 'function') ? t(k) : k; }
  function fnum(v) { return (+v).toFixed(2).replace(/\.?0+$/, ''); }
  function num0(v) { return Math.round(v).toLocaleString(); }
  var CURSYM = { RON: 'lei', EUR: '€', USD: '$' };

  function scaledMonthly(arr, annual) {
    if (!Array.isArray(arr) || arr.length !== 12 || annual == null) return null;
    var s = arr.reduce(function (a, b) { return a + (+b || 0); }, 0);
    if (!(s > 0)) return null;
    var k = annual / s;
    return arr.map(function (v) { return (+v || 0) * k; });
  }
  function selfConsumed(model, wp, wc, o) {
    if (!(wp > 0) || !(wc > 0)) return Math.min(wp || 0, wc || 0);
    o = o || {};
    if (model === 'rata') return Math.min((o.rac != null ? o.rac : 40) / 100 * wp, wc);
    if (model === 'lunar' || model === 'zinoapte') {
      var pm = scaledMonthly(o.prodMonthly, wp), cm = scaledMonthly(o.consMonthly, wc);
      if (pm && cm) {
        var df = model === 'zinoapte' ? (o.dayFrac != null ? o.dayFrac : 35) / 100 : 1;
        var sum = 0; for (var i = 0; i < 12; i++) sum += Math.min(pm[i], cm[i] * df);
        return sum;
      }
      if (model === 'zinoapte') return Math.min(wp, wc * (o.dayFrac != null ? o.dayFrac : 35) / 100);
      return Math.min(wp, wc);
    }
    if (model === 'baterie') {
      var b = o.batt;
      var pmb = scaledMonthly(o.prodMonthly, wp), cmb = scaledMonthly(o.consMonthly, wc);
      var dfb = (o.dayFrac != null ? o.dayFrac : 35) / 100;
      if (b && pmb && cmb) {
        var eff = b.effRt != null ? b.effRt : 0.95;
        var usable = b.kwhUsable || 0;
        var pC = (b.pChargeKw || usable), pD = (b.pDischargeKw || usable);
        var solarH = (typeof ECON_BAT_SOLAR_H !== 'undefined') ? ECON_BAT_SOLAR_H : 5;
        var nightH = (typeof ECON_BAT_NIGHT_H !== 'undefined') ? ECON_BAT_NIGHT_H : 12;
        var MD = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        var sumb = 0, expb = 0;
        for (var j = 0; j < 12; j++) {
          var days = MD[j], pvDay = pmb[j] / days, consDay = cmb[j] / days;
          var dayLoad = consDay * dfb, nightLoad = consDay - dayLoad;
          var direct = Math.min(pvDay, dayLoad);
          var surplus = Math.max(0, pvDay - dayLoad);
          var stored = Math.min(surplus, usable, pC * solarH);
          var delivered = Math.min(stored * eff, nightLoad, pD * nightH);
          sumb += (direct + delivered) * days;
          expb += (surplus - stored) * days;
        }
        if (o.out) o.out.einj = expb;
        return Math.min(sumb, wc);
      }
      if (pmb && cmb) { var sd = 0; for (var q = 0; q < 12; q++) sd += Math.min(pmb[q], cmb[q] * dfb); return sd; }
      return Math.min(wp, wc * dfb);
    }
    return Math.min(wp, wc);
  }
  function benefit(eauto, einj, e1, e2) { return Math.max(0, eauto || 0) * e1 + Math.max(0, einj || 0) * (e2 || 0); }
  function vna(B, I, r, n) { if (r === 0) return B * n - I; return (B / r) * (1 - Math.pow(1 + r, -n)) - I; }
  function payback(I, B) { return B > 0 ? I / B : Infinity; }
  function rir(B, I, n) {
    if (!(B > 0) || I <= 0) return null;
    if (B * n <= I) return null;
    var lo = 0, hi = 1, fhi = vna(B, I, hi, n);
    while (fhi > 0 && hi < 100) { hi *= 2; fhi = vna(B, I, hi, n); }
    if (fhi > 0) return hi;
    for (var k = 0; k < 200; k++) { var mid = (lo + hi) / 2, fm = vna(B, I, mid, n);
      if (Math.abs(fm) < 1e-6) return mid; if (fm > 0) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }

  var FX     = (typeof FX_PER_EUR      !== 'undefined') ? FX_PER_EUR      : { EUR: 1, RON: 4.97, USD: 1.08 };
  var EURWP  = (typeof ECON_EUR_PER_WP !== 'undefined') ? ECON_EUR_PER_WP : 1.1;
  var E2F    = (typeof ECON_E2_FACTOR  !== 'undefined') ? ECON_E2_FACTOR  : 0.5;
  var DEF_N  = (typeof ECON_DEFAULT_N    !== 'undefined') ? ECON_DEFAULT_N    : 20;
  var DEF_R  = (typeof ECON_DEFAULT_RATE !== 'undefined') ? ECON_DEFAULT_RATE : 7;
  var DEF_RAC = (typeof ECON_SELFCONS_RATE !== 'undefined') ? ECON_SELFCONS_RATE : 40;
  var DEF_DAY = (typeof ECON_DAY_FRACTION  !== 'undefined') ? ECON_DAY_FRACTION  : 35;
  var BOM_UPLIFT = (typeof ECON_BOM_UPLIFT !== 'undefined') ? ECON_BOM_UPLIFT : 25;
  var MODS = (typeof MODULE_LIST !== 'undefined') ? MODULE_LIST : [];
  var INVS = (typeof INVERTER_LIST !== 'undefined') ? INVERTER_LIST : [];
  function modById(id){ return MODS.find(function(x){ return x.id === id; }); }
  function invById(id){ return INVS.find(function(x){ return x.id === id; }); }
  function bomEur() {
    var strings = Project.section('strings'); if (!Array.isArray(strings)) strings = [];
    var comp = Project.section('components') || {};
    var mods = strings.reduce(function (a, s) { var m = modById(s.moduleId); return a + (m && m.priceEur != null ? m.priceEur * (s.count || 0) : 0); }, 0);
    var invs = (comp.inverters || []).reduce(function (a, v) { var i = invById(v.inverterId); return a + (i && i.priceEur != null ? i.priceEur : 0); }, 0);
    var bats = (comp.batteries || []).reduce(function (a, v) { var b = battById(v.batteryId); return a + (b && b.priceEur != null ? b.priceEur * (v.count || 1) : 0); }, 0);
    return { mods: mods, invs: invs, bats: bats, equip: mods + invs + bats };
  }
  var PRICES = window.ELECTRICITY_PRICES || {};
  function fxOf(cur)         { return FX[cur] != null ? FX[cur] : 1; }
  function priceEur(cc)      { var p = PRICES[cc]; return (p && p.eur_kwh != null) ? +p.eur_kwh : null; }
  function priceCur(cc, cur) { var e = priceEur(cc); return e == null ? null : +(e * fxOf(cur)).toFixed(2); }

  var eco  = Project.section('economics')  || {};
  var cons = Project.section('consumption') || {};
  var sz   = Project.section('sizing')      || {};
  var comp = Project.section('components')  || {};
  var loc  = Project.section('location')    || {};

  function resolveKwp() {
    if (sz.pvgisKwp != null) return +sz.pvgisKwp;
    if (comp.pfvW != null) return comp.pfvW / 1000;
    var strs = Project.section('strings'); if (!Array.isArray(strs)) return null;
    var w = strs.reduce(function (a, s) { var m = modById(s.moduleId); return a + (m && m.pmax ? m.pmax * (s.count || 0) : 0); }, 0);
    return w > 0 ? w / 1000 : null;
  }
  var sysKwp = resolveKwp();

  var currency = eco.currency || 'RON';
  var country  = eco.country  || loc.countryCode || 'RO';
  var eurPerWp = eco.eurPerWp != null ? +eco.eurPerWp : EURWP;
  var defE1    = eco.e1  != null ? eco.e1  : priceCur(country, currency);
  var defE2    = eco.e2  != null ? eco.e2  : (defE1 != null ? +(E2F * defE1).toFixed(2) : null);
  var defCfv   = eco.cfv != null ? eco.cfv : (sysKwp != null ? Math.round(eurPerWp * sysKwp * 1000 * fxOf(currency)) : null);

  (function () {
    var sel = document.getElementById('eco-country');
    Object.keys(PRICES).sort().forEach(function (cc) {
      var o = document.createElement('option');
      o.value = cc;
      o.textContent = cc + (priceEur(cc) != null ? ' (' + priceEur(cc).toFixed(3) + ' €/kWh)' : '');
      sel.appendChild(o);
    });
    if (!PRICES[country]) { var o = document.createElement('option'); o.value = country; o.textContent = country; sel.appendChild(o); }
    sel.value = country;
  })();

  var BATTS = (typeof BATTERY_LIST !== 'undefined') ? BATTERY_LIST : [];
  function battById(id) { return id ? (BATTS.filter(function (b) { return b.id === id; })[0] || null) : null; }
  (function () {
    var sel = document.getElementById('eco-batt');
    sel.innerHTML = '<option value="">' + tr('eco.scBattNone') + '</option>' +
      BATTS.map(function (b) { return '<option value="' + b.id + '">' + b.name + ' (' + fnum(b.kwhUsable) + ' kWh)</option>'; }).join('');
    var pick = eco.battId || comp.batteryId || '';
    if (pick && BATTS.some(function (b) { return b.id === pick; })) sel.value = pick;
  })();

  function pre(id, val) { if (val != null && val !== '') document.getElementById(id).value = val; }
  pre('eco-wp',   sz.annualProdKwh  != null ? Math.round(sz.annualProdKwh)  : (eco.wProdReal != null ? eco.wProdReal : ''));
  pre('eco-wpo',  sz.optimalProdKwh != null ? Math.round(sz.optimalProdKwh) : '');
  pre('eco-wc',   cons.annualKwh    != null ? Math.round(cons.annualKwh)    : (eco.wConsum   != null ? eco.wConsum   : ''));
  pre('eco-eurwp', eurPerWp);
  pre('eco-cfv',  defCfv);
  document.getElementById('eco-costmode').value = eco.costMode || 'reference';
  pre('eco-aprog', eco.aprogram);
  pre('eco-e1',   defE1);
  pre('eco-e2',   defE2);
  pre('eco-n',    eco.n    != null ? eco.n    : DEF_N);
  pre('eco-rate', eco.rate != null ? eco.rate : DEF_R);
  document.getElementById('eco-scmode').value = (eco.scMode && eco.scMode !== 'anual') ? eco.scMode : 'rata';
  pre('eco-rac',     eco.rac     != null ? eco.rac     : DEF_RAC);
  pre('eco-dayfrac', eco.dayFrac != null ? eco.dayFrac : DEF_DAY);
  document.getElementById('eco-cur').value = currency;
  var curPrev = currency;
  if (eco.costMode === 'bom') recomputeCfv();

  function readNum(id) { var v = parseFloat(document.getElementById(id).value); return isFinite(v) ? v : null; }

  function persist() {
    Project.patch('economics', {
      currency: document.getElementById('eco-cur').value,
      country:  document.getElementById('eco-country').value,
      eurPerWp: readNum('eco-eurwp'), costMode: document.getElementById('eco-costmode').value,
      wProdReal: readNum('eco-wp'), wProdOptim: readNum('eco-wpo'), wConsum: readNum('eco-wc'),
      cfv: readNum('eco-cfv'), aprogram: readNum('eco-aprog'),
      e1: readNum('eco-e1'), e2: readNum('eco-e2'),
      n: readNum('eco-n'), rate: readNum('eco-rate'),
      scMode: document.getElementById('eco-scmode').value, rac: readNum('eco-rac'), dayFrac: readNum('eco-dayfrac'),
      battId: document.getElementById('eco-batt').value || null,
    });
  }

  function costMode() { return document.getElementById('eco-costmode').value; }
  function recomputeCfv() {
    var cur = document.getElementById('eco-cur').value;
    if (costMode() === 'bom') {
      var b = bomEur();
      if (b.equip > 0) document.getElementById('eco-cfv').value = Math.round(b.equip * (1 + BOM_UPLIFT / 100) * fxOf(cur));
      return;
    }
    var ewp = readNum('eco-eurwp'), kwp = resolveKwp();
    if (ewp != null && kwp != null) document.getElementById('eco-cfv').value = Math.round(ewp * kwp * 1000 * fxOf(cur));
  }

  function renderPriceNote() {
    var pn = document.getElementById('eco-price-src'); if (!pn) return;
    var cc = document.getElementById('eco-country').value, cur = document.getElementById('eco-cur').value, p = PRICES[cc];
    pn.innerHTML = p
      ? tr('eco.priceSrc') + ': ' + cc + ' ' + p.eur_kwh.toFixed(3) + ' &euro;/kWh (' + (p.src || '') + ' ' + (p.period || '') + ')' +
        (cur !== 'EUR' ? ' &times; ' + fnum(fxOf(cur)) + ' ' + cur + '/&euro;' : '')
      : '';
  }

  function scenario(wp, wc, e1, e2, cfv, aprog, n, r, sc) {
    if (wp == null || wc == null || e1 == null || cfv == null || n == null) return null;
    sc = sc || {};
    var out = {};
    var eauto = selfConsumed(sc.model || 'anual', wp, wc,
      { rac: sc.rac, dayFrac: sc.dayFrac, prodMonthly: sc.prodMonthly, consMonthly: sc.consMonthly, batt: sc.batt, out: out });
    var einj = out.einj != null ? Math.max(0, out.einj) : Math.max(0, wp - eauto);
    var B = benefit(eauto, einj, e1, e2 != null ? e2 : 0);
    var Iprop = cfv, Iprog = cfv - (aprog || 0);
    return {
      B: B, eauto: eauto, einj: einj, scRate: wp > 0 ? eauto / wp : 0,
      trProp: payback(Iprop, B), trProg: payback(Iprog, B),
      rirProp: r != null ? rir(B, Iprop, n) : null, rirProg: r != null ? rir(B, Iprog, n) : null,
      vnaProp: r != null ? vna(B, Iprop, r / 100, n) : null, vnaProg: r != null ? vna(B, Iprog, r / 100, n) : null,
      Iprop: Iprop, Iprog: Iprog,
    };
  }

  var chart = null;
  var dead = false;

  function render() {
    if (dead || !document.getElementById('eco-wp')) return;
    var wp = readNum('eco-wp'), wpo = readNum('eco-wpo'), wc = readNum('eco-wc');
    var e1 = readNum('eco-e1'), e2 = readNum('eco-e2'), cfv = readNum('eco-cfv');
    var aprog = readNum('eco-aprog'), n = readNum('eco-n'), rate = readNum('eco-rate');
    var cur = CURSYM[document.getElementById('eco-cur').value] || '';
    var scMode = document.getElementById('eco-scmode').value;
    var rac = readNum('eco-rac'), dayFrac = readNum('eco-dayfrac');
    var batt = battById(document.getElementById('eco-batt').value);
    document.getElementById('eco-rac-row').style.display     = scMode === 'rata' ? 'flex' : 'none';
    document.getElementById('eco-dayfrac-row').style.display = (scMode === 'zinoapte' || scMode === 'baterie') ? 'flex' : 'none';
    document.getElementById('eco-batt-row').style.display    = scMode === 'baterie' ? 'flex' : 'none';
    var scReal = { model: scMode, rac: rac, dayFrac: dayFrac, batt: batt, prodMonthly: sz.monthlyProd,        consMonthly: cons.monthly };
    var scOpt  = { model: scMode, rac: rac, dayFrac: dayFrac, batt: batt, prodMonthly: sz.optimalMonthlyProd, consMonthly: cons.monthly };
    var real = scenario(wp, wc, e1, e2, cfv, aprog, n, rate, scReal);
    var opt  = wpo != null ? scenario(wpo, wc, e1, e2, cfv, aprog, n, rate, scOpt) : null;

    /* Persist the COMPUTED economics next to the inputs, so the Proiect Tehnic financial
       chapter can quote B / Tr / RIR / VNA without re-deriving them (the self-consumption
       model, the RIR bisection and the NPV live only in this page's closures). Same
       pattern as connections.ac / protections.dc. Deep-equality guarded. */
    (function () {
      if (!real) return;
      var keep = function (x) {
        return x ? { B: x.B, eauto: x.eauto, einj: x.einj, scRate: x.scRate,
                     trProp: isFinite(x.trProp) ? x.trProp : null,
                     trProg: isFinite(x.trProg) ? x.trProg : null,
                     rirProp: x.rirProp, rirProg: x.rirProg,
                     vnaProp: x.vnaProp, vnaProg: x.vnaProg,
                     Iprop: x.Iprop, Iprog: x.Iprog } : null;
      };
      var res = { real: keep(real), optim: keep(opt), n: n, rate: rate,
                  currency: document.getElementById('eco-cur').value };
      var prev = (Project.section('economics') || {}).results;
      if (JSON.stringify(prev) !== JSON.stringify(res)) Project.patch('economics', { results: res });
    })();
    renderScNote(real, scMode, wp, wc);

    var note = document.getElementById('eco-optnote');
    var optComputed = sz.optimalProdKwh != null;
    if (wp != null && wpo == null) { note.style.display = ''; note.innerHTML = tr('eco.optMissing'); }
    else if (wp != null && wpo != null && wpo < wp) { note.style.display = ''; note.innerHTML = tr(optComputed ? 'eco.optBelowEng' : 'eco.optStale'); }
    else { note.style.display = 'none'; }

    var m = document.getElementById('eco-metrics');
    function metric(val, lbl, sub, cls) {
      return '<div class="metric"><div class="metric-val ' + (cls || '') + '">' + val + '</div><div class="metric-lbl">' + lbl + '</div><div class="metric-sub">' + (sub || '') + '</div></div>';
    }
    if (real) {
      var trTxt = isFinite(real.trProp) ? fnum(real.trProp) + ' ' + tr('eco.yrs') : '&infin;';
      var rirTxt = real.rirProp != null ? fnum(real.rirProp * 100) + ' %' : '-';
      var vnaCls = real.vnaProp != null ? (real.vnaProp >= 0 ? 'pos' : 'neg') : '';
      m.innerHTML =
        metric(num0(real.B) + ' <span style="font-size:12px">' + cur + '</span>', tr('eco.benefit'), tr('eco.perYear')) +
        metric(trTxt, tr('eco.paybackOwn'), tr('eco.simple')) +
        metric(rirTxt, tr('eco.rir') + '<span class="metric-full">' + tr('eco.rirFull') + '</span>', tr('eco.ownInv')) +
        metric((real.vnaProp != null ? num0(real.vnaProp) + ' <span style="font-size:12px">' + cur + '</span>' : '-'), tr('eco.npv') + '<span class="metric-full">' + tr('eco.vnaFull') + '</span>', tr('eco.atRate') + (rate != null ? ' ' + fnum(rate) + '%' : ''), vnaCls);
    } else {
      m.innerHTML = metric('-', tr('eco.benefit'), '') + metric('-', tr('eco.paybackOwn'), '') + metric('-', tr('eco.rir'), '') + metric('-', tr('eco.npv'), '');
    }

    function col(s, key) {
      if (!s) return '-';
      switch (key) {
        case 'eauto': return num0(s.eauto) + ' kWh (' + fnum(s.scRate * 100) + '%)';
        case 'B': return num0(s.B) + ' ' + cur;
        case 'trProp': return isFinite(s.trProp) ? fnum(s.trProp) + ' ' + tr('eco.yrs') : '&infin;';
        case 'trProg': return (aprog ? (isFinite(s.trProg) ? fnum(s.trProg) + ' ' + tr('eco.yrs') : '&infin;') : '-');
        case 'rirProp': return s.rirProp != null ? fnum(s.rirProp * 100) + ' %' : '-';
        case 'rirProg': return (aprog ? (s.rirProg != null ? fnum(s.rirProg * 100) + ' %' : '-') : '-');
        case 'vnaProp': return s.vnaProp != null ? num0(s.vnaProp) + ' ' + cur : '-';
      }
      return '-';
    }
    function row(lbl, key, sep) { return '<tr' + (sep ? ' class="sep"' : '') + '><td>' + tr(lbl) + '</td><td>' + col(real, key) + '</td><td>' + col(opt, key) + '</td></tr>'; }
    document.getElementById('eco-rows').innerHTML =
      row('eco.scAuto', 'eauto') +
      row('eco.benefit', 'B') +
      row('eco.paybackOwn', 'trProp', true) +
      row('eco.paybackProg', 'trProg') +
      row('eco.rirOwn', 'rirProp', true) +
      row('eco.rirProg', 'rirProg') +
      row('eco.npvOwn', 'vnaProp', true);

    renderVerdict(real, rate, cur);
    renderChart(real, rate);
    renderExplain(real, { wp: wp, wc: wc, e1: e1, e2: e2, cfv: cfv, aprog: aprog, n: n, rate: rate, cur: cur, scMode: scMode, rac: rac, dayFrac: dayFrac, batt: batt });
    renderPriceNote();
    var mode = costMode();
    var ewRow = document.getElementById('eco-eurwp-row'); if (ewRow) ewRow.style.display = mode === 'bom' ? 'none' : 'flex';
    var hintEl = document.getElementById('eco-cfv-hint');
    if (hintEl) {
      if (mode === 'bom') {
        var b = bomEur();
        var fx = fxOf(document.getElementById('eco-cur').value);
        hintEl.innerHTML = b.equip > 0
          ? tr('eco.bomHint').replace('{mod}', num0(b.mods * fx)).replace('{inv}', num0(b.invs * fx))
              .replace('{bat}', num0(b.bats * fx)).replace('{up}', fnum(BOM_UPLIFT)).replace('{cur}', cur)
          : '<span style="color:#c47d12">' + tr('eco.bomNone') + '</span>';
      } else {
        var ewp = readNum('eco-eurwp'), kwp = resolveKwp();
        hintEl.innerHTML = (ewp != null && kwp != null) ? '(' + fnum(ewp) + ' &euro;/Wp &times; ' + fnum(kwp) + ' kWp)' : '';
      }
    }
    persist();
  }

  function renderVerdict(real, rate, cur) {
    var v = document.getElementById('eco-verdict');
    if (!real) { v.className = 'ratio-box ratio-none'; v.textContent = tr('eco.need'); return; }
    if (rate == null) { v.className = 'ratio-box ratio-none'; v.textContent = tr('eco.needRate'); return; }
    if (real.rirProp == null) { v.className = 'ratio-box ratio-warn'; v.innerHTML = tr('eco.noRecover'); return; }
    var rirPct = real.rirProp * 100, ok = rirPct >= rate;
    v.className = 'ratio-box ' + (ok ? 'ratio-ok' : 'ratio-warn');
    v.innerHTML = '<b>RIR = ' + fnum(rirPct) + ' %</b> ' + (ok ? '&ge;' : '&lt;') + ' ' + tr('eco.mktRate') + ' ' + fnum(rate) + ' % &rarr; ' +
      (ok ? tr('eco.justified') : tr('eco.notJustified'));
  }

  function renderChart(real, rate) {
    if (chart) { chart.destroy(); chart = null; }
    if (!real || rate == null) return;
    var n = readNum('eco-n') || 0, r = rate / 100, B = real.B, I = real.Iprop;
    var labels = [], cum = [], running = -I;
    labels.push('0'); cum.push(Math.round(-I));
    for (var i = 1; i <= n; i++) { running += B / Math.pow(1 + r, i); labels.push(String(i)); cum.push(Math.round(running)); }
    var dark = (typeof isDark === 'function') ? isDark() : false;
    chart = new Chart(document.getElementById('eco-chart'), {
      type: 'line',
      data: { labels: labels, datasets: [{
        label: tr('eco.cumCash'), data: cum, borderColor: '#1a5c2a',
        borderWidth: 2, pointRadius: 0, tension: 0.15,
        segment: { borderColor: function (ctx) { return ctx.p1.parsed.y >= 0 ? '#1a9d4a' : '#e0533c'; } },
      }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false },
          tooltip: { callbacks: { title: function (it) { return tr('eco.year') + ' ' + it[0].label; }, label: function (c) { return c.raw.toLocaleString(); } } } },
        scales: {
          x: { title: { display: true, text: tr('eco.years'), color: dark ? '#aaa' : '#555' }, grid: { color: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }, ticks: { color: dark ? '#aaa' : '#555' } },
          y: { grid: { color: function (c) { return c.tick.value === 0 ? (dark ? '#888' : '#999') : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'); } }, ticks: { color: dark ? '#aaa' : '#555', callback: function (v) { return v.toLocaleString(); } } },
        },
      },
    });
  }

  function renderScNote(real, scMode, wp, wc) {
    var el = document.getElementById('eco-sc-note'); if (!el) return;
    if (!real) { el.innerHTML = ''; return; }
    var hasMonthly = !!(scaledMonthly(sz.monthlyProd, wp) && scaledMonthly(cons.monthly, wc));
    var warn = '';
    if ((scMode === 'lunar' || scMode === 'zinoapte' || scMode === 'baterie') && !hasMonthly) warn = tr('eco.scNoMonthly');
    else if (scMode === 'baterie' && !battById(document.getElementById('eco-batt').value)) warn = tr('eco.scNoBatt');
    el.innerHTML = tr('eco.scAuto') + ': <b>' + num0(real.eauto) + ' kWh</b> (' + fnum(real.scRate * 100) + '%) &middot; ' +
      tr('eco.scInj') + ': ' + num0(real.einj) + ' kWh' +
      (warn ? '<br><span style="color:#c47d12">' + warn + '</span>' : '');
  }

  function renderExplain(real, p) {
    if (typeof Explain === 'undefined') return;
    var xp = '';
    if (real && p.wp != null && p.wc != null && p.e1 != null) {
      var modeF, fL, modeName, modeDesc;
      if (p.scMode === 'lunar') {
        modeF = '&Sigma;<sub>12</sub> min(W<sub>p,m</sub>, W<sub>c,m</sub>)';
        fL = '<b>' + num0(real.eauto) + ' kWh</b> (' + fnum(real.scRate * 100) + '% ' + tr('eco.scOf') + ' W<sub>p</sub>)';
        modeName = 'eco.scLunar'; modeDesc = 'eco.scHelpLunar';
      } else if (p.scMode === 'zinoapte') {
        modeF = '&Sigma;<sub>12</sub> min(W<sub>p,m</sub>, W<sub>c,m</sub>&middot;f<sub>zi</sub>)';
        fL = 'f<sub>zi</sub> = ' + fnum(p.dayFrac != null ? p.dayFrac : 35) + '% &rarr; <b>' + num0(real.eauto) + ' kWh</b> (' + fnum(real.scRate * 100) + '%)';
        modeName = 'eco.scZN'; modeDesc = 'eco.scHelpZN';
      } else if (p.scMode === 'baterie') {
        modeF = 'E<sub>direct</sub> + E<sub>baterie</sub>';
        fL = (p.batt ? p.batt.name + ' &middot; ' + fnum(p.batt.kwhUsable) + ' kWh &middot; &eta; ' + fnum((p.batt.effRt || 0.95) * 100) + '% &rarr; ' : '') +
             '<b>' + num0(real.eauto) + ' kWh</b> (' + fnum(real.scRate * 100) + '%)';
        modeName = 'eco.scBaterie'; modeDesc = 'eco.scHelpBaterie';
      } else {
        modeF = 'min(R<sub>ac</sub>&middot;W<sub>p</sub>, W<sub>c</sub>)';
        fL = 'min(' + fnum(p.rac != null ? p.rac : 40) + '%&middot;' + num0(p.wp) + ', ' + num0(p.wc) + ') = <b>' + num0(real.eauto) + ' kWh</b>';
        modeName = 'eco.scRata'; modeDesc = 'eco.scHelpRata';
      }
      xp += Explain.block('E<sub>auto</sub> = ' + modeF, fL, 'eco.xEauto');
      xp += Explain.block('<b>' + tr(modeName) + '</b> &middot; ' + modeF, '', modeDesc);
      var injTerm = p.scMode === 'baterie' ? 'E<sub>inj</sub>' : '(W<sub>p</sub> &minus; E<sub>auto</sub>)';
      xp += Explain.block('B = E<sub>auto</sub>&middot;e<sub>1</sub> + ' + injTerm + '&middot;e<sub>2</sub>',
        num0(real.eauto) + '&middot;' + fnum(p.e1) + ' + ' + num0(real.einj) + '&middot;' + fnum(p.e2 || 0) + ' = <b>' + num0(real.B) + ' ' + p.cur + '/an</b>', 'eco.xB');
      if (p.cfv != null) {
        xp += Explain.block('T<sub>r</sub> = C<sub>FV</sub> / B',
          num0(real.Iprop) + ' / ' + num0(real.B) + ' = <b>' + (isFinite(real.trProp) ? fnum(real.trProp) + ' ' + tr('eco.yrs') : '&infin;') + '</b>', 'eco.xTr');
        if (real.rirProp != null) {
          xp += Explain.block('VNA = (B/r)&middot;[1 &minus; (1+r)<sup>&minus;n</sup>] &minus; C<sub>FV</sub> = 0',
            tr('eco.xRirSub').replace('{rir}', fnum(real.rirProp * 100)).replace('{n}', num0(p.n)), 'eco.xRir');
        }
      }
    }
    Explain.render(document.getElementById('eco-explain'), xp);
  }

  /* Plain inputs — recompute on every keystroke. */
  ['eco-wp', 'eco-wpo', 'eco-wc', 'eco-cfv', 'eco-aprog', 'eco-e1', 'eco-e2', 'eco-n', 'eco-rate', 'eco-scmode', 'eco-rac', 'eco-dayfrac', 'eco-batt'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', render);
    document.getElementById(id).addEventListener('change', render);
  });
  document.getElementById('eco-country').addEventListener('change', function () {
    var e1 = priceCur(this.value, document.getElementById('eco-cur').value);
    if (e1 != null) {
      document.getElementById('eco-e1').value = e1;
      document.getElementById('eco-e2').value = +(E2F * e1).toFixed(2);
    }
    render();
  });
  document.getElementById('eco-eurwp').addEventListener('input', function () { recomputeCfv(); render(); });
  document.getElementById('eco-costmode').addEventListener('change', function () { recomputeCfv(); render(); });
  document.getElementById('eco-cur').addEventListener('change', function () {
    var f = fxOf(this.value) / fxOf(curPrev);
    ['eco-e1', 'eco-e2'].forEach(function (id) { var v = readNum(id); if (v != null) document.getElementById(id).value = +(v * f).toFixed(2); });
    ['eco-cfv', 'eco-aprog'].forEach(function (id) { var v = readNum(id); if (v != null) document.getElementById(id).value = Math.round(v * f); });
    curPrev = this.value;
    render();
  });

  render();

  /* Mark done once cost + prices yield a benefit and payback. */
  (function () {
    var real = scenario(readNum('eco-wp'), readNum('eco-wc'), readNum('eco-e1'), readNum('eco-e2'), readNum('eco-cfv'), readNum('eco-aprog'), readNum('eco-n'), readNum('eco-rate'),
      { model: document.getElementById('eco-scmode').value, rac: readNum('eco-rac'), dayFrac: readNum('eco-dayfrac'), batt: battById(document.getElementById('eco-batt').value), prodMonthly: sz.monthlyProd, consMonthly: cons.monthly });
    if (real && real.B > 0 && isFinite(real.trProp) && !Project.isDone('economics')) Project.markDone('economics');
  })();

  return {
    render: render,
    destroy: function () { dead = true; if (chart) { try { chart.destroy(); } catch (e) {} chart = null; } },
  };
}
