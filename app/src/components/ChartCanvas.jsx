/* ChartCanvas — Chart.js lifecycle wrapper. `build(canvasEl)` must return a new
   Chart instance (the global Chart comes from vendor/chart.umd.js in the shell);
   it is destroyed on cleanup and rebuilt whenever `deps` change (legacy pages
   did the same destroy+new on every render). */
import { useEffect, useRef } from 'react';

export default function ChartCanvas({ id, ariaLabel, build, deps }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || typeof Chart === 'undefined') return;
    const chart = build(ref.current);
    return () => { try { chart && chart.destroy(); } catch (e) {} };
  }, deps);   // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas id={id} role="img" aria-label={ariaLabel} ref={ref} />;
}
