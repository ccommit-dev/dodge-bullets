/**
 * 웹 어댑터 — 비버 키우기 웹 빌드를 연결 규격(protocol.mjs)으로 보이게 한다. 헤드리스 Chrome(puppeteer) 원격 제어.
 *
 * 게임 소스는 고치지 않는다: 상태는 저장(localStorage)에서, 누를 것은 DOM 에서 읽고, 터치는 좌표로 친다(el.click 은 덮인 단추를 숨긴다).
 * 격리 — 개발 서버 밖으로 나가는 요청은 막고(사건 "blocked" 로 기록), 내려받기는 거부, 새 창은 닫는다. 외부로 나가는 것이 없다.
 */
import { launchBrowser } from "../../scripts/launch-browser.mjs";
import { FAULTS } from "./faults.mjs";
import { presetEntries } from "./presets.mjs";
import { hash } from "./protocol.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 페이지 안에서 도는 관찰 — 누를 것 목록에 ref 를 달고, 판정에 쓸 화면 신호를 같이 모은다 */
function observeInPage(scopePrint) {
  const vw = innerWidth, vh = innerHeight;
  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim().replace(/[0-9][0-9,.]*/g, "#").slice(0, 40);
  const SEM = "button,[role=button],a[href],input:not([type=hidden]),select,textarea,summary";
  const sem = new Set(document.querySelectorAll(SEM));
  const cand = new Set(sem);
  const all = document.body ? document.body.querySelectorAll("*") : [];
  if (all.length < 8000) {
    for (const el of all) {
      if (cand.has(el) || el.closest(SEM)) continue;
      if (getComputedStyle(el).cursor === "pointer" && !(el.parentElement && getComputedStyle(el.parentElement).cursor === "pointer")) cand.add(el);
    }
  }
  const items = [], seen = {}, offside = [];
  let n = 0, covered = 0;
  // 지난 관찰의 손잡이를 지운다 — 남겨 두면 같은 r7 이 두 요소에 붙어, 누를 때 예전(덮인) 요소를 집는다
  for (const old of document.querySelectorAll("[data-agent-ref]")) old.removeAttribute("data-agent-ref");
  // 모달이 떠 있으면 화면 밖(스크롤해야 보이는) 후보는 그 모달 안의 것만 — 뒤에 깔린 판은 눌러 봐야 덮여 있다
  const mid = document.elementFromPoint(vw / 2, vh / 2);
  const modal = mid && mid.closest("[role=dialog],[aria-modal=true],[class*=modal],[class*=overlay],[class*=backdrop],[class*=sheet]");
  for (const el of cand) {
    const r = el.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || Number(cs.opacity) < 0.05 || cs.pointerEvents === "none" || cs.display === "none") continue;
    const inView = r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
    if (inView) {
      const cx = Math.min(vw - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(vh - 1, Math.max(0, r.top + r.height / 2));
      const hit = document.elementFromPoint(cx, cy);
      if (!(hit && (hit === el || el.contains(hit)))) { covered += 1; continue; }
      if (r.right > vw + 2 || r.left < -2) offside.push(`${(el.innerText || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 20)} (${Math.round(r.left)}~${Math.round(r.right)}px / 화면 ${vw}px)`);
    } else if (modal ? !modal.contains(el) : r.top > vh * 3) continue;
    const raw = el.getAttribute("aria-label") || el.getAttribute("title") || (el.innerText || "").trim() || el.value || el.querySelector("img[alt]")?.alt || "";
    let label = String(raw).replace(/\s+/g, " ").trim().slice(0, 40);
    if (!label) label = `<${el.tagName.toLowerCase()}${typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}>`;
    const base = norm(label);
    seen[base] = (seen[base] || 0) + 1;
    const key = seen[base] > 1 ? `${base}~${seen[base]}` : base;
    n += 1;
    el.dataset.agentRef = `r${n}`;
    items.push({ ref: `r${n}`, key, label, role: sem.has(el) ? el.tagName.toLowerCase() : "pointer", x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height), disabled: !!el.disabled || el.getAttribute("aria-disabled") === "true", inView });
  }
  const titleEl = [...document.querySelectorAll("[role=dialog] h2,[class*=modal] h2,[class*=modal] h3,h1,h2")].find((e) => e.getBoundingClientRect().width > 0);
  const text = document.body ? document.body.innerText || "" : "";
  const bad = [...new Set((text.match(/[^\n]{0,12}(?:\bNaN\b|\bundefined\b|\bInfinity\b|\[object Object\])[^\n]{0,12}/g) || []).map((s) => s.trim()))].slice(0, 5);
  const ls = {};
  for (let i = 0; i < localStorage.length; i += 1) { const k = localStorage.key(i); ls[k] = localStorage.getItem(k); }
  const scopeEl = document.querySelector("[data-agent-scope]");
  // 큰 캔버스가 떠 있으면(비트 · 원정 전투) 누른 결과가 DOM 에 안 보인다 — 무반응 판정을 쉰다
  const canvas = [...document.querySelectorAll("canvas")].some((c) => { const r = c.getBoundingClientRect(); return r.width * r.height > vw * vh * 0.25 && getComputedStyle(c).visibility !== "hidden"; });
  // 토스트 · 알림 — 눌러서 안내 한 줄만 뜨는 단추도 반응한 것이다
  const toasts = [...document.querySelectorAll("[class*=toast],[class*=snack],[class*=growth-message],[role=status],[role=alert]")].filter((e) => e.getBoundingClientRect().height > 0);
  // 같은 안내가 다시 떠도 새로 붙은 요소면 반응 — 누르기 직전에 있던 토스트에는 표시를 달아 둔다(boxInPage)
  const toast = toasts.map((e) => (e.hasAttribute("data-agent-seen") ? "" : "new:") + (e.innerText || "").trim()).join("|").slice(0, 200);
  return {
    items, covered, offside, bad, ls, canvas, toast,
    scope: scopeEl ? scopePrint(scopeEl) : "gone",
    title: titleEl ? titleEl.innerText.trim().slice(0, 40) : "",
    text: text.slice(0, 4000),
    overflowX: Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0) > vw + 1,
    blank: text.trim().length < 3 && !document.querySelector("canvas,img,svg"),
    url: location.href,
  };
}

