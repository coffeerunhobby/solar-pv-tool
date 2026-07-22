#!/usr/bin/env node
/* shuffle-grids.cjs — build-time OBFUSCATOR for the data-grid PNGs.

   Reads an 8-bit grayscale PNG, applies GridObfus.encode (block-shuffle +
   per-block constant XOR, see js/grid-deshuffle.js), and re-encodes it in the
   canonical format every js/*-png.js loader expects: 8-bit grayscale, per-row
   Sub filter, zlib DEFLATE level 9. The browser loaders call GridObfus.decode
   after un-filtering, recovering the exact original raster.

   The SAME js/grid-deshuffle.js drives both sides, so the permutation can never
   drift between build and runtime.

   Usage:
     node scripts/shuffle-grids.cjs <in.png> <out.png>     # obfuscate one file
     node scripts/shuffle-grids.cjs --verify <a.png> [...]  # byte-exact round-trip + size report
     node scripts/shuffle-grids.cjs --dir <src> <dst> <f…>  # obfuscate a list into dst/

   Local source grids stay pristine; deploy.sh obfuscates into a staging dir. */

'use strict';
const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');
const GridObfus = require(path.join(__dirname, '..', 'js', 'grid-deshuffle.js'));

/* ── PNG read (8-bit grayscale, all 5 filter types, non-interlaced) ── */
function readGrayPng(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`${file}: not a PNG`);
  const W = buf.readUInt32BE(16), H = buf.readUInt32BE(20);
  const bitDepth = buf[24], colorType = buf[25], interlace = buf[28];
  if (bitDepth !== 8 || colorType !== 0) throw new Error(`${file}: need 8-bit grayscale (got depth ${bitDepth}, color ${colorType})`);
  if (interlace !== 0) throw new Error(`${file}: interlaced PNG unsupported`);

  const idat = [];
  let pos = 33;
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') idat.push(buf.subarray(pos + 8, pos + 8 + len));
    if (type === 'IEND') break;
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));

  /* un-filter (bpp = 1) → row-major pixel raster */
  const stride = 1 + W, px = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const ft = raw[y * stride];
    for (let x = 0; x < W; x++) {
      const v = raw[y * stride + 1 + x];
      const a = x > 0 ? px[y * W + x - 1] : 0;          // left
      const b = y > 0 ? px[(y - 1) * W + x] : 0;         // up
      const c = (x > 0 && y > 0) ? px[(y - 1) * W + x - 1] : 0; // up-left
      let recon;
      switch (ft) {
        case 0: recon = v; break;                        // None
        case 1: recon = v + a; break;                    // Sub
        case 2: recon = v + b; break;                    // Up
        case 3: recon = v + ((a + b) >> 1); break;       // Average
        case 4: {                                        // Paeth
          const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          recon = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); break;
        }
        default: throw new Error(`${file}: bad filter ${ft} at row ${y}`);
      }
      px[y * W + x] = recon & 0xFF;
    }
  }
  return { W, H, px };
}

/* ── PNG write (canonical: 8-bit grayscale, Sub filter, DEFLATE 9) ── */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
function crc32(buf) { let c = 0xFFFFFFFF; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) {
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii'), crc = Buffer.allocUnsafe(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
/* marker so loaders de-shuffle ONLY obfuscated grids (plain grids pass through
   untouched → local dev serves pristine PNGs unharmed). tEXt keyword 'obf'. */
const OBF_MARKER = chunk('tEXt', Buffer.from('obf\0v1', 'latin1'));
function writeGrayPng(file, px, W, H, opts) {
  opts = opts || {};
  const stride = 1 + W, filtered = Buffer.allocUnsafe(H * stride);
  for (let y = 0; y < H; y++) {
    filtered[y * stride] = 1;                             // Sub
    let prev = 0;
    for (let x = 0; x < W; x++) { const cur = px[y * W + x]; filtered[y * stride + 1 + x] = (cur - prev) & 0xFF; prev = cur; }
  }
  const idat = zlib.deflateSync(filtered, { level: 9, strategy: 1 });
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 0; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    opts.marker ? OBF_MARKER : Buffer.alloc(0),
    chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
  return png.length;
}

function obfuscate(inPath, outPath) {
  const { W, H, px } = readGrayPng(inPath);
  const obf = GridObfus.encode(px, W, H);
  const outBytes = writeGrayPng(outPath, obf, W, H, { marker: true });
  const inBytes = fs.statSync(inPath).size;
  return { W, H, inBytes, outBytes };
}

/* ── verify: encode → decode must equal the original raster, byte for byte ── */
function verify(file) {
  const { W, H, px } = readGrayPng(file);
  const obf = GridObfus.encode(px, W, H);
  const back = GridObfus.decode(obf, W, H);
  let firstBad = -1;
  for (let i = 0; i < px.length; i++) if (px[i] !== back[i]) { firstBad = i; break; }
  /* size cost: re-encode both plain and obfuscated with the SAME writer */
  const tmpPlain = path.join(require('os').tmpdir(), 'gsz-plain.png');
  const tmpObf   = path.join(require('os').tmpdir(), 'gsz-obf.png');
  const plainSz = writeGrayPng(tmpPlain, px, W, H);
  const obfSz   = writeGrayPng(tmpObf, obf, W, H);
  fs.unlinkSync(tmpPlain); fs.unlinkSync(tmpObf);
  return { W, H, ok: firstBad === -1, firstBad, plainSz, obfSz };
}

/* ── CLI ── */
const args = process.argv.slice(2);
if (args[0] === '--verify') {
  let allOk = true;
  console.log('round-trip (byte-exact) + size cost @ matrix ' + GridObfus.MATRIX + ':');
  for (const f of args.slice(1)) {
    const r = verify(f);
    allOk = allOk && r.ok;
    const grow = ((r.obfSz / r.plainSz - 1) * 100).toFixed(1);
    console.log(`  ${r.ok ? '✓' : '✗ CORRUPT@' + r.firstBad} ${path.basename(f).padEnd(20)} ${r.W}×${r.H}  ` +
                `plain ${(r.plainSz / 1024).toFixed(0)}KB → obf ${(r.obfSz / 1024).toFixed(0)}KB (${grow > 0 ? '+' : ''}${grow}%)`);
  }
  process.exit(allOk ? 0 : 1);
} else if (args[0] === '--dir') {
  const [, src, dst, ...files] = args;
  fs.mkdirSync(dst, { recursive: true });
  for (const f of files) {
    const r = obfuscate(path.join(src, f), path.join(dst, f));
    console.log(`  obfuscated ${f} ${r.W}×${r.H} (${(r.inBytes / 1024).toFixed(0)}→${(r.outBytes / 1024).toFixed(0)}KB)`);
  }
} else if (args.length === 2) {
  const r = obfuscate(args[0], args[1]);
  console.log(`obfuscated ${args[0]} → ${args[1]} (${r.W}×${r.H}, ${(r.outBytes / 1024).toFixed(0)}KB)`);
} else {
  console.error('usage: shuffle-grids.cjs <in.png> <out.png> | --verify <f…> | --dir <src> <dst> <f…>');
  process.exit(2);
}
