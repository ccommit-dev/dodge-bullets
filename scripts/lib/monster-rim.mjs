/**
 * 몬스터 테두리빛 (2026-11-19, 리소스 피드백 ③ "몬스터가 바닥에 묻힌다") — 잉크 외곽선 바깥에 크림색 빛 2px(화면 기준)를 굽는다.
 * 어두운 몬스터(지옥견 · 그림자 늑대)가 어두운 땅(화산 · 심연 · 숲 흙길)에서 묻혔다. 실행 중 drop-shadow 를 더 거는 대신 시트에 굽는다
 * — 애니메이션 칸이 바뀔 때마다 필터를 다시 돌리지 않게. 칸마다 따로 흐려 옆 칸으로 번지지 않게 하고, 칸 가장자리 6px 는 비운다.
 * 셀 시트만(도트 시트는 화소 덩어리 크기가 칸마다 달라 흐린 빛이 결에 안 맞는다 — 굵은 외곽선만).
 */
import sharp from "sharp";

const RIM = { r: 255, g: 244, b: 214 }, SIGMA_384 = 3.4, GAIN = 4.2, MAX_A = 0.96, BORDER = 6;   // 화면에서 약 2.5px(게임 CSS 잉크 외곽선이 그 바깥을 한 번 더 두른다 — 스티커처럼 진갈 · 크림 · 진갈)

/** png/webp 버퍼(또는 경로) → 테두리빛을 구운 PNG 버퍼. cell: 칸 한 변(px, 정사각) */
export async function addMonsterRim(input, cell) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const sigma = SIGMA_384 * (cell / 384);
  const out = Buffer.from(data);
  for (let cy = 0; cy < h; cy += cell) for (let cx = 0; cx < w; cx += cell) {
    const cw = Math.min(cell, w - cx), ch = Math.min(cell, h - cy);
    const a = Buffer.alloc(cw * ch);
    let any = false;
    for (let y = 0; y < ch; y += 1) for (let x = 0; x < cw; x += 1) { const v = data[((cy + y) * w + cx + x) * 4 + 3]; a[y * cw + x] = v; if (v) any = true; }
    if (!any) continue;
    // 한 채널 raw 도 sharp 가 3채널로 돌려줄 수 있다 — 채널 수를 읽어 인덱싱(처음엔 1로 가정해 줄무늬가 났다)
    const { data: blur, info: bi } = await sharp(a, { raw: { width: cw, height: ch, channels: 1 } }).blur(sigma).raw().toBuffer({ resolveWithObject: true });
    const bc = bi.channels;
    for (let y = BORDER; y < ch - BORDER; y += 1) for (let x = BORDER; x < cw - BORDER; x += 1) {
      const i = ((cy + y) * w + cx + x) * 4, sa = data[i + 3] / 255;
      if (sa >= 0.999) continue;
      const ha = Math.min(MAX_A, (blur[(y * cw + x) * bc] / 255) * GAIN);
      if (ha <= 0.004) continue;
      // 원본(위) over 테두리빛(아래)
      const oa = sa + ha * (1 - sa);
      for (const [c, rc] of [[0, RIM.r], [1, RIM.g], [2, RIM.b]]) out[i + c] = Math.round((data[i + c] * sa + rc * ha * (1 - sa)) / oa);
      out[i + 3] = Math.round(oa * 255);
    }
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

/** 테두리빛을 받을 시트 — 적만(탈것 · 펫은 아군 쪽) */
export const rimmedMonster = (id) => !id.startsWith("mount-") && !id.startsWith("pet-");
