/**
 * 방치 밸런스 시뮬레이터
 *
 * `src/progression/idle.ts`와 `src/forge/model.ts`를 그대로 번들해서 돌린다.
 * 상수를 이 파일에 복제하지 않는 것이 요점이다 — 공식이 바뀌면 결과도 같이 바뀐다.
 *
 *   node scripts/balance-sim.mjs [--days 30] [--seed 12345] [--md]
 *
 * --md 를 주면 마크다운 표로 출력한다(문서 붙여넣기용).
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const DAYS = Number(flag("days", 30));
const SEED = Number(flag("seed", 20260821));
const AS_MD = args.includes("--md");

// ── 실제 소스 번들 ────────────────────────────────────────────────
const outDir = mkdtempSync(join(tmpdir(), "dodge-sim-"));
// esbuild JS API를 직접 쓴다. Windows에서 npx.cmd를 spawn하면 EINVAL이 난다.
const esbuild = await import("esbuild");

async function bundle(entry, name) {
  const out = join(outDir, name);
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    platform: "neutral",
    outfile: out,
    // asset.ts가 import.meta.env.BASE_URL을 읽는다 — Node에는 없으므로 주입한다.
    define: { "import.meta.env.BASE_URL": '"/"' },
    logLevel: "error",
  });
  return pathToFileURL(out).href;
}

const idle = await import(await bundle("src/progression/idle.ts", "idle.mjs"));
const forge = await import(await bundle("src/forge/model.ts", "forge.mjs"));
const titans = await import(await bundle("src/titans/model.ts", "titans.mjs"));
const progression = await import(await bundle("src/progression/model.ts", "progression.mjs"));
const allies = await import(await bundle("src/titans/allies.ts", "allies.mjs"));

// ── 재현 가능한 난수 ──────────────────────────────────────────────
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── 시뮬레이션 가정 (결과를 읽을 때 반드시 같이 봐야 한다) ────────
const ASSUMPTIONS = {
  sessionsPerDay: 2,
  hoursBetweenSessions: 12,
  /** 액티브 플레이어의 하루 사냥터 조작 시간(초) */
  activePlaySeconds: 20 * 60,
  /** 초당 탭 횟수 */
  tapsPerSecond: 4,
  /** 액티브 플레이어가 하루에 올리는 비트 숙련 총합 */
  beatMasteryPerDay: 6,
  /** 하루 강화 시도 상한 (골드가 되는 만큼, 이 횟수까지) */
  forgeAttemptsPerDay: 12,
  /** 차원 균열 1회당 조각 — 요일별 2·3·6 평균 (events/weekdayRift.ts) */
  riftShardsPerRun: 3.5,
  /** 주간 도전 조각 합 (events/weekly.ts: 10 + 12) */
  weeklyShards: 22,
};
/** 조각이 편성 최강 동료에게 가는 비율 — --focus 0 (전부 무작위, 현행) ~ 1 (전부 집중) */
const SHARD_FOCUS = Number(flag("focus", 0.7)); // allies.ts SHARD_PARTY_FOCUS와 같은 값
/** 조각 수급 배율 실험용 — --shardmult 2 등 */
const SHARD_MULT = Number(flag("shardmult", 1));

/**
 * 사냥터 전투 시뮬레이션 — 스테이지 진행은 DPS가 결정한다.
 *
 * "하루 N스테이지"로 고정하면 killGold(1.26^s)만 반영되고 monsterHp(1.38^s)가
 * 빠진다. HP가 골드보다 빠르게 늘기 때문에 진행은 반드시 감속하는데, 고정 가정은
 * 그 벽을 지워 버려 30일차에 천문학적 수치가 나온다. 실제 함수로 벽을 재현한다.
 */
