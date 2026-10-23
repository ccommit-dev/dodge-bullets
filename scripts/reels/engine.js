/* 비버 키우기 릴스 엔진 — 9:16 플레이어블 광고 공용 런타임 (2026-10-23).
 * window.RF_ART(그림) · window.RF_SCENE(시나리오)을 읽는다. 논리 화면 360x640.
 * 피드 약속(메이플 키우기 replayform 과 같다): 부모 -> {replayform: 'pause'|'resume'|'restart'|'mute'|'key'}, 자식 -> {source: 'replayform', event, data}
 *   event: ready · start · choice · climax · end · cta · replay · swipe · wheel · key
 * 손대지 않으면(2초 남짓) 장면이 스스로 진행한다 — 피드에서 그냥 보고 넘겨도 끝 화면까지 간다. 손가락 힌트가 뜬다.
 */
(() => {
'use strict';
const SCENE = window.RF_SCENE;
const ART = window.RF_ART || { sprites: {} };
const W = 360, H = 640;
const FONT = '"Jua","Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
const EMBEDDED = window.parent !== window;
const CTA_BTN = { x: 60, y: 470, w: 240, h: 58 };
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
      flip: [[880, 0.05, 'triangle', 0.14, 1.4]], legend: [[392, 0.14, 'triangle', 0.22], [523, 0.14, 'triangle', 0.22], [659, 0.14, 'triangle', 0.22], [784, 0.4, 'triangle', 0.24]] }[name] || [];
    T.forEach((a, i) => setTimeout(() => this.tone(...a), i * 90));
  },
};

// ── 상태 ──
let S, paused = !EMBEDDED ? false : true, lastInput = 0;
function reset() {
  S = { phase: 'intro', t: 0, pt: 0, endT: 0, floats: [], parts: [], pops: [], shakeT: 0, shakeA: 0, flashT: 0, flashC: '#fff', hint: null, caption: SCENE.caption0 || '', started: false, data: {} };
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
  burst(x, y, color = '#ffd23f', n = 14, sp = 160) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = sp * (0.4 + Math.random()); S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t: 0, life: 0.5 + Math.random() * 0.4, c: color, r: 2 + Math.random() * 3 }); } },
  shake(a = 6, d = 0.25) { S.shakeA = a; S.shakeT = d; },
  flash(c = '#fff', d = 0.18) { S.flashC = c; S.flashT = d; },
  pop(kicker, title, detail = '', tone = 'gold', life = 2.2) { S.pops = [{ kicker, title, detail, tone, t: 0, life }]; },
  caption(s) { S.caption = s; },
  hint(x, y) { S.hint = x == null ? null : { x, y }; },
  sfx: (n) => SND.play(n),
  emit,
  /** 처음 손대거나 장면이 진행되면 'start' 한 번 */
  started() { if (!S.started) { S.started = true; emit('start'); } },
  climax() { if (S.phase === 'play') { S.phase = 'climax'; S.pt2 = 0; emit('climax'); } },
  finish(delay = 1.6) { if (S.phase !== 'end' && !S.finishAt) S.finishAt = S.t + delay; },
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
  if (S.finishAt && S.t >= S.finishAt && S.phase !== 'end') { S.phase = 'end'; S.endT = 0; S.finishAt = 0; S.hint = null; emit('end'); SND.play('win'); }
  if (S.phase !== 'end' && SCENE.update) SCENE.update(G, dt);
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
  if (SCENE.draw) SCENE.draw(G, ctx);
  for (const p of S.parts) { ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  for (const f of S.floats) { const k = f.t / f.life; G.text(f.s, f.x, f.y - k * 46, { size: f.size * (k < 0.15 ? 0.7 + k * 2 : 1), color: f.color, stroke: '#2a1606', sw: 5, alpha: k > 0.7 ? (1 - k) / 0.3 : 1 }); }
  ctx.restore();
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
  ctx.translate(180, 300); ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
  const lines = SCENE.hook || [];
  lines.forEach((l, i) => G.text(l, 0, (i - (lines.length - 1) / 2) * 46, { size: i === lines.length - 1 ? 38 : 30, color: i === lines.length - 1 ? '#ffd23f' : '#fff', stroke: '#2a1606', sw: 8 }));
  ctx.restore();
}
function drawEnd() {
  const k = Math.min(1, S.endT / 0.4);
  ctx.save(); ctx.globalAlpha = 0.78 * k; ctx.fillStyle = '#120b06'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = k;
  const b = 1 + Math.sin(S.endT * 3) * 0.03;
  ctx.save(); ctx.translate(180, 180); ctx.scale(b, b); G.sprite('logo', 0, 64, { s: 1 }); ctx.restore();
  G.text('비버 키우기', 180, 286, { size: 34, color: '#ffd23f', stroke: '#2a1606', sw: 7 });
  (SCENE.endLines || []).forEach((l, i) => G.text(l, 180, 334 + i * 30, { size: i === 0 ? 22 : 17, color: i === 0 ? '#fff' : '#f5d9a8' }));
  const pulse = 1 + Math.sin(S.endT * 6) * 0.04;
  ctx.save(); ctx.translate(180, CTA_BTN.y + CTA_BTN.h / 2); ctx.scale(pulse, pulse);
  G.rr(-CTA_BTN.w / 2, -CTA_BTN.h / 2, CTA_BTN.w, CTA_BTN.h, 18, '#ff8a1f', '#3b2415', 4);
  G.text('지금 플레이  ›', 0, 2, { size: 24, color: '#1b1206' });
  ctx.restore();
  G.rr(REPLAY_BTN.x, REPLAY_BTN.y, REPLAY_BTN.w, REPLAY_BTN.h, 12, 'rgba(255,255,255,.12)', 'rgba(255,255,255,.4)', 2);
  G.text('↻ 다시 보기', 180, REPLAY_BTN.y + 18, { size: 15, color: '#fff' });
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
    if (inRect(p, CTA_BTN, 6)) { openStore(); return; }
    if (inRect(p, REPLAY_BTN, 8)) { emit('replay'); reset(); return; }
    return;
  }
  if (S.phase === 'intro') { S.phase = 'play'; S.pt = 0; }
  if (S.phase !== 'play') return;
  lastInput = S.pt; G.started();
  if (SCENE.onTap) { const used = SCENE.onTap(G, p.x, p.y); gesture.handled = used !== false; }
});
window.addEventListener('pointerup', (e) => {
  const g = gesture; gesture = null;
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
  state: () => Object.assign({ paused, embedded: EMBEDDED, phase: S.phase, t: +S.t.toFixed(2), pt: +S.pt.toFixed(2), endT: +S.endT.toFixed(2), started: S.started, art: artReady }, SCENE.debug ? SCENE.debug(G) : {}),
  step: (sec) => { for (let i = 0, n = Math.round(sec * 60); i < n; i++) update(1 / 60); render(); return window.__rf.state(); },
  tap: (x, y) => { if (S.phase === 'intro') { S.phase = 'play'; S.pt = 0; } lastInput = S.pt; G.started(); return SCENE.onTap ? SCENE.onTap(G, x, y) : null; },
  restart: () => reset(),
};

reset(); resize();
window.addEventListener('resize', resize);
let last = performance.now();
function frame(now) { const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; if (!paused) update(dt); render(); requestAnimationFrame(frame); }
loadArt().then(() => { last = performance.now(); requestAnimationFrame(frame); emit('ready'); if (!EMBEDDED) paused = false; });
})();
