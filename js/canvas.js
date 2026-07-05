/* Depends on globals: MNAMES, MCOLS, OCOLS (constants.js)
                       isDark (theme.js)
                       sunPos, doy, D2R (solar-geometry.js)
                       getObstacles, getImportedHorizon, buildHorizonArr (obstacles.js) */

let currentTab = 'sunpath';
function setCurrentTab(t) { currentTab = t; }

function drawCanvas() {
  if      (currentTab === 'sunpath') drawSunPath();
  else if (currentTab === 'horizon') drawHorizonChart();
}

function dlPNG() {
  const a = document.createElement('a');
  a.download = 'sun-path.png';
  a.href = document.getElementById('C').toDataURL('image/png');
  a.click();
}

function setupCanvas() {
  const lat  = parseFloat(document.getElementById('lat').value) || 51.4769;
  const lon  = parseFloat(document.getElementById('lon').value) || -0.0005;
  const tz   = parseFloat(document.getElementById('tz').value)  || 0;
  const dark = isDark();
  const cv   = document.getElementById('C');
  const ctx  = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  ctx.fillStyle = dark ? '#1c1c1e' : '#f9f9f9';
  ctx.fillRect(0, 0, W, H);
  return {
    lat, lon, tz, dark, ctx, W, H,
    FG:   dark ? '#ddd' : '#333',
    GRID: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)',
    AXIS: dark ? '#555' : '#bbb',
  };
}

function makeAxes(ctx, PAD, PW, PH, W, H, FG, GRID, AXIS, azMin, azMax, xLbl) {
  const tx = az => PAD.l + (az - azMin) / (azMax - azMin) * PW;
  const ty = el => PAD.t + (1 - el / 90) * PH;
  ctx.strokeStyle = GRID; ctx.lineWidth = 0.7; ctx.setLineDash([3, 4]);
  for (let az = 0; az <= 360; az += 30) {
    if (az < azMin || az > azMax) continue;
    ctx.beginPath(); ctx.moveTo(tx(az), PAD.t); ctx.lineTo(tx(az), PAD.t + PH); ctx.stroke();
  }
  for (let el = 0; el <= 90; el += 10) {
    ctx.beginPath(); ctx.moveTo(PAD.l, ty(el)); ctx.lineTo(PAD.l + PW, ty(el)); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.strokeStyle = AXIS; ctx.lineWidth = 1;
  ctx.strokeRect(PAD.l, PAD.t, PW, PH);
  ctx.fillStyle = FG; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
  for (let az = 0; az <= 360; az += 30) {
    if (az < azMin || az > azMax) continue;
    ctx.fillText(az + '°', tx(az), PAD.t + PH + 16);
  }
  ctx.font = '12px sans-serif'; ctx.fillText(xLbl, PAD.l + PW / 2, H - 5);
  ctx.textAlign = 'right'; ctx.font = '11px sans-serif';
  for (let el = 0; el <= 90; el += 10) ctx.fillText(el + '°', PAD.l - 6, ty(el) + 4);
  ctx.save();
  ctx.translate(14, PAD.t + PH / 2); ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center'; ctx.font = '12px sans-serif'; ctx.fillStyle = FG;
  ctx.fillText('Solar Elevation (°)', 0, 0);
  ctx.restore();
  return { tx, ty };
}

function pill(ctx, text, cx, cy, bg, fg, fs) {
  ctx.font = `bold ${fs}px sans-serif`;
  const tw = ctx.measureText(text).width, pw = tw + 12, ph = fs + 7, r = ph / 2;
  const x = cx - pw / 2, y = cy - ph / 2;
  ctx.fillStyle = bg; ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + pw - r, y); ctx.quadraticCurveTo(x + pw, y, x + pw, y + r);
  ctx.lineTo(x + pw, y + ph - r); ctx.quadraticCurveTo(x + pw, y + ph, x + pw - r, y + ph);
  ctx.lineTo(x + r, y + ph); ctx.quadraticCurveTo(x, y + ph, x, y + ph - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + 0.5); ctx.textBaseline = 'alphabetic';
}

