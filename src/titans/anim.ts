export const IDLE_FRAMES = Array.from(
  { length: 26 },
  (_, i) => `/titans/idle/idle_${String(i + 1).padStart(2, "0")}.jpg`,
);

export const ATTACK_FRAMES = Array.from(
  { length: 16 },
  (_, i) => `/titans/attack/atk_${String(i + 1).padStart(2, "0")}.jpg`,
);

export const IDLE_FRAME_MS = 55;
/** Full attack clip target length — snappy for tap combat. */
export const ATTACK_CLIP_MS = 280;

export function preloadFrames(urls: string[]): void {
  for (const url of urls) {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }
}
