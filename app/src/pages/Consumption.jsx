/* Premises/Consumption (step 3) — React port of consumption.html: simple
   (12 monthly bills) vs detailed (appliance table + power chain) modes, system
   target (coverage / specific yield / ATR), monthly chart, learning-mode
   working, and the building-structure card (wind step inputs). Persists to
   Project.section('consumption') + section('building') on every input —
   identical fields to legacy. */
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../store/useI18n.js';
import { useTheme } from '../store/useTheme.js';
import ChartCanvas from '../components/ChartCanvas.jsx';
import ExplainHost, { LearnToggle } from '../components/ExplainHost.jsx';
import './Consumption.css';

const MNAMES_RO = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec'];
const MNAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt0 = (v) => Math.round(v).toLocaleString();
const uOf = (a) => (a.util != null ? a.util : 100);                                   /* utilization % (duty cycle) */
const applDaily = (a) => (a.watts || 0) * (a.qty || 1) / 1000 * uOf(a) / 100 * (a.hours || 0);   /* kWh/day */
const DEFAULT_SY = 1150;

function applianceMonthly(appliances) {
  const annual = appliances.reduce((s, a) => s + applDaily(a) * 365, 0);
  /* No per-month appliance input → spread over the default winter-heavy profile (config.js). */
  const prof = typeof CONSUMPTION_SEASONAL_PROFILE !== 'undefined' ? CONSUMPTION_SEASONAL_PROFILE : null;
  if (!prof) return new Array(12).fill(annual / 12);
  return prof.map((w) => annual * w);
}

