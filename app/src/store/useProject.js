/* useProject — React adapter over the legacy global `Project` (js/project-state.js).
   project-state.js gained Project.onChange/version/identity (additive patch); the
   version INT is the store snapshot (the state object mutates in place, so the
   object itself can't be) and selectors read the live object after subscribing.
   All persistence / read-only / import / export logic stays in the legacy file. */
import { useSyncExternalStore } from 'react';

/* `Project` is a global lexical binding from the classic script — bare access. */
const subscribe = (cb) => Project.onChange(cb);

/* Re-render on every store bump; returns selector(state) (or the state itself). */
export function useProject(selector) {
  useSyncExternalStore(subscribe, () => Project.version());
  const s = Project.get();
  return selector ? selector(s) : s;
}

/* Bumps only when the WHOLE project is replaced (import / reset / RO enter+exit).
   Use as a `key` to fully remount page components on project identity change. */
export function useProjectIdentity() {
  return useSyncExternalStore(subscribe, () => Project.identity());
}

/* Read-only (shared view) flag, reactive. */
export function useReadOnly() {
  useSyncExternalStore(subscribe, () => Project.version());
  return Project.isReadOnly();
}
