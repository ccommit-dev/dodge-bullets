/* 릴스 4 · 첫 10연 전설 확정 — 소환 단추 → 손가락으로 쓸면 지나간 카드가 뒤집힌다 → 아홉 장이 열리면 남은 한 장이 빛난다 → 문질러(또는 여러 번 탭) 게이지를 채우면 전설 아리.
 * 어느 카드를 남겨도 그 카드가 전설이다(titans/gacha.ts pullTen firstTen · 마지막 뽑기에서 전설 확정, FIRST_TEN_SSR). 질 수 없는 편 — 6초 손을 안 대면 짧은 연출로 끝까지 간다 */
window.RF_SCENE = (() => {
  // titans/allies.ts · allyRoster.ts 등급 — N 일반 · R 희귀 · SR 영웅 · SSR 전설. N 은 릴스 그림 묶음에 그림이 없어 무기 표시만 그린다
  const TOTO = ['toto', 'N', '견습 토토'], KIKI = ['kiki', 'N', '새총 키키'], MOMO = ['momo', 'N', '약초꾼 모모'], BOBO = ['bobo', 'N', '나무꾼 보보'];
  const MIA = ['mia', 'R', '스카우트 미아'], LEON = ['leon', 'R', '궁수 레온'], SERA = ['sera', 'SR', '마법사 세라'], GAREN = ['garen', 'SR', '기사 가렌'];
  const ARI = ['ari', 'SSR', '용기사 아리'];
  const ORDER = [TOTO, MIA, KIKI, LEON, MOMO, MIA, SERA, BOBO, LEON];   // 뒤집는 순서대로 나온다 — 뽑기 Lv1 확률(N 50 · R 35 · SR 12.68, titans/summonLevel.ts)에 가깝게 N 4 · R 4 · SR 1
  const RC = { N: '#cbd5e1', R: '#7dd3fc', SR: '#c4b5fd', SSR: '#fcd34d' };   // summonLevel.ts TIER_COLOR
  const BTN = { x: 60, y: 482, w: 240, h: 62 };
  const SUM = 1.1, IDLE_END = 6, RUB_PX = 1100, RUB_TAP = 0.08, CHARGE = 0.7;
  const cardRect = (i) => ({ x: 13 + (i % 5) * 68, y: 104 + Math.floor(i / 5) * 164, w: 62, h: 152 });
  const cardAt = (x, y, pad = 0) => { for (let i = 0; i < 10; i++) { const r = cardRect(i); if (x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad) return i; } return -1; };
  let K;
  function summon(G, tapped) {
    if (K.summoned) return;
    K.summoned = true; K.sumT = 0; G.sfx('merge'); G.caption('손가락으로 쓸어서 뒤집어요');
    if (tapped) G.emit('choice', { summon: 'ten' });
  }
  function flip(G, i) {
    const c = K.cards[i];
    if (c.open || K.opened >= 9) return;
    c.r = ORDER[K.opened]; c.open = true; c.ft = 0; K.opened += 1;
    const r = cardRect(i);
    G.sfx('flip');
    G.ring(r.x + r.w / 2, r.y + r.h / 2, RC[c.r[1]], 60, 0.26);
    if (c.r[1] === 'SR') { G.punch(0.03); G.float('SR!', r.x + r.w / 2, r.y + 20, '#c4b5fd', 34, 0.8); G.burst(r.x + r.w / 2, r.y + r.h / 2, '#c4b5fd', 22, 220); G.zoom(1.07, r.x + r.w / 2, r.y + r.h / 2, 0.16); G.flash('#c4b5fd', 0.08); }
    if (K.opened < 9) G.caption(`${10 - K.opened}장 남음 — 전설은 어디에?`);
    else { K.last = K.cards.findIndex((x) => !x.open); K.q = []; G.sfx('legend'); G.flash('#fff3a0', 0.1); G.caption('마지막 한 장 — 문질러요!'); }
  }
  function reveal(G, quick) {
    if (K.ssr >= 0) return;
    K.ssr = K.last; const c = K.cards[K.ssr], r = cardRect(K.ssr);
    c.r = ARI; c.open = true; c.ft = 0; K.opened = 10; K.rT = 0;
    G.sfx('legend'); G.caption('첫 10연은 전설 1명 확정!');
    if (quick) { G.pop('전설 SSR · 첫 10연 확정', '용기사 아리', '', 'gold', 1.3); G.finish(1.3); return; }
    G.flash('#fff', 0.38); G.impact(3, 180, 400); G.burst(r.x + r.w / 2, r.y + r.h / 2, '#ffd23f', 80, 360); G.climax(); G.zoom(1.22, 180, 460, 1.2); G.coinRain(2.4); G.vignette('#ffd23f', 1); G.speed(1.6);
    for (let i = 0; i < 6; i++) G.after(i * 0.13, () => { G.ring(180, 300 + i * 40, i % 2 ? '#fff' : '#ffd23f', 150 + i * 36, 0.45); G.burst(180, 420, '#fff3a0', 20, 280); G.kick((Math.random() - 0.5) * 8, 5); });
    G.pop('전설 SSR · 첫 10연 확정', '용기사 아리', '이번 판의 전설 · 새 동료 합류', 'gold', 3.8); G.finish(4);
  }
  function rub(G, amt) {
    if (K.charge > 0 || K.ssr >= 0) return;
    const before = K.rub; K.rub = Math.min(1, K.rub + amt);
    const r = cardRect(K.last), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    // 카드를 중심으로 당겨 문지르는 자리가 어긋나지 않는다
    if (Math.floor(before * 8) !== Math.floor(K.rub * 8)) { G.sfx('tap'); G.burst(cx, cy, '#ffd23f', 10 + K.rub * 16, 150 + K.rub * 120); G.punch(0.01); G.zoom(1.03 + K.rub * 0.1, cx, cy, 0.14); G.vignette('#ffd23f', 0.2 + K.rub * 0.6); G.ring(cx, cy, '#ffd23f', 70 + K.rub * 90, 0.28); }
    if (K.rub >= 1) { K.charge = CHARGE; G.sfx('bolt'); G.speed(CHARGE); G.caption('전설이 깨어난다…!'); G.zoom(1.16, cx, cy, CHARGE); G.shake(9, CHARGE); }
  }
  /** 손가락이 지나간 칸 — 빠르게 쓸어도 사이 칸을 건너뛰지 않게 잘게 나눠 본다 */
  function sweep(G, x, y) {
    const px = K.px ?? x, py = K.py ?? y, dist = Math.hypot(x - px, y - py);
    K.px = x; K.py = y;
    if (K.last >= 0) {
      if (cardAt(x, y, 14) === K.last && dist > 0) rub(G, Math.min(dist, 60) / RUB_PX);
      return;
    }
    const n = Math.max(1, Math.ceil(dist / 12));
    for (let s = 1; s <= n; s++) {
      const i = cardAt(px + ((x - px) * s) / n, py + ((y - py) * s) / n);
      if (i >= 0 && !K.cards[i].open && !K.q.includes(i)) K.q.push(i);
    }
  }
  return {
    id: 'first-ten',
    introDur: 1.5,
    hook: ['첫 10연차', '전설 확정'],
    climaxStamp: '전설!!', raysAt: [180, 420], stampY: 268,
    caption0: '10회 소환 단추를 눌러요',
    endLines: ['첫 10연은 전설 확정', '첫 출석 보석 1,000 · 10연 900'],
    init() {
      K = { summoned: false, sumT: 0, cards: [], opened: 0, last: -1, rub: 0, ssr: -1, q: [], qT: 0, px: null, py: null, quick: false, quickT: 0, rT: 0, charge: 0, botX: false };
      for (let i = 0; i < 10; i++) K.cards.push({ r: null, open: false, ft: 0 });
    },
    onTap(G, x, y) {
      if (G.phase !== 'play' || K.quick) return true;
      if (!K.summoned) {
        if (x >= BTN.x && x <= BTN.x + BTN.w && y >= BTN.y && y <= BTN.y + BTN.h) { summon(G, true); G.hint(null); return true; }
        return false;
      }
      if (K.sumT < SUM) return true;
      K.px = x; K.py = y;
      const i = cardAt(x, y);
      if (i < 0) return y > 96 && y < 440 ? true : false;
      G.hint(null);
      if (i === K.last) rub(G, RUB_TAP); else if (!K.cards[i].open && !K.q.includes(i)) K.q.push(i);
      return true;
    },
    onDrag(G, x, y) {
      if (G.phase !== 'play' || K.quick || !K.summoned) return false;
      if (K.sumT < SUM) return true;
      if (y < 96 || y > 440) { K.px = null; K.py = null; return false; }
      sweep(G, x, y); G.hint(null); return true;
    },
    onRelease() { K.px = null; K.py = null; },
    onKey(G) {
      if (K.quick) return;
      if (!K.summoned) { summon(G, true); return; }
      if (K.sumT < SUM) return;
      if (K.last >= 0) rub(G, RUB_TAP);
      else { const i = K.cards.findIndex((c) => !c.open); if (i >= 0) flip(G, i); }
    },
    update(G, dt) {
      if (K.summoned) K.sumT += dt;
      for (const c of K.cards) if (c.open) c.ft += dt;
      if (K.ssr >= 0) K.rT += dt;
      if (G.phase !== 'play' || G.over) return;
      // 손대지 않고 6초 — 짧은 연출로 끝까지 (전설은 첫 10연 확정이라 그대로 준다)
      if (!K.quick && G.idle > IDLE_END) { K.quick = true; K.q = []; G.hint(null); if (!K.summoned) { K.summoned = true; K.sumT = SUM; } }
      if (K.quick) {
        K.quickT -= dt;
        if (K.quickT > 0) return;
        K.quickT = 0.05;
        if (K.last >= 0) reveal(G, true);
        else { const i = K.cards.findIndex((c) => !c.open); if (i >= 0) flip(G, i); }
        return;
      }
      // 게이지가 찼다 — 잠깐 숨을 멈췄다가 전설
      if (K.charge > 0) { K.charge -= dt; G.hint(null); if (K.charge <= 0) reveal(G, false); return; }
      // 쓸어 지나간 카드가 도미노처럼 차례로 넘어간다
      K.qT -= dt;
      if (K.qT <= 0 && K.q.length && K.opened < 9) { K.qT = 0.14; flip(G, K.q.shift()); }
      // 손대지 않으면 힌트만
      if (G.idle > 1) {
        if (!K.summoned) G.hint(180, BTN.y + 31);
        else if (K.sumT >= SUM) {
          const i = K.last >= 0 ? K.last : K.cards.findIndex((c) => !c.open);
          if (i >= 0) { const r = cardRect(i); G.hint(r.x + r.w / 2 + (K.last >= 0 ? Math.sin(G.t * 7) * 14 : 0), r.y + r.h / 2); }
        }
      } else G.hint(null);
    },
    draw(G, ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, 640); g.addColorStop(0, '#2a1440'); g.addColorStop(1, '#120b1f');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 360, 640);
      // 빛살
      ctx.save(); ctx.translate(180, 270); ctx.rotate(G.t * 0.15);
      for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = K.ssr >= 0 ? 'rgba(255,210,63,.14)' : 'rgba(167,139,250,.07)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30, -420); ctx.lineTo(30, -420); ctx.fill(); }
      ctx.restore();
      if (!K.summoned) {
        const b = 1 + Math.sin(G.t * 4) * 0.04;
        G.text('동료 뽑기', 180, 110, { size: 26, color: '#fff', stroke: '#2a1640', sw: 6 });
        ctx.save(); ctx.translate(180, 290); ctx.scale(b, b);
        [LEON, SERA, GAREN].forEach((c, i) => KIT.unit(G, { id: c[0], x: (i - 1) * 90, y: 60, s: 0.9, mode: 'idle', mt: 0, phase: i * 0.3 }, G.t));
        ctx.restore();
        ctx.save(); ctx.translate(180, BTN.y + 31); ctx.scale(b, b);
        G.rr(-120, -31, 240, 62, 18, '#ffd23f', '#3b2415', 4);
        G.text('10회 소환', 0, -8, { size: 22, color: '#1b1206' });
        G.text('첫 10연 전설 확정 · 💎900', 0, 16, { size: 13, color: '#7c2d12' });
        ctx.restore();
        return;
      }
      // 소환진 → 카드
      if (K.sumT < SUM) {
        const k = K.sumT / SUM;
        ctx.save(); ctx.translate(180, 270); ctx.rotate(k * 6); ctx.strokeStyle = `rgba(255,210,63,${1 - k * 0.5})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, 40 + k * 120, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      G.text('첫 10연 · 전설 1명 확정', 180, 76, { size: 18, color: '#ffe08a', stroke: '#2a1640', sw: 5 });
      for (let i = 0; i < 10; i++) {
        const c = K.cards[i], r = cardRect(i), isLast = i === K.last && K.ssr < 0;
        const dk = Math.min(1, Math.max(0, (K.sumT - 0.6 - i * 0.05) / 0.25));
        if (dk <= 0) continue;
        const flipK = c.open ? Math.min(1, c.ft / 0.28) : 0;
        const sx = Math.abs(Math.cos(flipK * Math.PI)) || 0.02;
        const front = flipK >= 0.5;
        // 마지막 한 장 — 문지를수록 떨고 빛난다
        const wob = isLast ? Math.sin(G.t * 42) * (1.5 + K.rub * 5 + (K.charge > 0 ? 4 : 0)) : 0, grow = isLast ? 1.06 + K.rub * 0.1 + Math.sin(G.t * 6) * 0.02 : 1;
        if (isLast) {
          ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.rotate(G.t * 1.2); ctx.globalCompositeOperation = 'lighter';
          for (let n = 0; n < 8; n++) { ctx.rotate(Math.PI / 4); ctx.fillStyle = `rgba(255,210,63,${0.12 + K.rub * 0.3})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-13, -110 - K.rub * 50); ctx.lineTo(13, -110 - K.rub * 50); ctx.fill(); }
          ctx.restore();
        }
        // 전설이 나오면 빛기둥에 밀려 카드가 양옆으로 갈라진다
        const spread = K.ssr >= 0 && i !== K.ssr ? Math.min(1, K.rT / 0.3) * 62 * (r.x + r.w / 2 < 180 ? -1 : 1) : 0;
        ctx.save(); ctx.globalAlpha = dk * (K.ssr >= 0 && i !== K.ssr ? 0.45 : 1); ctx.translate(r.x + r.w / 2 + wob + spread, r.y + r.h / 2); ctx.scale(sx * (0.8 + 0.2 * dk) * grow, (0.8 + 0.2 * dk) * grow);
        if (!front) {
          if (isLast) { ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 16 + K.rub * 26; }
          G.rr(-r.w / 2, -r.h / 2, r.w, r.h, 10, isLast ? '#4c1d95' : '#1e1b4b', isLast ? '#ffd23f' : '#a78bfa', isLast ? 4 : 3);
          ctx.shadowBlur = 0;
          G.text(isLast ? '?' : '✦', 0, 2, { size: isLast ? 34 : 26, color: isLast ? '#ffd23f' : '#c4b5fd' });
        } else {
          const ssr = c.r[1] === 'SSR';
          if (ssr) { ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 24; }
          G.rr(-r.w / 2, -r.h / 2, r.w, r.h, 10, ssr ? '#fff3c4' : '#fff8ec', RC[c.r[1]], ssr ? 5 : 3);
          ctx.shadowBlur = 0;
          G.rr(-r.w / 2 + 4, -r.h / 2 + 5, 34, 18, 9, RC[c.r[1]]);
          G.text(c.r[1], -r.w / 2 + 21, -r.h / 2 + 14, { size: 13, color: '#1b1206' });
          if (c.r[3]) { ctx.beginPath(); ctx.arc(0, 2, 22, 0, Math.PI * 2); ctx.fillStyle = 'rgba(148,163,184,.25)'; ctx.fill(); G.text(c.r[3], 0, 3, { size: 24 }); }
          else KIT.unit(G, { id: c.r[0], x: 0, y: 30, s: ssr ? 0.34 : 0.38, mode: 'idle', mt: 0 }, G.t);
          G.text(c.r[2].split(' ')[1] || c.r[2], 0, 52, { size: 14, color: '#3b2415' });
        }
        ctx.restore();
      }
      // 아래 판 — 진행 · 게이지
      if (K.ssr < 0 && K.sumT >= SUM) {
        if (K.last >= 0) {
          G.text('문지르거나 여러 번 눌러요', 180, 462, { size: 17, color: '#ffe08a' });
          G.bar(50, 482, 260, 24, K.rub, '#ffd23f');
          G.text(`전설 깨우기 ${Math.round(K.rub * 100)}%`, 180, 494, { size: 13, color: '#fff', stroke: '#2a1606', sw: 4 });
        } else {
          G.text(`${K.opened} / 9 장 뒤집음`, 180, 462, { size: 17, color: '#ffe08a' });
          G.text('← 쓸거나 눌러서 뒤집기 →', 180, 494, { size: 15, color: '#c4b5fd', alpha: 0.75 + Math.sin(G.t * 5) * 0.25 });
        }
      }
      // 전설 등장
      if (K.ssr >= 0) {
        const k = Math.min(1, K.rT / 0.35), e = 1 - (1 - k) * (1 - k), r0 = cardRect(K.ssr), bx = r0.x + r0.w / 2 + (180 - r0.x - r0.w / 2) * Math.min(1, K.rT / 0.4);
        ctx.fillStyle = `rgba(10,6,20,${0.55 * k})`; ctx.fillRect(0, 0, 360, 640);
        // 빛기둥 — 전설 칸에서 터져 화면을 위아래로 가른다
        const w = 20 + Math.min(1, K.rT / 0.22) * 140 + Math.sin(G.t * 16) * 9, beam = ctx.createLinearGradient(bx - w, 0, bx + w, 0);
        beam.addColorStop(0, 'rgba(255,214,90,0)'); beam.addColorStop(0.5, 'rgba(255,240,170,.92)'); beam.addColorStop(1, 'rgba(255,214,90,0)');
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = beam; ctx.fillRect(bx - w, 0, w * 2, 640); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(bx - w * 0.1, 0, w * 0.2, 640); ctx.restore();
        // 아리 — 크게 쾅 내려앉는다
        KIT.unit(G, { id: 'ari', x: 180, y: 576, s: 3.1 - e * 1.5 + (k >= 1 ? Math.sin(G.t * 3) * 0.02 : 0), alpha: Math.min(1, K.rT / 0.1), mode: 'idle', mt: 0, flash: (1 - k) * 0.9, flashC: '#ffd23f' }, G.t);
      }
    },
    debug: () => ({ summoned: K.summoned, opened: K.opened, last: K.last, rub: +K.rub.toFixed(2), ssr: K.ssr, quick: K.quick }),
    bot(G) {
      if (G.phase !== 'play' || G.over) return null;
      if (!K.summoned) return { tap: [180, BTN.y + 31] };
      if (K.sumT < SUM) return null;
      if (K.charge > 0) return null;
      if (K.last >= 0) { const r = cardRect(K.last); K.botX = !K.botX; return { drag: [r.x + r.w / 2 + (K.botX ? 20 : -20), r.y + r.h / 2] }; }
      const i = K.cards.findIndex((c, n) => !c.open && !K.q.includes(n));
      if (i < 0) return null;
      const r = cardRect(i); return { drag: [r.x + r.w / 2, r.y + r.h / 2] };
    },
  };
})();
