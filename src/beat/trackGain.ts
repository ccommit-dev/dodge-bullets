/**
 * 비트 곡 음량 맞추기 (2026-11-03, 아쉬운 점 "소리는 귀로 확인 못 함" → scripts/audit-audio-files.mjs 실측) —
 * o2jam 곡이 -3.6 ~ -10 LUFS 로 사냥터 음악(-15.6)보다 훨씬 크고 트루 피크가 +5.9 dB 까지 넘어 깨질 수 있었다. 곡끼리도 6.4 LU 차이.
 * 예전 audio.volume = 0.72 는 아이폰이 무시해 그대로 나갔다. 파일을 다시 인코딩하면 첫머리 지연이 바뀌어 채보 박자가 어긋날 수 있어,
 * 파일은 두고 재생할 때 Web Audio 게인으로 -14 LUFS 에 맞춘다(피크 -1 dB 아래가 먼저). 새 곡은 audit 값을 여기에 — verify-audio-signal 이 빠진 곡을 잡는다
 */
const TARGET_LUFS = -14;
const PEAK_CEILING_DB = -1;

/** 파일 → [통합 음량 LUFS, 트루 피크 dB] (ffmpeg ebur128) */
export const TRACK_LOUDNESS: Record<string, readonly [number, number]> = {
  "arcade-overdrive.mp3": [-11.0, 0.6],
  "starlight-strut.mp3": [-11.6, 0.5],
  "cybernetic-overload.mp3": [-12.4, 1.1],
  "pixel-rush.mp3": [-12.5, -0.1],
  "happy-strum-day.mp3": [-12.6, 0.6],
  "playful-pixels.mp3": [-14.1, 0.1],
  "o2jam/azure-sky.m4a": [-3.6, 5.4],
  "o2jam/dual-racing.m4a": [-4.6, 3.5],
  "o2jam/plasma-gun.m4a": [-4.7, 3.2],
  "o2jam/duel.m4a": [-6.8, 3.0],
  "o2jam/one-more-time.m4a": [-7.1, 3.2],
  "o2jam/andromeda.m4a": [-7.5, 5.9],
  "o2jam/cherry-pop.m4a": [-7.7, 2.8],
  "o2jam/turkish-march.m4a": [-7.8, 1.6],
  "o2jam/strawberry-lemonade.m4a": [-8.3, 3.1],
  "o2jam/black-city-beat.m4a": [-10.0, 2.3],
};

/** 곡의 재생 배율(선형) — 표에 없는 곡은 예전 값 0.72 */
export function trackGainFor(audioFile: string): number {
  const row = TRACK_LOUDNESS[audioFile];
  if (!row) return 0.72;
  const db = Math.min(0, TARGET_LUFS - row[0], PEAK_CEILING_DB - row[1]);
  return Math.pow(10, db / 20);
}
