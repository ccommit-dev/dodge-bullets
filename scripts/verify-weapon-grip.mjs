// 무기 손잡이 · 공격 자세 · 탈착 · 무기 외형 — 실제 화면 검사 (2026-10-27, 사용자: "무기 탈착 애니메이션이 너무 어색해 실제 손으로 든 것처럼"
//   · /goal "창도 찌르지 않고 검처럼 휘둘러요 · 손잡이 위치 자동 검사 · 상점 칼날 외형 손잡이 기준").
//   node scripts/verify-weapon-grip.mjs   (vite 5173) · 캡처 art-gen/out/weapon-grip-*.png
// 기울기는 칸이 정한 목표(인라인 rotate)로 본다 — 공격 중엔 칸 사이 회전 전환(0.08초)이 늘 돌고 있어 계산된 값은 늘 두 칸 사이다
// 손잡이 점은 화면 그림이 아니라 계산된 변환으로 잰다: transform-origin · translate · rotate · scale · transform 을 CSS 순서대로 곱해
// 그림 안 손잡이(%)가 화면 어디에 오는지 구하고, 손 앵커(left/top %)와의 거리를 본다. 탈착은 Web Animations 를 멈춰 시점별로 잰다
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
const seed = async (progress) => {
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 1e6, stage: 8, bestStage: 8, totalKills: 100, heroes: { mia: 10, leon: 10 }, lastActiveAt: now }), [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }) });
  await page.reload({ waitUntil: "networkidle0" }); await sleep(1300);
  await page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
  await sleep(500);
};
const base = { version: 5, level: 20, redGems: 2000, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon"], partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 3, discoverySeeded: true, discovered: [], equippedWeaponLevel: 6, expeditionWeaponForge: { bow: 8, staff: 8, spear: 8 }, equippedWeaponKind: "sword" };

// 페이지 안에서 쓰는 측정 함수 — 손잡이 점의 화면 위치와 손 앵커의 거리(px), 기울기
await page.evaluateOnNewDocument(() => {
  window.__grip = (img) => {
    const len = (v, ref) => { // "-50%" · "22px" · "calc(-77% + 22px)" → px
      let sum = 0; for (const m of String(v).matchAll(/(-?\s*[\d.]+)(%|px)/g)) { const n = parseFloat(m[1].replace(/\s/g, "")); sum += m[2] === "%" ? (n / 100) * ref : n; }
      // calc 의 "- 3px" 꼴(빼기 뒤 공백)은 위 정규식이 부호를 붙여 읽는다
      return sum;
    };
    const cs = getComputedStyle(img), w = img.offsetWidth, h = img.offsetHeight;
    const [ox, oy] = cs.transformOrigin.split(" ").map(parseFloat);
    const tr = (img.style.translate || "").match(/-?[\d.]+%/g) ?? ["-50%", "-50%"];
    const g = [-parseFloat(tr[0]), -parseFloat(tr[1])];
    const m = new DOMMatrix().translateSelf(img.offsetLeft + ox, img.offsetTop + oy);
    if (cs.translate && cs.translate !== "none") { const parts = cs.translate.match(/calc\([^)]*\)|[^\s]+/g); m.translateSelf(len(parts[0], w), len(parts[1] ?? "0px", h)); }
    if (cs.rotate && cs.rotate !== "none") m.rotateSelf(parseFloat(cs.rotate.replace(/^z\s+/, "")));
    if (cs.scale && cs.scale !== "none") { const [sx, sy] = cs.scale.split(" ").map(Number); m.scaleSelf(sx, sy ?? sx); }
    if (cs.transform && cs.transform !== "none") m.multiplySelf(new DOMMatrix(cs.transform));
    m.translateSelf(-ox, -oy);
    const p = m.transformPoint(new DOMPoint((g[0] / 100) * w, (g[1] / 100) * h));
    const par = img.offsetParent;
    const ax = (parseFloat(img.style.left) / 100) * par.clientWidth, ay = (parseFloat(img.style.top) / 100) * par.clientHeight;
    const ang = (Math.atan2(m.b, m.a) * 180) / Math.PI;
    return { dx: p.x - ax, dy: p.y - ay, dist: Math.hypot(p.x - ax, p.y - ay), box: par.clientWidth, angle: ang, pose: img.dataset.pose ?? "", cast: img.classList.contains("weapon-cast") };
  };
});

