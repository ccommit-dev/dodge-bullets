import { useEffect, useRef } from "react";

/**
 * 뽑기 빛·폭죽 (2026-10-16, 사용자: "가챠 이펙트 원복하고 원래 내용에 조금 더 화려하게 — 폭죽이라던지 조명 연산 이펙트").
 * 원래 마법진·빛줄기(App.css .gacha-summon-circle · .gacha-burst · .gacha-rays) 뒤에 캔버스 한 장을 덧댄다.
 * 가산 합성('lighter') — 빛이 겹칠수록 밝아지고, 터질 때마다 그 둘레를 밝히는 "조명"(큰 방사형 빛)이 퍼졌다 사라진다.
 *   summon : 테두리에서 빛 알갱이가 소용돌이치며 가운데로 모이고, 가운데 빛이 맥박치다 끝에 번쩍
 *   reveal : 번쩍(화면 꽃빛) → 충격파 고리 → 폭죽(아래에서 쏘아 올려 터지고 · 중력 · 꼬리 · 반짝임). SSR 은 금빛 버들 폭죽·무지개
 * 등급색 R 하늘 · SR 보라·분홍 · SSR 금+무지개, 폭죽 수 R 3 · SR 6 · SSR 11. 정해진 시간 뒤 멈춘다(배터리). 움직임 줄이기면 빛 한 번만.
 */
// 6등급 (2026-10-27, "레벨에 따라 리소스 · 스킬 애니메이션도 현질 유도하게 화려하게") — 신화 진홍+금 · 초월 무지개+청록, 폭죽 16 · 22
type Tier = "N" | "R" | "SR" | "SSR" | "UR" | "LR";
const PALETTE: Record<Tier, string[]> = {
  N: ["#e2e8f0", "#cbd5e1", "#f8fafc"],
  R: ["#7dd3fc", "#38bdf8", "#e0f2fe", "#a5f3fc"],
  SR: ["#c084fc", "#f0abfc", "#a78bfa", "#fbcfe8", "#e9d5ff"],
  SSR: ["#fde047", "#facc15", "#fb923c", "#f472b6", "#60a5fa", "#4ade80", "#fff7ae"],
  UR: ["#fb7185", "#f43f5e", "#fde047", "#fbbf24", "#fff1f2", "#fecdd3"],
  LR: ["#5eead4", "#22d3ee", "#a78bfa", "#f0abfc", "#fde047", "#4ade80", "#ffffff", "#60a5fa", "#fb7185"],
};
const CORE: Record<Tier, string> = { N: "#94a3b8", R: "#38bdf8", SR: "#a855f7", SSR: "#fbbf24", UR: "#f43f5e", LR: "#2dd4bf" };
const ROCKETS: Record<Tier, number> = { N: 2, R: 3, SR: 6, SSR: 11, UR: 16, LR: 22 };

type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; s: number; drag: number; g: number; tw: number; px: number; py: number };
type Rocket = { x: number; y: number; vx: number; vy: number; ty: number; c: string; at: number; big: boolean; willow: boolean };
type Light = { x: number; y: number; r: number; life: number; max: number; c: string; a: number };
type Ring = { x: number; y: number; life: number; max: number; c: string; r: number };

const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
};

