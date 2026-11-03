/**
 * 소리를 귀 대신 신호로 (2026-11-03, 아쉬운 점 "소리는 귀로 확인 못 함 · 슬라이더는 음량 수치로만") — 게임이 실제로 내보내는 파형을 잰다
 *   node scripts/verify-audio-signal.mjs   (vite 5173)
 * AudioNode.connect 를 감싸 destination 으로 가는 신호에 분석기를 달고 피크 · RMS 를 읽는다(저장 값이 아니라 스피커로 가는 값).
 * ① 음악: 슬라이더 100 → 50 → 0 에 실제 출력이 줄고 0 이면 무음 · 다시 올리면 돌아온다
 * ② 효과음: 슬라이더 100 → 0 에 실제 출력이 줄고 0 이면 무음, 음악은 그대로
 * ③ 깨짐: 전투 중 합친 소리의 피크가 1.0 을 넘지 않는다(넘으면 찌그러진다)
 * ④ 균형: 효과음 피크가 음악 RMS 보다 들릴 만큼 크다(묻히지 않는다) · 터무니없이 크지 않다
 * 음색 · 취향은 여전히 사람 귀 몫이다.
 */
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu", "--autoplay-policy=user-gesture-required"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 160)));
await page.evaluateOnNewDocument(() => {
  const taps = new Map();   // AudioContext → { an, music, peak, rmsSum, n }
  const tapFor = (ctx) => { if (!taps.has(ctx)) { const an = ctx.createAnalyser(); an.fftSize = 4096; taps.set(ctx, { an, buf: new Float32Array(4096), music: false, peak: 0, rmsMax: 0, rmsSum: 0, n: 0 }); } return taps.get(ctx); };
  const conn = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (dest instanceof AudioDestinationNode) { try { conn.call(this, tapFor(this.context).an); } catch { /* 이미 연결 */ } }
    return conn.call(this, dest, ...rest);
  };
  const mes = AudioContext.prototype.createMediaElementSource;
  AudioContext.prototype.createMediaElementSource = function (el) { tapFor(this).music = true; return mes.call(this, el); };
  setInterval(() => { for (const t of taps.values()) { t.an.getFloatTimeDomainData(t.buf); let p = 0, s = 0; for (const v of t.buf) { const a = Math.abs(v); if (a > p) p = a; s += v * v; } const r = Math.sqrt(s / t.buf.length); t.peak = Math.max(t.peak, p); t.rmsMax = Math.max(t.rmsMax, r); t.rmsSum += r; t.n += 1; } }, 40);
  window.__tapReset = () => { for (const t of taps.values()) { t.peak = 0; t.rmsMax = 0; t.rmsSum = 0; t.n = 0; } };
  window.__tapRead = () => [...taps.values()].map((t) => ({ music: t.music, peak: t.peak, rmsMax: t.rmsMax, rmsAvg: t.n ? t.rmsSum / t.n : 0, state: t.an.context.state }));
});
await page.goto(BASE, { waitUntil: "networkidle0" });
const progress = { version: 5, onboardingStep: 4, level: 30, redGems: 500, sharedCoins: 100000, pioneeredArea: 3, titanBestStage: 12, idleClaimedAt: now, updatedAt: now, partyIds: ["mia", "leon", "sera", "garen"], partyCap: 4, sessionCount: 9, claimedRewards: ["dodge-tutorial", "welcome-gift"] };
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.reload(); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 1e6, stage: 12, bestStage: 12, heroes: { mia: 20, leon: 15, sera: 12, garen: 12 }, lastActiveAt: now }), "dodge-bullets:soundEnabled": "1",
  [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
}).catch(() => {});
await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
await sleep(2200);
// 진짜 터치 — 오디오 잠금 풀기
await page.touchscreen.tap(195, 420); await sleep(300);
await page.evaluate(() => { document.querySelector(".idle-claim")?.click(); [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))?.click(); });
await sleep(2500);   // 음악 페이드 인(0.6초) · 전투 시작

const measure = async (ms) => { await page.evaluate(() => window.__tapReset()); await sleep(ms); return page.evaluate(() => window.__tapRead()); };
const pick = (rows, music) => rows.filter((r) => r.music === music).reduce((a, r) => ({ peak: Math.max(a.peak, r.peak), rmsAvg: Math.max(a.rmsAvg, r.rmsAvg), rmsMax: Math.max(a.rmsMax, r.rmsMax) }), { peak: 0, rmsAvg: 0, rmsMax: 0 });
const f = (x) => x.toFixed(4);
// 슬라이더는 설정 메뉴에 있다 — 저장값 + 앱 이벤트로 바꾼다(화면 조작은 verify-volume 이 본다)
const setVol = (which, v) => page.evaluate(({ which, v }) => {
  localStorage.setItem(`dodge-bullets:volume:${which}`, String(v));
  window.dispatchEvent(new Event("dodge-volume-change"));
}, { which, v });