function getDates(opt) {
  const y = 2026;
  if (opt === 'ALL') return Array.from({ length: 12 }, (_, i) => ({ y: i === 11 ? y-1 : y, mo: i === 11 ? 12 : i+1, d: 21 }));
  if (opt === 'WS')  return [[12,21],[1,21],[2,21],[3,21],[4,21],[5,21],[6,21]].map(([mo, d]) => ({ y: mo === 12 ? y-1 : y, mo, d }));
  if (opt === 'SW')  return [[6,21],[7,21],[8,21],[9,21],[10,21],[11,21],[12,21]].map(([mo, d]) => ({ y, mo, d }));
  if (opt === 'SD')  { const v = document.getElementById('sd').value.split('-'); return [{ y: +v[0], mo: +v[1], d: +v[2] }]; }
  return [];
}

function drawSunPath() {
  const { lat, lon, tz, dark, ctx, W, H, FG, GRID, AXIS } = setupCanvas();
  const dOpt  = document.querySelector('input[name="do"]:checked').value;
  const tMode = document.querySelector('input[name="to"]:checked').value;
  const PAD = { l:54, r:24, t:32, b:52 };
  const PW = W - PAD.l - PAD.r, PH = H - PAD.t - PAD.b;
  const dates = getDates(dOpt);

  let azMin = 999, azMax = -999;
  dates.forEach(({ y, mo, d }) => {
    const n = doy(y, mo, d);
    for (let h = 0; h <= 24; h += 0.25) {
      const p = sunPos(lat, lon, tz, n, h, tMode);
      if (p) { azMin = Math.min(azMin, p.az); azMax = Math.max(azMax, p.az); }
    }
  });
  azMin = Math.max(0,   Math.floor(azMin / 30) * 30 - 15);
  azMax = Math.min(360, Math.ceil( azMax / 30) * 30 + 15);

  const xLbl = 'Solar Azimuth — Nav: 0°=N · 90°=E · 180°=S · 270°=W';
  const { tx, ty } = makeAxes(ctx, PAD, PW, PH, W, H, FG, GRID, AXIS, azMin, azMax, xLbl);

  // terrain horizon (green silhouette) from the horizon tiles - behind the obstacle horizon
  const terr = (typeof getTerrainHorizon === 'function') ? getTerrainHorizon() : null;
  const hasTerr = terr && terr.length === 36 && terr.some(v => v > 0);
  if (hasTerr) {
    ctx.fillStyle = 'rgba(39,174,96,0.30)';
    ctx.beginPath(); let tf = true;
    for (let i = 0; i < 36; i++) { const az = i * 10; if (az < azMin || az > azMax) { tf = true; continue; } tf ? ctx.moveTo(tx(az), ty(terr[i])) : ctx.lineTo(tx(az), ty(terr[i])); tf = false; }
    ctx.lineTo(tx(Math.min(350, azMax)), ty(0)); ctx.lineTo(tx(azMin), ty(0)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#27ae60'; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.beginPath(); tf = true;
    for (let i = 0; i < 36; i++) { const az = i * 10; if (az < azMin || az > azMax) { tf = true; continue; } tf ? ctx.moveTo(tx(az), ty(terr[i])) : ctx.lineTo(tx(az), ty(terr[i])); tf = false; }
    ctx.stroke();
  }

  const obs = getObstacles();
  if (obs.length || getImportedHorizon()) {
    const arr = buildHorizonArr();
    ctx.fillStyle = dark ? 'rgba(231,76,60,0.18)' : 'rgba(231,76,60,0.12)';
    ctx.beginPath(); let first = true;
    for (let i = 0; i < 36; i++) {
      const az = i * 10, el = arr[i];
      if (az < azMin || az > azMax) { first = true; continue; }
      first ? ctx.moveTo(tx(az), ty(el)) : ctx.lineTo(tx(az), ty(el));
      first = false;
    }
    ctx.lineTo(tx(Math.min(350, azMax)), ty(0)); ctx.lineTo(tx(azMin), ty(0)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(231,76,60,0.75)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 3]);
    ctx.beginPath(); first = true;
    for (let i = 0; i < 36; i++) {
      const az = i * 10, el = arr[i];
      if (az < azMin || az > azMax) { first = true; continue; }
      first ? ctx.moveTo(tx(az), ty(el)) : ctx.lineTo(tx(az), ty(el));
      first = false;
    }
    ctx.stroke(); ctx.setLineDash([]);
  }

  for (let hr = 4; hr <= 20; hr++) {
    const pts = [];
    dates.forEach(({ y, mo, d }) => {
      const p = sunPos(lat, lon, tz, doy(y, mo, d), hr, tMode);
      if (p && p.az >= azMin && p.az <= azMax) pts.push({ x: tx(p.az), y: ty(p.el), el: p.el });
    });
    if (pts.length < 2) continue;
    ctx.strokeStyle = dark ? 'rgba(180,180,180,0.3)' : 'rgba(100,100,100,0.3)';
    ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); pts.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
    ctx.stroke(); ctx.setLineDash([]);
    const top = pts.reduce((a, b) => b.el > a.el ? b : a);
    if (top.el > 4) {
      const h12 = hr % 12 || 12, ap = hr < 12 ? 'AM' : 'PM';
      pill(ctx, `${h12}${ap}`, top.x, top.y - 12, '#5b6e8c', '#fff', 9);
    }
  }

  const legItems = [];
  dates.forEach(({ y, mo, d }) => {
    const n = doy(y, mo, d), col = MCOLS[(mo - 1) % 12];
    legItems.push({ col, label: MNAMES[mo - 1] });
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.beginPath();
    let started = false;
    for (let hmin = 0; hmin <= 24 * 60; hmin += 2) {
      const p = sunPos(lat, lon, tz, n, hmin / 60, tMode);
      if (!p || p.az < azMin || p.az > azMax) { started = false; continue; }
      const x = tx(p.az), yy = ty(p.el);
      started ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); started = true;
    }
    ctx.stroke();
    let peakEl = -99, peakAz = 180;
    for (let h = 0; h <= 24; h += 0.1) {
      const p = sunPos(lat, lon, tz, n, h, tMode);
      if (p && p.el > peakEl) { peakEl = p.el; peakAz = p.az; }
    }
    if (peakEl > 1) pill(ctx, MNAMES[mo - 1], tx(peakAz), ty(peakEl) - 12, col, '#fff', 10);
  });

  const obs2 = getObstacles();
  document.getElementById('legend').innerHTML =
    legItems.map(({ col, label }) => `<span class="leg"><span class="leg-sw" style="background:${col}"></span>${label}</span>`).join('') +
    `<span class="leg" style="margin-left:6px"><span class="leg-sw" style="background:#5b6e8c;height:10px;width:10px;border-radius:2px"></span>Hours</span>` +
    (hasTerr ? `<span class="leg" style="margin-left:6px"><span class="leg-sw" style="background:#27ae60"></span>Terrain</span>` : '') +
    (obs2.length || getImportedHorizon() ? `<span class="leg" style="margin-left:6px"><span class="leg-sw" style="background:rgba(231,76,60,0.6)"></span>Horizon</span>` : '');
}

