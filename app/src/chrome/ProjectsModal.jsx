/* ProjectsModal — React port of site-nav.js's cloud-projects modal ("My projects").
   share-list returns refs only; the display name lives in each state blob, so the
   list fetches every project via share-load in parallel and caches the states for
   an instant Load click (logic ported verbatim from site-nav.js prjRefresh/prjSave). */
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../store/useI18n.js';
import { useReadOnly } from '../store/useProject.js';

export default function ProjectsModal({ onClose, onPaywall }) {
  const { t } = useI18n();
  const ro = useReadOnly();
  const [rows, setRows]     = useState(null);   // null = loading
  const [status, setStatus] = useState('');
  const states = useRef({});                    // ref → cached full state

  function fail401(e) {
    if (e && e.status === 401) { onClose(); onPaywall(); return true; }
    return false;
  }

  function refresh() {
    setRows(null); setStatus('');
    Share.list().then((res) => {
      const ps = (res && res.projects) || [];
      if (!ps.length) { setRows([]); return; }
      return Promise.all(ps.map((p) =>
        Share.loadByRef(p.projectRef).then((r) => {
          states.current[p.projectRef] = r.state || null;
          const meta = (r.state && r.state.meta) || {};
          p.name = meta.projectName || meta.name || p.projectRef;
          return p;
        }).catch(() => { p.name = p.projectRef; return p; })
      )).then(setRows);
    }).catch((e) => {
      if (fail401(e)) return;
      setRows([]); setStatus(t(Share.msgKey(e && e.status, false)));
    });
  }
  useEffect(refresh, []);   // eslint-disable-line react-hooks/exhaustive-deps

  function save() {
    setStatus('…');
    Share.save(Project.export())
      .then(() => { setStatus(t('prj.saved')); refresh(); })
      .catch((e) => { if (!fail401(e)) setStatus(t(Share.msgKey(e && e.status, true))); });
  }
  function load(ref) {
    if (!window.confirm(t('prj.confirmload'))) return;
    const go = (state) => {
      if (!state) { setStatus(t('share.loadfail')); return; }
      if (Project.isReadOnly()) Project.exitReadOnly();
      if (Project.importState(state)) location.href = 'index.html';
      else setStatus(t('loc.importerr'));
    };
    if (states.current[ref]) go(states.current[ref]);
    else Share.loadByRef(ref).then((r) => go(r.state))
      .catch((e) => { if (!fail401(e)) setStatus(t(Share.msgKey(e && e.status, false))); });
  }
  function remove(ref) {
    if (!window.confirm(t('prj.confirmdel'))) return;
    Share.remove(ref).then(() => { delete states.current[ref]; refresh(); })
      .catch((e) => { if (!fail401(e)) setStatus(t(Share.msgKey(e && e.status, true))); });
  }

  const curRef = (Project.section('meta') || {}).projectRef;
  return (
    <>
      <div className="modal fade show" id="sn-prj-modal" tabIndex="-1" style={{ display: 'block' }}
           onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable"><div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{t('prj.title')}</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div id="sn-prj-list">
              {rows === null && <div className="text-center py-3"><div className="spinner-border spinner-border-sm" /></div>}
              {rows && rows.length === 0 && !status && <div className="small text-secondary py-2">{t('prj.empty')}</div>}
              {rows && rows.length > 0 && (
                <div className="list-group list-group-flush">
                  {rows.map((p) => {
                    const kb = p.sizeBytes != null ? Math.max(1, Math.round(p.sizeBytes / 1024)) + ' KB' : '';
                    const d  = (p.updatedAt || '').slice(0, 10).split('-').reverse().join('.');
                    return (
                      <div className="list-group-item d-flex align-items-center gap-2 px-0" key={p.projectRef}>
                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                          <div className="fw-semibold text-truncate">
                            {p.name}{curRef === p.projectRef && <> <span className="badge text-bg-secondary">{t('prj.current')}</span></>}
                          </div>
                          <div className="small text-secondary">{[d, kb].filter(Boolean).join(' · ')}</div>
                        </div>
                        <button type="button" className="btn btn-sm btn-outline-primary" title={t('prj.loadbtn')}
                                onClick={() => load(p.projectRef)}>📂</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" title={t('prj.delbtn')}
                                onClick={() => remove(p.projectRef)}>🗑</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div id="sn-prj-status" className="small text-secondary mt-2">{status}</div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-p" id="sn-prj-save" disabled={ro}
                    title={ro ? t('nav.robanner') : undefined} onClick={save}>{t('prj.savecur')}</button>
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>{t('rep.close')}</button>
          </div>
        </div></div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
