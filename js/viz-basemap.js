/* viz-basemap.js — theme-aware Carto basemap for the *Viz.html grid-map pages.
   Mirrors js/map.js: light/dark Carto tiles chosen by isDark(), swapped on theme
   change. Call vizBasemap(map) right after creating the Leaflet map.
   theme.js's applyTheme() invokes the global onThemeChange() after switching. */

const VIZ_TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

let _vizTileLayer = null;

function vizBasemap(map) {
  _vizTileLayer = L.tileLayer(isDark() ? VIZ_TILES.dark : VIZ_TILES.light, {
    attribution: '&copy; OSM &copy; CARTO', maxZoom: 18,
  }).addTo(map);
  return _vizTileLayer;
}

/* Called by theme.js after the theme flips — swap the basemap tiles to match. */
function onThemeChange() {
  if (_vizTileLayer) _vizTileLayer.setUrl(isDark() ? VIZ_TILES.dark : VIZ_TILES.light);
}

/* ── Shared colour ramp + legend (smooth RGB interpolation, gradient-bar legend) ──
   Every *Viz.html maps a scalar grid value to a colour. Instead of discrete buckets, define
   a list of [value, [r,g,b]] anchor STOPS (ascending) and interpolate linearly in RGB, so each
   step of the value reads as its own shade. The legend is the matching value-proportional
   gradient bar with tick labels positioned by value. Used by elevation/kt/tl/temp/wind/
   extreme-wind viz pages. */

function _rgbStr(c) { return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`; }

/* vizRamp(stops) -> f(v) -> "rgb(r,g,b)", clamped at both ends. */
function vizRamp(stops) {
  return function (v) {
    if (v <= stops[0][0]) return _rgbStr(stops[0][1]);
    const last = stops[stops.length - 1];
    if (v >= last[0]) return _rgbStr(last[1]);
    for (let k = 1; k < stops.length; k++) {
      if (v <= stops[k][0]) {
        const a = stops[k - 1], b = stops[k], t = (v - a[0]) / (b[0] - a[0]);
        return _rgbStr([a[1][0] + (b[1][0] - a[1][0]) * t,
                        a[1][1] + (b[1][1] - a[1][1]) * t,
                        a[1][2] + (b[1][2] - a[1][2]) * t]);
      }
    }
  };
}

/* value-proportional CSS gradient string matching the same stops. */
function vizGradientCss(stops) {
  const min = stops[0][0], max = stops[stops.length - 1][0], span = (max - min) || 1;
  return 'linear-gradient(to right,' +
    stops.map(s => `${_rgbStr(s[1])} ${((s[0] - min) / span * 100).toFixed(1)}%`).join(',') + ')';
}

/* HTML for a gradient bar + tick labels positioned by value. ticks = [{v, label}, ...].
   First/last labels clamp to the edges so they aren't clipped. */
function vizLegendBar(stops, ticks) {
  const min = stops[0][0], max = stops[stops.length - 1][0], span = (max - min) || 1;
  const bar = `<div style="height:14px;border-radius:3px;background:${vizGradientCss(stops)}"></div>`;
  const labels = (ticks || []).map(t => {
    const p = (t.v - min) / span * 100;
    const pos = p <= 2 ? 'left:0;transform:none'
              : p >= 98 ? 'left:auto;right:0;transform:none'
              : `left:${p.toFixed(1)}%;transform:translateX(-50%)`;
    return `<span style="position:absolute;${pos};white-space:nowrap">${t.label}</span>`;
  }).join('');
  return bar + `<div style="position:relative;height:12px;font-size:10px;color:var(--text3,#9aa3b2);margin-top:3px">${labels}</div>`;
}
