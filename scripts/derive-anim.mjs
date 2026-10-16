/**
 * 한 장 파생 애니메이션 (2026-10-16, 사용자: "모든 캐릭터·동료·몬스터 공격 애니메이션이 너무 어색 · 주인공은 파츠별 장착이 무기·투구만 적용되어
 *   모든 애니메이션에 어색하지 않게 재생성(방향별 어색하지 않게 유지) · 윤곽선 등 모든 리소스 그림체가 통일되면서 각자 특징은 살리기").
 * 원인: 칸마다 따로 생성한 그림(gen.py frames · 칸별 restyle)이라 투구·색·체형·크기가 칸마다 달라 공격이 '다른 그림의 깜빡임'으로 보였다.
 * 해법: 캐릭터마다 3D 대기 한 장만 쓰고 모든 칸을 그 한 장의 변형(발 기준 기울임·눌림·늘임·앞뒤 이동)으로 만든다 → 생김새가 칸마다 같다.
 *   타격 칸에는 잔상 2겹 + 역할별 효과(근접 베기 호 · 탱커 굵은 호 · 원거리 별빛 섬광 · 힐러 반짝 고리 · 몬스터 할퀴기 3줄), 피격 칸에는 흰·붉은 번쩍임.
 *   윤곽선: 모두 같은 진갈색 잉크 선(인물 키의 1.1%) — 동료의 흰 스티커 테두리는 벗긴다. 색·모양(각자 특징)은 원화 그대로.
 *   방향: 동료·주인공은 오른쪽으로 덤비고, 몬스터는 원화가 보는 쪽(게임이 FLIP_MONSTERS 를 뒤집어 왼쪽)으로 덤빈다.
 *   node scripts/derive-anim.mjs allies [id…] | skins | monsters [art…] | hero | all
 * 출력: 동료·스킨 frames/<id>.webp(9칸 470×358) · 몬스터 monsters/frames/<art>.webp(5칸 512²) · 주인공 hero-idle/attack.png(4칸 443×887)
 *       + src/titans/frameSets.ts · src/equipment/heroAnchors.ts(주인공 파츠 앵커 — 같은 변환으로 계산)
 * 작업은 2배 크기로 하고 마지막에 줄인다(가장자리 매끈하게).
 */
import sharp from "sharp";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { outfitRecolor } from "./outfit-recolor.mjs";

const OUT = "art-gen/out";
const SS = 2;                       // 슈퍼샘플
const INK = [59, 36, 21];           // --flat-ink
const T = (w, h) => ({ create: { width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)), channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });

