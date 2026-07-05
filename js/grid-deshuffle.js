/* grid-deshuffle.js — reversible OBFUSCATION for the data-grid PNGs.

   PURPOSE (obfuscation, NOT encryption): the grids ship inside the app (bundled
   for offline on mobile; served from CloudFront on web). This scrambles the
   stored PNG so a raw copy — unzipping the APK or `curl`-ing the CDN — is useless
   without also reversing this loader. The key material is present on the device
   (it MUST be, to decode offline), so a determined attacker with devtools / a heap
   dump can still recover it. It only deters CASUAL scraping of the derived
   Kt/temp/elevation/… grids. See the dev guide "grid OBFUSCATION".

   KEY MODEL (the "shuffle map + XOR" blob, cross-platform):
     The key is an explicit, opaque BLOB — a 256-byte block-permutation map plus a
     257-byte per-block XOR table (256 blocks + 1 border) — masked and base64'd.
     `GridObfus.init(blob)` expands it into an in-memory {perm, xk} cache ONCE at
     app open (module load); every decode reuses that cache. The blob is minted at
     build time by `deriveKey(passphrase)` → `serializeKey(...)`; only the opaque
     blob ships, never the passphrase. The SAME file runs in Node (build encoder,
     `require`) and the browser / Android WebView (classic global `GridObfus`), so
     the permutation can never drift between encode and decode.

   SCHEME (per the "shuffle + constant XOR" choice — byte-exact, no palettizing):
     1. Block-shuffle — the image is cut into an M×M grid of blocks
        (bW=floor(W/M), bH=floor(H/M)); the M·M interior blocks are permuted by the
        key's map. The right/bottom remainder strip (W,H not divisible by M) is LEFT
        IN PLACE — losslessly, encode and decode agree.
     2. Per-block constant XOR — every pixel is XORed with the key byte for its
        block position in the shuffled image. Constant within a block (equal
        neighbours stay equal → PNG compression mostly preserved); differs between
        blocks (breaks cross-block gradients). Reversible (XOR involution).

   Both steps are pure permutations / involutions on the raster, so decode∘encode
   is byte-exact — critical: the pixel value IS the physical measurement, and
   corrupting it would silently degrade the yield engine. (This is why we do NOT
   port the legacy PHP shuffleizer's palettize-then-XOR path — 255-colour + dither
   is lossy and would corrupt the grids.)

   Operates on the raw W×H 8-bit grayscale raster (row-major Uint8Array), i.e.
   AFTER a loader un-filters the PNG and BEFORE it remaps into month/lat/lon order. */

