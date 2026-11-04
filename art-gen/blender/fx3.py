"""등급별 시전 폭발 (2026-11-04, 사용자: "동료 · 스킬 · 유물 등급별 차이점을 모르겠어 · 실제 동작 스킬 이펙트도 훨씬 화려하게").
blender -b -P art-gen/blender/fx3.py -- [tier-r tier-sr tier-ssr tier-ur tier-lr]   → art-gen/out/b3d-fx/<name>/f<i>.png (512², 6칸)
→ node scripts/assemble-fx.mjs tier-  → public/titans/fx/tier-<t>.webp (칸 384, 전장 폭만큼 크게 그려서 256 이면 흐렸다)
등급이 오를수록 층이 는다. 색 하나만 바꾸면 "더 큰 같은 폭발"이라 등급이 안 읽혔다:
  r   파란 고리 하나 + 불티 8           sr  보라 이중 고리 + 큰 네모 별 6
  ssr 금 햇살 12줄 + 고리 + 파편        ur  진홍 불꽃 꽃잎 10 + 이중 충격파 + 금 파편
  lr  무지개 햇살 18줄 + 무지개 고리 3겹 + 도는 별 8 + 하얀 심
일반(N)은 시트 없이 CSS 작은 고리만 쓴다."""
import bpy
import sys
import os
import math
import random

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fx as F
from fx2 import needle, chunk, flash

N = F.N
RAINBOW = ['#5eead4', '#60a5fa', '#a78bfa', '#f0abfc', '#fde047', '#4ade80']


def ring(name, r, w, color, f, strength=4.0):
    if f <= 0.02:
        return
    F.disc_ring(name + 'i', r - w - 0.012, r + w + 0.012, F.ink_mat(), y=0.02, fade=f)
    F.disc_ring(name, r - w, r + w, F.emit_mat(name, color, strength, f), y=0.01)


def ray(name, ang, r0, r1, w, color, f, strength=4.5):
    """가운데서 뻗는 빛줄기 — 바깥으로 갈수록 가늘어지는 긴 바늘"""
    if f <= 0.02 or r1 <= r0:
        return
    mid = (r0 + r1) / 2
    needle(name, mid * math.cos(ang), mid * math.sin(ang), ang, r1 - r0, w, F.emit_mat(name, color, strength, f), y=0.03, fade=f)


def build_r(_, i):
    t = (i + 1) / N
    rnd = random.Random(11)
    fade = 1.0 if t < 0.5 else max(0.0, 1 - (t - 0.5) / 0.55)
    if i == 0:
        flash('fl', 0.36, '#f0f9ff', '#38bdf8', points=6)
    ring('r0', 0.2 + 0.6 * F.ease_out(t, 2), 0.022 * (1.15 - t), '#38bdf8', fade)
    for k in range(8):
        ang = 2 * math.pi * k / 8 + rnd.uniform(-0.2, 0.2)
        d = 0.15 + 0.7 * F.ease_out(t, 2)
        L = 0.22 * (1 - t * 0.7)
        if L > 0.02 and fade > 0.02:
            needle(f'n{k}', d * math.cos(ang), d * math.sin(ang), ang, L, 0.024, F.emit_mat('rn', '#e0f2fe', 5.0, fade), y=0.0, fade=fade)


def build_sr(_, i):
    t = (i + 1) / N
    fade = 1.0 if t < 0.55 else max(0.0, 1 - (t - 0.55) / 0.5)
    if i <= 1:
        flash('fl', 0.5 - 0.12 * i, '#f5f3ff', '#a855f7', points=8)
    ring('r0', 0.22 + 0.66 * F.ease_out(t, 2), 0.03 * (1.15 - t), '#a855f7', fade)
    ring('r1', 0.1 + 0.5 * F.ease_out(t, 1.5), 0.016 * (1.2 - t), '#e9d5ff', fade)
    for k in range(6):   # 튀어나가는 큰 네모 별
        ang = 2 * math.pi * k / 6 + t * 1.2
        d = 0.2 + 0.56 * F.ease_out(t, 2)
        s = 0.16 * (1 - t * 0.5)
        if fade > 0.02:
            F.star(f's{k}i', d * math.cos(ang), d * math.sin(ang), s + 0.024, F.ink_mat(), points=4, inner=0.3, rot=t * 2 + k, y=0.015, fade=fade)
            F.star(f's{k}', d * math.cos(ang), d * math.sin(ang), s, F.emit_mat('st', '#d8b4fe', 4.5, fade), points=4, inner=0.3, rot=t * 2 + k, y=0.005, fade=fade)


