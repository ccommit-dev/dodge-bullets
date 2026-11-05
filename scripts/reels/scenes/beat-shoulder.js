/* 릴스 · 비트 수련 2 — 16비트 장 대장: 곡을 고르고 빠른 동시 노트를 넘기면 상자에서 용린 견갑(BeatGame.tsx 최초 클리어 확정 획득 · 다시 깨면 조각). 자동 없음.
 * 곡은 beat/tracks.ts Plasma Gun(160 BPM · 16비트 · hard, 사다리 14번째 = 용린 견갑 묶음의 장 대장), 대장 그림은 flame-wyvern-clean(BeatGame stageNo ≥ 7).
 * 체력은 beat/world.ts 그대로 — hard 6칸 · 놓치면 1칸(0.45초 무적) · PERFECT 4번마다 1칸 회복, 0칸이면 진다. 대장을 쓰러뜨리거나 곡 끝까지 살아남으면 클리어. 피해 = 줄 [14, 7, 6, 25] + 콤보 × 0.8(applyRaidReward) · 대장 체력만 릴스 길이에 맞췄다 */
window.RF_SCENE = (() => {
  const CHART = [
    // 몸풀기 — 박마다 한 줄
    [0, 1], [1, 2], [2, 0], [3, 3], [4, 1], [5, 2], [6, 0], [7, 3],
    // 16비트 — 반박 · 두 줄 동시
    [8, 0], [8.5, 1], [9, 2], [9.5, 3], [10, 0], [10, 3], [11, 1], [11.5, 2], [12, 0], [12.5, 0], [13, 3], [13.5, 3], [14, 1], [14, 2], [15, 0], [15.5, 1],
    [16, 2], [16.5, 3], [17, 0], [17, 3], [18, 1], [18, 2], [19, 0], [19.5, 3], [20, 1], [20.5, 2], [21, 0], [21, 3],
    // 마무리
    [22, 0], [23, 3], [24, 1], [24, 2], [25, 0], [25, 3],
  ];
  const ENEMY = 1200, DMG = [14, 7, 6, 25], HP_MAX = 6, INVULN = 0.45, HEAL_MAX = 8, AUTO_START = 3;
  const START = { x: 70, y: 470, w: 220, h: 62 };
  let K, B;
  /** 큰 폭발 빛 — { x, y, t, life, r } */
  function drawBlast(ctx, b, c1 = '255,180,60', c2 = '255,90,20') {
    if (!b || b.t >= b.life) return;
    const k = b.t / b.life, r = b.r * (0.2 + k * 1.1), g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
    g.addColorStop(0, `rgba(255,255,255,${1 - k})`); g.addColorStop(0.35, `rgba(${c1},${0.9 * (1 - k)})`); g.addColorStop(1, `rgba(${c2},0)`);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(b.x - r, b.y - r, r * 2, r * 2); ctx.restore();
  }
  const grade = () => { const a = K.hits / Math.max(1, K.hits + B.miss); return a >= 0.9 ? 'S' : a >= 0.75 ? 'A' : a >= 0.55 ? 'B' : 'C'; };   // 게임 등급(beat/tracks.ts gradeOf)
  function choose(G, data) { if (!K.chosen) { K.chosen = true; G.emit('choice', data); } }
  function begin(G, tapped) {
    if (K.mode !== 'select') return;
    K.mode = 'play'; G.sfx('merge'); G.caption('16비트 · 두 줄 동시 노트도!');
    if (tapped) choose(G, { song: 'plasma-gun' });
  }
  function done(G) {
    if (K.mode !== 'play' || G.over) return;
    const bx = K.boss.x, by = K.boss.y - 60;
    K.mode = 'result'; K.rt = 0; K.enemy = 0; K.rank = grade(); B.judgeT = 0; KIT.hit(K.boss); K.dead = 0.01; K.blast = { x: bx, y: by, t: 0, life: 0.8, r: 440 };
    G.impact(3, bx, by); G.vignette('#ff8a1f', 0.9); G.burst(bx, by, '#ffd23f', 70, 320); G.coins(bx, by, 24);
    for (let i = 0; i < 6; i++) G.after(i * 0.1, () => { const x = bx + (Math.random() - 0.5) * 110, y = by + (Math.random() - 0.5) * 100; G.burst(x, y, i % 2 ? '#ffd23f' : '#ff8a1f', 24, 240); G.ring(x, y, '#fff', 90, 0.32); G.kick((Math.random() - 0.5) * 8, 5); G.sfx('hit'); });
    G.caption(`${K.rank} 랭크 — 첫 클리어 보상!`);
  }
  function reveal(G) {
    K.revealed = true; G.climax(); G.sfx('legend'); G.flash('#fff', 0.34); G.burst(180, 430, '#ffd23f', 80, 340); G.coins(50, 540, 18); G.coins(310, 540, 18); G.impact(2.4, 180, 430); G.zoom(1.3, 180, 430, 1.1); G.coinRain(2.2);
    for (let i = 0; i < 5; i++) G.after(i * 0.16, () => { G.ring(180, 440 - i * 40, i % 2 ? '#fff' : '#ffd23f', 150 + i * 40, 0.45); G.burst(180, 470, '#fff3a0', 18, 260); });
    G.pop('장 대장 최초 클리어', '용린 견갑 획득!', '다시 깨면 견갑 조각', 'gold', 2.6);
    G.finish(2.8);
  }
  return {
    id: 'beat-shoulder',
    canLose: true,
    introDur: 1.5,
    hook: ['장 대장을 넘기면', '견갑이 떨어진다'],
    climaxStamp: '획득!!', raysAt: [180, 430], stampY: 306,
    caption0: '곡을 고르고 시작',
    endLines: ['비트 수련 보상 = 견갑', '정찰 · 그림자 · 오우거 · 용린 견갑'],
    init(G) {
      K = { pulse: 0, dead: 0, blast: null, sparkT: 0, mode: 'select', selT: 0, rt: 0, chest: 0, hp: HP_MAX, inv: 0, heal: 0, hits: 0, enemy: ENEMY, rank: 'S', chosen: false, opened: false, revealed: false, lostHeart: 0,
        hero: { id: 'hero', x: 120, y: 236, s: 0.62, mode: 'idle', mt: 0 }, leon: { id: 'leon', x: 64, y: 242, s: 0.55, mode: 'idle', mt: 0, phase: 0.4 },
        boss: { id: 'flame-wyvern-clean', x: 280, y: 246, s: 0.54, mode: 'idle', mt: 0 } };
      B = KIT.beat({ chart: CHART, bpm: 160, speed: 360, feverAt: 99999,
        onHit: (lane, j) => {
          KIT.attack(lane % 2 ? K.leon : K.hero, 0.3); KIT.hit(K.boss); K.hits += 1;
          const dmg = DMG[lane] + Math.floor(B.combo * 0.8);
          K.enemy = Math.max(0, K.enemy - dmg);
          const heat = Math.min(1, B.combo / 28);
          K.pulse = 0.3 + heat * 0.7; if (heat > 0.25) G.vignette(heat > 0.6 ? '#f0abfc' : '#ffd23f', 0.12 + heat * 0.4);
          // 패드가 어긋나지 않게 패드 줄을 중심으로 당긴다
          if (B.combo % 7 === 0) { G.zoom(1.07 + heat * 0.08, 180, 530, 0.18); G.flash('#fff', 0.07); G.ring(180, 380, '#ffd23f', 130 + heat * 110, 0.4); G.speed(0.3); G.coins(270, 170, 5 + Math.floor(heat * 10)); }
          G.float(String(dmg), 270 + Math.random() * 30 - 15, 130, j === 'PERFECT' ? '#ffd23f' : '#fff', (j === 'PERFECT' ? 22 : 17) + heat * 22, 0.7);
          G.sfx(j === 'PERFECT' ? 'coin' : 'tap');
          // kit 의 GOOD 은 게임의 GREAT · GOOD 을 합친 칸이라 +1(게임 GREAT 값)
          K.heal += j === 'PERFECT' ? 2 : 1;
          if (K.heal >= HEAL_MAX) { K.heal -= HEAL_MAX; if (K.hp < HP_MAX) { K.hp += 1; G.float('♥ +1', 120, 118, '#fda4af', 20, 0.8); } }
        },
        onMiss: () => {
          G.sfx('fail');
          if (K.inv > 0 || G.over || K.mode !== 'play') return;
          K.hp -= 1; K.inv = INVULN; K.lostHeart = 0.4; G.shake(5, 0.18); KIT.attack(K.boss, 0.3);
          if (K.hp <= 0) { B.judgeT = 0; G.lose('체력이 다 떨어졌어요!', [`${K.hits}/${CHART.length} 노트 · MISS ${B.miss}`, 'HARD 는 6칸 · 놓칠 때마다 1칸']); }
        },
        onEnd: () => done(G) });
    },
    onTap(G, x, y) {
      if (G.phase !== 'play') return true;
      if (K.mode === 'select') { if (y > 420) begin(G, true); G.hint(null); return true; }
      if (K.mode === 'play') { const lane = B.laneAt(x, y); if (lane >= 0 && !G.over) { choose(G, { lane }); B.press(lane); G.hint(null); } }
      if (K.mode === 'result' && K.rt > 0.4) K.opened = true;
      return true;
    },
    onKey(G) {
      if (K.mode === 'select') begin(G, true);
      else if (K.mode === 'play' && !G.over) { const n = B.next(); if (n) { choose(G, { lane: n.lane }); B.press(n.lane); } }
      else if (K.mode === 'result' && K.rt > 0.4) K.opened = true;
    },
    update(G, dt) {
      for (const u of [K.hero, K.leon, K.boss]) KIT.tick(u, dt);
      K.inv = Math.max(0, K.inv - dt); K.lostHeart = Math.max(0, K.lostHeart - dt); K.pulse = Math.max(0, K.pulse - dt * 3.2);
      if (K.dead > 0) K.dead += dt;
      if (K.blast) K.blast.t += dt;
      if (G.phase !== 'play' && G.phase !== 'climax') return;
      if (K.mode === 'select') {
        K.selT += dt;
        if (G.idle > 1.3) G.hint(180, START.y + 31);
        if (K.selT >= AUTO_START) begin(G, false);
        return;
      }
      if (K.mode === 'play') {
        if (G.over) return;
        B.update(dt);
        if (G.over) return;
        if (K.enemy <= 0) { done(G); return; }
        const n = B.next(); if (G.idle > 1.2 && n) { const r = B.padRect(n.lane); G.hint(r.x + r.w / 2, r.y + 30); } else G.hint(null);
        return;
      }
      // 결과 → 상자 → 견갑. 상자는 눌러도 열리고 1.6초면 스스로 열린다(이미 이긴 뒤다)
      K.rt += dt;
      if (!K.opened && K.rt > 1.6) K.opened = true;
      if (K.opened) {
        K.chest += dt;
        K.sparkT -= dt;
        if (K.sparkT <= 0) { K.sparkT = 0.09; G.burst(180 + (Math.random() - 0.5) * 60, 470 - Math.random() * 60, '#fff3a0', 3, 170); }
        if (K.chest > 0.6 && !K.revealed) reveal(G);
      }
    },
    draw(G, ctx) {
      ctx.fillStyle = '#120b1f'; ctx.fillRect(0, 0, 360, 640);
      if (K.mode === 'select') {
        const g = ctx.createLinearGradient(0, 0, 0, 640); g.addColorStop(0, '#2a1440'); g.addColorStop(1, '#120b1f'); ctx.fillStyle = g; ctx.fillRect(0, 0, 360, 640);
        G.text('비트 수련 · 장 대장', 180, 92, { size: 18, color: '#c4b5fd' });
        G.text('16비트', 180, 128, { size: 36, color: '#fff', stroke: '#2a1640', sw: 6 });
        const b = 1 + Math.sin(G.t * 3) * 0.03;
        ctx.save(); ctx.translate(180, 262); ctx.scale(b * 1.6, b * 1.6); G.sprite('cover:plasma-gun', 0, 48); ctx.restore();
        G.text('Plasma Gun · 160 BPM · HARD', 180, 358, { size: 15, color: '#f5d9a8' });
        G.rr(70, 382, 220, 36, 12, 'rgba(255,255,255,.06)', 'rgba(255,255,255,.2)', 2);
        G.sprite('gear:shoulder-dragon', 94, 414, { s: 0.3 }); G.text('클리어 보상 · 용린 견갑', 196, 400, { size: 14, color: '#ffd23f' });
        const p = 1 + Math.sin(G.t * 5) * 0.04;
        ctx.save(); ctx.translate(180, START.y + 31); ctx.scale(p, p);
        G.rr(-110, -31, 220, 62, 18, '#ff8a1f', '#3b2415', 4); G.text('연주 시작 ▶', 0, 2, { size: 22, color: '#1b1206' }); ctx.restore();
        G.text(`${Math.max(1, Math.ceil(AUTO_START - K.selT))}초 뒤 시작`, 180, 554, { size: 14, color: '#c4b5fd' });
        return;
      }
      G.bg('bg:beat', 46, 216);
      const ratio = K.enemy / ENEMY;
      KIT.bossBar(G, `${ratio > 0.66 ? '접근' : ratio > 0.3 ? '교전' : 'DROP 결전'} · 장 대장`, ratio, 56);
      KIT.unit(G, K.leon, G.t); KIT.unit(G, K.hero, G.t);
      // 이 그림만 오른쪽을 보게 그려져 있다(game/draw.ts FLIP_RIGHT_FACING) — 뒤집어 왼쪽을 보게
      if (K.dead < 0.5) { const d = K.dead; ctx.save(); ctx.translate(K.boss.x, 0); ctx.scale(-1, 1); KIT.unit(G, d > 0 ? { ...K.boss, x: 0, s: K.boss.s * (1 + d * 0.9), alpha: 1 - d * 2, flash: 1, flashC: '#fff' } : { ...K.boss, x: 0 }, G.t); ctx.restore(); }
      drawBlast(ctx, K.blast);
      if (K.mode === 'play') {
        // 체력 — hard 6칸
        G.rr(96, 86, 168, 26, 13, 'rgba(27,18,11,.8)', K.lostHeart > 0 ? '#fca5a5' : 'rgba(255,255,255,.2)', 2);
        for (let i = 0; i < HP_MAX; i++) G.text(i < K.hp ? '♥' : '♡', 118 + i * 25, 99, { size: 18, color: i < K.hp ? '#ff6b81' : 'rgba(255,255,255,.4)' });
        // 판정 글자 · 콤보는 콤보가 쌓일수록 커진다 — kit 의 글자 대신 여기서 그린다
        const jt = B.judgeT, combo = B.combo, heat = Math.min(1, combo / 28);
        B.judgeT = 0; B.combo = 0; B.draw(G, ctx); B.judgeT = jt; B.combo = combo;
        if (K.pulse > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,210,63,${K.pulse * 0.34})`; ctx.fillRect(0, 256, 360, 236); ctx.restore(); }
        if (jt > 0) G.text(B.judge, 180, 326, { size: (30 + heat * 22) * (0.85 + jt * 0.55), color: B.judge === 'PERFECT' ? '#ffd23f' : B.judge === 'GOOD' ? '#86efac' : '#fca5a5', stroke: '#2a1606', sw: 6 + heat * 3, alpha: Math.min(1, jt * 3) });
        if (combo >= 2) G.text(`${combo} COMBO`, 180, 380, { size: 22 + heat * 20, color: heat > 0.5 ? '#ffd23f' : '#fff', stroke: '#2a1606', sw: 5 + heat * 3 });
        G.text('Plasma Gun · 160 BPM · 16비트', 12, 274, { size: 13, color: '#c4b5fd', align: 'left' });
        return;
      }
      // 결과 · 상자
      ctx.fillStyle = 'rgba(10,6,20,.82)'; ctx.fillRect(0, 256, 360, 330);
      // 빛기둥 — 상자가 열리면 땅에서 하늘까지 선다
      const bk = K.opened ? Math.min(1, K.chest / 0.6) : 0;
      if (bk > 0) {
        const w = (K.revealed ? 130 : 24 + bk * 80) + Math.sin(G.t * 14) * 7, g = ctx.createLinearGradient(180 - w, 0, 180 + w, 0);
        g.addColorStop(0, 'rgba(255,214,90,0)'); g.addColorStop(0.5, `rgba(255,240,170,${K.revealed ? 0.8 : 0.45 + bk * 0.4})`); g.addColorStop(1, 'rgba(255,214,90,0)');
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(180 - w, 0, w * 2, 510); ctx.fillStyle = `rgba(255,255,255,${0.35 + bk * 0.4})`; ctx.fillRect(180 - w * 0.12, 0, w * 0.24, 510); ctx.restore();
      }
      if (!K.revealed) {
        G.text(K.rank, 180, 300, { size: 54, color: '#ffd23f', stroke: '#2a1640', sw: 8 });
        G.text(`MAX ${B.maxCombo} COMBO · PERFECT ${B.perfect}`, 180, 340, { size: 15, color: '#fff', stroke: '#2a1640', sw: 4 });
      }
      const shake = !K.opened ? Math.sin(G.t * 30) * 3 : 0;
      if (!K.revealed) G.sprite('chest', 180 + shake, 470, { s: 1 + Math.min(0.3, K.chest * 0.5) });
      else {
        ctx.save(); ctx.translate(180, 430); ctx.rotate(G.t * 0.5);
        for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.fillStyle = 'rgba(255,210,63,.16)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-20, -200); ctx.lineTo(20, -200); ctx.fill(); }
        ctx.restore();
        G.sprite('gear:shoulder-dragon', 180, 505, { s: 1.35 + Math.sin(G.t * 3) * 0.05 });
      }
    },
    debug: () => ({ mode: K.mode, combo: B.combo, hits: K.hits, miss: B.miss, hp: K.hp, enemy: K.enemy, revealed: K.revealed }),
    bot(G) {
      if (G.phase !== 'play' || G.over) return null;
      if (K.mode === 'select') return { tap: [180, START.y + 31] };
      if (K.mode === 'result') return K.opened ? null : { tap: [180, 430] };
      const n = B.next(); if (!n || n.t - B.t > 0.1) return null;
      const r = B.padRect(n.lane); return { tap: [r.x + r.w / 2, r.y + 30] };
    },
  };
})();
