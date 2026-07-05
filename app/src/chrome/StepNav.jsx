/* StepNav — React port of site-nav.js buildStepnav()/navBtn()/printBtn().
   The legacy window.saveStep flush contract is gone by design: ported pages
   persist on input, so Prev/Next are plain navigation. Reference pages get the
   "resume from the current workflow step" behavior, workflow pages prev/next.
   The amber sn-hint dot nudges when the current step isn't marked done. */
import { Link } from 'react-router-dom';
import { useI18n } from '../store/useI18n.js';
import { useProject } from '../store/useProject.js';
import { PORTED_PATHS } from '../ported.js';

function NavBtn({ step, dir, t, hint }) {
  if (!step) return <span className={'sn-nav-btn sn-' + dir + ' sn-disabled'}><b>{t('nav.' + dir)}</b></span>;
  const cls = 'sn-nav-btn sn-' + dir
    + (step.ready ? '' : ' sn-disabled')
    + (dir === 'next' ? ' sn-primary' : '')
    + (hint ? ' sn-hint' : '');
  const body = <><b>{t('nav.' + dir)}</b><small>{t(step.i18n)}</small></>;
  const title = hint ? t('nav.hintnotdone') : undefined;
  if (!step.ready) return <span className={cls}>{body}</span>;
  return PORTED_PATHS.includes('/' + step.page)
    ? <Link to={'/' + step.page} className={cls} title={title}>{body}</Link>
    : <a href={'/' + step.page} className={cls} title={title}>{body}</a>;
}

export default function StepNav({ entry }) {
  const { t } = useI18n();
  useProject();   // done-state drives the resume target + the sn-hint dot
  const isRef = !!(entry && entry.icon);

  const print = (
    <button type="button" className="sn-nav-btn sn-print" title="Print / PDF" onClick={() => window.print()}>
      <b>🖨 <span>{t('nav.printpdf')}</span></b><small>{t('nav.printsub')}</small>
    </button>
  );

  if (isRef) {
    const resume = SITE_STEPS.find((s) => !Project.isDone(s.id)) || SITE_STEPS[SITE_STEPS.length - 1];
    const cls = 'sn-nav-btn sn-next sn-primary' + (resume && resume.ready ? '' : ' sn-disabled');
    const body = <><b>{t('nav.resume')}</b><small>{t(resume ? resume.i18n : 'nav.resume')}</small></>;
    return (
      <div id="site-stepnav" className="sn-stepnav">
        <span className="sn-nav-btn sn-disabled"><b>{t('nav.prev')}</b></span>
        <span className="sn-note">{t('nav.refnote')}</span>
        {resume && resume.ready
          ? (PORTED_PATHS.includes('/' + resume.page)
              ? <Link to={'/' + resume.page} className={cls}>{body}</Link>
              : <a href={'/' + resume.page} className={cls}>{body}</a>)
          : <span className={cls}>{body}</span>}
      </div>
    );
  }

  const idx   = SITE_STEPS.findIndex((s) => s.id === (entry && entry.id));
  const prevS = idx > 0 ? SITE_STEPS[idx - 1] : null;
  const nextS = idx >= 0 && idx < SITE_STEPS.length - 1 ? SITE_STEPS[idx + 1] : null;
  const hint  = !!(nextS && entry && !Project.isDone(entry.id));
  return (
    <div id="site-stepnav" className="sn-stepnav">
      <NavBtn step={prevS} dir="prev" t={t} />
      <span className="sn-spacer" />
      {print}
      <NavBtn step={nextS} dir="next" t={t} hint={hint} />
    </div>
  );
}
