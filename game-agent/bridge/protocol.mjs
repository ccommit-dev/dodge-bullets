/**
 * 게임 연결 규격 — 어느 게임이든 이 다섯 가지만 내주면 에이전트(계획기 · 실행기 · 판정기)가 그대로 붙는다.
 * 웹은 bridge/web-cdp.mjs, 안드로이드(adb) · 엔진 플러그인은 같은 모양으로 더한다.
 *
 * @typedef {{ ref: string, key: string, label: string, role: string, x: number, y: number, w: number, h: number, disabled: boolean }} Clickable
 *   ref — 이번 관찰에서만 유효한 손잡이 · key — 판을 넘어 같은 단추를 가리키는 이름(숫자는 # 로 접는다)
 * @typedef {{ screen: string, title: string, clickables: Clickable[], state: object, text: string, url: string, at: number }} Observation
 *   screen — 화면 서명(누를 수 있는 것들의 이름 집합) · state — 게임 상태 JSON · text — 보이는 글자(판정용)
 * @typedef {{ type: "tap", ref?: string, key?: string, label?: string } | { type: "key", key: string } | { type: "wait", ms: number } | { type: "reload" }} Action
 * @typedef {{ kind: "pageerror" | "console" | "http" | "blocked" | "dialog" | "popup" | "navigate", text: string, at: number }} GameEvent
 *
 * @typedef {object} GameBridge
 * @property {() => Promise<Observation>} observe            관찰 — 화면 + 누를 것 + 상태
 * @property {(a: Action) => Promise<{ ok: boolean, why?: string }>} act   행동 — 화면 조작(이름 붙은 동작은 같은 tap 을 이름으로)
 * @property {(preset: string) => Promise<void>} reset      리셋 — 정해진 저장 상태로 되돌린다
 * @property {(ms: number) => Promise<void>} advance        시간 — 게임 시계를 앞으로(방치 · 쿨타임)
 * @property {() => GameEvent[]} drainEvents                 사건 — 지난 호출 뒤 쌓인 오류 · 경고 · 차단 요청
 * @property {(file: string) => Promise<string>} screenshot  근거 화면
 * @property {() => Promise<void>} close
 */

/** 단추 이름 정규화 — 숫자 · 공백을 접어, 재화가 바뀌어도 같은 단추로 본다 */
export const normalizeLabel = (s) => String(s ?? "").replace(/\s+/g, " ").trim().replace(/[0-9][0-9,.]*/g, "#").slice(0, 40);

/** 짧은 해시(화면 서명용) */
export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

/** 판마다 같은 순서를 내는 난수(시드 고정) */
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1_000_000) / 1_000_000; };
}

export const describeAction = (a) => a.type === "tap" ? `tap "${a.label ?? a.key}"` : a.type === "key" ? `key ${a.key}` : a.type === "wait" ? `wait ${a.ms}ms` : a.type;
