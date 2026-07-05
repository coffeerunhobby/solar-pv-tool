const sysDark = matchMedia('(prefers-color-scheme:dark)');

/* Read the user's explicit cookie preference (set only after first manual toggle).
   Returns 'light' | 'dark' | null (null = follow OS). */
function _cookieTheme() {
  const m = document.cookie.match(/(?:^|;\s*)theme=(light|dark)/);
  return m ? m[1] : null;
}

/* True when the effective theme is dark (cookie wins over OS preference). */
function isDark() {
  const c = _cookieTheme();
  return c ? c === 'dark' : sysDark.matches;
}

/* Called by the two buttons in the topbar. Writes a 1-year cookie then repaints. */
function setTheme(dark) {
  document.cookie = `theme=${dark ? 'dark' : 'light'};max-age=${365 * 24 * 3600};path=/;SameSite=Lax`;
  applyTheme();
}

/* Apply the effective theme to <html> and sync the toggle checkbox.
   Pages that need extra repaint work (e.g. index.html canvas/tiles) define a
   global onThemeChange() hook — it's called after the attribute is set. */
function applyTheme() {
  const dark = isDark();
  document.documentElement.setAttribute('data-bs-theme', dark ? 'dark' : 'light');
  const chk = document.getElementById('theme-chk');
  if (chk) chk.checked = dark;
  if (typeof onThemeChange === 'function') onThemeChange();
}

/* React to OS-level dark/light change (isDark() still honours a set cookie). */
sysDark.addEventListener('change', () => applyTheme());

/* ── Mobile minus-sign helper ──────────────────────────────────────────────
   iOS numeric keypads (type=number / inputmode) have NO minus key, so any field that accepts
   negatives (T °C, azimuth, lat/lon, temperature coefficients γ/μ, plane deltas, ...) is
   untypeable on a phone. This shows a small floating "±" button while such a field is focused;
   tapping it flips the sign of the typed value (type the magnitude, then ± to negate). Lazy,
   delegated, theme-aware. Touch / coarse-pointer devices only - desktop has a real minus key. */
(function () {
  if (!(matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window)) return;

  /* negative-capable = type=number, editable, and min absent or < 0 */
  function negCapable(el) {
    if (!el || el.tagName !== 'INPUT' || el.type !== 'number' || el.readOnly || el.disabled) return false;
    const min = el.getAttribute('min');
    return min === null || parseFloat(min) < 0;
  }

  let btn = null, cur = null, hideTimer = null;
  function ensureBtn() {
    if (btn) return;
    const st = document.createElement('style');
    st.textContent =
      '.mm-sign-btn{position:fixed;z-index:2147483600;display:none;width:30px;height:30px;padding:0;' +
      'transform:translate(-100%,-50%);align-items:center;justify-content:center;font:600 18px/1 system-ui,sans-serif;' +
      'border:1px solid var(--bs-border-color,#9aa0aa);border-radius:7px;cursor:pointer;' +
      'background:var(--bs-body-bg,#fff);color:var(--bs-body-color,#212529);box-shadow:0 1px 5px rgba(0,0,0,.3)}';
    document.head.appendChild(st);
    btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'mm-sign-btn'; btn.textContent = '±';
    btn.setAttribute('aria-label', 'Toggle minus sign');
    btn.addEventListener('pointerdown', function (e) {
      e.preventDefault();                                   // keep focus + the keyboard open
      if (!cur) return;
      const v = cur.value.trim();
      if (v === '' || v === '-') return;                    // need a magnitude first
      cur.value = v.charAt(0) === '-' ? v.slice(1) : '-' + v;
      cur.dispatchEvent(new Event('input',  { bubbles: true }));
      cur.dispatchEvent(new Event('change', { bubbles: true }));
      place();
    });
    document.body.appendChild(btn);
  }
  function place() {
    if (!cur || !btn) return;
    const r = cur.getBoundingClientRect();
    btn.style.left = (r.right - 3) + 'px';                  // hug the input's right edge (spinner slot)
    btn.style.top  = (r.top + r.height / 2) + 'px';
  }
  function show(el) { clearTimeout(hideTimer); cur = el; ensureBtn(); btn.style.display = 'flex'; place(); }
  function hide()   { cur = null; if (btn) btn.style.display = 'none'; }

  document.addEventListener('focusin',  function (e) { negCapable(e.target) ? show(e.target) : (clearTimeout(hideTimer), hide()); });
  document.addEventListener('focusout', function (e) { if (e.target === cur) hideTimer = setTimeout(hide, 120); });
  addEventListener('scroll', place, true);
  addEventListener('resize', place);
  if (window.visualViewport) { visualViewport.addEventListener('resize', place); visualViewport.addEventListener('scroll', place); }
})();
