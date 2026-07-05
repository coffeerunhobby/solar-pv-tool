const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/* Solar constant — mutable so yield-ui.js can apply user override before each run. */
let GSC = 1361; // W/m² — editable via #pv-gsc input

function G0(n) {
  return GSC * (1 + 0.033 * Math.cos(D2R * 360 * n / 365));
}

function doy(y, mo, d) {
  return Math.round((new Date(y, mo - 1, d) - new Date(y, 0, 0)) / 864e5);
}

/* Cooper (1969) — simple sinusoidal, ±0.3°.
   Previously mislabelled as Spencer; renamed. Kept as fast fallback. */
function declinationCooper(n) {
  return 23.45 * Math.sin(D2R * 360 * (284 + n) / 365);
}

/* Spencer (1971) — 7-term Fourier series, ±0.035°. More accurate than Cooper.
   pvlib reference: pvlib.solarposition.declination_spencer71(). */
function declinationSpencer(n) {
  const B = (2 * Math.PI / 365) * (n - 1);
  return R2D * (0.006918
    - 0.399912 * Math.cos(B)     + 0.070257 * Math.sin(B)
    - 0.006758 * Math.cos(2 * B) + 0.000907 * Math.sin(2 * B)
    - 0.002697 * Math.cos(3 * B) + 0.001480 * Math.sin(3 * B));
}

/* Hofierka/Suri (2002) — PVGIS native formula with eccentricity correction, ±0.2°.
   Direct port of com_declin() from PVGIS rsun_base.c. */
function declinationHofierka(n) {
  const dayAngle = 2 * Math.PI * n / 365.25;
  return Math.asin(0.3978 * Math.sin(dayAngle - 1.4 + 0.03344 * Math.sin(dayAngle - 0.048869))) * R2D;
}

/* Backward-compatible alias — points to Spencer (1971) Fourier series. */
function declination(n) { return declinationSpencer(n); }

/* ── IAM — Martin & Ruiz (1999) ─────────────────────────────────────────────
   Accounts for Fresnel reflection losses at oblique incidence.
   PVGIS uses this model with ar = 0.17 (documented in PVGIS methodology).

   iamMartinRuiz(cosAoi)          — per-hour beam factor, cosAoi = cos(AOI)
   iamDiffuseFactor(tiltDeg)      — fixed factor for diffuse component (Eq. 23)
   iamGroundFactor(tiltDeg)       — fixed factor for ground-reflected (Eq. 25)

   Reference: Martin N. & Ruiz J.M., Progress in PV 7(4), 299-315, 1999. */
function iamMartinRuiz(cosAoi, ar = 0.17) {
  if (cosAoi <= 0) return 0;
  return (1 - Math.exp(-cosAoi / ar)) / (1 - Math.exp(-1 / ar));
}
function iamDiffuseFactor(tiltDeg, ar = 0.17) {
  const thetaEff = (59.7 - 0.1388 * tiltDeg + 0.001497 * tiltDeg * tiltDeg) * D2R;
  return iamMartinRuiz(Math.cos(thetaEff), ar);
}
function iamGroundFactor(tiltDeg, ar = 0.17) {
  const thetaEff = (90 - 0.5788 * tiltDeg + 0.002693 * tiltDeg * tiltDeg) * D2R;
  return iamMartinRuiz(Math.cos(thetaEff), ar);
}

function eot(n) {
  const B = D2R * 360 * (n - 80) / 365;   // PVCDROM: n-80, /365
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

/* declinFn is optional — defaults to Spencer. Callers that need a different formula
   (e.g. yield-engine.js in Hofierka mode) pass it explicitly. */
function sunPos(latDeg, lonDeg, tz, n, h, mode, declinFn) {
  const dec = D2R * (declinFn ? declinFn(n) : declinationSpencer(n));
  const latR = D2R * latDeg;
  const hr = mode === 'lst' ? h + (eot(n) / 60) + (lonDeg - tz * 15) / 15 : h;
  const ha = D2R * 15 * (hr - 12);
  const sinEl = Math.sin(latR) * Math.sin(dec) + Math.cos(latR) * Math.cos(dec) * Math.cos(ha);
  const el = Math.asin(Math.max(-1, Math.min(1, sinEl))) * R2D;
  if (el <= 0) return null;
  let cosAz = (Math.sin(dec) * Math.cos(latR) - Math.cos(dec) * Math.sin(latR) * Math.cos(ha)) / Math.cos(D2R * el);
  cosAz = Math.max(-1, Math.min(1, cosAz));
  let az = Math.acos(cosAz) * R2D;
  if (ha > 0) az = 360 - az;
  return { el, az, cosZ: Math.cos(D2R * (90 - el)) };
}

function isShaded(sunAzNav, sunEl, hzArr) {
  const idx = Math.round(sunAzNav / 10) % 36;
  return sunEl < hzArr[idx];
}
