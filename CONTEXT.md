# SESSION CONTEXT — Solar Path & Yield Tool

---

## Project summary

A browser-based solar engineering tool.
No build system, no framework, no server — single HTML artifact rendered inline.
Purpose: replace the defunct University of Oregon SRML sun path chart tool,
extended with horizon obstacle management and a static PV yield calculator.
Intended users: Romanian engineering students (UTC Cluj PV design course, Prof. Liviu Neamț)
and solar panel deployment robots.

---

## ⭐ Stepper workflow rebuild (Model 2) — CURRENT architecture (2026-06)

The site has completed TWO architectural generations: 4-tab SPA -> guided multi-page stepper (Model 2)
-> **React 18 + Vite SPA (v1.2.0, all 20 routes)** that keeps the stepper's `.html` URLs and mirrors
the Liviu Neamț on-grid PV-design course (points 1–22; scope 1–11 now). This supersedes the
"four tabs" described below — those tabs are now individual step pages.

**Decisions:** one persisted `localStorage` project blob (`spv_project`, the Project API) survives all
generations and remains the state contract. UI = React components in `app/src/`; engines = classic-script
globals in `js/`. RO primary /
EN secondary (i18n default `'ro'`). Dev = python :8091 (engines/legacy) + Vite :5173. Every workflow route is
**gated** (`gate.js`, shared `spv_t` session); reference pages (DBs, viz) are ungated.

**Shared chrome (every page):**
- `js/site-map.js` — `SITE_MAP` manifest = single source of truth for the stepper + ordering.
- `js/site-nav.js` — renders the header (brand · lang · theme toggle · collapse), the stepper
  sidebar, and prev/next, from the manifest. Page contract: `<body data-page="…">` + `.site-shell`
  with `#site-topbar` / `#site-stepper` / `.site-content` / `#site-stepnav` slots. `css/site-nav.css`.
- `js/project-state.js` — the `Project` API over one `localStorage` blob `spv_project` (`_v`-versioned).
  API: `get() · section(k) · set(k,v) · patch(k,obj) · markDone(id) · isDone(id) · reset() · export() · importState(obj)`.
  Report (step 16) exports the blob as JSON; Location (step 1) imports it back via `importState` (validates `_v`).
- `js/theme.js` owns `applyTheme()` (cookie-based, `[data-bs-theme]`, calls optional `onThemeChange()`).

**Step order + page files + status:**
| # | Step (RO) | Page | Status |
|---|---|---|---|
| 1 | Locație (name+address+location+sun-path) | `index.html` (data-page=location) | ✅ |
| 2 | Obstacole | `obstacles.html` | ✅ |
| 3 | Consum | `consumption.html` | ✅ (12 monthly inputs / appliance table → target kWp) |
| 4 | Componente (multi-String editor) | `components.html` | ✅ |
| 5 | Amplasare module (placement) | `mounting.html` | ✅ |
| 6 | Producție PVGIS (yield) | `yield.html` | ✅ multi-String (per-String cards, stacked monthly + twin-hump daily) |
| 7 | Recalculare | `recalc.html` | ✅ (demand vs production reconciliation + monthly overlay) |
| 8 | Conectare șiruri (Ns/Np §11) | `strings.html` | ✅ |
| 9 | Conexiuni electrice (DC/AC cabling + earthing/metering/grid) | `connections.html` | ✅ per-string cable + protective-fuse sizing |
| 10 | Protecții (switchgear & protection + single-line diagram) | `protections.html` | ✅ formula (20) fuse/MCB + SPD/RCD/disconnect + monofilară SVG/Excalidraw |
| 11-15 | Economics · ROI · BoM · Permits · Install plan | — | ⬜ scaffolded ready:false |
| 16 | Sarcini de vânt (phase D) | `wind.html` | ✅ |
| 17 | Raport (phase D) | `report.html` | ✅ summary + Generate PDF (print) + Export JSON |
| 18 | Defectoscopie I-V (phase E · Mentenanță) | `defectoscopy.html` | ✅ measured I-V → IEC 60891 STC translation → vs single-diode factory model → fault diagnosis |
| ref | Inverter DB · Module DB · 5×grid-map viz | `inverters.html`, `modules.html`, `*Viz.html` | ✅ |
| ref | Battery DB · Theory | — | ⬜ |

