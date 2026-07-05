/* ported.js — the single source of truth for WHICH routes the SPA owns.
   Consumed by: src/routes.jsx (router), src/chrome (Link vs <a> decision),
   vite.config.js (dev/preview .html rewrites) and deploy.sh (shell-copy list —
   kept in sync manually; deploy.sh greps this file as a consistency check).

   Add a path here when its page is ported; delete the legacy HTML in the same
   change. Plain ESM with no JSX so vite.config.js can import it. */

export const PORTED_PATHS = [
  '/app-pilot.html',   // P0 smoke route (dev-only, never deployed)
  '/theory.html',      // P1
  '/batteries.html',   // P1
  '/inverters.html',   // P2
  '/modules.html',     // P2
  '/recalc.html',      // P2 (gated)
  '/consumption.html', // P2 (gated)
  '/obstacles.html',   // P2 (gated)
  '/components.html',  // P3 (gated)
  '/strings.html',     // P3 (gated)
  '/connections.html', // P3 (gated)
  '/protections.html', // P3 (gated)
  '/economics.html',   // P3 (gated)
  '/wind.html',        // P3 (gated)
  '/report.html',      // P3 (gated + paywalled)
  '/index.html',       // P4 (gated) — Location; '/' below is the same route
  '/',                 // P4 — the root cutover (S3 default root object serves the shell)
  '/mounting.html',    // P4 (gated)
  '/yield.html',       // P4 (gated)
  '/schema.html',      // P4 (gated)
  '/defectoscopy.html',// P4 (gated)
  '/pt.html',          // P4 (gated + paywalled)
];
