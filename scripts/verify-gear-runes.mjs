// 세트 파츠 룬 홈 (2026-11-17, 사용자: "아이템 부여나 강화 시에 보석을 넣는다거나 조금 더 재미 요소를") — 순수 로직 · 연결 검사
//   node scripts/verify-gear-runes.mjs
// 홈 +3/+6/+9 · 후보 세 장(서로 다른 룬 · 같은 씨앗 같은 후보 · 등급 70/25/5) · 효과(낀 파츠의 열린 홈만 · 공명 ×1.5 · 룬마다 상한) ·
// 저장 정규화(모르는 값 · 안 가진 것 · 한정 파츠 버림) · 새 재화 없음(강화석 · 은화) · 사냥터 연결(치명 · 동료 속도 · 대장 시간 · 골드 두 곳)
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "runes-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, [`export * as R from "${root}/src/equipment/gearRunes";`, `export * as prog from "${root}/src/progression/model";`].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true", "import.meta.env.MODE": '"production"' }, loader: { ".png": "empty", ".webp": "empty", ".css": "empty", ".mp3": "empty" } });
const { R, prog } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

let fails = 0;
const ok = (name, cond, detail = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); if (!cond) fails += 1; };

// 홈
const sockets = Array.from({ length: 11 }, (_, lv) => R.runeSocketCount(lv));
ok("홈은 +3 · +6 · +9 에서 하나씩(최대 3)", sockets.join() === "0,0,0,1,1,1,2,2,2,3,3", sockets.join());
ok("다음 홈 단계 안내", R.nextRuneSocketAt(0) === 3 && R.nextRuneSocketAt(4) === 6 && R.nextRuneSocketAt(9) === null);
ok("한정 파츠(오텀 장갑)엔 룬이 없다", !R.canHoldRunes("autumn-gloves") && R.canHoldRunes("sword-helmet"));

// 후보
const a = R.rollRuneOffer("sword-helmet", 0, 1, "u"), b = R.rollRuneOffer("sword-helmet", 0, 1, "u"), c = R.rollRuneOffer("sword-helmet", 0, 2, "u");
ok("같은 파츠 · 홈 · 횟수 · 사용자 → 같은 후보(껐다 켜도 같다)", JSON.stringify(a) === JSON.stringify(b));
ok("뽑을 때마다(횟수) 후보가 바뀐다", JSON.stringify(a.cands) !== JSON.stringify(c.cands));
let distinct = true; const grades = [0, 0, 0]; const runes = { flame: 0, gale: 0, earth: 0, gold: 0 };
for (let i = 0; i < 4000; i += 1) { const o = R.rollRuneOffer("bow-boots", i % 3, i, "seed"); if (new Set(o.cands.map((x) => x.rune)).size !== 3) distinct = false; for (const x of o.cands) { grades[x.grade] += 1; runes[x.rune] += 1; } }
const n = grades.reduce((s, v) => s + v, 0), pct = grades.map((g) => (g / n) * 100);
ok("후보 세 장은 서로 다른 룬", distinct);
ok("등급 비율 ≈ 일반 70 · 희귀 25 · 영웅 5", Math.abs(pct[0] - 70) < 2.5 && Math.abs(pct[1] - 25) < 2.5 && Math.abs(pct[2] - 5) < 1.2, pct.map((v) => v.toFixed(1)).join(" / "));
ok("네 룬이 고르게 나온다(±3%p)", Object.values(runes).every((v) => Math.abs(v / n - 0.25) < 0.03), JSON.stringify(runes));

