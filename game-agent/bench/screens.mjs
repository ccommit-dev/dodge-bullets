/**
 * 화면 벤치 — 정해진 화면에 가서(필요하면 화면 버그를 끼워 넣고) 규칙 판정이 무엇을 짚는지 잰다. 2026-11-13.
 *
 *   node game-agent/run.mjs screens [--set design|holdout|all] [--only b05,h03]
 *
 * 세트
 *   design  — 11-10 비버 화면 20장과 같은 화면 · 같은 버그 짝(정상 10 · 버그 10). 새 규칙을 이 버그 종류를 보고 골랐으니 "규칙을 만든 장"이다
 *   holdout — 같은 10종을 정상 화면 10곳에 둘씩 다른 시드로(20장). 규칙을 만들 때 보지 않은 화면 · 대상 — 공정한 숫자는 이쪽
 * 채점 — 규칙이 "울렸다"가 아니라 "대상을 짚었다": 짚은 요소(data-agent-flag)가 주입 대상(data-fault-target)이거나 그 안이면 잡음.
 *   덮임 · 접힘은 짚은 요소가 대상을 품어도 잡음(덮은 층 · 접힌 상자가 곧 대상이라서). NaN · 깨진 경로는 이슈 글에 대상 글자가 있으면 잡음.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openWebGame } from "../bridge/web-cdp.mjs";
import { applyScreenFault, SCREEN_FAULTS } from "../bridge/faults.mjs";
import { checkRules } from "../oracles/rules.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 화면 가는 길 — close: 부팅 모달 닫기 · nav: 아래 메뉴 · sub: 상점 머리 탭 · growth: 성장 탭 · tap: 글자 정규식 단추 */
export const SCREENS = {
  b01: ["상점 패키지", [{ close: 1 }, { nav: "상점" }, { sub: "패키지" }]],
  b02: ["상점 이벤트", [{ close: 1 }, { nav: "상점" }, { sub: "이벤트" }]],
  b03: ["설정", [{ close: 1 }, { nav: "설정" }]],
  b04: ["상점 꾸미기", [{ close: 1 }, { nav: "상점" }, { sub: "꾸미기" }]],
  b05: ["퀘스트", [{ close: 1 }, { growth: "퀘스트" }]],
  b06: ["상점 재화", [{ close: 1 }, { nav: "상점" }, { sub: "재화" }]],
  b07: ["유물", [{ close: 1 }, { growth: "유물" }]],
  b08: ["견갑", [{ close: 1 }, { growth: "장비" }, { tap: "^견갑" }]],
  b09: ["무기", [{ close: 1 }, { growth: "장비" }, { tap: "^무기" }]],
  b10: ["모험", [{ close: 1 }, { nav: "모험" }]],
  b11: ["장비 성장", [{ close: 1 }, { growth: "장비" }]],
  b12: ["마이페이지", [{ close: 1 }, { nav: "설정" }, { tap: "^마이페이지" }]],
  b13: ["동료", [{ close: 1 }, { nav: "동료" }]],
  b14: ["상점 뽑기", [{ close: 1 }, { nav: "상점" }, { sub: "뽑기" }]],
  b15: ["사냥터", [{ close: 1 }]],
  b16: ["갑옷", [{ close: 1 }, { growth: "장비" }, { tap: "^갑옷" }]],
  b17: ["스킬", [{ close: 1 }, { growth: "스킬" }]],
  b18: ["출석 모달", []],
  b19: ["성장 알림", [{ close: 1 }, { tap: "^성장 알림" }]],
  b20: ["설정 더 보기", [{ close: 1 }, { nav: "설정" }, { tap: "^더 보기" }]],
};
/** 11-10 과 같은 짝 */
const DESIGN_FAULTS = { b05: "invisible", b06: "offscreen", b07: "broken", b09: "rotate", b12: "clip", b13: "overlap", b15: "nan", b17: "collapse", b19: "modaldim", b20: "lines" };
const NORMALS = Object.keys(SCREENS).filter((k) => !DESIGN_FAULTS[k]);

