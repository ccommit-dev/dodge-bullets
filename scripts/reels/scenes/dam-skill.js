/* 릴스 · 댐 방어전 2 — 몰려오는 무리, 화살 한 줄로는 모자라다. 스킬 하나를 고르면 화살이 바뀌고, 궁극기 운석으로 한꺼번에 */
window.RF_SCENE = (() => {
  const { LANE_X, GATE_Y, depth } = KIT;
  const CARDS = [{ k: 'fire', name: '불화살 부채', desc: '세 줄로 퍼진다 · 화상', col: '#f97316' }, { k: 'ice', name: '얼음 화살비', desc: '세 줄 · 느려진다', col: '#38bdf8' }];
  const ULT = { x: 244, y: 482, w: 92, h: 80 };
  let K;
  function spawnRow(G) {
    for (let i = 0; i < 3; i++) K.mons.push({ id: (K.rows + i) % 2 ? 'goblin' : 'slime', lane: i, x: LANE_X[i] + (Math.random() * 16 - 8), y: 60 - Math.random() * 30, hp: 4, max: 4, sp: 22 + Math.random() * 8, mode: 'idle', mt: 0, s: 1, phase: Math.random() });
    K.rows += 1;
  }
  function pick(G, i) {
    if (K.card !== 'open') return;
    K.card = 'done'; K.arrow = CARDS[i].k; G.sfx('merge'); G.flash(CARDS[i].col, 0.12);
    G.emit('choice', { skill: CARDS[i].k }); G.caption(`${CARDS[i].name}! 세 줄을 한 번에`);
    K.ultT = 0;
  }
  function ult(G) {
    if (K.ultReady !== true) return;
    K.ultReady = 'used'; K.meteor = 0; G.sfx('bolt'); G.caption('궁극기 · 운석 낙하!'); G.climax();
  }
  return {
    id: 'dam-skill',
    introDur: 1.5,
    hook: ['화살 한 줄로는', '못 막는다'],
    caption0: '화살은 자동 · 곧 스킬 고르기',
    endLines: ['고를 때마다 바뀌는 화살', '스킬 무기 10종 · 궁극기 운석'],
    init() {
      K = { mons: [], shots: [], rows: 0, rowT: 0, shootT: 0, gate: 100, card: 'wait', arrow: 'basic', ultReady: false, ultT: -1, meteor: -1, kills: 0, auto: 0,
        hero: { id: 'hero', x: 180, y: 452, s: 0.75, mode: 'idle', mt: 0 } };
    },
    onTap(G, x, y) {
      if (G.phase !== 'play') return true;
      if (K.card === 'open') { if (y > 150 && y < 430) pick(G, x < 180 ? 0 : 1); G.hint(null); return true; }
      if (K.ultReady === true && x >= ULT.x && x <= ULT.x + ULT.w && y >= ULT.y && y <= ULT.y + ULT.h) { ult(G); G.hint(null); }
      return true;
    },
    update(G, dt) {
      KIT.tick(K.hero, dt);
      const slow = K.card === 'open' ? 0.15 : 1;   // 고르는 동안은 거의 멈춤
      K.rowT += dt * slow;
      if (K.rowT > 1.1 && K.rows < 9) { K.rowT = 0; spawnRow(G); }
      if (G.pt > 2.4 && K.card === 'wait') { K.card = 'open'; G.sfx('legend'); G.caption('스킬 하나를 골라요'); }
      for (const m of K.mons) {
        KIT.tick(m, dt); m.y += m.sp * dt * slow * (K.arrow === 'ice' && m.chill ? 0.5 : 1); m.s = depth(m.y);
        if (m.y >= GATE_Y) { m.dead = true; K.gate = Math.max(25, K.gate - 6); G.shake(4, 0.2); }
      }
      // 사격
      K.shootT += dt * slow;
      if (K.shootT > 0.3 && K.meteor < 0) {
        K.shootT = 0; KIT.attack(K.hero, 0.25);
        const lanes = K.arrow === 'basic' ? [1] : [0, 1, 2];
        for (const l of lanes) K.shots.push({ x: K.hero.x, y: K.hero.y - 60, tx: LANE_X[l], lane: l, kind: K.arrow });
      }
      for (const s of K.shots) {
        s.y -= 560 * dt; s.x += (s.tx - s.x) * Math.min(1, dt * 6);
        const t = K.mons.find((m) => !m.dead && m.lane === s.lane && Math.abs(m.y - 28 - s.y) < 24);
        if (t) { s.dead = true; t.hp -= K.arrow === 'fire' ? 2 : 1.5; t.chill = K.arrow === 'ice'; KIT.hit(t); G.sfx('hit'); if (t.hp <= 0) { t.dead = true; K.kills += 1; G.burst(t.x, t.y - 30, K.arrow === 'fire' ? '#fb923c' : '#7dd3fc', 10, 130); } }
        if (s.y < 60) s.dead = true;
      }
      // 궁극기 준비 — 스킬 고른 뒤 3초
      if (K.ultT >= 0 && K.ultReady === false) { K.ultT += dt; if (K.ultT > 3) { K.ultReady = true; G.caption('궁극기 준비 — 운석!'); G.sfx('coin'); } }
      // 운석
      if (K.meteor >= 0) {
        K.meteor += dt;
        if (K.meteor > 0.7 && !K.boom) {
          K.boom = true; G.flash('#fff3a0', 0.3); G.shake(14, 0.6); G.sfx('bolt');
          for (const m of K.mons) { m.dead = true; K.kills += 1; G.burst(m.x, m.y - 30, '#f97316', 16, 220); }
          G.pop('운석 낙하', `한 번에 ${K.kills}마리`, '성문 방어 · 스킬 무기 10종 중 하나', 'gold', 2.4); G.finish(2.6);
        }
      }
      K.shots = K.shots.filter((s) => !s.dead); K.mons = K.mons.filter((m) => !m.dead);
      // 손대지 않으면
      if (G.phase === 'play' && G.idle > 1.3) {
        if (K.card === 'open') { G.hint(90, 300); K.auto += dt; if (K.auto > 0.6) { K.auto = 0; pick(G, 0); } }
        else if (K.ultReady === true) { G.hint(ULT.x + ULT.w / 2, ULT.y + 40); K.auto += dt; if (K.auto > 0.6) { K.auto = 0; ult(G); } }
        else { G.hint(null); K.auto = 0; }
      }
    },
    draw(G, ctx) {
      G.bg('bg:dam3', -60, 526);
      ctx.fillStyle = 'rgba(255,210,63,.35)'; ctx.fillRect(20, GATE_Y, 320, 3);
      G.rr(90, 56, 180, 24, 12, 'rgba(27,18,11,.85)', '#ffd23f', 2);
      G.bar(96, 60, 168, 16, K.gate / 100, '#22c55e');
      G.text(`성문 ${Math.round(K.gate)}%`, 180, 68, { size: 12, color: '#fff', stroke: '#2a1606', sw: 4 });
      for (const m of [...K.mons].sort((a, b) => a.y - b.y)) { KIT.unit(G, m, G.t); if (m.chill) { ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#7dd3fc'; ctx.beginPath(); ctx.arc(m.x, m.y - 30 * m.s, 22 * m.s, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } }
      for (const s of K.shots) G.sprite(`arrow:${s.kind}`, s.x, s.y, { s: 1, rot: -Math.PI / 2, ay: 0.5 });
      if (K.meteor >= 0 && K.meteor < 0.8) {
        for (let i = 0; i < 3; i++) { const k = Math.min(1, K.meteor / 0.7); G.sprite('skill:meteor', LANE_X[i] - 60 + k * 60, -40 + k * (GATE_Y - 60) + i * 10, { s: 0.9 + i * 0.1, ay: 0.5 }); }
      }
      ctx.fillStyle = 'rgba(43,26,14,.94)'; ctx.fillRect(0, 470, 360, 170); ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, 468, 360, 3);
      KIT.unit(G, K.hero, G.t);
      // 궁극기 단추
      const ready = K.ultReady === true, pulse = ready ? 1 + Math.sin(G.t * 8) * 0.05 : 1;
      ctx.save(); ctx.translate(ULT.x + ULT.w / 2, ULT.y + ULT.h / 2); ctx.scale(pulse, pulse);
      G.rr(-46, -40, 92, 80, 18, ready ? '#7c2d12' : 'rgba(255,255,255,.06)', ready ? '#ffd23f' : 'rgba(255,255,255,.2)', 3);
      G.sprite('skill:meteor', 0, 22, { s: 0.62, alpha: ready ? 1 : 0.35 });
      G.text(ready ? '운석!' : K.ultT >= 0 ? `${Math.max(0, 3 - K.ultT).toFixed(1)}초` : '궁극기', 0, 32, { size: 12, color: '#fff' });
      ctx.restore();
      G.sprite(`skill:${K.arrow === 'basic' ? 'bolt' : K.arrow}`, 60, 552, { s: 0.6, alpha: K.arrow === 'basic' ? 0.4 : 1 });
      G.text(K.arrow === 'basic' ? '기본 화살' : K.arrow === 'fire' ? '불화살 부채' : '얼음 화살비', 60, 566, { size: 12, color: '#ffe08a' });
      // 스킬 고르기 카드
      if (K.card === 'open') {
        ctx.fillStyle = 'rgba(10,6,3,.7)'; ctx.fillRect(0, 56, 360, 414);
        G.text('레벨 업! 스킬 하나', 180, 130, { size: 24, color: '#ffd23f', stroke: '#2a1606', sw: 6 });
        CARDS.forEach((c, i) => {
          const x = 24 + i * 166, y = 160;
          G.rr(x, y, 146, 250, 18, '#fff3d6', c.col, 5);
          G.sprite(`skill:${c.k}`, x + 73, y + 120, { s: 1.2 });
          G.text(c.name, x + 73, y + 160, { size: 18, color: '#3b2415' });
          G.text(c.desc, x + 73, y + 192, { size: 12, color: '#6b4a2f' });
          G.rr(x + 23, y + 210, 100, 28, 12, c.col); G.text('고르기', x + 73, y + 224, { size: 14, color: '#fff' });
        });
      }
    },
    debug: () => ({ card: K.card, arrow: K.arrow, ult: String(K.ultReady), kills: K.kills }),
    tapAt() { if (K.card === 'open') return [90, 300]; if (K.ultReady === true) return [ULT.x + ULT.w / 2, ULT.y + 40]; return [180, 120]; },
  };
})();
