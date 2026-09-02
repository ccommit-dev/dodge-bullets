/**
 * 결과 공유 카드 (RETENTION_DESIGN H) — canvas로 1080×1350 카드를 그려 Web Share로 내보낸다.
 * 서버 없음. 공유 API가 없으면 이미지를 새 탭으로 열어 저장하게 한다.
 */
import { assetUrl } from "../asset";

export type ShareCardInput = {
  headline: string;
  subline: string;
  /** 0~3 별 (없으면 표시 안 함) */
  stars?: number;
  power: number;
  titleName?: string;
  titleColor?: string;
  /** 캐릭터 시트 URL — 좌측 하단 실루엣 */
  characterSheet?: string;
  accent?: string;
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function renderShareCard(input: ShareCardInput): Promise<Blob | null> {
  const W = 1080;
  const Hh = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = Hh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const accent = input.accent ?? "#5eead4";

  // 배경 — 심야 그라디언트 + 광선
  const bg = ctx.createLinearGradient(0, 0, 0, Hh);
  bg.addColorStop(0, "#0b1220");
  bg.addColorStop(1, "#1e1b4b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, Hh);
  ctx.save();
  ctx.translate(W / 2, 520);
  for (let i = 0; i < 18; i += 1) {
    ctx.rotate((Math.PI * 2) / 18);
    ctx.fillStyle = `rgba(94,234,212,${i % 2 ? 0.05 : 0.09})`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(80, -900);
    ctx.lineTo(-80, -900);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 프레임
  ctx.strokeStyle = `${accent}99`;
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, W - 80, Hh - 80);

  ctx.textAlign = "center";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "800 34px system-ui, sans-serif";
  ctx.fillText("DODGE LAB · EXPEDITION RECORD", W / 2, 130);

  if (input.titleName) {
    ctx.fillStyle = input.titleColor ?? "#fcd34d";
    ctx.font = "900 44px system-ui, sans-serif";
    ctx.shadowColor = input.titleColor ?? "#fcd34d";
    ctx.shadowBlur = 24;
    ctx.fillText(`✦ ${input.titleName}`, W / 2, 210);
    ctx.shadowBlur = 0;
  }

  ctx.fillStyle = "#f8fafc";
  ctx.font = "900 78px system-ui, sans-serif";
  ctx.fillText(input.headline, W / 2, 330);
  ctx.fillStyle = "#cbd5f5";
  ctx.font = "600 40px system-ui, sans-serif";
  ctx.fillText(input.subline, W / 2, 400);

  // 별
  if (input.stars !== undefined) {
    const star = await loadImage(assetUrl("ui/idle/star.svg"));
    for (let i = 0; i < 3; i += 1) {
      const x = W / 2 - 160 + i * 160;
      const y = 470;
      ctx.save();
      ctx.globalAlpha = i < input.stars ? 1 : 0.22;
      if (star) ctx.drawImage(star, x - 60, y, 120, 120);
      ctx.restore();
    }
  }

  // 캐릭터 실루엣 (idle 시트 첫 프레임)
  const sheet = await loadImage(input.characterSheet ?? assetUrl("titans/character/base/hero-idle.png"));
  if (sheet) {
    const fw = sheet.width / 4;
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 40;
    ctx.drawImage(sheet, 0, 0, fw, sheet.height, 120, 640, 420, (420 * sheet.height) / fw);
    ctx.restore();
  }

  // 전투력 패널
  ctx.fillStyle = "rgba(8,18,33,0.78)";
  ctx.beginPath();
  ctx.roundRect(560, 700, 440, 220, 28);
  ctx.fill();
  ctx.strokeStyle = `${accent}66`;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#94a3b8";
  ctx.font = "800 30px system-ui, sans-serif";
  ctx.fillText("통합 전투력", 780, 760);
  ctx.fillStyle = accent;
  ctx.font = "900 84px system-ui, sans-serif";
  ctx.fillText(input.power.toLocaleString(), 780, 860);

  ctx.fillStyle = "#64748b";
  ctx.font = "600 30px system-ui, sans-serif";
  ctx.fillText("타이탄 사냥터 · 화살 원정 · 비트 수련 · 대장간", W / 2, Hh - 110);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/** 공유 — Web Share(files) → 실패 시 새 탭 열기(저장 가능). 반환값은 어떤 경로였는지 */
export async function shareCard(blob: Blob, fileName = "dodgelab-record.png"): Promise<"shared" | "opened" | "failed"> {
  const file = new File([blob], fileName, { type: "image/png" });
  try {
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
      await nav.share({ files: [file], title: "DODGE LAB 원정 기록" });
      return "shared";
    }
  } catch {
    /* 사용자가 취소했거나 미지원 — 폴백 */
  }
  try {
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return "opened";
  } catch {
    return "failed";
  }
}
