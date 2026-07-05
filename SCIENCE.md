# Scientific Documentation
## Solar Path & Yield Calculator — Mathematical Foundations

**Tool version**: 0.9.4  
**Date**: 2026-05-19  
**Implementation**: JavaScript (browser, no external math library)

---

## 1. Coordinate Systems and Conventions

### 1.1 Astronomical conventions

Solar position is described by two angles:

- **Solar elevation** (altitude) *h*: angle above the horizontal plane, 0° at horizon, 90° at zenith
- **Solar azimuth** *γ_s*: bearing of the sun measured clockwise from North (Navigation convention)
  - North = 0°, East = 90°, South = 180°, West = 270°

### 1.2 PVGIS convention (panel orientation)

PVGIS and solar architecture use a South-centred azimuth:
- South = 0°, West = +90°, East = −90°, North = ±180°

**Conversion**:
```
γ_PVGIS = γ_Nav − 180°   (clamped to [−180°, +180°])
γ_Nav   = γ_PVGIS + 180° (mod 360°)
```

### 1.3 Horizon file convention (PVGIS .txt)

The 36-value horizon file uses Navigation azimuth starting from North:
- Index 0 → 0° (North), Index 1 → 10°, …, Index 35 → 350°
- Each value: maximum obstacle elevation angle (degrees) in that 10° sector

---

## 2. Solar Geometry

### 2.1 Day of year

```
n = day of year (1 = Jan 1, 365 = Dec 31)
```

### 2.2 Solar declination

Three formulas are available. The Yield tab radio button selects between Spencer and Hofierka. The canvas (Sun Path chart) always uses Spencer.

**Spencer (1971)** — 7-term Fourier series, selectable in Yield tab:
```
B = 2π · (n − 1) / 365
δ = R2D · [0.006918
         − 0.399912·cos(B)     + 0.070257·sin(B)
         − 0.006758·cos(2B)    + 0.000907·sin(2B)
         − 0.002697·cos(3B)    + 0.001480·sin(3B)]
```
**Accuracy**: ±0.035° — matches the pvlib reference implementation (`pvlib.solarposition.declination_spencer71`).

*Note*: earlier versions of this tool mislabelled the Cooper (1969) simple sinusoid as "Spencer". The Cooper formula `23.45°·sin(360°·(284+n)/365)` is kept as `declinationCooper()` for reference but is no longer used in calculations.

**Hofierka/Suri (2002)** — PVGIS native, default in Yield tab, direct port of `com_declin()` from `rsun_base.c`:
```
dayAngle = 2π · n / 365.25
δ = arcsin(0.3978 · sin(dayAngle − 1.4 + 0.03344 · sin(dayAngle − 0.048869)))
```
The inner `sin` term is an eccentricity correction (perigee offset 0.048869 rad, factor 0.03344). **Accuracy**: ±0.2°.

`declination(n)` is a backward-compatible alias that calls Spencer (1971).

### 2.3 Equation of time (PVCDROM approximation)

The equation of time *EoT* accounts for the eccentricity of Earth's orbit and the obliquity of the ecliptic:

```
B = 360° · (n − 80) / 365
EoT [minutes] = 9.87·sin(2B) − 7.53·cos(B) − 1.5·sin(B)
```

**Source**: PVCDROM online textbook (Honsberg & Bowden). Accuracy: ±0.5 min, negligible effect on solar position.

### 2.4 Solar hour angle

The hour angle *ω* is zero at solar noon, negative in the morning:

**For Local Solar Time (LST) input hour *h*:**
```
h_solar = h + EoT/60 + (λ − λ_ref) / 15
ω = 15° · (h_solar − 12)
```
where λ is site longitude (°E), λ_ref = timezone_offset × 15°.

**For standard time input:** h_solar = h (no correction applied).

### 2.5 Solar altitude and azimuth

```
sin(h_s) = sin(φ)·sin(δ) + cos(φ)·cos(δ)·cos(ω)

cos(γ_s) = [sin(δ)·cos(φ) − cos(δ)·sin(φ)·cos(ω)] / cos(h_s)
```

where φ = site latitude.

Azimuth quadrant check: if ω > 0 (afternoon), γ_s = 360° − arccos(cos γ_s).

**Source**: Duffie & Beckman, *Solar Engineering of Thermal Processes*, 4th ed., 2013.

---

## 3. Extraterrestrial Irradiance

The solar constant G_sc is user-editable (default 1361 W/m²). Reference values:

| Source | G_sc (W/m²) |
|--------|-------------|
| WRC (older standard) | 1361 |
| PVGIS `constants.py` | 1360.8 |
| TIS (Kopp & Lean, 2011) | 1361.5 |

The same G_sc value is used by both Mode A (`G0()`) and Mode B (`G0_hofierka()`).

**Mode A** — Spencer/Ineichen correction:
```
G_0(n) = G_sc · [1 + 0.033 · cos(360° · n / 365)]
```

**Mode B** — Hofierka precise eccentricity correction (see Section 4B.1):
```
G_0(n) = G_sc · [1 + 0.03344 · cos(2π·n/365.25 − 0.048869)]
```

---

## 4. Clear-Sky Irradiance Models

Two selectable clear-sky models are implemented. Both produce GHI, DNI, and DHI. The Hay-Davies transposition and Kt correction (Sections 5–6) are applied identically to both.

### Model selection

The Yield tab radio button passes either `clearSkyIneichen` or `clearSkyHofierka` as a function argument to `calcYield`. The yield engine is model-agnostic.

---

## 4A. Clear-Sky Model A — Ineichen-Perez

### 4A.1 Linke turbidity estimate

A simplified latitude- and season-dependent Linke turbidity *T_L* is used in the absence of measured aerosol data:

```
T_L = 2.5 + 1.5 · sin(φ) · sin(360° · (n − 80) / 365) + 0.5
```

This gives T_L ≈ 2.0–2.5 for clean mid-latitude air, T_L ≈ 3.5–5 for humid tropical conditions.

### 4A.2 Direct Normal Irradiance (DNI)

```
DNI = G_0 · c_g1 · exp(−c_g2 · T_L / max(0.065, sin(h_s)))
```

where c_g1 = 0.868 and c_g2 = 0.0387 (sea-level coefficients; altitude correction omitted).

### 4A.3 Diffuse Horizontal Irradiance (DHI)

```
F_d = 0.99309 − 0.01799·T_L + 0.00441·T_L²
DHI = G_0 · sin(h_s) · (0.0065 + F_d · (0.027 − 0.00017·T_L))
```

*Note: earlier versions incorrectly used `0.27` and `0.0017` (10× too large), causing ~39% DHI overestimation at typical turbidity values (TL≈2.5). Corrected in v0.9.4. Validated against NASA POWER CLRSKY: Full/POWER ratio improved from 1.39 → 1.04.*

### 4A.4 Global Horizontal Irradiance (GHI)

```
GHI = DNI · sin(h_s) + DHI
```

**Source**: Ineichen P., Perez R., *A new airmass independent formulation for the Linke turbidity coefficient*, Solar Energy, 73(3), 2002.

---

## 4B. Clear-Sky Model B — Hofierka/Suri (PVGIS Native)

This is the irradiance model used internally by the European Commission PVGIS tool. It is more accurate than the Ineichen simplified form because it uses tabulated Linke turbidity values derived from long-term satellite measurements rather than an analytic approximation.

**Source**: Hofierka J., Šúri M., *The solar radiation model for Open source GIS: implementation and applications*, Proc. Open source GIS — GRASS users conference, Trento, Italy, 2002.

**Verification**: The JS implementation was audited against the PVGIS Python open-source codebase (`pvgis/algorithms/pvgis/`). Confirmed identical: Rayleigh thickness polynomial, Tn(TL) coefficients, fd(h,TL) coefficients (A1/A2/A3), A1 clamp guard, ground reflection formula. Corrected in v0.8.3: solar constant and air mass refraction (see below).

### 4B.1 Extraterrestrial irradiance (eccentricity-corrected)

```
G_0(n) = 1360.8 · [1 + 0.03344 · cos(2π·n/365.25 − 0.048869)]
```

Solar constant 1360.8 W/m² is the modern TSI (Total Solar Irradiance) measurement used by PVGIS (value: `pvgis/constants.py:SOLAR_CONSTANT`). Earlier implementations used 1367 W/m² (older WRC value).

Note: this uses a more precise eccentricity correction than the simpler cos formula in Section 3.

### 4B.2 Linke turbidity factor T_L

T_L is a dimensionless measure of atmospheric opacity combining Rayleigh scattering, aerosol extinction, and water vapour absorption. Typical values: 2–3 for clean continental air, 4–6 for humid/hazy conditions.

**The table is calibrated from satellite-measured clear-sky, not guessed.** For each latitude band
and month, T_L is found by inverting the Hofierka clear-sky model — a 1-D bisection on T_L — until its
monthly clear-sky GHI matches the **CM SAF CLARA-A3 `SISCLS`** (clear-sky surface shortwave) climatology.
This is global, 0–90° (both hemispheres via |lat| with a 6-month seasonal flip), and replaced an earlier
crude zonal guess that ran ~10% too turbid in summer (it underestimated clear-sky 2–4%). Polar-winter
bands, where the sun barely rises and the inversion is ill-conditioned, are capped at T_L = 6.5 (harmless
— clear-sky ≈ 0 there). Pipeline: `scripts/clara-siscls-zonal.py` (zonal-mean SISCLS per band/month) →
`scripts/sarah3-calibrate-tl.js` (bisection invert) → `scripts/tl-clara-9x12.js`. The *same* table is
embedded in `js/irradiance-hofierka.js` (runtime) and the tile builders, so the build and the engine
always agree.

**Why the table can be coarse — turbidity cancels for horizontal GHI.** The stored clearness index is
Kt_cs = SIS / Hofierka(T_L), and the engine reconstructs GHI = Kt_cs · Hofierka(T_L) = SIS. The turbidity
*cancels exactly* for horizontal GHI: any consistently-applied T_L reproduces the source SIS. Empirically,
downsampling the table from 90 rows (1°) all the way to a single row holds the PVGIS validation flat at
~0.5% (`scripts/test-tl-downsample.js`). The table is therefore kept deliberately coarse at **9 rows ×
10° |lat| bands × 12 months**. T_L is *not* irrelevant overall — it still shapes the **tilted-plane**
beam/diffuse split (DNI vs DHI, §4B.6–4B.8), where its latitude structure carries real (second-order)
weight; it is only the horizontal-GHI normalisation that cancels.

Users may optionally override T_L with a measured or estimated value via the TL input field in the Yield sidebar.

A separate 1°/5° NASA-POWER-derived TL grid (`data/tl1.png`, §4B.2a) feeds the Ineichen (Mode A) path and `tlViz.html`; it is distinct from the CLARA-calibrated Hofierka table above.

### 4B.2a Global Linke turbidity grid (tl.png)

