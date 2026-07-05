let convention = 'nav';

function getConvention() { return convention; }
function setConventionState(c) { convention = c; }

function inputToNav(az) {
  return convention === 'nav'
    ? ((az % 360) + 360) % 360
    : ((az + 180) % 360 + 360) % 360;
}

function navToPVGIS(a) {
  let v = a - 180;
  if (v < -180) v += 360;
  if (v >  180) v -= 360;
  return v;
}
