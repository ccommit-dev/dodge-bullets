/* 릴스 · 비트 수련 2 — 16비트 챕터: 곡을 고르고 빠른 동시 노트를 넘기면 상자에서 용린 견갑. 비트 수련 = 견갑 보상 */
window.RF_SCENE = (() => {
  // 150BPM · 반박 동시 노트가 섞인 16비트 챕터
  const CHART = [[0, 0], [0.5, 1], [1, 2], [1.5, 3], [2, 0], [2, 3], [3, 1], [3.5, 2], [4, 0], [4.5, 0], [5, 3], [5.5, 3], [6, 1], [6, 2], [7, 0], [7.5, 1], [8, 2], [8.5, 3], [9, 0], [9, 3], [10, 1], [10, 2], [11, 0], [11.5, 3], [12, 1], [12.5, 2], [13, 0], [13, 3]];
  const START = { x: 70, y: 470, w: 220, h: 62 };
  let K, B;
  function begin(G) { if (K.mode !== 'select') return; K.mode = 'play'; G.sfx('merge'); G.caption('16비트 · 두 줄 동시 노트도!'); G.emit('choice', { song: 'black-city-beat' }); }
  function done(G) {
    if (K.mode !== 'play') return;
    K.mode = 'result'; K.rt = 0;
    G.caption(B.miss === 0 ? 'S 랭크 — 보상 상자!' : '클리어 — 보상 상자!');
  }
  return {
    id: 'beat-shoulder',
    introDur: 1.5,
    hook: ['16비트 챕터를 넘기면', '견갑이 떨어진다'],
    climaxStamp: '획득!!', raysAt: [180, 430],
    caption0: '곡을 고르고 시작',
    endLines: ['비트 수련 보상 = 견갑', '정찰 · 그림자 · 오우거 · 용린 견갑'],
    init(G) {
      K = { mode: 'select', rt: 0, chest: 0, auto: 0,
        hero: { id: 'hero', x: 120, y: 236, s: 0.62, mode: 'idle', mt: 0 }, leon: { id: 'leon', x: 64, y: 242, s: 0.55, mode: 'idle', mt: 0, phase: 0.4 },
        boss: { id: 'armored-ogre', x: 286, y: 244, s: 0.62, mode: 'idle', mt: 0 }, hp: 1 };
      B = KIT.beat({ chart: CHART, bpm: 150, speed: 360, feverAt: 10,
        onHit: (lane, j) => { KIT.attack(lane % 2 ? K.leon : K.hero, 0.3); KIT.hit(K.boss); K.hp = Math.max(0, K.hp - 0.034); G.sfx(j === 'PERFECT' ? 'coin' : 'tap'); },
        onMiss: () => { G.shake(3, 0.15); G.sfx('fail'); },
        onFever: () => { G.flash('#f0abfc', 0.15); G.sfx('legend'); G.stamp('FEVER!!', '#f0abfc', 200); G.speed(1.2); },
        onEnd: () => done(G) });
    },
    onTap(G, x, y) {
      if (G.phase !== 'play') return true;
      if (K.mode === 'select') { if (y > 420) begin(G); G.hint(null); return true; }
      if (K.mode === 'play') { const lane = B.laneAt(x, y); if (lane >= 0) { B.press(lane); G.hint(null); } }
      if (K.mode === 'result' && K.rt > 0.8 && !K.opened) { K.opened = true; }
      return true;
    },
    onKey(G) { if (K.mode === 'select') begin(G); else if (K.mode === 'play') { const n = B.next(); if (n) B.press(n.lane); } },
    update(G, dt) {
      for (const u of [K.hero, K.leon, K.boss]) KIT.tick(u, dt);
      if (G.phase !== 'play' && G.phase !== 'climax') return;
      if (K.mode === 'select') { if (G.idle > 1.3) { G.hint(180, START.y + 31); K.auto += dt; if (K.auto > 0.7) begin(G); } return; }
      if (K.mode === 'play') {
        const idle = G.idle > 1.2; B.update(dt, idle);
        const n = B.next(); if (idle && n) { const r = B.padRect(n.lane); G.hint(r.x + r.w / 2, r.y + 30); } else G.hint(null);
        return;
      }
      // 결과 → 상자 열기 → 견갑
      K.rt += dt;
      if (!K.opened && K.rt > 1.6) K.opened = true;
      if (K.opened) {
        K.chest += dt;
        if (K.chest > 0.6 && !K.revealed) {
          K.revealed = true; G.climax(); G.sfx('legend'); G.flash('#fff3a0', 0.3); G.burst(180, 430, '#ffd23f', 60, 300); G.coins(180, 470, 24); G.impact(1.5);
          G.pop('16비트 챕터 보상', '용린 견갑 획득!', `${B.miss === 0 ? 'S' : 'A'} 랭크 · 스킬 숙련 +1 · 견갑 조각 +40`, 'gold', 2.6);
          G.finish(2.8);
        }
      }
    },
    draw(G, ctx) {
      ctx.fillStyle = '#120b1f'; ctx.fillRect(0, 0, 360, 640);
      if (K.mode === 'select') {
        const g = ctx.createLinearGradient(0, 0, 0, 640); g.addColorStop(0, '#2a1440'); g.addColorStop(1, '#120b1f'); ctx.fillStyle = g; ctx.fillRect(0, 0, 360, 640);
        G.text('비트 수련 · 챕터 3', 180, 92, { size: 18, color: '#c4b5fd' });
        G.text('16비트', 180, 128, { size: 36, color: '#fff', stroke: '#2a1640', sw: 6 });
        const b = 1 + Math.sin(G.t * 3) * 0.03;
        ctx.save(); ctx.translate(180, 270); ctx.scale(b * 1.6, b * 1.6); G.sprite('cover:city', 0, 48); ctx.restore();
        G.text('Black City Beat · 150 BPM · HARD', 180, 372, { size: 15, color: '#f5d9a8' });
        G.rr(70, 396, 220, 36, 12, 'rgba(255,255,255,.06)', 'rgba(255,255,255,.2)', 2);
        G.sprite('gear:shoulder-dragon', 104, 428, { s: 0.3 }); G.text('클리어 보상 · 용린 견갑', 196, 414, { size: 14, color: '#ffd23f' });
        const p = 1 + Math.sin(G.t * 5) * 0.04;
        ctx.save(); ctx.translate(180, START.y + 31); ctx.scale(p, p);
        G.rr(-110, -31, 220, 62, 18, '#ff8a1f', '#3b2415', 4); G.text('연주 시작 ▶', 0, 2, { size: 22, color: '#1b1206' }); ctx.restore();
        return;
      }
      G.bg('bg:beat', 46, 216);
      KIT.bossBar(G, '연습 상대 · 갑옷 오우거', K.hp, 56);
      KIT.unit(G, K.leon, G.t); KIT.unit(G, K.hero, G.t); KIT.unit(G, K.boss, G.t);
      if (K.mode === 'play') { B.draw(G, ctx); G.text('150 BPM · 16비트', 74, 274, { size: 12, color: '#c4b5fd' }); return; }
      // 결과 · 상자
      ctx.fillStyle = 'rgba(10,6,20,.82)'; ctx.fillRect(0, 256, 360, 330);
      G.text(B.miss === 0 ? 'S' : 'A', 180, 300, { size: 54, color: '#ffd23f', stroke: '#2a1640', sw: 8 });
      G.text(`MAX ${B.maxCombo} COMBO · PERFECT ${B.perfect}`, 180, 340, { size: 15, color: '#fff' });
      const shake = !K.opened ? Math.sin(G.t * 30) * 3 : 0;
      if (!K.revealed) G.sprite('chest', 180 + shake, 470, { s: 1 + Math.min(0.3, K.chest * 0.5) });
      else {
        ctx.save(); ctx.translate(180, 430); ctx.rotate(G.t * 0.5);
        for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.fillStyle = 'rgba(255,210,63,.16)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-20, -200); ctx.lineTo(20, -200); ctx.fill(); }
        ctx.restore();
        G.sprite('gear:shoulder-dragon', 180, 500, { s: 1.15 + Math.sin(G.t * 3) * 0.04 });
      }
    },
    debug: () => ({ mode: K.mode, combo: B.combo, miss: B.miss, revealed: !!K.revealed }),
    tapAt() { if (K.mode === 'select') return [180, START.y + 31]; const n = B.next(); const r = B.padRect(n ? n.lane : 0); return [r.x + r.w / 2, r.y + 30]; },
  };
})();