export function benchCases(set = "all") {
  const out = [];
  if (set === "design" || set === "all") for (const id of Object.keys(SCREENS)) out.push({ id, set: "design", screen: id, fault: DESIGN_FAULTS[id] ?? null, seed: 11 + Number(id.slice(1)) });
  if (set === "holdout" || set === "all") {
    SCREEN_FAULTS.forEach((fault, i) => {
      for (const [k, off, mul] of [[0, 1, 7], [1, 6, 13]]) {
        const screen = NORMALS[(i + off) % NORMALS.length];
        out.push({ id: `h${String(i * 2 + k + 1).padStart(2, "0")}`, set: "holdout", screen, fault, seed: 1000 * (k + 1) + i * mul });
      }
    });
  }
  return out;
}

async function goTo(game, steps) {
  const click = (sel, src) => game.page.evaluate((sel, src) => {
    const re = new RegExp(src);
    const name = (x) => [x.getAttribute("aria-label") || "", (x.textContent || "").trim()];
    const b = [...document.querySelectorAll(sel)].find((x) => name(x).some((s) => re.test(s)) && x.getBoundingClientRect().width > 0);
    b?.click();
    return !!b;
  }, sel, src);
  for (const st of steps) {
    let ok = true;
    if (st.close) {
      for (let k = 0; k < 4; k += 1) {
        const hit = await game.page.evaluate(() => { const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav, .hub-sheet")).find((x) => /^(닫기|확인|나중에)$/.test((x.textContent || "").trim()) && x.getBoundingClientRect().width > 0); b?.click(); return !!b; });
        if (!hit) break;
        await sleep(500);
      }
    } else if (st.nav) ok = await click(".titans-bottom-nav button", st.nav);
    else if (st.sub) ok = await click(".hub-sheet-switch button", `^${st.sub}`);
    else if (st.growth) ok = await click(".titans-growth-tabs button", st.growth);
    else if (st.tap) ok = await click("button,[role=button]", st.tap);
    if (!ok) return `가는 길 실패: ${JSON.stringify(st)}`;
    await sleep(700);
  }
  return null;
}

/** 짚은 요소(flag id) ↔ 대상 관계 — same(같거나 대상 안) · holds(짚은 요소가 대상을 품음) */
function relationsInPage() {
  const T = [...document.querySelectorAll("[data-fault-target]")];
  const rel = {};
  for (const F of document.querySelectorAll("[data-agent-flag]")) {
    for (const id of F.getAttribute("data-agent-flag").split(/\s+/)) {
      for (const t of T) {
        if (F === t || t.contains(F)) rel[id] = "same";
        else if (F.contains(t) && rel[id] !== "same") rel[id] = "holds";
      }
    }
  }
  return rel;
}

const HOLDS_OK = new Set(["covered", "collapsed"]);
/**
 * 맞는 종류 — 대상을 짚었고 그 규칙 이름이 버그를 바로 말할 때(모델 채점의 "설명이 버그 종류를 가리킴"과 같은 잣대). 측정 전에 정함.
 * 기울어짐은 맞는 규칙이 없다(일부러 안 만듦 — 넣은 방식을 잡는 규칙이 된다). 접힘은 "숨김 상자에 글자가 잘림"도 맞는 설명으로 친다.
 */
const EXPECT = { invisible: ["faint-text"], offscreen: ["overflow"], broken: ["broken-image", "http"], rotate: [], clip: ["clipped-text"], overlap: ["covered"], nan: ["bad-number"], collapse: ["collapsed", "clipped-text"], modaldim: ["covered"], lines: ["text-overlap"] };

export async function runScreens({ set = "all", only, dir, log = console.log, base }) {
  const cases = benchCases(set).filter((c) => !only || String(only).split(",").includes(c.id));
  mkdirSync(join(dir, "shots"), { recursive: true });
  const game = await openWebGame({ base });
  const rows = [];
  try {
    for (const c of cases) {
      const [name, steps] = SCREENS[c.screen];
      await game.reset("qa");
      game.drainEvents();
      const nav = await goTo(game, steps);
      await sleep(900);
      let inj = null;
      if (c.fault) {
        inj = await game.page.evaluate(applyScreenFault, c.fault, c.seed);
        await sleep(900);
      }
      const cur = await game.observe();
      const events = game.drainEvents();
      const issues = checkRules({ cur, events }).filter((i) => i.severity !== "info");
      const rel = c.fault && inj?.ok ? await game.page.evaluate(relationsInPage) : {};
      for (const i of issues) {
        const r = i.ref ? rel[i.ref] : null;
        i.target = !!c.fault && !!inj?.ok && (r === "same" || (r === "holds" && HOLDS_OK.has(i.type)) || (inj.match || []).some((m) => String(i.detail).includes(m)));
        i.right = i.target && EXPECT[c.fault].includes(i.type);
      }
      await game.page.screenshot({ path: join(dir, "shots", `${c.id}.jpg`), type: "jpeg", quality: 70 });
      const row = { ...c, name, nav, injected: inj, caught: issues.some((i) => i.target), right: issues.some((i) => i.right), issues, faintUnknown: cur.signals.visual?.skipped?.faintUnknown ?? 0 };
      rows.push(row);
      log(`${c.id} ${name.padEnd(8)} ${c.fault ?? "정상"}${nav ? ` [${nav}]` : ""}${inj && !inj.ok ? ` [주입 실패: ${inj.why}]` : ""} → ${c.fault ? (row.right ? "잡음" : row.caught ? "자리만 짚음" : "못 잡음") : "-"} · 짚은 것 ${issues.length}${issues.length ? ": " + issues.map((i) => `${i.right ? "★" : i.target ? "☆" : ""}${i.type}`).join(", ") : ""}`);
    }
  } finally {
    await game.close();
  }
  writeFileSync(join(dir, "results.json"), JSON.stringify(rows, null, 2));
  writeFileSync(join(dir, "report.md"), report(rows));
  return rows;
}

function report(rows) {
  const lines = [`# 화면 벤치 (${new Date().toLocaleString("ko-KR")})`, ""];
  for (const set of ["design", "holdout"]) {
    const rs = rows.filter((r) => r.set === set && !r.nav);
    if (!rs.length) continue;
    const clean = rs.filter((r) => !r.fault), bad = rs.filter((r) => r.fault && r.injected?.ok);
    lines.push(`## ${set === "design" ? "설계용 20장(11-10 과 같은 짝 — 규칙을 만든 장)" : "따로 떼어 둔 장(다른 화면 · 다른 시드)"}`, "");
    if (clean.length) lines.push(`- 정상 ${clean.length}장 중 규칙이 무엇이든 짚은 장: ${clean.filter((r) => r.issues.length).length}`);
    lines.push(`- 버그 ${bad.length}장 중 맞는 종류로 대상을 짚은 장: ${bad.filter((r) => r.right).length} (자리만 짚은 장 포함 ${bad.filter((r) => r.caught).length})`, `- 버그 장에서 대상 아닌 것을 짚은 장: ${bad.filter((r) => r.issues.some((i) => !i.target)).length}`, "");
    lines.push("| id | 화면 | 버그 | 결과 | 대상을 짚은 규칙 | 대상 아닌 지적 |", "|---|---|---|---|---|---|");
    for (const r of rs) lines.push(`| ${r.id} | ${r.name} | ${r.fault ?? "정상"}${r.injected && !r.injected.ok ? `(주입 실패: ${r.injected.why})` : ""} | ${r.fault ? (r.right ? "잡음" : r.caught ? "자리만 짚음" : "못 잡음") : "-"} | ${[...new Set(r.issues.filter((i) => i.target).map((i) => i.type))].join(", ")} | ${r.issues.filter((i) => !i.target).map((i) => `${i.type}: ${i.detail}`.replace(/\|/g, "\\|").slice(0, 90)).join("<br>")} |`);
    lines.push("");
  }
  const failed = rows.filter((r) => r.nav);
  if (failed.length) lines.push("## 화면에 못 간 장", "", ...failed.map((r) => `- ${r.id} ${r.name}: ${r.nav}`), "");
  return lines.join("\n");
}