await seed(base);
await page.evaluate(() => [...document.querySelectorAll(".titans-growth-tabs button")].find((b) => b.textContent.includes("장비 성장"))?.click()); await sleep(600);
const KINDS = ["sword", "spear", "bow", "staff"];

// ── 1. 무기 4종 — 대기 · 공격 모든 칸에서 손잡이가 손에 (상자 폭의 5% 안) · 공격 자세가 무기마다 다르다 ──
const summary = {};
for (let k = 0; k < 4; k += 1) {
  await page.evaluate((k) => [...document.querySelectorAll(".weapon-kind-chip")][k].click(), k); await sleep(700);
  const kind = await page.evaluate(() => (document.querySelector(".titans-hero .equipment-weapon-alt")?.className.match(/weapon-(sword|spear|bow|staff)/) ?? [])[1]);
  const s = { kind, n: 0, atk: 0, worst: 0, box: 0, poses: new Set(), angles: [], cast: 0 };
  for (let i = 0; i < 120; i += 1) {
    const r = await page.evaluate(() => { const img = document.querySelector(".titans-hero .equipment-weapon-alt"); if (!img || img.getAnimations().some((a) => /gear-grab/.test(a.animationName) && a.playState === "running")) return null; const atk = !!img.closest(".mode-attack"); const target = parseFloat((img.style.transform.match(/rotate\((-?[\d.]+)deg\)/) ?? [])[1]); return { ...window.__grip(img), atk, target }; });
    if (r) { s.n += 1; s.box = r.box; s.worst = Math.max(s.worst, r.dist); if (r.atk) { s.atk += 1; if (r.pose) s.poses.add(r.pose); if (Number.isFinite(r.target)) s.angles.push(Math.round(r.target)); if (r.cast) s.cast += 1; } }
    await sleep(45);
  }
  summary[kind] = s;
  ok(`${kind}: 대기 · 공격 ${s.n}칸 모두 손잡이가 손 앵커에 (최대 ${s.worst.toFixed(1)}px · 상자 ${s.box}px)`, s.n > 40 && s.worst <= s.box * 0.05, `공격 칸 ${s.atk}`);
  await page.evaluate(() => document.querySelector(".titans-hero")?.scrollIntoView({ block: "center" }));
  await page.screenshot({ path: `art-gen/out/weapon-grip-${kind}.png` });
}
const sw = summary.sword, sp = summary.spear, bw = summary.bow, st = summary.staff;
ok("공격 칸을 잡았다(무기마다 3칸 이상)", [sw, sp, bw, st].every((s) => s.atk >= 3), [sw, sp, bw, st].map((s) => `${s.kind}:${s.atk}`).join(" "));
ok("검은 시트 손뼈 그대로 휘두른다(자세 표 없음)", sw.poses.size === 0, [...sw.poses].join(","));
ok("창은 찌르기 — 공격 칸 기울기가 모두 수평 가까이(68~94°)", sp.poses.size >= 2 && sp.angles.length >= 3 && sp.angles.every((a) => a >= 68 && a <= 94), sp.angles.join(","));
ok("활은 세워 든 채 당긴다(−12~4°)", bw.poses.size >= 2 && bw.angles.length >= 3 && bw.angles.every((a) => a >= -12 && a <= 4), bw.angles.join(","));
ok("지팡이는 치켜들었다 내뻗는다(−34~40°) · 내뻗는 칸에 보석 빛", st.poses.size >= 2 && st.angles.length >= 3 && st.angles.every((a) => a >= -34 && a <= 40) && (st.cast > 0 || st.atk < 6), `${st.angles.join(",")} · 빛 ${st.cast}`);

