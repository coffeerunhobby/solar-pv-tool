/* wind-grid.js — monthly mean wind speed at 2 m (WS2M) from NASA POWER (PNG grid).
   Depends on: config.js (WIND_NLATS, WIND_NLONS, WIND_STEP, WIND_NMONTHS,
                           WIND_LAT_MIN, WIND_LON_MIN, CONFIG.windUrl),
               wind-png.js (loadWindPng).

   PNG layout: data[(m * WIND_NLATS + r) * WIND_NLONS + c] = raw pixel
   Decode:     ws_m_s = pixel / 10
   To switch resolution: update WIND_* constants and CONFIG.windUrl in config.js. */

let WIND_DATA = null;   // Uint8Array once loaded

/* ── Nearest-node lookup (raw pixel) ── */
function _windCell(r, c, mo) {
  r = Math.max(0, Math.min(WIND_NLATS - 1, r));
  c = Math.max(0, Math.min(WIND_NLONS - 1, c));
  return WIND_DATA[(mo * WIND_NLATS + r) * WIND_NLONS + c];
}

/* ── Bilinear interpolation → m/s ── */
function getSatelliteWind(lat, lon, mo) {
  if (!WIND_DATA) return null;
  const fr = (lat - WIND_LAT_MIN) / WIND_STEP;
  const fc = (lon - WIND_LON_MIN) / WIND_STEP;
  const r0 = Math.floor(fr), r1 = r0 + 1;
  const c0 = Math.floor(fc), c1 = c0 + 1;
  const dr = fr - r0, dc = fc - c0;
  const px = (1 - dr) * ((1 - dc) * _windCell(r0, c0, mo) + dc * _windCell(r0, c1, mo))
           +      dr  * ((1 - dc) * _windCell(r1, c0, mo) + dc * _windCell(r1, c1, mo));
  return px / 10;   // m/s
}

/* ── Public entry point — returns m/s or 1.0 fallback if grid not yet loaded ── */
function resolveWind(lat, lon, mo) {
  return WIND_DATA ? (getSatelliteWind(lat, lon, mo) ?? 1.0) : 1.0;
}

/* ── Init: fetch PNG at startup ── */
(function initWindGrid() {
  loadWindPng(CONFIG.windUrl, getAuthHeaders())
    .then(data => {
      WIND_DATA = data;
      console.log(`Wind grid loaded (${CONFIG.windUrl} — ${(data.length / 1024).toFixed(1)} KB decoded → ${data.length.toLocaleString()} values)`);
    })
    .catch(err => {
      console.warn('Wind grid unavailable — Faiman model will use 1.0 m/s fallback:', err.message);
    });
})();
