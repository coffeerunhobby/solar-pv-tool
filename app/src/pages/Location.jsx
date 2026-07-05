/* Location (step 1) — React port of index.html + js/app.js (the composition
   root the shell deliberately does not load). Leaflet + js/map.js LAZY-load on
   first mount (loadScript cached promise); map.js/canvas.js/elevation.js are
   reused untouched — this component transplants app.js's load handler:
   - rehydrate lat/lon/elevation/tz + meta from Project; feed saved obstacles/
     terrain horizon so the sun-path chart shows the horizon overlay
   - window.onLocationChange → persistLocation (map.js calls it on every map
     click/drag/search/manual edit) and window.onThemeChange → tiles+canvas
     repaint, both REVERSIBLE (cleanup removes them; the shared theme.js would
     otherwise call a stale closure on other routes)
   - setCurrentTab('sunpath') on mount — canvas.js's mode is a shared global in
     the SPA and the Obstacles route sets it to 'horizon'
   - map instance removed on unmount (legacy page unload did this implicitly) */
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../store/useI18n.js';
import { loadScript, loadCss } from '../legacy/loadScript.js';
import SmartLink from '../components/SmartLink.jsx';
import './Location.css';

const V = typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'dev';

function persistLocation() {
  Project.patch('location', {
    lat:       parseFloat(document.getElementById('lat').value),
    lon:       parseFloat(document.getElementById('lon').value),
    elevation: parseFloat(document.getElementById('site-elevation').value),
    tz:        parseFloat(document.getElementById('tz').value),
  });
  Project.markDone('location');
}
function persistMeta() {
  const first = document.getElementById('pr-first').value.trim();
  const last  = document.getElementById('pr-last').value.trim();
  Project.patch('meta', {
    first, last, name: (first + ' ' + last).trim(),
    address:     document.getElementById('pr-address').value,
    projectName: document.getElementById('pr-pname').value.trim(),
  });
}

