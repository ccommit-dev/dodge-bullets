/**
 * 주인공 시트 칸마다 발 가로 자리 (2026-11-09) — 칸 폭 비율(0~1). 맨 아래 5% 띠의 알파 가로 중심.
 * 3D 대기 · 공격 칸은 몸이 쏠리며 발까지 칸마다 3~7px 가로로 미끄러진다(대기 42.9~49.3% · 창 공격 45.4~52.8%).
 * 댐 방어전(game/player.ts 캔버스)과 사냥터(EquippedCharacter DOM)가 발을 대기 0칸 자리에 맞춰 그린다.
 * 시트를 다시 렌더해도 런타임에 재므로 표를 고칠 필요 없다. 읽을 수 없으면(캔버스 없음 · 교차 출처) null — 보정 없이 그린다.
 */
export function footFractions(img: HTMLImageElement, frames: number): number[] | null {
  if (!img.complete || img.naturalWidth === 0 || frames < 1) return null;
  try {
    const H = 192, W = Math.max(frames, Math.round((img.naturalWidth * H) / img.naturalHeight));
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D | null;
    if (!g) return null;
    g.drawImage(img, 0, 0, W, H);
    const y0 = Math.floor(H * 0.95), d = g.getImageData(0, y0, W, H - y0).data, cw = W / frames;
    return Array.from({ length: frames }, (_, k) => {
      let sx = 0, n = 0;
      for (let y = 0; y < H - y0; y += 1) for (let x = Math.floor(k * cw); x < Math.floor((k + 1) * cw); x += 1) if (d[(y * W + x) * 4 + 3] > 60) { sx += x - k * cw; n += 1; }
      return n > 0 ? sx / n / cw : 0.5;
    });
  } catch { return null; }
}

const tables = new Map<string, number[] | null>();
const loading = new Map<string, Promise<number[] | null>>();
/** 이미 잰 표(없으면 null) — 그리는 쪽이 매 칸 부른다 */
export function footTable(url: string, frames: number): number[] | null {
  return tables.get(`${url}#${frames}`) ?? null;
}
/** 시트를 받아 한 번 잰다 — 같은 주소는 한 번만 */
export function loadFootTable(url: string, frames: number): Promise<number[] | null> {
  const key = `${url}#${frames}`;
  if (tables.has(key)) return Promise.resolve(tables.get(key) ?? null);
  const p = loading.get(key);
  if (p) return p;
  const job = new Promise<number[] | null>((resolve) => {
    if (typeof Image === "undefined") { resolve(null); return; }
    const img = new Image();
    img.onload = () => { const t = footFractions(img, frames); tables.set(key, t); resolve(t); };
    img.onerror = () => { tables.set(key, null); resolve(null); };
    img.src = url;
  });
  loading.set(key, job);
  return job;
}
