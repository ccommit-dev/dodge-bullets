/* 비버 키우기 릴스 엔진 — 9:16 플레이어블 광고 공용 런타임 (2026-10-23).
 * window.RF_ART(그림) · window.RF_SCENE(시나리오)을 읽는다. 논리 화면 360x640.
 * 피드 약속(메이플 키우기 replayform 과 같다): 부모 -> {replayform: 'pause'|'resume'|'restart'|'mute'|'key'}, 자식 -> {source: 'replayform', event, data}
 *   event: ready · start · choice · climax · end · cta · replay · swipe · wheel · key
 * 2026-11-05 (사용자: "플레이어블이 아닌 릴스들 수정") — 장면이 스스로 깨 주지 않는다. 가만히 있으면 힌트만 뜨고 지거나 기다린다. 조작이 결과를 바꾼다.
 * 장면 약속: onTap(G,x,y) · onDrag(G,x,y)(누른 채 움직임) · onRelease(G,x,y) · canLose · bot(G) → { tap:[x,y] } | { drag:[x,y] } | { release:[x,y] } | null(검사용 플레이어).
 * 지면 G.lose(제목, [줄…]) — 끝 화면 큰 단추가 '다시 도전'. 이기면 G.finish(초).
 */
(() => {
'use strict';
const SCENE = window.RF_SCENE;
const ART = window.RF_ART || { sprites: {} };
const W = 360, H = 640;
const FONT = '"Jua","Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
const EMBEDDED = window.parent !== window;
const CTA_BTN = { x: 60, y: 470, w: 240, h: 58 };
const KEEP_BTN = { x: 90, y: 540, w: 180, h: 40 };
const REPLAY_BTN = { x: 125, y: 546, w: 110, h: 36 };
const MUTE_BTN = { x: 316, y: 10, w: 34, h: 30 };
const cv = document.createElement('canvas');
document.body.appendChild(cv);
const ctx = cv.getContext('2d');
let scale = 1, offX = 0, offY = 0;
function resize() {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const vw = window.innerWidth, vh = window.innerHeight;
  scale = Math.min(vw / W, vh / H);
  cv.style.width = W * scale + 'px'; cv.style.height = H * scale + 'px';
  offX = (vw - W * scale) / 2; offY = (vh - H * scale) / 2;
  cv.style.left = offX + 'px'; cv.style.top = offY + 'px';
  cv.width = Math.round(W * scale * dpr); cv.height = Math.round(H * scale * dpr);
  ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
}

// ── 그림 ──
const IMG = {};
const FLASH = (() => { const c = document.createElement('canvas'); return { c, x: c.getContext('2d') }; })();
let artReady = false;
function loadArt() {
  const keys = Object.keys(ART.sprites);
  return Promise.all(keys.map((k) => new Promise((res) => { const s = ART.sprites[k], im = new Image(); im.onload = () => { IMG[k] = { img: im, w: s.w, h: s.h }; res(); }; im.onerror = res; im.src = s.src; })))
    .then(() => { artReady = Object.keys(IMG).length === keys.length; });
}

// ── 소리 (짧은 합성음) ──
const SND = {
  ctx: null, out: null, muted: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended' && !paused) this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC(); this.out = this.ctx.createGain(); this.out.gain.value = this.muted ? 0 : 0.5; this.out.connect(this.ctx.destination);
  },
  setMuted(on) { this.muted = on; if (this.out) this.out.gain.value = on ? 0 : 0.5; },
  tone(f, d, type = 'square', vol = 0.18, slide = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f * slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + d + 0.02);
  },
  play(name) {
    const T = { tap: [[520, 0.06, 'square', 0.12, 0.7]], hit: [[180, 0.09, 'sawtooth', 0.16, 0.5]], merge: [[660, 0.08, 'triangle', 0.2], [990, 0.12, 'triangle', 0.18]],
      coin: [[1200, 0.06, 'square', 0.12], [1600, 0.1, 'square', 0.1]], bolt: [[90, 0.35, 'sawtooth', 0.3, 0.3], [1800, 0.08, 'square', 0.12, 0.2]],
      fail: [[300, 0.18, 'square', 0.16, 0.5]], win: [[523, 0.1, 'triangle', 0.2], [659, 0.1, 'triangle', 0.2], [784, 0.1, 'triangle', 0.2], [1046, 0.3, 'triangle', 0.22]],
      flip: [[880, 0.05, 'triangle', 0.14, 1.4]], stamp: [[140, 0.16, 'square', 0.28, 0.5], [520, 0.12, 'triangle', 0.2, 1.5]], legend: [[392, 0.14, 'triangle', 0.22], [523, 0.14, 'triangle', 0.22], [659, 0.14, 'triangle', 0.22], [784, 0.4, 'triangle', 0.24]] }[name] || [];
    T.forEach((a, i) => setTimeout(() => this.tone(...a), i * 90));
  },
};