function drawHorizonChart() {
  const { lat, lon, tz, dark, ctx, W, H, FG, GRID, AXIS } = setupCanvas();
  const PAD = { l:54, r:24, t:52, b:52 };
  const PW = W - PAD.l - PAD.r, PH = H - PAD.t - PAD.b;
  const xLbl = 'Solar Azimuth — Nav: 0°=N · 90°=E · 180°=S · 270°=W  |  PVGIS: 0°=S · −90°=E · +90°=W';
  const { tx, ty } = makeAxes(ctx, PAD, PW, PH, W, H, FG, GRID, AXIS, 0, 360, xLbl);

  [{ nav:0, lbl:'N', pvg:'±180°' }, { nav:90, lbl:'E', pvg:'−90°' }, { nav:180, lbl:'S', pvg:'0°' }, { nav:270, lbl:'W', pvg:'+90°' }]
    .forEach(({ nav, lbl, pvg }) => {
      ctx.fillStyle = dark ? '#888' : '#777'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(lbl, tx(nav), PAD.t - 30);
      ctx.font = '9px sans-serif'; ctx.fillStyle = '#1e40af'; ctx.fillText(`Nav ${nav}°`, tx(nav), PAD.t - 20);
      ctx.fillStyle = '#92400e'; ctx.fillText(`PVGIS ${pvg}`, tx(nav), PAD.t - 10);
    });

  [{ y:2026, mo:6, d:21, col:'#e74c3c' }, { y:2025, mo:12, d:21, col:'#8e44ad' }].forEach(({ y, mo, d, col }) => {
    const n = doy(y, mo, d);
    ctx.strokeStyle = col + '66'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    ctx.beginPath(); let started = false;
    for (let hmin = 0; hmin <= 24 * 60; hmin += 3) {
      const p = sunPos(lat, lon, tz, n, hmin / 60, 'lst');
      if (!p) { started = false; continue; }
      const x = tx(p.az), yy = ty(p.el);
      started ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); started = true;
    }
    ctx.stroke(); ctx.setLineDash([]);
  });

  // terrain horizon (green silhouette) from the horizon tiles - drawn first so obstacles/horizon sit on top
  const terr = (typeof getTerrainHorizon === 'function') ? getTerrainHorizon() : null;
  if (terr && terr.length === 36 && terr.some(v => v > 0)) {
    ctx.fillStyle = '#27ae6055';
    ctx.beginPath(); ctx.moveTo(tx(0), ty(0));
    for (let i = 0; i < 36; i++) ctx.lineTo(tx(i * 10), ty(terr[i]));
    ctx.lineTo(tx(360), ty(terr[0])); ctx.lineTo(tx(360), ty(0)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#27ae60'; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.beginPath();
    for (let i = 0; i < 36; i++) i === 0 ? ctx.moveTo(tx(0), ty(terr[i])) : ctx.lineTo(tx(i * 10), ty(terr[i]));
    ctx.lineTo(tx(360), ty(terr[0])); ctx.stroke();
  }

  const obs = getObstacles();
  obs.forEach((o, i) => {
    const col = OCOLS[i % 6];
    let a1 = o.navAz1, a2 = o.navAz2; if (a2 < a1) a2 += 360;
    const dr = (x1, x2) => {
      ctx.fillStyle = col + '33'; ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.fillRect(x1, ty(o.el), x2 - x1, PAD.t + PH - ty(o.el));
      ctx.strokeRect(x1, ty(o.el), x2 - x1, PAD.t + PH - ty(o.el));
    };
    a2 > 360 ? (dr(tx(a1), tx(360)), dr(tx(0), tx(a2 - 360))) : dr(tx(a1), tx(a2));
    const mid = ((a1 + (a2 > 360 ? a2 - 360 : a2)) / 2) % 360;
    ctx.fillStyle = col; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${o.lbl} (${o.el}°)`, tx(mid), ty(o.el) - 5);
  });

  const arr = buildHorizonArr();
  ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 2.5; ctx.setLineDash([]);
  ctx.beginPath(); arr.forEach((el, i) => { const az = i * 10; i === 0 ? ctx.moveTo(tx(az), ty(el)) : ctx.lineTo(tx(az), ty(el)); });
  ctx.stroke();

  document.getElementById('legend').innerHTML =
    (terr && terr.some(v => v > 0) ? `<span class="leg"><span class="leg-sw" style="background:#27ae60"></span>Terrain</span>` : '') +
    `<span class="leg"><span class="leg-sw" style="background:#e74c3c"></span>Horizon</span>` +
    `<span class="leg"><span class="leg-sw" style="background:#e74c3c66"></span>Jun 21</span>` +
    `<span class="leg"><span class="leg-sw" style="background:#8e44ad66"></span>Dec 21</span>` +
    obs.map((o, i) => `<span class="leg"><span class="leg-sw" style="background:${OCOLS[i % 6]}"></span>${o.lbl}</span>`).join('');
}