function playTitans(state, seconds, stageCeiling) {
  let t = seconds;
  let advanced = 0;
  let wall = false;
  while (t > 0) {
    const dps =
      titans.totalHeroDps(state.heroes, (id) => allies.starMultiplier(allies.effectiveStars(state.stars?.[id], state.heroes[id]))) +
      titans.playerIdleDps(state.weaponMastery) +
      titans.tapDamage(state.weaponMastery) * ASSUMPTIONS.tapsPerSecond;

    // 일반 몬스터 10마리
    const mobHp = titans.monsterHp(state.stage, false);
    const mobTime = (mobHp / dps) * titans.MOBS_PER_STAGE;
    // 보스는 제한 시간 안에 못 잡으면 진행이 막힌다 — 이게 진짜 벽이다.
    const bossHp = titans.monsterHp(state.stage, true);
    const bossTime = bossHp / dps;
    if (bossTime > titans.BOSS_TIME_SEC) {
      // 벽에 막힘 — 남은 시간은 현재 스테이지 반복 사냥으로 골드만 번다.
      const perLoop = Math.max(0.5, mobTime);
      const loops = Math.floor(t / perLoop);
      state.gold += loops * titans.MOBS_PER_STAGE * titans.killGold(state.stage, false, false);
      spendTitansGold(state);
      wall = true;
      break;
    }
    const need = mobTime + bossTime;
    if (need > t) break;
    t -= need;
    state.gold +=
      titans.MOBS_PER_STAGE * titans.killGold(state.stage, false, false) +
      titans.killGold(state.stage, true, false) +
      titans.stageClearBonus(state.stage);
    spendTitansGold(state);
    if (state.stage >= stageCeiling) break; // 개척 게이트
    state.stage += 1;
    advanced += 1;
  }
  return { advanced, wall };
}

/** 사냥터 골드는 동료·무기 숙련에 쓴다 (가장 싼 것부터 탐욕적으로). */
function spendTitansGold(state) {
  for (let guard = 0; guard < 400; guard += 1) {
    const options = [];
    const weaponCost = titans.equipmentTrainingCost("weapon", state.weaponMastery);
    options.push({ cost: weaponCost, buy: () => { state.weaponMastery += 1; } });
    for (const hero of titans.HEROES) {
      if (state.stage < hero.unlockStage) continue;
      const lvl = state.heroes[hero.id];
      options.push({ cost: titans.heroUpgradeCost(hero, lvl), buy: () => { state.heroes[hero.id] = lvl + 1; } });
    }
    options.sort((a, b) => a.cost - b.cost);
    const pick = options[0];
    if (!pick || pick.cost > state.gold) return;
    state.gold -= pick.cost;
    pick.buy();
  }
}

function freshProgress() {
  return progression.normalizeCharacterProgress(null);
}

/** 해금된 슬롯을 전부 장착했다고 본다 (액티브 플레이어 기준). */
function equipMapFor(p) {
  const levels = idle.slotLevels(p);
  const skillBySlot = {
    starter: "strike", linkA: "crit", linkB: "clone", finisher: "warcry", passive: "steel",
  };
  const map = {};
  for (const slot of Object.keys(levels)) if (levels[slot] > 0) map[slot] = skillBySlot[slot];
  return map;
}

