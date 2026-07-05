/* ExplainHost — renders the legacy Explain.block() HTML (trusted, page-built
   with live values) inside an .xpl-host, visible only while learning mode is
   on. Mirrors Explain.render() behavior; the toggle lives in the page header
   as <LearnToggle/>. */
import { useLearn } from '../store/useLearn.js';
import { useI18n } from '../store/useI18n.js';

export function LearnToggle({ id }) {
  const { t } = useI18n();
  const { on, setLearn } = useLearn();
  return (
    <label className="xpl-toggle">
      <input type="checkbox" id={id} checked={on} onChange={(e) => setLearn(e.target.checked)} />
      {' '}<span>{t('xpl.learnmode')}</span>
    </label>
  );
}

export default function ExplainHost({ id, html }) {
  const { on } = useLearn();
  return (
    <div id={id} className="xpl-host" style={{ display: on && html ? 'block' : 'none' }}
         dangerouslySetInnerHTML={{ __html: html || '' }} />
  );
}
