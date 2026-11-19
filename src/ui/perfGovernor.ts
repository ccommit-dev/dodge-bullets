/**
 * 성능 조절기 (2026-11-19, 사용자: "첨부 게임 엔진처럼 최적화할 수 있는 거 차용") — 첨부 WebGPU 장면(단일 파일 · 메인 루프 ·
 * 1초마다 프레임 시간을 재 해상도 예산을 고치고 기기에 기억 · 켜다 죽으면 다음엔 한 단계 낮게)의 장치를 원리만 가져와
 * 우리 DOM · 2D 캔버스 게임에 맞게 새로 썼다(코드 복사 아님).
 *
 *  ① 동적 해상도(scaleGovernor) — 성문 방어 · 비트 캔버스 뒷면 배율을 1 ~ min(dpr, 2) 사이에서 1초 창마다 고친다.
 *     느림 = 창 평균이 화면 주기(창 중앙값의 최솟값으로 추정 — 60Hz · 120Hz 를 가리지 않는다)의 1.3배 넘음 2창 연속 → ×0.85.
 *     빠름 = 1.08배 아래가 `기다림` 창 연속 → ×1.1. 올렸다가 30초 안에 다시 내리면 기다림을 두 배(8 → 64창) — 오르내림 되풀이 방지.
 *     배운 배율은 기기에 저장(localStorage) — 다음 판은 그 값에서 시작한다. 글자가 흐려지지 않게 1 아래로는 안 내린다.
 *  ② 효과 단계(fxGovernor) — 같은 창 규칙으로 사냥터 효과 줄이기(lowFx)를 켜고 끈다. 끄기(효과 되살리기)도 기다림이 두 배씩.
 *  ③ 안전 시작(bootGuard) — 켤 때 표시를 남기고 15초 지나면 · 화면을 떠나면(pagehide · 숨김) 지운다.
 *     표시가 남아 있으면 = 켜자마자 보이는 채로 죽었다(웹뷰 메모리 부족 등) → 이번 실행은 낮은 단계에서 시작(①은 배율 1, ②는 효과 줄임).
 *     영구로 낮추지 않는다 — ① · ② 가 빠르면 다시 올린다.
 *
 * 개발 서버는 jsxDEV 가 시간의 60~70% 라(메모: 성능은 prod 빌드로) ① · ② 를 켜면 검사 판이 저사양으로 바뀐다 → 출시 빌드에서만 켠다.
 * 개발에서 보려면 localStorage dodgebullets:perf-gov = "1".
 */

export const PERF_WINDOW_MS = 1000;
const WARM_MS = 600;          // 시작 · 크기 바꾼 직후는 버린다(캔버스 다시 잡는 순간이 느리다)
const GAP_MS = 250;           // 이보다 긴 한 칸은 창을 버린다(백그라운드 복귀 · 디버거 멈춤)
const SLOW = 1.3, FAST = 1.08;
const WAIT_MIN = 8, WAIT_MAX = 64, REBOUND_MS = 30_000;

export type WindowVerdict = "slow" | "fast" | "ok" | null;

/** 창 판정기 — 프레임 간격을 넣으면 창이 찰 때마다 slow · fast · ok 를 돌려준다(아니면 null) */
export function frameWindows() {
  let warm = 0, win = 0, list: number[] = [], base = Infinity;
  return {
    reset() { warm = 0; win = 0; list = []; },
    /** 화면 주기 추정(ms) — 테스트 · 표시용 */
    get base() { return base; },
    push(dtMs: number): WindowVerdict {
      if (!(dtMs > 0)) return null;
      if (dtMs > GAP_MS) { win = 0; list = []; return null; }
      if (warm < WARM_MS) { warm += dtMs; return null; }
      win += dtMs; list.push(dtMs);
      if (win < PERF_WINDOW_MS) return null;
      const sorted = [...list].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const avg = win / list.length;
      base = Math.max(6.5, Math.min(base, median));   // 144Hz 아래로는 안 본다
      win = 0; list = [];
      return avg > base * SLOW ? "slow" : avg < base * FAST ? "fast" : "ok";
    },
  };
}

