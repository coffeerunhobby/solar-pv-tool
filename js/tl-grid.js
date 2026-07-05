/* tl-grid.js — Linke turbidity grid loader for the Ineichen clear-sky model.
   Fetches CONFIG.tlUrl (tl5.png 5°×5° or tl1.png 1°×1°), decodes it, and
   injects the result into irradiance-ineichen.js via setTlData().

   Resolution is derived from the PNG dimensions — no hardcoded grid size here.
   Switching grids: update CONFIG.tlUrl in config.js only.

   Depends on: config.js (CONFIG.tlUrl, getAuthHeaders),
               tl-png.js (loadTlPng),
               irradiance-ineichen.js (setTlData). */

(function initTlGrid() {
  if (!CONFIG.tlUrl) return;  // not configured — skip silently

  loadTlPng(CONFIG.tlUrl, getAuthHeaders())
    .then(data => {
      setTlData(data, TL_NLATS, TL_NLONS, TL_STEP);
      console.log(`TL grid loaded (${CONFIG.tlUrl.split('/').pop()} — ${(data.length/1024).toFixed(1)} KB → ${data.length.toLocaleString()} values @ ${TL_STEP}°×${TL_STEP}°)`);
    })
    .catch(err => {
      console.warn('TL grid unavailable — using formula fallback:', err.message);
    });
})();
