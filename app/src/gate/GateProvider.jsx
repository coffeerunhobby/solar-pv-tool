/* GateProvider — React replacement for js/gate.js (which the shell does NOT load).
   Same contract, verbatim:
   - session in localStorage 'spv_t' as {email, key, ts, paid?}
   - POST {email, key, service:'solar-pv'} to the shared Lambda; 8 s silent /
     20 s interactive timeouts; silent network error passes a stored session
     through (Lambda outage never locks users out); fresh login fails closed
   - magic link ?e=EMAIL&k=KEY parsed at boot on ANY route → prefilled overlay
     with the "payment confirmed" copy; URL stripped on success
   - fires window.onGateAuthed() after auth (share.js chains its ?share= landing
     off this hook — share.js is loaded untouched in the shell)
   - exposes window.gateLogout() (used by the account menu; legacy contract)
   The MutationObserver anti-tamper is gone BY DESIGN: React renders the gated
   route's content only while authed — there is nothing to un-hide. */
import { createContext, useContext, useEffect, useState } from 'react';

const GATE_KEY      = 'spv_t';
const GATE_ENDPOINT = 'https://n3ky9b78wh.execute-api.eu-central-1.amazonaws.com/';
const GATE_SERVICE  = 'solar-pv';

/* Magic link — captured once at module load, before the router mounts. */
const _boot = new URLSearchParams(location.search);
export const magicEmail = _boot.get('e') || '';
export const magicKey   = _boot.get('k') || '';

export async function validate(email, key, interactive) {
  try {
    const r = await fetch(GATE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, key, service: GATE_SERVICE }),
      signal: AbortSignal.timeout(interactive ? 20000 : 8000),
    });
    if (!r.ok) return false;
    const j = await r.json();
    return j.valid === true ? 'paid' : false;
  } catch { return null; }   // network/CORS error
}

export function stored() {
  try {
    const v = JSON.parse(localStorage.getItem(GATE_KEY));
    if (v && typeof v.email === 'string' && v.email && typeof v.key === 'string' && v.key) return v;
    return null;
  } catch { return null; }
}
export function store(email, key, status) {
  const v = { email, key, ts: Date.now() };
  if (status === 'paid') v.paid = true;
  localStorage.setItem(GATE_KEY, JSON.stringify(v));
}
export function cloudCreds() {
  try { const v = JSON.parse(localStorage.getItem(GATE_KEY)); return !!(v && v.email && v.key && v.paid); }
  catch { return false; }
}

function afterAuth() { try { if (typeof window.onGateAuthed === 'function') window.onGateAuthed(); } catch (e) {} }

const GateCtx = createContext({ status: 'checking' });
export const useGate = () => useContext(GateCtx);

export function GateProvider({ children }) {
  /* 'checking' → silent revalidation in flight (page visible, parity with legacy)
     'authed'   → through the gate
     'gate'     → show the login overlay on gated routes */
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    window.gateLogout = function () {
      try { localStorage.removeItem(GATE_KEY); } catch (e) {}
      location.reload();
    };
    let dead = false;
    (async () => {
      const s = stored();
      if (s) {
        const ok = await validate(s.email, s.key, false);          // silent
        if (dead) return;
        if (ok === 'paid') {
          if (!s.paid) store(s.email, s.key, 'paid');              // upgrade pre-flag sessions
          setStatus('authed'); afterAuth(); return;
        }
        if (ok === null) { setStatus('authed'); afterAuth(); return; }  // outage → pass through
        try { localStorage.removeItem(GATE_KEY); } catch (e) {}    // invalid/expired
      }
      setStatus('gate');
    })();
    return () => { dead = true; };
  }, []);

  const value = {
    status,
    authed: status === 'authed',
    onAuthed() { setStatus('authed'); afterAuth(); },
  };
  return <GateCtx.Provider value={value}>{children}</GateCtx.Provider>;
}
