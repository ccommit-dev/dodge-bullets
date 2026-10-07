/**
 * 「비버 키우기」 리소스 배치 (2026-10-07) — art-gen/out 의 bv-* 결과를 기존 자산 자리(같은 파일명)에 꽂는다.
 * 코드가 가리키는 경로는 바꾸지 않는다 — 그림만 바뀐다. 옛 원화는 art-gen/out/backup-human/ 에 둔다.
 *   node scripts/place-beaver.mjs [hero|allies|monsters|backdrops|icons|props|covers|defense|all] [--seed <name>=<seed> ...]
 * 몬스터·아이콘은 시드가 둘이라 기본은 첫 시드, --seed 로 바꾼다. 끝에 몬스터 좌우 여백(MONSTER_VISIBLE_MARGIN 용)을 찍는다.
 */
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const OUT = "art-gen/out";
const groups = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const want = (g) => groups.length === 0 || groups.includes("all") || groups.includes(g);
const seedOverride = Object.fromEntries(process.argv.filter((a) => a.startsWith("--seed")).flatMap((a) => a.replace(/^--seed=?/, "").split(",")).filter(Boolean).map((kv) => kv.split("=")));
const node = (script, ...args) => { console.log("$", script, args.join(" ")); execFileSync(process.execPath, [script, ...args], { stdio: "inherit" }); };
const pick = (stem, seeds) => {
  if (seedOverride[stem]) { const f = `${OUT}/${stem}-s${seedOverride[stem]}.png`; if (!existsSync(f)) throw new Error("없음: " + f); return f; }
  // 3차(bv3, 배경 없는 참조) 후보가 있으면 그 안에서 QA 최선, 없으면 1차 후보 안에서 QA 최선
  const v3 = globOut(new RegExp("^" + stem.replace("-bv-", "-bv3-").replace(/[.*+?^$()|[\]\\]/g, "\\$&") + "-s\\d+\\.png$"));
  const v1 = seeds.map((x) => `${OUT}/${stem}-s${x}.png`);
  return qaBest(stem, v3.length ? v3 : v1);
};
/** 후보 PNG 들을 scripts/sprite-qa.mjs 로 채점해 최선을 고른다 — 1·2차의 "시트 보고 눈으로" 대신 (2026-10-07, pixcel-studio QA 방식) */
const qaBest = (label, files) => {
  const list = files.filter((f) => existsSync(f));
  if (!list.length) return null;
  const out = execFileSync(process.execPath, ["scripts/sprite-qa.mjs", "--json", ...list], { encoding: "utf8" });
  const results = JSON.parse(out.trim().split("\n").pop());
  console.log("qa", label, results.map((r) => `${r.file.split("/").pop()}=${r.score}`).join(" "));
  if (results[0].score < 60) throw new Error(`${label}: 최선 후보도 QA ${results[0].score} < 60 — 다시 생성해야 한다 (${results[0].file})`);
  return results[0].file;
};
const globOut = (re) => readdirSync(OUT).filter((f) => re.test(f)).map((f) => `${OUT}/${f}`);
/** 주인공 대기 — 3차(beaverking3, 배경 없는 참조) 후보가 있으면 QA 로 고르고, 없으면 1차 수동 마스크본 */
const heroIdlePath = () => seedOverride["heroidle"] ? `${OUT}/heroidle-beaverking3-${seedOverride["heroidle"]}.png` : (qaBest("hero-idle", globOut(/^heroidle-beaverking3-\d+\.png$/)) ?? `${OUT}/heroidle-beaverking-20261403.png`);
const pickIcon = (stem) => { const s = seedOverride[stem] ?? "20261801"; const f = `${OUT}/icon-${stem}-${s}.png`; if (!existsSync(f)) throw new Error("없음: " + f); return f; };
const backup = (file) => { if (!existsSync(file)) return; mkdirSync(`${OUT}/backup-human`, { recursive: true }); const b = `${OUT}/backup-human/${file.split("/").pop()}`; if (!existsSync(b)) copyFileSync(file, b); };
const alpha = { r: 0, g: 0, b: 0, alpha: 0 };
const toIcon = async (src, dest, size = 128, pad = 0.06) => {
  const inner = Math.round(size * (1 - pad * 2));
  const buf = await sharp(src).trim({ threshold: 8 }).resize(inner, inner, { fit: "contain", background: alpha }).extend({ top: Math.round(size * pad), bottom: size - inner - Math.round(size * pad), left: Math.round(size * pad), right: size - inner - Math.round(size * pad), background: alpha }).png({ palette: true, quality: 92, colours: 256, effort: 10, compressionLevel: 9 }).toBuffer();
  mkdirSync(dest.replace(/\/[^/]+$/, ""), { recursive: true });
  writeFileSync(dest, buf);
  console.log("icon", dest);
};

