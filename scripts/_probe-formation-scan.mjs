// 동료 겹침 드문 실패 찾기 (2026-11-02) — [variants] 파티를 스테이지마다 심고 교전 정지 중 쌍별 겹침 · 칸 · 발 위치를 찍는다
//   node scripts/_probe-formation-scan.mjs [시작 스테이지] [끝 스테이지] [파티 csv]   (vite 5173)
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev";
const [s0, s1] = [Number(process.argv[2] ?? 36), Number(process.argv[3] ?? 46)];
const party = (process.argv[4] ?? "pyro,bronn,ember,mia").split(",");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
const inter = (a, b) => { const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)); const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)); return (x * y) / Math.min(a.w * a.h, b.w * b.h); };
const median = (arr) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] ?? 0; };
for (let stage = s0; stage <= s1; stage += 1) {
  const now = Date.now();
  const progress = { version: 5, level: 40, sharedCoins: 9999, dodgeBestStage: 50, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: party, partyCap: 4, redGems: 50, claimedRewards: ["dodge-tutorial"], pioneeredArea: 99 };
  const titans = { gold: 1e9, stage, bestStage: stage, heroes: Object.fromEntries(party.map((id) => [id, 60])), lastActiveAt: now };
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.reload(); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0" }).catch(() => {});
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
  await sleep(2000);
  const pairs = new Map(); const snaps = [];
  for (let t = 0; t < 50; t += 1) {
    const s = await page.evaluate(() => {
      const core = (el, frac, topCut = 0.12) => { const b = el.getBoundingClientRect(); const w = b.width * frac; return { x: b.x + (b.width - w) / 2, y: b.y + b.height * topCut, w, h: b.height * (1 - topCut) }; };
      for (let k = 0; k < 2; k += 1) { document.querySelector(".idle-claim")?.click(); [...document.querySelectorAll("button")].find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))?.click(); }
      const field = document.querySelector(".titans-field");
      const allies = [...document.querySelectorAll(".titans-allies .titan-ally-art")].map((e) => { const cs = getComputedStyle(e); return { id: (e.className.match(/ ally-([a-z_]+)/) || [])[1], slot: e.dataset.partySlot, approaching: e.classList.contains("is-approaching"), sep: cs.getPropertyValue("--sep-dx").trim(), mdx: cs.getPropertyValue("--party-melee-dx").trim().slice(0, 60), cx: cs.getPropertyValue("--party-combat-x").trim().slice(0, 60), ...core(e.querySelector(".ally-body") ?? e, 0.45) }; });
      const phase = (field?.className.match(/phase-([a-z-]+)/) || [])[1] || "";
      const st = window.__huntState?.() ?? {};
      return { phase, ko: !!field?.classList.contains("party-ko"), heroApproaching: !!document.querySelector(".titans-hero.is-approaching"), allies, stage: st.stage, kills: st.kills, cls: field?.className.slice(0, 160) };
    });
    const settled = s.phase === "combat" && !s.heroApproaching && !s.allies.some((a) => a.approaching) && !s.ko;
    if (settled) {
      for (let i = 0; i < s.allies.length; i += 1) for (let j = i + 1; j < s.allies.length; j += 1) { const k = `${s.allies[i].id}×${s.allies[j].id}`; if (!pairs.has(k)) pairs.set(k, []); pairs.get(k).push(inter(s.allies[i], s.allies[j])); }
      if (snaps.length < 1) snaps.push(s);
    }
    await sleep(120);
  }
  const worst = [...pairs].map(([k, a]) => [k, median(a), a.length]).sort((a, b) => b[1] - a[1])[0];
  const snap = snaps[0];
  console.log(`stage ${stage}: worst ${worst ? `${worst[0]} ${(worst[1] * 100).toFixed(0)}% (n ${worst[2]})` : "-"}${worst && worst[1] > 0.12 ? "  ◀" : ""}`);
  if (worst && worst[1] > 0.12 && snap) for (const a of snap.allies) console.log(`   ${a.id} slot ${a.slot} x ${Math.round(a.x)} y ${Math.round(a.y)} w ${Math.round(a.w)} sep[${a.sep}] mdx[${a.mdx}] cx[${a.cx}]`);
}
await browser.close();
