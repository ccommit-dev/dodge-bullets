/**
 * 화면 구조 검사 — 모델 없이 DOM · 계산된 스타일만으로 "눈으로 봐야 보이던" 화면 버그 일부를 잰다(2026-11-13).
 * 페이지 안에서 돈다(observeInPage 가 문자열로 넘겨 부른다). 잡은 요소에는 data-agent-flag 를 달아 화면 벤치가 대상과 맞춰 본다.
 *
 * 문턱 · 제외는 측정 전에 정했다(아래 각 줄). 바꾸면 화면 벤치(run.mjs screens)를 다시 돌려 오탐을 본다.
 *   broken    — 보이는 <img> 가 불러오기를 끝냈는데 그림 크기 0 (CSS 배경 그림은 못 잰다)
 *   faint     — 글자색(투명도 · 부모 opacity 반영)과 가장 가까운 단색 배경의 대비 < 2.0. 그라데이션 · 그림 배경, 글자 테두리(text-shadow · stroke)는 "못 잼"으로 뺀다
 *   clipped   — 글자가 자신 또는 부모 3단 안의 overflow hidden/clip 상자 밖으로 4px 넘게 나가 숨겨짐. 말줄임(ellipsis) · 줄 수 제한(line-clamp) · 화면 60% 넘는 큰 상자는 뺀다
 *   overlap   — 서로 다른 글자 줄 상자가 작은 쪽 넓이의 35% 이상 겹침. 전투 칸(움직이는 그림 · 피해 숫자)은 뺀다
 *               (측정 뒤 고침 11-13: 고정 · 붙박이 층이 다른 글자끼리는 뺀다 — 아래 메뉴 밑을 지나는 목록 글자를 겹침으로 셌다)
 *   faint 배경 (측정 뒤 고침 11-13: 반투명 층을 겹쳐 칠한다 — 반투명 어둠 딱지 위 흰 글자를 크림 바탕으로 쟀다)
 *   collapsed — 글자 8자 이상 든 상자가 overflow 를 숨긴 채 내용 칸 높이 2px 미만(상자 16px 미만). 접힌 펼침 메뉴(aria-expanded=false 옆)는 뺀다
 *               (측정 뒤 고침 11-13: 처음엔 상자 높이 < 4px — 테두리 있는 카드가 접혀도 4px 이라 놓쳤다)
 *   clipped 제외 (측정 뒤 고침 11-13: 전투 칸 .titans-field 가 자르는 것은 뺀다 — 전투 타이머 · 그림이 칸 끝을 드나든다)
 *   clipped 범위 (고친 실수 11-13: 첫 글자 조각만 쟀다 → 요소 내용 전체)
 *   faint 제외 (측정 뒤 고침 11-13: 글자 · 숫자 없는 기호는 뺀다 — 일부러 흐린 빈 별)
 *   overlap 가림 (측정 뒤 고침 11-13: 겹친 곳 맨 위 요소 갈래에 불투명 판이 있으면 아래 글자는 가려진 것 — 모달 제목 밑 퀘스트 숫자)
 *   (탐색 판 seed 1 에서 본 오탐으로 고침 11-13: 조상 opacity 곱이 0 에 가까운 요소 빼기 · 비활성 단추 빼기 · 조상 아닌 판이 사이에 그려지면 배경 못 잼)
 * 측정 뒤 고친 것은 모두 설계용 장 · 첫 판 따로 둔 장의 "정상 부분"에서 본 오탐이다 — 따로 둔 장의 숫자도 그만큼 낙관적이라 오탐은 탐색 판(처음 보는 화면)으로 따로 잰다.
 */
