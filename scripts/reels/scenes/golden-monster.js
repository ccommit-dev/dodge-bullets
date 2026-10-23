/* 릴스 · 황금 몬스터 — 가끔 나오는 황금 슬라임. 도망가기 전에 연타하면 맞을 때마다 동전이 튀고, 잡으면 잭팟 상자 */
window.RF_SCENE = (() => {
  const HITS = 16, ESCAPE = 7;
  let K;
  function hit(G) {
    if (K.dead || G.phase !== 'play' || K.enter > 0) return;
    K.hits += 1; KIT.attack(K.hero, 0.3); KIT.attack(K.mia, 0.35); KIT.hit(K.gold);
    const g = 1200 + K.hits * 900 + Math.round(Math.random() * 400);
    K.goal += g; G.coins(K.gold.x, 330, 3); G.sfx('coin'); G.punch(0.02);
    G.float(`+${KIT.fmt(g)}G`, K.gold.x + (Math.random() * 50 - 25), 280, '#ffe066', K.hits % 5 === 0 ? 30 : 20, 0.8);
    if (K.hits === 1) G.emit('choice', { hit: 'first' });
    if (K.hits % 5 === 0 && K.hits < HITS) G.stamp(`${K.hits}연타!`, '#ffd23f', 220, 0.7);
    if (K.hits >= HITS) {
      K.dead = true; K.jack = 0; G.impact(2); G.burst(K.gold.x, 330, '#ffd23f', 70, 320);
      G.caption('잭팟 상자!'); G.climax();
    }
  }
  return {
    id: 'golden-monster',
    introDur: 1.5,
    hook: ['황금 몬스터 출현!', '도망가기 전에 연타!'],
    caption0: '황금 슬라임을 마구 탭!',
    climaxStamp: '잭팟!!', raysAt: [270, 330],
    endLines: ['가끔 나타나는 황금 몬스터', '잡으면 골드 폭탄 · 잭팟 상자'],
    init() {
      K = { hits: 0, dead: false, left: ESCAPE, enter: 0.6, gold0: 0, goal: 0, shown: 0, jack: -1, auto: 0,
        hero: { id: 'hero', x: 110, y: 420, s: 1, mode: 'idle', mt: 0 }, mia: { id: 'mia', x: 48, y: 430, s: 0.9, mode: 'idle', mt: 0, phase: 0.3 },
        gold: { id: 'slime', x: 270, y: 420, s: 1.25, mode: 'idle', mt: 0 } };
    },
    onTap(G, x, y) { if (y > 56 && y < 580) { hit(G); G.hint(null); } return true; },
    onKey(G) { hit(G); },
    update(G, dt) {
      for (const u of [K.hero, K.mia, K.gold]) KIT.tick(u, dt);
      K.enter = Math.max(0, K.enter - dt);
      K.shown += (K.goal - K.shown) * Math.min(1, dt * 8);   // 골드 숫자가 굴러 오른다
      if (!K.dead && G.phase === 'play' && K.enter <= 0) K.left = Math.max(1.2, K.left - dt);
      if (K.dead && K.jack >= 0) {
        K.jack += dt;
        if (K.jack > 0.9 && !K.opened) { K.opened = true; K.goal += 250000; G.coins(270, 360, 50); G.flash('#fff3a0', 0.25); G.sfx('legend'); G.pop('황금 몬스터 처치', '잭팟 +250,000G', '강화석 +30 · 보석 +20', 'gold', 2.4); G.finish(2.6); }
      }
      if (G.phase === 'play' && G.idle > 1.2 && !K.dead) { G.hint(K.gold.x, 330); K.auto += dt; if (K.auto > 0.15) { K.auto = 0; hit(G); } } else K.auto = 0;
    },
    draw(G, ctx) {
      KIT.stage(G, ctx, 'bg:meadow');
      // 위: 골드 계기 · 도망 타이머
      G.rr(70, 60, 220, 40, 14, 'rgba(27,18,11,.86)', '#ffd23f', 3);
      G.text(`💰 ${KIT.fmt(K.shown)} G`, 180, 81, { size: 22, color: '#ffe066' });
      if (!K.dead) { G.bar(80, 108, 200, 14, K.left / ESCAPE, K.left > 3 ? '#22c55e' : '#ef4444'); G.text(`도망까지 ${K.left.toFixed(1)}초`, 180, 134, { size: 13, color: '#fff3d0', stroke: '#2a1606', sw: 4 }); }
      KIT.unit(G, K.mia, G.t); KIT.unit(G, K.hero, G.t);
      if (!K.dead || K.jack < 0.25) {
        // 황금 슬라임 — 늘 금빛으로 빛나고 반짝이가 돈다
        const g = K.gold, wob = Math.sin(G.t * 9) * 0.04, enter = 1 - K.enter / 0.6;
        ctx.save(); ctx.globalAlpha = 0.5; const rg = ctx.createRadialGradient(g.x, 360, 10, g.x, 360, 110); rg.addColorStop(0, 'rgba(255,215,64,.7)'); rg.addColorStop(1, 'rgba(255,215,64,0)'); ctx.fillStyle = rg; ctx.fillRect(g.x - 120, 240, 240, 220); ctx.restore();
        KIT.unit(G, { ...g, s: g.s * (0.6 + 0.4 * enter) * (1 + wob), flash: Math.max(0.5, g.flash || 0), flashC: '#ffd23f', alpha: K.dead ? 1 - K.jack * 4 : 1 }, G.t);
        for (let i = 0; i < 6; i++) { const a = G.t * 2 + i; G.text('✦', g.x + Math.cos(a) * 70, 330 + Math.sin(a) * 50, { size: 14 + (i % 3) * 4, color: '#fff7cf', alpha: 0.8 }); }
      }
      if (K.dead && K.jack >= 0) {
        const k = Math.min(1, K.jack / 0.5), shake = K.opened ? 0 : Math.sin(G.t * 40) * 4;
        G.sprite('chest', 270 + shake, 420, { s: 0.6 + 0.6 * k });
      }
      // 아래 판
      G.text(`탭 ${K.hits}/${HITS}`, 180, 500, { size: 22, color: '#ffe066' });
      G.bar(60, 524, 240, 16, K.hits / HITS, '#ffd23f');
    },
    debug: () => ({ hits: K.hits, gold: Math.round(K.goal) }),
    tapAt: () => [270, 330],
  };
})();
