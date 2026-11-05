/* 릴스 · 원정대 — 대장은 용암 협곡의 화염 비룡(titans/model HUNTING_AREAS · SpriteArt BOSS_ASSET flame-wyvern-clean, 오른쪽 보는 원화라 FLIP_MONSTERS 처럼 뒤집어 그린다). 약점(불 · 바람 · 땅)이 몇 초마다 바뀐다(titans/bossWeak, 새 약점은 직전과 다른 속성). 같은 속성 동료는 피해 ×1.6(WEAK_MUL), 나머지는 ×1.
 * 카드를 누르면 그 동료가 한 번 공격한다. 부르는 간격이 정해져 있어(기력 0.3초) 빨리 누른다고 더 세지지 않는다 — 어떤 동료를 부르느냐가 결과를 가른다.
 * 한 카드만 누르면 시간 안에 못 잡고, 약점을 따라가면 잡는다. 속성은 allies ALLY_ELEMENT(미아 바람 · 가렌 흙 · 아리 불 · 세라 물) — 흙은 약점 표기(WEAK_LABEL "땅")로 맞춘다. 물은 약점이 되지 않는다 */
window.RF_SCENE = (() => {
  const T = 20, HP = 8600, BASE = 100, WEAK_MUL = 1.6, GCD = 0.3, WINDOW = 3.2, HERO_HIT = 8;
  const WEAK = {
    fire: { label: '불', col: '#f97316', deep: '#b91c1c' },
    wind: { label: '바람', col: '#34d399', deep: '#0f766e' },
    earth: { label: '땅', col: '#d97706', deep: '#78350f' },
  };
  const ALLY = [
    { id: 'mia', name: '미아', el: 'wind', label: '바람', col: '#34d399', x: 52, y: 456, s: 0.66 },
    { id: 'garen', name: '가렌', el: 'earth', label: '땅', col: '#d97706', x: 50, y: 384, s: 0.64 },
    { id: 'ari', name: '아리', el: 'fire', label: '불', col: '#f97316', x: 130, y: 386, s: 0.62 },
    { id: 'sera', name: '세라', el: 'water', label: '물', col: '#38bdf8', x: 104, y: 424, s: 0.62 },
  ];
  const slot = (i) => ({ x: 20 + i * 82, y: 478, w: 74, h: 98 });
  let K;
  /** 대장 — 원화가 오른쪽을 봐서 뒤집어 그린다(게임 FLIP_MONSTERS · game/draw FLIP_RIGHT_FACING). KIT.unit 은 뒤집기를 넘기지 않는다 */
  function drawBoss(G) {
    const b = K.boss, key = b.mode === 'hit' ? G.once(`${b.id}:hit`, [0, 1], b.dur || 0.24, b.mt || 0) : G.frame(`${b.id}:idle`, [0, 1, 2, 3], 6, G.t), c = G.ctx, im = G.img(key);
    if (im) { c.save(); c.globalAlpha = 0.28 * (b.alpha ?? 1); c.fillStyle = '#2a1606'; c.beginPath(); c.ellipse(b.x, b.y - 2, im.w * b.s * 0.32, 7 * b.s, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
    G.sprite(key, b.x, b.y, { s: b.s, flip: true, flashA: b.flash || 0, flashC: '#fff', alpha: b.alpha ?? 1 });
  }
  function nextWeak() {
    if (!K.cycle.length) {
      K.cycle = ['fire', 'wind', 'earth'].sort(() => Math.random() - 0.5);
      if (K.cycle[K.cycle.length - 1] === K.weak) K.cycle.reverse();   // 직전과 다른 속성(rollBossWeak) · 세 속성이 고르게
    }
    K.weak = K.cycle.pop(); K.weakT = WINDOW; K.badge = 0.3; K.seq += 1;
  }
  function strike(G, i) {
    const a = ALLY[i], u = K.units[i], match = a.el === K.weak;
    K.cool = GCD; K.press[i] = 0.14;
    if (!u.on) { u.on = true; u.x = -50; G.caption(`${a.name} 합류!`); }
    KIT.attack(u, 0.28); K.calls += 1;
    if (!K.chose) { K.chose = true; G.emit('choice', { first: a.id, weak: K.weak }); }
    K.shots.push({ x: Math.max(u.x, u.tx - 40) + 34, y: u.y - 50, t: 0, match, col: a.col, dmg: match ? BASE * WEAK_MUL : BASE });
  }
  function call(G, i) {
    if (K.cool > 0) { K.queue = i; return; }   // 기력이 돌아오면 바로 나간다 — 누른 손가락을 버리지 않는다
    strike(G, i);
  }
  function damage(G, d, match, col) {
    K.hp -= d;
    if (K.boss.mode === 'idle') KIT.hit(K.boss);
    K.boss.flash = match ? 0.45 : 0.2;   // 자주 맞아 하얗게 바래지 않게
    const x = K.boss.x - 34 + Math.random() * 60;
    if (match) {
      K.weakHits += 1; G.sfx('coin'); G.punch(0.03); G.burst(K.boss.x - 40, K.boss.y - 110, col, 14, 240); G.shake(3, 0.12);
      G.float(`${KIT.fmt(d)} ×1.6`, x, K.boss.y - 150, '#ffd23f', 25, 0.55);
    } else { G.sfx('hit'); G.float(KIT.fmt(d), x, K.boss.y - 120, '#fff', 17, 0.5); }
    if (K.hp > 0) return;
    K.dead = true; K.hp = 0; G.climax(); G.sfx('win'); G.burst(K.boss.x, K.boss.y - 100, '#ffd23f', 70, 320); G.impact(2); G.coins(K.boss.x, K.boss.y - 100, 34);
    G.pop('약점 공략', '화염 비룡 처치!', `약점 명중 ${K.weakHits}번 · 같은 속성 ×1.6`, 'gold', 2.4); G.caption('약점이 뜨면 같은 속성 동료를 불러요'); G.finish(2.6);
  }
  return {
    id: 'party-assemble',
    canLose: true,
    introDur: 1.5,
    hook: ['혼자서는 못 이긴다', '약점에 맞는 동료!'],
    climaxStamp: '화염 비룡 처치!!', raysAt: [262, 330], stampY: 340,
    caption0: '약점과 같은 속성 동료를 눌러요',
    endLines: ['약점과 같은 속성 동료 피해 ×1.6', '원정대를 꾸려 화염 비룡을 넘자'],
    init() {
      K = { hp: HP, left: T, weak: null, weakT: 0, seq: 0, cycle: [], badge: 0, cool: 0, queue: -1, chose: false, calls: 0, weakHits: 0, dead: false, heroT: 0.4, press: [0, 0, 0, 0], shots: [],
        units: ALLY.map((a, i) => ({ id: a.id, x: -60, tx: a.x, y: a.y, s: a.s, mode: 'idle', mt: 0, phase: i * 0.2, on: false })),
        hero: { id: 'hero', x: 150, y: 446, s: 0.74, mode: 'idle', mt: 0 }, boss: { id: 'flame-wyvern-clean', x: 266, y: 438, s: 0.92, mode: 'idle', mt: 0 } };
      nextWeak();
    },
    onTap(G, x, y) {
      if (G.phase !== 'play' || G.over) return true;
      G.hint(null);
      for (let i = 0; i < 4; i++) { const r = slot(i); if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { call(G, i); return true; } }
      return false;
    },
    onKey(G) { if (G.phase === 'play' && !G.over) call(G, ALLY.findIndex((a) => a.el === K.weak)); },
    update(G, dt) {
      KIT.tick(K.hero, dt); KIT.tick(K.boss, dt);
      K.badge = Math.max(0, K.badge - dt);
      for (let i = 0; i < 4; i++) K.press[i] = Math.max(0, K.press[i] - dt);
      for (const u of K.units) { KIT.tick(u, dt); if (u.on) u.x += (u.tx - u.x) * Math.min(1, dt * 9); }
      if (K.dead) { K.boss.alpha = Math.max(0, (K.boss.alpha ?? 1) - dt * 0.7); return; }
      if (G.over || G.phase !== 'play') return;
      K.left = Math.max(0, K.left - dt);
      K.weakT -= dt;
      if (K.weakT <= 0) { nextWeak(); G.sfx('flip'); G.caption(`약점 ${WEAK[K.weak].label}! 같은 속성 동료를 눌러요`); }
      // 부르기 — 기력 + 눌러 둔 한 번
      K.cool = Math.max(0, K.cool - dt);
      if (K.cool === 0 && K.queue >= 0) { const q = K.queue; K.queue = -1; strike(G, q); }
      // 주인공 혼자는 간지럼
      K.heroT -= dt;
      if (K.heroT <= 0) { K.heroT = 0.7; if (K.hero.mode === 'idle') KIT.attack(K.hero, 0.4); damage(G, HERO_HIT, false); if (G.over) return; }
      // 공격이 날아가 맞으면 피해
      for (const s of K.shots) {
        s.t += dt / 0.14;
        if (s.t >= 1 && !s.done) { s.done = true; damage(G, s.dmg, s.match, s.col); if (K.dead) return; }
      }
      K.shots = K.shots.filter((s) => !s.done);
      if (K.left <= 0) {
        G.lose('화염 비룡이 버텼어요!', [`남은 체력 ${Math.ceil((K.hp / HP) * 100)}%`, K.calls ? '약점과 같은 속성 동료를 불러 보세요' : '혼자서는 못 이겨요 · 동료 카드를 눌러요']);
        return;
      }
      if (G.idle > 1.2) { const r = slot(ALLY.findIndex((a) => a.el === K.weak)); G.hint(r.x + r.w / 2, r.y + 44); } else G.hint(null);
    },
    draw(G, ctx) {
      KIT.stage(G, ctx, 'bg:volcano');
      KIT.bossBar(G, '화염 비룡', Math.max(0, K.hp) / HP, 60);
      KIT.clock(G, K.left, T, 90, '제한 시간 ');
      if ((K.boss.alpha ?? 1) > 0) drawBoss(G);
      // 약점 배지 — 게임의 "약점 / 불" 배지와 같은 글자 · 색 · 남은 시간 고리
      if (!K.dead && K.weak) {
        const w = WEAK[K.weak], bx = 266, by = 170, sc = 1 + K.badge * 1.4;
        ctx.save(); ctx.translate(bx, by); ctx.scale(sc, sc);
        const g = ctx.createRadialGradient(0, 0, 8, 0, 0, 46); g.addColorStop(0, w.col + 'aa'); g.addColorStop(1, w.col + '00');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = w.deep; ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = w.col; ctx.beginPath(); ctx.arc(0, 0, 29, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, 33, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, K.weakT / WINDOW)); ctx.stroke();
        G.text('약점', 0, -11, { size: 13, color: '#fff', stroke: w.deep, sw: 3 });
        G.text(w.label, 0, 9, { size: w.label.length > 1 ? 19 : 25, color: '#fff', stroke: w.deep, sw: 4 });
        ctx.restore();
      }
      // 주인공 · 동료 — 뒤에서 앞으로
      const all = [...K.units.filter((u) => u.on), K.hero].sort((a, b) => a.y - b.y);
      for (const u of all) KIT.unit(G, u, G.t);
      // 날아가는 공격
      for (const s of K.shots) {
        const k = Math.min(1, s.t), x = s.x + (K.boss.x - 40 - s.x) * k, y = s.y + (K.boss.y - 110 - s.y) * k, r = s.match ? 13 : 7;
        ctx.save(); ctx.globalAlpha = 0.95; ctx.fillStyle = s.col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      // 아래: 동료 카드 넷 — 칩 색이 약점 배지 색과 같다
      for (let i = 0; i < 4; i++) {
        const r = slot(i), a = ALLY[i], pr = K.press[i] > 0, dy = pr ? 3 : 0;
        G.rr(r.x, r.y + dy, r.w, r.h, 12, pr ? '#ffe9a8' : '#fff3d6', pr ? a.col : '#f2c232', 3);
        KIT.unit(G, { id: a.id, x: r.x + r.w / 2, y: r.y + 54 + dy, s: i === 2 ? 0.38 : 0.42, mode: 'idle', mt: 0, phase: i * 0.3 }, G.t);
        G.text(a.name, r.x + r.w / 2, r.y + 62 + dy, { size: 13, color: '#7c2d12' });
        G.rr(r.x + 13, r.y + 72 + dy, r.w - 26, 20, 10, a.col, '#3b2415', 1.5);
        G.text(a.label, r.x + r.w / 2, r.y + 82 + dy, { size: 14, color: '#fff', stroke: '#3b2415', sw: 3 });
      }
    },
    debug: () => ({ hp: Math.round(K.hp), left: +K.left.toFixed(1), weak: K.weak, calls: K.calls, weakHits: K.weakHits }),
    bot(G) {
      if (G.phase !== 'play' || G.over) return null;
      const r = slot(ALLY.findIndex((a) => a.el === K.weak));
      return { tap: [r.x + r.w / 2, r.y + r.h / 2] };
    },
  };
})();
