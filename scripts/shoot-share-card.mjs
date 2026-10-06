/**
 * 원정 기록 카드 촬영 (2026-10-06) — dev 서버(5173)에서 renderShareCard + shareCardExtras 로 카드 PNG 를 만든다.
 *   node scripts/shoot-share-card.mjs   → OUT(기본 store/screens)/share-card.png
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173";
const H = "mock-local-dev";
const OUT = process.env.OUT ?? "store/screens";
mkdirSync(OUT, { recursive: true });
const now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate((h, now) => {
  localStorage.clear();
  localStorage.setItem(`dodgebullets:progression:v1:${h}`, JSON.stringify({ version: 5, onboardingStep: 4, level: 34, exp: 1000, redGems: 820, sharedCoins: 120000, idleClaimedAt: now, updatedAt: now,
    partyIds: ["mia", "luna", "bronn", "sera"], partyCap: 4, equippedWeaponLevel: 9, bestForgeLevel: 9, equippedShoulder: "ogre", ownedShoulders: ["scout", "ogre"], activeTitle: null,
    dodgeBestStage: 18, dodgeStageSchema: 2, dodgeStars: Object.fromEntries(Array.from({ length: 18 }, (_, i) => [String(i), (i % 3) + 1])), dodgeBranches: { "1-T": 3, "1-E1": 2 },
    expeditionSkills: { fire: 8, water: 6, ice: 5, earth: 4, bolt: 3 }, expeditionLoadout: ["fire", "water", "ice", "bolt"], towerOpen: true, towerBestFloor: 12, titanBestStage: 22 }));
  localStorage.setItem(`dodgebullets:titans:${h}`, JSON.stringify({ stage: 22, bestStage: 22, gold: 1000, heroes: { mia: 31, luna: 18, bronn: 12, sera: 25 }, lastActiveAt: now }));
}, H, now);
await page.goto(BASE, { waitUntil: "networkidle0" });
const dataUrl = await page.evaluate(async (h) => {
  const { renderShareCard } = await import("/src/ui/shareCard.ts");
  const { shareCardExtras } = await import("/src/ui/shareCardData.ts");
  const { loadCharacterProgress } = await import("/src/progression/storage.ts");
  const { STAGE_BACKGROUNDS } = await import("/src/game/draw.ts");
  const p = await loadCharacterProgress(h);
  const extras = await shareCardExtras(h, p);
  const blob = await renderShareCard({ headline: "이끼 골렘의 언덕 클리어", subline: "새벽 초원 · 점수 48,210 · 원정 별 36/150", stars: 3, power: 128_450, titleName: "성문의 수호자", titleColor: "#fcd34d",
    backdrop: STAGE_BACKGROUNDS[0], accent: "#7dd3fc", ...extras });
  if (!blob) return null;
  const buf = await blob.arrayBuffer();
  let bin = ""; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 1) bin += String.fromCharCode(u[i]);
  return { b64: btoa(bin), allies: extras.allies?.length, items: extras.items?.length };
}, H);
if (!dataUrl) { console.log("FAIL no blob"); process.exit(1); }
writeFileSync(`${OUT}/share-card.png`, Buffer.from(dataUrl.b64, "base64"));
console.log("share card", JSON.stringify({ allies: dataUrl.allies, items: dataUrl.items }));
await browser.close();
