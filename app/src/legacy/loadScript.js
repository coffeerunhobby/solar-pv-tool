/* loadScript — cached-promise lazy loader for legacy classic scripts + CSS the
   shell doesn't load up front (Leaflet + map.js are Location-only). A script
   loads ONCE per document; its globals persist for the session. */
const cache = {};

export function loadScript(src) {
  if (cache[src]) return cache[src];
  cache[src] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => { delete cache[src]; reject(new Error('failed to load ' + src)); };
    document.head.appendChild(s);
  });
  return cache[src];
}

export function loadCss(href) {
  if (document.querySelector('link[href="' + href + '"]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = href;
  document.head.appendChild(l);
}