function simulate(kind) {
  const rng = mulberry32(SEED);
  const p = freshProgress();
  const active = kind === "balanced";
  // 대장간은 버튼만 누르면 되므로 방치형도 한다 — 이게 방치형의 유일한 성장선이다.
  const forgeLevelRef = { level: 0 };
  const titansState = {
    stage: 1,
    gold: 0,
    weaponMastery: 1,
    heroes: Object.fromEntries(titans.HEROES.map((h) => [h.id, 0])),
    stars: Object.fromEntries(titans.HEROES.map((h) => [h.id, 0])),
  };
  const wallSet = new Set();
  let rebirths = 0;
  let boostNextDay = false;
  let wallStreak = 0;
  const rows = [];
  let cumulativeGold = 0;
  let wallDays = 0;
  let gateDays = 0;

  for (let day = 1; day <= DAYS; day += 1) {
    // ── 방치 정산 (세션 수만큼) — P1 따라잡기·조각 드랍 포함 ──
    let dayGold = 0, dayExp = 0, dayMats = 0, cappedToday = false;
    let lastEndStage = titansState.stage;
    let dayShards = 0;
    const equipped = equipMapFor(p);
    for (let s = 0; s < ASSUMPTIONS.sessionsPerDay; s += 1) {
      const y = idle.computeIdleYield(p, lastEndStage, equipped, ASSUMPTIONS.hoursBetweenSessions * 3600);
      dayGold += y.gold; dayExp += y.exp; dayMats += y.materials;
      dayShards += Math.round(y.allyShardDrops * SHARD_MULT);
      lastEndStage = Math.max(lastEndStage, y.endStage);
      if (y.cappedOut) cappedToday = true;
    }
    p.sharedCoins += dayGold;
    p.exp += dayExp;
    p.enhancementMaterials += dayMats;
    cumulativeGold += dayGold;
    // 출석은 매일 한다고 본다 — T 보너스(최대 +2h)에 반영된다.
    p.attendanceStreak = day;
    // P1 따라잡기 반영
    titansState.stage = Math.max(titansState.stage, lastEndStage);
    // 조각 수급: 방치 드랍 + 차원 균열 3회(요일 평균 ≈ 3.5/회, 균형형만) + 주간 도전(주 22, 균형형만)
    if (active) {
      dayShards += Math.round(3 * ASSUMPTIONS.riftShardsPerRun * SHARD_MULT);
      if (day % 7 === 0) dayShards += ASSUMPTIONS.weeklyShards;
    }
    // 배분: 편성 상위 DPS 동료 우선(SHARD_FOCUS 비율) · 나머지는 무작위 보유 동료
    for (let d = 0; d < dayShards; d += 1) {
      const owned = Object.keys(titansState.heroes).filter((id) => titansState.heroes[id] > 0);
      if (owned.length === 0) break;
      let id = owned[Math.floor(rng() * owned.length)];
      if (rng() < SHARD_FOCUS) {
        const top = [...owned].sort((a, b) => titans.heroDps(titans.HEROES.find((h) => h.id === b), titansState.heroes[b]) - titans.heroDps(titans.HEROES.find((h) => h.id === a), titansState.heroes[a]))[0];
        if (top) id = top;
      }
      p.allyShards[id] = (p.allyShards[id] ?? 0) + 1;
    }
    // 조각이 모이면 즉시 승급 (탐욕)
    for (const id of Object.keys(titansState.heroes)) {
      if (titansState.heroes[id] <= 0) continue;
      let stars = allies.effectiveStars(titansState.stars[id], titansState.heroes[id]);
      let need = allies.shardCostToNext(id, stars);
      while (need !== null && (p.allyShards[id] ?? 0) >= need) {
        p.allyShards[id] -= need;
        stars += 1;
        titansState.stars[id] = stars;
        need = allies.shardCostToNext(id, stars);
      }
    }
    // 무한 재련: +15 이후 골드가 비용의 3배 이상이면 시도
    if (p.bestForgeLevel >= 15) {
      let guard = 0;
      while (guard++ < 20 && p.sharedCoins >= forge.reforgeCost(p.reforgeRank) * 3) {
        p.sharedCoins -= forge.reforgeCost(p.reforgeRank);
        if (rng() < forge.reforgeChance(p.reforgeRank)) p.reforgeRank += 1;
      }
    }

    // ── 대장간 강화 (두 archetype 공통) ──
    for (let i = 0; i < ASSUMPTIONS.forgeAttemptsPerDay; i += 1) {
      const tier = forge.tierAt(forgeLevelRef.level);
      if (forgeLevelRef.level >= 15 || p.sharedCoins < tier.cost) break;
      p.sharedCoins -= tier.cost;
      const chance = forge.effectiveChance(tier, "steady") + (p.enhancementMaterials > 0 ? 0.08 : 0);
      if (p.enhancementMaterials > 0) p.enhancementMaterials -= 1;
      if (rng() < Math.min(1, chance)) {
        forgeLevelRef.level = Math.min(15, forgeLevelRef.level + 1);
        p.bestForgeLevel = Math.max(p.bestForgeLevel, forgeLevelRef.level);
      } else {
        forgeLevelRef.level = 0; // 방지권 없이 진행 — 최악 가정
      }
    }
    p.equippedWeaponLevel = forgeLevelRef.level;

    if (active) {
      // ── 화살 원정: 게이트에 막혔으면 그날 뚫는다 (30초짜리라 현실적) ──
      if (titansState.stage >= idle.stageCeilingFor(p.pioneeredArea) && p.pioneeredArea < 5) {
        p.pioneeredArea += 1;
        p.dodgeBestStage = Math.min(4, p.dodgeBestStage + 1);
        gateDays += 1;
      }
      // ── 비트 수련 ──
      const skills = ["kick", "hat", "snare", "fire", "throat"];
      for (let i = 0; i < ASSUMPTIONS.beatMasteryPerDay; i += 1) {
        const id = skills[(day + i) % skills.length];
        p.beatSkills[id] = Math.min(99, p.beatSkills[id] + 1);
      }
      // ── 사냥터 전투 (DPS가 진행을 결정) ──
      const res = playTitans(titansState, ASSUMPTIONS.activePlaySeconds, idle.stageCeilingFor(p.pioneeredArea));
      if (res.wall) { wallDays += 1; wallStreak += 1; wallSet.add(titans.huntingArea(titansState.stage).id); } else { wallStreak = 0; }
      p.titanBestStage = Math.max(p.titanBestStage, titansState.stage);

      // ── 환생: 조건 충족 + 벽 정체 5일 이상일 때만.
      // 즉시 환생은 동료 DPS 손실이 결정 이득보다 커서 손해라는 것이 탐욕 정책 실험으로 확인됨. ──
      if (wallSet.size >= 3 && wallStreak >= 5) {
        wallStreak = 0;
        wallSet.clear();
        p.inheritanceCrystals += Math.max(3, Math.floor(Math.sqrt(p.titanBestStage) * 3));
        p.rebirthCount += 1;
        rebirths += 1;
        titansState.stage = 1;
        titansState.gold = 0;
        for (const id of Object.keys(titansState.heroes)) titansState.heroes[id] = 0;
        titansState.weaponMastery = 1;
        boostNextDay = true; // 다음날 정산에만 2배 적용
      }
    }

    p.level = progression.levelFromExp(p.exp);
    rows.push({
      day, stage: titansState.stage,
      area: p.pioneeredArea,
      level: p.level,
      R: idle.idleRate(p, equipMapFor(p)),
      M: idle.idleMultiplier(p),
      T: idle.idleCapHours(p),
      forge: p.bestForgeLevel,
      dayGold, capped: cappedToday,
      wallet: p.sharedCoins,
    });
  }
  const starsTotal = Object.values(titansState.stars).reduce((a, b) => a + (b || 0), 0);
  return { kind, rows, cumulativeGold, wallDays, gateDays, final: p, stage: titansState.stage, rebirths, starsTotal };
}

