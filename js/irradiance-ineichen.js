/* Mode A: Ineichen/Perez simplified clear-sky model.
   Depends on globals: D2R, G0 (solar-geometry.js)
   Cloud correction applied externally via monthly clearness index Kt.

   KT_TABLE — 37 lats (−90…+90 step 5°) × 12 months
   Kt = GHI_actual_satellite / GHI_clearsky_ineichen
   Derived from kt5.bin: mean(Kt_hofierka over 73 lons) × csHofierka / csIneichen
   Generator: scripts/generate-kt-table.js */

const KT_TABLE = [
  [0.947,0.910,1.118,0.000,0.000,0.000,0.000,0.000,1.281,0.998,0.922,0.961], // −90°
  [0.966,0.954,1.012,0.000,0.000,0.000,0.000,0.000,1.142,0.991,0.987,0.974], // −85°
  [0.944,0.913,0.934,0.932,0.000,0.000,0.000,0.684,1.028,0.908,0.956,0.956], // −80°
  [0.838,0.803,0.813,0.835,0.000,0.000,0.000,0.875,0.919,0.863,0.905,0.876], // −75°
  [0.688,0.631,0.618,0.632,0.681,0.000,0.613,0.737,0.818,0.806,0.821,0.769], // −70°
  [0.454,0.419,0.395,0.383,0.428,0.531,0.576,0.629,0.653,0.644,0.619,0.523], // −65°
  [0.438,0.426,0.404,0.362,0.346,0.347,0.378,0.430,0.468,0.488,0.481,0.453], // −60°
  [0.457,0.447,0.426,0.385,0.365,0.355,0.361,0.385,0.427,0.449,0.461,0.462], // −55°
  [0.483,0.468,0.447,0.414,0.389,0.372,0.384,0.416,0.455,0.479,0.489,0.489], // −50°
  [0.525,0.508,0.488,0.454,0.424,0.411,0.426,0.463,0.493,0.511,0.523,0.523], // −45°
  [0.570,0.548,0.528,0.494,0.465,0.451,0.465,0.495,0.522,0.541,0.552,0.563], // −40°
  [0.606,0.589,0.573,0.539,0.516,0.504,0.515,0.534,0.554,0.571,0.586,0.599], // −35°
  [0.619,0.615,0.599,0.580,0.561,0.545,0.557,0.576,0.590,0.598,0.614,0.621], // −30°
  [0.618,0.618,0.605,0.598,0.591,0.579,0.593,0.609,0.615,0.614,0.619,0.624], // −25°
  [0.605,0.612,0.608,0.609,0.608,0.603,0.610,0.621,0.620,0.616,0.614,0.610], // −20°
  [0.575,0.585,0.593,0.606,0.614,0.608,0.607,0.608,0.607,0.597,0.590,0.582], // −15°
  [0.558,0.559,0.571,0.587,0.598,0.594,0.592,0.592,0.587,0.580,0.573,0.565], // −10°
  [0.553,0.552,0.554,0.560,0.582,0.587,0.588,0.590,0.584,0.581,0.575,0.556], //  − 5°
  [0.567,0.569,0.574,0.573,0.579,0.580,0.576,0.579,0.579,0.585,0.576,0.570], //    0°
  [0.543,0.560,0.558,0.538,0.513,0.507,0.510,0.523,0.530,0.533,0.523,0.524], //  + 5°
  [0.612,0.627,0.624,0.607,0.570,0.549,0.529,0.520,0.531,0.545,0.569,0.594], // +10°
  [0.630,0.647,0.651,0.646,0.625,0.593,0.571,0.560,0.574,0.594,0.611,0.621], // +15°
  [0.615,0.637,0.642,0.649,0.642,0.618,0.593,0.580,0.594,0.611,0.614,0.611], // +20°
  [0.591,0.610,0.617,0.624,0.626,0.624,0.612,0.607,0.606,0.611,0.597,0.590], // +25°
  [0.561,0.579,0.595,0.611,0.615,0.616,0.621,0.623,0.609,0.601,0.573,0.561], // +30°
  [0.532,0.549,0.567,0.589,0.596,0.606,0.614,0.624,0.600,0.578,0.544,0.526], // +35°
  [0.487,0.513,0.537,0.554,0.555,0.566,0.577,0.592,0.572,0.539,0.500,0.474], // +40°
  [0.460,0.496,0.525,0.541,0.532,0.527,0.539,0.546,0.541,0.504,0.454,0.438], // +45°
  [0.456,0.506,0.523,0.539,0.522,0.507,0.503,0.507,0.507,0.475,0.425,0.424], // +50°
  [0.440,0.504,0.538,0.546,0.528,0.512,0.491,0.484,0.472,0.431,0.389,0.402], // +55°
  [0.445,0.512,0.560,0.569,0.539,0.529,0.505,0.479,0.441,0.405,0.354,0.453], // +60°
  [0.609,0.667,0.686,0.683,0.617,0.551,0.518,0.480,0.454,0.456,0.474,0.503], // +65°
  [0.666,0.754,0.724,0.719,0.656,0.584,0.531,0.477,0.459,0.472,0.476,0.000], // +70°
  [0.000,0.869,0.772,0.757,0.685,0.618,0.536,0.482,0.457,0.496,0.000,0.000], // +75°
  [0.000,1.101,0.922,0.917,0.806,0.710,0.617,0.561,0.576,0.675,0.000,0.000], // +80°
  [0.000,0.000,0.892,1.018,0.812,0.739,0.628,0.562,0.663,0.594,0.000,0.000], // +85°
  [0.000,0.000,1.052,1.083,0.870,0.793,0.680,0.601,0.737,0.000,0.000,0.000], // +90°
];