type Store = { get(k: string): string | null; set(k: string, v: string): void };
const safeStore: Store = {
  get(k) { try { return typeof localStorage === "undefined" ? null : localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { if (typeof localStorage !== "undefined") localStorage.setItem(k, v); } catch { /* 저장 못 하는 환경 */ } },
};

/** ① 동적 해상도 — sample(dt) 가 새 배율을 돌려주면 캔버스를 그 배율로 다시 잡는다 */
export function scaleGovernor(key: string, maxScale: number, opts: { store?: Store; now?: () => number; startLow?: boolean } = {}) {
  const store = opts.store ?? safeStore, now = opts.now ?? (() => performance.now());
  const MIN = Math.min(1, maxScale);
  const saved = Number(store.get(`dodgebullets:render-scale:${key}`));
  let scale = opts.startLow ? MIN : saved >= MIN && saved <= maxScale ? saved : maxScale;
  let slowRun = 0, fastRun = 0, wait = WAIT_MIN, raisedAt = -Infinity;
  const w = frameWindows();
  const round = (v: number) => Math.round(v * 20) / 20;
  return {
    get scale() { return scale; },
    get wait() { return wait; },
    reset() { w.reset(); slowRun = 0; fastRun = 0; },
    sample(dtMs: number): number | null {
      const v = w.push(dtMs);
      if (!v || v === "ok") { if (v === "ok") { slowRun = 0; fastRun = 0; } return null; }
      if (v === "slow") {
        fastRun = 0;
        if (++slowRun < 2 || scale <= MIN) return null;
        slowRun = 0;
        if (now() - raisedAt < REBOUND_MS) wait = Math.min(WAIT_MAX, wait * 2);   // 올렸더니 다시 느리다 — 다음 올리기는 더 오래 기다린다
        scale = Math.max(MIN, round(scale * 0.85));
      } else {
        slowRun = 0;
        if (++fastRun < wait || scale >= maxScale) return null;
        fastRun = 0;
        scale = Math.min(maxScale, round(scale * 1.1));
        raisedAt = now();
      }
      w.reset();
      store.set(`dodgebullets:render-scale:${key}`, String(scale));
      return scale;
    },
  };
}

/** ② 효과 단계 — sample(dt) 가 true/false 를 돌려주면 효과 줄이기를 그 값으로 */
export function fxGovernor(key: string, startLow: boolean, opts: { store?: Store; now?: () => number } = {}) {
  const store = opts.store ?? safeStore, now = opts.now ?? (() => performance.now());
  const savedWait = Number(store.get(`dodgebullets:fx-wait:${key}`));
  let low = startLow, slowRun = 0, fastRun = 0, wait = savedWait >= WAIT_MIN && savedWait <= WAIT_MAX ? savedWait : WAIT_MIN, raisedAt = -Infinity;
  const w = frameWindows();
  return {
    get low() { return low; },
    get wait() { return wait; },
    sample(dtMs: number): boolean | null {
      const v = w.push(dtMs);
      if (!v || v === "ok") { if (v === "ok") { slowRun = 0; fastRun = 0; } return null; }
      if (v === "slow") {
        fastRun = 0;
        if (low || ++slowRun < 3) return null;
        slowRun = 0;
        if (now() - raisedAt < REBOUND_MS) { wait = Math.min(WAIT_MAX, wait * 2); store.set(`dodgebullets:fx-wait:${key}`, String(wait)); }
        low = true;
      } else {
        slowRun = 0;
        if (!low || ++fastRun < wait) return null;
        fastRun = 0;
        low = false;
        raisedAt = now();
      }
      w.reset();
      return low;
    },
  };
}

/** 이 실행에서 조절기를 켜는가 — 출시 빌드 또는 개발 스위치 */
export function governorEnabled(): boolean {
  if (import.meta.env.PROD) return safeStore.get("dodgebullets:perf-gov") !== "0";
  return safeStore.get("dodgebullets:perf-gov") === "1";
}

/** 캔버스 뒷면 배율 상한 — 예전 고정값 min(dpr, 2) */
export function maxCanvasScale(): number {
  return Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, 2);
}

/** 기기 등급 — 코어 4개 이하 또는 메모리 3GB 이하면 낮음(예전 사냥터 lowFxRef 규칙 그대로, 한 곳으로 모음) */
export function deviceLowTier(): boolean {
  if (typeof navigator === "undefined") return false;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  return (navigator.hardwareConcurrency ?? 8) <= 4 || (mem ?? 8) <= 3;
}

const BOOT_KEY = "dodgebullets:boot-pending";
let safeBoot = false;
/** ③ 안전 시작 — main 에서 첫 그리기 전에 한 번. 앞 실행이 켜자마자 죽었으면 true(이번 실행은 낮은 단계에서 시작) */
export function bootGuard(store: Store = safeStore, enabled = governorEnabled()): boolean {
  // 개발 서버는 끈다 — 검사가 한 프로필로 페이지를 여럿 열면(page.close 는 pagehide 가 없을 수 있다) 남은 표시로 사냥터 효과가 줄어 검사가 흔들린다
  if (!enabled) { safeBoot = false; return false; }
  safeBoot = !!store.get(BOOT_KEY);
  store.set(BOOT_KEY, String(Date.now()));
  if (typeof window === "undefined") return safeBoot;
  const clear = () => { try { localStorage.removeItem(BOOT_KEY); } catch { /* 없음 */ } };
  window.setTimeout(clear, 15_000);
  window.addEventListener("pagehide", clear);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") clear(); });
  return safeBoot;
}
export function isSafeBoot(): boolean { return safeBoot; }
