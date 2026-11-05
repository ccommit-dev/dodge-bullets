/* 릴스 · 세트 파츠 — 지금 무기는 검. 가방의 파츠를 장비 칸으로 끌어다 낀다(titans/EquipWindow: 칸이 다르면 튕김, 맞는 칸이면 바꿔 끼우고 옛 것은 가방으로).
 * 다른 무기 세트는 끼워져도 세트 수가 오르지 않는다(equipment/gearSets matchedPieces). 칸마다 탭 피해 +2.5%, 다섯 부위면 +5% 더(GEAR_PIECE_BONUS · GEAR_FULL_SET_BONUS) = 17.5%.
 * 세트 효과는 피해 배율일 뿐이라 대장을 쓰러뜨렸다고 주장하지 않는다 — 같은 탭의 숫자(tapDamage(50) = 963)가 세트 전 963 → 세트 후 1,131(+17.5%)로 커지는 것을 앞뒤로 보여 주고 세트 완성 도장으로 끝낸다.
 * 대장은 붉은 폐허(bg:ruins)의 고대 오우거 — titans/model HUNTING_AREAS · SpriteArt BOSS_ASSET(wolf-king-clean). 무대를 눌러도 같은 탭 숫자가 뜬다. 제한 시간 안에 5/5 를 못 맞추면 진다 */
