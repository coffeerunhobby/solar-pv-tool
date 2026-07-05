/* PaywallModal — React port of site-nav.js paywall(). Bootstrap CSS classes,
   no bootstrap JS (the shell doesn't load it): the modal is plain DOM with
   .modal.fade.show + a .modal-backdrop div. Two flavors, same as legacy:
   - dialog (cloud-feature 401): closable ✕
   - blocking (paywalled page): static backdrop, no ✕, "Back" escape
   The MutationObserver guard is unnecessary — React owns the tree, and the
   paywalled page content is simply not rendered while locked. */
import { useI18n } from '../store/useI18n.js';

export default function PaywallModal({ block, onClose }) {
  const { t } = useI18n();
  return (
    <>
      <div className="modal fade show" id="sn-paywall-modal" tabIndex="-1" style={{ display: 'block' }}
           onMouseDown={(e) => { if (!block && e.target === e.currentTarget && onClose) onClose(); }}>
        <div className="modal-dialog modal-dialog-centered"><div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">🔒 {t('nav.paywallTitle')}</h5>
            {!block && <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />}
          </div>
          <div className="modal-body" id="sn-paywall-msg">{t('share.needpaid')}</div>
          <div className="modal-footer">
            {block && (
              <button type="button" className="btn btn-outline-secondary" id="sn-paywall-back"
                      onClick={() => { if (history.length > 1) history.back(); else location.href = 'index.html'; }}>
                {t('nav.paywallBack')}
              </button>
            )}
            <button type="button" className="btn btn-outline-secondary" id="sn-paywall-login"
                    onClick={() => { try { localStorage.removeItem('spv_t'); } catch (e) {} location.reload(); }}>
              {t('nav.paywallLogin')}
            </button>
            <a className="btn btn-p" href="pay.html">{t('nav.paywallBuy')}</a>
          </div>
        </div></div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
