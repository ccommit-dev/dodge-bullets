/* 릴스 · 펫 — 같은 몬스터 1,000마리를 잡으면 그 몬스터의 아기가 부화한다(titans/pets PET_HATCH_KILLS · 도감 처치 수). 사냥터처럼 땅 위로 몬스터들이 오른쪽에서 걸어 들어온다(줄 셋 깊이).
 * 알을 고르고 그 종만 잡는다. 한 마리 = 100마리로 압축. 다른 종은 잡아도 고른 알의 수가 오르지 않을 뿐이라 시간 손해, 지나가면 사라진다. 제한 시간 안에 1,000 을 못 채우면 진다.
 * 알 카드 · 도장 값은 PET_DEFS 의 desc · Lv.1(슬라임 사냥 골드 증가 +5% · 고블린 방치 조각 드랍 가속 +25% · 늑대 보스 제한시간 연장 +3초) · Lv.10 은 petEffect 계산.
 * 부화한 아기는 주인공 곁에 서서 가끔 같이 공격한다(사냥 돕기 PET_ATTACK_SEC 2.6초 · petAttackMul Lv.1 ×0.80) — 끝나기 전에 그 모습을 잠깐 보여 준다.
 * 숏츠 과장(사용자 2026-11-05): 잡힌 몬스터가 날아가고, 금이 갈수록 카메라가 당겨지다 깨질 때 빛 폭발, 튀어나온 아기가 몬스터들을 날린다. 플레이 중 줌은 1.11 아래로 짧게 — 몬스터 누르는 자리가 크게 어긋나지 않는다 */
