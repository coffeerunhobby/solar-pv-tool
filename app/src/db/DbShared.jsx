/* DbShared — the machinery common to the three reference-DB pages
   (Batteries / Inverters / Modules): list filtering + sorting state, hash
   deep-link sync, the list pane (sort buttons · search · brand filter · rows)
   and the small spec-card building blocks. Ports the identical inline-IIFE
   logic of the legacy pages 1:1. */
import { useEffect, useState } from 'react';
import { useI18n } from '../store/useI18n.js';
import { useCatalog } from '../store/useCatalog.js';
import './DbPage.css';

export const fnum = (v) => (v == null || v === '') ? null : (+v).toFixed(2).replace(/\.?0+$/, '');

/* value slot: legacy fmt() — dash when null, unit in <small> */
export const Val = ({ v, u }) =>
  (v == null || v === '') ? <span style={{ color: 'var(--text3)' }}>-</span>
    : <>{v}{u ? <> <small>{u}</small></> : null}</>;

/* spec card: `k` = i18n key for the label, or pass `label` as a ready node */
export function SpecCard({ k, label, v, u }) {
  const { t } = useI18n();
  return <div className="spec"><div className="k">{label != null ? label : t(k)}</div><div className="v"><Val v={v} u={u} /></div></div>;
}

/* horizontal range bar (inverter MPPT window / module FF range) */
export function RangeBar({ left, right, winLo, winHi, mark, markTitle }) {
  return (
    <div className="bar-wrap">
      <div className="bar-scale"><span>{left}</span><span>{right}</span></div>
      <div className="bar">
        <div className="bar-window" style={{ left: winLo + '%', width: (winHi - winLo) + '%' }} />
        <div className="bar-rated" style={{ left: mark + '%' }} title={markTitle} />
      </div>
    </div>
  );
}

/* list state: search + brand + toggle-sorts + hash-synced selection.
   sorters = { key: { get: row=>val, dir: 'asc'|'desc' (initial), nullsLast: true } } */
export function useDbList(DATA, sorters) {
  useCatalog();   // re-render when a catalog sync mutates the underlying list (same DATA ref)
  const [q, setQ] = useState('');
  const [brand, setBrand] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [selectedId, setSelectedId] = useState(() => {
    const h = location.hash.slice(1);
    if (h && DATA.some((i) => i.id === h)) return h;
    return DATA.length ? DATA[0].id : null;
  });

  function select(id) {
    if (!DATA.some((i) => i.id === id)) return;
    setSelectedId(id);
    if (location.hash.slice(1) !== id) { try { history.replaceState(null, '', '#' + id); } catch (e) {} }
  }
  useEffect(() => {
    const onHash = () => { const h = location.hash.slice(1); if (h && DATA.some((i) => i.id === h)) setSelectedId(h); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSort(key) {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(sorters[key].dir || 'asc'); }
  }

  let rows = DATA.filter((i) =>
    (!brand || i.brandId === brand) &&
    (!q || (i.name + ' ' + (i.note || '') + ' ' + i.id).toLowerCase().includes(q.trim().toLowerCase())));
  if (sortKey) {
    const { get } = sorters[sortKey];
    rows = [...rows].sort((a, b) => {
      const va = get(a), vb = get(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1; if (vb == null) return -1;   // nulls/unpriced always last
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }

  return { DATA, q, setQ, brand, setBrand, sortKey, sortDir, toggleSort, selectedId, select, rows };
}

/* the left pane: sort buttons + search + brand filter + item list.
   sortBtns = [{key, label(node)}]; itemSub = row => node (the .sub line) */
export function DbListPane({ db, BRANDS, sortBtns, searchPhKey, itemSub }) {
  const { t } = useI18n();
  const brandName = (id) => (BRANDS.find((x) => x.id === id) || {}).name || id || '';
  const brandIds = [...new Set(db.DATA.map((i) => i.brandId).filter(Boolean))]
    .sort((a, b) => brandName(a).localeCompare(brandName(b)));
  return (
    <div id="list-pane">
      <div id="search-wrap">
        <div id="sort-row">
          {sortBtns.map(({ key, label }) => (
            <button key={key} className={'sort-btn' + (db.sortKey === key ? ' active' : '')}
                    id={'sort-' + key} onClick={() => db.toggleSort(key)}>
              {label}{db.sortKey === key ? (db.sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
            </button>
          ))}
        </div>
        <input id="search" type="search" placeholder={t(searchPhKey)} autoComplete="off" spellCheck="false"
               value={db.q} onChange={(e) => db.setQ(e.target.value)} />
        <select id="brand-filter" value={db.brand} onChange={(e) => db.setBrand(e.target.value)}>
          <option value="">{t('db.allbrands')}</option>
          {brandIds.map((id) => <option key={id} value={id}>{brandName(id)}</option>)}
        </select>
      </div>
      <div id="list">
        {db.rows.map((row) => (
          <div key={row.id} className={'item' + (row.id === db.selectedId ? ' active' : '')}
               onClick={() => db.select(row.id)}>
            <div className="nm">{row.name}</div>
            <div className="sub">{itemSub(row)}</div>
          </div>
        ))}
      </div>
      {!db.rows.length && <div id="empty">-</div>}
    </div>
  );
}

/* the selected brand's one-liner highlight (shown inside the detail pane) */
export function BrandHighlight({ BRANDS, brandId }) {
  const obj = brandId ? BRANDS.find((x) => x.id === brandId) : null;
  if (!obj || !obj.highlight) return null;
  return <div id="brand-hl" className="show"><span className="bh-name">{obj.name}</span>{obj.highlight}</div>;
}

/* datasheet button-or-dash */
export function DsLink({ href }) {
  const { t } = useI18n();
  return href
    ? <a className="ds-link" href={href} target="_blank" rel="noopener noreferrer">{t('inv.datasheet')}</a>
    : <span className="ds-none">{t('inv.nods')}</span>;
}