function firstDayReaching(rows, pick, target) {
  const hit = rows.find((r) => pick(r) >= target);
  return hit ? hit.day : null;
}

const fmt = (n) =>
  n >= 1e12 ? `${(n / 1e12).toFixed(2)}T`
  : n >= 1e9 ? `${(n / 1e9).toFixed(2)}B`
  : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M`
  : n >= 1e4 ? `${(n / 1e3).toFixed(1)}K`
  : Math.round(n).toLocaleString();

const runs = [simulate("idleOnly"), simulate("balanced")];
const LABEL = { idleOnly: "방치형 (다른 콘텐츠 안 함)", balanced: "균형형 (4개 다 함)" };

const lines = [];
lines.push(`# 방치 밸런스 시뮬레이션`);
lines.push("");
lines.push(`- 기간 **${DAYS}일** · 시드 \`${SEED}\` · 하루 ${ASSUMPTIONS.sessionsPerDay}회 접속(${ASSUMPTIONS.hoursBetweenSessions}시간 간격)`);
lines.push(`- 공식은 \`src/progression/idle.ts\`를 그대로 번들해 사용 — 상수 복제 없음`);
lines.push(`- 스테이지 진행은 실제 \`monsterHp\`/\`heroDps\`/\`killGold\`로 전투를 돌려 결정한다 — 고정 속도 가정 없음`);
lines.push(`- 액티브 가정: 사냥터 조작 ${ASSUMPTIONS.activePlaySeconds / 60}분/일(초당 ${ASSUMPTIONS.tapsPerSecond}탭) · 비트 숙련 ${ASSUMPTIONS.beatMasteryPerDay}/일 · 강화 ${ASSUMPTIONS.forgeAttemptsPerDay}회/일`);
lines.push(`- 대장간 강화는 두 archetype 공통(버튼만 누르면 되므로) · 방지권 없이 실패 시 0단계 (최악 가정)`);
lines.push(`- 출석은 매일 한다고 본다 (\`attendanceStreak\` → T 보너스 최대 +2h)`);
lines.push("");