// ── 주인공 — 사냥터 대기·공격 시트 + 코스튬 4종 파생 ──
if (want("hero")) {
  const heroIdle = heroIdlePath();
  const atk3 = [0, 1, 2, 3].every((i) => existsSync(`${OUT}/heroattack-beaverking3-${i}.png`));
  console.log("hero idle", heroIdle.split("/").pop(), "attack", atk3 ? "beaverking3" : "beaverking(1차)");
  for (let i = 0; i < 4; i += 1) {
    copyFileSync(heroIdle, `${OUT}/hero-idle-${i}.png`);
    copyFileSync(`${OUT}/heroattack-beaverking${atk3 ? "3" : ""}-${i}.png`, `${OUT}/hero-attack-${i}.png`);
  }
  node("scripts/place-art.mjs", "hero");
  // ember·frost 는 사람 주인공의 생성 코스튬이었다 — 비버 기본 시트에서 팔레트로 다시 파생하게 authored 에서 뺀다
  writeFileSync("public/titans/character/skins/authored.json", "[]\n");
  node("scripts/make-character-skins.mjs");
}

// ── 성문 방어 주인공 — 활·지팡이 공격 시트 (batch-beaver2 결과) ──
if (want("defense")) {
  backup(`${OUT}/heroidle-base-20260918-pose.png`);
  copyFileSync(heroIdlePath(), `${OUT}/heroidle-base-20260918-pose.png`);
  for (const w of ["bow", "staff"]) {
    // 11차(beaverking3, QA 로 고른 대기 참조) 프레임이 4장 다 있으면 그것 (2026-10-07)
    const v3 = [0, 1, 2, 3].every((i) => existsSync(`${OUT}/heroattack-beaverking3-${i}-${w}.png`));
    console.log("defense", w, v3 ? "beaverking3" : "beaverking(1차)");
    for (let i = 0; i < 4; i += 1) copyFileSync(`${OUT}/heroattack-beaverking${v3 ? "3" : ""}-${i}-${w}.png`, `${OUT}/heroattack-${w}-${i}.png`);
    node("scripts/make-hero-attack-sheet.mjs", w);
  }
}

// ── 동료 11 — authored 행 + 개별 PNG → 기본 아틀라스(6행) 다시 짜기 → 변형·스킨 아틀라스 → 재패킹 ──
if (want("allies")) {
  const ids = ["mia", "leon", "sera", "garen", "ari", "nox", "luna", "volt", "bronn", "orion", "ember"];
  for (const id of ids) {
    // v2(털색 구분 · 자기 대기 참조, batch-beaver3.sh) 가 있으면 그것을, 없으면 1차 bv 를 꽂는다 (2026-10-07)
    let stem = existsSync(`${OUT}/char-bv2-${id}-hit.png`) ? "bv2" : "bv";
    const v3 = globOut(new RegExp(`^char-bv3-${id}-idle-s\\d+\\.png$`));
    if (v3.length) {
      const best = seedOverride[`bv3-${id}`] ? `${OUT}/char-bv3-${id}-idle-s${seedOverride[`bv3-${id}`]}.png` : qaBest(`ally-${id}`, v3);
      copyFileSync(best, `${OUT}/char-bv3-${id}-idle.png`);
      node("scripts/make-ally-states.mjs", "bv3", id);
      stem = "bv3";
    }
    if (!existsSync(`${OUT}/char-${stem}-${id}-hit.png`)) { console.log("skip", id, "(아직 없음)"); continue; }
    for (const st of ["idle", "run", "attack", "hit"]) { backup(`${OUT}/char-${id}-${st}.png`); copyFileSync(`${OUT}/char-${stem}-${id}-${st}.png`, `${OUT}/char-${id}-${st}.png`); }
    console.log("ally", id, stem);
    node("scripts/place-art.mjs", "char", id);
  }
  // 기본 6명 아틀라스 — authored 행을 6줄로 (209 높이) → repack 이 239 로 늘린다
  const base = ["mia", "leon", "sera", "garen", "ari", "nox"];
  const rows = [];
  for (const [i, id] of base.entries()) rows.push({ input: await sharp(`public/titans/generated/allies/authored/${id}-row.png`).resize(1254, 209, { fit: "fill" }).png().toBuffer(), left: 0, top: i * 209 });
  await sharp({ create: { width: 1254, height: 209 * 6, channels: 4, background: alpha } }).composite(rows).png().toFile("public/titans/generated/allies/ally-animation-atlas-v1.png");
  console.log("base atlas 1254x1254");
  node("scripts/make-variant-atlas.mjs");
  node("scripts/make-variant-standalone.mjs");
  node("scripts/repack-ally-atlas.mjs");
}