const base = await measure(4000);
const rows0 = await page.evaluate(() => window.__tapRead());
ok("오디오 컨텍스트가 돈다(음악 · 효과음)", rows0.some((r) => r.music && r.state === "running") && rows0.some((r) => !r.music && r.state === "running"), JSON.stringify(rows0.map((r) => [r.music ? "음악" : "효과음", r.state])));
const m100 = pick(base, true), s100 = pick(base, false);
ok("음악이 실제로 나온다(RMS > 0.005)", m100.rmsAvg > 0.005, `RMS ${f(m100.rmsAvg)} · 피크 ${f(m100.peak)}`);
ok("전투 효과음이 실제로 나온다(피크 > 0.02)", s100.peak > 0.02, `피크 ${f(s100.peak)}`);
ok("깨짐 없음: 음악 · 효과음 피크 ≤ 1.0", m100.peak <= 1 && s100.peak <= 1, `음악 ${f(m100.peak)} · 효과음 ${f(s100.peak)}`);
ok("합친 피크도 깨지지 않는다(음악 + 효과음 ≤ 1.0)", m100.peak + s100.peak <= 1, `합 ${f(m100.peak + s100.peak)}`);
ok("균형: 효과음 피크가 음악 RMS 의 1.5배 이상(묻히지 않음) · 30배 이하(튀지 않음)", s100.peak >= m100.rmsAvg * 1.5 && s100.peak <= m100.rmsAvg * 30, `효과음 피크 ÷ 음악 RMS = ${(s100.peak / Math.max(1e-6, m100.rmsAvg)).toFixed(1)}`);

