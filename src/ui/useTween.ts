import { useEffect, useRef, useState } from "react";

/**
 * 숫자 트윈 (2026-10-01) — 지갑·점수 같은 숫자가 바뀔 때 뚝 바뀌지 않고 ms 동안 굴러간다 (모바일 게임의 카운터).
 * 첫 값은 바로 보여 주고, 그 뒤 변화만 easeOutCubic 으로 따라간다. 돌려주는 값은 정수.
 */
export function useTween(value: number, ms = 420): number {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  const rafRef = useRef(0);
  useEffect(() => {
    const from = shownRef.current;
    if (from === value) return;
    if (!Number.isFinite(value) || !Number.isFinite(from) || typeof requestAnimationFrame !== "function") { shownRef.current = value; setShown(value); return; }
    const start = performance.now();
    cancelAnimationFrame(rafRef.current);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const k = 1 - Math.pow(1 - t, 3);
      const v = Math.round(from + (value - from) * k);
      shownRef.current = v;
      setShown(v);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, ms]);
  return shown;
}
