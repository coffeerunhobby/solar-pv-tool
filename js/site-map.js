/* site-map.js — single source of truth for the workflow stepper + reference nav.
   site-nav.js renders the sidebar, header and prev/next from this array.

   Entry shapes:
     { phase: <i18n key> }                          → section header
     { id, i18n, page, ready }                       → workflow step (auto-numbered)
     { id, i18n, note: true }                        → greyed informational row
     { id, i18n, page, ready, icon }                 → reference row (icon, no number)

   `page`  : href of the page (relative). `ready`: page exists & is navigable.
   Step numbers are assigned automatically, in order, to workflow rows only.

   Scope: 17 steps total. Steps 1–11 done (step 9 "connections" = DC/AC cabling +
   earthing/metering/grid; step 10 "protections" = switchgear/SPD/RCD + single-line;
   step 11 "economics" = Neamț pts 18-19 payback/RIR/VNA).
   Steps 12–15 (roi, bom, permits, install) REMOVED from the nav until built (their ready:false
   rows dead-ended Next at step 11); re-add their rows when ready. i18n keys kept.
   wind + report + pt done (now renumbered 12/13/14 after the removal).
   When a page ships, set ready:true. Add a page = add one line here. */

const SITE_MAP = [
  { phase: 'nav.phaseA' },
  { id: 'location',    i18n: 'nav.location',    page: 'index.html',       ready: true  },  /* step 1: project details + location + sun path */
  { id: 'obstacles',   i18n: 'nav.obstacles',   page: 'obstacles.html',   ready: true  },
  { id: 'consumption', i18n: 'nav.consumption', page: 'consumption.html', ready: true  },

  { phase: 'nav.phaseB' },
  { id: 'components',  i18n: 'nav.components',  page: 'components.html',   ready: true  },  /* step 4 */
  { id: 'mounting',    i18n: 'nav.mounting',    page: 'mounting.html',     ready: true  },  /* step 5 */
  { id: 'yield',       i18n: 'nav.yield',       page: 'yield.html',       ready: true  },  /* step 6 — production reflects module + E/W placement */
  { id: 'recalc',      i18n: 'nav.recalc',      page: 'recalc.html',       ready: true  },

  { phase: 'nav.phaseC' },
  { id: 'strings',     i18n: 'nav.strings',     page: 'strings.html',      ready: true  },  /* step 8 */
  { id: 'connections', i18n: 'nav.connections', page: 'connections.html',  ready: true  },  /* step 9: DC/AC cabling, earthing, metering, grid */
  { id: 'protections', i18n: 'nav.protections', page: 'protections.html',  ready: true  },  /* step 10: switchgear & protection (fuse/MCB/SPD/RCD) + single-line diagram */
  { id: 'economics',   i18n: 'nav.economics',   page: 'economics.html',    ready: true  },  /* step 11: economic analysis (Neamț pts 18-19, rel. 21-28) */
  /* steps 12-15 (roi, bom, permits, install) REMOVED from the nav until built - their ready:false
     rows dead-ended Next at step 11. Re-add here (i18n keys nav.roi/bom/permits/install kept) when built. */

  { phase: 'nav.phaseD' },
  { id: 'schema',     i18n: 'nav.schema',     page: 'schema.html',     ready: true  },  /* single-line schematic editor — zone-grid (cartouche col/row) placement */
  { id: 'wind',       i18n: 'nav.wind',       page: 'wind.html',       ready: true  },  /* step 15 */
  { id: 'report',     i18n: 'nav.report',     page: 'report.html',     ready: true  },  /* step 16: summary · JSON */
  { id: 'pt',         i18n: 'nav.pt',         page: 'pt.html',         ready: true  },  /* step 17: Proiect Tehnic (PT-SPEC.md) — replaces the old client PDF */

  { phase: 'nav.phaseE' },
  { id: 'defectoscopy', i18n: 'nav.defectoscopy', page: 'defectoscopy.html', ready: true },  /* step 17: I-V curve diagnostics vs factory */

  { phase: 'nav.phaseRef' },
  { id: 'inv-db', i18n: 'nav.invdb',  page: 'inverters.html', ready: true,  icon: '⚡' },
  { id: 'mod-db', i18n: 'nav.moddb',  page: 'modules.html',   ready: true,  icon: '▦' },
  { id: 'bat-db', i18n: 'nav.batdb',  page: 'batteries.html', ready: true,  icon: '🔋' },
  { id: 'theory', i18n: 'nav.theory', page: 'theory.html',    ready: true,  icon: '📖' },

  { phase: 'nav.phaseMaps' },
  { id: 'viz-elev', i18n: 'nav.vizElev', page: 'elevationViz.html', ready: true, icon: '⛰' },
  { id: 'viz-kt',   i18n: 'nav.vizKt',   page: 'ktViz.html',        ready: true, icon: '☀' },
  { id: 'viz-tl',   i18n: 'nav.vizTl',   page: 'tlViz.html',        ready: true, icon: '🌫' },
  { id: 'viz-temp', i18n: 'nav.vizTemp', page: 'tempViz.html',      ready: true, icon: '🌡' },
  { id: 'viz-wind', i18n: 'nav.vizWind', page: 'windViz.html',      ready: true, icon: '💨' },
  { id: 'viz-extremewind', i18n: 'nav.vizExtremeWind', page: 'extremeWindViz.html', ready: true, icon: '🌪' },
];

/* Ordered workflow steps only (no phases / refs / notes) — used for prev/next. */
const SITE_STEPS = SITE_MAP.filter(e => e.id && !e.phase && !e.note && !e.icon);
