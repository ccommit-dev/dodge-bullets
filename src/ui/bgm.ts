/**
 * 배경 음악 (2026-10-26, 사용자: "사운드 bgm 추가").
 *
 * 저장소에 이미 있는 로열티 프리 곡(public/audio · LICENSE-cybernetic-overload.md — ElevenLabs gaming music)을 화면마다 하나씩 반복한다.
 * 비트 수련은 곡이 게임 자체라 끈다. 사운드 토글(game/sound.ts saveSoundEnabled → "dodge-sound-change" 이벤트)을 그대로 따르고,
 * 브라우저 자동 재생 정책 때문에 첫 터치 · 키 입력 뒤에 시작한다. 탭을 숨기면 멈추고 돌아오면 이어 튼다. 곡이 바뀌면 0.6초 동안 줄였다 키운다.
 *
 * 모바일 (2026-10-26 점검): 아이폰 사파리는 audio.volume 을 무시한다(늘 1) — 그대로 두면 배경 음악이 효과음보다 크게, 줄임 없이 끊겨 바뀐다.
 * 그래서 소리 크기는 Web Audio 게인으로 잡는다(AudioContext 가 없는 엔진만 audio.volume). 첫 터치에서 재생이 거절되면(아이폰은 touchend · click 이
 * 확실한 제스처) 다음 터치에서 다시 시도하고, 곡이 필요 없는 화면에서 첫 터치가 와도 무음으로 한 번 틀어 요소를 풀어 둔다.
 */
import { assetUrl } from "../asset";
import { loadSoundEnabled } from "../game/sound";
import { subscribeAppVisibility } from "./appLifecycle";

export type BgmScene = "hunt" | "dodge" | "forge" | "menu" | "off";

/** 화면 → 곡 — 2026-10-28 (사용자: "게임 bgm이 너무 산뜻하네 비버 키우기에 맞는 다른 노래 · 스테이지별 콘텐츠별 알맞은 음악") 새 곡 7개(public/audio/bgm, LICENSE.md).
 *  사냥터 = 하프 · 플루트 숲(The Whispering Grove) · 성문 방어 = 북 · 호른 공성(Siege Engines) · 대장간 = 신비로운 공방(The Alchemist's Chamber) · 메뉴 = 오르골(Toy Box Tune) */
export const BGM_TRACK: Record<Exclude<BgmScene, "off">, string> = {
  hunt: "audio/bgm/whispering-grove.mp3",
  dodge: "audio/bgm/siege-engines.mp3",
  forge: "audio/bgm/alchemists-chamber.mp3",
  menu: "audio/bgm/toy-box-tune.mp3",
};
/** 사냥터 안 분위기 — 뒤 지역(축제 피리) · 대장전(오케스트라 전투) · 상점 · 뽑기(글로켄슈필). field = 사냥터 기본 */
export type HuntMood = "field" | "late" | "boss" | "shop";
export const HUNT_MOOD_TRACK: Record<Exclude<HuntMood, "field">, string> = {
  late: "audio/bgm/market-day-revel.mp3",
  boss: "audio/bgm/overture-final-battle.mp3",
  shop: "audio/bgm/glockenspiel-garden.mp3",
};
let huntMood: HuntMood = "field";
export const BGM_VOLUME = 0.32;

let audio: HTMLAudioElement | null = null;
let scene: BgmScene = "off";
let unlocked = false;
/** 사용자 제스처 안에서 한 번이라도 재생에 성공했다 — 그 뒤로는 제스처 없이도 같은 요소를 틀 수 있다 */
let primed = false;
let fadeTimer: number | null = null;
let started = false;
let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let level = 0;
/** 앱이 백그라운드 — 안드로이드 앱은 visibilitychange 를 놓칠 수 있어 Capacitor pause/resume 도 함께 듣는다(ui/appLifecycle) */
let appHidden = false;

const want = (): string | null => (scene === "off" || !loadSoundEnabled() ? null : scene === "hunt" && huntMood !== "field" ? HUNT_MOOD_TRACK[huntMood] : BGM_TRACK[scene]);

function setLevel(v: number): void {
  level = Math.max(0, Math.min(1, v));
  if (gain && ctx) gain.gain.setValueAtTime(level, ctx.currentTime);
  else if (audio) audio.volume = level;
}

function fadeTo(target: number, ms: number, done?: () => void): void {
  if (!audio) { done?.(); return; }
  if (fadeTimer !== null) window.clearInterval(fadeTimer);
  const from = level, steps = Math.max(1, Math.round(ms / 40));
  let i = 0;
  fadeTimer = window.setInterval(() => {
    i += 1;
    setLevel(from + (target - from) * (i / steps));
    if (i >= steps) { if (fadeTimer !== null) window.clearInterval(fadeTimer); fadeTimer = null; done?.(); }
  }, 40);
}

