/* routes.jsx — the SPA route registry. PORTED_PATHS (src/ported.js) is the
   single source of which .html paths the app owns; this file binds each to its
   page component + flags:
     gated:     the gate overlay is required (all 16 workflow steps; the
                reference DB pages + theory are UNGATED today — parity kept)
     paywalled: whole-page paywall (legacy PAYWALLED_PAGES = report, pt)
   RouteFrame sets document.body.dataset.page per route — this keeps the shared
   @media print scoping in css/style.css working — and renders the Shell chrome. */
import { Component, useLayoutEffect } from 'react';
import { useGate } from './gate/GateProvider.jsx';
import GateOverlay from './gate/GateOverlay.jsx';
import Shell from './chrome/Shell.jsx';
import { useProjectIdentity } from './store/useProject.js';
import Pilot from './pages/Pilot.jsx';
import Theory from './pages/Theory.jsx';
import Batteries from './pages/Batteries.jsx';
import Inverters from './pages/Inverters.jsx';
import Modules from './pages/Modules.jsx';
import Recalc from './pages/Recalc.jsx';
import Consumption from './pages/Consumption.jsx';
import Obstacles from './pages/Obstacles.jsx';
import Components from './pages/Components.jsx';
import Strings from './pages/Strings.jsx';
import Connections from './pages/Connections.jsx';
import Protections from './pages/Protections.jsx';
import Economics from './pages/Economics.jsx';
import Wind from './pages/Wind.jsx';
import Report from './pages/Report.jsx';
import Location from './pages/Location.jsx';
import Mounting from './pages/Mounting.jsx';
import Yield from './pages/Yield.jsx';
import Schema from './pages/Schema.jsx';
import Defectoscopy from './pages/Defectoscopy.jsx';
import Pt from './pages/Pt.jsx';

export const ROUTES = [
  { path: '/app-pilot.html', id: 'app-pilot', title: 'SPA pilot - Earth Energy Engine',
    gated: false, Component: Pilot },
  { path: '/theory.html',    id: 'theory',    title: 'Teorie (Anexa 1) - Earth Energy Engine',
    gated: false, Component: Theory },
  { path: '/batteries.html', id: 'bat-db',    title: 'Bază acumulatori - Earth Energy Engine',
    gated: false, Component: Batteries },
  { path: '/inverters.html', id: 'inv-db',    title: 'Bază invertoare - Earth Energy Engine',
    gated: false, Component: Inverters },
  { path: '/modules.html',   id: 'mod-db',    title: 'Bază module - Earth Energy Engine',
    gated: false, Component: Modules },
  { path: '/recalc.html',    id: 'recalc',    title: 'Recalculare - Earth Energy Engine',
    gated: true, Component: Recalc },
  { path: '/consumption.html', id: 'consumption', title: 'Consum - Earth Energy Engine',
    gated: true, Component: Consumption },
  { path: '/obstacles.html',   id: 'obstacles', title: 'Obstacole - Earth Energy Engine',
    gated: true, Component: Obstacles },
  { path: '/components.html',  id: 'components', title: 'Componente - Earth Energy Engine',
    gated: true, Component: Components },
  { path: '/strings.html',     id: 'strings', title: 'Conectare șiruri - Earth Energy Engine',
    gated: true, Component: Strings },
  { path: '/connections.html', id: 'connections', title: 'Conexiuni electrice - Earth Energy Engine',
    gated: true, Component: Connections },
  { path: '/protections.html', id: 'protections', title: 'Protecții - Earth Energy Engine',
    gated: true, Component: Protections },
  { path: '/economics.html',   id: 'economics', title: 'Analiză economică - Earth Energy Engine',
    gated: true, Component: Economics },
  { path: '/wind.html',        id: 'wind', title: 'Sarcini de vânt - Earth Energy Engine',
    gated: true, Component: Wind },
  { path: '/report.html',      id: 'report', title: 'Raport - Earth Energy Engine',
    gated: true, paywalled: true, Component: Report },
  { path: '/index.html',       id: 'location', title: 'Earth Energy Engine',
    gated: true, Component: Location },
  { path: '/',                 id: 'location', title: 'Earth Energy Engine',
    gated: true, Component: Location },
  { path: '/mounting.html',    id: 'mounting', title: 'Amplasare module - Earth Energy Engine',
    gated: true, Component: Mounting },
  { path: '/yield.html',       id: 'yield', title: 'Producție - Earth Energy Engine',
    gated: true, Component: Yield },
  { path: '/schema.html',      id: 'schema', title: 'Schemă electrică - Earth Energy Engine',
    gated: true, Component: Schema },
  { path: '/defectoscopy.html', id: 'defectoscopy', title: 'Defectoscopie - Earth Energy Engine',
    gated: true, Component: Defectoscopy },
  { path: '/pt.html',          id: 'pt', title: 'Proiect Tehnic - Earth Energy Engine',
    gated: true, paywalled: true, Component: Pt },
];

/* Page-level error boundary: a calc crash inside one page must degrade to an
   inline message, not blank the whole app (the router's default boundary
   unmounts the chrome). Legacy parity: an uncaught error in a legacy page's
   script left the page chrome intact too. */
class PageBoundary extends Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { console.error('[page error]', err); }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.err) this.setState({ err: null }); }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 24, fontSize: 13 }}>
          <p style={{ color: 'var(--text2)' }}>⚠ A apărut o eroare pe această pagină. / This page hit an error.</p>
          <pre style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'pre-wrap' }}>{String(this.state.err && this.state.err.message)}</pre>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => location.reload()}>↻ Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function RouteFrame({ route }) {
  const gate = useGate();
  const identity = useProjectIdentity();   // full remount on import / reset / RO switch

  useLayoutEffect(() => {
    document.body.dataset.page = route.id;   // print CSS + page-scoped styles key off this
    document.title = route.title;
  }, [route]);

  const mapEntry = SITE_MAP.find((e) => e.id === route.id) || { id: route.id };
  const entry = { ...mapEntry, paywalled: route.paywalled };
  const Page = route.Component;

  return (
    <>
      <Shell entry={entry}>
        <PageBoundary resetKey={route.id + ':' + identity}>
          <Page key={identity} />
        </PageBoundary>
      </Shell>
      {route.gated && gate.status === 'gate' && <GateOverlay />}
    </>
  );
}
