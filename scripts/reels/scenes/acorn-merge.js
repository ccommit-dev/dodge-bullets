/* 릴스 1 · 도토리 합성 — 같은 단계 둘을 누르면 한 단계 위, 제일 좋은 도토리는 미아가 바로 쓴다. Lv5 를 만들면 한 방 */
window.RF_SCENE = (() => {
  const SLOTS = 8, X0 = 40, Y0 = 470, SW = 64, SH = 52, GAP = 8;
  const mul = (l) => (l > 0 ? 1 + 0.08 * l + 0.02 * l * l : 1);
  const slotRect = (i) => ({ x: X0 + (i % 4) * (SW + GAP), y: Y0 + Math.floor(i / 4) * (SH + 6), w: SW, h: SH });
  const tintOf = (l) => ['#c8783a', '#b9783a', '#9ad04a', '#4fb0ff', '#c084fc', '#ffd23f'][Math.min(5, l)];
  const MONS = ['slime', 'goblin'];
  let K;
  function spawn(G) { K.mon = { id: MONS[K.kills % 2], x: 268, y: 410, s: 1, mode: 'idle', mt: 0 }; K.hp = K.maxHp = 140; }
  function best() { return Math.max(0, ...K.grid); }
  function pairOf(lv, except) { return K.grid.findIndex((l, i) => i !== except && l === lv && l > 0); }
  function merge(G, a, b) {
    const lv = K.grid[a] + 1;
    const before = mul(best());
    K.grid[b] = lv; K.grid[a] = 0; K.sel = -1;
    K.pops.push({ i: b, t: 0 });
    const r = slotRect(b);
    G.burst(r.x + r.w / 2, r.y + r.h / 2, tintOf(lv), 16, 140); G.sfx('merge');
    if (!K.merged) { K.merged = true; G.emit('choice', { merged: lv - 1 }); }
    if (lv > K.top) {
      K.top = lv;
      K.mulShow = { from: before, to: mul(lv), t: 0 };
      G.float(`피해 ×${before.toFixed(2)} → ×${mul(lv).toFixed(2)}`, 96, 260, '#ffe066', 20, 1.4);
      if (lv >= 3) G.pop('새 도토리 발견', `도토리 Lv.${lv}`, `첫 발견 보상 · 보석 +${10 * lv}`, 'green', 1.6);
      G.caption(lv >= 5 ? '최고 단계 도토리 완성!' : `Lv.${lv} — 미아가 바로 쓴다`);
    }
    if (lv >= 5 && !K.power) { K.power = 0.6; G.climax(); G.caption('Lv.5 도토리 한 방!'); }
  }
  return {
    id: 'acorn-merge',
    introDur: 1.6,
    hook: ['도토리 두 개를', '합치면?'],
    caption0: '같은 단계 둘을 차례로 누르기',
    endLines: ['도토리 두 개 = 더 센 도토리', '합칠수록 동료 피해 ×4.8까지'],
    init(G) {
      K = { grid: [1, 1, 2, 3, 3, 4, 0, 0], sel: -1, kills: 0, top: 4, pops: [], merged: false, power: 0, atk: 0, hitT: 0, mulShow: null, autoT: 0 };
      K.mia = { id: 'mia', x: 92, y: 410, s: 1.15, mode: 'idle', mt: 0 };
      spawn(G);
    },
    onTap(G, x, y) {
      for (let i = 0; i < SLOTS; i++) {
        const r = slotRect(i);
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          if (K.grid[i] === 0) return true;
          if (K.sel < 0) { K.sel = i; G.sfx('tap'); }
          else if (K.sel === i) K.sel = -1;
          else if (K.grid[K.sel] === K.grid[i]) merge(G, K.sel, i);
          else { K.sel = i; G.sfx('tap'); }
          G.hint(null);
          return true;
        }
      }
      return false;
    },
    update(G, dt) {
      KIT.tick(K.mia, dt); KIT.tick(K.mon, dt);
      for (const p of K.pops) p.t += dt; K.pops = K.pops.filter((p) => p.t < 0.4);
      if (K.mulShow) K.mulShow.t += dt;
      // 미아 자동 공격 — 0.7초마다
      K.atk += dt;
      const period = K.power > 0 ? 0.35 : 0.7;
      if (K.atk > period && G.phase !== 'end') {
        K.atk = 0; KIT.attack(K.mia, 0.4); K.hitT = 0.22;
      }
      if (K.hitT > 0) {
        K.hitT -= dt;
        if (K.hitT <= 0 && K.mon) {
          const dmg = (K.power > 0 ? 160 : 12) * mul(best()) * (0.9 + Math.random() * 0.2);
          K.hp -= dmg; KIT.hit(K.mon); G.sfx('hit');
          G.float(KIT.fmt(dmg), K.mon.x + (Math.random() * 30 - 15), 300, K.power > 0 ? '#ffd23f' : '#fff', K.power > 0 ? 34 : 22);
          if (K.power > 0) { G.shake(8); G.flash('#fff3a0', 0.12); }
          if (K.hp <= 0) {
            G.burst(K.mon.x, 360, '#ffd23f', 22, 200); G.float('+골드', K.mon.x, 330, '#ffe066', 20); G.sfx('coin');
            K.kills += 1; spawn(G);
            if (K.power > 0 && K.kills >= 3 && !K.done) { K.done = true; G.finish(1.4); }
          }
        }
      }
      if (K.power > 0 && !K.done && G.pt > 0) { /* 절정: 빠른 연타로 몬스터 셋 */ }
      // 6초마다 새 도토리(Lv1) — 빈칸에
      K.make = (K.make || 0) + dt;
      if (K.make > 4 && G.phase === 'play') { K.make = 0; const e = K.grid.indexOf(0); if (e >= 0) { K.grid[e] = 1; K.pops.push({ i: e, t: 0 }); } }
      // 손대지 않으면: 힌트 → 스스로 합친다(가장 낮은 짝부터)
      if (G.phase === 'play') {
        let a = -1, b = -1;
        for (let lv = 1; lv <= 5 && a < 0; lv++) { const i = K.grid.indexOf(lv); if (i >= 0) { const j = pairOf(lv, i); if (j >= 0) { a = i; b = j; } } }
        if (a >= 0 && G.idle > 1.6) {
          const target = K.sel === a ? b : a, r = slotRect(target);
          G.hint(r.x + r.w / 2, r.y + r.h / 2);
          K.autoT += dt;
          if (K.autoT > 0.55) { K.autoT = 0; if (K.sel === a) merge(G, a, b); else { K.sel = a; G.sfx('tap'); } }
        } else K.autoT = 0;
      }
    },
    draw(G, ctx) {
      KIT.stage(G, ctx, 'bg:meadow');
      // 미아 머리 위 배율
      const m = mul(best()), k = K.mulShow ? Math.min(1, K.mulShow.t / 0.3) : 1;
      G.rr(42, 196, 100, 34, 12, 'rgba(27,18,11,.85)', '#ffd23f', 2);
      G.sprite(`acorn`, 60, 226, { s: 0.42 });
      G.text(`×${m.toFixed(2)}`, 108, 213, { size: 20 * (0.85 + 0.15 * k), color: '#ffe066' });
      KIT.unit(G, K.mia, G.t);
      if (K.mon) KIT.unit(G, K.mon, G.t);
      // HP
      if (K.mon) { G.bar(K.mon.x - 50, 270, 100, 12, K.hp / K.maxHp, '#ef4444'); }
      // 도토리 판
      for (let i = 0; i < SLOTS; i++) {
        const r = slotRect(i), l = K.grid[i];
        const pairable = l > 0 && pairOf(l, i) >= 0;
        const match = K.sel >= 0 && i !== K.sel && l > 0 && l === K.grid[K.sel];
        G.rr(r.x, r.y, r.w, r.h, 12, l ? '#fff3d6' : 'rgba(255,255,255,.08)', i === K.sel ? '#4fb0ff' : match ? '#22c55e' : pairable ? '#f2c94c' : 'rgba(255,255,255,.18)', i === K.sel || match ? 4 : 2);
        if (l) {
          const pop = K.pops.find((p) => p.i === i), s = pop ? 0.62 + Math.sin((pop.t / 0.4) * Math.PI) * 0.2 : 0.62;
          ctx.save(); ctx.filter = l >= 2 ? `hue-rotate(${[0, 0, 70, 160, 230, 20][Math.min(5, l)]}deg) saturate(${l >= 5 ? 1.8 : 1.3})` : 'none';
          G.sprite('acorn', r.x + r.w / 2, r.y + r.h - 6, { s });
          ctx.restore();
          G.rr(r.x + r.w - 22, r.y + 2, 20, 18, 9, tintOf(l), '#2a1606', 2);
          G.text(String(l), r.x + r.w - 12, r.y + 11, { size: 12, color: '#1b1206' });
        }
      }
    },
    debug: () => ({ grid: K.grid.join(''), top: K.top, kills: K.kills }),
    /** 검사용: 지금 누를 자리(합칠 짝) */
    tapAt() {
      for (let lv = 1; lv <= 5; lv++) { const i = K.grid.indexOf(lv); if (i >= 0) { const j = pairOf(lv, i); if (j >= 0) { const r = slotRect(K.sel === i ? j : i); return [r.x + r.w / 2, r.y + r.h / 2]; } } }
      return [180, 300];
    },
  };
})();
