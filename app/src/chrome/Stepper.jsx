/* Stepper — React port of site-nav.js buildStepper()/rowEl(). Reads the legacy
   SITE_MAP global; same class names so css/style.css applies unchanged.
   Ported routes render <Link> (instant SPA nav), everything else a plain
   <a href> (full page load into the legacy site) — the cross-boundary
   mechanism during the incremental migration. */
import { Link } from 'react-router-dom';
import { useI18n } from '../store/useI18n.js';
import { useProject } from '../store/useProject.js';
import { PORTED_PATHS } from '../ported.js';

/* Auto-number workflow steps exactly like site-nav.js. */
const numbers = {};
{
  let n = 0;
  SITE_MAP.forEach((e) => { if (e.id && !e.phase && !e.note && !e.icon) numbers[e.id] = ++n; });
}

function Row({ e, activeId, t }) {
  if (e.phase) return <div className="sn-phase"><span>{t(e.phase)}</span></div>;

  const isWorkflow = !e.icon && !e.note;
  const done       = isWorkflow && Project.isDone(e.id);
  const navigable  = e.page && e.ready && e.id !== activeId;
  const cls = 'sn-step'
    + (e.id === activeId ? ' sn-active' : '')
    + (e.note ? ' sn-locked' : '')
    + (e.icon ? ' sn-ref' : '')
    + (!e.note && !e.ready ? ' sn-soon' : '')
    + (done ? ' sn-done' : '');
  const badge = e.icon
    ? <span className="sn-ic">{e.icon}</span>
    : <span className="sn-badge">{e.note ? '⋯' : (done ? '✓' : numbers[e.id])}</span>;
  const body = <>{badge}<span className="sn-lbl">{t(e.i18n)}</span></>;
  const title = isWorkflow ? t(e.i18n) : undefined;

  if (!navigable) return e.note
    ? <div className={cls} title={title}>{body}</div>
    : <span className={cls} title={title}>{body}</span>;
  return PORTED_PATHS.includes('/' + e.page)
    ? <Link to={'/' + e.page} className={cls} title={title}>{body}</Link>
    : <a href={'/' + e.page} className={cls} title={title}>{body}</a>;
}

export default function Stepper({ activeId }) {
  const { t } = useI18n();
  useProject();   // re-render on markDone / project switch (done badges)
  return (
    <nav id="site-stepper">
      {SITE_MAP.map((e, i) => <Row key={e.id || 'ph' + i} e={e} activeId={activeId} t={t} />)}
    </nav>
  );
}
