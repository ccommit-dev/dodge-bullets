/**
 * PC 웹 세로 기둥용 CSS 변환 (2026-10-20, src/ui/webFrame.ts) — vite 가 모든 CSS 에 건다.
 * @media 는 창 폭을 보므로, 기둥(WEB_FRAME_W) 안에서 폰 규칙이 켜지고 데스크톱 규칙이 꺼지게 옮긴다. 모바일 결과는 바뀌지 않는다:
 *  1) (max-width: N) 이고 N ≥ 기둥 폭 → 블록 바로 뒤에 같은 규칙을 `:where(html.web-frame)` 를 붙여 한 번 더(:where 라 우선순위 그대로 · 자리도 그대로)
 *  2) (min-width: N) · 가로 (orientation: landscape) → 블록 안 선택자에 `:where(html:not(.web-frame))` — 기둥 안에선 꺼진다
 *  3) 숫자vw → calc(숫자 * var(--vw, 1vw)) — 기둥이면 --vw 가 기둥 폭의 1%, 아니면 1vw 그대로
 */
import type { AtRule, Plugin, Rule } from "postcss";

export const WEB_FRAME_W = 460;
const ON = ":where(html.web-frame)";
const OFF = ":where(html:not(.web-frame))";

function scope(selector: string, prefix: string, onRoot: string): string {
  return selector.split(",").map((s) => {
    const t = s.trim();
    if (/^(html|:root)\b/.test(t)) return t.replace(/^(html|:root)/, (m) => `${m}${onRoot}`);
    return `${prefix} ${t}`;
  }).join(", ");
}

function rulesIn(at: AtRule): Rule[] {
  const out: Rule[] = [];
  at.each((n) => { if (n.type === "rule") out.push(n as Rule); });
  return out;
}

export function webFrameCss(): Plugin {
  return {
    postcssPlugin: "web-frame-css",
    Once(root) {
      root.walkAtRules("media", (at) => {
        if (at.parent?.type !== "root") return;
        const p = at.params.replace(/\s+/g, " ").trim();
        const max = /^\(max-width: ?(\d+)px\)$/.exec(p);
        const min = /^\(min-width: ?(\d+)px\)$/.exec(p);
        if (max && Number(max[1]) >= WEB_FRAME_W) {
          const copies = rulesIn(at).filter((r) => !(r.parent && r.parent.type === "atrule" && /keyframes/.test((r.parent as AtRule).name))).map((r) => {
            const c = r.clone();
            c.selector = scope(r.selector, ON, ":where(.web-frame)");
            return c;
          });
          let after: import("postcss").ChildNode = at;
          for (const c of copies) { after.after(c); after = c; }
        } else if ((min && Number(min[1]) > WEB_FRAME_W) || /orientation: ?landscape/.test(p)) {
          for (const r of rulesIn(at)) r.selector = scope(r.selector, OFF, ":where(:not(.web-frame))");
        }
      });
      root.walkDecls((d) => {
        if (d.prop.startsWith("--") && d.prop === "--vw") return;
        if (/\d(\.\d+)?vw\b/.test(d.value)) d.value = d.value.replace(/(-?\d*\.?\d+)vw\b/g, "calc($1 * var(--vw, 1vw))");
      });
    },
  };
}
webFrameCss.postcss = true;
