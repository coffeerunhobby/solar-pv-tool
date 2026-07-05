/* Theory (Anexa 1) — React port of theory.html. Three typeset formula sections
   (cell temperature, working voltages, working currents) whose worked examples
   substitute LIVE project values from Project.section('stringSizing') — same
   math as calcString() in string-ui.js, including the NMOT ±3% tolerance.
   Falls back to the Strings-page static defaults when no project has run yet. */
import { useI18n } from '../store/useI18n.js';
import { useProject } from '../store/useProject.js';
import './Theory.css';

const fnum = (v) => (+v).toFixed(2).replace(/\.?0+$/, '');

/* Stacked fraction + raw-HTML legend row helpers */
const Frac = ({ num, den }) => <span className="frac"><span className="num">{num}</span><span className="den">{den}</span></span>;
const Html = ({ tag: Tag = 'li', className, k, t }) => <Tag className={className} dangerouslySetInnerHTML={{ __html: t(k) }} />;

export default function Theory() {
  const { t } = useI18n();
  const ss = useProject((s) => s.stringSizing || {});
  const fromProject = ss.tamin != null;

  /* resolved inputs - project state, else the static Strings-page defaults */
  const tamin = ss.tamin != null ? +ss.tamin : -20;
  const tamax = ss.tamax != null ? +ss.tamax : 45;
  const gmin  = ss.gmin  != null ? +ss.gmin  : 100;
  const gmax  = ss.gmax  != null ? +ss.gmax  : 1000;
  const nmot  = ss.nmot  != null ? +ss.nmot  : 44;
  const voc   = ss.voc   != null ? +ss.voc   : 37.5;
  const vmp   = ss.vmp   != null ? +ss.vmp   : 31.0;
  const lv    = ss.lv    != null ? +ss.lv    : -0.30;
  const isc   = ss.isc   != null ? +ss.isc   : 13.8;
  const imp   = ss.imp   != null ? +ss.imp   : 12.9;
  const li    = ss.li    != null ? +ss.li    : 0.05;

  const nmotLo = nmot * (1 - 0.03);                                   // cold module (NMOT -3%)
  const nmotHi = nmot * (1 + 0.03);                                   // hot module  (NMOT +3%)
  const tcmin  = tamin + (nmotLo - 20) * gmin / 800;
  const tcmax  = tamax + (nmotHi - 20) * gmax / 800;
  const vocmax = voc * (1 + lv / 100 * (tcmin - 25));                 // V_OC rises as the cell cools
  const vmpmin = vmp * (1 + lv / 100 * (tcmax - 25));                 // V_mp falls as the cell heats
  const iscmax = isc * (1 + li / 100 * (tcmax - 25)) * gmax / 1000;   // I_SC peaks: hot + Gmax
  const impmax = imp * (1 + li / 100 * (tcmax - 25)) * gmax / 1000;   // I_mp operating peak: hot + Gmax

  return (
    <>
      <div className="sn-crumb"><b>{t('nav.phaseRef')}</b> › <span>{t('nav.theory')}</span></div>
      <div className="th-scroll">
        <div className="th-wrap">
          <div className={'th-src' + (fromProject ? '' : ' is-example')} id="th-src">
            {t(fromProject ? 'th.srcProject' : 'th.srcExample')}
          </div>

          {/* ═══ Section 1 · Cell temperature ═══ */}
          <section className="th-sec">
            <div className="th-title">{t('th.title')}</div>
            <Html tag="p" className="th-intro" k="th.intro" t={t} />

            <div className="th-eq">
              <div className="th-eq-cap">{t('th.tcminCap')}</div>
              <div className="th-math-row"><div className="th-math">
                <span className="mem"><i>T</i><sub>c,min</sub></span>
                <span className="rel">=</span>
                <span className="mem"><i>T</i><sub>a,min</sub> <span className="op">+</span> (NMOT<span className="op">-</span>20) <span className="op">·</span> <Frac num={<><i>G</i><sub>min</sub></>} den="800" /></span>
                <span className="rel">=</span>
                <span className="mem"><span id="v-tamin">{fnum(tamin)}</span> <span className="op">+</span> (<span id="v-nmotlo">{fnum(nmotLo)}</span><span className="op">-</span>20) <span className="op">·</span> <Frac num={fnum(gmin)} den="800" /></span>
                <span className="rel">=</span>
                <span className="mem"><span className="res" id="v-tcmin">{fnum(tcmin)}</span> <span className="unit">°C</span></span>
              </div></div>
            </div>

            <div className="th-eq">
              <div className="th-eq-cap">{t('th.tcmaxCap')}</div>
              <div className="th-math-row"><div className="th-math">
                <span className="mem"><i>T</i><sub>c,max</sub></span>
                <span className="rel">=</span>
                <span className="mem"><i>T</i><sub>a,max</sub> <span className="op">+</span> (NMOT<span className="op">-</span>20) <span className="op">·</span> <Frac num={<><i>G</i><sub>max</sub></>} den="800" /></span>
                <span className="rel">=</span>
                <span className="mem"><span id="v-tamax">{fnum(tamax)}</span> <span className="op">+</span> (<span id="v-nmothi">{fnum(nmotHi)}</span><span className="op">-</span>20) <span className="op">·</span> <Frac num={fnum(gmax)} den="800" /></span>
                <span className="rel">=</span>
                <span className="mem"><span className="res" id="v-tcmax">{fnum(tcmax)}</span> <span className="unit">°C</span></span>
              </div></div>
            </div>

            <div className="th-legend">
              <div className="lbl">{t('th.legend')}</div>
              <ul>
                <Html k="th.legTa" t={t} /><Html k="th.legNmot" t={t} /><Html k="th.legG" t={t} /><Html k="th.legTc" t={t} />
              </ul>
            </div>
          </section>

          {/* ═══ Section 2 · Working voltages ═══ */}
          <section className="th-sec">
            <div className="th-title">{t('th.title2')}</div>
            <Html tag="p" className="th-intro" k="th.intro2" t={t} />

            <div className="th-eq">
              <div className="th-eq-cap">{t('th.vocmaxCap')}</div>
              <div className="th-math-row"><div className="th-math">
                <span className="mem"><i>V</i><sub>OC,max</sub></span>
                <span className="rel">=</span>
                <span className="mem"><i>V</i><sub>OC</sub>(<i>T</i><sub>min</sub>)</span>
                <span className="rel">=</span>
                <span className="mem"><i>V</i><sub>OC,STC</sub> <span className="op">·</span> [1 <span className="op">+</span> <Frac num={<>λ<sub>V</sub></>} den="100" /> <span className="op">·</span> (<i>T</i><sub>min</sub> <span className="op">-</span> 25)]</span>
                <span className="rel">=</span>
                <span className="mem"><span id="v-voc">{fnum(voc)}</span> <span className="op">·</span> [1 <span className="op">+</span> <Frac num={fnum(lv)} den="100" /> <span className="op">·</span> (<span id="v-tmin">{fnum(tcmin)}</span> <span className="op">-</span> 25)]</span>
                <span className="rel">=</span>
                <span className="mem"><span className="res" id="v-vocmax">{fnum(vocmax)}</span> <span className="unit">V</span></span>
              </div></div>
            </div>

            <div className="th-eq">
              <div className="th-eq-cap">{t('th.vmpminCap')}</div>
              <div className="th-math-row"><div className="th-math">
                <span className="mem"><i>V</i><sub>mp,min</sub></span>
                <span className="rel">=</span>
                <span className="mem"><i>V</i><sub>mp</sub>(<i>T</i><sub>max</sub>)</span>
                <span className="rel">=</span>
                <span className="mem"><i>V</i><sub>mp,STC</sub> <span className="op">·</span> [1 <span className="op">+</span> <Frac num={<>λ<sub>V</sub></>} den="100" /> <span className="op">·</span> (<i>T</i><sub>max</sub> <span className="op">-</span> 25)]</span>
                <span className="rel">=</span>
                <span className="mem"><span id="v-vmp">{fnum(vmp)}</span> <span className="op">·</span> [1 <span className="op">+</span> <Frac num={fnum(lv)} den="100" /> <span className="op">·</span> (<span id="v-tmax">{fnum(tcmax)}</span> <span className="op">-</span> 25)]</span>
                <span className="rel">=</span>
                <span className="mem"><span className="res" id="v-vmpmin">{fnum(vmpmin)}</span> <span className="unit">V</span></span>
              </div></div>
            </div>

            <div className="th-legend">
              <div className="lbl">{t('th.legend')}</div>
              <ul>
                <Html k="th.legVocstc" t={t} /><Html k="th.legVmpstc" t={t} /><Html k="th.legLv" t={t} />
                <Html k="th.legTmin" t={t} /><Html k="th.legTmax" t={t} />
                <Html k="th.legVocmax" t={t} /><Html k="th.legVmpmin" t={t} />
              </ul>
            </div>
          </section>

          {/* ═══ Section 3 · Working currents ═══ */}
          <section className="th-sec">
            <div className="th-title">{t('th.title3')}</div>
            <Html tag="p" className="th-intro" k="th.intro3" t={t} />

            <div className="th-eq">
              <div className="th-eq-cap">{t('th.iscmaxCap')}</div>
              <div className="th-math-row"><div className="th-math">
                <span className="mem"><i>I</i><sub>SC,max</sub></span>
                <span className="rel">=</span>
                <span className="mem"><i>I</i><sub>SC</sub>(<i>G</i><sub>max</sub>, <i>T</i><sub>max</sub>)</span>
                <span className="rel">=</span>
                <span className="mem"><i>I</i><sub>SC,STC</sub> <span className="op">·</span> [1 <span className="op">+</span> <Frac num={<>λ<sub>I</sub></>} den="100" /> <span className="op">·</span> (<i>T</i><sub>max</sub> <span className="op">-</span> 25)] <span className="op">·</span> <Frac num={<><i>G</i><sub>max</sub></>} den="1000" /></span>
                <span className="rel">=</span>
                <span className="mem"><span id="v-isc">{fnum(isc)}</span> <span className="op">·</span> [1 <span className="op">+</span> <Frac num={fnum(li)} den="100" /> <span className="op">·</span> (<span id="v-tmax2">{fnum(tcmax)}</span> <span className="op">-</span> 25)] <span className="op">·</span> <Frac num={fnum(gmax)} den="1000" /></span>
                <span className="rel">=</span>
                <span className="mem"><span className="res" id="v-iscmax">{fnum(iscmax)}</span> <span className="unit">A</span></span>
              </div></div>
            </div>

            <div className="th-eq">
              <div className="th-eq-cap">{t('th.impmaxCap')}</div>
              <div className="th-math-row"><div className="th-math">
                <span className="mem"><i>I</i><sub>mp,max</sub></span>
                <span className="rel">=</span>
                <span className="mem"><i>I</i><sub>mp</sub>(<i>G</i><sub>max</sub>, <i>T</i><sub>max</sub>)</span>
                <span className="rel">=</span>
                <span className="mem"><i>I</i><sub>mp,STC</sub> <span className="op">·</span> [1 <span className="op">+</span> <Frac num={<>λ<sub>I</sub></>} den="100" /> <span className="op">·</span> (<i>T</i><sub>max</sub> <span className="op">-</span> 25)] <span className="op">·</span> <Frac num={<><i>G</i><sub>max</sub></>} den="1000" /></span>
                <span className="rel">=</span>
                <span className="mem"><span id="v-imp">{fnum(imp)}</span> <span className="op">·</span> [1 <span className="op">+</span> <Frac num={fnum(li)} den="100" /> <span className="op">·</span> (<span id="v-tmax3">{fnum(tcmax)}</span> <span className="op">-</span> 25)] <span className="op">·</span> <Frac num={fnum(gmax)} den="1000" /></span>
                <span className="rel">=</span>
                <span className="mem"><span className="res" id="v-impmax">{fnum(impmax)}</span> <span className="unit">A</span></span>
              </div></div>
            </div>

            <div className="th-legend">
              <div className="lbl">{t('th.legend')}</div>
              <ul>
                <Html k="th.legIscstc" t={t} /><Html k="th.legImpstc" t={t} /><Html k="th.legLi" t={t} />
                <Html k="th.legGmax" t={t} /><Html k="th.legTmax" t={t} />
                <Html k="th.legIscmax" t={t} /><Html k="th.legImpmax" t={t} />
              </ul>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
