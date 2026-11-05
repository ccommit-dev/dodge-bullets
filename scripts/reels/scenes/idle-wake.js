/* 릴스 · 자고 일어났더니 — 시계 바늘을 끌어 밤 11시에서 앞으로 돌린다. 돌린 만큼 보상이 쌓이고 비버들이 사냥한다. 8시간(progression/idle.ts hoursBase)에서 멈추고, 성문 방어 · 출석으로 키운 듯 '방치 시간 늘리기' 를 누르면 14시간(hoursCap)까지.
 * 끝나면 '그냥 받기' / '광고 보고 2배'(ads/rewarded.ts idleDouble · 2배는 골드만, TitansGame claimIdle goldMult). 질 수 없는 편 — 6초 손을 안 대면 그때까지 쌓인 만큼 그냥 받기로 끝난다.
 * 보상 칸 이름은 computeIdleYield 그대로(골드 · EXP · 강화석 · 동료 조각). 양은 스테이지마다 달라 금액을 지어내지 않고 '몇 시간치' 로만 말한다 */
window.RF_SCENE = (() => {
  const BASE_H = 8, CAP_H = 14, RATE = 1.6, LEAD = 1.5, IDLE_END = 6;   // RATE = 바늘이 초당 따라가는 시간 · LEAD = 손가락이 앞설 수 있는 한도 — 한 번 휙 돌리고 놓으면 곧 멈춘다
  const CX = 180, CY = 204, R = 86;
  const EXT = { x: 50, y: 504, w: 260, h: 68 };
  const X2 = { x: 30, y: 470, w: 180, h: 66 }, ONE = { x: 220, y: 470, w: 110, h: 66 };
  const inR = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const handAt = (h) => -Math.PI / 2 + ((23 + h) * Math.PI) / 6;
  let K;
  function take(G, double) {
    if (K.mode !== 'card' || K.ct < 0.5) return;
    K.mode = 'done'; K.mul = double ? 2 : 1;
    if (double) {
      K.fall = 0.01;
      G.stamp('골드 ×2!!', '#ffd23f', 396, 1.5); G.impact(2.4, 180, 240); G.coins(50, 470, 24); G.coins(310, 470, 24); G.sfx('legend'); G.climax(); G.finish(3.6); G.zoom(1.14, 180, 240, 1.3); G.coinRain(3.5); G.flash('#ffd23f', 0.34); G.rays(180, 240, 3.2); G.vignette('#ffd23f', 1); G.speed(1.8);
      for (let i = 0; i < 14; i++) G.after(i * 0.17, () => { G.coins(i % 2 ? 20 + Math.random() * 60 : 280 + Math.random() * 60, 120, 8); if (i % 3 === 0) G.ring(180, 240, '#ffd23f', 150 + i * 16, 0.42); });
      G.caption('광고 한 번에 골드 2배');
    } else { G.coins(180, 300, 18); G.sfx('coin'); G.finish(1.8); G.caption('골드 그대로 — 광고면 2배였어요'); }
  }
  /** 6초 손을 안 대면 — 가장 약한 결과. 쌓인 만큼만 그냥 받기 */
  function giveUp(G) {
    K.mode = 'done'; K.quit = true; K.mul = 1; G.hint(null);
    if (K.h > 0.05) { G.coins(180, 300, 8); G.sfx('coin'); G.pop('그냥 받기', `${K.h.toFixed(1)}시간치 보상`, '광고 2배는 안 봄', 'green', 1.3); G.caption('그냥 받기로 끝'); }
    else { G.pop('아직 밤 11시', '쌓인 보상 없음', '바늘을 돌려야 시간이 가요', 'purple', 1.3); G.caption('바늘을 안 돌렸어요'); }
    G.finish(1.3);
  }
  function hunt(G, step) {
    const much = K.h / CAP_H, tip = handAt(K.h);
    KIT.attack(K.mia, 0.4); KIT.attack(K.leon, 0.4); KIT.hit(K.mob); G.coins(K.mob.x, K.mob.y - 40, 2 + Math.floor(much * 8));
    G.coins(CX + Math.cos(tip) * (R - 24), CY + Math.sin(tip) * (R - 24), 1 + Math.floor(much * 4));
    // 한 시간마다 시계가 울린다 — 시계를 중심으로 당겨 돌리는 손이 어긋나지 않는다
    if (step % 2 === 0) { G.ring(CX, CY, '#ffd23f', R + 30 + much * 50, 0.34); G.zoom(1.03 + much * 0.05, CX, CY, 0.12); G.vignette('#ffd23f', 0.1 + much * 0.35); }
    if (step % 4 === 0) { G.burst(K.mob.x, K.mob.y - 40, '#fde68a', 14, 160); K.mob.id = K.mob.id === 'slime' ? 'goblin' : 'slime'; K.mob.flash = 0.8; }
  }
  return {
    id: 'idle-wake',
    introDur: 1.5,
    hook: ['폰 내려놓고 8시간', '일어나 보니?'],
    caption0: '시계 바늘을 끌어 앞으로 돌려요',
    climaxStamp: '대박!!', raysAt: [180, 280], stampY: 470,
    endLines: ['꺼 둬도 원정대는 사냥 중', '방치 보상 기본 8시간 · 키우면 14시간까지'],
    init() {
      K = { fall: 0, heap: 0, mode: 'wind', cap: BASE_H, h: 0, target: 0, ang: null, mul: 1, ct: 0, mt: 0, zz: 0, step: 0, chosen: false, capped: false, quit: false, botA: 0, wob: 0,
        hero: { id: 'hero', x: 52, y: 450, s: 0.72, mode: 'idle', mt: 0 }, mia: { id: 'mia', x: 136, y: 452, s: 0.66, mode: 'idle', mt: 0 }, leon: { id: 'leon', x: 206, y: 454, s: 0.62, mode: 'idle', mt: 0, phase: 0.4 },
        mob: { id: 'slime', x: 300, y: 452, s: 0.68, mode: 'idle', mt: 0 } };
    },
    onTap(G, x, y) {
      if (G.phase !== 'play') return true;
      if (K.mode === 'wind') {
        K.ang = null;
        if (K.capped && K.cap === BASE_H && inR(EXT, x, y)) {
          K.cap = CAP_H; K.capped = false; G.sfx('merge'); G.stamp('14시간까지!', '#ffd23f', 330, 0.9); G.punch(0.05); G.flash('#fff3a0', 0.18); G.ring(CX, CY, '#ffd23f', 190, 0.42); G.zoom(1.1, CX, CY, 0.25); G.coins(CX, CY, 24); G.caption('14시간까지 더 돌려요'); G.hint(null);
          return true;
        }
        return Math.hypot(x - CX, y - CY) < R + 50;
      }
      if (K.mode === 'card') {
        if (inR(X2, x, y)) take(G, true);
        else if (inR(ONE, x, y)) take(G, false);
        G.hint(null); return true;
      }
      return true;
    },
    onDrag(G, x, y) {
      if (G.phase !== 'play' || K.mode !== 'wind') return true;
      const r = Math.hypot(x - CX, y - CY);
      if (r > R + 50) { K.ang = null; return false; }
      if (r < 16) return true;
      const a = Math.atan2(y - CY, x - CX);
      if (K.ang != null) {
        let d = a - K.ang;
        if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2;
        if (d > 0) {
          K.target = Math.min(K.cap, K.h + LEAD, K.target + (Math.min(d, 0.9) * 6) / Math.PI);
          if (!K.chosen) { K.chosen = true; G.emit('choice', { clock: 'wind' }); G.sfx('tap'); }
          if (K.capped) K.wob = 0.3;   // 8시간에서 막혔다 — 바늘이 떤다
        }
      }
      K.ang = a; G.hint(null);
      return true;
    },
    onRelease() { K.ang = null; },
    onKey(G) { if (K.mode === 'card') take(G, true); },
    update(G, dt) {
      for (const u of [K.hero, K.mia, K.leon, K.mob]) KIT.tick(u, dt);
      K.zz += dt; K.wob = Math.max(0, K.wob - dt);
      if (K.fall > 0) { K.fall += dt; K.heap = Math.min(1, K.heap + dt * 0.55); }
      if (K.mode === 'done' || G.phase !== 'play' || G.over) return;
      if (G.idle > IDLE_END) { giveUp(G); return; }
      if (K.mode === 'wind') {
        const was = K.h;
        K.h = Math.min(K.target, K.h + RATE * dt);
        if (K.h >= K.cap - 1e-6) K.h = K.cap;
        // 바늘이 도는 동안 동전이 내린다 — 오래 돌릴수록 굵게
        if (K.h > was && Math.random() < 0.12 + (K.h / CAP_H) * 0.5) G.coinRain(0.02);
        const step = Math.floor(K.h * 2);
        if (step !== K.step) { K.step = step; hunt(G, step); }
        if (K.h >= K.cap) {
          if (K.cap === BASE_H && !K.capped) { K.capped = true; G.sfx('fail'); G.shake(4, 0.2); G.flash('#fff7d6', 0.25); G.stamp('8시간 멈춤!', '#ffd23f', 330, 1); G.ring(CX, CY, '#ef4444', 170, 0.4); G.vignette('#ef4444', 0.5); G.caption('기본 8시간 끝 — 시간을 늘려요'); }
          else if (K.cap === CAP_H) { K.mode = 'morning'; K.mt = 0; G.flash('#fff7d6', 0.5); G.sfx('win'); G.stamp('낮 1시!', '#ffd23f', 330, 0.9); G.coins(180, 200, 40); G.coinRain(0.9); G.ring(CX, CY, '#fff', 210, 0.45); G.caption('방치 보상이 도착했다'); }
        }
        if (G.idle > 1) {
          if (K.capped) G.hint(EXT.x + EXT.w / 2, EXT.y + 40);
          else { const a = handAt(K.h) + ((G.t * 0.9) % 1) * 1.1; G.hint(CX + Math.cos(a) * (R - 18), CY + Math.sin(a) * (R - 18)); }
        } else G.hint(null);
        return;
      }
      if (K.mode === 'morning') { K.mt += dt; if (K.mt > 0.7) { K.mode = 'card'; K.ct = 0; G.caption('광고 보고 2배? 그냥 받기?'); } return; }
      if (K.mode === 'card') {
        K.ct += dt;
        if (K.ct > 0.5 && G.idle > 1) G.hint(X2.x + X2.w / 2, X2.y + 36); else G.hint(null);
      }
    },
    draw(G, ctx) {
      const windMode = K.mode === 'wind' || K.mode === 'morning', night = K.h < BASE_H, nf = 1 - Math.min(1, K.h / BASE_H);
      KIT.stage(G, ctx, 'bg:meadow');
      if (nf > 0) {
        ctx.fillStyle = `rgba(10,14,40,${0.62 * nf})`; ctx.fillRect(0, 0, 360, 458);
        for (let i = 0; i < 18; i++) G.text('·', (i * 53) % 360, 70 + (i * 37) % 160, { size: 22, color: '#fff7cf', alpha: (0.5 + 0.5 * Math.sin(G.t * 3 + i)) * nf });
      }
      // 숫자 시계
      const min = (23 * 60 + K.h * 60) % (24 * 60), hh = Math.floor(min / 60), mm = Math.floor(min % 60);
      G.rr(104, 50, 152, 40, 16, 'rgba(27,18,11,.86)', night ? '#93c5fd' : '#ffd23f', 3);
      G.text(`${night ? '🌙' : '☀️'} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, 180, 71, { size: 22, color: night ? '#dbeafe' : '#ffe066' });
      // 바늘 시계
      if (windMode) {
        const wob = K.wob > 0 ? Math.sin(G.t * 60) * 0.05 : 0, ha = handAt(K.h) + wob;
        ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.fillStyle = 'rgba(27,18,11,.88)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = night ? '#93c5fd' : '#ffd23f'; ctx.stroke();
        // 쌓인 시간 호 — 12시간을 넘으면 안쪽에 한 바퀴 더
        ctx.lineCap = 'round'; ctx.lineWidth = 8;
        if (K.h > 0.02) { ctx.strokeStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(CX, CY, R - 10, handAt(0), handAt(Math.min(12, K.h))); ctx.stroke(); }
        if (K.h > 12) { ctx.strokeStyle = '#ff8a1f'; ctx.beginPath(); ctx.arc(CX, CY, R - 20, handAt(0), handAt(K.h)); ctx.stroke(); }
        ctx.lineCap = 'butt';
        for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(CX + Math.sin(a) * (R - 5) - 1, CY - Math.cos(a) * (R - 5) - 1, 2, 2); }
        for (const [t, n] of [['12', 0], ['3', 3], ['6', 6], ['9', 9]]) { const a = (n * Math.PI) / 6; G.text(t, CX + Math.sin(a) * (R - 32), CY - Math.cos(a) * (R - 32), { size: 15, color: 'rgba(255,255,255,.75)' }); }
        // 상한 눈금 — 8시간(7시 자리) · 14시간(1시 자리)
        const ma = handAt(K.cap);
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(CX + Math.cos(ma) * (R - 18), CY + Math.sin(ma) * (R - 18)); ctx.lineTo(CX + Math.cos(ma) * (R + 4), CY + Math.sin(ma) * (R + 4)); ctx.stroke();
        G.text(`${K.cap}시간`, CX + Math.cos(ma) * (R + 26), CY + Math.sin(ma) * (R + 14), { size: 14, color: '#fecaca', stroke: '#2a1606', sw: 4 });
        // 바늘 · 손잡이
        const tipX = CX + Math.cos(ha) * (R - 24), tipY = CY + Math.sin(ha) * (R - 24);
        ctx.strokeStyle = '#ff8a1f'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(tipX, tipY); ctx.stroke(); ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.arc(CX, CY, 8, 0, Math.PI * 2); ctx.fillStyle = '#3b2415'; ctx.fill();
        ctx.beginPath(); ctx.arc(tipX, tipY, 12 + Math.sin(G.t * 6) * 1.5, 0, Math.PI * 2); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#3b2415'; ctx.stroke();
        G.text(`💰 ${K.h.toFixed(1)}시간치 쌓임`, 180, 314, { size: 24, color: '#ffe066', stroke: '#2a1606', sw: 6 });
      }
      // 원정대 — 주인공은 자고(Zzz) 동료가 사냥
      KIT.unit(G, K.hero, G.t * (night ? 0.4 : 1));
      if (night) for (let i = 0; i < 3; i++) { const k = (K.zz * 0.8 + i / 3) % 1; G.text('Z', 66 + k * 26, 372 - k * 40, { size: 14 + i * 5, color: '#dbeafe', alpha: 1 - k }); }
      KIT.unit(G, K.mia, G.t); KIT.unit(G, K.leon, G.t); KIT.unit(G, K.mob, G.t);
      // 아래 판
      if (windMode) {
        G.bar(30, 472, 300, 24, K.h / K.cap, K.h >= K.cap ? '#ef4444' : '#ffd23f');
        G.text(`방치 ${K.h.toFixed(1)} / ${K.cap}시간`, 180, 484, { size: 14, color: '#fff', stroke: '#2a1606', sw: 4 });
        if (K.capped) {
          const p = 1 + Math.sin(G.t * 6) * 0.04;
          ctx.save(); ctx.translate(EXT.x + EXT.w / 2, EXT.y + EXT.h / 2); ctx.scale(p, p);
          G.rr(-EXT.w / 2, -EXT.h / 2, EXT.w, EXT.h, 18, '#ff8a1f', '#3b2415', 4);
          G.text('방치 시간 늘리기', 0, -9, { size: 21, color: '#1b1206' }); G.text('성문 방어 · 출석으로 14시간까지', 0, 17, { size: 13, color: '#3b2415' });
          ctx.restore();
        } else G.text('↻ 바늘을 시계 방향으로 끌어요', 180, 530, { size: 16, color: '#dbeafe', alpha: 0.75 + Math.sin(G.t * 5) * 0.25 });
      }
      // 금 폭포 — 2배를 고르면 위에서 쏟아져 아래에 쌓인다(카드 뒤로)
      if (K.fall > 0) {
        const k = Math.min(1, K.fall / 0.4), fade = K.fall > 3 ? Math.max(0, 1 - (K.fall - 3) / 0.6) : 1;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 10; i++) { const w = 14 + (i % 3) * 12, x = 18 + i * 36 + Math.sin(G.t * 5 + i) * 7, g = ctx.createLinearGradient(0, 0, 0, 640 * k); g.addColorStop(0, `rgba(255,226,120,${0.75 * fade})`); g.addColorStop(1, `rgba(255,170,30,${0.25 * fade})`); ctx.fillStyle = g; ctx.fillRect(x - w / 2, 0, w, 640 * k); }
        ctx.restore();
        const hh = 18 + K.heap * 84, heap = ctx.createLinearGradient(0, 462 - hh, 0, 470); heap.addColorStop(0, '#ffe680'); heap.addColorStop(1, '#d68b0a');
        ctx.beginPath(); ctx.ellipse(180, 468, 250, hh, 0, Math.PI, 0); ctx.fillStyle = heap; ctx.fill();
        for (let i = 0; i < 26; i++) { const x = 8 + ((i * 53) % 344), lim = 468 - hh * Math.sqrt(Math.max(0, 1 - ((x - 180) / 250) ** 2)), y = lim + 8 + ((i * 29) % 40) * K.heap; if (y < 466) { ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fillStyle = i % 2 ? '#ffd23f' : '#fff0a8'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#a86b06'; ctx.stroke(); } }
      }
      // 보상 카드 — 금액은 스테이지마다 달라 시간으로만 말한다
      if (K.mode === 'card' || (K.mode === 'done' && !K.quit)) {
        const k = Math.min(1, (K.mode === 'card' ? K.ct : 1) / 0.35), hours = Math.round(K.h);
        ctx.save(); ctx.translate(180, 230 + (1 - k) * 200); ctx.globalAlpha = k;
        G.rr(-150, -120, 300, 228, 22, '#fff3d6', '#3b2415', 4);
        G.text(`방치 보상 · ${hours}시간`, 0, -94, { size: 18, color: '#92400e' });
        G.text(`💰 골드 ${hours}시간치${K.mul > 1 ? ' ×2' : ''}`, 0, -56, { size: 25, color: K.mul > 1 ? '#c2410c' : '#3b2415' });
        ['EXP', '강화석', '동료 조각'].forEach((n, i) => { G.rr(-130, -28 + i * 36, 260, 30, 10, '#ffe7a3'); G.text(n, -116, -13 + i * 36, { size: 15, color: '#6b4a2f', align: 'left' }); G.text('✔', 116, -13 + i * 36, { size: 17, color: '#15803d', align: 'right' }); });
        G.text('광고 2배는 골드에만 붙어요', 0, 92, { size: 13, color: '#92400e' });
        ctx.restore();
      }
      if (K.mode === 'card') {
        const p = 1 + Math.sin(G.t * 6) * 0.05;
        ctx.save(); ctx.translate(X2.x + X2.w / 2, X2.y + X2.h / 2); ctx.scale(p, p);
        G.rr(-X2.w / 2, -X2.h / 2, X2.w, X2.h, 18, '#ff8a1f', '#3b2415', 4); G.text('▶ 광고 보고 2배', 0, -9, { size: 19, color: '#1b1206' }); G.text('골드 ×2', 0, 17, { size: 13, color: '#3b2415' });
        ctx.restore();
        G.rr(ONE.x, ONE.y, ONE.w, ONE.h, 18, 'rgba(255,255,255,.1)', 'rgba(255,255,255,.4)', 2); G.text('그냥 받기', ONE.x + ONE.w / 2, ONE.y + ONE.h / 2, { size: 17, color: '#fff' });
      }
    },
    debug: () => ({ mode: K.mode, h: +K.h.toFixed(2), cap: K.cap, capped: K.capped, mul: K.mul }),
    bot(G) {
      if (G.phase !== 'play' || G.over) return null;
      if (K.mode === 'card') return K.ct > 0.6 ? { tap: [X2.x + X2.w / 2, X2.y + X2.h / 2] } : null;
      if (K.mode !== 'wind') return null;
      if (K.capped) return { tap: [EXT.x + EXT.w / 2, EXT.y + EXT.h / 2] };
      // 시계 방향으로 한 칸씩 — 빠르게 돌려도 바늘은 RATE 만큼만 따라온다
      K.botA += 0.25;
      return { drag: [CX + Math.cos(K.botA) * (R - 20), CY + Math.sin(K.botA) * (R - 20)] };
    },
  };
})();
