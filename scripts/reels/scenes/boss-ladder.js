/* 릴스 3 · 대장 사다리 — 대장 셋을 차례로. 처음 잡을 때마다 사다리 한 칸 = 영구 특성(환생해도 유지) */
window.RF_SCENE = (() => {
  const BOSSES = [
    { id: 'slime', name: '대장 · 왕슬라임', hp: 320, s: 1.35 },
    { id: 'goblin', name: '대장 · 고블린 족장', hp: 520, s: 1.35 },
    { id: 'armored-ogre', name: '대장 · 갑옷 오우거', hp: 820, s: 1 },
  ];
  const PERKS = [['동료 피해', '0% → 3%'], ['탭 피해', '0% → 5%'], ['처치 골드', '0% → 3%']];
  const TIME = 10;
  let K;
  function next(G) {
    const b = BOSSES[K.stage];
    K.boss = { id: b.id, x: 274, y: 420, s: b.s, mode: 'idle', mt: 0, alpha: 0 };
    K.hp = b.hp; K.left = TIME; K.enter = 0.5;
  }
  function hitBoss(G, dmg, big) {
    if (!K.boss || K.dying) return;
    K.hp -= dmg; if (K.boss.mode === 'idle') KIT.hit(K.boss);
    G.float(KIT.fmt(dmg), K.boss.x + (Math.random() * 40 - 20), 290, big ? '#ffd23f' : '#fff', big ? 28 : 20);
    if (K.hp <= 0) {
      K.dying = 0.9; G.sfx('win'); G.burst(K.boss.x, 330, '#ffd23f', 30, 220); G.shake(8, 0.3);
      const [p, d] = PERKS[K.stage];
      K.ladder = K.stage + 1;
      G.pop(`대장 사다리 Lv.${K.ladder}`, `${p} 영구 상승`, d, 'gold', 1.9);
      if (K.stage === 0) G.emit('choice', { firstBoss: true });
      if (K.stage === 2) { G.climax(); G.caption('영구 특성은 환생해도 그대로!'); G.finish(2.2); }
      else G.caption(`다음 대장 — 사다리 ${K.ladder + 1}칸째`);
    }
  }
  function tap(G) { if (G.phase !== 'play' || K.dying || !K.boss) return; KIT.attack(K.hero, 0.34); G.sfx('hit'); hitBoss(G, 28 * (0.9 + Math.random() * 0.2), false); }
  return {
    id: 'boss-ladder',
    introDur: 1.5,
    hook: ['대장 잡을 때마다', '영구 강화'],
    caption0: '대장을 탭해서 공격!',
    endLines: ['한 번 잡은 대장 = 영원한 특성', '동료 · 탭 · 골드 · 공속이 차례로'],
    init(G) {
      K = { stage: 0, ladder: 0, auto: 0, party: 0, dying: 0,
        hero: { id: 'hero', x: 120, y: 420, s: 0.95, mode: 'idle', mt: 0 }, mia: { id: 'mia', x: 52, y: 430, s: 0.9, mode: 'idle', mt: 0, phase: 0.3 } };
      next(G);
    },
    onTap(G) { tap(G); G.hint(null); return true; },
    onKey(G) { tap(G); },
    update(G, dt) {
      KIT.tick(K.hero, dt); KIT.tick(K.mia, dt); if (K.boss) KIT.tick(K.boss, dt);
      if (K.boss && K.enter > 0) { K.enter -= dt; K.boss.alpha = 1 - Math.max(0, K.enter) / 0.5; }
      if (K.dying) {
        K.dying -= dt; if (K.boss) K.boss.alpha = Math.max(0, K.dying / 0.9);
        if (K.dying <= 0) { K.dying = 0; if (K.stage < 2) { K.stage += 1; next(G); } else K.boss = null; }
        return;
      }
      if (G.phase !== 'play' || !K.boss || K.enter > 0) return;
      K.left = Math.max(0, K.left - dt);
      // 동료 자동 공격
      K.party += dt;
      if (K.party > 0.5) { K.party = 0; KIT.attack(K.mia, 0.4); hitBoss(G, 22 + K.stage * 6, false); }
      if (G.idle > 1.4) { G.hint(K.boss.x, 330); K.auto += dt; if (K.auto > 0.22) { K.auto = 0; tap(G); } } else K.auto = 0;
    },
    draw(G, ctx) {
      KIT.stage(G, ctx, 'bg:ruins');
      if (K.boss) KIT.bossBar(G, BOSSES[K.stage].name, Math.max(0, K.hp) / BOSSES[K.stage].hp);
      G.text(`⏱ ${K.left.toFixed(1)}초`, 300, 108, { size: 15, color: K.left < 3 ? '#fca5a5' : '#fff3d0', stroke: '#2a1606', sw: 4 });
      KIT.unit(G, K.mia, G.t); KIT.unit(G, K.hero, G.t);
      if (K.boss) KIT.unit(G, K.boss, G.t);
      // 아래: 사다리 세 칸
      for (let i = 0; i < 3; i++) {
        const y = 560 - i * 42, on = i < K.ladder;
        G.rr(40, y - 16, 280, 34, 10, on ? '#ffe7a3' : 'rgba(255,255,255,.07)', on ? '#f2c232' : 'rgba(255,255,255,.18)', on ? 3 : 2);
        G.text(`Lv.${i + 1}`, 72, y + 1, { size: 15, color: on ? '#92400e' : '#a8a29e' });
        G.text(`${PERKS[i][0]} +${[3, 5, 3][i]}%`, 180, y + 1, { size: 16, color: on ? '#3b2415' : '#d6d3d1' });
        G.text(on ? '영구 ✔' : '🔒', 286, y + 1, { size: 14, color: on ? '#15803d' : '#a8a29e' });
      }
    },
    debug: () => ({ stage: K.stage, ladder: K.ladder, hp: Math.round(K.hp) }),
    tapAt: () => [274, 330],
  };
})();
