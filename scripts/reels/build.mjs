/**
 * 비버 키우기 릴스 사이트 조립 (2026-10-23) — art-gen/out/reels/site/ 에 피드(index.html) + 장면마다 <id>/index.html(한 파일 · 그림 내장).
 *   node scripts/reels/prep-art.mjs && node scripts/reels/build.mjs
 * 장면 파일이 쓰는 그림 키만 골라 넣는다(장면 소스에서 'id:' · 'drum:' · 'bg:' 같은 문자열을 찾아서).
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";

const R = "scripts/reels";
const OUT = "art-gen/out/reels/site";
const ART = JSON.parse(readFileSync("art-gen/out/reels/art.json", "utf8")).sprites;
const engine = readFileSync(`${R}/engine.js`, "utf8");
const kit = readFileSync(`${R}/kit.js`, "utf8");
const ORDER = ["acorn-merge", "dam-hold", "beat-combo", "lightning-tap", "boss-ladder", "dam-skill", "first-ten", "beat-shoulder", "drum-forge", "party-assemble", "golden-monster", "rebirth-speed", "idle-wake"];
const scenes = ORDER.filter((id) => readdirSync(`${R}/scenes`).includes(`${id}.js`));

function pickArt(src) {
  const want = new Set(["logo", "acorn"]);
  const ids = new Set();
  for (const m of src.matchAll(/'([a-z-]+)'/g)) ids.add(m[1]);
  for (const m of src.matchAll(/id: '([a-z-]+)'/g)) ids.add(m[1]);
  for (const k of Object.keys(ART)) {
    const head = k.split(":")[0];
    if (k.startsWith("drum:") && /drum:/.test(src)) want.add(k);
    else if (k.startsWith("bg:") && src.includes(k)) want.add(k);
    else if (/^(gear|arrow|skill|cover):/.test(k) && (src.includes(k) || src.includes(head + ":$"))) want.add(k);
    else if (/^(gem|chest|stone)$/.test(k) && src.includes(`'${k}'`)) want.add(k);
    else if (ids.has(head)) want.add(k);
  }
  return Object.fromEntries([...want].filter((k) => ART[k]).map((k) => [k, ART[k]]));
}

const page = (id, scene) => `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>비버 키우기 · ${id}</title>
<style>html,body{margin:0;height:100%;background:#120b06;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none}canvas{position:absolute;display:block}</style>
</head><body>
<script>window.RF_ART=${JSON.stringify({ sprites: pickArt(scene) })};</script>
<script>${kit}</script>
<script>${scene}</script>
<script>${engine}</script>
</body></html>`;

mkdirSync(OUT, { recursive: true });
for (const id of scenes) {
  const scene = readFileSync(`${R}/scenes/${id}.js`, "utf8");
  mkdirSync(`${OUT}/${id}`, { recursive: true });
  const html = page(id, scene);
  writeFileSync(`${OUT}/${id}/index.html`, html);
  console.log(id, Math.round(html.length / 1024) + "KB");
}
writeFileSync(`${OUT}/scenes.json`, JSON.stringify(scenes));
console.log("scenes", scenes.length);

// 피드 — 로고를 작은 data URI 로 넣어 site/index.html
{
  const sharpMod = (await import("sharp")).default;
  const logo = "data:image/webp;base64," + (await sharpMod("docs/assets/app-logo.png").resize(96, 96).webp({ quality: 80 }).toBuffer()).toString("base64");
  const feed = readFileSync(`${R}/feed.html`, "utf8").split("__LOGO__").join(logo);
  writeFileSync(`${OUT}/index.html`, feed);
  console.log("feed", Math.round(feed.length / 1024) + "KB");
}