/** 누르기 전 — 화면 안으로 끌어오고, 가운데가 덮였는지 보고, 둘레(무반응 판정 범위)에 표시를 단다 */
function boxInPage(ref, scopePrint) {
  const el = document.querySelector(`[data-agent-ref="${ref}"]`);
  if (!el) return null;
  const r0 = el.getBoundingClientRect();
  if (r0.top < 0 || r0.bottom > innerHeight) el.scrollIntoView({ block: "center" });
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null; // 숨겨졌거나 접힘 — 누르면 (0,0) 같은 엉뚱한 곳을 친다
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const hit = document.elementFromPoint(x, y);
  for (const old of document.querySelectorAll("[data-agent-scope]")) old.removeAttribute("data-agent-scope");
  for (const t of document.querySelectorAll("[class*=toast],[class*=snack],[class*=growth-message],[role=status],[role=alert]")) t.setAttribute("data-agent-seen", "1");
  // 판정 범위 — 단추가 든 모달 · 판, 없으면 단추에서 위로 작은 묶음(자손 80개 이하)까지. 사냥터 전체를 잡으면 전투 글자가 늘 바뀌어 무반응을 못 본다
  let scope = el.closest("[role=dialog],[aria-modal=true],[class*=modal],[class*=sheet],[class*=panel],[class*=popup]");
  if (!scope || scope.querySelectorAll("*").length > 600) {
    scope = el;
    for (let p = el.parentElement, k = 0; p && k < 3 && p.querySelectorAll("*").length <= 80; p = p.parentElement, k += 1) scope = p;
  }
  scope.setAttribute("data-agent-scope", "1");
  // 이미 고른 탭(on · active · aria-selected)을 다시 누르면 아무 일이 없는 게 정상 — 무반응 판정에서 뺀다
  const t = el.closest("[role=tab],button") || el;
  const active = t.matches("[aria-selected=true],[aria-current]:not([aria-current=false])") || /(^|\s)(on|active|is-active|selected|is-selected|current|is-current)(\s|$)/.test(typeof t.className === "string" ? t.className : "");
  const covered = !(hit && (hit === el || el.contains(hit)));
  const by = covered && hit ? `${hit.tagName.toLowerCase()}${typeof hit.className === "string" && hit.className ? "." + hit.className.trim().split(/\s+/).slice(0, 2).join(".") : ""} "${(hit.innerText || "").trim().slice(0, 16)}"` : "";
  return { x, y, covered, by, scope: scopePrint(scope), active };
}

