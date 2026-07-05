/* useI18n — React adapter over the legacy i18n globals (js/i18n.js: t, setLang,
   LANG_CURRENT). Ported pages render t() output directly and emit NO data-i18n
   attributes (the legacy applyI18n DOM-walker must never own React text nodes).
   changeLang still calls the legacy setLang (persists + syncs html[lang]), then
   bumps this store so every mounted component re-renders in the new language. */
import { useSyncExternalStore } from 'react';

let v = 0;
const subs = new Set();
const subscribe = (cb) => { subs.add(cb); return () => subs.delete(cb); };
const notify = () => subs.forEach((f) => { try { f(); } catch (e) {} });

export function changeLang(code) {
  setLang(code);          // legacy global: persists localStorage.lang + applyI18n()
  v++;
  notify();
}

export function useI18n() {
  useSyncExternalStore(subscribe, () => v);
  return { t, lang: LANG_CURRENT, changeLang };   // legacy globals, read live
}
