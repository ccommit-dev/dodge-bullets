// 사냥터 퀘스트 — 시간마다 골드 (2026-10-26 · 10-27 층 잠금 제거 · Lv25 · 10분 보너스) 순수 로직 검사.  node scripts/verify-quests.mjs
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
ok("처음: 30줄(2026-10-28) · 첫 줄만 Lv.1 · 보너스 받은 적 없음 · 배치 판 2", Q.QUESTS.length === 30 && s0.levels[0] === 1 && s0.levels.slice(1).every((x) => x === 0) && s0.levels.length === 30 && s0.bonusAt === 0 && s0.v === 2);
ok("줄 id 가 겹치지 않는다", new Set(Q.QUESTS.map((q) => q.id)).size === 30);
let t = Q.tickQuests(s0, 2.9);
ok("주기(3초) 전엔 0", t.gold === 0 && Math.abs(t.state.prog[0] - 2.9) < 1e-9);
t = Q.tickQuests(t.state, 0.2);
ok("3초 차면 한 번 지급(Lv.1 = 1) · 남은 0.1초 이어 감", t.gold === 1 && t.done.join() === "0" && Math.abs(t.state.prog[0] - 0.1) < 1e-9, `${t.gold} · ${t.state.prog[0]}`);
const big = Q.tickQuests(s0, 10);
ok("10초 한꺼번에 = 3주기 · 남은 1초", big.gold === 3 && Math.abs(big.state.prog[0] - 1) < 1e-9);
ok("잠긴 줄은 돌지 않는다", big.state.prog.slice(1).every((x) => x === 0));

// ── 2. 골드로만 열기 · Lv25 ──
ok("층 잠금 없음 — 골드만 있으면 둘째 줄을 연다", Q.questBlock(s0, 1, Q.questCost(1, 0)) === null && Q.buyQuest(s0, 1, Q.questCost(1, 0)).state.levels[1] === 1);
ok("앞 줄이 잠겼으면 못 연다(까닭 prev)", Q.questBlock(s0, 2, 1e15) === "prev");
ok("골드가 모자라면 실패(까닭 gold)", Q.buyQuest(s0, 1, Q.questCost(1, 0) - 1) === null && Q.questBlock(s0, 1, 0) === "gold");
let st = s0;
for (let k = 0; k < 40; k += 1) { const r = Q.buyQuest(st, 0, 1e15); if (r) st = r.state; }
ok("최대 Lv 25 에서 멈춘다(까닭 max)", st.levels[0] === 25 && Q.questBlock(st, 0, 1e15) === "max");
ok("Lv 값은 계단식(첫 줄 ×1.25 · 나머지 ×1.2)", Q.questCost(0, 1) === Math.ceil(10 * 1.25) && Q.questCost(1, 3) === Math.ceil(7900 * 1.2 ** 3));
ok("보상 = 기본 × Lv · Lv10 ×2 · Lv25 ×4", Q.questPay(0, 9) === 9 && Q.questPay(0, 10) === 20 && Q.questPay(0, 25) === 100);
ok("아래 줄일수록 여는 값 · 주기 · Lv.1 초당 보상이 커진다", Q.QUESTS.slice(1).every((q, i) => q.unlock > Q.QUESTS[i].unlock && q.sec > Q.QUESTS[i].sec && q.pay / q.sec >= Q.QUESTS[i].pay / Q.QUESTS[i].sec));

// ── 3. 10분 보너스 ──
const now = 1_800_000_000_000;
const lv5 = { ...s0, levels: Q.QUESTS.map((_, i) => (i === 0 ? 5 : 0)) };
const per = Q.questGoldPerSec(lv5);
const b1 = Q.claimQuestBonus(lv5, now);
ok("10분 보너스 = 초당 퀘스트 골드 × 100", b1 && b1.gold === Math.floor(per * 100) && b1.state.bonusAt === now, `${per}/s → ${b1?.gold}`);
ok("받은 뒤 10분 동안은 못 받는다", Q.claimQuestBonus(b1.state, now + 9 * 60_000) === null && Q.questBonusLeftMs(b1.state, now + 9 * 60_000) === 60_000);
ok("10분 지나면 다시 · 쌓이지 않는다(30분 뒤에도 한 번)", Q.claimQuestBonus(b1.state, now + 10 * 60_000)?.gold === b1.gold && Q.claimQuestBonus(Q.claimQuestBonus(b1.state, now + 30 * 60_000).state, now + 30 * 60_000) === null);