**Step 9 - Conexiuni electrice (`connections.html`):** one page replaces the nine planned
protection/cabling steps. Per-string DC cards (one per `Project.strings` entry): cable length input
(persisted in `connections.cables[stringId]`), **per-string §11 cell temperatures**: shared ambient
inputs (`stringSizing.tamin/tamax`) + each module's own NMOT (∓3% tolerance) + **per-string
G<sub>min</sub>[i]/G<sub>max</sub>[i]** - the clear-sky POA estimate at THAT string's β/γ (same
estimator as strings.html "Auto from location": first-hour-after-sunrise January TL=3 / June-solstice
noon TL=4; connections.html loads config+solar-geometry+irradiance-hofierka+yield-engine for this;
falls back to `stringSizing.gmin/gmax` without a location). T<sub>c,min</sub>[i] = T<sub>a,min</sub> +
(0.97·NMOT−20)·G<sub>min</sub>[i]/800, T<sub>c,max</sub>[i] = T<sub>a,max</sub> +
(1.03·NMOT−20)·G<sub>max</sub>[i]/800 - so an E/W string is colder at dawn (higher Voc) and cooler
at noon (less k<sub>T</sub> derating) than a south string. String
V<sub>OC,cold</sub> = ns × V<sub>OC,mod</sub> × (1 + λ<sub>V</sub>/100 × (T<sub>c,min</sub> − 25))
checked against the H1Z2Z2-K 1500 V DC rating. **Cabling follows the course relations (14)-(20)
verbatim** (so the page matches the methodology when presented): one string circuit carries the
MODULE currents I<sub>mp-STC</sub>/I<sub>sc-STC</sub> (np > 1 = np identical runs; the combined
np·I appears only at the MPPT input). DC: R<sub>C</sub> = ρ·l<sub>C</sub>/S<sub>C</sub> (16),
ΔU(%) = 2·R<sub>C</sub>·I<sub>mp-STC</sub>/(N<sub>S</sub>·U<sub>mp-STC</sub>)·100 (15);
AC: (17)/(18) 1F with factor 2, (19)/(20) 3F with √3, cosφ = 1; ρ = 0.0179 Cu / 0.0294 Al.
S<sub>VD</sub> = relations rearranged for S at the chosen ΔU% limit, then verified via (16)→(15)
with the chosen standard section. Cross-section = max(S<sub>VD</sub>, S from ampacity
I<sub>z</sub>·k<sub>T</sub> ≥ 1.25·I<sub>SC-STC</sub> with k<sub>T</sub> = √((90 − T<sub>c,max</sub>)/60)
- string cables run at module-level air, the conservative case - 4 mm² floor),
and gPV fuse verdict (needed iff np > 1; rating in [1.25, 2.4]·I<sub>SC</sub>; I<sub>max</sub> = (np−1)·I<sub>SC</sub>).
Series count: `s.ns` if §11 set it, else `count/np` (np defaults 1) — never one panel. AC card: phases
(230/400 V) + Cu/Al + length + max-drop → I<sub>AC</sub>, section, drop %, MCB (C-curve). Static
RO accordion covers earthing, SPD, disconnect, metering, grid connection (ATR). State in
`Project.connections {cables, dropDC, phases, matAC, lenAC, dropAC}`. Results use the shared `.metric`
cells — neutral by default, tinted only on warn/err (house style).

**Step 10 - Protecții (`protections.html`, `data-page="protections"`):** switchgear & protection
selection (Neamț course point 10) + an auto-generated **single-line / monofilară** schematic.
Reads `components.inverterId` → `INVERTER_LIST` (`vinvmax` = V<sub>max,inv</sub>, `pac`), per-string
`isc`/`imp`, and `connections.phases`. **DC side** (per-string cards): string **gPV fuse/MCB** sized
by **course formula (20)** `max(Isc-STC; 1.25·Imp-STC) ≤ Inf ≤ min(2·Isc-STC; Iprod,FV; Iprod,inv)`
with U<sub>n</sub> ≥ V<sub>max,inv</sub> (Iprod values are datasheet-only → flagged for manual check;
fuse marked *not required* for single strings, np<2); **type-2 DC SPD** U<sub>c</sub> ≥ V<sub>max,inv</sub>,
I<sub>n</sub> ≥ 10 kA; **DC load-break disconnect** I<sub>n</sub> ≥ 1.25·Σn<sub>p</sub>·Isc, U<sub>n</sub> ≥
V<sub>max,inv</sub>; the >10 m inverter↔DC-board rule adds an SPD at the inverter input. **AC side**:
**MCB** I<sub>n</sub> ≥ I<sub>inv,ca</sub> (P/230 or P/√3·400) + breaking-capacity check vs the
connection-point I<sub>cc</sub>; **RCD** type A (B note); **type-2 AC SPD** U<sub>c</sub> ≥ 1.1·V<sub>ph</sub>,
only if inverter↔BMP > 10 m. Design inputs (network type, I<sub>cc</sub> kA, two distances) persist in
`Project.section('protections')`. The schematic is built from a shared **node/wire model** rendered to
both inline **SVG** (theme-aware, electrical glyphs, dashed PE bus) and **Excalidraw** `.excalidraw`
JSON (rectangles/text/lines), each downloadable. `Explain.block` learning mode mirrors connections.html.
Compliance accordion (px.acc_dc/ac/spd) carries the full RO equipment text. **Marked done** once a
string + inverter exist. Same shared stack as connections (no clear-sky engine needed here).

