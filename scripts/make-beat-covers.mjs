/**
 * 비트 수련 곡 커버 16종 생성 — 실제 곡명에 맞춘 모티프·팔레트 (사용자 지시: "노래명에 맞게 이미지").
 * SVG를 sharp로 256×256 PNG로 굽는다. public/beat/covers/<track id>.png
 *
 *   node scripts/make-beat-covers.mjs
 */
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const OUT = "public/beat/covers";
mkdirSync(OUT, { recursive: true });

const S = 256;
const bg = (a, b, angle = 135) => `<defs><linearGradient id="g" gradientTransform="rotate(${angle})"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="${S}" height="${S}" rx="28" fill="url(#g)"/>`;
const stars = (n, seed, color = "#fff") => Array.from({ length: n }, (_, i) => { const x = ((i * 97 + seed * 13) % 240) + 8; const y = ((i * 57 + seed * 31) % 240) + 8; const r = 1 + ((i * 7 + seed) % 3); return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${0.5 + ((i % 5) / 10)}"/>`; }).join("");
const wave = (y, amp, color, w = 6) => `<path d="M0 ${y} Q32 ${y - amp} 64 ${y} T128 ${y} T192 ${y} T256 ${y}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
const pixels = (cells, size = 20) => cells.map(([x, y, c]) => `<rect x="${x * size}" y="${y * size}" width="${size - 2}" height="${size - 2}" fill="${c}"/>`).join("");

const COVERS = {
  "azure-sky": bg("#0ea5e9", "#1e3a8a") + `<circle cx="196" cy="64" r="30" fill="#fde68a"/><ellipse cx="90" cy="120" rx="52" ry="22" fill="#e0f2fe" opacity=".9"/><ellipse cx="128" cy="112" rx="40" ry="18" fill="#f0f9ff"/><ellipse cx="170" cy="190" rx="60" ry="22" fill="#bae6fd" opacity=".8"/>${wave(230, 10, "#7dd3fc", 5)}`,
  "cherry-pop": bg("#f472b6", "#be123c") + `<circle cx="100" cy="150" r="42" fill="#e11d48"/><circle cx="160" cy="140" r="42" fill="#f43f5e"/><path d="M100 110 Q120 40 170 60 M160 100 Q150 50 170 60" stroke="#4ade80" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="84" cy="136" r="8" fill="#fff" opacity=".7"/><circle cx="146" cy="126" r="8" fill="#fff" opacity=".7"/>`,
  "strawberry-lemonade": bg("#fb7185", "#facc15", 90) + `<circle cx="150" cy="150" r="60" fill="#fef08a" stroke="#eab308" stroke-width="6"/>${Array.from({ length: 8 }, (_, i) => `<line x1="150" y1="150" x2="${150 + 52 * Math.cos((i * Math.PI) / 4)}" y2="${150 + 52 * Math.sin((i * Math.PI) / 4)}" stroke="#eab308" stroke-width="3"/>`).join("")}<path d="M70 80 q-30 40 0 70 q30 -30 0 -70z" fill="#e11d48"/><path d="M60 78 l10 -18 l10 18z" fill="#22c55e"/>${stars(10, 3, "#fff")}`,
  "turkish-march": bg("#7c2d12", "#fbbf24") + `<rect x="24" y="150" width="208" height="70" rx="6" fill="#fff"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${26 + i * 29.7}" y="150" width="28" height="70" fill="#fff" stroke="#1c1917" stroke-width="2"/>`).join("")}${[0, 1, 3, 4, 5].map((i) => `<rect x="${44 + i * 29.7}" y="150" width="18" height="42" fill="#1c1917"/>`).join("")}<path d="M110 60 a34 34 0 1 0 30 52 a26 26 0 1 1 -30 -52z" fill="#fde68a"/><polygon points="176,58 182,74 198,74 185,84 190,100 176,90 162,100 167,84 154,74 170,74" fill="#fde68a"/>`,
  "plasma-gun": bg("#0f172a", "#7e22ce") + `<polygon points="60,150 130,60 116,120 170,120 96,210 112,150" fill="#a3e635" stroke="#ecfccb" stroke-width="4"/><circle cx="200" cy="80" r="18" fill="#22d3ee" opacity=".8"/><circle cx="200" cy="80" r="30" fill="none" stroke="#22d3ee" stroke-width="3" opacity=".5"/>${stars(14, 7, "#c4b5fd")}`,
  "dual-racing": `<defs><linearGradient id="g"><stop offset="0" stop-color="#dc2626"/><stop offset=".5" stop-color="#dc2626"/><stop offset=".5" stop-color="#2563eb"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs><rect width="${S}" height="${S}" rx="28" fill="url(#g)"/><path d="M128 20 L128 236" stroke="#fff" stroke-width="6" stroke-dasharray="18 12"/>${[60, 90, 120, 150, 180].map((y) => `<line x1="20" y1="${y}" x2="100" y2="${y - 16}" stroke="#fecaca" stroke-width="5" stroke-linecap="round"/><line x1="156" y1="${y - 16}" x2="236" y2="${y}" stroke="#bfdbfe" stroke-width="5" stroke-linecap="round"/>`).join("")}<text x="64" y="220" font-size="26" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">RED</text><text x="192" y="220" font-size="26" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">BLUE</text>`,
  "black-city-beat": bg("#111827", "#374151", 90) + `${[[10, 120, 34], [50, 80, 30], [86, 140, 40], [132, 60, 36], [174, 110, 30], [210, 90, 38]].map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="${236 - y}" fill="#030712"/>`).join("")}${Array.from({ length: 30 }, (_, i) => `<rect x="${16 + (i * 37) % 220}" y="${90 + (i * 53) % 130}" width="5" height="7" fill="#fbbf24" opacity=".8"/>`).join("")}<circle cx="200" cy="48" r="22" fill="#e5e7eb"/>${wave(226, 6, "#f97316", 4)}`,
  andromeda: bg("#1e1b4b", "#0f172a") + `<path d="M128 128 m0 -4 a4 4 0 0 1 4 4 a8 8 0 0 1 -12 8 a16 16 0 0 1 8 -28 a28 28 0 0 1 24 40 a44 44 0 0 1 -60 8 a60 60 0 0 1 40 -84" fill="none" stroke="#c4b5fd" stroke-width="6" stroke-linecap="round" opacity=".9"/><circle cx="128" cy="128" r="10" fill="#f5d0fe"/>${stars(28, 11, "#e9d5ff")}`,
  "one-more-time": bg("#f97316", "#fde047") + `<path d="M128 60 a68 68 0 1 1 -48 20" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"/><polygon points="64,54 96,84 60,100" fill="#fff"/><text x="128" y="150" font-size="56" font-weight="900" fill="#7c2d12" text-anchor="middle" font-family="sans-serif">1</text>`,
  duel: bg("#312e81", "#be123c") + `<path d="M40 216 L200 56 M200 56 L216 40 M184 56 L200 72" stroke="#e2e8f0" stroke-width="12" stroke-linecap="round"/><path d="M216 216 L56 56 M56 56 L40 40 M72 56 L56 72" stroke="#fde68a" stroke-width="12" stroke-linecap="round"/><circle cx="128" cy="136" r="16" fill="#fff" opacity=".9"/>`,
  "cybernetic-overload": bg("#022c22", "#0f766e") + `${[[20, 60, 120, 60], [120, 60, 120, 140], [120, 140, 200, 140], [60, 200, 60, 120], [60, 120, 180, 120], [180, 120, 180, 40], [200, 200, 100, 200]].map(([a, b, c, d]) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#5eead4" stroke-width="5"/>`).join("")}${[[20, 60], [200, 140], [60, 200], [180, 40], [100, 200]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#a7f3d0"/>`).join("")}<rect x="96" y="96" width="64" height="64" rx="8" fill="#134e4a" stroke="#5eead4" stroke-width="4"/>`,
  "arcade-overdrive": bg("#4c1d95", "#db2777") + `<rect x="56" y="150" width="144" height="60" rx="14" fill="#1f2937"/><circle cx="96" cy="180" r="12" fill="#ef4444"/><circle cx="130" cy="180" r="12" fill="#facc15"/><circle cx="164" cy="180" r="12" fill="#22c55e"/><rect x="118" y="80" width="20" height="70" rx="6" fill="#e5e7eb"/><circle cx="128" cy="70" r="26" fill="#f472b6" stroke="#fff" stroke-width="4"/>`,
  "pixel-rush": bg("#0ea5e9", "#0f172a", 45) + pixels([[2, 9, "#facc15"], [3, 9, "#facc15"], [4, 8, "#fb923c"], [5, 8, "#fb923c"], [6, 7, "#f43f5e"], [7, 7, "#f43f5e"], [8, 6, "#a855f7"], [9, 6, "#a855f7"], [10, 5, "#22d3ee"], [11, 5, "#22d3ee"], [4, 3, "#fff"], [7, 2, "#fff"], [10, 1, "#fff"]]),
  "playful-pixels": bg("#fef3c7", "#f9a8d4", 90) + pixels(Array.from({ length: 36 }, (_, i) => [1 + (i % 9) + (Math.floor(i / 9) % 2), 3 + Math.floor(i / 9) * 2, ["#f43f5e", "#fb923c", "#facc15", "#4ade80", "#22d3ee", "#a855f7"][i % 6]]), 22),
  "happy-strum-day": bg("#fbbf24", "#f97316") + `<ellipse cx="96" cy="160" rx="54" ry="48" fill="#92400e"/><ellipse cx="96" cy="160" rx="18" ry="16" fill="#1c1917"/><rect x="120" y="60" width="14" height="110" transform="rotate(35 127 115)" fill="#78350f"/>${[0, 1, 2, 3].map((i) => `<line x1="${60 + i * 8}" y1="${190 - i * 2}" x2="${196 + i * 6}" y2="${50 + i * 4}" stroke="#fef3c7" stroke-width="2"/>`).join("")}<circle cx="212" cy="52" r="20" fill="#fde68a"/>`,
  "starlight-strut": bg("#1e1b4b", "#7e22ce") + `${stars(24, 5, "#fde68a")}<polygon points="128,60 146,108 198,108 156,138 172,190 128,158 84,190 100,138 58,108 110,108" fill="#fde047" stroke="#fff" stroke-width="4"/><path d="M40 220 Q128 180 216 220" fill="none" stroke="#f0abfc" stroke-width="6" stroke-linecap="round"/>`,
};

for (const [id, body] of Object.entries(COVERS)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${body}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`${OUT}/${id}.png`);
  console.log("cover", id);
}
console.log(`generated ${Object.keys(COVERS).length} covers → ${OUT}`);
