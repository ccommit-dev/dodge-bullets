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
