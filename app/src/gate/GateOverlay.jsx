/* GateOverlay — pixel/selector-identical to gate.js's _showGate() markup:
   #gate-overlay / .gate-box / #gate-email / #gate-key / #gate-btn / #gate-err.
   css/style.css styles it; Playwright's GATE_SELECTOR ('#gate-overlay') matches.
   Error strings are the legacy ones verbatim (gate copy is EN by design). */
import { useEffect, useRef, useState } from 'react';
import { useGate, validate, store, magicEmail, magicKey } from './GateProvider.jsx';
import { useTheme } from '../store/useTheme.js';

export default function GateOverlay() {
  const gate = useGate();
  const fromPayment = !!(magicEmail && magicKey);
  const [err, setErr]   = useState('');
  const [busy, setBusy] = useState(false);
  const { dark, setDark } = useTheme();
  const emailRef = useRef(null), keyRef = useRef(null);

  useEffect(() => {
    const el = (magicEmail ? keyRef : emailRef).current;
    const id = setTimeout(() => el && el.focus(), 100);
    return () => clearTimeout(id);
  }, []);

  async function attempt() {
    const email = emailRef.current.value.trim().toLowerCase();
    const key   = keyRef.current.value.trim();   // case-sensitive — send as typed
    if (!email || !email.includes('@')) { setErr('Please enter a valid e-mail address.'); emailRef.current.focus(); return; }
    if (!key) { setErr('Please enter your password.'); keyRef.current.focus(); return; }
    setBusy(true); setErr('');
    const ok = await validate(email, key, true);
    if (ok === 'paid') {
      store(email, key, ok);
      history.replaceState(null, '', location.pathname);   // strip ?e=&k=
      gate.onAuthed();
    } else if (ok === null) {
      setErr('Connection error — please try again.'); setBusy(false);
    } else {
      setErr('Invalid e-mail or password. Check the email you received.');
      setBusy(false); keyRef.current.focus();
    }
  }

  const sub = fromPayment
    ? <>Payment confirmed. Your access has been created &mdash; click the button to enter.</>
    : <>Enter your e-mail and password received by email.<br/>Sun path &middot; Horizon &middot; Yield &middot; String sizing.</>;

  return (
    <div id="gate-overlay">
      <div className="gate-box">
        <div className="gate-title">
          <span id="gate-theme-icon" style={{ cursor: 'pointer', userSelect: 'none' }} title="Toggle theme"
                onClick={() => setDark(!dark)}>{dark ? '☀️' : '🌙'}</span> Solar PV Tool
        </div>
        <div className="gate-sub">{sub}</div>
        <input className="gate-input" id="gate-email" type="email" placeholder="your@email.com"
               autoComplete="email" defaultValue={magicEmail} ref={emailRef}
               onKeyDown={(e) => { if (e.key === 'Enter') keyRef.current.focus(); }} />
        <input className="gate-input" id="gate-key" type="text" placeholder="password"
               autoComplete="off" spellCheck="false" defaultValue={magicKey} ref={keyRef}
               onKeyDown={(e) => { if (e.key === 'Enter') attempt(); }} />
        <button className="gate-btn" id="gate-btn" disabled={busy} onClick={attempt}>{busy ? '…' : 'Unlock'}</button>
        <div className="gate-err" id="gate-err">{err}</div>
        <a className="gate-btn-alt" href="pay.html">Get access &rarr;</a>
        <a className="gate-link" href="subscribe.html">Newsletter</a>
        <a className="gate-link" href="https://discord.gg/zeQ6aWVFgS" target="_blank" rel="noreferrer">Discord</a>
        <a className="gate-link" href="mailto:294crhwtf@mozmail.com">Technical support</a>
      </div>
    </div>
  );
}
