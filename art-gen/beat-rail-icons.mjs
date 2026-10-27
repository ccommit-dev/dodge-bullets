// 비트 디펜스 판정 레일 색 아이콘 (2026-10-27, /goal "상점 '황금 전진 북' · '공명의 전투 북' — 같은 이름 유의").
// 예전 아이콘은 북 그림이라 사냥터 상점 '외형'에서 주인공 무기(옛 북)처럼 읽혔다. 상품의 실제 효과(판정 레일 · 패드 · 고리 빛)를 그린다.
// 색은 src/beat/draw.ts RING_PALETTE 와 같다.   node art-gen/beat-rail-icons.mjs  → public/beat/custom/ring-<id>.png
import sharp from "sharp";
const PAL = {
  neon: { lit: "#22d3ee", dim: "#7c3aed", mid: "#f472b6" },
  gold: { lit: "#fbbf24", dim: "#b47828", mid: "#fde047" },
  magenta: { lit: "#f472b6", dim: "#9d174d", mid: "#c084fc" },
  ice: { lit: "#a5f3fc", dim: "#38bdf8", mid: "#bae6fd" },
  ember: { lit: "#fb923c", dim: "#9a3412", mid: "#f87171" },
};
const S = 256;
for (const [id, c] of Object.entries(PAL)) {
  // 원근 레일 4줄(위로 모인다) + 아래 판정 고리(빛나는 타원) + 패드 4개 + 떨어지는 노트 2개
  const topY = 34, botY = 196, topL = 104, topR = 152, botL = 30, botR = 226;
  const lanes = [0, 1, 2, 3, 4].map((i) => { const t = i / 4; return { x0: topL + (topR - topL) * t, x1: botL + (botR - botL) * t }; });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <linearGradient id="rail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.dim}" stop-opacity=".15"/><stop offset="1" stop-color="${c.dim}" stop-opacity=".75"/></linearGradient>
    <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${c.lit}" stop-opacity=".9"/><stop offset=".55" stop-color="${c.lit}" stop-opacity=".35"/><stop offset="1" stop-color="${c.lit}" stop-opacity="0"/></radialGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>
  <path d="M${topL} ${topY} L${topR} ${topY} L${botR} ${botY} L${botL} ${botY} Z" fill="url(#rail)" stroke="#3b2415" stroke-width="5" stroke-linejoin="round"/>
  ${lanes.slice(1, 4).map((l) => `<line x1="${l.x0}" y1="${topY}" x2="${l.x1}" y2="${botY}" stroke="${c.mid}" stroke-width="3" stroke-opacity=".8"/>`).join("")}
  <ellipse cx="128" cy="${botY - 14}" rx="112" ry="34" fill="url(#glow)" filter="url(#soft)"/>
  <ellipse cx="128" cy="${botY - 14}" rx="100" ry="22" fill="none" stroke="${c.lit}" stroke-width="9"/>
  <ellipse cx="128" cy="${botY - 14}" rx="100" ry="22" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-opacity=".75"/>
  ${[0, 1, 2, 3].map((i) => { const x = botL + 24 + i * ((botR - botL - 48) / 3); return `<ellipse cx="${x}" cy="${botY + 26}" rx="21" ry="11" fill="${c.lit}" stroke="#3b2415" stroke-width="4"/><ellipse cx="${x - 5}" cy="${botY + 22}" rx="8" ry="3.5" fill="#ffffff" fill-opacity=".7"/>`; }).join("")}
  <circle cx="${(lanes[1].x0 + lanes[2].x0) / 2 + 4}" cy="88" r="11" fill="${c.mid}" stroke="#3b2415" stroke-width="4"/>
  <circle cx="${(lanes[2].x0 + lanes[3].x0) / 2 + 22}" cy="136" r="14" fill="${c.lit}" stroke="#3b2415" stroke-width="4"/>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`public/beat/custom/ring-${id}.png`);
  console.log("ring-" + id);
}