Then P5 = client **PDF** generated from `Project`.

**`Project` (spv_project) schema (_v2):**
- `meta {first,last,name,address,projectName,projectRef}` (name = auto "first last"; projectName =
  user-facing title, report/PDF headline + future "My projects" display; **projectRef = the stable
  SAVE KEY of the backend project store** - share.js sends it to share-save/load/delete, auto-generated
  by `Share.ref()`, replaces legacy `meta.shareRef` which is migrated in place) ·
  `location {lat,lon,elevation,tz}` ·
  `orientation {azimuth,tilt,obstacles:[{navAz1,navAz2,pvgisAz1,pvgisAz2,el,lbl}],importedHorizon,horizon}` ·
  `consumption {mode,monthly[12],annualKwh,pricePerKwh,appliances[],coverage,specificYield,targetKwp,designKwh}` · `sizing {pvgisKwp,annualProdKwh}` ·
  `components {inverterId,pfvW,pacInv, + mirror moduleId/pmax/moduleLength/moduleWidth/count from strings[0]}` ·
  `mounting {tilt,azimuth,mode,pitch,gap,gcr,rows,total,kwp}` · `strings:[]` ·
  `planes:[]` (roof planes `{id,top,bottom,left,right,tilt,azimuth}` - see **Roof planes** below) ·
  `progress {stepId:true}`.

**STRING model (multi-array):** a "String" = one inverter input = a group of panels of a single
**type + orientation**. `Project.strings` = array of `{id, moduleId, count, azimuth, tilt, losses,
optimizer, albedo, ns, np, planeId, mount}`. Modules are NOT shared — each string has its own `moduleId`. Per-module
`gamma` (Pmpp temp coeff) and `cellType` (`'TOPCon'`, `'HJT'`, `'PERC'`, `'HPBC'`, `'ABC'`) added to
`MODULE_LIST`; `INVERTER_LIST` has `pac`. `MODULE_LIST` also carries `maxfuse` (Iprod,FV, datasheet max
series fuse, 45/117) shown on `modules.html` and used by protections.html. **Module ids are comparepv.com
panel slugs** (cross-compatible: `comparepv.com/panel/<id>` resolves for the 70/117 comparepv lists) -
see the SLUG RULESET in the dev guide (lowercase, hyphen-only, no dots/underscores; reuse for inverters).
`modules.html` shows a colour-coded `cellType` badge and, in
learning mode, an explainer bar describing the selected technology's physics and tradeoffs (`mod.ct.*` i18n).
Components edits the array (Add other → mixed makes/counts); Yield (**done**) repeats the **PV system +
Panel orientation** card per String (shared model card stays single), loops `calcYield` per String and
aggregates = element-wise sum of the 12-month arrays; a per-String clear-sky daily curve (season selector
summer/equinox/winter) sums to the **multi-hump** Total. NOCT & γ are per-module (`mod.nmot`,
`mod.gamma/100`). Optimizer = extra loss % per String besides base 14%. (yield.html aliases
`window.runYield = runYieldMulti` so applyI18n's re-run hook can't invoke the removed single-orientation runner.)

**Per-string PVGIS references (yield.html):** one PVGIS run = one orientation = one STRING. Each
string card has its own 📥 import button for the official PVGIS "json" export →
`strings[].pvgisRef {monthlyE[12], monthlyH[12], annualE, annualH, sdY, inputs}` plus a
`usePvgis` checkbox that makes that string's display/report data the imported E_m (chart stack
"(PVGIS)", orange tag in the breakdown, headline badge "date PVGIS (oficial)" or "parțial date
PVGIS" when mixed; totals = mixture, persisted to sizing → report). Per-string ⚠ when the
import's kWp or β/γ disagree with the string. The engine ALWAYS runs per string, so the monthly
table gains tabs whenever ≥1 import exists: Energie · vs PVGIS-Energie · vs PVGIS-Iradiere
(kWp-weighted in-plane kWh/m²) with per-month/annual Δ% (green ≤5 / amber ≤12 / red), aggregated
ENGINE vs IMPORT over the strings that have one - algorithm validation AND official paperwork.
(Legacy global `sizing.pvgisRef` auto-migrates to the β/γ-matching string.)