// ── 몬스터 31 — 같은 파일명으로 ──
const MON = [
  ["bv-slime", "slime", 512, [20261601, 20261602]], ["bv-goblin", "goblin", 512, [20261603, 20261604]], ["bv-wolf", "shadow-wolf-clean", 512, [20261605, 20261606]],
  ["bv-ogre", "ogre", 512, [20261607, 20261608]], ["bv-dragon", "dragon", 512, [20261609, 20261610]],
  ["bv-magma-slime", "magma-imp", 512, [20261611, 20261612]], ["bv-void-slime", "void-imp", 512, [20261613, 20261614]], ["bv-goblin-shaman", "goblin-shaman", 512, [20261615, 20261616]],
  ["bv-skeleton-goblin", "skeleton-goblin", 512, [20261617, 20261618]], ["bv-frost-wolf", "frost-wolf", 512, [20261619, 20261620]], ["bv-hellhound", "hellhound", 512, [20261621, 20261622]],
  ["bv-stone-troll", "stone-troll", 512, [20261623, 20261624]], ["bv-armored-ogre", "armored-ogre", 512, [20261625, 20261626]], ["bv-lava-drake", "lava-drake", 512, [20261627, 20261628]], ["bv-storm-drake", "storm-drake", 512, [20261629, 20261630]],
  ["bv-moss-golem", "moss-golem-clean", 1024, [20261631, 20261632]], ["bv-moon-wolf-king", "moon-wolf-king-clean", 1024, [20261633, 20261634]], ["bv-wolf-king", "wolf-king-clean", 1024, [20261635, 20261636]],
  ["bv-flame-wyvern", "flame-wyvern-clean", 1024, [20261637, 20261638]], ["bv-abyss-titan", "abyss-titan", 1024, [20261639, 20261640]],
  ["bv-thorn-boar-king", "thorn-boar-king", 1024, [20261641, 20261642]], ["bv-ancient-treant", "ancient-treant", 1024, [20261643, 20261644]], ["bv-ruin-sentinel", "ruin-sentinel", 1024, [20261645, 20261646]],
  ["bv-magma-golem", "magma-golem", 1024, [20261647, 20261648]], ["bv-void-lich", "void-lich", 1024, [20261649, 20261650]], ["bv-goblin-warlord", "goblin-warlord", 1024, [20261651, 20261652]],
  ["bv-spider-queen", "spider-queen", 1024, [20261653, 20261654]], ["bv-minotaur", "minotaur", 1024, [20261655, 20261656]], ["bv-fire-demon", "fire-demon", 1024, [20261657, 20261658]], ["bv-bone-dragon", "bone-dragon", 1024, [20261659, 20261660]],
  ["bv-golden-lion", "golden-lion-clean", 512, [20261661, 20261662]],
];
if (want("monsters")) {
  const margins = {};
  const names = [];
  for (const [stem, dest, size, seeds] of MON) {
    const src = pick(`monster-${stem}`, seeds);
    const out = execFileSync(process.execPath, ["scripts/place-monster.mjs", src, dest, "--size", String(size)], { encoding: "utf8" });
    const m = out.match(/\[([\d.]+), ([\d.]+)\]/);
    if (m) margins[dest] = [Number(m[1]), Number(m[2])];
    names.push(dest);
  }
  // 대장 원화 authored.json(옛 보스 원화의 생성 피격·처치 등록)은 비우고 전부 파생한다
  if (existsSync("public/titans/generated/monsters/authored.json")) writeFileSync("public/titans/generated/monsters/authored.json", "[]\n");
  node("scripts/make-monster-states.mjs", ...names);
  // 256색 팔레트 + 도감 썸네일
  for (const n of names) for (const suf of ["", "-hit", "-defeat"]) {
    const f = `public/titans/generated/monsters/${n}${suf}.png`;
    const b = readFileSync(f);
    const o = await sharp(b).png({ palette: true, quality: 92, colours: 256, dither: 0.8, effort: 10, compressionLevel: 9 }).toBuffer();
    if (o.length < b.length) writeFileSync(f, o);
  }
  mkdirSync("public/titans/generated/monsters/thumbs", { recursive: true });
  for (const n of names) await sharp(`public/titans/generated/monsters/${n}.png`).resize(128, 128, { fit: "contain", background: alpha }).webp({ quality: 82, alphaQuality: 90 }).toFile(`public/titans/generated/monsters/thumbs/${n}.webp`);
  writeFileSync(`${OUT}/beaver-monster-margins.json`, JSON.stringify(margins, null, 1));
  console.log("MARGINS", JSON.stringify(margins));
}

