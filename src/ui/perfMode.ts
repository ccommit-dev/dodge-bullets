/**
 * 저사양 모드 (2026-10-06, 안드로이드 에뮬레이터 실기 플레이) — 비트 수련 레일은 노트마다 shadowBlur(최대 26px)를 걸어
 * 연주 중 25 FPS 까지 떨어졌다(그림자만 끄면 42). 곡 시작 약 3초의 프레임 간격을 재 평균 45 FPS 아래면 캔버스 흐림 그림자를 끈다.
 * 한 번 켜지면 이 기기에 기억한다(다음 판부터 바로). 판정·노트 크기는 그대로 — 빛 번짐만 사라진다.
 */
const KEY = "dodgebullets:lowfx";
let cached: boolean | null = null;

export function lowFxOn(): boolean {
  if (cached === null) {
    try { cached = typeof localStorage !== "undefined" && localStorage.getItem(KEY) === "1"; } catch { cached = false; }
  }
  return cached;
}

export function setLowFx(on: boolean): void {
  cached = on;
  try { if (on) localStorage.setItem(KEY, "1"); else localStorage.removeItem(KEY); } catch { /* 저장 불가 환경 */ }
}

/**
 * 프레임 감시 — **시간 기준**: 앞 0.8초는 버리고 다음 2초 동안의 평균 간격이 22ms(≈45 FPS)를 넘으면 true 를 한 번 돌려준다.
 * 예전 '180프레임' 기준은 4 FPS 기기에서 판정까지 1분이 걸렸다 (에뮬레이터 실기, 그림자 그리기가 프레임당 250ms).
 */
export function frameMonitor(): (dtMs: number) => boolean {
  // 2초 창을 계속 굴린다 — 곡 첫 몇 초는 노트가 적어 빠르다가 밀도가 오르며 느려진다(실기: 처음 3초만 보고 '빠름'으로 끝냈다)
  let warm = 0, win = 0, n = 0, sum = 0, fired = false;
  return (dtMs: number) => {
    if (fired || !(dtMs > 0)) return false;
    if (dtMs > 1000) return false;         // 백그라운드 복귀 같은 한 번의 긴 틈은 빼고
    if (warm < 800) { warm += dtMs; return false; }
    win += dtMs; sum += dtMs; n += 1;
    if (win < 2000) return false;
    const slow = sum / n > 22;
    win = 0; sum = 0; n = 0;
    if (slow) fired = true;
    return slow;
  };
}

const patched = new WeakSet<CanvasRenderingContext2D>();
/** 저사양이면 이 캔버스의 shadowBlur 를 0 으로 고정한다 (그리기 코드는 그대로 둔다) */
export function applyLowFx(ctx: CanvasRenderingContext2D): void {
  if (!lowFxOn() || patched.has(ctx)) return;
  patched.add(ctx);
  Object.defineProperty(ctx, "shadowBlur", { configurable: true, get: () => 0, set: () => {} });
}
