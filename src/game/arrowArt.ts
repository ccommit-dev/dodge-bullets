/**
 * 기본 화살·주인공 활 — 원화 대신 캔버스로 그린다 (2026-10-02, 사용자: "기본 화살 애니메이션이 없고 기본 활 모델이 볼품없음").
 * 활 원화(0.44배, 흰 선 시위)는 몸에 겹쳐 거의 안 보였고, 기본 화살 원화는 회색 바늘 같았다.
 * 좌표는 모두 **로컬** — 호출하는 쪽이 조준 방향으로 회전해 둔다(+x 가 앞).
 */

/** 나무 화살 한 대 — 꼬리(tailX)에서 앞으로 len. spin 은 깃 색을 번갈아 그려 화살이 도는 것처럼 보이게 한다 */
export function drawWoodArrow(ctx: CanvasRenderingContext2D, tailX: number, len: number, spin = 0): void {
  const headX = tailX + len;
  const head = Math.max(7, len * 0.22);
  // 대 — 어두운 테두리 위에 밝은 나무
  ctx.lineCap = "round";
  ctx.strokeStyle = "#2a1708"; ctx.lineWidth = 3.2;
  ctx.beginPath(); ctx.moveTo(tailX + 1, 0); ctx.lineTo(headX - head * 0.8, 0); ctx.stroke();
  ctx.strokeStyle = "#e3b56f"; ctx.lineWidth = 1.7;
  ctx.beginPath(); ctx.moveTo(tailX + 1, 0); ctx.lineTo(headX - head * 0.8, 0); ctx.stroke();
  // 깃 — 붉은 깃·흰 깃 두 장. spin 이 홀수면 위아래가 바뀐다(회전)
  const fl = Math.max(7, len * 0.26), fw = Math.max(3.2, len * 0.12);
  const flip = Math.floor(spin) % 2 === 0 ? 1 : -1;
  for (const [side, color] of [[-1, "#ef4444"], [1, "#f8fafc"]] as const) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(tailX, 0);
    ctx.lineTo(tailX + fl * 0.35, side * flip * fw);
    ctx.lineTo(tailX + fl, side * flip * fw * 0.35);
    ctx.lineTo(tailX + fl, 0);
    ctx.closePath(); ctx.fill();
  }
  // 오늬 — 꼬리의 작은 금빛 마디
  ctx.fillStyle = "#fbbf24"; ctx.fillRect(tailX - 1, -1.2, 2.4, 2.4);
  // 촉 — 강철, 가운데 날 하이라이트
  ctx.fillStyle = "#e2e8f0"; ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 1; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(headX, 0); ctx.lineTo(headX - head, -head * 0.42); ctx.lineTo(headX - head * 0.78, 0); ctx.lineTo(headX - head, head * 0.42); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(headX - 1, 0); ctx.lineTo(headX - head * 0.75, 0); ctx.stroke();
}

/**
 * 리커브 활 — 손잡이가 원점, 활 몸은 y 축(위아래 날개), 시위는 뒤(−x). pull 0~1 만큼 시위를 당기고 날개가 휜다.
 * release 1→0 은 놓은 직후(시위 떨림·반동·번쩍임). ready 는 다 당겨 쏘기 직전(촉이 빛난다)
 */