// ── 배경 ──
if (want("backdrops")) {
  const BG = [
    ["bv-meadow", "public/titans/backgrounds/meadow.webp", [20261701, 20261702]], ["bv-forest", "public/titans/backgrounds/forest.webp", [20261703, 20261704]], ["bv-ruins", "public/titans/backgrounds/ruins.webp", [20261705, 20261706]],
    ["bv-volcano", "public/titans/backgrounds/volcano.webp", [20261707, 20261708]], ["bv-abyss", "public/titans/backgrounds/abyss.webp", [20261709, 20261710]],
    ["bv-dodge1", "public/dodge/bg/s1.webp", [20261711, 20261712]], ["bv-dodge2", "public/dodge/bg/s5.webp", [20261713, 20261714]], ["bv-dodge3", "public/dodge/bg/s3.webp", [20261715, 20261716]],
    ["bv-dodge4", "public/dodge/bg/s2.webp", [20261717, 20261718]], ["bv-dodge5", "public/dodge/bg/s4.webp", [20261719, 20261720]],
    ["bv-hub", "public/ui/bg/hub-backdrop.webp", [20261721, 20261722]], ["bv-forge", "public/ui/bg/forge-backdrop.webp", [20261723, 20261724]],
  ];
  for (const [stem, dest, seeds] of BG) {
    // 12차(bv4, 아래 1/3 나무 무대) 가 있으면 그것 — 시드는 --seed=backdrop-bv4-<x>=... 로, 없으면 첫 시드 (2026-10-07)
    const v4 = stem.replace(/^bv-/, "bv4-");
    const v4seeds = seeds.map((x) => x + 400);
    const useV4 = v4seeds.some((x) => existsSync(`${OUT}/backdrop-${v4}-s${x}.png`));
    const src = useV4 ? (seedOverride[`backdrop-${v4}`] ? `${OUT}/backdrop-${v4}-s${seedOverride[`backdrop-${v4}`]}.png` : `${OUT}/backdrop-${v4}-s${v4seeds.find((x) => existsSync(`${OUT}/backdrop-${v4}-s${x}.png`))}.png`) : (seedOverride[`backdrop-${stem}`] ? `${OUT}/backdrop-${stem}-s${seedOverride[`backdrop-${stem}`]}.png` : `${OUT}/backdrop-${stem}-s${seeds.find((x) => existsSync(`${OUT}/backdrop-${stem}-s${x}.png`))}.png`);   // 배경은 스프라이트 QA 대상이 아니다 — 첫 시드
    console.log("bg src", src.split("/").pop());
    const tall = /dodge|hub-|forge-/.test(dest);
    await sharp(src).resize(720, tall ? 1052 : 960, { fit: "cover" }).webp({ quality: 80 }).toFile(dest);
    if (dest.includes("backgrounds/")) await sharp(src).resize(720, 960, { fit: "cover" }).webp({ quality: 72 }).toFile(dest.replace(".webp", "-sm.webp"));
    console.log("bg", dest);
  }
  // 비트 무대 배경 (12차) — public/beat/bg/stage.webp, 캔버스가 cover 로 그린다
  const beat = [20262131, 20262132].map((x) => `${OUT}/backdrop-bv4-beat-s${x}.png`).find((f) => existsSync(f));
  if (beat) { mkdirSync("public/beat/bg", { recursive: true }); await sharp(seedOverride["backdrop-bv4-beat"] ? `${OUT}/backdrop-bv4-beat-s${seedOverride["backdrop-bv4-beat"]}.png` : beat).resize(720, 1052, { fit: "cover" }).webp({ quality: 80 }).toFile("public/beat/bg/stage.webp"); console.log("bg public/beat/bg/stage.webp"); }
}

