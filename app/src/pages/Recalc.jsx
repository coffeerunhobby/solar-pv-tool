/* Recalculation (step 7) — React port of recalc.html: demand vs supply metrics,
   reconciliation rows, verdict, consumption-vs-production chart, learning-mode
   working. Pure aggregation over Project state (consumption + sizing +
   components) — live-reactive via useProject. */
import { useEffect } from 'react';
import { useI18n } from '../store/useI18n.js';
import { useProject } from '../store/useProject.js';
import { useTheme } from '../store/useTheme.js';
import ChartCanvas from '../components/ChartCanvas.jsx';
import ExplainHost, { LearnToggle } from '../components/ExplainHost.jsx';
import SmartLink from '../components/SmartLink.jsx';
import './Recalc.css';

const MNAMES_RO = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec'];
const MNAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt0 = (v) => Math.round(v).toLocaleString();
const sgn = (v) => (v > 0 ? '+' : '') + fmt0(v);

export default function Recalc() {
  const { t, lang } = useI18n();
  const { dark } = useTheme();
  const cons   = useProject((s) => s.consumption || {});
  const sizing = useProject((s) => s.sizing || {});
  const comp   = useProject((s) => s.components || {});
  const months = lang === 'en' ? MNAMES_EN : MNAMES_RO;

  /* Demand */
  const consMonthly = (Array.isArray(cons.monthly) && cons.monthly.length === 12)
    ? cons.monthly.slice()
    : (cons.annualKwh ? new Array(12).fill(cons.annualKwh / 12) : new Array(12).fill(0));
  const annualConsum = consMonthly.reduce((a, b) => a + (b || 0), 0) || (cons.annualKwh || 0);
  const coverage = cons.coverage != null ? cons.coverage : 100;
  const designKwh = cons.designKwh != null ? cons.designKwh : (annualConsum * coverage / 100);

  /* Supply (from Yield) */
  const prodMonthly = (Array.isArray(sizing.monthlyProd) && sizing.monthlyProd.length === 12) ? sizing.monthlyProd.slice() : null;
  const annualProd = sizing.annualProdKwh != null ? sizing.annualProdKwh
    : (prodMonthly ? prodMonthly.reduce((a, b) => a + (b || 0), 0) : null);

  const installedKwp = comp.pfvW != null ? comp.pfvW / 1000 : (sizing.pvgisKwp != null ? sizing.pvgisKwp : null);
  const atr = cons.maxPowerKw;

  const cov = (annualProd != null && annualConsum > 0) ? annualProd / annualConsum * 100 : null;
  const bal = annualProd != null ? annualProd - annualConsum : null;
  const specY = (annualProd != null && installedKwp) ? annualProd / installedKwp : null;

  /* Mark done once both demand and production are known (legacy behavior). */
  useEffect(() => {
    if (annualConsum > 0 && annualProd != null && !Project.isDone('recalc')) Project.markDone('recalc');
  }, [annualConsum, annualProd]);

  /* verdict */
  let verdictCls = 'ratio-box ratio-none', verdictHtml = t('rec.needconsum');
  if (annualProd == null) verdictHtml = t('rec.needyield');
  else if (annualConsum) {
    const meets = annualProd >= designKwh * 0.98;   // within 2% of the target counts as met
    const atrBad = atr != null && installedKwp != null && installedKwp > atr;
    const msgs = [meets ? t('rec.ok') : t('rec.under')];
    if (atrBad) msgs.push(t('rec.atrwarn'));
    verdictCls = 'ratio-box ' + (meets && !atrBad ? 'ratio-ok' : 'ratio-warn');
    verdictHtml = msgs.join('<br>');
  }

  /* learning-mode working (legacy Explain.block builders, live values) */
  let xp = '';
  if (typeof Explain !== 'undefined' && annualProd != null && annualConsum > 0) {
    xp += Explain.block('acoperire = E<sub>prod</sub> / E<sub>consum</sub>',
      fmt0(annualProd) + ' / ' + fmt0(annualConsum) + ' = <b>' + Math.round(cov) + ' %</b>', 'rxp.coverage');
    xp += Explain.block('bilanț = E<sub>prod</sub> − E<sub>consum</sub>',
      fmt0(annualProd) + ' − ' + fmt0(annualConsum) + ' = <b>' + sgn(bal) + ' kWh</b>', 'rxp.balance');
    if (installedKwp) {
      xp += Explain.block('y<sub>specific</sub> = E<sub>prod</sub> / P<sub>inst</sub>',
        fmt0(annualProd) + ' / ' + installedKwp.toFixed(2) + ' = <b>' + fmt0(annualProd / installedKwp) + ' kWh/kWp</b>', 'rxp.specyield');
    }
  }

  const kv = (k, v) => <div className="kv"><span className="k">{t(k)}</span><span className="v">{v}</span></div>;

  return (
    <>
      <div className="sn-crumb"><b>{t('nav.phaseB')}</b> › <span>{t('nav.recalc')}</span></div>
      <div className="rec-scroll">
        <div className="metric-grid" id="rec-metrics">
          <div className="metric">
            <div className="metric-val">{annualProd != null ? fmt0(annualProd) : '-'} <span style={{ fontSize: 12 }}>kWh</span></div>
            <div className="metric-lbl">{t('rec.prod')}</div>
            <div className="metric-sub">{installedKwp != null ? installedKwp.toFixed(2) + ' kWp' : '-'}</div>
          </div>
          <div className="metric">
            <div className="metric-val">{annualConsum ? fmt0(annualConsum) : '-'} <span style={{ fontSize: 12 }}>kWh</span></div>
            <div className="metric-lbl">{t('rec.consum')}</div>
            <div className="metric-sub">{t('rec.target')}: {designKwh ? fmt0(designKwh) + ' kWh' : '-'}</div>
          </div>
          <div className="metric">
            <div className="metric-val">{cov != null ? <>{Math.round(cov)} <span style={{ fontSize: 12 }}>%</span></> : '-'}</div>
            <div className="metric-lbl">{t('rec.coverage')}</div>
            <div className="metric-sub">{t('rec.prodVsConsum')}</div>
          </div>
          <div className="metric">
            <div className={'metric-val ' + (bal != null ? (bal >= 0 ? 'pos' : 'neg') : '')}>
              {bal != null ? sgn(bal) : '-'} <span style={{ fontSize: 12 }}>kWh</span></div>
            <div className="metric-lbl">{t('rec.balance')}</div>
            <div className="metric-sub">{bal != null ? t(bal >= 0 ? 'rec.surplus' : 'rec.deficit') : '-'}</div>
          </div>
        </div>

        <div className="row g-3" style={{ marginTop: 2 }}>
          <div className="col-lg-7">
            <div className="card">
              <div className="sec">{t('rec.chart')}</div>
              <div style={{ position: 'relative', height: 300 }}>
                <ChartCanvas id="rec-chart" ariaLabel="Consumption vs production chart"
                  deps={[JSON.stringify(consMonthly), JSON.stringify(prodMonthly), lang, dark]}
                  build={(el) => {
                    const datasets = [{
                      label: t('rec.consumShort'), data: consMonthly.map((v) => Math.round(v || 0)),
                      backgroundColor: '#e0533c', borderRadius: 3,
                    }];
                    if (prodMonthly) datasets.push({
                      label: t('rec.prodShort'), data: prodMonthly.map((v) => Math.round(v || 0)),
                      backgroundColor: '#1a9d4a', borderRadius: 3,
                    });
                    return new Chart(el, {
                      type: 'bar',
                      data: { labels: months, datasets },
                      options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: {
                          legend: { display: true, labels: { color: dark ? '#ccc' : '#444', boxWidth: 12, font: { size: 11 } } },
                          tooltip: { callbacks: { label: (c) => c.dataset.label + ': ' + c.raw + ' kWh' } },
                        },
                        scales: {
                          x: { grid: { color: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }, ticks: { color: dark ? '#aaa' : '#555' } },
                          y: { grid: { color: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }, ticks: { color: dark ? '#aaa' : '#555', callback: (v) => v + ' kWh' } },
                        },
                      },
                    });
                  }} />
              </div>
            </div>
          </div>
          <div className="col-lg-5">
            <div className="card">
              <div className="sec" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t('rec.reconcile')}</span>
                <LearnToggle id="rec-learn" />
              </div>
              <div id="rec-rows">
                {kv('rec.installed', installedKwp != null ? installedKwp.toFixed(2) + ' kWp' : '-')}
                {kv('rec.targetpow', cons.targetKwp != null ? (+cons.targetKwp).toFixed(2) + ' kWp' : '-')}
                {kv('rec.specyield', specY != null ? fmt0(specY) + ' kWh/kWp' : '-')}
                {kv('rec.targetenergy', designKwh ? fmt0(designKwh) + ' kWh' : '-')}
                {kv('rec.atr', atr != null ? atr + ' kW' : '-')}
              </div>
              <div id="rec-verdict" className={verdictCls} dangerouslySetInnerHTML={{ __html: verdictHtml }} />
              <ExplainHost id="rec-explain" html={xp} />
              <div className="rec-links">
                <SmartLink href="consumption.html">↩ <span>{t('nav.consumption')}</span></SmartLink>
                <SmartLink href="components.html">↩ <span>{t('nav.components')}</span></SmartLink>
                <SmartLink href="yield.html">↩ <span>{t('nav.yield')}</span></SmartLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
