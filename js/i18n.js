/* i18n.js — Internationalisation core.
   Load order: i18n_en.js → i18n_ro.js → this file → everything else.
   Globals exposed: LANGUAGES, LANG_CURRENT, t(), setLang(), applyI18n() */

const LANGUAGES = [
  { code: 'ro', label: 'Română'  },   /* primary */
  { code: 'en', label: 'English' },
];

let LANG_CURRENT = localStorage.getItem('lang') || 'ro';   /* Romanian primary, English fallback */

/* Explicit map — window['I18N_RO'] doesn't work because const isn't a window property */
const I18N_MAPS = { en: I18N_EN, ro: I18N_RO };

/* Translate a key. Falls back to English, then the bare key. */
function t(key) {
  const map = I18N_MAPS[LANG_CURRENT];
  return (map && map[key] !== undefined ? map[key] : null)
      ?? (I18N_EN[key] !== undefined ? I18N_EN[key] : key);
}

/* Switch language, persist, re-render. */
function setLang(code) {
  LANG_CURRENT = code;
  localStorage.setItem('lang', code);
  const sel = document.getElementById('lang-select');
  if (sel) sel.value = code;
  applyI18n();
}

/* Walk the DOM and apply translations.
   data-i18n        → textContent
   data-i18n-html   → innerHTML  (use for strings that contain markup)
   data-i18n-ph     → placeholder
   data-i18n-title  → title attribute */
function applyI18n() {
  /* Sync html[lang] */
  document.documentElement.lang = LANG_CURRENT;

  /* Sync language selector value */
  const sel = document.getElementById('lang-select');
  if (sel) sel.value = LANG_CURRENT;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });

  /* Re-render dynamic components that cache translated text */
  if (typeof renderList    === 'function') renderList();
  if (typeof updateConvUI  === 'function') updateConvUI();

  /* Re-run yield if results are already displayed, so metric labels
     and table headers re-render in the new language. */
  if (typeof runYield === 'function' && document.getElementById('pv-metrics')?.children.length) {
    runYield();
  }
}
