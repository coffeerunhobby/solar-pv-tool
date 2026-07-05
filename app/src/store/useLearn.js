/* useLearn — React adapter over the legacy Explain learning-mode flag
   (js/explain.js, localStorage 'spv_learn'). Explain.block()/render() HTML
   builders stay legacy; React components read `on` and render blocks via
   dangerouslySetInnerHTML inside an .xpl-host. */
import { useSyncExternalStore } from 'react';

let v = 0;
const subs = new Set();
const subscribe = (cb) => { subs.add(cb); return () => subs.delete(cb); };
const notify = () => subs.forEach((f) => { try { f(); } catch (e) {} });

export function setLearn(on) {
  Explain.set(on);   // legacy global — persists spv_learn
  v++;
  notify();
}

export function useLearn() {
  useSyncExternalStore(subscribe, () => v);
  return { on: Explain.isOn(), setLearn };
}