export function GachaFx({ tier, phase }: { tier: Tier; phase: "summon" | "reveal" }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    const fit = () => { const r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    fit();
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const pal = PALETTE[tier], core = CORE[tier];
    const pick = () => pal[(Math.random() * pal.length) | 0];
    const sparks: Spark[] = [], rockets: Rocket[] = [], lights: Light[] = [], rings: Ring[] = [];
    const cx = () => W / 2, cy = () => H * (phase === "summon" ? 0.5 : 0.42);
    const top = tier === "SSR" || tier === "UR" || tier === "LR";
    const END = reduce ? 0.6 : phase === "summon" ? 1.35 : tier === "LR" ? 8 : tier === "UR" ? 7 : top ? 6 : 4.5;

    // 소환: 빛 알갱이 — 각도·반지름·각속도
    const motes = phase === "summon" ? Array.from({ length: tier === "LR" ? 200 : tier === "UR" ? 160 : tier === "SSR" ? 120 : tier === "SR" ? 90 : 64 }, () => ({ a: Math.random() * Math.PI * 2, r0: 0.45 + Math.random() * 0.35, w: 1.6 + Math.random() * 1.8, c: pick(), s: 1.2 + Math.random() * 2.2, d: Math.random() * 0.35 })) : [];

    const burst = (x: number, y: number, c: string, big: boolean, willow: boolean) => {
      const n = (big ? 110 : 70) + ((Math.random() * 20) | 0);
      const sp = (big ? 260 : 190) * (0.85 + Math.random() * 0.3);
      for (let k = 0; k < n; k += 1) {
        const a = (k / n) * Math.PI * 2 + Math.random() * 0.12;
        const v = sp * (0.35 + Math.random() * 0.65);
        const col = Math.random() < 0.7 ? c : pick();
        sparks.push({ x, y, px: x, py: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: willow ? 1.9 + Math.random() * 0.6 : 0.9 + Math.random() * 0.6, c: willow ? "#fde68a" : col, s: willow ? 1.6 : 1.4 + Math.random() * 1.4, drag: willow ? 1.6 : 2.4, g: willow ? 150 : 95, tw: Math.random() < (top ? 0.45 : 0.25) ? 8 + Math.random() * 10 : 0 });
      }
      lights.push({ x, y, r: Math.min(W, H) * (big ? 0.85 : 0.6), life: 0, max: 0.75, c, a: big ? 0.5 : 0.36 });
      rings.push({ x, y, life: 0, max: 0.45, c, r: big ? 120 : 80 });
    };

    if (phase === "reveal") {
      // 번쩍 + 충격파 + 화면 꽃빛
      lights.push({ x: cx(), y: cy(), r: Math.max(W, H) * 1.1, life: 0, max: 0.55, c: "#ffffff", a: 0.85 });
      lights.push({ x: cx(), y: cy(), r: Math.max(W, H) * 0.9, life: 0, max: 1.1, c: core, a: 0.55 });
      rings.push({ x: cx(), y: cy(), life: 0, max: 0.7, c: core, r: Math.max(W, H) * 0.7 });
      if (!reduce) {
        const n = ROCKETS[tier];
        for (let k = 0; k < n; k += 1) {
          const x = W * (0.12 + ((k * 0.618) % 1) * 0.76);
          rockets.push({ x, y: H + 10, vx: (Math.random() - 0.5) * 40, vy: -(H * 0.95 + Math.random() * H * 0.25), ty: H * (0.1 + Math.random() * 0.32), c: pick(), at: 0.12 + k * (tier === "LR" ? 0.28 : tier === "UR" ? 0.34 : top ? 0.42 : 0.5) + Math.random() * 0.15, big: top ? k % 2 === 0 : k % 3 === 0, willow: top && k % 4 === 1 });
        }
      }
    }

    let t = 0, last = performance.now(), raf = 0, flashed = false;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";

      if (phase === "summon") {
        const k = Math.min(1, t / 1.15), ease = k * k * (3 - 2 * k);
        // 가운데 빛 — 모일수록 커지고 맥박친다
        const pulse = 0.75 + 0.25 * Math.sin(t * 18);
        const cr = Math.min(W, H) * (0.08 + 0.22 * ease) * pulse;
        const g = ctx.createRadialGradient(cx(), cy(), 0, cx(), cy(), cr * 2.4);
        g.addColorStop(0, hexA("#ffffff", 0.75 * ease + 0.15)); g.addColorStop(0.25, hexA(core, 0.55 * ease + 0.1)); g.addColorStop(1, hexA(core, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx(), cy(), cr * 2.4, 0, Math.PI * 2); ctx.fill();
        // 소용돌이 알갱이 + 꼬리
        for (const m of motes) {
          const mk = Math.max(0, Math.min(1, (t - m.d) / (1.15 - m.d)));
          const r = Math.min(W, H) * m.r0 * (1 - mk * mk);
          const a = m.a + m.w * t * (1 + mk * 2);
          const x = cx() + Math.cos(a) * r, y = cy() + Math.sin(a) * r * 0.82;
          const ta = a - 0.25, tr = r * 1.06;
          ctx.strokeStyle = hexA(m.c, 0.35 * (1 - mk * 0.5)); ctx.lineWidth = m.s * 0.8; ctx.beginPath(); ctx.moveTo(cx() + Math.cos(ta) * tr, cy() + Math.sin(ta) * tr * 0.82); ctx.lineTo(x, y); ctx.stroke();
          ctx.fillStyle = hexA(m.c, 0.9); ctx.beginPath(); ctx.arc(x, y, m.s, 0, Math.PI * 2); ctx.fill();
        }
        if (t > 1.1 && !flashed) { flashed = true; lights.push({ x: cx(), y: cy(), r: Math.max(W, H), life: 0, max: 0.3, c: "#ffffff", a: 0.7 }); }
      }

      // 폭죽 로켓
      for (const r of rockets) {
        if (t < r.at || r.y <= r.ty) continue;
        // 결과 화면에선 올라가는 꼬리 선 없이 그 높이에서 바로 터진다 — 카드 뒤로 가는 가는 선이 깨진 화면처럼 보였다(2026-10-23 아이폰 캡처)
        if (phase === "reveal") { burst(r.x, r.ty, r.c, r.big, r.willow); r.y = r.ty - 1; continue; }
        const pY = r.y, pX = r.x;
        r.x += r.vx * dt; r.y += r.vy * dt; r.vy *= 0.985;
        ctx.strokeStyle = hexA(r.c, 0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pX, pY + 16); ctx.lineTo(r.x, r.y); ctx.stroke();
        ctx.fillStyle = hexA("#ffffff", 0.95); ctx.beginPath(); ctx.arc(r.x, r.y, 2.2, 0, Math.PI * 2); ctx.fill();
        // 느려져 멈춘 로켓은 그 자리에서 터뜨리고 끝낸다 — 목표 높이에 못 닿으면 같은 자리에 꼬리 선이 계속 남았다(2026-10-23 아이폰 캡처)
        if (r.y <= r.ty || r.vy > -60) { burst(r.x, r.y, r.c, r.big, r.willow); r.y = r.ty - 1; }
      }
      // 조명 — 터진 자리 둘레를 밝혔다 사라지는 큰 방사형 빛
      for (let i = lights.length - 1; i >= 0; i -= 1) {
        const L = lights[i]; L.life += dt; const k = L.life / L.max;
        if (k >= 1) { lights.splice(i, 1); continue; }
        const a = L.a * (1 - k) * (1 - k);
        const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r * (0.6 + 0.4 * k));
        g.addColorStop(0, hexA(L.c, a)); g.addColorStop(0.35, hexA(L.c, a * 0.45)); g.addColorStop(1, hexA(L.c, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      // 충격파 고리
      for (let i = rings.length - 1; i >= 0; i -= 1) {
        const R = rings[i]; R.life += dt; const k = R.life / R.max;
        if (k >= 1) { rings.splice(i, 1); continue; }
        ctx.strokeStyle = hexA(R.c, 0.7 * (1 - k)); ctx.lineWidth = 6 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(R.x, R.y, R.r * (0.15 + 0.85 * Math.sqrt(k)), 0, Math.PI * 2); ctx.stroke();
      }
      // 불꽃 알갱이 — 공기 저항 · 중력 · 꼬리 · 반짝임
      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const s = sparks[i]; s.life += dt; const k = s.life / s.max;
        if (k >= 1) { sparks.splice(i, 1); continue; }
        s.px = s.x; s.py = s.y;
        const d = Math.exp(-s.drag * dt); s.vx *= d; s.vy = s.vy * d + s.g * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        const tw = s.tw ? 0.45 + 0.55 * Math.abs(Math.sin(s.life * s.tw)) : 1;
        const a = (1 - k) * tw;
        ctx.strokeStyle = hexA(s.c, 0.55 * a); ctx.lineWidth = s.s; ctx.beginPath(); ctx.moveTo(s.px - s.vx * dt * 2, s.py - s.vy * dt * 2); ctx.lineTo(s.x, s.y); ctx.stroke();
        ctx.fillStyle = hexA(s.c, 0.22 * a); ctx.beginPath(); ctx.arc(s.x, s.y, s.s * 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = hexA("#ffffff", 0.85 * a); ctx.beginPath(); ctx.arc(s.x, s.y, s.s * 0.7, 0, Math.PI * 2); ctx.fill();
      }
      if (t < END || sparks.length || lights.length) raf = requestAnimationFrame(frame);
      else { ctx.globalCompositeOperation = "source-over"; ctx.clearRect(0, 0, W, H); }
    };
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", fit);
    // 정리할 때 판도 지운다 — 멈춘 마지막 칸(날던 로켓 꼬리)이 결과 화면에 계속 남았다(2026-10-23 아이폰 캡처)
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", fit); ctx.globalCompositeOperation = "source-over"; ctx.clearRect(0, 0, cv.width, cv.height); };
  }, [tier, phase]);
  return <canvas ref={ref} className={`gacha-fx gacha-fx-${phase} tier-${tier.toLowerCase()}`} aria-hidden="true" />;
}
