/* 릴스 · 검 강화 — 낡은 나무 검 +0 에서 초월자의 검 +15 까지(forge/model FORGE_TIERS 이름 · cost · chance · shards). 게임(ForgeGame) 흐름 그대로: 강화하기 → 실패하면 실패 창 → 방지권 protectionCost 장으로 복구하거나 포기.
 * 실패 순번은 +6 · +9 첫 시도로 정해 뒀고(표시 확률은 강화석 없을 때 게임 값, 결과는 고정), 방지권은 그 복구 비용 합(2 + 3 = 5장)으로 시작한다. 포기하면 검이 부서져 진다. 제한 시간 안에 +15 에 못 닿아도 진다(제한 시간은 릴스 규칙).
 * 두드리는 시간 0.22초 · 결과 0.24초는 ForgeGame FORGE_MS · RESULT_MS. 외형 변화는 +5 · +10 · +15 */
window.RF_SCENE = (() => {
  const NAMES = ['낡은 나무 검', '단단한 나무 검', '청동 검', '강철 검', '푸른 리본 검', '화염의 검', '번개의 검', '서리 군주의 검', '심연의 대검', '별빛 마법검', '용울음 검', '천공의 검', '차원 가르는 검', '신화의 검', '무한의 검', '초월자의 검'];
  const CHANCE = [100, 95, 88, 78, 67, 56, 46, 37, 29, 22, 16, 11, 7.5, 5, 3];
  const PRICE = [300, 600, 1200, 2400, 5000, 11000, 24000, 52000, 115000, 250000, 540000, 1150000, 2400000, 5000000, 10000000];
  const SHARDS = [1, 1, 2, 3, 5, 8, 12, 18, 26, 38, 55, 80, 120, 180, 280, 500];
  const COST = (l) => (l < 5 ? 1 : l < 9 ? 2 : l < 12 ? 3 : 5);   // protectionCost
  const FAILS = [6, 9];
  const LOOKS = [5, 10, 15];
  const LIMIT = 17, TICKETS = 5, FORGE_SEC = 0.22, RESULT_SEC = 0.24;
  const BTN = { x: 12, y: 518, w: 336, h: 62 }, RESCUE = { x: 48, y: 282, w: 264, h: 72 }, SCRAP = { x: 48, y: 364, w: 264, h: 66 };
  const inside = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const gold = (v) => (v >= 10000 ? `${Math.floor(v / 10000).toLocaleString('ko-KR')}만G` : `${v.toLocaleString('ko-KR')}G`);   // forge/model formatGold
  let K;
  function first(G, data) { if (!K.chose) { K.chose = true; G.emit('choice', data); } }
  function forge(G) {
    if (K.fail || K.busy > 0 || K.rest > 0 || K.lv >= 15 || K.broken || G.phase !== 'play' || G.over) return;
    K.busy = FORGE_SEC; K.hammer = 0; K.tries += 1; G.sfx('tap');
  }
  function resolve(G) {
    const lv = K.lv;
    if (FAILS.includes(lv) && !K.failed.includes(lv)) {   // 실패 — 게임처럼 그때 복구할지 고른다
      K.failed.push(lv); K.fail = { lv, need: COST(lv) }; K.failT = 0;
      G.sfx('fail'); G.shake(10, 0.4); G.flash('#7f1d1d', 0.2); G.burst(180, 290, '#94a3b8', 30, 240);
      G.caption('방지권으로 복구할까요?');
      return;
    }
    const before = lv;
    K.lv += 1; K.rest = RESULT_SEC; K.flashT = 0.4; G.sfx('merge'); G.burst(180, 300, K.lv >= 11 ? '#ffd23f' : '#fff3a0', 30, 240); G.punch(0.04); G.hitstop(0.03);
    if (LOOKS.includes(K.lv)) { G.coins(180, 300, 12); G.rays(180, 300, 1); G.pop('외형 변화!', NAMES[K.lv], `+${before} → +${K.lv}`, 'gold', 1.1); }
    else G.float('SUCCESS!', 180, 216, '#ffe066', 28, 0.5);
    G.caption(`+${K.lv} ${NAMES[K.lv]}`);
    if (K.lv >= 15) { G.climax(); G.sfx('legend'); G.flash('#fff3a0', 0.3); G.shake(8, 0.4); G.caption('+15 초월자의 검 완성!'); G.finish(2.4); }
  }
  function rescue(G) {
    const f = K.fail; if (!f || G.over) return;
    K.tickets -= f.need; K.fail = null; K.shieldT = 0.9;
    G.sfx('merge'); G.flash('#7c3aed', 0.16); G.burst(180, 300, '#c4b5fd', 26, 220);
    G.float(`방지권 -${f.need}`, 180, 216, '#c4b5fd', 24, 0.8);
    G.caption('방지권으로 검을 복구했습니다');
  }
  function giveUp(G) {
    const f = K.fail; if (!f || G.over) return;
    K.fail = null; K.broken = true;
    G.shake(14, 0.5); G.flash('#7f1d1d', 0.28); G.burst(180, 290, '#94a3b8', 44, 280); G.impact(1.6);
    G.lose('검이 부서졌습니다', [`+${f.lv} → +0 · 조각 ${SHARDS[f.lv]}개`, '방지권으로 복구하면 이어 가요'], 1.4);
  }
  /** 부서진 검 — 위 · 아래 두 조각으로 벌어진다 */
  function drawBroken(G, ctx, s) {
    const key = `drum:${K.lv}`;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 360, 292); ctx.clip(); G.sprite(key, 168, 372, { s, rot: -0.14, alpha: 0.85 }); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(0, 292, 360, 200); ctx.clip(); G.sprite(key, 190, 394, { s, rot: 0.1, alpha: 0.85 }); ctx.restore();
  }
  return {
    id: 'sword-forge',
    canLose: true,
    popY: 150,
    introDur: 1.5,
    hook: ['낡은 나무 검이', '초월자의 검이 되기까지'],
    climaxStamp: '초월자의 검!!', raysAt: [180, 300],
    caption0: '강화하기! 문 닫기 전에 +15 까지',
    endLines: ['검 하나로 +15 까지', '+5 · +10 · +15 마다 외형 변화'],
    init() { K = { lv: 0, busy: 0, rest: 0, hammer: 0, tries: 0, flashT: 0, shieldT: 0, left: LIMIT, tickets: TICKETS, failed: [], fail: null, failT: 0, broken: false, chose: false }; },
    onTap(G, x, y) {
      if (G.phase !== 'play' || y <= 56) return true;
      if (K.fail) {
        if (inside(RESCUE, x, y)) rescue(G); else if (inside(SCRAP, x, y)) giveUp(G);
      } else if (inside(BTN, x, y)) { first(G, { forge: 'first' }); forge(G); }
      G.hint(null);
      return true;
    },
    onKey(G) { first(G, { forge: 'first' }); if (K.fail) rescue(G); else forge(G); },
    update(G, dt) {
      K.flashT = Math.max(0, K.flashT - dt); K.shieldT = Math.max(0, K.shieldT - dt);
      if (K.busy > 0) { K.busy -= dt; K.hammer += dt; if (K.busy <= 0) { K.busy = 0; if (!G.over) resolve(G); } }
      else if (K.rest > 0) K.rest = Math.max(0, K.rest - dt);
      if (G.over || G.phase !== 'play') return;
      K.left = Math.max(0, K.left - dt);
      if (K.left <= 0) {
        const stuck = !!K.fail;
        if (stuck) { K.fail = null; K.broken = true; }
        G.lose('대장간 문이 닫혔어요', [`+${K.lv} ${NAMES[K.lv]}까지 올렸어요`, stuck ? '실패 창에서 복구를 골라 보세요' : '강화하기를 더 빠르게 눌러 보세요']);
        return;
      }
      // 실패 창은 연타하던 손이 바로 못 알아본다 — 입력과 상관없이 잠시 뒤 복구 단추를 가리킨다
      if (K.fail) { K.failT += dt; if (K.failT > 0.6) G.hint(RESCUE.x + RESCUE.w / 2, RESCUE.y + RESCUE.h / 2); else G.hint(null); }
      else if (G.idle > 1) G.hint(BTN.x + BTN.w / 2, BTN.y + BTN.h / 2);
      else G.hint(null);
    },
    draw(G, ctx) {
      const g = ctx.createRadialGradient(180, 300, 20, 180, 300, 360); g.addColorStop(0, K.lv >= 11 ? '#7a3a1a' : '#5a2a12'); g.addColorStop(1, '#1b0d06');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 360, 640);
      // 모루 · 불꽃
      G.rr(110, 380, 140, 30, 8, '#3a3a42', '#16161a', 3); G.rr(140, 410, 80, 40, 6, '#2a2a30', '#16161a', 3);
      const glow = 0.5 + Math.sin(G.t * 5) * 0.2;
      ctx.save(); ctx.globalAlpha = glow; const fg = ctx.createRadialGradient(180, 360, 10, 180, 360, 160); fg.addColorStop(0, 'rgba(255,170,60,.55)'); fg.addColorStop(1, 'rgba(255,120,30,0)'); ctx.fillStyle = fg; ctx.fillRect(0, 160, 360, 300); ctx.restore();
      // 검
      const bounce = K.flashT > 0 ? 1 + Math.sin((K.flashT / 0.4) * Math.PI) * 0.12 : 1 + Math.sin(G.t * 2) * 0.015;
      if (K.lv >= 15) { ctx.save(); ctx.translate(180, 300); ctx.rotate(G.t * 0.4); for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.fillStyle = 'rgba(255,210,63,.16)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-24, -260); ctx.lineTo(24, -260); ctx.fill(); } ctx.restore(); }
      if (K.broken || K.fail) drawBroken(G, ctx, 1.25);
      else G.sprite(`drum:${K.lv}`, 180, 382, { s: 1.25 * bounce, flashA: K.flashT > 0 ? K.flashT * 1.5 : 0, flashC: '#fff6c4' });
      // 복구한 순간 — 보랏빛이 검을 감싼다
      if (K.shieldT > 0) { const a = Math.min(1, K.shieldT * 1.6); ctx.save(); ctx.globalAlpha = a * 0.55; ctx.beginPath(); ctx.arc(180, 290, 92 + (0.9 - K.shieldT) * 40, 0, Math.PI * 2); ctx.fillStyle = 'rgba(167,139,250,.35)'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#c4b5fd'; ctx.stroke(); ctx.restore(); }
      // 망치
      if (K.busy > 0) {
        const a = Math.sin(Math.min(1, K.hammer / FORGE_SEC) * Math.PI) * 0.9;
        ctx.save(); ctx.translate(270, 230); ctx.rotate(-0.9 + a * 1.4); G.rr(-6, -10, 12, 90, 4, '#8a5a2b', '#2a1606', 2); G.rr(-26, -30, 52, 28, 6, '#9aa4b0', '#2a1606', 3); ctx.restore();
        G.text('강화 중…', 180, 200, { size: 18, color: '#fff3d0', stroke: '#2a1606', sw: 4 });
      }
      // 제한 시간 · 단계
      KIT.clock(G, K.left, LIMIT, 50, '문 닫기까지 ');
      G.text(`+${K.lv}`, 180, 104, { size: 44, color: '#ffd23f', stroke: '#2a1606', sw: 8 });
      G.text(NAMES[K.lv], 180, 144, { size: 20, color: '#fff3d0', stroke: '#2a1606', sw: 5 });
      const nextLook = LOOKS.find((l) => l > K.lv);
      if (nextLook) G.text(`+${nextLook} 에서 외형 변화`, 180, 170, { size: 13, color: '#ffe08a', stroke: '#2a1606', sw: 4 });
      G.text('표시 확률은 게임 값 · 릴스 결과는 정해져 있어요', 180, 446, { size: 13, color: '#f5d9a8', stroke: '#2a1606', sw: 4, alpha: 0.9 });
      // 아래 판 — 게임 대장간 칸: 강화 비용 · 성공 확률 · 방지권
      ctx.fillStyle = '#2b1a0e'; ctx.fillRect(0, 460, 360, 180); ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, 458, 360, 4);
      const maxed = K.lv >= 15, pct = maxed ? 0 : CHANCE[K.lv], need = COST(K.lv);
      const box = (x, label, value, col) => { G.rr(x, 468, 108, 44, 10, 'rgba(255,255,255,.06)', 'rgba(255,255,255,.16)', 2); G.text(label, x + 54, 480, { size: 13, color: '#f5d9a8' }); G.text(value, x + 54, 499, { size: 17, color: col }); };
      box(12, '강화 비용', maxed ? 'MAX' : gold(PRICE[K.lv]), '#ffe066');
      box(126, '성공 확률', maxed ? '—' : `${pct}%`, pct < 50 && !maxed ? '#fca5a5' : '#86efac');
      box(240, '방지권', `${K.tickets}장`, K.tickets ? '#c4b5fd' : '#a8a29e');
      // 강화 단추
      const press = K.busy > 0 ? 0.97 : 1;
      ctx.save(); ctx.translate(BTN.x + BTN.w / 2, BTN.y + BTN.h / 2); ctx.scale(press, press);
      G.rr(-BTN.w / 2, -BTN.h / 2, BTN.w, BTN.h, 16, maxed || K.broken ? '#6b7280' : K.busy > 0 || K.rest > 0 ? '#c2610f' : '#ff8a1f', '#3b2415', 4);
      G.text(maxed ? '최고 단계 달성' : K.busy > 0 ? '두드리는 중…' : '강화하기', 0, -8, { size: 22, color: '#1b1206' });
      if (!maxed) G.text(`+${K.lv} → +${K.lv + 1}${pct >= 100 ? '' : K.tickets >= need ? ` · 실패하면 방지권 ${need}장으로 복구` : ` · 복구엔 방지권 ${need}장 · 보유 ${K.tickets}장`}`, 0, 16, { size: 13, color: '#3b2415' });
      ctx.restore();
      // 실패 창 — ForgeGame phase === "failure" 와 같은 말
      if (K.fail) {
        const f = K.fail;
        ctx.fillStyle = 'rgba(10,6,3,.74)'; ctx.fillRect(0, 0, 360, 640);
        KIT.clock(G, K.left, LIMIT, 50, '문 닫기까지 ');
        G.rr(30, 170, 300, 276, 20, '#2b1a0e', '#fca5a5', 3);
        G.text('ENHANCE FAILED', 180, 196, { size: 14, color: '#fca5a5' });
        G.text('검이 부서졌습니다', 180, 226, { size: 26, color: '#fff' });
        G.text(`+${f.lv} ${NAMES[f.lv]}`, 180, 258, { size: 16, color: '#ffe08a' });
        const p = 1 + Math.sin(G.t * 7) * 0.015;
        ctx.save(); ctx.translate(RESCUE.x + RESCUE.w / 2, RESCUE.y + RESCUE.h / 2); ctx.scale(p, p);
        G.rr(-RESCUE.w / 2, -RESCUE.h / 2, RESCUE.w, RESCUE.h, 16, '#7c3aed', '#ddd6fe', 3);
        G.text(`방지권 ${f.need}장으로 복구`, 0, -10, { size: 21, color: '#fff' });
        G.text(`보유 ${K.tickets}장`, 0, 17, { size: 14, color: '#ede9fe' });
        ctx.restore();
        G.rr(SCRAP.x, SCRAP.y, SCRAP.w, SCRAP.h, 16, 'rgba(255,255,255,.08)', 'rgba(255,255,255,.35)', 2);
        G.text('포기', 180, SCRAP.y + 22, { size: 19, color: '#fff' });
        G.text(`조각 ${SHARDS[f.lv]}개 줍기 · 검은 +0으로 돌아갑니다`, 180, SCRAP.y + 47, { size: 13, color: '#d6d3d1' });
      }
    },
    debug: () => ({ lv: K.lv, tries: K.tries, tickets: K.tickets, fail: !!K.fail, broken: K.broken, busy: +(K.busy + K.rest).toFixed(2), left: +K.left.toFixed(1) }),
    bot(G) {
      if (G.phase !== 'play' || G.over || K.broken || K.lv >= 15) return null;
      if (K.fail) return { tap: [RESCUE.x + RESCUE.w / 2, RESCUE.y + RESCUE.h / 2] };
      if (K.busy > 0 || K.rest > 0) return null;
      return { tap: [BTN.x + BTN.w / 2, BTN.y + BTN.h / 2] };
    },
  };
})();
