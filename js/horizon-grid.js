/* horizon-grid.js - terrain-horizon state + LAZY resolver.
   Depends on: config.js (HORIZON_BASE/DEG/STEP/A, _v), horizon-png.js (loadHorizonPng).

   Tiles are a fixed 1°×1° (HORIZON_DEG) convention grid at data/horizon/<lat>_<lon>.png (SW-corner
   signed integers). Geometry is DERIVED from the tile id - NO manifest. Most of the planet is flat /
   ocean and has NO tile: a 404 is cached as "empty" so we never refetch it.

   ensureHorizonTile(lat, lon) -> Promise: lazily fetches the covering tile (call on location change /
     before a yield run). Deduped; caches 404 as null.
   resolveHorizon(lat, lon) -> Float32Array[36] terrain horizon (deg, NAV convention i=i*10deg from N,
     CW; matches isShaded/buildHorizonArr) from the ALREADY-loaded tile, or null if not loaded / flat.
   mergeTerrainHorizon(hzArr, lat, lon) -> element-wise max into the obstacle horizon. */

let HORIZON_DATA = {};      // tileId -> { data, meta }  |  null (known flat/404)
const _hzPending = {};      // tileId -> Promise (dedupe in-flight fetches)

const _hzDeg  = () => (typeof HORIZON_DEG  !== 'undefined' ? HORIZON_DEG  : 1);
const _hzStep = () => (typeof HORIZON_STEP !== 'undefined' ? HORIZON_STEP : 0.01);
const _hzA    = () => (typeof HORIZON_A    !== 'undefined' ? HORIZON_A    : 24);
const _hzBase = () => (typeof HORIZON_BASE !== 'undefined' ? HORIZON_BASE : 'data/horizon/');

function _hzTileId(lat, lon) {
  const d = _hzDeg();
  return (Math.floor(lat / d) * d) + '_' + (Math.floor(lon / d) * d);
}
function _hzMeta(id) {
  const parts = id.split('_'), la = +parts[0], lo = +parts[1];
  const n = Math.round(_hzDeg() / _hzStep()) + 1;
  return { latMin: la, lonMin: lo, step: _hzStep(), nlats: n, nlons: n, A: _hzA() };
}

/* ── Global coverage bitmask (the binary pre-filter): which 1° tiles exist, so flat land never 404s ── */
let HORIZON_INDEX_DATA = null;   // Uint8Array[H*W] (255 = tile exists) | null (not loaded -> allow fetch attempts)
let _hzIdxW = 0, _hzIdxH = 0;
const horizonIndexReady = (typeof loadHorizonPng === 'function' && typeof HORIZON_INDEX !== 'undefined')
  ? loadHorizonPng(HORIZON_INDEX + (typeof _v !== 'undefined' ? _v : ''), 1, typeof getAuthHeaders === 'function' ? getAuthHeaders() : {})
      .then(d => { HORIZON_INDEX_DATA = d; _hzIdxW = Math.round(360 / _hzDeg()); _hzIdxH = Math.round(180 / _hzDeg()); })
      .catch(() => { HORIZON_INDEX_DATA = null; })   // no index -> fall back to fetch-and-maybe-404
  : Promise.resolve();

function _hzHasTile(lat, lon) {
  if (!HORIZON_INDEX_DATA) return true;              // index unknown -> allow the attempt
  const d = _hzDeg(), la = Math.floor(lat / d) * d, lo = Math.floor(lon / d) * d;
  const col = Math.round((lo + 180) / d), row = Math.round((la + 90) / d);
  if (col < 0 || col >= _hzIdxW || row < 0 || row >= _hzIdxH) return false;
  return HORIZON_INDEX_DATA[row * _hzIdxW + col] > 0;
}

function ensureHorizonTile(lat, lon) {
  const id = _hzTileId(lat, lon);
  if (id in HORIZON_DATA) return Promise.resolve(HORIZON_DATA[id]);   // loaded OR known-empty
  if (_hzPending[id]) return _hzPending[id];
  if (!_hzHasTile(lat, lon)) { HORIZON_DATA[id] = null; return Promise.resolve(null); }   // mask says flat -> no fetch
  if (typeof loadHorizonPng !== 'function') return Promise.resolve(null);
  const meta = _hzMeta(id);
  const v   = (typeof _v !== 'undefined') ? _v : '';
  const url = _hzBase() + id + '.png' + v;
  _hzPending[id] = loadHorizonPng(url, meta.A, typeof getAuthHeaders === 'function' ? getAuthHeaders() : {})
    .then(data => { HORIZON_DATA[id] = { data, meta }; delete _hzPending[id]; return HORIZON_DATA[id]; })
    .catch(() => { HORIZON_DATA[id] = null; delete _hzPending[id]; return null; });   // 404 = flat -> cache empty
  return _hzPending[id];
}

function _hzSampleLayers(t, lat, lon) {
  const m = t.meta;
  const r = Math.max(0, Math.min(m.nlats - 1, Math.round((lat - m.latMin) / m.step)));
  const c = Math.max(0, Math.min(m.nlons - 1, Math.round((lon - m.lonMin) / m.step)));
  const out = new Float32Array(m.A);
  for (let l = 0; l < m.A; l++) out[l] = t.data[(l * m.nlats + r) * m.nlons + c] / 2;   // px -> deg
  return out;
}

function resolveHorizon(lat, lon) {
  const t = HORIZON_DATA[_hzTileId(lat, lon)];
  if (!t) return null;                       // not loaded yet, or flat (null)
  const A = t.meta.A, layers = _hzSampleLayers(t, lat, lon), stepAz = 360 / A;
  const out = new Float32Array(36);          // resample A azimuths -> 36 (every 10deg)
  for (let j = 0; j < 36; j++) {
    const lf = (j * 10) / stepAz, l0 = Math.floor(lf) % A, l1 = (l0 + 1) % A, frac = lf - Math.floor(lf);
    out[j] = (1 - frac) * layers[l0] + frac * layers[l1];
  }
  return out;
}

function mergeTerrainHorizon(hzArr, lat, lon) {
  const terr = resolveHorizon(lat, lon);
  if (!terr) return hzArr;
  const out = new Array(36);
  for (let i = 0; i < 36; i++) out[i] = Math.max(hzArr ? (hzArr[i] || 0) : 0, terr[i]);
  return out;
}