**Roof planes (mounting.html + `js/planes.js`):** optional physical roof faces panels sit on. Each
plane = 4 lengths in m measured **along the slope** (ridge T ∥ eave B + left/right) — the parallel-sides
convention makes 4 lengths define the shape uniquely: `x = (L²−R²+(B−T)²)/(2(B−T))`, `h = √(L²−x²)`
(rectangle T=B with L=R, trapezoid, triangle T=0; invalid sides rejected). Stored as a polygon, packed by
convex scanline in plane coordinates (no projection math), drawn as a dotted to-scale SVG with the packed
panels + a per-plane capacity verdict (Σ linked-string modules vs fits). Per-plane **edge setback**
("Retragere margine", m): `Planes.inset()` does a true inward polygon offset (exact perpendicular
clearance on slanted hip edges), packing runs inside it, and the diagram shows the finer-dashed inner
boundary. **The plane owns β once a string
is linked, and azimuths ADD** (`s.planeId` + `s.mount {mode:'flush'|'single'|'ew', rackTilt, rackAz,
face:'E'|'W'}`): eff γ = plane γ + panel γ (`rackAz`, always editable; coplanar presets it to 0 on the
mode change, E-W presets ∓90 alternating, `face` is the legacy fallback); eff β = plane β (coplanar) or
plane β + Δβ (tilted rows / E-W, same-axis sum, exact). `Planes.effOrient()` resolves and mounting.html
**syncs the SUM into `s.tilt`/`s.azimuth`** — every other page reads those fields unchanged; yield.html
additionally disables β/γ + the optimal-angle search for linked strings. When planes exist they REPLACE
the legacy rectangle: the "Suprafață disponibilă" card + rectangle top view hide, and Placement results'
"Module care încap" = Σ packed capacity over all planes (per-plane breakdown + kWp from each plane's
module). `single`/`ew` on a plane with β > 5° (`Planes.FLAT_MAX`)
shows a warning — pitched roofs are coplanar-only, no 3D tilt composition anywhere. `planeId=null` =
legacy free string (unlinked E-W ±90 preset unchanged).

**Data-flow chain:** Step1 writes meta+location → Step2 reads location for sun overlay, writes
orientation.obstacles/horizon → Consum (step 3) writes consumption{monthly,annualKwh,targetKwp} (specific
yield auto from sizing if Yield ran) → Components reads consumption.targetKwp (fallback sizing.pvgisKwp) as
its sizing target, writes strings[]+components → Mounting reads module dims, writes planes[] + links
strings to planes (syncing eff β/γ into strings) →
Yield reads strings+location+horizon, writes sizing → Inverter DB "Use in project" writes components →
String Sizing reads components.

