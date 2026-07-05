/* Yield calculation engine.
   Depends on globals: sunPos, isShaded, G0, doy, D2R (solar-geometry.js)
                       clearSkyHofierka (irradiance-hofierka.js)
                       getKt (irradiance-ineichen.js)
                       resolveKt (kt-grid.js)
                       resolveTemp (temp-grid.js)
                       MDAYS (constants.js)

   Two cloud-scaling paths, selected by transposeName:

   'hofierka' — PVGIS-native path
     Clear-sky model : clearSkyHofierka  (always; kt5.bin is Hofierka-normalised)
     Kt source       : resolveKt()  →  kt5.bin  (Kt_cs = GHI_pvgis / GHI_cs_hofierka)
     Beam/diffuse    : Liu-Jordan monthly decomposition  (Erbs 1982 monthly form)
     Transposition   : transposeHofierka  (N-term anisotropic, PVGIS native)

   'haydavies' | 'perez' — Ineichen path  (pure model, no inter-model renorm)
     Clear-sky model : clearSkyFn argument  (typically clearSkyIneichen + tl5/tl1.png TL grid)
     Kt source       : resolveKt()  →  kt1.png satellite Kt applied directly.
                         tl5/tl1.png back-solved so csIne ≈ csHof by construction
                         (ghiFull vs NASA POWER CLRSKY), making Kt_hof usable without renorm.
                         Falls back to getKt() lat-band table when satellite grid not loaded.
     Beam/diffuse    : uniform scaling  {ghi,dni,dhi} × Kt
     Transposition   : transposeHayDavies  or  transposePerez

   Irradiance vs effective irradiance (PVGIS semantics):
     transpose*() RETURNS the plain in-plane irradiance G_i (no reflectivity losses) —
     comparable to PVGIS H(i). When an `out` object is passed it is filled with
     { g, geff } where geff applies the Martin-Ruiz IAM per component (beam/diffuse/
     ground) — the "effective irradiance" that enters the power model, exactly like
     the PVGIS chain (its AOI loss line, typically −2..−3%).

   Power model (tcOpts.powModel):
     'huld' (default) — PVGIS efficiency surface (Huld et al. 2010 / King):
        η_rel(G',T') = [k0 + k1·lnG' + k2·ln²G' + T'(k3 + k4·lnG' + k5·ln²G') + k6·T'²]/k0
        G' = G_eff/1000, T' = Tcell − 25. Captures low-irradiance droop + temperature
        cross-terms. Coefficient sets from the PVGIS Python source
        (api/power/efficiency_coefficients.py), free-standing c-Si.
     'gamma' — legacy linear datasheet model: derate = 1 + γ·(Tcell − 25).

   Cell temperature (both, when temp grid loaded):
     NOCT:   Tcell = T2m + (noct − 20) / 800 × G          IEC 61215
     Faiman: Tcell = T2m + G / (Uc + Uv × wind(lat,lon,mo))  PVGIS uses 26.9 / 6.2 */

/* ── Cell temperature helper ────────────────────────────────────────────────
   tcOpts = { tcModel:'noct'|'faiman', noct, uc, uv }
   resolveWind() is defined in wind-grid.js once wind5.png is loaded;
   falls back to 1.0 m/s until the grid is available. */
function _calcTcell(T2m, G_W, noct, tcOpts, lat, lon, mo) {
  /* Effective daytime air warmth via the per-model DK offset (formulas.js tair_warm: T2m + K·G/1000),
     then the cell rise (PVGIS Faiman / NOCT). G_W is the clear-sky-biased cell-temp irradiance. */
  const K    = (tcOpts && tcOpts.diurnalK != null) ? tcOpts.diurnalK
             : DIURNAL_WARM_K[(tcOpts && tcOpts.tcModel === 'faiman') ? 'faiman' : 'noct'];
  const Tair = FORMULAS.tair_warm.fn(T2m, G_W, K);
  if (tcOpts?.tcModel === 'faiman') {     // U_c/U_v default to FAIMAN_U0/FAIMAN_U1 inside the formula
    const wind = (typeof resolveWind === 'function') ? resolveWind(lat, lon, mo) : 1.0;
    return FORMULAS.tcell_faiman.fn(Tair, G_W, wind, tcOpts.uc, tcOpts.uv);
  }
  return FORMULAS.tcell_noct.fn(Tair, G_W, noct);   // NOCT (default)
}

