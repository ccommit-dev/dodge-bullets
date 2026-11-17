// 강화가 게임에 반영되나 (2026-11-17, 사용자: "아이템이 업그레이드 될 때마다 성능이 게임에 반영되었으면") — 순수 로직 · 연결 검사
//   node scripts/verify-upgrade-reflect.mjs
// ① 창 · 활 · 지팡이 대장간 20단계가 모두 사냥터 피해를 올린다(예전엔 반올림 눈금으로 5단계가 0) · 예전보다 낮은 단계 없음 · 검은 그대로
// ② 대장간 견갑 강화(armorLevel)가 사냥터 동료 피해 · 성문 방어 투구 · 전투력에 들어간다(예전엔 아무도 안 쓰는 shoulderEnhance 를 읽어 늘 0)
// ③ 무기 단계 빛(data-wgrade) · 세트 파츠 강화 빛(data-enh) · 반영 알림이 화면 코드에 이어져 있다
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "upgrade-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, [
  `export * as W from "${root}/src/titans/weapons";`,
  `export * as prog from "${root}/src/progression/model";`,
  `export * as anchors from "${root}/src/equipment/anchors";`,
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true", "import.meta.env.MODE": '"production"' }, loader: { ".png": "empty", ".webp": "empty", ".css": "empty", ".mp3": "empty" } });
const { W, prog, anchors } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

let fails = 0;
const ok = (name, cond, detail = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); if (!cond) fails += 1; };

// ① 대장간 눈금
const old = (n) => Math.floor(Math.round((n * 15) / 20) * 1.5);
for (const kind of ["spear", "bow", "staff"]) {
  const seq = Array.from({ length: 21 }, (_, n) => W.weaponForgeBonus(kind, 0, { [kind]: n }));
  const rising = seq.every((v, n) => n === 0 || v > seq[n - 1]);
  const notLower = seq.every((v, n) => v >= old(n));
  const deadOld = Array.from({ length: 20 }, (_, i) => i + 1).filter((n) => old(n) === old(n - 1));
  ok(`${kind}: 20단계 모두 사냥터 피해가 오른다 · 예전보다 낮은 단계 없음`, rising && notLower && seq[0] === 0, `${seq.join(",")} (예전 0 이던 단계 ${deadOld.join(",")})`);
  ok(`${kind}: +20 은 예전 끝(22)에서 +1 이내`, seq[20] - old(20) <= 1 && seq[20] >= old(20), `${seq[20]} vs ${old(20)}`);
}
const swordSame = Array.from({ length: 16 }, (_, n) => W.weaponForgeBonus("sword", n, {}) === Math.floor(n * 1.5)).every(Boolean);
ok("검: 예전 그대로(단계 × 1.5)", swordSame && W.weaponForgeBonus("sword", 99, {}) === 22);
ok("그림 · 표시 눈금(weaponHuntLevel 0~15)은 그대로", W.weaponHuntLevel("spear", 0, { spear: 20 }) === 15 && W.weaponHuntLevel("bow", 0, { bow: 7 }) === 5);

// ② 견갑 강화
const base = prog.normalizeCharacterProgress ? prog.normalizeCharacterProgress({}) : null;
if (base) {
  const p0 = prog.combatPower({ ...base, armorLevel: 0 }), p10 = prog.combatPower({ ...base, armorLevel: 10 });
  ok("전투력에 견갑 강화가 들어간다(+1 단계 = +20)", p10 - p0 === 200, `${p0} → ${p10}`);
} else ok("전투력 — normalizeCharacterProgress 를 찾았다", false, Object.keys(prog).filter((k) => /normal|create|default/i.test(k)).join(","));
ok("성문 방어 투구 단계: 견갑 +1 나무 · +5 철 · +10 금", anchors.helmetTierOf(0) === 0 && anchors.helmetTierOf(1) === 1 && anchors.helmetTierOf(5) === 2 && anchors.helmetTierOf(10) === 3);
const tg = readFileSync("src/TitansGame.tsx", "utf8"), app = readFileSync("src/App.tsx", "utf8");
ok("사냥터 동료 지원은 armorLevel 을 읽는다(shoulderEnhance 아님)", /armorLevelRef\.current \* 0\.02/.test(tg) && !/current.shoulderEnhance/.test(tg));
ok("성문 방어 투구는 armorLevel 로", /helmetTierOf\(p\.armorLevel/.test(app) && !/helmetTierOf\(p\.shoulderEnhance/.test(app));
ok("사냥 피해는 weaponForgeBonus 한 곳에서(옛 forgedWeaponLevel × 1.5 없음)", /weaponForgeBonus\(weaponKind, drumLevel/.test(tg) && !/forgedWeaponLevel(Ref\.current)? \* 1\.5/.test(tg));

// ③ 화면 연결
const eq = readFileSync("src/ui/EquippedCharacter.tsx", "utf8"), css = readFileSync("src/ui/upgradeGlow.css", "utf8");
ok("무기 단계 빛 · 크기 · 반짝임 · 단계 오를 때 고리", /data-wgrade=\{wGrade\}/.test(eq) && /anchor\.hand\.scale \* \(1 \+ wGrade \* 0\.025\)/.test(eq) && /weapon-sparkle/.test(eq) && /gear-level-up/.test(eq));
ok("세트 파츠 강화 빛(data-enh) · 모든 주인공 그림에 단계 전달", /data-enh=/.test(eq) && (tg.match(/wornLevels=\{character\.gearSetLevels\}/g) ?? []).length >= 2);
ok("빛 CSS 여섯 칸 · 파츠 세 칸 · 외형(weapon-skin) · 시전은 제외", [1, 2, 3, 4, 5].every((g) => css.includes(`[data-wgrade="${g}"]`)) && [1, 2, 3].every((g) => css.includes(`[data-enh="${g}"]`)) && css.includes(":not(.weapon-skin):not(.weapon-cast)"));
ok("돌아오면 반영 알림 · 주인공 반짝임", /upgrade-seen/.test(tg) && /강화 반영 · 탭 피해/.test(tg) && /hero-powerup-burst/.test(tg));

console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
