/**
 * 탈것 아이콘 (2026-11-18, 사용자: "탈것도 장비성장 인벤토리에서 탈부착 넣어줘") — 장비창 가방 · 슬롯은 <img> 한 장을 쓴다.
 * 탈것은 움직이는 시트(titans/anim/monsters/mount-*.webp, anim-layout.json mount)뿐이라 대기 0칸을 잘라 정사각 아이콘으로.
 *   node scripts/make-mount-icons.mjs        → public/titans/mounts/<id>.webp (셀 · 160px) · public/titans/mounts-px/<id>.webp(도트 — 있으면)
 */
import sharp from "sharp";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

const L = JSON.parse(readFileSync("art-gen/anim-layout.json", "utf8")).mount;
const IDS = { boar: "mount-boar", deer: "mount-deer", wolf: "mount-wolf", drake: "mount-drake" };
const SIZE = 160;
for (const [dir, src] of [["public/titans/mounts", "public/titans/anim/monsters"], ["public/titans/mounts-px", "public/titans/anim-px/monsters"]]) {
  if (!existsSync(src)) continue;
  mkdirSync(dir, { recursive: true });
  for (const [id, art] of Object.entries(IDS)) {
    const file = `${src}/${art}.webp`;
    if (!existsSync(file)) { console.log("skip", file); continue; }
    const m = await sharp(file).metadata();
    const cw = Math.round(m.width / L.cols), rows = Object.keys(L.actions).length, ch = Math.round(m.height / rows);
    const cell = await sharp(file).extract({ left: 0, top: L.actions.idle.row * ch, width: cw, height: ch }).png().toBuffer();
    // 여백을 자르고(trim 은 따로 — extract+trim 한 파이프는 어긋났다, sharp-derive-frames-pitfalls) 정사각에 가운데로
    // 시트는 왼쪽을 본다 — 주인공이 타는 방향(오른쪽, 아군 방향 규칙)으로 뒤집는다
    const trimmed = await sharp(await sharp(cell).trim({ threshold: 1 }).png().toBuffer()).flop().png().toBuffer();
    const out = await sharp(trimmed).resize(SIZE - 12, SIZE - 12, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: dir.endsWith("-px") ? "nearest" : "lanczos3" })
      .extend({ top: 6, bottom: 6, left: 6, right: 6, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp(dir.endsWith("-px") ? { lossless: true } : { quality: 88, alphaQuality: 92, effort: 5 }).toFile(`${dir}/${id}.webp`);
    console.log(dir, id, out.width, out.height, out.size);
  }
}
