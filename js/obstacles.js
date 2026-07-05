/* Depends on globals: OCOLS (constants.js)
                       getConvention, inputToNav, navToPVGIS (convention.js)
                       drawCanvas (canvas.js — loaded after, but only called on user events) */

let obstacles            = [];
let importedHorizon      = null;
let importedHorizonLabel = null;
let _siteTerrainHz       = null;   // float[36] terrain horizon (deg, Nav) at the current site, from the horizon tiles

function getObstacles()       { return obstacles; }
function getImportedHorizon() { return importedHorizon; }
function getTerrainHorizon()  { return _siteTerrainHz; }
function setObstacles(arr)    { obstacles = Array.isArray(arr) ? arr : []; }
function setImportedHorizon(arr, label) { importedHorizon = arr; importedHorizonLabel = label || 'Imported'; }
/* set the auto terrain horizon (from horizon-grid resolveHorizon); a 36-length array or null. Named
   _siteTerrainHz to avoid clashing with elevation.js's legacy terrainHorizon() function. */
function setTerrainHorizon(arr) { _siteTerrainHz = (arr && arr.length === 36) ? Array.from(arr, v => +(+v).toFixed(1)) : null; }

function buildHorizonArr() {
  const arr = new Array(36).fill(0);
  obstacles.forEach(o => {
    let a1 = o.navAz1, a2 = o.navAz2;
    if (a2 < a1) a2 += 360;
    for (let i = 0; i < 36; i++) {
      let az = i * 10;
      if (az < a1) az += 360;
      if (az >= a1 && az <= a2) arr[i % 36] = Math.max(arr[i % 36], o.el);
    }
  });
  if (importedHorizon) importedHorizon.forEach((el, i) => { arr[i] = Math.max(arr[i], el); });
  return arr;
}

function addObstacle() {
  const az1 = parseFloat(document.getElementById('hz-az1').value);
  const az2 = parseFloat(document.getElementById('hz-az2').value);
  const el  = parseFloat(document.getElementById('hz-el').value);
  const lbl = document.getElementById('hz-label').value || `Obstacle ${obstacles.length + 1}`;
  if (isNaN(az1) || isNaN(az2) || isNaN(el)) return;
  const conv = getConvention();
  const n1 = inputToNav(az1);
  const n2 = inputToNav(az2);
  obstacles.push({
    navAz1: n1, navAz2: n2,
    pvgisAz1: conv === 'pvgis' ? az1 : navToPVGIS(n1),
    pvgisAz2: conv === 'pvgis' ? az2 : navToPVGIS(n2),
    el, lbl,
  });
  renderList(); drawCanvas();
}

function removeObs(i) { obstacles.splice(i, 1); renderList(); drawCanvas(); }

function clearAll() {
  obstacles = []; importedHorizon = null; importedHorizonLabel = null;
  document.getElementById('hz-import-status').textContent = '';
  renderList(); drawCanvas();
}

function clearImported() {
  importedHorizon = null; importedHorizonLabel = null;
  document.getElementById('hz-import-status').textContent = '';
  renderList(); drawCanvas();
}

function renderList() {
  const el = document.getElementById('hz-list');
  if (!el) return;   // pages that only consume the horizon (e.g. yield.html) have no list
  if (!obstacles.length && !importedHorizon) {
    el.innerHTML = `<span style="font-size:12px;color:var(--text3)">${t('hz.none')}</span>`;
    return;
  }
  let html = '';
  if (importedHorizon) {
    const maxEl = Math.max(...importedHorizon).toFixed(1);
    html += `<div class="obs-row">
      <span style="width:10px;height:10px;border-radius:2px;background:#2980b9;flex-shrink:0;display:inline-block"></span>
      <span style="flex:1;color:var(--text)">${importedHorizonLabel}</span>
      <span style="color:var(--text3);white-space:nowrap">${maxEl}&deg; elev</span>
      <button data-action="clear-imported" style="border:none;background:none;color:var(--text3);cursor:pointer;font-size:15px;padding:0 2px">&times;</button>
    </div>
    <div style="font-size:10px;color:var(--text3);padding:0 16px 4px;display:flex;gap:12px">
      <span><span class="badge badge-nav">Nav</span> 0&deg;&rarr;350&deg;</span>
      <span><span class="badge badge-pvg">PVGIS</span> &plusmn;180&deg;</span>
    </div>`;
  }
  html += obstacles.map((o, i) => `
    <div class="obs-row">
      <span style="width:10px;height:10px;border-radius:2px;background:${OCOLS[i % 6]};flex-shrink:0;display:inline-block"></span>
      <span style="flex:1;color:var(--text)">${o.lbl}</span>
      <span style="color:var(--text3);white-space:nowrap">${o.el}&deg; elev</span>
      <button data-action="remove-obs" data-idx="${i}" style="border:none;background:none;color:var(--text3);cursor:pointer;font-size:15px;padding:0 2px">&times;</button>
    </div>
    <div style="font-size:10px;color:var(--text3);padding:0 16px 4px;display:flex;gap:12px">
      <span><span class="badge badge-nav">Nav</span> ${o.navAz1.toFixed(0)}&deg;&rarr;${o.navAz2.toFixed(0)}&deg;</span>
      <span><span class="badge badge-pvg">PVGIS</span> ${o.pvgisAz1.toFixed(0)}&deg;&rarr;${o.pvgisAz2.toFixed(0)}&deg;</span>
    </div>`).join('');
  el.innerHTML = html;
}

function importHorizonFile(input) {
  const file = input.files[0]; if (!file) return;
  const st = document.getElementById('hz-import-status');
  const reader = new FileReader();
  reader.onload = e => {
    const vals = e.target.result.trim().split(/[\r\n]+/).map(Number).filter(v => !isNaN(v));
    if (vals.length !== 36) {
      st.style.color = '#c0392b';
      st.textContent = `Error: expected 36 values, got ${vals.length}.`;
      return;
    }
    importedHorizon = vals;
    importedHorizonLabel = 'Obstacle' + String(obstacles.length + 1).padStart(2, '0');
    st.style.color = '#16a34a';
    st.textContent = `Imported ✔ 36 values · max ${Math.max(...vals).toFixed(1)}°`;
    renderList(); drawCanvas();
  };
  reader.onerror = () => { st.style.color = '#c0392b'; st.textContent = 'Error reading file.'; };
  reader.readAsText(file);
  input.value = '';
}

function exportHorizon() {
  const a = document.createElement('a');
  a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(buildHorizonArr().join('\n'));
  a.download = 'horizon.txt'; a.click();
}

document.addEventListener('DOMContentLoaded', () => {
  const hl = document.getElementById('hz-list');   // absent on pages that only consume the horizon (e.g. yield.html)
  if (!hl) return;
  hl.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'clear-imported') clearImported();
    if (btn.dataset.action === 'remove-obs') removeObs(+btn.dataset.idx);
  });
});
