# Solar Path & Yield Tool

A browser-based solar engineering tool — a React 18 + Vite SPA over a vanilla-JS physics engine layer. The app keeps classic `.html` URLs; the calculation engines in `js/` are plain classic scripts (no ES modules) loaded by the SPA shell.

Live at **[solar.coffeerunhobby.ro](https://solar.coffeerunhobby.ro)** · Access requires a purchased key.

## What it does

| Tab | Function |
|-----|---------|
| **Sun Path** | Cartesian solar elevation vs azimuth chart, all 12 months or custom dates |
| **Horizon / Obstacles** | Define shading obstacles, export PVGIS-compatible horizon.txt |
| **Yield Calc** | Static PV energy yield calculator (no API, fully offline) |
| **String Sizing** | Module/inverter string configuration: N_s,max · N_s,min · N_opt · N_p,max |

## Quick start

Open `index.html` in any modern browser. No installation required.

1. Click the map or search a place to set location
2. Select timezone
3. **Sun Path tab**: choose date range, click "Draw chart"
4. **Horizon tab**: add obstacles (buildings, trees), export `horizon.txt`
5. **Yield tab**: select irradiance model, enter system size and panel orientation, click "Calculate yield"
6. **String Sizing tab**: enter module and inverter datasheets, optionally load a template, click "Calculate"

## Scientific basis

See [SCIENCE.md](SCIENCE.md) for full mathematical documentation:
- Solar geometry: Spencer (1971) 7-term Fourier declination (±0.035°), equation of time (PVCDROM)
- Ineichen/Perez clear-sky model (Mode A)
- Hofierka-Suri PVGIS clear-sky model with Linke turbidity table (Mode B)
- Transposition: Hay-Davies (1980) or Perez (1990) anisotropic model (user-selectable)
- NOCT-based temperature derating (cell temperature → power correction)
- Clearness index Kt: CM SAF satellite CDRs via EUMETSAT — CLARA-A3 0.25° global base + SARAH-3 0.1° Romania tile (Kt_cs = SIS / Hofierka clear-sky, 18-yr climatology), validated ±1% RO / ~2% global vs PVGIS
- Linke turbidity: Hofierka path uses a 9-row table calibrated from CLARA-A3 clear-sky (cancels for horizontal GHI); Ineichen path uses the 1°×1° NASA-POWER-derived TL grid
- Performance ratio: `effPR = 1 − loss%` — same convention as PVGIS
- String sizing: temperature-corrected V_OC/V_mp, N_s and N_p limits, NMOT ±3°C tolerance
- Accuracy: ±8–12% annual yield (Hofierka + Perez)

## Azimuth conventions

| Convention | 0° direction | Used in |
|-----------|-------------|---------|
| Nav/Chart | North | Chart X-axis, map, obstacle input |
| PVGIS/Solar | South | horizon.txt export, yield tab orientation |

The tool handles both and converts automatically. Every obstacle shows both representations.

## Languages

EN / RO switcher in the topbar. Strings live in `js/i18n_en.js` and `js/i18n_ro.js`.

## Dependencies

Self-hosted in `vendor/` (no CDN dependency for core UI):
- [Leaflet.js](https://leafletjs.com/) 1.9.4 — map
- [Bootstrap](https://getbootstrap.com/) 5.3.3 — UI components and theming

Still loaded from CDN:
- [Chart.js](https://www.chartjs.org/) 4.4.1 — yield charts
- [CartoDB](https://carto.com/) tiles — map tiles (no token)
- [Nominatim](https://nominatim.org/) — geocoding (no token)

## Equipment database

The built-in module database (117 modules) uses **[comparepv.com](https://comparepv.com) panel slugs as
module ids**, so it is cross-compatible with comparepv: for the 70 modules comparepv lists,
`https://comparepv.com/panel/<module-id>` resolves directly. Slugs follow a strict ruleset (lowercase,
hyphen-only separators, no dots/underscores) documented in the dev guide. Each module may also carry a
`maxfuse` field (max series fuse, Iprod,FV) parsed from the datasheet PDF.

## Origin

Built as a replacement for the defunct University of Oregon SRML Sun Path Chart
(`solardat.uoregon.edu/SunChartProgram.html`, archived 2001–2023).

Extended for use with the UTC Cluj-Napoca PV design course
(Prof. Liviu Neamț, *Proiectarea unui sistem fotovoltaic on-grid*).

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## File structure

```
index.html              — layout, Bootstrap, ordered script tags
pay.html                — payment page (PayPal)
elevationViz.html       — QA tool: elevation grid on map
ktViz.html              — QA tool: Kt clearness index grid
tlViz.html              — QA tool: Linke turbidity grid, month slider
tempViz.html            — QA tool: temperature grid, month selector
windViz.html            — QA tool: wind speed grid
vendor/
  bootstrap.min.css     — Bootstrap 5.3.3 (self-hosted)
  bootstrap.bundle.min.js
  leaflet.css           — Leaflet 1.9.4 (self-hosted)
  leaflet.js
  images/               — Leaflet marker icons
js/
  constants.js          — shared arrays (month names, colours, day counts)
  theme.js              — theme state (system/light/dark), Bootstrap data-bs-theme
  solar-geometry.js     — pure solar math (declination, EoT, sunPos, isShaded)
  convention.js         — azimuth convention state + conversion functions
  config.js             — deployment config, grid geometry constants
  i18n.js               — i18n engine: t(), setLang(), language switcher
  i18n_en.js            — English strings
  i18n_ro.js            — Romanian strings
  gate.js               — access gate: email + key validation via Lambda
  elevation-png.js      — PNG loader for ETOPO2022 elevation grid
  elevation.js          — getElevationGrid(lat,lon), updateElevation()
  kt-png.js             — PNG loader for the Kt clearness index grids (generic origin/step)
  kt-grid.js            — resolveKt(): SARAH-3 tile if in-bbox, else CLARA-A3 base; 5°×5° kt5.bin fallback
  tl-png.js             — PNG loader for Linke turbidity grid
  tl-grid.js            — TL grid state and resolve helper
  temp-png.js           — PNG loader for monthly 2m air temperature grid
  temp-grid.js          — temperature grid state and resolveTemp()
  wind-png.js           — PNG loader for wind speed grid
  wind-grid.js          — wind grid state and resolveWind()
  data-loader.js        — coordinates parallel loading of all PNG grids at startup
  irradiance-ineichen.js— Mode A: Ineichen/Perez clear-sky model
  irradiance-hofierka.js— Mode B: Hofierka-Suri PVGIS clear-sky model
  yield-engine.js       — calcYield / findOptimal (models injected as parameters)
  yield-ui.js           — Yield tab UI, model selector, result rendering
  canvas.js             — Sun Path & Horizon canvas drawing
  map.js                — Leaflet map init, tile switching, geocoder
  obstacles.js          — obstacle state, horizon array, import/export
  string-ui.js          — String Sizing tab: calcString, renderStringResults,
                          INVERTER_LIST presets (Generic 5kW, Victron, Fronius, Huawei)
  app.js                — composition root: tab switching, theme, language, window.load
data/
  elevation.png         — terrain elevation (0.1°×0.1°, ETOPO2022)
  elevation05.png       — terrain elevation (0.5°×0.5°, ETOPO2022, blurred)
  kt-global.png         — 0.25° Kt_cs global base (CM SAF CLARA-A3, EUMETSAT)
  kt-ro-01.png          — 0.1° Kt_cs Romania tile (CM SAF SARAH-3, geostationary)
  temp1.png             — 1°×1° monthly 2m air temperature
  tl1.png               — 1°×1° monthly Linke turbidity
  wind5.png             — 5°×5° mean wind speed (NASA POWER WS2M)
```

The engine layer (`js/`) is loaded in dependency order via plain `<script>` tags in the SPA shell (`app/index.html`) — classic scripts, no ES modules. The UI layer is React (Vite build in `app/`); only the payment/newsletter/QA-viz pages remain standalone static HTML.

## Planned features

- Cable voltage drop checker — course §13–15
- Economic analysis (payback, IRR) — course §19

## License

Solar radiation algorithms are implementations of published academic methods
(Cooper 1969, Spencer 1971, Hay-Davies 1980, Perez 1990, Ineichen-Perez 2002, Liu-Jordan 1960, Hofierka-Suri 2002).
Map data © OpenStreetMap contributors, © CARTO.
