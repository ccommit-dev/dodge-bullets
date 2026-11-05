/* 릴스 · 무기 기술 — 12초 안에 대장을 못 잡으면 진다. 탭마다 고리가 차고, every 번째 탭에 기술이 일반 피해에 더해 터진다(titans/weapons WEAPON_TECH · TitansGame 탭 처리).
 * 판단은 게임 규칙 그대로: 창 기술은 대장에게 ×4 · 창은 대장 피해 ×1.25(WEAPON_EFFECTS.bossMul) · 무기를 바꾸면 고리가 0 으로(TitansGame equipWeapon).
 * 체력은 창이면 초당 5탭으로 잡히고, 검만 연타하면 초당 6탭을 넘겨야 잡히게 맞췄다(탭당 평균 창 37.8 · 활 32.1 · 검 30.6 · 지팡이 22.3). 게임에선 교체가 다음 몬스터부터지만 대장 한 마리 장면이라 바로 든다.
 * 대장은 그림자 숲 지역 대장 월광 늑대왕(HUNTING_AREAS · SpriteArt BOSS_ASSET), 칩 그림은 게임 무기 아이콘 */
window.RF_SCENE = (() => {
  const TAP = 18, LIMIT = 12, BOSS_HP = 1650, BOSS_NAME = '월광 늑대왕';
  const SHOW = 100;   // 피해 숫자는 크게 보여 준다(체력 표시도 같은 배율 — 난이도와 무관)
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
    G.float(KIT.fmt(base * SHOW), 296 + (Math.random() * 28 - 14), 330, '#fff', 20, 0.7);
    if (K.ring >= w.every) {   // 게임과 같다 — 일반 피해에 기술 한 방(탭 기본 피해 × mul)을 더한다
      K.ring = 0; K.techs += 1;
      const tech = base * w.mul;
      total += tech;
      K.fx = { kind: w.fx, t: 0.6, dur: 0.6, col: w.col, seed: K.techs };
      // 화면을 가르는 한 방 — 칩을 누르는 손이 어긋나지 않게 줌 중심을 칩 쪽에 두고, 화면 펀치는 쓰지 않는다
      const big = K.weapon === 'spear';
      G.flash('#fff6c4', 0.16); G.hitstop(big ? 0.168 : 0.132); G.shake(big ? 13 : 9, 0.34); G.zoom(big ? 1.16 : 1.12, 268, 480, 0.18); G.speed(0.5); G.sfx('bolt'); G.vignette(w.col, 0.5);
      G.ring(268, 330, w.col, 190, 0.42); G.after(0.08, () => G.ring(268, 330, '#fff', 270, 0.5));
      G.burst(268, 330, w.col, 22, 320);
      G.stamp(`${w.name}!!`, w.col, 172, 0.8);
      G.float(KIT.fmt(tech * SHOW), 186, 278, big ? '#7dd3fc' : '#ffd23f', 40, 0.9);
      if (K.techs === 1 && K.weapon === 'sword') G.caption('아래 칩으로 무기 교체 — 고리는 0부터');
      else G.caption(`${w.name} ×${w.mul} — ${K.techs}번째`);
    } else G.sfx('hit');
    K.hp = Math.max(0, K.hp - total);
    if (K.hp <= 0) {
      K.dead = true; G.climax(); G.sfx('win');
      G.caption(`${BOSS_NAME} 처치!`); G.finish(3.2);
      // 베기가 화면을 여러 번 가른 뒤 대장이 터진다
      const CUTS = [[-30, 150, 390, 470, -40], [390, 150, -30, 470, 40], [268, 40, 268, 470, 34], [-30, 340, 390, 340, -26], [-30, 440, 390, 170, 34], [390, 440, -30, 170, -34]];
      CUTS.forEach((c, i) => G.after(0.05 + i * 0.11, () => {
        K.slashes.push({ c, col: w.col, t: 0.26 });
        G.shake(10, 0.16); G.sfx('hit'); KIT.hit(K.boss);
        G.float(KIT.fmt(total * SHOW * (1 + i)), 168 + (i % 2) * 70, 200 + i * 24, i % 2 ? '#fff' : w.col, 22, 0.5);
        G.ring(268, 330, i % 2 ? '#fff' : w.col, 130 + i * 26, 0.3);
      }));
      G.after(0.05 + CUTS.length * 0.11, () => {
        explode(G, K.boss, 1.3); K.gone = true;
        G.flash('#fff', 0.22); G.sfx('bolt'); G.burst(268, 320, '#ffd23f', 60, 420); G.burst(268, 320, w.col, 40, 300); G.coins(268, 320, 30); G.shake(16, 0.5); G.vignette('#ffd23f', 0.7);
        G.ring(268, 320, '#fff', 300, 0.55); G.after(0.1, () => G.ring(268, 320, w.col, 400, 0.6));
        G.stamp('K.O.!!', '#ffd23f', 340, 1.4);
      });
      G.after(1, () => G.pop('무기마다 기술이 다르다', `${w.label} · ${w.name}`, `${K.left.toFixed(1)}초 남기고 처치`, 'gold', 2));
    }
  }
  /** 무기 그림 — 게임 아이콘(검은 대장간 그림 · 나머지는 장비 그림). 모두 3단계(+10 이상 · weaponTier) */
  function icon(G, kind, x, y, h) {
    if (kind === 'sword') G.sprite('drum:10', x, y, { s: h / 150 });
    else if (kind === 'spear') G.sprite('gear:spear-3', x, y, { s: h / 90 });
    else if (kind === 'bow') G.sprite('gear:bow-3', x, y, { s: h / 90 });
    else G.sprite('gear:staff-3', x, y, { s: h / 90 });
  }
  /** 낫 모양 베기 한 겹 */
  function cut(ctx, x0, y0, x1, y1, bend, wide, col) {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, L = Math.max(1, Math.hypot(x1 - x0, y1 - y0)), ux = -(y1 - y0) / L, uy = (x1 - x0) / L;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(mx + ux * (bend + wide), my + uy * (bend + wide), x1, y1);
    ctx.quadraticCurveTo(mx + ux * (bend - wide), my + uy * (bend - wide), x0, y0); ctx.fill();
  }
  /** 화면을 가르는 큰 베기 — 무기 색 겉 + 흰 속 */
  function bigCut(ctx, [x0, y0, x1, y1, bend], col, a, e = 1, wide = 30) {
    const xe = x0 + (x1 - x0) * e, ye = y0 + (y1 - y0) * e;
    ctx.save();
    ctx.globalAlpha = a * 0.75; ctx.globalCompositeOperation = 'lighter'; cut(ctx, x0, y0, xe, ye, bend, wide * 1.5, col);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a; cut(ctx, x0, y0, xe, ye, bend, wide * 0.6, col); cut(ctx, x0, y0, xe, ye, bend, wide * 0.24, '#fff');
    ctx.restore();
  }
  /** 기술 — 무기마다 색 · 모양이 다르다. 검 X자 베기 · 창 화면을 꿰뚫는 찌르기 · 활 화살 비 · 지팡이 벼락 기둥 */
  function drawFx(G, ctx) {
    const f = K.fx; if (!f) return;
    const k = f.t / f.dur, p = 1 - k, a = Math.min(1, k * 2.4);
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const line = (pts, layers) => { for (const [lw, c] of layers) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.lineWidth = lw; ctx.strokeStyle = c; ctx.stroke(); } };
    if (f.kind === 'slash') {
      bigCut(ctx, [-30, 150, 390, 450, -46], f.col, a, Math.min(1, p * 7));
      if (p > 0.14) bigCut(ctx, [390, 150, -30, 450, 46], f.col, a, Math.min(1, (p - 0.14) * 7));
    } else if (f.kind === 'thrust') {
      const hx = K.hero.x + 44, tip = hx + 620 * Math.min(1, p * 5);
      bigCut(ctx, [hx, 340, tip, 340, 0], f.col, a, 1, 40);
      ctx.globalAlpha = a * 0.7; ctx.fillStyle = '#e0f2fe'; for (const dy of [-34, 30]) ctx.fillRect(hx + 30, 340 + dy, tip - hx, 3);
      ctx.save(); ctx.translate(268, 340); ctx.rotate(p * 2); ctx.globalAlpha = a; ctx.fillStyle = '#fff';
      for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.lineTo(0, -(i % 2 ? 110 : 62) * (0.6 + p)); ctx.fill(); }
      ctx.restore();
    } else if (f.kind === 'arrow') {
      for (let i = 0; i < 16; i++) {
        const q = (p - i * 0.04) * 3.1; if (q <= 0 || q >= 1) continue;
        const y0 = 300 + (i % 5) * 18, y1 = 210 + (i % 7) * 42, x = K.hero.x + 40 + q * 330, y = y0 + (y1 - y0) * q, ang = Math.atan2(y1 - y0, 330);
        ctx.globalAlpha = 0.75; ctx.strokeStyle = f.col; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - Math.cos(ang) * 70, y - Math.sin(ang) * 70); ctx.lineTo(x, y); ctx.stroke(); ctx.globalAlpha = 1;
        G.sprite('arrow:basic', x, y, { s: 1.5, ay: 0.5, rot: ang });
      }
    } else {
      const w = 74 * a, g = ctx.createLinearGradient(268 - w, 0, 268 + w, 0);
      g.addColorStop(0, 'rgba(196,181,253,0)'); g.addColorStop(0.5, 'rgba(237,233,254,.9)'); g.addColorStop(1, 'rgba(196,181,253,0)');
      ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(268 - w, 0, w * 2, 470); ctx.globalCompositeOperation = 'source-over';
      for (const off of [0, 1]) { const pts = []; for (let j = 0; j <= 6; j++) pts.push([268 + Math.sin(f.seed * 7.3 + off * 4 + j * 2.1) * (34 + off * 22), 50 + j * 56]); line(pts, [[16, 'rgba(196,181,253,.55)'], [7, '#ddd6fe'], [2.5, '#fff']]); }
      ctx.strokeStyle = '#ddd6fe'; ctx.lineWidth = 5; for (const rx of [70, 110]) { ctx.beginPath(); ctx.ellipse(268, 414, rx * (0.7 + p * 0.6), rx * 0.22 * (0.7 + p * 0.6), 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.restore();
  }
  /** 대장이 조각나 날아간다 — 그림을 n×n 으로 잘라 흩뿌린다 */
  function explode(G, u, power = 1) {
    const key = `${u.id}:hit:0`, im = G.img(key); if (!im) return;
    const n = 4, w = im.w * u.s, h = im.h * u.s;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const x = u.x - w / 2 + ((c + 0.5) * w) / n, y = u.y - h + ((r + 0.5) * h) / n, a = Math.atan2(y - (u.y - h / 2), x - u.x), v = (240 + Math.random() * 340) * power;
      K.shards.push({ key, c, r, n, x, y, w: w / n, h: h / n, vx: Math.cos(a) * v + 110, vy: Math.sin(a) * v - 220, rot: 0, vr: (Math.random() - 0.5) * 16, t: 0 });
    }
  }
  function tickShards(dt) { for (const p of K.shards) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 640 * dt; p.rot += p.vr * dt; } K.shards = K.shards.filter((p) => p.t < 1.3); }
  function drawShards(G, ctx) {
    for (const p of K.shards) {
      const im = G.img(p.key); if (!im) continue;
      const sw = im.img.naturalWidth / p.n, sh = im.img.naturalHeight / p.n;
      ctx.save(); ctx.globalAlpha = Math.min(1, (1.3 - p.t) * 2.5); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.drawImage(im.img, p.c * sw, p.r * sh, sw, sh, -p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    }
  }
  return {
    id: 'weapon-tech',
    canLose: true,
    popY: 196,
    introDur: 1.5,
    hook: ['12초 안에 대장을!', '무기마다 다른 기술'],
    raysAt: [240, 320],
    caption0: '연타! 6번째 탭 = 연속 베기',
    endLines: ['검 · 창 · 활 · 지팡이', '무기마다 다른 탭 기술'],
    init() {
      K = { taps: 0, ring: 0, techs: 0, swaps: 0, hp: BOSS_HP, left: LIMIT, dead: false, gone: false, chose: false, weapon: 'sword', fx: null, slashes: [], shards: [], pressT: 0, chipT: 0,
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
      for (const c of K.slashes) c.t -= dt; K.slashes = K.slashes.filter((c) => c.t > 0);
      tickShards(dt);
      if (K.dead) return;
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
      KIT.bossBar(G, `대장 · ${BOSS_NAME} ${KIT.fmt(K.hp * SHOW)}`, K.hp / BOSS_HP);
      KIT.clock(G, K.left, LIMIT, 96, '남은 시간 ');
      KIT.unit(G, K.hero, G.t);
      if (!K.gone) KIT.unit(G, K.boss, G.t);
      // 든 무기 표
      G.rr(K.hero.x + 34, 258, 34, 44, 10, 'rgba(27,18,11,.8)', w.col, 2);
      icon(G, K.weapon, K.hero.x + 51, 298, 38);
      drawFx(G, ctx);
      for (const c of K.slashes) bigCut(ctx, c.c, c.col, Math.min(1, (c.t / 0.26) * 2), 1, 26);
      drawShards(G, ctx);
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
