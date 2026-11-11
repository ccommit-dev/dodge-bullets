// 사냥터 승급전 (2026-11-11, titans/promotion.ts · specialFight.ts) 순수 로직 검사 — 등급 · 문턱 · 수호자 · 보너스 상한.  node scripts/verify-promotion.mjs
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "promo-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, [
  `export * as P from "${root}/src/titans/promotion";`,
  `export * as S from "${root}/src/titans/specialFight";`,
  `export * as M from "${root}/src/titans/model";`,
  `export * as B from "${root}/src/titans/bestiary";`,
  `export * as A from "${root}/src/titans/spriteAnim";`,
  `export * as PM from "${root}/src/progression/model";`,
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error", loader: { ".png": "empty", ".webp": "empty", ".css": "empty" }, define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
const { P, S, M, B, A, PM } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

let fails = 0;
const ok = (name, cond, detail = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); if (!cond) fails += 1; };
const R = P.HERO_RANKS;

// ── 1. 등급 표 ──
ok("등급 0~6", R.length === 7 && R.every((d, i) => d.rank === i));
ok("문턱 층 · 보너스 · 보석은 등급마다 오른다", R.slice(1).every((d, i) => d.unlockStage > R[i].unlockStage && d.atkBonus > R[i].atkBonus && d.gems >= R[i].gems), R.map((d) => `${d.unlockStage}층 +${Math.round(d.atkBonus * 100)}%`).join(" · "));
ok("주인공 공격 보너스 상한 +50%", P.heroRankAtkMul(6) === 1.5 && P.heroRankAtkMul(0) === 1 && P.heroRankAtkMul(99) === 1.5);
ok("첫 돌파 보석 합 360", R.reduce((s, d) => s + d.gems, 0) === 360);
ok("이름 · 색이 다 있다", R.every((d) => d.title && d.color && d.markColor) && R.slice(1).every((d) => d.guardianName && d.guardianArt));

// ── 2. 문턱 ──
ok("8층 전엔 도전 못 한다", !P.canChallengeRank(0, 7) && P.canChallengeRank(0, 8));
ok("다음 등급만 — 0등급이 40층이어도 1등급부터", P.nextHeroRank(0).rank === 1 && P.canChallengeRank(0, 40));
ok("마지막 등급 뒤로는 없다", P.nextHeroRank(6) === null && !P.canChallengeRank(6, 9999));
ok("읽기: 깨진 값은 0 · 범위 밖은 자른다", P.normalizeHeroRank("x") === 0 && P.normalizeHeroRank(-3) === 0 && P.normalizeHeroRank(9) === 6 && P.normalizeHeroRank(2.7) === 2);

// ── 3. 수호자 ──
for (const d of R.slice(1)) {
  const f = P.guardianFace(d.rank);
  const inArea = (B.HUNT_BOSSES[f.area.id] ?? []).some((m) => m.art === d.guardianArt);
  const sameFace = B.huntBossVariant(f.area, f.stage).art === d.guardianArt;
  ok(`${d.rank}등급 수호자 그림 = 그 지역 대장 교대 그림(${d.guardianArt})`, inArea && sameFace && f.stage >= f.area.stageFrom && f.stage <= f.area.stageTo && A.hasMonsterAnim(d.guardianArt), `${f.area.id} ${f.stage}층`);
  ok(`${d.rank}등급 수호자 썸네일 있음`, existsSync(`public/titans/generated/monsters/thumbs/${d.guardianArt}.webp`));
}
const hpRate = R.slice(1).map((d) => P.guardianHp(d.rank) / M.monsterHp(d.unlockStage - 1, true));
ok("수호자 체력 = 문턱 아래 층 대장의 1.1배", hpRate.every((r) => Math.abs(r - 1.1) < 0.01), hpRate.map((r) => r.toFixed(3)).join(" "));
ok("등급이 오르면 수호자도 단단해진다", R.slice(2).every((d, i) => P.guardianHp(d.rank) > P.guardianHp(R[i + 1].rank)));

// ── 4. 특수 대결 ──
const promo = { kind: "promotion", rank: 3 }, urgent = { kind: "urgent", urgent: "login", day: "2026-11-11" };
ok("승급전 체력 · 시간", S.specialHp(promo, 40) === P.guardianHp(3) && S.specialTimeSec(promo, 30) === 30 && S.specialTimeSec(promo, 45) === 45);
ok("현상범은 예전 그대로(아래 층 대장 55% · 2/3 시간)", S.specialHp(urgent, 40) === Math.max(8, Math.floor(M.monsterHp(39, true) * 0.55)) && S.specialTimeSec(urgent, 30) === 20);
const pf = S.specialFace(promo, 5);
ok("승급전 얼굴은 수호자 지역 · 이름(지금 층과 무관)", pf.area.id === P.guardianFace(3).area.id && pf.name === "황금 파수 기사", `${pf.area.id} ${pf.stage} ${pf.name}`);
const uf = S.specialFace(urgent, 8);
ok("현상범 얼굴은 지금 지역의 다른 대장", uf.area.id === M.huntingArea(8).id && uf.name !== B.huntBossVariant(M.huntingArea(8), 8).name, uf.name);
ok("판 제목 · 제한 시간 이름", S.SPECIAL_TITLE.promotion === "승급전" && S.SPECIAL_FOE.promotion === "수호자" && S.SPECIAL_TITLE.urgent === "긴급 의뢰");

// ── 5. 저장 ──
ok("새 계정 0등급", PM.emptyCharacterProgress().heroRank === 0);
ok("저장 읽기: heroRank 정규화", PM.normalizeCharacterProgress({ heroRank: 4 }).heroRank === 4 && PM.normalizeCharacterProgress({ heroRank: "z" }).heroRank === 0 && PM.normalizeCharacterProgress({}).heroRank === 0);

console.log(fails ? `\n${fails}건 실패` : "\n모두 통과");
process.exit(fails ? 1 : 0);
