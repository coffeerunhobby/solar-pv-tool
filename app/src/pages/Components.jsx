/* Components (step 4) — React port of components.html: the S1/S2 string list,
   I1/I2 inverter list and B1/B2 battery-bank list (brand→model cascades), plus
   the live sizing check (P_inv/P_FV ratio, MPPT capacity, target) and the
   learning-mode working. Persists the EXACT legacy payload: top-level strings
   array + components{inverters, batteries, mirrors, pfvW, module mirror}.
   Legacy persisted at init too (migrations normalize on load) — kept. */
import { useEffect, useState } from 'react';
import { useI18n } from '../store/useI18n.js';
import { useProject } from '../store/useProject.js';
import { useCatalog } from '../store/useCatalog.js';
import ExplainHost, { LearnToggle } from '../components/ExplainHost.jsx';
import SmartLink from '../components/SmartLink.jsx';
import './Components.css';

const MODS        = typeof MODULE_LIST     !== 'undefined' ? MODULE_LIST     : [];
const INVS        = typeof INVERTER_LIST   !== 'undefined' ? INVERTER_LIST   : [];
const MOD_BRANDS  = typeof MODULE_BRANDS   !== 'undefined' ? MODULE_BRANDS   : [];
const INV_BRANDS  = typeof INVERTER_BRANDS !== 'undefined' ? INVERTER_BRANDS : [];
const BATTS       = typeof BATTERY_LIST    !== 'undefined' ? BATTERY_LIST    : [];
const BATT_BRANDS = typeof BATTERY_BRANDS  !== 'undefined' ? BATTERY_BRANDS  : [];

const modById  = (id) => MODS.find((m) => m.id === id);
const invById  = (id) => INVS.find((i) => i.id === id);
const battById = (id) => BATTS.find((b) => b.id === id);
const bName    = (brands, id) => (brands.find((x) => x.id === id) || {}).name || id || '?';
const brandOf  = (list, id) => (list.find((x) => x.id === id) || {}).brandId || null;
const brandsPresent = (list, brands) =>
  [...new Set(list.map((it) => it.brandId).filter(Boolean))]
    .sort((a, b) => bName(brands, a).localeCompare(bName(brands, b)));
const fkwh = (v) => (+v).toFixed(2).replace(/\.?0+$/, '');
const fkw  = fkwh;

/* brand → model cascade selects (React-rendered; refill is automatic on state change) */
function Cascade({ list, brands, brandVal, modelVal, onBrand, onModel, selTxt }) {
  return (
    <>
      <select className="cmp-sel" value={brandVal || ''} onChange={(e) => onBrand(e.target.value)}>
        <option value="">{selTxt}</option>
        {brandsPresent(list, brands).map((id) => <option key={id} value={id}>{bName(brands, id)}</option>)}
      </select>
      <div className="cmp-child"><span className="cmp-arrow">↳</span>
        <select className="cmp-sel" value={modelVal || ''} onChange={(e) => onModel(e.target.value)}>
          <option value="">{selTxt}</option>
          {brandVal && list.filter((it) => it.brandId === brandVal).map((it) =>
            <option key={it.id} value={it.id}>{it.name}</option>)}
        </select>
      </div>
    </>
  );
}

