/* Report (step 17) — React port of report.html: the full project summary
   rendered from Project state + the Invite / share-link flow.

   The legacy page rebuilt everything through render() (hooked to
   window.renderList for language switches); here the same HTML-string
   builders run on every React render — language / store changes re-render
   automatically via useI18n / useProject — and the result is injected via
   dangerouslySetInnerHTML (all dynamic values escaped, exactly like legacy).
   The share modal is React state instead of the static hidden element;
   Share errors show in the modal status line via t(Share.msgKey(status))
   (SPA deviation: no SiteNav.paywall for 401s — noted in the port report).
   Paywall enforcement lives in the Shell chrome (route flag), NOT here. */
import { useEffect, useState } from 'react';
import { useI18n } from '../store/useI18n.js';
import { useProject } from '../store/useProject.js';
import './Report.css';

/* ── helpers, verbatim from the legacy IIFE ── */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function num0(v) { return (v == null || isNaN(v)) ? null : Math.round(v).toLocaleString(); }
function MODS() { return (typeof MODULE_LIST !== 'undefined') ? MODULE_LIST : []; }
function INVS() { return (typeof INVERTER_LIST !== 'undefined') ? INVERTER_LIST : []; }
function modById(id) { return MODS().filter((m) => m.id === id)[0] || null; }
function invById(id) { return INVS().filter((i) => i.id === id)[0] || null; }

function kv(k, v) { return '<div class="kv"><span class="k">' + esc(k) + '</span><span class="v">' + (v == null || v === '' ? '<span style="color:var(--text3)">-</span>' : v) + '</span></div>'; }

/* Build the whole document with tr() so a language switch rebuilds everything
   in the new language (legacy render(), minus the actions block — that is JSX
   below so the Invite button gets a React handler). No data-i18n anywhere. */
