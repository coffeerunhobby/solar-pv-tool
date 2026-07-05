/* Shell — the .site-shell chrome layout (React port of the per-page shell HTML +
   site-nav.js mount()): topbar, stepper sidebar, content column with read-only
   banner + print head + stepnav. Same ids/classes as the legacy shell contract
   so css/style.css (screen + @media print) applies unchanged.
   Also hosts the paywall enforcement for paywalled routes (report/pt):
   content is NOT rendered while locked; a 40×500 ms poll catches the gate's
   silent revalidation upgrading the session (legacy parity). */
import { useEffect, useState } from 'react';
import Topbar from './Topbar.jsx';
import Stepper from './Stepper.jsx';
import StepNav from './StepNav.jsx';
import PaywallModal from './PaywallModal.jsx';
import { useI18n } from '../store/useI18n.js';
import { useReadOnly } from '../store/useProject.js';
import { cloudCreds } from '../gate/GateProvider.jsx';

function ReadOnlyBanner() {
  const { t } = useI18n();
  const ro = useReadOnly();
  useEffect(() => {
    document.body.classList.toggle('spv-ro', ro);
    return () => document.body.classList.remove('spv-ro');
  }, [ro]);
  if (!ro) return null;
  let by = ''; try { by = localStorage.getItem('spv_ro_by') || ''; } catch (e) {}
  return (
    <div id="sn-ro-banner" className="sn-ro-banner">
      <span><span>{t('nav.robanner')}</span>{by && <span className="sn-ro-by"> · {by}</span>}</span>
      <button className="sn-ro-exit" id="sn-ro-exit"
              onClick={() => { Project.exitReadOnly(); location.href = 'index.html'; }}>
        {t('nav.exitro')}
      </button>
    </div>
  );
}

function PrintHead({ entry }) {
  const { t } = useI18n();
  if (!entry || entry.icon) return null;   // reference pages don't get the print head
  const idx  = SITE_STEPS.findIndex((s) => s.id === entry.id);
  if (idx < 0) return null;
  const meta = Project.section('meta') || {};
  return (
    <div className="print-head">
      <span className="ph-proj">{meta.projectName || meta.name || ''}</span>
      <span className="ph-step"><b>{idx + 1}.</b> <span>{t(entry.i18n)}</span></span>
    </div>
  );
}

export default function Shell({ entry, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [navOpen, setNavOpen]     = useState(false);
  const [paywall, setPaywall]     = useState(false);        // dialog flavor (cloud 401s)
  const locked = !!(entry && entry.paywalled) && !cloudCreds();
  const [unlocked, setUnlocked]   = useState(!locked);

  /* Paywalled route: poll briefly for the silent revalidation upgrading spv_t.paid
     (site-nav.js enforcePaywall parity — 40 × 500 ms ≈ 20 s). */
  useEffect(() => {
    if (!locked) { setUnlocked(true); return; }
    setUnlocked(false);
    let tries = 0;
    const iv = setInterval(() => {
      if (cloudCreds()) { clearInterval(iv); setUnlocked(true); }
      else if (++tries > 40) clearInterval(iv);
    }, 500);
    return () => clearInterval(iv);
  }, [locked, entry && entry.id]);

  function toggleNav() {
    if (window.innerWidth <= 900) setNavOpen((v) => !v);
    else setCollapsed((v) => !v);
  }

  const shellCls = 'site-shell' + (collapsed ? ' sn-collapsed' : '') + (navOpen ? ' sn-navopen' : '');
  return (
    <div className={shellCls}>
      <Topbar onToggleNav={toggleNav} onPaywall={() => setPaywall(true)} />
      <div className="site-body">
        <Stepper activeId={entry && entry.id} />
        <div className="site-content">
          <ReadOnlyBanner />
          <PrintHead entry={entry} />
          {unlocked ? children : null}
          <StepNav entry={entry} />
        </div>
      </div>
      {!unlocked && <PaywallModal block />}
      {paywall && <PaywallModal onClose={() => setPaywall(false)} />}
    </div>
  );
}