**Gotchas:** `style.css #map` (sidebar mini-map) collides with viz full-screen maps → scope as
`#map-wrap #map`. Never put `*/` inside a CSS comment (closed site-nav.css's first rule once). Bump
`?v=` on changed JS/CSS in each page. obstacles.js guards `#hz-list`/`renderList` for consumer pages.

> Full living detail is in the agent's memory: `project_stepper_workflow.md` + `project_mounting_spec.md`.

---

## Current state (v0.9.4) — legacy 4-tab tool (now split into the step pages above)

Four tabs, modular JS architecture (index.html + 17 JS files):

### Tab 1: Sun Path
- Cartesian chart (canvas 860×560)
- 12 colored monthly arcs, auto-cropped azimuth axis
- Hourly crossing lines with purple AM/PM pill badges
- Month-name pill labels at arc peaks
- Date modes: All 12 months (default) / Dec→Jun / Jun→Dec / Single date
- Time modes: LST / Solar time
- Horizon obstacle overlay (red shaded zone) when obstacles defined

### Tab 2: Horizon / Obstacles
- Dual azimuth convention switcher: Nav (0°=N) / PVGIS (0°=S)
- Obstacle entry: label, az start, az end, elevation
- Internal storage always in Nav convention; PVGIS equivalents computed
- Obstacle list with Nav+PVGIS dual display per item
- Horizon profile chart (full 360°) with Jun/Dec solstice arcs
- PVGIS horizon.txt export: 36 values, CW from North, one per line

### Tab 4: String Sizing (Neamț §11)
- **Inverter template selector**: dropdown loads preset values for known inverters
  - Generic 5 kW, Victron SmartSolar MPPT 250/100, Fronius Symo Hybrid 5.0-3-S, Huawei SUN2000-5KTL-L1
- Module inputs: VOC_STC, Vmp_STC, Isc_STC, Imp_STC, λV, λI, NMOT
- Inverter inputs: Vmax_Inv, Vr_MPPT, Vmin/max_MPPT, Imax_MPPT, Isc_MPPT
- Site inputs: Ta_min, Ta_max, Gmin, Gmax
- Intermediate: Tmin, Tmax (eq.4,7), VOC_max (eq.3), Vmp_min (eq.6)
- Outputs: Ns_max, Ns_min, Nopt, Np_max with OK/FAIL badges
- Configuration table: per-Ns row, MPPT range check, parallel count
- Np limits (two independent checks):
  - N_p,sc = floor(I_sc,MPPT / I_SC) — fault/short-circuit protection
  - N_p,op = floor(I_max,MPPT / I_mp) — steady-state operating current
  - N_p,max = min(N_p,sc, N_p,op)
- Warnings: incompatible window, Nopt out of range, fault current overload, operating current binding

### Tab 3: Yield Calc (fully static, no API)
- **Irradiance model selector**: radio button — Mode A (Ineichen/Perez) or Mode B (Hofierka/Suri PVGIS)
  - Mode B: optional manual Linke turbidity (TL) override; otherwise uses lat+month lookup table
- **Diffuse transposition selector**: Hay-Davies (1980) / **Perez (1990)** (default — PVGIS method)
  - Perez adds horizon-brightening term F2·sin(β); improves diffuse by 3–8% vs Hay-Davies
- **Solar declination selector**: **Spencer (1971)** (7-term Fourier, ±0.035°) / Hofierka/Suri (2002) (default)
- Inputs: peak power (kWp), system losses (%), albedo
  - PR = 1 − loss% — single efficiency factor matching PVGIS convention (PR dropdown removed)
- **Temperature derating** (requires temp.bin): NOCT model, gamma Pmpp coefficient, on/off toggle
  - T₂ₘ indicator shows all 12 monthly values once temp.bin loaded
- Panel orientation: tilt + PVGIS azimuth (0°=South)
- Optional: find optimal tilt & azimuth (grid search)
- Optional: apply horizon from Obstacles tab
- Outputs: annual yield (kWh), specific yield (kWh/kWp), tilt/azimuth, optimal yield
- Monthly bar chart (Chart.js)
- Tilt optimizer curve chart
- Monthly data table with irradiance
- Method note shows all active models by name

### Sidebar (shared across all tabs)
- Leaflet map (CartoDB tiles, light/dark) — click/drag/search
- Lat/lon inputs, bidirectional sync with map
- **Elevation (m)** — auto-filled on every location change from the offline 0.1°×0.1° ETOPO2022 grid (elevation.png); manual override allowed
- Nominatim geocoder (free text search)
- Full UTC−12..+14 timezone selector
- Tab-specific controls below timezone

### Theme
- System / Light / Dark switcher in topbar
- CSS custom properties: --bg, --bg2, --surface, --border, --text, --text2, --text3, --input-bg
- .dark class on body; applyTheme() is single source of truth
- Canvas colours derive from isDark()

---

## Key design decisions

1. **No build system, no server** — `index.html` + plain `<script>` tags, CDNs only
   - Leaflet 1.9.4 from unpkg
   - Chart.js 4.4.1 from cdnjs
   - CartoDB tiles (no token required)
   - Nominatim geocoder (no token required)
   - Works on `file://` URLs — no `type="module"` (blocked by CORS on file://)

2. **Modular JS without ES modules** — each file adds globals, loaded in dependency order
   - One concern per file; load order replaces import graph
   - `js/app.js` is the composition root, loaded last
   - Adding new inverters: create `inverter-*.js`, add to `INVERTER_LIST`, add `<script>` tag

3. **Dependency injection for irradiance models and declination**
   - `calcYield(…, clearSkyFn, declinFn)` receives both as parameters
   - `yield-ui.js` reads the radio buttons and passes `clearSkyIneichen`/`clearSkyHofierka` and `declinationSpencer`/`declinationHofierka`
   - `sunPos()` accepts optional 7th param `declinFn`; canvas always uses Spencer (no param), yield engine passes the selection
   - New models or formulas can be added without touching yield-engine.js

4. **Azimuth conventions** — explicitly handled:
   - Nav/Chart: 0°=North, clockwise (used on canvas X-axis)
   - PVGIS: 0°=South, +90°=West, −90°=East (used in .txt export and yield inputs)
   - Conversions: navToPVGIS(a) = a−180 (clamped to ±180); inputToNav(az) adds 180 if PVGIS mode

5. **Solar math** (all in JS, no library):
   - `declinationSpencer(n)`: genuine Spencer (1971) 7-term Fourier series, ±0.035° — selectable in Yield tab
   - `declinationCooper(n)`: Cooper (1969) simple sinusoid `23.45·sin(360°·(284+n)/365)`, ±0.3° — kept as reference
   - `declinationHofierka(n)`: Hofierka/Suri (2002), ±0.2° — PVGIS native, default in Yield tab
   - `declination(n)`: backward-compatible alias → Spencer (1971)
   - `eot(n)`: equation of time, PVCDROM formula `9.87·sin(2B)−7.53·cos(B)−1.5·sin(B)`, B=360°·(n−80)/365
   - `sunPos(lat,lon,tz,n,h,mode,declinFn?)`: hour angle → altitude/azimuth; declinFn optional
   - `doy(y,mo,d)`: date to day-of-year
   - `GSC`: mutable global solar constant (default 1361 W/m²), written by `runYield()` from `#pv-gsc` input

6. **Irradiance engine** (v0.8.0+, two selectable clear-sky modes + two transposition models):
   - **Clear-sky Mode A** — Ineichen/Perez: simplified clear-sky, TL estimated from lat+doy formula (known non-standard approximation)
   - **Clear-sky Mode B** — Hofierka/Suri (2002): PVGIS native model, TL from 8-lat × 12-month lookup table; optional manual TL override
     - v0.8.3: solar constant corrected; atmospheric refraction applied before air mass computation
     - v0.8.5: barometric pressure correction `AM *= exp(−z/8434.5)` using `#site-elevation`
   - **Transposition — Hay-Davies (1980)**: direct + isotropic + circumsolar; `Ai = DNI/G0(n)` (n-corrected in v0.9.1)
   - **Transposition — Perez (1990)** (default): adds horizon-brightening term `F2·sin(β)` via 8-bin F coefficient table
   - **Temperature derating**: NOCT model `T_cell = T₂ₘ + (NOCT−20)/800·G`; `derate = 1+γ·(T_cell−25)`; on/off toggle
   - Clearness index Kt: CM SAF satellite CDRs via EUMETSAT — CLARA-A3 0.25° global base + SARAH-3 0.1° Romania tile (Kt_cs = SIS / Hofierka clear-sky), 5°×5° kt5.bin fallback
   - Accuracy: ±8–12% vs satellite data (Hofierka mode)
   - Horizon shading: per-hour check against 36-point elevation array

5. **Obstacles** stored as:
   ```js
   {navAz1, navAz2,        // Nav convention (0=N)
    pvgisAz1, pvgisAz2,    // PVGIS convention (0=S)
    el,                    // elevation angle °
    lbl}                   // display label
   ```

6. **buildHorizonArr()** → float[36], index i = azimuth i×10° Nav, value = max obstacle elevation

---

## File structure (modular)

```
index.html              — HTML layout, CSS, CDN links, ordered <script> tags (?v=N suffix for cache busting)
js/
  constants.js          — MNAMES, MCOLS, OCOLS, MDAYS (shared arrays)
  theme.js              — themeMode state, sysDark, isDark(), setThemeMode()
  solar-geometry.js     — D2R, R2D, GSC, G0, doy, declinationSpencer (7-term Fourier), declinationCooper,
                          declinationHofierka, declination (alias), eot, sunPos, isShaded
  convention.js         — convention state, getConvention(), inputToNav(), navToPVGIS()
  config.js             — CONFIG object, getAuthHeaders(), all grid constants (ELEV_*/KT_*/TEMP_*)
  irradiance-ineichen.js— KT_TABLE, getKt(), clearSkyIneichen(el, n, lat)
                          DHI formula corrected v0.9.4: 0.027−0.00017·TL (was 0.27−0.0017·TL, 10× too large)
  irradiance-hofierka.js— TL_TABLE, G0_hofierka(), airMass(el,elevM), clearSkyHofierka(el,n,lat,tlOverride,elevM)
  kt-grid.js            — resolveKt(lat,lon,m): generic _ktSample() over SARAH-3 tile (kt-ro-01.png) if in-bbox, else CLARA-A3 base (kt-global.png); inline 5°×5° kt5.bin last-resort fallback
  tl-png.js             — PNG loader for tl5.png; returns Uint8Array (NMONTHS×NLATS×NLONS), decode TL = value/20
  temp-grid.js          — TEMP_DATA Int8Array (5°×5°×12), resolveTemp(lat,lon,mo); loads via loadTemperaturePng()
  temp-png.js           — PNG loader for temp5.png / temp1.png
  yield-engine.js       — transposeHayDavies(n-corrected), transposePerez (Perez 1990 with F table),
                          transposeTilted (alias), calcYield(…, transposeName), findOptimal(…, transposeName)
  yield-ui.js           — getIrradianceModel(), getDeclinFn(), getTransposeName(), runYield(),
                          renderYield(), renderTiltChart(), toggleTempDerating()
  canvas.js             — currentTab, setCurrentTab(), drawCanvas(), drawSunPath(), drawHorizonChart()
  elevation.js          — getElevationGrid(), updateElevation() — reads offline elevation.png grid (no live API)
  elevation-png.js      — PNG loader for elevation.png
  map.js                — map, marker, initMap(), updateTiles(), setCoords(), autoTimezone(), syncMap(), searchPlace()
  obstacles.js          — obstacles[], importedHorizon, buildHorizonArr(), addObstacle(), exportHorizon()
  string-ui.js          — calcString(), renderStringResults()
  inverter-generic-5kw.js              — INVERTER_GENERIC_5KW const
  inverter-victron-multiplus2-48-5000.js— INVERTER_VICTRON_MULTIPLUS2_48_5000 const
  inverter-fronius-symo-hybrid-5-3s.js — INVERTER_FRONIUS_SYMO_HYBRID_5_3S const
  inverter-huawei-sun2000-5kw.js       — INVERTER_HUAWEI_SUN2000_5KW const
  inverter-index.js     — INVERTER_LIST[], populateInverterSelect(), loadInverterTemplate()
  app.js                — applyTheme(), setTheme(), setTab(), setConvention(), toggleTempDerating(), window.load handler
data/                    — live files only
  elevation.png         — ETOPO terrain, 0.1°×0.1°, 8-bit PNG (pixel=round(max(0,elev)/25))
  elevation05.png       — ETOPO terrain, 0.5°×0.5°, 8-bit PNG (same encoding)
  kt5.bin               — 5°×5° monthly Kt_cs, Uint8, 37×73×12 = 32,412 bytes  ← active fallback
  kt-global.png         — 0.25° monthly Kt_cs global base (CM SAF CLARA-A3 / EUMETSAT), 720×1440×12  ← active base
  kt-ro-01.png          — 0.1° monthly Kt_cs Romania tile (CM SAF SARAH-3 geostationary), 51×101×12  ← active hi-res
  kt1.png               — old 1°×1° Kt_cs (PVGIS scrape); now build-time fallback fill only
  kt1-sources.bin       — source provenance per cell (Uint8: 1=NASA-POWER 2=SARAH2 3=NSRDB 4=ERA5)
  kt-nasa.bin           — raw NASA POWER ALLSKY_KT source (5°×5°, kept for reference)
  temp5.png             — 5°×5° monthly T₂m, 8-bit PNG (pixel=°C+128), 876×37 horizontal layout  ← active
  temp1.png             — 1°×1° monthly T₂m, 8-bit PNG (same encoding), 4332×181 horizontal layout
  tl5.png               — 5°×5° monthly Linke turbidity, 8-bit PNG (pixel=round(TL×20)), 876×37 horizontal layout
                          back-calculated from NASA POWER MERRA-2 CLRSKY using full Ineichen (beam+diffuse);
                          TL 1.00–9.00, mean 3.10
  tl1.png               — 1°×1° monthly Linke turbidity (generating — ~14 h run)
```

Script load order in index.html mirrors the dependency graph — each file's globals are available to all files loaded after it.

```
scripts/
  generate-elevation-png.js   — generates elevation.png from ETOPO2022 source data
  generate-kt-grid.js         — one-time: NASA POWER ALLSKY_KT 5°×5° → data/kt5.bin (~45 min)
  generate-kt-grid-1deg.js    — 1°×1° Kt grid: PVGIS land + NASA POWER ocean (~2h); SH season fix v0.9.4
  test-kt-1deg.js             — dry-run test for 12 representative points
  generate-temperature-png.js — converts temp.bin → temp5.png (or temp1.png for 1°)
  generate-tl-grid.js         — 5°×5° Linke turbidity grid → data/tl5.png (~9 min, resumable); done (ghiFull)
  generate-tl-grid-1deg.js    — 1°×1° Linke turbidity grid → data/tl1.png (~14 h, resumable); running
  test-tl-ineichen.js         — validates tl5.png vs NASA POWER CLRSKY for 8 cities; Simple/POWER ≈ 1.00
elevationViz.html             — standalone QA tool: elevation grid on CartoDB map, open via file://
tempViz.html                  — standalone QA tool: temperature grid, month selector, −30…+40°C colour scale
ktViz.html                    — standalone QA tool: Kt grid
tlViz.html                    — standalone QA tool: TL grid, month slider, 9-class colour scale (split <1.5/<2.0), polar-night hatching
```

---

## Planned next tabs (from course PDF §11–19)

| Tab | Content | Course step |
|-----|---------|-------------|
| ~~String Sizing~~ | ~~Ns_max, Ns_min, Nopt, Np_max calculator~~ | ~~§11~~ ✓ done |
| Wiring | Voltage drop + power loss (DC+AC) | §13–15 |
| Economics | Simple payback + IRR, with/without grant | §19 |

---

## Course context

**Course**: Proiectarea unui sistem fotovoltaic on-grid  
**Author**: Prof. Liviu Neamț, Universitatea Tehnică Cluj-Napoca  
**Relevant steps**:
- §4: GPS coords, roof orientation/tilt, obstacle angles → horizon.txt for PVGIS
- §7,10: PVGIS yield calculation
- §11: String sizing (Ns_max ≤ Vmax_Inv/VOC_max, Ns_min ≥ VminMPPT/Vmp_min, etc.)
- §13–15: Cable sizing, voltage drop (ΔU% ≤ 1–3%), power losses
- §19: Economic analysis: simple payback T = C_FV/B, IRR via VNA=0

**Key formula refs**:
- VOC_max = VOC_STC · [1 + λV/100 · (Tmin − 25)]  (eq. 3)
- Vmp_min = Vmp_STC · [1 + λV/100 · (Tmax − 25)]  (eq. 6)
- Tmin = Ta_min + (NMOT−20) · Gmin/800  (eq. 4)
- Tmax = Ta_max + (NMOT−20) · Gmax/800  (eq. 7)

---

## Conventions reference

| Symbol | Meaning |
|--------|---------|
| Nav az | 0°=North, 90°=East, 180°=South, 270°=West, clockwise |
| PVGIS az | 0°=South, +90°=West, −90°=East (panel "aspect" parameter) |
| PVGIS .txt | 36 values CW from North (0°,10°,…,350°), each = horizon elevation° |
| Tilt | Angle from horizontal (0°=flat, 90°=vertical) |
| PR | Performance ratio (typical 0.70–0.80) |
| Kt | Monthly clearness index (0=overcast, 1=clear) |

---

## Dependencies (CDN only, no npm)

```
https://unpkg.com/leaflet@1.9.4/dist/leaflet.css
https://unpkg.com/leaflet@1.9.4/dist/leaflet.js
https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js
https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png  (map tiles)
https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
https://nominatim.openstreetmap.org/search  (geocoding, GET, no auth)
```

---

## Prompt to resume

> I have a modular browser-based solar tool (index.html + 23 JS files in js/), v0.9.4.
> See CONTEXT.md for full architecture and file structure. Four tabs: Sun Path, Horizon,
> Yield Calc, String Sizing. Yield tab: two clear-sky models (Ineichen/Hofierka), two
> transposition models (Hay-Davies / Perez 1990 default), two declination formulas
> (Spencer 1971 7-term Fourier / Hofierka default), monthly T2m temperature derating
> (NOCT model, temp5.png), PR = 1-loss% matching PVGIS convention.
> Offline PNG grids in data/: elevation.png (0.1°×0.1° ETOPO2022), kt5.bin (5°×5°, fallback),
> kt-global.png (0.25° CLARA-A3 global base) + kt-ro-01.png (0.1° SARAH-3 Romania tile), temp5.png (5°×5°×12), temp1.png (1°×1°×12),
> tl5.png (5°×5° Linke turbidity, back-calculated from NASA POWER MERRA-2 full Ineichen, TL 1.00–9.00),
> tl1.png (1°×1° Linke turbidity, generating ~14 h).
> Elevation from offline ETOPO2022 PNG grid only (live API removed).
> v0.9.4 fixes: Ineichen DHI decimal-point error (0.27→0.027), SH season reversal in kt1 generator.
> TL grids regenerated with ghiFull (beam+diffuse) back-solving, eliminating DHI inflation bias.
> Ineichen Kt renorm: Kt_ine = Kt_hof × ΣcsHof / ΣcsIne (monthly clearsky sums, full TL grid).
> pvlib formula audit completed v0.9.1: Spencer (1971) genuine Fourier series, Hay-Davies Ai
> uses G0(n) not G0(0), EoT corrected to (n-80)/365.
> No build system. Next planned tabs: Wiring (§13–15) and Economics (§19).
