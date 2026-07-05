/* Topbar — React port of site-nav.js buildTopbar()/wireAccount(): brand +
   version + the account avatar dropdown (cloud saves · import/export JSON ·
   language · theme · clean · switch-back · exit). Same ids/classes as legacy
   so css/style.css chrome styles apply unchanged. */
import { useEffect, useRef, useState } from 'react';
import { useI18n, changeLang } from '../store/useI18n.js';
import { useTheme } from '../store/useTheme.js';
import { useReadOnly } from '../store/useProject.js';
import { useCatalog } from '../store/useCatalog.js';
import { cloudCreds } from '../gate/GateProvider.jsx';
import ProjectsModal from './ProjectsModal.jsx';

export default function Topbar({ onToggleNav, onPaywall }) {
  const { t, lang } = useI18n();
  const { dark, setDark } = useTheme();
  const ro = useReadOnly();
  const { dataVersion, sync } = useCatalog();
  const [open, setOpen] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const fileRef = useRef(null);
  const hasSession = (() => { try { return !!localStorage.getItem('spv_t'); } catch (e) { return false; } })();

  /* close the menu on any outside click (legacy document-click behavior) */
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  function exportJson() {
    setOpen(false);
    const m = Project.section('meta') || {}, who = [m.first, m.last].filter(Boolean).join(' ');
    const slug = (m.name || m.last || who || 'proiect').toString().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'proiect';
    const blob = new Blob([JSON.stringify(Project.export(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'solar-pv-' + slug + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function importJson() {
    const f = fileRef.current.files && fileRef.current.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      let obj = null; try { obj = JSON.parse(reader.result); } catch (e) {}
      if (Project.isReadOnly()) Project.exitReadOnly();
      if (obj && Project.importState(obj)) location.href = 'index.html';
      else window.alert(t('loc.importerr'));
      fileRef.current.value = '';
    };
    reader.readAsText(f);
  }
  function clean() {
    setOpen(false);
    if (!window.confirm(t('rep.clearconfirm'))) return;
    if (Project.isReadOnly()) Project.exitReadOnly();
    Project.reset();
    location.href = 'index.html';
  }
  function openProjects() {
    setOpen(false);
    if (typeof Share === 'undefined' || !cloudCreds()) { onPaywall(); return; }
    setShowProjects(true);
  }
  function syncCatalog() {
    if (syncing) return;
    setSyncing(true);
    Promise.resolve(sync()).then((r) => {
      if (r && r.updated) window.alert(t('nav.catalogupdated').replace('{v}', r.version));
      else window.alert(t('nav.catalogcurrent'));
    }).catch(() => window.alert(t('nav.catalogerr'))).then(() => { setSyncing(false); setOpen(false); });
  }
  function logout() {
    if (Project.isReadOnly()) Project.exitReadOnly();
    if (typeof window.gateLogout === 'function') { window.gateLogout(); return; }
    try { localStorage.removeItem('spv_t'); } catch (e) {}
    location.reload();
  }

  return (
    <div id="site-topbar" className="topbar">
      <button className="sn-collapse" id="sn-collapse" title={t('nav.collapse')} onClick={onToggleNav}>☰</button>
      <div className="topbar-brand">
        <img className="topbar-logo" src="/logo.png" alt="" width="20" height="20"
             style={{ borderRadius: 5, display: 'block' }} />
        <span className="topbar-name">{t('nav.brand')}</span>
        <span className="sn-sub" title="version">· v{typeof APP_VERSION !== 'undefined' ? APP_VERSION : '?'}</span>
      </div>
      <div className="topbar-end">
        <div className="sn-account" id="sn-account">
          <button className="sn-avatar" id="sn-avatar" title={t('nav.account')} aria-haspopup="true"
                  onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
            <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
              <circle cx="12" cy="8" r="3.6" fill="currentColor" />
              <path d="M4.5 20c0-4 3.6-6 7.5-6s7.5 2 7.5 6z" fill="currentColor" />
            </svg>
          </button>
          <div className="sn-menu" id="sn-menu" hidden={!open} onClick={(e) => e.stopPropagation()}>
            <button className="sn-menu-item" id="sn-projects" onClick={openProjects}>{t('nav.loadproject')}</button>
            <button className="sn-menu-item" id="sn-import" onClick={() => { setOpen(false); fileRef.current.click(); }}>{t('nav.importjson')}</button>
            <button className="sn-menu-item" id="sn-export" onClick={exportJson}>{t('nav.exportjson')}</button>
            <input type="file" id="sn-import-file" accept=".json,application/json" style={{ display: 'none' }}
                   ref={fileRef} onChange={importJson} />
            <div className="sn-menu-sep" />
            <button className="sn-menu-item" id="sn-catalog" onClick={syncCatalog} disabled={syncing}>
              {syncing ? t('nav.catalogsyncing') : t('nav.catalogsync')}
              <span className="sn-sub" style={{ marginLeft: 6, opacity: 0.6 }}>v{dataVersion}</span>
            </button>
            <div className="sn-menu-sep" />
            <div className="sn-menu-row">
              <span>{t('nav.langlabel')}</span>
              <select id="lang-select" className="sn-lang" value={lang} onChange={(e) => changeLang(e.target.value)}>
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            <div className="sn-menu-row">
              <span>{t('nav.themelabel')}</span>
              <label className="theme-toggle" title={t('nav.theme')}>
                <input type="checkbox" id="theme-chk" checked={dark} onChange={(e) => setDark(e.target.checked)} />
                <span className="tt-track"><span>☀</span><span>☾</span><span className="tt-thumb" /></span>
              </label>
            </div>
            <button className="sn-menu-item" id="sn-clean" onClick={clean}>{t('nav.clean')}</button>
            {(ro || hasSession) && <div className="sn-menu-sep" id="sn-sep-actions" />}
            {ro && (
              <button className="sn-menu-item" id="sn-exit-ro"
                      onClick={() => { Project.exitReadOnly(); location.href = 'index.html'; }}>
                {t('nav.switchback')}
              </button>
            )}
            {hasSession && <button className="sn-menu-item" id="sn-logout" onClick={logout}>{t('nav.exit')}</button>}
          </div>
        </div>
      </div>
      {showProjects && <ProjectsModal onClose={() => setShowProjects(false)} onPaywall={onPaywall} />}
    </div>
  );
}
