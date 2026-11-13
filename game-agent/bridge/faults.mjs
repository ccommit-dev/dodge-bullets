/**
 * 화면 버그 10종 — 지금 떠 있는 화면에 바로 끼워 넣는다(화면 벤치 run.mjs screens). 11-10 비버 화면 20장 시험의 주입을 다시 지은 것(원본 스크립트는 임시 폴더와 함께 사라짐).
 * 대상은 시드로 고른다 — 화면마다 · 시드마다 다른 요소에 넣어 "규칙을 만든 장"이 아닌 장에서도 잴 수 있게. 대상에는 data-fault-target 을 단다(판정은 이 표시를 보지 않는다).
 * 넣는 방식은 버그가 실제로 생기는 모양을 따른다: 같은 색 글자 · 밀려난 단추 · 틀린 그림 경로 · 기울어진 판 · 숨김 상자 안 글자 · 떠다니는 그림 · NaN · 높이 0 목록 · 남은 어둠막 · 줄 높이 붕괴.
 * @returns {{ ok: boolean, why?: string, targets?: string[], match?: string[] }}
 */
export function applyScreenFault(kind, seed) {
  const vw = innerWidth, vh = innerHeight;
  let s = seed >>> 0 || 1;
  const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (arr, k) => { const a = [...arr], o = []; while (a.length && o.length < k) o.push(a.splice(Math.floor(rnd() * a.length), 1)[0]); return o; };
  const NOPE = ".titans-field, canvas, [aria-hidden=true], .sr-only, [data-agent-ignore]";
  const inView = (r) => r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
  const shown = (el) => { const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.05) return false; const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1 && inView(r); };
  // 맨 위 층에서 보이는 것만 — 모달 뒤에 깔린 판에 넣으면 화면에 안 보이는 "버그"가 된다
  const onTop = (el) => { const r = el.getBoundingClientRect(); const h = document.elementFromPoint(Math.min(vw - 1, Math.max(0, r.left + r.width / 2)), Math.min(vh - 1, Math.max(0, r.top + r.height / 2))); return !!h && (h === el || el.contains(h) || h.contains(el)); };
  const desc = (el) => `${el.tagName.toLowerCase()}${typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/)[0] : ""} "${(el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 16)}"`;
  const mark = (el) => { el.setAttribute("data-fault-target", kind); return el; };
  const textLeaves = () => [...document.body.querySelectorAll("*")].filter((el) => !el.closest(NOPE) && [...el.childNodes].some((c) => c.nodeType === 3 && c.nodeValue.trim().length >= 1) && shown(el) && parseFloat(getComputedStyle(el).fontSize) >= 10 && onTop(el));
  // 판 후보 — 화면 안에서 보이는 높이로 잰다(아래 메뉴 밑까지 이어지는 판도 넣을 수 있게)
  const boxes = (minW, minH, maxH) => [...document.body.querySelectorAll("div,section,ul,ol,nav,article")].filter((el) => { if (el.closest(NOPE) || !shown(el)) return false; const r = el.getBoundingClientRect(), h = Math.min(r.bottom, vh) - Math.max(r.top, 0); return r.width >= minW && h >= minH && h <= maxH && r.top >= 0 && r.top < vh * 0.85 && onTop(el); });
  const fail = (why) => ({ ok: false, why });
  const done = (els, extra = {}) => ({ ok: true, targets: els.map(desc), ...extra });

  if (kind === "invisible") {
    // 글자색이 바탕색과 같아짐(테마 · 판 색을 바꾸고 글자색을 안 바꾼 버그 — 출석판 1.31:1 과 같은 모양)
    const bgColor = (el) => { for (let q = el; q && q !== document.documentElement; q = q.parentElement) { const c = getComputedStyle(q).backgroundColor; const m = c.match(/rgba?\(([^)]+)\)/); if (m && (m[1].split(",")[3] === undefined || parseFloat(m[1].split(",")[3]) >= 0.85)) return c; } return "rgb(255, 243, 214)"; };
    const ts = pick(textLeaves(), 5);
    if (!ts.length) return fail("글자 없음");
    for (const el of ts) { el.style.setProperty("color", bgColor(el), "important"); mark(el); }
    return done(ts);
  }
  if (kind === "offscreen") {
    // 단추 하나가 오른쪽 화면 밖으로 밀려남(폭 계산 · 여백 버그)
    const bs = [...document.querySelectorAll("button,[role=button]")].filter((b) => !b.closest(NOPE) && shown(b) && onTop(b) && b.getBoundingClientRect().right > vw * 0.55 && b.getBoundingClientRect().width < vw * 0.5);
    const [b] = pick(bs, 1);
    if (!b) return fail("오른쪽 단추 없음");
    const r = b.getBoundingClientRect();
    b.style.setProperty("transform", `translateX(${Math.round(vw - r.left - r.width * 0.35)}px)`, "important");
    return done([mark(b)]);
  }
  if (kind === "broken") {
    // 그림 경로가 틀림(자산 이름 · 경로 바꾸고 참조를 안 고친 버그)
    const imgs = pick([...document.images].filter((i) => !i.closest(NOPE) && shown(i) && i.getBoundingClientRect().width >= 12 && onTop(i)), 3);
    if (!imgs.length) return fail("그림 없음");
    imgs.forEach((i, k) => { i.removeAttribute("srcset"); i.src = `/__missing__/icon-${seed}-${k}.png`; mark(i); });
    return done(imgs, { match: imgs.map((i, k) => `icon-${seed}-${k}.png`) });
  }
  if (kind === "rotate") {
    // 판이 기울어짐(애니메이션 transform 이 끝나지 않고 남은 버그)
    const [p] = pick(boxes(vw * 0.6, vh * 0.1, vh * 0.7), 1);
    if (!p) return fail("판 없음");
    p.style.setProperty("transform", `rotate(${rnd() < 0.5 ? -6 : 6}deg)`, "important");
    return done([mark(p)]);
  }
  if (kind === "clip") {
    // 글자가 상자보다 길어 잘림(폭 고정 상자 · 번역 길이 버그)
    const ts = pick(textLeaves().filter((el) => (el.textContent || "").trim().length >= 4 && el.getBoundingClientRect().width >= 40), 3);
    if (!ts.length) return fail("긴 글자 없음");
    for (const el of ts) { const w = el.getBoundingClientRect().width; Object.assign(el.style, { display: "inline-block", maxWidth: `${Math.round(w * 0.45)}px`, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "clip", verticalAlign: "bottom" }); mark(el); }
    return done(ts);
  }
  if (kind === "overlap") {
    // 엉뚱한 그림이 단추 위에 떠 있음(위치 계산이 틀린 장식 · 알림)
    const imgs = [...document.images].filter((i) => i.naturalWidth > 0 && i.getBoundingClientRect().width >= 16);
    const bs = [...document.querySelectorAll("button,[role=button]")].filter((b) => !b.closest(NOPE) && shown(b) && onTop(b) && b.getBoundingClientRect().width >= 30);
    const [src] = pick(imgs, 1), [b] = pick(bs, 1);
    if (!src || !b) return fail("그림 · 단추 없음");
    const r = b.getBoundingClientRect(), size = Math.round(Math.max(36, Math.min(64, r.height * 1.4)));
    const c = document.createElement("img");
    c.src = src.currentSrc || src.src;
    Object.assign(c.style, { position: "fixed", left: `${Math.round(r.left + r.width / 2 - size / 2)}px`, top: `${Math.round(r.top + r.height / 2 - size / 2)}px`, width: `${size}px`, height: `${size}px`, zIndex: "2147483000", transform: "rotate(-24deg)" });
    document.body.appendChild(mark(c));
    return done([c], { over: desc(b) });
  }
  if (kind === "nan") {
    // 숫자 자리에 NaN(계산 · 형식 버그)
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), cand = [];
    for (let t = w.nextNode(); t; t = w.nextNode()) if (/^\s*[0-9][0-9,.]*[KMBkmb]?\s*$/.test(t.nodeValue || "") && /[0-9]{2}|[KMB]/.test(t.nodeValue) && t.parentElement && !t.parentElement.closest(NOPE) && shown(t.parentElement) && onTop(t.parentElement)) cand.push(t);
    const [t] = pick(cand, 1);
    if (!t) return fail("숫자 없음");
    t.nodeValue = "NaN";
    return done([mark(t.parentElement)], { match: ["NaN"] });
  }
  if (kind === "collapse") {
    // 목록이 높이 0 으로 접혀 판이 비어 보임(flex 열 안 overflow auto 목록 — 11-06 .schedule-list 와 같은 모양)
    const cands = boxes(vw * 0.5, 60, vh * 0.6).filter((el) => el.children.length >= 2 && (el.innerText || "").replace(/\s+/g, "").length >= 12 && !el.querySelector("[data-fault-target]"));
    // 바깥 판은 남기고 안쪽 목록만 — 가장 바깥은 화면 전체 틀일 수 있다
    const inner = cands.filter((el) => !cands.some((o) => o !== el && el.contains(o)));
    const [el] = pick(inner.length ? inner : cands, 1);
    if (!el) return fail("목록 없음");
    Object.assign(el.style, { height: "0px", minHeight: "0px", maxHeight: "0px", overflow: "hidden", paddingTop: "0px", paddingBottom: "0px" });
    return done([mark(el)]);
  }
  if (kind === "modaldim") {
    // 닫힌 팝업의 어둠막이 남아 화면을 덮음(닫기 순서 버그)
    const d = document.createElement("div");
    Object.assign(d.style, { position: "fixed", inset: "0", background: "rgba(24, 14, 4, 0.62)", zIndex: "2147483000" });
    document.body.appendChild(mark(d));
    return done([d]);
  }
  if (kind === "lines") {
    // 메뉴 줄 높이가 무너져 글자가 겹침(line-height · height 고정 버그)
    const clickables = (el) => [...el.querySelectorAll("button,[role=button],a[href],li")].filter((b) => shown(b) && onTop(b));
    const lists = [...document.body.querySelectorAll("div,ul,nav,section")].filter((el) => { if (el.closest(NOPE) || !shown(el)) return false; const bs = clickables(el); if (bs.length < 3) return false; const tops = new Set(bs.map((b) => Math.round(b.getBoundingClientRect().top / 4))); return tops.size >= Math.min(bs.length, 3); });
    const inner = lists.filter((el) => !lists.some((o) => o !== el && el.contains(o)));
    const [L] = pick(inner.length ? inner : lists, 1);
    if (!L) return fail("세로 메뉴 없음");
    const bs = clickables(L).slice(0, 15);
    L.style.setProperty("gap", "0px", "important");
    for (const b of bs) { Object.assign(b.style, { height: "7px", minHeight: "0px", paddingTop: "0px", paddingBottom: "0px", marginTop: "0px", marginBottom: "0px", lineHeight: "7px", overflow: "visible" }); mark(b); }
    return done(bs.slice(0, 3), { count: bs.length });
  }
  return fail(`모르는 화면 버그 ${kind}`);
}
export const SCREEN_FAULTS = ["invisible", "offscreen", "broken", "rotate", "clip", "overlap", "nan", "collapse", "modaldim", "lines"];

