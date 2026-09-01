/**
 * 동료 스킨(코스튬) 생성 — 얼터너티브 동료(§9)에서 검증한 tint 파이프라인 재사용.
 *
 * 얼터너티브와의 차이: 스킨은 "같은 동료의 외형만" 바꾼다 (성급·레벨 공유).
 *
 *   용암 기사 가렌(garen-magma):  마그마 오렌지 tint + 살짝 어둡게 — 화산 무구
 *   설원 궁수 레온(leon-frost):   한랭 아이스 블루 tint + 밝게 — 설원 위장
 *
 * tint(휘도 보존)만 사용 — hue 회전은 피부를 왜곡한다 (반복 확인된 교훈).
 *
 *   node scripts/make-ally-skins.mjs
 */
import sharp from "sharp";

const SHEET = "public/titans/generated/ally-roster-weaponless-v2.png";
const FRAMES = 6;

const meta = await sharp(SHEET).metadata();
const frameW = Math.floor(meta.width / FRAMES);

function frame(index, insetL = 0, insetR = 0) {
  const left = Math.round(index * frameW + frameW * insetL);
  const width = Math.round(frameW * (1 - insetL - insetR));
  return sharp(SHEET).extract({ left, top: 0, width, height: meta.height });
}

// 용암 기사 가렌 — garen(프레임 3)
await frame(3)
  .tint({ r: 255, g: 138, b: 76 })
  .modulate({ brightness: 0.92, saturation: 1.15 })
  .png()
  .toFile("public/titans/generated/allies/garen-magma.png");
console.log("generated garen-magma.png");

// 설원 궁수 레온 — leon(프레임 1) · 좌측 7%는 이웃 프레임 손 잔재라 잘라낸다
await frame(1, 0.07, 0)
  .tint({ r: 158, g: 210, b: 255 })
  .modulate({ brightness: 1.08, saturation: 1.05 })
  .png()
  .toFile("public/titans/generated/allies/leon-frost.png");
console.log("generated leon-frost.png");