// ── 상태 ──
let S, paused = !EMBEDDED ? false : true, lastInput = 0;
function reset() {
  S = { phase: 'intro', t: 0, pt: 0, endT: 0, floats: [], parts: [], pops: [], shakeT: 0, shakeA: 0, flashT: 0, flashC: '#fff', hint: null, caption: SCENE.caption0 || '', started: false, data: {},
    // 손맛 (2026-10-23, 사용자: "빈약해 보인다 — 이펙트 · 재미 포인트를 과장해도 좋으니") — 멈칫 · 확대 펀치 · 슬로 · 도장 글씨 · 동전 분수 · 꽃가루 · 빛살 · 집중선
    stop: 0, slowT: 0, punch: 0, stamps: [], coins: [], conf: [], raysT: 0, raysX: 180, raysY: 300, raysC: '#ffd23f', speedT: 0, lost: null,
    // 카메라 · 충격파 · 가장자리 빛 · 동전 비 (2026-11-05 사용자: "이펙트나 카메라 줌 및 콘텐츠는 조금 더 과장해도 괜찮아")
    cam: { z: 1, x: 180, y: 300, tz: 1, tx: 180, ty: 300, hold: 0 }, kx: 0, ky: 0, rings: [], vig: 0, vigC: '#ef4444', rainT: 0, later: [] };
  lastInput = 0;
  if (SCENE.init) SCENE.init(G);
}
const G = {
  W, H, FONT, ctx,
  get t() { return S.t; }, get pt() { return S.pt; }, get phase() { return S.phase; }, get d() { return S.data; },
  get idle() { return S.pt - lastInput; },
  img: (k) => IMG[k],
  /** 발밑 가운데(x, footY) 기준으로 그린다. o: { s, flip, alpha, rot, ax, ay, tint } */
  sprite(k, x, y, o = {}) {
    const im = IMG[k]; if (!im) return;
    const s = o.s ?? 1, w = im.w * s * (o.sx ?? 1), h = im.h * s * (o.sy ?? 1);
    ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    if (o.flip) ctx.scale(-1, 1);
    ctx.drawImage(im.img, -w * (o.ax ?? 0.5), -h * (o.ay ?? 1), w, h);
    // 피격 번쩍임 — 그림 모양 그대로만(따로 그린 판에 색을 입혀 얹는다). 화면에 바로 source-atop 하면 네모 상자가 보였다
    if (o.flashA) {
      const fc = FLASH.c, fx = FLASH.x;
      if (fc.width !== im.w || fc.height !== im.h) { fc.width = im.w; fc.height = im.h; }
      fx.globalCompositeOperation = 'source-over'; fx.clearRect(0, 0, im.w, im.h); fx.drawImage(im.img, 0, 0, im.w, im.h);
      fx.globalCompositeOperation = 'source-atop'; fx.fillStyle = o.flashC || '#fff'; fx.fillRect(0, 0, im.w, im.h);
      ctx.globalAlpha = (o.alpha ?? 1) * Math.min(1, o.flashA);
      ctx.drawImage(fc, -w * (o.ax ?? 0.5), -h * (o.ay ?? 1), w, h);
    }
    ctx.restore();
  },
  /** 시간으로 칸 고르기 */
  frame(prefix, frames, fps, t) { const n = frames.length; return `${prefix}:${frames[Math.floor(t * fps) % n]}`; },
  once(prefix, frames, dur, t) { const i = Math.min(frames.length - 1, Math.floor((t / dur) * frames.length)); return `${prefix}:${frames[Math.max(0, i)]}`; },
  bg(k, y = 56, h = 404) { const im = IMG[k]; if (im) ctx.drawImage(im.img, 0, y, W, h); },
  rr(x, y, w, h, r, fill, stroke, lw = 3) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
  },
  text(s, x, y, o = {}) {
    ctx.save(); ctx.font = `${o.weight || 900} ${o.size || 18}px ${FONT}`; ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o.sw || 5; ctx.strokeStyle = o.stroke; ctx.strokeText(s, x, y); }
    ctx.fillStyle = o.color || '#fff'; ctx.fillText(s, x, y); ctx.restore();
  },
  bar(x, y, w, h, r, fg, bg = 'rgba(0,0,0,.45)') { G.rr(x, y, w, h, h / 2, bg, '#2a1606', 2); if (r > 0) G.rr(x + 2, y + 2, Math.max(h - 4, (w - 4) * Math.min(1, r)), h - 4, (h - 4) / 2, fg); },
  float(s, x, y, color = '#fff', size = 22, life = 0.9) { S.floats.push({ s, x, y, color, size, t: 0, life }); },
  burst(x, y, color = '#ffd23f', n = 14, sp = 160) { const N = Math.min(120, Math.round(n * 1.7)), V = sp * 1.25; for (let i = 0; i < N; i++) { const a = Math.random() * Math.PI * 2, v = V * (0.4 + Math.random()); S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t: 0, life: 0.55 + Math.random() * 0.5, c: i % 5 === 0 ? '#fff' : color, r: 2.5 + Math.random() * 4 }); } if (S.parts.length > 520) S.parts.splice(0, S.parts.length - 520); },
  shake(a = 6, d = 0.25) { S.shakeA = Math.max(S.shakeT > 0 ? S.shakeA : 0, a * 1.4); S.shakeT = Math.max(S.shakeT, d); },
  flash(c = '#fff', d = 0.18) { S.flashC = c; S.flashT = d; },
  pop(kicker, title, detail = '', tone = 'gold', life = 2.2) { S.pops = [{ kicker, title, detail, tone, t: 0, life }]; },
  caption(s) { S.caption = s; },
  hint(x, y) { S.hint = x == null ? null : { x, y }; },
  sfx: (n) => SND.play(n),
  emit,
  /** 처음 손대거나 장면이 진행되면 'start' 한 번 */
  started() { if (!S.started) { S.started = true; emit('start'); } },
  climax() {
    if (S.phase !== 'play') return;
    S.phase = 'climax'; S.pt2 = 0; emit('climax');
    // 절정은 늘 크게: 슬로 · 펀치 · 빛살 · 꽃가루 · 장면이 준 도장 글씨
    const cx = SCENE.raysAt ? SCENE.raysAt[0] : 180, cy = SCENE.raysAt ? SCENE.raysAt[1] : 300;
    G.slow(0.95); G.punch(0.16); G.rays(cx, cy, 2.6); G.confetti(130); G.zoom(1.34, cx, cy, 1.05); G.flash('#fff', 0.16); G.speed(1.3); G.vignette('#ffd23f', 0.6); G.coinRain(1.9); G.shake(12, 0.5);
    [0, 0.16, 0.34].forEach((d, i) => G.after(d, () => G.ring(cx, cy, i === 1 ? '#ffd23f' : '#fff', 200 + i * 70, 0.55)));
    if (SCENE.climaxStamp) G.stamp(SCENE.climaxStamp, SCENE.climaxColor || '#ffd23f', SCENE.stampY || 340, 1.4);
  },
  /** 멈칫(히트스톱) — 장면 시간만 잠깐 멈춘다 */
  hitstop(sec = 0.07) { S.stop = Math.max(S.stop, sec); },
  /** 슬로 모션 — sec 동안 장면 시간 0.35배 */
  slow(sec = 0.6) { S.slowT = Math.max(S.slowT, sec); },
  /** 화면 확대 펀치 */
  punch(a = 0.06) { S.punch = Math.max(S.punch, a); },
  /** 큰 도장 글씨 — 기울어져 쾅 찍힌다 */
  stamp(text, color = '#ffd23f', y = 250, life = 1.1) { S.stamps.push({ text, color, y, t: 0, life, rot: (Math.random() - 0.5) * 0.3 }); SND.play('stamp'); G.ring(180, y, color, 170); G.kick(0, 7); },
  /** 동전 분수 */
  coins(x, y, n = 10) { const N = Math.round(n * 1.6); if (S.coins.length > 240) S.coins.splice(0, S.coins.length - 240); for (let i = 0; i < N; i++) S.coins.push({ x, y, vx: (Math.random() - 0.5) * 260, vy: -220 - Math.random() * 260, t: 0, life: 1 + Math.random() * 0.4, spin: Math.random() * 6 }); if (n) SND.play('coin'); },
  /** 꽃가루 */
  confetti(n = 50) { const C = ['#ffd23f', '#ff5d8f', '#4fb0ff', '#7ee081', '#c084fc', '#ff8a1f']; for (let i = 0; i < n; i++) S.conf.push({ x: Math.random() * 360, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 60, vy: 120 + Math.random() * 160, r: Math.random() * 6, vr: (Math.random() - 0.5) * 10, c: C[i % C.length], w: 5 + Math.random() * 5, h: 8 + Math.random() * 6, t: 0 }); },
  /** 빛살 — (x, y) 둘레를 돈다 */
  rays(x = 180, y = 300, sec = 1.6, c = '#ffd23f') { S.raysX = x; S.raysY = y; S.raysT = Math.max(S.raysT, sec); S.raysC = c; },
  /** 집중선 */
  speed(sec = 0.8) { S.speedT = Math.max(S.speedT, sec); },
  /** 큰 한 방 묶음 — 멈칫 + 펀치 + 흔들 + 번쩍 */
  impact(power = 1, x = 180, y = 260) { G.hitstop(0.06 + 0.06 * power); G.punch(0.05 + 0.05 * power); G.shake(6 + 7 * power, 0.28 + 0.12 * power); G.ring(x, y, '#fff', 90 + 70 * power); G.speed(0.2 + 0.2 * power); if (power >= 1.5) { G.flash('#fff', 0.1); G.zoom(1.14, x, y, 0.22); } },
  /** 카메라 — z 배로 (x, y) 를 당겼다가 hold 초 뒤 돌아온다. 플레이 중엔 눌렀을 때 좌표가 어긋나지 않게 1.16 까지만 */
  zoom(z = 1.2, x = 180, y = 300, hold = 0.5) { const c = S.cam; c.tz = S.phase === 'play' && !S.finishAt ? Math.min(1.16, z) : z; c.tx = x; c.ty = y; c.hold = hold; },
  /** 충격파 고리 */
  ring(x, y, color = '#fff', r = 120, life = 0.38) { S.rings.push({ x, y, color, r, life, t: 0 }); if (S.rings.length > 24) S.rings.shift(); },
  /** 카메라 툭 밀기 */
  kick(dx = 0, dy = 5) { S.kx += dx; S.ky += dy; },
  /** 화면 가장자리 빛 — 위험 · 절정 */
  vignette(color = '#ef4444', a = 0.5) { S.vigC = color; S.vig = Math.max(S.vig, a); },
  /** 동전 비 */
  coinRain(sec = 1.6) { S.rainT = Math.max(S.rainT, sec); },
  /** sec 초 뒤 fn */
  after(sec, fn) { S.later.push({ at: S.t + sec, fn }); },
  /** 맞을 때 작은 불꽃 */
  spark(x, y, color = '#fff') { for (let i = 0; i < 7; i++) { const a = Math.random() * Math.PI * 2, v = 180 * (0.5 + Math.random()); S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: 0, life: 0.28 + Math.random() * 0.2, c: i % 2 ? color : '#ffd23f', r: 2 + Math.random() * 2.5 }); } G.ring(x, y, color, 52, 0.22); G.kick((Math.random() - 0.5) * 4, 2.5); },
  finish(delay = 1.6) { if (S.phase !== 'end' && !S.finishAt) S.finishAt = S.t + delay; },
  /** 패배 — 곧 끝 화면으로. 큰 단추가 '다시 도전' 이 된다 */
  lose(title = '아깝다!', lines = [], delay = 1.1) { if (S.phase === 'end' || S.finishAt) return; S.lost = { title, lines }; S.finishAt = S.t + delay; S.hint = null; SND.play('fail'); G.shake(10, 0.4); G.flash('#7f1d1d', 0.22); G.zoom(1.18, 180, 300, 1.2); G.vignette('#b91c1c', 0.85); G.slow(0.5); emit('lose'); },
  /** 승패가 정해져 끝을 기다리는 중 — 장면은 더 진행하지 않는다 */
  get over() { return !!S.finishAt || S.phase === 'end'; },
  get lost() { return !!S.lost; },
};
window.G = G;