/* ── Huld et al. (2010) PV efficiency surface — the PVGIS power model ────────
   η_rel(G',T') = [k0 + k1·lnG' + k2·ln²G' + T'·(k3 + k4·lnG' + k5·ln²G') + k6·T'²] / k0
   G' = G_eff/1000 (suns), T' = Tcell − 25. Free-standing c-Si coefficient sets
   verbatim from the PVGIS Python source (api/power/efficiency_coefficients.py):
     csi2025 — "Crystalline Silicon (2025)" (current PVGIS web default)
     csi     — "Crystalline Silicon (original)" (SARAH-era set, Huld 2010 fit)
   Reference: Huld T., Gottschalg R., Beyer H.G., Topič M., Solar Energy 84, 2010. */
const HULD_COEFFS = {
  csi2025: [1.0,      -0.006756, -0.016444, -0.003015, -0.000045, -0.000043, 0],
  csi:     [1.000436, -0.012678, -0.017522, -0.003154, -0.000315, -0.000164, 0],
};

/* ── Cell-temperature irradiance bias (monthly-climatology correction) ──────────────
   This engine is a MONTHLY climatology: every hour's irradiance = clear-sky × monthly-mean Kt.
   But PV energy is produced overwhelmingly on the SUNNY (near-clear-sky) hours, where the cell
   runs HOT — much hotter than the Kt-SMEARED geff suggests. Feeding the Kt-smeared geff to the
   cell-temp calc under-derates → energy reads ~+5% over PVGIS's HOURLY simulation (which sees the
   real hot sunny hours). Fix: evaluate the cell temperature at an irradiance BLENDED toward the
   clear-sky POA. 0 = old (Kt-smeared, +5%); 1 = full clear-sky POA. The POWER MAGNITUDE always
   stays the Kt-scaled geff (energy is conserved); only the TEMPERATURE sees the clear-sky bias.
   Calibrated against PVGIS PVcalc (Faiman u0=26.9/u1=6.2) over the testViz global point set so the
   mean energy delta -> ~0. Override per-call via tcOpts.tempKtBlend. See project_energy_vs_pvgis. */
const TEMP_KT_BLEND  = 1.0;   // FIXED (physical): cell temp evaluated at the clear-sky POA (production hours are sunny).
/* Effective daytime air warmth K (°C at full sun) added via FORMULAS.tair_warm (T2m + K·G/1000), PER cell-temp
   model. Calibrated SEPARATELY against PVGIS PVcalc over the testViz 43-pt set, because NOCT runs hotter than
   Faiman and needs LESS added warmth to land on PVGIS: both → mean energy ~0 (NOCT -0.16% / |Δ| 1.81%, Faiman
   -0.06% / |Δ| 1.95%). Empirical (no PVGIS counterpart); also absorbs the monthly-Kt irradiance-smearing
   under-deration. (A physical diurnal-shape reconstruction was tried + reverted — see formulas.js tair_warm.)
   Override per-call via tcOpts.diurnalK (browser calibration in testViz.html). */
const DIURNAL_WARM_K = { noct: 10, faiman: 16 };
function etaHuld(Gp, Tp, k) {
  if (!(Gp > 0)) return 0;
  const lg = Math.log(Gp);
  const eta = k[0] + lg * (k[1] + lg * k[2]) + Tp * (k[3] + lg * (k[4] + lg * k[5]) + k[6] * Tp);
  return Math.max(0, eta / k[0]);
}

/* One hourly power sample (kW/m²-equivalent) from the EFFECTIVE irradiance.
   gamma === 0 or T2m === null ⇒ no temperature term (huld keeps its low-irradiance
   droop with T' = 0; gamma path returns the plain irradiance, as before). */
function _powerSample(geff_W, T2m, noct, gamma, tcOpts, lat, lon, mo, geffTemp) {
  const hasTemp = (T2m !== null && gamma !== 0);
  const gT = (geffTemp == null) ? geff_W : geffTemp;   // irradiance for the CELL-TEMP calc (clear-sky-biased; see TEMP_KT_BLEND in calcYield). Power magnitude stays geff_W.
  if (tcOpts?.powModel === 'huld') {
    const k  = HULD_COEFFS[tcOpts.huldSet] || HULD_COEFFS.csi2025;
    const Tc = hasTemp ? _calcTcell(T2m, gT, noct, tcOpts, lat, lon, mo) : 25;
    return geff_W / 1000 * etaHuld(geff_W / 1000, Tc - 25, k);
  }
  if (hasTemp) {
    const Tc = _calcTcell(T2m, gT, noct, tcOpts, lat, lon, mo);
    return geff_W / 1000 * Math.max(0, 1 + gamma * (Tc - 25));
  }
  return geff_W / 1000;
}


