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
  return { unit, attack, hit, tick, stage, bossBar, fmt };
})();
