/* useCatalog — React adapter over the js/catalog.js runtime equipment catalog.
   Subscribes to Catalog.onChange so any component re-renders when a sync applies a
   newer catalog: catalog.js mutates the MODULE_LIST / INVERTER_LIST / BATTERY_LIST
   globals IN PLACE, so a re-render re-reads the fresh rows through the same array
   reference the DB pages captured. Exposes sync() for the "Update catalog" button.
   Guards for the Catalog global being absent (a page/build without catalog.js). */
import { useSyncExternalStore } from 'react';

const has = () => typeof Catalog !== 'undefined';
const subscribe = (cb) => (has() ? Catalog.onChange(cb) : () => {});
const snapshot = () => (has() ? Catalog.version() : 0);

export function useCatalog() {
  useSyncExternalStore(subscribe, snapshot);
  return {
    dataVersion: has() ? Catalog.dataVersion() : 0,
    sync: () => (has() ? Catalog.sync() : Promise.resolve({ updated: false })),
  };
}
