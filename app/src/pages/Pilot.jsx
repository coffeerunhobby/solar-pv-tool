/* Pilot — dev-only smoke page (/app-pilot.html, never deployed): proves the
   shell chrome, store reactivity, i18n and theme wiring end-to-end. Removed
   from ported.js when the migration is complete enough not to need it. */
import { useProject } from '../store/useProject.js';
import { useI18n } from '../store/useI18n.js';

export default function Pilot() {
  const { t, lang } = useI18n();
  const meta = useProject((s) => s.meta || {});
  const version = Project.version();

  return (
    <div style={{ padding: 20, overflowY: 'auto' }}>
      <div className="card" style={{ maxWidth: 560 }}>
        <div className="sec">SPA pilot — smoke test</div>
        <ul style={{ fontSize: 13, lineHeight: 2 }}>
          <li>APP_VERSION: <b>{typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'MISSING'}</b></li>
          <li>Legacy globals: Project <b>{typeof Project !== 'undefined' ? 'OK' : 'MISSING'}</b> ·
              t() <b>{typeof t === 'function' ? 'OK' : 'MISSING'}</b> ·
              SITE_MAP <b>{typeof SITE_MAP !== 'undefined' ? SITE_MAP.length + ' rows' : 'MISSING'}</b> ·
              BATTERY_LIST <b>{typeof BATTERY_LIST !== 'undefined' ? BATTERY_LIST.length : 'MISSING'}</b> ·
              Share <b>{typeof Share !== 'undefined' ? 'OK' : 'MISSING'}</b></li>
          <li>Store version: <b>{version}</b> · project: <b>{meta.projectName || meta.name || '(blank)'}</b></li>
          <li>Language: <b>{lang}</b> — brand says: <b>{t('nav.brand')}</b></li>
        </ul>
        <button className="btn btn-outline-secondary btn-sm" style={{ width: 240 }}
                onClick={() => Project.patch('meta', { _pilotPing: Date.now() })}>
          Patch store (version should bump)
        </button>
      </div>
    </div>
  );
}
