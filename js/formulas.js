/* formulas.js - SINGLE SOURCE OF TRUTH for the engine's formulas.
   Depends on: config.js (FAIMAN_U0/U1). Loads BEFORE yield-engine.js. Optional: i18n.js (LANG_CURRENT),
   the fnum() typography helper (number rounding) - both feature-detected, so formulas.js is safe to load
   anywhere the engine loads.

   WHY: the math, the rendered formula string, the explanation divs, the *Viz pages and the tests must
   never drift apart. Each FORMULAS entry CO-LOCATES three things:
     fn   - the pure compute function (HOT PATH: called per-hour in the yield loop, so NO string work here)
     tpl  - the display template per language, with {placeholders}
     prose- the one-line human explanation per language
     k    - the formula's own named constants, used to fill {placeholders} when params omit them

   Access:
     FORMULAS.<id>.fn(args...)               -> value         (engine / hot paths)
     Formula.explain(id, params, lang)       -> { formula, prose }   (UI / explanation divs / viz / tests)

   To change a formula, edit ONE place here. (The tpl is hand-kept in step with fn - JS can't derive a
   pretty formula from a function body - but they live in the same object so they're reviewed together.)

   MIGRATED (v0.9.11): cell temperature (tcell_*) + the FULL Hofierka clear-sky (clearsky_*, mirroring
   assets/pvgis 1:1) + the empirical DK warmth (tair_warm) + the TRANSPOSITION models (transpose_*). The
   transpose fns set out.g / out.geff and return g; they reference D2R/G0/iamMartinRuiz/iamDiffuseFactor/
   iamGroundFactor (solar-geometry.js + yield-engine.js) at CALL time. Still to migrate: Huld η, IAM, Kt split. */

/* Perez (1990) circumsolar/horizon-brightness coefficient tables (Solar Energy 44(5), Table 1) - for transpose_perez. */
const _PEREZ_EPS = [1.065, 1.230, 1.500, 1.950, 2.800, 4.500, 6.200];
const _PEREZ_F   = [
  [-0.0083,  0.5877, -0.0621, -0.0597,  0.0721, -0.0220],
  [ 0.1299,  0.6826, -0.1514, -0.0189,  0.0645, -0.0270],
  [ 0.3297,  0.4869, -0.2211,  0.0554, -0.0640, -0.0290],
  [ 0.5682,  0.1875, -0.2951,  0.1089, -0.1519, -0.0140],
  [ 0.8730, -0.3920, -0.3616,  0.2260, -0.4620,  0.0010],
  [ 1.1326, -1.2367, -0.4118,  0.2880, -0.8230,  0.0560],
  [ 1.0601, -1.6095, -0.3590,  0.2640, -1.1270,  0.1310],
  [ 0.6777, -0.3272, -0.2504,  0.1560, -1.3765,  0.2510],
];

