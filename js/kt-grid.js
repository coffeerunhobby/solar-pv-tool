/* kt-grid.js — global Kt_cs grid (PVGIS land + NASA POWER ocean fallback).
   Binary data (Uint8, value = round(Kt_cs×100), row-major [lat][lon][month]) is
   fetched asynchronously from CONFIG.ktUrl. Falls back to KT_TABLE from irradiance-ineichen.js.

   Normalisation: Kt_cs = GHI_pvgis / GHI_clearsky_hofierka_monthly
   Engine formula (Hofierka mode): clearSkyHofierka(el,n,lat).ghi × Kt_cs = GHI_pvgis  ✓
   Hofierka/Suri is the PVGIS native algorithm so this normalisation is internally consistent.
   (Using standard Kt = GHI/H₀ would cause a systematic −15–25 % underestimate because
    clearsky_GHI ≈ 0.67–0.85 × H₀.)

   HYBRID grid:
     BASE  — data/kt1.png, 1°×1° global (181×361×12). PVGIS-SARAH2/3 land + NSRDB + ERA5 + ocean.
     TILES — data/kt-<iso>-01.png, 0.1° per-country hi-res (CONFIG.KT_TILES). Real PVGIS-SARAH3
             0.1° data baked in (Romania so far), upsampled-base fill for in-box sea/no-data.
   resolveKt() prefers a tile when the point is inside its bbox, else bilinear-upsamples the base.
   Rationale: a coarse global product (1°, or even ERA5/CLARA-A3 ~25-31 km) can't resolve sub-10 km
   valley microclimate; only a 0.1° SARAH-3 tile fixes it. Storing 0.1° GLOBALLY would be ~4.5 MB
   of mostly-redundant upsample — per-country tiles give identical output at ~20 KB each.

   Grid constants (KT_NLATS, KT_NLONS, KT_STEP, KT_NMONTHS, KT_LAT_MIN, KT_LON_MIN) and the tile
   registry (KT_TILES) are declared in config.js — the single source of truth.
   Depends on: config.js, kt-png.js (loadKtPng), irradiance-ineichen.js (getKt fallback). */

/* Populated once PNG fetch completes; null until then. */
let KT_DATA = null;                 /* 1° base, layout (mo*KT_NLATS+r)*KT_NLONS+c */
const KT_TILE_DATA = [];            /* loaded hi-res tiles: { meta, data } */

/* ── Generic bilinear sampler over a month-major grid ──
   data layout: (mo*nlats+r)*nlons+c ; value = Kt×100 ; returns Kt (0..~1). */
function _ktSample(data, nlats, nlons, latMin, lonMin, step, lat, lon, mo) {
  const fr = (lat - latMin) / step, fc = (lon - lonMin) / step;
  const r0 = Math.floor(fr), c0 = Math.floor(fc), dr = fr - r0, dc = fc - c0;
  const cell = (r, c) => {
    r = Math.max(0, Math.min(nlats - 1, r));
    c = Math.max(0, Math.min(nlons - 1, c));
    return data[(mo * nlats + r) * nlons + c] / 100;
  };
  return (1 - dr) * ((1 - dc) * cell(r0, c0) + dc * cell(r0, c0 + 1))
       +      dr  * ((1 - dc) * cell(r0 + 1, c0) + dc * cell(r0 + 1, c0 + 1));
}

/* ── Nearest-cell sampler (NO interpolation) — for the native SARAH tile only ──
   The 0.05° SARAH tile already resolves terrain features (mountain valleys); bilinear would re-blend an
   isolated cold valley cell with its brighter slope/peak neighbours, undoing the native-resolution
   isolation (Brasov read ~+1.5% high, spring/summer-weighted, vs PVGIS). Snap to the nearest cell instead.
   The coarse 0.25° CLARA base keeps bilinear (it genuinely needs smoothing). */
function _ktNearest(data, nlats, nlons, latMin, lonMin, step, lat, lon, mo) {
  const r = Math.max(0, Math.min(nlats - 1, Math.round((lat - latMin) / step)));
  const c = Math.max(0, Math.min(nlons - 1, Math.round((lon - lonMin) / step)));
  return data[(mo * nlats + r) * nlons + c] / 100;
}

/* Base-grid sample (1° global). */
function getSatelliteKt(lat, lon, mo) {
  if (!KT_DATA) return null;
  return _ktSample(KT_DATA, KT_NLATS, KT_NLONS, KT_LAT_MIN, KT_LON_MIN, KT_STEP, lat, lon, mo);
}

/* FINEST-resolution tile whose bbox contains (lat,lon), or null. Picking by smallest step (not
   first match) is order-independent — tiles load async, and a fine tile (RO 0.05°) nests inside a
   coarser one (Europe 0.1°); the finer one must win regardless of which fetch resolved first. */
function _ktTileFor(lat, lon) {
  let best = null;
  for (const t of KT_TILE_DATA) {
    const m = t.meta;
    const latMax = m.latMin + (m.nlats - 1) * m.step;
    const lonMax = m.lonMin + (m.nlons - 1) * m.step;
    if (lat >= m.latMin && lat <= latMax && lon >= m.lonMin && lon <= lonMax) {
      if (!best || m.step < best.meta.step) best = t;
    }
  }
  return best;
}

/* ── Main entry: used by yield-engine.js ── */
function resolveKt(lat, lon, mo) {
  const tile = _ktTileFor(lat, lon);
  if (tile) {
    const m = tile.meta;
    return _ktNearest(tile.data, m.nlats, m.nlons, m.latMin, m.lonMin, m.step, lat, lon, mo);  // nearest-cell: keep the native valley isolation
  }
  if (KT_DATA) return getSatelliteKt(lat, lon, mo);   // base stays bilinear (coarse 0.25°)
  return getKt(lat, mo);   /* latitude-band fallback (irradiance-ineichen.js) */
}

/* ── Init: fetch the 1° base + every per-country tile at startup ── */
(function initKtGrid() {
  loadKtPng(CONFIG.ktUrl, getAuthHeaders())
    .then(data => {
      KT_DATA = data;
      console.info(`Kt base grid loaded: ${KT_DATA.length} values (${KT_NMONTHS}×${KT_NLATS}×${KT_NLONS})`);
    })
    .catch(err => {
      console.warn('Kt base grid unavailable, using latitude-band fallback:', err.message);
    });

  (typeof KT_TILES !== 'undefined' ? KT_TILES : []).forEach(meta => {
    loadKtPng(meta.url, getAuthHeaders())
      .then(data => {
        KT_TILE_DATA.push({ meta, data });
        console.info(`Kt hi-res tile loaded: ${meta.iso.toUpperCase()} (${meta.nlats}×${meta.nlons}, ${(data.length).toLocaleString()} values)`);
      })
      .catch(err => {
        console.warn(`Kt tile ${meta.iso} unavailable (${meta.url}):`, err.message);
      });
  });
})();