{
  await setVol("bgm", 0.5); await sleep(700); const m50 = pick(await measure(2500), true);
  await setVol("bgm", 0); await sleep(700); const m0 = pick(await measure(1500), true);
  ok("음악 슬라이더: 100 > 50 > 0 · 실제 출력이 줄고 0 이면 무음", m100.rmsAvg > m50.rmsAvg && m50.rmsAvg > m0.rmsAvg && m0.peak < 0.002, `RMS ${f(m100.rmsAvg)} → ${f(m50.rmsAvg)} → ${f(m0.rmsAvg)} · 0 피크 ${f(m0.peak)}`);
  const sfxWithMusicOff = pick(await measure(2500), false);
  ok("음악을 꺼도 효과음은 그대로", sfxWithMusicOff.peak > 0.02, `피크 ${f(sfxWithMusicOff.peak)}`);
  await setVol("sfx", 0); await sleep(300); const s0 = pick(await measure(2500), false);
  ok("효과음 슬라이더 0: 실제 출력 무음", s0.peak < 0.002, `피크 ${f(s0.peak)}`);
  await setVol("bgm", 1); await setVol("sfx", 1); await sleep(900); let back = await measure(2500);
  // 재는 동안 타격이 없으면(스테이지 넘어가는 중) 효과음이 0 이다 — 전체 검사에서 한 번 이렇게 실패했다. 소리가 안 돌아온 것과 가르려고 두 번 더 잰다
  for (let k = 0; k < 2 && pick(back, false).peak <= 0.02; k += 1) back = await measure(2500);
  ok("다시 올리면 둘 다 돌아온다", pick(back, true).rmsAvg > 0.005 && pick(back, false).peak > 0.02, `음악 ${f(pick(back, true).rmsAvg)} · 효과음 ${f(pick(back, false).peak)}`);
}
// ⑤ 비트 곡 — 파일이 -3.6 ~ -10 LUFS 로 크고 +5.9 dB 까지 넘었다. 재생 게인으로 맞춘 뒤 실제 출력이 깨지지 않고 곡끼리 비슷한지 · 음악 슬라이더가 먹는지
const beatRow = async (id) => {
  await page.reload({ waitUntil: "networkidle0" }); await sleep(1800);
  await page.touchscreen.tap(195, 420); await sleep(300);
  await page.evaluate(() => { document.querySelector(".idle-claim")?.click(); [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))?.click(); });
  const tap = async (sel, text = "") => { const pt = await page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.includes(text)); if (!el) return null; el.scrollIntoView({ block: "center" }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, { sel, text }); if (pt) await page.touchscreen.tap(pt.x, pt.y); return !!pt; };
  await tap(".titans-bottom-nav button", "모험"); await sleep(500);
  await tap(".nav-popup-grid button", "비트 수련"); await sleep(1800);
  await tap(`.beat-song-chip[data-track="${id}"]`); await sleep(2500);
  const rows = await measure(5000);
  return { ...pick(rows, true), session: await page.evaluate(() => { const s = window.__beatSession; return s ? { track: s.track?.id, vol: s.backingAudio?.volume, paused: s.backingAudio?.paused } : null; }) };
};
await setVol("bgm", 1); await setVol("sfx", 1);
const loud = await beatRow("azure-sky"), quiet = await beatRow("black-city-beat");
// 곡 첫머리 몇 초의 RMS 는 인트로에 좌우된다(black-city-beat 는 조용히 시작) — 재생 중 비교는 피크로, 곡 전체 음량은 아래 표 계산으로 본다
const dbGap = Math.abs(20 * Math.log10(loud.peak / Math.max(1e-6, quiet.peak)));
ok("비트 곡이 실제로 나오고 게인 경로로 간다(요소 음량 1)", loud.rmsAvg > 0.01 && quiet.rmsAvg > 0.01 && loud.session?.vol === 1, JSON.stringify({ loud: loud.session, rms: [f(loud.rmsAvg), f(quiet.rmsAvg)] }));
ok("비트 곡이 깨지지 않는다(가장 큰 azure-sky 피크 ≤ 1.0 · 파일 그대로면 +5.4 dB)", loud.peak <= 1 && quiet.peak <= 1, `${f(loud.peak)} · ${f(quiet.peak)}`);
ok("곡끼리 피크 차이 6 dB 이내(azure-sky · black-city-beat — 파일 그대로면 3.1 dB 에 더해 전체 음량이 6.4 LU 차이)", dbGap <= 6, `${dbGap.toFixed(1)} dB`);
await setVol("bgm", 0); const silent = await beatRow("cherry-pop"); await setVol("bgm", 1);
ok("배경 음악 슬라이더 0 이면 비트 곡도 무음(곡은 그대로 시작 — 탭 없이 두면 판이 끝날 수 있어 멈춤 여부는 안 본다)", silent.peak < 0.002 && silent.session?.track === "cherry-pop", `피크 ${f(silent.peak)} · ${JSON.stringify(silent.session)}`);
// ⑥ 채보 곡이 음량 표에 다 있다 — 새 곡을 넣고 빠뜨리면 0.72 로 나가 다시 튄다
{
  const { readFileSync } = await import("node:fs");
  const files = [...readFileSync("src/beat/tracks.ts", "utf8").matchAll(/audioFile:\s*"([^"]+)"/g)].map((m) => m[1]);
  const table = readFileSync("src/beat/trackGain.ts", "utf8");
  const missing = [...new Set(files)].filter((x) => !table.includes(`"${x}"`));
  // 표대로 게인을 걸면 곡 전체 음량이 모이고 피크가 -1 dB 아래 — 숫자는 audit-audio-files 실측값
  const rows = [...table.matchAll(/"([^"]+\.(?:mp3|m4a))": \[(-?[\d.]+), (-?[\d.]+)\]/g)].map((m) => ({ f: m[1], lufs: Number(m[2]), peak: Number(m[3]) }));
  const after = rows.map((r) => { const db = Math.min(0, -14 - r.lufs, -1 - r.peak); return { lufs: r.lufs + db, peak: r.peak + db }; });
  const spread = Math.max(...after.map((r) => r.lufs)) - Math.min(...after.map((r) => r.lufs));
  const before = Math.max(...rows.map((r) => r.lufs)) - Math.min(...rows.map((r) => r.lufs));
  ok("표대로면 곡 전체 음량 폭 3 LU 이내 · 피크 -1 dB 아래", rows.length >= 16 && spread <= 3 && after.every((r) => r.peak <= -1 + 1e-9), `폭 ${before.toFixed(1)} → ${spread.toFixed(1)} LU · 최고 피크 ${Math.max(...after.map((r) => r.peak)).toFixed(1)} dB`);
  ok("채보 곡이 모두 음량 표(src/beat/trackGain.ts)에 있다", files.length > 0 && missing.length === 0, missing.join(", ") || `${new Set(files).size}곡`);
}
ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
for (const [s, n, d] of results) console.log(`${s} ${n}${d ? ` — ${d}` : ""}`);
const fail = results.filter((r) => r[0] === "FAIL").length;
console.log(fail ? `${fail} FAIL` : "ALL PASS");
process.exit(fail ? 1 : 0);