/* ── Monthly-average diffuse fraction Kd = DHI/GHI from clearness K̄t = GHI / H₀ ──────────────
   Used only by the Hofierka path to split the satellite-derived monthly GHI into beam and diffuse
   without a second full hourly pass.

   The math (a PVGIS-SARAH3-calibrated cubic that replaced the legacy Erbs/Liu-Jordan 1982 correlation)
   now lives in the single-source registry: FORMULAS.kt_diffuse_split (js/formulas.js). This is a thin
   global alias so the two callers below stay unchanged. Name kept for back-compat; see the registry
   prose for the calibration story (RMSE 6.5pp Erbs -> 2.3pp). */
function liuJordanKd(Kt) { return FORMULAS.kt_diffuse_split.fn(Kt); }

/* Pre-compute monthly clear-sky sums and H₀ (Hofierka path only).
   Returns W·samples/m² — absolute units cancel; only ratios are used. */
function _clearSkyMonthSums(lat, lon, tz, mo, clearSkyFn, declinFn, hzArr, useHorizon) {
  const year = 2023, ndays = MDAYS[mo];
  let csGHI = 0, csDHI = 0, H0 = 0;
  for (let d = 1; d <= ndays; d += 2) {
    const n = doy(year, mo + 1, d);
    for (let hmin = 30; hmin < 24 * 60; hmin += 60) {
      const sun = sunPos(lat, lon, tz, n, hmin / 60, 'lst', declinFn);
      if (!sun) continue;
      if (useHorizon && isShaded(sun.az, sun.el, hzArr)) continue;
      const cs = clearSkyFn(sun.el, n, lat);
      csGHI += cs.ghi;
      csDHI += cs.dhi;
      H0    += G0(n) * Math.sin(D2R * sun.el);
    }
  }
  const scale = ndays / Math.ceil(ndays / 2);
  return { csGHI: csGHI * scale, csDHI: csDHI * scale, H0: H0 * scale };
}


/* ── Transposition models moved to formulas.js (FORMULAS.transpose_*) — single source. These thin global
   aliases keep existing callers (calcYield, connections/strings/yield.html) working. transposeHofierka is
   the canonical Muneer (1990) model; the name is kept for back-compat (it WAS always the Muneer port). ── */
function transposeHayDavies(sun, cs, tiltDeg, azPVGIS, albedo, n, out) { return FORMULAS.transpose_haydavies.fn(sun, cs, tiltDeg, azPVGIS, albedo, n, out); }

function transposePerez(sun, cs, tiltDeg, azPVGIS, albedo, n, out) { return FORMULAS.transpose_perez.fn(sun, cs, tiltDeg, azPVGIS, albedo, n, out); }

/* transposeHofierka = the canonical Muneer (1990) model (FORMULAS.transpose_muneer). Name kept for
   back-compat: "Hofierka/Suri (2002)" always referred to this PVGIS Muneer-based inclined-diffuse port. */
function transposeHofierka(sun, cs, tiltDeg, azPVGIS, albedo, n, out) { return FORMULAS.transpose_muneer.fn(sun, cs, tiltDeg, azPVGIS, albedo, n, out);
}

/* Backward-compatible alias */
function transposeTilted(sun, cs, tiltDeg, azPVGIS, albedo, n = 172, out) {
  return transposeHofierka(sun, cs, tiltDeg, azPVGIS, albedo, n, out);
}


/* ── calcYield ───────────────────────────────────────────────────────────────
   noct          — Nominal Operating Cell Temperature (°C), default 45
   gamma         — Pmpp temperature coefficient (/°C), default −0.004 (mono-Si)
   transposeName — 'hofierka' (default) | 'haydavies' | 'perez'
                   Drives both the Kt source and the transposition formula. */