window.RF_SCENE = (() => {
  const T = 16, NEED = 1000, STEP = 100, GAP = 0.34, HP = 4, SPEED = 110, ENTER_X = 410, EXIT_X = 118;
  const EGGS = [
    { mole: 'slime', pet: 'pet-slime', label: '슬라임', baby: '아기 슬라임', shell: '#e4f9cf', spot: '#7ccf6b', col: '#4ade80', desc: ['사냥 골드', '증가'], val: '+5%', title: '사냥 골드 +5%', lv10: '사냥 골드 +14%', stamp: '골드 +5%!', full: '사냥 골드 증가' },
    { mole: 'goblin', pet: 'pet-goblin', label: '고블린', baby: '꼬마 고블린', shell: '#eadff6', spot: '#9b6fc4', col: '#c084fc', desc: ['방치 조각', '드랍 가속'], val: '+25%', title: '방치 조각 +25%', lv10: '방치 조각 +70%', stamp: '조각 +25%!', full: '방치 조각 드랍 가속' },
    { mole: 'wolf', pet: 'pet-wolf', label: '늑대', baby: '아기 늑대', shell: '#f7ecc4', spot: '#c9a24a', col: '#fbbf24', desc: ['보스 제한시간', '연장'], val: '+3초', title: '보스 시간 +3초', lv10: '보스 시간 +7.5초', stamp: '보스 +3초!', full: '보스 제한시간 연장' },
  ];
  const LANES = [{ y: 388, s: 0.62 }, { y: 422, s: 0.72 }, { y: 456, s: 0.82 }];   // 모두 땅 위 — 위 줄이 공중에 떠 보였다
  const W = { slime: 117, goblin: 144, wolf: 97 };
  const eggRect = (i) => ({ x: 10 + i * 116, y: 112, w: 108, h: 190 });
  let K;
  const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
  function spawn() {
    if (!K.bag.length) { const o = [0, 1, 2].filter((i) => i !== K.egg); K.bag = shuffle([K.egg, o[Math.floor(Math.random() * 2)], o[Math.floor(Math.random() * 2)]]); }
    if (!K.laneBag.length) K.laneBag = shuffle([0, 1, 2]);
    const e = K.bag.pop(), l = LANES[K.laneBag.pop()];
    K.uid += 1; K.mons.push({ uid: K.uid, id: EGGS[e].mole, e, x: ENTER_X, y: l.y, s: l.s, hp: HP, mode: 'idle', mt: 0, phase: Math.random() });
  }
  function pick(G, i) {
    if (K.egg >= 0) return;
    K.egg = i; K.spawnT = 0.05; G.sfx('merge'); G.flash(EGGS[i].col, 0.12); G.punch(0.04);
    G.emit('choice', { egg: EGGS[i].mole }); G.caption(`${EGGS[i].label}만 잡아요! 다른 종은 안 세어져요`);
  }
  function hatch(G) {
    K.hatch = 0; G.climax(); G.sfx('legend'); G.caption('알이 깨진다!'); G.finish(4.6);
  }
  function monAt(x, y) {
    // 줄이 좁아 몬스터가 겹친다 — 맨 앞 줄이 아니라 손가락에서 가장 가까운 몸을 친다(고른 종은 비슷한 거리면 먼저)
    const d = (m) => Math.hypot(x - m.x, y - (m.y - 65 * m.s)) * (m.e === K.egg ? 0.75 : 1);
    return K.mons.filter((m) => !m.dead && Math.abs(x - m.x) < (W[m.id] * m.s) / 2 + 8 && y > m.y - 130 * m.s - 8 && y < m.y + 14).sort((a, b) => d(a) - d(b))[0];
  }
  /** 처치된 몬스터는 돌며 날아간다 */
  function fling(m, vx, vy) { K.ghosts.push({ id: m.id, s: m.s, x: m.x, y: m.y - (130 * m.s) / 2, vx, vy, rot: 0, t: 0 }); }
  function hit(G, m) {
    m.hp -= 1; KIT.hit(m); G.sfx('hit'); G.burst(m.x, m.y - 60 * m.s, '#fff3a0', 5, 110);
    const h = K.hero;
    if (h.mode !== 'attack' || h.mt > 0.18) KIT.attack(h, 0.34);
    if (m.hp > 0) return;
    m.dead = true; fling(m, 380 + Math.random() * 180, -300 - Math.random() * 140);
    if (m.e === K.egg) {
      K.count = Math.min(NEED, K.count + STEP); K.hits += 1; K.eggPop = 0.25;
      G.sfx('coin'); G.punch(0.015); G.burst(m.x, m.y - 60 * m.s, EGGS[K.egg].col, 14, 170); G.float('+100마리', Math.min(262, m.x), m.y - 130 * m.s - 8, '#ffe066', 22, 0.7);
      // 금이 갈수록 카메라가 조금씩 더 당겨진다
      const r = K.count / NEED;
      G.zoom(1.03 + r * 0.08, 180, 380, 0.16); G.ring(m.x, m.y - 60 * m.s, EGGS[K.egg].col, 70, 0.26); G.ring(50, 522, EGGS[K.egg].col, 44 + r * 50, 0.32); G.kick(0, 2 + r * 3);
      if (r >= 0.7) G.vignette(EGGS[K.egg].col, 0.2 + (r - 0.7) * 1.2);
      if (K.count === 500) G.caption('알이 들썩여요!');
      if (K.count === 900) G.caption('100마리만 더!');
      if (K.count >= NEED) hatch(G);
    } else {
      K.wrong += 1; G.float('안 세어져요', Math.min(310, m.x), m.y - 130 * m.s - 8, '#cbd5e1', 16, 0.7); G.caption(`${EGGS[m.e].label}은 ${EGGS[K.egg].label} 알에 안 세어져요`);
    }
  }
  /** 알 — (x, y) 가운데. crack 0~1 은 금 길이 */
  function eggShape(ctx) { ctx.beginPath(); ctx.moveTo(0, -40); ctx.bezierCurveTo(24, -40, 33, -8, 33, 10); ctx.bezierCurveTo(33, 30, 18, 40, 0, 40); ctx.bezierCurveTo(-18, 40, -33, 30, -33, 10); ctx.bezierCurveTo(-33, -8, -24, -40, 0, -40); ctx.closePath(); }
  function eggBody(ctx, e, crack) {
    eggShape(ctx);
    const g = ctx.createRadialGradient(-10, -16, 4, 0, 0, 48); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, e.shell); g.addColorStop(1, e.spot);
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); eggShape(ctx); ctx.clip(); ctx.fillStyle = e.spot;
    for (const [sx, sy, r] of [[-14, -18, 7], [14, -6, 9], [-20, 14, 6], [6, 22, 8], [20, 24, 4], [-4, -30, 4]]) { ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    if (crack > 0) {
      const pts = [[-33, 2], [-22, -6], [-13, 5], [-3, -7], [7, 5], [17, -6], [26, 3], [33, -3]], n = Math.max(2, Math.ceil(pts.length * Math.min(1, crack)));
      ctx.strokeStyle = '#3b2415'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
    eggShape(ctx); ctx.lineWidth = 3; ctx.strokeStyle = '#3b2415'; ctx.stroke();
  }
  function drawEgg(ctx, e, x, y, s, crack, rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s); eggBody(ctx, e, crack); ctx.restore(); }
  /** 깨진 껍데기 두 조각 — 위아래로 날아간다 */
  function drawShell(ctx, e, x, y, s, k) {
    for (const up of [true, false]) {
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k); ctx.translate(x + (up ? -1 : 1) * k * 70, y + (up ? -1 : 1) * k * 60); ctx.rotate((up ? -1 : 1) * k * 1.4); ctx.scale(s, s);
      ctx.beginPath(); ctx.rect(-50, up ? -50 : 0, 100, 50); ctx.clip(); eggBody(ctx, e, 0); ctx.restore();
    }
  }
  const petFrame = (G, e) => G.frame(`${e.pet}:idle`, [0, 1, 2, 3], 6, G.t);
  return {
    id: 'pet-hatch',
    canLose: true,
    introDur: 1.5,
    hook: ['1,000마리 잡으면', '아기가 태어난다'],
    raysAt: [180, 290],
    caption0: '키울 알을 하나 골라요',
    endLines: ['같은 몬스터 1,000마리면 아기 부화', '장착한 펫 한 마리의 효과가 더해져요'],
    init() {
      K = { uid: 0, left: T, egg: -1, count: 0, shown: 0, hits: 0, wrong: 0, missed: 0, mons: [], ghosts: [], bag: [], laneBag: [], spawnT: 0, eggPop: 0, hatch: -1, born: false, popped: false, demo: null, demoT: 0, heroHit1: false, demoGone: false, pounce: -1, pounced: false,
        hero: { id: 'hero', x: 52, y: 396, s: 0.72, mode: 'idle', mt: 0 } };
    },
    onTap(G, x, y) {
      if (G.phase !== 'play' || G.over) return true;
      G.hint(null);
      if (K.egg < 0) {
        for (let i = 0; i < 3; i++) { const r = eggRect(i); if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { pick(G, i); return true; } }
        return false;
      }
      const m = monAt(x, y);
      if (m) { hit(G, m); return true; }
      return false;
    },
    onKey(G) {
      if (G.phase !== 'play' || G.over) return;
      if (K.egg < 0) { pick(G, 0); return; }
      const m = K.mons.filter((u) => u.e === K.egg).sort((a, b) => a.x - b.x)[0];
      if (m) hit(G, m);
    },
    update(G, dt) {
      KIT.tick(K.hero, dt);
      K.shown += (K.count - K.shown) * Math.min(1, dt * 12);
      K.eggPop = Math.max(0, K.eggPop - dt);
      for (const g of K.ghosts) { g.t += dt; g.x += g.vx * dt; g.y += g.vy * dt; g.vy += 1000 * dt; g.rot += dt * 11; }
      K.ghosts = K.ghosts.filter((g) => g.t < 0.85 && g.y < 500);
      if (K.hatch >= 0) {
        K.hatch += dt;
        const e = EGGS[K.egg], h = K.hatch;
        // 금이 가며 카메라가 점점 당겨지고 알이 떤다
        if (h <= 0.45) { G.zoom(1.34 + h * 1.5, 180, 290, 0.2); G.shake(2 + h * 22, 0.1); G.vignette(e.col, 0.35 + h); if (Math.floor(h * 22) !== Math.floor((h - dt) * 22)) { G.ring(180, 290, e.col, 140 + h * 300, 0.25); G.sfx('tap'); } }
        if (h > 0.45 && !K.born) {
          // 빛 폭발 — 튀어나온 아기가 몬스터들을 사방으로 날린다
          K.born = true; G.impact(3.2, 180, 290); G.flash('#fff', 0.42); G.rays(180, 290, 2.6, '#fff3a0'); G.confetti(70); G.burst(180, 290, e.col, 90, 420); G.burst(180, 290, '#fff3a0', 50, 340); G.coins(180, 290, 10); G.sfx('win'); G.caption(`${e.baby} 탄생!`);
          [0, 0.1, 0.22].forEach((d, i) => G.after(d, () => G.ring(180, 290, i === 1 ? e.col : '#fff', 230 + i * 90, 0.55)));
          for (const m of K.mons) { const dx = m.x - 180, dy = m.y - 60 - 290, d = Math.max(30, Math.hypot(dx, dy)); fling(m, (dx / d) * 900, (dy / d) * 500 - 520); }
          K.mons = []; G.stamp('부화!!', '#ffd23f', 420, 1.1); G.zoom(1.14, 180, 320, 0.35);
        }
        if (h > 1.15 && !K.popped) { K.popped = true; G.pop(`${e.baby} 부화`, e.title, `${e.full} · 장착 펫 효과`, 'gold', 2.6); G.stamp(e.stamp, '#ffd23f', 300, 1.1); G.caption('주인공 곁에서 같이 사냥해요'); }
        // 사냥 돕기 — 다음 몬스터가 걸어 들어오면 주인공이 치고, 곁의 아기도 덤빈다
        if (h > 1.4 && !K.demo) K.demo = { id: EGGS[(K.egg + 1) % 3].mole, x: 420, y: 452, s: 0.82, mode: 'idle', mt: 0, phase: 0 };
        if (K.demo) { KIT.tick(K.demo, dt); K.demo.x = Math.max(296, K.demo.x - 420 * dt); }
        if (h > 2.0 && !K.heroHit1) { K.heroHit1 = true; KIT.attack(K.hero, 0.34); KIT.hit(K.demo); G.sfx('hit'); G.burst(K.demo.x - 10, 400, '#fff3a0', 10, 150); }
        if (h > 2.3 && K.pounce < 0 && !K.pounced) { K.pounce = 0; K.pounced = true; G.sfx('tap'); }
        if (K.pounce >= 0) {
          const was = K.pounce; K.pounce += dt;
          if (was < 0.24 && K.pounce >= 0.24) { G.sfx('bolt'); G.impact(1, K.demo.x - 10, 400); G.burst(K.demo.x - 16, 400, e.col, 30, 240); G.ring(K.demo.x - 10, 400, e.col, 130, 0.36); G.coins(K.demo.x, 390, 10); G.float('펫 공격!', 262, 330, '#bef264', 26, 1); fling(K.demo, 640, -560); K.demoGone = true; }
          if (K.pounce > 0.6) K.pounce = -1;
        }
        return;
      }
      if (G.over || G.phase !== 'play') return;
      K.left = Math.max(0, K.left - dt);
      if (K.egg >= 0) {
        K.spawnT -= dt;
        if (K.spawnT <= 0) { K.spawnT = GAP; spawn(); }
        for (const m of K.mons) {
          KIT.tick(m, dt); m.x -= SPEED * dt;
          if (m.x < EXIT_X) { m.dead = true; if (m.e === K.egg) { K.missed += 1; G.float('놓쳤어요', m.x + 26, m.y - 90 * m.s, '#fca5a5', 15, 0.6); } }
        }
        K.mons = K.mons.filter((m) => !m.dead);
      }
      if (K.left <= 0) {
        if (K.egg < 0) G.lose('알을 고르지 않았어요', ['알을 고르고 그 몬스터만', '1,000마리 잡아 보세요']);
        else G.lose('알이 안 깨졌어요!', [`${KIT.fmt(K.count)} / 1,000마리에서 멈췄어요`, `${EGGS[K.egg].label}만 골라 잡아 보세요`]);
        return;
      }
      if (G.idle > 0.9) {
        if (K.egg < 0) { const r = eggRect(0); G.hint(r.x + r.w / 2, r.y + 90); }
        else { const m = K.mons.filter((u) => u.e === K.egg && u.x < 340).sort((a, b) => a.x - b.x)[0]; if (m) G.hint(m.x, m.y - 60 * m.s); else G.hint(null); }
      } else G.hint(null);
    },
    draw(G, ctx) {
      KIT.stage(G, ctx, 'bg:forest');
      if (K.hatch < 0) KIT.clock(G, K.left, T, 60, '제한 시간 ');
      // 땅 위 — 뒷줄부터. 몬스터는 오른쪽에서 걸어온다
      if (!K.born) {
        const list = [...K.mons, K.hero].sort((a, b) => a.y - b.y);
        for (const u of list) {
          if (u === K.hero) { KIT.unit(G, K.hero, G.t); continue; }
          const hop = Math.abs(Math.sin(G.t * 9 + u.phase * 6)) * 5, fade = Math.min(1, (u.x - EXIT_X) / 26);
          KIT.unit(G, { ...u, y: u.y - hop, alpha: Math.max(0, fade) }, G.t);
          if (u.hp < HP) G.bar(u.x - 22, u.y - 130 * u.s - 10, 44, 8, u.hp / HP, '#ef4444');
        }
      }
      for (const g of K.ghosts) G.sprite(`${g.id}:hit:1`, g.x, g.y, { s: g.s, rot: g.rot, ay: 0.5, flashA: Math.max(0, 0.7 - g.t * 2.4), flashC: '#fff' });
      // 알 고르기
      if (K.egg < 0) {
        ctx.fillStyle = 'rgba(10,6,3,.55)'; ctx.fillRect(0, 84, 360, 224);
        G.text('어떤 알을 키울까?', 180, 98, { size: 20, color: '#ffd23f', stroke: '#2a1606', sw: 5 });
        EGGS.forEach((e, i) => {
          const r = eggRect(i), b = Math.sin(G.t * 4 + i * 1.6), cx = r.x + r.w / 2;
          G.rr(r.x, r.y, r.w, r.h, 16, '#fff3d6', '#f2c232', 3);
          G.text(e.label, cx, r.y + 16, { size: 16, color: '#3b2415' });
          drawEgg(ctx, e, cx, r.y + 60, 0.76, 0, b * 0.07);
          G.text(e.desc[0], cx, r.y + 104, { size: 13, color: '#6b4a2f' });
          G.text(e.desc[1], cx, r.y + 120, { size: 13, color: '#6b4a2f' });
          G.text(e.val, cx, r.y + 139, { size: 17, color: '#c2410c' });
          G.rr(r.x + 18, r.y + 156, r.w - 36, 26, 12, '#ff8a1f', '#3b2415', 2); G.text('고르기', cx, r.y + 169, { size: 14, color: '#fff', stroke: '#3b2415', sw: 3 });
        });
      }
      // 부화
      if (K.hatch >= 0) {
        const e = EGGS[K.egg], h = K.hatch;
        if (!K.born) drawEgg(ctx, e, 180, 290, 1.7 + h * 0.8, 1, Math.sin(G.t * 46) * (0.06 + h * 0.3));
        else {
          if (h < 1.05) drawShell(ctx, e, 180, 290, 2.1, (h - 0.45) / 0.6);
          if (K.demo && !K.demoGone) KIT.unit(G, K.demo, G.t);
          const hp = Math.max(0, Math.min(1, (h - 0.9) / 0.5));
          KIT.unit(G, { ...K.hero, x: 52 + (156 - 52) * hp, y: 396 + (454 - 396) * hp, s: 0.72 + 0.08 * hp }, G.t);
          // 아기 — 왼쪽을 보는 그림이라 뒤집는다. 가운데에서 태어나 주인공 곁으로, 덤빌 때는 몬스터까지 뛰어갔다 온다
          const go = Math.max(0, Math.min(1, (h - 1.0) / 0.5)), k = Math.min(1, (h - 0.45) / 0.18);
          let x = 180 + (84 - 180) * go, y = 362 + (456 - 362) * go - Math.sin(go * Math.PI) * 60;
          if (K.pounce >= 0 && K.demo) { const p = Math.sin(Math.min(1, K.pounce / 0.6) * Math.PI); x = 84 + (K.demo.x - 48 - 84) * p; y = 456 - p * 58; }
          else if (go >= 1) y -= Math.abs(Math.sin(G.t * 6)) * 4;
          G.sprite(petFrame(G, e), x, y, { s: (0.4 + 1.2 * k) * (1 - go) + 0.72 * go, flip: true });
        }
      }
      // 아래 판 — 알 · 처치 수 또는 규칙
      if (K.hatch < 0 || !K.born) {
        if (K.egg < 0) {
          G.text('같은 몬스터 1,000마리면 아기 부화', 180, 500, { size: 15, color: '#ffe08a' });
          G.text('고른 몬스터만 세어져요', 180, 530, { size: 14, color: '#fff3d0' });
          G.text('장착한 펫 한 마리의 효과가 더해져요', 180, 556, { size: 14, color: '#f5d9a8' });
        } else if (K.hatch < 0) {
          const e = EGGS[K.egg], r = K.count / NEED, wob = r >= 0.5 ? Math.sin(G.t * (10 + r * 16)) * 0.05 * (1 + r) : 0;
          drawEgg(ctx, e, 50, 522, 1 + K.eggPop * 0.5, r >= 0.2 ? r : 0, wob);
          G.sprite(`${e.mole}:idle:0`, 112, 502, { s: 0.25 });
          G.text(`${e.label}만 잡아요`, 134, 486, { size: 18, color: '#fff', align: 'left' });
          G.bar(96, 510, 250, 24, K.shown / NEED, '#ffd23f');
          G.text(`${KIT.fmt(K.count)} / 1,000마리`, 221, 522, { size: 15, color: '#fff', stroke: '#2a1606', sw: 4 });
          G.text(`부화하면 ${e.full} ${e.val}`, 221, 554, { size: 13, color: '#f5d9a8' });
        }
      } else if (K.popped) {
        const e = EGGS[K.egg];
        G.text('2.6초마다 같이 공격', 180, 490, { size: 18, color: '#bef264' });
        G.text('주인공 한 방 ×0.80', 180, 516, { size: 14, color: '#fff3d0' });
        G.text(`간식(강화석)으로 Lv.10 · ${e.lv10}`, 180, 548, { size: 14, color: '#ffe08a' });
      }
    },
    debug: () => ({ egg: K.egg, count: K.count, left: +K.left.toFixed(1), hits: K.hits, wrong: K.wrong, missed: K.missed, up: K.mons.filter((m) => m.x < 345).map((m) => [Math.round(m.x), Math.round(m.y - 60 * m.s), m.e === K.egg ? 1 : 0, m.uid]) }),
    bot(G) {
      if (G.phase !== 'play' || G.over) return null;
      if (K.egg < 0) { const r = eggRect(0); return { tap: [r.x + r.w / 2, r.y + r.h / 2] }; }
      const m = K.mons.filter((u) => u.e === K.egg && u.x < 345).sort((a, b) => a.x - b.x)[0];
      return m ? { tap: [m.x - 6, m.y - 60 * m.s] } : null;
    },
  };
})();
