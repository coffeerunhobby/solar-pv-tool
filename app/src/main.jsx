/* main.jsx — SPA boot. Runs AFTER all classic legacy scripts (module scripts are
   deferred): the globals (Project, t, SITE_MAP, Share, …) exist by now.
   share.js captured any ?share= token at its own load and chains off
   window.onGateAuthed, which GateProvider fires — the share landing flow is
   untouched. The ?e=&k= magic link is read by GateProvider at module load. */
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { GateProvider } from './gate/GateProvider.jsx';
import { ROUTES, RouteFrame } from './routes.jsx';

/* Defensive shim: nothing in the SPA calls the legacy save-on-navigate hook
   (ported pages persist on input), but stray legacy helpers may reference it. */
window.saveStep = function () {};

/* Any path the router doesn't own → full navigation (hands off to the legacy
   site). Can only happen via an in-app link bug — the server never serves the
   shell at unported paths. A sessionStorage guard prevents a reload loop if a
   misdeploy ever serves the shell at an unported path. */
function LegacyEscape() {
  const target = location.pathname + location.search + location.hash;
  const mark = 'spv_escape:' + location.pathname;
  let looped = false;
  try { looped = sessionStorage.getItem(mark) === '1'; sessionStorage.setItem(mark, '1'); } catch (e) {}
  if (!looped) { window.location.replace(target); return null; }
  return <p style={{ padding: 24 }}>Page not available. <a href="/">← Home</a></p>;
}

const router = createBrowserRouter([
  ...ROUTES.map((r) => ({ path: r.path, element: <RouteFrame route={r} /> })),
  { path: '*', element: <LegacyEscape /> },
]);

/* Cache the root on the container: Vite dev HMR re-executes this entry module,
   and calling createRoot twice on the same node is a React error. Prod runs once. */
const container = document.getElementById('root');
const root = container._spvRoot || (container._spvRoot = createRoot(container));
root.render(
  <GateProvider>
    <RouterProvider router={router} future={{ v7_startTransition: true }} />
  </GateProvider>
);
