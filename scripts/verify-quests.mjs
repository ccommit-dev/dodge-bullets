// 사냥터 퀘스트 — 시간마다 골드 (2026-10-26) 순수 로직 검사.  node scripts/verify-quests.mjs
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "quests-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, [`export * as Q from "${root}/src/titans/quests";`, `export * as M from "${root}/src/titans/model";`].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
const { Q, M } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

let fails = 0;
const ok = (name, cond, detail = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); if (!cond) fails += 1; };

// ── 1. 시작 · 지급 ──
const s0 = Q.emptyQuests();
ok("처음: 8줄 · 첫 줄만 Lv.1", Q.QUESTS.length === 8 && s0.levels.join(",") === "1,0,0,0,0,0,0,0");
let t = Q.tickQuests(s0, 2.9);
ok("주기(3초) 전엔 0", t.gold === 0 && Math.abs(t.state.prog[0] - 2.9) < 1e-9);
t = Q.tickQuests(t.state, 0.2);
ok("3초 차면 한 번 지급(Lv.1 = 1) · 남은 0.1초 이어 감", t.gold === 1 && t.done.join() === "0" && Math.abs(t.state.prog[0] - 0.1) < 1e-9, `${t.gold} · ${t.state.prog[0]}`);
const big = Q.tickQuests(s0, 10);
ok("10초 한꺼번에 = 3주기 · 남은 1초", big.gold === 3 && Math.abs(big.state.prog[0] - 1) < 1e-9);
ok("잠긴 줄은 돌지 않는다", big.state.prog.slice(1).every((x) => x === 0));

// ── 2. 강화 · 열기 · 마일스톤 ──
ok("두 번째 줄: 5층 전엔 못 연다(까닭 stage)", Q.questBlock(s0, 1, 1e12, 4) === "stage" && Q.buyQuest(s0, 1, 1e12, 4) === null);
ok("세 번째 줄: 앞 줄이 잠겼으면 못 연다(까닭 prev)", Q.questBlock(s0, 2, 1e12, 99) === "prev");
let b = Q.buyQuest(s0, 1, 499, 5);
ok("골드가 모자라면 실패(까닭 gold)", b === null && Q.questBlock(s0, 1, 499, 5) === "gold");
b = Q.buyQuest(s0, 1, 500, 5);
ok("5층 · 500 골드 → 두 번째 줄 열림", b && b.state.levels[1] === 1 && b.cost === 500);
ok("레벨 상한: 여는 층 5 · 한 층마다 +2", Q.questLevelCap(0, 1) === 5 && Q.questLevelCap(0, 3) === 9 && Q.questLevelCap(1, 4) === 0 && Q.questLevelCap(1, 6) === 7);
const capped = { levels: [5, 0, 0, 0, 0, 0, 0, 0], prog: s0.prog };
ok("상한에 닿으면 골드가 있어도 못 올린다(까닭 cap)", Q.questBlock(capped, 0, 1e12, 1) === "cap" && Q.questBlock(capped, 0, 1e12, 2) === null);
ok("Lv 값은 계단식(×1.1)", Q.questCost(0, 1) === Math.ceil(10 * 1.1) && Q.questCost(0, 10) === Math.ceil(10 * 1.1 ** 10));
ok("보상 = 기본 × Lv · Lv10 부터 ×2", Q.questPay(0, 9) === 9 && Q.questPay(0, 10) === 20 && Q.questPay(0, 25) === 100 && Q.milestoneMul(200) === 32);
ok("다음 마일스톤", Q.nextMilestone(1) === 10 && Q.nextMilestone(10) === 25 && Q.nextMilestone(200) === null);
ok("아래 줄일수록 여는 층 · 주기 · Lv.1 초당 보상이 커진다", Q.QUESTS.slice(1).every((q, i) => q.stage > Q.QUESTS[i].stage && q.sec > Q.QUESTS[i].sec && q.pay / q.sec >= Q.QUESTS[i].pay / Q.QUESTS[i].sec));

// ── 3. 저장 정리 · 환생 ──
const n = Q.normalizeQuests({ levels: [0, 3.7, -1, 999, "x"], prog: [5, 1.5, 9, 99] });
ok("정리: 첫 줄 최소 Lv.1 · 소수 버림 · 음수 0 · 상한 300 · 주기 넘는 진행 깎음", n.levels[0] === 1 && n.levels[1] === 3 && n.levels[2] === 0 && n.levels[3] === 300 && n.levels[4] === 0 && n.prog[0] === 3 && n.prog[1] === 1.5 && n.prog[2] === 0 && n.prog[3] === 25, JSON.stringify(n));
ok("옛 저장(quests 없음) → 첫 줄 Lv.1", JSON.stringify(M.normalizeTitansSave({ gold: 5 }).quests.levels) === JSON.stringify(s0.levels));
ok("환생(빈 사냥터 저장)이면 첫 줄 Lv.1 로", JSON.stringify(M.defaultTitansSave().quests) === JSON.stringify(Q.emptyQuests()));

// ── 4. 크기 — 사냥 골드와 견주기 ──
// 사냥 골드(초당) ≈ 처치 골드 × 초당 처치 0.7. 그 골드를 1분마다 퀘스트에 탐욕(가장 빨리 돌려받는 것)으로 다시 넣으면 퀘스트 초당이 어디까지 오르나
const hunt = (stage) => M.killGold(stage, false, false) * 0.7;   // 지역 보상 배율 포함
const greedy = (minutes, stage) => {
  let st = Q.emptyQuests(), gold = 0;
  for (let m = 0; m < minutes; m += 1) {
    const r = Q.tickQuests(st, 60); st = r.state; gold += r.gold + hunt(stage) * 60 * 0.3;   // 사냥 골드의 30% 만 퀘스트에 쓴다고 본다
    for (;;) {
      let best = -1, bestPay = Infinity;
      for (let i = 0; i < Q.QUESTS.length; i += 1) {
        const lv = st.levels[i]; if (Q.questBlock(st, i, gold, stage)) continue;
        const cost = Q.questCost(i, lv);
        const gain = (Q.questPay(i, lv + 1) - Q.questPay(i, lv)) / Q.QUESTS[i].sec;
        const payback = cost / Math.max(1e-9, gain);
        if (payback < bestPay) { bestPay = payback; best = i; }
      }
      if (best < 0) break;
      const r2 = Q.buyQuest(st, best, gold, stage); st = r2.state; gold -= r2.cost;
    }
  }
  return Q.questGoldPerSec(st);
};
// 한 층에 오래 머물며 퀘스트 골드를 전부 다시 넣어도(복리) 상한이 막는다 — 1~60층 어디서도 사냥 골드의 15~150%
for (const [stage, mins] of [[1, 30], [5, 60], [10, 120], [15, 180], [20, 240], [30, 360], [40, 480], [50, 600], [60, 600]]) {
  const q = greedy(mins, stage), h = hunt(stage);
  ok(`Stage ${stage} · ${mins}분 머물며 다 넣어도 퀘스트 초당 = 사냥 골드의 15~150%`, q >= h * 0.15 && q <= h * 1.5, `퀘스트 ${Math.round(q)}/s · 사냥 ${Math.round(h)}/s (${Math.round((q / h) * 100)}%)`);
}

// ── 5. 아이콘 ──
const missing = Q.QUESTS.map((q) => `public/titans/quests/${q.id}.png`).filter((f) => !existsSync(f));
ok("퀘스트 아이콘 8장", missing.length === 0, missing.join(" "));

console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