function buildDoc(tr, lang, P) {
  const meta = P.meta || {}, loc = P.location || {}, cons = P.consumption || {},
        comp = P.components || {}, sizing = P.sizing || {}, mnt = P.mounting || {},
        strings = Array.isArray(P.strings) ? P.strings : [];

  function card(titleKey, rowsHtml) {
    return '<div class="card"><div class="sec">' + esc(tr(titleKey)) + '</div>' + rowsHtml + '</div>';
  }

  const who = [meta.first, meta.last].filter(Boolean).join(' ');
  const dateStr = new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'ro-RO');
  const head =
    '<div class="rep-head"><div><div class="rep-title">' + esc(meta.projectName || meta.name || who || tr('rep.deftitle')) + '</div>' +
    '<div class="rep-sub">' + esc(who) + (meta.address ? ' · ' + esc(meta.address) : '') + '</div></div>' +
    '<div class="rep-sub">' + esc(dateStr) + '</div></div>' +
    '<div class="rep-intro">' + esc(tr('rep.intro')) + '</div>';

  const clientCard = card('rep.client',
    kv(tr('nav.projectname'), meta.projectName ? esc(meta.projectName) : null) +
    kv(tr('nav.firstname'), meta.first ? esc(meta.first) : null) +
    kv(tr('nav.lastname'), meta.last ? esc(meta.last) : null) +
    kv(tr('nav.address'), meta.address ? esc(meta.address) : null));

  const locCard = card('rep.location',
    kv('Lat / Lon', (loc.lat != null && loc.lon != null) ? (+loc.lat).toFixed(4) + ', ' + (+loc.lon).toFixed(4) : null) +
    kv(tr('loc.elev'), loc.elevation != null ? Math.round(loc.elevation) + ' m' : null) +
    kv(tr('tz.title'), loc.tz != null ? 'UTC' + (loc.tz >= 0 ? '+' : '') + loc.tz : null));

  const consCard = card('rep.consum',
    kv(tr('con.annual'), num0(cons.annualKwh) ? num0(cons.annualKwh) + ' kWh' : null) +
    kv(tr('con.coverage'), cons.coverage != null ? cons.coverage + ' %' : null) +
    kv(tr('con.targetkwp'), cons.targetKwp != null ? (+cons.targetKwp).toFixed(2) + ' kWp' : null) +
    kv(tr('con.atr'), cons.maxPowerKw != null ? cons.maxPowerKw + ' kW' : null));

  const inv = invById(comp.inverterId);
  const totalKwp = strings.reduce((a, s) => { const m = modById(s.moduleId); return a + (m ? m.pmax * (s.count || 0) : 0); }, 0) / 1000;
  const totalPanels = strings.reduce((a, s) => a + (s.count || 0), 0);
  const strHtml = strings.length ? strings.map((s, i) => {
    const m = modById(s.moduleId);
    const kwp = m ? (m.pmax * (s.count || 0) / 1000).toFixed(2) : '?';
    return '<div class="strrow"><span>' + tr('cmp.stringlbl') + ' ' + (i + 1) + ' · ' + esc(m ? m.name.replace(/\s*\(.*\)$/, '') : (s.moduleId || '?')) + ' × ' + (s.count || 0) + '</span><span>' + kwp + ' kWp</span></div>';
  }).join('') : '';
  const compCard = card('rep.components',
    strHtml +
    kv(tr('cmp.pfv'), totalKwp > 0 ? totalKwp.toFixed(2) + ' kWp' : null) +
    kv(tr('cmp.inverter'), inv ? esc(inv.name) : null));

  /* β/γ are per-string → one row per string, then the shared layout params */
  const mntStrRows = strings.map((s, i) =>
    kv(tr('cmp.stringlbl') + ' ' + (i + 1),
      'β ' + (s.tilt != null ? s.tilt : '?') + '° · γ ' + (s.azimuth != null ? s.azimuth : '?') + '°')
  ).join('');
  const mntCard = card('rep.mounting',
    mntStrRows +
    kv(tr('mnt.mode'), mnt.mode ? tr(mnt.mode === 'ew' ? 'mnt.accordion' : 'mnt.single') : null) +
    kv(tr('mnt.pitch'), mnt.pitch != null ? (+mnt.pitch).toFixed(2) + ' m' : null) +
    kv(tr('mnt.gcr'), mnt.gcr != null ? Math.round(mnt.gcr * 100) + ' %' : null) +
    kv(tr('mnt.used'), strings.length ? (totalPanels + ' · ' + totalKwp.toFixed(2) + ' kWp') : null));

  /* String sizing (§11) - persisted by calcString on the String-connection step */
  const ss = P.stringSizing || {};
  const ssCard = (ss.nsMax != null) ? card('rep.stringsizing',
    kv(tr('rep.ss.series'),   ss.nsMin != null ? (ss.nsMin + ' - ' + ss.nsMax) : null) +
    kv(tr('rep.ss.opt'),      ss.nopt != null ? String(ss.nopt) : null) +
    kv(tr('rep.ss.parallel'), ss.npMax != null ? String(ss.npMax) : null) +
    kv(tr('rep.ss.rec'),      ss.recNs != null ? ('Ns = ' + ss.recNs + ' · Np = 1-' + ss.npMax) : null) +
    kv(tr('rep.ss.vstr'),     ss.stringVocCold != null ? (Math.round(ss.stringVocCold) + ' V ≤ ' + ss.vinvmax + ' V') : null) +
    kv(tr('rep.ss.ta'),       (ss.tamin != null && ss.tamax != null) ? (ss.tamin + ' °C … ' + ss.tamax + ' °C') : null) +
    kv(tr('rep.ss.g'),        (ss.gmin != null && ss.gmax != null) ? (ss.gmin + ' … ' + ss.gmax + ' W/m²') : null)) : '';

  const specY = (sizing.annualProdKwh != null && totalKwp > 0) ? sizing.annualProdKwh / totalKwp : null;
  const prodCard = card('rep.production',
    kv(tr('rec.prod'), num0(sizing.annualProdKwh) ? num0(sizing.annualProdKwh) + ' kWh' : null) +
    kv(tr('con.specyield'), specY != null ? num0(specY) + ' kWh/kWp' : null));

  const cov = (sizing.annualProdKwh != null && cons.annualKwh) ? sizing.annualProdKwh / cons.annualKwh * 100 : null;
  const bal = (sizing.annualProdKwh != null && cons.annualKwh != null) ? sizing.annualProdKwh - cons.annualKwh : null;
  const balCard = card('rep.balance',
    kv(tr('rec.coverage'), cov != null ? Math.round(cov) + ' %' : null) +
    kv(tr('rec.balance'), bal != null ? ((bal >= 0 ? '+' : '') + num0(bal) + ' kWh') : null));

  const anyData = !!(meta.projectName || meta.name || who || loc.lat != null || cons.annualKwh || strings.length || sizing.annualProdKwh != null);

  return head +
    (anyData ? '' : '<div class="card" style="color:var(--text3)">' + esc(tr('rep.empty')) + '</div>') +
    clientCard + locCard + consCard + compCard + mntCard + ssCard + prodCard + balCard;
}

