/* data-loader.js — fetches binary grid files from CONFIG urls.
   Depends on: config.js (CONFIG, getAuthHeaders)

   Returns an ArrayBuffer — callers wrap it in the appropriate TypedArray.
   Works identically whether the URL is a CDN path or an authenticated API endpoint;
   only config.js and getAuthHeaders() need to change between phases. */

async function loadGrid(url) {
  const res = await fetch(url, {
    headers: getAuthHeaders(),
    /* No caching override — let CloudFront / browser handle it via Cache-Control headers */
  });
  if (!res.ok) throw new Error(`loadGrid(${url}): HTTP ${res.status} ${res.statusText}`);
  return res.arrayBuffer();
}