function emit(name, data) {
  (window.__rfEvents || (window.__rfEvents = [])).push({ event: name, data: data || null, t: Math.round(performance.now()) });
  if (EMBEDDED) window.parent.postMessage({ source: 'replayform', event: name, data: data || null }, '*');
}

// ── 갱신 ──
function update(dt) {
  S.t += dt;
  if (S.phase === 'intro') { if (S.t > (SCENE.introDur || 1.5)) { S.phase = 'play'; S.pt = 0; G.started(); } }
  else if (S.phase !== 'end') S.pt += dt;
  if (S.phase === 'end') S.endT += dt;
  if (S.finishAt && S.t >= S.finishAt && S.phase !== 'end') { S.phase = 'end'; S.endT = 0; S.finishAt = 0; S.hint = null; emit('end', { won: !S.lost }); if (!S.lost) { SND.play('win'); G.confetti(60); } }
  // 장면 시간: 멈칫이면 0 · 슬로면 0.35배
  let sdt = dt;
  if (S.stop > 0) { S.stop -= dt; sdt = 0; } else if (S.slowT > 0) { S.slowT -= dt; sdt = dt * 0.35; }
  if (S.phase !== 'end' && SCENE.update && sdt > 0) SCENE.update(G, sdt);
  S.punch = Math.max(0, S.punch - dt * 0.6);
  // 카메라: 인트로는 당겼다 빠지고(1.28 → 1), 이후엔 hold 뒤 제자리로
  { const c = S.cam, introT = SCENE.introDur || 1.5;
    if (S.phase === 'intro') { const k = Math.min(1, S.t / introT); c.z = 1 + 0.28 * (1 - k) * (1 - k); c.tz = 1; c.x = c.tx = 180; c.y = c.ty = 300; }
    else { if (c.hold > 0) { c.hold -= dt; if (c.hold <= 0) c.tz = 1; } const e = Math.min(1, dt * (c.tz > c.z ? 13 : 5)); c.z += (c.tz - c.z) * e; c.x += (c.tx - c.x) * e; c.y += (c.ty - c.y) * e; } }
  S.kx *= Math.pow(0.0015, dt); S.ky *= Math.pow(0.0015, dt);
  for (const r of S.rings) r.t += dt; S.rings = S.rings.filter((r) => r.t < r.life);
  S.vig = Math.max(0, S.vig - dt * 0.8);
  if (S.rainT > 0) { S.rainT -= dt; if (S.coins.length < 240) for (let i = 0; i < 2; i++) S.coins.push({ x: Math.random() * 360, y: -14, vx: (Math.random() - 0.5) * 40, vy: 160 + Math.random() * 240, t: 0, life: 1.5, spin: Math.random() * 6 }); }
  if (S.later.length) { const due = S.later.filter((l) => S.t >= l.at); S.later = S.later.filter((l) => S.t < l.at); for (const l of due) l.fn(); }
  for (const st of S.stamps) st.t += dt; S.stamps = S.stamps.filter((st) => st.t < st.life);
  for (const c of S.coins) { c.t += dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 640 * dt; c.spin += dt * 12; } S.coins = S.coins.filter((c) => c.t < c.life);
  for (const c of S.conf) { c.t += dt; c.x += c.vx * dt + Math.sin(c.t * 4 + c.r) * 0.6; c.y += c.vy * dt; c.r += c.vr * dt; } S.conf = S.conf.filter((c) => c.y < 680);
  S.raysT = Math.max(0, S.raysT - dt); S.speedT = Math.max(0, S.speedT - dt);
  for (const f of S.floats) f.t += dt; S.floats = S.floats.filter((f) => f.t < f.life);
  for (const p of S.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; } S.parts = S.parts.filter((p) => p.t < p.life);
  for (const p of S.pops) p.t += dt; S.pops = S.pops.filter((p) => p.t < p.life);
  S.shakeT = Math.max(0, S.shakeT - dt); S.flashT = Math.max(0, S.flashT - dt);
}