for (const run of runs) {
  const r = run.rows;
  const last = r[r.length - 1];
  lines.push(`## ${LABEL[run.kind]}`);
  lines.push("");
  lines.push(`| 일 | Stage | 지역 | Lv | R | M | T | 대장간 | 일일 골드 | 캡 |`);
  lines.push(`|---:|---:|---:|---:|---:|---:|---:|---:|---:|:--:|`);
  for (const row of r) {
    if (row.day > 7 && row.day % 5 !== 0 && row.day !== DAYS) continue;
    lines.push(
      `| ${row.day} | ${row.stage} | ${row.area}/5 | ${row.level} | ${(row.R * 100).toFixed(1)}% | ×${row.M.toFixed(2)} | ${row.T}h | +${row.forge} | ${fmt(row.dayGold)} | ${row.capped ? "◉" : "·"} |`,
    );
  }
  lines.push("");
  lines.push(`**도달 시점** — ` + [
    `R 최대(25%): ${firstDayReaching(r, (x) => x.R, idle.IDLE.rateCap) ?? "미도달"}일`,
    `M 최대(×3): ${firstDayReaching(r, (x) => x.M, idle.IDLE.multCap) ?? "미도달"}일`,
    `T 최대(14h): ${firstDayReaching(r, (x) => x.T, idle.IDLE.hoursCap) ?? "미도달"}일`,
    `전 지역 개척: ${firstDayReaching(r, (x) => x.area, 5) ?? "미도달"}일`,
  ].join(" · "));
  lines.push("");
  lines.push(`**${DAYS}일차** — Stage ${last.stage} · Lv ${last.level} · 누적 골드 ${fmt(run.cumulativeGold)} · DPS 벽 ${run.wallDays}일 · 개척 ${run.gateDays}회 · 환생 ${run.rebirths}회 · 성급 합 ${run.starsTotal} · 재련 ${run.final.reforgeRank}`);
  lines.push("");
}

// ── 두 archetype 비교 ──
const [idleRun, balRun] = runs;
const ratio = balRun.cumulativeGold / Math.max(1, idleRun.cumulativeGold);
lines.push(`## 판정`);
lines.push("");
lines.push(`- 균형형 / 방치형 누적 골드 배수: **×${ratio.toFixed(1)}**`);
lines.push(`- 방치형 ${DAYS}일차 일일 골드 ${fmt(idleRun.rows[DAYS - 1].dayGold)} vs 균형형 ${fmt(balRun.rows[DAYS - 1].dayGold)}`);
lines.push(`- 방치형 최종 Stage ${idleRun.stage} (1에서 ${idleRun.stage === 1 ? "변화 없음" : "상승"})`);

const out = AS_MD ? lines.join("\n") : lines.join("\n");
console.log(out);

rmSync(outDir, { recursive: true, force: true });
