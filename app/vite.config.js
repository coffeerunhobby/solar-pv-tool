/* vite.config.js — Vite app config + the legacy bridge.

   The SPA keeps the site's original .html URLs (/theory.html, /batteries.html, …).
   In production each PORTED path is a copy of dist/index.html on S3 (deploy.sh).
   In dev/preview the proxy below reproduces that split: PORTED .html paths serve
   the shell (bypass → /index.html), everything else — unported .html pages, '/',
   /js /css /vendor /data, favicon — proxies to the always-running legacy server
   on :8091 (the dev guide observability server), so the whole workflow is
   navigable from one origin during the migration.

   NOTE for deploy.sh: PORTED_PATHS in src/ported.js is the single source of the
   ported list; the deploy PORTED array must match it (consistency-checked). */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORTED_PATHS } from './src/ported.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const LEGACY = 'http://localhost:8091';

/* APP_VERSION single source of truth stays js/config.js — parse it out. */
function appVersion() {
  try {
    const m = readFileSync(resolve(ROOT, '../js/config.js'), 'utf8')
      .match(/APP_VERSION\s*=\s*'([^']+)'/);
    return m ? m[1] : 'dev';
  } catch { return 'dev'; }
}

function stampVersion() {
  return {
    name: 'stamp-app-version',
    transformIndexHtml(html) { return html.replaceAll('__APP_VERSION__', appVersion()); },
  };
}

/* PORTED .html → serve the shell instead of proxying (bypass returning a string
   makes Vite continue with that URL internally — the transformed index.html in
   dev, dist/index.html in preview). Everything else falls through to :8091. */
function shellBypass(req) {
  const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const p = new URL(req.url, 'http://x').pathname;
  if (PORTED_PATHS.includes(p)) return '/index.html' + q;
}

const proxy = {
  '^/[^/]+\\.html$':        { target: LEGACY, bypass: shellBypass },
  '^/(js|css|vendor|data)/': { target: LEGACY },
  '^/[^/]+\\.(ico|png|json|txt)$': { target: LEGACY },   // root-level statics: favicon, logo.png, testpoints…
  '^/$':                     { target: LEGACY, bypass: shellBypass },   // P4: '/' is the SPA Location route
};

export default defineConfig({
  base: '/',
  plugins: [react(), stampVersion()],
  server:  { port: 5173, proxy },
  preview: { port: 4173, proxy },
});