export default function Components() {
  const { t, lang } = useI18n();
  useProject((s) => [s.sizing, s.consumption]);   // target row reacts to other steps
  useCatalog();   // re-render the module/inverter pickers when a catalog sync adds rows
  const selTxt = lang === 'en' ? 'Select…' : 'Selectează…';

  /* init once from state (remounts on project identity change) */
  const [strings, setStrings] = useState(() => {
    const s = Project.section('strings');
    return Array.isArray(s) && s.length ? s.map((x) => ({ ...x }))
      : [{ id: 1, moduleId: '', count: 10, azimuth: 0, tilt: 35, losses: 14, optimizer: 0, albedo: 0.2 }];
  });
  const [inverters, setInverters] = useState(() => {
    const comp = Project.section('components') || {};
    return Array.isArray(comp.inverters) && comp.inverters.length
      ? comp.inverters.map((v) => ({ id: v.id, inverterId: v.inverterId || '', invBrand: v.invBrand || '' }))
      : [{ id: 1, inverterId: comp.inverterId || '' }];
  });
  const [batteries, setBatteries] = useState(() => {
    const comp = Project.section('components') || {};
    return Array.isArray(comp.batteries) && comp.batteries.length
      ? comp.batteries.map((v) => ({ id: v.id, batteryId: v.batteryId || '', battBrand: v.battBrand || '', count: v.count > 0 ? v.count : 1 }))
      : (comp.batteryId ? [{ id: 1, batteryId: comp.batteryId, count: 1 }] : []);
  });
  const nextOf = (arr) => arr.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;

  /* derived sizing */
  const units = inverters.map((v) => invById(v.inverterId)).filter(Boolean);
  const nInv = units.length;
  const pInvTotal = units.reduce((a, u) => a + (u.pac || 0), 0);
  const nonMicro = units.filter((u) => u.type !== 'micro');
  const allMicro = nInv > 0 && nonMicro.length === 0;
  const nmpptTotal = nonMicro.reduce((a, u) => a + (u.nmppt || 0), 0);
  const pfvW = strings.reduce((a, s) => { const m = modById(s.moduleId); return a + (m ? m.pmax * s.count : 0); }, 0);

  const sizing = Project.section('sizing') || {};
  const cons   = Project.section('consumption') || {};
  const target = cons.targetKwp != null ? cons.targetKwp : (sizing.pvgisKwp != null ? sizing.pvgisKwp : null);

  /* persist — EXACT legacy payload; legacy also persisted at init (migration normalize), kept */
  useEffect(() => {
    Project.set('strings', strings.map((s) => ({ ...s })));
    const m0 = modById(strings[0] && strings[0].moduleId);
    const primary = units[0] || null;
    const battUnits = batteries.map((v) => battById(v.batteryId)).filter(Boolean);
    const battKwhTotal = batteries.reduce((a, v) => {
      const b = battById(v.batteryId); return a + (b ? (b.kwhUsable || 0) * (v.count || 1) : 0);
    }, 0);
    Project.patch('components', {
      inverters: inverters.map((v) => ({ ...v })),
      inverterId: primary ? primary.id : null, pacInv: primary ? primary.pac : null, pacInvTotal: pInvTotal || null,
      batteries: batteries.map((v) => ({ ...v })),
      batteryId: battUnits[0] ? battUnits[0].id : null, batteryKwhTotal: battKwhTotal || null,
      pfvW: pfvW || null,
      moduleId: m0 ? m0.id : null, count: strings.reduce((a, s) => a + (s.count || 0), 0),
      pmax: m0 ? m0.pmax : null, moduleLength: m0 ? m0.length : null, moduleWidth: m0 ? m0.width : null,
    });
    if (pfvW > 0 && nInv && !Project.isDone('components')) Project.markDone('components');
  }, [JSON.stringify(strings), JSON.stringify(inverters), JSON.stringify(batteries)]);  // eslint-disable-line react-hooks/exhaustive-deps

  const upd = (setArr) => (id, patch) => setArr((arr) => arr.map((x) => x.id === id ? { ...x, ...patch } : x));
  const updStr = upd(setStrings), updInv = upd(setInverters), updBatt = upd(setBatteries);

  /* verdicts */
  let ratioTxt = '-', verdictCls = 'ratio-box ratio-none', verdictTxt = t('cmp.pickboth');
  if (allMicro) { verdictTxt = t('cmp.micro'); }
  else if (pfvW > 0 && pInvTotal > 0) {
    const ratio = pInvTotal / pfvW;
    ratioTxt = ratio.toFixed(2);
    if (ratio < 0.8)      { verdictCls = 'ratio-box ratio-warn'; verdictTxt = t('cmp.low'); }
    else if (ratio > 1.2) { verdictCls = 'ratio-box ratio-warn'; verdictTxt = t('cmp.high'); }
    else                  { verdictCls = 'ratio-box ratio-ok';   verdictTxt = t('cmp.ok'); }
  }
  const nStr = strings.length;
  const inputsOk = nStr <= nmpptTotal;

  /* learning-mode working (legacy Explain.block builders, live values) */
  let xp = '';
  if (typeof Explain !== 'undefined') {
    if (pfvW > 0) {
      const terms = strings.map((s) => { const m = modById(s.moduleId); return m ? m.pmax + '·' + s.count : null; })
        .filter(Boolean).join(' + ');
      xp += Explain.block('P<sub>FV</sub> = Σ P<sub>mod</sub> · n', terms + ' = <b>' + (pfvW / 1000).toFixed(2) + ' kWp</b>', 'cxp.pfv');
    }
    if (allMicro) xp += Explain.block('n<sub>micro</sub> = n<sub>mod</sub>', '', 'cxp.micro');
    else if (pfvW > 0 && pInvTotal > 0) {
      const r = pInvTotal / pfvW;
      const pterms = nInv > 1 ? units.map((u) => u.pac / 1000).join(' + ') + ' = ' : '';
      xp += Explain.block('P<sub>inv</sub> = Σ P<sub>inv,k</sub>', pterms + '<b>' + fkw(pInvTotal / 1000) + ' kW</b>', 'cxp.pinv');
      xp += Explain.block('r = P<sub>inv</sub> / P<sub>FV</sub>',
        fkw(pInvTotal / 1000) + ' / ' + (pfvW / 1000).toFixed(2) + ' = <b>' + r.toFixed(2) + '</b>', 'cxp.ratio');
      xp += Explain.block('0.8 ≤ r ≤ 1.2', '0.8 ≤ <b>' + r.toFixed(2) + '</b> ≤ 1.2 → ' + (r >= 0.8 && r <= 1.2 ? '✓' : '✗'), 'cxp.window');
    }
    if (nmpptTotal > 0) {
      xp += Explain.block('n<sub>șiruri</sub> ≤ Σ n<sub>MPPT</sub>',
        nStr + ' ≤ ' + nmpptTotal + ' → ' + (nStr <= nmpptTotal ? '✓' : '✗'), 'cxp.inputs');
    }
  }

  return (
    <>
      <div className="sn-crumb"><b>{t('nav.phaseB')}</b> › <span>{t('nav.components')}</span></div>
      <div className="cmp-scroll">
        <div className="row g-3">
          <div className="col-lg-6">
            {/* ── strings ── */}
            <div className="card">
              <div className="sec">{t('cmp.strings')}</div>
              <div id="cmp-strings">
                {strings.map((s, i) => {
                  const mod = modById(s.moduleId);
                  const curBrand = s.moduleId ? brandOf(MODS, s.moduleId) : (s.modBrand || '');
                  const kwp = mod ? (mod.pmax * s.count / 1000).toFixed(2) + ' kWp · ' + s.count + ' ' + t('cmp.panels') : '';
                  const sColor = typeof STR_COLORS !== 'undefined' ? STR_COLORS[i % STR_COLORS.length] : '';
                  return (
                    <div className="str-row" key={s.id}>
                      <div className="str-head">
                        <span className="str-tag" style={sColor ? { background: sColor } : undefined}>S{i + 1}</span>
                        {strings.length > 1 &&
                          <button className="str-rm" title={t('cmp.remove')}
                                  onClick={() => setStrings(strings.filter((x) => x.id !== s.id))}>×</button>}
                      </div>
                      <Cascade list={MODS} brands={MOD_BRANDS} selTxt={selTxt}
                               brandVal={curBrand} modelVal={s.moduleId}
                               onBrand={(v) => updStr(s.id, { modBrand: v, moduleId: '' })}
                               onModel={(v) => updStr(s.id, { moduleId: v })} />
                      {s.moduleId && (
                        <div className="mod-db-row">
                          <SmartLink className="mod-db-link" href={'modules.html?s=' + s.id + '#' + s.moduleId}>▦ {t('cmp.modspecs')} →</SmartLink>
                        </div>
                      )}
                      <div style={{ marginTop: 6 }}>
                        <input type="number" value={s.count} min="1" max="100000" step="1" title={t('cmp.count')}
                               onChange={(e) => updStr(s.id, { count: parseInt(e.target.value, 10) || 0 })} />
                      </div>
                      <div className="str-kwp">{kwp}</div>
                    </div>
                  );
                })}
              </div>
              <button className="btn btn-outline-secondary btn-sm addbtn" id="cmp-add"
                      onClick={() => setStrings([...strings, { id: nextOf(strings), moduleId: '', count: 10, azimuth: 0, tilt: 35, losses: 14, optimizer: 0, albedo: 0.2 }])}>
                {t('cmp.addother')}
              </button>
              <div style={{ marginTop: '.5rem' }}>
                <SmartLink href="modules.html" className="mod-db-link" >▦ {t('nav.moddb')} →</SmartLink>
              </div>
            </div>

            {/* ── inverters ── */}
            <div className="card">
              <div className="sec">{t('cmp.inverter')}</div>
              <div id="cmp-inverters">
                {inverters.map((v, i) => {
                  const inv = invById(v.inverterId);
                  const curBrand = v.inverterId ? brandOf(INVS, v.inverterId) : (v.invBrand || '');
                  const spec = inv ? (fkw(inv.pac / 1000) + ' kW' +
                    (inv.type === 'micro' ? ' · ' + t('cmp.microtag') : (inv.nmppt ? ' · ' + inv.nmppt + '× MPPT' : ''))) : '';
                  return (
                    <div className="str-row" key={v.id}>
                      <div className="str-head">
                        <span className="str-tag" style={{ background: '#5b6cff' }}>I{i + 1}</span>
                        {inverters.length > 1 &&
                          <button className="str-rm" title={t('cmp.remove')}
                                  onClick={() => setInverters(inverters.filter((x) => x.id !== v.id))}>×</button>}
                      </div>
                      <Cascade list={INVS} brands={INV_BRANDS} selTxt={selTxt}
                               brandVal={curBrand} modelVal={v.inverterId}
                               onBrand={(b) => updInv(v.id, { invBrand: b, inverterId: '' })}
                               onModel={(m) => updInv(v.id, { inverterId: m })} />
                      {v.inverterId && (
                        <div className="mod-db-row">
                          <SmartLink className="mod-db-link" href={'inverters.html#' + v.inverterId}>⚡ {t('cmp.invspecs')} →</SmartLink>
                        </div>
                      )}
                      {inv && inv.note && <div className="str-note">{inv.note}</div>}
                      {spec && <div className="str-kwp">{spec}</div>}
                    </div>
                  );
                })}
              </div>
              <button className="btn btn-outline-secondary btn-sm addbtn" id="cmp-inv-add"
                      onClick={() => setInverters([...inverters, { id: nextOf(inverters), inverterId: '', invBrand: '' }])}>
                {t('cmp.addinv')}
              </button>
              <div style={{ marginTop: '.5rem' }}>
                <SmartLink href="inverters.html" className="mod-db-link">⚡ {t('nav.invdb')} →</SmartLink>
              </div>
            </div>

            {/* ── battery banks (optional) ── */}
            <div className="card">
              <div className="sec">{t('cmp.battery')}</div>
              <div id="cmp-batteries">
                {batteries.map((v, i) => {
                  const b = battById(v.batteryId);
                  const curBrand = v.batteryId ? brandOf(BATTS, v.batteryId) : (v.battBrand || '');
                  const n = v.count || 1;
                  const spec = b ? ((n > 1 ? n + ' × ' + fkwh(b.kwhUsable) + ' = ' + fkwh(b.kwhUsable * n) : fkwh(b.kwhUsable)) + ' kWh' +
                    (b.architecture ? ' · ' + b.architecture.toUpperCase() : '') +
                    (b.pDischargeKw ? ' · ' + fkwh(b.pDischargeKw * n) + ' kW' : '')) : '';
                  return (
                    <div className="str-row" key={v.id}>
                      <div className="str-head">
                        <span className="str-tag" style={{ background: '#22a06b' }}>B{i + 1}</span>
                        <button className="str-rm" title={t('cmp.remove')}
                                onClick={() => setBatteries(batteries.filter((x) => x.id !== v.id))}>×</button>
                      </div>
                      <Cascade list={BATTS} brands={BATT_BRANDS} selTxt={selTxt}
                               brandVal={curBrand} modelVal={v.batteryId}
                               onBrand={(b2) => updBatt(v.id, { battBrand: b2, batteryId: '' })}
                               onModel={(m) => updBatt(v.id, { batteryId: m })} />
                      {v.batteryId && (
                        <div className="mod-db-row">
                          <SmartLink className="mod-db-link" href={'batteries.html#' + v.batteryId}>🔋 {t('cmp.battspecs')} →</SmartLink>
                        </div>
                      )}
                      <div style={{ marginTop: 6 }}>
                        <input type="number" value={n} min="1" max="1000" step="1" title={t('cmp.battcount')}
                               onChange={(e) => updBatt(v.id, { count: parseInt(e.target.value, 10) || 1 })} />
                      </div>
                      {b && b.note && <div className="str-note">{b.note}</div>}
                      {spec && <div className="str-kwp">{spec}</div>}
                    </div>
                  );
                })}
              </div>
              {!batteries.length && <div id="cmp-batt-none" className="str-note" style={{ margin: '2px 0 8px' }}>{t('cmp.battnone')}</div>}
              <button className="btn btn-outline-secondary btn-sm addbtn" id="cmp-batt-add"
                      onClick={() => setBatteries([...batteries, { id: nextOf(batteries), batteryId: '', battBrand: '', count: 1 }])}>
                {t('cmp.addbatt')}
              </button>
              <div style={{ marginTop: '.5rem' }}>
                <SmartLink href="batteries.html" className="mod-db-link">🔋 {t('nav.batdb')} →</SmartLink>
              </div>
            </div>
          </div>

          {/* ── sizing check ── */}
          <div className="col-lg-6">
            <div className="card">
              <div className="sec" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t('cmp.sizing')}</span>
                <LearnToggle id="cmp-learn" />
              </div>
              {target != null && (
                <div id="cmp-target" className="kv">
                  <span className="k">{t(cons.targetKwp != null ? 'cmp.targetCon' : 'cmp.target')}</span>
                  <span className="v" id="cmp-target-v">{(+target).toFixed(2)} kWp</span>
                </div>
              )}
              <div id="cmp-breakdown">
                {strings.length > 1 && strings.map((s, i) => {
                  const mod = modById(s.moduleId);
                  const w = mod ? mod.pmax * s.count : 0;
                  return (
                    <div className="kv" key={s.id}>
                      <span className="k">{t('cmp.stringlbl')} {i + 1}{mod ? ' · ' + mod.name.split(' ').slice(0, 2).join(' ') : ''}</span>
                      <span className="v">{(w / 1000).toFixed(2)} kWp</span>
                    </div>
                  );
                })}
              </div>
              <div className="kv"><span className="k">{t('cmp.pfv')}</span>
                <span className="v big" id="cmp-pfv-v">{pfvW ? (pfvW / 1000).toFixed(2) + ' kWp' : '-'}</span></div>
              <div className="kv"><span className="k">{t('cmp.pinv')}</span>
                <span className="v" id="cmp-pinv-v">{nInv ? fkw(pInvTotal / 1000) + ' kW' + (nInv > 1 ? ' · ' + nInv + '× ' + t('cmp.invshort') : '') : '-'}</span></div>
              <div className="kv"><span className="k">{t('cmp.ratio')}</span>
                <span className="v" id="cmp-ratio-v">{allMicro ? '-' : ratioTxt}</span></div>
              <div id="cmp-verdict" className={verdictCls}>{verdictTxt}</div>
              <div className="relation">{t('cmp.relation')}</div>
              {nmpptTotal > 0 && (
                inputsOk
                  ? <div id="cmp-inputs" className="ratio-box ratio-ok">{t('cmp.inputs.ok').replace('{n}', nStr).replace('{m}', nmpptTotal)}</div>
                  : <div id="cmp-inputs" className="ratio-box ratio-warn"
                         dangerouslySetInnerHTML={{ __html: '<b>' + t('cmp.inputs.warn').replace('{m}', nmpptTotal).replace('{n}', nStr) + '</b> ' + t('cmp.inputs.fix2') }} />
              )}
              <ExplainHost id="cmp-explain" html={xp} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
