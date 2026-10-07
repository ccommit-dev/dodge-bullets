/**
 * 결과 공유 카드 (RETENTION_DESIGN H) — canvas로 1080×1350 카드를 그려 Web Share로 내보낸다.
 * 서버 없음. 공유 API가 없으면 이미지를 새 탭으로 열어 저장하게 한다.
 *
 * 2026-10-06 개편 (사용자: "DODGE LAB 원정 기록 페이지 조금더 있어보이게 수정 + 동료나 아이템도 같이 넣어서") —
 * 배경 원화 · 금테 액자 · 주인공 + 전투력 + 기록 4칸 · 함께한 동료 4명 초상(레벨) · 장비(대검·견갑·장착 스킬 무기)를 한 장에.
 * 예전 카드는 남색 바탕에 글자 두 줄 · 실루엣 · 전투력 하나였다.
 */
import { assetUrl } from "../asset";
import { isNativePlatform } from "../game/native";

export type ShareCardAlly = { name: string; level?: number; src: string; cols: number; rows: number; row: number; wide: boolean };
export type ShareCardItem = { name: string; sub?: string; src: string; /** 시트에서 한 칸만 — 견갑 시트처럼 가로로 늘어선 그림 */ crop?: { cols: number; col: number } };
export type ShareCardStat = { label: string; value: string };

export type ShareCardInput = {
  headline: string;
  subline: string;
  /** 0~3 별 (없으면 표시 안 함) */
  stars?: number;
  power: number;
  titleName?: string;
  titleColor?: string;
  /** 캐릭터 시트 URL — 주인공 */
  characterSheet?: string;
  accent?: string;
  /** 배경 원화 (전장 · 사냥터) */
  backdrop?: string;
  allies?: ShareCardAlly[];
  items?: ShareCardItem[];
  stats?: ShareCardStat[];
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const FONT = "system-ui, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, stroke: string, fill = "rgba(8,14,28,0.72)") {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
}

/** 글자가 칸보다 길면 줄인다 */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, weight: number, size: number, min = 16) {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (s > min && ctx.measureText(text).width > maxW) { s -= 2; ctx.font = `${weight} ${s}px ${FONT}`; }
}

