/* Module DB — React port of modules.html: list/detail with Pmax/FF/€-Wp sorts,
   hash deep links, FF + cell-type learning-mode explainers, comparepv link,
   and the string context (?s=<stringId> from a Components row: "Use" assigns
   the module to THAT string and returns to Components). Reads the legacy
   globals MODULE_LIST / MODULE_BRANDS. */
import { useI18n } from '../store/useI18n.js';
import { useLearn } from '../store/useLearn.js';
import { useDbList, DbListPane, BrandHighlight, DsLink, SpecCard, RangeBar } from '../db/DbShared.jsx';
import './Modules.css';

const DATA   = typeof MODULE_LIST   !== 'undefined' ? MODULE_LIST   : [];
const BRANDS = typeof MODULE_BRANDS !== 'undefined' ? MODULE_BRANDS : [];
const brandName = (id) => (BRANDS.find((x) => x.id === id) || {}).name || id || '';

const area = (m) => (m.length && m.width) ? (m.length * m.width / 1e6) : null;   // m²
/* Prefer the datasheet's stated efficiency (exact); else compute from area. */
const eff = (m) => m.efficiency != null ? m.efficiency
  : (area(m) && m.pmax) ? +(m.pmax / (area(m) * 1000) * 100).toFixed(1) : null;
/* Fill factor FF = (Vmp·Imp)/(Voc·Isc) — derived, never stored. Good ≈ 0.78–0.84. */
const fillFactor = (m) => {
  const denom = (m.voc || 0) * (m.isc || 0);
  return denom > 0 ? +((m.vmp * m.imp) / denom).toFixed(3) : null;
};
/* Live FF stats across the catalogue — computed at runtime, never stale. */
function ffStats() {
  const v = DATA.map(fillFactor).filter((x) => x != null);
  if (!v.length) return null;
  return { n: v.length, avg: v.reduce((a, b) => a + b, 0) / v.length, min: Math.min(...v), max: Math.max(...v) };
}

const CtBadge = ({ ct }) => ct
  ? <span className={'ct-badge ct-' + ct.toLowerCase().replace(/[^a-z]/g, '')}>{ct}</span>
  : null;