export default function Report() {
  const { t, lang } = useI18n();
  const P = useProject();                       // whole state — re-renders on every store bump
  const [busy, setBusy]     = useState(false);  // Invite in flight
  const [modal, setModal]   = useState(null);   // null closed | { url, status }
  const [copied, setCopied] = useState(false);

  /* Visiting the report = workflow complete (legacy parity; the Stepper is
     reactive via useProject, so no SiteNav.refresh() needed). */
  useEffect(() => {
    if (!Project.isDone('report')) Project.markDone('report');
  }, []);

  /* Modal open → focus + select the link (legacy 30 ms defer); Escape closes. */
  useEffect(() => {
    if (!modal) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setModal(null); };
    document.addEventListener('keydown', onKey);
    let tm = null;
    if (modal.url) {
      tm = setTimeout(() => {
        const inp = document.getElementById('share-modal-url');
        if (inp) { inp.focus(); inp.select(); }
      }, 30);
    }
    return () => { document.removeEventListener('keydown', onKey); if (tm) clearTimeout(tm); };
  }, [modal]);

  /* Invite: save the project → token → open the share-link modal (mobile-friendly
     copy). Re-inviting returns the same token (Share.save reuses meta.projectRef;
     backend keeps the new values). Errors (incl. trial/unauthenticated 401) show
     in the modal status line via Share.msgKey — the SPA has no SiteNav.paywall. */
  function invite() {
    if (typeof Share === 'undefined') { window.alert(t('share.savefail')); return; }
    setBusy(true);
    Share.save(Project.export()).then((res) => {
      setModal({ url: Share.link(res.token), status: '' });
    }).catch((err) => {
      setModal({ url: '', status: t(Share.msgKey(err && err.status, true)) });
    }).then(() => setBusy(false));
  }

  /* Copy-to-clipboard with the legacy execCommand fallback. */
  function copy() {
    const input = document.getElementById('share-modal-url');
    if (input) input.select();
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1600); };
    const legacy = () => { try { document.execCommand('copy'); done(); } catch (e) {} };
    try { navigator.clipboard.writeText(modal ? modal.url : '').then(done, legacy); }
    catch (e) { legacy(); }
  }

  const docHtml = buildDoc(t, lang, P);

  return (
    <>
      <div className="sn-crumb"><b>{t('nav.phaseD')}</b> › <span>{t('nav.report')}</span></div>

      <div className="rep-scroll">
        <div className="rep-doc" id="rep-doc">
          <div dangerouslySetInnerHTML={{ __html: docHtml }} />
          {/* the PT button moved to the stepper (step 17) and "Șterge / proiect nou"
              lives in the avatar menu (Topbar) — only Invite remains here */}
          <div className="rep-actions">
            <button className="btn btn-outline-secondary" id="rep-invite" disabled={busy} onClick={invite}>
              {busy ? '…' : t('rep.invite')}
            </button>
            <span className="rep-hint">{t('rep.exporthint')}</span>
          </div>
        </div>
      </div>

      {/* Share-link modal (filled + shown by the Invite button) */}
      <div className="share-modal" id="share-modal" hidden={!modal}
           onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
        <div className="share-modal-box" role="dialog" aria-modal="true">
          <div className="share-modal-head">
            <span className="share-modal-title">{t('rep.sharetitle')}</span>
            <button className="share-modal-x" id="share-modal-x" aria-label="Close" onClick={() => setModal(null)}>&times;</button>
          </div>
          {modal && modal.url !== '' && (
            <div className="share-modal-row">
              <input id="share-modal-url" type="text" readOnly value={modal.url} onClick={(e) => e.target.select()} />
              <button className="btn btn-p" id="share-modal-copy" onClick={copy}>
                {copied ? t('share.copied') : t('share.copy')}
              </button>
            </div>
          )}
          {modal && modal.status !== '' && (
            <div className="share-modal-status" id="share-modal-status">{modal.status}</div>
          )}
          <div className="share-modal-hint">{t('rep.sharehint')}</div>
          <button className="btn btn-outline-secondary share-modal-close" id="share-modal-close" onClick={() => setModal(null)}>
            {t('rep.close')}
          </button>
        </div>
      </div>
    </>
  );
}
