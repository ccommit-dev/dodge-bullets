/* 릴스 · 탈것 — 카드를 누르면 주인공이 그 탈것에 올라탄다. 사냥 골드 증가가 뛰고, 끝은 Lv.10 (titans/mounts) */
window.RF_SCENE = (() => {
  const MOUNTS = [['mount-boar', '도토리 멧돼지', 2, 300], ['mount-deer', '숲 사슴', 3, 600], ['mount-wolf', '은빛 늑대', 4, 1000], ['mount-drake', '불꽃 비룡', 5, 2000]];
  const slot = (i) => ({ x: 20 + i * 82, y: 476, w: 74, h: 98 });
  let K;
  function ride(G, i) {
    if (K.done.includes(i) || G.phase !== 'play') return;
    K.done.push(i); K.cur = i; K.rideT = 0.5;
    G.sfx('coin'); G.stamp('탑승!', '#7ee081', 220, 0.7); G.punch(0.03); G.burst(110, 400, '#ffd23f', 18, 200);
    G.float(`사냥 골드 +${MOUNTS[i][2]}%`, 180, 150, '#ffe066', 26, 1.2);
    if (K.done.length === 1) G.emit('choice', { mount: MOUNTS[i][0] });
    G.caption(K.done.length < 4 ? `${MOUNTS[i][1]} 탑승! (${K.done.length}/4)` : '불꽃 비룡 강화!');
    if (K.done.length === 4) { K.end = true; K.bonus = 12.2; G.climax(); G.sfx('legend'); G.flash('#fff3a0', 0.2); G.coins(110, 380, 26); G.pop('불꽃 비룡 Lv.10', '사냥 골드 +12.2%', '강화석으로 Lv.10 까지', 'gold', 2.4); G.finish(2.4); }
    else K.bonus = MOUNTS[i][2];
  }
  return {
    id: 'mount-ride',
    introDur: 1.5,
    hook: ['걷지 말고', '타고 사냥하자'],
    climaxStamp: 'Lv.10!!', raysAt: [110, 340],
    caption0: '탈것 카드를 눌러요',
    endLines: ['탈것 4종 · 상점에서 보석으로', '강화석으로 Lv.10 까지'],
    init() {
      K = { done: [], cur: -1, bonus: 0, rideT: 0, gold: 0, shown: 0, atk: 0, auto: 0, end: false,
        hero: { id: 'hero', x: 110, y: 424, s: 0.9, mode: 'idle', mt: 0 }, mob: { id: 'slime', x: 286, y: 424, s: 0.9, mode: 'idle', mt: 0 } };
    },
    onTap(G, x, y) {
      for (let i = 0; i < 4; i++) { const r = slot(i); if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { ride(G, i); G.hint(null); return true; } }
      return true;
    },
    onKey(G) { const i = [0, 1, 2, 3].find((j) => !K.done.includes(j)); if (i != null) ride(G, i); },
    update(G, dt) {
      KIT.tick(K.hero, dt); KIT.tick(K.mob, dt);
      K.rideT = Math.max(0, K.rideT - dt);
      K.shown += (K.gold - K.shown) * Math.min(1, dt * 8);
      K.atk += dt;
      if (K.atk > 0.55) {
        K.atk = 0; KIT.attack(K.hero, 0.36); KIT.hit(K.mob); G.sfx('hit');
        const g = Math.round(100 * (1 + K.bonus / 100)); K.gold += g;
        G.float(`+${g}G`, 286 + (Math.random() * 40 - 20), 300, K.bonus >= 5 ? '#ffd23f' : '#fff', K.bonus >= 5 ? 26 : 20, 0.8);
      }
      if (G.phase === 'play' && G.idle > 1.3) {
        const i = [0, 1, 2, 3].find((j) => !K.done.includes(j));
        if (i != null) { const r = slot(i); G.hint(r.x + r.w / 2, r.y + r.h / 2); K.auto += dt; if (K.auto > 0.9) { K.auto = 0; ride(G, i); } }
      } else K.auto = 0;
    },
    draw(G, ctx) {
      KIT.stage(G, ctx, 'bg:meadow');
      G.rr(90, 66, 180, 30, 12, 'rgba(27,18,11,.85)', '#ffd23f', 2);
      G.text(`사냥 골드 +${K.bonus}%`, 180, 81, { size: 16, color: '#ffe066' });
      G.text(`${KIT.fmt(K.shown)} G`, 180, 116, { size: 22, color: '#fff3d0', stroke: '#2a1606', sw: 5 });
      KIT.unit(G, K.mob, G.t);
      const bob = K.cur >= 0 ? Math.sin(G.t * 7) * 3 : 0;
      if (K.cur >= 0) KIT.unit(G, { id: MOUNTS[K.cur][0], x: 110, y: 428 + bob, s: 1.1 + K.rideT * 0.2, mode: 'idle', mt: 0 }, G.t);
      KIT.unit(G, { ...K.hero, y: K.cur >= 0 ? 372 + bob : 424 }, G.t);
      for (let i = 0; i < 4; i++) {
        const r = slot(i), on = K.done.includes(i);
        G.rr(r.x, r.y, r.w, r.h, 12, on ? 'rgba(255,255,255,.08)' : '#fff3d6', on ? 'rgba(255,255,255,.2)' : '#f2c232', on ? 2 : 3);
        KIT.unit(G, { id: MOUNTS[i][0], x: r.x + r.w / 2, y: r.y + 60, s: 0.46, mode: 'idle', mt: 0, alpha: on ? 0.35 : 1 }, G.t);
        G.text(on ? '탑승 ✔' : `💎${MOUNTS[i][3]}`, r.x + r.w / 2, r.y + 80, { size: 13, color: on ? '#86efac' : '#7c2d12' });
      }
    },
    debug: () => ({ done: K.done.length, gold: K.gold }),
    tapAt() { const i = [0, 1, 2, 3].find((j) => !K.done.includes(j)); const r = slot(i ?? 0); return [r.x + r.w / 2, r.y + r.h / 2]; },
  };
})();