export default function Modules() {
  const { t } = useI18n();
  const { on: learnOn, setLearn } = useLearn();
  const db = useDbList(DATA, {
    pmax:  { get: (x) => x.pmax || 0,  dir: 'desc' },
    ff:    { get: fillFactor,          dir: 'desc' },
    eurwp: { get: (x) => x.eurPerWp,   dir: 'asc' },   // asc = best value (cheapest €/Wp) first
  });

  /* String context — when arrived from a Components string row (?s=<stringId>). */
  const sParam  = new URLSearchParams(location.search).get('s');
  const strings = Array.isArray(Project.section('strings')) ? Project.section('strings') : [];
  const ctxIdx  = sParam != null ? strings.findIndex((s) => String(s.id) === String(sParam)) : -1;
  const ctxString = ctxIdx >= 0 ? strings[ctxIdx] : null;
  const ctxLbl = ctxString ? t('cmp.stringlbl') + ' ' + (ctxIdx + 1) : '';

  const mod = DATA.find((m) => m.id === db.selectedId) || null;
  const s = ffStats();
  const ff = mod ? fillFactor(mod) : null;
  const LO = 0.7, HI = 0.9, span = HI - LO;

  function useInString() {
    ctxString.moduleId = mod.id;
    Project.set('strings', strings);
    location.href = 'components.html';   // legacy page — full navigation
  }

  return (
    <>
      <div className="sn-crumb">
        <b>{t('inv.crumbRef')}</b> › <span>{t('mod.title')}</span>
        <a className="sn-ret" href="components.html">{t('inv.back')}</a>
      </div>

      <div id="db">
        <DbListPane db={db} BRANDS={BRANDS} searchPhKey="mod.search"
          sortBtns={[
            { key: 'pmax', label: <>P<sub>max</sub></> },
            { key: 'ff', label: 'FF' },
            { key: 'eurwp', label: '€/Wp' },
          ]}
          itemSub={(m) => <>
            {m.brandId ? brandName(m.brandId) + ' · ' : ''}{m.pmax} Wp · {(m.length && m.width) ? m.length + '×' + m.width + ' mm' : ''}
            {m.priceEur != null ? <> · ~€{m.priceEur}{m.eurPerWp != null ? ' (' + m.eurPerWp + '/Wp)' : ''}</> : null}
          </>} />

        <div id="detail-pane"><div id="detail">
          {mod && (
            <>
              <div className="d-title">{mod.name}</div>
              <div className="d-id">{mod.id}</div>
              {mod.cellType && <CtBadge ct={mod.cellType} />}
              {ctxString && <div className="d-ctx">→ {ctxLbl}</div>}
              <div className="d-actions">
                <DsLink href={mod.datasheet} />
                {mod.cpv ? (
                  <a className="ds-link" href={'https://comparepv.com/panel/' + mod.id} target="_blank" rel="noopener noreferrer">
                    {t('mod.comparepv')} ↗
                  </a>
                ) : null}
                {ctxString && <button className="use-btn" id="use-btn" onClick={useInString}>{t('mod.usein')} {ctxLbl}</button>}
              </div>
              {mod.note && <div className="d-note">{mod.note}</div>}
              <BrandHighlight BRANDS={BRANDS} brandId={mod.brandId} />
              <div className="mod-learn-row">
                <label className="xpl-toggle">
                  <input type="checkbox" id="mod-learn" checked={learnOn} onChange={(e) => setLearn(e.target.checked)} />
                  {' '}<span>{t('xpl.learnmode')}</span>
                </label>
              </div>
              {learnOn && (
                <div id="ff-explain" className="show">
                  <span className="ffe-title">{t('mod.ff')}</span>
                  <div className="ffe-f">FF = (V<sub>mp</sub>·I<sub>mp</sub>) / (V<sub>oc</sub>·I<sub>sc</sub>)</div>
                  <div className="ffe-d">{t('mod.ffdesc')}</div>
                  {s && (
                    <div className="ffe-stats">{t('mod.ffavg')} {s.avg.toFixed(3)}
                      {' '}<small>· min {s.min.toFixed(3)} · max {s.max.toFixed(3)} · N={s.n}</small></div>
                  )}
                </div>
              )}
              {learnOn && mod.cellType && (
                <div id="celltype-explain" className="show">
                  <span className="ffe-title">{t('mod.celltype')}: {mod.cellType}</span>
                  <div className="ffe-d">{t('mod.ct.' + mod.cellType.toLowerCase())}</div>
                </div>
              )}
              <div className="grp-title">{t('cmp.power')}</div>
              <div className="specs">
                <SpecCard label={<>P<sub>max</sub></>} v={mod.pmax} u="Wp" />
                <SpecCard k="mod.eff" v={eff(mod)} u="%" />
                <SpecCard label={<>γ P<sub>mpp</sub></>} v={mod.gamma} u="%/°C" />
              </div>
              <div className="grp-title">{t('mod.elec')}</div>
              <div className="specs">
                <SpecCard label={<>V<sub>oc</sub></>} v={mod.voc} u="V" />
                <SpecCard label={<>V<sub>mp</sub></>} v={mod.vmp} u="V" />
                <SpecCard label={<>I<sub>sc</sub></>} v={mod.isc} u="A" />
                <SpecCard label={<>I<sub>mp</sub></>} v={mod.imp} u="A" />
                <SpecCard k="mod.maxfuse" v={mod.maxfuse} u="A" />
                <SpecCard k="mod.ff" v={ff} u="" />
              </div>
              {ff != null && s && (
                <RangeBar left="0.7" right="0.9"
                          winLo={+((s.min - LO) / span * 100).toFixed(1)}
                          winHi={+((s.max - LO) / span * 100).toFixed(1)}
                          mark={+((ff - LO) / span * 100).toFixed(1)}
                          markTitle={'FF ' + ff} />
              )}
              <div className="grp-title">{t('mod.temp')}</div>
              <div className="specs">
                <SpecCard label={<>β V<sub>oc</sub></>} v={mod.lv} u="%/°C" />
                <SpecCard label={<>α I<sub>sc</sub></>} v={mod.li} u="%/°C" />
                <SpecCard label="NMOT" v={mod.nmot} u="°C" />
              </div>
              <div className="grp-title">{t('mod.phys')}</div>
              <div className="specs">
                <SpecCard label={t('cmp.size')} v={(mod.length && mod.width) ? mod.length + '×' + mod.width : null} u="mm" />
                <SpecCard k="mod.area" v={area(mod) != null ? area(mod).toFixed(2) : null} u="m²" />
              </div>
              {mod.priceEur != null && (
                <>
                  <div className="grp-title">{t('inv.pricegrp')}</div>
                  <div className="specs">
                    <div className="spec"><div className="k">{t('inv.price')}</div>
                      <div className="v">~ €{mod.priceEur}</div>
                      {mod.priceSrc && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, fontWeight: 400 }}>{mod.priceSrc}</div>}
                    </div>
                    {mod.eurPerWp != null && (
                      <div className="spec"><div className="k">{t('inv.value')}</div>
                        <div className="v">€{mod.eurPerWp} <small>/Wp</small></div></div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div></div>
      </div>
    </>
  );
}