def build_ssr(_, i):
    t = (i + 1) / N
    rnd = random.Random(23)
    fade = 1.0 if t < 0.6 else max(0.0, 1 - (t - 0.6) / 0.45)
    if i <= 2:
        flash('fl', 0.72 - 0.16 * i, '#fffbeb', '#f59e0b', points=10, rot=0.4 * i)
    for k in range(12):   # 금 햇살
        ang = 2 * math.pi * k / 12 + 0.15 * t
        long = 0.95 if k % 2 == 0 else 0.68
        ray(f'ry{k}', ang, 0.12 + 0.22 * t, (0.34 + long * F.ease_out(t, 2)) * 0.96, 0.05 * (1.1 - t), '#fbbf24', fade)
    ring('r0', 0.26 + 0.7 * F.ease_out(t, 2), 0.034 * (1.1 - t), '#fde68a', fade)
    for k in range(12):   # 금 파편
        ang = rnd.uniform(0, 2 * math.pi)
        d = 0.2 + 0.72 * F.ease_out(t, 2) * rnd.uniform(0.75, 1.1)
        if fade > 0.02:
            chunk(f'c{k}', d * math.cos(ang), d * math.sin(ang) - t * t * 0.22, 0.05 * rnd.uniform(0.7, 1.3), t * 3 + k, F.emit_mat('ch', '#fcd34d', 3.5, fade), fade=fade, seed=k)


def build_ur(_, i):
    t = (i + 1) / N
    rnd = random.Random(37)
    fade = 1.0 if t < 0.62 else max(0.0, 1 - (t - 0.62) / 0.42)
    if i <= 2:
        flash('fl', 0.86 - 0.2 * i, '#fff1f2', '#e11d48', points=12, rot=0.35 * i)
    for k in range(10):   # 불꽃 꽃잎 — 바깥으로 벌어지며 타오른다
        ang = 2 * math.pi * k / 10 + 0.4 * t
        d = 0.18 + 0.42 * F.ease_out(t, 2)
        h = (0.34 + 0.34 * F.ease_out(t, 1.5)) * (1 - t * 0.35)
        if fade > 0.02:
            F.flame(f'pt{k}', d * math.cos(ang), d * math.sin(ang), h, h * 0.42, ang - math.pi / 2, F.emit_mat('pt', '#fb7185' if k % 2 else '#f43f5e', 4.0, fade), y=0.02, fade=fade)
    ring('r0', 0.24 + 0.78 * F.ease_out(t, 2), 0.04 * (1.1 - t), '#fb7185', fade)
    if i >= 1:
        ring('r1', 0.12 + 0.72 * F.ease_out((i - 1) / (N - 1), 2), 0.026 * (1.1 - t), '#fde68a', fade)
    for k in range(16):
        ang = rnd.uniform(0, 2 * math.pi)
        d = 0.2 + 0.8 * F.ease_out(t, 2) * rnd.uniform(0.7, 1.1)
        if fade > 0.02:
            if k % 2:
                chunk(f'c{k}', d * math.cos(ang), d * math.sin(ang) - t * t * 0.25, 0.055 * rnd.uniform(0.7, 1.3), t * 4 + k, F.emit_mat('ch', '#fde047', 3.5, fade), fade=fade, seed=k)
            else:
                L = 0.26 * (1 - t * 0.6)
                needle(f'n{k}', d * math.cos(ang), d * math.sin(ang), ang, L, 0.03, F.emit_mat('nd', '#fff1f2', 5.5, fade), y=0.0, fade=fade)


def build_lr(_, i):
    t = (i + 1) / N
    fade = 1.0 if t < 0.66 else max(0.0, 1 - (t - 0.66) / 0.38)
    if i <= 3:
        flash('fl', 0.96 - 0.2 * i, '#ffffff', RAINBOW[i % 6], points=14, rot=0.3 * i)
    for k in range(18):   # 무지개 햇살
        ang = 2 * math.pi * k / 18 + 0.35 * t
        long = 1.02 if k % 3 == 0 else (0.82 if k % 3 == 1 else 0.62)
        ray(f'ry{k}', ang, 0.1 + 0.2 * t, (0.34 + long * F.ease_out(t, 2)) * 0.92, 0.05 * (1.15 - t), RAINBOW[k % 6], fade, 5.0)
    for j, c in enumerate(('#5eead4', '#a78bfa', '#fde047')):   # 고리 세 겹이 차례로
        if i >= j:
            ring(f'r{j}', 0.16 + 0.8 * F.ease_out((i - j + 1) / (N - j), 2), 0.03 * (1.15 - t), c, fade, 5.0)
    for k in range(8):   # 도는 별
        ang = 2 * math.pi * k / 8 + t * 2.6
        d = 0.26 + 0.5 * F.ease_out(t, 1.6)
        s = 0.15 * (1 - t * 0.45)
        if fade > 0.02:
            F.star(f's{k}i', d * math.cos(ang), d * math.sin(ang), s + 0.024, F.ink_mat(), points=4, inner=0.28, rot=t * 3 + k, y=0.015, fade=fade)
            F.star(f's{k}', d * math.cos(ang), d * math.sin(ang), s, F.emit_mat('st', RAINBOW[k % 6], 5.0, fade), points=4, inner=0.28, rot=t * 3 + k, y=0.005, fade=fade)


BUILDERS = {'r': build_r, 'sr': build_sr, 'ssr': build_ssr, 'ur': build_ur, 'lr': build_lr}

if __name__ == "__main__":
    F.setup_scene(samples=int(os.environ.get("FX_SAMPLES", "16")))
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    for nm in (argv or [f"tier-{k}" for k in BUILDERS]):
        F.render(nm, BUILDERS[nm.split("-", 1)[1]], nm.split("-", 1)[1])
