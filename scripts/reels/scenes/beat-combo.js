/* 릴스 · 비트 수련 1 — 박자에 맞춰 패드를 누르면 원정대가 그 명령대로 싸운다. 12콤보면 FEVER, 대장을 연주로 쓰러뜨린다 */
window.RF_SCENE = (() => {
  // 4/4 · 120BPM · 박 단위 [박, 줄]
  const CHART = [[0, 0], [1, 1], [2, 2], [3, 3], [4, 0], [5, 0], [6, 2], [7, 3], [8, 1], [9, 2], [10, 0], [11, 3], [12, 0], [12.5, 1], [13, 2], [13.5, 3], [14, 0], [15, 3], [16, 1], [16.5, 2], [17, 0], [17.5, 3], [18, 0], [19, 3]];
  const HP = 900;
  let K, B;
  function act(G, lane, judge) {
    const who = [K.hero, K.mia, K.mia, K.sera][lane];
    KIT.attack(who, 0.35);
    const dmg = (judge === 'PERFECT' ? 38 : 24) * (B.fever ? 2 : 1) * (lane === 3 ? 1.4 : 1);
    if (lane === 1) { K.shield = 0.4; G.float('방어!', 120, 150, '#93c5fd', 16, 0.6); }
    else if (lane === 2) { K.dodge = 0.35; G.float('회피!', 120, 150, '#86efac', 16, 0.6); }
    K.hp = Math.max(0, K.hp - dmg); KIT.hit(K.boss);
    G.float(KIT.fmt(dmg), 285 + Math.random() * 30 - 15, 140, judge === 'PERFECT' ? '#ffd23f' : '#fff', judge === 'PERFECT' ? 22 : 17, 0.6);
    G.sfx(judge === 'PERFECT' ? 'coin' : 'tap');
    if (!K.firstHit) { K.firstHit = true; G.emit('choice', { judge }); }
  }
  function finish(G) {
    if (K.done) return; K.done = true;
    const rank = B.miss === 0 ? 'S' : B.miss < 3 ? 'A' : 'B';
    G.climax(); G.sfx('win'); G.flash('#fff3a0', 0.2);
    G.pop(`${rank} 랭크 · MAX ${B.maxCombo} COMBO`, '고블린 족장 처치!', `PERFECT ${B.perfect} · GOOD ${B.good} · MISS ${B.miss}`, 'purple', 2.4);
    G.caption('연주로 이기는 원정'); G.finish(2.4);
  }
  return {
    id: 'beat-combo',
    introDur: 1.5,
    popY: 150,
    hook: ['박자에 맞춰 누르면', '원정대가 싸운다'],
    caption0: '노트가 노란 선에 닿을 때 패드!',
    endLines: ['네 방향 명령 · 박자 지휘', '16곡 · 4 · 8 · 16비트 챕터'],
    init(G) {
      K = { hp: HP, done: false, firstHit: false, shield: 0, dodge: 0,
        hero: { id: 'hero', x: 116, y: 236, s: 0.62, mode: 'idle', mt: 0 }, mia: { id: 'mia', x: 66, y: 242, s: 0.55, mode: 'idle', mt: 0, phase: 0.3 }, sera: { id: 'sera', x: 26, y: 240, s: 0.52, mode: 'idle', mt: 0, phase: 0.6 },
        boss: { id: 'goblin', x: 290, y: 240, s: 0.85, mode: 'idle', mt: 0 } };
      B = KIT.beat({ chart: CHART, bpm: 120, feverAt: 12,
        onHit: (lane, j) => act(G, lane, j),
        onMiss: () => { G.shake(3, 0.15); G.sfx('fail'); KIT.attack(K.boss, 0.35); },
        onFever: () => { G.flash('#f0abfc', 0.15); G.sfx('legend'); G.caption('FEVER! 피해 2배'); },
        onEnd: () => finish(G) });
    },
    onTap(G, x, y) {
      if (G.phase !== 'play') return true;
      const lane = B.laneAt(x, y); if (lane >= 0) { B.press(lane); G.hint(null); }
      return true;
    },
    onKey(G) { const n = B.next(); if (n) B.press(n.lane); },
    update(G, dt) {
      for (const u of [K.hero, K.mia, K.sera, K.boss]) KIT.tick(u, dt);
      K.shield = Math.max(0, K.shield - dt); K.dodge = Math.max(0, K.dodge - dt);
      if (G.phase === 'play') {
        const idle = G.idle > 1.2;
        B.update(dt, idle);
        const n = B.next();
        if (idle && n) { const r = B.padRect(n.lane); G.hint(r.x + r.w / 2, r.y + 30); } else G.hint(null);
        if (K.hp <= 0) finish(G);
      }
    },
    draw(G, ctx) {
      ctx.fillStyle = '#120b1f'; ctx.fillRect(0, 0, 360, 640);
      G.bg('bg:beat', 46, 216);
      KIT.bossBar(G, '대장 · 고블린 족장', K.hp / HP, 56);
      for (const u of [K.sera, K.mia, K.hero]) KIT.unit(G, { ...u, x: u.x + (K.dodge > 0 && u === K.hero ? -10 : 0) }, G.t);
      if (K.shield > 0) { ctx.save(); ctx.globalAlpha = K.shield * 2; ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(90, 210, 50, -1.2, 1.2); ctx.stroke(); ctx.restore(); }
      KIT.unit(G, K.boss, G.t);
      B.draw(G, ctx);
      G.text('120 BPM · 4비트', 70, 274, { size: 12, color: '#c4b5fd' });
    },
    debug: () => ({ combo: B.combo, max: B.maxCombo, perfect: B.perfect, miss: B.miss, hp: Math.round(K.hp) }),
    tapAt() { const n = B.next(); const r = B.padRect(n ? n.lane : 0); return [r.x + r.w / 2, r.y + 30]; },
  };
})();
