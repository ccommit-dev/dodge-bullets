/* 릴스 · 자고 일어났더니 — 밤 11시에 폰을 내려놓고 아침 7시. 비버 원정대는 밤새 사냥했고, 방치 보상 상자를 2배로 받는다 */
window.RF_SCENE = (() => {
  const BASE = { gold: 1240000, exp: 3600, stone: 48, shard: 2 };
  const X2 = { x: 40, y: 470, w: 160, h: 64 }, ONE = { x: 210, y: 470, w: 110, h: 64 };
  let K;
  function take(G, double) {
    if (K.mode !== 'card' || K.ct < 0.8) return;
    K.mode = 'done'; K.double = double; K.mul = double ? 2 : 1; K.dt0 = 0;
    G.emit('choice', { double });
    if (double) { G.stamp('×2!!', '#ffd23f', 130, 1.3); G.impact(1.2); }
    G.coins(180, 300, double ? 50 : 24); G.sfx('legend'); G.climax(); G.finish(2.6);
    G.caption(double ? '광고 한 번에 보상 2배' : '밤새 모은 보상 획득');
  }
  return {
    id: 'idle-wake',
    introDur: 1.5,
    hook: ['폰 내려놓고 8시간', '일어나 보니?'],
    caption0: '밤새 원정대가 사냥 중…',
    climaxStamp: '대박!!', raysAt: [180, 280], stampY: 470,
    endLines: ['꺼 둬도 원정대는 사냥 중', '최대 12시간 방치 보상'],
    init() {
      K = { mode: 'night', clock: 23 * 60, mul: 1, ct: 0, shown: 0, auto: 0, zz: 0,
        hero: { id: 'hero', x: 120, y: 420, s: 1, mode: 'idle', mt: 0 }, mia: { id: 'mia', x: 240, y: 430, s: 0.9, mode: 'idle', mt: 0 }, leon: { id: 'leon', x: 300, y: 432, s: 0.85, mode: 'idle', mt: 0 } };
    },
    onTap(G, x, y) {
      if (G.phase !== 'play') return true;
      if (K.mode === 'night') { K.fast = true; G.speed(0.6); }
      else if (K.mode === 'card') {
        if (x >= X2.x && x <= X2.x + X2.w && y >= X2.y && y <= X2.y + X2.h) take(G, true);
        else if (x >= ONE.x && x <= ONE.x + ONE.w && y >= ONE.y && y <= ONE.y + ONE.h) take(G, false);
      }
      G.hint(null); return true;
    },
    onKey(G) { if (K.mode === 'card') take(G, true); },
    update(G, dt) {
      for (const u of [K.hero, K.mia, K.leon]) KIT.tick(u, dt);
      if (K.mode === 'night') {
        K.clock += dt * (K.fast ? 360 : 200);   // 분 — 2.4초 남짓에 8시간
        K.zz += dt;
        if (Math.floor(K.clock / 60) !== Math.floor((K.clock - dt * 200) / 60)) { KIT.attack(K.mia, 0.4); KIT.attack(K.leon, 0.4); G.coins(270, 360, 2); }
        if (K.clock >= 31 * 60) { K.clock = 31 * 60; K.mode = 'morning'; K.mt = 0; G.flash('#fff7d6', 0.5); G.sfx('win'); G.stamp('아침 7시!', '#ffd23f', 230, 0.9); G.caption('방치 보상이 도착했다'); }
        return;
      }
      if (K.mode === 'morning') { K.mt += dt; if (K.mt > 0.9) { K.mode = 'card'; K.ct = 0; } return; }
      if (K.mode === 'card') {
        K.ct += dt; K.shown += (BASE.gold - K.shown) * Math.min(1, dt * 5);
        if (K.ct > 0.8 && G.idle > 1.3) { G.hint(X2.x + X2.w / 2, X2.y + 32); K.auto += dt; if (K.auto > 0.8) take(G, true); }
        return;
      }
      if (K.mode === 'done') { K.dt0 += dt; K.shown += (BASE.gold * K.mul - K.shown) * Math.min(1, dt * 4); }
    },
    draw(G, ctx) {
      const night = K.mode === 'night';
      KIT.stage(G, ctx, 'bg:meadow');
      if (night) { ctx.fillStyle = 'rgba(10,14,40,.62)'; ctx.fillRect(0, 0, 360, 460); for (let i = 0; i < 18; i++) G.text('·', (i * 53) % 360, 70 + (i * 37) % 160, { size: 22, color: '#fff7cf', alpha: 0.5 + 0.5 * Math.sin(G.t * 3 + i) }); }
      // 시계
      const h = Math.floor(K.clock / 60) % 24, m = Math.floor(K.clock % 60);
      G.rr(110, 62, 140, 46, 16, 'rgba(27,18,11,.86)', night ? '#93c5fd' : '#ffd23f', 3);
      G.text(`${night ? '🌙' : '☀️'} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, 180, 86, { size: 24, color: night ? '#dbeafe' : '#ffe066' });
      // 원정대 — 밤엔 주인공은 자고(Zzz) 동료가 사냥
      KIT.unit(G, K.hero, G.t * (night ? 0.4 : 1));
      if (night) for (let i = 0; i < 3; i++) { const k = ((K.zz * 0.8 + i / 3) % 1); G.text('Z', 140 + k * 30, 300 - k * 60, { size: 14 + i * 5, color: '#dbeafe', alpha: 1 - k }); }
      KIT.unit(G, K.mia, G.t); KIT.unit(G, K.leon, G.t);
      if (night) G.text('사냥 중… 💤', 270, 280, { size: 14, color: '#dbeafe' });
      // 보상 카드
      if (K.mode === 'card' || K.mode === 'done') {
        const k = Math.min(1, (K.mode === 'card' ? K.ct : 1) / 0.35);
        ctx.save(); ctx.translate(180, 300 + (1 - k) * 200); ctx.globalAlpha = k;
        G.rr(-150, -120, 300, 230, 22, '#fff3d6', '#3b2415', 4);
        G.text('방치 보상 · 8시간', 0, -94, { size: 18, color: '#92400e' });
        G.text(`💰 ${KIT.fmt(K.shown)} G`, 0, -50, { size: 30, color: '#3b2415' });
        const rows = [['EXP', BASE.exp], ['강화석', BASE.stone], ['동료 조각', BASE.shard]];
        rows.forEach(([n, v], i) => { G.rr(-130, -18 + i * 38, 260, 30, 10, '#ffe7a3'); G.text(n, -110, -3 + i * 38, { size: 15, color: '#6b4a2f', align: 'left' }); G.text(`+${KIT.fmt(v * K.mul)}`, 110, -3 + i * 38, { size: 17, color: '#3b2415', align: 'right' }); });
        ctx.restore();
      }
      // 아래 단추
      if (K.mode === 'card') {
        const p = 1 + Math.sin(G.t * 6) * 0.05;
        ctx.save(); ctx.translate(X2.x + X2.w / 2, X2.y + 32); ctx.scale(p, p);
        G.rr(-X2.w / 2, -32, X2.w, 64, 18, '#ff8a1f', '#3b2415', 4); G.text('▶ 2배로 받기', 0, -6, { size: 19, color: '#1b1206' }); G.text('광고 보기', 0, 17, { size: 12, color: '#3b2415' }); ctx.restore();
        G.rr(ONE.x, ONE.y, ONE.w, ONE.h, 18, 'rgba(255,255,255,.1)', 'rgba(255,255,255,.4)', 2); G.text('받기', ONE.x + ONE.w / 2, ONE.y + 32, { size: 18, color: '#fff' });
      } else if (night) G.text('탭하면 시간이 더 빨리 흘러요', 180, 520, { size: 15, color: '#dbeafe' });
    },
    debug: () => ({ mode: K.mode, mul: K.mul }),
    tapAt: () => (K.mode === 'card' ? [X2.x + X2.w / 2, X2.y + 32] : [180, 300]),
  };
})();