function getKt(lat, mo) {
  const fr   = (lat + 90) / 5;                          /* 0.0 at −90°, 36.0 at +90° */
  const idx  = Math.max(0, Math.min(35, Math.floor(fr)));
  const frac = fr - idx;
  return KT_TABLE[idx][mo] * (1 - frac) + KT_TABLE[idx + 1][mo] * frac;
}

/* ── Optional Linke-turbidity grid (data/tl5.png) ─────────────────────────────
   When loaded, clearSkyIneichen uses per-cell TL instead of the formula.
   Call setTlData(Uint8Array, nlats, nlons, step) after loading tl grid; pixel/20 = TL.
   Defaults match tl5.png (5°×5°); tl1.png passes nlats=181, nlons=361, step=1. */
let _TL_DATA = null;
let _TL_NLATS = 37, _TL_NLONS = 73, _TL_STEP = 5;
const _TL_LAT_MIN = -90, _TL_LON_MIN = -180, _TL_NMONTHS = 12;

function setTlData(data, nlats = 37, nlons = 73, step = 5) {
  _TL_DATA  = data;
  _TL_NLATS = nlats;
  _TL_NLONS = nlons;
  _TL_STEP  = step;
}

function _tlCell(r, c, mo) {
  r = Math.max(0, Math.min(_TL_NLATS - 1, r));
  c = Math.max(0, Math.min(_TL_NLONS - 1, c));
  return _TL_DATA[(mo * _TL_NLATS + r) * _TL_NLONS + c] / 20;
}

function resolveTl(lat, lon, mo) {
  /* Bilinear interpolation in the 5°×5° TL grid */
  if (!_TL_DATA) {
    /* Fallback formula: lat-band seasonal variation */
    return 2.5 + 1.5 * Math.sin(D2R * lat) * Math.sin(D2R * 360 * (mo * 30.4 - 80) / 365) + 0.5;
  }
  const fr = (lat - _TL_LAT_MIN) / _TL_STEP;
  const fc = (lon - _TL_LON_MIN) / _TL_STEP;
  const r0 = Math.floor(fr), r1 = r0 + 1;
  const c0 = Math.floor(fc), c1 = c0 + 1;
  const dr = fr - r0, dc = fc - c0;
  return (1-dr)*((1-dc)*_tlCell(r0,c0,mo) + dc*_tlCell(r0,c1,mo))
       +    dr *((1-dc)*_tlCell(r1,c0,mo) + dc*_tlCell(r1,c1,mo));
}

/* clearSkyIneichen — accepts optional lon for TL grid lookup.
   Signature: (elDeg, n, lat [, lon]) — lon ignored when TL grid not loaded. */
function clearSkyIneichen(elDeg, n, lat, lon) {
  if (elDeg <= 0) return { ghi: 0, dni: 0, dhi: 0 };
  const sinEl = Math.sin(D2R * elDeg);
  /* Month index from day-of-year (approximate, for formula fallback) */
  const moApprox = Math.min(11, Math.floor((n - 1) / 30.44));
  const TL = (_TL_DATA && lon !== undefined)
    ? resolveTl(lat, lon, moApprox)
    : 2.5 + 1.5 * Math.sin(D2R * lat) * Math.sin(D2R * 360 * (n - 80) / 365) + 0.5;
  const g0  = G0(n);
  const cg1 = 0.868, cg2 = 0.0387;
  const dni = Math.min(g0, g0 * cg1 * Math.exp(-cg2 * TL / Math.max(0.065, sinEl)));
  const Fd  = 0.99309 - 0.01799 * TL + 0.00441 * TL * TL;
  const dhi = g0 * sinEl * (0.0065 + Fd * (0.027 - 0.00017 * TL));
  const ghi = dni * sinEl + dhi;
  return { ghi: Math.max(0, ghi), dni: Math.max(0, dni), dhi: Math.max(0, dhi) };
}
