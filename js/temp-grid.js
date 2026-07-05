/* temp-grid.js — monthly 2m air temperature from NASA POWER (PNG grid).
   Depends on: config.js (TEMP_NLATS, TEMP_NLONS, TEMP_STEP, TEMP_NMONTHS,
                           TEMP_LAT_MIN, TEMP_LON_MIN, CONFIG.tempUrl),
               temp-png.js (loadTemperaturePng).

   PNG layout: data[(m * TEMP_NLATS + r) * TEMP_NLONS + c] = signed °C
   To switch resolution: update TEMP_NLATS/NLONS/STEP and CONFIG.tempUrl in config.js. */

let TEMP_DATA = null;   // Int8Array once loaded

/* ── Nearest-node lookup ── */
function _tempCell(r, c, mo) {
  r = Math.max(0, Math.min(TEMP_NLATS - 1, r));
  c = Math.max(0, Math.min(TEMP_NLONS - 1, c));
  return TEMP_DATA[(mo * TEMP_NLATS + r) * TEMP_NLONS + c];
}

/* ── Bilinear interpolation ── */
function getSatelliteTemp(lat, lon, mo) {
  if (!TEMP_DATA) return null;
  const fr = (lat - TEMP_LAT_MIN) / TEMP_STEP;
  const fc = (lon - TEMP_LON_MIN) / TEMP_STEP;
  const r0 = Math.floor(fr), r1 = r0 + 1;
  const c0 = Math.floor(fc), c1 = c0 + 1;
  const dr = fr - r0, dc = fc - c0;
  return (1 - dr) * ((1 - dc) * _tempCell(r0, c0, mo) + dc * _tempCell(r0, c1, mo))
       +      dr  * ((1 - dc) * _tempCell(r1, c0, mo) + dc * _tempCell(r1, c1, mo));
}

/* ── Public entry point — returns °C or null if grid not yet loaded ── */
function resolveTemp(lat, lon, mo) {
  return TEMP_DATA ? getSatelliteTemp(lat, lon, mo) : null;
}

/* ── Init: fetch PNG at startup ── */
(function initTempGrid() {
  loadTemperaturePng(CONFIG.tempUrl, getAuthHeaders())
    .then(data => {
      TEMP_DATA = data;
      console.log(`Temp grid loaded (${CONFIG.tempUrl.split('/').pop()} — ${(data.length/1024).toFixed(1)} KB → ${data.length.toLocaleString()} values @ ${TEMP_STEP}°×${TEMP_STEP}°)`);
    })
    .catch(err => {
      console.warn('Temperature grid unavailable — derating disabled:', err.message);
    });
})();
