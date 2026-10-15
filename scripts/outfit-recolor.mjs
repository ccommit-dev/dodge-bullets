import sharp from "sharp";

/**
 * 옷·장비만 색 바꾸기 (2026-10-15, 사용자: "리소스 어색한 거" — 스킨이 한 색으로 덮여 납작해 보였다).
 * 털·피부(색상 10~50° 의 갈색·크림)와 무채색(흰·검정 외곽선)은 그대로 두고, 나머지(옷·갑옷·무기)만 스킨 색(rgb)으로 —
 * 밝기는 원래 픽셀 그대로라 음영·광택이 남는다. 3D 원화의 입체감을 살린다.
 */
export async function outfitRecolor(buf, rgb, brightness, saturation) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const tl = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255 || 0.5;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 20) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0;
    let h = 0; if (mx !== mn) { if (mx === r) h = 60 * (((g - b) / (mx - mn)) % 6); else if (mx === g) h = 60 * ((b - r) / (mx - mn) + 2); else h = 60 * ((r - g) / (mx - mn) + 4); } if (h < 0) h += 360;
    const fur = h >= 10 && h <= 50 && sat > 0.12 && sat < 0.75;
    const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (fur) continue;
    // 무채색: 외곽선(어두움)·흰 하이라이트는 그대로, 중간 밝기 금속(은 갑옷·칼날)은 절반만 물들인다
    if (sat < 0.12 && (l < 0.28 || l > 0.9)) continue;
    const k = l / tl;
    const mix = sat < 0.12 ? 0.5 : 0.85;
    data[i] = Math.min(255, r * (1 - mix) + rgb[0] * k * mix);
    data[i + 1] = Math.min(255, g * (1 - mix) + rgb[1] * k * mix);
    data[i + 2] = Math.min(255, b * (1 - mix) + rgb[2] * k * mix);
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).modulate({ brightness: (brightness - 1) * 0.5 + 1, saturation: Math.max(1, saturation) }).png().toBuffer();
}
