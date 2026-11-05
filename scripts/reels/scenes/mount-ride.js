/* 릴스 · 탈것 — 게임 사냥터와 같은 모습: 탈것에 앉은 주인공이 왼쪽에 서고, 땅 위 한 줄로 몬스터가 한 번에 한 마리 오른쪽에서 걸어 들어온다. 전장 어디든 누르면 공격(TitansGame doTap).
 * 처치 보상은 골드뿐(종별 차이 없음, 지역 배율 titans/model HUNTING_AREAS). 처치 수로 일일 퀘스트 막대가 차면 퀘스트 보상으로 붉은 보석이 들어온다(progression/routine — 진행 · 보상 값은 짧은 광고용 압축).
 * 보석으로 카드를 사면 그 탈것에 앉아 사냥 골드가 오른다. 값 · 보너스는 titans/mounts MOUNT_DEFS 그대로(한 마리만 장착 = 갈아타면 그 값, 효과는 사냥 골드뿐).
 * 제한 시간 안에 불꽃 비룡을 못 타면 진다. 싼 탈것을 사면 그만큼 비룡이 늦어진다 — 언제 무엇을 살지가 판단(싼 셋을 눈에 띄는 대로 다 사면 비룡을 못 탄다).
 * 숏츠 과장(사용자 2026-11-05): 처치된 몬스터가 날아가고, 살 때 줌 · 충격파, 비룡을 타면 돌진해 화면 끝까지 몬스터를 날리고 골드가 터진다. 플레이 중 줌은 카드 줄을 축으로 짧게 — 카드는 가장 가까운 칸으로 고르니 어긋나도 빗나가지 않는다 */
