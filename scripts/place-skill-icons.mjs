/**
 * 사냥터 모험가 스킬 아이콘 배치 (2026-10-06) — art-gen/out/icon-tskill-<id>-<seed>.png 중 고른 시드를
 * 테두리를 다듬어 128px 팔레트 PNG 로 public/ui/skills/titans/<id>.png 에 둔다.
 *   node scripts/place-skill-icons.mjs sheet <out.png>         후보 시트(회색 바탕 — 알파를 검정으로 오판하지 않게)
 *   node scripts/place-skill-icons.mjs place strike=1 pierce=3 …  (1·2·3 = 시드 20261301·02·03)
 */
import sharp from "sharp";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";

const IDS = ["strike", "pierce", "emberCut", "frostEdge", "crit", "waterStep", "stoneGuard", "galeChain", "clone", "thunderLink", "bloodMoon", "dragonBreath", "warcry", "meteor", "tidalBurst", "voidFinish", "steel", "focus", "guardianSoul", "elementalMastery"];
const SEEDS = [20261301, 20261302, 20261303];
const OUT = "art-gen/out";
const [mode, ...rest] = process.argv.slice(2);

if (mode === "sheet") {
  const C = 110, parts = [];
  for (let r = 0; r < IDS.length; r += 1) for (let c = 0; c < SEEDS.length; c += 1) {
    const f = `${OUT}/icon-tskill-${IDS[r]}-${SEEDS[c]}.png`;
    if (!readdirSync(OUT).includes(f.split("/").pop())) continue;
    const col = (r % 4) * 3 + c, row = Math.floor(r / 4);
    parts.push({ input: await sharp(f).resize(C, C, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: col * C + Math.floor(r % 4) * 12, top: row * (C + 18) });
    parts.push({ input: Buffer.from(`<svg width="${C}" height="16"><text x="2" y="12" font-size="11" fill="white">${IDS[r]} ${c + 1}</text></svg>`), left: col * C + Math.floor(r % 4) * 12, top: row * (C + 18) + C });
  }
  await sharp({ create: { width: 12 * C + 36, height: 5 * (C + 18), channels: 4, background: { r: 110, g: 118, b: 130, alpha: 1 } } }).composite(parts).png().toFile(rest[0] ?? "skill-icons-sheet.png");
  console.log("sheet ok");
} else if (mode === "place") {
  mkdirSync("public/ui/skills/titans", { recursive: true });
  let total = 0;
  for (const arg of rest) {
    const [id, n] = arg.split("=");
    if (!IDS.includes(id)) throw new Error("모르는 스킬: " + id);
    const src = `${OUT}/icon-tskill-${id}-${SEEDS[Number(n) - 1]}.png`;
    const buf = await sharp(src).trim({ threshold: 2 }).resize(116, 116, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({ top: 6, bottom: 6, left: 6, right: 6, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ palette: true, quality: 92, colours: 256, effort: 10, compressionLevel: 9 }).toBuffer();
    writeFileSync(`public/ui/skills/titans/${id}.png`, buf);
    total += buf.length;
  }
  console.log(`placed ${rest.length} · ${(total / 1024).toFixed(0)}KB`);
} else {
  console.log("사용: sheet <out.png> | place id=n …");
}
