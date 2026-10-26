/**
 * 배경 음악 (2026-10-26, 사용자: "사운드 bgm 추가").
 *
 * 저장소에 이미 있는 로열티 프리 곡(public/audio · LICENSE-cybernetic-overload.md — ElevenLabs gaming music)을 화면마다 하나씩 반복한다.
 * 비트 수련은 곡이 게임 자체라 끈다. 사운드 토글(game/sound.ts saveSoundEnabled → "dodge-sound-change" 이벤트)을 그대로 따르고,
 * 브라우저 자동 재생 정책 때문에 첫 터치 · 키 입력 뒤에 시작한다. 탭을 숨기면 멈추고 돌아오면 이어 튼다. 곡이 바뀌면 0.6초 동안 줄였다 키운다.
 */
import { assetUrl } from "../asset";
import { loadSoundEnabled } from "../game/sound";

export type BgmScene = "hunt" | "dodge" | "forge" | "menu" | "off";

/** 화면 → 곡 */
export const BGM_TRACK: Record<Exclude<BgmScene, "off">, string> = {
  hunt: "audio/happy-strum-day.mp3",
  dodge: "audio/arcade-overdrive.mp3",
  forge: "audio/playful-pixels.mp3",
  menu: "audio/playful-pixels.mp3",
};
export const BGM_VOLUME = 0.32;

let audio: HTMLAudioElement | null = null;
let scene: BgmScene = "off";
let unlocked = false;
let fadeTimer: number | null = null;
let started = false;

const want = (): string | null => (scene === "off" || !loadSoundEnabled() ? null : BGM_TRACK[scene]);

function fadeTo(target: number, ms: number, done?: () => void): void {
  if (!audio) { done?.(); return; }
  if (fadeTimer !== null) window.clearInterval(fadeTimer);
  const el = audio;
  const from = el.volume, steps = Math.max(1, Math.round(ms / 40));
  let i = 0;
  fadeTimer = window.setInterval(() => {
    i += 1;
    el.volume = Math.max(0, Math.min(1, from + (target - from) * (i / steps)));
    if (i >= steps) { if (fadeTimer !== null) window.clearInterval(fadeTimer); fadeTimer = null; done?.(); }
  }, 40);
}

function apply(): void {
  if (typeof window === "undefined") return;
  const src = want();
  if (!src || document.visibilityState === "hidden") {
    if (audio && !audio.paused) fadeTo(0, 300, () => audio?.pause());
    return;
  }
  if (!unlocked) return;   // 첫 사용자 입력을 기다린다
  const url = assetUrl(src);
  if (!audio) {
    audio = new Audio();
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
  }
  const el = audio;
  const play = () => { el.play().then(() => fadeTo(BGM_VOLUME, 600)).catch(() => undefined); };
  if (el.dataset.src !== url) {
    const swap = () => { el.dataset.src = url; el.src = url; el.currentTime = 0; play(); };
    if (!el.paused && el.volume > 0.01) fadeTo(0, 600, swap); else swap();
  } else if (el.paused) {
    play();
  } else if (el.volume < BGM_VOLUME - 0.01) {
    fadeTo(BGM_VOLUME, 400);
  }
}

/** 지금 화면의 곡 — App 이 화면이 바뀔 때마다 부른다 */
export function setBgmScene(next: BgmScene): void {
  scene = next;
  start();
  apply();
}

/** 지금 재생 중인 곡(검사용) */
export function bgmState(): { scene: BgmScene; src: string | null; playing: boolean; unlocked: boolean } {
  return { scene, src: audio?.dataset.src ?? null, playing: !!audio && !audio.paused, unlocked };
}

function start(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
    apply();
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
  window.addEventListener("dodge-sound-change", apply);
  document.addEventListener("visibilitychange", apply);
}

// 검사용 — 개발 서버에서만 window.__bgm() 으로 지금 곡을 본다(scripts/_probe-bgm.mjs)
if (import.meta.env.DEV && typeof window !== "undefined") (window as unknown as { __bgm?: typeof bgmState }).__bgm = bgmState;
