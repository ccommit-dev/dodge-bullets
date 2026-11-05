/* 릴스 · 황금 몬스터 — 7초 안에 못 잡으면 도망간다(titans/huntMoments GOLDEN_ESCAPE_SEC). 연타하면 맞을 때마다 동전, 잡으면 골드 ×10. 황금은 달아나 자리를 옮긴다 */
window.RF_SCENE = (() => {
  const HITS = 20, ESCAPE = 7, SPOTS = [[250, 400], [120, 372], [270, 346], [170, 410]];
  let K;
  /** 큰 폭발 빛 — { x, y, t, life, r } */
  function drawBlast(ctx, b, c1 = '255,180,60', c2 = '255,90,20') {
    if (!b || b.t >= b.life) return;
    const k = b.t / b.life, r = b.r * (0.2 + k * 1.1), g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
    g.addColorStop(0, `rgba(255,255,255,${1 - k})`); g.addColorStop(0.35, `rgba(${c1},${0.9 * (1 - k)})`); g.addColorStop(1, `rgba(${c2},0)`);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(b.x - r, b.y - r, r * 2, r * 2); ctx.restore();
  }
  /** 카메라 · 흔들림을 빼고 그린다 — 큰 글자가 줌에 밀려 화면 밖으로 나가지 않게 */
  function onScreen(ctx, fn) { ctx.save(); ctx.setTransform(ctx.canvas.width / 360, 0, 0, ctx.canvas.height / 640, 0, 0); fn(); ctx.restore(); }
  const near = (x, y) => Math.abs(x - K.gold.x) < 74 && y > K.gold.y - 150 && y < K.gold.y + 30;
  function hit(G, x, y) {
    if (K.dead || G.over || G.phase !== 'play' || K.enter > 0) return;
    if (x != null && !near(x, y)) { G.float('빗나감', x, y, '#cbd5e1', 15, 0.5); K.combo = 0; G.sfx('tap'); return; }
    K.hits += 1; K.combo += 1; KIT.attack(K.hero, 0.3); KIT.attack(K.mia, 0.35); KIT.hit(K.gold);
    const g = 1200 + K.hits * 900 + Math.round(Math.random() * 400);
    const heat = K.hits / HITS;
    K.goal += g; G.coins(K.gold.x, K.gold.y - 70, 3 + Math.floor(heat * 6)); G.sfx('coin'); G.punch(0.02);
    // 눌렀던 자리가 어긋나지 않게 몬스터를 중심으로 당긴다
    G.zoom(1.03 + heat * 0.11, K.gold.x, K.gold.y - 60, 0.12); G.vignette('#ffd23f', 0.1 + heat * 0.4); G.ring(K.gold.x, K.gold.y - 60, '#ffd23f', 60 + heat * 90, 0.26);
    if (K.hits < HITS) G.float(`+${KIT.fmt(g)}G`, K.gold.x + (Math.random() * 50 - 25), K.gold.y - 120, '#ffe066', K.hits % 5 === 0 ? 40 : 20 + heat * 14, 0.8);
    if (K.hits === 1) G.emit('choice', { hit: 'first' });
    if (K.hits % 5 === 0 && K.hits < HITS) { G.stamp(`${K.hits}연타!`, '#ffd23f', 220, 0.7); K.spot = (K.spot + 1) % SPOTS.length; K.tx = SPOTS[K.spot][0]; K.ty = SPOTS[K.spot][1]; G.caption('자리를 옮겼어요 — 따라 눌러요!'); }
    if (K.hits >= HITS) {
      const bx = K.gold.x, by = K.gold.y - 70;
      K.dead = true; K.jack = 0; K.blast = { x: bx, y: by, t: 0, life: 0.8, r: 460 }; G.impact(3, bx, by); G.burst(bx, by, '#ffd23f', 70, 340); G.burst(bx, by, '#fff3a0', 40, 200);
      K.goal *= 10; G.caption('골드 ×10!'); G.climax(); G.zoom(1.42, bx, by, 1.15); G.rays(bx, by, 2.8); G.flash('#ffd23f', 0.3);
      for (let i = 0; i < 8; i++) G.after(i * 0.13, () => { G.coins(40 + (i % 4) * 93, 500, 10); G.ring(bx, by, i % 2 ? '#fff' : '#ffd23f', 120 + i * 34, 0.45); G.kick((Math.random() - 0.5) * 8, 5); });
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
      K = { blast: null, hits: 0, combo: 0, dead: false, left: ESCAPE, enter: 0.6, goal: 0, shown: 0, jack: -1, opened: false, spot: 0, tx: SPOTS[0][0], ty: SPOTS[0][1], fled: 0,
        hero: { id: 'hero', x: 72, y: 430, s: 0.8, mode: 'idle', mt: 0 }, mia: { id: 'mia', x: 26, y: 438, s: 0.62, mode: 'idle', mt: 0 },
        gold: { id: 'slime', x: 420, y: SPOTS[0][1], s: 1.2, mode: 'idle', mt: 0 } };
    },
    onTap(G, x, y) { if (y > 56 && y < 580) hit(G, x, y); G.hint(null); return true; },
    onKey(G) { hit(G); },
    update(G, dt) {
      for (const u of [K.hero, K.mia, K.gold]) KIT.tick(u, dt);
      if (K.blast) K.blast.t += dt;
      // 처치 뒤엔 금액이 눈앞에서 치솟는다
      K.shown += (K.goal - K.shown) * Math.min(1, dt * (K.dead ? 2.6 : 7));
      if (K.fled > 0) { K.fled += dt; K.gold.x += 520 * dt; return; }
      if (K.enter > 0) { K.enter -= dt; K.gold.x += (K.tx - K.gold.x) * Math.min(1, dt * 7); return; }
      K.gold.x += (K.tx - K.gold.x) * Math.min(1, dt * 9); K.gold.y += (K.ty - K.gold.y) * Math.min(1, dt * 9);
      if (K.dead) {
        K.jack += dt;
        if (K.jack > 0.9 && !K.opened) { K.opened = true; G.coins(90, 500, 26); G.coins(270, 500, 26); G.coinRain(2.2); G.flash('#fff3a0', 0.14); G.sfx('legend'); G.pop('황금 몬스터 처치', '골드 ×10', `${K.left.toFixed(1)}초 남기고 잡았다`, 'gold', 2.6); G.finish(2.8); }
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
      if (!K.dead) G.text(`${KIT.fmt(K.shown)} G`, 180, 116, { size: 28 + (K.hits / HITS) * 10, color: '#ffe066', stroke: '#2a1606', sw: 6 });
      KIT.unit(G, K.mia, G.t); KIT.unit(G, K.hero, G.t);
      if (!K.dead) {
        // 황금 빛 + 그림
        const g = ctx.createRadialGradient(K.gold.x, K.gold.y - 60, 8, K.gold.x, K.gold.y - 60, 92);
        g.addColorStop(0, 'rgba(255,210,63,.55)'); g.addColorStop(1, 'rgba(255,210,63,0)');
        ctx.fillStyle = g; ctx.fillRect(K.gold.x - 100, K.gold.y - 160, 200, 200);
        KIT.unit(G, { ...K.gold, flash: Math.max(K.gold.flash || 0, 0.42), flashC: '#ffd23f' }, G.t);
      }
      drawBlast(ctx, K.blast, '255,220,90', '255,170,30');
      // 큰 금액 — 줌에 밀리지 않게 화면 기준으로
      if (K.dead) {
        const s = `${KIT.fmt(K.shown)} G`, moving = Math.abs(K.goal - K.shown) > K.goal * 0.005, size = Math.min(62, 335 / (s.length * 0.56)) * (moving ? 1 + Math.sin(G.t * 34) * 0.05 : 1);
        onScreen(ctx, () => G.text(s, 180, 262, { size, color: '#ffe066', stroke: '#2a1606', sw: 9 }));
      }
      G.bar(40, 480, 280, 18, K.hits / HITS, '#ffd23f');
      G.text(`${K.hits} / ${HITS} 연타`, 180, 489, { size: 13, color: '#fff', stroke: '#2a1606', sw: 4 });
      G.text('황금 몬스터를 직접 눌러요', 180, 540, { size: 17, color: '#fff3d0' });
    },
    debug: () => ({ hits: K.hits, left: +K.left.toFixed(1), dead: K.dead }),
    bot(G) { if (G.phase !== 'play' || K.dead || K.enter > 0) return null; return { tap: [K.gold.x, K.gold.y - 60] }; },
  };
})();
