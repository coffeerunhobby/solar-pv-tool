/* SmartLink — <Link> for ported routes (instant SPA nav), plain <a> for legacy
   pages (full page load). The single cross-boundary link primitive; pages use
   this instead of choosing manually so links upgrade automatically as their
   targets get ported.

   newTab: open the legacy page in a new tab ON THE WEB (keeps the current page,
   e.g. the ⓘ grid-map viz links off the Yield form). In the native Capacitor
   WebView there is no new-window support, so target="_blank" would dead-end —
   there we always navigate in place (hardware Back returns). */
import { Link } from 'react-router-dom';
import { PORTED_PATHS } from '../ported.js';

const isNative = () =>
  typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();

export default function SmartLink({ href, newTab = false, children, ...rest }) {
  const path = '/' + String(href).replace(/^\//, '').split(/[?#]/)[0];
  if (PORTED_PATHS.includes(path)) {
    return <Link to={href.startsWith('/') ? href : '/' + href} {...rest}>{children}</Link>;
  }
  const tab = newTab && !isNative() ? { target: '_blank', rel: 'noreferrer' } : {};
  return <a href={href} {...rest} {...tab}>{children}</a>;
}