/** 누른 단추 둘레(모달 · 판 · 부모 둘)의 글자 · 클래스 · 상태 — 숫자까지 본다(쪽 넘김 · 선택 표시를 반응으로 친다) */
function scopePrint(el) {
  let s = el.innerText || "";
  for (const d of [el, ...el.querySelectorAll("*")].slice(0, 400)) s += `|${typeof d.className === "string" ? d.className : ""}${d.getAttribute("aria-pressed") ?? ""}${d.getAttribute("aria-selected") ?? ""}${d.getAttribute("aria-expanded") ?? ""}${d.checked ? "c" : ""}${d.disabled ? "d" : ""}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

/** 저장(localStorage) → 판정 · 검증에 쓰는 게임 상태 JSON */
export function parseState(ls) {
  const get = (prefix) => { const k = Object.keys(ls).find((x) => x.startsWith(prefix)); try { return k ? JSON.parse(ls[k]) : null; } catch { return { _broken: ls[k].slice(0, 80) }; } };
  const p = get("dodgebullets:progression:v1:") || {};
  const t = get("dodgebullets:titans:") || {};
  const errlog = get("dodgebullets:errorlog:v1");
  const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
  return {
    progression: pick(p, ["level", "exp", "redGems", "sharedCoins", "titanBestStage", "attendanceStreak", "partyCap", "towerTickets", "onboardingStep"]),
    titans: pick(t, ["stage", "bestStage", "gold", "rebirths"]),
    settings: { sound: ls["dodge-bullets:soundEnabled"] ?? null },
    errorLog: Array.isArray(errlog) ? errlog.length : Array.isArray(errlog?.items) ? errlog.items.length : 0,
    _raw: { progression: p, titans: t },
  };
}

/**
 * @param {{ base?: string, faults?: string[], clock?: boolean, width?: number, height?: number }} opt
 * @returns {Promise<import("./protocol.mjs").GameBridge & { page: any }>}
 */
export async function openWebGame(opt = {}) {
  const base = opt.base ?? process.env.AGENT_BASE ?? "http://localhost:5173";
  const origin = new URL(base).origin;
  const faults = opt.faults ?? [];
  const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
  const page = await browser.newPage();
  await page.setViewport({ width: opt.width ?? 390, height: opt.height ?? 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  page.setDefaultTimeout(30000);

  const events = [];
  const push = (kind, text) => events.push({ kind, text: String(text).slice(0, 300), at: Date.now() });
  page.on("pageerror", (e) => push("pageerror", e.message));
  page.on("console", async (m) => {
    if (m.type() !== "error" || /^Failed to load resource/.test(m.text())) return;
    // React 경고는 "%s" 틀 + 인자로 온다 — 인자를 채워 읽을 수 있게, 나온 파일:줄을 붙인다
    const args = await Promise.all(m.args().map((a) => a.jsonValue().catch(() => "?")));
    let i = 1;
    const text = typeof args[0] === "string" ? args[0].replace(/%[sdoO]/g, () => String(args[i++] ?? "").slice(0, 60)) : m.text();
    const loc = m.location()?.url ? ` @${m.location().url.replace(origin, "").split("?")[0]}:${m.location().lineNumber ?? ""}` : "";
    push("console", text.replace(/\s+/g, " ").trim() + loc);
  });
  page.on("response", (r) => { const u = r.url(); if (u.startsWith(origin) && r.status() >= 400) push("http", `${r.status()} ${u.slice(origin.length)}`); });
  page.on("dialog", (d) => { push("dialog", `${d.type()}: ${d.message()}`); d.dismiss().catch(() => {}); });
  page.on("framenavigated", (f) => { if (f === page.mainFrame()) push("navigate", f.url()); });
  browser.on("targetcreated", async (t) => {
    if (t.type() !== "page") return;
    const p = await t.page().catch(() => null);
    if (p && p !== page) { push("popup", t.url()); p.close().catch(() => {}); }
  });
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const u = req.url();
    if (u.startsWith(origin) || u.startsWith("data:") || u.startsWith("blob:")) return req.continue().catch(() => {});
    push("blocked", u.slice(0, 120));
    req.abort().catch(() => {});
  });
  const cdp = await page.createCDPSession();
  await cdp.send("Browser.setDownloadBehavior", { behavior: "deny" }).catch(() => {});
  if (opt.clock) {
    // 시계 — Date 를 감싸 앞으로 감는다(방치 보상 · 쿨타임). 감은 양은 새로 고침 뒤에도 sessionStorage 로 이어진다
    await page.evaluateOnNewDocument(() => {
      const RD = Date;
      let off = Number(sessionStorage.getItem("__agentClock") || 0);
      function D(...a) { if (!new.target) return new RD(RD.now() + off).toString(); return a.length ? new RD(...a) : new RD(RD.now() + off); }
      D.prototype = RD.prototype; D.now = () => RD.now() + off; D.parse = RD.parse; D.UTC = RD.UTC;
      window.Date = D;
      window.__agentAdvance = (ms) => { off += ms; sessionStorage.setItem("__agentClock", String(off)); };
    });
  }
  for (const f of faults) {
    if (!FAULTS[f]) throw new Error(`없는 주입 버그: ${f}`);
    if (FAULTS[f].init) await page.evaluateOnNewDocument(FAULTS[f].init);
  }

  let lastRefs = new Map();
  const game = {
    page,
    base,
    async reset(preset = "mid") {
      let entries = presetEntries(preset);
      for (const f of faults) if (FAULTS[f].preset) entries = FAULTS[f].preset(entries);
      // 저장 심기는 게임 없는 페이지에서 — 떠 있는 게임이 옛 저장을 다시 써 심은 값을 덮는다(verify-settings 와 같은 이유)
      await page.goto(`${base}/favicon.png`, { waitUntil: "domcontentloaded" });
      await page.evaluate((entries) => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v); }, entries);
      await sleep(400); // 이미지 페이지를 열면 Chrome 이 /favicon.ico 를 찾는다 — 그 404 가 다 온 뒤에 지운다(게임은 favicon.png 링크가 있다)
      events.length = 0; // 심기 페이지의 사건(favicon.ico 404 등)은 게임 것이 아니다 — 부팅부터 센다
      await page.goto(base, { waitUntil: "networkidle0", timeout: 90000 }).catch(() => push("navigate", "부팅 대기 시간 초과(networkidle)"));
      await sleep(2500);
    },
    async observe() {
      const o = await page.evaluate(`(${observeInPage})(${scopePrint})`);
      lastRefs = new Map(o.items.map((c) => [c.ref, c]));
      const semKeys = [...new Set(o.items.filter((c) => c.role !== "pointer" && c.inView).map((c) => c.key.replace(/~\d+$/, "")))].sort();
      return {
        screen: hash(semKeys.join("|")),
        title: o.title,
        clickables: o.items,
        state: parseState(o.ls),
        text: o.text,
        url: o.url,
        signals: { covered: o.covered, offside: o.offside, bad: o.bad, overflowX: o.overflowX, blank: o.blank, canvas: o.canvas, scope: o.scope, toast: o.toast },
        at: Date.now(),
      };
    },
    async act(a) {
      if (a.type === "wait") { await sleep(a.ms); return { ok: true }; }
      if (a.type === "key") { await page.keyboard.press(a.key); return { ok: true }; }
      if (a.type === "reload") { await page.reload({ waitUntil: "networkidle0" }).catch(() => {}); await sleep(2000); return { ok: true }; }
      if (a.type !== "tap") return { ok: false, why: `모르는 행동 ${a.type}` };
      // ref 가 사라졌으면(다시 그려짐) 같은 이름의 단추를 새로 찾는다
      let ref = a.ref && (await page.$(`[data-agent-ref="${a.ref}"]`)) ? a.ref : null;
      if (!ref && a.key) {
        const o = await game.observe();
        ref = o.clickables.find((c) => c.key === a.key)?.ref ?? o.clickables.find((c) => c.key.replace(/~\d+$/, "") === a.key.replace(/~\d+$/, ""))?.ref ?? null;
      }
      if (!ref) return { ok: false, why: "단추를 찾지 못함" };
      let box = await page.evaluate(`(${boxInPage})(${JSON.stringify(ref)}, ${scopePrint})`);
      if ((!box || box.covered) && a.key) {
        // 그사이 다시 그려졌거나 잠깐 덮였을 수 있다 — 한 번 다시 보고 같은 이름(보이고 안 덮인 것)으로
        await sleep(400);
        const o = await game.observe();
        const again = o.clickables.find((c) => c.key === a.key && c.inView) ?? o.clickables.find((c) => c.key.replace(/~\d+$/, "") === a.key.replace(/~\d+$/, "") && c.inView);
        if (again) box = await page.evaluate(`(${boxInPage})(${JSON.stringify(again.ref)}, ${scopePrint})`);
      }
      if (!box) return { ok: false, why: "단추가 사라짐" };
      if (box.covered) return { ok: false, why: `다른 것에 덮임: ${box.by}` };
      await page.touchscreen.tap(box.x, box.y);
      return { ok: true, x: Math.round(box.x), y: Math.round(box.y), scopeBefore: box.scope, active: box.active };
    },
    async advance(ms) { await page.evaluate((ms) => window.__agentAdvance?.(ms), ms); },
    drainEvents() { return events.splice(0, events.length); },
    async screenshot(file) { await page.screenshot({ path: file, type: "jpeg", quality: 60 }); return file; },
    async close() { await browser.close().catch(() => {}); },
    refInfo: (ref) => lastRefs.get(ref),
  };
  return game;
}
