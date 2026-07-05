/* Battery DB — React port of batteries.html (list/detail, search, brand filter,
   €/kWh + kWh sort toggles, #<id> hash deep links, "use in project" button).
   Reads the legacy globals BATTERY_LIST / BATTERY_BRANDS / INVERTER_BRANDS.
   Uses the shared DbShared list machinery (hoisted in P2). */
import { useI18n } from '../store/useI18n.js';
import { useProject } from '../store/useProject.js';
import { useDbList, DbListPane, BrandHighlight, DsLink, SpecCard, fnum } from '../db/DbShared.jsx';
import './Batteries.css';

const DATA   = typeof BATTERY_LIST    !== 'undefined' ? BATTERY_LIST    : [];
const BRANDS = typeof BATTERY_BRANDS  !== 'undefined' ? BATTERY_BRANDS  : [];
const INVB   = typeof INVERTER_BRANDS !== 'undefined' ? INVERTER_BRANDS : [];
const brandName    = (id) => (BRANDS.find((x) => x.id === id) || {}).name || id || '';
const invBrandName = (id) => (INVB.find((x) => x.id === id) || {}).name || id || '';

const PctCard = ({ k, v, t }) => (
  <div className="spec"><div className="k">{t(k)}</div>
    <div className="v">{v == null ? <span style={{ color: 'var(--text3)' }}>-</span> : <>{fnum(v * 100)} <small>%</small></>}</div>
  </div>
);

export default function Batteries() {
  const { t } = useI18n();
  const chosenId = useProject((s) => (s.components || {}).batteryId);
  const db = useDbList(DATA, {
    value: { get: (x) => x.eurPerKwh,  dir: 'asc' },   // €/kWh asc = best value first
    kwh:   { get: (x) => x.kwhUsable,  dir: 'desc' },  // kWh desc = biggest first
  });

  const bat = DATA.find((i) => i.id === db.selectedId) || null;
  const chosen = !!(bat && chosenId === bat.id);
  const modRange = bat && bat.moduleKwh && bat.modulesMin && bat.modulesMax
    ? fnum(bat.moduleKwh) + ' kWh × ' + bat.modulesMin + '-' + bat.modulesMax : null;

  return (
    <>
      <div className="sn-crumb">
        <b>{t('inv.crumbRef')}</b> › <span>{t('bat.title')}</span>
        <a className="sn-ret" href="components.html">{t('inv.back')}</a>
      </div>

      <div id="db">
        <DbListPane db={db} BRANDS={BRANDS} searchPhKey="bat.search"
          sortBtns={[{ key: 'value', label: '€/kWh' }, { key: 'kwh', label: 'kWh' }]}
          itemSub={(b) => <>
            {b.brandId ? brandName(b.brandId) + ' · ' : ''}{fnum(b.kwhUsable)} kWh · {fnum(b.pDischargeKw)} kW · {(b.architecture || '').toUpperCase()}
            {b.eurPerKwh != null ? ' · €' + b.eurPerKwh + '/kWh' : ''}
          </>} />

        <div id="detail-pane"><div id="detail">
          {bat && (
            <>
              <div className="d-title">
                {bat.name}
                {bat.architecture && <span className={'arch-pill arch-' + bat.architecture}>{bat.architecture.toUpperCase()}</span>}
              </div>
              <div className="d-id">{bat.id}</div>
              <div className="d-actions">
                <DsLink href={bat.datasheet} />
                <button className={'use-btn' + (chosen ? ' is-used' : '')} id="use-btn"
                        onClick={() => { if (!chosen) Project.patch('components', { batteryId: bat.id }); }}>
                  {t(chosen ? 'bat.used' : 'bat.use')}
                </button>
              </div>
              {bat.note && <div className="d-note">{bat.note}</div>}
              <BrandHighlight BRANDS={BRANDS} brandId={bat.brandId} />
              <div className="grp-title">{t('bat.capacity')}</div>
              <div className="specs">
                <SpecCard k="bat.usable" v={bat.kwhUsable} u="kWh" />
                <SpecCard k="bat.nominal" v={bat.kwhNominal} u="kWh" />
                <div className="spec"><div className="k">{t('bat.module')}</div>
                  <div className="v">{modRange || <span style={{ color: 'var(--text3)' }}>-</span>}</div></div>
              </div>
              <div className="grp-title">{t('bat.power')}</div>
              <div className="specs">
                <SpecCard k="bat.pcharge" v={bat.pChargeKw} u="kW" />
                <SpecCard k="bat.pdischarge" v={bat.pDischargeKw} u="kW" />
                <SpecCard k="bat.ppeak" v={bat.pPeakKw} u="kW" />
                <PctCard k="bat.eff" v={bat.effRt} t={t} />
              </div>
              <div className="grp-title">{t('bat.limits')}</div>
              <div className="specs">
                <PctCard k="bat.dod" v={bat.dod} t={t} />
                <SpecCard k="bat.socmin" v={bat.socMin} u="%" />
                <SpecCard k="bat.vnom" v={bat.vnom} u="V" />
                <div className="spec"><div className="k">{t('bat.chem')}</div>
                  <div className="v" style={{ fontSize: 14 }}>{bat.chemistry || '-'}</div></div>
              </div>
              <div className="grp-title">{t('bat.life')}</div>
              <div className="specs">
                <SpecCard k="bat.cycles" v={bat.cycles} u="" />
                <SpecCard k="bat.warranty" v={bat.warrantyYears} u={t('bat.yrs')} />
                {bat.priceEur != null && (
                  <div className="spec"><div className="k">{t('bat.price')}</div>
                    <div className="v">~ €{fnum(bat.priceEur)}</div>
                    {bat.priceSrc && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, fontWeight: 400 }}>{bat.priceSrc}</div>}
                  </div>
                )}
                {bat.eurPerKwh != null && (
                  <div className="spec"><div className="k">{t('bat.value')}</div>
                    <div className="v">€{bat.eurPerKwh} <small>/kWh</small></div></div>
                )}
              </div>
              <div className="grp-title">{t('bat.compat')}</div>
              {(bat.compatBrands || []).length
                ? <div className="compat-tags">{bat.compatBrands.map((id) => <span key={id} className="compat-tag">{invBrandName(id)}</span>)}</div>
                : <span className="ds-none">{t('bat.compatany')}</span>}
              {bat.protocol && <div className="d-id" style={{ marginTop: 8 }}>{t('bat.protocol')}: {bat.protocol}</div>}
            </>
          )}
        </div></div>
      </div>
    </>
  );
}