**File**: `data/tl5.png` — 8-bit grayscale PNG, 876×37 pixels  
**Layout**: width = 73 lons × 12 months; height = 37 lats (months side-by-side per row for better DEFLATE compression)  
**Encoding**: pixel = round(TL × 20); decode: TL = pixel / 20  
**Valid TL range**: 1.0–8.35 (pixel 20–167); polar-night months stored as 3.5 (pixel 70)

**Generation method** (`scripts/generate-tl-grid.js`):  
For each of 2,701 grid nodes (37 lat × 73 lon), monthly clear-sky GHI is fetched from NASA POWER (`CLRSKY_SFC_SW_DWN`). A binary search then finds the TL value that makes the Ineichen beam-only formula match POWER's clear-sky GHI:

```
GHI_cs = G_0 · sin(h_s) · 0.868 · exp(−0.0387 · TL / max(0.065, sin(h_s)))
```

The beam-only form (not the full beam+diffuse formula) is used for back-solving because it is physically bounded (Kt_cs ≤ 0.868), making the binary search well-conditioned.

**Validation** (`scripts/test-tl-ineichen.js`, 8 cities):  
Simple-formula/POWER ratio: **0.996** (construction check — confirms ±0.4% fidelity).  
Full-formula/POWER ratio: **1.045** (after DHI coefficient fix) — the 4.5% excess is the diffuse term, which is small and physically expected.

**Grid statistics**: TL min 1.00 (Antarctic/deep ocean), max 8.35 (Saharan dust), mean 2.60.

**Geographic patterns**:
- TL < 1.5: exceptional — Antarctic interior, remote southern ocean (clean pristine air)
- TL 1.5–2.0: pristine maritime — Patagonia, North Atlantic, high southern latitudes
- TL 3–5: humid tropics, monsoon regions, industrial areas
- TL > 6: Saharan dust belt, Arabian Peninsula dust storms

### 4B.3 Atmospheric refraction correction

Before computing the optical air mass, the raw solar elevation is corrected for atmospheric refraction (the apparent lifting of the sun near the horizon):

```
Δh [°] = 0.061359 · (0.1594 + 1.123·h_s + 0.065656·h_s²)
        / (1 + 28.9344·h_s + 277.3971·h_s²)

h_ref = h_s + Δh
```

This correction is significant near the horizon (Δh ≈ 0.35° at h_s = 5°, Δh → 0 at h_s > 20°) and improves accuracy for early morning and late afternoon hours. The formula matches `calculate_refracted_solar_altitude_series()` in the PVGIS Python codebase.

### 4B.4 Air mass (Kasten formula on refracted elevation, with elevation correction)

```
AM_sl = 1 / [sin(h_ref) + 0.50572 · (h_ref + 6.07995)^−1.6364]

AM = AM_sl · exp(−z / 8434.5)
```

where h_ref is the refraction-corrected elevation in degrees and z is site altitude in metres. The barometric pressure correction `exp(−z/8434.5)` reduces AM at altitude because there is less atmosphere above — matching `calculate_optical_air_mass_series()` in the PVGIS Python codebase.

Site altitude z is read from the `#site-elevation` sidebar field, which is auto-populated from the offline 0.1°×0.1° ETOPO2022 elevation grid (elevation.png). Effect: ~5.7% AM reduction at 500 m (e.g. Cluj-Napoca 508 m), ~12% at 1 000 m.

### 4B.5 Rayleigh optical thickness

```
τ_R = 1 / (6.6296 + 1.7513·AM − 0.1202·AM² + 0.0065·AM³ − 0.00013·AM⁴)   (AM ≤ 20)
τ_R = 1 / (10.4 + 0.718·AM)                                                  (AM > 20)
```

### 4B.6 Direct Normal Irradiance (DNI)

```
DNI = G_0 · exp(−0.8662 · T_L · AM · τ_R)
```

### 4B.7 Diffuse transmission term and angular distribution

```
t_n(T_L) = −0.015843 + 0.030543·T_L + 0.0003797·T_L²

A_1 = 0.26463 − 0.061581·T_L + 0.0031408·T_L²   (clamped: A_1·t_n ≥ 0.0022)
A_2 = 2.0402  + 0.018945·T_L − 0.011161·T_L²
A_3 = −1.3025 + 0.039231·T_L + 0.0085079·T_L²

f_d(h_s, T_L) = A_1 + A_2·sin(h_s) + A_3·sin²(h_s)
```

The A_1 clamp (`A_1·t_n ≥ 0.0022`) prevents non-physical DHI at very low turbidity. Matches the guard in `diffuse/altitude.py`.

### 4B.8 Diffuse Horizontal Irradiance (DHI)

```
DHI = G_0 · t_n(T_L) · f_d(h_s, T_L)
```

### 4B.9 Global Horizontal Irradiance (GHI)

```
GHI = DNI · sin(h_s) + DHI
```

All components clamped to ≥ 0 W/m².

---

## 5. Cloudiness Correction — Clearness Index

The monthly mean clearness index *K_t* scales the clear-sky output to account for cloud cover:

```
GHI_actual = GHI_clear · K_t
DNI_actual = DNI_clear · K_t
DHI_actual = DHI_clear · K_t
```

*K_t* = (actual GHI) / (extraterrestrial horizontal GHI G_0). Typical range: 0.3 (overcast maritime) to 0.75 (desert).

The tool uses a two-tier lookup. `resolveKt(lat, lon, month)` selects automatically:

### 5.1 Satellite clearness-index grid (primary) — SARAH-3 + CLARA-A3

The clearness index is built **directly from the CM SAF satellite climate data records** — the same
authoritative measurements the European Commission's PVGIS itself is derived from — pulled from the
**EUMETSAT Data Store** via the `eumdac` client. This replaced an earlier PVGIS-API per-cell scrape
that suffered visible winter "dead pixels": fresh snow has a high albedo the retrieval can misread as
cloud, so individual cold months came back implausibly dark. A multi-year monthly-mean climatology
averages that contamination out at the source instead of patching it after the fact (a build-time
despike was rejected as "guesswork, not scientific data").

**Two-tier, all-satellite design:**

| Layer | Dataset | Sensor | Native res | File |
|---|---|---|---|---|
| Global base | CM SAF **CLARA-A3** (`EO:EUM:DAT:0874`) | AVHRR (polar-orbiting) | 0.25° global | `data/kt-global.png` (720×1440×12) |
| Hi-res tile | CM SAF **SARAH-3** (`EO:EUM:DAT:0863`) | SEVIRI/Meteosat (geostationary) | **native 0.05°** (±65°) | `data/kt-ro-01.png` — Romania, 43.475–48.575°N / 19.975–30.075°E (103×203×12) |

`resolveKt()` prefers the SARAH tile when the point is inside its bbox, otherwise bilinear-upsamples
the CLARA base. SARAH is the hi-res layer because a geostationary platform samples a fixed disc
~48×/day vs AVHRR's ~2 overpasses, so it resolves sub-10 km valley microclimate that any coarse
product (1°, ERA5, or 0.25° AVHRR) smears — e.g. PVGIS-ERA5 at Brașov reads +11.5% vs SARAH-3.

The tile is the **native 0.05° SARAH grid cropped, not block-averaged to 0.1°**. Averaging four
native cells into one 0.1° cell over a deep mountain valley (Brașov, 710 m) mixes the valley with the
brighter/snowier Carpathian terrain around it, which read ~3–6% high vs PVGIS in winter and spring
(snow on the surrounding peaks) — a flat-vs-mountain split confirmed it: flat cities matched PVGIS to
±1% while only mountain valleys ran high. Cropping to PVGIS's own 0.05° resolution isolates the valley
cell (Brașov annual +3.3% → +2.1%, April +6% → +3%). This is the same reason PVGIS, which point-samples
the 0.05° grid, sat lower than our block-averaged tile.

**Normalisation (identical for both layers):** `Kt_cs = SIS / Hofierka(T_L)`, where SIS is the CM SAF
all-sky surface-incoming-shortwave (the measured monthly-mean GHI). The yield engine then reconstructs
`clearSkyHofierka × Kt_cs = SIS` exactly. Because the *same* Hofierka(T_L) appears in the denominator
here and as the multiplier in the engine, the **Linke turbidity cancels for horizontal GHI** (§4B.2) —
the base and tile share one clear-sky reference, so there is no seam where they meet and the table
resolution is irrelevant to GHI accuracy. SISC (SARAH) / SISCLS (CLARA), the satellites' clear-sky
products, are used *only* to calibrate T_L (§4B.2), never as the Kt denominator.

**Climatology.** The CLARA global base uses an 18-year 2003–2020 monthly mean; the SARAH Romania tile
uses **2005–2023, period-matched to PVGIS-SARAH3** so the home-region tile is directly comparable to
PVGIS (the de-facto reference in Romania). Matching the multi-year window matters — a 2018–2020-only
window (an unusually sunny spell) biased the cloudy north +5–8%, which a full climatology removes; and
period accounts for ~1–3 pp of the residual winter gap vs PVGIS at any single site. The two layers'
~3-year period offset produces a ≲1% discontinuity only at the tile border (unpopulated; cosmetic).

**Polar-winter handling.** Where the sun barely clears the horizon, SIS and clear-sky both → 0 and
`Kt = SIS/clearsky` is undefined (tiny/tiny noise, non-physical Kt > 1; AVHRR often returns no
retrieval at all in polar night). Kt is therefore computed only for *reliable* months
(clear-sky ≥ 25 W/m²), clamped to ≤ 1.10, and the dark months are filled by carrying the last real
winter value poleward and fading it to a floor over ~12° of latitude. This is continuous at the
boundary (no banding seam — an earlier summer-mean fill created a visible step) and cosmetic, since
those months carry ≈ 0 energy. Applied identically in both hemispheres of the global base.

**Storage:** 8-bit grayscale PNG, `pixel = round(Kt_cs × 100)`, months laid out side-by-side per row
(Sub filter + zopfli), decoded by `js/kt-png.js`. Geometry lives in `js/config.js`
(`KT_NLATS/NLONS/STEP/LAT_MIN/LON_MIN` for the base, `KT_TILES[]` for the tile).

**Lookup:** bilinear interpolation across the 4 surrounding nodes of whichever layer applies
(`_ktSample()` in `js/kt-grid.js` is fully generic over origin/step). The 5°×5° NASA POWER `kt5.bin`
remains a last-resort fallback; the old 1° `kt1.png` is retained only as a build-time fill for any
cell a satellite layer leaves unset.

**Validation vs PVGIS** (annual horizontal H(h) against period-matched PVGIS-SARAH3): flat Romanian
cities on the 0.05° SARAH tile agree to **±1%** (București +0.6%, Timișoara +0.4%, Cluj +0.7%); the
deepest mountain valley (Brașov) sits at **+2.1%** after the native-resolution fix (was +3.3% at 0.1°),
the rest a small period/processing residual concentrated in January. The CLARA global base validates to
**~2%** worldwide (mean |Δ| 1.9% — the inherent AVHRR-vs-geostationary gap, which is why SARAH is the
hi-res layer).

