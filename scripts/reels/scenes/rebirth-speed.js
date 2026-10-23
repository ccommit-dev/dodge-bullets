/* 릴스 · 환생 질주 — STAGE 30 대장에 꽉 막힘(DPS 벽) → 환생 → 출발 골드 · 결정으로 1층부터 질주해 예전 최고 기록을 뚫는다 */
window.RF_SCENE = (() => {
  const BTN = { x: 70, y: 476, w: 220, h: 64 };
  let K;
  function rebirth(G) {
    if (K.mode !== 'wall') return;
    K.mode = 'flash'; K.ft = 0; G.flash('#ffffff', 0.5); G.sfx('legend'); G.stamp('환생!!', '#c084fc', 260, 1);
    G.emit('choice', { rebirth: true }); G.caption('결정 +16 · 출발 골드 · 24시간 방치 2배');
  }
  return {
    id: 'rebirth-speed',
    introDur: 1.5,
    hook: ['30층에서 꽉 막혔다?', '환생하면 질주'],
    caption0: '대장이 꿈쩍도 안 한다…',
    climaxStamp: '신기록!!', raysAt: [180, 200],
    endLines: ['막히면 환생 · 더 빠르게 다시', '결정 · 진화 · 대장 사다리는 그대로'],
    init() {
      K = { mode: 'wall', wt: 0, hp: 1, stage: 30, run: 0, auto: 0, ft: 0, tapBoost: 0, passed: false,
        hero: { id: 'hero', x: 110, y: 420, s: 1, mode: 'idle', mt: 0 }, boss: { id: 'armored-ogre', x: 274, y: 420, s: 1, mode: 'idle', mt: 0 }, mons: [] };
    },
    onTap(G, x, y) {
      if (G.phase !== 'play') return true;
      if (K.mode === 'wall' && K.wt > 2.2 && y > 440) rebirth(G);
      else if (K.mode === 'run') { K.tapBoost = 0.35; G.punch(0.015); }
      G.hint(null); return true;
    },
    onKey(G) { if (K.mode === 'wall' && K.wt > 2.2) rebirth(G); else if (K.mode === 'run') K.tapBoost = 0.35; },
    update(G, dt) {
      KIT.tick(K.hero, dt); KIT.tick(K.boss, dt);
      if (K.mode === 'wall') {
        K.wt += dt;
        if (Math.floor(K.wt / 0.5) !== Math.floor((K.wt - dt) / 0.5)) { KIT.attack(K.hero, 0.3); KIT.hit(K.boss); K.hp = Math.max(0.93, K.hp - 0.004); G.float('1', 270, 300, '#aaa', 16, 0.6); }
        if (K.wt > 1.6 && !K.walled) { K.walled = true; G.stamp('DPS 벽…', '#fca5a5', 230, 1); G.shake(6, 0.3); G.caption('아무리 때려도 1, 1, 1…'); }
        if (K.wt > 2.2 && G.idle > 1.2) { G.hint(180, BTN.y + 32); K.auto += dt; if (K.auto > 0.9) rebirth(G); }
        return;
      }
      if (K.mode === 'flash') { K.ft += dt; if (K.ft > 1) { K.mode = 'run'; K.stage = 1; G.caption('탭하면 더 빨리!'); G.speed(9); } return; }
      if (K.mode === 'run') {
        K.tapBoost = Math.max(0, K.tapBoost - dt);
        if (G.idle > 1) { K.auto += dt; if (K.auto > 0.25) { K.auto = 0; K.tapBoost = 0.3; } }
        const rate = 6 + K.stage * 0.25 + (K.tapBoost > 0 ? 10 : 0);   // 층/초 — 점점 빨라진다
        K.run += dt * rate;
        if (K.run >= 1) {
          const n = Math.floor(K.run); K.run -= n; K.stage += n;
          KIT.attack(K.hero, 0.18); G.burst(300, 340, '#ffd23f', 6, 160);
          if (K.stage % 5 === 0) { G.coins(300, 330, 4); G.float(`STAGE ${K.stage}`, 250, 260, '#fff', 20, 0.6); }
          if (!K.passed && K.stage > 30) { K.passed = true; G.climax(); G.pop('환생 1회', '예전 최고 30층 돌파!', '같은 시간에 2배 더 높이', 'purple', 2.2); G.caption('벽을 뚫었다'); }
          if (K.stage >= 45) { K.stage = 45; K.mode = 'done'; G.finish(2); }
        }
      }
      if (K.mode === 'done' || K.passed) K.speedKeep = true;
    },
    draw(G, ctx) {
      KIT.stage(G, ctx, K.mode === 'wall' ? 'bg:ruins' : 'bg:forest');
      if (K.mode !== 'wall') {   // 질주 — 배경이 빨리 흐르는 느낌(가로 줄)
        ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff';
        for (let i = 0; i < 12; i++) { const y = 120 + i * 26, x = ((i * 97 - G.t * 900) % 420 + 420) % 420 - 60; ctx.fillRect(x, y, 70, 3); }
        ctx.restore();
      }
      // 층 계기
      const big = K.mode === 'run' || K.mode === 'done';
      G.rr(90, 60, 180, 52, 16, 'rgba(27,18,11,.86)', big ? '#c084fc' : '#ef4444', 3);
      G.text(`STAGE ${K.stage}`, 180, 87, { size: big ? 30 : 26, color: big ? '#f0abfc' : '#fca5a5' });
      G.text('이전 최고 30층', 180, 126, { size: 13, color: '#fff3d0', stroke: '#2a1606', sw: 4 });
      if (K.mode === 'wall' || K.mode === 'flash') { KIT.bossBar(G, '대장 · 30층 갑옷 오우거', K.hp, 140); KIT.unit(G, K.boss, G.t); }
      KIT.unit(G, { ...K.hero, mode: K.mode === 'run' ? 'walk' : K.hero.mode }, G.t);
      if (K.mode === 'wall') {
        const ready = K.wt > 2.2, p = ready ? 1 + Math.sin(G.t * 6) * 0.05 : 1;
        ctx.save(); ctx.translate(180, BTN.y + 32); ctx.scale(p, p);
        G.rr(-110, -32, 220, 64, 18, ready ? '#a855f7' : 'rgba(255,255,255,.08)', '#3b2415', 4);
        G.text(ready ? '환생하기 ✦' : '…', 0, -6, { size: 22, color: '#fff' });
        G.text('결정 +16 · 출발 골드', 0, 18, { size: 12, color: '#f5e1ff' });
        ctx.restore();
      } else {
        G.text('환생 1회 · 방치 2배 · 결정 +16', 180, 500, { size: 15, color: '#f0abfc' });
        G.bar(60, 524, 240, 16, Math.min(1, K.stage / 45), '#c084fc');
        G.text(`${K.stage} / 45`, 180, 556, { size: 13, color: '#fff3d0' });
      }
    },
    debug: () => ({ mode: K.mode, stage: K.stage }),
    tapAt: () => (K.mode === 'wall' ? [180, BTN.y + 32] : [180, 300]),
  };
})();
