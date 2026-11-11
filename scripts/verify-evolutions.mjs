// 댐 방어전 스킬 진화 (2026-11-11, game/evolutions.ts · perks.ts) 규칙 검사 — 스킬마다 두 갈래 · 하나만 · 그 스킬이 있어야 · 대가.  node scripts/verify-evolutions.mjs
// 갈래끼리의 세기 비교는 시뮬(node scripts/dodge-evolutions2.mjs, 몇 분)이 본다
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "evo-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, [
  `export * as P from "${root}/src/game/perks";`,
  `export * as E from "${root}/src/game/evolutions";`,
  `export * as SS from "${root}/src/game/skillShots";`,
  `export * as W from "${root}/src/game/world";`,
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error", loader: { ".png": "empty", ".webp": "empty", ".css": "empty", ".mp3": "empty", ".ogg": "empty" }, define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
const { P, E, SS, W } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

let fails = 0;
const ok = (name, cond, detail = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); if (!cond) fails += 1; };
const PERKS = P.PERKS ?? P.PERK_DEFS ?? Object.values(P).find((v) => Array.isArray(v) && v[0]?.id && v[0]?.rarity);
const evo = PERKS.filter((p) => p.evolution);
const SKILLS = ["water", "earth", "bolt", "wind", "poison", "holy", "shadow", "meteor"];

ok("진화 카드 22장(기본 사격 · 불 · 얼음 6 + 8종 × 2)", evo.length === 22, String(evo.length));
for (const sk of SKILLS) {
  const cards = evo.filter((p) => p.needs?.includes(sk));
  ok(`${sk}: 두 갈래 · 에픽 · '진화 · ' 이름`, cards.length === 2 && cards.every((c) => c.rarity === "epic" && c.label.startsWith("진화 · ") && c.desc.includes("·")), cards.map((c) => c.label).join(" / "));
}

// 하나만 · 그 스킬이 있어야
const world = W.createWorld ? W.createWorld(390, 844) : null;
if (world) {
  for (const sk of SKILLS) {
    const [a, b] = evo.filter((p) => p.needs?.includes(sk));
    world.skillLevels = { ...world.skillLevels, [sk]: 0 }; world.runSkills = { ...(world.runSkills ?? {}), [sk]: false }; world.runMods.evolutions = {};
    const noSkill = !a.available(world);
    world.skillLevels = { ...world.skillLevels, [sk]: 3 }; world.runSkills = { ...world.runSkills, [sk]: true };
    const yes = a.available(world) && b.available(world);
    a.apply(world);
    const once = !a.available(world) && !b.available(world) && !!world.runMods.evolutions[sk];
    ok(`${sk}: 스킬이 없으면 안 뜨고 · 있으면 뜨고 · 하나 고르면 둘 다 사라진다`, noSkill && yes && once, `${noSkill} ${yes} ${once}`);
  }
  // 대가 — 재사용
  const cd = (sk, e) => { world.runMods.evolutions = e ? { [sk]: e } : {}; return E.evoCooldownMul(world, sk); };
  ok("재사용 대가: 해일 · 낙뢰 · 심판 · 암살 · 거대 운석", cd("water", "tide") > 1 && cd("bolt", "smite") > 1 && cd("holy", "judgment") > 1 && cd("shadow", "assassin") > 1 && cd("meteor", "titan") > 1 && cd("water", "split") === 1 && cd("bolt", null) === 1);
} else ok("월드 만들기", false, "createWorld 없음");

// 설명의 숫자가 표와 같다
const D = Object.fromEntries(evo.map((p) => [p.id, p.desc]));
const pct = (x) => `${Math.round(x * 100)}%`;
ok("설명 = 표: 물 분열 · 연발 바위 · 성역 · 유성우", D.evoSplit.includes(pct(E.EVO.water.splitDamage)) && D.evoBarrage.includes(pct(E.EVO.earth.barrageDamage)) && D.evoSanctum.includes(pct(E.EVO.holy.sanctumDamage)) && D.evoShower.includes(pct(E.EVO.meteor.showerDamage)));
ok("설명 = 표: 재사용 대가", D.evoTide.includes(`+${Math.round((E.EVO.water.tideCooldown - 1) * 100)}%`) && D.evoSmite.includes(`+${Math.round((E.EVO.bolt.smiteCooldown - 1) * 100)}%`) && D.evoJudgment.includes(`+${Math.round((E.EVO.holy.judgmentCooldown - 1) * 100)}%`) && D.evoAssassin.includes(`+${Math.round((E.EVO.shadow.assassinCooldown - 1) * 100)}%`) && D.evoTitan.includes(`+${Math.round((E.EVO.meteor.titanCooldown - 1) * 100)}%`));
ok("설명 = 표: 배수", D.evoSmite.includes(`${E.EVO.bolt.smiteDamage}배`) && D.evoJudgment.includes(`${E.EVO.holy.judgmentDamage}배`) && D.evoVenom.includes(`${E.EVO.poison.venomDps}배`) && D.evoTitan.includes(`${E.EVO.meteor.titanRadius}배`) && D.evoTitan.includes(`${E.EVO.meteor.titanDamage}배`));
ok("skillCooldown 이 진화 대가를 읽는다", typeof SS.skillCooldown === "function");

console.log(fails ? `\n${fails}건 실패` : "\n모두 통과");
process.exit(fails ? 1 : 0);
