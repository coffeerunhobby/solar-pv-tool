/* elevation.js — PNG grid lookup for site elevation.
   Depends on: config.js (CONFIG, ELEV_LAT_MIN, ELEV_LON_MIN, ELEV_NLATS, ELEV_NLONS, ELEV_STEP),
               elevation-png.js (loadElevationPng).
   All ELEV_* geometry constants are declared in config.js — nowhere else. */

let ELEV_DATA    = null;
let _elevPending = null;   // request parked while grid loads

/* ── Grid lookup ── */
function getElevationGrid(lat, lon) {
  if (!ELEV_DATA) return null;
  const r = Math.max(0, Math.min(ELEV_NLATS - 1, Math.round((lat - ELEV_LAT_MIN) / ELEV_STEP)));
  const c = Math.max(0, Math.min(ELEV_NLONS - 1, Math.round((lon - ELEV_LON_MIN) / ELEV_STEP)));
  return ELEV_DATA[r * ELEV_NLONS + c];
}

/* ── Terrain horizon from the elevation grid ──────────────────────────────────
   For each of the 36 azimuth sectors (Nav convention: index i = i×10° from North, CW — matches
   isShaded/buildHorizonArr), walk outward and take the max angular elevation of the terrain above the
   site: horizon[i] = max_d atan(EXAG·(elev(d) − elev_site)/d). Returns float[36] in DEGREES, combinable
   with the obstacle array via element-wise max.
   EXAG (default 3): the 0.1° (~11 km) grid SMEARS the valley floor UP and the near walls AWAY, so the raw
   grid under-reads the real (SRTM) horizon ~3-13× — worst in deep valleys. 3× is a planet-wide middle
   ground: it can only SHADE over-predictions toward PVGIS (which uses the SRTM horizon) and CANNOT lift a
   flat site (≈0 horizon → 3×0 = 0). It is a coarse screening, NOT a substitute for SRTM. See SCIENCE.md. */
const TERRAIN_HORIZON_EXAG = 3;
function terrainHorizon(lat, lon, exag = TERRAIN_HORIZON_EXAG) {
  if (!ELEV_DATA) return null;
  const se = getElevationGrid(lat, lon);
  const coslat = Math.max(1e-6, Math.cos(lat * Math.PI / 180));
  const hz = new Array(36).fill(0);
  for (let i = 0; i < 36; i++) {
    const th = (i * 10) * Math.PI / 180;   // azimuth from North, clockwise
    let mx = 0;
    for (let dkm = 0.5; dkm <= 40; dkm += 0.5) {
      const pl = lat + (dkm / 111) * Math.cos(th);
      const pn = lon + (dkm / (111 * coslat)) * Math.sin(th);
      const dh = getElevationGrid(pl, pn) - se;
      if (dh > 0) { const ang = Math.atan(exag * dh / (dkm * 1000)) * 180 / Math.PI; if (ang > mx) mx = ang; }
    }
    hz[i] = mx;
  }
  return hz;
}

/* ── Main entry point — called by map.js on every location change ── */
function updateElevation(lat, lon) {
  const el = document.getElementById('site-elevation');
  if (!el) return;

  if (!ELEV_DATA) {
    _elevPending = { lat, lon };
    el.value       = '';
    el.placeholder = '…';
    el.title       = 'Loading elevation grid…';
    return;
  }

  el.value       = getElevationGrid(lat, lon);
  el.placeholder = '0';
  el.title       = `Elevation: ${ELEV_STEP}°×${ELEV_STEP}° grid (ETOPO2022)`;
}

/* ── Init: fetch PNG grid at startup ── */
(function initElevationGrid() {
  loadElevationPng(CONFIG.elevationUrl, getAuthHeaders())
    .then(data => {
      ELEV_DATA = data;
      if (_elevPending) {
        updateElevation(_elevPending.lat, _elevPending.lon);
        _elevPending = null;
      }
    })
    .catch(err => {
      console.warn('Elevation grid unavailable:', err.message);
      if (_elevPending) {
        const el = document.getElementById('site-elevation');
        if (el) { el.placeholder = '0'; el.title = 'Elevation grid unavailable'; }
        _elevPending = null;
      }
    });
})();
