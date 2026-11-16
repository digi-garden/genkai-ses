import { useEffect, useRef } from 'react';

/**
 * active の間、ページが表示されている時間を数え、ms に達したら1回だけ onReach を呼ぶ（heartbeat_10s。06 の 2.2）
 */
export function useVisibleTimer(active: boolean, ms: number, onReach: () => void) {
  const elapsed = useRef(0);
  const cb = useRef(onReach);
  useEffect(() => {
    cb.current = onReach;
  }, [onReach]);
  useEffect(() => {
    if (!active) return;
    const tick = 250;
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      elapsed.current += tick;
      if (elapsed.current >= ms) {
        window.clearInterval(id);
        cb.current();
      }
    }, tick);
    return () => window.clearInterval(id);
  }, [active, ms]);
}
