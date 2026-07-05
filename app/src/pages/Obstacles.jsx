/* Obstacles (step 2) — React port of obstacles.html. The heavy lifting stays in
   the legacy engines (js/obstacles.js state + list renderer, js/canvas.js
   drawHorizonChart, js/convention.js): this component renders the page frame
   with React and drives the globals:
   - hydrates obstacles/imported/terrain state from Project on every mount
     (the engine state is module-global in the shell and outlives routes)
   - wraps window.drawCanvas REVERSIBLY so every mutation path persists to
     Project.section('orientation') (legacy wrapped it permanently per page
     load; in the SPA the wrapper must unwind on unmount or it would stack)
   - re-wires the #hz-list click delegation the legacy file only attaches on
     DOMContentLoaded (which fired before React mounted)
   - #hz-list itself stays legacy-rendered (obstacles.js renderList) — the
     global applyI18n → renderList() hook then re-labels it on language switch
     exactly as it always did. */
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../store/useI18n.js';
import SmartLink from '../components/SmartLink.jsx';
import './Obstacles.css';

export default function Obstacles() {
  const { t, lang } = useI18n();
  const [conv, setConv] = useState(() => (typeof getConvention === 'function' ? getConvention() : 'nav'));
  const loc = Project.section('location') || {};
  const hasLoc = loc.lat != null && loc.lon != null;

  useEffect(() => {
    /* terrain horizon (green) was fetched + stored by step 1; restore for the chart */
    if (loc.terrainHorizon && typeof setTerrainHorizon === 'function') setTerrainHorizon(loc.terrainHorizon);

    /* rehydrate the full obstacle set so it stays editable/exportable */
    const orient = Project.section('orientation');
    setObstacles(orient && Array.isArray(orient.obstacles) ? orient.obstacles.map((o) => ({ ...o })) : []);
    setImportedHorizon(orient && Array.isArray(orient.importedHorizon) ? orient.importedHorizon.slice() : null,
      t('obs.saved'));

    /* persist on every change — drawCanvas is the common hook all mutations call */
    const orig = window.drawCanvas;
    window.drawCanvas = function () {
      orig();
      try {
        Project.patch('orientation', {
          obstacles: getObstacles().map((o) => ({ ...o })),
          importedHorizon: getImportedHorizon(),
          horizon: buildHorizonArr(),
        });
      } catch (e) {}
    };

    setCurrentTab('horizon');
    renderList();          // legacy list renderer owns #hz-list
    window.drawCanvas();   // initial draw + persist rehydrated state

    /* Obstacles is OPTIONAL — a clear horizon is a valid answer; done on visit. */
    if (!Project.isDone('obstacles')) Project.markDone('obstacles');

    return () => { window.drawCanvas = orig; };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  /* language switch: applyI18n already re-runs the legacy renderList for the
     list; the canvas legend needs an explicit redraw. */
  useEffect(() => { if (typeof drawCanvas === 'function') drawCanvas(); }, [lang]);

  function pickConvention(c) {
    setConventionState(c);
    setConv(c);
    drawCanvas();
  }

  /* legacy #hz-list click delegation (DOMContentLoaded wiring no-ops in the SPA) */
  function onListClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'clear-imported') clearImported();
    if (btn.dataset.action === 'remove-obs') removeObs(+btn.dataset.idx);
  }

  const nav = conv === 'nav';
  return (
    <>
      <div className="sn-crumb"><b>{t('nav.phaseA')}</b> › <span>{t('nav.obstacles')}</span></div>

      {/* hidden location inputs consumed by canvas.js */}
      <input type="hidden" id="lat" defaultValue={hasLoc ? loc.lat : 45.9432} />
      <input type="hidden" id="lon" defaultValue={hasLoc ? loc.lon : 24.9668} />
      <input type="hidden" id="tz" defaultValue={loc.tz != null ? loc.tz : 0} />

      <div className="obs-scroll">
        <div className="row g-3">
          {/* controls */}
          <div className="col-md-3 col-12 panel">
            <div className="card">
              <div className="sec">{t('hz.convention')}</div>
              <div className="btn-group conv-seg w-100" role="group">
                <button type="button" className={'btn btn-outline-secondary' + (nav ? ' active' : '')}
                        onClick={() => pickConvention('nav')}>
                  <span>{t('hz.nav.btn')}</span><br /><span style={{ fontSize: 10, opacity: .7 }}>0°=North ↻</span>
                </button>
                <button type="button" className={'btn btn-outline-secondary' + (!nav ? ' active' : '')}
                        onClick={() => pickConvention('pvgis')}>
                  <span>{t('hz.pvgis.btn')}</span><br /><span style={{ fontSize: 10, opacity: .7 }}>0°=South ↻</span>
                </button>
              </div>
              <div className="conv-box" id="conv-ref" dangerouslySetInnerHTML={{ __html: t(nav ? 'hz.conv_nav' : 'hz.conv_pvgis') }} />
            </div>
            <div className="card">
              <div className="sec"><span>{t('hz.add.title')}</span>{' '}
                <span className={'badge ' + (nav ? 'badge-nav' : 'badge-pvg')} id="conv-badge">{nav ? 'Nav 0°=N' : 'PVGIS 0°=S'}</span></div>
              <div className="field"><label>{t('hz.label.lbl')}</label>
                <input type="text" id="hz-label" placeholder={t('hz.label.ph')} /></div>
              <div className="row2">
                <div className="field"><label id="az1-lbl">{t(nav ? 'hz.az1_nav' : 'hz.az1_pvgis')}</label>
                  <input type="number" id="hz-az1" defaultValue={150} step="5" /></div>
                <div className="field"><label id="az2-lbl">{t(nav ? 'hz.az2_nav' : 'hz.az2_pvgis')}</label>
                  <input type="number" id="hz-az2" defaultValue={210} step="5" /></div>
              </div>
              <div className="field"><label>{t('hz.el.lbl')}</label>
                <input type="number" id="hz-el" defaultValue={15} min="0" max="85" step="1" /></div>
              <div id="conv-hint" style={{ fontSize: 11, color: 'var(--text3)', marginBottom: '.4rem' }}>
                {t(nav ? 'hz.conv_hint_nav' : 'hz.conv_hint_pvgis')}</div>
              <button className="btn btn-p w-100" onClick={() => addObstacle()}>{t('hz.add.btn')}</button>
            </div>
            <div className="card">
              <div className="sec">{t('hz.list.title')}</div>
              {/* legacy-rendered container (obstacles.js renderList) — React never writes into it */}
              <div id="hz-list" onClick={onListClick} />
            </div>
            <div className="card">
              <div className="sec">{t('hz.import_export')}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>{t('hz.import_hint')}</div>
              <input type="file" id="hz-import-file" accept=".txt" style={{ display: 'none' }}
                     onChange={(e) => importHorizonFile(e.target)} />
              <button className="btn btn-outline-secondary w-100" style={{ marginTop: '.5rem' }}
                      onClick={() => document.getElementById('hz-import-file').click()}>{t('hz.import.btn')}</button>
              <div id="hz-import-status" style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, minHeight: '1.2em' }} />
              <button className="btn btn-p w-100" style={{ marginTop: '.3rem' }} onClick={() => exportHorizon()}>{t('hz.export.btn')}</button>
              <button className="btn btn-outline-secondary w-100" style={{ marginTop: 4 }} onClick={() => clearAll()}>{t('hz.clear.btn')}</button>
            </div>
          </div>

          {/* chart */}
          <div className="col-md-9 col-12">
            <div id="loc-note" className="loc-note">
              {hasLoc
                ? <>📍 {(+loc.lat).toFixed(4)}, {(+loc.lon).toFixed(4)}</>
                : <>⚠ <SmartLink href="index.html" className="obs-loc-link">{t('nav.location')}</SmartLink> - set your site location first (using a default for now).</>}
            </div>
            <div id="chart-area">
              <canvas id="C" width="860" height="560" />
              <div className="legend" id="legend" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