export default function Consumption() {
  const { t, lang } = useI18n();
  const { dark } = useTheme();
  const months = lang === 'en' ? MNAMES_EN : MNAMES_RO;

  /* init once from state (page remounts on project identity change via RouteFrame key) */
  const C = Project.section('consumption') || {};
  const sizing = Project.section('sizing') || {};
  const autoSY = (sizing.pvgisKwp && sizing.annualProdKwh) ? sizing.annualProdKwh / sizing.pvgisKwp : null;

  const [mode, setMode] = useState(C.mode === 'detailed' ? 'detailed' : 'simple');
  const [monthly, setMonthly] = useState(() =>
    Array.isArray(C.monthly) && C.monthly.length === 12 ? C.monthly.slice() : new Array(12).fill(0));
  const [appliances, setAppliances] = useState(() =>
    Array.isArray(C.appliances) && C.appliances.length ? C.appliances.map((a) => ({ util: 100, ...a }))
      : [{ name: '', watts: 0, hours: 0, qty: 1, util: 100 }]);
  const [coverage, setCoverage]   = useState(C.coverage != null ? C.coverage : 100);
  const [sy, setSy]               = useState(autoSY != null ? Math.round(autoSY) : (C.specificYield != null ? C.specificYield : DEFAULT_SY));
  const [price, setPrice]         = useState(C.pricePerKwh != null ? C.pricePerKwh : '');
  const [atr, setAtr]             = useState(C.maxPowerKw != null ? C.maxPowerKw : '');
  const [cosphi, setCosphi]       = useState(C.cosPhi != null ? C.cosPhi : 0.9);
  const [ks, setKs]               = useState(C.simultaneity != null ? C.simultaneity : 1);
  const [fillVal, setFillVal]     = useState('');

  /* derived */
  const mo = mode === 'detailed' ? applianceMonthly(appliances) : monthly;
  const annual = mo.reduce((a, b) => a + (b || 0), 0);
  const covN = parseFloat(coverage) || 100;
  const syN = parseFloat(sy) || DEFAULT_SY;
  const priceN = parseFloat(price);
  const atrN = parseFloat(atr);
  const designKwh = annual * covN / 100;
  const targetKwp = syN > 0 ? designKwh / syN : 0;
  const pkIdx = mo.indexOf(Math.max(...mo));

  /* detailed power chain */
  const cosphiN = parseFloat(cosphi) || 0.9;
  const ksN = parseFloat(ks) || 1;
  const Pinst = appliances.reduce((s, a) => s + (a.watts || 0) * (a.qty || 1), 0);
  const Pabs = Pinst * ksN;
  const S = cosphiN > 0 ? Pabs / cosphiN : Pabs;

  /* persist on every change (skip the initial mount — legacy recompute(false)) */
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    Project.patch('consumption', {
      mode,
      monthly: mo.slice(),
      appliances: mode === 'detailed' ? appliances.map((a) => ({ ...a })) : null,
      annualKwh: annual || null,
      pricePerKwh: (!isNaN(priceN) && priceN > 0) ? priceN : null,
      coverage: covN,
      specificYield: syN,
      targetKwp: targetKwp || null,
      designKwh: designKwh || null,
      maxPowerKw: (!isNaN(atrN) && atrN > 0) ? atrN : null,
      cosPhi: mode === 'detailed' ? cosphiN : null,
      simultaneity: mode === 'detailed' ? ksN : null,
      apparentKva: mode === 'detailed' ? +(S / 1000).toFixed(2) : null,
    });
    if (annual > 0 && !Project.isDone('consumption')) Project.markDone('consumption');
  }, [mode, JSON.stringify(monthly), JSON.stringify(appliances), coverage, sy, price, atr, cosphi, ks]);  // eslint-disable-line react-hooks/exhaustive-deps

  function setAppl(i, f, v) {
    setAppliances(appliances.map((a, j) => j === i ? { ...a, [f]: v } : a));
  }

  /* learning-mode working */
  let xp = '';
  if (typeof Explain !== 'undefined' && annual > 0) {
    xp += Explain.block(
      mode === 'detailed' ? 'E<sub>an</sub> = Σ (P · n · u/100 · h · 365 / 1000)' : 'E<sub>an</sub> = Σ E<sub>lună</sub>',
      '<b>' + fmt0(annual) + ' kWh</b>', 'kxp.annual');
    xp += Explain.block('E<sub>proiect</sub> = E<sub>an</sub> · acoperire',
      fmt0(annual) + ' · ' + covN + '% = <b>' + fmt0(designKwh) + ' kWh</b>', 'kxp.design');
    xp += Explain.block('P<sub>FV</sub> = E<sub>proiect</sub> / y<sub>specific</sub>',
      fmt0(designKwh) + ' / ' + Math.round(syN) + ' = <b>' + targetKwp.toFixed(2) + ' kWp</b>', 'kxp.target');
    if (mode === 'detailed') {
      xp += Explain.block('E<sub>lună</sub> = E<sub>an</sub> · w<sub>lună</sub>',
        '<b>' + fmt0(mo[0]) + ' &hellip; ' + fmt0(mo[6]) + ' kWh</b>', 'kxp.seasonal');
    }
  }

  const sySrc = autoSY != null ? '(' + t('con.fromyield') + ': ' + Math.round(autoSY) + ')'
    : (C.specificYield != null ? '(' + t('con.manual') + ')' : '(' + t('con.default') + ')');

  return (
    <>
      <div className="sn-crumb"><b>{t('nav.phaseA')}</b> › <span>{t('nav.consumption')}</span></div>
      <div className="con-scroll">
        <div className="row g-3">
          {/* inputs */}
          <div className="col-lg-5">
            <div className="card">
              <div className="sec">{t('con.mode')}</div>
              <div className="seg">
                <label><input type="radio" name="con-mode" value="simple" checked={mode === 'simple'}
                              onChange={() => setMode('simple')} /><span>{t('con.simple')}</span></label>
                <label><input type="radio" name="con-mode" value="detailed" checked={mode === 'detailed'}
                              onChange={() => setMode('detailed')} /><span>{t('con.detailed')}</span></label>
              </div>
            </div>

            {/* SIMPLE: 12 monthly inputs */}
            {mode === 'simple' && (
              <div className="card" id="con-simple-card">
                <div className="sec">{t('con.monthly')}</div>
                <div className="mon-grid" id="con-months">
                  {monthly.map((v, i) => (
                    <div className="mon-cell" key={i}>
                      <label>{months[i]}</label>
                      <input type="number" value={v || ''} min="0" step="10" placeholder="0"
                             onChange={(e) => setMonthly(monthly.map((x, j) => j === i ? (parseFloat(e.target.value) || 0) : x))} />
                    </div>
                  ))}
                </div>
                <div className="fill-row">
                  <input type="number" id="con-fillval" min="0" step="10" placeholder="kWh"
                         value={fillVal} onChange={(e) => setFillVal(e.target.value)} />
                  <button className="btn btn-outline-secondary btn-sm" id="con-fill"
                          onClick={() => { const v = parseFloat(fillVal); if (!isNaN(v)) setMonthly(new Array(12).fill(v)); }}>
                    {t('con.fillall')}
                  </button>
                </div>
                <div className="field" style={{ marginTop: 8 }}>
                  <label>{t('con.price')}</label>
                  <input type="number" id="con-price" min="0" step="0.01" placeholder="-" style={{ width: 120 }}
                         value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
              </div>
            )}

            {/* DETAILED: appliance table */}
            {mode === 'detailed' && (
              <div className="card" id="con-detailed-card">
                <div className="sec">{t('con.appliances')}</div>
                <div className="appl-row appl-head">
                  <span>{t('con.applname')}</span><span>{t('con.power')}</span>
                  <span>{t('con.qty')}</span><span>{t('con.util')}</span><span>{t('con.hours')}</span><span></span>
                </div>
                <div id="con-appliances">
                  {appliances.map((a, i) => (
                    <div key={i}>
                      <div className="appl-row">
                        <input type="text" value={a.name || ''} placeholder={t('con.applname')}
                               onChange={(e) => setAppl(i, 'name', e.target.value)} />
                        <input type="number" value={a.watts || ''} min="0" step="10" placeholder="W"
                               onChange={(e) => setAppl(i, 'watts', parseFloat(e.target.value) || 0)} />
                        <input type="number" value={a.qty || 1} min="1" step="1"
                               onChange={(e) => setAppl(i, 'qty', parseInt(e.target.value, 10) || 1)} />
                        <input type="number" value={uOf(a)} min="0" max="100" step="5" title={t('con.util')}
                               onChange={(e) => setAppl(i, 'util', Math.max(0, Math.min(100, parseFloat(e.target.value))))} />
                        <input type="number" value={a.hours || ''} min="0" max="24" step="0.5" placeholder="h"
                               onChange={(e) => setAppl(i, 'hours', parseFloat(e.target.value) || 0)} />
                        {appliances.length > 1
                          ? <button className="appl-rm" title={t('cmp.remove')}
                                    onClick={() => setAppliances(appliances.filter((_, j) => j !== i))}>×</button>
                          : <span></span>}
                      </div>
                      <div className="appl-kwh">{fmt0(applDaily(a) * 365)} kWh/{t('con.yr')}</div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-outline-secondary btn-sm w-100" id="con-addappl"
                        onClick={() => setAppliances([...appliances, { name: '', watts: 0, hours: 0, qty: 1, util: 100 }])}>
                  {t('con.addappliance')}
                </button>
                <div className="pwr-params">
                  <div className="field"><label>{t('con.cosphi')}</label>
                    <input type="number" id="con-cosphi" value={cosphi} min="0.5" max="1" step="0.01"
                           onChange={(e) => setCosphi(e.target.value)} /></div>
                  <div className="field"><label dangerouslySetInnerHTML={{ __html: t('con.simult') }} />
                    <input type="number" id="con-simult" value={ks} min="0.1" max="1" step="0.05"
                           onChange={(e) => setKs(e.target.value)} /></div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, lineHeight: 1.45 }}>{t('con.pwrnote')}</div>
              </div>
            )}

            <div className="card">
              <div className="sec">{t('con.target')}</div>
              <div className="field"><label>{t('con.coverage')}</label>
                <input type="number" id="con-coverage" value={coverage} min="10" max="200" step="5" style={{ width: 100 }}
                       onChange={(e) => setCoverage(e.target.value)} /></div>
              <div className="field" style={{ marginTop: 8 }}><label>{t('con.specyield')}</label>
                <div className="field-inline">
                  <input type="number" id="con-specyield" value={sy} min="700" max="2000" step="10"
                         onChange={(e) => setSy(e.target.value)} />
                  <span id="con-sy-src" style={{ fontSize: 10, color: 'var(--text3)' }}>{sySrc}</span>
                </div>
              </div>
              <div className="field" style={{ marginTop: 8 }}><label>{t('con.atr')}</label>
                <input type="number" id="con-atr" min="0" step="0.5" placeholder="-" style={{ width: 120 }}
                       value={atr} onChange={(e) => setAtr(e.target.value)} />
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{t('con.atrhint')}</div></div>
            </div>
          </div>

          {/* results */}
          <div className="col-lg-7">
            <div className="card">
              <div className="sec" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t('con.results')}</span>
                <LearnToggle id="con-learn" />
              </div>
              <div className="kv"><span className="k">{t('con.annual')}</span>
                <span className="v big" id="con-annual">{annual > 0 ? <>{fmt0(annual)} <span style={{ fontSize: 12 }}>kWh</span></> : '-'}</span></div>
              <div className="kv"><span className="k">{t('con.daily')}</span>
                <span className="v" id="con-daily">{(annual / 365).toFixed(1)} kWh/{lang === 'en' ? 'day' : 'zi'}</span></div>
              <div className="kv"><span className="k">{t('con.peak')}</span>
                <span className="v" id="con-peak">{annual > 0 ? months[pkIdx] + ' · ' + fmt0(mo[pkIdx]) + ' kWh' : '-'}</span></div>
              {!isNaN(priceN) && priceN > 0 && annual > 0 && (
                <div className="kv" id="con-cost-row"><span className="k">{t('con.cost')}</span>
                  <span className="v" id="con-cost">{fmt0(annual * priceN).toLocaleString()} EUR</span></div>
              )}
              <div className="kv"><span className="k">{t('con.targetkwp')}</span>
                <span className="v big" id="con-targetkwp" style={{ color: 'var(--clr-primary)' }}>
                  {annual > 0 ? <>{targetKwp.toFixed(2)} <span style={{ fontSize: 12 }}>kWp</span></> : '-'}</span></div>
              {!isNaN(atrN) && atrN > 0 && targetKwp > atrN && annual > 0 && (
                <div id="con-atr-warn" style={{ fontSize: 12, color: '#c47d12', background: 'color-mix(in srgb,#f0a020 14%,transparent)', border: '0.5px solid #f0a020', borderRadius: 8, padding: '8px 10px', marginTop: 8, lineHeight: 1.45 }}
                     dangerouslySetInnerHTML={{ __html: t('con.atrwarn').replace('{kwp}', targetKwp.toFixed(2) + ' kWp').replace('{atr}', atrN) }} />
              )}
              <div className="con-note" id="con-note"
                   dangerouslySetInnerHTML={{ __html: annual > 0 ? t('con.note').replace('{kwp}', '<b>' + targetKwp.toFixed(2) + ' kWp</b>') : '' }} />
              <ExplainHost id="con-explain" html={xp} />
            </div>

            {/* DETAILED: per-appliance table + power summary (Table 4.7) */}
            {mode === 'detailed' && (
              <div className="card" id="con-detail-wrap">
                <div className="sec">{t('con.detailtitle')}</div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="det-tbl" id="con-detail-tbl">
                    <thead><tr>
                      <th>{t('con.applname')}</th><th>{t('con.power')}</th><th>{t('con.qty')}</th>
                      <th>{t('con.insttot')}</th><th>{t('con.util')}</th><th>{t('con.hours')}</th>
                      <th>{t('con.eday')}</th><th>{t('con.emonth')}</th><th>{t('con.eyear')}</th>
                    </tr></thead>
                    <tbody>
                      {appliances.map((a, i) => {
                        const ptot = (a.watts || 0) * (a.qty || 1), d = applDaily(a);
                        return (
                          <tr key={i}>
                            <td>{a.name || '-'}</td><td>{a.watts || 0}</td><td>{a.qty || 1}</td>
                            <td>{fmt0(ptot)}</td><td>{uOf(a)}</td><td>{a.hours || 0}</td>
                            <td>{d.toFixed(2)}</td><td>{(d * 365 / 12).toFixed(1)}</td><td>{fmt0(d * 365)}</td>
                          </tr>
                        );
                      })}
                      <tr className="tot">
                        <td>{t('con.total')}</td><td></td><td></td><td>{fmt0(Pinst)}</td><td></td><td></td>
                        <td>{appliances.reduce((s, a) => s + applDaily(a), 0).toFixed(2)}</td>
                        <td>{fmt0(annual / 12)}</td><td>{fmt0(annual)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div id="con-power" style={{ marginTop: 10 }}>
                  <div className="kv"><span className="k">{t('con.pinst')}</span><span className="v">{fmt0(Pinst)} W</span></div>
                  <div className="kv"><span className="k">{t('con.pabs')}</span><span className="v">{fmt0(Pabs)} W · kₛ {ksN}</span></div>
                  <div className="kv"><span className="k">{t('con.papp')}</span><span className="v"><b>{(S / 1000).toFixed(2)} kVA</b> · cos φ {cosphiN}</span></div>
                </div>
              </div>
            )}

            <div className="card">
              <div className="sec">{t('con.chart')}</div>
              <div style={{ position: 'relative', height: 240 }}>
                <ChartCanvas id="con-chart" ariaLabel="Monthly consumption bar chart"
                  deps={[JSON.stringify(mo), lang, dark]}
                  build={(el) => new Chart(el, {
                    type: 'bar',
                    data: { labels: months, datasets: [{ label: 'kWh', data: mo.map((v) => Math.round(v || 0)), backgroundColor: '#2563eb', borderRadius: 4 }] },
                    options: {
                      responsive: true, maintainAspectRatio: false,
                      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => c.raw + ' kWh' } } },
                      scales: {
                        x: { grid: { color: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }, ticks: { color: dark ? '#aaa' : '#555' } },
                        y: { grid: { color: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }, ticks: { color: dark ? '#aaa' : '#555', callback: (v) => v + ' kWh' } },
                      },
                    },
                  })} />
              </div>
            </div>

            <BuildingCard t={t} />
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Building structure card (wind-step inputs; legacy = a second IIFE) ── */
function BuildingCard({ t }) {
  const B = Project.section('building') || {};
  const WZ = [25, 28, 31, 34];
  const snap = (v) => WZ.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a);
  const [h, setH]             = useState(B.h != null ? B.h : 8);
  const [vb0, setVb0]         = useState(B.vb0 != null ? String(snap(B.vb0)) : '31');
  const [terrain, setTerrain] = useState(B.terrain != null ? String(B.terrain) : '2');
  const [parapet, setParapet] = useState(B.parapet != null ? B.parapet : 0);

  /* legacy saveBld() persisted at mount too (commits defaults) — keep that */
  useEffect(() => {
    Project.patch('building', {
      h: parseFloat(h) || 8,
      vb0: parseFloat(vb0) || 30,
      terrain: parseInt(terrain, 10) || 2,
      parapet: parseFloat(parapet) || 0,
    });
  }, [h, vb0, terrain, parapet]);

  return (
    <div className="card">
      <div className="sec">{t('con.building')}</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div className="bld-field" style={{ minWidth: 110 }}>
          <label>{t('con.buildh')}</label>
          <input type="number" id="bld-h" min="1" max="50" step="0.5" value={h} onChange={(e) => setH(e.target.value)} />
        </div>
        <div className="bld-field" style={{ minWidth: 160 }}>
          <label>{t('con.windzone')}</label>
          <select id="bld-wzone" value={vb0} onChange={(e) => setVb0(e.target.value)}>
            <option value="25">qb 0.4 kPa - vb0 = 25 m/s</option>
            <option value="28">qb 0.5 kPa - vb0 = 28 m/s</option>
            <option value="31">qb 0.6 kPa - vb0 = 31 m/s</option>
            <option value="34">qb 0.7 kPa - vb0 = 34 m/s (SE / Dobrogea / Baragan)</option>
          </select>
          <div className="bld-note">{t('con.windzonenote')}</div>
        </div>
        <div className="bld-field" style={{ minWidth: 160 }}>
          <label>{t('con.terrain')}</label>
          <select id="bld-terrain" value={terrain} onChange={(e) => setTerrain(e.target.value)}>
            <option value="0">0 - Mare deschis / coasta</option>
            <option value="1">I - Camp deschis</option>
            <option value="2">II - Obstacole izolate</option>
            <option value="3">III - Suburban / paduri</option>
            <option value="4">IV - Urban / industrial</option>
          </select>
        </div>
        <div className="bld-field" style={{ minWidth: 110 }}>
          <label>{t('con.parapet')}</label>
          <input type="number" id="bld-parapet" min="0" max="5" step="0.1" value={parapet} onChange={(e) => setParapet(e.target.value)} />
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>{t('con.buildingnote')}</div>
    </div>
  );
}
