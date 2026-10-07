/** 비버 테마 파편 모양 (2026-10-07) — 성문 방어 파편·비트 파티클이 같이 쓴다. 동그라미 대신 잎·물방울 */
/** 나뭇잎 모양 파편 — 두 호로 된 잎, angle 로 회전 (비버 테마 2026-10-07) */
export function drawLeafShape(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number): void {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.9, 0, 0, r); ctx.quadraticCurveTo(-r * 0.9, 0, 0, -r); ctx.closePath(); ctx.fill();
  ctx.restore();
}
/** 물방울 모양 파편 — 위가 뾰족한 원 */
export function drawDropShape(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath(); ctx.moveTo(x, y - r * 1.5); ctx.quadraticCurveTo(x + r, y - r * 0.2, x + r, y + r * 0.2);
  ctx.arc(x, y + r * 0.2, r, 0, Math.PI, false); ctx.quadraticCurveTo(x - r, y - r * 0.2, x, y - r * 1.5); ctx.closePath(); ctx.fill();
}