function sectionTitle(ctx: CanvasRenderingContext2D, text: string, y: number, W: number, gold: string) {
  ctx.save();
  ctx.font = `900 30px ${FONT}`;
  ctx.textAlign = "center";
  const tw = ctx.measureText(text).width;
  ctx.strokeStyle = `${gold}aa`; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(90, y - 10); ctx.lineTo(W / 2 - tw / 2 - 24, y - 10); ctx.moveTo(W / 2 + tw / 2 + 24, y - 10); ctx.lineTo(W - 90, y - 10); ctx.stroke();
  ctx.fillStyle = gold;
  ctx.beginPath(); ctx.moveTo(W / 2 - tw / 2 - 14, y - 10); ctx.lineTo(W / 2 - tw / 2 - 8, y - 16); ctx.lineTo(W / 2 - tw / 2 - 2, y - 10); ctx.lineTo(W / 2 - tw / 2 - 8, y - 4); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W / 2 + tw / 2 + 2, y - 10); ctx.lineTo(W / 2 + tw / 2 + 8, y - 16); ctx.lineTo(W / 2 + tw / 2 + 14, y - 10); ctx.lineTo(W / 2 + tw / 2 + 8, y - 4); ctx.fill();
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(text, W / 2, y);
  ctx.restore();
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
  const gold = "#fcd34d";

  // 그림을 한 번에 읽는다 — 하나가 없어도 카드는 그린다
  const [backdrop, star, sheet, allyImgs, itemImgs] = await Promise.all([
    input.backdrop ? loadImage(input.backdrop) : Promise.resolve(null),
    loadImage(assetUrl("ui/idle/star.svg")),
    loadImage(input.characterSheet ?? assetUrl("titans/character/base/hero-idle.png")),
    Promise.all((input.allies ?? []).slice(0, 4).map((a) => loadImage(a.src))),
    Promise.all((input.items ?? []).slice(0, 6).map((it) => loadImage(it.src))),
  ]);

  // ── 배경: 원화(덮기) + 남색 그라디언트 + 광선 + 비네트 ──
  const bg = ctx.createLinearGradient(0, 0, 0, Hh);
  bg.addColorStop(0, "#0b1220");
  bg.addColorStop(1, "#1e1b4b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, Hh);
  if (backdrop) {
    const s = Math.max(W / backdrop.width, Hh / backdrop.height);
    const bw = backdrop.width * s, bh = backdrop.height * s;
    ctx.globalAlpha = 0.55;
    ctx.drawImage(backdrop, (W - bw) / 2, (Hh - bh) / 2, bw, bh);
    ctx.globalAlpha = 1;
    const shade = ctx.createLinearGradient(0, 0, 0, Hh);
    shade.addColorStop(0, "rgba(6,10,24,.55)");
    shade.addColorStop(0.45, "rgba(6,10,24,.35)");
    shade.addColorStop(1, "rgba(6,10,24,.92)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, Hh);
  }
  ctx.save();
  ctx.translate(W / 2, 600);
  for (let i = 0; i < 18; i += 1) {
    ctx.rotate((Math.PI * 2) / 18);
    ctx.fillStyle = `rgba(253,224,71,${i % 2 ? 0.025 : 0.05})`;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(80, -900); ctx.lineTo(-80, -900); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  const vig = ctx.createRadialGradient(W / 2, Hh / 2, 300, W / 2, Hh / 2, 900);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,.55)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, Hh);

  // ── 금테 액자 + 모서리 장식 ──
  ctx.strokeStyle = `${gold}cc`; ctx.lineWidth = 6;
  ctx.strokeRect(32, 32, W - 64, Hh - 64);
  ctx.strokeStyle = `${gold}55`; ctx.lineWidth = 2;
  ctx.strokeRect(46, 46, W - 92, Hh - 92);
  ctx.fillStyle = gold;
  for (const [cx, cy] of [[32, 32], [W - 32, 32], [32, Hh - 32], [W - 32, Hh - 32]] as const) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4);
    ctx.fillRect(-14, -14, 28, 28);
    ctx.fillStyle = "#0b1220"; ctx.fillRect(-7, -7, 14, 14);
    ctx.restore(); ctx.fillStyle = gold;
  }

  // ── 머리: 브랜드 · 칭호 · 제목 · 부제 · 별 ──
  ctx.textAlign = "center";
  ctx.fillStyle = "#cbd5e1";
  ctx.font = `800 28px ${FONT}`;
  ctx.fillText("GROW A BEAVER  ·  EXPEDITION RECORD", W / 2, 108);
  let y = 108;
  if (input.titleName) {
    y += 56;
    ctx.fillStyle = input.titleColor ?? gold;
    ctx.font = `900 40px ${FONT}`;
    ctx.shadowColor = input.titleColor ?? gold; ctx.shadowBlur = 24;
    ctx.fillText(`✦ ${input.titleName} ✦`, W / 2, y);
    ctx.shadowBlur = 0;
  }
  y += 86;
  ctx.fillStyle = "#f8fafc";
  fitText(ctx, input.headline, W - 160, 900, 72, 40);
  ctx.shadowColor = "rgba(0,0,0,.8)"; ctx.shadowBlur = 12;
  ctx.fillText(input.headline, W / 2, y);
  ctx.shadowBlur = 0;
  y += 52;
  ctx.fillStyle = "#e2e8f0";
  fitText(ctx, input.subline, W - 160, 700, 34, 22);
  ctx.fillText(input.subline, W / 2, y);
  if (input.stars !== undefined) {
    y += 18;
    for (let i = 0; i < 3; i += 1) {
      const x = W / 2 - 120 + i * 120;
      ctx.save();
      ctx.globalAlpha = i < input.stars ? 1 : 0.22;
      if (i < input.stars) { ctx.shadowColor = gold; ctx.shadowBlur = 20; }
      if (star) ctx.drawImage(star, x - 40, y, 80, 80);
      ctx.restore();
    }
    y += 80;
  }

  // ── 주인공 · 전투력 · 기록 ──
  const heroTop = Math.max(y + 14, 380);
  const heroH = 372;
  const glow = ctx.createRadialGradient(270, heroTop + heroH * 0.55, 20, 270, heroTop + heroH * 0.55, 240);
  glow.addColorStop(0, `${accent}66`); glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow; ctx.fillRect(40, heroTop, 480, heroH);
  // 발판
  ctx.fillStyle = "rgba(0,0,0,.45)";
  ctx.beginPath(); ctx.ellipse(270, heroTop + heroH - 18, 150, 22, 0, 0, Math.PI * 2); ctx.fill();
  if (sheet) {
    const fw = sheet.width / 4;
    const dh = heroH - 20, dw = (dh * fw) / sheet.height;
    ctx.save();
    ctx.shadowColor = accent; ctx.shadowBlur = 36;
    ctx.drawImage(sheet, 0, 0, fw, sheet.height, 270 - dw / 2, heroTop, dw, dh);
    ctx.restore();
  }
  // 전투력
  const px = 540, pw = W - 80 - px;
  panel(ctx, px, heroTop + 10, pw, 150, 26, `${gold}88`);
  ctx.textAlign = "center";
  ctx.fillStyle = "#94a3b8"; ctx.font = `800 28px ${FONT}`;
  ctx.fillText("통합 전투력", px + pw / 2, heroTop + 56);
  ctx.fillStyle = gold; ctx.shadowColor = gold; ctx.shadowBlur = 18;
  fitText(ctx, input.power.toLocaleString(), pw - 40, 900, 78, 40);
  ctx.fillText(input.power.toLocaleString(), px + pw / 2, heroTop + 134);
  ctx.shadowBlur = 0;
  // 기록 2×2
  const stats = (input.stats ?? []).slice(0, 4);
  stats.forEach((st, i) => {
    const cw = (pw - 16) / 2, ch = 96;
    const cx = px + (i % 2) * (cw + 16), cy = heroTop + 178 + Math.floor(i / 2) * (ch + 12);
    panel(ctx, cx, cy, cw, ch, 20, `${accent}55`, "rgba(8,14,28,0.66)");
    ctx.fillStyle = "#94a3b8"; ctx.font = `800 22px ${FONT}`;
    ctx.fillText(st.label, cx + cw / 2, cy + 34);
    ctx.fillStyle = "#f8fafc";
    fitText(ctx, st.value, cw - 20, 900, 38, 20);
    ctx.fillText(st.value, cx + cw / 2, cy + 78);
  });

  // ── 함께한 동료 ──
  let sy = heroTop + heroH + 48;
  const allies = (input.allies ?? []).slice(0, 4);
  if (allies.length) {
    sectionTitle(ctx, "함께한 동료", sy, W, gold);
    const gap = 18, cw = (W - 120 - gap * 3) / 4, ch = 200, cy = sy + 18;
    allies.forEach((a, i) => {
      const cx = 60 + i * (cw + gap);
      const card = ctx.createLinearGradient(0, cy, 0, cy + ch);
      card.addColorStop(0, "rgba(30,41,59,.85)"); card.addColorStop(1, "rgba(8,14,28,.9)");
      panel(ctx, cx, cy, cw, ch, 22, `${gold}77`, "rgba(0,0,0,0)");
      ctx.save(); ctx.fillStyle = card; ctx.beginPath(); ctx.roundRect(cx + 2, cy + 2, cw - 4, ch - 4, 20); ctx.fill(); ctx.restore();
      const img = allyImgs[i];
      if (img) {
        const cellW = img.width / a.cols, cellH = img.height / a.rows;
        // 가로 넓은 셀은 가운데 정사각(세로 기준)만
        const sw = a.wide ? Math.min(cellW, cellH) : cellW, sx = a.wide ? (cellW - sw) / 2 : 0;
        const box = 142, scale = Math.min(box / sw, box / cellH);
        const dw = sw * scale, dh = cellH * scale;
        ctx.save();
        ctx.beginPath(); ctx.roundRect(cx + 4, cy + 4, cw - 8, ch - 60, 18); ctx.clip();
        ctx.drawImage(img, sx, a.row * cellH, sw, cellH, cx + cw / 2 - dw / 2, cy + 8 + (box - dh), dw, dh);
        ctx.restore();
      }
      ctx.fillStyle = "rgba(2,6,23,.75)";
      ctx.fillRect(cx + 3, cy + ch - 58, cw - 6, 55);
      ctx.textAlign = "center";
      ctx.fillStyle = "#f8fafc";
      fitText(ctx, a.name, cw - 16, 900, 26, 16);
      ctx.fillText(a.name, cx + cw / 2, cy + ch - 30);
      if (a.level !== undefined) {
        ctx.fillStyle = gold; ctx.font = `800 19px ${FONT}`;
        ctx.fillText(`Lv.${a.level}`, cx + cw / 2, cy + ch - 9);
      }
    });
    sy = cy + ch + 48;
  }

  // ── 장비 · 무기 ──
  const items = (input.items ?? []).slice(0, 6);
  if (items.length) {
    sectionTitle(ctx, "장비 · 무기", sy, W, gold);
    const gap = 12, cw = (W - 120 - gap * (items.length - 1)) / items.length, ch = 128, cy = sy + 18;
    items.forEach((it, i) => {
      const cx = 60 + i * (cw + gap);
      panel(ctx, cx, cy, cw, ch, 18, `${accent}66`);
      const img = itemImgs[i];
      if (img) {
        const sw = it.crop ? img.width / it.crop.cols : img.width, sx = it.crop ? sw * it.crop.col : 0;
        const box = 66, scale = Math.min(box / sw, box / img.height);
        const dw = sw * scale, dh = img.height * scale;
        ctx.save(); ctx.shadowColor = accent; ctx.shadowBlur = 14;
        ctx.drawImage(img, sx, 0, sw, img.height, cx + cw / 2 - dw / 2, cy + 12 + (box - dh) / 2, dw, dh);
        ctx.restore();
      }
      ctx.textAlign = "center";
      ctx.fillStyle = "#f8fafc";
      fitText(ctx, it.name, cw - 10, 900, 20, 13);
      ctx.fillText(it.name, cx + cw / 2, cy + 98);
      if (it.sub) {
        ctx.fillStyle = gold;
        fitText(ctx, it.sub, cw - 10, 800, 17, 12);
        ctx.fillText(it.sub, cx + cw / 2, cy + 119);
      }
    });
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#94a3b8";
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText("타이탄 사냥터 · 성문 방어 · 비트 수련 · 대장간", W / 2, Hh - 58);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/**
 * 앱(Capacitor)에서는 새 탭이 없다 — window.open(blob:) 은 Capacitor 가 blob 스킴을 WebView 안에서 그대로 열어
 * (Bridge.launchIntent 가 data/blob 에 false) **게임 화면이 이미지로 바뀌고 진행 중인 판이 사라졌다**. 대신 앱 안에 카드를 띄운다.
 */
function showCardOverlay(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const wrap = document.createElement("div");
  wrap.className = "share-card-overlay";
  wrap.setAttribute("role", "dialog");
  wrap.setAttribute("aria-label", "기록 카드");
  wrap.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px;background:rgba(2,6,23,.92)";
  const img = document.createElement("img");
  img.src = url; img.alt = "기록 카드";
  img.style.cssText = "max-width:92vw;max-height:70vh;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.6)";
  const note = document.createElement("p");
  note.textContent = "스크린샷으로 저장해 공유하세요";
  note.style.cssText = "margin:0;color:#e2e8f0;font:800 13px system-ui,sans-serif";
  const close = document.createElement("button");
  close.type = "button"; close.textContent = "닫기"; close.className = "cta";
  close.style.cssText = "width:auto;min-width:140px";
  const done = () => { wrap.remove(); URL.revokeObjectURL(url); };
  close.addEventListener("click", done);
  wrap.addEventListener("click", (e) => { if (e.target === wrap) done(); });
  wrap.append(img, note, close);
  document.body.appendChild(wrap);
}

/** 공유 — Web Share(files) → 앱이면 앱 안 카드, 웹이면 새 탭 열기(저장 가능). 반환값은 어떤 경로였는지 */
export async function shareCard(blob: Blob, fileName = "grow-a-beaver-record.png"): Promise<"shared" | "opened" | "shown" | "failed"> {
  const file = new File([blob], fileName, { type: "image/png" });
  try {
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
      await nav.share({ files: [file], title: "비버 키우기 원정 기록" });
      return "shared";
    }
  } catch {
    /* 사용자가 취소했거나 미지원 — 폴백 */
  }
  if (isNativePlatform()) {
    try { showCardOverlay(blob); return "shown"; } catch { return "failed"; }
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
