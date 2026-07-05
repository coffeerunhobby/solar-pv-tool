/* Inverter DB — React port of inverters.html (list/detail, search, brand filter,
   €/kW + kW sorts, hash deep links, MPPT-window bar, "use in project").
   Reads the legacy globals INVERTER_LIST / INVERTER_BRANDS. */
import { useI18n } from '../store/useI18n.js';
import { useProject } from '../store/useProject.js';
import { useDbList, DbListPane, BrandHighlight, DsLink, SpecCard, RangeBar } from '../db/DbShared.jsx';

const DATA   = typeof INVERTER_LIST   !== 'undefined' ? INVERTER_LIST   : [];
const BRANDS = typeof INVERTER_BRANDS !== 'undefined' ? INVERTER_BRANDS : [];
const brandName = (id) => (BRANDS.find((x) => x.id === id) || {}).name || id || '';

export default function Inverters() {
  const { t } = useI18n();
  const chosenId = useProject((s) => (s.components || {}).inverterId);
  const db = useDbList(DATA, {
    value: { get: (x) => x.eurPerKw, dir: 'asc' },   // €/kW asc = best value first
    kw:    { get: (x) => x.pac,      dir: 'desc' },  // kW desc = biggest first
  });

  const inv = DATA.find((i) => i.id === db.selectedId) || null;
  const chosen = !!(inv && chosenId === inv.id);
  const max = inv ? (Math.max(inv.vinvmax, inv.vmpptmax) || 1) : 1;

  return (
    <>
      <div className="sn-crumb">
        <b>{t('inv.crumbRef')}</b> › <span>{t('inv.title')}</span>
        <a className="sn-ret" href="components.html">{t('inv.back')}</a>
      </div>

      <div id="db">
        <DbListPane db={db} BRANDS={BRANDS} searchPhKey="inv.search"
          sortBtns={[{ key: 'value', label: '€/kW' }, { key: 'kw', label: 'kW' }]}
          itemSub={(i) => <>
            {i.brandId ? brandName(i.brandId) + ' · ' : ''}Max DC {i.vinvmax} V · MPPT {i.vmpptmin}–{i.vmpptmax} V
            {i.nmppt ? ' · ' + i.nmppt + '× MPPT' : ''}{i.eurPerKw != null ? ' · €' + i.eurPerKw + '/kW' : ''}
          </>} />

        <div id="detail-pane"><div id="detail">
          {inv && (
            <>
              <div className="d-title">{inv.name}</div>
              <div className="d-id">{inv.id}</div>
              <div className="d-actions">
                <DsLink href={inv.datasheet} />
                <button className={'use-btn' + (chosen ? ' is-used' : '')} id="use-btn"
                        onClick={() => { if (!chosen) Project.patch('components', { inverterId: inv.id }); }}>
                  {t(chosen ? 'inv.used' : 'inv.use')}
                </button>
              </div>
              {inv.note && <div className="d-note">{inv.note}</div>}
              <BrandHighlight BRANDS={BRANDS} brandId={inv.brandId} />
              <div className="grp-title">{t('inv.voltage')}</div>
              <div className="specs">
                <SpecCard k="inv.maxdc" v={inv.vinvmax} u="V" />
                <SpecCard k="inv.rated" v={inv.vrmppt} u="V" />
                <SpecCard k="inv.mpptmin" v={inv.vmpptmin} u="V" />
                <SpecCard k="inv.mpptmax" v={inv.vmpptmax} u="V" />
                <SpecCard k="inv.window" v={inv.vmpptmax - inv.vmpptmin} u="V" />
              </div>
              <RangeBar left="0 V" right={max + ' V'}
                        winLo={+(inv.vmpptmin / max * 100).toFixed(1)}
                        winHi={+(inv.vmpptmax / max * 100).toFixed(1)}
                        mark={+(inv.vrmppt / max * 100).toFixed(1)}
                        markTitle={'rated ' + inv.vrmppt + ' V'} />
              <div className="grp-title">{t('inv.current')}</div>
              <div className="specs">
                <SpecCard k="inv.imppt" v={inv.impptmax} u="A" />
                <SpecCard k="inv.isc" v={inv.iscmppt} u="A" />
              </div>
              <div className="grp-title">{t('inv.inputs')}</div>
              <div className="specs">
                <SpecCard k="inv.nmppt" v={inv.nmppt} u="" />
                <SpecCard k="inv.ndc" v={inv.ndc} u="" />
                <SpecCard k="inv.acpower" v={inv.pac ? +(inv.pac / 1000).toFixed(2) : ''} u="kW" />
              </div>
              {inv.priceEur != null && (
                <>
                  <div className="grp-title">{t('inv.pricegrp')}</div>
                  <div className="specs">
                    <div className="spec"><div className="k">{t('inv.price')}</div>
                      <div className="v">~ €{inv.priceEur}</div>
                      {inv.priceSrc && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, fontWeight: 400 }}>{inv.priceSrc}</div>}
                    </div>
                    {inv.eurPerKw != null && (
                      <div className="spec"><div className="k">{t('inv.value')}</div>
                        <div className="v">€{inv.eurPerKw} <small>/kW</small></div></div>
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