// ── 아이콘 ──
if (want("icons")) {
  const I = [
    ["bv-gold", "public/ui/attendance/gold.png"], ["bv-gem", "public/ui/attendance/gem.png"], ["bv-gem", "public/ui/rewards/gem.png"], ["bv-enhance-stone", "public/ui/attendance/enhance-stone.png"],
    ["bv-expedition-seal", "public/ui/attendance/expedition-seal.png"], ["bv-skill-orb", "public/ui/attendance/skill-orb.png"], ["bv-shoulder-shards", "public/ui/attendance/shoulder-shards.png"],
    ["bv-scout-pauldron", "public/ui/attendance/scout-pauldron.png"], ["bv-dragon-pauldron", "public/ui/attendance/dragon-pauldron.png"], ["bv-event-chest", "public/ui/attendance/event-chest.png"],
    ["bv-ally-shard", "public/ui/rewards/ally-shard.png"], ["bv-boost", "public/ui/rewards/boost.png"], ["bv-ally-skin", "public/ui/rewards/ally-skin.png"], ["bv-weapon-fx", "public/ui/rewards/weapon-fx.png"],
    ["bv-forge-ticket", "public/ui/rewards/forge-ticket.png"], ["bv-season-xp", "public/ui/rewards/season-xp.png"],
    ...["basic", "fire", "water", "ice", "earth", "bolt", "wind", "poison", "holy", "shadow", "meteor", "ultimate"].map((k) => [`bv-sk-${k}`, `public/dodge/skills/${k}.png`]),
    ...["barrage", "edge", "ember", "focus", "rime", "vitality"].map((k) => [`bv-chip-${k}`, `public/dodge/chips/${k}.png`]),
    ...["draft", "insurance", "primed"].map((k) => [`bv-sup-${k}`, `public/dodge/supplies/${k}.png`]),
    ["bv-wp-bow", "public/dodge/weapons/icon-bow.png"], ["bv-wp-staff", "public/dodge/weapons/icon-staff.png"],
    ...["strike", "pierce", "emberCut", "frostEdge", "crit", "waterStep", "stoneGuard", "galeChain", "clone", "thunderLink", "bloodMoon", "dragonBreath", "warcry", "meteor", "tidalBurst", "voidFinish", "steel", "focus", "guardianSoul", "elementalMastery"].map((k) => [`bv-ts-${k}`, `public/ui/skills/titans/${k}.png`]),
    ...["neon", "gold", "magenta", "ice", "ember"].map((k) => [`bv-ring-${k}`, `public/beat/custom/ring-${k}.png`]),
    ...["triangle", "arrow", "diamond", "star", "bolt"].map((k) => [`bv-spike-${k}`, `public/beat/custom/spike-${k}.png`]),
    ["bv-nav-ally", "public/ui/content-icons/nav-ally.png"], ["bv-nav-shop", "public/ui/content-icons/nav-shop.png"],
  ];
  for (const [stem, dest] of I) await toIcon(pickIcon(stem), dest);
  // 12차: 방치·원정 UI 아이콘 16 (ui/idle/*.svg 대체, 2026-10-07) — 있으면 꽂는다. 시드 기본 20262201, --seed=bv-idle-<n>=... 로 바꾼다
  for (const n of ["idle-report", "anvil", "exp-orb", "expedition", "gate-fund", "gate-locked", "gate-supply", "journal", "lock", "pioneer-flag", "rift", "shadow-seal", "star", "tower", "unlock-crest", "weekend-rift"]) {
    const stem = n === "idle-report" ? "report" : n;   // 배치는 bv-idle-report 로 생성했다
    const sd = seedOverride[`bv-idle-${stem}`] ?? "20262201";
    const f = `${OUT}/icon-bv-idle-${stem}-${sd}.png`;
    if (existsSync(f)) await toIcon(f, `public/ui/idle/${n}.png`, 128, 0.04);
  }
  // 투사체 6 — 가로 160×38 (날아가는 방향 오른쪽) · 도토리 하나를 가운데
  for (const k of ["basic", "bolt", "earth", "fire", "ice", "water"]) {
    const body = await sharp(pickIcon(`bv-ar-${k}`)).trim({ threshold: 8 }).resize(36, 36, { fit: "contain", background: alpha }).png().toBuffer();
    await sharp({ create: { width: 160, height: 38, channels: 4, background: alpha } }).composite([{ input: body, left: 118, top: 1 }]).png().toFile(`public/dodge/arrows/${k}.png`);
    console.log("arrow", k);
  }
  // 콘텐츠 스프라이트 4×2 (887×444)
  const CW = 221.75, CH = 222;
  const cells = [];
  for (const [i, k] of ["hunt", "dodge", "beat", "forge", "profile", "attendance", "event", "settings"].entries()) {
    const b = await sharp(pickIcon(`bv-nav-${k}`)).trim({ threshold: 8 }).resize(196, 196, { fit: "contain", background: alpha }).png().toBuffer();
    cells.push({ input: b, left: Math.round((i % 4) * CW + 13), top: Math.floor(i / 4) * CH + 13 });
  }
  await sharp({ create: { width: 887, height: 444, channels: 4, background: alpha } }).composite(cells).png().toFile("public/ui/content-icons/content-sprite-v1.png");
  // 견갑 시트 4×1 (2172×724) · 프리미엄 무기 외형 3×1 (1536×1024)
  const sh = [];
  for (const [i, k] of ["scout", "shadow", "ogre", "dragon"].entries()) sh.push({ input: await sharp(pickIcon(`bv-sh-${k}`)).trim({ threshold: 8 }).resize(460, 460, { fit: "contain", background: alpha }).png().toBuffer(), left: i * 543 + 41, top: 132 });
  await sharp({ create: { width: 2172, height: 724, channels: 4, background: alpha } }).composite(sh).png().toFile("public/titans/equipment/shoulders/shoulder-tier-sheet.png");
  const pw = [];
  for (const [i, k] of ["crimson", "glacier", "solar"].entries()) pw.push({ input: await sharp(pickIcon(`bv-blade-${k}`)).trim({ threshold: 8 }).resize(440, 900, { fit: "contain", background: alpha }).png().toBuffer(), left: i * 512 + 36, top: 62 });
  await sharp({ create: { width: 1536, height: 1024, channels: 4, background: alpha } }).composite(pw).png().toFile("public/titans/equipment/weapons/premium-weapon-sheet.png");
  console.log("sheets ok");
}