const FORMULAS = {

  /* Cell temperature - NOCT model (IEC 61215). nmot = module NMOT/NOCT (°C). */
  tcell_noct: {
    fn: (Tair, Geff, nmot) => Tair + (nmot - 20) / 800 * Geff,
    k:  { c0: 20, div: 800 },
    tpl:   { en: 'T_cell = T_air + (NMOT − {c0}) / {div} · G_eff',
             ro: 'T_cel = T_aer + (NMOT − {c0}) / {div} · G_ef' },
    prose: { en: 'Cell temperature - NOCT model (IEC 61215): ambient air plus a rise proportional to the in-plane irradiance.',
             ro: 'Temperatura celulei - model NOCT (IEC 61215): aerul ambiant plus o creștere proporțională cu iradianța în plan.' },
  },

  /* Cell temperature - Faiman model (PVGIS default). U0/U1 default to FAIMAN_U0/FAIMAN_U1 (config.js). */
  tcell_faiman: {
    fn: (Tair, Geff, wind, u0, u1) => Tair + Geff / ((u0 != null ? u0 : FAIMAN_U0) + (u1 != null ? u1 : FAIMAN_U1) * wind),
    k:  { u0: FAIMAN_U0, u1: FAIMAN_U1 },
    tpl:   { en: 'T_cell = T_air + G_eff / (U_c + U_v · v_wind),   U_c = {u0}, U_v = {u1}',
             ro: 'T_cel = T_aer + G_ef / (U_c + U_v · v_vânt),   U_c = {u0}, U_v = {u1}' },
    prose: { en: 'Cell temperature - Faiman model (PVGIS default): ambient air plus a wind-cooled irradiance rise.',
             ro: 'Temperatura celulei - model Faiman (implicit PVGIS): aerul ambiant plus o creștere din iradianță, răcită de vânt.' },
  },

  /* ── Clear-sky irradiance - Hofierka/Suri (2002), the PVGIS-native model (irradiance-hofierka.js).
     G₀ = extraterrestrial irradiance, T_L = Linke turbidity, m = optical air mass, δ_R(m) = Rayleigh
     optical thickness, h = solar altitude, T_n/F_d = diffuse transmission / altitude functions. ── */

  /* Beam (direct normal) clear-sky irradiance. */
  clearsky_dni: {
    fn: (g0, TL, am, tauR) => Math.max(0, g0 * Math.exp(-0.8662 * TL * am * tauR)),
    k:  { cR: 0.8662 },
    tpl:   { en: 'B_0c = G_0 · exp(−{cR} · T_L · m · δ_R(m))',
             ro: 'B_0c = G_0 · exp(−{cR} · T_L · m · δ_R(m))' },
    prose: { en: 'Clear-sky beam (direct normal) irradiance - Hofierka/Suri 2002: extraterrestrial G_0 attenuated by Rayleigh scattering and Linke turbidity T_L over the optical air mass m.',
             ro: 'Iradianța directă normală pe cer senin - Hofierka/Suri 2002: G_0 extraterestru atenuat de difuzia Rayleigh și turbiditatea Linke T_L pe masa de aer optică m.' },
  },

  /* Diffuse horizontal clear-sky irradiance. tnTL = T_n(T_L), fdh = F_d(h) (precomputed). */
  clearsky_dhi: {
    fn: (g0, tnTL, fdh) => Math.max(0, g0 * tnTL * fdh),
    k:  {},
    tpl:   { en: 'D_hc = G_0 · T_n(T_L) · F_d(h)',
             ro: 'D_hc = G_0 · T_n(T_L) · F_d(h)' },
    prose: { en: 'Clear-sky diffuse horizontal irradiance - Hofierka/Suri 2002: G_0 times the diffuse transmission T_n(T_L) and the solar-altitude diffuse function F_d(h).',
             ro: 'Iradianța difuză orizontală pe cer senin - Hofierka/Suri 2002: G_0 înmulțit cu transmisia difuză T_n(T_L) și funcția de altitudine solară F_d(h).' },
  },

  /* Global horizontal clear-sky irradiance = beam projected onto the horizontal + diffuse. */
  clearsky_ghi: {
    fn: (dni, sinh, dhi) => Math.max(0, dni * sinh + dhi),
    k:  {},
    tpl:   { en: 'G_hc = B_0c · sin(h) + D_hc',
             ro: 'G_hc = B_0c · sin(h) + D_hc' },
    prose: { en: 'Clear-sky global horizontal irradiance - Hofierka/Suri 2002: the beam projected onto the horizontal plane plus the diffuse component.',
             ro: 'Iradianța globală orizontală pe cer senin - Hofierka/Suri 2002: componenta directă proiectată pe planul orizontal plus difuza.' },
  },

  /* Clear-sky sub-functions - mirror PVGIS's own modules 1:1 (assets/pvgis: diffuse/term_n,
     diffuse/altitude, direct/rayleigh_optical_thickness, optical air mass), so cross-checking stays trivial.
     Dense scientific coefficients are written as LITERALS in the template (full precision, never tuned). */

  /* Diffuse transmission T_n(T_L) - PVGIS diffuse/transmission_function.py. */
  clearsky_tn: {
    fn: (TL) => -0.015843 + 0.030543 * TL + 0.0003797 * TL * TL,
    k:  {},
    tpl:   { en: 'T_n(T_L) = −0.015843 + 0.030543·T_L + 0.0003797·T_L²',
             ro: 'T_n(T_L) = −0.015843 + 0.030543·T_L + 0.0003797·T_L²' },
    prose: { en: 'Diffuse transmission function T_n - Hofierka/Suri 2002: clear-sky diffuse transmittance, a quadratic in Linke turbidity T_L.',
             ro: 'Funcția de transmisie difuză T_n - Hofierka/Suri 2002: transmitanța difuză pe cer senin, polinom de gradul 2 în turbiditatea Linke T_L.' },
  },

  /* Diffuse solar-altitude function F_d(h) - PVGIS diffuse/altitude.py. tnTL = T_n(T_L) (for the a₁ floor). */
  clearsky_fd: {
    fn: (sinEl, TL, tnTL) => {
      const a1 = 0.26463 - 0.061581 * TL + 0.0031408 * TL * TL;
      const a2 = 2.04020 + 0.018945 * TL - 0.011161 * TL * TL;
      const a3 = -1.3025  + 0.039231 * TL + 0.0085079 * TL * TL;
      const a1e = (a1 * tnTL < 0.0022) ? 0.0022 / tnTL : a1;
      return a1e + a2 * sinEl + a3 * sinEl * sinEl;
    },
    k:  {},
    tpl:   { en: 'F_d(h) = a₁ + a₂·sin(h) + a₃·sin²(h)   (a₁,a₂,a₃ quadratic in T_L; a₁ floored at 0.0022/T_n)',
             ro: 'F_d(h) = a₁ + a₂·sin(h) + a₃·sin²(h)   (a₁,a₂,a₃ polinoame în T_L; a₁ limitat la 0.0022/T_n)' },
    prose: { en: 'Diffuse altitude function F_d - Hofierka/Suri 2002: shapes diffuse by solar altitude h. a₁=0.26463−0.061581·T_L+0.0031408·T_L², a₂=2.04020+0.018945·T_L−0.011161·T_L², a₃=−1.3025+0.039231·T_L+0.0085079·T_L².',
             ro: 'Funcția de altitudine difuză F_d - Hofierka/Suri 2002: modelează difuza după altitudinea solară h. a₁=0.26463−0.061581·T_L+0.0031408·T_L², a₂=2.04020+0.018945·T_L−0.011161·T_L², a₃=−1.3025+0.039231·T_L+0.0085079·T_L².' },
  },

  /* Rayleigh optical thickness δ_R(m) - PVGIS direct/rayleigh_optical_thickness.py (piecewise at m=20). */
  clearsky_rayleigh: {
    fn: (am) => am <= 20
      ? 1 / (6.6296 + 1.7513 * am - 0.1202 * am ** 2 + 0.0065 * am ** 3 - 0.00013 * am ** 4)
      : 1 / (10.4 + 0.718 * am),
    k:  {},
    tpl:   { en: 'δ_R(m) = 1 / (6.6296 + 1.7513·m − 0.1202·m² + 0.0065·m³ − 0.00013·m⁴)   [m≤20; else 1/(10.4+0.718·m)]',
             ro: 'δ_R(m) = 1 / (6.6296 + 1.7513·m − 0.1202·m² + 0.0065·m³ − 0.00013·m⁴)   [m≤20; altfel 1/(10.4+0.718·m)]' },
    prose: { en: 'Rayleigh optical thickness δ_R - Kasten 1996 (PVGIS): molecular-scattering thickness vs optical air mass m.',
             ro: 'Grosimea optică Rayleigh δ_R - Kasten 1996 (PVGIS): grosimea de difuzie moleculară în funcție de masa de aer optică m.' },
  },

  /* Optical air mass m - Kasten-Young on the refraction-corrected altitude h′ + PVGIS barometric (z) term.
     elRef = refraction-corrected altitude (deg), sinElRef = sin(elRef), siteElevM = site altitude (m). */
  clearsky_airmass: {
    fn: (elRef, sinElRef, siteElevM) =>
      (1 / (sinElRef + 0.50572 * Math.pow(elRef + 6.07995, -1.6364))) * Math.exp(-(siteElevM || 0) / 8434.5),
    k:  {},
    tpl:   { en: 'm = [sin(h′) + 0.50572·(h′ + 6.07995)^−1.6364]⁻¹ · exp(−z/8434.5)   (h′ = refraction-corrected altitude, z = site altitude m)',
             ro: 'm = [sin(h′) + 0.50572·(h′ + 6.07995)^−1.6364]⁻¹ · exp(−z/8434.5)   (h′ = altitudinea corectată de refracție, z = altitudinea sitului m)' },
    prose: { en: 'Optical air mass m - Kasten-Young 1989 on the refraction-corrected altitude, with the PVGIS barometric (altitude) correction.',
             ro: 'Masa de aer optică m - Kasten-Young 1989 pe altitudinea corectată de refracție, cu corecția barometrică PVGIS.' },
  },

  /* Effective daytime air warmth (monthly-climatology correction). T2m is the 24h MONTHLY-MEAN air temp,
     but PV energy is produced on midday hours whose air is warmer; add K·(G/1000), K = °C at full sun per
     cell-temp model, scaled by the (clear-sky-biased) in-plane irradiance G so the warmth lands on
     production hours and vanishes at night. EMPIRICAL - it has NO PVGIS counterpart (PVGIS reads REAL
     hourly air temp and adds only the Faiman cell rise); K is calibrated so the annual energy matches
     PVGIS's hourly result, and it also absorbs the monthly-Kt irradiance-smearing (Jensen) under-deration.
     (A physical diurnal-shape reconstruction was tried in v0.9.11 and reverted - equal accuracy, more
     complexity, and the real E/W spread turned out to be irradiance, not temperature.) See SCIENCE.md §7. */
  tair_warm: {
    fn: (T2m, G, K) => T2m + K * (G / 1000),
    k:  {},
    tpl:   { en: 'T_air = T̄_month + K · (G_eff / 1000)',
             ro: 'T_aer = T̄_lună + K · (G_ef / 1000)' },
    prose: { en: 'Effective daytime air warmth (empirical monthly-climatology correction): the monthly-mean air temp plus K (°C at full sun, per cell-temp model - NOCT 10 / Faiman 16) scaled by the clear-sky-biased in-plane irradiance, so it lands on production hours. Calibrated so annual energy matches PVGIS hourly; no PVGIS counterpart.',
             ro: 'Încălzirea efectivă a aerului în timpul zilei (corecție empirică climatologică lunară): media lunară a temperaturii aerului plus K (°C la soare maxim, pe model de temperatură a celulei - NOCT 10 / Faiman 16) scalat cu iradianța în plan polarizată spre cer senin, ca să cadă pe orele de producție. Calibrat ca energia anuală să corespundă PVGIS orar; fără corespondent în PVGIS.' },
  },

  /* ── Transposition: horizontal {ghi,dni,dhi} -> in-plane (out.g) + IAM-effective (out.geff). Beam =
     DNI·cosAOI, ground = ρ·GHI·(1−cosβ)/2 are common; the models differ only in the anisotropic DIFFUSE. ── */

  /* MUNEER (1990) - the PVGIS-native model (was named "transposeHofierka"; verbatim port of PVGIS
     diffuse/inclined.py + term_n.py). DEFAULT. kb=B_h/G0_h, N=0.00263−0.712kb−0.6883kb², F=(1+cosβ)/2+
     (sinβ−β·cosβ−π·sin²(β/2))·N, D_ic=D_h·[F·(1−kb)+kb·cosAOI/sinEl]. */
  transpose_muneer: {
    fn: function (sun, cs, tiltDeg, azPVGIS, albedo, n, out) {
      if (!sun) { if (out) { out.g = 0; out.geff = 0; } return 0; }
      const { el, az } = sun; const { ghi, dhi } = cs;
      const panelAzNav = (azPVGIS + 180 + 360) % 360, tiltR = D2R * tiltDeg, sinEl = Math.max(0.01745, Math.sin(D2R * el));
      const cosAOI = Math.sin(D2R * el) * Math.cos(tiltR) + Math.cos(D2R * el) * Math.sin(tiltR) * Math.cos(D2R * az - D2R * panelAzNav);
      const cosAOIcl = Math.max(0, cosAOI);
      const B_hc = Math.max(0, ghi - dhi), G0h = Math.max(1, G0(n) * sinEl), kb = Math.min(1, B_hc / G0h);
      const N = 0.00263 - 0.712 * kb - 0.6883 * kb * kb;
      const F = (1 + Math.cos(tiltR)) / 2 + (Math.sin(tiltR) - tiltR * Math.cos(tiltR) - Math.PI * Math.pow(Math.sin(tiltR / 2), 2)) * N;
      const D_ic = Math.max(0, dhi * (Math.max(0, F) * (1 - kb) + kb * cosAOIcl / sinEl));
      const B_ic = B_hc * cosAOIcl / sinEl, Ir = ghi * albedo * (1 - Math.cos(tiltR)) / 2, g = Math.max(0, B_ic + D_ic + Ir);
      if (out) { out.g = g; out.geff = Math.max(0, B_ic * iamMartinRuiz(cosAOIcl) + D_ic * iamDiffuseFactor(tiltDeg) + Ir * iamGroundFactor(tiltDeg)); }
      return g;
    },
    k: {},
    tpl:   { en: 'D_ic = D_h·[F·(1−kb) + kb·cosAOI/sin h],  F = (1+cosβ)/2 + (sinβ−β·cosβ−π·sin²(β/2))·N(kb)',
             ro: 'D_ic = D_h·[F·(1−kb) + kb·cosAOI/sin h],  F = (1+cosβ)/2 + (sinβ−β·cosβ−π·sin²(β/2))·N(kb)' },
    prose: { en: 'Anisotropic diffuse transposition - Muneer (1990), the model PVGIS itself uses (verbatim from assets/pvgis diffuse/inclined.py). Background sky F(β) plus a circumsolar term modulated by the beam clearness kb. DEFAULT.',
             ro: 'Transpoziția difuză anizotropă - Muneer (1990), modelul folosit de PVGIS (preluat din assets/pvgis diffuse/inclined.py). Fundalul cerului F(β) plus un termen circumsolar modulat de claritatea directă kb. IMPLICIT.' },
  },

  /* Hay-Davies (1980) - HISTORY (switchable). Isotropic background + circumsolar (anisotropy index Ai=DNI/G0). */
  transpose_haydavies: {
    fn: function (sun, cs, tiltDeg, azPVGIS, albedo, n, out) {
      if (!sun) { if (out) { out.g = 0; out.geff = 0; } return 0; }
      const { el, az, cosZ } = sun; const { ghi, dni, dhi } = cs;
      const panelAzNav = (azPVGIS + 180 + 360) % 360, tiltR = D2R * tiltDeg;
      const cosAOI = Math.sin(D2R * el) * Math.cos(tiltR) + Math.cos(D2R * el) * Math.sin(tiltR) * Math.cos(D2R * az - D2R * panelAzNav);
      const cosAOIcl = Math.max(0, cosAOI), Ai = dni / Math.max(1, G0(n)), Ib = dni * cosAOIcl;
      const Id = Math.max(0, dhi * ((1 - Ai) * (1 + Math.cos(tiltR)) / 2 + Ai * cosAOIcl / Math.max(0.01745, cosZ)));
      const Ir = ghi * albedo * (1 - Math.cos(tiltR)) / 2, g = Math.max(0, Ib + Id + Ir);
      if (out) { out.g = g; out.geff = Math.max(0, Ib * iamMartinRuiz(cosAOIcl) + Id * iamDiffuseFactor(tiltDeg) + Ir * iamGroundFactor(tiltDeg)); }
      return g;
    },
    k: {},
    tpl:   { en: 'D_ic = D_h·[(1−A_i)·(1+cosβ)/2 + A_i·cosAOI/cos z],  A_i = DNI/G0', ro: 'D_ic = D_h·[(1−A_i)·(1+cosβ)/2 + A_i·cosAOI/cos z],  A_i = DNI/G0' },
    prose: { en: 'Anisotropic diffuse transposition - Hay-Davies (1980): isotropic background + circumsolar only (no horizon brightening). HISTORY, switchable via transposeName="haydavies".',
             ro: 'Transpoziția difuză anizotropă - Hay-Davies (1980): fundal izotrop + circumsolar (fără strălucire de orizont). ISTORIC, comutabil prin transposeName="haydavies".' },
  },

  /* Perez (1990) - HISTORY (switchable). Adds a horizon-brightness term (F2·sinβ); strongest circumsolar. */
  transpose_perez: {
    fn: function (sun, cs, tiltDeg, azPVGIS, albedo, n, out) {
      if (!sun) { if (out) { out.g = 0; out.geff = 0; } return 0; }
      const { el, az, cosZ } = sun; const { ghi, dni, dhi } = cs;
      const panelAzNav = (azPVGIS + 180 + 360) % 360, tiltR = D2R * tiltDeg;
      const cosAOI = Math.sin(D2R * el) * Math.cos(tiltR) + Math.cos(D2R * el) * Math.sin(tiltR) * Math.cos(D2R * az - D2R * panelAzNav);
      const cosAOIcl = Math.max(0, cosAOI), Ib = dni * cosAOIcl, Ir = ghi * albedo * (1 - Math.cos(tiltR)) / 2;
      const z = D2R * (90 - el), z3k = 1.041 * z * z * z;
      let epsilon; if (dhi < 1) { epsilon = (dni > 1) ? 999 : 1.0; } else { epsilon = ((dhi + dni) / dhi + z3k) / (1 + z3k); }
      let bin = 0; for (let i = 0; i < _PEREZ_EPS.length; i++) { if (epsilon >= _PEREZ_EPS[i]) bin = i + 1; }
      const [f11, f12, f13, f21, f22, f23] = _PEREZ_F[bin], COS85 = 0.08716;
      const delta = dhi * (1 / Math.max(COS85, cosZ)) / Math.max(1, G0(n));
      const F1 = Math.max(0, f11 + f12 * delta + f13 * z), F2 = f21 + f22 * delta + f23 * z;
      const Id = Math.max(0, dhi * ((1 - F1) * (1 + Math.cos(tiltR)) / 2 + F1 * cosAOIcl / Math.max(COS85, cosZ) + F2 * Math.sin(tiltR)));
      const g = Math.max(0, Ib + Id + Ir);
      if (out) { out.g = g; out.geff = Math.max(0, Ib * iamMartinRuiz(cosAOIcl) + Id * iamDiffuseFactor(tiltDeg) + Ir * iamGroundFactor(tiltDeg)); }
      return g;
    },
    k: {},
    tpl:   { en: 'D_ic = D_h·[(1−F1)·(1+cosβ)/2 + F1·cosAOI/cos z + F2·sinβ]   (F1 circumsolar, F2 horizon)', ro: 'D_ic = D_h·[(1−F1)·(1+cosβ)/2 + F1·cosAOI/cos z + F2·sinβ]   (F1 circumsolar, F2 orizont)' },
    prose: { en: 'Anisotropic diffuse transposition - Perez et al. (1990): adds a horizon-brightness term; strongest circumsolar enhancement (over-predicts steep tilts at low sun the most). HISTORY, switchable.',
             ro: 'Transpoziția difuză anizotropă - Perez et al. (1990): adaugă strălucirea de orizont; cea mai puternică amplificare circumsolară (supraestimează cel mai mult înclinările mari la soare jos). ISTORIC, comutabil.' },
  },

  /* Monthly diffuse fraction Kd = DHI/GHI from the monthly clearness Kt = GHI/H0. Splits the satellite
     monthly GHI into beam + diffuse for the tilted-plane transposition (the split is invisible on a
     horizontal plane but drives the tilted POA via the beam's cosAOI/sinEl gain). */
  kt_diffuse_split: {
    fn: function (Kt) {
      const k = FORMULAS.kt_diffuse_split.k;
      Kt = Math.max(0, Math.min(1, Kt));
      const kd = k.c0 + k.c1 * Kt + k.c2 * Kt * Kt + k.c3 * Kt * Kt * Kt;
      return Math.max(k.lo, Math.min(1, kd));
    },
    k: { c0: 0.62085, c1: 1.33675, c2: -4.98123, c3: 3.32197, lo: 0.05 },
    tpl:   { en: 'Kd = {c0} + {c1}·Kt + ({c2})·Kt² + {c3}·Kt³   (clamped [{lo}, 1])',
             ro: 'Kd = {c0} + {c1}·Kt + ({c2})·Kt² + {c3}·Kt³   (limitat [{lo}, 1])' },
    prose: { en: 'Diffuse fraction Kd(Kt): a cubic CALIBRATED to PVGIS-SARAH3 - a fit to PVGIS\'s own measured monthly diffuse fraction over 30 European points / 360 month-points (scripts/calibrate-diffuse-pvgis.js). It REPLACED the legacy Erbs/Liu-Jordan (1982) correlation, which under-read diffuse by 3-7 pp vs the satellite retrieval - invisible on a horizontal plane but inflating tilted yield +2-5% (beam over-gains via cosAOI/sin h, worst at low sun = winter / high latitude). RMSE vs PVGIS: 6.5 pp (Erbs) -> 2.3 pp (this fit).',
             ro: 'Fracția difuză Kd(Kt): o cubică CALIBRATĂ pe PVGIS-SARAH3 - ajustare pe fracția difuză lunară măsurată de PVGIS în 30 de puncte europene / 360 puncte-lună (scripts/calibrate-diffuse-pvgis.js). A ÎNLOCUIT corelația clasică Erbs/Liu-Jordan (1982), care subestima difuzul cu 3-7 pp față de satelit - invizibil pe plan orizontal, dar umfla producția înclinată cu +2-5% (directul câștigă în exces prin cosAOI/sin h, maxim la soare jos = iarnă / latitudini mari). RMSE față de PVGIS: 6.5 pp (Erbs) -> 2.3 pp (această ajustare).' },
  },

};

const Formula = {
  fn(id)  { return FORMULAS[id].fn; },
  has(id) { return !!FORMULAS[id]; },
  /* Render { formula, prose } for an explanation div. params override the formula's own constants (k).
     Numeric substitutions go through fnum() when available (2-dp, trailing zeros stripped). */
  explain(id, params, lang) {
    const f = FORMULAS[id];
    if (!f) return { formula: '', prose: '' };
    const L = lang || (typeof LANG_CURRENT !== 'undefined' ? LANG_CURRENT : 'en');
    const subst = Object.assign({}, f.k, params || {});
    /* Formula coefficients need FULL precision (0.8662, -0.015843), NOT fnum's 2-dp rounding;
       toPrecision(8) keeps the value and strips float noise (0.30000004 -> 0.3). */
    const fmt = v => (typeof v === 'number') ? String(+v.toPrecision(8)) : v;
    const fill = s => String(s).replace(/\{(\w+)\}/g, (_, key) => (key in subst) ? fmt(subst[key]) : '{' + key + '}');
    return { formula: fill(f.tpl[L] || f.tpl.en), prose: (f.prose[L] || f.prose.en) };
  },
};

if (typeof window !== 'undefined') { window.FORMULAS = FORMULAS; window.Formula = Formula; }
