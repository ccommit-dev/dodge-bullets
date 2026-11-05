/* 릴스 · 환생 질주 — 1막: 심연의 성 대장 심연의 타이탄(HUNTING_AREAS abyss · SpriteArt BOSS_ASSET)에게 제한 시간 안에 못 이긴다. 대장 2연패 = 그 지역의 벽(progression/rebirth WALL_BOSS_LOSSES). 첫 환생 조건은 벽 2곳이라(REBIRTH_WALL_AREAS) 벽 1/2 에서 시작해 2/2 를 채운다.
 * 2막: 환생하면 1층부터 탭으로 달려 제한 시간 안에 예전 최고 30층을 넘긴다. 넘는 순간 '신기록!' · 최고 31층 돌파(TitansGame 신기록 · titans/huntMoments HuntStamp). 결정 +16 · 출발 골드 5,991 = rebirthCrystals(30) · rebirthStartGold(30).
 * 가만히 있으면 환생 단추 앞에서 지고, 2막은 탭이 없으면 30층에 닿지 못한다. 2막 배경 · 몬스터는 층마다 실제 지역(HUNTING_AREAS stageFrom · normalKinds, 오우거는 art.json 에 없어 뺐다) */
window.RF_SCENE = (() => {
  const BTN = { x: 70, y: 472, w: 220, h: 64 };
  const WALL_SEC = 3.5, WAIT = 6, RUN_SEC = 11, BEST = 30, BOSS_TAPS = 6, AUTO_RATE = 0.5;
  const GAIN = '결정 +16 · 출발 골드 5,991';
  const NEED = (stage) => (stage <= 14 ? 1 : stage <= 24 ? 1.5 : 2);   // 층을 넘는 데 드는 탭 — 윗층일수록 많다
  const AREAS = [
    { to: 5, name: '새벽 초원', bg: 'bg:meadow', kinds: [['slime', 0.72], ['goblin', 0.72]] },
    { to: 10, name: '그림자 숲', bg: 'bg:forest', kinds: [['goblin', 0.72], ['wolf', 0.74]] },
    { to: 15, name: '붉은 폐허', bg: 'bg:ruins', kinds: [['wolf', 0.74]] },
    { to: 23, name: '용암 협곡', bg: 'bg:volcano', kinds: [['dragon', 0.5]] },
    { to: 9999, name: '심연의 성', bg: 'bg:abyss', kinds: [['dragon', 0.5], ['wolf', 0.74]] },
  ];
  const areaOf = (stage) => AREAS.find((a) => stage <= a.to);
  let K;
  function first(G, data) { if (!K.chose) { K.chose = true; G.emit('choice', data); } }
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
  function hitWall(G, x) {
    KIT.attack(K.hero, 0.3); KIT.hit(K.boss);
    K.hp = Math.max(0.82, K.hp - 0.004);
    G.float(KIT.fmt(120 + Math.random() * 30), (x ?? 262) + (Math.random() * 30 - 15), 290 + Math.random() * 30, '#cbd5e1', 18, 0.6);
    G.sfx('tap');
  }
  function rebirth(G) {
    if (K.mode !== 'ready') return;
    // 환생 — 화면이 하얗게 터진다. 이 사이엔 누를 것이 없다
    K.mode = 'flash'; K.ft = 0; K.white = 1; K.stage = 1; G.flash('#ffffff', 0.5); G.sfx('legend'); G.stamp('환생!!', '#c084fc', 330, 1.1);
    G.zoom(1.16, K.hero.x, 350, 0.3); G.shake(14, 0.45); G.speed(1); G.vignette('#f0abfc', 0.8); G.rays(K.hero.x, 350, 1.2, '#fff');
    G.burst(K.hero.x, 350, '#f0abfc', 40, 460); G.burst(K.hero.x, 350, '#fff', 30, 560);
    [0, 0.12, 0.26].forEach((d, i) => G.after(d, () => G.ring(K.hero.x, 350, i === 1 ? '#f0abfc' : '#fff', 300 + i * 90, 0.6)));
    G.caption('결정 +16 · 출발 골드 · 24시간 방치 2배'); G.hint(null);
  }
  function spawnFloor() {
    const kinds = areaOf(K.stage).kinds, [id, s] = kinds[K.stage % kinds.length];
    K.mon = { id, x: 296, y: 424, s, mode: 'idle', mt: 0 };
  }
  function clearFloor(G) {
    // 층이 쾅쾅 오르고, 몬스터는 튕겨 날아간다
    K.stage += 1; K.run = Math.max(0, K.run - 1); K.bang = 1;
    G.burst(292, 360, '#ffd23f', 6, 200); G.kick(0, 4);
    if (K.mon) K.flyers.push({ key: `${K.mon.id}:hit:0`, x: K.mon.x, y: K.mon.y - 50, s: K.mon.s, vx: 560 + Math.random() * 280, vy: -380 - Math.random() * 240, rot: 0, vr: 8 + Math.random() * 8 });
    if (K.stage % 5 === 0) G.coins(292, 350, 4);
    const area = areaOf(K.stage);
    if (area !== areaOf(K.stage - 1) && K.stage < BEST) { G.stamp(`${area.name}!`, '#fff3b0', 206, 0.7); G.flash('#fff', 0.08); G.speed(0.7); }
    if (K.stage >= BEST) {
      K.stage = BEST; K.run = 0; K.mon = null; K.bossHits = 0; K.runBoss = { id: 'abyss-titan', x: 274, y: 424, s: 1, mode: 'idle', mt: 0 };
      G.stamp('그 대장이다!', '#fca5a5', 232, 0.8); G.caption('벽이었던 대장 — 이번엔 부순다!');
    } else spawnFloor();
  }
  function runTap(G) {
    if (K.mode !== 'run' || G.over) return;
    K.taps += 1; KIT.attack(K.hero, 0.18); G.punch(0.012); G.speed(0.2);
    if (K.runBoss) {
      K.bossHits += 1; KIT.hit(K.runBoss); G.sfx('hit');
      K.bang = 1; G.kick(0, 5); G.shake(5, 0.12);
      if (K.bossHits < BOSS_TAPS) G.float(KIT.fmt(K.bossHits * 12000), 244 + (Math.random() * 40 - 20), 300, '#ffd23f', 32, 0.8);
      if (K.bossHits >= BOSS_TAPS) {
        // 신기록 — 주인공이 대장을 한 방에 뚫고 화면 밖으로 달려 나갔다가 다시 들어온다
        K.stage = BEST + 1; K.mode = 'done'; K.bossDead = true; K.pierce = 0.7; K.dash = true;
        explode(G, K.runBoss, 1.5); KIT.attack(K.hero, 0.6);
        G.climax(); G.sfx('win'); G.sfx('bolt'); G.flash('#fff', 0.3); G.shake(16, 0.55);
        G.burst(274, 340, '#c084fc', 50, 460); G.burst(274, 340, '#fff', 30, 560); G.coins(274, 330, 24);
        G.float('999,999', 180, 250, '#ffe066', 32, 0.8);
        G.after(0.82, () => G.pop('환생 1회', `최고 ${BEST + 1}층 돌파`, GAIN, 'purple', 2.2));
        G.after(1.25, () => { K.hero.x = -70; K.heroBack = true; });
        G.caption('벽을 뚫었다!'); G.finish(3.2);
      }
      return;
    }
    if (K.mon) KIT.hit(K.mon);
    G.sfx('hit');
    K.run += 1 / NEED(K.stage);
    if (K.run >= 1) clearFloor(G);
  }
  return {
    id: 'rebirth-speed',
    canLose: true,
    popY: 214,
    introDur: 1.5,
    hook: ['대장에게 꽉 막혔다?', '환생하면 질주'],
    caption0: '대장을 눌러 봐요!',
    climaxStamp: '신기록!', raysAt: [200, 320],
    endLines: ['막히면 환생 · 더 빠르게 다시', '결정 · 진화 · 사다리 · 유물 · 펫은 그대로'],
    init() {
      K = { mode: 'wall', losses: 0, left: WALL_SEC, pause: 0, hp: 1, autoT: 0, wait: WAIT, stage: BEST, run: 0, ft: 0, taps: 0, bossHits: 0, chose: false, mon: null, runBoss: null, bossDead: false, white: 0, bang: 0, pierce: 0, dash: false, heroBack: false, trail: [], flyers: [], shards: [],
        hero: { id: 'hero', x: 96, y: 424, s: 1, mode: 'idle', mt: 0 }, boss: { id: 'abyss-titan', x: 274, y: 424, s: 1, mode: 'idle', mt: 0 } };
    },
    onTap(G, x, y) {
      if (G.phase !== 'play' || y <= 56) return true;
      if (K.mode === 'wall' || K.mode === 'ready') first(G, { boss: 'tap' });
      if (K.mode === 'wall') { if (y < 458 && !K.pause) hitWall(G, x); }
      else if (K.mode === 'ready') {
        if (x >= BTN.x - 8 && x <= BTN.x + BTN.w + 8 && y >= BTN.y - 8 && y <= BTN.y + BTN.h + 8) rebirth(G);
        else if (y < 458) hitWall(G, x);
      } else if (K.mode === 'run') runTap(G);
      G.hint(null);
      return true;
    },
    onKey(G) {
      first(G, { boss: 'tap' });
      if (K.mode === 'ready') rebirth(G); else if (K.mode === 'wall' && !K.pause) hitWall(G); else if (K.mode === 'run') runTap(G);
    },
    update(G, dt) {
      KIT.tick(K.hero, dt); KIT.tick(K.boss, dt); if (K.mon) KIT.tick(K.mon, dt); if (K.runBoss) KIT.tick(K.runBoss, dt);
      tickShards(dt);
      K.white = Math.max(0, K.white - dt); K.bang = Math.max(0, K.bang - dt * 4); K.pierce = Math.max(0, K.pierce - dt);
      for (const f of K.flyers) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 900 * dt; f.rot += f.vr * dt; } K.flyers = K.flyers.filter((f) => f.x < 460 && f.y < 620);
      if (K.dash) { K.trail.push(K.hero.x); if (K.trail.length > 7) K.trail.shift(); K.hero.x += 1150 * dt; if (K.hero.x > 440) { K.dash = false; K.trail = []; } }
      if (K.heroBack) K.hero.x += (150 - K.hero.x) * Math.min(1, dt * 3.5);
      if (G.over || G.phase !== 'play') return;
      if (K.mode === 'wall') {
        if (K.pause > 0) { K.pause = Math.max(0, K.pause - dt); return; }
        K.left = Math.max(0, K.left - dt);
        K.autoT += dt; if (K.autoT > 0.5) { K.autoT = 0; hitWall(G); }
        if (K.left <= 0) {
          // 대장이 시간 초과로 내리친다 — 환생 단추를 누를 손이 어긋나지 않게 줌은 쓰지 않는다
          K.losses += 1; G.shake(10, 0.35); G.sfx('fail'); K.hp = 1; KIT.attack(K.boss, 0.5); K.hero.kb = -30; G.vignette('#ef4444', 0.6); G.ring(K.hero.x, 350, '#fca5a5', 190, 0.45);
          if (K.losses >= 2) {
            K.mode = 'ready'; K.wait = WAIT;
            G.stamp('2연패 = 벽!', '#fca5a5', 232, 1.1); G.sfx('legend'); G.caption('벽 2/2 — 환생 단추를 눌러요!');
          } else {
            K.left = WALL_SEC; K.pause = 0.5;
            G.stamp('대장 1패…', '#fca5a5', 232, 0.8); G.caption('시간 안에 못 잡았어요 — 한 번 더!');
          }
          return;
        }
        if (G.idle > 0.9) G.hint(K.boss.x, 330); else G.hint(null);
        return;
      }
      if (K.mode === 'ready') {
        K.wait = Math.max(0, K.wait - dt);
        if (K.wait <= 0) { G.lose('벽에 막혀 멈췄어요', ['환생 단추가 열렸는데…', `환생하면 ${GAIN}`]); return; }
        if (G.idle > 0.7) G.hint(180, BTN.y + 32); else G.hint(null);
        return;
      }
      if (K.mode === 'flash') {
        K.ft += dt;
        if (K.ft > 1) { K.mode = 'run'; K.stage = 1; K.run = 0; K.left = RUN_SEC; spawnFloor(); G.caption('연타로 달려요 — 예전 최고 30층!'); G.speed(1.2); }
        return;
      }
      if (K.mode === 'run') {
        K.left = Math.max(0, K.left - dt);
        if (K.left <= 0) { G.lose('시간 안에 못 넘었어요', [`${K.stage}층까지 · 예전 최고 ${BEST}층`, '더 빠르게 연타해 보세요']); return; }
        if (!K.runBoss) { K.run += dt * AUTO_RATE / NEED(K.stage); if (K.run >= 1) clearFloor(G); }
        if (G.idle > 0.9) G.hint(180, 320); else G.hint(null);
      }
    },
    draw(G, ctx) {
      const wallPart = K.mode === 'wall' || K.mode === 'ready';
      const area = areaOf(wallPart ? BEST : Math.min(K.stage, BEST));
      KIT.stage(G, ctx, area.bg);
      if (!wallPart) {   // 질주 — 배경이 빨리 흐르는 느낌(가로 줄) · 윗층일수록 빠르다
        const rush = Math.min(1, K.stage / BEST);
        ctx.save(); ctx.globalAlpha = 0.3 + rush * 0.2; ctx.fillStyle = '#fff';
        for (let i = 0; i < 16; i++) { const y = 112 + i * 21, x = ((i * 97 - G.t * (1000 + rush * 900)) % 460 + 460) % 460 - 80; ctx.fillRect(x, y, 70 + rush * 70, 3); }
        ctx.restore();
      }
      // 층 숫자 — 오를 때마다 쾅
      if (K.mode === 'run' && !K.runBoss) G.text(`${K.stage}`, 196, 296, { size: 84 * (1 + 0.55 * K.bang), color: K.bang > 0.4 ? '#ffe066' : '#fff', stroke: '#2a1606', sw: 10, alpha: 0.35 + 0.55 * K.bang });
      // 층 계기
      const big = !wallPart;
      G.rr(90, 50, 180, 48, 16, 'rgba(27,18,11,.86)', big ? '#c084fc' : '#ef4444', 3);
      ctx.save(); ctx.translate(180, 75); ctx.scale(1 + 0.22 * K.bang, 1 + 0.22 * K.bang);
      G.text(`STAGE ${K.stage}`, 0, 0, { size: big ? 30 : 26, color: big ? (K.bang > 0.4 ? '#fff' : '#f0abfc') : '#fca5a5' });
      ctx.restore();
      G.text(`${area.name} · 예전 최고 ${BEST}층`, 180, 110, { size: 14, color: '#fff3d0', stroke: '#2a1606', sw: 4 });
      if (wallPart) {
        KIT.bossBar(G, '대장 · 심연의 타이탄', K.hp, 128);
        if (K.mode === 'wall') KIT.clock(G, K.left, WALL_SEC, 158, '제한 시간 ');
        const done = K.mode === 'ready';
        G.text(done ? '조건 완료 — 환생할 수 있어요' : '심연의 성 대장 2연패 → 2/2', 180, 196, { size: 14, color: done ? '#f0abfc' : '#fff3d0', stroke: '#2a1606', sw: 4 });
        G.text(`벽 ${done ? 2 : 1}/2 · 대장 ${K.losses}패`, 180, 216, { size: 14, color: '#fca5a5', stroke: '#2a1606', sw: 4 });
        KIT.unit(G, K.boss, G.t);
      } else if (K.mode === 'run' || K.mode === 'done') {
        KIT.clock(G, K.left, RUN_SEC, 126, '남은 시간 ');
        if (K.runBoss) {
          if (!K.bossDead) KIT.bossBar(G, '대장 · 심연의 타이탄', Math.max(0, 1 - K.bossHits / BOSS_TAPS), 156);
          if (!K.bossDead) KIT.unit(G, K.runBoss, G.t);
        } else if (K.mon) KIT.unit(G, K.mon, G.t);
      }
      for (const f of K.flyers) G.sprite(f.key, f.x, f.y, { s: f.s, rot: f.rot, ay: 0.5 });
      drawShards(G, ctx);
      // 관통 — 화면을 가로지르는 빛 · 주인공 잔상
      if (K.pierce > 0) {
        const a = Math.min(1, K.pierce * 2.4), g = ctx.createLinearGradient(0, 300, 0, 400);
        g.addColorStop(0, 'rgba(240,171,252,0)'); g.addColorStop(0.5, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(240,171,252,0)');
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 300, Math.min(360, K.hero.x + 40), 100); ctx.restore();
      }
      K.trail.forEach((x, i) => G.sprite('hero:attack:5', x, K.hero.y, { s: K.hero.s, alpha: 0.1 + i * 0.07 }));
      KIT.unit(G, { ...K.hero, mode: (K.mode === 'run' || K.heroBack) && K.hero.mode === 'idle' ? 'walk' : K.hero.mode }, G.t);
      if (wallPart) {
        const ready = K.mode === 'ready', p = ready ? 1 + Math.sin(G.t * 6) * 0.05 : 1;
        ctx.save(); ctx.translate(180, BTN.y + 32); ctx.scale(p, p);
        G.rr(-110, -32, 220, 64, 18, ready ? '#a855f7' : 'rgba(255,255,255,.08)', '#3b2415', 4);
        G.text(ready ? '환생하기 ✦' : '대장 2연패면 열려요', 0, ready ? -9 : 0, { size: ready ? 22 : 16, color: ready ? '#fff' : '#d6d3d1' });
        if (ready) G.text(GAIN, 0, 16, { size: 14, color: '#f5e1ff' });
        ctx.restore();
        if (ready) KIT.clock(G, K.wait, WAIT, 546, '벽 앞에서 ');
      } else {
        G.text('환생 1회 · 방치 2배 · 결정 +16', 180, 490, { size: 15, color: '#f0abfc' });
        G.bar(40, 512, 280, 18, Math.min(1, K.stage / (BEST + 1)), '#c084fc');
        const mx = 42 + 276 * (BEST / (BEST + 1));
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(mx, 508, 3, 26);
        G.text(K.stage > BEST ? `신기록 ${K.stage}층!` : `${K.stage} / ${BEST}층 넘기면 신기록`, 180, 552, { size: 15, color: '#fff3d0' });
      }
      if (K.white > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, K.white * 1.25)})`; ctx.fillRect(-40, -40, 440, 720); }
    },
    debug: () => ({ mode: K.mode, stage: K.stage, losses: K.losses, taps: K.taps, left: +K.left.toFixed(1) }),
    bot(G) {
      if (G.phase !== 'play' || G.over) return null;
      if (K.mode === 'wall') return K.pause ? null : { tap: [K.boss.x, 330] };
      if (K.mode === 'ready') return { tap: [180, BTN.y + 32] };
      if (K.mode === 'run') return { tap: [180, 320] };
      return null;
    },
  };
})();
