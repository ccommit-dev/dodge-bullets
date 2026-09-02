/**
 * 애니메이션 아틀라스 배경 키잉 — 체커보드(흰/연회색)가 픽셀로 박힌 시트에 알파를 만든다.
 *
 *   node scripts/key-atlas.mjs
 *
 * 방식: 각 셀의 네 가장자리에서 "배경처럼 보이는" 픽셀(무채색 & 밝음)만 따라
 * 플러드필한다. 캐릭터 내부의 흰 옷·은발은 가장자리와 연결되지 않으면 살아남는다.
 * 경계 픽셀은 밝기에 따라 부분 알파를 줘 계단 현상을 줄인다.
 */
import sharp from "sharp";

const TARGETS = [
  { file: "public/titans/generated/allies/ally-animation-atlas-v1.png", cols: 4, rows: 6 },
  { file: "public/titans/generated/allies/ally-special-animation-atlas-v1.png", cols: 4, rows: 4 },
];

/** 무채색이고 밝으면 배경 후보 — 체커는 ~253/~235 두 톤 */
function isBackground(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min <= 10 && min >= 222;
}
/** 경계 완충: 밝은 무채색이지만 임계 아래 — 부분 알파 */
function softness(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min > 14) return 1;
  if (min >= 222) return 0;
  if (min >= 196) return (222 - min) / 26;
  return 1;
}

for (const t of TARGETS) {
  const { data, info } = await sharp(t.file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const cellW = Math.floor(width / t.cols);
  const cellH = Math.floor(height / t.rows);
  const visited = new Uint8Array(width * height);
  const removed = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);

  for (let cy = 0; cy < t.rows; cy += 1) {
    for (let cx = 0; cx < t.cols; cx += 1) {
      const x0 = cx * cellW;
      const y0 = cy * cellH;
      const x1 = cx === t.cols - 1 ? width - 1 : x0 + cellW - 1;
      const y1 = cy === t.rows - 1 ? height - 1 : y0 + cellH - 1;
      let sp = 0;
      const push = (x, y) => {
        const idx = y * width + x;
        if (visited[idx]) return;
        visited[idx] = 1;
        const p = idx * 4;
        if (!isBackground(data[p], data[p + 1], data[p + 2])) return;
        removed[idx] = 1;
        stack[sp++] = idx;
      };
      for (let x = x0; x <= x1; x += 1) {
        push(x, y0);
        push(x, y1);
      }
      for (let y = y0; y <= y1; y += 1) {
        push(x0, y);
        push(x1, y);
      }
      while (sp > 0) {
        const idx = stack[--sp];
        const x = idx % width;
        const y = (idx - x) / width;
        if (x > x0) push(x - 1, y);
        if (x < x1) push(x + 1, y);
        if (y > y0) push(x, y - 1);
        if (y < y1) push(x, y + 1);
      }
    }
  }

  // 알파 적용: 제거 픽셀 0, 제거 픽셀에 인접한 밝은 무채색은 부분 알파
  let cleared = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      const p = idx * 4;
      if (removed[idx]) {
        data[p + 3] = 0;
        cleared += 1;
        continue;
      }
      const near =
        (x > 0 && removed[idx - 1]) ||
        (x < width - 1 && removed[idx + 1]) ||
        (y > 0 && removed[idx - width]) ||
        (y < height - 1 && removed[idx + width]);
      if (near) {
        const s = softness(data[p], data[p + 1], data[p + 2]);
        data[p + 3] = Math.round(255 * Math.max(0.25, s));
      }
    }
  }
  await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(t.file);
  console.log(`keyed ${t.file} — cleared ${((cleared / (width * height)) * 100).toFixed(1)}% background`);
}