window.RF_SCENE = (() => {
  const T = 16, PIECE = 2.5, FULL = 5, TAP = 963, BOSS_HP = 120000;
  const SLOT = [['helmet', '투구'], ['armor', '갑옷'], ['gloves', '장갑'], ['boots', '신발'], ['shoulder', '견갑']];
  const SET = { sword: '기사', spear: '창기병', bow: '숲 사수', staff: '현자' };
  const HERO_X = 80, BOSS_X = 278, FOOT = 262;
  const slotRect = (i) => ({ x: 10 + i * 69, y: 306, w: 64, h: 78 });
  const bagRect = (i) => (i < 5 ? { x: 10 + i * 69, y: 392, w: 64, h: 90 } : { x: 44.5 + (i - 5) * 69, y: 487, w: 64, h: 90 });
  const inR = (x, y, r, p = 0) => x >= r.x - p && x <= r.x + r.w + p && y >= r.y - p && y <= r.y + r.h + p;
  const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const pct = (v) => (Math.round(v * 10) / 10).toString();
  const slotIdx = (s) => SLOT.findIndex((x) => x[0] === s);
  let K;
  const matched = () => K.eq.filter((it) => it && it.kind === 'sword').length;
  const effect = (n) => n * PIECE + (n >= SLOT.length ? FULL : 0);
  const summary = (n) => `기사 세트 ${n}/5 · 탭 피해 +${pct(effect(n))}%`;
  const tapNow = (n) => Math.floor(TAP * (1 + effect(n) / 100));
  /** 같은 탭 한 번 — 주인공이 치고 그때의 탭 피해 숫자가 대장 위에 뜬다. 대장은 쓰러지지 않는다 */
  function swing(G, label, color, size) {
    KIT.attack(K.hero, 0.36); KIT.hit(K.boss); G.sfx('hit');
    K.hp = Math.max(0.1, K.hp - tapNow(matched()) / BOSS_HP);
    G.burst(BOSS_X - 12, FOOT - 70, '#fff3a0', 8, 130);
    G.float(label, BOSS_X - 46 + Math.random() * 40, FOOT - 92 - Math.random() * 16, color, size, 0.8);
  }
  const itemAt = (x, y) => K.items.find((it) => it.where === 'bag' && inR(x, y, bagRect(it.cell)));
  const slotAt = (x, y) => { for (let i = 0; i < 5; i++) if (inR(x, y, slotRect(i), 7)) return i; return -1; };
  function grab(G, it, x, y) {
    K.held = { it, x, y, x0: x, y0: y, moved: false };
    G.sfx('tap');
    if (!K.chose) { K.chose = true; G.emit('choice', { part: it.art }); }
  }
  function drop(G, x, y) {
    const h = K.held; K.held = null;
    if (!h) return;
    const i = slotAt(x, y), it = h.it;
    if (i < 0) { if (!h.moved) G.caption('눌러 쥔 채로 칸까지 끌어요'); return; }   // 가방 위 · 빈 곳이면 제자리로
    const r = slotRect(i);
    if (SLOT[i][0] !== it.slot) { G.sfx('fail'); G.float(`${SLOT[slotIdx(it.slot)][1]} 칸이 아니에요`, 180, 256, '#fca5a5', 20, 0.8); K.deny[i] = 0.3; return; }   // 칸이 다르면 튕긴다
    const old = K.eq[i];
    if (old) old.where = 'bag';
    K.eq[i] = it; it.where = i; K.pop[i] = 0.3;
    const n = matched();
    if (it.kind !== 'sword') {
      G.sfx('fail'); G.shake(3, 0.15); G.float('세트 안 올라요', 180, 256, '#fca5a5', 22, 0.9);
      G.caption(`${SET[it.kind]} 파츠는 세트가 안 올라요`);
      return;
    }
    G.sfx('merge'); G.burst(r.x + r.w / 2, r.y + 30, '#7ee081', 14, 170); G.punch(0.02); K.line = 0.4;
    if (n < 5) { swing(G, KIT.fmt(tapNow(n)), '#ffe066', 22); G.float(`탭 피해 +${pct(PIECE)}%`, 150, 256, '#ffe066', 20, 0.8); }
    G.caption(summary(n));
    if (n >= SLOT.length) {
      K.finale = 0; G.climax(); G.sfx('legend'); G.flash('#fff3a0', 0.18); G.caption('다섯 부위 보너스 +5% 더!'); G.finish(3.6);
    }
  }
  return {
    id: 'gear-set',
    canLose: true,
    introDur: 1.5,
    hook: ['같은 무기끼리', '세트 효과'],
    raysAt: [180, 190], popY: 345,
    caption0: '검이니까 기사 파츠를 칸으로 끌어요',
    endLines: ['무기 4종 · 세트 파츠 20종', '같은 무기를 들어야 세트 효과가 켜져요'],
    init() {
      const others = shuffle(['spear', 'bow', 'staff', 'spear']);
      const wrong = shuffle(SLOT.map((s) => s[0])).slice(0, 4).map((slot, i) => ({ kind: others[i], slot }));
      const items = shuffle([...SLOT.map((s) => ({ kind: 'sword', slot: s[0] })), ...wrong]);
      K = { left: T, items: items.map((it, cell) => ({ ...it, cell, art: `set-${it.kind}-${it.slot}`, where: 'bag' })), eq: [null, null, null, null, null], held: null, chose: false, hp: 1, finale: -1, f1: false, f2: false, f3: false, pop: [0, 0, 0, 0, 0], deny: [0, 0, 0, 0, 0], line: 0, bossT: 1.6, botWait: 2,
        hero: { id: 'hero', x: HERO_X, y: FOOT, s: 0.68, mode: 'idle', mt: 0 }, boss: { id: 'wolf-king-clean', x: BOSS_X, y: FOOT, s: 0.64, mode: 'idle', mt: 0 } };
    },
    onTap(G, x, y) {
      if (G.phase !== 'play' || G.over) return true;
      G.hint(null);
      const it = itemAt(x, y);
      if (it) { grab(G, it, x, y); return true; }
      // 무대를 누르면 지금 탭 피해로 친다 — 파츠를 낄수록 숫자가 커진다
      if (y > 56 && y < 268) { if (!K.chose) { K.chose = true; G.emit('choice', { tap: 'boss' }); } const n = matched(); swing(G, KIT.fmt(tapNow(n)), n ? '#ffe066' : '#fff', 20); }
      return false;
    },
    onDrag(G, x, y) {
      if (G.phase !== 'play' || G.over) return true;
      if (!K.held) { const it = itemAt(x, y); if (!it) return false; grab(G, it, x, y); }
      K.held.x = x; K.held.y = y;
      if (Math.hypot(x - K.held.x0, y - K.held.y0) > 6) K.held.moved = true;
      G.hint(null);
      return true;
    },
    onRelease(G, x, y) {
      if (G.phase !== 'play' || G.over) { K.held = null; return; }
      drop(G, x, y);
    },
    update(G, dt) {
      KIT.tick(K.hero, dt); KIT.tick(K.boss, dt);
      for (let i = 0; i < 5; i++) { K.pop[i] = Math.max(0, K.pop[i] - dt); K.deny[i] = Math.max(0, K.deny[i] - dt); }
      K.line = Math.max(0, K.line - dt);
      if (K.finale >= 0) {
        K.finale += dt;
        // 같은 탭을 앞뒤로 — 세트 전 숫자, 세트 후 숫자, 그리고 세트 완성 도장
        if (K.finale > 0.1 && !K.f1) { K.f1 = true; KIT.attack(K.hero, 0.36); KIT.hit(K.boss); G.sfx('hit'); G.float(`세트 전 ${KIT.fmt(TAP)}`, 118, 250, '#fff', 22, 1.4); }
        if (K.finale > 0.62 && !K.f2) {
          K.f2 = true; KIT.attack(K.hero, 0.36); KIT.hit(K.boss); G.sfx('bolt'); G.impact(0.8); G.burst(BOSS_X - 12, FOOT - 70, '#ffd23f', 30, 240); K.line = 0.4;
          G.float(`세트 후 ${KIT.fmt(tapNow(5))}`, 206, 180, '#ffd23f', 30, 1.05);
          G.pop('기사 세트 5/5 · 탭 피해 +17.5%', `탭 피해 ${KIT.fmt(TAP)} → ${KIT.fmt(tapNow(5))}`, '부위마다 +2.5% · 다섯 부위 +5% 더', 'gold', 2.6);
        }
        if (K.finale > 1.5 && !K.f3) { K.f3 = true; G.stamp('세트 완성!!', '#ffd23f', 200, 1.5); G.sfx('win'); G.coins(180, 300, 16); }
        return;
      }
      if (G.over || G.phase !== 'play') return;
      K.left = Math.max(0, K.left - dt);
      K.bossT -= dt;
      if (K.bossT <= 0) { K.bossT = 1.8; KIT.attack(K.boss, 0.45); }
      if (K.left <= 0) {
        K.held = null;
        const n = matched();
        G.lose('시간이 다 됐어요!', [`${summary(n)}`, '같은 무기 파츠만 세트가 돼요']);
        return;
      }
      if (G.idle > 1.2 && !K.held) {
        // 손가락이 파츠에서 칸으로 끌고 가는 모양
        const it = K.items.find((u) => u.kind === 'sword' && u.where === 'bag');
        if (it) {
          const a = bagRect(it.cell), b = slotRect(slotIdx(it.slot)), k = Math.min(1, ((G.t * 0.8) % 1) * 1.4), e = k * k * (3 - 2 * k);
          G.hint(a.x + a.w / 2 + (b.x - a.x) * e, a.y + 30 + (b.y + 10 - a.y) * e);
        }
      } else G.hint(null);
    },
    draw(G, ctx) {
      G.bg('bg:ruins', 0, 272);
      KIT.clock(G, K.left, T, 58, '제한 시간 ');
      KIT.bossBar(G, '고대 오우거', K.hp, 84);
      const n = matched();
      G.rr(12, 116, 200, 24, 12, 'rgba(27,18,11,.85)', '#ffd23f', 2);
      G.text(`지금 무기: 검 · 탭 피해 ${KIT.fmt(tapNow(n))}`, 112, 128, { size: 13, color: '#ffe066' });
      KIT.unit(G, K.boss, G.t);
      KIT.unit(G, K.hero, G.t);
      // 아래 판
      ctx.fillStyle = '#2b1a0e'; ctx.fillRect(0, 272, 360, 368); ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, 270, 360, 3);
      // 세트 줄 — 게임의 장비창 한 줄과 같은 말
      const pulse = K.line > 0 ? 1 + K.line * 0.3 : 1;
      ctx.save(); ctx.translate(180, 290); ctx.scale(pulse, pulse);
      G.rr(-148, -13, 296, 26, 13, n > 0 ? 'rgba(126,224,129,.18)' : 'rgba(255,255,255,.08)', n > 0 ? '#7ee081' : 'rgba(255,255,255,.3)', 2);
      G.text(summary(n), 0, 0, { size: 15, color: n > 0 ? '#bbf7d0' : '#f5d9a8' });
      ctx.restore();
      // 장비 칸 다섯
      for (let i = 0; i < 5; i++) {
        const r = slotRect(i), it = K.eq[i], heldHere = K.held && K.held.it.slot === SLOT[i][0], over = K.held && inR(K.held.x, K.held.y, r, 7);
        const good = it && it.kind === 'sword', bad = it && it.kind !== 'sword', sc = 1 + K.pop[i] * 0.5;
        const stroke = K.deny[i] > 0 || (over && !heldHere) ? '#ef4444' : over && heldHere ? '#fff' : heldHere ? '#7ee081' : good ? '#7ee081' : bad ? '#fca5a5' : 'rgba(255,255,255,.35)';
        ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(sc, sc);
        G.rr(-r.w / 2, -r.h / 2, r.w, r.h, 12, heldHere ? 'rgba(126,224,129,.2)' : 'rgba(255,255,255,.07)', stroke, heldHere || good || bad ? 3 : 2);
        if (it) G.sprite(`gear:${it.art}`, 0, 13, { s: 0.6 });
        G.text(bad ? '효과 없음' : SLOT[i][1], 0, 28, { size: 13, color: bad ? '#fca5a5' : good ? '#bbf7d0' : '#f5d9a8' });
        ctx.restore();
      }
      // 가방
      for (const it of K.items) {
        const r = bagRect(it.cell), lifted = K.held && K.held.it === it, here = it.where === 'bag';
        G.rr(r.x, r.y, r.w, r.h, 12, here ? '#fff3d6' : 'rgba(255,255,255,.05)', here ? '#c9a24a' : 'rgba(255,255,255,.14)', 2);
        if (!here) continue;
        G.sprite(`gear:${it.art}`, r.x + r.w / 2, r.y + 50, { s: 0.6, alpha: lifted ? 0.3 : 1 });
        G.text(SET[it.kind], r.x + r.w / 2, r.y + 62, { size: 13, color: '#3b2415' });
        G.text(SLOT[slotIdx(it.slot)][1], r.x + r.w / 2, r.y + 78, { size: 13, color: '#6b4a2f' });
      }
      // 손가락에 붙은 파츠
      if (K.held) {
        G.sprite(`gear:${K.held.it.art}`, K.held.x, K.held.y - 8, { s: 0.92, ay: 0.5 });
      }
    },
    debug: () => ({ set: K.eq.filter((it) => it && it.kind === 'sword').length, left: +K.left.toFixed(1), held: K.held ? K.held.it.art : null, worn: K.eq.map((it) => (it ? it.art : null)), bag: K.items.filter((it) => it.where === 'bag').map((it) => { const r = bagRect(it.cell); return [it.art, r.x + r.w / 2, r.y + r.h / 2]; }) }),
    bot(G) {
      if (G.phase !== 'play' || G.over) return null;
      if (K.held) {
        const r = slotRect(slotIdx(K.held.it.slot)), tx = r.x + r.w / 2, ty = r.y + r.h / 2, dx = tx - K.held.x, dy = ty - K.held.y, d = Math.hypot(dx, dy);
        if (d < 6) return { release: [tx, ty] };
        const st = Math.min(d, 60);
        return { drag: [K.held.x + (dx / d) * st, K.held.y + (dy / d) * st] };
      }
      if (K.botWait > 0) { K.botWait -= 1; return null; }
      const it = K.items.find((u) => u.kind === 'sword' && u.where === 'bag');
      if (!it) return null;
      K.botWait = 6;
      const r = bagRect(it.cell);
      return { drag: [r.x + r.w / 2, r.y + r.h / 2] };
    },
  };
})();
