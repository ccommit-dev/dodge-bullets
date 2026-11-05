/* 릴스 · 유물 세트 — 3×3 뒤집힌 유물에서 불 계열 셋을 찾는다(릴스용 조작). 처음 1초만 보여 주고 덮는다. 틀리면 2초 깎이고, 시간이 다 되면 진다.
 * 유물 이름 · 계열 · 세트 이름 · 효과 값은 titans/relics.ts 그대로. 대장은 용암 협곡의 화염 비룡(titans/model.ts HUNTING_AREAS).
 * 셋 다 찾으면 세트 '화상' — 피해 20% 화상 추가(titans/relics.ts RELIC_SET · FIRE_SET_BURN_SHARE). 게임처럼 준 피해의 20% 를 모았다가 0.6초마다 화상 숫자로 터뜨린다(TitansGame relicBurnPool) */
window.RF_SCENE = (() => {
  const FIRE = [{ k: 'relic:ember-ring', name: '불씨 반지' }, { k: 'relic:flame-feather', name: '화염 깃털' }, { k: 'relic:lava-heart', name: '용암 심장' }];
  const OTHER = [
    { k: 'relic:frost-horn', name: '서리 뿔피리', fam: '서리', c: '#7dd3fc' },
    { k: 'relic:lucky-coin', name: '행운 동전', fam: '황금', c: '#facc15' },
    { k: 'relic:reed-flute', name: '갈대 피리', fam: '바람', c: '#86efac' },
    { k: 'relic:oak-shield', name: '참나무 방패', fam: '대지', c: '#d6a35c' },
    { k: 'relic:moon-shell', name: '달 조개', fam: '별빛', c: '#c4b5fd' },
    { k: 'relic:kingfisher-feather', name: '물총새 깃', fam: '물결', c: '#67e8f9' },
  ];
  const LIMIT = 8, PENALTY = 2, SHOW = 1, DEAL = 0.07, BURN_EVERY = 0.6;
  const rect = (i) => ({ x: 22 + (i % 3) * 108, y: 236 + Math.floor(i / 3) * 112, w: 100, h: 108 });
  let K;
  function shuffled(a) { const o = [...a]; for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; }
  const cardAt = (x, y) => { for (let i = 0; i < 9; i++) { const r = rect(i); if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i; } return -1; };
  function pick(G, i) {
    const c = K.cards[i];
    if ((K.mode !== 'show' && K.mode !== 'hunt') || c.found || c.wrong > 0 || K.left <= 0) return;
    const r = rect(i), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    if (!K.chosen) { K.chosen = true; G.emit('choice', { relic: c.fire ? 'fire' : 'other' }); }
    c.up = true;
    if (c.fire) {
      c.found = true; K.got += 1; K.pop = 0.4; G.sfx('merge'); G.punch(0.03); G.burst(cx, cy, '#ffb347', 18, 200); KIT.attack(K.hero, 0.36);
      G.stamp(c.name, '#ffd23f', 180, 0.7);
      if (K.got < 3) G.caption(`${c.name} — 세트까지 ${3 - K.got}개`);
      else { K.mode = 'set'; K.st = 0; G.sfx('legend'); G.caption('불 세트 완성!'); }
    } else {
      c.wrong = K.mode === 'show' ? 0.01 : 0.7; K.left = Math.max(0, K.left - PENALTY); G.shake(5, 0.2); G.sfx('fail');
      G.float(`-${PENALTY}초`, cx, cy - 20, '#fca5a5', 26, 0.8); G.caption(`${c.name} — ${c.fam} 계열이에요`);
    }
  }
  function burnFloat(G) {
    G.float('화상!', K.boss.x + (Math.random() * 24 - 12), 150, '#ff8a3d', 28, 0.8);
    G.burst(K.boss.x, K.boss.y - 60, '#ff8a3d', 26, 240); G.punch(0.04); G.shake(6, 0.2); G.sfx('bolt');
  }
  return {
    id: 'relic-set',
    canLose: true,
    introDur: 1.5,
    hook: ['유물 세 개를 모으면', '세트 효과'],
    climaxStamp: '세트 완성!!', raysAt: [292, 170], stampY: 460, popY: 330,
    caption0: '불 계열 유물 자리를 기억해요!',
    endLines: ['유물 56종 · 7계열', '3개 모으면 세트 · 8개 모두 ×1.5'],
    init() {
      const list = shuffled([...FIRE.map((f) => ({ ...f, fire: true, fam: '불', c: '#ff8a1f' })), ...OTHER]);
      K = { cards: list.map((c) => ({ ...c, up: false, f: 0, found: false, wrong: 0 })), mode: 'wait', st: 0, left: LIMIT, got: 0, pop: 0, chosen: false, setOn: false, dead: false, hp: 1, atk: 0, pool: 0, burnT: 0, botAt: 0,
        hero: { id: 'hero', x: 70, y: 226, s: 0.62, mode: 'idle', mt: 0 }, boss: { id: 'flame-wyvern-clean', x: 284, y: 228, s: 0.56, mode: 'idle', mt: 0 } };
    },
    onTap(G, x, y) {
      if (G.phase !== 'play') return true;
      const i = cardAt(x, y);
      if (i < 0) return y > 230;
      pick(G, i); G.hint(null); return true;
    },
    update(G, dt) {
      KIT.tick(K.hero, dt); KIT.tick(K.boss, dt);
      K.pop = Math.max(0, K.pop - dt);
      for (const c of K.cards) {
        c.f += ((c.up ? 1 : 0) - c.f) * Math.min(1, dt * 16);
        if (c.wrong > 0) { c.wrong -= dt; if (c.wrong <= 0) { c.wrong = 0; c.up = false; } }
      }
      if (G.phase === 'intro') return;
      if (K.mode === 'wait') { K.mode = 'show'; K.st = 0; G.sfx('merge'); return; }
      if (K.dead) return;
      // 주인공 평타 — 세트가 켜지면 빨라지고 20% 가 화상 칸에 모인다
      K.atk += dt;
      const every = K.setOn ? 0.3 : 0.8;
      if (K.atk > every && !G.lost) {
        K.atk = 0; KIT.attack(K.hero, 0.3); KIT.hit(K.boss); G.sfx('hit');
        K.hp = Math.max(0.02, K.hp - (K.setOn ? 0.045 : 0.008));
        if (K.setOn) K.pool += 1;
      }
      if (K.mode === 'burn') {
        K.burnT += dt;
        if (K.burnT > BURN_EVERY && K.pool > 0) {
          K.burnT = 0; burnFloat(G); K.pool = 0; K.hp -= 0.16;
          if (K.hp <= 0) { K.hp = 0; K.dead = true; G.impact(2); G.flash('#ffb347', 0.25); G.burst(K.boss.x, K.boss.y - 60, '#ffd23f', 70, 320); G.coins(K.boss.x, K.boss.y - 60, 30); G.sfx('legend'); G.caption('화상으로 대장 처치!'); }
        }
        return;
      }
      if (G.over) return;
      if (K.mode === 'show') {
        K.st += dt;
        // 한 장씩 차례로 열린다 — 마지막 장이 열리고 1초
        K.cards.forEach((c, i) => { if (K.st >= i * DEAL) c.up = true; });
        if (K.st >= 8 * DEAL + SHOW + 0.15) { K.mode = 'hunt'; for (const c of K.cards) if (!c.found) { c.up = false; c.wrong = 0; } G.sfx('flip'); G.caption('불 계열 셋을 찾아 눌러요!'); }
        return;
      }
      if (K.mode === 'set') {
        K.st += dt;
        if (K.st > 1.4) {
          K.mode = 'burn'; K.setOn = true; K.burnT = 0;
          G.climax(); G.flash('#ffb347', 0.25); G.impact(1.2);
          G.pop('불 세트 · 화상', '피해 20% 화상 추가', '3개 = 세트 · 8개 모두 ×1.5', 'gold', 4);
          G.caption('준 피해의 20% 가 화상으로 터진다!'); G.finish(4.6);
        }
        return;
      }
      K.left = Math.max(0, K.left - dt);
      if (K.left <= 0) { G.hint(null); G.lose('시간이 끝났어요!', [`불 세트 ${K.got}/3 찾았어요`, '처음 1초에 불 계열 자리를 외워요']); return; }
      // 손을 놓고 있으면 아직 안 찾은 불 칸을 가리킨다. 2.2초씩 기다리면 시간이 빠듯해 기억하는 쪽이 낫다
      if (G.idle > 2.2) { const r = rect(K.cards.findIndex((c) => c.fire && !c.found)); G.hint(r.x + r.w / 2, r.y + r.h / 2); } else G.hint(null);
    },
    draw(G, ctx) {
      KIT.stage(G, ctx, 'bg:volcano');
      KIT.clock(G, K.left, LIMIT, 48, '남은 시간 ');
      KIT.bossBar(G, '대장 · 화염 비룡', K.hp, 72);
      if (!K.dead) {
        // 이 그림만 오른쪽을 보게 그려져 있다(game/draw.ts FLIP_RIGHT_FACING) — 뒤집어 왼쪽을 보게
        ctx.save(); ctx.translate(K.boss.x, 0); ctx.scale(-1, 1); KIT.unit(G, { ...K.boss, x: 0 }, G.t); ctx.restore();
        if (K.setOn) { const a = 0.55 + Math.sin(G.t * 18) * 0.25; G.sprite('skill:fire', K.boss.x, K.boss.y - 8, { s: 1.15, alpha: a }); }
      }
      KIT.unit(G, K.hero, G.t);
      // 세트 칸 — 찾은 만큼 찬다
      G.text(K.setOn ? '불 세트 ✔ 화상' : `불 세트 ${K.got}/3`, 180, 112, { size: 15, color: '#ffb347', stroke: '#2a1606', sw: 4 });
      const found = K.cards.filter((c) => c.found);
      for (let i = 0; i < 3; i++) {
        const x = 136 + i * 44, y = 130, c = found[i], big = c && i === K.got - 1 ? K.pop : 0;
        G.rr(x - 20, y, 40, 44, 10, c ? '#fff3d6' : 'rgba(27,18,11,.7)', c ? '#ff8a1f' : 'rgba(255,255,255,.3)', 2);
        if (c) G.sprite(c.k, x, y + 40, { s: 0.48 * (1 + big) }); else G.text('?', x, y + 22, { size: 18, color: 'rgba(255,255,255,.5)' });
      }
      // 3×3 카드
      ctx.fillStyle = 'rgba(27,18,11,.78)'; ctx.fillRect(0, 228, 360, 352);
      for (let i = 0; i < 9; i++) {
        const c = K.cards[i], r = rect(i), sx = Math.max(0.04, Math.abs(c.f * 2 - 1)), front = c.f > 0.5;
        const lift = K.mode === 'set' || K.mode === 'burn' ? (c.fire ? 1.04 + Math.sin(G.t * 10) * 0.03 : 0.94) : 1;
        ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(sx * lift, lift);
        if (K.mode === 'set' || K.mode === 'burn') ctx.globalAlpha = c.fire ? 1 : 0.3;
        const hw = r.w / 2, hh = r.h / 2;
        if (!front) {
          G.rr(-hw, -hh, r.w, r.h, 14, '#3b2415', '#f2c232', 3);
          G.rr(-hw + 7, -hh + 7, r.w - 14, r.h - 14, 10, null, 'rgba(242,194,50,.35)', 2);
          G.text('?', 0, 2, { size: 38, color: '#f2c232' });
        } else if (c.fire) {
          G.rr(-hw, -hh, r.w, r.h, 14, '#fff3d6', c.found ? '#ff8a1f' : '#f2c232', c.found ? 5 : 3);
          G.sprite(c.k, 0, 22, { s: 0.72 });
          G.rr(-hw + 5, -hh + 5, 30, 20, 8, '#ff8a1f'); G.text('불', -hw + 20, -hh + 15, { size: 14, color: '#fff' });
          G.text(c.name, 0, 38, { size: 14, color: '#7c2d12' });
        } else if (G.img(c.k)) {
          G.rr(-hw, -hh, r.w, r.h, 14, '#2a2230', c.wrong > 0 ? '#ef4444' : c.c, 3);
          G.sprite(c.k, 0, 22, { s: 0.72 });
          G.rr(-hw + 5, -hh + 5, 38, 20, 8, c.c); G.text(c.fam, -hw + 24, -hh + 15, { size: 13, color: '#1b1206' });
          G.text(c.name, 0, 38, { size: 13, color: '#e5e7eb' });
        } else {
          // 빈 조각 칸 — 계열 색 + 실제 이름
          G.rr(-hw, -hh, r.w, r.h, 14, '#2a2230', c.wrong > 0 ? '#ef4444' : c.c, 3);
          G.rr(-22, -36, 44, 44, 10, null, c.c, 2);
          G.text(c.fam, 0, -14, { size: 15, color: c.c });
          G.text(c.name, 0, 30, { size: 13, color: '#e5e7eb' });
        }
        ctx.restore();
      }
    },
    debug: () => ({ mode: K.mode, got: K.got, left: +K.left.toFixed(1), hp: +K.hp.toFixed(2) }),
    bot(G) {
      if (G.phase !== 'play' || G.over || K.mode !== 'hunt' || G.pt - K.botAt < 0.7) return null;
      K.botAt = G.pt;
      const i = K.cards.findIndex((c) => c.fire && !c.found);
      if (i < 0) return null;
      const r = rect(i); return { tap: [r.x + r.w / 2, r.y + r.h / 2] };
    },
  };
})();