function calcYield(lat, lon, tz, tiltDeg, azPVGIS, peakKwp, pr, albedo, hzArr, useHorizon,
                   clearSkyFn, declinFn, noct = 45, gamma = -0.004, transposeName = 'muneer', tcOpts = {}) {
  const monthly      = new Array(12).fill(0);
  const monthlyIrrad = new Array(12).fill(0);
  const year = 2023;
  const TKB  = (tcOpts && tcOpts.tempKtBlend != null) ? tcOpts.tempKtBlend : TEMP_KT_BLEND;   // cell-temp clear-sky bias

  for (let mo = 0; mo < 12; mo++) {
    const ndays = MDAYS[mo];
    const T2m   = resolveTemp(lat, lon, mo);
    let moIrrad = 0, moPower = 0;

    /* ── PVGIS / Hofierka path ───────────────────────────────────────────── */
    if (transposeName === 'hofierka' || transposeName === 'muneer') {
      /* kt5.bin: Kt_cs = GHI_pvgis / GHI_cs_hofierka  (Hofierka-normalised).
         Pre-compute monthly sums for Liu-Jordan beam/diffuse decomposition. */
      const Kt = resolveKt(lat, lon, mo);
      const { csGHI, csDHI, H0 } = _clearSkyMonthSums(
        lat, lon, tz, mo, clearSkyHofierka, declinFn, hzArr, useHorizon);
      /* K̄t = GHI_pvgis / H₀ = Kt × csGHI / H₀ */
      const Kt_std    = H0 > 0 ? Kt * csGHI / H0 : 0;
      const Kd_mo     = liuJordanKd(Kt_std);
      const Kd_cs     = csGHI > 0 ? csDHI / csGHI : 0;
      const dhi_scale = Kd_cs > 1e-4 ? (Kd_mo / Kd_cs) * Kt : Kd_mo * Kt;

      for (let d = 1; d <= ndays; d += 2) {
        const n = doy(year, mo + 1, d);
        for (let hmin = 30; hmin < 24 * 60; hmin += 60) {
          const sun = sunPos(lat, lon, tz, n, hmin / 60, 'lst', declinFn);
          if (!sun) continue;
          if (useHorizon && isShaded(sun.az, sun.el, hzArr)) continue;

          const cs         = clearSkyHofierka(sun.el, n, lat);
          const actual_ghi = cs.ghi * Kt;
          const actual_dhi = Math.min(actual_ghi, cs.dhi * dhi_scale);
          const sinEl      = Math.max(0.01745, Math.sin(D2R * sun.el));
          const actual_dni = Math.max(0, (actual_ghi - actual_dhi) / sinEl);
          const scaledCs   = { ghi: actual_ghi, dhi: actual_dhi, dni: actual_dni };

          const tp = {};
          transposeHofierka(sun, scaledCs, tiltDeg, azPVGIS, albedo, n, tp);
          moIrrad += tp.g / 1000;
          let geffTemp = tp.geff;
          if (TKB > 0) {   // cell temp at clear-sky-biased POA (production runs hot; see TEMP_KT_BLEND)
            const csTp = {};
            transposeHofierka(sun, cs, tiltDeg, azPVGIS, albedo, n, csTp);
            geffTemp = tp.geff + TKB * (csTp.geff - tp.geff);
          }
          moPower += _powerSample(tp.geff, T2m, noct, gamma, tcOpts, lat, lon, mo, geffTemp);
        }
      }

    /* ── Ineichen path ───────────────────────────────────────────────────── */
    } else {
      /* Pure Ineichen: clearSkyIneichen + TL grid + satellite Kt directly.
         tl5/tl1.png are back-solved so csIne ≈ csHof by construction
         (ghiFull against NASA POWER CLRSKY), so Kt_hof from kt1.png applies
         without a model-bridging renorm.  Falls back to getKt() lat-band
         table when satellite grid not loaded. */
      const Kt = resolveKt(lat, lon, mo);

      for (let d = 1; d <= ndays; d += 2) {
        const n = doy(year, mo + 1, d);
        for (let hmin = 30; hmin < 24 * 60; hmin += 60) {
          const sun = sunPos(lat, lon, tz, n, hmin / 60, 'lst', declinFn);
          if (!sun) continue;
          if (useHorizon && isShaded(sun.az, sun.el, hzArr)) continue;

          const cs       = clearSkyFn(sun.el, n, lat, lon);  // lon enables TL grid in Ineichen
          const scaledCs = { ghi: cs.ghi * Kt, dni: cs.dni * Kt, dhi: cs.dhi * Kt };

          const tp = {};
          if (transposeName === 'perez') transposePerez(sun, scaledCs, tiltDeg, azPVGIS, albedo, n, tp);
          else                           transposeHayDavies(sun, scaledCs, tiltDeg, azPVGIS, albedo, n, tp);

          moIrrad += tp.g / 1000;
          let geffTemp = tp.geff;
          if (TKB > 0) {   // cell temp at clear-sky-biased POA (production runs hot; see TEMP_KT_BLEND)
            const csTp = {};
            if (transposeName === 'perez') transposePerez(sun, cs, tiltDeg, azPVGIS, albedo, n, csTp);
            else                           transposeHayDavies(sun, cs, tiltDeg, azPVGIS, albedo, n, csTp);
            geffTemp = tp.geff + TKB * (csTp.geff - tp.geff);
          }
          moPower += _powerSample(tp.geff, T2m, noct, gamma, tcOpts, lat, lon, mo, geffTemp);
        }
      }
    }

    const scale      = ndays / Math.ceil(ndays / 2);
    monthlyIrrad[mo] = moIrrad * scale;
    monthly[mo]      = moPower * scale * peakKwp * pr;
  }

  return { monthly, monthlyIrrad, annual: monthly.reduce((a, b) => a + b, 0) };
}