export function drawRecurveBow(ctx: CanvasRenderingContext2D, L: number, pull: number, release: number, ready: boolean): void {
  const half = L / 2;
  const flex = pull * L * 0.07;                    // 당길수록 날개 끝이 뒤로
  const tipX = -L * 0.05 - flex, tipY = half * (0.95 - pull * 0.04);
  const restX = tipX + L * 0.02;                   // 시위가 쉬는 자리
  const nockX = restX - pull * L * 0.46;
  const twang = release > 0 ? Math.sin((1 - release) * 42) * release * L * 0.1 : 0;
  // 시위 — 당겼을 땐 메긴 자리로 꺾이고, 놓은 뒤엔 떨린다
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(241,245,249,0.95)"; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(tipX, -tipY); ctx.lineTo(release > 0 ? restX + twang : nockX, 0); ctx.lineTo(tipX, tipY); ctx.stroke();
  // 날개 — 손잡이에서 앞으로 부풀었다가 끝에서 뒤로, 맨 끝은 다시 앞으로 말린다(리커브)
  const limb = (s: 1 | -1) => {
    ctx.moveTo(L * 0.05, s * L * 0.08);
    ctx.bezierCurveTo(L * 0.17, s * half * 0.38, L * 0.1 - flex * 0.5, s * half * 0.8, tipX, s * tipY);
    ctx.quadraticCurveTo(tipX + L * 0.01, s * (tipY + L * 0.05), tipX + L * 0.09, s * (tipY + L * 0.06));
  };
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#2a1708"; ctx.lineWidth = 5.4;
  ctx.beginPath(); limb(-1); limb(1); ctx.stroke();
  const wood = ctx.createLinearGradient(0, -half, 0, half);
  wood.addColorStop(0, "#7c2d12"); wood.addColorStop(0.3, "#c2410c"); wood.addColorStop(0.5, "#fbbf24"); wood.addColorStop(0.7, "#c2410c"); wood.addColorStop(1, "#7c2d12");
  ctx.strokeStyle = wood; ctx.lineWidth = 3.2;
  ctx.beginPath(); limb(-1); limb(1); ctx.stroke();
  ctx.strokeStyle = "rgba(254,243,199,0.55)"; ctx.lineWidth = 0.9;   // 결 하이라이트
  ctx.beginPath(); limb(-1); limb(1); ctx.stroke();
  // 금 장식 끝
  ctx.fillStyle = "#fcd34d";
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(tipX + L * 0.09, s * (tipY + L * 0.06), 1.8, 0, Math.PI * 2); ctx.fill(); }
  // 손잡이 — 가죽 감개 + 금 띠 + 청록 보석(주인공 색)
  ctx.fillStyle = "#5b1a12"; ctx.fillRect(L * 0.01, -L * 0.1, L * 0.09, L * 0.2);
  ctx.fillStyle = "#fbbf24"; ctx.fillRect(L * 0.01, -L * 0.11, L * 0.09, 1.4); ctx.fillRect(L * 0.01, L * 0.1 - 0.4, L * 0.09, 1.4);
  ctx.shadowColor = "#2dd4bf"; ctx.shadowBlur = ready ? 10 : 4;
  ctx.fillStyle = ready ? "#99f6e4" : "#2dd4bf";
  ctx.beginPath(); ctx.arc(L * 0.055, 0, 1.9, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  // 메긴 화살 — 당기는 동안. 다 당기면 촉이 빛난다
  if (release <= 0 && pull > 0.04) {
    const len = L * 0.98;
    drawWoodArrow(ctx, nockX, len);
    if (ready) {
      const hx = nockX + len;
      const g = ctx.createRadialGradient(hx, 0, 0, hx, 0, 9);
      g.addColorStop(0, "rgba(254,249,195,0.9)"); g.addColorStop(1, "rgba(254,249,195,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, 0, 9, 0, Math.PI * 2); ctx.fill();
    }
  }
  // 놓은 순간 — 활 앞에서 번쩍이고 고리가 퍼지며 바람 선이 앞으로
  if (release > 0) {
    const r = 1 - release;
    const fx = L * 0.3;
    const g = ctx.createRadialGradient(fx, 0, 0, fx, 0, 6 + 10 * release);
    g.addColorStop(0, `rgba(255,255,255,${0.95 * release})`); g.addColorStop(0.5, `rgba(253,230,138,${0.6 * release})`); g.addColorStop(1, "rgba(253,230,138,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, 0, 6 + 10 * release, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(253,230,138,${0.8 * release})`; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(fx, 0, 3 + 6 * r, 5 + 14 * r, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${0.7 * release})`; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const dy of [-6, 0, 6]) { ctx.moveTo(fx + 4 + r * 10, dy); ctx.lineTo(fx + 12 + r * 26, dy * 0.6); }
    ctx.stroke();
  }
}
