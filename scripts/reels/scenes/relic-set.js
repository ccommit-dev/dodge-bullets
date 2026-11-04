/* 릴스 · 유물 세트 — 뽑을 때마다 불 계열 유물이 한 칸씩 찬다. 3개면 세트 '화상' 이 켜지고 피해에 화상이 붙는다 (titans/relics) */
window.RF_SCENE = (() => {
  const RELICS = [['relic:ember-ring', '불꽃 반지'], ['relic:flame-feather', '불꽃 깃털'], ['relic:lava-heart', '용암 심장']];
  const BTN = { x: 70, y: 490, w: 220, h: 64 };
  let K;
  function draw1(G) {
    if (K.got >= 3 || K.busy > 0 || G.phase !== 'play') return;
    K.busy = 0.45; K.got += 1; K.flip = 0.45; G.sfx('merge'); G.punch(0.03);
    const r = RELICS[K.got - 1];
    G.stamp(r[1], '#ffd23f', 150, 0.8); G.burst(60 + K.got * 60, 345, '#ffb347', 18, 200);
    if (K.got === 1) G.emit('choice', { relic: 'fire' });
    G.caption(K.got < 3 ? `${r[1]} 획득 — 세트까지 ${3 - K.got}개` : '불 세트 완성!');
    if (K.got === 3) { K.setOn = true; G.climax(); G.sfx('legend'); G.flash('#ffb347', 0.25); G.pop('불 세트 · 화상', '피해 20% 화상 추가', '3개 = 세트 · 8개 모두 ×1.5', 'gold', 2.4); G.finish(2.6); }
  }
  return {
    id: 'relic-set',
    introDur: 1.5,
    hook: ['유물 세 개를 모으면', '세트 효과'],
    climaxStamp: '세트 완성!!', raysAt: [180, 340],
    caption0: '유물 뽑기를 눌러요',
    endLines: ['유물 56종 · 7계열', '3개 모으면 세트 · 8개 모두 ×1.5'],
    init() {
      K = { got: 0, busy: 0, flip: 0, setOn: false, atk: 0, auto: 0,
        hero: { id: 'hero', x: 96, y: 262, s: 0.8, mode: 'idle', mt: 0 }, mob: { id: 'goblin', x: 270, y: 262, s: 0.85, mode: 'idle', mt: 0 } };
    },
    onTap(G, x, y) { if (y > 440) { draw1(G); G.hint(null); } return true; },
    onKey(G) { draw1(G); },
    update(G, dt) {
      KIT.tick(K.hero, dt); KIT.tick(K.mob, dt);
      K.busy = Math.max(0, K.busy - dt); K.flip = Math.max(0, K.flip - dt);
      K.atk += dt;
      if (K.atk > 0.6) {
        K.atk = 0; KIT.attack(K.hero, 0.36); KIT.hit(K.mob); G.sfx('hit');
        G.float(K.setOn ? '120 화상!' : '100', 270 + (Math.random() * 30 - 15), 170, K.setOn ? '#ff8a3d' : '#fff', K.setOn ? 26 : 20, 0.8);
      }
      if (G.phase === 'play' && G.idle > 1.2 && K.got < 3) { G.hint(180, BTN.y + 32); K.auto += dt; if (K.auto > 0.8) { K.auto = 0; draw1(G); } } else K.auto = 0;
    },
    draw(G, ctx) {
      KIT.stage(G, ctx, 'bg:volcano');
      KIT.unit(G, K.mob, G.t);
      KIT.unit(G, K.hero, G.t);
      if (K.setOn) G.text('불 세트 ✔ 화상', 180, 76, { size: 20, color: '#ffb347', stroke: '#2a1606', sw: 5 });
      // 유물 세 칸
      ctx.fillStyle = 'rgba(27,18,11,.72)'; ctx.fillRect(0, 290, 360, 150);
      for (let i = 0; i < 3; i++) {
        const x = 60 + i * 120, on = K.got > i, pop = on && K.got === i + 1 ? K.flip : 0;
        G.rr(x - 46, 306, 92, 92, 16, on ? '#fff3d6' : 'rgba(255,255,255,.08)', on ? '#f2c232' : 'rgba(255,255,255,.25)', on ? 3 : 2);
        if (on) G.sprite(RELICS[i][0], x, 392, { s: 0.8 * (1 + pop * 0.6) });
        else G.text('?', x, 352, { size: 34, color: 'rgba(255,255,255,.35)' });
        G.text(on ? RELICS[i][1] : '불 계열', x, 418, { size: 13, color: on ? '#ffe08a' : 'rgba(255,255,255,.5)' });
      }
      ctx.save(); ctx.translate(180, BTN.y + 32); const press = K.busy > 0 ? 0.94 : 1; ctx.scale(press, press);
      G.rr(-110, -32, 220, 64, 18, K.got >= 3 ? '#6b7280' : '#ff8a1f', '#3b2415', 4);
      G.text(K.got >= 3 ? '세트 완성' : '유물 10회 뽑기', 0, -8, { size: 21, color: '#1b1206' });
      G.text('💎540', 0, 16, { size: 13, color: '#3b2415' });
      ctx.restore();
    },
    debug: () => ({ got: K.got }),
    tapAt: () => [180, BTN.y + 32],
  };
})();