/* ── calcYieldDailyTilt ──────────────────────────────────────────────────────
   Auto-tilt: β(n) = clamp(lat − δ(n), minTilt, maxTilt).
   monthlyTilt[] returns the mean tilt angle for each month (shown in the table).
   Same two-path cloud-scaling logic as calcYield. */
function calcYieldDailyTilt(lat, lon, tz, azPVGIS, peakKwp, pr, albedo, hzArr, useHorizon,
                             clearSkyFn, declinFn, noct, gamma, transposeName,
                             minTilt = 15, maxTilt = 60, tcOpts = {}) {
  const monthly      = new Array(12).fill(0);
  const monthlyIrrad = new Array(12).fill(0);
  const monthlyTilt  = new Array(12).fill(0);
  const year = 2023;

  for (let mo = 0; mo < 12; mo++) {
    const ndays = MDAYS[mo];
    const T2m   = resolveTemp(lat, lon, mo);
    let moIrrad = 0, moPower = 0, moTiltSum = 0, moTiltCount = 0;

    /* Hofierka path pre-computations */
    let Kt_hof, dhi_scale_hof;
    if (transposeName === 'hofierka' || transposeName === 'muneer') {
      const Kt = resolveKt(lat, lon, mo);
      const { csGHI, csDHI, H0 } = _clearSkyMonthSums(
        lat, lon, tz, mo, clearSkyHofierka, declinFn, hzArr, useHorizon);
      const Kt_std    = H0 > 0 ? Kt * csGHI / H0 : 0;
      const Kd_mo     = liuJordanKd(Kt_std);
      const Kd_cs     = csGHI > 0 ? csDHI / csGHI : 0;
      Kt_hof          = Kt;
      dhi_scale_hof   = Kd_cs > 1e-4 ? (Kd_mo / Kd_cs) * Kt : Kd_mo * Kt;
    }

    /* Pure Ineichen: Kt directly from satellite grid, no renorm. */
    let Kt_ien = 0;
    if (transposeName !== 'hofierka' && transposeName !== 'muneer') {
      Kt_ien = resolveKt(lat, lon, mo);
    }

    for (let d = 1; d <= ndays; d += 2) {
      const n      = doy(year, mo + 1, d);
      const decDeg = (declinFn || declinationSpencer)(n);
      const tiltDay = Math.max(minTilt, Math.min(maxTilt, Math.round(lat - decDeg)));
      moTiltSum += tiltDay; moTiltCount++;

      for (let hmin = 30; hmin < 24 * 60; hmin += 60) {
        const sun = sunPos(lat, lon, tz, n, hmin / 60, 'lst', declinFn);
        if (!sun) continue;
        if (useHorizon && isShaded(sun.az, sun.el, hzArr)) continue;

        const tp = {};
        if (transposeName === 'hofierka' || transposeName === 'muneer') {
          const cs         = clearSkyHofierka(sun.el, n, lat);
          const actual_ghi = cs.ghi * Kt_hof;
          const actual_dhi = Math.min(actual_ghi, cs.dhi * dhi_scale_hof);
          const sinEl      = Math.max(0.01745, Math.sin(D2R * sun.el));
          const actual_dni = Math.max(0, (actual_ghi - actual_dhi) / sinEl);
          transposeHofierka(sun,
            { ghi: actual_ghi, dhi: actual_dhi, dni: actual_dni },
            tiltDay, azPVGIS, albedo, n, tp);
        } else {
          const cs       = clearSkyFn(sun.el, n, lat, lon);  // lon enables TL grid in Ineichen
          const scaledCs = { ghi: cs.ghi * Kt_ien, dni: cs.dni * Kt_ien, dhi: cs.dhi * Kt_ien };
          if (transposeName === 'perez') transposePerez(sun, scaledCs, tiltDay, azPVGIS, albedo, n, tp);
          else                           transposeHayDavies(sun, scaledCs, tiltDay, azPVGIS, albedo, n, tp);
        }

        moIrrad += tp.g / 1000;
        moPower += _powerSample(tp.geff, T2m, noct, gamma, tcOpts, lat, lon, mo);
      }
    }

    const scale      = ndays / Math.ceil(ndays / 2);
    monthlyIrrad[mo] = moIrrad * scale;
    monthly[mo]      = moPower * scale * peakKwp * pr;
    monthlyTilt[mo]  = moTiltCount
      ? Math.round(moTiltSum / moTiltCount)
      : Math.round((minTilt + maxTilt) / 2);
  }

  return { monthly, monthlyIrrad, annual: monthly.reduce((a, b) => a + b, 0), monthlyTilt };
}