window.RF_SCENE = (() => {
  const T = 21, QUEST_KILLS = 3, QUEST_GEMS = 300, GROUND = 450, HERO_X = 86, MON_X = 262, WALK = 560, AREA_KILLS = 10;
  const MOUNTS = [
    { art: 'mount-boar', ride: 'ride-boar', name: '도토리 멧돼지', pct: 2, price: 300 },
    { art: 'mount-deer', ride: 'ride-deer', name: '숲 사슴', pct: 3, price: 600 },
    { art: 'mount-wolf', ride: 'ride-wolf', name: '은빛 늑대', pct: 4, price: 1000 },
    { art: 'mount-drake', ride: 'ride-drake', name: '불꽃 비룡', pct: 5, price: 2000 },
  ];
  const KINDS = {
    slime: { id: 'slime', name: '슬라임', hp: 2, s: 0.78 },
    goblin: { id: 'goblin', name: '고블린', hp: 3, s: 0.78 },
    wolf: { id: 'wolf', name: '그림자 늑대', hp: 3, s: 0.8 },
  };
  const AREAS = [
    { bg: 'bg:meadow', kinds: ['slime', 'goblin'], mul: 1 },
    { bg: 'bg:forest', kinds: ['goblin', 'wolf'], mul: 1.45 },
  ];
  const slot = (i) => ({ x: 20 + i * 82, y: 478, w: 74, h: 98 });
  /** 카드 줄 어디를 눌러도 가장 가까운 카드 — 줌으로 그림이 조금 밀려도 빗나가지 않는다 */
  const cardAt = (x, y) => (y >= 466 && y <= 584 ? Math.max(0, Math.min(3, Math.round((x - 57) / 82))) : -1);
  let K;
  const area = () => AREAS[K.kills >= AREA_KILLS ? 1 : 0];
  const bonus = () => (K.cur >= 0 ? MOUNTS[K.cur].pct : 0);
  const chose = (G, data) => { if (!K.chose) { K.chose = true; G.emit('choice', data); } };
  function spawn() {
    const a = area();
    if (!K.bag.length) K.bag = [...a.kinds, ...a.kinds].sort(() => Math.random() - 0.5);
    const k = KINDS[K.bag.pop()];
    K.mon = { ...k, maxHp: k.hp, x: 410, y: GROUND, mode: 'idle', mt: 0, phase: Math.random(), in: false };
  }
  /** 처치된 몬스터는 돌며 날아간다 */
  function fling(m, vx, vy) { K.ghosts.push({ id: m.id, s: m.s, x: m.x, y: m.y - (130 * m.s) / 2, vx, vy, rot: 0, t: 0 }); }
  /** 전장 탭 = 공격. 걸어오는 사이엔 먹지 않는다(게임 doTap: battlePhase === combat 일 때만) */
  function strike(G) {
    const m = K.mon;
    if (!m || !m.in) return;
    chose(G, { first: 'hunt' });
    m.hp -= 1; KIT.hit(m); G.sfx('hit'); G.punch(0.012);
    G.burst(m.x - 8, m.y - 50, '#fff3a0', 6, 120);
    const r = K.rider;
    if (r.mode !== 'attack' || r.mt > 0.24) KIT.attack(r, K.cur >= 0 ? 0.48 : 0.36);   // 빠른 연타에도 휘두르는 칸이 보이게
    if (m.hp > 0) return;
    // 처치 — 보상은 골드뿐. 탈것 보너스를 받는다
    const gold = Math.round(100 * area().mul * (1 + bonus() / 100));
    K.gold += gold; K.kills += 1; K.quest += 1;
    G.coins(m.x, m.y - 50, 3); G.ring(m.x, m.y - 50, '#ffd23f', 66, 0.24); G.kick(4, 1);
    G.float(`+${KIT.fmt(gold)}G`, m.x, m.y - 104, K.cur >= 0 ? '#ffd23f' : '#fff3d0', 23, 0.8);
    fling(m, 430 + Math.random() * 160, -320 - Math.random() * 120); K.mon = null; K.again = 0.08;
    if (K.kills === AREA_KILLS) { K.bag = []; G.caption('그림자 숲 · 늑대가 나와요'); }
    if (K.quest >= QUEST_KILLS) {
      K.quest = 0; K.gems += QUEST_GEMS; K.questPop = 0.35; K.done += 1;
      K.fly.push({ t: 0 }); G.sfx('merge'); G.ring(180, 134, '#7ee081', 110, 0.3); G.ring(62, 100, '#ff8fa3', 70, 0.4);
      G.float(`일일 퀘스트 완료 · 보석 +${QUEST_GEMS}`, 180, 236, '#ff8fa3', 19, 1);
      if (!K.saidTime) { K.saidTime = true; G.caption('지금 탈까, 모아서 비룡으로 갈까?'); }
    }
  }
  function buy(G, i) {
    const m = MOUNTS[i];
    if (K.cur === i) return;
    if (K.owned[i]) { K.cur = i; K.rideT = 0.3; K.rider.id = m.ride; K.rider.s = 0.95; K.rider.mode = 'idle'; G.sfx('tap'); G.caption(`${m.name} 탑승! 사냥 골드 +${m.pct}%`); return; }
    const r = slot(i);
    if (K.gems < m.price) { G.float(`보석 ${KIT.fmt(m.price - K.gems)} 더`, r.x + r.w / 2, r.y - 12, '#fca5a5', 16, 0.7); G.sfx('tap'); return; }
    chose(G, { mount: m.art });
    K.gems -= m.price; K.spent += m.price; K.owned[i] = true; K.cur = i; K.rideT = 0.5;
    K.rider.id = m.ride; K.rider.s = 0.95; K.rider.mode = 'idle'; K.rider.mt = 0;
    G.sfx('coin'); G.burst(HERO_X, GROUND - 70, '#ffd23f', 30, 260); G.punch(0.05);
    G.float(`사냥 골드 +${m.pct}%`, 180, 276, '#ffe066', 21, 1.1);
    if (i === 3) {
      // 돌진 — 몰려오는 몬스터 한 줄을 한꺼번에 날린다
      K.won = true; K.finale = 0; G.climax(); G.sfx('legend'); G.flash('#fff3a0', 0.2); G.coins(HERO_X, GROUND - 80, 30);
      const kinds = area().kinds;
      K.crowd = K.mon ? [K.mon] : []; K.mon = null;
      for (let j = 0; j < 6; j++) { const k = KINDS[kinds[j % 2]]; K.crowd.push({ ...k, x: 318 + j * 54, y: GROUND - (j % 2) * 22, s: k.s * (j % 2 ? 0.86 : 0.98), mode: 'idle', mt: 0, phase: Math.random() }); }
      G.caption('강화석으로 Lv.10 까지 올릴 수 있어요'); G.finish(3.8);
      return;
    }
    // 탈 때마다 카메라가 당겨지고 충격파 — 카드 줄을 축으로 잠깐
    G.zoom(1.14, 180, 527, 0.22); G.vignette('#ffd23f', 0.42); G.flash('#fff3a0', 0.08);
    G.ring(HERO_X, GROUND - 70, '#ffd23f', 180, 0.45); G.after(0.1, () => G.ring(HERO_X, GROUND - 70, '#fff', 120, 0.34));
    G.stamp('탑승!', '#7ee081', 330, 0.7);
    G.caption(`${m.name} 탑승! 사냥 골드 +${m.pct}%`);
  }
  return {
    id: 'mount-ride',
    canLose: true,
    introDur: 1.5,
    hook: ['걷지 말고', '타고 사냥하자'],
    climaxStamp: '불꽃 비룡!!', raysAt: [150, 380], stampY: 300,
    caption0: '전장을 눌러 공격해요',
    endLines: ['탈것 4종 · 상점에서 붉은 보석으로', '강화석으로 Lv.10 · 사냥 골드 최대 +12.2%'],
    init() {
      K = { left: T, gems: 0, gemShown: 0, gold: 0, shown: 0, cur: -1, owned: [false, false, false, false], spent: 0, kills: 0, quest: 0, done: 0, questPop: 0, rideT: 0, chose: false, saidTime: false, won: false, bag: [], fly: [], mon: null, ghosts: [], crowd: [], finale: -1, back: false, again: 1.0,
        rider: { id: 'hero', x: HERO_X, y: GROUND, s: 0.85, mode: 'walk', mt: 0 } };
    },
    onTap(G, x, y) {
      if (G.phase !== 'play' || G.over) return true;
      G.hint(null);
      const c = cardAt(x, y);
      if (c >= 0) { buy(G, c); return true; }
      if (y > 56 && y < 458) strike(G);
      return false;   // 전장 탭은 공격이면서 쓸어 넘기면 피드 넘김
    },
    onKey(G) {
      if (G.phase !== 'play' || G.over) return;
      if (K.gems >= 2000) buy(G, 3); else strike(G);
    },
    update(G, dt) {
      KIT.tick(K.rider, dt);
      if (K.mon) KIT.tick(K.mon, dt);
      K.rideT = Math.max(0, K.rideT - dt); K.questPop = Math.max(0, K.questPop - dt);
      K.shown += (K.gold - K.shown) * Math.min(1, dt * 9);
      K.gemShown += (K.gems - K.gemShown) * Math.min(1, dt * 12);
      for (const f of K.fly) f.t += dt * 2.4;
      K.fly = K.fly.filter((f) => f.t < 1);
      for (const g of K.ghosts) { g.t += dt; g.x += g.vx * dt; g.y += g.vy * dt; g.vy += 1000 * dt; g.rot += dt * 11; }
      K.ghosts = K.ghosts.filter((g) => g.t < 0.8 && g.y < 500);
      if (K.finale >= 0) {
        K.finale += dt;
        const f = K.finale, r = K.rider;
        for (const m of K.crowd) { KIT.tick(m, dt); m.x -= 110 * dt; }
        if (f > 0.3 && f < 0.82) {
          // 달린다 — 카메라가 따라가고 불꽃 자취가 남는다. 닿는 몬스터는 날아가고 골드가 터진다
          r.mode = 'walk'; r.x += 640 * dt; G.speed(0.25);
          G.burst(Math.min(350, r.x - 70), GROUND - 34, Math.random() < 0.5 ? '#f97316' : '#ffd23f', 3, 150);
          G.zoom(1.3, Math.max(120, Math.min(250, r.x)), 380, 0.14);
          for (const m of K.crowd) if (!m.gone && r.x + 66 >= m.x) {
            m.gone = true;
            const gold = Math.round(100 * area().mul * 1.05);
            K.gold += gold; G.sfx('hit'); G.spark(m.x, m.y - 50, '#ffd23f'); G.ring(m.x, m.y - 50, '#ff8a1f', 110, 0.3); G.coins(m.x, m.y - 60, 6); G.kick(7, -3);
            G.float(`+${KIT.fmt(gold)}G`, Math.min(286, m.x) - Math.random() * 44, m.y - 96 - Math.random() * 56, '#ffd23f', 25, 0.8);
            fling(m, 760 + Math.random() * 300, -640 - Math.random() * 300);
          }
          K.crowd = K.crowd.filter((m) => !m.gone);
        }
        if (f >= 0.82 && !K.back) {
          // 화면 끝 — 골드 폭발. 비룡은 왼쪽에서 크게 다시 들어온다
          K.back = true; r.x = -130; K.crowd = [];
          G.flash('#ffd23f', 0.12); G.coinRain(1.8); G.coins(180, 300, 36); G.shake(14, 0.4); G.ring(180, 330, '#ffd23f', 300, 0.6); G.ring(180, 330, '#fff', 200, 0.45); G.vignette('#ffd23f', 0.7); G.sfx('legend'); G.zoom(1.12, 180, 400, 0.5);
          G.pop('불꽃 비룡 탑승', '사냥 골드 +5%', `${K.left.toFixed(1)}초 남기고 · 모은 골드 ${KIT.fmt(K.gold)}G`, 'gold', 2.4);
        }
        if (K.back) { r.x += (172 - r.x) * Math.min(1, dt * 6); r.s += (1.2 - r.s) * Math.min(1, dt * 6); r.mode = Math.abs(r.x - 172) > 6 ? 'walk' : 'idle'; }
        return;
      }
      if (G.over) return;
      // 만남 — 한 번에 한 마리, 오른쪽에서 걸어 들어온다. 그 사이 주인공은 걷는다
      if (!K.mon) { K.again -= dt; if (K.again <= 0) spawn(); }
      else if (!K.mon.in) { K.mon.x -= WALK * dt; if (K.mon.x <= MON_X) { K.mon.x = MON_X; K.mon.in = true; } }
      const moving = !K.mon || !K.mon.in;
      if (K.rider.mode !== 'attack') K.rider.mode = moving ? 'walk' : 'idle';
      if (G.phase !== 'play') return;
      K.left = Math.max(0, K.left - dt);
      if (K.left <= 0) {
        const need = Math.max(0, 2000 - K.gems);
        G.lose('시간이 다 됐어요!', [`불꽃 비룡까지 보석 ${KIT.fmt(need)} 모자라요`, K.spent ? `탈것에 보석 ${KIT.fmt(K.spent)} 썼어요 · 아껴 보세요` : '더 빠르게 눌러 보세요']);
        return;
      }
      if (G.idle > 1.2) {
        const r = slot(3);
        if (K.gems >= 2000) G.hint(r.x + r.w / 2, r.y + 40);
        else if (K.mon && K.mon.in) G.hint(K.mon.x - 30, K.mon.y - 70);
      } else G.hint(null);
    },
    draw(G, ctx) {
      KIT.stage(G, ctx, area().bg);
      KIT.clock(G, K.left, T, 60, '제한 시간 ');
      // 보석 — 불꽃 비룡까지
      G.rr(48, 86, 264, 30, 12, 'rgba(27,18,11,.88)', '#ff8fa3', 2);
      G.bar(78, 92, 226, 18, K.gemShown / 2000, '#e11d48', 'rgba(0,0,0,.35)');
      G.sprite('gem', 62, 111, { s: 0.42 });
      G.text(`보석 ${KIT.fmt(K.gemShown)} / 2,000`, 191, 101, { size: 14, color: '#fff', stroke: '#2a1606', sw: 4 });
      // 일일 퀘스트 — 처치 수로 차고, 다 차면 보석
      const qs = 1 + K.questPop * 0.25;
      ctx.save(); ctx.translate(180, 134); ctx.scale(qs, qs);
      G.rr(-132, -14, 264, 28, 12, 'rgba(27,18,11,.88)', '#7ee081', 2);
      G.text('일일 퀘스트', -86, 0, { size: 13, color: '#bbf7d0' });
      G.bar(-44, -8, 104, 16, K.quest / QUEST_KILLS, '#22c55e', 'rgba(0,0,0,.35)');
      G.text(`처치 ${K.quest}/${QUEST_KILLS}`, 8, 0, { size: 13, color: '#fff', stroke: '#2a1606', sw: 3 });
      G.sprite('gem', 76, 9, { s: 0.3 });
      G.text(`+${QUEST_GEMS}`, 106, 0, { size: 13, color: '#ffe4e9' });
      ctx.restore();
      G.rr(62, 152, 236, 24, 12, 'rgba(27,18,11,.85)', bonus() ? '#ffd23f' : 'rgba(255,255,255,.25)', 2);
      G.text(`${KIT.fmt(K.shown)} G · 사냥 골드 +${bonus()}%`, 180, 164, { size: 14, color: bonus() ? '#ffe066' : '#fff3d0' });
      // 땅 위 한 줄 — 왼쪽 주인공, 오른쪽 몬스터
      for (const m of K.crowd) KIT.unit(G, { ...m, y: m.y - Math.abs(Math.sin(G.t * 16 + m.phase * 6)) * 7 }, G.t);
      for (const g of K.ghosts) G.sprite(`${g.id}:hit:1`, g.x, g.y, { s: g.s, rot: g.rot, ay: 0.5, flashA: Math.max(0, 0.7 - g.t * 2.4), flashC: '#fff' });
      if (K.mon) {
        const m = K.mon, top = m.y - 130 * m.s, hop = m.in ? 0 : Math.abs(Math.sin(G.t * 18)) * 8;
        KIT.unit(G, { ...m, y: m.y - hop }, G.t);
        if (m.in) {
          G.text(m.name, m.x, top - 26, { size: 13, color: '#fff', stroke: '#2a1606', sw: 4 });
          G.bar(m.x - 30, top - 16, 60, 10, m.hp / m.maxHp, '#ef4444');
        }
      }
      // 돌진 직전 — 불꽃이 모인다
      if (K.finale >= 0 && K.finale < 0.34) {
        const a = Math.min(1, K.finale / 0.26), gr = ctx.createRadialGradient(K.rider.x + 10, K.rider.y - 60, 8, K.rider.x + 10, K.rider.y - 60, 118 + 40 * a);
        gr.addColorStop(0, `rgba(255,200,60,${0.85 * a})`); gr.addColorStop(0.55, `rgba(249,115,22,${0.45 * a})`); gr.addColorStop(1, 'rgba(249,115,22,0)');
        ctx.fillStyle = gr; ctx.fillRect(K.rider.x - 170, K.rider.y - 230, 360, 300);
      }
      KIT.unit(G, { ...K.rider, s: K.rider.s + K.rideT * 0.32, flash: K.finale >= 0 && K.finale < 0.34 ? 0.45 : K.rideT * 1.4, flashC: K.finale >= 0 ? '#ffd23f' : '#fff' }, G.t);
      // 퀘스트 보상 보석이 날아간다
      for (const f of K.fly) { const k = f.t * f.t; G.sprite('gem', 256 + (62 - 256) * k, 143 + (111 - 143) * k, { s: 0.42 - f.t * 0.12, alpha: 1 - f.t * 0.3 }); }
      // 탈것 카드 넷
      for (let i = 0; i < 4; i++) {
        const r = slot(i), m = MOUNTS[i], own = K.owned[i], on = K.cur === i, can = !own && K.gems >= m.price;
        const lift = can ? Math.sin(G.t * 8) * 2 - 2 : 0;
        const bright = on || can;
        G.rr(r.x, r.y + lift, r.w, r.h, 12, on ? '#ffe9a8' : can ? '#fff3d6' : own ? 'rgba(255,255,255,.14)' : '#59442e', on ? '#22c55e' : can ? '#ffd23f' : 'rgba(255,255,255,.28)', bright ? 3 : 2);
        KIT.unit(G, { id: m.art, x: r.x + r.w / 2, y: r.y + 50 + lift, s: 0.4, mode: 'idle', mt: 0, alpha: bright || own ? 1 : 0.75 }, G.t);
        const ink = bright ? '#7c2d12' : '#f5d9a8';
        if (own) G.text(on ? '탑승 중' : '보유', r.x + r.w / 2, r.y + 62 + lift, { size: 13, color: on ? '#15803d' : ink });
        else {
          G.sprite('gem', r.x + 12, r.y + 70 + lift, { s: 0.27 });
          G.text(KIT.fmt(m.price), r.x + r.w / 2 + 8, r.y + 62 + lift, { size: 13, color: ink });
        }
        G.text(`골드 +${m.pct}%`, r.x + r.w / 2, r.y + 78 + lift, { size: 13, color: ink });
        if (!own && !can) G.bar(r.x + 8, r.y + 87, r.w - 16, 7, K.gems / m.price, '#e11d48');
        if (i === 3) { G.rr(r.x + 16, r.y - 11 + lift, 42, 18, 9, '#dc2626', '#fff', 1.5); G.text('목표', r.x + 37, r.y - 2 + lift, { size: 13, color: '#fff' }); }
      }
    },
    debug: () => ({ gems: K.gems, cur: K.cur, spent: K.spent, left: +K.left.toFixed(1), gold: K.gold, kills: K.kills, quest: K.quest, fight: !!(K.mon && K.mon.in) }),
    bot(G) {
      if (G.phase !== 'play' || G.over) return null;
      const card = (i) => { const r = slot(i); return { tap: [r.x + r.w / 2, r.y + r.h / 2] }; };
      if (K.gems >= 2000) return card(3);
      // 지금 빠르기로 시간 안에 비룡까지 넉넉하면 멧돼지를 먼저 탄다(싼 하나 + 비룡 = 처치 24마리)
      const pace = (K.kills / Math.max(0.1, T - K.left)) * T;
      if (K.cur < 0 && K.gems >= 300 && pace >= 28) return card(0);
      return K.mon && K.mon.in ? { tap: [K.mon.x - 30, K.mon.y - 70] } : null;
    },
  };
})();
