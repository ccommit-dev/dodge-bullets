/* 릴스 · 무기 기술 — 12초 안에 대장을 못 잡으면 진다. 탭마다 고리가 차고, every 번째 탭에 기술이 일반 피해에 더해 터진다(titans/weapons WEAPON_TECH · TitansGame 탭 처리).
 * 판단은 게임 규칙 그대로: 창 기술은 대장에게 ×4 · 창은 대장 피해 ×1.25(WEAPON_EFFECTS.bossMul) · 무기를 바꾸면 고리가 0 으로(TitansGame equipWeapon).
 * 체력은 창이면 초당 5탭으로 잡히고, 검만 연타하면 초당 6탭을 넘겨야 잡히게 맞췄다(탭당 평균 창 37.8 · 활 32.1 · 검 30.6 · 지팡이 22.3). 게임에선 교체가 다음 몬스터부터지만 대장 한 마리 장면이라 바로 든다.
 * 대장은 그림자 숲 지역 대장 월광 늑대왕(HUNTING_AREAS · SpriteArt BOSS_ASSET), 칩 그림은 게임 무기 아이콘 */
window.RF_SCENE = (() => {
  const TAP = 18, LIMIT = 12, BOSS_HP = 2150, BOSS_NAME = '월광 늑대왕';
  const W = {
    sword: { label: '검', name: '연속 베기', every: 6, mul: 2.5, tapMul: 1.2, bossMul: 1, fx: 'slash', sub: '×2.5', desc: '6탭마다 두 번 베기 ×2.5', col: '#ffe066' },
    spear: { label: '창', name: '관통 찌르기', every: 8, mul: 4, tapMul: 1.12, bossMul: 1.25, fx: 'thrust', sub: '대장 ×4', desc: '8탭마다 꿰뚫기 ×2 · 대장 ×4', col: '#7dd3fc' },
    bow: { label: '활', name: '연사', every: 4, mul: 2.2, tapMul: 1.15, bossMul: 1, fx: 'arrow', sub: '×2.2', desc: '4탭마다 화살 연사 ×2.2', col: '#86efac' },
    staff: { label: '지팡이', name: '마력 폭발', every: 8, mul: 3, tapMul: 0.9, bossMul: 1, fx: 'bolt', sub: '×3', desc: '8탭마다 마력 폭발 ×3', col: '#c4b5fd' },
  };
  const KINDS = ['sword', 'spear', 'bow', 'staff'];
  const RING = { x: 72, y: 524, r: 46 };
  const chipRect = (i) => ({ x: 136 + (i % 2) * 110, y: 472 + Math.floor(i / 2) * 58, w: 104, h: 52 });
  let K;
  const chipAt = (x, y) => KINDS.find((_, i) => { const r = chipRect(i); return x >= r.x - 3 && x <= r.x + r.w + 3 && y >= r.y - 3 && y <= r.y + r.h + 3; });
  function first(G, data) { if (!K.chose) { K.chose = true; G.emit('choice', data); } }
  function swap(G, kind) {
    if (K.dead || G.over || K.weapon === kind) return;
    const w = W[kind];
    K.weapon = kind; K.ring = 0; K.swaps += 1; K.chipT = 0.25;
    G.sfx('merge'); G.punch(0.03); G.burst(K.hero.x, 330, w.col, 12, 140);
    G.float(`${w.label}!`, K.hero.x, 250, w.col, 26, 0.7);
    G.caption(`${w.label} — ${w.desc}`);
  }
  function strike(G) {
    if (K.dead || G.over || G.phase !== 'play') return;
    const w = W[K.weapon];
    K.taps += 1; K.ring += 1; K.pressT = 0.08;
    KIT.attack(K.hero, 0.36);
    if (K.boss.mode === 'idle') KIT.hit(K.boss);
    const base = TAP * w.tapMul * w.bossMul;
    let total = base;
    G.float(KIT.fmt(base), 268 + (Math.random() * 44 - 22), 300, '#fff', 20, 0.7);
    if (K.ring >= w.every) {   // 게임과 같다 — 일반 피해에 기술 한 방(탭 기본 피해 × mul)을 더한다
      K.ring = 0; K.techs += 1;
      const tech = base * w.mul;
      total += tech;
      K.fx = { kind: w.fx, t: 0.55, dur: 0.55, col: w.col };
      G.flash('#fff6c4', 0.16); G.impact(K.weapon === 'spear' ? 1.8 : 1.2); G.sfx('bolt'); G.speed(0.45);
      G.stamp(`${w.name}!!`, w.col, 214, 0.8);
      G.float(KIT.fmt(tech), 268, 262, K.weapon === 'spear' ? '#7dd3fc' : '#ffd23f', 40, 1);
      if (K.techs === 1 && K.weapon === 'sword') G.caption('아래 칩으로 무기 교체 — 고리는 0부터');
      else G.caption(`${w.name} ×${w.mul} — ${K.techs}번째`);
    } else G.sfx('hit');
    K.hp = Math.max(0, K.hp - total);
    if (K.hp <= 0) {
      K.dead = true; G.climax(); G.sfx('win'); G.burst(268, 320, '#ffd23f', 60, 300); G.impact(2); G.coins(268, 320, 30);
      G.pop('무기마다 기술이 다르다', `${w.label} · ${w.name}`, `${K.left.toFixed(1)}초 남기고 처치`, 'gold', 2.4);
      G.caption(`${BOSS_NAME} 처치!`); G.finish(2.4);
    }
  }
  /** 무기 그림 — 게임 아이콘(검은 대장간 그림 · 나머지는 장비 그림). 모두 3단계(+10 이상 · weaponTier) */
  function icon(G, kind, x, y, h) {
    if (kind === 'sword') G.sprite('drum:10', x, y, { s: h / 150 });
    else if (kind === 'spear') G.sprite('gear:spear-3', x, y, { s: h / 90 });
    else if (kind === 'bow') G.sprite('gear:bow-3', x, y, { s: h / 90 });
    else G.sprite('gear:staff-3', x, y, { s: h / 90 });
  }
  function drawFx(G, ctx) {
    const f = K.fx; if (!f) return;
    const k = f.t / f.dur;
    ctx.save(); ctx.globalAlpha = Math.min(1, k * 2); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const line = (pts, layers) => { for (const [lw, c] of layers) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.lineWidth = lw; ctx.strokeStyle = c; ctx.stroke(); } };
    if (f.kind === 'slash') {
      for (const pts of [[[206, 250], [336, 380]], [[336, 250], [206, 380]]]) line(pts, [[16, 'rgba(255,214,60,.55)'], [8, '#ffe066'], [3, '#fff']]);
    } else if (f.kind === 'thrust') {   // 대장을 꿰뚫는 긴 찌르기
      const reach = 130 + (1 - k) * 240;
      line([[K.hero.x + 40, 340], [K.hero.x + 40 + reach, 340]], [[22, 'rgba(125,211,252,.5)'], [10, '#bae6fd'], [4, '#fff']]);
      ctx.beginPath(); ctx.ellipse(268, 340, 22, 70 * (1.2 - k * 0.5), 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(186,230,253,.5)'; ctx.fill();
    } else if (f.kind === 'arrow') {   // 화살 연사
      for (let i = 0; i < 5; i++) {
        const p = Math.max(0, Math.min(1, (1 - k) * 2.4 - i * 0.18));
        if (p > 0 && p < 1) G.sprite('arrow:basic', K.hero.x + 40 + p * 150, 300 + i * 20, { s: 1, ay: 0.5 });
      }
    } else {   // 마력 폭발
      line([[258, 60], [286, 170], [242, 240], [278, 340]], [[14, 'rgba(196,181,253,.5)'], [6, '#ddd6fe'], [2, '#fff']]);
      G.sprite('skill:bolt', 268, 372, { s: 1.5 * (1.1 - k * 0.3), ay: 0.5, alpha: Math.min(1, k * 2) });
    }
    ctx.restore();
  }
  return {
    id: 'weapon-tech',
    canLose: true,
    popY: 196,
    introDur: 1.5,
    hook: ['12초 안에 대장을!', '무기마다 다른 기술'],
    climaxStamp: 'K.O.!!', raysAt: [268, 320],
    caption0: '연타! 6번째 탭 = 연속 베기',
    endLines: ['검 · 창 · 활 · 지팡이', '무기마다 다른 탭 기술'],
    init() {
      K = { taps: 0, ring: 0, techs: 0, swaps: 0, hp: BOSS_HP, left: LIMIT, dead: false, chose: false, weapon: 'sword', fx: null, pressT: 0, chipT: 0,
        hero: { id: 'hero', x: 78, y: 424, s: 1, mode: 'idle', mt: 0 }, boss: { id: 'moon-wolf-king-clean', x: 268, y: 424, s: 1, mode: 'idle', mt: 0 } };
    },
    onTap(G, x, y) {
      if (G.phase !== 'play' || y <= 56) return true;
      first(G, { weapon: 'first' });
      const c = chipAt(x, y);
      if (c) swap(G, c); else strike(G);
      G.hint(null);
      return true;
    },
    onKey(G) { if (G.phase === 'play') { first(G, { weapon: 'first' }); strike(G); } },
    update(G, dt) {
      KIT.tick(K.hero, dt); KIT.tick(K.boss, dt);
      K.pressT = Math.max(0, K.pressT - dt); K.chipT = Math.max(0, K.chipT - dt);
      if (K.fx) { K.fx.t -= dt; if (K.fx.t <= 0) K.fx = null; }
      if (K.dead) { K.boss.alpha = Math.max(0, (K.boss.alpha ?? 1) - dt * 0.8); return; }
      if (G.over || G.phase !== 'play') return;
      K.left = Math.max(0, K.left - dt);
      if (K.left <= 0) {
        KIT.attack(K.boss, 0.5);
        const pct = Math.ceil((K.hp / BOSS_HP) * 100);
        G.lose('시간 초과!', [`대장 체력 ${pct}% 남았어요`, K.weapon === 'spear' ? '창은 그대로, 더 빠르게 연타!' : '창 기술은 대장에게 ×4 — 바꿔 보세요']);
        return;
      }
      if (G.idle > 0.9) {
        const r = chipRect(1);
        if (K.weapon !== 'spear' && K.taps >= 6) G.hint(r.x + r.w / 2, r.y + r.h / 2); else G.hint(RING.x, RING.y);
      } else G.hint(null);
    },
    draw(G, ctx) {
      const w = W[K.weapon], left = w.every - K.ring;
      KIT.stage(G, ctx, 'bg:forest');
      KIT.bossBar(G, `대장 · ${BOSS_NAME} ${KIT.fmt(K.hp)}`, K.hp / BOSS_HP);
      KIT.clock(G, K.left, LIMIT, 96, '남은 시간 ');
      KIT.unit(G, K.hero, G.t);
      KIT.unit(G, K.boss, G.t);
      // 든 무기 표
      G.rr(K.hero.x + 34, 258, 34, 44, 10, 'rgba(27,18,11,.8)', w.col, 2);
      icon(G, K.weapon, K.hero.x + 51, 298, 38);
      drawFx(G, ctx);
      // 기술 설명 — 게임 WEAPON_TECH.desc 그대로, 칸이 다 차면 TechGauge 문구
      const ready = left === 1;
      G.text(ready ? `다음 탭 ${w.name}!` : `${w.label} · ${w.desc}`, 180, 444, { size: ready ? 17 : 14, color: ready ? '#ffd23f' : '#fff3d0', stroke: '#2a1606', sw: 4 });
      // 아래: 탭 고리 + 무기 칩 4개
      ctx.save(); ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(RING.x, RING.y, RING.r, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.stroke();
      if (K.ring > 0) { ctx.beginPath(); ctx.arc(RING.x, RING.y, RING.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (K.ring / w.every)); ctx.strokeStyle = w.col; ctx.stroke(); }
      ctx.restore();
      const press = K.pressT > 0 ? 0.92 : 1;
      ctx.save(); ctx.translate(RING.x, RING.y); ctx.scale(press, press);
      G.rr(-37, -37, 74, 74, 37, ready ? '#ffd23f' : '#ff8a1f', '#3b2415', 4);
      G.text('탭!', 0, -7, { size: 24, color: '#1b1206' });
      G.text(`${left}탭 남음`, 0, 17, { size: 13, color: '#3b2415' });
      ctx.restore();
      KINDS.forEach((kind, i) => {
        const r = chipRect(i), c = W[kind], on = K.weapon === kind;
        G.rr(r.x, r.y, r.w, r.h, 12, on ? '#ffd23f' : 'rgba(255,255,255,.08)', on ? '#fff3b0' : 'rgba(255,255,255,.28)', on ? 3 : 2);
        icon(G, kind, r.x + 15, r.y + r.h - 5, 42);
        G.text(`${c.label} ${c.every}탭`, r.x + 29, r.y + 16, { size: 14, color: on ? '#1b1206' : '#fff', align: 'left' });
        G.text(c.sub, r.x + 29, r.y + 36, { size: 13, color: on ? '#7c3a06' : kind === 'spear' ? '#ffe066' : '#f5d9a8', align: 'left' });
      });
    },
    debug: () => ({ weapon: K.weapon, ring: K.ring, taps: K.taps, techs: K.techs, swaps: K.swaps, hp: Math.round(K.hp), left: +K.left.toFixed(1) }),
    bot(G) {
      if (G.phase !== 'play' || G.over || K.dead) return null;
      if (K.weapon !== 'spear') { const r = chipRect(1); return { tap: [r.x + r.w / 2, r.y + r.h / 2] }; }
      return { tap: [K.boss.x, 340] };
    },
  };
})();
