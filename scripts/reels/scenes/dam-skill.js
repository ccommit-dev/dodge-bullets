/* 릴스 · 성문 방어 2 — 끌어서 줄을 옮기고, 원소를 고르고, 무리가 몰릴 때 운석을 떨군다. 성문이 0% 면 진다 (game/arrows · game/skills · 스킬 무기는 쿨타임) */
window.RF_SCENE = (() => {
  const { LANE_X, GATE_Y, depth } = KIT;
  const CARDS = [{ k: 'fire', name: '불화살', desc: '세 줄로 퍼진다 · 화상', col: '#f97316' }, { k: 'ice', name: '얼음화살', desc: '세 줄 · 느려진다', col: '#38bdf8' }];
  const ULT = { x: 244, y: 482, w: 92, h: 80 };
  const ROWS = 12, COOL = 5, LEAK = 13, SWARM_LEAK = 3, ROCKS = 16, BOOM_AT = 0.85;
  let K;
  /** 카메라 · 흔들림을 빼고 그린다 — 큰 글자가 줌에 밀려 화면 밖으로 나가지 않게 */
  function onScreen(ctx, fn) { ctx.save(); ctx.setTransform(ctx.canvas.width / 360, 0, 0, ctx.canvas.height / 640, 0, 0); fn(); ctx.restore(); }

  function spawnRow(G) {
    const rush = K.rows >= 6;
    for (let i = 0; i < 3; i++) if (rush || (K.rows + i) % 3 !== 2) K.mons.push({ id: (K.rows + i) % 2 ? 'goblin' : 'slime', lane: i, x: LANE_X[i] + (Math.random() * 16 - 8), y: 60 - Math.random() * 30, hp: rush ? 3 : 2, sp: rush ? 62 : 48, s: 0.55, mode: 'idle', mt: 0, phase: Math.random() });
    // 떼 — 약한 작은 몬스터가 같이 몰려온다. 새어도 조금만 깎이고, 운석 한 방에 쓸린다
    for (let i = 0, n = rush ? 5 : 3; i < n; i++) { const lane = Math.floor(Math.random() * 3); K.mons.push({ id: Math.random() < 0.5 ? 'slime' : 'goblin', lane, x: LANE_X[lane] + (Math.random() * 70 - 35), y: 60 - Math.random() * 60, hp: 1, sp: rush ? 72 : 58, s: 0.4, small: true, mode: 'idle', mt: 0, phase: Math.random() }); }
    K.rows += 1;
  }
  function pick(G, i) {
    if (K.card !== 'open') return;
    K.card = 'done'; K.arrow = CARDS[i].k; G.sfx('merge'); G.flash(CARDS[i].col, 0.12); G.stamp(i === 0 ? '불화살!!' : '얼음화살!!', CARDS[i].col, 220, 0.9); G.punch(0.05);
    G.emit('choice', { skill: CARDS[i].k }); G.caption(`${CARDS[i].name}! 끌어서 줄을 맞춰요`);
    K.cool = COOL;
  }
  function ult(G) {
    if (K.card !== 'done' || K.cool > 0 || K.meteor >= 0) return;
    K.meteor = 0; K.boom = false; K.cool = COOL; K.boomN = 0; G.sfx('bolt'); G.caption('운석 낙하!'); G.zoom(1.1, 180, 230, BOOM_AT); G.vignette('#ff8a1f', 0.7); G.speed(BOOM_AT);
    K.rocks = Array.from({ length: ROCKS }, (_, i) => ({ x: 24 + Math.random() * 312, ty: 110 + Math.random() * 200, at: i * 0.03, s: 0.7 + Math.random() * 0.9, hit: false }));
  }
  const move = (x) => { K.hero.x = Math.max(44, Math.min(316, x)); K.moved = true; };
  return {
    id: 'dam-skill',
    canLose: true,
    introDur: 1.5,
    hook: ['화살 한 줄로는', '못 막는다'],
    climaxStamp: '성문 방어!!', raysAt: [180, 200],
    caption0: '끌어서 주인공을 옮겨요',
    endLines: ['출발 전에 고르는 스킬 무기', '스킬 무기 10종 · 불화살 · 얼음화살 · 운석'],
    init() {
      K = { mons: [], shots: [], rows: 0, rowT: 0, shootT: 0, gate: 100, card: 'wait', arrow: 'basic', cool: -1, meteor: -1, boom: false, kills: 0, cardT: 0, moved: false, rocks: [], boomN: 0, big: null, tilt: 0,
        hero: { id: 'hero', x: 180, y: 452, s: 0.75, mode: 'idle', mt: 0 } };
    },
    onTap(G, x, y) {
      if (G.phase !== 'play') return true;
      if (K.card === 'open') { if (y > 150 && y < 430) pick(G, x < 180 ? 0 : 1); return true; }
      if (x >= ULT.x && x <= ULT.x + ULT.w && y >= ULT.y && y <= ULT.y + ULT.h) { ult(G); return true; }
      move(x); return true;
    },
    onDrag(G, x, y) { if (G.phase !== 'play' || K.card === 'open' || (y > ULT.y && x > ULT.x)) return true; move(x); return true; },
    onKey(G) { if (K.card === 'open') pick(G, 0); else ult(G); },
    update(G, dt) {
      KIT.tick(K.hero, dt);
      K.tilt = Math.max(0, K.tilt - dt * 0.09);
      if (K.big) { K.big.t += dt; if (K.big.t > 1.3) K.big = null; }
      if (G.over) return;
      const slow = K.card === 'open' ? 0.12 : 1;   // 고르는 동안은 거의 멈춤
      K.rowT += dt * slow;
      if (K.rowT > 1.15 && K.rows < ROWS) { K.rowT = 0; spawnRow(G); }
      if (G.pt > 2.4 && K.card === 'wait') { K.card = 'open'; K.cardT = 0; G.sfx('legend'); G.caption('화살 원소를 골라요'); }
      if (K.card === 'open') { K.cardT += dt; if (K.cardT > 5) { K.card = 'skipped'; G.caption('원소를 못 골랐어요 — 기본 화살뿐!'); } }
      if (K.cool > 0) { const was = K.cool; K.cool = Math.max(0, K.cool - dt); if (was > 0 && K.cool === 0) { G.sfx('coin'); G.caption('운석 준비 — 몰릴 때 눌러요!'); } }
      for (const m of K.mons) {
        KIT.tick(m, dt); m.y += m.sp * dt * slow * (m.chill ? 0.5 : 1); m.s = depth(m.y) * (m.small ? 0.72 : 1);
        if (m.y >= GATE_Y) { const leak = m.small ? SWARM_LEAK : LEAK; m.dead = true; K.gate = Math.max(0, K.gate - leak); G.shake(m.small ? 2 : 4, 0.2); G.float(`-${leak}%`, m.x, GATE_Y - 20, '#fca5a5', m.small ? 15 : 20, 0.8); G.sfx('fail'); }
      }
      if (K.gate <= 0) { G.lose('성문이 뚫렸어요!', [`${K.kills}마리 막았어요 · 끌어서 줄을 맞추고`, '몰릴 때 운석을 눌러 보세요']); return; }
      // 사격 — 주인공이 선 자리에서 위로. 원소를 고르면 세 갈래
      K.shootT += dt * slow;
      if (K.shootT > 0.3 && K.meteor < 0) {
        K.shootT = 0; KIT.attack(K.hero, 0.25);
        const off = K.arrow === 'basic' ? [0] : [-46, 0, 46];
        for (const d of off) K.shots.push({ x: K.hero.x, y: K.hero.y - 60, tx: K.hero.x + d, kind: K.arrow });
      }
      for (const s of K.shots) {
        s.y -= 560 * dt; s.x += (s.tx - s.x) * Math.min(1, dt * 6);
        const t = K.mons.find((m) => !m.dead && Math.abs(m.x - s.x) < 30 && Math.abs(m.y - 28 - s.y) < 24);
        if (t) { if (!t.small) s.dead = true; t.hp -= K.arrow === 'fire' ? 2 : K.arrow === 'ice' ? 1.5 : 1; t.chill = K.arrow === 'ice'; KIT.hit(t); G.sfx('hit'); if (t.hp <= 0) { t.dead = true; K.kills += 1; G.burst(t.x, t.y - 30, K.arrow === 'ice' ? '#7dd3fc' : '#fb923c', 10, 140); G.float('+처치', t.x, t.y - 50, '#ffe066', 15, 0.6); } }
        if (s.y < 60) s.dead = true;
      }
      // 운석
      if (K.meteor >= 0) {
        K.meteor += dt;
        // 운석이 차례로 꽂힌다 — 꽂힌 자리의 몬스터가 바로 쓸린다
        for (const r of K.rocks) if (!r.hit && K.meteor >= r.at + 0.3) {
          r.hit = true; G.burst(r.x, r.ty, '#ff8a1f', 14, 240); G.ring(r.x, r.ty, '#ffd23f', 70 + r.s * 40, 0.3); G.shake(10, 0.2); G.kick((Math.random() - 0.5) * 8, 5); K.tilt = Math.max(K.tilt, 0.02); G.sfx('hit');
          for (const m of K.mons) if (!m.dead && Math.hypot(m.x - r.x, m.y - 30 - r.ty) < 52) { m.dead = true; K.kills += 1; K.boomN += 1; G.burst(m.x, m.y - 30, '#f97316', 12, 200); }
        }
        if (K.meteor > BOOM_AT && !K.boom) {
          K.boom = true; G.flash('#fff3a0', 0.34); G.impact(3, 180, 230); G.sfx('bolt'); G.coins(40, 470, 18); G.coins(320, 470, 18); G.vignette('#ff5a1f', 1); K.tilt = 0.06; G.zoom(1.16, 180, 230, 0.4);
          for (const m of K.mons) if (!m.dead) { m.dead = true; K.kills += 1; K.boomN += 1; G.burst(m.x, m.y - 30, '#f97316', 16, 220); }
          const n = K.boomN;
          if (n) { K.big = { n, t: 0 }; G.caption(`한 번에 ${n}마리!`); } else G.stamp('헛스윙…', '#cbd5e1', 260, 1.1);
        }
        if (K.meteor > BOOM_AT + 0.15) { K.meteor = -1; K.rocks = []; if (!K.big) G.caption('끌어서 줄을 맞춰요'); }
      }
      K.shots = K.shots.filter((s) => !s.dead); K.mons = K.mons.filter((m) => !m.dead);
      // 다 막으면 승리
      if (K.rows >= ROWS && !K.mons.length && K.meteor < 0) {
        K.big = null; G.climax(); G.sfx('win'); G.coins(180, 470, 30); G.pop('성문 방어 성공', `${K.kills}마리 · 성문 ${Math.round(K.gate)}%`, '스킬 무기 10종 중 운석', 'gold', 2.4); G.caption(`성문 ${Math.round(K.gate)}% 지켰다!`); G.finish(2.6);
        return;
      }
      // 손대지 않으면 힌트만
      if (G.phase === 'play' && G.idle > 1.2) {
        if (K.card === 'open') G.hint(90, 300);
        else if (K.card === 'done' && K.cool === 0) G.hint(ULT.x + ULT.w / 2, ULT.y + 40);
        else G.hint(K.hero.x > 180 ? 90 : 270, 420);
      } else G.hint(null);
    },
    draw(G, ctx) {
      // 큰 한 방 — 화면이 뒤집어질 듯 기운다
      if (K.tilt > 0) { ctx.translate(180, 300); ctx.rotate(Math.sin(G.t * 46) * K.tilt); ctx.translate(-180, -300); }
      G.bg('bg:dam3', -60, 526);
      ctx.fillStyle = 'rgba(255,210,63,.35)'; ctx.fillRect(20, GATE_Y, 320, 3);
      for (const m of [...K.mons].sort((a, b) => a.y - b.y)) { KIT.unit(G, m, G.t); if (m.chill) { ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#7dd3fc'; ctx.beginPath(); ctx.arc(m.x, m.y - 30 * m.s, 22 * m.s, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } }
      for (const s of K.shots) G.sprite(`arrow:${s.kind}`, s.x, s.y, { s: 1, rot: -Math.PI / 2, ay: 0.5 });
      for (const r of K.rocks) if (!r.hit && K.meteor >= r.at) { const k = Math.min(1, (K.meteor - r.at) / 0.3); G.sprite('skill:meteor', r.x - (1 - k) * 90, -60 + k * (r.ty + 60), { s: r.s, ay: 0.5 }); }
      G.rr(90, 56, 180, 24, 12, 'rgba(27,18,11,.85)', '#ffd23f', 2);
      G.bar(96, 60, 168, 16, K.gate / 100, K.gate > 35 ? '#22c55e' : '#ef4444');
      G.text(`성문 ${Math.round(K.gate)}%`, 180, 68, { size: 13, color: '#fff', stroke: '#2a1606', sw: 4 });
      ctx.fillStyle = 'rgba(43,26,14,.94)'; ctx.fillRect(0, 470, 360, 170); ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, 468, 360, 3);
      KIT.unit(G, K.hero, G.t);
      // 스킬 무기 단추 — 쿨타임이 끝나면 언제든 다시
      const ready = K.card === 'done' && K.cool === 0, pulse = ready ? 1 + Math.sin(G.t * 8) * 0.05 : 1;
      ctx.save(); ctx.translate(ULT.x + ULT.w / 2, ULT.y + ULT.h / 2); ctx.scale(pulse, pulse);
      G.rr(-46, -40, 92, 80, 18, ready ? '#7c2d12' : 'rgba(255,255,255,.06)', ready ? '#ffd23f' : 'rgba(255,255,255,.2)', 3);
      G.sprite('skill:meteor', 0, 22, { s: 0.62, alpha: ready ? 1 : 0.35 });
      G.text(ready ? '운석!' : K.cool > 0 ? `${K.cool.toFixed(1)}초` : '스킬 무기', 0, 32, { size: 13, color: '#fff' });
      ctx.restore();
      G.sprite(`skill:${K.arrow === 'basic' ? 'bolt' : K.arrow}`, 60, 552, { s: 0.6, alpha: K.arrow === 'basic' ? 0.4 : 1 });
      G.text(K.arrow === 'basic' ? '기본 화살' : K.arrow === 'fire' ? '불화살' : '얼음화살', 60, 566, { size: 13, color: '#ffe08a' });
      G.text('← 끌어서 이동 →', 160, 520, { size: 14, color: '#f5d9a8', alpha: K.moved ? 0.35 : 0.95 });
      // 스킬 고르기 카드
      if (K.card === 'open') {
        ctx.fillStyle = 'rgba(10,6,3,.7)'; ctx.fillRect(0, 56, 360, 414);
        G.text('원소 전환! 하나 고르기', 180, 130, { size: 24, color: '#ffd23f', stroke: '#2a1606', sw: 6 });
        CARDS.forEach((c, i) => {
          const x = 24 + i * 166, y = 160;
          G.rr(x, y, 146, 250, 18, '#fff3d6', c.col, 5);
          G.sprite(`skill:${c.k}`, x + 73, y + 120, { s: 1.2 });
          G.text(c.name, x + 73, y + 160, { size: 18, color: '#3b2415' });
          G.text(c.desc, x + 73, y + 192, { size: 13, color: '#6b4a2f' });
          G.rr(x + 23, y + 210, 100, 28, 12, c.col); G.text('고르기', x + 73, y + 224, { size: 14, color: '#fff' });
        });
      }
      // 한 번에 n마리 — 많이 쓸수록 숫자가 커진다
      if (K.big) {
        const b = K.big, pop = b.t < 0.14 ? 1.22 - (b.t / 0.14) * 0.22 : 1, a = b.t > 1 ? (1.3 - b.t) / 0.3 : 1, label = `${b.n}마리!`, size = Math.min(40 + b.n * 1.8, 300 / (label.length * 0.82));
        onScreen(ctx, () => { ctx.globalAlpha = Math.max(0, a); ctx.translate(180, 240); ctx.rotate(-0.05); ctx.scale(pop, pop);
          G.text('한 번에', 0, -size * 0.62, { size: 30, color: '#fff', stroke: '#2a1606', sw: 8 });
          G.text(label, 0, 18, { size, color: '#ff8a1f', stroke: '#2a1606', sw: 10 }); });
      }
    },
    debug: () => ({ card: K.card, arrow: K.arrow, cool: +(K.cool).toFixed(1), kills: K.kills, gate: K.gate, rows: K.rows, big: K.big ? K.big.n : 0, mons: K.mons.length }),
    bot(G) {
      if (G.phase !== 'play' || G.over) return null;
      if (K.card === 'open') return { tap: [90, 300] };
      if (K.card === 'done' && K.cool === 0 && K.mons.length >= 10) return { tap: [ULT.x + ULT.w / 2, ULT.y + 40] };
      const near = [...K.mons].filter((m) => !m.small).sort((a, b) => b.y - a.y)[0] || K.mons[0];
      return near && Math.abs(near.x - K.hero.x) > 20 ? { drag: [near.x, 420] } : null;
    },
  };
})();