// ── 손질: 잘라 내기 · (선택) 반전·옷 색 · 크기 · 흰 테두리 벗기기 · 잉크 윤곽선 ──
async function rawOf(buf) { const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; }
const toPng = (r) => sharp(r.data, { raw: { width: r.w, height: r.h, channels: 4 } }).png().toBuffer();
async function trim(buf, th = 40) {
  const r = await rawOf(buf);
  let x0 = r.w, x1 = -1, y0 = r.h, y1 = -1;
  for (let y = 0; y < r.h; y += 1) for (let x = 0; x < r.w; x += 1) if (r.data[(y * r.w + x) * 4 + 3] > th) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) throw new Error("빈 그림");
  return sharp(buf).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).png().toBuffer();
}
/** 흰 스티커 테두리 벗기기 — 바깥에 닿은 거의 흰 픽셀을 한 겹씩(최대 passes 겹). 안쪽 흰 털은 바깥에 닿지 않아 남는다 */
function peelWhite(r, passes) {
  const { data, w, h } = r; let total = 0;
  const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : data[(y * w + x) * 4 + 3]);
  for (let p = 0; p < passes; p += 1) {
    const kill = [];
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4; if (data[i + 3] <= 40) continue;
      if (A(x - 1, y) > 40 && A(x + 1, y) > 40 && A(x, y - 1) > 40 && A(x, y + 1) > 40) continue;
      const mn = Math.min(data[i], data[i + 1], data[i + 2]), mx = Math.max(data[i], data[i + 1], data[i + 2]);
      if (mn > 200 && mx - mn < 34) kill.push(i);
    }
    if (!kill.length) break;
    for (const i of kill) data[i + 3] = 0;
    total += kill.length;
  }
  for (let i = 3; i < data.length; i += 4) if (data[i] < 28) data[i] = 0;   // 옅은 가장자리 찌꺼기
  return total;
}
/** 잉크 윤곽선 — 알파를 번지게 해 문턱을 넘는 곳을 진갈색으로 깔고 그 위에 원화 */
async function inkOutline(buf, t) {
  const pad = Math.ceil(t * 2) + 2;
  const r = await rawOf(buf);
  const W = r.w + pad * 2, H = r.h + pad * 2;
  const a = Buffer.alloc(W * H);
  for (let y = 0; y < r.h; y += 1) for (let x = 0; x < r.w; x += 1) a[(y + pad) * W + x + pad] = r.data[(y * r.w + x) * 4 + 3];
  const b = await sharp(a, { raw: { width: W, height: H, channels: 1 } }).blur(Math.max(0.4, t * 0.62)).extractChannel(0).raw().toBuffer();   // 한 채널로 받아야 한다(기본은 3채널로 나온다)
  const ink = Buffer.alloc(W * H * 4);
  for (let p = 0; p < W * H; p += 1) { const v = b[p]; const al = v <= 14 ? 0 : Math.min(242, (v - 14) * 5); ink[p * 4] = INK[0]; ink[p * 4 + 1] = INK[1]; ink[p * 4 + 2] = INK[2]; ink[p * 4 + 3] = al; }
  return sharp(ink, { raw: { width: W, height: H, channels: 4 } }).composite([{ input: buf, left: pad, top: pad }]).png().toBuffer();
}
/** 원화 한 장 → 손질된 그림(잘라 냄 · 키 targetH · 윤곽선 포함) */
async function prep(file, { flip = false, recolor = null, targetH, maxW = Infinity, peel = true }) {
  let buf = await trim(readFileSync(file));
  if (flip) buf = await sharp(buf).flop().png().toBuffer();
  if (recolor) buf = await outfitRecolor(buf, ...recolor);
  const m = await sharp(buf).metadata();
  const k = Math.min(targetH / m.height, maxW / m.width);
  buf = await sharp(buf).resize(Math.round(m.width * k), Math.round(m.height * k)).png().toBuffer();
  if (peel) { const r = await rawOf(buf); peelWhite(r, Math.round(targetH * 0.016)); buf = await trim(await toPng(r)); }
  buf = await trim(await inkOutline(buf, targetH * 0.011), 8);
  const mm = await sharp(buf).metadata();
  return { buf, w: mm.width, h: mm.height };
}