// ── 소품 — 북 16단계(검 자리) · 동료 무기 6 ──
if (want("props")) {
  for (let n = 0; n < 16; n += 1) { const nn = String(n).padStart(2, "0"); backup(`${OUT}/prop-s${nn}.png`); copyFileSync(`${OUT}/prop-bv-drum${nn}.png`, `${OUT}/prop-s${nn}.png`); }
  for (const k of ["mia", "leon", "sera", "garen", "ari", "nox"]) { backup(`${OUT}/prop-w-${k}.png`); copyFileSync(`${OUT}/prop-bv-w-${k}.png`, `${OUT}/prop-w-${k}.png`); }
  node("scripts/place-props.mjs");
  node("scripts/trim-sword-art.mjs");
  for (const k of ["bow", "staff"]) await sharp(`${OUT}/prop-bv-w-${k}.png`).trim({ threshold: 8 }).resize(72, 200, { fit: "contain", background: alpha }).png().toFile(`public/dodge/weapons/${k}.png`);
}

// ── 곡 커버 16 ──
if (want("covers")) {
  for (const id of ["azure-sky", "cherry-pop", "strawberry-lemonade", "turkish-march", "andromeda", "black-city-beat", "dual-racing", "duel", "one-more-time", "plasma-gun", "arcade-overdrive", "cybernetic-overload", "happy-strum-day", "pixel-rush", "playful-pixels", "starlight-strut"]) {
    const src = `${OUT}/cover-bv-${id}.png`;
    if (!existsSync(src)) { console.log("skip cover", id); continue; }
    await sharp(src).resize(256, 256).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile(`public/beat/covers/${id}.png`);
  }
  console.log("covers ok");
}
console.log("DONE", groups.join(",") || "all");