/**
 * 일부러 넣는 버그 — 규칙 판정이 정말 잡는지 보는 시험용(POC 2주차 기준). 게임 소스는 건드리지 않고 연결부가 페이지에 끼워 넣는다.
 * 판정기가 잡아야 하는 것: crash(예외) · dead(무반응 단추) · negative(재화 음수) · nan(숫자 자리에 NaN).
 */
export const FAULTS = {
  /** "상점" 단추를 누르면 예외가 난다 */
  crash: {
    expect: "crash",
    match: /상점/,
    init: () => {
      window.addEventListener("click", (e) => {
        const b = e.target instanceof Element ? e.target.closest("button,[role=button]") : null;
        if (b && /상점/.test(b.textContent || "")) setTimeout(() => { throw new Error("[주입 버그] 상점 열기 실패"); }, 0);
      }, true);
    },
  },
  /**
   * "마이페이지" 단추가 눌러도 아무 일도 하지 않는다(이벤트를 가로챈다).
   * 처음엔 아래 탭 "동료"를 죽였는데 탐색이 40 · 100걸음 안에 그 탭을 제대로 누르지 못해(설정 배경에 덮인 때만 시도) 판정까지 가지 못했다 — 판정이 아니라 탐색 범위의 한계.
   */
  dead: {
    expect: "unresponsive",
    match: /^마이페이지/,
    init: () => {
      const kill = (e) => {
        const b = e.target instanceof Element ? e.target.closest("button,[role=button]") : null;
        if (b && /^\s*마이페이지/.test(b.textContent || "")) { e.stopImmediatePropagation(); e.preventDefault(); }
      };
      for (const t of ["pointerdown", "pointerup", "mousedown", "mouseup", "touchstart", "touchend", "click"]) window.addEventListener(t, kill, { capture: true, passive: false });
    },
  },
  /**
   * 저장할 때 보석이 음수로 적힌다(저장 경로 버그 흉내). 처음엔 "음수 골드로 저장된 계정"을 심었는데,
   * 게임이 불러올 때 0 으로 고쳐(src/titans/model.ts gold: Math.max(0, …)) 버그가 되지 않았다 — 게임 쪽 방어가 된다는 뜻.
   */
  negative: {
    expect: "invariant",
    match: /redGems/,
    init: () => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (String(k).startsWith("dodgebullets:progression:v1:")) { try { const p = JSON.parse(v); p.redGems = -5; v = JSON.stringify(p); } catch { /* 그대로 */ } }
        return set.call(this, k, v);
      };
    },
  },
  /** 화면의 첫 큰 숫자가 NaN 으로 바뀐다(표시 버그 흉내) */
  nan: {
    expect: "bad-number",
    match: /NaN/,
    init: () => {
      const hit = () => {
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          if (/^\s*[0-9][0-9,]{3,}\s*$/.test(n.nodeValue || "") && n.parentElement && n.parentElement.getBoundingClientRect().width > 0) { n.nodeValue = "NaN"; return true; }
        }
        return false;
      };
      const t = setInterval(() => { if (document.body && hit()) clearInterval(t); }, 500);
    },
  },
};