function ensureAudio(): HTMLAudioElement {
  if (audio) return audio;
  audio = new Audio();
  audio.loop = true;
  audio.preload = "auto";
  audio.setAttribute("playsinline", "");
  return audio;
}

/** 첫 제스처 안에서 — 게인 노드로 잇는다. AudioContext 가 없거나 실패하면 audio.volume 으로 */
function ensureGraph(el: HTMLAudioElement): void {
  if (ctx) { if (ctx.state !== "running") void ctx.resume().catch(() => undefined); return; }
  const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) { el.volume = level; return; }
  try {
    ctx = new AC();
    gain = ctx.createGain();
    gain.gain.value = level;
    ctx.createMediaElementSource(el).connect(gain);
    gain.connect(ctx.destination);
    el.volume = 1;
    void ctx.resume().catch(() => undefined);
  } catch {
    ctx = null; gain = null;
    el.volume = level;
  }
}

function apply(): void {
  if (typeof window === "undefined") return;
  const src = want();
  if (!src || appHidden || document.visibilityState === "hidden") {
    if (audio && !audio.paused) fadeTo(0, 300, () => audio?.pause());
    return;
  }
  if (!unlocked) return;   // 첫 사용자 입력을 기다린다
  const url = assetUrl(src);
  const el = ensureAudio();
  if (ctx && ctx.state !== "running") void ctx.resume().catch(() => undefined);
  const play = () => {
    el.play().then(() => { primed = true; fadeTo(BGM_VOLUME, 600); }).catch(() => { if (!primed) unlocked = false; });
  };
  if (el.dataset.src !== url) {
    const swap = () => { el.dataset.src = url; el.src = url; el.currentTime = 0; play(); };
    if (!el.paused && level > 0.01) fadeTo(0, 600, swap); else swap();
  } else if (el.paused) {
    play();
  } else if (level < BGM_VOLUME - 0.01) {
    fadeTo(BGM_VOLUME, 400);
  }
}

/** 지금 화면의 곡 — App 이 화면이 바뀔 때마다 부른다 */
export function setBgmScene(next: BgmScene): void {
  scene = next;
  start();
  apply();
}

/** 사냥터 안 분위기 — TitansGame 이 대장전 · 상점 · 지역이 바뀔 때 부른다 (2026-10-28). 같은 곡이면 그대로 */
export function setHuntBgm(mood: HuntMood): void {
  if (huntMood === mood) return;
  huntMood = mood;
  if (started) apply();
}

/** 지금 재생 중인 곡(검사용) */
export function bgmState(): { scene: BgmScene; src: string | null; playing: boolean; unlocked: boolean; level: number; output: "gain" | "element" | "none" } {
  return { scene, src: audio?.dataset.src ?? null, playing: !!audio && !audio.paused, unlocked, level: Math.round(level * 100) / 100, output: gain ? "gain" : audio ? "element" : "none" };
}

function start(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  const gesture = () => {
    const el = ensureAudio();
    ensureGraph(el);
    if (primed) { if (ctx && ctx.state !== "running") void ctx.resume().catch(() => undefined); return; }
    unlocked = true;
    if (want()) { apply(); return; }
    // 곡이 없는 화면(비트 · 성문 전투)에서 온 첫 터치 — 무음으로 한 번 틀어 요소를 풀어 둔다
    if (!el.src) { el.dataset.src = assetUrl(BGM_TRACK.hunt); el.src = el.dataset.src; }
    el.muted = true;
    el.play().then(() => { el.pause(); el.muted = false; primed = true; }).catch(() => { el.muted = false; unlocked = false; });
  };
  // 아이폰은 pointerdown 을 재생 제스처로 안 쳐 줄 때가 있다 — touchend · click 도 받고, 성공할 때까지 매 터치 다시 시도한다
  for (const type of ["pointerdown", "touchend", "click", "keydown"]) window.addEventListener(type, gesture, true);
  window.addEventListener("dodge-sound-change", apply);
  subscribeAppVisibility((hidden) => { appHidden = hidden; apply(); });
}

// 검사용 — 개발 서버에서만 window.__bgm() 으로 지금 곡을 본다(scripts/_probe-bgm.mjs)
if (import.meta.env.DEV && typeof window !== "undefined") (window as unknown as { __bgm?: typeof bgmState }).__bgm = bgmState;