// ── 자세: 발(아래 가운데) 기준 늘임·눌림 → 기울임. forward=+1 오른쪽으로 덤빔, −1 왼쪽 ──
async function pose(fig, { rot = 0, sx = 1, sy = 1 }, forward) {
  const S = Math.ceil(Math.hypot(fig.w, fig.h) * 2.3) + 8;
  let buf = await sharp(T(S, S)).composite([{ input: fig.buf, left: Math.round(S / 2 - fig.w / 2), top: Math.round(S / 2 - fig.h) }]).png().toBuffer();
  if (sx !== 1 || sy !== 1) buf = await sharp(buf).resize(Math.round(S * sx), Math.round(S * sy), { fit: "fill" }).png().toBuffer();
  if (rot) buf = await sharp(buf).rotate(rot * forward, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const m = await sharp(buf).metadata();
  return { buf, w: m.width, h: m.height, cx: m.width / 2, cy: m.height / 2 };
}
async function mapPixels(buf, fn) { const r = await rawOf(buf); for (let i = 0; i < r.data.length; i += 4) if (r.data[i + 3]) fn(r.data, i); return toPng(r); }
const ghost = (buf, alpha) => mapPixels(buf, (d, i) => { d[i] = d[i] + (255 - d[i]) * 0.35; d[i + 1] = d[i + 1] + (255 - d[i + 1]) * 0.35; d[i + 2] = d[i + 2] + (255 - d[i + 2]) * 0.35; d[i + 3] = d[i + 3] * alpha; });
const hitTint = (buf) => mapPixels(buf, (d, i) => { d[i] = d[i] + (255 - d[i]) * 0.6; d[i + 1] = d[i + 1] + (255 - d[i + 1]) * 0.32; d[i + 2] = d[i + 2] + (255 - d[i + 2]) * 0.32; });
/** 큰 자세 그림의 피벗을 (px, py) 에 두도록 칸(cw×ch, 왼쪽 cellX)에 잘라 넣는 composite 연산 */
async function placeOp(p, cellX, cw, ch, px, py) {
  const ox = Math.round(p.cx - px), oy = Math.round(p.cy - py);   // 칸 (0,0) 에 해당하는 자세 그림 좌표
  const left = Math.max(0, ox), top = Math.max(0, oy), right = Math.min(p.w, ox + cw), bottom = Math.min(p.h, oy + ch);
  if (right <= left || bottom <= top) return null;
  const piece = await sharp(p.buf).extract({ left, top, width: right - left, height: bottom - top }).png().toBuffer();
  return { input: piece, left: cellX + (left - ox), top: top - oy };
}

// ── 효과 그림(SVG) — 크기 L(인물 키 기준) ──
const svgPng = (svg) => sharp(Buffer.from(svg)).png().toBuffer();
function fxSvg(kind, L, color, alpha = 1, forward = 1) {
  const W = Math.round(L * 1.1), H = Math.round(L * 1.1), c = color;
  const flip = forward < 0 ? ` transform="translate(${W},0) scale(-1,1)"` : "";
  const glow = `<filter id="g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${(L * 0.025).toFixed(1)}"/></filter>`;
  let body = "";
  if (kind === "slash" || kind === "heavy") {
    const sw = L * (kind === "heavy" ? 0.11 : 0.07);
    const d = `M ${W * 0.18} ${H * 0.16} Q ${W * 0.98} ${H * 0.34} ${W * 0.36} ${H * 0.9}`;
    body = `<path d="${d}" stroke="${c}" stroke-width="${sw * 1.9}" fill="none" stroke-linecap="round" opacity=".55" filter="url(#g)"/>
            <path d="${d}" stroke="#fffdf2" stroke-width="${sw}" fill="none" stroke-linecap="round"/>
            <path d="${d}" stroke="${c}" stroke-width="${sw * 0.35}" fill="none" stroke-linecap="round" opacity=".9"/>`;
  } else if (kind === "burst") {
    const cx = W * 0.5, cy = H * 0.5, r1 = L * 0.34, r2 = L * 0.1;
    const pts = Array.from({ length: 16 }, (_, k) => { const a = (k / 16) * Math.PI * 2, r = k % 2 ? r2 : r1 * (k % 4 === 0 ? 1 : 0.62); return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`; }).join(" ");
    body = `<circle cx="${cx}" cy="${cy}" r="${L * 0.24}" fill="${c}" opacity=".5" filter="url(#g)"/><polygon points="${pts}" fill="#fffdf2"/><circle cx="${cx}" cy="${cy}" r="${L * 0.07}" fill="${c}"/>
            ${[0, 1, 2].map((k) => `<line x1="${cx - L * (0.25 + k * 0.12)}" y1="${cy + (k - 1) * L * 0.08}" x2="${cx - L * (0.5 + k * 0.1)}" y2="${cy + (k - 1) * L * 0.08}" stroke="#fffdf2" stroke-width="${L * 0.02}" stroke-linecap="round" opacity=".8"/>`).join("")}`;
  } else if (kind === "sparkle") {
    const cx = W * 0.5, cy = H * 0.5;
    body = `<circle cx="${cx}" cy="${cy}" r="${L * 0.3}" stroke="${c}" stroke-width="${L * 0.05}" fill="none" opacity=".6" filter="url(#g)"/><circle cx="${cx}" cy="${cy}" r="${L * 0.3}" stroke="#fffdf2" stroke-width="${L * 0.018}" fill="none"/>
            ${Array.from({ length: 6 }, (_, k) => { const a = (k / 6) * Math.PI * 2, x = cx + Math.cos(a) * L * 0.3, y = cy + Math.sin(a) * L * 0.3, s = L * 0.06; return `<path d="M ${x} ${y - s} L ${x + s * 0.3} ${y} L ${x} ${y + s} L ${x - s * 0.3} ${y} Z M ${x - s} ${y} L ${x} ${y + s * 0.3} L ${x + s} ${y} L ${x} ${y - s * 0.3} Z" fill="#fffdf2"/>`; }).join("")}`;
  } else if (kind === "boom") {
    // 북 울림 — 앞으로 퍼지는 소리 고리 세 겹 + 가운데 별
    const cx = W * 0.3, cy = H * 0.5;
    body = [0, 1, 2].map((k) => {
      const r = L * (0.16 + k * 0.13), x0 = cx + Math.cos(-0.9) * r, y0 = cy + Math.sin(-0.9) * r, x1 = cx + Math.cos(0.9) * r, y1 = cy + Math.sin(0.9) * r;
      const d = `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
      return `<path d="${d}" stroke="${c}" stroke-width="${L * 0.06}" fill="none" stroke-linecap="round" opacity=".5" filter="url(#g)"/><path d="${d}" stroke="#fffdf2" stroke-width="${L * (0.03 - k * 0.006)}" fill="none" stroke-linecap="round" opacity="${1 - k * 0.22}"/>`;
    }).join("") + `<circle cx="${cx}" cy="${cy}" r="${L * 0.06}" fill="#fffdf2"/>`;
  } else if (kind === "claw") {
    const sw = L * 0.05;
    body = [0, 1, 2].map((k) => { const o = (k - 1) * L * 0.17; const d = `M ${W * 0.3 + o} ${H * 0.15} Q ${W * 0.62 + o} ${H * 0.45} ${W * 0.42 + o} ${H * 0.88}`; return `<path d="${d}" stroke="${c}" stroke-width="${sw * 2}" fill="none" stroke-linecap="round" opacity=".55" filter="url(#g)"/><path d="${d}" stroke="#fff5e6" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`; }).join("");
  }
  return svgPng(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${glow}</defs><g opacity="${alpha}"${flip}>${body}</g></svg>`);
}

/**
 * 한 칸 그리기 — 자세 + (잔상) + (효과) + (피격 번쩍임). 그림·잔상·효과는 실제 상자를 재서 칸 안에 들게 민다.
 * spec: { rot, sx, sy, dx, dy(인물 폭·키 비율), smear(겹), fx, fxA(효과 불투명), fxAt([앞, 위] 직접 자리), hit }
 */
/** 불투명(알파>40) 상자 — 자세 그림 좌표 */
async function alphaBox(buf) {
  const r = await rawOf(buf);
  let x0 = r.w, x1 = -1, y0 = r.h, y1 = -1;
  for (let y = 0; y < r.h; y += 2) for (let x = 0; x < r.w; x += 2) if (r.data[(y * r.w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, x1: x1 + 1, y0, y1: y1 + 1 };
}
/** 피벗 x 를 칸 안(여백 m)에 들도록 민다 — 상자 [L, R] 은 피벗 기준 */
const clampX = (px, L, R, cw, m) => (px + L < m ? m - L : px + R > cw - m ? cw - m - R : px);

async function drawCell(fig, spec, forward, cellX, cw, ch, pivotX, pivotY, fxKind, fxColor) {
  const ops = [], M = Math.round(cw * 0.012) + 3;   // 칸 가장자리 여백 — check-atlas-edges(2px)보다 넉넉히
  let p = await pose(fig, spec, forward);
  let bb = await alphaBox(p.buf);
  // 위가 칸을 넘으면(세로로 늘인 칸 — 창끝·투구) 그 칸만 발 기준으로 줄인다
  const top = pivotY + (spec.dy ?? 0) * fig.h + (bb.y0 - p.cy);
  if (top < M) {
    const k = (pivotY + (spec.dy ?? 0) * fig.h - M) / (p.cy - bb.y0);
    p = await pose(fig, { ...spec, sx: (spec.sx ?? 1) * k, sy: (spec.sy ?? 1) * k }, forward);
    bb = await alphaBox(p.buf);
  }
  if (spec.hit) p = { ...p, buf: await hitTint(p.buf) };
  // 자세 그림의 실제 상자로 칸 안에 들게 민다(기울이고 늘이면 넓은 동료 — 루나 방패 등 — 가 칸 밖으로 나갔다)
  const L = bb.x0 - p.cx, R = bb.x1 - p.cx;
  const px = clampX(pivotX + (spec.dx ?? 0) * fig.w * forward, L, R, cw, M), py = pivotY + (spec.dy ?? 0) * fig.h;
  for (let g = spec.smear ?? 0; g >= 1; g -= 1) {
    const gx = clampX(px - forward * fig.w * 0.09 * g, L, R, cw, M);
    if (Math.abs(gx - px) < fig.w * 0.03) continue;   // 밀려서 거의 겹치면 잔상은 뺀다
    const gb = await ghost(p.buf, g === 1 ? 0.32 : 0.16);
    const op = await placeOp({ ...p, buf: gb }, cellX, cw, ch, gx, py); if (op) ops.push(op);
  }
  const main = await placeOp(p, cellX, cw, ch, px, py); if (main) ops.push(main);
  if (spec.fx && fxKind) {
    // 효과 크기·자리: 자리를 직접 줬으면(주인공 북 울림 — 손 앞) 그 자리, 아니면 원거리·힐러는 몸 앞 높이 · 베기·할퀴기는 몸 바로 앞
    const far = fxKind === "burst" || fxKind === "sparkle";
    const L2 = fig.h * (spec.fxAt ? 0.5 : fxKind === "claw" ? 0.62 : fxKind === "heavy" ? 0.82 : far ? 0.55 : 0.7);
    const fx = await fxSvg(fxKind, L2, fxColor, spec.fxA ?? 1, forward), fm = await sharp(fx).metadata();
    const fb = await alphaBox(fx), fl = fb.x0 - fm.width / 2, fr = fb.x1 - fm.width / 2, ft = fb.y0 - fm.height / 2;
    let fxX = spec.fxAt ? px + forward * fig.w * spec.fxAt[0] : px + forward * fig.w * (far ? 0.5 : 0.42);
    let fxY = spec.fxAt ? py - fig.h * spec.fxAt[1] : py - fig.h * (far ? 0.6 : 0.52);
    fxX = clampX(fxX, fl, fr, cw, M);
    if (fxY + ft < M) fxY = M - ft;
    const op = await placeOp({ buf: fx, w: fm.width, h: fm.height, cx: fm.width / 2, cy: fm.height / 2 }, cellX, cw, ch, fxX, fxY); if (op) ops.push(op);
  }
  return ops;
}

// ── 동료 · 스킨 ──
const ALLY_SPECS = [
  { },                                                         // 0 대기
  { sx: 1.025, sy: 0.972 },                                    // 1 숨 — 눌림
  { rot: -3, sy: 1.02, dy: -0.025 },                           // 2 걷기 — 들림
  { rot: 3, sx: 1.03, sy: 0.97 },                              // 3 걷기 — 디딤
  { rot: -6, sx: 0.96, sy: 1.04, dx: -0.04 },                  // 4 예비 — 뒤로 움츠림
  { rot: 6, sx: 1.05, sy: 0.96, dx: 0.04, smear: 1 },          // 5 돌진
  { rot: 10, sx: 1.1, sy: 0.92, dx: 0.07, smear: 2, fx: 1 },   // 6 타격
  { rot: 4, sx: 1.03, sy: 0.98, dx: 0.03, fx: 1, fxA: 0.45 },  // 7 따라가기
  { rot: -9, sx: 0.95, sy: 1.03, dx: -0.05, hit: 1 },          // 8 피격
];
const ROLE_FX = { melee: "slash", tank: "heavy", ranged: "burst", healer: "sparkle" };
const ELEMENT_COLOR = { fire: "#ff8a3d", water: "#4cc3ff", earth: "#e0b04c", wind: "#5fe0a0" };
function allyTable() {
  const src = readFileSync("src/titans/allies.ts", "utf8");
  const pick = (name) => Object.fromEntries([...src.slice(src.indexOf(`export const ${name}`)).split("};")[0].matchAll(/([a-z_]+)\s*:\s*"([a-z]+)"/g)].map((m) => [m[1], m[2]]));
  return { role: pick("ALLY_ROLE"), element: pick("ALLY_ELEMENT") };
}
const CW = 470, CH = 358;
async function allyStrip(id, fig, fxKind, fxColor, dest) {
  const cw = CW * SS, ch = CH * SS, ops = [];
  for (const [i, spec] of ALLY_SPECS.entries()) ops.push(...(await drawCell(fig, spec, 1, i * cw, cw, ch, cw / 2, ch * 0.87, fxKind, fxColor)));
  const strip = await sharp(T(cw * ALLY_SPECS.length, ch)).composite(ops).png().toBuffer();
  await sharp(strip).resize(CW * ALLY_SPECS.length, CH).webp({ quality: 88, alphaQuality: 92 }).toFile(dest);
  return strip;
}
async function doAllies(only) {
  const facing = JSON.parse(readFileSync("art-gen/ally-facing.json", "utf8"));
  const { role, element } = allyTable();
  // 활동 동료 13명 — 파이로·마리나는 미아·세라에 옷 색(make-variant-atlas VARIANTS 와 같은 값)
  const LIST = [["mia"], ["leon"], ["sera"], ["garen"], ["ari"], ["nox"], ["luna"], ["volt"], ["bronn"], ["orion"], ["ember"], ["pyro", "mia", [255, 122, 72], 0.96, 1.25], ["marina", "sera", [96, 196, 232], 1.05, 1.1]];
  const done = [];
  for (const [id, base = id, ...rc] of LIST) {
    if (only.length && !only.includes(id)) continue;
    const f = facing[base]; if (!f) { console.log("skip", id, "(대기 원화 없음)"); continue; }
    const fig = await prep(`${OUT}/${f.src}`, { flip: f.flip, recolor: rc.length ? rc : null, targetH: CH * SS * 0.82, maxW: CW * SS * 0.6 });
    await allyStrip(id, fig, ROLE_FX[role[id]] ?? "slash", ELEMENT_COLOR[element[id]] ?? "#ffd66b", `public/titans/generated/allies/frames/${id}.webp`);
    done.push(id); console.log("ally", id, role[id], element[id]);
  }
  return done;
}
const SKINS = [["garen-magma", "garen"], ["leon-frost", "leon"], ["ari-blaze", "ari"], ["nox-abyss", "nox"], ["luna-eclipse", "luna"], ["bronn-iron", "bronn"], ["orion-nova", "orion"], ["ember-ruby", "ember"], ["season-1", "ari"], ["season-2", "nox"]];
async function doSkins(only) {
  const { role, element } = allyTable();
  for (const [id, ally] of SKINS) {
    if (only.length && !only.includes(id)) continue;
    const src = [`${OUT}/skin-r3d2-${id}-0-s20264800.png`, `${OUT}/skin-r3d-${id}-0-s20264800.png`].find(existsSync);
    if (!src) { console.log("skip skin", id); continue; }
    const fig = await prep(src, { targetH: CH * SS * 0.82, maxW: CW * SS * 0.6 });
    const strip = await allyStrip(id, fig, ROLE_FX[role[ally]] ?? "slash", ELEMENT_COLOR[element[ally]] ?? "#ffd66b", `public/titans/generated/allies/frames/${id}.webp`);
    // 아틀라스 4칸(대기 · 예비 · 타격 · 피격) — make-variant-atlas 가 art-gen/skin-rows 에서 뜬다
    const cw = CW * SS, ch = CH * SS, row = [];
    for (const [k, i] of [0, 4, 5, 8].entries()) row.push({ input: await sharp(strip).extract({ left: i * cw, top: 0, width: cw, height: ch }).png().toBuffer(), left: k * cw, top: 0 });
    await sharp(await sharp(T(cw * 4, ch)).composite(row).png().toBuffer()).resize(1254, 239, { fit: "fill" }).png().toFile(`art-gen/skin-rows/${id}-row.png`);
    console.log("skin", id);
  }
}

// ── 몬스터 ──
const MON_SPECS = [
  { },                                                          // 0 대기
  { sx: 1.03, sy: 0.97 },                                       // 1 숨
  { rot: -7, sx: 0.94, sy: 1.06, dx: -0.04 },                   // 2 예비 — 뒤로 젖힘
  { rot: 11, sx: 1.09, sy: 0.93, dx: 0.06, smear: 2, fx: 1 },   // 3 덤빔 — 할퀴기
  { rot: -8, sx: 0.95, sy: 1.04, dx: -0.04, hit: 1 },           // 4 피격
];
const MW = 512;
async function doMonsters(only) {
  const sa = readFileSync("src/titans/SpriteArt.tsx", "utf8");
  const flipSet = new Set(JSON.parse(sa.match(/const FLIP_MONSTERS = new Set<string>\((\[[^\]]*\])\)/)[1]));
  const list = JSON.parse(`[${(readFileSync("src/titans/frameSets.ts", "utf8").match(/MONSTER_FRAME_SET[^=]*=\s*\[([^\]]*)\]/) ?? [, ""])[1]}]`);
  const done = [];
  for (const art of list) {
    if (only.length && !only.includes(art)) { done.push(art); continue; }
    const src = `${OUT}/monster-r3d-${art}-s20263601.png`;
    if (!existsSync(src)) { console.log("skip monster", art); continue; }
    const forward = flipSet.has(art) ? 1 : -1;   // 원화가 오른쪽을 보면(게임이 뒤집는다) 원화 기준 오른쪽으로 덤빈다
    const fig = await prep(src, { targetH: MW * SS * 0.86, maxW: MW * SS * 0.8, peel: false });
    const cw = MW * SS, ch = MW * SS, ops = [];
    for (const [i, spec] of MON_SPECS.entries()) ops.push(...(await drawCell(fig, spec, forward, i * cw, cw, ch, cw / 2 - forward * cw * 0.02, ch * 0.97, "claw", "#ff6b3d")));
    const strip = await sharp(T(cw * MON_SPECS.length, ch)).composite(ops).png().toBuffer();
    await sharp(strip).resize(MW * MON_SPECS.length, MW).webp({ quality: 88, alphaQuality: 92 }).toFile(`public/titans/generated/monsters/frames/${art}.webp`);
    done.push(art); console.log("monster", art, forward > 0 ? "→" : "←");
  }
  return done;
}

/**
 * 4상태 아틀라스·개별 PNG 도 새 띠에서 뜬다 — 초상·편성 목록·도감도 같은 윤곽선·같은 생김새로(그림체 통일).
 * 칸: 0 대기 · 1 예비 · 2 공격 · 3 피격 = 띠 [0, 4, 5(돌진 — 효과 없는 칸: 효과까지 키로 재면 상태마다 높이가 15% 튀었다 · verify-play-art), 8] (SpriteArt allyFrameFor). 아틀라스 칸 313.5×239 = 띠 칸 470×358 ÷ 1.5.
 * make-variant-atlas.mjs 가 변형 아틀라스를 다시 쓰므로 그 뒤에 돌린다.
 */
const BASE_ROW = { mia: 0, leon: 1, sera: 2, garen: 3, ari: 4, nox: 5 };
const VARIANT_ROW = { pyro: 0, marina: 1, terra: 2, zephyr: 3, bronn: 4, iris: 5, cain: 6, sylph: 7, orion: 8, ember: 9, luna: 10, volt: 11 };
async function rowFromStrip(id) {
  const strip = `public/titans/generated/allies/frames/${id}.webp`, cells = [];
  for (const [k, i] of [0, 4, 5, 8].entries()) cells.push({ input: await sharp(strip).extract({ left: i * CW, top: 0, width: CW, height: CH }).png().toBuffer(), left: k * CW, top: 0 });
  return sharp(await sharp(T(CW * 4, CH)).composite(cells).png().toBuffer()).resize(1254, 239, { fit: "fill" }).png().toBuffer();
}
async function patchAtlases(ids) {
  for (const [file, rows] of [["ally-animation-atlas-v1.png", BASE_ROW], ["ally-variant-atlas-v1.png", VARIANT_ROW]]) {
    const path = `public/titans/generated/allies/${file}`, ops = [];
    const m = await sharp(path).metadata();
    for (const id of ids) if (rows[id] !== undefined) ops.push({ input: await rowFromStrip(id), left: 0, top: rows[id] * 239 });
    if (!ops.length) continue;
    // 덮을 행은 먼저 비운다(투명으로 덮으면 예전 그림이 남는다)
    const clear = await sharp({ create: { width: 1254, height: 239, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer();   // dest-out 은 불투명한 쪽만 지운다
    const base = await sharp(path).composite(ops.map((o) => ({ input: clear, left: 0, top: o.top, blend: "dest-out" }))).png().toBuffer();
    await sharp(base).composite(ops).png().toFile(path + ".tmp");
    const { renameSync } = await import("node:fs"); renameSync(path + ".tmp", path);
    console.log("atlas", file, ops.length, "rows", m.width, m.height);
  }
  for (const id of ids) {
    const file = `public/titans/generated/allies/${id}.png`;
    if (!existsSync(file)) continue;
    await sharp(await trim(await sharp(`public/titans/generated/allies/frames/${id}.webp`).extract({ left: 0, top: 0, width: CW, height: CH }).png().toBuffer())).png().toFile(file);
  }
}

function writeFrameSets(allies, monsters) {
  const cur = readFileSync("src/titans/frameSets.ts", "utf8");
  const keep = (name) => JSON.parse((cur.match(new RegExp(`${name}[^=]*=\\s*(\\[[^\\]]*\\])`)) ?? [, "[]"])[1]);
  const a = allies ?? keep("ALLY_FRAME_SET"), m = monsters ?? keep("MONSTER_FRAME_SET");
  writeFileSync("src/titans/frameSets.ts", `/** 프레임 띠가 있는 동료·몬스터 — scripts/derive-anim.mjs 가 쓴다 (손대지 말 것). 2026-10-16: 대기 한 장 파생 */
export const ALLY_FRAME_SET: readonly string[] = ${JSON.stringify([...new Set(a)].sort())};
export const MONSTER_FRAME_SET: readonly string[] = ${JSON.stringify([...new Set(m)].sort())};
`);
}

const [mode = "all", ...only] = process.argv.slice(2);
mkdirSync("art-gen/skin-rows", { recursive: true });
let allies = null, monsters = null;
if (mode === "allies" || mode === "all") { const d = await doAllies(only); if (!only.length) allies = d; else allies = [...new Set([...JSON.parse(readFileSync("src/titans/frameSets.ts", "utf8").match(/ALLY_FRAME_SET[^=]*=\s*(\[[^\]]*\])/)[1]), ...d])]; }
if (mode === "skins" || mode === "all") await doSkins(mode === "skins" ? only : []);
if (mode === "skins" || mode === "all" || mode === "atlas") {
  const { execFileSync } = await import("node:child_process");
  execFileSync(process.execPath, ["scripts/make-variant-atlas.mjs"], { stdio: "inherit" });   // 스킨 아틀라스·썸네일(art-gen/skin-rows)
}
if (mode === "allies" || mode === "all" || mode === "atlas" || mode === "skins") {
  const ids = JSON.parse(readFileSync("src/titans/frameSets.ts", "utf8").match(/ALLY_FRAME_SET[^=]*=\s*(\[[^\]]*\])/)[1]);
  await patchAtlases([...new Set([...(allies ?? []), ...ids])].filter((id) => existsSync(`public/titans/generated/allies/frames/${id}.webp`) && !SKINS.some(([s]) => s === id)));
}
if (mode === "monsters" || mode === "all") monsters = await doMonsters(mode === "monsters" ? only : []);
if (mode === "hero" || mode === "all") { const { doHero } = await import("./derive-anim-hero.mjs"); await doHero({ prep, drawCell, T, SS }); }
if (allies || monsters) writeFrameSets(allies, monsters);
