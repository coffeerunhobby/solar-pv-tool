/* Depends on globals: isDark (theme.js), drawCanvas (canvas.js) */

let map, marker, tileLayer;
const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

function initMap() {
  map = L.map('map').setView([51.4769, -0.0005], 7);
  tileLayer = L.tileLayer(isDark() ? TILES.dark : TILES.light, {
    attribution: '&copy; OSM &copy; CARTO', maxZoom: 19,
  }).addTo(map);
  marker = L.marker([51.4769, -0.0005], { draggable: true }).addTo(map);
  marker.on('dragend', e => { const ll = e.target.getLatLng(); setCoords(ll.lat, ll.lng); drawCanvas(); });
  map.on('click', e => { marker.setLatLng(e.latlng); setCoords(e.latlng.lat, e.latlng.lng); drawCanvas(); });
}

function updateTiles() {
  if (tileLayer && map) tileLayer.setUrl(isDark() ? TILES.dark : TILES.light);
}

function autoTimezone(lon) {
  const tz  = Math.min(14, Math.max(-12, Math.round(lon / 15)));
  const sel = document.getElementById('tz');
  if (!sel) return;
  /* Find the closest option value (handles half-hour offsets like UTC+5:30) */
  let best = null, bestDiff = Infinity;
  for (const opt of sel.options) {
    const diff = Math.abs(parseFloat(opt.value) - tz);
    if (diff < bestDiff) { bestDiff = diff; best = opt; }
  }
  if (best) best.selected = true;
}

function setCoords(lat, lng) {
  document.getElementById('lat').value = lat.toFixed(5);
  document.getElementById('lon').value = lng.toFixed(5);
  autoTimezone(lng);
  if (typeof updateElevation === 'function') updateElevation(lat, lng);
  if (typeof onLocationChange === 'function') onLocationChange(lat, lng);   // persist to project (index step 1)
  fetchTerrainHorizon(lat, lng);
  fetchCountryCode(lat, lng);
}

/* Reverse-geocode the site to an ISO-2 country code and store it in the project location
   (drives the economics step's e1 prefill from the electricity-price table). Best-effort:
   no-op offline / on a sea point. Debounced via a pending guard so rapid clicks don't pile up. */
var _ccPending = false;
function fetchCountryCode(lat, lng) {
  if (_ccPending || typeof Project === 'undefined' || !Project.section) return;
  _ccPending = true;
  fetch('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lng +
        '&format=json&zoom=3', { headers: { 'Accept-Language': 'en' } })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      var cc = j && j.address && j.address.country_code ? j.address.country_code.toUpperCase() : null;
      var loc = Project.section('location');
      if (cc && loc) { loc.countryCode = cc; if (Project.save) Project.save(); }
    })
    .catch(function () {})
    .then(function () { _ccPending = false; });
}

/* Lazy-load the terrain horizon for this site (horizon tiles), store it in the obstacle module + the
   project state (so step 2 and the yield calc see it), and redraw the chart. No-op where the horizon
   stack isn't loaded or the location is flat/unmapped. */
function fetchTerrainHorizon(lat, lng) {
  if (typeof ensureHorizonTile !== 'function') return;
  ensureHorizonTile(lat, lng).then(function () {
    var th = (typeof resolveHorizon === 'function') ? resolveHorizon(lat, lng) : null;
    if (typeof setTerrainHorizon === 'function') setTerrainHorizon(th);
    if (typeof Project !== 'undefined' && Project.section) {
      var loc = Project.section('location');
      if (loc) { loc.terrainHorizon = th ? Array.from(th, function (v) { return +v.toFixed(1); }) : null; if (Project.save) Project.save(); }
    }
    if (typeof drawCanvas === 'function') drawCanvas();
  }).catch(function () {});
}

function syncMap() {
  const la = parseFloat(document.getElementById('lat').value);
  const ln = parseFloat(document.getElementById('lon').value);
  if (!isNaN(la) && !isNaN(ln)) {
    marker.setLatLng([la, ln]); map.panTo([la, ln]);
    if (typeof onLocationChange === 'function') onLocationChange(la, ln);
    fetchTerrainHorizon(la, ln);
  }
}

async function searchPlace() {
  const q   = document.getElementById('search').value.trim();
  const m   = document.getElementById('searchmsg');
  const btn = document.getElementById('search-go');
  if (!q) return;
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  m.textContent = 'Searching…';
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`, { headers: { 'Accept-Language': 'en' } });
    const d = await r.json();
    if (!d.length) { m.textContent = 'Not found.'; return; }
    const la = parseFloat(d[0].lat), ln = parseFloat(d[0].lon);
    setCoords(la, ln); marker.setLatLng([la, ln]); map.setView([la, ln], 10);
    m.textContent = d[0].display_name.split(',').slice(0, 3).join(', ');
    drawCanvas();
  } catch { m.textContent = 'Search failed.'; }
  finally { if (btn) { btn.disabled = false; btn.textContent = 'Go'; } }
}