// ── 2. 탈착 — 떼는 무기는 손에서 시작해 아래로 떨어지고, 끼우는 무기는 아래에서 올라와 손에서 멈춘다 ──
const swapAt = async (toIdx) => {
  await page.evaluate((k) => [...document.querySelectorAll(".weapon-kind-chip")][k].click(), toIdx);
  await page.waitForSelector(".titans-hero .equipment-weapon-ghost", { timeout: 2000 }).catch(() => null);
  return page.evaluate(() => {
    const ghost = document.querySelector(".titans-hero .equipment-weapon-ghost"), alt = document.querySelector(".titans-hero .equipment-weapon-alt.gear-attach");
    if (!ghost || !alt) return null;
    const at = (el, ms) => { const a = el.getAnimations().find((x) => /gear-(grab|drop)/.test(x.animationName)); if (!a) return null; a.pause(); a.currentTime = ms; const r = window.__grip(el); return { dx: +r.dx.toFixed(1), dy: +r.dy.toFixed(1), name: a.animationName }; };
    const res = { drop0: at(ghost, 0), drop500: at(ghost, 499), grab0: at(alt, 0), grab420: at(alt, 420), box: ghost.offsetParent.clientWidth };
    for (const el of [ghost, alt]) el.getAnimations().forEach((a) => a.play());
    return res;
  });
};
await sleep(1200);
const sv = await swapAt(1);
ok("떼는 무기: 손잡이가 손에서 출발(4px 안)", !!sv?.drop0 && Math.hypot(sv.drop0.dx, sv.drop0.dy) <= 4 && sv.drop0.name === "gear-drop", JSON.stringify(sv?.drop0));
ok("떼는 무기: 끝에는 손 아래로 떨어져 있다(30px 이상 아래)", !!sv?.drop500 && sv.drop500.dy >= 30, JSON.stringify(sv?.drop500));
ok("끼우는 무기: 손 아래(15px 이상)에서 올라온다", !!sv?.grab0 && sv.grab0.dy >= 15 && sv.grab0.name === "gear-grab", JSON.stringify(sv?.grab0));
ok("끼우는 무기: 끝에 손잡이가 손에(4px 안)", !!sv?.grab420 && Math.hypot(sv.grab420.dx, sv.grab420.dy) <= 4, JSON.stringify(sv?.grab420));
await sleep(900);

// ── 3. 상점 무기 외형 — 북 그림이 아니라 장착 무기의 색 바꾸기, 같은 손잡이 기준 ──
await seed({ ...base, equippedWeaponKind: "spear", ownedWeaponSkins: ["blade-crimson"], equippedWeaponSkin: "blade-crimson" });
const sk = await page.evaluate(() => {
  const img = document.querySelector(".titans-hero .equipment-weapon-alt.weapon-skin");
  return { img: !!img, src: img?.getAttribute("src") ?? "", hue: img ? getComputedStyle(img).getPropertyValue("--skin-hue").trim() : "", filter: img ? getComputedStyle(img).filter : "", drum: document.querySelectorAll(".titans-hero .premium-weapon-part, .titans-hero .has-blade-skin").length, grip: img ? window.__grip(img) : null };
});
ok("외형 장착: 손에 장착 무기(창) 그림 · 북 그림 없음", sk.img && /titans\/gear\/spear-\d\.png/.test(sk.src) && sk.drum === 0, `${sk.src} · 북 ${sk.drum}`);
ok("외형 장착: 색 돌리기(진홍 = 140deg) · 오라", sk.hue === "140deg" && /hue-rotate/.test(sk.filter) && /drop-shadow/.test(sk.filter), `${sk.hue} · ${sk.filter.slice(0, 60)}`);
ok("외형 장착: 손잡이가 손에", !!sk.grip && sk.grip.dist <= sk.grip.box * 0.05, sk.grip ? sk.grip.dist.toFixed(1) + "px" : "");
await page.evaluate(() => document.querySelector(".titans-hero")?.scrollIntoView({ block: "center" }));
await page.screenshot({ path: "art-gen/out/weapon-grip-skin.png" });
await clickText(".titans-bottom-nav button", "상점"); await sleep(700);
await clickText(".titans-premium-tabs button, button", "외형"); await sleep(600);
const shop = await page.evaluate(() => ({ thumbs: [...document.querySelectorAll(".blade-product .weapon-skin-thumb")].map((i) => i.getAttribute("src")), names: [...document.querySelectorAll(".blade-product strong")].map((s) => s.textContent), drum: document.querySelectorAll(".blade-product .premium-weapon-thumb").length }));
ok("상점 외형 3종: 썸네일 = 장착 무기(창) 그림 · 이름에 '북' 없음", shop.thumbs.length === 3 && shop.thumbs.every((s) => /spear-\d\.png/.test(s ?? "")) && shop.drum === 0 && shop.names.every((n) => !/북/.test(n)), `${shop.thumbs.length}장 · ${shop.names.join(" / ")}`);
await page.evaluate(() => document.querySelector(".blade-product")?.scrollIntoView({ block: "center" })); await sleep(200);
await page.screenshot({ path: "art-gen/out/weapon-grip-shop.png" });

ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
await browser.close();
process.exit(fails ? 1 : 0);
