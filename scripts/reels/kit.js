/* 릴스 장면 공용 조각 — 캐릭터 동작 칸 · 무대 · 피해 숫자 (엔진보다 먼저 읽힌다. G 는 엔진이 만든 뒤 쓴다) */
window.KIT = (() => {
  const FR = {
    hero: { idle: [0, 1, 2, 3, 4, 5], attack: [0, 1, 2, 3, 4, 5, 6, 7], walk: [0, 1, 2, 3, 4, 5] },
    ally: { idle: [0, 2, 4], attack: [0, 2, 4, 6], walk: [0, 2, 4] },
    ari: { idle: [0, 2, 4], attack: [0, 2, 4, 6] },
    mon: { idle: [0, 1, 2, 3], attack: [0, 1, 2, 3], hit: [0, 1] },
  };
  const kind = (id) => (id === 'hero' ? 'hero' : id === 'ari' ? 'ari' : /^(mia|leon|sera|garen)$/.test(id) ? 'ally' : 'mon');
  /** u = { id, x, y, s, mode: 'idle'|'attack'|'walk'|'hit', mt(동작 시작 후 초), dur(공격 길이), flash } */
  function unit(G, u, t) {
    const f = FR[kind(u.id)];
    const mode = f[u.mode] ? u.mode : 'idle';
    let key;
    if (mode === 'attack' || mode === 'hit') key = G.once(`${u.id}:${mode}`, f[mode], u.dur || 0.45, u.mt || 0);
    else key = G.frame(`${u.id}:${mode}`, f[mode], mode === 'walk' ? 10 : 6, t + (u.phase || 0));
    // 그림자
    const im = G.img(key);
    if (im) {
      const c = G.ctx;
      c.save(); c.globalAlpha = 0.28; c.fillStyle = '#2a1606'; c.beginPath(); c.ellipse(u.x, u.y - 2, im.w * (u.s || 1) * 0.32, 7 * (u.s || 1), 0, 0, Math.PI * 2); c.fill(); c.restore();
    }
    G.sprite(key, u.x, u.y, { s: u.s || 1, flashA: u.flash || 0, flashC: u.flashC || '#fff', alpha: u.alpha ?? 1 });
  }
  /** 공격 시작 */
  function attack(u, dur = 0.45) { u.mode = 'attack'; u.mt = 0; u.dur = dur; }
  function hit(u) { u.mode = 'hit'; u.mt = 0; u.dur = 0.24; u.flash = 0.7; }
  /** 동작 시간 진행 — 공격 · 피격이 끝나면 대기로 */
  function tick(u, dt) {
    u.mt = (u.mt || 0) + dt;
    if ((u.mode === 'attack' || u.mode === 'hit') && u.mt > (u.dur || 0.45)) { u.mode = 'idle'; u.mt = 0; }
    if (u.flash) u.flash = Math.max(0, u.flash - dt * 4);
  }
  /** 무대: 배경 + 아래 땅 띠 + 아래 판 */
  function stage(G, ctx, bgKey, panel = '#2b1a0e') {
    if (bgKey) G.bg(bgKey, 0, 470);
    const gr = ctx.createLinearGradient(0, 380, 0, 470); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(27,18,11,.55)');
    ctx.fillStyle = gr; ctx.fillRect(0, 380, 360, 90);
    ctx.fillStyle = panel; ctx.fillRect(0, 460, 360, 180);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, 458, 360, 4);
  }
  /** 큰 HP 막대(대장) */
  function bossBar(G, name, ratio, y = 66) {
    G.rr(40, y, 280, 26, 13, 'rgba(27,18,11,.85)', '#ffd23f', 2);
    G.bar(46, y + 4, 268, 18, ratio, ratio > 0.3 ? '#ef4444' : '#f59e0b', 'rgba(0,0,0,.3)');
    G.text(name, 180, y + 13, { size: 13, color: '#fff', stroke: '#2a1606', sw: 4 });
  }
  const fmt = (n) => Math.round(n).toLocaleString('ko-KR');

  /* 비트 수련 — 네 줄 노트가 판정선으로 떨어진다. 패드(← 공격 · ↓ 방어 · ↑ 회피 · → 스킬)를 박자에 맞춰 누른다.
   * chart: [[박(0부터), 줄], …] · bpm · onHit(lane, judge) · onMiss(lane). 손대지 않으면 auto 가 정확히 누른다 */
  function beat(opts) {
    const LANES = 4, X = (i) => 45 + i * 90, TOP = 262, JL = 474, SPEED = opts.speed || 300;
    const lead = (JL - TOP) / SPEED;
    const spb = 60 / opts.bpm;
    const notes = opts.chart.map(([b, l]) => ({ t: lead + 0.6 + b * spb, lane: l, done: false, judge: '' }));
    const B = { t: 0, notes, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, padT: [0, 0, 0, 0], judgeT: 0, judge: '', fever: false, over: false, LABEL: ['공격', '방어', '회피', '스킬'], ARROW: ['←', '↓', '↑', '→'] };
    B.end = notes[notes.length - 1].t + 0.6;
    function hit(lane, auto) {
      B.padT[lane] = 0.14;
      const n = notes.filter((x) => !x.done && x.lane === lane).sort((a, b) => a.t - b.t)[0];
      if (!n) return null;
      const d = Math.abs(n.t - B.t);
      if (d > 0.16) return null;
      n.done = true;
      const j = auto || d < 0.07 ? 'PERFECT' : 'GOOD';
      n.judge = j; B.judge = j; B.judgeT = 0.5;
      if (j === 'PERFECT') B.perfect += 1; else B.good += 1;
      B.combo += 1; B.maxCombo = Math.max(B.maxCombo, B.combo);
      if (!B.fever && B.combo >= (opts.feverAt || 12)) { B.fever = true; opts.onFever && opts.onFever(); }
      opts.onHit && opts.onHit(lane, j);
      return j;
    }
    B.press = (lane) => hit(lane, false);
    B.update = (dt, idle) => {
      B.t += dt;
      for (let i = 0; i < 4; i++) B.padT[i] = Math.max(0, B.padT[i] - dt);
      B.judgeT = Math.max(0, B.judgeT - dt);
      for (const n of notes) {
        if (n.done) continue;
        if (idle && Math.abs(n.t - B.t) < 0.02) hit(n.lane, true);
        else if (B.t - n.t > 0.18) { n.done = true; n.judge = 'MISS'; B.miss += 1; B.combo = 0; B.judge = 'MISS'; B.judgeT = 0.5; opts.onMiss && opts.onMiss(n.lane); }
      }
      if (!B.over && B.t > B.end) { B.over = true; opts.onEnd && opts.onEnd(); }
    };
    B.next = () => notes.filter((n) => !n.done).sort((a, b) => a.t - b.t)[0];
    B.padRect = (i) => ({ x: X(i) - 40, y: 494, w: 80, h: 70 });
    B.laneAt = (x, y) => (y >= 262 ? Math.max(0, Math.min(3, Math.floor(x / 90))) : -1);
    B.draw = (G, ctx) => {
      // 줄
      ctx.fillStyle = B.fever ? 'rgba(80,20,90,.92)' : 'rgba(18,12,30,.92)'; ctx.fillRect(0, 256, 360, 300);
      for (let i = 0; i < LANES; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; ctx.fillRect(i * 90, 256, 90, 236);
        if (B.padT[i] > 0) { ctx.fillStyle = `rgba(255,210,63,${B.padT[i] * 2})`; ctx.fillRect(i * 90, 256, 90, 236); }
      }
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, JL - 2, 360, 4);
      // 노트
      const COL = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];
      for (const n of notes) {
        if (n.done) continue;
        const y = JL - (n.t - B.t) * SPEED;
        if (y < 250 || y > 520) continue;
        G.rr(X(n.lane) - 30, y - 10, 60, 20, 10, COL[n.lane], '#fff', 2);
      }
      // 패드
      for (let i = 0; i < LANES; i++) {
        const r = B.padRect(i), pr = B.padT[i] > 0;
        G.rr(r.x + 3, r.y + (pr ? 3 : 0), r.w - 6, r.h - 8, 14, pr ? '#ffd23f' : '#2b1a0e', COL[i], 3);
        G.text(B.ARROW[i], X(i), r.y + 22 + (pr ? 3 : 0), { size: 24, color: pr ? '#1b1206' : '#fff' });
        G.text(B.LABEL[i], X(i), r.y + 46 + (pr ? 3 : 0), { size: 13, color: pr ? '#1b1206' : '#f5d9a8' });
      }
      if (B.judgeT > 0) {
        const c = B.judge === 'PERFECT' ? '#ffd23f' : B.judge === 'GOOD' ? '#86efac' : '#fca5a5';
        G.text(B.judge, 180, 330, { size: 30 * (0.9 + B.judgeT * 0.4), color: c, stroke: '#2a1606', sw: 6, alpha: Math.min(1, B.judgeT * 3) });
      }
      if (B.combo >= 2) G.text(`${B.combo} COMBO`, 180, 372, { size: 22, color: '#fff', stroke: '#2a1606', sw: 5 });
      if (B.fever) G.text('FEVER!', 300, 280, { size: 18, color: '#f0abfc', stroke: '#2a1606', sw: 5, alpha: 0.6 + Math.sin(B.t * 10) * 0.4 });
    };
    return B;
  }

  /* 댐 방어전 — 세 줄(왼 · 가운데 · 오른)로 몬스터가 위에서 성문(GATE_Y)으로 내려온다. 원근: 위는 작게 */
  const LANE_X = [80, 180, 280], GATE_Y = 312;
  const depth = (y) => 0.55 + Math.max(0, Math.min(1, (y - 70) / (GATE_Y - 70))) * 0.45;
  return { unit, attack, hit, tick, stage, bossBar, fmt, beat, LANE_X, GATE_Y, depth };
})();
