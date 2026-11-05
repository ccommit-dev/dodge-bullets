/* 릴스 · 대장 사다리 — 실제 지역 대장 셋(titans/model HUNTING_AREAS bossName · SpriteArt BOSS_ASSET · 지역 배경)을 차례로, 대장마다 제한 시간(릴스 규칙). 대장을 직접 눌러야 맞고, 빗나가면 콤보가 끊긴다(golden-monster 와 같다). 콤보는 숫자로만 보인다.
 * 사다리는 titans/bossLadder 계산 그대로: 처음 깬 대장 스테이지마다 한 칸, 칸의 특성은 LADDER_ORDER[top % 4], LADDER_STEP 만큼. 층마다 대장이 있으므로 Stage 5 · 10 · 15 대장을 잡으면 동료 · 탭 · 골드가 오르고, 그 사이 스테이지 칸(Stage 6~9 …)도 쌓인다. 쌓인 값이 ladderEffects 처럼 탭 · 동료 피해에 실제로 곱해진다. 자동 공격 속도는 게임에서 주인공 자동 공격에 걸리고(TitansGame autoInterval) 이 장면엔 주인공 자동 공격이 없어 판에 값만 보인다 */
window.RF_SCENE = (() => {
  const BOSSES = [
    { id: 'moss-golem-clean', name: '이끼 골렘', stage: 5, area: '새벽 초원', bg: 'bg:meadow', hp: 900, h: 200, spots: [[282, 424], [150, 402], [276, 386], [156, 432]] },
    { id: 'moon-wolf-king-clean', name: '월광 늑대왕', stage: 10, area: '그림자 숲', bg: 'bg:forest', hp: 1050, h: 200, spots: [[282, 424], [150, 396], [276, 402], [156, 432]] },
    { id: 'wolf-king-clean', name: '고대 오우거', stage: 15, area: '붉은 폐허', bg: 'bg:ruins', hp: 1280, h: 200, spots: [[276, 426], [150, 400], [282, 392], [156, 432]] },
  ];
  const ORDER = ['ally', 'tap', 'gold', 'speed'];   // LADDER_ORDER
  const STEP = { ally: 3, tap: 5, gold: 3, speed: 2 };   // LADDER_STEP (%)
  const LABEL = { ally: '동료 피해', tap: '탭 피해', gold: '처치 골드', speed: '자동 공격 속도' };   // LADDER_LABEL
  const TIME = 7, TAP = 28, ALLY = 22, ALLY_SEC = 0.5, MOVE_EVERY = 8, CLIMB_SEC = 0.1;
  let K;
  /** 깬 대장 스테이지 수(top)까지 특성마다 몇 칸인가 — perkForStage 를 처음부터 굴린 것과 같다 */
  const rank = (perk, top) => { let n = 0; for (let t = 0; t < top; t++) if (ORDER[t % 4] === perk) n += 1; return n; };
  const pct = (perk) => rank(perk, K.top) * STEP[perk];
  function next() {
    const b = BOSSES[K.stage];
    K.boss = { id: b.id, x: b.spots[0][0], y: b.spots[0][1], s: 1, mode: 'idle', mt: 0, alpha: 0 };
    K.spot = 0; K.tx = b.spots[0][0]; K.ty = b.spots[0][1];
    K.hp = b.hp; K.left = TIME; K.enter = 0.5; K.hits = 0; K.party = 0;
    K.climbTo = b.stage - 1; K.climbT = 0;   // 이 대장 앞 스테이지들을 깨며 쌓인 칸 — 등장하는 동안 차례로 오른다
  }
  const near = (x, y) => { const b = BOSSES[K.stage]; return Math.abs(x - K.boss.x) < 66 && y > K.boss.y - b.h && y < K.boss.y + 24; };
  function damage(G, dmg, color, tag) {
    K.hp -= dmg; if (K.boss.mode === 'idle') KIT.hit(K.boss);
    G.float(`${KIT.fmt(dmg)}${tag}`, K.boss.x + (Math.random() * 90 - 45), K.boss.y - 120 - Math.random() * 30, color, tag ? 19 : 20, 0.7);
    if (K.hp <= 0) {
      const b = BOSSES[K.stage], perk = ORDER[(b.stage - 1) % 4], before = pct(perk);
      K.top = b.stage; K.climbTo = b.stage; K.raised = perk; K.raisedT = 1.2;
      K.dying = 0.9; G.sfx('win'); G.burst(K.boss.x, K.boss.y - 90, '#ffd23f', 44, 260); G.impact(1.3); G.coins(K.boss.x, K.boss.y - 90, 14);
      if (K.stage < 2) G.stamp(`사다리 ${K.top}칸!`, '#ffd23f', 330, 0.9);
      G.pop(`대장 사다리 ${K.top}칸`, `${LABEL[perk]} +${STEP[perk]}% 영구`, `${before}% → ${before + STEP[perk]}% · 환생해도 유지`, 'gold', 1.9);
      if (K.stage === 2) { G.climax(); G.caption('영구 특성은 환생해도 그대로!'); G.finish(2.2); }
      else G.caption(`다음은 ${BOSSES[K.stage + 1].name}`);
    }
  }
  function tap(G, x, y) {
    if (G.phase !== 'play' || K.dying || !K.boss || K.enter > 0 || G.over) return;
    if (x != null && !near(x, y)) { G.float('빗나감', x, y, '#cbd5e1', 15, 0.5); if (K.combo >= 3) G.sfx('fail'); else G.sfx('tap'); K.combo = 0; K.misses += 1; return; }
    K.hits += 1; K.combo += 1; K.best = Math.max(K.best, K.combo);
    KIT.attack(K.hero, 0.34); G.sfx('hit'); G.punch(0.015);
    const p = pct('tap');
    damage(G, TAP * (1 + p / 100), '#ffd23f', K.hits % 4 === 0 ? ` +${p}%` : '');   // 특성 표시는 네 번에 한 번 — 숫자가 쌓여 안 보였다
    if (K.dying) return;
    if (K.hits % MOVE_EVERY === 0) {
      const spots = BOSSES[K.stage].spots;
      K.spot = (K.spot + 1) % spots.length; K.tx = spots[K.spot][0]; K.ty = spots[K.spot][1];
      if (!K.movedOnce) { K.movedOnce = true; G.caption('자리를 옮겼어요 — 따라 눌러요!'); }
    }
  }
  return {
    id: 'boss-ladder',
    canLose: true,
    popY: 200,
    introDur: 1.5,
    hook: ['더 높은 대장 잡으면', '영구 강화'],
    climaxStamp: '영구 강화!!', raysAt: [240, 330],
    caption0: '대장을 직접 눌러 공격!',
    endLines: ['최고 기록을 넘기면 영원한 특성', '동료 · 탭 · 골드 · 공속이 차례로'],
    init() {
      K = { stage: 0, top: BOSSES[0].stage - 1, party: 0, dying: 0, combo: 0, best: 0, misses: 0, hits: 0, spot: 0, tx: 0, ty: 0, enter: 0, left: TIME, chose: false, movedOnce: false, climbTo: 0, climbT: 0, stackT: 0, raised: null, raisedT: 0,
        hero: { id: 'hero', x: 66, y: 432, s: 0.8, mode: 'idle', mt: 0 }, mia: { id: 'mia', x: 30, y: 408, s: 0.52, mode: 'idle', mt: 0, phase: 0.3 } };
      next();
    },
    onTap(G, x, y) {
      if (G.phase === 'play' && y > 56) {
        if (!K.chose) { K.chose = true; G.emit('choice', { tap: 'first' }); }
        tap(G, x, y); G.hint(null);
      }
      return true;
    },
    onKey(G) { if (!K.chose) { K.chose = true; G.emit('choice', { tap: 'first' }); } tap(G); },
    update(G, dt) {
      KIT.tick(K.hero, dt); KIT.tick(K.mia, dt); if (K.boss) KIT.tick(K.boss, dt);
      K.raisedT = Math.max(0, K.raisedT - dt);
      if (K.top < K.climbTo) {   // 스테이지 사이에 쌓인 칸
        K.climbT += dt;
        if (K.climbT >= CLIMB_SEC) {
          K.climbT = 0; K.raised = ORDER[K.top % 4]; K.raisedT = 0.5; K.top += 1; G.sfx('coin');
          if (K.top === K.climbTo) K.stackT = 1.1;   // 다 오르고 잠시 뒤 — 지금 곱해지는 값을 자막으로
        }
      }
      if (K.stackT > 0) { K.stackT -= dt; if (K.stackT <= 0 && !G.over) G.caption(`탭 +${pct('tap')}% · 동료 +${pct('ally')}% 적용 중!`); }
      if (K.boss && K.enter > 0) { K.enter -= dt; K.boss.alpha = 1 - Math.max(0, K.enter) / 0.5; }
      if (K.dying) {
        K.dying -= dt; if (K.boss) K.boss.alpha = Math.max(0, K.dying / 0.9);
        if (K.dying <= 0) {
          K.dying = 0;
          if (K.stage < 2) {
            K.stage += 1; next();
            G.caption(`Stage ${BOSSES[K.stage].stage} · 올라오며 사다리 ${K.climbTo - K.top}칸 더!`);
          } else K.boss = null;
        }
        return;
      }
      if (G.phase !== 'play' || !K.boss || K.enter > 0 || G.over) return;
      K.boss.x += (K.tx - K.boss.x) * Math.min(1, dt * 9); K.boss.y += (K.ty - K.boss.y) * Math.min(1, dt * 9);
      K.left = Math.max(0, K.left - dt);
      if (K.left <= 0) {
        const b = BOSSES[K.stage], left = Math.ceil((Math.max(0, K.hp) / b.hp) * 100);
        KIT.attack(K.boss, 0.5);
        G.lose('시간 초과!', [`${b.name} 체력 ${left}% 남았어요`, K.misses > 4 ? '대장을 직접 — 빗나가면 콤보가 끊겨요' : '대장을 직접, 더 빠르게 눌러요']);
        return;
      }
      // 동료 자동 공격 — 동료 피해 특성이 여기에 곱해진다
      K.party += dt;
      if (K.party > ALLY_SEC) {
        K.party = 0; KIT.attack(K.mia, 0.4);
        const p = pct('ally');
        damage(G, ALLY * (1 + p / 100), '#86efac', ` +${p}%`);
        if (K.dying) return;
      }
      if (G.idle > 0.9) G.hint(K.boss.x, K.boss.y - 90); else G.hint(null);
    },
    draw(G, ctx) {
      const b = BOSSES[K.stage];
      KIT.stage(G, ctx, b.bg);
      if (K.boss) KIT.bossBar(G, `대장 · ${b.name}`, Math.max(0, K.hp) / b.hp);
      KIT.clock(G, K.left, TIME, 96, '제한 시간 ');
      G.text(`Stage ${b.stage} · ${b.area}`, 180, 132, { size: 15, color: '#fff3d0', stroke: '#2a1606', sw: 4 });
      const nextPerk = ORDER[K.top % 4];
      if (K.boss && !K.dying) G.text(`잡으면 ${LABEL[ORDER[(b.stage - 1) % 4]]} +${STEP[ORDER[(b.stage - 1) % 4]]}% 영구`, 180, 152, { size: 14, color: '#ffe066', stroke: '#2a1606', sw: 4 });
      KIT.unit(G, K.mia, G.t); KIT.unit(G, K.hero, G.t);
      if (K.boss) KIT.unit(G, K.boss, G.t);
      if (K.combo >= 2 && G.phase !== 'end') G.text(`${K.combo} 콤보`, 70, 286, { size: K.combo >= 10 ? 26 : 20, color: K.combo >= 10 ? '#ffd23f' : '#fff', stroke: '#2a1606', sw: 5 });
      // 아래: 사다리 — 지금까지 쌓인 영구 특성 넷
      G.text(`대장 사다리 ${K.top}칸 · 환생해도 유지`, 180, 476, { size: 15, color: '#ffe066' });
      ORDER.forEach((perk, i) => {
        const x = 10 + (i % 2) * 174, y = 492 + Math.floor(i / 2) * 46, cur = perk === nextPerk && K.top < 15, up = K.raised === perk && K.raisedT > 0;
        G.rr(x, y, 166, 42, 10, up ? '#ffe7a3' : 'rgba(255,255,255,.08)', up ? '#f2c232' : cur ? '#ffd23f' : 'rgba(255,255,255,.2)', up || cur ? 3 : 2);
        G.text(LABEL[perk], x + 10, y + 21, { size: perk === 'speed' ? 13 : 14, color: up ? '#3b2415' : '#f5d9a8', align: 'left' });
        G.text(`+${pct(perk)}%`, x + 156, y + 21, { size: 18, color: up ? '#92400e' : '#fff', align: 'right' });
      });
    },
    debug: () => ({ stage: K.stage, top: K.top, tapPct: pct('tap'), allyPct: pct('ally'), hp: Math.round(K.hp), left: +K.left.toFixed(1), combo: K.combo, best: K.best, misses: K.misses }),
    bot(G) {
      if (G.phase !== 'play' || G.over || K.dying || !K.boss || K.enter > 0) return null;
      return { tap: [K.boss.x, K.boss.y - 80] };
    },
  };
})();
