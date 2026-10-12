/**
 * 파츠·콘텐츠 카드 임시 자산 (2026-10-12) — 5차 배치(아이콘·카드)가 GPU 를 못 받아 멈춘 동안 404 를 막는다.
 * 파츠는 납작 SVG(나무/철/금 3티어), 콘텐츠 카드는 이미 있는 지평선 띠 배경을 정사각으로 오린 것. 배치가 끝나면 place-gear.mjs 가 덮어쓴다.
 *   node scripts/make-placeholder-gear.mjs
 */
import sharp from "sharp";
import { existsSync, mkdirSync } from "node:fs";

mkdirSync("public/titans/gear", { recursive: true });
mkdirSync("public/ui/gear", { recursive: true });
mkdirSync("public/ui/content-cards", { recursive: true });
const TIER = { 1: ["#c48a4a", "#8a5a2b"], 2: ["#b8c4cf", "#5b6670"], 3: ["#f2c232", "#b98a16"] };
const ink = "#3b2415";
const svgOf = (part, tier) => {
  const [fill, dark] = TIER[tier];
  const body = {
    helmet: `<path d="M28 150 Q28 60 128 60 Q228 60 228 150 L228 170 L28 170 Z" fill="${fill}" stroke="${ink}" stroke-width="10"/><rect x="40" y="150" width="176" height="28" rx="8" fill="${dark}" stroke="${ink}" stroke-width="8"/><path d="M118 60 L138 60 L132 20 L124 20 Z" fill="${dark}" stroke="${ink}" stroke-width="8"/>`,
    armor: `<path d="M48 70 L96 46 L160 46 L208 70 L196 200 L60 200 Z" fill="${fill}" stroke="${ink}" stroke-width="10"/><path d="M96 46 Q128 90 160 46" fill="none" stroke="${ink}" stroke-width="8"/><rect x="112" y="110" width="32" height="40" rx="6" fill="${dark}" stroke="${ink}" stroke-width="6"/>`,
    weapon: `<path d="M128 20 L152 60 L144 180 L112 180 L104 60 Z" fill="${fill}" stroke="${ink}" stroke-width="10"/><rect x="84" y="176" width="88" height="22" rx="8" fill="${dark}" stroke="${ink}" stroke-width="8"/><rect x="116" y="196" width="24" height="40" rx="6" fill="#6b4423" stroke="${ink}" stroke-width="8"/>`,
    shield: `<path d="M48 48 L128 28 L208 48 L200 150 Q128 220 56 150 Z" fill="${fill}" stroke="${ink}" stroke-width="10"/><path d="M128 50 L128 196" stroke="${dark}" stroke-width="10"/>`,
    gloves: `<rect x="50" y="90" width="70" height="110" rx="20" fill="${fill}" stroke="${ink}" stroke-width="10"/><rect x="136" y="90" width="70" height="110" rx="20" fill="${fill}" stroke="${ink}" stroke-width="10"/><rect x="50" y="170" width="70" height="28" rx="8" fill="${dark}"/><rect x="136" y="170" width="70" height="28" rx="8" fill="${dark}"/>`,
    boots: `<path d="M50 90 L110 90 L110 160 L150 160 L150 200 L50 200 Z" fill="${fill}" stroke="${ink}" stroke-width="10"/><path d="M146 90 L206 90 L206 160 L246 160 L246 200 L146 200 Z" fill="${fill}" stroke="${ink}" stroke-width="10" transform="translate(-40 0)"/>`,
  }[part];
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${body}</svg>`);
};
let n = 0;
for (const part of ["helmet", "armor", "weapon", "shield", "gloves", "boots"]) {
  for (const tier of [1, 2, 3]) {
    const svg = svgOf(part, tier);
    await sharp(svg).png().toFile(`public/titans/gear/${part}-${tier}.png`);
    await sharp(svg).resize(128, 128).png().toFile(`public/ui/gear/${part}-${tier}.png`);
    n += 1;
  }
}
const CARDS = { dodge: "public/dodge/bg/s1.webp", beat: "public/beat/bg/stage.webp", forge: "public/ui/bg/forge-backdrop.webp", tower: "public/dodge/bg/s3.webp" };
for (const [id, src] of Object.entries(CARDS)) {
  if (!existsSync(src)) continue;
  await sharp(src).resize(320, 160, { fit: "cover", position: id === "forge" ? "top" : "bottom" }).webp({ quality: 80 }).toFile(`public/ui/content-cards/${id}.webp`);
  n += 1;
}
console.log("placeholders", n);