**Pipeline:** `eumdac download` (SISmm / SISCLS) → `scripts/sarah3-to-sis-native.py <box> 2005 2023`
(Romania tile: crops the native 0.05° grid, year-filtered, no block-reduce) / `scripts/clara-to-sis-grid.py`
(global base) → `scripts/build-kt-europe-sarah.js <inbase> <out.png>` (reads STEP from the climatology
metadata) / `scripts/build-kt-global-clara.js` (SIS → Kt PNG with the polar fade). The older
`scripts/sarah3-to-sis-grid.py` block-averages to 0.1° (kept for a coarse Europe tile). CM SAF NetCDF-4
files are read with **`h5py`** (NetCDF-4 is HDF5 underneath), sidestepping the lack of `netCDF4` wheels
on Python 3.14.

### 5.2 Latitude-band fallback table (when grid stub is active)

If the satellite grid has not been generated (`KT_POPULATED = false`), `resolveKt()` falls back to `getKt(lat, mo)` — a coarse 8-band × 12-month climatological table with **no longitude dependence**:

| Lat \ Month | Jan  | Feb  | Mar  | Apr  | May  | Jun  | Jul  | Aug  | Sep  | Oct  | Nov  | Dec  |
|-------------|------|------|------|------|------|------|------|------|------|------|------|------|
| 0°          | 0.60 | 0.58 | 0.56 | 0.54 | 0.54 | 0.54 | 0.54 | 0.55 | 0.57 | 0.59 | 0.60 | 0.61 |
| 10°         | 0.57 | 0.56 | 0.55 | 0.54 | 0.54 | 0.55 | 0.55 | 0.56 | 0.57 | 0.57 | 0.57 | 0.57 |
| 20°         | 0.54 | 0.54 | 0.54 | 0.54 | 0.55 | 0.56 | 0.56 | 0.56 | 0.56 | 0.55 | 0.54 | 0.53 |
| 30°         | 0.50 | 0.51 | 0.53 | 0.54 | 0.56 | 0.57 | 0.57 | 0.56 | 0.54 | 0.52 | 0.49 | 0.48 |
| 40°         | 0.43 | 0.46 | 0.49 | 0.52 | 0.55 | 0.57 | 0.57 | 0.55 | 0.51 | 0.46 | 0.42 | 0.40 |
| 50°         | 0.32 | 0.38 | 0.43 | 0.48 | 0.53 | 0.56 | 0.56 | 0.52 | 0.46 | 0.38 | 0.31 | 0.28 |
| 60°         | 0.18 | 0.26 | 0.35 | 0.44 | 0.51 | 0.55 | 0.54 | 0.48 | 0.38 | 0.27 | 0.17 | 0.12 |
| 70°         | 0.05 | 0.12 | 0.26 | 0.40 | 0.51 | 0.56 | 0.54 | 0.44 | 0.28 | 0.13 | 0.04 | 0.00 |

Linear interpolation between latitude bands applied for intermediate latitudes.

**Source**: Liu B.Y.H., Jordan R.C., *The interrelationship and characteristic distribution of direct, diffuse and total solar radiation*, Solar Energy, 4(3), 1960.

---

## 6. Irradiance Transposition to Tilted Plane

Two transposition models are available, selectable in the Yield tab. Both share the same angle-of-incidence and ground-reflection formulas. Perez (1990) is the default and the method used by PVGIS.

For a panel tilted at angle *β* from horizontal, with surface azimuth *γ_p* (Nav convention):

### 6.1 Angle of incidence (both models)

```
cos(AOI) = sin(h_s)·cos(β) + cos(h_s)·sin(β)·cos(γ_s − γ_p)
```

### 6.2 Beam component on tilted surface (both models)

```
I_b = DNI · max(0, cos(AOI))
```

### 6.3 Ground-reflected component (both models)

```
I_r = GHI · ρ_g · (1 − cos β) / 2
```

where ρ_g = ground albedo (default 0.20 for grass/typical urban).

---

### Model A — Hay-Davies (1980)

**Anisotropy index:**
```
A_i = DNI / G_0(n)     [G_0(n) = extraterrestrial irradiance for day n, not fixed Jan 1]
```

**Diffuse component:**
```
I_d = DHI · [(1 − A_i) · (1 + cos β) / 2   +   A_i · max(0, cos AOI) / max(cos 89°, cos Z)]
```

The first term is the isotropic sky-dome; the second is the circumsolar term. The cos 89° = 0.01745 floor on cos Z prevents division by near-zero at low sun angles (matches pvlib).

**Source**: Hay J.E., Davies J.A., *Calculations of the solar radiation incident on an inclined surface*, Proc. First Canadian Solar Radiation Data Workshop, 1980.

---

### Model B — Perez (1990) — **default**

Adds a horizon-brightening term absent from Hay-Davies, improving diffuse accuracy by 3–8% in overcast and diffuse-rich conditions.

**Sky clearness (ε):**
```
κ = 1.041
ε = [(DHI + DNI) / DHI + κ·z³] / (1 + κ·z³)
```
where *z* = solar zenith angle in radians. For DHI < 1 W/m² use ε = 1 (overcast) or 999 (clear, DNI > 0).

**Epsilon bin** (1–8, from ε < 1.065 to ε > 6.200):

| Bin | ε range | sky condition |
|-----|---------|---------------|
| 1 | < 1.065 | overcast |
| 2–4 | 1.065–1.950 | partly cloudy |
| 5–7 | 1.950–6.200 | mostly clear |
| 8 | > 6.200 | clear |

**F coefficients** (Perez 1990 allsitescomposite table, 8 rows × 6 cols):

| Bin | f₁₁ | f₁₂ | f₁₃ | f₂₁ | f₂₂ | f₂₃ |
|-----|------|------|------|------|------|------|
| 1 | −0.0083 | 0.5877 | −0.0621 | −0.0597 | 0.0721 | −0.0220 |
| 2 | 0.1299 | 0.6826 | −0.1514 | −0.0189 | 0.0645 | −0.0270 |
| 3 | 0.3297 | 0.4869 | −0.2211 | 0.0554 | −0.0640 | −0.0290 |
| 4 | 0.5682 | 0.1875 | −0.2951 | 0.1089 | −0.1519 | −0.0140 |
| 5 | 0.8730 | −0.3920 | −0.3616 | 0.2260 | −0.4620 | 0.0010 |
| 6 | 1.1326 | −1.2367 | −0.4118 | 0.2880 | −0.8230 | 0.0560 |
| 7 | 1.0601 | −1.6095 | −0.3590 | 0.2640 | −1.1270 | 0.1310 |
| 8 | 0.6777 | −0.3272 | −0.2504 | 0.1560 | −1.3765 | 0.2510 |

**Sky brightness (Δ):**
```
m = 1 / max(cos 85°, cos Z)     [relative air mass, cos 85° = 0.08716 floor]
Δ = DHI · m / G_0(n)
```

**Circumsolar (F₁) and horizon-brightness (F₂) factors:**
```
F₁ = max(0, f₁₁ + f₁₂·Δ + f₁₃·z)
F₂ = f₂₁ + f₂₂·Δ + f₂₃·z
```

**Diffuse on tilted surface:**
```
a = max(0, cos AOI)
b = max(cos 85°, cos Z)

I_d = DHI · [(1 − F₁) · (1 + cos β) / 2   +   F₁ · a/b   +   F₂ · sin β]
```

The three terms are: isotropic sky dome, circumsolar, and horizon brightening respectively.

**Total in-plane irradiance (both models):**
```
G_t = I_b + max(0, I_d) + I_r   [W/m²]
```

**Source**: Perez R. et al., *Modeling Daylight Availability and Irradiance Components from Direct and Global Irradiance*, Solar Energy 44(5):271–289, 1990.

### 6.4 Incidence-angle modifier (Martin & Ruiz 1999) and effective irradiance

Fresnel reflection at oblique incidence reduces the irradiance actually absorbed by the
module. The Martin-Ruiz model (the one PVGIS uses, air-glass coefficient a_r = 0.17):

```
IAM_b(AOI) = (1 − exp(−cos AOI / a_r)) / (1 − exp(−1 / a_r))          beam, per hour
```

The diffuse and ground-reflected components use fixed effective incidence angles that
depend only on the tilt β (Martin & Ruiz polynomial fits, deg):

```
θ_eff,d = 59.7 − 0.1388·β + 0.001497·β²       sky diffuse
θ_eff,g = 90  − 0.5788·β + 0.002693·β²        ground-reflected
IAM_d = IAM_b(θ_eff,d) ,  IAM_g = IAM_b(θ_eff,g)
```

**Semantics (PVGIS convention)** — every transposition function returns the *plain*
in-plane irradiance `G_t` (comparable to PVGIS H(i), which excludes reflectivity), and
separately provides the **effective irradiance** that feeds the power model:

```
G_eff = I_b·IAM_b + I_d·IAM_d + I_r·IAM_g     [W/m²]
```

The annual G_eff/G_t ratio is the PVGIS "Angle of incidence" loss line (typically
−2…−3% at 35° tilt). Implementation: `iamMartinRuiz/iamDiffuseFactor/iamGroundFactor`
(solar-geometry.js); the split is returned via the transpose functions' `out` parameter
(yield-engine.js).

**Source**: Martin N., Ruiz J.M., *Calculation of the PV modules angular losses under
field conditions by means of an analytical model*, Progress in Photovoltaics 7(4), 1999.

---

## 7. PV Energy Yield

### 7.1 Hourly irradiation on tilted plane

```
H_t(hour) = G_t · 1h / 1000   [kWh/m²]
```

### 7.2 PV power model (per hour)

Two selectable conversion models turn the **effective irradiance** G_eff (§6.4) into
relative DC power. Both need a cell temperature first:

```
NOCT:    T_cell = T₂ₘ + (NOCT − 20) / 800 · G_eff                      IEC 61215
Faiman:  T_cell = T₂ₘ + G_eff / (U_c + U_v · wind)                     PVGIS: U_c=26.9, U_v=6.2
```

*T₂ₘ* is the NASA POWER climatological monthly mean air temperature (2 m, day+night
average — see the caveat in §13); wind from the WS2M grid (wind-grid.js, 1.0 m/s fallback). The
Faiman U_c / U_v are the single-source constants `FAIMAN_U0 = 26.9` / `FAIMAN_U1 = 6.2` (config.js,
verbatim from `assets/pvgis/`); the formula itself lives once in `js/formulas.js` (`FORMULAS.tcell_faiman`).

**Monthly-climatology cell-temperature correction.** This engine is a *monthly* climatology, but
PVGIS is an *hourly* simulation. PV energy is produced overwhelmingly on the sunny, near-clear-sky
hours when the cell runs hot — so feeding the cell-temp formula the **Kt-smeared** G_eff (= clear-sky ×
monthly-mean Kt) and the **24h-mean** T₂ₘ under-derates, and uncorrected the engine reads ~+5% over
PVGIS energy. Two corrections (both NOCT & Faiman, `yield-engine.js`):
1. **G_eff for the cell temp is the CLEAR-SKY POA** (`TEMP_KT_BLEND = 1`), not the Kt-smeared value —
   the production-hour irradiance. The power *magnitude* still uses the Kt-scaled G_eff (energy conserved).
