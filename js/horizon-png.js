/* horizon-png.js - terrain-horizon tile PNG loader (mirrors kt-png.js).
   Decodes data/horizon-<name>.png built by scripts/build-horizon-tile.js.

   PNG layout:  width = NLONS x A (azimuth layers side-by-side), height = NLATS (8-bit gray, Sub filter).
                Row r = lat index (r=0 -> latMin); within row: col [l*NLONS + c] = azimuth-layer l, lon c.
   Encoding:    pixel = round(horizonDeg x 2)   ->   decode deg = pixel / 2
   Azimuth:     layer l = (l * 360 / A) deg in NAV convention (0 = North, CW) - matches isShaded/buildHorizonArr.

   Returns Promise<Uint8Array> length A x NLATS x NLONS, canonical order  (l*NLATS + r)*NLONS + c  (raw pixels). */

async function loadHorizonPng(url, A, headers = {}) {
  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`loadHorizonPng: HTTP ${resp.status} for ${url}`);
  const buf  = await resp.arrayBuffer();
  const view = new DataView(buf);
  const u8   = new Uint8Array(buf);

  const width  = view.getUint32(16);   // NLONS x A
  const height = view.getUint32(20);    // NLATS
  const NLATS  = height, NLONS = width / A;

  /* collect IDAT */
  const parts = []; let pos = 33;
  while (pos + 8 <= buf.byteLength) {
    const len = view.getUint32(pos);
    const type = String.fromCharCode(u8[pos + 4], u8[pos + 5], u8[pos + 6], u8[pos + 7]);
    if (type === 'IEND') break;
    if (type === 'IDAT') parts.push(u8.slice(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const total = parts.reduce((s, c) => s + c.length, 0), idat = new Uint8Array(total);
  let o = 0; for (const p of parts) { idat.set(p, o); o += p.length; }

  /* inflate */
  const stream = new Blob([idat]).stream().pipeThrough(new DecompressionStream('deflate'));
  const raw = new Uint8Array(await new Response(stream).arrayBuffer());

  /* reconstruct Sub filter (BPP=1) + rearrange to (l*NLATS+r)*NLONS+c */
  const out = new Uint8Array(A * NLATS * NLONS);
  const stride = 1 + width;
  for (let r = 0; r < NLATS; r++) {
    const base = r * stride;            // filter byte at base (type 1 = Sub, assumed by builder)
    let prev = 0;
    for (let x = 0; x < width; x++) {
      const cur = (raw[base + 1 + x] + prev) & 0xFF; prev = cur;
      const l = (x / NLONS) | 0, c = x - l * NLONS;
      out[(l * NLATS + r) * NLONS + c] = cur;
    }
  }
  return out;
}