export default function Location() {
  const { t, lang } = useI18n();
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      loadCss('/vendor/leaflet.css');
      await loadScript('/vendor/leaflet.js');
      await loadScript('/js/map.js?v=' + V);
      if (dead) return;

      /* page hooks map.js/theme.js call — reversible */
      window.onLocationChange = () => persistLocation();
      window.onThemeChange = () => { if (typeof updateTiles === 'function') updateTiles(); drawCanvas(); };

      setCurrentTab('sunpath');
      initMap();

      /* ── rehydrate (app.js load handler, transplanted) ── */
      const loc = Project.section('location');
      if (loc && loc.lat != null && loc.lon != null) {
        document.getElementById('lat').value = loc.lat;
        document.getElementById('lon').value = loc.lon;
        if (loc.elevation != null && !isNaN(loc.elevation)) document.getElementById('site-elevation').value = loc.elevation;
        if (loc.tz != null) document.getElementById('tz').value = loc.tz;
        if (loc.terrainHorizon && typeof setTerrainHorizon === 'function') setTerrainHorizon(loc.terrainHorizon);
        syncMap();
      }
      const meta = Project.section('meta');
      if (meta) {
        document.getElementById('pr-first').value   = meta.first   || '';
        document.getElementById('pr-last').value    = meta.last    || '';
        document.getElementById('pr-address').value = meta.address || '';
        document.getElementById('pr-pname').value   = meta.projectName || '';
      }
      const refEl = document.getElementById('pr-ref');
      if (refEl && typeof Share !== 'undefined' && Share.ref) {
        try { refEl.textContent = Share.ref(); } catch (e) {}
      }
      /* feed saved obstacles so the sun-path chart shows the horizon overlay */
      const orient = Project.section('orientation');
      if (orient) {
        if (Array.isArray(orient.obstacles) && orient.obstacles.length && typeof setObstacles === 'function') {
          setObstacles(orient.obstacles.map((o) => ({ ...o })));
        }
        if (Array.isArray(orient.importedHorizon) && typeof setImportedHorizon === 'function') {
          setImportedHorizon(orient.importedHorizon.slice());
        }
      }

      drawCanvas();
      readyRef.current = true;
      setReady(true);
      setTimeout(() => { if (typeof map !== 'undefined' && map) map.invalidateSize(); }, 200);
    })().catch((e) => console.warn('Location init failed:', e));

    return () => {
      dead = true;
      delete window.onLocationChange;
      delete window.onThemeChange;
      try { if (typeof map !== 'undefined' && map) { map.remove(); window.map = null; } } catch (e) {}
    };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  /* language switch: the canvas legend caches translated text */
  useEffect(() => { if (readyRef.current) drawCanvas(); }, [lang]);

  return (
    <div className="idx-scroll">
      <div className="row g-3">
        <div className="col-md-3 col-12 panel">
          <div className="card">
            <div className="sec">{t('loc.title')}</div>
            <div id="map" />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{t('loc.hint')}</div>
            <div className="row2" style={{ marginTop: '.4rem' }}>
              <div className="field"><label>{t('loc.lat')}</label>
                <input type="number" id="lat" defaultValue={51.4769} step="0.0001"
                       onChange={() => ready && syncMap()} /></div>
              <div className="field"><label>{t('loc.lon')}</label>
                <input type="number" id="lon" defaultValue={-0.0005} step="0.0001"
                       onChange={() => ready && syncMap()} /></div>
            </div>
            <div className="field" style={{ marginTop: '.3rem' }}>
              <label>
                <span>{t('loc.elev')}</span>{' '}
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{t('loc.elev.hint')}</span>{' '}
                <SmartLink href="elevationViz.html" newTab title="View elevation grid"
                   style={{ fontSize: 14, color: 'var(--text3)', textDecoration: 'none', opacity: .7, lineHeight: 1 }}>ⓘ</SmartLink>
              </label>
              <input type="number" id="site-elevation" defaultValue={0} min="0" max="8850" step="1"
                     onChange={() => ready && persistLocation()} />
            </div>
            <div style={{ display: 'flex', gap: 5, marginTop: '.3rem' }}>
              <input type="text" id="search" placeholder={t('loc.search.ph')}
                     style={{ flex: 1, minWidth: 0, fontSize: 12, padding: '5px 7px', background: 'var(--input-bg)', color: 'var(--text)', border: '0.5px solid var(--border)', borderRadius: 6, outline: 'none' }}
                     onKeyDown={(e) => { if (e.key === 'Enter' && ready) searchPlace(); }} />
              <button className="btn btn-sm btn-p" id="search-go" style={{ flex: 'none', whiteSpace: 'nowrap' }}
                      onClick={() => ready && searchPlace()}>{t('loc.search.go')}</button>
            </div>
            <div id="searchmsg" style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }} />
          </div>

          <div className="card">
            <div className="sec">{t('tz.title')}</div>
            <select id="tz" defaultValue="0" onChange={() => ready && persistLocation()}
                    style={{ width: '100%', fontSize: 12, padding: '5px 7px', background: 'var(--input-bg)', color: 'var(--text)', border: '0.5px solid var(--border)', borderRadius: 6 }}>
              <option value="-12">UTC−12</option><option value="-11">UTC−11</option><option value="-10">UTC−10</option>
              <option value="-9">UTC−9</option><option value="-8">UTC−8 (PST)</option><option value="-7">UTC−7</option>
              <option value="-6">UTC−6</option><option value="-5">UTC−5 (EST)</option><option value="-4">UTC−4</option>
              <option value="-3">UTC−3</option><option value="-2">UTC−2</option><option value="-1">UTC−1</option>
              <option value="0">UTC+0 (Greenwich)</option>
              <option value="1">UTC+1</option><option value="2">UTC+2 (EET)</option><option value="3">UTC+3</option>
              <option value="3.5">UTC+3:30</option><option value="4">UTC+4</option><option value="4.5">UTC+4:30</option>
              <option value="5">UTC+5</option><option value="5.5">UTC+5:30</option><option value="6">UTC+6</option>
              <option value="7">UTC+7</option><option value="8">UTC+8</option><option value="9">UTC+9</option>
              <option value="9.5">UTC+9:30</option><option value="10">UTC+10</option><option value="11">UTC+11</option>
              <option value="12">UTC+12</option>
            </select>
          </div>

          {/* SUN PATH panel */}
          <div id="sp-panel">
            <div className="card">
              <div className="sec">{t('sp.dates')}</div>
              <div className="rg">
                <label><input type="radio" name="do" value="ALL" defaultChecked /> <span>{t('sp.all12')}</span></label>
                <label><input type="radio" name="do" value="WS" /> <span>{t('sp.dec_jun')}</span></label>
                <label><input type="radio" name="do" value="SW" /> <span>{t('sp.jun_dec')}</span></label>
                <label><input type="radio" name="do" value="SD" /> <span>{t('sp.single')}</span></label>
              </div>
              <div className="field" style={{ marginTop: '.35rem' }}><input type="date" id="sd" defaultValue="2026-06-21" /></div>
              <div style={{ marginTop: '.5rem', paddingTop: '.5rem', borderTop: '0.5px solid var(--border)' }}>
                <div className="rg">
                  <label><input type="radio" name="to" value="lst" defaultChecked /> <span>{t('sp.lst')}</span></label>
                  <label><input type="radio" name="to" value="solar" /> <span>{t('sp.solar')}</span></label>
                </div>
              </div>
              <button id="sp-draw" className="btn btn-p w-100" style={{ marginTop: '.5rem' }} onClick={() => ready && drawCanvas()}>{t('sp.draw')}</button>
              <button className="btn btn-outline-secondary w-100" style={{ marginTop: 4 }} onClick={() => ready && dlPNG()}>{t('sp.download')}</button>
            </div>
          </div>
        </div>

        {/* MAIN AREA */}
        <div className="col-md-9 col-12" id="main-area">
          <div className="card" id="pr-details-card">
            <div className="sec" style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span>{t('nav.project_details')}</span>
              <span id="pr-ref" title={t('nav.projectref.hint')}
                    style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11, fontWeight: 400, color: 'var(--text3)', textTransform: 'none', letterSpacing: 0, userSelect: 'all', cursor: 'text' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
              <div className="field"><label>{t('nav.projectname')}</label>
                <input type="text" id="pr-pname" onInput={() => ready && persistMeta()} /></div>
              <div className="field"><label>{t('nav.firstname')}</label>
                <input type="text" id="pr-first" onInput={() => ready && persistMeta()} /></div>
              <div className="field"><label>{t('nav.lastname')}</label>
                <input type="text" id="pr-last" onInput={() => ready && persistMeta()} /></div>
              <div className="field"><label>{t('nav.address')}</label>
                <input type="text" id="pr-address" onInput={() => ready && persistMeta()} /></div>
            </div>
          </div>
          <div id="chart-area">
            <canvas id="C" width="860" height="560" />
            <div className="legend" id="legend" />
          </div>
        </div>
      </div>
    </div>
  );
}
