/* share.js — collaborative read-only share links.
   • Invite (report.html): saves the project to GeoCraft via the shared gate Lambda, gets a token,
     and builds a link. Re-inviting returns the SAME token while the backend keeps the new values.
   • Opening /?share=<token>: after the gate (the viewer must be logged in / paid), loads that
     snapshot in READ-ONLY mode (Project.enterReadOnly) and lands on Location (step 1).

   The save/fetch endpoints live on the shared Lambda → thegeohunter.com (other agents). This file
   only speaks the contract below; adjust ENDPOINT / action names to match what they implement. */
var Share = (function () {
  'use strict';
  var ENDPOINT  = 'https://n3ky9b78wh.execute-api.eu-central-1.amazonaws.com/';  // shared gate Lambda (trailing slash)
  var SERVICE   = 'solar-pv';
  /* The Lambda dispatches by URL PATH (like /provision), not a body action field.
     A row in the backend store IS a saved project, keyed (service, owner email, projectRef):
     POST <ENDPOINT>share-save   {service,email,key,projectRef,state} → {success, token:'<32 hex>'}   owner save/overwrite
     POST <ENDPOINT>share-get    {service,email,key,token}            → {success, state, sharedBy, updatedAt}   bearer load (share link)
     POST <ENDPOINT>share-load   {service,email,key,projectRef}       → {success, state, token, updatedAt, createdAt}   owner load by ref
     POST <ENDPOINT>share-list   {service,email,key}                  → {success, projects:[{projectRef,token,sizeBytes,updatedAt,createdAt}]}
     POST <ENDPOINT>share-delete {service,email,key,projectRef}       → {success, deleted:<bool>}   idempotent; also revokes the share link
     (load/list/delete are owner-scoped - live in GeoCraft; the Lambda must route the new paths.) */
  var PATH_SAVE   = 'share-save';
  var PATH_GET    = 'share-get';
  var PATH_LOAD   = 'share-load';
  var PATH_LIST   = 'share-list';
  var PATH_DELETE = 'share-delete';
  var PARAM     = 'share';
  var PENDING   = 'spv_share_pending';

  function creds() {
    try { var v = JSON.parse(localStorage.getItem('spv_t')); return (v && v.email && v.key) ? v : null; }
    catch (e) { return null; }
  }
  /* Cryptographically random, unguessable project key — 122 bits of CSPRNG entropy from the
     browser (crypto.randomUUID where available, else a v4 UUID built from getRandomValues,
     which needs no secure context so it also works on file://). Bare UUID, no prefix
     (the old 'rpt_' was a legacy artifact of the report-share naming). Single atomic call: there is
     no intermediate state a breakpoint could swap, and the value can't be predicted. The old
     Date.now()+Math.random() scheme was guessable (time-seeded, weak PRNG). */
  function newRef() {
    var c = (typeof crypto !== 'undefined') ? crypto : null;
    if (c && c.randomUUID) return c.randomUUID();
    if (c && c.getRandomValues) {
      var b = new Uint8Array(16); c.getRandomValues(b);
      b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;   // RFC 4122 v4
      var h = [], i;
      for (i = 0; i < 16; i++) h.push((b[i] + 0x100).toString(16).slice(1));
      return h[0]+h[1]+h[2]+h[3] + '-' + h[4]+h[5] + '-' + h[6]+h[7] + '-' +
             h[8]+h[9] + '-' + h[10]+h[11]+h[12]+h[13]+h[14]+h[15];
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);           // last-ditch (no crypto)
  }

  /* Stable per-project save key = meta.projectRef. share-save overwrites in place under it,
     so re-saving/re-inviting keeps the same backend row + token; "Clear / new project" wipes
     it → a fresh project gets a fresh ref. (Migrates the legacy meta.shareRef field name.) */
  function projectRef() {
    try {
      var p = Project.get();
      if (p && p.meta && p.meta.projectRef) return p.meta.projectRef;
      if (p && p.meta && p.meta.shareRef) {                       // legacy field → same backend row
        Project.patch('meta', { projectRef: p.meta.shareRef });
        return p.meta.shareRef;
      }
      var ref = newRef();
      Project.patch('meta', { projectRef: ref });
      return ref;
    } catch (e) { return newRef(); }
  }
  async function call(pathSeg, extra) {
    var c = creds(); if (!c) throw new Error('not-authenticated');
    /* cloud needs the POSITIVE paid flag (set by gate.js on server validation; the silent
       revalidation upgrades legacy sessions). Missing flags = treated as trial → paywall. */
    if (!c.paid) { var te = new Error('trial-account'); te.status = 401; throw te; }
    var r = await fetch(ENDPOINT + pathSeg, {   // path-based route (e.g. .../share-save)
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ service: SERVICE, email: c.email, key: c.key }, extra)),
      signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(12000) : undefined,
    });
    var j = null; try { j = await r.json(); } catch (e) {}
    if (!r.ok || !j || j.success === false) {
      var err = new Error((j && j.message) || ('HTTP ' + r.status));
      err.status = r.status;   // 401 not-paid · 404 bad link · 413 too large · 502 transient
      throw err;
    }
    return j;
  }
  /* Map the Lambda's stable status codes to an i18n message key. */
  function msgKey(status, isSave) {
    if (status === 401) return 'share.needpaid';
    if (status === 413) return 'share.toobig';
    if (status === 404) return 'share.loadfail';      // share-get only
    return isSave ? 'share.savefail' : 'share.loadfail';
  }
  function linkFor(token) { return location.origin + '/?' + PARAM + '=' + encodeURIComponent(token); }

  /* Capture ?share=<token> immediately, before the gate can strip the URL on login. */
  (function () {
    try { var t = new URLSearchParams(location.search).get(PARAM); if (t) sessionStorage.setItem(PENDING, t); }
    catch (e) {}
  })();

  var _landing = false;
  async function tryLanding() {
    if (_landing || typeof Project === 'undefined') return;
    var token; try { token = sessionStorage.getItem(PENDING); } catch (e) { token = null; }
    if (!token) return;
    if (Project.isReadOnly() && Project.readOnlyToken() === token) { try { sessionStorage.removeItem(PENDING); } catch (e) {} return; }
    if (!creds()) return;                        // not through the gate yet — wait for onGateAuthed
    _landing = true;
    try {
      var res = await call(PATH_GET, { token: token });
      if (res && res.state && Project.enterReadOnly(res.state, token)) {
        try { sessionStorage.removeItem(PENDING); if (res.sharedBy) localStorage.setItem('spv_ro_by', res.sharedBy); } catch (e) {}
        var onLocation = /(^|\/)index\.html$/.test(location.pathname) || location.pathname === '/';
        if (onLocation) location.reload(); else location.href = 'index.html';   // land on Location, read-only
        return;
      }
      throw new Error('bad-response');
    } catch (e) {
      try { sessionStorage.removeItem(PENDING); } catch (e2) {}
      _landing = false;
      var k = msgKey(e && e.status, false);
      window.alert((typeof t === 'function') ? t(k) : 'Could not open the shared design — the link may be invalid or expired.');
    }
  }

  /* gate.js calls window.onGateAuthed once the viewer is authenticated. Chain any prior hook. */
  var _prev = window.onGateAuthed;
  window.onGateAuthed = function () { try { if (typeof _prev === 'function') _prev(); } catch (e) {} tryLanding(); };
  if (creds()) setTimeout(tryLanding, 0);   // already logged in → try right away

  return {
    save: function (state) { return call(PATH_SAVE, { projectRef: projectRef(), state: state }); },
    load: function (token) { return call(PATH_GET, { token: token }); },
    /* owner-scoped project store (share-load / share-list / share-delete) */
    loadByRef: function (ref) { return call(PATH_LOAD, { projectRef: ref || projectRef() }); },
    list:      function ()    { return call(PATH_LIST, {}); },
    remove:    function (ref) { return call(PATH_DELETE, { projectRef: ref }); },
    ref:  projectRef,   // this project's save key (creates one if missing)
    link: linkFor,
    tryLanding: tryLanding,
    msgKey: msgKey,   // map an error's .status → i18n message key
  };
})();
