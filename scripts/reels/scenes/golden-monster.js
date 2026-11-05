/* 릴스 · 황금 몬스터 — 7초 안에 못 잡으면 도망간다(titans/huntMoments GOLDEN_ESCAPE_SEC). 연타하면 맞을 때마다 동전, 잡으면 골드 ×10. 황금은 달아나 자리를 옮긴다 */
window.RF_SCENE = (() => {
  const HITS = 20, ESCAPE = 7, SPOTS = [[250, 400], [120, 372], [270, 346], [170, 410]];
  let K;
  const near = (x, y) => Math.abs(x - K.gold.x) < 74 && y > K.gold.y - 150 && y < K.gold.y + 30;
  function hit(G, x, y) {
    if (K.dead || G.over || G.phase !== 'play' || K.enter > 0) return;
    if (x != null && !near(x, y)) { G.float('빗나감', x, y, '#cbd5e1', 15, 0.5); K.combo = 0; G.sfx('tap'); return; }
    K.hits += 1; K.combo += 1; KIT.attack(K.hero, 0.3); KIT.attack(K.mia, 0.35); KIT.hit(K.gold);
    const g = 1200 + K.hits * 900 + Math.round(Math.random() * 400);
    K.goal += g; G.coins(K.gold.x, K.gold.y - 70, 3); G.sfx('coin'); G.punch(0.02);
    G.float(`+${KIT.fmt(g)}G`, K.gold.x + (Math.random() * 50 - 25), K.gold.y - 120, '#ffe066', K.hits % 5 === 0 ? 30 : 20, 0.8);
    if (K.hits === 1) G.emit('choice', { hit: 'first' });
    if (K.hits % 5 === 0 && K.hits < HITS) { G.stamp(`${K.hits}연타!`, '#ffd23f', 220, 0.7); K.spot = (K.spot + 1) % SPOTS.length; K.tx = SPOTS[K.spot][0]; K.ty = SPOTS[K.spot][1]; G.caption('자리를 옮겼어요 — 따라 눌러요!'); }
    if (K.hits >= HITS) {
      K.dead = true; K.jack = 0; G.impact(2); G.burst(K.gold.x, K.gold.y - 70, '#ffd23f', 70, 320);
      K.goal *= 10; G.caption('골드 ×10!'); G.climax();
    }
  }
  return {
    id: 'golden-monster',
    canLose: true,
    introDur: 1.5,
    hook: ['7초 안에 잡아라!', '황금 몬스터 골드 ×10'],
    caption0: '황금 슬라임을 마구 탭!',
    climaxStamp: '골드 ×10!!', raysAt: [270, 330],
    endLines: ['가끔 나타나는 황금 몬스터', '7초 안에 잡으면 골드 10배'],
    init() {
      K = { hits: 0, combo: 0, dead: false, left: ESCAPE, enter: 0.6, goal: 0, shown: 0, jack: -1, opened: false, spot: 0, tx: SPOTS[0][0], ty: SPOTS[0][1], fled: 0,
        hero: { id: 'hero', x: 72, y: 430, s: 0.8, mode: 'idle', mt: 0 }, mia: { id: 'mia', x: 26, y: 438, s: 0.62, mode: 'idle', mt: 0 },
        gold: { id: 'slime', x: 420, y: SPOTS[0][1], s: 1.2, mode: 'idle', mt: 0 } };
    },
    onTap(G, x, y) { if (y > 56 && y < 580) hit(G, x, y); G.hint(null); return true; },
    onKey(G) { hit(G); },
    update(G, dt) {
      for (const u of [K.hero, K.mia, K.gold]) KIT.tick(u, dt);
      K.shown += (K.goal - K.shown) * Math.min(1, dt * 7);
      if (K.fled > 0) { K.fled += dt; K.gold.x += 520 * dt; return; }
      if (K.enter > 0) { K.enter -= dt; K.gold.x += (K.tx - K.gold.x) * Math.min(1, dt * 7); return; }
      K.gold.x += (K.tx - K.gold.x) * Math.min(1, dt * 9); K.gold.y += (K.ty - K.gold.y) * Math.min(1, dt * 9);
      if (K.dead) {
        K.jack += dt;
        if (K.jack > 0.9 && !K.opened) { K.opened = true; G.coins(K.gold.x, 300, 50); G.flash('#fff3a0', 0.25); G.sfx('legend'); G.pop('황금 몬스터 처치', '골드 ×10', `${K.left.toFixed(1)}초 남기고 잡았다`, 'gold', 2.4); G.finish(2.4); }
        return;
      }
      if (G.over) return;
      K.left = Math.max(0, K.left - dt);
      if (K.left <= 0) { K.fled = 0.01; G.lose('황금 몬스터가 도망갔어요!', [`${K.hits}/${HITS}번 때렸어요`, '7초 안에 더 빠르게 눌러 보세요']); return; }
      if (G.phase === 'play' && G.idle > 0.9) G.hint(K.gold.x, K.gold.y - 70); else G.hint(null);
    },
    draw(G, ctx) {
      KIT.stage(G, ctx, 'bg:meadow');
      KIT.clock(G, K.left, ESCAPE, 66, '도망까지 ');
      G.text(`${KIT.fmt(K.shown)} G`, 180, 116, { size: 28, color: '#ffe066', stroke: '#2a1606', sw: 6 });
      KIT.unit(G, K.mia, G.t); KIT.unit(G, K.hero, G.t);
      if (!K.dead) {
        // 황금 빛 + 그림
        const g = ctx.createRadialGradient(K.gold.x, K.gold.y - 60, 8, K.gold.x, K.gold.y - 60, 92);
        g.addColorStop(0, 'rgba(255,210,63,.55)'); g.addColorStop(1, 'rgba(255,210,63,0)');
        ctx.fillStyle = g; ctx.fillRect(K.gold.x - 100, K.gold.y - 160, 200, 200);
        KIT.unit(G, { ...K.gold, flash: Math.max(K.gold.flash || 0, 0.42), flashC: '#ffd23f' }, G.t);
      }
      G.bar(40, 480, 280, 18, K.hits / HITS, '#ffd23f');
      G.text(`${K.hits} / ${HITS} 연타`, 180, 489, { size: 13, color: '#fff', stroke: '#2a1606', sw: 4 });
      G.text('황금 몬스터를 직접 눌러요', 180, 540, { size: 17, color: '#fff3d0' });
    },
    debug: () => ({ hits: K.hits, left: +K.left.toFixed(1), dead: K.dead }),
    bot(G) { if (G.phase !== 'play' || K.dead || K.enter > 0) return null; return { tap: [K.gold.x, K.gold.y - 60] }; },
  };
})();