export function visualProbe() {
  const vw = innerWidth, vh = innerHeight;
  const SKIP = ".titans-field .titans-float, .titans-field .titans-fx, .skill-shot, canvas, [aria-hidden=true], .sr-only, [data-agent-ignore]";
  const out = { broken: [], faint: [], clipped: [], overlap: [], collapsed: [], skipped: { faintUnknown: 0 } };
  let n = 0;
  const flag = (els, list, text) => {
    const id = `v${(n += 1)}`;
    for (const e of els) if (e && e.setAttribute) e.setAttribute("data-agent-flag", `${e.getAttribute("data-agent-flag") || ""} ${id}`.trim());
    list.push({ id, text: String(text).slice(0, 160) });
  };
  const desc = (el) => {
    const c = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/)[0] : "";
    return `${el.tagName.toLowerCase()}${c} "${(el.innerText || el.textContent || el.getAttribute?.("alt") || "").replace(/\s+/g, " ").trim().slice(0, 16)}"`;
  };
  const inView = (r) => r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
  const shown = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.05) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1 && inView(r);
  };
  const opacityChain = (el) => { let o = 1; for (let q = el; q && q !== document.documentElement; q = q.parentElement) o *= Number(getComputedStyle(q).opacity); return o; };
  const parse = (c) => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat); return { r, g, b, a }; };
  const lumOf = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  // 배경 — 위로 올라가며 반투명 층을 모아 첫 불투명 층 위에 겹쳐 칠한다(반투명 딱지 · 어둠판을 빼면 흰 글자를 크림 바탕으로 잘못 잰다 — 11-13 첫 실행에서 본 오탐).
  // 그라데이션은 불투명한 색 멈춤 평균, 그림(url) 배경 · 불투명 층 없음은 못 잰다(null).
  const mix = (top, bot, a) => ({ r: top.r * a + bot.r * (1 - a), g: top.g * a + bot.g * (1 - a), b: top.b * a + bot.b * (1 - a) });
  const bgOf = (el, pt) => {
    const layers = [];
    let base = null, baseEl = null;
    for (let q = el; q && q !== document.documentElement && !base; q = q.parentElement) {
      const cs = getComputedStyle(q);
      if (cs.backgroundImage !== "none") {
        if (cs.backgroundImage.includes("url(")) return null;
        const cols = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map((m) => parse(m[0])).filter((c) => c && c.a >= 0.85);
        if (cols.length) { base = { r: cols.reduce((a, c) => a + c.r, 0) / cols.length, g: cols.reduce((a, c) => a + c.g, 0) / cols.length, b: cols.reduce((a, c) => a + c.b, 0) / cols.length }; baseEl = q; break; }
      }
      const c = parse(cs.backgroundColor);
      if (c && c.a >= 0.85) { base = c; baseEl = q; }
      else if (c && c.a > 0.02) layers.push(c);
    }
    if (!base) return null; // 바탕이 그림 요소(<img> · 캔버스)일 수 있다 — 못 잼
    // 실제로 그 자리 밑에 깔린 것 확인 — 조상이 아닌 판(모달 어둠판 · 전투 장면 그림)이 글자와 조상 바탕 사이에 그려져 있으면 조상 바탕은 안 보인다 → 못 잼
    // (11-13 측정 뒤 고침: 조각 균열 어두운 판 위 보상 칩 글자를 그 밑 크림 조상 바탕으로 쟀다. pointer-events:none 판은 elementsFromPoint 에 안 잡혀 여전히 못 본다)
    if (pt) {
      const stack = document.elementsFromPoint(pt.x, pt.y);
      const start = stack.findIndex((q) => q === el || q.contains(el));
      const end = stack.indexOf(baseEl);
      if (start < 0 || end < 0) return null;
      for (let i = start; i < end; i += 1) {
        const q = stack[i];
        if (q.contains(el)) continue;
        const qs = getComputedStyle(q), qc = parse(qs.backgroundColor);
        if (/^(IMG|CANVAS|VIDEO|svg)$/i.test(q.tagName) || qs.backgroundImage !== "none" || (qc && qc.a > 0.02)) return null;
      }
    }
    let col = base;
    for (let i = layers.length - 1; i >= 0; i -= 1) col = mix(layers[i], col, layers[i].a);
    return col;
  };
  // 고정 · 붙박이 층 — 서로 다른 층의 글자는 겹쳐도 한쪽이 다른 쪽 밑을 지나가는 것(아래 메뉴 밑 목록 · 모달 밑 판)이라 겹침에서 뺀다
  const layerCache = new Map();
  const layerOf = (el) => {
    if (layerCache.has(el)) return layerCache.get(el);
    let L = document.body;
    for (let q = el; q && q !== document.body; q = q.parentElement) { const p = getComputedStyle(q).position; if (p === "fixed" || p === "sticky") { L = q; break; } }
    layerCache.set(el, L);
    return L;
  };

  // 깨진 그림
  for (const img of document.images) {
    if (!img.getAttribute("src") || !img.complete || img.naturalWidth > 0) continue;
    const r = img.getBoundingClientRect();
    if (r.width < 8 || r.height < 8 || !shown(img) || img.closest(SKIP)) continue;
    flag([img], out.broken, `${desc(img)} ${img.getAttribute("src").slice(-48)}`);
  }

  // 글자 — 대비 · 잘림 · 겹침
  const rects = [];
  const seenEl = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let count = 0;
  for (let t = walker.nextNode(); t && count < 1500; t = walker.nextNode()) {
    const txt = (t.nodeValue || "").trim();
    const el = t.parentElement;
    if (!txt || !el || el.closest(SKIP)) continue;
    if (!shown(el)) continue;
    // 조상 opacity 까지 곱해 거의 0 이면 숨겨진(사라지는 중인) 요소다 — 흐린 글자가 아니다(11-13 측정 뒤 고침: 쿨타임 단추 안 스킬 이름 1.00:1)
    const oc = opacityChain(el);
    if (oc < 0.05) continue;
    count += 1;
    const range = document.createRange();
    range.selectNodeContents(t);
    const lines = [...range.getClientRects()].filter((r) => r.width > 2 && r.height > 2 && inView(r));
    if (!lines.length) continue;
    const cs = getComputedStyle(el);
    const inField = !!el.closest(".titans-field");
    // 겹침은 보이는 부분끼리 — 숨김 상자(말줄임 · 잘림)가 자른 글자 줄은 그 상자 안쪽만 센다(11-13 첫 실행 오탐: 말줄임 설명 줄이 옆 ▾ 단추와 겹친다고 셈)
    let clip = { left: -1e9, top: -1e9, right: 1e9, bottom: 1e9 };
    for (let q = el, d = 0; q && d < 6 && q !== document.body; q = q.parentElement, d += 1) {
      const qs = getComputedStyle(q);
      if (qs.overflowX === "visible" && qs.overflowY === "visible") continue;
      const qr = q.getBoundingClientRect();
      clip = { left: Math.max(clip.left, qr.left), top: Math.max(clip.top, qr.top), right: Math.min(clip.right, qr.right), bottom: Math.min(clip.bottom, qr.bottom) };
    }
    if (!inField) for (const r0 of lines) {
      const r = { left: Math.max(r0.left, clip.left), top: Math.max(r0.top, clip.top), right: Math.min(r0.right, clip.right), bottom: Math.min(r0.bottom, clip.bottom) };
      r.width = r.right - r.left; r.height = r.bottom - r.top;
      if (r.width > 2 && r.height > 2) rects.push({ r, el, t });
    }
    if (seenEl.has(el)) continue;
    seenEl.add(el);
    // 대비
    const fs = parseFloat(cs.fontSize);
    const outlined = (cs.textShadow && cs.textShadow !== "none") || parseFloat(cs.webkitTextStrokeWidth || "0") > 0;
    const clipText = /text/.test(cs.webkitBackgroundClip || cs.backgroundClip || "");
    // 글자 · 숫자가 없는 기호(★ · ● · ▾)는 읽는 글이 아니다 — 빈 별처럼 일부러 흐리게 그린다(11-13 측정 뒤 고침: 동료 등급 빈 별 1.54:1)
    const readable = /[\p{L}\p{N}]/u.test(el.textContent || "");
    // 비활성 단추(disabled · aria-disabled)는 일부러 흐리게 그린다 — WCAG 대비 기준도 비활성 요소는 뺀다(11-13 측정 뒤 고침: 대장간 교환하기 · 이벤트 받기)
    const inactive = !!el.closest("button:disabled, [disabled], [aria-disabled=true]");
    if (fs >= 8 && !outlined && !clipText && readable && !inactive) {
      const fg = parse(cs.color);
      const l0 = lines[0];
      const bgc = bgOf(el, { x: l0.left + Math.min(l0.width / 2, 8), y: l0.top + l0.height / 2 });
      if (fg && bgc !== null) {
        const a = fg.a * oc;
        const L = lumOf(mix(fg, bgc, a)), bg = lumOf(bgc);
        const ratio = (Math.max(L, bg) + 0.05) / (Math.min(L, bg) + 0.05);
        if (ratio < 2) flag([el], out.faint, `${ratio.toFixed(2)}:1 ${desc(el)}`);
      } else if (fg) out.skipped.faintUnknown += 1;
    }
    // 잘림 — 글자가 숨김 상자 밖으로. 요소의 내용 전체로 잰다(React 는 "티어 {n} · {d}일" 을 글자 조각 여럿으로 나눠, 첫 조각만 재면 넘친 뒤쪽을 못 본다 — 11-13)
    const whole = document.createRange();
    whole.selectNodeContents(el);
    const box = whole.getBoundingClientRect();
    for (let q = el, d = 0; q && d < 4 && q !== document.body; q = q.parentElement, d += 1) {
      const qs = getComputedStyle(q);
      const hid = (v) => v === "hidden" || v === "clip";
      if (!hid(qs.overflowX) && !hid(qs.overflowY)) continue;
      if (qs.textOverflow === "ellipsis" || cs.textOverflow === "ellipsis" || (qs.webkitLineClamp && qs.webkitLineClamp !== "none") || (cs.webkitLineClamp && cs.webkitLineClamp !== "none")) break;
      const qr = q.getBoundingClientRect();
      if (qr.width * qr.height > vw * vh * 0.6 || q.matches(".titans-field")) break; // 큰 틀 · 전투 칸(그림이 드나드는 무대)은 자르는 게 정상
      const over = Math.max(hid(qs.overflowX) ? Math.max(qr.left - box.left, box.right - qr.right) : 0, hid(qs.overflowY) ? Math.max(qr.top - box.top, box.bottom - qr.bottom) : 0);
      if (over > 4) { flag([el, q], out.clipped, `${Math.round(over)}px ${desc(el)} ⊂ ${desc(q)}`); break; }
    }
  }
  // 겹침 — 위에서 아래로 훑으며 줄 상자끼리
  rects.sort((a, b) => a.r.top - b.r.top);
  const pairs = new Set();
  for (let i = 0; i < rects.length; i += 1) {
    const A = rects[i];
    for (let j = i + 1; j < rects.length && rects[j].r.top < A.r.bottom; j += 1) {
      const B = rects[j];
      if (A.t === B.t || layerOf(A.el) !== layerOf(B.el)) continue;
      const w = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left), h = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
      if (w <= 0 || h <= 0) continue;
      const small = Math.min(A.r.width * A.r.height, B.r.width * B.r.height);
      if (w * h < small * 0.35) continue;
      // 겹친 곳에서 위에 그려진 쪽 갈래에 불투명 판이 있으면 아래 글자는 가려져 안 보인다(모달 제목 밑 판 글자) — 겹침이 아니다(11-13 측정 뒤 고침)
      const cx = Math.max(A.r.left, B.r.left) + w / 2, cy = Math.max(A.r.top, B.r.top) + h / 2;
      const top = document.elementFromPoint(cx, cy);
      if (!top) continue;
      const anc = (x, y) => x === y || x.contains(y) || y.contains(x);
      const upper = anc(top, A.el) || A.el.contains(top) ? A.el : anc(top, B.el) || B.el.contains(top) ? B.el : null;
      if (!upper) continue; // 둘 다 아닌 것(다른 판 · 모달 · 덮개)이 위 — 겹친 곳이 안 보인다
      const lower = upper === A.el ? B.el : A.el;
      let hidden = false;
      for (let q = top; q && !q.contains(lower); q = q.parentElement) {
        const qs = getComputedStyle(q), bc = parse(qs.backgroundColor);
        if ((bc && bc.a >= 0.85) || qs.backgroundImage !== "none") { hidden = true; break; }
      }
      if (hidden) continue;
      const key = [A.el, B.el].map(desc).sort().join("|");
      if (pairs.has(key)) continue;
      pairs.add(key);
      if (pairs.size <= 12) flag([A.el, B.el], out.overlap, `${desc(A.el)} × ${desc(B.el)}`);
    }
  }

  // 접힘 — 내용이 있는데 높이 0
  const all = document.body.querySelectorAll("*");
  if (all.length < 8000) {
    for (const el of all) {
      if (!el.children.length || el.closest(SKIP) || el.hidden) continue;
      const r = el.getBoundingClientRect();
      if (r.height >= 16 || r.width < 40 || r.top < 0 || r.top > vh || r.left > vw || r.right < 0) continue;
      const cs = getComputedStyle(el);
      // 내용 칸 높이(테두리 · 안쪽 여백 뺀 것)로 잰다 — 테두리 2px 카드가 접히면 상자는 4px 이다(11-13 측정 뒤 고침, 처음엔 상자 높이 < 4)
      if (el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) >= 2) continue;
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      if ((el.textContent || "").replace(/\s+/g, "").length < 8) continue;
      const p = el.parentElement;
      if (!p || p.getBoundingClientRect().height < 20 || !shown(p)) continue;
      if (p.querySelector("[aria-expanded=false]") || el.matches("[aria-expanded=false] + *")) continue;
      flag([el], out.collapsed, `${desc(el)} 높이 ${r.height.toFixed(1)}px · 글자 ${(el.textContent || "").replace(/\s+/g, "").length}자`);
    }
  }
  out.skipped.texts = count;
  return out;
}
