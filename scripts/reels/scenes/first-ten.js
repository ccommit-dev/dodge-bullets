/* 릴스 4 · 첫 10연 전설 확정 — 소환 단추 → 카드 열 장을 하나씩 뒤집는다. 마지막 한 장이 전설(SSR) 아리 */
window.RF_SCENE = (() => {
  const POOL = [['mia', 'R', '스카우트 미아'], ['leon', 'R', '궁수 레온'], ['sera', 'SR', '마법사 세라'], ['garen', 'SR', '기사 가렌']];
  const RC = { R: '#4fb0ff', SR: '#a78bfa', SSR: '#ffd23f' };
  const BTN = { x: 60, y: 482, w: 240, h: 62 };
  const cardRect = (i) => ({ x: 22 + (i % 5) * 64, y: 140 + Math.floor(i / 5) * 132, w: 56, h: 118 });
  let K;
  function flip(G, i) {
    const c = K.cards[i]; if (c.open) return;
    const left = K.cards.filter((x) => !x.open).length;
    if (left === 1) { c.r = ['ari', 'SSR', '용기사 아리']; }
    c.open = true; c.ft = 0; K.opened += 1;
    if (K.opened === 1) G.emit('choice', { card: i });
    if (c.r[1] === 'SSR') {
      K.ssr = i; G.sfx('legend'); G.flash('#fff3a0', 0.3); G.shake(8, 0.4);
      G.burst(cardRect(i).x + 28, cardRect(i).y + 60, '#ffd23f', 50, 280);
      G.climax(); G.pop('전설 SSR · 첫 10연 확정', '용기사 아리', '새 동료 합류 · 보석 +50', 'gold', 2.6);
      G.caption('첫 10연은 전설 1명 확정!'); G.finish(2.8);
    } else { G.sfx('flip'); if (c.r[1] === 'SR') { G.punch(0.03); G.float('SR!', cardRect(i).x + 28, cardRect(i).y + 20, '#c4b5fd', 26, 0.8); } G.caption(K.opened < 9 ? `${10 - K.opened}장 남음 — 전설은 어디에?` : '마지막 한 장…!'); }
  }
  return {
    id: 'first-ten',
    introDur: 1.5,
    hook: ['첫 10연차', '전설 확정'],
    climaxStamp: '전설!!', raysAt: [180, 300],
    caption0: '10회 소환 단추를 눌러요',
    endLines: ['시작하자마자 전설 동료', '출석 1,000 + 깜짝 500 보석으로 바로'],
    init(G) {
      K = { summoned: false, sumT: 0, cards: [], opened: 0, ssr: -1, auto: 0 };
      for (let i = 0; i < 10; i++) K.cards.push({ r: POOL[(i * 7 + 3) % 4], open: false, ft: 0, deal: 0 });
    },
    onTap(G, x, y) {
      if (G.phase !== 'play') return true;
      if (!K.summoned) { if (y > 440) { K.summoned = true; K.sumT = 0; G.sfx('merge'); G.caption('카드를 눌러 뒤집기'); G.hint(null); } return true; }
      if (K.sumT < 1.1) return true;
      for (let i = 0; i < 10; i++) { const r = cardRect(i); if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { flip(G, i); G.hint(null); return true; } }
      return true;
    },
    update(G, dt) {
      if (K.summoned) K.sumT += dt;
      for (const c of K.cards) { if (c.open) c.ft += dt; }
      if (G.phase !== 'play') return;
      if (!K.summoned && G.idle > 1.3) { G.hint(180, BTN.y + 31); if (G.idle > 2.2) { K.summoned = true; K.sumT = 0; G.sfx('merge'); G.caption('카드를 눌러 뒤집기'); } }
      if (K.summoned && K.sumT > 1.1 && G.idle > 1.2) {
        const i = K.cards.findIndex((c) => !c.open);
        if (i >= 0) { const r = cardRect(i); G.hint(r.x + 28, r.y + 60); K.auto += dt; if (K.auto > 0.32) { K.auto = 0; flip(G, i); } }
      } else K.auto = 0;
    },
    draw(G, ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, 640); g.addColorStop(0, '#2a1440'); g.addColorStop(1, '#120b1f');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 360, 640);
      // 빛살
      ctx.save(); ctx.translate(180, 300); ctx.rotate(G.t * 0.15);
      for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = K.ssr >= 0 ? 'rgba(255,210,63,.14)' : 'rgba(167,139,250,.07)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30, -420); ctx.lineTo(30, -420); ctx.fill(); }
      ctx.restore();
      if (!K.summoned) {
        const b = 1 + Math.sin(G.t * 4) * 0.04;
        G.text('동료 뽑기', 180, 110, { size: 26, color: '#fff', stroke: '#2a1640', sw: 6 });
        ctx.save(); ctx.translate(180, 290); ctx.scale(b, b);
        for (let i = 0; i < 3; i++) { const c = POOL[i + 1]; KIT.unit(G, { id: c[0], x: (i - 1) * 90, y: 60, s: 0.9, mode: 'idle', mt: 0, phase: i * 0.3 }, G.t); }
        ctx.restore();
        ctx.save(); ctx.translate(180, BTN.y + 31); ctx.scale(b, b);
        G.rr(-120, -31, 240, 62, 18, '#ffd23f', '#3b2415', 4);
        G.text('10회 소환', 0, -8, { size: 22, color: '#1b1206' });
        G.text('첫 10연 전설 확정 · 💎900', 0, 16, { size: 13, color: '#7c2d12' });
        ctx.restore();
        return;
      }
      // 소환진 → 카드
      if (K.sumT < 1.1) {
        const k = K.sumT / 1.1;
        ctx.save(); ctx.translate(180, 300); ctx.rotate(k * 6); ctx.strokeStyle = `rgba(255,210,63,${1 - k * 0.5})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, 40 + k * 120, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      for (let i = 0; i < 10; i++) {
        const c = K.cards[i], r = cardRect(i);
        const dk = Math.min(1, Math.max(0, (K.sumT - 0.6 - i * 0.05) / 0.25));
        if (dk <= 0) continue;
        const flipK = c.open ? Math.min(1, c.ft / 0.28) : 0;
        const sx = Math.abs(Math.cos(flipK * Math.PI)) || 0.02;
        const front = flipK >= 0.5;
        ctx.save(); ctx.globalAlpha = dk; ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(sx * (0.8 + 0.2 * dk), 0.8 + 0.2 * dk);
        if (!front) {
          G.rr(-r.w / 2, -r.h / 2, r.w, r.h, 10, '#1e1b4b', '#a78bfa', 3);
          G.text('✦', 0, 2, { size: 26, color: '#c4b5fd' });
        } else {
          const ssr = c.r[1] === 'SSR';
          if (ssr) { ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 24; }
          G.rr(-r.w / 2, -r.h / 2, r.w, r.h, 10, ssr ? '#fff3c4' : '#fff8ec', RC[c.r[1]], ssr ? 5 : 3);
          ctx.shadowBlur = 0;
          G.rr(-r.w / 2 + 4, -r.h / 2 + 4, 30, 16, 8, RC[c.r[1]]);
          G.text(c.r[1], -r.w / 2 + 19, -r.h / 2 + 12, { size: 11, color: '#1b1206' });
          KIT.unit(G, { id: c.r[0], x: 0, y: 22, s: ssr ? 0.42 : 0.4, mode: 'idle', mt: 0 }, G.t);
          G.text(c.r[2].split(' ')[1] || c.r[2], 0, 42, { size: 12, color: '#3b2415' });
        }
        ctx.restore();
      }
    },
    debug: () => ({ summoned: K.summoned, opened: K.opened, ssr: K.ssr }),
    tapAt() {
      if (!K.summoned) return [180, BTN.y + 31];
      const i = K.cards.findIndex((c) => !c.open); const r = cardRect(Math.max(0, i)); return [r.x + 28, r.y + 60];
    },
  };
})();
