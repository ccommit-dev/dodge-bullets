/* 릴스 · 비트 수련 1 — 박자에 맞춰 패드를 누르면 원정대가 싸운다. 규칙은 게임 그대로: 체력이 0칸이면 진다(beat/world.ts easy 8칸 · 놓치면 1칸, 0.45초 무적 · PERFECT 4번마다 1칸 회복). 몬스터를 쓰러뜨리거나 곡 끝까지 살아남으면 클리어(BeatGame).
 * 곡은 beat/tracks.ts Arcade Overdrive(128 BPM · 4비트 · easy), 사다리 3번째라 몬스터 그림은 moon-wolf-king-clean(BeatGame stageNo ≥ 3). 피해 = 줄 [14, 7, 6, 25] + 콤보 × 0.8(applyRaidReward).
 * 몬스터 체력만 릴스 길이에 맞췄다(화면엔 막대만). kit 의 GOOD 은 게임의 GREAT · GOOD 을 합친 칸이라 회복 +1(게임 GREAT 값). 7할을 맞히면 대개 곡 끝까지 산다 */
window.RF_SCENE = (() => {
  // 128BPM · 4비트 — 박 단위 [박, 줄]. 8박마다 한 박 쉰다
  const CHART = [
    [0, 0], [1, 1], [2, 2], [3, 3], [4, 0], [5, 0], [6, 2], [8, 1], [9, 2], [10, 0], [11, 3], [12, 0], [13, 1], [14, 2],
    [16, 3], [17, 0], [18, 1], [19, 2], [20, 0], [21, 3], [22, 0], [24, 3], [25, 2], [26, 1], [27, 0], [28, 3], [29, 3], [30, 0], [32, 1], [33, 2], [34, 3], [35, 0],
  ];
  const ENEMY = 700, DMG = [14, 7, 6, 25], HP_MAX = 8, INVULN = 0.45, HEAL_MAX = 8;
  let K, B;
  const hits = () => B.perfect + B.good;
  /** 게임 등급(beat/tracks.ts gradeOf) */
  const grade = () => { const a = hits() / Math.max(1, hits() + B.miss); return a >= 0.9 ? 'S' : a >= 0.75 ? 'A' : a >= 0.55 ? 'B' : 'C'; };
  function act(G, lane, judge) {
    KIT.attack([K.hero, K.mia, K.leon, K.hero][lane], 0.35);
    const dmg = DMG[lane] + Math.floor(B.combo * 0.8);
    if (lane === 1) { K.shield = 0.4; G.float('방어!', 120, 150, '#93c5fd', 16, 0.6); }
    else if (lane === 2) { K.dodge = 0.35; G.float('회피!', 120, 150, '#86efac', 16, 0.6); }
    K.enemy = Math.max(0, K.enemy - dmg); KIT.hit(K.boss);
    G.float(String(dmg), 285 + Math.random() * 30 - 15, 140, judge === 'PERFECT' ? '#ffd23f' : '#fff', judge === 'PERFECT' ? 22 : 17, 0.6);
    G.sfx(judge === 'PERFECT' ? 'coin' : 'tap');
    if (judge === 'PERFECT') G.punch(0.015);
    K.heal += judge === 'PERFECT' ? 2 : 1;
    if (K.heal >= HEAL_MAX) { K.heal -= HEAL_MAX; if (K.hp < HP_MAX) { K.hp += 1; G.float('♥ +1', 150, 110, '#fda4af', 20, 0.8); } }
    if (B.combo > 0 && B.combo % 6 === 0) { G.float(`${B.combo} COMBO!`, 180, 400, '#ffd23f', 30, 0.9); G.coins(285, 180, 5); }
  }
  function first(G, lane) { if (!K.firstHit) { K.firstHit = true; G.emit('choice', { lane }); } }
  /** 몬스터를 쓰러뜨렸거나 곡 끝까지 살아남았다 — 둘 다 클리어(게임도 클리어하면 몬스터 체력을 0으로 둔다) */
  function clear(G, killed) {
    if (K.done || G.over) return; K.done = true; B.judgeT = 0; K.enemy = 0; KIT.hit(K.boss);
    const rank = grade();
    G.climax(); G.sfx('win'); G.flash('#fff3a0', 0.2); G.stamp(`${rank} 랭크!!`, '#ffd23f', 330); G.coins(285, 190, 24); G.burst(290, 190, '#ffd23f', 40, 260);
    G.pop(`${rank} 랭크 · MAX ${B.maxCombo} COMBO`, killed ? '몬스터 격파!' : '곡 클리어!', `PERFECT ${B.perfect} · GOOD ${B.good} · MISS ${B.miss}`, 'purple', 2.4);
    G.caption('연주로 이기는 원정'); G.finish(2.4);
  }
  return {
    id: 'beat-combo',
    canLose: true,
    introDur: 1.5,
    popY: 150,
    hook: ['박자에 맞춰 누르면', '원정대가 싸운다'],
    caption0: '노트가 노란 선에 닿을 때 패드!',
    endLines: ['네 방향 명령 · 박자 지휘', '16곡 · 4 · 8 · 16비트'],
    init(G) {
      K = { enemy: ENEMY, hp: HP_MAX, inv: 0, heal: 0, lostHeart: 0, done: false, firstHit: false, shield: 0, dodge: 0,
        hero: { id: 'hero', x: 116, y: 236, s: 0.62, mode: 'idle', mt: 0 }, mia: { id: 'mia', x: 66, y: 242, s: 0.55, mode: 'idle', mt: 0, phase: 0.3 }, leon: { id: 'leon', x: 26, y: 240, s: 0.52, mode: 'idle', mt: 0, phase: 0.6 },
        boss: { id: 'moon-wolf-king-clean', x: 286, y: 244, s: 0.66, mode: 'idle', mt: 0 } };
      B = KIT.beat({ chart: CHART, bpm: 128, feverAt: 99999,
        onHit: (lane, j) => act(G, lane, j),
        onMiss: () => {
          G.sfx('fail');
          if (K.inv > 0 || K.done || G.over) return;
          K.hp -= 1; K.inv = INVULN; K.lostHeart = 0.4; G.shake(4, 0.15); KIT.attack(K.boss, 0.35);
          if (K.hp <= 0) { K.done = true; B.judgeT = 0; G.lose('체력이 다 떨어졌어요!', [`${hits()}/${CHART.length} 노트 · MISS ${B.miss}`, 'EASY 는 8칸 · 놓칠 때마다 1칸']); }
        },
        onEnd: () => clear(G, false) });
    },
    onTap(G, x, y) {
      if (G.phase !== 'play') return true;
      const lane = B.laneAt(x, y); if (lane >= 0 && !K.done) { first(G, lane); B.press(lane); G.hint(null); }
      return true;
    },
    onKey(G) { if (K.done) return; const n = B.next(); if (n) { first(G, n.lane); B.press(n.lane); } },
    update(G, dt) {
      for (const u of [K.hero, K.mia, K.leon, K.boss]) KIT.tick(u, dt);
      K.shield = Math.max(0, K.shield - dt); K.dodge = Math.max(0, K.dodge - dt);
      K.inv = Math.max(0, K.inv - dt); K.lostHeart = Math.max(0, K.lostHeart - dt);
      if (G.phase !== 'play' || K.done || G.over) return;
      B.update(dt);
      if (K.enemy <= 0) { clear(G, true); return; }
      if (K.done) return;
      const n = B.next();
      if (G.idle > 1.2 && n) { const r = B.padRect(n.lane); G.hint(r.x + r.w / 2, r.y + 30); } else G.hint(null);
    },
    draw(G, ctx) {
      ctx.fillStyle = '#120b1f'; ctx.fillRect(0, 0, 360, 640);
      G.bg('bg:beat', 46, 216);
      const ratio = K.enemy / ENEMY;
      KIT.bossBar(G, `${ratio > 0.66 ? '접근' : ratio > 0.3 ? '교전' : 'DROP 결전'} · 몬스터`, ratio, 56);
      G.rr(84, 86, 192, 26, 13, 'rgba(27,18,11,.8)', K.lostHeart > 0 ? '#fca5a5' : 'rgba(255,255,255,.2)', 2);
      for (let i = 0; i < HP_MAX; i++) G.text(i < K.hp ? '♥' : '♡', 103 + i * 22, 99, { size: 17, color: i < K.hp ? '#ff6b81' : 'rgba(255,255,255,.4)' });
      for (const u of [K.leon, K.mia, K.hero]) KIT.unit(G, { ...u, x: u.x + (K.dodge > 0 && u === K.hero ? -10 : 0) }, G.t);
      if (K.shield > 0) { ctx.save(); ctx.globalAlpha = K.shield * 2; ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(90, 210, 50, -1.2, 1.2); ctx.stroke(); ctx.restore(); }
      KIT.unit(G, K.boss, G.t);
      B.draw(G, ctx);
      G.text('Arcade Overdrive · 128 BPM · 4비트', 12, 274, { size: 13, color: '#c4b5fd', align: 'left' });
    },
    debug: () => ({ combo: B.combo, max: B.maxCombo, perfect: B.perfect, good: B.good, miss: B.miss, hp: K.hp, enemy: K.enemy }),
    bot(G) {
      if (G.phase !== 'play' || G.over || K.done) return null;
      const n = B.next(); if (!n || n.t - B.t > 0.1) return null;
      const r = B.padRect(n.lane); return { tap: [r.x + r.w / 2, r.y + 30] };
    },
  };
})();
