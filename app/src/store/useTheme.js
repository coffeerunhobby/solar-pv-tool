/* useTheme — React adapter over the legacy theme globals (js/theme.js: isDark,
   setTheme, applyTheme). theme.js keeps owning the cookie, the html[data-bs-theme]
   attribute, the OS-change listener and the mobile ± helper; this store just
   re-renders React consumers when the effective theme changes. */
import { useSyncExternalStore } from 'react';

let v = 0;
const subs = new Set();
const subscribe = (cb) => { subs.add(cb); return () => subs.delete(cb); };
const notify = () => subs.forEach((f) => { try { f(); } catch (e) {} });

/* OS-level change: theme.js already re-applies; we just re-render. */
matchMedia('(prefers-color-scheme:dark)').addEventListener('change', () => { v++; notify(); });

export function setDark(dark) {
  setTheme(dark);   // legacy global: writes the cookie + applyTheme()
  v++;
  notify();
}

export function useTheme() {
  useSyncExternalStore(subscribe, () => v);
  return { dark: isDark(), setDark };
}
