/* 릴스 6 · 원정대 모으기 — 주인공 혼자는 드래곤에게 간지럼. 동료 넷을 하나씩 부르면 걸어 들어와 DPS 가 뛴다 */
window.RF_SCENE = (() => {
  const HP = 2600;
  const ALLY = [['mia', '스카우트 미아', 70, 180], ['leon', '궁수 레온', 60, 140], ['sera', '마법사 세라', 120, 100], ['garen', '기사 가렌', 90, 214]];
  const slot = (i) => ({ x: 20 + i * 82, y: 476, w: 74, h: 98 });
  let K;
  function dps() { return 12 + K.joined.reduce((a, i) => a + ALLY[i][2], 0); }
  function join(G, i) {
    if (K.joined.includes(i) || G.phase !== 'play') return;
    const before = dps();
    K.joined.push(i);
    const a = ALLY[i];
    K.units.push({ id: a[0], x: -40, tx: a[3], y: 412 + (i % 2) * 14, s: 0.95, mode: 'walk', mt: 0, phase: i * 0.2, atk: Math.random() * 0.5 });
    G.sfx('coin'); G.float(`DPS ${before} → ${dps()}`, 180, 120, '#ffe066', 24, 1.3);
    if (K.joined.length === 1) G.emit('choice', { first: a[0] });
    G.caption(K.joined.length < 4 ? `${a[1]} 합류! (${K.joined.length}/4)` : '원정대 완성! 일제 공격');
  }
  return {
    id: 'party-assemble',
    introDur: 1.6,
    hook: ['혼자서는 못 이긴다', '원정대 모으기'],
    caption0: '동료 카드를 눌러 합류',
    endLines: ['동료 넷 · 역할 넷 · 시너지', '원정대를 꾸리고 드래곤을 넘자'],
    init() {
      K = { joined: [], units: [], hp: HP, heroT: 0, auto: 0, dead: false,
        hero: { id: 'hero', x: 250 - 140, y: 420, s: 0.95, mode: 'idle', mt: 0 }, boss: { id: 'dragon', x: 292, y: 424, s: 1.05, mode: 'idle', mt: 0 } };
    },
    onTap(G, x, y) {
      for (let i = 0; i < 4; i++) { const r = slot(i); if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { join(G, i); G.hint(null); return true; } }
      return true;
    },
    onKey(G) { const i = [0, 1, 2, 3].find((j) => !K.joined.includes(j)); if (i != null) join(G, i); },
    update(G, dt) {
      KIT.tick(K.hero, dt); KIT.tick(K.boss, dt);
      for (const u of K.units) {
        KIT.tick(u, dt);
        if (u.mode === 'walk') { u.x += 150 * dt; if (u.x >= u.tx) { u.x = u.tx; u.mode = 'idle'; } }
        else if (!K.dead) { u.atk += dt; if (u.atk > 0.6) { u.atk = 0; KIT.attack(u, 0.4); } }
      }
      if (K.dead) { K.boss.alpha = Math.max(0, (K.boss.alpha ?? 1) - dt * 0.7); return; }
      // 피해(초당) — 0.3초마다 숫자
      K.heroT += dt;
      if (K.heroT > 0.3) {
        K.heroT = 0; const d = dps() * 0.3 * (0.9 + Math.random() * 0.2);
        K.hp -= d; if (K.hero.mode === 'idle') KIT.attack(K.hero, 0.4);
        if (K.boss.mode === 'idle' && K.joined.length) KIT.hit(K.boss);
        G.float(KIT.fmt(d), K.boss.x - 20 + Math.random() * 40, 270, K.joined.length >= 3 ? '#ffd23f' : '#fff', 14 + K.joined.length * 4, 0.8);
        G.sfx('hit');
        if (K.hp <= 0) { K.dead = true; G.climax(); G.sfx('win'); G.burst(K.boss.x, 320, '#ffd23f', 50, 280); G.shake(12, 0.5); G.pop('원정대 완성', '드래곤 처치!', `DPS 12 → ${dps()} · 동료 시너지 발동`, 'gold', 2.4); G.finish(2.4); }
      }
      if (G.phase === 'play' && G.idle > 1.3) {
        const i = [0, 1, 2, 3].find((j) => !K.joined.includes(j));
        if (i != null) { const r = slot(i); G.hint(r.x + r.w / 2, r.y + r.h / 2); K.auto += dt; if (K.auto > 0.9) { K.auto = 0; join(G, i); } }
      } else K.auto = 0;
    },
    draw(G, ctx) {
      KIT.stage(G, ctx, 'bg:volcano');
      KIT.bossBar(G, '드래곤', Math.max(0, K.hp) / HP);
      G.rr(120, 98, 120, 30, 12, 'rgba(27,18,11,.85)', '#ffd23f', 2);
      G.text(`DPS ${dps()}`, 180, 113, { size: 17, color: '#ffe066' });
      KIT.unit(G, K.boss, G.t);
      const all = [...K.units, K.hero].sort((a, b) => a.y - b.y);
      for (const u of all) KIT.unit(G, u, G.t);
      // 아래: 동료 카드 넷
      for (let i = 0; i < 4; i++) {
        const r = slot(i), on = K.joined.includes(i);
        G.rr(r.x, r.y, r.w, r.h, 12, on ? 'rgba(255,255,255,.08)' : '#fff3d6', on ? 'rgba(255,255,255,.2)' : '#f2c232', on ? 2 : 3);
        KIT.unit(G, { id: ALLY[i][0], x: r.x + r.w / 2, y: r.y + 64, s: 0.5, mode: 'idle', mt: 0, alpha: on ? 0.35 : 1 }, G.t);
        G.text(on ? '합류 ✔' : '합류', r.x + r.w / 2, r.y + 82, { size: 14, color: on ? '#86efac' : '#7c2d12' });
      }
    },
    debug: () => ({ joined: K.joined.length, hp: Math.round(K.hp) }),
    tapAt() { const i = [0, 1, 2, 3].find((j) => !K.joined.includes(j)); const r = slot(i ?? 0); return [r.x + r.w / 2, r.y + r.h / 2]; },
  };
})();
