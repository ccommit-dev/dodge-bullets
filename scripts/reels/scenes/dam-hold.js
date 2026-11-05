/* 릴스 · 성문 방어 1 — 끌어서 주인공을 옮겨 세 줄로 내려오는 몬스터를 막는다. 활은 자동, 선 자리에서 위로만 쏜다. 성문이 0% 면 진다(game/world.ts 패배 = 방어막 붕괴 · 유일한 생명).
 * 1장 무대(bg:dam1)의 대장은 이끼 골렘(game/stages.ts · draw.ts BOSS_SPRITE moss-golem-clean). 위쪽에 자리 잡고 마력탄을 쏘며, 깎이면 옆으로 튀어 자리를 바꾼다(game/arrows.ts).
 * 깨면 원정 인장 = 대장 +2(arrows.ts) · 상자 +1 · 방어막 90% 이상 +2(world.ts). 웨이브 수와 칸당 깎이는 양만 릴스 길이에 맞췄다(양은 숫자로 보이지 않는다) */
window.RF_SCENE = (() => {
  const { LANE_X, GATE_Y, depth } = KIT;
  const L = 0, C = 1, R = 2;
  // [그림, 줄, 나오는 초] — 가운데에 서 있기만 하면 좌우가 다 샌다
  const WAVES = [
    [['slime', L, 0], ['goblin', R, 0.5], ['slime', L, 1]],
    [['goblin', L, 0], ['slime', R, 0], ['goblin', C, 0.9], ['slime', R, 0.9], ['goblin', L, 1.8], ['slime', C, 1.8]],
    [['slime', L, 0], ['goblin', C, 0], ['slime', R, 0], ['goblin', L, 0.9], ['slime', R, 0.9], ['goblin', C, 1.8], ['slime', R, 1.8]],
    [['moss-golem-clean', C, 0], ['goblin', L, 2.5]],
  ];
  const SPEED = [70, 78, 84, 78], LEAK = 12, TOP = 80;
  const BOSS_HP = 16, BOSS_SP = 13, BOSS_TOP = 130, BOSS_HOVER = 178, BOSS_CUT = 4, BOSS_HOP = [R, L, C];   // 4번 맞을 때마다 옆 줄로 튄다
  const ORB_EVERY = 1.6, ORB_LEAK = 6, ORB_SP = 200;   // 마력탄 — 대장이 쏴서 성문에 맞는다(arrows.ts bossSalvoMs · bossOrbDmg)
  let K;
  function startWave(G, w) {
    K.wave = w; K.wt = -0.3;
    K.queue = WAVES[w].map(([id, lane, at]) => ({ id, lane, at }));
    if (w === 0) return;
    G.stamp(w === 3 ? 'BOSS!!' : `WAVE ${w + 1}`, w === 3 ? '#ff6b6b' : '#fff', 200, 0.9);
    G.caption(w === 3 ? '대장 등장! 따라가며 맞혀요' : `WAVE ${w + 1}/3 — 끌어서 줄을 맞춰요`);
    if (w === 3) G.pop('3웨이브를 막았다', '대장 · 이끼 골렘', '깎으면 옆으로 튄다', 'pink', 1.4);
  }
  function move(G, x) {
    K.hero.x = Math.max(44, Math.min(316, x));
    if (!K.moved) { K.moved = true; G.emit('choice', { x: Math.round(K.hero.x) }); G.sfx('tap'); }
  }
  function win(G, boss) {
    K.done = true; K.chest = { x: boss.x, y: 70, t: 0 }; K.orbs = [];
    const seals = 3 + (K.gate >= 90 ? 2 : 0);
    for (const m of K.mons) { if (m !== boss) G.burst(m.x, m.y - 30, '#fde68a', 12, 160); m.dead = true; }
    K.cleared += 1; K.mons = []; K.shots = [];
    G.climax(); G.sfx('win'); G.flash('#fff3a0', 0.2); G.impact(2); G.burst(boss.x, boss.y - 60, '#ffd23f', 60, 300); G.coins(boss.x, boss.y - 60, 24);
    G.pop('대장 · 이끼 골렘 처치', '성문 방어 성공!', `원정 인장 +${seals}`, 'gold', 2.6);
    G.caption(`성문 ${Math.round(K.gate)}% 로 지켜냄`); G.finish(2.8);
  }
  return {
    id: 'dam-hold',
    canLose: true,
    introDur: 1.5,
    hook: ['성문이 뚫리기 직전', '막아라!'],
    climaxStamp: '성문 사수!!', raysAt: [180, 220],
    caption0: '끌어서 주인공을 옮겨요 · 활은 자동',
    endLines: ['손가락 하나로 지키는 성문', '대장을 깨면 원정 인장'],
    init(G) {
      K = { mons: [], shots: [], orbs: [], orbT: 0, wave: 0, queue: [], wt: 0, shootT: 0, gate: 100, done: false, moved: false, cleared: 0, chest: null,
        hero: { id: 'hero', x: 180, y: 452, s: 0.75, mode: 'idle', mt: 0 } };
      startWave(G, 0);
    },
    onTap(G, x, y) { if (G.phase !== 'play' || y < 56) return true; move(G, x); G.hint(null); return true; },
    onDrag(G, x) { if (G.phase !== 'play') return true; move(G, x); G.hint(null); return true; },
    update(G, dt) {
      const h = K.hero; KIT.tick(h, dt);
      for (const m of K.mons) KIT.tick(m, dt);
      if (K.chest) { K.chest.t += dt; K.chest.y += (300 - K.chest.y) * Math.min(1, dt * 7); }
      if (G.over || K.done) return;
      // 소환
      K.wt += dt;
      for (const q of K.queue) if (!q.out && K.wt >= q.at) {
        q.out = true; const boss = q.id === 'moss-golem-clean';
        K.mons.push({ id: q.id, lane: q.lane, x: LANE_X[q.lane] + (boss ? 0 : Math.random() * 12 - 6), y: boss ? BOSS_TOP : TOP, hp: boss ? BOSS_HP : 3, max: boss ? BOSS_HP : 3, sp: boss ? BOSS_SP : SPEED[K.wave], boss, cut: 0, mode: 'idle', mt: 0, s: 1, phase: Math.random() });
      }
      // 몬스터 이동 · 성문 충돌
      for (const m of K.mons) {
        if (m.boss) {
          // 위쪽에 자리 잡고 머문다 — 성문까지 내려오지 않는다. 마력탄이 성문을 깎는다
          m.y = Math.min(BOSS_HOVER, m.y + m.sp * dt); m.s = depth(m.y) * 1.05;
          m.x += (LANE_X[m.lane] - m.x) * Math.min(1, dt * 8);
          K.orbT += dt;
          if (K.orbT >= ORB_EVERY) { K.orbT = 0; KIT.attack(m, 0.4); K.orbs.push({ x: m.x, y: m.y - 30, tx: h.x + (Math.random() - 0.5) * 40 }); G.sfx('tap'); }
          continue;
        }
        m.y += m.sp * dt; m.s = depth(m.y);
        if (m.y >= GATE_Y) {
          m.dead = true; K.gate = Math.max(0, K.gate - LEAK); G.shake(8, 0.3); G.flash('#ef4444', 0.14); G.sfx('fail');
          G.float('성문 피격!', m.x, GATE_Y - 20, '#fca5a5', 18);
        }
      }
      // 마력탄
      for (const o of K.orbs) {
        const k = dt * ORB_SP / Math.max(1, GATE_Y - o.y);
        o.x += (o.tx - o.x) * Math.min(1, k); o.y += ORB_SP * dt;
        if (o.y >= GATE_Y) { o.dead = true; K.gate = Math.max(0, K.gate - ORB_LEAK); G.shake(5, 0.2); G.sfx('fail'); G.burst(o.x, GATE_Y, '#c084fc', 12, 150); G.float('마력탄!', o.x, GATE_Y - 20, '#e9d5ff', 16, 0.7); }
      }
      K.orbs = K.orbs.filter((o) => !o.dead);
      if (K.gate <= 0) {
        G.lose('성문이 뚫렸어요!', [`${K.cleared}마리 막았어요 · ${K.wave === 3 ? '대장전' : `WAVE ${K.wave + 1}/3`}`, '끌어서 몬스터가 있는 줄에 서 보세요']);
        return;
      }
      // 자동 사격 — 선 자리에서 위로
      K.shootT += dt;
      if (K.shootT > 0.22) {
        K.shootT = 0; KIT.attack(h, 0.2);
        K.shots.push({ x: h.x, y: h.y - 60 });
      }
      for (const s of K.shots) {
        s.y -= 620 * dt;
        const t = K.mons.find((m) => !m.dead && Math.abs(m.x - s.x) < 34 && Math.abs(m.y - 30 - s.y) < 26);
        if (t) {
          s.dead = true; t.hp -= 1; KIT.hit(t); G.sfx('hit');
          if (t.hp <= 0) {
            t.dead = true;
            if (t.boss) { win(G, t); return; }
            K.cleared += 1; G.burst(t.x, t.y - 40, '#fde68a', 16, 160); G.coins(t.x, t.y - 40, 3); G.punch(0.02); G.float('+처치', t.x, t.y - 50, '#ffe066', 15, 0.6);
          } else if (t.boss && (t.max - t.hp) % BOSS_CUT === 0) {
            // 깎이면 옆으로 튄다 — 쫓아가야 계속 맞는다
            t.lane = BOSS_HOP[t.cut++ % 3]; G.sfx('bolt'); G.shake(4, 0.2); G.caption('대장이 옆 줄로 튀었다 — 따라가요!');
          }
        }
        if (s.y < 60) s.dead = true;
      }
      K.shots = K.shots.filter((s) => !s.dead); K.mons = K.mons.filter((m) => !m.dead);
      // 웨이브 넘김
      if (K.queue.every((q) => q.out) && K.mons.length === 0 && K.wave < 3) startWave(G, K.wave + 1);
      // 손대지 않으면 힌트만
      if (G.phase === 'play' && G.idle > 1.2 && K.mons.length) {
        const near = K.mons.reduce((a, b) => (b.y > a.y ? b : a));
        G.hint(LANE_X[near.lane], 420);
      } else G.hint(null);
    },
    draw(G, ctx) {
      G.bg('bg:dam1', -60, 526);
      // 성문 선 · 줄 표시
      ctx.fillStyle = 'rgba(255,210,63,.35)'; ctx.fillRect(20, GATE_Y, 320, 3);
      for (let i = 0; i < 3; i++) { ctx.fillStyle = Math.abs(LANE_X[i] - K.hero.x) < 34 ? 'rgba(255,210,63,.12)' : 'rgba(255,255,255,.03)'; ctx.fillRect(LANE_X[i] - 46, 90, 92, GATE_Y - 90); }
      for (const m of [...K.mons].sort((a, b) => a.y - b.y)) {
        KIT.unit(G, m, G.t);
        if (m.boss) { const by = Math.max(78, m.y - 206 * m.s); G.bar(m.x - 52, by, 104, 18, m.hp / m.max, '#ef4444'); G.text('이끼 골렘', m.x, by + 9, { size: 13, color: '#fff', stroke: '#2a1606', sw: 4 }); }
      }
      for (const o of K.orbs) { const g = ctx.createRadialGradient(o.x, o.y, 2, o.x, o.y, 16); g.addColorStop(0, '#f5d0fe'); g.addColorStop(0.5, 'rgba(192,132,252,.85)'); g.addColorStop(1, 'rgba(192,132,252,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, 16, 0, Math.PI * 2); ctx.fill(); }
      if (K.chest) G.sprite('chest', K.chest.x, K.chest.y, { s: 0.9 });
      for (const s of K.shots) G.sprite('arrow:basic', s.x, s.y, { s: 1, rot: -Math.PI / 2, ay: 0.5 });
      // 성문 체력 · 대장 체력
      G.rr(70, 50, 220, 24, 12, 'rgba(27,18,11,.85)', '#ffd23f', 2);
      G.bar(76, 54, 208, 16, K.gate / 100, K.gate > 35 ? '#22c55e' : '#ef4444');
      G.text(`성문 ${Math.round(K.gate)}%  ·  ${K.wave === 3 ? '대장전' : `WAVE ${K.wave + 1}/3`}`, 180, 62, { size: 13, color: '#fff', stroke: '#2a1606', sw: 4 });
      // 아래 판 · 주인공
      ctx.fillStyle = 'rgba(43,26,14,.94)'; ctx.fillRect(0, 470, 360, 170); ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, 468, 360, 3);
      KIT.unit(G, K.hero, G.t);
      // 끌기 띠 — 손잡이가 주인공 자리를 따라간다
      G.rr(20, 490, 320, 48, 24, 'rgba(255,255,255,.06)', 'rgba(255,255,255,.2)', 2);
      G.text('← 끌어서 이동 →', 180, 514, { size: 15, color: '#f5d9a8', alpha: K.moved ? 0.4 : 0.95 });
      G.rr(K.hero.x - 26, 494, 52, 40, 20, 'rgba(255,210,63,.3)', '#ffd23f', 2);
      G.text('대장을 깨면 원정 인장 · 90% 지키면 더', 180, 560, { size: 14, color: '#ffe08a' });
    },
    debug: () => ({ wave: K.wave, mons: K.mons.length, gate: Math.round(K.gate), cleared: K.cleared, heroX: Math.round(K.hero.x), bossHp: K.mons.find((m) => m.boss)?.hp ?? null }),
    bot(G) {
      if (G.phase !== 'play' || G.over || K.done) return null;
      // 졸개는 성문에 가까운 것부터, 없으면 대장
      const small = K.mons.filter((m) => !m.boss).sort((a, b) => b.y - a.y)[0];
      const t = small || K.mons[0];
      if (!t) return null;
      const x = LANE_X[t.lane];
      return Math.abs(x - K.hero.x) > 6 ? { drag: [x, 420] } : null;
    },
  };
})();
