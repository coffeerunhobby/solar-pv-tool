/* site-nav.js — renders the shared header, stepper sidebar and prev/next footer
   from SITE_MAP. Requires (load order): i18n_*.js → i18n.js → theme.js →
   project-state.js → site-map.js → this file.

   Page contract — the page declares its manifest id and provides slots:
     <body data-page="inv-db">
       <div class="site-shell">
         <div id="site-topbar"></div>
         <div class="site-body">
           <nav id="site-stepper"></nav>
           <div class="site-content">
             <div id="site-crumb"></div>     (optional — page may fill its own)
             ...page content...
             <div id="site-stepnav"></div>
           </div>
         </div>
       </div>
   Labels are emitted as data-i18n attributes; applyI18n() (called at mount and on
   language switch) does the translation, so RO/EN switching just works. */

(function () {
  // Capture this script's own element NOW (currentScript is only valid during initial execution).
  const _scriptEl = document.currentScript || document.querySelector('script[src*="site-nav.js"]');
  const pageId = document.body.dataset.page || '';
  const entry  = SITE_MAP.find(e => e.id === pageId) || null;

  // App version for the header. config.js (APP_VERSION) isn't loaded on every step page, so fall
  // back to this script's own ?v= cache-buster — kept in lockstep with APP_VERSION by the version
  // bump (`perl -i -pe 's/\?v=.../?v=NEW/'`). Single source stays APP_VERSION; this just mirrors it.
  const APP_VER = (function () {
    if (typeof APP_VERSION !== 'undefined') return APP_VERSION;
    const m = _scriptEl && _scriptEl.src && _scriptEl.src.match(/[?&]v=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : '?';
  })();
  const isRef  = !!(entry && entry.icon);

  // Auto-number workflow steps (skip phases / notes / reference rows).
  const numbers = {};
  let n = 0;
  SITE_MAP.forEach(e => { if (e.id && !e.phase && !e.note && !e.icon) numbers[e.id] = ++n; });

  function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

  /* ── Topbar ───────────────────────────────────────────── */
  function buildTopbar() {
    const host = document.getElementById('site-topbar');
    if (!host) return;
    host.className = 'topbar';
    host.innerHTML =
      '<button class="sn-collapse" id="sn-collapse" data-i18n-title="nav.collapse">☰</button>' +
      '<div class="topbar-brand"><span class="topbar-logo">☀️</span>' +
        '<span class="topbar-name" data-i18n="nav.brand">Earth Energy Engine</span>' +
        '<span class="sn-sub" title="version">· v' + APP_VER + '</span></div>' +
      '<div class="topbar-end">' +
        /* account avatar (person silhouette) → dropdown: language · theme · exit read-only · log out */
        '<div class="sn-account" id="sn-account">' +
          '<button class="sn-avatar" id="sn-avatar" data-i18n-title="nav.account" aria-haspopup="true">' +
            '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">' +
              '<circle cx="12" cy="8" r="3.6" fill="currentColor"/>' +
              '<path d="M4.5 20c0-4 3.6-6 7.5-6s7.5 2 7.5 6z" fill="currentColor"/></svg>' +
          '</button>' +
          '<div class="sn-menu" id="sn-menu" hidden>' +
            '<button class="sn-menu-item" id="sn-projects" data-i18n="nav.loadproject">☁️ Cloud saves</button>' +
            '<button class="sn-menu-item" id="sn-import" data-i18n="nav.importjson">⬆ Import JSON</button>' +
            '<button class="sn-menu-item" id="sn-export" data-i18n="nav.exportjson">⬇ Export JSON</button>' +
            '<input type="file" id="sn-import-file" accept=".json,application/json" style="display:none">' +
            '<div class="sn-menu-sep"></div>' +
            '<div class="sn-menu-row">' +
              '<span data-i18n="nav.langlabel">Language</span>' +
              '<select id="lang-select" class="sn-lang" onchange="setLang(this.value)">' +
                LANGUAGES.map(l => `<option value="${l.code}">${l.label}</option>`).join('') +
              '</select>' +
            '</div>' +
            '<div class="sn-menu-row">' +
              '<span data-i18n="nav.themelabel">Theme</span>' +
              '<label class="theme-toggle" data-i18n-title="nav.theme">' +
                '<input type="checkbox" id="theme-chk" onchange="setTheme(this.checked)">' +
                '<span class="tt-track"><span>☀</span><span>☾</span><span class="tt-thumb"></span></span>' +
              '</label>' +
            '</div>' +
            '<button class="sn-menu-item" id="sn-clean" data-i18n="nav.clean">🗑 Clean / new project</button>' +
            '<div class="sn-menu-sep" id="sn-sep-actions"></div>' +
            '<button class="sn-menu-item" id="sn-exit-ro" data-i18n="nav.switchback" style="display:none">Switch back</button>' +
            '<button class="sn-menu-item" id="sn-logout" data-i18n="nav.exit" style="display:none">Exit</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    wireAccount(host);
  }

  /* Avatar dropdown — the project/account hub:
     Import · Export | Language · Theme | Switch back (read-only) · Exit. */
  function wireAccount(host) {
    var acct = host.querySelector('#sn-account');
    if (!acct) return;
    function tr(k) { return (typeof t === 'function') ? t(k) : k; }
    var ro = (typeof Project !== 'undefined') && Project.isReadOnly();
    var hasSession = false; try { hasSession = !!localStorage.getItem('spv_t'); } catch (e) {}

    var btn = acct.querySelector('#sn-avatar'), menu = acct.querySelector('#sn-menu');
    var exit = acct.querySelector('#sn-exit-ro'), logout = acct.querySelector('#sn-logout');
    var sepActions = acct.querySelector('#sn-sep-actions');
    /* avatar is always available (it hosts import/export + language/theme); "Switch back" shows in a
       shared view, "Exit" when signed in. Hide the bottom divider if neither bottom action is shown. */
    if (ro && exit) exit.style.display = '';
    if (hasSession && logout) logout.style.display = '';
    if (sepActions && !ro && !hasSession) sepActions.style.display = 'none';

    btn.addEventListener('click', function (e) { e.stopPropagation(); menu.hidden = !menu.hidden; });
    document.addEventListener('click', function () { menu.hidden = true; });
    menu.addEventListener('click', function (e) { e.stopPropagation(); });

    /* ── Export: download the project JSON ── */
    var exp = acct.querySelector('#sn-export');
    if (exp) exp.addEventListener('click', function () {
      menu.hidden = true;
      if (typeof Project === 'undefined') return;
      var m = Project.section('meta') || {}, who = [m.first, m.last].filter(Boolean).join(' ');
      var slug = (m.name || m.last || who || 'proiect').toString().toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'proiect';
      var blob = new Blob([JSON.stringify(Project.export(), null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = 'solar-pv-' + slug + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });

    /* ── Import: load a project JSON (replaces state, lands on Location) ── */
    var imp = acct.querySelector('#sn-import'), impFile = acct.querySelector('#sn-import-file');
    if (imp && impFile) {
      imp.addEventListener('click', function () { menu.hidden = true; impFile.click(); });
      impFile.addEventListener('change', function () {
        var f = impFile.files && impFile.files[0]; if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          var obj = null; try { obj = JSON.parse(reader.result); } catch (e) {}
          if (typeof Project !== 'undefined' && Project.isReadOnly()) Project.exitReadOnly();  // import into own project
          if (obj && typeof Project !== 'undefined' && Project.importState(obj)) location.href = 'index.html';
          else window.alert(tr('loc.importerr'));
          impFile.value = '';
        };
        reader.readAsText(f);
      });
    }

    /* ── My projects: Bootstrap modal listing the backend project store ──────
       share-list returns refs only (no names) - the display name lives in each
       state blob, so the list fetches every project via share-load in parallel
       (blobs are small) and caches the states for an instant Load click. */
    var prj = acct.querySelector('#sn-projects');
    if (prj && typeof bootstrap !== 'undefined') {
      var _prjStates = {};   // ref → full state (from the name fetch, reused on Load)

      function prjModal() {
        var m = document.getElementById('sn-prj-modal');
        if (m) return m;
        m = el(
          '<div class="modal fade" id="sn-prj-modal" tabindex="-1" aria-hidden="true">' +
            '<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">' +
              '<div class="modal-content">' +
                '<div class="modal-header">' +
                  '<h5 class="modal-title" data-i18n="prj.title">My projects</h5>' +
                  '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>' +
                '</div>' +
                '<div class="modal-body"><div id="sn-prj-list"></div>' +
                  '<div id="sn-prj-status" class="small text-secondary mt-2"></div></div>' +
                '<div class="modal-footer">' +
                  '<button type="button" class="btn btn-p" id="sn-prj-save" data-i18n="prj.savecur">Save current project</button>' +
                  '<button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal" data-i18n="rep.close">Close</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>');
        document.body.appendChild(m);
        m.querySelector('#sn-prj-save').addEventListener('click', prjSave);
        if (ro) { var sb = m.querySelector('#sn-prj-save'); sb.disabled = true; sb.title = tr('nav.robanner'); }
        if (typeof applyI18n === 'function') applyI18n();
        return m;
      }
      function prjStatus(msg) { var s = document.getElementById('sn-prj-status'); if (s) s.textContent = msg || ''; }
      function fmtRow(p) {
        var kb = p.sizeBytes != null ? Math.max(1, Math.round(p.sizeBytes / 1024)) + ' KB' : '';
        var d  = (p.updatedAt || '').slice(0, 10).split('-').reverse().join('.');
        var cur = (typeof Project !== 'undefined' && (Project.section('meta') || {}).projectRef === p.projectRef);
        return '<div class="list-group-item d-flex align-items-center gap-2 px-0">' +
          '<div class="flex-grow-1" style="min-width:0">' +
            '<div class="fw-semibold text-truncate">' + escTxt(p.name) +
              (cur ? ' <span class="badge text-bg-secondary">' + escTxt(tr('prj.current')) + '</span>' : '') + '</div>' +
            '<div class="small text-secondary">' + [d, kb].filter(Boolean).join(' · ') + '</div>' +
          '</div>' +
          '<button type="button" class="btn btn-sm btn-outline-primary" data-prj-load="' + escTxt(p.projectRef) + '" title="' + escTxt(tr('prj.loadbtn')) + '">📂</button>' +
          '<button type="button" class="btn btn-sm btn-outline-danger" data-prj-del="' + escTxt(p.projectRef) + '" title="' + escTxt(tr('prj.delbtn')) + '">🗑</button>' +
        '</div>';
      }
      function escTxt(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
      function prjRefresh() {
        var list = document.getElementById('sn-prj-list');
        if (!list) return;
        prjStatus('');
        list.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm"></div></div>';
        Share.list().then(function (res) {
          var ps = (res && res.projects) || [];
          if (!ps.length) { list.innerHTML = '<div class="small text-secondary py-2">' + escTxt(tr('prj.empty')) + '</div>'; return; }
          /* resolve the display names from each blob (and cache the states) */
          return Promise.all(ps.map(function (p) {
            return Share.loadByRef(p.projectRef).then(function (r) {
              _prjStates[p.projectRef] = r.state || null;
              var meta = (r.state && r.state.meta) || {};
              p.name = meta.projectName || meta.name || p.projectRef;
              return p;
            }).catch(function () { p.name = p.projectRef; return p; });
          })).then(function (rows) {
            list.innerHTML = '<div class="list-group list-group-flush">' + rows.map(fmtRow).join('') + '</div>';
          });
        }).catch(function (e) {
          list.innerHTML = '';
          if (e && e.status === 401) { var pm = document.getElementById('sn-prj-modal'); if (pm) bootstrap.Modal.getOrCreateInstance(pm).hide(); paywall(); return; }
          prjStatus(tr(Share.msgKey(e && e.status, false)));
        });
      }
      function prjSave() {
        if (typeof Project === 'undefined') return;
        prjStatus('…');
        Share.save(Project.export()).then(function () {
          prjStatus(tr('prj.saved'));
          prjRefresh();
        }).catch(function (e) {
          if (e && e.status === 401) { var pm = document.getElementById('sn-prj-modal'); if (pm) bootstrap.Modal.getOrCreateInstance(pm).hide(); paywall(); return; }
          prjStatus(tr(Share.msgKey(e && e.status, true)));
        });
      }
      prj.addEventListener('click', function () {
        menu.hidden = true;
        /* trial (PBKDF2) sessions carry creds the Lambda rejects; no session at all = no
           creds → paywall immediately. Server-side 401s land in the catch blocks below. */
        if (typeof Share === 'undefined' || !cloudCreds()) { paywall(); return; }
        var m = prjModal();
        bootstrap.Modal.getOrCreateInstance(m).show();
        prjRefresh();
      });
      /* delegated load/delete clicks inside the list */
      document.addEventListener('click', function (e) {
        var lbtn = e.target.closest && e.target.closest('[data-prj-load]');
        var dbtn = e.target.closest && e.target.closest('[data-prj-del]');
        if (lbtn) {
          var ref = lbtn.getAttribute('data-prj-load');
          if (!window.confirm(tr('prj.confirmload'))) return;
          var go = function (state) {
            if (!state) { prjStatus(tr('share.loadfail')); return; }
            if (typeof Project !== 'undefined' && Project.isReadOnly()) Project.exitReadOnly();
            if (Project.importState(state)) location.href = 'index.html';
            else prjStatus(tr('loc.importerr'));
          };
          if (_prjStates[ref]) go(_prjStates[ref]);
          else Share.loadByRef(ref).then(function (r) { go(r.state); }).catch(function (e2) {
            if (e2 && e2.status === 401) { var pm = document.getElementById('sn-prj-modal'); if (pm) bootstrap.Modal.getOrCreateInstance(pm).hide(); paywall(); return; }
          prjStatus(tr(Share.msgKey(e2 && e2.status, false)));
          });
        } else if (dbtn) {
          var dref = dbtn.getAttribute('data-prj-del');
          if (!window.confirm(tr('prj.confirmdel'))) return;
          Share.remove(dref).then(function () { delete _prjStates[dref]; prjRefresh(); })
            .catch(function (e2) {
              if (e2 && e2.status === 401) { var pm = document.getElementById('sn-prj-modal'); if (pm) bootstrap.Modal.getOrCreateInstance(pm).hide(); paywall(); return; }
          prjStatus(tr(Share.msgKey(e2 && e2.status, true)));
            });
        }
      });
    }

    if (exit) exit.addEventListener('click', function () {
      if (typeof Project !== 'undefined') Project.exitReadOnly();   // drop the shared snapshot → own project returns
      location.href = 'index.html';
    });
    var cleanBtn = acct.querySelector('#sn-clean');
    if (cleanBtn) cleanBtn.addEventListener('click', function () {
      menu.hidden = true;
      if (typeof Project === 'undefined') return;
      if (!window.confirm(tr('rep.clearconfirm'))) return;
      if (Project.isReadOnly()) Project.exitReadOnly();
      Project.reset();
      location.href = 'index.html';   // back to step 1 (Location) with a blank project
    });
    logout.addEventListener('click', function () {
      if (typeof Project !== 'undefined' && Project.isReadOnly()) Project.exitReadOnly();
      if (typeof window.gateLogout === 'function') { window.gateLogout(); return; }
      try { localStorage.removeItem('spv_t'); } catch (e) {}
      location.reload();
    });
  }

  /* Read-only banner across the top of the content when viewing a shared design. */
  function buildReadOnlyBanner() {
    if (typeof Project === 'undefined' || !Project.isReadOnly()) return;
    document.body.classList.add('spv-ro');
    var content = document.querySelector('.site-content');
    if (!content || content.querySelector('#sn-ro-banner')) return;
    var by = ''; try { by = localStorage.getItem('spv_ro_by') || ''; } catch (e) {}
    var bySpan = by ? ' <span class="sn-ro-by">· ' + by.replace(/[<>&]/g, '') + '</span>' : '';
    var b = el('<div id="sn-ro-banner" class="sn-ro-banner">' +
      '<span><span data-i18n="nav.robanner">Read-only — viewing a shared design.</span>' + bySpan + '</span>' +
      '<button class="sn-ro-exit" id="sn-ro-exit" data-i18n="nav.exitro">Exit read-only mode</button></div>');
    content.insertBefore(b, content.firstChild);
    b.querySelector('#sn-ro-exit').addEventListener('click', function () {
      Project.exitReadOnly(); location.href = 'index.html';
    });
  }

  /* ── Stepper ──────────────────────────────────────────── */
  function rowEl(e) {
    if (e.phase) {
      const d = document.createElement('div'); d.className = 'sn-phase';
      const s = document.createElement('span'); s.dataset.i18n = e.phase; d.appendChild(s);
      return d;
    }
    const isWorkflow = !e.icon && !e.note;
    const done       = isWorkflow && Project.isDone(e.id);
    const navigable  = e.page && e.ready && e.id !== pageId;

    const node = document.createElement(navigable ? 'a' : (e.note ? 'div' : 'span'));
    if (navigable) node.href = e.page;
    node.className = 'sn-step'
      + (e.id === pageId ? ' sn-active' : '')
      + (e.note ? ' sn-locked' : '')
      + (e.icon ? ' sn-ref' : '')
      + (!e.note && !e.ready ? ' sn-soon' : '')
      + (done ? ' sn-done' : '');

    const badge = document.createElement('span');
    if (e.icon)      { badge.className = 'sn-ic';    badge.textContent = e.icon; }
    else if (e.note) { badge.className = 'sn-badge'; badge.textContent = '⋯'; }
    else             { badge.className = 'sn-badge'; badge.textContent = done ? '✓' : numbers[e.id]; }
    node.appendChild(badge);

    const lbl = document.createElement('span'); lbl.className = 'sn-lbl'; lbl.dataset.i18n = e.i18n;
    node.appendChild(lbl);
    if (isWorkflow) node.dataset.i18nTitle = e.i18n;
    return node;
  }
  function buildStepper() {
    const host = document.getElementById('site-stepper');
    if (!host) return;
    host.innerHTML = '';
    SITE_MAP.forEach(e => host.appendChild(rowEl(e)));
  }

  /* ── Prev / Next ──────────────────────────────────────── */
  function navBtn(step, dir) {
    if (!step) {
      const s = el('<span class="sn-nav-btn sn-disabled"></span>');
      s.innerHTML = `<b data-i18n="nav.${dir}"></b>`;
      return s;
    }
    const nav  = step.ready;
    const node = document.createElement(nav ? 'a' : 'span');
    if (nav) node.href = step.page;
    node.className = 'sn-nav-btn sn-' + dir + (nav ? '' : ' sn-disabled') + (dir === 'next' ? ' sn-primary' : '');
    node.innerHTML = `<b data-i18n="nav.${dir}"></b><small data-i18n="${step.i18n}"></small>`;
    return node;
  }
  function buildStepnav() {
    const host = document.getElementById('site-stepnav');
    if (!host) return;
    host.className = 'sn-stepnav';
    host.innerHTML = '';

    if (isRef) {
      // reference page: off the linear sequence → resume from the current workflow step
      const resume = SITE_STEPS.find(s => !Project.isDone(s.id)) || SITE_STEPS[SITE_STEPS.length - 1];
      const prev = el('<span class="sn-nav-btn sn-disabled"><b data-i18n="nav.prev"></b></span>');
      const note = el('<span class="sn-note" data-i18n="nav.refnote"></span>');
      const next = document.createElement(resume && resume.ready ? 'a' : 'span');
      if (resume && resume.ready) { next.href = resume.page; next.addEventListener('click', _flushStep); }
      next.className = 'sn-nav-btn sn-next sn-primary' + (resume && resume.ready ? '' : ' sn-disabled');
      next.innerHTML = `<b data-i18n="nav.resume"></b><small data-i18n="${resume ? resume.i18n : 'nav.resume'}"></small>`;
      host.append(prev, note, next);
      return;
    }
    // workflow page: adjacent steps
    const idx   = SITE_STEPS.findIndex(s => s.id === pageId);
    const prevS = idx > 0 ? SITE_STEPS[idx - 1] : null;
    const nextS = (idx >= 0 && idx < SITE_STEPS.length - 1) ? SITE_STEPS[idx + 1] : null;
    const prevBtn = navBtn(prevS, 'prev');
    if (prevS) prevBtn.addEventListener('click', _flushStep);   // leaving via Prev also saves
    host.appendChild(prevBtn);
    host.appendChild(el('<span class="sn-spacer"></span>'));
    host.appendChild(printBtn());
    const nextBtn = navBtn(nextS, 'next');
    if (nextS) nextBtn.addEventListener('click', _flushStep);   // Next saves the current step before navigating
    /* Soft gate: Next stays clickable, but if the CURRENT step isn't done yet it gets a subtle
       amber dot + tooltip (a nudge, not a block). Clears live - SiteNav.refresh() rebuilds this. */
    if (nextS && !Project.isDone(pageId)) {
      nextBtn.classList.add('sn-hint');
      nextBtn.setAttribute('data-i18n-title', 'nav.hintnotdone');
    }
    host.appendChild(nextBtn);
  }

  /* White "Print / PDF" button (printer icon) wedged just before Next. Prints the CURRENT step page
     exactly as shown - mod explicativ on/off is whatever the user left on screen, since window.print()
     renders the live DOM. Mobile browsers turn this into Save-as-PDF / Share-as-PDF, which WhatsApp
     accepts as a document. */
  function printBtn() {
    const b = el('<button type="button" class="sn-nav-btn sn-print" title="Print / PDF"><b>🖨 <span data-i18n="nav.printpdf">PDF</span></b><small data-i18n="nav.printsub">printează</small></button>');
    b.addEventListener('click', () => window.print());
    return b;
  }

  /* ── Save on navigate ─────────────────────────────────────
     Each step page assigns window.saveStep = <its persist/calc fn>; _flushStep() runs it. There is NO
     separate Save button - NEXT (and Prev) call this before navigating, so advancing a step always
     commits it. A one-time pagehide / visibilitychange-hidden listener is the secondary net. (Nothing
     can catch a power cut, but Next-saves means there's always a committed checkpoint before you leave.)
     Per-page Calculate/Generate buttons remain for that action. */
  function _flushStep() { try { if (typeof window.saveStep === 'function') window.saveStep(); } catch (e) {} }

  /* Print-only header (project · step number+name) so the loose per-step PDFs a customer shares on
     WhatsApp are self-labeling. Hidden on screen; revealed by the @media print block. */
  function injectPrintHead() {
    const content = document.querySelector('.site-content');
    if (!content || isRef || content.querySelector('.print-head')) return;
    const idx  = SITE_STEPS.findIndex(s => s.id === pageId);
    const step = idx >= 0 ? SITE_STEPS[idx] : null;
    const meta = (Project.section ? Project.section('meta') : null) || {};
    const head = el('<div class="print-head"><span class="ph-proj"></span><span class="ph-step"></span></div>');
    head.querySelector('.ph-proj').textContent = meta.projectName || meta.name || '';
    if (step) head.querySelector('.ph-step').innerHTML = `<b>${idx + 1}.</b> <span data-i18n="${step.i18n}"></span>`;
    content.insertBefore(head, content.firstChild);
  }

  /* ── Collapse / mobile drawer ─────────────────────────── */
  function wireCollapse() {
    const btn   = document.getElementById('sn-collapse');
    const shell = document.querySelector('.site-shell');
    if (!btn || !shell) return;
    btn.addEventListener('click', () => {
      if (window.innerWidth <= 900) shell.classList.toggle('sn-navopen');
      else shell.classList.toggle('sn-collapsed');
    });
  }

  /* ── Mount ────────────────────────────────────────────── */
  function mount() {
    buildTopbar();
    buildReadOnlyBanner();
    buildStepper();
    buildStepnav();
    injectPrintHead();
    wireCollapse();
    if (typeof applyTheme === 'function') applyTheme();
    if (typeof applyI18n === 'function') applyI18n();
    enforcePaywall();
    // Secondary net: flush on tab close / navigation away (covers paths that bypass the buttons).
    window.addEventListener('pagehide', _flushStep);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') _flushStep(); });
  }

  /* ── Paywall modal — cloud features need a PAID account; PBKDF2 trial sessions and
     401 responses land here instead of a window.alert. The div is protected with the
     SAME MutationObserver algorithm gate.js uses for the login overlay: removing it
     from the DOM nukes the page content. ── */
  function _ptr(k) { return (typeof t === 'function') ? t(k) : k; }
  function _pesc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function cloudCreds() {
    try { var v = JSON.parse(localStorage.getItem('spv_t')); return !!(v && v.email && v.key && v.paid); }
    catch (e) { return false; }
  }
  var _pwGuard = null;
  function _pwNuke() {
    if (_pwGuard) _pwGuard.disconnect();
    document.body.innerHTML = '';
    document.body.style.cssText =
      'margin:0;height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif';
    var p = document.createElement('p');
    p.style.cssText = 'color:#888;font-size:.9rem';
    p.textContent = 'Please reload the page.';
    document.body.appendChild(p);
  }
  function paywall(opts) {
    opts = opts || {};
    if (typeof bootstrap === 'undefined') { window.alert(_ptr('share.needpaid')); return; }
    var m = document.getElementById('sn-paywall-modal');
    if (!m) {
      document.body.insertAdjacentHTML('beforeend',
        '<div class="modal fade" id="sn-paywall-modal" tabindex="-1" aria-hidden="true">' +
          '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">' +
            '<div class="modal-header"><h5 class="modal-title">🔒 ' + _pesc(_ptr('nav.paywallTitle')) + '</h5>' +
              '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
            '<div class="modal-body" id="sn-paywall-msg">' + _pesc(_ptr('share.needpaid')) + '</div>' +
            '<div class="modal-footer">' +
              '<button type="button" class="btn btn-outline-secondary" id="sn-paywall-back">' + _pesc(_ptr('nav.paywallBack')) + '</button>' +
              '<button type="button" class="btn btn-outline-secondary" id="sn-paywall-login">' + _pesc(_ptr('nav.paywallLogin')) + '</button>' +
              '<a class="btn btn-p" href="pay.html">' + _pesc(_ptr('nav.paywallBuy')) + '</a>' +
            '</div>' +
          '</div></div></div>');
      m = document.getElementById('sn-paywall-modal');
      m.querySelector('#sn-paywall-login').addEventListener('click', function () {
        try { localStorage.removeItem('spv_t'); } catch (e) {}
        location.reload();                                   // gate shows → sign in with paid creds
      });
      m.querySelector('#sn-paywall-back').addEventListener('click', function () {
        if (history.length > 1) history.back(); else location.href = 'index.html';
      });
      _pwGuard = new MutationObserver(function () {
        if (document.getElementById('sn-paywall-modal')) return;
        _pwNuke();
      });
      _pwGuard.observe(document.body, { childList: true, subtree: true });
    } else {
      /* refresh texts (language may have switched since creation) */
      m.querySelector('#sn-paywall-msg').textContent = _ptr('share.needpaid');
      var ttl = m.querySelector('.modal-title'); if (ttl) ttl.textContent = '🔒 ' + _ptr('nav.paywallTitle');
      var lg = m.querySelector('#sn-paywall-login'); if (lg) lg.textContent = _ptr('nav.paywallLogin');
    }
    /* blocking page-gate flavor: static backdrop, no ✕, "Back" escape (the backdrop covers
       the stepper, so Back is the only way out besides signing in / buying) */
    var closeBtn = m.querySelector('.btn-close');
    if (closeBtn) closeBtn.style.display = opts.block ? 'none' : '';
    var backBtn = m.querySelector('#sn-paywall-back');
    if (backBtn) backBtn.style.display = opts.block ? '' : 'none';
    var inst = bootstrap.Modal.getInstance(m);
    if (inst) inst.dispose();
    inst = new bootstrap.Modal(m, opts.block ? { backdrop: 'static', keyboard: false } : {});
    inst.show();
  }

  /* ── PAID-ONLY PAGES — add a body[data-page] id here to put a whole step behind the
     paywall. Trial/flagless sessions get the BLOCKING paywall modal and the step content
     is hidden; the gate.js silent revalidation may upgrade a legacy paid session moments
     after load, so we poll briefly and unlock in place when spv_t.paid lands. ── */
  var PAYWALLED_PAGES = ['report', 'pt'];
  function enforcePaywall() {
    var pageId = document.body.dataset.page || '';
    if (PAYWALLED_PAGES.indexOf(pageId) < 0 || cloudCreds()) return;
    var content = document.querySelector('.site-content');
    if (content) content.style.visibility = 'hidden';
    paywall({ block: true });
    var tries = 0;
    var iv = setInterval(function () {
      if (cloudCreds()) {                       // silent revalidation upgraded the session
        clearInterval(iv);
        if (content) content.style.visibility = '';
        var m = document.getElementById('sn-paywall-modal');
        if (m) { var bi = bootstrap.Modal.getInstance(m); if (bi) bi.hide(); }
      } else if (++tries > 40) clearInterval(iv);   // 20 s — covers the gate's 8 s silent revalidation + cold start
    }, 500);
  }

  // Public hook: re-render after project progress changes.
  window.SiteNav = {
    refresh() { buildStepper(); buildStepnav(); if (typeof applyI18n === 'function') applyI18n(); },
    paywall: paywall,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