function findOptimal(lat, lon, tz, peakKwp, pr, albedo, hzArr, useHorizon,
                     clearSkyFn, declinFn, noct = 45, gamma = -0.004, transposeName = 'muneer', tcOpts = {}) {
  const AZ_CANDIDATES = [-45, -30, -15, 0, 15, 30, 45];

  /* Pass 1 — coarse 5° grid to identify the best azimuth and tilt region */
  let best = -1, bestTilt = 35, bestAz = 0;
  for (const az of AZ_CANDIDATES) {
    for (let tilt = 0; tilt <= 70; tilt += 5) {
      const { annual } = calcYield(lat, lon, tz, tilt, az, peakKwp, pr, albedo, hzArr,
                                   useHorizon, clearSkyFn, declinFn, noct, gamma, transposeName, tcOpts);
      if (annual > best) { best = annual; bestTilt = tilt; bestAz = az; }
    }
  }

  /* Pass 2 — fine 1° grid ±5° around the coarse winner (same azimuth) */
  const tFine0 = Math.max(0,  bestTilt - 5);
  const tFine1 = Math.min(90, bestTilt + 5);
  for (let tilt = tFine0; tilt <= tFine1; tilt++) {
    const { annual } = calcYield(lat, lon, tz, tilt, bestAz, peakKwp, pr, albedo, hzArr,
                                 useHorizon, clearSkyFn, declinFn, noct, gamma, transposeName, tcOpts);
    if (annual > best) { best = annual; bestTilt = tilt; }
  }

  return { optTilt: bestTilt, optAz: bestAz };
}

/* findOptimalTilt — optimal tilt at a FIXED azimuth (default 0 = due South). This is the
   "optim" reference orientation of Neamț course pt 18 ("poziția optimă: azimut și înclinare",
   here azimut = 0). Same system (kWp, losses, module, site horizon), just repositioned.
   Returns { optTilt, annual, monthly, monthlyIrrad }. Coarse 5° sweep + 1° refinement, like
   findOptimal but azimuth is not searched. */
function findOptimalTilt(lat, lon, tz, peakKwp, pr, albedo, hzArr, useHorizon,
                         clearSkyFn, declinFn, noct = 45, gamma = -0.004, transposeName = 'muneer', tcOpts = {}, azPVGIS = 0) {
  let best = -1, bestTilt = 35, bestRes = null;
  for (let tilt = 0; tilt <= 70; tilt += 5) {
    const res = calcYield(lat, lon, tz, tilt, azPVGIS, peakKwp, pr, albedo, hzArr,
                          useHorizon, clearSkyFn, declinFn, noct, gamma, transposeName, tcOpts);
    if (res.annual > best) { best = res.annual; bestTilt = tilt; bestRes = res; }
  }
  const t0 = Math.max(0, bestTilt - 5), t1 = Math.min(90, bestTilt + 5);
  for (let tilt = t0; tilt <= t1; tilt++) {
    const res = calcYield(lat, lon, tz, tilt, azPVGIS, peakKwp, pr, albedo, hzArr,
                          useHorizon, clearSkyFn, declinFn, noct, gamma, transposeName, tcOpts);
    if (res.annual > best) { best = res.annual; bestTilt = tilt; bestRes = res; }
  }
  return { optTilt: bestTilt, annual: bestRes.annual, monthly: bestRes.monthly, monthlyIrrad: bestRes.monthlyIrrad };
}
