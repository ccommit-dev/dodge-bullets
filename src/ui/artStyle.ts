/**
 * 그림체 선택 (2026-11-17, /goal ③ "도트") — 셀(기본) · 도트.
 * 도트는 같은 3D 리그를 낮은 해상도 · 픽셀마다 한 점으로 렌더한 시트(public/titans/anim-px · gear-px)와 픽셀화한 배경(backgrounds-px)을 쓴다.
 * 경로는 assetUrl 한 곳에서 바꾼다(asset.ts) — 시트 · 무기 · 입는 파츠 · 사냥터 배경. 화면에 맞춰 키울 때는 image-rendering: pixelated(ui/pixelMode.css).
 * 기기마다의 편의 값이라 localStorage 에 둔다(못 읽으면 셀). 바꾸면 다시 불러온다 — 미리 읽어 둔 그림 · 캔버스가 섞이지 않게.
 */
export type ArtStyle = "cel" | "pixel";
const KEY = "dodgebullets:art-style";

let cached: ArtStyle | null = null;
export function getArtStyle(): ArtStyle {
  if (cached) return cached;
  let v: string | null = null;
  try { v = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null; } catch { v = null; }
  cached = v === "pixel" ? "pixel" : "cel";
  return cached;
}
export function isPixelArt(): boolean { return getArtStyle() === "pixel"; }

export function setArtStyle(style: ArtStyle, reload = true): void {
  try { localStorage.setItem(KEY, style); } catch { /* 저장 못 하면 이번만 */ }
  cached = style;
  applyArtStyleClass();
  if (reload && typeof location !== "undefined") location.reload();
}

/** html.art-pixel — 첫 그리기 전에 부른다(main) */
export function applyArtStyleClass(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("art-pixel", isPixelArt());
}

/** 도트 그림이 있는 경로 → 도트 경로 (없는 경로는 그대로) */
const PIXEL_PATHS: [RegExp, string][] = [
  [/^titans\/anim\/(allies|monsters|monsters-hd|hero|hero-gear)\//, "titans/anim-px/$1/"],
  [/^titans\/gear\/(skins\/[\w-]+\/)?(weapon|spear|bow|staff)-(\d)\.png$/, "titans/gear-px/$1$2-$3.png"],
  [/^titans\/backgrounds\//, "titans/backgrounds-px/"],
  [/^titans\/mounts\//, "titans/mounts-px/"],   // 탈것 아이콘(장비창) — scripts/make-mount-icons.mjs
];
export function pixelPath(path: string): string {
  if (!isPixelArt()) return path;
  if (/\/hero-portrait\.webp$/.test(path)) return path;   // 초상은 셀 그림 그대로(아이콘 칸)
  for (const [re, to] of PIXEL_PATHS) if (re.test(path)) return path.replace(re, to);
  return path;
}