// 효과
const eq = { helmet: "sword-helmet", armor: "sword-armor" };
const fx1 = R.gearRuneEffects({ "sword-helmet": [{ rune: "flame", grade: 0 }, { rune: "gold", grade: 2 }, null] }, eq, { "sword-helmet": 6 });
ok("열린 홈만 · 일반 ×1 · 영웅 ×2", Math.abs(fx1.tapCritAdd - 0.01) < 1e-9 && Math.abs(fx1.goldMul - 1.03) < 1e-9, JSON.stringify(fx1.totals));
const fxLocked = R.gearRuneEffects({ "sword-helmet": [{ rune: "flame", grade: 0 }, { rune: "flame", grade: 0 }, { rune: "flame", grade: 0 }] }, eq, { "sword-helmet": 4 });
ok("안 열린 홈(강화 +4 → 1칸)은 안 센다", Math.abs(fxLocked.tapCritAdd - 0.01) < 1e-9);
const fxNotWorn = R.gearRuneEffects({ "bow-helmet": [{ rune: "gale", grade: 2 }, null, null] }, eq, { "bow-helmet": 9 });
ok("안 낀 파츠는 안 센다", fxNotWorn.allySpeedMul === 1);
const triple = [{ rune: "earth", grade: 0 }, { rune: "earth", grade: 0 }, { rune: "earth", grade: 0 }];
const fxRes = R.gearRuneEffects({ "sword-helmet": triple }, eq, { "sword-helmet": 9 });
ok("공명(같은 룬 셋) → 그 파츠 ×1.5", R.runeResonance(triple) === "earth" && Math.abs(fxRes.bossTimeAdd - 0.3 * 3 * 1.5) < 1e-9, String(fxRes.bossTimeAdd));
ok("셋이 다르면 공명 없음", R.runeResonance([{ rune: "earth", grade: 0 }, { rune: "gold", grade: 0 }, { rune: "earth", grade: 0 }]) === null);
const all = Object.fromEntries(["helmet", "armor", "gloves", "boots", "shoulder"].map((s) => [s, `sword-${s}`]));
const maxRunes = (rune) => Object.fromEntries(Object.values(all).map((id) => [id, [0, 1, 2].map(() => ({ rune, grade: 2 }))]));
const lv9 = Object.fromEntries(Object.values(all).map((id) => [id, 10]));
const caps = Object.fromEntries(R.RUNE_IDS.map((r) => [r, R.gearRuneEffects(maxRunes(r), all, lv9)]));
ok("룬마다 상한: 치명 +6%p · 동료 속도 +5% · 대장 +2초 · 골드 +10%", Math.abs(caps.flame.tapCritAdd - 0.06) < 1e-9 && Math.abs(caps.gale.allySpeedMul - 1.05) < 1e-9 && Math.abs(caps.earth.bossTimeAdd - 2) < 1e-9 && Math.abs(caps.gold.goldMul - 1.1) < 1e-9 && caps.flame.capped.flame);
ok("효과 글자", /탭 치명 확률 \+6%p\(최대\)/.test(R.runeEffectsText(caps.flame)), R.runeEffectsText(caps.flame));

// 새기기 · 저장
const offer = R.rollRuneOffer("sword-armor", 1, 7, "u");
const engraved = R.engraveRune({}, offer, 2);
ok("고른 후보가 그 홈에 새겨진다(나머지 빈 칸)", engraved["sword-armor"]?.length === 3 && engraved["sword-armor"][1]?.rune === offer.cands[2].rune && engraved["sword-armor"][0] === null);
const norm = R.normalizeGearRunes({ "sword-armor": [{ rune: "flame", grade: 1 }, { rune: "nope", grade: 0 }], "bow-helmet": [{ rune: "gold", grade: 0 }], "autumn-gloves": [{ rune: "gold", grade: 0 }], junk: 3 }, ["sword-armor", "autumn-gloves"]);
ok("저장 정규화: 모르는 룬 · 안 가진 파츠 · 한정 파츠 · 모르는 키 버림", JSON.stringify(norm) === JSON.stringify({ "sword-armor": [{ rune: "flame", grade: 1 }, null, null] }), JSON.stringify(norm));
ok("후보 정규화: 세 장 · 홈 0~2 · 가진 파츠만", R.normalizeRuneOffer(offer, ["sword-armor"])?.cands.length === 3 && R.normalizeRuneOffer({ ...offer, socket: 5 }, ["sword-armor"]) === null && R.normalizeRuneOffer(offer, []) === null);
const p0 = prog.normalizeCharacterProgress({ ownedGear: ["sword-armor"], gearRunes: { "sword-armor": [{ rune: "gale", grade: 2 }] }, runeOffer: offer, runeRolls: 7 });
ok("진행 저장에 gearRunes · runeOffer · runeRolls 가 남는다", p0.gearRunes["sword-armor"]?.[0]?.rune === "gale" && p0.runeOffer?.socket === 1 && p0.runeRolls === 7);
const fresh = prog.normalizeCharacterProgress({});
ok("새 저장: 룬 없음 · 후보 없음", JSON.stringify(fresh.gearRunes) === "{}" && fresh.runeOffer === null && fresh.runeRolls === 0);
ok("새 재화 없음 — 비용은 강화석 · 은화", R.RUNE_OPEN_COST.materials > 0 && R.RUNE_REROLL_COST.materials > 0 && Object.keys(R.RUNE_OPEN_COST).sort().join() === "coins,materials");

// 사냥터 연결
const tg = readFileSync("src/TitansGame.tsx", "utf8");
ok("치명에 불꽃 룬", /critChance \+ runeFxRef\.current\.tapCritAdd\)/.test(tg));
ok("동료 공격 속도에 바람 룬", /autoSpeedMul \* runeFxRef\.current\.allySpeedMul;/.test(tg));
ok("대장 제한시간에 대지 룬(memo deps 포함)", /runeFx\.bossTimeAdd,/.test(tg) && /character\.relics, runeFx\]/.test(tg));
ok("처치 골드 · 긴급 의뢰 골드에 황금 룬", /runeFxRef\.current\.goldMul \*/.test(tg) && /gearRuneEffects\(character\.gearRunes, character\.equippedGear, character\.gearSetLevels\)\.goldMul/.test(tg));
ok("홈 여는 비용은 강화석 · 은화에서만 빠진다", /enhancementMaterials: c\.enhancementMaterials - RUNE_OPEN_COST\.materials, sharedCoins: c\.sharedCoins - RUNE_OPEN_COST\.coins/.test(tg));

console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
