/* 릴스 2 · 번개 탭 — 탭할수록 고리가 차고, 10번째 탭마다 대장 머리 위로 번개(×6). 대장을 쓰러뜨리면 번개 강화 줄 */
window.RF_SCENE = (() => {
  const BOSS_HP = 760, EVERY = 10, BTN = { x: 110, y: 474, w: 140, h: 96 };
  let K;
  function strike(G) {
    K.taps += 1; K.ring += 1;
    KIT.attack(K.hero, 0.36); G.sfx('tap');
    let dmg = 18 * (0.9 + Math.random() * 0.25);
    K.boss.mode === 'idle' && KIT.hit(K.boss);
    if (K.ring >= EVERY) {
      K.ring = 0; K.bolts += 1; K.boltT = 0.55;
      dmg += 18 * 6; G.flash('#fff6c4', 0.2); G.impact(1.5); G.sfx('bolt'); G.stamp('⚡ 번개!!', '#ffe066', 220, 0.8); G.speed(0.5);
      G.float('⚡ 번개 ×6!', 270, 210, '#ffe066', 30, 1.1);
      G.caption(K.bolts === 1 ? '10번째 탭 = 번개!' : `번개 ${K.bolts}번째`);
      if (K.bolts === 1) G.emit('choice', { bolt: 1 });
    } else G.sfx('hit');
    K.hp = Math.max(0, K.hp - dmg);
    G.float(KIT.fmt(dmg), 270 + (Math.random() * 40 - 20), 290, dmg > 60 ? '#ffd23f' : '#fff', dmg > 60 ? 34 : 22);
    if (K.hp <= 0 && !K.dead) {
      K.dead = true; G.climax(); G.sfx('win'); G.burst(270, 320, '#ffd23f', 60, 300); G.impact(2); G.coins(270, 320, 30);
      G.pop('번개 강화', 'Lv.1 → Lv.5', '탭 피해 +12% → +60% · 번개 ×4.5 → ×6.5', 'gold', 2.4);
      G.caption('오우거 처치!'); G.finish(2.4);
    }
  }
  return {
    id: 'lightning-tap',
    introDur: 1.5,
    hook: ['10번째 탭마다', '⚡ 번개가 떨어진다'],
    climaxStamp: 'K.O.!!', raysAt: [270, 320],
    caption0: '아래 단추를 연타!',
    endLines: ['탭 한 번 한 번이 쌓여 번개로', '번개 강화 줄은 따로 성장'],
    init(G) {
      K = { taps: 0, ring: 0, bolts: 0, boltT: 0, hp: BOSS_HP, dead: false, auto: 0,
        hero: { id: 'hero', x: 96, y: 420, s: 1, mode: 'idle', mt: 0 }, boss: { id: 'armored-ogre', x: 270, y: 420, s: 1, mode: 'idle', mt: 0 } };
    },
    onTap(G, x, y) {
      if (G.phase !== 'play') return true;
      if (y > 56) { strike(G); G.hint(null); }
      return true;
    },
    onKey(G) { if (G.phase === 'play') strike(G); },
    update(G, dt) {
      KIT.tick(K.hero, dt); KIT.tick(K.boss, dt);
      K.boltT = Math.max(0, K.boltT - dt);
      if (K.dead) { K.boss.alpha = Math.max(0, (K.boss.alpha ?? 1) - dt * 0.8); return; }
      if (G.phase === 'play' && G.idle > 1.4) { G.hint(BTN.x + BTN.w / 2, BTN.y + BTN.h / 2); K.auto += dt; if (K.auto > 0.16) { K.auto = 0; strike(G); } } else K.auto = 0;
    },
    draw(G, ctx) {
      KIT.stage(G, ctx, 'bg:forest');
      KIT.bossBar(G, '대장 · 갑옷 오우거', K.hp / BOSS_HP);
      KIT.unit(G, K.hero, G.t);
      KIT.unit(G, K.boss, G.t);
      if (K.boltT > 0) {   // 번개 — 위에서 대장 머리로 꺾여 내려온다
        const k = K.boltT / 0.55;
        ctx.save(); ctx.globalAlpha = Math.min(1, k * 2); ctx.lineJoin = 'round';
        const pts = [[262, 56], [282, 140], [256, 170], [284, 250], [264, 280], [272, 330]];
        for (const [w, c] of [[16, 'rgba(255,214,60,.55)'], [8, '#ffe066'], [3, '#fff']]) {
          ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.lineWidth = w; ctx.strokeStyle = c; ctx.stroke();
        }
        ctx.beginPath(); ctx.ellipse(272, 335, 60 * (1.2 - k * 0.4), 18, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,240,160,.6)'; ctx.fill();
        ctx.restore();
      }
      // 아래: 탭 단추 + 번개 고리
      const r = K.ring / EVERY;
      ctx.save(); ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(180, 522, 50, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(180, 522, 50, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * r); ctx.strokeStyle = '#ffd23f'; ctx.stroke(); ctx.restore();
      const press = K.hero.mode === 'attack' && K.hero.mt < 0.08 ? 0.92 : 1;
      ctx.save(); ctx.translate(180, 522); ctx.scale(press, press);
      G.rr(-40, -40, 80, 80, 40, '#ff8a1f', '#3b2415', 4); G.text('탭!', 0, 2, { size: 26, color: '#1b1206' }); ctx.restore();
      G.text(`번개까지 ${EVERY - K.ring}탭`, 300, 500, { size: 14, color: '#ffe08a' });
      G.text(`⚡ ${K.bolts}`, 60, 500, { size: 20, color: '#ffe066' });
      G.text('탭 피해 +12%', 60, 528, { size: 12, color: '#f5d9a8' });
    },
    debug: () => ({ taps: K.taps, bolts: K.bolts, hp: Math.round(K.hp) }),
    tapAt: () => [180, 522],
  };
})();
