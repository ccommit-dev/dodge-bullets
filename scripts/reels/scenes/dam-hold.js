/* 릴스 · 댐 방어전 1 — 세 줄로 내려오는 몬스터를 레온의 자동 화살로 막는다. 줄을 탭해 자리를 옮긴다. 4웨이브째 대장 오우거 */
window.RF_SCENE = (() => {
  const { LANE_X, GATE_Y, depth } = KIT;
  const WAVES = [['slime', 'goblin', 'slime', 'goblin'], ['goblin', 'slime', 'goblin', 'slime', 'goblin', 'slime'], ['armored-ogre', 'goblin', 'slime', 'goblin', 'slime']];
  let K;
  function startWave(G, w) {
    K.wave = w; K.queue = WAVES[w].map((id, i) => ({ id, at: i * 0.42, lane: id === 'armored-ogre' ? 1 : (i * 2 + w) % 3 }));
    K.wt = 0; G.caption(w === 2 ? '대장 등장! 가운데를 지켜라' : `WAVE ${w + 1}/3 — 줄을 탭해 이동`);
    if (w === 2) G.pop('WAVE 3/3', '대장 · 갑옷 오우거', '성문을 지켜라', 'pink', 1.4);
  }
  function move(G, lane) {
    if (lane === K.lane) return;
    K.lane = lane; K.hero.walkT = 0.25; G.sfx('tap');
    if (!K.moved) { K.moved = true; G.emit('choice', { lane }); }
  }
  return {
    id: 'dam-hold',
    introDur: 1.5,
    hook: ['댐이 뚫리기 직전', '막아라!'],
    caption0: '줄을 탭해 이동 · 활은 자동',
    endLines: ['손가락 하나로 지키는 성문', '웨이브를 막으면 원정 인장'],
    init(G) {
      K = { lane: 1, mons: [], shots: [], wave: 0, queue: [], wt: 0, shootT: 0, gate: 100, done: false, moved: false, auto: 0, cleared: 0,
        hero: { id: 'leon', x: LANE_X[1], y: 556, s: 0.78, mode: 'idle', mt: 0 } };
      startWave(G, 0);
    },
    onTap(G, x, y) { if (G.phase !== 'play' || y < 56 || y > 580) return true; move(G, x < 130 ? 0 : x < 230 ? 1 : 2); G.hint(null); return true; },
    update(G, dt) {
      const h = K.hero; KIT.tick(h, dt);
      h.x += (LANE_X[K.lane] - h.x) * Math.min(1, dt * 14);
      // 소환
      K.wt += dt;
      for (const q of K.queue) if (!q.out && K.wt >= q.at) {
        q.out = true; const boss = q.id === 'armored-ogre';
        K.mons.push({ id: q.id, lane: q.lane, x: LANE_X[q.lane], y: 70, hp: boss ? 22 : 3, max: boss ? 22 : 3, sp: boss ? 30 : 64, boss, mode: 'idle', mt: 0, s: 1 });
      }
      // 몬스터 이동 · 성문 충돌
      for (const m of K.mons) {
        KIT.tick(m, dt); m.y += m.sp * dt; m.s = depth(m.y) * (m.boss ? 1.05 : 1);
        if (m.y >= GATE_Y) { m.dead = true; K.gate = Math.max(18, K.gate - (m.boss ? 30 : 9)); G.shake(6, 0.25); G.sfx('fail'); G.float(m.boss ? '-30%' : '-9%', m.x, GATE_Y - 20, '#fca5a5', 22); }
      }
      // 자동 사격 — 0.22초마다 지금 줄로
      K.shootT += dt;
      if (K.shootT > 0.22 && G.phase !== 'end') {
        K.shootT = 0; KIT.attack(h, 0.2);
        K.shots.push({ x: h.x, y: 470, lane: K.lane, kind: 'basic' });
      }
      for (const s of K.shots) {
        s.y -= 620 * dt;
        const t = K.mons.find((m) => !m.dead && m.lane === s.lane && Math.abs(m.y - 30 - s.y) < 26);
        if (t) {
          s.dead = true; t.hp -= 1; KIT.hit(t); G.sfx('hit'); G.float(t.boss ? '12' : '8', t.x + 14, t.y - 70 * t.s, '#fff', 16, 0.6);
          if (t.hp <= 0) { t.dead = true; K.cleared += 1; G.burst(t.x, t.y - 40, t.boss ? '#ffd23f' : '#fde68a', t.boss ? 40 : 12, t.boss ? 260 : 140); G.sfx('coin'); }
        }
        if (s.y < 60) s.dead = true;
      }
      K.shots = K.shots.filter((s) => !s.dead); K.mons = K.mons.filter((m) => !m.dead);
      // 웨이브 넘김 · 승리
      if (K.queue.every((q) => q.out) && K.mons.length === 0 && !K.done) {
        if (K.wave < 2) startWave(G, K.wave + 1);
        else { K.done = true; G.climax(); G.sfx('win'); G.flash('#fff3a0', 0.2); G.pop('WAVE 3/3 클리어', '성문 방어 성공!', '원정 인장 +20 · 강화석 +12', 'gold', 2.4); G.caption(`성문 ${Math.round(K.gate)}% 로 지켜냄`); G.finish(2.4); }
      }
      // 손대지 않으면: 성문에 가장 가까운 몬스터 줄로
      if (G.phase === 'play' && G.idle > 1.2 && K.mons.length) {
        const near = K.mons.reduce((a, b) => (b.y > a.y ? b : a));
        if (near.lane !== K.lane) { G.hint(LANE_X[near.lane], 520); K.auto += dt; if (K.auto > 0.35) { K.auto = 0; move(G, near.lane); } } else { G.hint(null); K.auto = 0; }
      }
    },
    draw(G, ctx) {
      G.bg('bg:dam1', -60, 526);
      // 성문 선 · 성문 HP
      ctx.fillStyle = 'rgba(255,210,63,.35)'; ctx.fillRect(20, GATE_Y, 320, 3);
      G.rr(70, 56, 220, 24, 12, 'rgba(27,18,11,.85)', '#ffd23f', 2);
      G.bar(76, 60, 208, 16, K.gate / 100, K.gate > 50 ? '#22c55e' : '#f59e0b');
      G.text(`성문 ${Math.round(K.gate)}%  ·  WAVE ${K.wave + 1}/3`, 180, 68, { size: 12, color: '#fff', stroke: '#2a1606', sw: 4 });
      // 줄 표시
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i === K.lane ? 'rgba(255,210,63,.12)' : 'rgba(255,255,255,.03)'; ctx.fillRect(LANE_X[i] - 46, 90, 92, GATE_Y - 90); }
      for (const m of [...K.mons].sort((a, b) => a.y - b.y)) { KIT.unit(G, m, G.t); if (m.boss) G.bar(m.x - 40, m.y - 160 * m.s, 80, 9, m.hp / m.max, '#ef4444'); }
      for (const s of K.shots) G.sprite('arrow:basic', s.x, s.y, { s: 1, rot: -Math.PI / 2, ay: 0.5 });
      // 아래 판 · 레온
      ctx.fillStyle = 'rgba(43,26,14,.94)'; ctx.fillRect(0, 470, 360, 170); ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, 468, 360, 3);
      for (let i = 0; i < 3; i++) { G.rr(LANE_X[i] - 44, 480, 88, 92, 16, i === K.lane ? 'rgba(255,210,63,.18)' : 'rgba(255,255,255,.05)', i === K.lane ? '#ffd23f' : 'rgba(255,255,255,.15)', 2); }
      KIT.unit(G, K.hero, G.t);
      
    },
    debug: () => ({ wave: K.wave, mons: K.mons.length, gate: Math.round(K.gate), cleared: K.cleared }),
    tapAt() { const near = K.mons.length ? K.mons.reduce((a, b) => (b.y > a.y ? b : a)) : null; return [LANE_X[near ? near.lane : (K.lane + 1) % 3], 520]; },
  };
})();