2. **Diurnal-warm air offset** `T₂ₘ → T₂ₘ + K·(G_cs/1000)`, K = `DIURNAL_WARM_K` °C at full sun, so the
   warmth lands on production hours and vanishes at night. K exceeds literal diurnal air warmth (~+8 °C)
   because it also absorbs the residual monthly-vs-hourly under-derating (low-light droop + cloudy-hour
   spread a monthly model can't resolve). Calibrated PER cell-temp model against PVGIS PVcalc over the
   `testViz.html` 43-point global set (NOCT runs hotter, needs less): **`{noct: 10, faiman: 16}`** →
   Faiman mean signed −0.06 %; NOCT (default) −0.16 % / |Δ| 1.8 %, 28/43 within ±2 % (was +5 % optimistic).
   (String *voltage* sizing in `strings.html` is independent — it uses the NMOT extreme-temp method, §10.1.)

**(a) Huld/PVGIS efficiency surface — default** (`powModel:'huld'`). The model PVGIS
itself evaluates (King-form, fitted by Huld et al. 2010), with G′ = G_eff/1000 and
T′ = T_cell − 25:

```
η_rel(G′,T′) = [k₀ + k₁·lnG′ + k₂·ln²G′ + T′·(k₃ + k₄·lnG′ + k₅·ln²G′) + k₆·T′²] / k₀
P = G_eff/1000 · η_rel
```

Free-standing c-Si coefficient sets, copied verbatim from the PVGIS Python source
(`api/power/efficiency_coefficients.py`):

| set | k₀ | k₁ | k₂ | k₃ | k₄ | k₅ | k₆ |
|---|---|---|---|---|---|---|---|
| c-Si 2025 (PVGIS default) | 1.0 | −0.006756 | −0.016444 | −0.003015 | −0.000045 | −0.000043 | 0 |
| c-Si original (Huld 2010) | 1.000436 | −0.012678 | −0.017522 | −0.003154 | −0.000315 | −0.000164 | 0 |

The lnG′ terms capture the **low-irradiance efficiency droop** (mornings/evenings/
overcast); the T′ cross-terms make the effective temperature coefficient irradiance-
dependent. η_rel is clamped ≥ 0; G′ ≤ 0 returns 0. With temperature derating disabled
the surface is evaluated at T′ = 0 (low-irradiance part only).

**(b) Datasheet γ — legacy linear** (`powModel:'gamma'`):

```
derate = max(0, 1 + γ · (T_cell − 25)) ,   P = G_eff/1000 · derate
```

with the module's own P_mpp coefficient γ (per-module from MODULE_LIST, %/°C → /°C).
Simple and module-specific, but no low-irradiance behaviour.

**Source**: Huld T., Gottschalg R., Beyer H.G., Topič M., *Mapping the performance of PV
modules, effects of module type and data averaging*, Solar Energy 84(2):324–338, 2010;
PVGIS Python source `api/power/efficiency.py`.

### 7.3 Monthly irradiation and energy

```
H_m     = Σ_days Σ_hours G_t / 1000        [kWh/m²]   (plain in-plane — PVGIS H(i) semantics, no IAM)
E_month = Σ_days Σ_hours P · P_peak · PR_eff   [kWh/month]   (P from §7.2, fed by G_eff)
```

Sampling: every 2 days (scaled to full month count) × every hour (midpoint of hour).

**Performance ratio:**
```
PR_eff = 1 − losses/100
```

*losses* (%) is the system loss input — a single catch-all factor for wiring, inverter efficiency, soiling, mismatch, and degradation. This matches the PVGIS "System losses" convention. Temperature effects are applied separately per hour via the derate factor above.

Typical values: 10% (excellent free-standing), 14% (PVGIS default), 20% (degraded/poorly-ventilated).

### 7.4 Annual yield and specific yield

```
E_year = Σ_months E_month   [kWh/year]

Y_f = E_year / P_peak   [kWh/kWp/year]   (final yield, specific yield)
```

---

## 8. Horizon Shading

For each hourly calculation step, if the solar azimuth *γ_s* falls within an obstacle's azimuth range and the solar elevation *h_s* is below the obstacle elevation angle *h_obs*, the irradiance is set to zero:

```
if h_s < h_obs(γ_s):  G_t = 0
```

The obstacle elevation profile is stored as a 36-point array at 10° azimuth intervals (Nav convention), taking the maximum obstacle elevation for each sector.

---

## 9. Tilt Optimisation

The optimal tilt and azimuth are found by exhaustive grid search:

```
for β in {0°, 5°, 10°, …, 70°}:
  for γ_PVGIS in {−45°, −30°, −15°, 0°, 15°, 30°, 45°}:
    E = calcYield(β, γ_PVGIS)
    if E > E_best: record β_opt, γ_opt
```

Resolution: 5° tilt, 15° azimuth. Fine-grained search not needed given ±10–15% accuracy of the underlying model.

For the Northern Hemisphere, expected result: β_opt ≈ 0.87·|φ| + 3° (Heywood empirical, 1971), γ_opt ≈ 0° (due South).

---

## 10. String Sizing (Neamț §11)

### 10.1 Cell temperature at extreme conditions

```
T_min = T_a,min + (N_MOT − 20) · G_min / 800   [°C]  (eq. 4)
T_max = T_a,max + (N_MOT − 20) · G_max / 800   [°C]  (eq. 7)
```

where N_MOT = Nominal Operating cell Temperature (°C), G in W/m².

### 10.2 Temperature-corrected module voltages

```
V_OC,max = V_OC,STC · [1 + λ_V/100 · (T_min − 25)]   (eq. 3)
V_mp,min = V_mp,STC · [1 + λ_V/100 · (T_max − 25)]   (eq. 6)
```

λ_V is the voltage temperature coefficient (%/°C), typically −0.30 to −0.38 %/°C for crystalline Si.

### 10.3 Series string count limits

```
N_s,max = floor(V_max,inv / V_OC,max)     — inverter absolute voltage limit
N_s,min = ceil(V_min,MPPT / V_mp,min)    — minimum for MPPT window entry
N_opt   = floor(V_r,MPPT / V_mp,STC)    — closest to inverter's rated MPPT voltage
```

### 10.4 Parallel string count limits

Two independent checks apply; the binding constraint is the minimum of both:

**Fault / short-circuit protection:**
```
N_p,sc = floor(I_sc,MPPT / I_SC,STC)
```
The inverter must tolerate the combined short-circuit current of all parallel strings.

**Steady-state operating current:**
```
N_p,op = floor(I_max,MPPT / I_mp,STC)
```
The combined MPP current must not exceed the inverter's continuous MPPT current rating.

**Effective limit:**
```
N_p,max = min(N_p,sc, N_p,op)
```

Note: I_sc,MPPT and I_max,MPPT are separate inverter specifications. I_sc,MPPT is typically a peak/fault tolerance; I_max,MPPT is the continuous operating limit. Using I_SC,STC against I_max,MPPT (a common mistake) produces an over-conservative and incorrect result.

**Source**: Neamț L., *Proiectarea unui sistem fotovoltaic on-grid*, UTC Cluj-Napoca, §11.

---

## 11. I-V Curve Diagnostics — Defectoscopy (Step 17)

Field diagnosis of a PV module: a measured I-V curve, taken at arbitrary irradiance G and
cell temperature T_c, is compared against the module's factory characteristic to detect and
classify defects. Implemented in `defectoscopy.html`; every numerical constant used by the
implementation is listed in §11.7 for audit.

The pipeline has three stages:

```
(1) Factory reference   datasheet (I_sc, V_OC, I_mp, V_mp)  →  single-diode model  →  reference I-V curve at STC
(2) Translation         measured points (I, V) @ (G, T_c)   →  IEC 60891 proc. 1   →  measured curve at STC
(3) Comparison          curve overlay + scalar metrics       →  rule-based fault classification
```

**Standards basis**: IEC 60891 (procedures for temperature and irradiance corrections to
measured I-V characteristics), IEC 61829 (on-site measurement of PV array I-V
characteristics), IEC 60904-1 (measurement of photovoltaic current-voltage characteristics).
The fault-signature catalogue follows IEA-PVPS Task 13 failure-analysis reports.

### 11.1 Measurement inputs and requirements

| Input | Requirement | Notes |
|---|---|---|
| (I, V, G, T) rows | ≥ 5 valid points, I ≥ 0, V ≥ 0 | **G and T are recorded per point** — readings are taken one at a time with a variable load and conditions drift between them; recommended ≥ 12 points, covering both knees (near I = 0 and near V = 0); sorted by V internally |
| G_k | in-plane irradiance at the moment of point k, W/m² | measured with a reference cell co-planar with the module (IEC 60904-2 device); blank → 1000 |
| T_k | cell temperature at the moment of point k, °C | back-of-module sensor; the back-sheet reads 1–3 K below the true junction temperature; blank → 25 |
| module | from MODULE_LIST | supplies I_sc, V_OC, I_mp, V_mp, λ_I, λ_V (the factory reference and the correction coefficients) |

The STC correction degrades away from the reference condition; the tool follows the common
field guideline of **G > 400 W/m²** (the UI carries this warning). Drift *between* points
is handled by the per-point translation (§11.3); I, V, G, T *within* one row must be
simultaneous. If the measured sweep does not reach I = 0 or V = 0, the endpoints are
linearly extrapolated from the first / last segment (§11.4) — extrapolation error grows
with the distance to the axis, hence the both-knees recommendation.

### 11.2 Factory reference — the single-diode model

The reference characteristic is the five-parameter single-diode model:

```
I = I_ph − I_0 · [exp((V + I·R_s)/a) − 1] − (V + I·R_s)/R_sh        (11.1)
```

where `a = n·N_s·V_t` is the **modified ideality factor** in volts (n = diode ideality,
N_s = cells in series, V_t = kT/q ≈ 25.7 mV at 25 °C). Working with `a` directly avoids
needing the cell count, which datasheets in MODULE_LIST do not carry.

The five parameters (I_ph, I_0, a, R_s, R_sh) are extracted from the four datasheet values
(I_sc, V_OC, I_mp, V_mp) as follows.

#### 11.2.1 Closed-form estimate of a

Neglecting R_s and R_sh, the model reduces to `I = I_sc − I_0·exp(V/a)` and the three
datasheet conditions give:

```
at V_OC :  0    = I_sc − I_0·exp(V_OC/a)      →  I_0 = I_sc · exp(−V_OC/a)         (11.2)
at MPP  :  I_mp = I_sc − I_0·exp(V_mp/a)      →  exp((V_mp−V_OC)/a) = (I_sc−I_mp)/I_sc   (11.3)
dP/dV=0 :  I_mp = V_mp · (I_0/a)·exp(V_mp/a)  →  V_mp/a = I_mp/(I_sc−I_mp)          (11.4)
```

Taking logs of (11.3) and adding (11.4):

```
(V_mp − V_OC)/a + V_mp/a = ln((I_sc−I_mp)/I_sc) + I_mp/(I_sc−I_mp)

a = (2·V_mp − V_OC) / [ ln((I_sc−I_mp)/I_sc) + I_mp/(I_sc−I_mp) ]        (11.5)
```

This is the explicit datasheet estimate of Sera et al. (2007). Sanity check (JinkoSolar
JKM455N-48HL4M-DV, 48 series cell-pairs): a = 1.661 V → n = a/(48 × 0.0257) ≈ 1.35 —
physically plausible for n-type TOPCon.

#### 11.2.2 Feasibility cap on a

Equation (11.5) can overestimate a for datasheets with a large I_sc − I_mp together with a
large V_OC − V_mp gap. The diode current at V_mp under the V_OC-anchored I_0 is

```
I_d(V_mp) = I_sc · exp(−(V_OC − V_mp)/a)
```

and the model can only pass through (I_mp, V_mp) if I_d(V_mp) ≤ I_sc − I_mp, i.e.

```
a < (V_OC − V_mp) / ln( I_sc / (I_sc − I_mp) )        (11.6)
```

When (11.5) violates (11.6), the R_s sweep of §11.2.4 has no feasible starting point and
the fit fails. This occurred for 2 of the 116 datasheets in MODULE_LIST (LONGi
LR5-54HTH-415M: a₍₁₁.₅₎ = 2.651 V vs bound 2.425 V; Aiko Neostar 2S 450W: 2.918 V vs
2.495 V). The implementation therefore caps:

```
a = min( a₍₁₁.₅₎ , 0.98 · (V_OC − V_mp)/ln(I_sc/(I_sc − I_mp)) )
```

The 0.98 margin keeps the first sweep iteration strictly feasible. With the cap, all 116
modules fit (§11.8).

#### 11.2.3 I_0 and I_ph

```
I_0  = I_sc · exp(−V_OC/a)                 (from 11.2; the V_OC/R_sh term is neglected —
                                            it is O(0.1 A) against I_sc·exp(V_OC/a) scaling)
I_ph = I_sc · (R_sh + R_s)/R_sh            (exact short-circuit condition of (11.1)
                                            with the small exp(I_sc·R_s/a) term absorbed)
```

#### 11.2.4 R_s–R_sh co-determination (Villalva sweep)

Following Villalva et al. (2009): for a trial R_s, force the curve through the datasheet
MPP by solving (11.1) at (I_mp, V_mp) for R_sh:

```
R_sh(R_s) = V_mp·(V_mp + I_mp·R_s) /
            [ V_mp·I_sc − V_mp·I_0·(exp((V_mp + I_mp·R_s)/a) − 1) − P_exp ]      (11.7)

P_exp = V_mp · I_mp
```

R_s is swept upward from 0 in steps of 0.005 Ω (cap 1.5 Ω). Increasing R_s lowers the
model's maximum power; the sweep stops at the first R_s whose modelled P_max ≤ P_exp
(or when (11.7) turns negative/undefined). The pair (R_s, R_sh) at the stop is the fit.
Because (11.7) pins the curve to the MPP exactly, the residual error appears only in
P_max — measured at ≤ 0.18 % across the whole database (§11.8).

#### 11.2.5 Numerical solution of the implicit curve

(11.1) is implicit in I. For each V the implementation runs Newton-Raphson:

```
f(I)  = I_ph − I_0·(e − 1) − (V + I·R_s)/R_sh − I ,   e = exp((V + I·R_s)/a)
f'(I) = −I_0·e·R_s/a − R_s/R_sh − 1
```

started at I = I_ph, ≤ 30 iterations, tolerance 1×10⁻⁷ A (typ. 4–6 iterations; f' < 0
everywhere so convergence is monotone). The reference curve is sampled at 80 points over
[0, 1.02·V_OC]; the sweep's inner P_max search uses 60 points. Negative currents are
clipped to 0 for display.

### 11.3 Translation of the measured points to STC — point-wise IEC 60891 procedure 1

IEC 60891 procedure 1 corrects a characteristic *measured at one condition* (G, T):

```
I₂ = I₁ + I_sc · (G*/G − 1) + α_abs · (T* − T)                       (11.8)
V₂ = V₁ + β_abs · (T* − T) − R_s · (I₂ − I₁) − κ · I₂ · (T* − T)     (11.9)
```

That single-(G, T) form fits an electronic curve tracer, whose sweep finishes in
milliseconds. The tool's measurement scenario is different: the points are taken **one at
a time** with a variable load, irradiance and cell temperature drift between readings, and
each point k is recorded together with its own conditions (G_k, T_k). Each point therefore
belongs to a *different* momentary characteristic and must be translated individually —
which raises one subtlety: the irradiance term of (11.8) uses I_sc, the module's
short-circuit current **at that point's conditions**, which itself varies per point.

**Anchoring I_sc.** The V ≈ 0 row gives the measured short-circuit current I_sc,m at its
own conditions (G₁, T₁). Applying (11.8) to that row translates it to STC:

```
I_sc,STC = I_sc,m · G*/G₁ + α_abs · (T* − T₁)                        (11.10)
```

Inverting (11.10) gives the module's short-circuit current at any other point's
conditions: I_sc,k = (I_sc,STC + α_abs·(T_k − T*)) · G_k/G*. Substituting I_sc,k into
(11.8) and simplifying (the algebra closes exactly):

```
I₂ = I₁ + I_sc,STC · (1 − G_k/G*) + α_abs · (T* − T_k) · G_k/G*      (11.11)
V₂ = V₁ + β_abs · (T* − T_k) − R_s · (I₂ − I₁)                       (11.12)
```

**Self-consistency check**: substituting the V ≈ 0 row (I₁ = I_sc,m, G_k = G₁, T_k = T₁)
into (11.11) reproduces I_sc,STC identically — no approximation is introduced beyond
procedure 1 itself. For the special case of constant conditions (G_k = G, T_k = T ∀k),
(11.11) reduces exactly to (11.8).

Implementation choices:

| Term | Value used | Rationale |
|---|---|---|
| (G_k, T_k) | entered per measured point | conditions at the moment of each reading; blank cells default to 1000 W/m² / 25 °C |
| I_sc,m, (G₁, T₁) | the lowest-V row (extrapolated to V = 0, §11.4) and its conditions | anchors (11.10) |
| α_abs | (λ_I/100) · I_sc,ds  [A/°C] | datasheets give λ_I in %/°C of I_sc |
| β_abs | (λ_V/100) · V_OC,ds  [V/°C] | datasheets give λ_V in %/°C of V_OC |
| R_s | from the factory fit (§11.2.4) | IEC 60891 obtains R_s from multi-curve measurements; a single field curve cannot, so the model value substitutes |
| κ | **0** | the curve-correction factor (Ω/°C) is a measured quantity not present on datasheets; for \|T* − T_k\| ≤ 25 K its contribution is small against the β term. This is the method's main simplification — stated, not hidden. |

After translation the points are re-sorted by V and clipped at 0. IEC 60891 itself
recommends corrections within moderate G/T distance of the target; combined with the
reference-cell guidance this is the origin of the G > 400 W/m² UI warning. What per-point
conditions do **not** remove is the simultaneity requirement *within* one reading: I, V,
G and T of a single row must be captured at the same moment.

### 11.4 Derived metrics

With the corrected point set P = {(i_k, v_k)} sorted by v:

```
I_sc,m : I at V = 0 — first point if v₁ ≤ 1 mV, else linear extrapolation
         of the first segment:  i₁ − (i₂−i₁)/(v₂−v₁) · v₁
         (the same extrapolation on the RAW set anchors I_sc,m for eq. 11.10;
          when it spans two points the two readings' conditions are mixed —
          negligible on the flat region, and exact when a true V = 0 row exists)
V_OC,m : V at I = 0 — last point if i_N ≤ 1 mA, else linear extrapolation
         of the last segment:   v_N + i_N·(v_N−v_{N−1})/(i_{N−1}−i_N)
P_max,m: max(I·V) over the piecewise-linear curve, each segment subdivided
         ×10 (interpolation error O(h²) in the segment length)
FF_m   = P_max,m / (I_sc,m · V_OC,m)
deficit = 1 − P_max,m / P_max,f          (P_max,f from the §11.2 model)
```

**Slope estimates.** Least-squares dI/dV over voltage windows:

```
R_s,est  = −1 / slope(points with v > 0.85·V_OC,m)
R_sh,est = −1 / slope(points with v < 0.20·V_OC,m)     (displayed "> 10³" when the
                                                        window is flat, slope > −10⁻⁴)
```

**Caveat (deliberate)**: near V_OC the single-diode slope is dV/dI ≈ −(R_s + a/I_d), so
R_s,est systematically *includes* the diode term a/I_d (≈ 0.10 Ω for a 1.7 V / 16 A
module) and overestimates the ohmic R_s even on a healthy module. This is why the R_s
diagnostic rule (§11.5) requires a corroborating fill-factor loss before firing — the
slope alone would false-positive. Near I_sc the diode term is negligible, so R_sh,est is a
clean estimator.

**Step (notch) detection.** Bypass-diode conduction produces a locally steep segment
followed by a much flatter one. Over segments with midpoint in (0.15, 0.80)·V_OC,m
(≥ 4 segments required):

```
notch ⇔ ∃k :  |s_k| > max( 4·median|s| ,  0.08·I_sc,m / (0.05·V_OC,m) )
              and |s_{k+1}| < 0.5·|s_k|
```

i.e. a segment at least 4× steeper than the local median (with an absolute floor of an
8 % current drop over a 5 % voltage span) that then recovers. Sparse point sets can miss a
notch (false negative); a single noisy point between two good ones can trigger one (false
positive) — another reason for the ≥ 12-point recommendation.

### 11.5 Diagnostic rules

Rules are evaluated in order; all that fire are reported (a module can be both soiled and
have a resistive connector). Thresholds are on the **corrected** curve.

| # | Condition (exact) | Signature | Interpretation | Action |
|---|---|---|---|---|
| 1 | notch detected (§11.4) | step in the curve | partial shading or cracked cells — a substring's bypass diode conducts | visual inspection + IR thermography |
| 2 | V_OC,m / V_OC,ds < 0.85 | V_OC collapsed (≈ 1/3 or 2/3 missing) | shorted bypass diode / dead substring; severe drop → PID | junction-box check |
| 3 | no notch ∧ V_OC ok ∧ I_sc,m/I_sc,ds < 0.92 | I_sc down, shape preserved | uniform soiling, delamination/browning, uniform degradation | clean and re-measure |
| 4 | R_s,est > 2.5·R_s,f  ∧  FF_m < 0.95·FF_f | flatter slope at V_OC **and** FF loss | series resistance: corroded interconnects, solder fatigue, connectors | check connections |
| 5 | R_sh,est < min(0.3·R_sh,f, 100 Ω) | steeper slope at I_sc | shunts, hot-spot cells, micro-crack leakage | IR thermography |
| 6 | none of 1–5 ∧ deficit ≤ 5 % | — | within manufacturing tolerance | OK |
| 7 | none of 1–5 ∧ deficit > 5 % | scaled-down curve | uniform ageing — compare against the degradation warranty (≈ 0.4 %/yr) | trend monitoring |

Threshold rationale: the 5 % OK band is the sum of the datasheet power tolerance
(typically 0/+5 W ≈ 1 %) and realistic field measurement uncertainty (§11.6); 0.92 on
I_sc and 0.85 on V_OC sit ≈ 2× the respective measurement uncertainties away from 1.0;
2.5× on R_s,est accounts for the intrinsic a/I_d bias (§11.4); rule 4's FF guard makes a
healthy curve (whose R_s,est ≈ R_s,f + a/I_sc > 2.5·R_s,f for low-R_s modules) unable to
false-positive, because its FF matches the factory FF by construction.

### 11.6 Uncertainty and limitations

| Source | Magnitude | Effect |
|---|---|---|
| field I-V tracer | ±1–5 % on I, V | scales all metrics |
| reference cell (G) | ±2–3 % | enters I₂ linearly via G*/G |
| back-sheet vs junction T_c | 1–3 K low | V₂ biased via β_abs (≈ −0.09 V/K module-level) |
| κ = 0 simplification | grows with \|25 − T_k\| | V₂ bias, second order vs β term |
| within-row simultaneity | per measurement practice | I, V, G, T of one row must be read at the same moment; drift *between* rows is handled by the per-point translation (§11.3) |
| datasheet power tolerance | 0/+5 W typical | reference itself uncertain ≈ 1 % |
| endpoint extrapolation | grows with missing knee coverage | I_sc,m / V_OC,m, hence FF |

Combined, a **deficit below ≈ 5 % is not diagnosable** in the field — hence rule 6. The
method also assumes a *uniform* module (the single-diode model cannot represent a notched
curve; stage-3 rules handle those shapes heuristically instead), and the factory fit
inherits any datasheet inaccuracy. λ_I/λ_V are treated as constants although they vary
slightly with G and T.

### 11.7 Numerical constants (audit table)

| Constant | Value | Where | Rationale |
|---|---|---|---|
| min valid points | 5 | input gate | below this the metrics are meaningless |
| a feasibility margin | 0.98 | §11.2.2 cap | keeps sweep start strictly feasible |
| R_s sweep | 0 → 1.5 Ω, step 0.005 Ω | §11.2.4 | covers all 116 DB modules; fit R_s ≤ 0.095 Ω observed |
| Newton | ≤ 30 iter, tol 10⁻⁷ A, start I_ph | §11.2.5 | monotone convergence, typ. 4–6 iter |
| curve sampling | 80 pts display / 60 pts sweep, to 1.02·V_OC | §11.2.5 | sweep cost × 300 iterations |
| MPP subdivision | 10 per segment | §11.4 | piecewise-linear P_max |
| R_s window | v > 0.85·V_OC,m | §11.4 | diode-dominated knee region |
| R_sh window | v < 0.20·V_OC,m | §11.4 | flat region, diode negligible |
| R_sh flat cut | slope > −10⁻⁴ A/V → "> 10³ Ω" | §11.4 | below measurement resolution |
| notch | 4×median, floor 0.08·I_sc/(0.05·V_OC), recovery 0.5×, window (0.15, 0.80)·V_OC, ≥ 4 segments | §11.4 | see text |
| verdict thresholds | 0.92 (I_sc), 0.85 (V_OC), 2.5× + 0.95·FF (R_s), min(0.3·R_sh,f, 100 Ω), 5 % (OK band) | §11.5 | see rationale ¶ |
| blank G_k / T_k defaults | 1000 W/m² / 25 °C | §11.3 input parsing | identity translation for that point |
| new-row G/T prefill | inherited from the previous row | UI | conditions drift slowly between consecutive readings |
| STC correction guidance | G > 400 W/m² | UI note | IEC 60891 validity practice |

### 11.8 Validation

**Factory-model reproduction** — the fit run against the full MODULE_LIST database
(n = 116, all brands/technologies: PERC, TOPCon, HJT, ABC, HPBC):

```
fit failures : 0   (2 before the §11.2.2 cap: LONGi LR5-54HTH-415M, Aiko Neostar 2S)
|P_max error| vs V_mp·I_mp :  median 0.014 %   ·   p95 0.045 %   ·   max 0.174 %
```

Sample (one module per brand; a values marked * were capped per §11.2.2):

| Module | V_mp·I_mp (W) | model P_max (W) | err % | a (V) | R_s (Ω) | R_sh (Ω) | FF_f |
|---|---|---|---|---|---|---|---|
| JinkoSolar Tiger Neo JKM455N-48HL4M-DV | 455.11 | 454.97 | −0.03 | 1.661 | 0.050 | 409 | 0.795 |
| JA Solar JAM54D41-430/LB | 430.09 | 430.09 | −0.00 | 1.726 | 0.095 | 1923 | 0.790 |
| LONGi Hi-MO 6 LR5-54HTH-415M | 415.25 | 415.31 | +0.01 | 2.376* | 0.005 | 1218 | 0.774 |
| Trina Vertex S+ TSM-430NEG9R.28 | 430.27 | 430.26 | −0.00 | 2.695 | 0.030 | 663 | 0.790 |
| Canadian Solar HiKu CS3W-450MS | 450.46 | 450.35 | −0.02 | 2.326 | 0.085 | 499 | 0.791 |
| Hanwha Q.CELLS Q.TRON BLK M-G2+ 415W | 414.92 | 414.85 | −0.02 | 1.596 | 0.090 | 534 | 0.799 |
| Risen Energy RSM108-9-415N | 415.63 | 415.57 | −0.02 | 2.144 | 0.005 | 287 | 0.784 |
| Aiko NEOSTAR 2S 450W All-Black | 450.23 | 450.37 | +0.03 | 2.446* | 0.005 | 1260 | 0.779 |

The fitted FF_f of 0.774–0.799 matches the published fill factors of these module classes.

**Synthetic fault test** — a 12-point sweep of the JKM455N generated at G = 800 W/m²,
T = 45 °C with two injected faults: a uniform −10 % current scaling (soiling) and a
softened knee (series resistance). After translation to STC the tool reported
P_max = 372.9 W vs 455.2 W factory (deficit 18.1 %), I_sc ratio 0.89, R_s,est = 0.45 Ω vs
0.05 Ω model, and fired exactly rules 3 (soiling) and 4 (series resistance) — both
injected faults, no false positives (no notch, V_OC and R_sh clean).

**Drifting-conditions round trip** — validates the point-wise translation (11.10)–(11.12):
10 points of the JKM455N factory STC curve were inverse-translated, each to its **own**
conditions sweeping G = 720 → 980 W/m² and T = 30 → 48 °C (every row different, emulating
a manual point-by-point measurement under moving conditions), then fed to the tool. The
translation recovered **I_sc = 15.88 A and V_OC = 36.05 V exactly** (datasheet values, to
the displayed precision) and P_max within 1.4 % — the residual being purely the
piecewise-linear P_max interpolation over 10 coarse points at the knee, not translation
error. Verdict: within tolerance (rule 6), no false fault signatures.

**Sources**: IEC 60891:2021; IEC 61829:2015; IEC 60904-1; Villalva, Gazoli, Filho (2009);
Sera, Teodorescu, Rodriguez (2007); De Soto, Klein, Beckman (2006); Phang, Chan, Phillips
(1984); IEA-PVPS T13-01:2014.

---

## 12. Wind Load on Roof-Mounted Arrays (EN 1991-1-4)

`wind.html` (Sarcini de vânt) estimates the wind action on a roof-mounted PV array. The
**peak velocity pressure** `qp(z)` is computed exactly per EN 1991-1-4 [25]; the conversion to a
**ballast requirement** (kg/m²) is a deliberately *indicative* calibrated model (§12.4), not a
per-module `cpe` structural calculation.

### 12.1 Basic velocity pressure

```
qb = ½ · ρ · vb²        [N/m²]        EN 1991-1-4 §4.5(1)
```
ρ = 1.25 kg/m³ (CEN recommended air density); vb = fundamental basic wind velocity (site, m/s).

### 12.2 Terrain, roughness and the exposure coefficient

For a terrain category with roughness length z0 and terrain factor kr = 0.19·(z0/z0,II)^0.07
(z0,II = 0.05 m), with orography co = 1 and turbulence factor kI = 1:

```
z      = max(z_struct, zmin)                    reference height, floored at zmin (§4.3.2)
cr(z)  = kr · ln(z / z0)                          roughness factor       (§4.3.1)
vm(z)  = cr(z) · co · vb                           mean wind velocity     (eq 4.3)
Iv(z)  = kI / (co · ln(z / z0)) = 1 / ln(z/z0)     turbulence intensity   (eq 4.7)
qp(z)  = (1 + 7·Iv) · ½ · ρ · vm²                  peak velocity pressure (eq 4.8)
```

Substituting the chain collapses to a single exposure coefficient ce(z) = qp/qb:

```
qp(z) = ce(z) · qb ,   ce(z) = cr²·(1 + 7·Iv) = kr²·ln(z/z0)·( ln(z/z0) + 7 )
```

| cat | z0 [m] | kr | zmin [m] |
|-----|--------|------|---------|
| 0   | 0.003  | 0.156 | 1 |
| I   | 0.01   | 0.170 | 1 |
| II  | 0.05   | 0.190 | 2 |
| III | 0.3    | 0.215 | 5 |
| IV  | 1.0    | 0.234 | 10 |

The `kr` values are the canonical `0.19·(z0/0.05)^0.07` to four decimals. The **zmin floor**
(EN Table 4.1) is essential: the logarithmic wind profile is valid only for z ≥ zmin; below it,
cr and Iv are evaluated at zmin. (A prior version floored z at `z0·2`, under-predicting qp by
12–23 % for roofs shorter than zmin — see §12.5.)

### 12.3 External pressure zones (geometry)

The roof is divided into edge zones F, G, H, I per EN 1991-1-4 Figure 7.6, with characteristic
length `e = min(b, 2h)`. The tool draws these zones to scale; their EN external pressure
coefficients (Table 7.2, flat roof, hp/h = 0: cpe,F = −1.8, cpe,G = −1.2, cpe,H = −0.7,
cpe,I = ±0.2) are shown for reference.

### 12.4 Ballast estimate (indicative, NOT a cpe calculation)

The tool does **not** apply bare-roof cpe suction to each module in isolation — that over-predicts
ballast ~6–10× because it ignores array interconnection, friction (μ ≈ 0.6) and shared self-weight
(real systems ≈ 15 kg/m², not ~170). Instead it reports a **calibrated ballast intensity** per
zone, `BAL_BASE = {F:40, G:20, H:8}` kg/m² central @ qp = 1000 Pa and 12.5° tilt, scaled by qp/1000
and a mild tilt factor (±35 % band). Engineered ballast design uses NEN 7250 (segment-friction
model) and requires structural sign-off — the page carries this disclaimer prominently. Ballast is
shown only for flat-roof mounting modes; pitched/coplanar arrays are mechanically fixed (dead-load
only).

### 12.5 Validation against EuroCodeApplied

The `qp(z)` chain was cross-validated against the EuroCodeApplied EN1991-1-4 flat-roof
calculator [26], driven with Playwright over nine input scenarios
(`scripts/capture-wind-eurocode.js` → `scripts/wind-eurocode-fixture.json`, checked by
`scripts/test-wind-eurocode.js`; full table in Appendix D). Our qp matched to **< 0.3 %** for every
roof with z_struct ≥ zmin (terrain II, vb 27, h 5 m → 879 N/m² exactly, with vm 23.62, Iv 0.2171).
The two sub-zmin scenarios exposed the `z0·2` floor bug above; with the zmin floor all nine match to
< 0.5 %.

### 12.6 Cross-standard normalisation (extreme-wind map)

The pan-global extreme-wind map (`extremeWindViz.html`, `scripts/generate-extremewind-grid.js`)
overlays many national standards. To make them comparable they are all normalised to the **EN 1991-1-4
definition of `vb,0`**: a **10-minute mean** wind speed at **10 m** over **open (terrain category II)**
ground at a **50-year return period**, in **m/s**. Non-EN standards are converted with documented,
academically-agreed factors (`conv` in `scripts/extremewind/kml-zones.js`):

| From | Conversion to vb,0 | Factor | Basis |
|---|---|---|---|
| 3-second gust → 10-min mean | divide | **/1.43** | Durst (1960) gust-factor curve [27]; 3-s/hourly = 1.52, 10-min/hourly = 1.06 ⇒ 1.52/1.06 = 1.43. Open terrain, 10 m. Also in ESDU 83045 and the ASCE 7 Commentary. |
| mph → m/s | multiply | **×0.44704** | exact unit conversion |
| 700-yr → 50-yr (ASCE Risk Cat II) | multiply | ×0.84 | ASCE 7-22 Commentary MRI conversion (non-hurricane continental US) [28] |
| 300-yr → 50-yr (ASCE Risk Cat I) | multiply | **×0.90** | as above (V₅₀/V₃₀₀ = (V₅₀/V₇₀₀)/(V₃₀₀/V₇₀₀) ≈ 0.84/0.93) |
| hourly-mean pressure → 10-min velocity | √(2q/ρ)·1.06 | ×1.06 | NBCC q is an hourly mean; 10-min/hourly = 1.06 (Durst) |

Worked examples: **India** IS 875-3 Vb (3-s gust, already 50-yr) 33–55 m/s → ÷1.43 = **23–38 m/s**.
**USA** ASCE 7-22 Risk Cat I (mph, 3-s gust, 300-yr) 86–180 mph → ×0.44704 ÷1.43 ×0.90 = **24–51 m/s**.

**Caveats.** The return-period factors assume a non-hurricane extreme-value (Gumbel) climate; on
tropical-cyclone coasts the true V₅₀/V₃₀₀ ratio is lower (higher variability), so hurricane/typhoon
coasts are somewhat over-stated. Reference conditions are matched (EN terrain II ≈ ASCE Exposure C ≈
open country, all at 10 m). The map is an indicative screening overlay, **not** a legal design value -
always use the governing standard's own value for design.

---

## 13. Accuracy and Limitations

| Source | Typical error |
|--------|---------------|
| Solar position (Spencer 1971) | ±0.05° elevation |
| Solar position (Hofierka/Suri) | ±0.2° elevation |
| Clear-sky model A (Ineichen, simplified) | ±5–10% instantaneous GHI |
| Clear-sky model B (Hofierka/Suri, v0.8.3+) | ±3–5% instantaneous GHI |
| Clearness index Kt (climatological, NASA POWER) | ±15–25% monthly |
| Transposition — Hay-Davies | ±5–8% annual in-plane |
| Transposition — Perez (1990) | ±3–5% annual in-plane |
| Temperature derating (NOCT simplified) | ±2–4% yield in hot climates |
| Combined yield estimate | **±10–20% annual** (Hofierka + Perez) |

**Known Kt accuracy limitation — two compensating errors**: Cross-validation against 19 years of PVGIS SARAH-3 monthly GHI for Brașov (2005–2023) revealed a two-part error:

1. **Formula error**: The code uses `clearsky_GHI × Kt` instead of the mathematically correct `H₀ × Kt` (since `ALLSKY_KT = actual_GHI / H₀`). The clear-sky model returns ~73% of H₀ for mid-latitude sites, so the formula underestimates actual GHI by ~27%.

2. **Source data error**: NASA POWER `ALLSKY_KT` stored in `kt5.bin` overestimates PVGIS SARAH-3 GHI for Brașov by **~11% on an H₀-weighted annual basis** (NASA yields 1,412 kWh/m²/yr vs PVGIS 1,270). Annual Kt means appear close (NASA 0.490 vs PVGIS 0.481) but the monthly *distribution* differs greatly — some months are 38–40% too high (Jan, Feb, Apr), others 24% too low (Sep).

These two errors partially cancel: **0.73 × 1.11 = 0.81**, giving a net ~−19% vs PVGIS, which falls within the stated ±20% accuracy band. Applying the correct formula without fixing the source data would produce ~+11% overestimate instead.

**Fix in progress**: `data/kt1.bin` (1°×1° grid) is being generated from PVGIS monthly GHI for land cells with Hofierka-normalised `Kt_cs = GHI_pvgis / clearsky_hofierka`, eliminating both compensating errors. Config.js will be switched to `kt1.bin` when generation completes.

**Other limitations**: The Kt grid uses long-term climatological averages and does not capture:
- Year-to-year variability (±5–10%)
- Local microclimate (coastal fog, valley inversions, urban aerosols)
- Seasonal snow coverage
- Panel soiling and degradation over time
- Spectral corrections for different PV technologies (PVGIS adds ≈+1.5% for c-Si)
- Daytime/sunny-hour air temperature: T₂ₘ is a day+night monthly mean, so cell
  temperatures (and hence temperature losses) are underestimated in sunny hours
- The mean-Kt representative day has few deep-overcast hours, so the Huld low-irradiance
  droop realises only partially compared to real hourly weather

(Angle-of-incidence reflection IS modelled — Martin-Ruiz, §6.4 — and the Huld efficiency
surface IS the PVGIS power model, §7.2a.)

**Worked decomposition vs PVGIS (Brașov case, 2026-06)**: a side-by-side run (45.653, 25.611,
5.4 kWp Aiko ABC γ=−0.26%/°C, 35°/0°, 14% loss, horizon on) gave **+15.5% annual energy** and
**+4.4% annual in-plane irradiation** vs PVGIS-SARAH3. The gap factorises exactly as
*resource × conversion*: 1.044 × 1.107 = 1.155.

- **Conversion chain.** PVGIS: 0.86 (system loss) × 0.9713 (AOI) × 1.0157 (spectral) ×
  0.9088 (temperature + low irradiance) = 0.7711 (= its reported l_total −22.89%).
  Ours: 0.86 (PR) × 0.9927 (γ-only NOCT derating; cold-climate winter gains offset summer
  losses) = 0.8537 (−14.63%). The +10.7% conversion gap splits into:
  **+9.2%** — PVGIS evaluates the full Huld/King efficiency surface
  η_rel(G′,T′) = 1 + k₁lnG′ + k₂ln²G′ + T′(k₃ + k₄lnG′ + k₅ln²G′) + k₆T′²
  (cSi: k₁=−0.012678, k₂=−0.017522, k₃=−0.003154, k₄=−0.000315, k₅=−0.000164, k₆=0;
  Faiman u₀=26.9, u₁=6.2 — from the PVGIS Python source, `api/power/efficiency*.py`),
  i.e. low-irradiance droop + temperature cross-terms for *generic* cSi, where the γ-path
  applies only γ·(T_cell−25) with the module's own (optimistic) datasheet γ;
  **+3.0%** — AOI reflection. *Correction:* at the time of this comparison Martin-Ruiz WAS
  already applied, but inside the reported H — it therefore cancelled in the conversion
  ratio and instead flattered the H comparison by ≈3%. The true resource gap was ≈+7.5%,
  conversion ≈+7.5%;
  **−1.6%** — spectral correction, which PVGIS *adds* for cSi under SARAH3 spectra (works
  against us).
- **Resource.** Monthly-climatology Kt on a 1°×1° cell vs SARAH3 hourly at
  ~5 km, DEM horizon vs user obstacles, and the representative-day construction (transposition
  is nonlinear in Kt, so mean-Kt months misweight beam vs diffuse). Seasonal signature: Jan/Feb
  −10%, Apr +12.4%, summer +7–9% — consistent with the Kt-distribution limitation above and
  with Brașov being the worst land city in the 14-city test (+13.7% E, +6.9% H, Hofierka).

**Post-implementation (same day):** §6.4 IAM semantics (H reported pre-IAM, power fed by
G_eff) and the §7.2a Huld surface are now in the engine. Measured on the same scenario:
energy delta +10.6% (γ path) → **+8.9%** (Huld c-Si 2025) / +9.4% (c-Si original); the H
comparison honestly reads ≈+10% now that IAM no longer hides in it. The Huld surface does
NOT reproduce PVGIS's full −9.12% temperature+low-irradiance loss with climatological
inputs, for two documented reasons (§13 limitations): T₂ₘ is a day+night monthly mean
(underestimates sunny-hour cell temperature) and the mean-Kt representative day lacks
deep-overcast hours (underestimates the lnG′ droop). 14-city mean energy error: +7.2%
(Hofierka, γ 0.4%/°C) vs +7.6% (Hofierka+Huld+Faiman 26.9/6.2) with the cold-climate
outliers improving (Yakutia +13.7→+11.5%, Ontario +10.9→+8.9%). The remaining gap is
resource/weather-distribution, which is exactly what the manual PVGIS import (yield step)
exists for in official work.

For final system design, use PVGIS with satellite-derived irradiance data (SARAH-3 dataset, 2014–2024).

---

## 14. References

1. Cooper P.I., *The absorption of radiation in solar stills*, Solar Energy, 12(3):333–346, 1969.
2. Spencer J.W., *Fourier series representation of the position of the Sun*, Search, 2(5), 1971.
3. Heywood H., *Operating experience with solar water heating*, JIHVE, 39:63–69, 1971.
4. Liu B.Y.H., Jordan R.C., *The interrelationship and characteristic distribution of direct, diffuse and total solar radiation*, Solar Energy, 4(3):1–19, 1960.
5. Hay J.E., Davies J.A., *Calculations of the solar radiation incident on an inclined surface*, Proc. First Canadian Solar Radiation Data Workshop, Toronto, 59–72, 1980.
6. Kasten F., Young A.T., *Revised optical air mass tables and approximation formula*, Applied Optics, 28(22):4735–4738, 1989.
7. Perez R., Ineichen P., Seals R., Michalsky J., Stewart R., *Modeling daylight availability and irradiance components from direct and global irradiance*, Solar Energy, 44(5):271–289, 1990.
8. Ineichen P., Perez R., *A new airmass independent formulation for the Linke turbidity coefficient*, Solar Energy, 73(3):151–157, 2002.
9. Hofierka J., Šúri M., *The solar radiation model for Open source GIS: implementation and applications*, Proc. Open source GIS — GRASS users conference, Trento, Italy, 2002.
10. Duffie J.A., Beckman W.A., *Solar Engineering of Thermal Processes*, 4th ed., Wiley, 2013.
11. NASA POWER Project, *Prediction of Worldwide Energy Resources*, power.larc.nasa.gov, 2024.
12. European Commission JRC, *PVGIS User Manual*, re.jrc.ec.europa.eu/pvg_tools, 2023.
13. Neamț L., *Proiectarea unui sistem fotovoltaic on-grid*, UTC Cluj-Napoca, 2007.
14. Neamț L., Neamț A., *Conversia energiilor regenerabile — Îndrumător de laborator online*, UTPress Cluj-Napoca, 2022.
15. IEC 60891:2021, *Photovoltaic devices — Procedures for temperature and irradiance corrections to measured I-V characteristics*, IEC, Geneva, 2021.
16. IEC 61829:2015, *Photovoltaic (PV) array — On-site measurement of current-voltage characteristics*, IEC, Geneva, 2015.
17. IEC 60904-1:2020, *Photovoltaic devices — Part 1: Measurement of photovoltaic current-voltage characteristics*, IEC, Geneva, 2020.
18. Villalva M.G., Gazoli J.R., Filho E.R., *Comprehensive approach to modeling and simulation of photovoltaic arrays*, IEEE Transactions on Power Electronics, 24(5):1198–1208, 2009.
19. Sera D., Teodorescu R., Rodriguez P., *PV panel model based on datasheet values*, Proc. IEEE International Symposium on Industrial Electronics, Vigo, 2392–2396, 2007.
20. De Soto W., Klein S.A., Beckman W.A., *Improvement and validation of a model for photovoltaic array performance*, Solar Energy, 80(1):78–88, 2006.
21. Phang J.C.H., Chan D.S.H., Phillips J.R., *Accurate analytical method for the extraction of solar cell model parameters*, Electronics Letters, 20(10):406–408, 1984.
22. Köntges M. et al., *Review of Failures of Photovoltaic Modules*, IEA-PVPS Task 13, Report T13-01:2014, ISBN 978-3-906042-16-9, 2014.
23. Martin N., Ruiz J.M., *Calculation of the PV modules angular losses under field conditions by means of an analytical model*, Progress in Photovoltaics 7(4):299–315, 1999.
24. Huld T., Gottschalg R., Beyer H.G., Topič M., *Mapping the performance of PV modules, effects of module type and data averaging*, Solar Energy 84(2):324–338, 2010.
25. CEN, *EN 1991-1-4:2005+A1:2010, Eurocode 1: Actions on structures — Part 1-4: General actions — Wind actions.*
26. EuroCodeApplied, *Calculation of wind pressure loads on flat roofs (EN 1991-1-4).* https://eurocodeapplied.com/design/en1991/wind-pressure-flat-roof (accessed 2026-06-15).
27. Durst C.S., *Wind speeds over short periods of time*, Meteorological Magazine, 89:181–186, 1960. (gust-factor curve relating averaging time to mean speed; reproduced in ESDU 83045 and the ASCE 7 Commentary.)
28. ASCE/SEI, *ASCE 7-22 Minimum Design Loads and Associated Criteria for Buildings and Other Structures — Commentary Chapter C26 (wind, MRI conversion of basic wind speeds).* American Society of Civil Engineers, 2022.

---

## Appendix A: Solar Position Validation

Test case: Greenwich Observatory, 21 June 2026, 12:00 UTC+0 (solar noon)

Expected:
- Declination δ = 23.44°
- Solar elevation at solar noon: h_s = 90° − φ + δ = 90° − 51.48° + 23.44° = 61.96°
- Solar azimuth at solar noon = 180° (due South, Nav convention)

Computed by tool:
- h_s ≈ 61.9° ✓
- γ_s ≈ 180° ✓

Test case: Brașov (45.65°N, 25.63°E), UTC+2, 21 December, 12:00 LST

Expected:
- δ = −23.45°
- h_s at noon ≈ 90° − 45.65° − 23.45° = 20.9°
- γ_s ≈ 180° (Nav)

Computed: h_s ≈ 20.8° ✓

---

## Appendix B: Yield Validation (Brașov, Romania)

Parameters: 1 kWp, 35° tilt, 0° PVGIS azimuth (South), losses=14% (effPR = 1 − 0.14 = 0.86), Perez transposition, no obstacles

| Quantity | This tool (Hofierka + Perez) | PVGIS (SARAH-3) | Difference |
|----------|------------------------------|-----------------|------------|
| Annual in-plane irradiation (kWh/m²) | ~1,220–1,240 | 1,481 | ~−16–17% |
| Annual PV energy (kWh, 1 kWp) | ~1,050–1,070 | 1,149 | ~−7–9% |

**PVGIS reference** (re.jrc.ec.europa.eu/pvg_tools, DR tool, Brașov 45.65°N 25.63°E, SARAH-3, 35° tilt, 0° az, 14% losses):
- Yearly in-plane irradiation: **1,481.51 kWh/m²**
- Yearly PV energy production: **1,148.54 kWh**
- Implied PR: 1148.54 / 1481.51 = 0.775

**Cross-validation (Kt data)**: 19-year (2005–2023) PVGIS SARAH-3 monthly GHI for Brașov gives annual GHI = 1,270 kWh/m² and annual Kt = 0.481. Our kt5.bin (NASA POWER ALLSKY_KT) gives Kt = 0.468 — only 2.7% lower. The dominant historical error was formula, not data: `clearsky_GHI × Kt ≈ 0.73×H₀ × Kt` was used instead of the correct `H₀ × Kt`. This was fixed in v0.9.2, reducing the in-plane gap from ~17% to ~2–3%.

---

## Appendix C: A Brief History of "deflate" (or: why the names lie)

*An easter egg for curious readers — this has nothing to do with solar physics.*

When the PNG format was designed in 1995, it chose **zlib** (RFC 1950) as its compression wrapper. Zlib is not a compression algorithm — it is a thin envelope around **DEFLATE** (RFC 1951, the actual LZ77+Huffman algorithm), prepending a 2-byte header and appending a 4-byte Adler-32 checksum:

```
[78 DA]  ←  zlib magic bytes (best-compression level)
[...]    ←  raw DEFLATE bitstream
[xx xx xx xx]  ←  Adler-32 checksum of uncompressed data
```

This matters because three RFCs describe the same compression family under three different names:

| Name | RFC | What it actually is |
|------|-----|---------------------|
| DEFLATE | 1951 | The LZ77 + Huffman algorithm itself |
| zlib | 1950 | DEFLATE + 2-byte header + Adler-32 checksum |
| gzip | 1952 | DEFLATE + longer header (filename, timestamp, …) + CRC-32 |

**PNG uses zlib (RFC 1950)**, not raw DEFLATE.

### How this caused a real bug in this project

The PNG files generated by this project (`elevation.png`, `temp5.png`, `tl5.png`) were initially written using Node.js `zlib.deflateRawSync()` — the "Raw" suffix means no header, no checksum, RFC 1951 only. A PNG viewer reads the IDAT chunk, expects the `78 DA` magic, gets something else, and refuses to open the file. Mac Preview rejected every PNG we generated.

The fix was a single word — `deflateSync` instead of `deflateRawSync`:

```javascript
// Wrong — raw DEFLATE only — Mac Preview / Windows Photos reject the file
zlib.deflateRawSync(data)  →  [...DEFLATE bits only...]

// Correct — full zlib envelope — valid PNG
zlib.deflateSync(data)     →  [78 DA] [...DEFLATE bits...] [Adler-32]
```

### The browser API compounds the confusion

The `DecompressionStream` Web API calls zlib simply `'deflate'`, because HTTP's `Content-Encoding: deflate` header has always been implemented by browsers as zlib rather than raw DEFLATE — a historical accident that the spec eventually codified:

```javascript
new DecompressionStream('deflate')      // decompresses ZLIB (RFC 1950) — despite the name
new DecompressionStream('deflate-raw')  // decompresses raw DEFLATE (RFC 1951)
new DecompressionStream('gzip')         // decompresses gzip (RFC 1952)
```

So the full write → read round-trip for every grid PNG in this project is:

```
Node write : zlib.deflateSync()                  → zlib envelope → stored in IDAT
Browser read: new DecompressionStream('deflate') → strips envelope → raw filtered scanlines
Node read  : zlib.inflateSync()                  → strips envelope → raw filtered scanlines
```

All three speak RFC 1950. They just refuse to agree on what to call it.

---

## Appendix D: Wind Load Validation (EuroCodeApplied EN 1991-1-4)

Recorded 2026-06-15. EuroCodeApplied's flat-roof calculator is a client-side JS app, so its
computed values cannot be read by a static fetch; it was driven headless with **Playwright**, its
peak velocity pressure `qp(ze)` snapshotted into a fixture, and our `wind.html` formula validated
against it offline.

**Artifacts** (`scripts/`, dev-only — not deployed):
- `capture-wind-eurocode.js` — Playwright driver: sets terrain / vb / h / hp, clicks Calculate,
  parses `qp(ze)`, `vm`, `Iv`, `cpe`.
- `wind-eurocode-fixture.json` — the captured reference snapshot (9 scenarios).
- `test-wind-eurocode.js` — runs our `ce(z)·qb` with both the `z0·2` and the `zmin` floor and
  asserts agreement (PASS within 2 %).
- `tests/screenshots/wind-eurocode-reference.png` — screenshot of the default calculation result.

**Reference inputs held constant:** ρ = 1.25 kg/m³, co = 1, hp = 0, b = 20 m, d = 10 m (geometry
affects zones, not `qp`). The default page case is terrain II / vb 27 / h 5.

**qp(ze) comparison** (N/m²):

| terrain | vb | h | EuroCode | ours `z0·2` | ours `zmin` |
|---------|----|---|----------|-------------|-------------|
| II  | 27 | 5  | 879  | 879 (+0.0 %)   | 879 (+0.0 %) |
| 0   | 26 | 10 | 1261 | 1260 (−0.0 %)  | 1260 |
| I   | 24 | 10 | 997  | 1000 (+0.3 %)  | 1000 |
| III | 31 | 16 | 1216 | 1212 (−0.3 %)  | 1212 |
| IV  | 30 | 25 | 1016 | 1013 (−0.3 %)  | 1013 |
| II  | 25 | 6  | 796  | 796 (−0.0 %)   | 796 |
| III | 28 | 3  | 628  | **485 (−22.7 %)** ✗ | 625 (−0.4 %) |
| IV  | 27 | 8  | 536  | **471 (−12.1 %)** ✗ | 534 (−0.3 %) |
| I   | 30 | 40 | 2056 | 2062 (+0.3 %)  | 2062 |

7/9 passed with the original `z0·2` floor; the two failures are exactly the roofs **below zmin**
(III: zmin 5 m, h 3 m; IV: zmin 10 m, h 8 m), which `z0·2` under-flooded → under-predicted the load
(non-conservative). The fix adds `zmin` to `TERRAIN_PARAMS` and floors the reference height at
`max(h, zmin)` (EN Table 4.1) → 9/9 within 0.5 %. The empirical kg/m² ballast model (§12.4) is
unchanged.
