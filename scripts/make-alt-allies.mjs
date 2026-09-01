/**
 * 얼터너티브 동료 아트 생성 (CRUMBLE_GAP §9).
 *
 * 크럼블의 "얼터너티브 쿠키" 대응 — 신규 원화 대신 로스터 시트의 프레임을
 * 잘라 팔레트를 크게 틀어 파생한다. 캐릭터 스킨 파이프라인과 같은 원칙.
 *
 *   흑화 미아(mia-dark):    tint 보라 + 저휘도 — 어둠에 물든 재해석
 *   성광 세라(sera-light):  tint 골드 — 빛의 재해석
 *
 * 둘 다 tint(휘도 보존) 방식이다 — hue 회전은 피부를 녹색으로 왜곡한다
 * (dawn 스킨과 mia-dark 1차 시도에서 두 번 확인한 교훈).
 *
 *   node scripts/make-alt-allies.mjs
 */
import sharp from "sharp";

const SHEET = "public/titans/generated/ally-roster-weaponless-v2.png";
const FRAMES = 6;

const meta = await sharp(SHEET).metadata();
const frameW = Math.floor(meta.width / FRAMES);

/**
 * 프레임 추출 — insetL/insetR(프레임 폭 비율)로 이웃 프레임의 삐져나온
 * 장식(망토 등)을 잘라낸다. 시트가 균등 격자가 아니라 일부 겹침이 있다.
 */
async function frame(index, insetL = 0, insetR = 0) {
  const left = Math.round(index * frameW + frameW * insetL);
  const width = Math.round(frameW * (1 - insetL - insetR));
  return sharp(SHEET).extract({ left, top: 0, width, height: meta.height });
}

// 흑화 미아 — mia(프레임 0)를 심연 보라 tint + 저휘도로
await (await frame(0))
  .tint({ r: 168, g: 140, b: 216 })
  .modulate({ brightness: 0.78, saturation: 1.1 })
  .png()
  .toFile("public/titans/generated/allies/mia-dark.png");
console.log("generated mia-dark.png");

// 성광 세라 — sera(프레임 2)를 골드 tint로. 좌측 15.5%는 이웃 프레임의 망토 잔재라 잘라낸다.
await (await frame(2, 0.155, 0))
  .tint({ r: 255, g: 224, b: 148 })
  .modulate({ brightness: 1.1, saturation: 1.05 })
  .png()
  .toFile("public/titans/generated/allies/sera-light.png");
console.log("generated sera-light.png");