// ── 그리기 ──
function render() {
  ctx.save();
  ctx.fillStyle = '#1b120b'; ctx.fillRect(0, 0, W, H);
  if (S.shakeT > 0) ctx.translate((Math.random() - 0.5) * S.shakeA * 2, (Math.random() - 0.5) * S.shakeA * 2);
  if (S.punch > 0) { const k = 1 + S.punch; ctx.translate(180, 300); ctx.scale(k, k); ctx.translate(-180, -300); }
  { const c = S.cam, k = Math.max(c.z, 1 + (Math.abs(S.kx) + Math.abs(S.ky)) / 150); if (k > 1.001) { ctx.translate(c.x, c.y); ctx.scale(k, k); ctx.translate(-c.x, -c.y); } if (S.kx || S.ky) ctx.translate(S.kx, S.ky); }
  if (SCENE.draw) SCENE.draw(G, ctx);
  if (S.raysT > 0) {   // 빛살 — 더하기 합성으로 빛나게
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, S.raysT) * 0.32; ctx.translate(S.raysX, S.raysY); ctx.rotate(S.t * 0.8);
    for (let i = 0; i < 14; i++) { ctx.rotate(Math.PI / 7); ctx.fillStyle = S.raysC; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-26, -520); ctx.lineTo(26, -520); ctx.fill(); }
    ctx.restore();
  }
  if (S.speedT > 0) {   // 집중선
    ctx.save(); ctx.globalAlpha = Math.min(1, S.speedT * 1.5) * 0.55; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round';
    for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2 + S.t * 3, r0 = 150 + ((i * 37 + S.t * 900) % 120), r1 = r0 + 90; ctx.lineWidth = 2 + (i % 3); ctx.beginPath(); ctx.moveTo(180 + Math.cos(a) * r0, 300 + Math.sin(a) * r0 * 1.4); ctx.lineTo(180 + Math.cos(a) * r1, 300 + Math.sin(a) * r1 * 1.4); ctx.stroke(); }
    ctx.restore();
  }
  for (const r of S.rings) {   // 충격파
    const k = r.t / r.life, e = 1 - (1 - k) * (1 - k);
    ctx.save(); ctx.globalAlpha = (1 - k) * 0.9; ctx.strokeStyle = r.color; ctx.lineWidth = Math.max(1, 12 * (1 - k)); ctx.beginPath(); ctx.arc(r.x, r.y, 8 + r.r * e, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  for (const c of S.coins) {   // 동전 — 돌며 반짝
    const sx = Math.abs(Math.cos(c.spin)) * 0.8 + 0.2, a = c.t > c.life - 0.25 ? (c.life - c.t) / 0.25 : 1;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(c.x, c.y); ctx.scale(sx, 1);
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#a86b06'; ctx.stroke();
    ctx.beginPath(); ctx.arc(-2, -3, 3, 0, Math.PI * 2); ctx.fillStyle = '#fff7cf'; ctx.fill(); ctx.restore();
  }
  for (const p of S.parts) { ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  for (const f of S.floats) {
    const k = f.t / f.life, big = f.size >= 24;
    // 큰 숫자(치명)는 1.7배로 튀어나왔다 줄고 살짝 기운다 · 작은 숫자는 옆으로 퍼진다
    const pop = 1.18 * (big ? (k < 0.12 ? 0.6 + k * 10 : k < 0.25 ? 1.8 - (k - 0.12) * 6 : 1) : (k < 0.15 ? 0.7 + k * 2 : 1));
    ctx.save(); ctx.translate(f.x + (big ? 0 : Math.sin(f.t * 9) * 2), f.y - k * (big ? 30 : 52)); if (big) ctx.rotate(-0.08);
    G.text(f.s, 0, 0, { size: f.size * pop, color: f.color, stroke: '#2a1606', sw: big ? 8 : 5, alpha: k > 0.7 ? (1 - k) / 0.3 : 1 });
    ctx.restore();
  }
  ctx.restore();
  for (const c of S.conf) { ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r); ctx.fillStyle = c.c; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h * Math.abs(Math.cos(c.r * 1.3))); ctx.restore(); }
  for (const st of S.stamps) {   // 도장 — 2.6배에서 쾅 · 흔들 · 사라짐
    const k = st.t / st.life, sc = k < 0.12 ? 3.2 - (k / 0.12) * 2.2 : 1 + Math.sin(st.t * 20) * 0.02, a = k > 0.8 ? (1 - k) / 0.2 : Math.min(1, k * 10);
    ctx.save(); ctx.font = `900 58px ${FONT}`; const fit = Math.min(1, 336 / Math.max(1, ctx.measureText(st.text).width)); ctx.restore();   // 길면 화면에 맞춘다
    ctx.save(); ctx.globalAlpha = a; ctx.translate(180, st.y); ctx.rotate(st.rot); ctx.scale(sc * fit, sc * fit);
    G.text(st.text, 0, 0, { size: 58, color: st.color, stroke: '#2a1606', sw: 13 });
    ctx.restore();
  }
  if (S.vig > 0.01) {   // 가장자리 빛
    const g = ctx.createRadialGradient(180, 320, 170, 180, 320, 420); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, S.vigC);
    ctx.save(); ctx.globalAlpha = Math.min(1, S.vig); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  drawHud();
  for (const p of S.pops) drawPop(p);
  if (S.hint && S.phase === 'play') drawHint(S.hint);
  if (S.flashT > 0) { ctx.globalAlpha = Math.min(0.85, S.flashT * 5); ctx.fillStyle = S.flashC; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  if (S.phase === 'intro') drawIntro();
  if (S.phase === 'end') drawEnd();
  if (!artReady) G.text('불러오는 중…', W / 2, H / 2, { size: 16, color: '#ffd23f' });
}
function drawHud() {
  // 위: 브랜드 칩 + 소리 단추
  G.rr(10, 10, 148, 30, 15, 'rgba(27,18,11,.78)', '#ffd23f', 2);
  G.sprite('logo', 26, 37, { s: 0.2 });
  G.text('비버 키우기', 96, 25, { size: 15, color: '#ffe08a' });
  G.rr(MUTE_BTN.x, MUTE_BTN.y, MUTE_BTN.w, MUTE_BTN.h, 10, 'rgba(27,18,11,.78)');
  G.text(SND.muted ? '🔇' : '🔊', MUTE_BTN.x + 17, MUTE_BTN.y + 16, { size: 15 });
  // 아래: 자막 판
  if (S.phase !== 'end' && S.caption) {
    G.rr(16, 586, 328, 42, 14, 'rgba(27,18,11,.86)', '#ffd23f', 2);
    G.text(S.caption, 180, 607, { size: 17, color: '#fff3d0' });
  }
}
function drawPop(p) {
  const k = Math.min(1, p.t / 0.25), out = p.t > p.life - 0.3 ? (p.life - p.t) / 0.3 : 1;
  const sc = 0.8 + 0.2 * (k < 1 ? k * (2 - k) * 1.1 : 1);
  ctx.save(); ctx.globalAlpha = out; ctx.translate(180, SCENE.popY || 168); ctx.scale(sc, sc);
  const fill = p.tone === 'green' ? '#e3f7e9' : p.tone === 'pink' ? '#ffd9e4' : p.tone === 'purple' ? '#efe3ff' : '#ffe7a3';
  G.rr(-140, -50, 280, 100, 18, fill, '#3b2415', 4);
  G.text(p.kicker, 0, -26, { size: 14, color: p.tone === 'green' ? '#15803d' : p.tone === 'pink' ? '#be123c' : p.tone === 'purple' ? '#7c3aed' : '#92400e' });
  G.text(p.title, 0, 2, { size: 24, color: '#3b2415' });
  if (p.detail) G.text(p.detail, 0, 30, { size: 14, color: '#6b4a2f' });
  ctx.restore();
}
function drawHint(h) {
  const k = (Math.sin(S.t * 8) + 1) / 2;
  ctx.save(); ctx.globalAlpha = 0.95;
  ctx.beginPath(); ctx.arc(h.x, h.y, 18 + k * 10, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.stroke();
  G.text('👆', h.x + 14, h.y + 26 + k * 6, { size: 34 });
  ctx.restore();
}
function drawIntro() {
  const k = Math.min(1, S.t / 0.35), out = S.t > (SCENE.introDur || 1.5) - 0.3 ? Math.max(0, ((SCENE.introDur || 1.5) - S.t) / 0.3) : 1;
  ctx.save(); ctx.globalAlpha = 0.55 * out; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = out;
  { const sl = k < 1 ? 2.1 - k * 1.1 : 1 + Math.sin(S.t * 9) * 0.012; ctx.translate(180, 300); ctx.scale(sl, sl); }
  const lines = SCENE.hook || [];
  lines.forEach((l, i) => {   // 길면 화면 폭에 맞춘다 — 끝 글자가 잘렸다
    const size = i === lines.length - 1 ? 40 : 32;
    ctx.save(); ctx.font = `900 ${size}px ${FONT}`; const fit = Math.min(1, 326 / Math.max(1, ctx.measureText(l).width)); ctx.restore();
    ctx.save(); ctx.translate(0, (i - (lines.length - 1) / 2) * 48); ctx.scale(fit, fit);
    G.text(l, 0, 0, { size, color: i === lines.length - 1 ? '#ffd23f' : '#fff', stroke: '#2a1606', sw: 9 });
    ctx.restore();
  });
  ctx.restore();
}
function drawEnd() {
  const k = Math.min(1, S.endT / 0.4);
  ctx.save(); ctx.globalAlpha = 0.78 * k; ctx.fillStyle = '#120b06'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = k;
  const b = (S.endT < 0.35 ? 0.4 + (S.endT / 0.35) * 0.75 : 1.15 - Math.min(0.15, (S.endT - 0.35) * 0.6)) + Math.sin(S.endT * 4) * 0.04;
  ctx.save(); ctx.translate(180, 180); ctx.scale(b, b); G.sprite('logo', 0, 64, { s: 1 }); ctx.restore();
  G.text('비버 키우기', 180, 286, { size: 34, color: '#ffd23f', stroke: '#2a1606', sw: 7 });
  if (S.lost) G.text(S.lost.title, 180, 322, { size: 28, color: '#fca5a5', stroke: '#2a1606', sw: 6 });
  (S.lost ? S.lost.lines : SCENE.endLines || []).forEach((l, i) => G.text(l, 180, (S.lost ? 366 : 334) + i * 30, { size: i === 0 ? 20 : 17, color: i === 0 ? '#fff' : '#f5d9a8' }));
  const pulse = 1 + Math.sin(S.endT * 6) * 0.04;
  ctx.save(); ctx.translate(180, CTA_BTN.y + CTA_BTN.h / 2); ctx.scale(pulse, pulse);
  G.rr(-CTA_BTN.w / 2, -CTA_BTN.h / 2, CTA_BTN.w, CTA_BTN.h, 18, '#ff8a1f', '#3b2415', 4);
  G.text(S.lost ? '↻ 다시 도전' : '지금 플레이  ›', 0, 2, { size: 24, color: '#1b1206' });
  ctx.restore();
  const low = S.lost ? KEEP_BTN : REPLAY_BTN;
  G.rr(low.x, low.y, low.w, low.h, 12, 'rgba(255,255,255,.12)', 'rgba(255,255,255,.4)', 2);
  G.text(S.lost ? '게임에서 해 보기  ›' : '↻ 다시 하기', 180, low.y + low.h / 2, { size: 15, color: '#fff' });
  ctx.restore();
}

// ── 입력 ──
const inRect = (p, r, pad = 0) => p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
const toLogical = (e) => ({ x: (e.clientX - offX) / scale, y: (e.clientY - offY) / scale });
let gesture = null;
cv.addEventListener('pointerdown', (e) => {
  e.preventDefault(); SND.init();
  const p = toLogical(e);
  gesture = { x: e.clientX, y: e.clientY, t: performance.now(), handled: false };
  if (inRect(p, MUTE_BTN, 4)) { SND.setMuted(!SND.muted); gesture.handled = true; return; }
  if (S.phase === 'end') {
    gesture.handled = true;
    if (S.endT < 0.5) return;
    if (S.lost) { if (inRect(p, CTA_BTN, 6)) { emit('replay'); reset(); return; } if (inRect(p, KEEP_BTN, 8)) openStore(); return; }
    if (inRect(p, CTA_BTN, 6)) { openStore(); return; }
    if (inRect(p, REPLAY_BTN, 8)) { emit('replay'); reset(); return; }
    return;
  }
  if (S.phase === 'intro') { S.phase = 'play'; S.pt = 0; }
  if (S.phase !== 'play') return;
  lastInput = S.pt; G.started();
  if (SCENE.onTap) { const used = SCENE.onTap(G, p.x, p.y); gesture.handled = used !== false; }
});
window.addEventListener('pointermove', (e) => {
  if (!gesture || S.phase !== 'play' || !SCENE.onDrag) return;
  const p = toLogical(e); lastInput = S.pt; if (SCENE.onDrag(G, p.x, p.y) !== false) gesture.handled = true;
});
window.addEventListener('pointerup', (e) => {
  const g = gesture; gesture = null;
  if (g && S.phase === 'play' && SCENE.onRelease) { const p = toLogical(e); SCENE.onRelease(G, p.x, p.y); }
  if (!g || g.handled) return;
  const dy = e.clientY - g.y, dx = e.clientX - g.x;
  if (Math.abs(dy) > 70 && Math.abs(dy) > 2 * Math.abs(dx) && performance.now() - g.t < 600) emit('swipe', { dir: dy < 0 ? 'next' : 'prev' });
});
window.addEventListener('wheel', (e) => { if (EMBEDDED) emit('wheel', { dy: e.deltaY }); }, { passive: true });
window.addEventListener('keydown', (e) => {
  if (EMBEDDED && /^(ArrowUp|ArrowDown|PageUp|PageDown)$/.test(e.key)) { emit('key', { key: e.key }); return; }
  keyPress(e.key);
});
function keyPress(key) {
  if (key !== ' ' && key !== 'Control' && key !== 'z' && key !== 'Z') return;
  SND.init();
  if (S.phase === 'intro') { S.phase = 'play'; S.pt = 0; }
  if (S.phase !== 'play' || !SCENE.onKey) return;
  lastInput = S.pt; G.started(); SCENE.onKey(G, key);
}
window.addEventListener('message', (e) => {
  const d = e.data; if (!d || typeof d.replayform !== 'string') return;
  if (d.replayform === 'pause') { paused = true; if (SND.ctx) SND.ctx.suspend(); }
  else if (d.replayform === 'resume') { paused = false; last = performance.now(); if (SND.ctx) SND.ctx.resume(); }
  else if (d.replayform === 'restart') { reset(); paused = false; last = performance.now(); }
  else if (d.replayform === 'mute') SND.setMuted(!!d.on);
  else if (d.replayform === 'key' && d.type !== 'up' && typeof d.key === 'string') keyPress(d.key);
});
document.addEventListener('visibilitychange', () => { if (SND.ctx) { if (document.hidden) SND.ctx.suspend(); else if (!paused) SND.ctx.resume(); } });
function openStore() {
  emit('cta');
  const url = SCENE.ctaUrl || 'https://ccommit-dev.github.io/dodge-bullets/';
  try { if (window.mraid && typeof window.mraid.open === 'function') { window.mraid.open(url); return; } } catch (err) { /* 아래로 */ }
  window.open(url, '_blank', 'noopener');
}

// ── 검사용 ──
window.__rf = {
  scene: SCENE.id,
  state: () => Object.assign({ paused, embedded: EMBEDDED, phase: S.phase, t: +S.t.toFixed(2), pt: +S.pt.toFixed(2), endT: +S.endT.toFixed(2), started: S.started, art: artReady, lost: !!S.lost }, SCENE.debug ? SCENE.debug(G) : {}),
  step: (sec) => { for (let i = 0, n = Math.round(sec * 60); i < n; i++) update(1 / 60); render(); return window.__rf.state(); },
  tap: (x, y) => { if (S.phase === 'intro') { S.phase = 'play'; S.pt = 0; } lastInput = S.pt; G.started(); return SCENE.onTap ? SCENE.onTap(G, x, y) : null; },
  drag: (x, y) => { lastInput = S.pt; return SCENE.onDrag ? SCENE.onDrag(G, x, y) : null; },
  release: (x, y) => { lastInput = S.pt; return SCENE.onRelease ? SCENE.onRelease(G, x, y) : null; },
  restart: () => reset(),
};

reset(); resize();
window.addEventListener('resize', resize);
let last = performance.now();
function frame(now) { const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; if (!paused) update(dt); render(); requestAnimationFrame(frame); }
loadArt().then(() => { last = performance.now(); requestAnimationFrame(frame); emit('ready'); if (!EMBEDDED) paused = false; });
})();
