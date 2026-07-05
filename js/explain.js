/* explain.js — "show the working" learning layer.
   phpMyAdmin-style: surface the actual rule + the user's live numbers + the result, so the
   tool teaches the methodology instead of hiding it. Pages build blocks with REAL values
   (fed from the same variables the calc uses, so the numbers never drift) and hand them to
   Explain.render(); a learning-mode toggle (persisted in localStorage 'spv_learn') reveals them.

   Usage on a page:
     Explain.wireToggle(checkboxEl, refresh);              // refresh = re-show the host
     var html = Explain.block(formulaHTML, liveHTML, descKey, refHref) + … ;
     Explain.render(hostEl, html);                          // sets innerHTML + visibility

   formula / live are trusted inline HTML (you build them); descKey is an i18n key (escaped). */
var Explain = (function () {
  'use strict';
  var KEY = 'spv_learn';
  function isOn() { return localStorage.getItem(KEY) === '1'; }
  function set(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} }
  function tr(k) { return (typeof t === 'function') ? t(k) : k; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]; }); }

  function block(formula, live, descKey, ref) {
    return '<div class="xpl">' +
        '<div class="xpl-f">' + formula + (live ? ' <span class="xpl-eq">= ' + live + '</span>' : '') + '</div>' +
        (descKey ? '<div class="xpl-d">' + esc(tr(descKey)) + '</div>' : '') +
        (ref ? '<a class="xpl-ref" href="' + ref + '" target="_blank" rel="noopener">' + esc(tr('xpl.ref')) + ' →</a>' : '') +
      '</div>';
  }

  function render(host, html) {
    if (!host) return;
    host.innerHTML = html || '';
    host.style.display = isOn() ? 'block' : 'none';   // 'block' (not '') so it overrides the CSS default of display:none
  }

  /* Wire a learning-mode checkbox; onChange fires after the flag flips so the page re-reveals. */
  function wireToggle(checkbox, onChange) {
    if (!checkbox) return;
    checkbox.checked = isOn();
    checkbox.addEventListener('change', function () { set(checkbox.checked); if (typeof onChange === 'function') onChange(); });
  }

  return { isOn: isOn, set: set, block: block, render: render, wireToggle: wireToggle };
})();
