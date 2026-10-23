/* 릴스 5 · 북 강화 — 나무북 +0 에서 왕관북 +15 까지. 강화 한 번마다 북 그림이 바뀌고, 한 번은 실패하지만 방지권이 지켜 준다 */
window.RF_SCENE = (() => {
  const NAMES = ['나무북', '쇠테 북', '쇠테 북', '징 박은 북', '징 박은 북', '금테 북', '금테 북', '보석 북', '보석 북', '보석 북', '빛나는 북', '날개 북', '날개 북', '황금 날개 북', '황금 날개 북', '왕관 북'];
  const BTN = { x: 70, y: 478, w: 220, h: 64 };
  const RATE = (l) => Math.max(15, 100 - l * 6);
  let K;
  function forge(G) {
    if (K.busy > 0 || K.lv >= 15 || G.phase !== 'play') return;
    K.busy = 0.42; K.hammer = 0; G.sfx('tap'); K.tries += 1;
    if (K.tries === 1) G.emit('choice', { forge: 'first' });
  }
  function resolve(G) {
    if (K.lv === 7 && !K.failed) {
      K.failed = true; G.sfx('fail'); G.shake(10, 0.4); G.flash('#7f1d1d', 0.22); G.stamp('실패…', '#fca5a5', 240, 0.9);
      G.float('실패…', 180, 230, '#fca5a5', 30, 1.1);
      G.pop('강화 방지권 사용', '+7 그대로 지킴', '실패해도 단계가 내려가지 않아요', 'purple', 1.5);
      return;
    }
    const before = K.lv;
    K.lv += 1; K.flashT = 0.4; G.sfx('merge'); G.burst(180, 300, K.lv >= 11 ? '#ffd23f' : '#fff3a0', 30, 240); G.punch(0.04); G.hitstop(0.04);
    if ([5, 10].includes(K.lv)) { G.stamp(`+${K.lv}!!`, '#ffd23f', 236); G.coins(180, 300, 12); G.rays(180, 300, 1); }
    G.float(`+${K.lv}`, 180, 210, '#ffe066', 34, 0.9);
    if ([5, 7, 11, 15].includes(K.lv)) G.pop('외형 변화!', NAMES[K.lv], `+${before} → +${K.lv} · 공격력 ×${(1 + K.lv * 0.18).toFixed(2)}`, 'gold', 1.6);
    G.caption(`+${K.lv} ${NAMES[K.lv]}`);
    if (K.lv >= 15) { G.climax(); G.sfx('legend'); G.flash('#fff3a0', 0.3); G.shake(8, 0.4); G.caption('+15 왕관 북 완성!'); G.finish(2.4); }
  }
  return {
    id: 'drum-forge',
    popY: 236,
    introDur: 1.5,
    hook: ['나무북이', '왕관북이 되기까지'],
    climaxStamp: '+15 왕관북!!', raysAt: [180, 300],
    caption0: '강화 단추를 눌러요',
    endLines: ['북 하나로 +15 까지', '단계마다 생김새가 바뀐다'],
    init() { K = { lv: 0, busy: 0, hammer: 0, tries: 0, failed: false, flashT: 0, auto: 0 }; },
    onTap(G, x, y) { if (y > 440) { forge(G); G.hint(null); } return true; },
    onKey(G) { forge(G); },
    update(G, dt) {
      K.flashT = Math.max(0, K.flashT - dt);
      if (K.busy > 0) { K.busy -= dt; K.hammer += dt; if (K.busy <= 0) resolve(G); }
      if (G.phase === 'play' && G.idle > 1.2 && K.lv < 15) { G.hint(180, BTN.y + 32); K.auto += dt; if (K.auto > 0.5) { K.auto = 0; forge(G); } } else K.auto = 0;
    },
    draw(G, ctx) {
      const g = ctx.createRadialGradient(180, 300, 20, 180, 300, 360); g.addColorStop(0, K.lv >= 11 ? '#7a3a1a' : '#5a2a12'); g.addColorStop(1, '#1b0d06');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 360, 640);
      // 모루 · 불꽃
      G.rr(110, 380, 140, 30, 8, '#3a3a42', '#16161a', 3); G.rr(140, 410, 80, 40, 6, '#2a2a30', '#16161a', 3);
      const glow = 0.5 + Math.sin(G.t * 5) * 0.2;
      ctx.save(); ctx.globalAlpha = glow; const fg = ctx.createRadialGradient(180, 360, 10, 180, 360, 160); fg.addColorStop(0, 'rgba(255,170,60,.55)'); fg.addColorStop(1, 'rgba(255,120,30,0)'); ctx.fillStyle = fg; ctx.fillRect(0, 160, 360, 300); ctx.restore();
      // 북
      const bounce = K.flashT > 0 ? 1 + Math.sin((K.flashT / 0.4) * Math.PI) * 0.12 : 1 + Math.sin(G.t * 2) * 0.015;
      if (K.lv >= 15) { ctx.save(); ctx.translate(180, 300); ctx.rotate(G.t * 0.4); for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.fillStyle = 'rgba(255,210,63,.16)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-24, -260); ctx.lineTo(24, -260); ctx.fill(); } ctx.restore(); }
      G.sprite(`drum:${K.lv}`, 180, 382, { s: 1.25 * bounce, flashA: K.flashT > 0 ? K.flashT * 1.5 : 0, flashC: '#fff6c4' });
      // 망치
      if (K.busy > 0) { const a = Math.sin(Math.min(1, K.hammer / 0.42) * Math.PI) * 0.9; ctx.save(); ctx.translate(270, 230); ctx.rotate(-0.9 + a * 1.4); G.rr(-6, -10, 12, 90, 4, '#8a5a2b', '#2a1606', 2); G.rr(-26, -30, 52, 28, 6, '#9aa4b0', '#2a1606', 3); ctx.restore(); }
      // 단계 표
      G.text(`+${K.lv}`, 180, 112, { size: 44, color: '#ffd23f', stroke: '#2a1606', sw: 8 });
      G.text(NAMES[K.lv], 180, 152, { size: 20, color: '#fff3d0', stroke: '#2a1606', sw: 5 });
      // 아래 판
      ctx.fillStyle = '#2b1a0e'; ctx.fillRect(0, 460, 360, 180); ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, 458, 360, 4);
      const press = K.busy > 0 ? 0.94 : 1;
      ctx.save(); ctx.translate(180, BTN.y + 32); ctx.scale(press, press);
      G.rr(-110, -32, 220, 64, 18, K.lv >= 15 ? '#6b7280' : '#ff8a1f', '#3b2415', 4);
      G.text(K.lv >= 15 ? '최대 단계' : '강화하기', 0, -8, { size: 22, color: '#1b1206' });
      G.text(`성공 확률 ${RATE(K.lv)}% · 방지권 1장`, 0, 16, { size: 12, color: '#3b2415' });
      ctx.restore();
      G.text(`🔨 ${K.tries}회`, 320, 560, { size: 13, color: '#f5d9a8' });
    },
    debug: () => ({ lv: K.lv, tries: K.tries }),
    tapAt: () => [180, BTN.y + 32],
  };
})();
