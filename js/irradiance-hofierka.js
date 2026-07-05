/* Mode B: Hofierka/Suri (2002) clear-sky model — the PVGIS native algorithm.
   Depends on globals: D2R (solar-geometry.js)
   Cloud correction applied externally via the same monthly Kt as Mode A.

   Verified against PVGIS Python source (pvgis/algorithms/pvgis/):
     - Solar constant: 1360.8 W/m² (modern TSI, matches pvgis/constants.py)
     - Rayleigh thickness, Tn, fd coefficients: identical to Python implementation
     - Air mass: Kasten formula with atmospheric refraction correction applied
       before evaluation (matches rayleigh_optical_thickness.py) */

/* Linke turbidity, 9 bands (10° |lat|) × 12 months, CALIBRATED to the CM SAF CLARA-A3 SISCLS (global,
   0-90°) clear-sky climatology by inverting THIS Hofierka model (scripts/sarah3-calibrate-tl.js). The
   SAME table (single source scripts/tl-clara-9x12.js) feeds the tile + global-base builders, so every
   grid's Kt normalisation and this engine's reconstruction stay consistent. TL cancels for horizontal
   GHI (so the row count is irrelevant there — 90→1 holds 0.5%); it only shapes the tilted beam/diffuse
   split, and even there second-order (a SARAH-RO-2005-2023 re-derivation of the 40/50° rows moved the
   tilted POA by <0.05% planet-wide, 0.00% at Brașov — so it was reverted). idx = min(8, floor(|lat|/10));
   the highest rows are polar-winter capped at 6.5. */
const TL_TABLE = [
  [4.4,4.44,4.39,4.46,4.44,4.46,4.58,4.58,4.53,4.37,4.43,4.55],
  [3.73,3.78,3.92,4.21,4.35,4.72,4.92,4.84,4.73,4.29,4.06,3.85],
  [3.14,3.24,3.55,3.77,3.98,4.31,4.49,4.48,4.4,3.92,3.58,3.22],
  [2.58,2.63,2.98,3.19,3.48,3.69,3.88,3.92,3.81,3.4,3.07,2.72],
  [2.26,2.22,2.61,2.92,3.23,3.51,3.78,3.77,3.6,3.12,2.81,2.41],
  [1.99,1.83,2.11,2.41,2.84,3.24,3.54,3.49,3.33,2.87,2.6,2.27],
  [3.1,1.37,1.52,1.71,2.21,2.77,3.07,3.02,2.88,2.48,3.45,5.25],
  [6.5,1.09,1.16,1.29,1.67,2.13,2.5,2.6,2.59,3.37,6.5,6.5],
  [6.5,5.95,1.23,1.09,1.48,1.86,2.17,2.18,2.88,6.5,6.5,6.5]];

function getTL(lat, mo, override = null) {
  if (override !== null && !isNaN(override)) return override;
  const absLat = Math.abs(lat);
  const idx  = Math.min(8, Math.floor(absLat / 10));
  const frac = (absLat % 10) / 10;
  const lo = TL_TABLE[idx][mo], hi = TL_TABLE[Math.min(8, idx + 1)][mo];
  return lo + (hi - lo) * frac;
}

/* PVGIS extraterrestrial irradiance (Hofierka 2002).
   Reads global GSC (solar-geometry.js) so the user-editable constant applies here too.
   Default GSC=1361 ≈ 1360.8 W/m² (modern TSI); difference is 0.07%, negligible. */
function G0_hofierka(n) {
  const dayAngle = 2 * Math.PI * n / 365.25;
  return GSC * (1 + 0.03344 * Math.cos(dayAngle - 0.048869));
}

/* Atmospheric refraction correction in degrees (Kasten, PVGIS formulation).
   Applied to raw solar elevation before computing optical air mass, improving
   accuracy at low solar elevations (sunrise/sunset). */
function refractionDeg(elDeg) {
  return 0.061359 * (0.1594 + 1.123 * elDeg + 0.065656 * elDeg * elDeg)
       / (1 + 28.9344 * elDeg + 277.3971 * elDeg * elDeg);
}

/* Optical air mass — Kasten formula on refraction-corrected elevation.
   siteElevM: site altitude in metres; applies barometric pressure correction
   AM *= exp(−z/8434.5) matching PVGIS rayleigh_optical_thickness.py. */
/* The four helpers below route through the single-source registry (formulas.js → FORMULAS.clearsky_*);
   identical math, FORMULAS is global by call time. The elDeg≤0 / am=20 guards stay here (output bounds). */
function airMass(elDeg, siteElevM) {
  if (elDeg <= 0) return 40;
  const elRef = elDeg + refractionDeg(elDeg);
  return FORMULAS.clearsky_airmass.fn(elRef, Math.sin(D2R * elRef), siteElevM);
}

function rayleighThickness(am) { return FORMULAS.clearsky_rayleigh.fn(am); }

function tn(TL) { return FORMULAS.clearsky_tn.fn(TL); }

function fd(elDeg, TL) {
  return FORMULAS.clearsky_fd.fn(Math.sin(D2R * elDeg), TL, tn(TL));
}

function clearSkyHofierka(elDeg, n, lat, tlOverride = null, siteElevM = 0) {
  if (elDeg <= 0) return { ghi: 0, dni: 0, dhi: 0 };
  const mo  = Math.min(11, Math.floor((n / 365) * 12));
  const TL  = getTL(lat, mo, tlOverride);
  const g0  = G0_hofierka(n);
  const am  = airMass(elDeg, siteElevM);
  const tauR = rayleighThickness(am);
  const sinEl = Math.sin(D2R * elDeg);
  /* Single-source formulas (formulas.js → FORMULAS.clearsky_*); identical math, FORMULAS is global by call time. */
  const dni = FORMULAS.clearsky_dni.fn(g0, TL, am, tauR);
  const dhi = FORMULAS.clearsky_dhi.fn(g0, tn(TL), fd(elDeg, TL));
  const ghi = FORMULAS.clearsky_ghi.fn(dni, sinEl, dhi);
  return {
    ghi: Math.min(ghi, 1500),
    dni: Math.min(dni, 1000),
    dhi: Math.min(dhi,  800),
  };
}