(function (root) {
  'use strict';

  var GRID_OBFUS_MATRIX = 16;                 // M — 256 interior blocks
  var N = GRID_OBFUS_MATRIX * GRID_OBFUS_MATRIX;

  /* ── deterministic generator (BUILD-time only: mints a key blob) ───────────
     integer math only → identical result in Node + browser. */
  function fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* Permutation P where P[destCell] = srcCell (Fisher-Yates on identity). */
  function buildPerm(nCells, key) {
    var rnd = mulberry32(fnv1a(key + ':perm'));
    var p = new Int32Array(nCells), i;
    for (i = 0; i < nCells; i++) p[i] = i;
    for (i = nCells - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = p[i]; p[i] = p[j]; p[j] = t;
    }
    return p;
  }
  /* Per-cell XOR byte + a dedicated byte for the remainder border. */
  function buildXor(nCells, key) {
    var xk = new Uint8Array(nCells + 1);       // [nCells] = border key
    for (var i = 0; i <= nCells; i++) xk[i] = fnv1a(key + ':xor:' + i) & 0xFF;
    return xk;
  }
  /* passphrase → explicit {perm, xk} key (the material a blob serializes). */
  function deriveKey(passphrase) {
    return { perm: buildPerm(N, passphrase), xk: buildXor(N, passphrase) };
  }

  /* ── blob (de)serialization: [256 perm][257 xk], lightly masked, base64 ─────
     The mask keeps the raw permutation/XOR bytes from sitting verbatim in the
     bundle; it is assembled back only in memory by init(). NOT a secret (it's in
     this file) — a scraping speed-bump, consistent with the obfuscation posture. */
  var BLOB_MASK = 0x5A;
  function _b64enc(u8) {
    if (typeof Buffer !== 'undefined') return Buffer.from(u8).toString('base64');
    var s = ''; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s);
  }
  function _b64dec(str) {
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(str, 'base64'));
    var s = atob(str), u = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return u;
  }
  function serializeKey(k) {
    var out = new Uint8Array(N + N + 1), i;
    for (i = 0; i < N; i++) out[i] = k.perm[i] & 0xFF;
    for (i = 0; i <= N; i++) out[N + i] = k.xk[i];
    for (i = 0; i < out.length; i++) out[i] ^= BLOB_MASK;
    return _b64enc(out);
  }
  function parseKey(b64) {
    var raw = _b64dec(b64), i;
    for (i = 0; i < raw.length; i++) raw[i] ^= BLOB_MASK;
    var perm = new Int32Array(N), xk = new Uint8Array(N + 1);
    for (i = 0; i < N; i++) perm[i] = raw[i];
    for (i = 0; i <= N; i++) xk[i] = raw[N + i];
    return { perm: perm, xk: xk };
  }

  /* ── the in-memory key (set once at app open) ───────────────────────────── */
  var _key = null;                             // {perm: Int32Array(256), xk: Uint8Array(257)}
  function init(blobOrKey) {
    if (typeof blobOrKey === 'string')            _key = parseKey(blobOrKey);   // opaque blob
    else if (blobOrKey && blobOrKey.perm)         _key = blobOrKey;             // explicit key
    else                                          _key = deriveKey(blobOrKey);  // passphrase (build)
    return _key;
  }
  function keyOf(opts) {
    if (opts && opts.key) return opts.key;
    if (_key) return _key;
    throw new Error('GridObfus: init(blob) must run before encode/decode');
  }

  /* ── raster ops (byte-exact) ─────────────────────────────────────────────── */
  function copyBlock(src, dst, sCx, sCy, dCx, dCy, bW, bH, W) {
    for (var ry = 0; ry < bH; ry++) {
      var sOff = (sCy * bH + ry) * W + sCx * bW;
      var dOff = (dCy * bH + ry) * W + dCx * bW;
      dst.set(src.subarray(sOff, sOff + bW), dOff);
    }
  }
  /* XOR every pixel by its block key in `buf` coordinates (region) or borderKey. */
  function xorPass(buf, W, H, M, bW, bH, xk) {
    var regionW = bW * M, regionH = bH * M, border = xk[M * M];
    for (var y = 0; y < H; y++) {
      var inRegY = y < regionH;
      var cyBase = inRegY ? ((y / bH) | 0) * M : -1;
      var rowOff = y * W;
      for (var x = 0; x < W; x++) {
        var k = (inRegY && x < regionW) ? xk[cyBase + ((x / bW) | 0)] : border;
        if (k) buf[rowOff + x] ^= k;
      }
    }
  }

  /* ENCODE (build-time): shuffle blocks, then XOR by destination-block key. */
  function encode(img, W, H, opts) {
    var M = GRID_OBFUS_MATRIX, k = keyOf(opts), P = k.perm, xk = k.xk;
    var bW = (W / M) | 0, bH = (H / M) | 0, n = N;
    var out = new Uint8Array(img);             // copy → keeps the remainder strip
    for (var dest = 0; dest < n; dest++) {
      var src = P[dest];
      copyBlock(img, out, src % M, (src / M) | 0, dest % M, (dest / M) | 0, bW, bH, W);
    }
    xorPass(out, W, H, M, bW, bH, xk);
    return out;
  }
  /* DECODE (runtime): un-XOR, then inverse-shuffle → original raster. */
  function decode(img, W, H, opts) {
    var M = GRID_OBFUS_MATRIX, k = keyOf(opts), P = k.perm, xk = k.xk;
    var bW = (W / M) | 0, bH = (H / M) | 0, n = N;
    var tmp = new Uint8Array(img);
    xorPass(tmp, W, H, M, bW, bH, xk);         // tmp = shuffled-only
    var res = new Uint8Array(tmp);             // copy → keeps the remainder strip
    for (var dest = 0; dest < n; dest++) {
      var src = P[dest];
      copyBlock(tmp, res, dest % M, (dest / M) | 0, src % M, (src / M) | 0, bW, bH, W);
    }
    return res;
  }

  /* ── the shipped key blob — expanded into memory at load (app open) ─────────
     Minted once from the v1 passphrase (kept byte-compatible with grids already
     obfuscated under that key). To rotate: init(deriveKey('new-pass')),
     serializeKey() it, paste below, and re-obfuscate + redeploy all grids. */
  var KEY_BLOB = '8cchbWcP8mFBY+0zie+yB+YldwCDOBSXo4X6KcKsAZWzy3gLBHGQK3xFOXWYe7f+NofMF9pWtXTVDbYDveECUMRJT2iir+uc99Y09de+MLuIGtEd9CBanflbSGt2yWY9evgGTBgfhsPKVehgLp4FbxPPalS0TqSUrfxEMjGBSnIOFi3l8/DbX/bTkeS4UmT7GcY6ElzSCdlRoYo+eUYeyEc7WDySNySn30AnbquwTepifhyEU5aTS2XdFZkqJuN9vBvOLMGg4otdKOmbf4+mCO4/upq/gF7s/ahDjtxXWd41bKovEOBwzblCc7EKqSIMaaWMI8CN2MWC0Oeu1P+fEbAnng3EayJRCL9t/geQsQJLJMVWRvUYj4o5rNPuHX/IpTaDHOl653CwJ54NxGsiUQi/yVrjfIUWXyhxwgKxJEv+bZAHmgm7FOFyd8BdLhPsHIN66ch/NqWEKxXmL7hZKnPMvQ5fKIUW43zJWsdQptV47+oZjDPOfc1e53AR4iuEpTbUezKhgDfuHazTm3TBUlcgvQ5zzOIRhCtezXDneumpOkPcZfY/iNGikAf+bSRLArFonyewDZ5rxFEivwguXcB3cuEUu4Y1Ho0wp6LRROv2ZRfgfc5bNIES73gsUwq5mA/GdVT7Jbb/SGn6A5xN3vppnAO2JUj/YpHzTNmqrziV';
  init(KEY_BLOB);

  var GridObfus = {
    MATRIX: GRID_OBFUS_MATRIX,
    encode: encode, decode: decode,
    init: init, deriveKey: deriveKey, serializeKey: serializeKey, parseKey: parseKey,
    _fnv1a: fnv1a, _buildPerm: buildPerm,      // exposed for tests
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = GridObfus;
  else root.GridObfus = GridObfus;
})(typeof self !== 'undefined' ? self : this);