// ── 4. 저장 정리 · 환생 ──
// 30줄 판(v 2) — 칸 그대로
const idx = (id) => Q.QUESTS.findIndex((q) => q.id === id);
const lv30 = Q.QUESTS.map(() => 0); lv30[0] = 0; lv30[1] = 3.7; lv30[2] = -1; lv30[7] = 999; lv30[12] = "x";
const pr30 = Q.QUESTS.map(() => 0); pr30[0] = 5; pr30[1] = 1.5; pr30[2] = 9; pr30[7] = 99;
const n = Q.normalizeQuests({ levels: lv30, prog: pr30, bonusAt: 123.9, v: 2 });
ok("정리: 첫 줄 최소 Lv.1 · 소수 버림 · 음수 0 · 상한 25 · 주기 넘는 진행 깎음 · bonusAt", n.levels[0] === 1 && n.levels[1] === 3 && n.levels[2] === 0 && n.levels[7] === 25 && n.levels[12] === 0 && n.prog[0] === 3 && n.prog[1] === 1.5 && n.prog[2] === 0 && n.prog[7] === Q.QUESTS[7].sec && n.bonusAt === 123, JSON.stringify(n.levels.slice(0, 13)));
// 옛 8줄 저장(v 없음) — 같은 id 자리로 옮긴다
const old = Q.normalizeQuests({ levels: [7, 3, 2, 5, 4, 1, 1, 1], prog: [1, 2, 3, 4, 5, 6, 7, 8], bonusAt: 5 });
ok("옛 저장의 연 줄은 앞 새 줄이 잠겨도 계속 올린다(댐 틈 메우기 Lv.2 · 앞 '갈대 엮기' 잠김)", Q.questBlock(old, idx("dam-patch"), 1e15) === null && Q.questBlock(old, idx("reed-weave"), 1e15) === null && Q.questBlock(Q.emptyQuests(), 3, 1e15) === "prev");
ok("옛 8줄 저장 → 30줄의 같은 id 자리 (댐 틈 · 강가 순찰 · 큰 댐 …) · 새 줄은 잠김", Q.OLD_QUEST_ORDER.every((id, k) => old.levels[idx(id)] === [7, 3, 2, 5, 4, 1, 1, 1][k]) && old.levels.filter((x) => x > 0).length === 8 && old.prog[idx("great-dam")] === 8 && old.v === 2, Q.OLD_QUEST_ORDER.map((id) => `${id}@${idx(id)}`).join(" "));
ok("옛 저장(Lv 300 까지 오른 줄 · bonusAt 없음)도 25 · 0 으로", Q.normalizeQuests({ levels: [120, 40] }).levels.slice(0, 2).join() === "25,25" && Q.normalizeQuests({ levels: [1] }).bonusAt === 0);
ok("옛 저장(quests 없음) → 첫 줄 Lv.1", JSON.stringify(M.normalizeTitansSave({ gold: 5 }).quests) === JSON.stringify(s0));
ok("환생(빈 사냥터 저장)이면 첫 줄 Lv.1 로", JSON.stringify(M.defaultTitansSave().quests) === JSON.stringify(Q.emptyQuests()));

// ── 5. 폭주 막기 — 퀘스트 골드만으로 복리(10분 보너스 포함 · 탐욕 구매) ──
// 층 잠금이 없으니 여는 값 · 증가율로 막는다. 사냥 골드(초당 처치 골드 × 0.7)와 견준 목표: 1시간 · 하루 · 일주일 뒤에도 그 무렵 사냥터 층의 사냥 골드를 크게 넘지 않는다
const hunt = (stage) => M.killGold(stage, false, false) * 0.7;
const simQuestOnly = (minutes) => {
  let s = Q.emptyQuests(), gold = 0;
  for (let m = 1; m <= minutes; m += 1) {
    const r = Q.tickQuests(s, 60); s = r.state; gold += r.gold;
    const bonus = Q.claimQuestBonus(s, m * 60_000 + 1_000_000); if (bonus) { s = bonus.state; gold += bonus.gold; }
    for (;;) {
      let best = -1, bp = Infinity;
      for (let i = 0; i < Q.QUESTS.length; i += 1) {
        if (Q.questBlock(s, i, gold)) continue;
        const lv = s.levels[i]; const gain = (Q.questPay(i, lv + 1) - Q.questPay(i, lv)) / Q.QUESTS[i].sec;
        const pb = Q.questCost(i, lv) / Math.max(1e-9, gain); if (pb < bp) { bp = pb; best = i; }
      }
      if (best < 0) break;
      const r2 = Q.buyQuest(s, best, gold); s = r2.state; gold -= r2.cost;
    }
  }
  return Q.questGoldPerSec(s);
};
for (const [label, minutes, stage] of [["1시간", 60, 10], ["하루", 1440, 25], ["3일", 4320, 30], ["7일", 10080, 40]]) {
  const q = simQuestOnly(minutes), h = hunt(stage);
  ok(`퀘스트만 ${label} 굴려도 ${stage}층 사냥 골드의 150% 이하`, q <= h * 1.5, `퀘스트 ${Math.round(q)}/s · ${stage}층 사냥 ${Math.round(h)}/s (${Math.round((q / h) * 100)}%)`);
}
ok("그래도 첫 10분 안에 초당 수입이 눈에 띄게 오른다(첫 줄 Lv.10 이상)", (() => { let s = Q.emptyQuests(), g = 0; for (let k = 0; k < 600; k += 1) { const r = Q.tickQuests(s, 1); s = r.state; g += r.gold + hunt(3); const b = Q.buyQuest(s, 0, g); if (b) { s = b.state; g -= b.cost; } } return s.levels[0] >= 10; })());
const maxAll = Q.questGoldPerSec({ levels: Q.QUESTS.map(() => 25) });
ok("모두 Lv25 = 끝판(50층 무렵) 사냥 골드 정도", maxAll >= hunt(45) && maxAll <= hunt(55), `${Math.round(maxAll)}/s · 45층 ${Math.round(hunt(45))} · 55층 ${Math.round(hunt(55))}`);

// ── 6. 아이콘 ──
const missing = Q.QUESTS.map((q) => `public/titans/quests/${q.id}.png`).filter((f) => !existsSync(f));
ok("퀘스트 아이콘 30장", missing.length === 0, missing.join(" "));

console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
