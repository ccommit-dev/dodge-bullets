"""유물 · 결정 강화 트리 아이콘 (2026-10-26, 사용자: "오늘도 환생 2" 차용 — "리소스도 모두 현재 아트에 어색하지 않게 새로 생성").
장비 파츠(gear_icons.py)와 같은 그림체 — 각진 면 · 무광 · 잉크 외곽선 · 장난감 조명.
  blender -b -P art-gen/blender/relic_icons.py -- [relics|tree|<이름>…]   → art-gen/out/b3d-relics/<이름>.png (512² 투명)
조립: node scripts/assemble-relics.mjs (public/titans/relics/<이름>.png)
한 프로세스에 그림 여럿이 멈추면(로우 폴리 렌더) 이름 하나씩 따로 돌린다."""
import bpy
import sys
import os
import math
from mathutils import Vector, Euler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import bcommon as C
from lib.beaver import spline, interp

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTDIR = os.path.join(ROOT, 'art-gen', 'out', 'b3d-relics')
O = 0.022


def m(name, color, rough=0.75, metal=0.0, emit=None, es=0.0):
    return C.principled(f'relic_{name}_{color}_{metal}_{es}', color, rough=rough, metal=metal, coat=0.0, emit=emit, emit_strength=es)


def ob(name, bm, mat, outline=O):
    return C.mesh_obj(name, bm, mat, outline=outline)


def metal_m(c):
    return m('metal', c, rough=0.45, metal=0.55)


def glow(c, es=0.9):
    return m('glow', c, rough=0.3, emit=c, es=es)


def gem(name, c, at, r=0.07):
    saved = C.FACET
    C.FACET = 6
    ob(name, C.ellipsoid(at, (r, r * 0.6, r * 1.2)), m('gem', c, rough=0.25, emit=c, es=0.6), O * 0.5)
    C.FACET = saved


def flame(at, s=1.0, outer='#ff7a1a', inner='#ffd34d'):
    """작은 불꽃 — 바깥 주황 물방울 · 안 노랑"""
    ob('flame_o', C.ellipsoid(at, (0.16 * s, 0.1 * s, 0.26 * s), egg=0.55), glow(outer, 1.1))
    ob('flame_i', C.ellipsoid(at + Vector((0, -0.05 * s, -0.04 * s)), (0.08 * s, 0.06 * s, 0.15 * s), egg=0.5), glow(inner, 1.4), O * 0.5)


# ── 불 계열 ──
def ember_ring(_):
    ob('band', C.torus(Vector((0, 0, -0.18)), 0.42, 0.09, seg=14, ring=6, rot=Euler((math.radians(90), 0, 0))), metal_m('#e8b23a'))
    ob('seat', C.box(Vector((0, 0, 0.26)), (0.3, 0.2, 0.12)), metal_m('#c9893a'))
    gem('g', '#ff5a2a', Vector((0, -0.04, 0.38)), 0.13)
    flame(Vector((0, 0.02, 0.72)), 0.95)


def flame_feather(_):
    pts = spline([Vector((-0.3, 0, -0.75)), Vector((0.0, 0, -0.1)), Vector((0.12, 0, 0.45)), Vector((0.05, 0, 0.8))], 14)
    ob('quill', C.tube(pts, interp([0.03, 0.025, 0.02, 0.01], len(pts)), seg=6), m('quill', '#fff0d0'))
    vane = C.ellipsoid(Vector((0.04, 0.0, 0.2)), (0.26, 0.05, 0.62), egg=0.25, rot=Euler((0, math.radians(-12), 0)))
    ob('vane', vane, m('vane', '#e8452c'))
    ob('vane2', C.ellipsoid(Vector((0.08, -0.03, 0.42)), (0.17, 0.04, 0.36), egg=0.3, rot=Euler((0, math.radians(-12), 0))), m('vane2', '#ff9a2a'), O * 0.6)
    flame(Vector((0.12, -0.02, 0.86)), 0.7)


def lava_heart(_):
    for sx in (-1, 1):
        ob(f'lobe{sx}', C.ellipsoid(Vector((sx * 0.24, 0, 0.2)), (0.32, 0.26, 0.32)), m('rock', '#8a2a22'))
    ob('tip', C.cone(Vector((0, 0, -0.2)), 0.5, 0.02, 0.6, seg=8, rot=Euler((math.radians(180), 0, 0))), m('rock', '#8a2a22'))
    ob('core', C.ellipsoid(Vector((0, -0.2, 0.06)), (0.24, 0.1, 0.26), egg=-0.3), glow('#ff8a1f', 1.3), O * 0.6)
    flame(Vector((0, 0.02, 0.62)), 0.75)


# ── 서리 계열 ──
def frost_horn(_):
    pts = spline([Vector((-0.55, 0, -0.35)), Vector((-0.1, 0, -0.45)), Vector((0.35, 0, -0.1)), Vector((0.5, 0, 0.45))], 18)
    ob('horn', C.tube(pts, interp([0.06, 0.12, 0.2, 0.28], len(pts)), seg=10), m('ice', '#bfe8ff', rough=0.4))
    for k in (5, 10, 15):
        p = pts[k]
        ob(f'band{k}', C.tube([p + Vector((-0.02, 0, -0.02)), p + Vector((0.02, 0, 0.02))], [0.06, 0.12, 0.2, 0.28][min(3, k // 5)] + 0.035, seg=10), metal_m('#d4dde6'))
    ob('mouth', C.ellipsoid(pts[-1] + Vector((0, -0.02, 0.02)), (0.25, 0.25, 0.06)), glow('#7fd4ff', 0.8), O * 0.6)
    ob('tipcap', C.ellipsoid(pts[0], (0.08, 0.08, 0.08)), metal_m('#d4dde6'))


def snow_crystal(_):
    saved = C.FACET
    C.FACET = 6
    ice = m('flake', '#a8dcff', rough=0.35, emit='#7fd4ff', es=0.35)
    for k in range(6):
        a = math.pi / 2 + 2 * math.pi * k / 6
        d = Vector((math.cos(a), 0, math.sin(a)))
        ob(f'arm{k}', C.tube([d * 0.08, d * 0.72], [0.07, 0.04], seg=6), ice)
        for t, ln in ((0.38, 0.2), (0.58, 0.13)):
            base = d * t
            for sgn in (-1, 1):
                b = Euler((0, 0, 0))
                side = Vector((math.cos(a + sgn * 1.0), 0, math.sin(a + sgn * 1.0)))
                ob(f'br{k}{t}{sgn}', C.tube([base, base + side * ln], [0.035, 0.015], seg=5), ice, O * 0.7)
    ob('hub', C.ellipsoid(Vector((0, -0.03, 0)), (0.16, 0.08, 0.16)), m('hub', '#eaf7ff', rough=0.3, emit='#cfefff', es=0.6))
    C.FACET = saved


def ice_lantern(_):
    ob('core', C.ellipsoid(Vector((0, 0, -0.05)), (0.26, 0.26, 0.34)), glow('#7fd4ff', 1.2), O * 0.5)
    ob('top', C.cone(Vector((0, 0, 0.42)), 0.38, 0.1, 0.22, seg=8), metal_m('#a3acb6'))
    ob('base', C.tube([Vector((0, 0, -0.5)), Vector((0, 0, -0.4))], 0.38, seg=8), metal_m('#a3acb6'))
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        x, y = 0.33 * math.cos(a), 0.33 * math.sin(a)
        ob(f'bar{k}', C.tube([Vector((x, y, -0.42)), Vector((x, y, 0.34))], 0.035, seg=6), metal_m('#d4dde6'))
    ob('ring', C.torus(Vector((0, 0, 0.66)), 0.14, 0.035, seg=12, ring=6, rot=Euler((math.radians(90), 0, 0))), metal_m('#d4dde6'))
    for k in range(3):   # 고드름
        x = -0.2 + 0.2 * k
        ob(f'icicle{k}', C.cone(Vector((x, -0.2, -0.62)), 0.05, 0.0, 0.18, seg=6, rot=Euler((math.radians(180), 0, 0))), m('ice', '#bfe8ff', rough=0.4), O * 0.6)


# ── 황금 계열 ──
def golden_acorn(_):
    ob('nut', C.ellipsoid(Vector((0, 0, -0.18)), (0.4, 0.38, 0.48), egg=-0.25), metal_m('#f2c232'))
    ob('shine', C.ellipsoid(Vector((-0.16, -0.3, -0.05)), (0.07, 0.03, 0.12)), m('shine', '#fff7c0', rough=0.3, emit='#fff7c0', es=0.6), 0)
    cap = C.ellipsoid(Vector((0, 0, 0.22)), (0.46, 0.44, 0.24))
    for v in [v for v in cap.verts if v.co.z < 0.14]:
        cap.verts.remove(v)
    ob('cap', cap, m('cap', '#b5762e'))
    ob('rim', C.torus(Vector((0, 0, 0.16)), 0.44, 0.05, seg=14, ring=6), m('cap', '#9a6234'))
    ob('stem', C.tube([Vector((0, 0, 0.42)), Vector((0.08, 0, 0.6))], 0.05, seg=6), m('stem', '#7a4a22'))
    gem('g', '#4fd8ff', Vector((0.0, -0.4, -0.2)), 0.07)


def lucky_coin(_):
    rot = Euler((math.radians(90), 0, 0))
    ob('coin', C.tube([Vector((0, 0.06, 0)), Vector((0, -0.06, 0))], 0.62, seg=16), metal_m('#f2c232'))
    ob('rim', C.torus(Vector((0, -0.07, 0)), 0.56, 0.04, seg=16, ring=6, rot=rot), metal_m('#e8a21a'))
    for k in range(4):   # 네잎 클로버 무늬
        a = math.pi / 4 + k * math.pi / 2
        ob(f'leaf{k}', C.ellipsoid(Vector((0.15 * math.cos(a), -0.09, 0.15 * math.sin(a))), (0.13, 0.04, 0.13)), m('leaf', '#5fb84a'), O * 0.6)
    ob('dot', C.ellipsoid(Vector((0, -0.12, 0)), (0.05, 0.03, 0.05)), metal_m('#fff0a0'), O * 0.5)


def beaver_crown(_):
    ob('ring', C.tube([Vector((0, 0, -0.35)), Vector((0, 0, -0.05))], [0.5, 0.5], seg=10), metal_m('#f2c232'))
    for k in range(5):
        a = -math.pi / 2 + (k - 2) * 0.62
        ob(f'spike{k}', C.cone(Vector((0.48 * math.cos(a), 0.48 * math.sin(a), 0.12)), 0.14, 0.0, 0.42 if k % 2 == 0 else 0.3, seg=6), metal_m('#f2c232'))
        ob(f'ball{k}', C.ellipsoid(Vector((0.48 * math.cos(a), 0.48 * math.sin(a), 0.36 if k % 2 == 0 else 0.29)), (0.05, 0.05, 0.05)), metal_m('#fff0a0'), O * 0.5)
    ob('fur', C.torus(Vector((0, 0, -0.36)), 0.52, 0.08, seg=14, ring=6), m('fur', '#fff4e4', rough=0.9))
    gem('g0', '#e8467c', Vector((0, -0.52, -0.2)), 0.09)
    gem('g1', '#4fd8ff', Vector((-0.36, -0.38, -0.2)), 0.06)
    gem('g2', '#9ad04a', Vector((0.36, -0.38, -0.2)), 0.06)
    # 앞니 문장 — 비버 왕관
    for sx in (-1, 1):
        ob(f'tooth{sx}', C.box(Vector((sx * 0.045, -0.53, 0.02)), (0.08, 0.03, 0.1)), m('tooth', '#fffaf0'), O * 0.5)


# ── 유물 조각 ──
def shard(_):
    saved = C.FACET
    C.FACET = 5
    ob('shard', C.cone(Vector((0, 0, 0.0)), 0.34, 0.0, 1.0, seg=5, rot=Euler((0, math.radians(14), 0))), m('shard', '#e8b23a', rough=0.35, emit='#ffcf5a', es=0.35))
    ob('chip', C.cone(Vector((0.34, 0, -0.32)), 0.16, 0.0, 0.44, seg=5, rot=Euler((0, math.radians(-30), 0))), m('shard', '#c8402f', rough=0.35, emit='#ff7a4a', es=0.3))
    ob('chip2', C.cone(Vector((-0.33, 0, -0.34)), 0.14, 0.0, 0.38, seg=5, rot=Euler((0, math.radians(32), 0))), m('shard', '#4f9fe8', rough=0.35, emit='#7fd4ff', es=0.3))
    C.FACET = saved


# ── 결정 트리 줄 ──
def t_atk(_):
    for sx in (-1, 1):
        r = Euler((0, math.radians(sx * 36), 0))
        def at(v):
            v = v.copy(); v.rotate(r); return v
        ob(f'blade{sx}', C.box(at(Vector((0, 0, 0.18))), (0.2, 0.06, 0.72), rot=r), metal_m('#d4dde6'))
        ob(f'tip{sx}', C.cone(at(Vector((0, 0, 0.64))), 0.14, 0.0, 0.22, seg=4, rot=r), metal_m('#d4dde6'))
        ob(f'guard{sx}', C.box(at(Vector((0, -0.02 * sx, -0.2))), (0.46, 0.1, 0.1), rot=r), metal_m('#e8b23a'))
        ob(f'grip{sx}', C.tube([at(Vector((0, 0, -0.24))), at(Vector((0, 0, -0.5)))], 0.055, seg=8), m('grip', '#9a6234'))
        ob(f'pom{sx}', C.ellipsoid(at(Vector((0, 0, -0.55))), (0.08, 0.08, 0.08)), metal_m('#e8b23a'))


def t_gold(_):
    for k in range(3):
        ob(f'c{k}', C.tube([Vector((-0.12 + 0.03 * (k % 2), 0, -0.5 + k * 0.14)), Vector((-0.12 + 0.03 * (k % 2), 0, -0.39 + k * 0.14))], 0.38, seg=16), metal_m('#f2c232'))
    ob('top', C.tube([Vector((0.18, 0, 0.32)), Vector((0.18, -0.12, 0.32))], 0.32, seg=16), metal_m('#ffd34d'))
    gem('g', '#4fd8ff', Vector((0.18, -0.16, 0.32)), 0.07)


def t_idle(_):
    for z, flip in ((0.26, 0), (-0.26, 180)):
        ob(f'glass{z}', C.cone(Vector((0, 0, z)), 0.3, 0.05, 0.42, seg=10, rot=Euler((math.radians(flip), 0, 0))), m('glass', '#cfefff', rough=0.2), O * 0.6)
    ob('sand_t', C.cone(Vector((0, 0, 0.18)), 0.18, 0.04, 0.2, seg=10, rot=Euler((math.radians(180), 0, 0))), m('sand', '#e8b23a'), 0)
    ob('sand_b', C.cone(Vector((0, 0, -0.38)), 0.26, 0.04, 0.18, seg=10), m('sand', '#e8b23a'), 0)
    for z in (0.52, -0.52):
        ob(f'cap{z}', C.tube([Vector((0, 0, z - 0.05)), Vector((0, 0, z + 0.05))], 0.4, seg=10), m('wood', '#9a6234'))
    for k in range(3):
        a = 2 * math.pi * k / 3 + 0.4
        ob(f'post{k}', C.tube([Vector((0.34 * math.cos(a), 0.34 * math.sin(a), -0.5)), Vector((0.34 * math.cos(a), 0.34 * math.sin(a), 0.5))], 0.035, seg=6), m('wood', '#7a4a22'))
    ob('moon', C.ellipsoid(Vector((0.42, -0.2, 0.5)), (0.14, 0.05, 0.14)), glow('#ffe066', 0.8), O * 0.6)


def t_start(_):
    for k in range(3):   # 계단
        ob(f'step{k}', C.box(Vector((-0.3 + k * 0.25, 0, -0.55 + k * 0.14)), (0.26, 0.4, 0.14 + k * 0.28)), m('stone', '#b7a48a'))
    ob('pole', C.tube([Vector((0.2, 0, -0.1)), Vector((0.2, 0, 0.78))], 0.03, seg=6), m('pole', '#7a4a22'))
    flag = C.box(Vector((0.42, 0, 0.6)), (0.42, 0.03, 0.28))
    for v in flag.verts:
        v.co.z += 0.05 * math.sin((v.co.x - 0.2) * 9)
    ob('flag', flag, m('flag', '#e8452c'))
    ob('knob', C.ellipsoid(Vector((0.2, 0, 0.82)), (0.05, 0.05, 0.05)), metal_m('#f2c232'), O * 0.5)


def t_crystal(_):
    saved = C.FACET
    C.FACET = 6
    for k, (x, h, r, c) in enumerate(((0, 0.95, 0.22, '#b07cf0'), (-0.28, 0.6, 0.15, '#8a5ad8'), (0.27, 0.68, 0.16, '#c9a0ff'))):
        ob(f'cr{k}', C.cone(Vector((x, -0.02 * k, -0.45 + h / 2)), r, 0.0, h, seg=6, rot=Euler((0, math.radians(-x * 30), 0))), m('cr', c, rough=0.3, emit=c, es=0.45))
    ob('rock', C.ellipsoid(Vector((0, 0, -0.5)), (0.5, 0.3, 0.12)), m('rock', '#7c6a58'))
    C.FACET = saved


def t_boss(_):
    ob('skull', C.ellipsoid(Vector((0, 0, 0.05)), (0.42, 0.38, 0.4)), m('bone', '#f4ead6', rough=0.85))
    ob('jaw', C.box(Vector((0, -0.08, -0.36)), (0.4, 0.3, 0.16)), m('bone', '#f4ead6', rough=0.85))
    for sx in (-1, 1):
        ob(f'eye{sx}', C.ellipsoid(Vector((sx * 0.16, -0.32, 0.02)), (0.11, 0.06, 0.12)), glow('#ff5a2a', 1.0), 0)
        pts = spline([Vector((sx * 0.34, 0, 0.25)), Vector((sx * 0.62, 0, 0.42)), Vector((sx * 0.6, 0, 0.78))], 8)
        ob(f'horn{sx}', C.tube(pts, interp([0.1, 0.07, 0.01], len(pts)), seg=6), m('horn', '#5a3418'))
    for k in range(3):
        ob(f'tooth{k}', C.box(Vector((-0.12 + 0.12 * k, -0.24, -0.3)), (0.06, 0.03, 0.08)), m('tooth', '#fffaf0'), O * 0.4)


def t_relic(_):
    ob('lens', C.ellipsoid(Vector((-0.12, 0, 0.18)), (0.36, 0.05, 0.36)), m('lens', '#bfe8ff', rough=0.15, emit='#e8f8ff', es=0.25), O * 0.5)
    ob('frame', C.torus(Vector((-0.12, 0, 0.18)), 0.38, 0.06, seg=16, ring=6, rot=Euler((math.radians(90), 0, 0))), metal_m('#e8b23a'))
    ob('handle', C.tube([Vector((0.15, 0, -0.1)), Vector((0.5, 0, -0.55))], 0.075, seg=8), m('handle', '#7a4a22'))
    gem('spark', '#ffd34d', Vector((-0.2, -0.08, 0.26)), 0.08)



# ── 퀘스트 (2026-10-26 — 사냥터 퀘스트 탭 8줄) ──
WOOD, WOOD_D, BARK = '#b9783a', '#8a5a2b', '#7a4a22'


def log(name, a, b, r, cap='#e8c38a'):
    ob(name, C.tube([a, b], r, seg=8), m('bark', BARK))
    d = (b - a).normalized()
    for k, end in enumerate((a, b)):
        ob(f'{name}_ring{k}', C.ellipsoid(end + d * (0.005 if k else -0.005), (r * 0.92, r * 0.92, r * 0.92)), m('cut', cap), O * 0.5)


def q_twigs(_):
    for k, dx in enumerate((-0.14, 0.0, 0.14, -0.06, 0.07)):
        a = Vector((dx * 0.5, 0.03 * (k % 3) - 0.03, -0.62)); b = Vector((dx * 2.4, 0.03 * (k % 3) - 0.03, 0.62 - 0.08 * (k % 2)))
        ob(f'twig{k}', C.tube([a, b], [0.05, 0.035], seg=6), m('twig', WOOD_D))
        ob(f'leaf{k}', C.ellipsoid(b + Vector((0.07, -0.02, 0.02)), (0.1, 0.03, 0.06), rot=Euler((0, math.radians(-30), 0))), m('leaf', '#6fbf4a'), O * 0.6)
    ob('tie', C.torus(Vector((0, 0.02, -0.05)), 0.17, 0.04, seg=12, ring=6), m('tie', '#e8452c'))


def q_acorns(_):
    # 나무 열매 모으기 (2026-10-26 사용자: "도토리 콘텐츠 삭제" — 이름을 열매로 바꾸며 그림도 도토리 → 빨간 열매 송이)
    stem_top = Vector((0.0, 0.0, 0.62))
    ob('stem', C.tube([stem_top, Vector((-0.05, 0, 0.2)), Vector((0.0, 0, -0.05))], 0.035, seg=6), m('stem', '#5a3418'), O * 0.6)
    for k, (at, r) in enumerate([((-0.3, 0.0, -0.18), 0.21), ((0.26, 0.0, -0.2), 0.2), ((-0.04, -0.06, -0.42), 0.22), ((0.02, 0.04, 0.02), 0.19), ((-0.36, 0.04, -0.5), 0.17), ((0.36, 0.04, -0.48), 0.17)]):
        c = Vector(at)
        ob(f'berry{k}', C.ellipsoid(c, (r, r * 0.95, r)), m('berry', '#d8323a', rough=0.45))
        ob(f'shine{k}', C.ellipsoid(c + Vector((-0.06 * r / 0.2, -0.9 * r, 0.08 * r / 0.2)), (0.045, 0.02, 0.045)), m('shine', '#ffd0d0', rough=0.3), 0)
    ob('leafL', C.ellipsoid(Vector((-0.26, 0.02, 0.5)), (0.26, 0.05, 0.11)), m('leaf', '#5fae3a'))
    ob('leafR', C.ellipsoid(Vector((0.24, 0.02, 0.44)), (0.22, 0.05, 0.1)), m('leaf', '#4f9a30'))
    ob('base', C.ellipsoid(Vector((0, 0.05, -0.7)), (0.62, 0.32, 0.07)), m('grass', '#7cc04a'))


def q_dam_patch(_):
    for k in range(3):
        z = -0.45 + k * 0.3
        log(f'log{k}', Vector((-0.6 + 0.05 * k, 0, z)), Vector((0.6 - 0.05 * k, 0, z)), 0.15)
    ob('mud', C.ellipsoid(Vector((0.1, -0.14, -0.1)), (0.32, 0.08, 0.22), egg=0.1), m('mud', '#6b4a2f', rough=0.95))
    ob('trowel', C.box(Vector((0.42, -0.2, 0.3)), (0.24, 0.03, 0.16), rot=Euler((0, math.radians(-25), 0))), metal_m('#a3acb6'))
    ob('handle', C.tube([Vector((0.5, -0.2, 0.4)), Vector((0.66, -0.2, 0.62))], 0.04, seg=6), m('handle', WOOD))


def q_river_patrol(_):
    ob('tube1', C.tube([Vector((-0.6, 0, -0.3)), Vector((-0.05, 0, 0.0))], [0.14, 0.14], seg=10), metal_m('#c9893a'))
    ob('tube2', C.tube([Vector((-0.05, 0, 0.0)), Vector((0.35, 0, 0.22))], [0.11, 0.11], seg=10), metal_m('#e8b23a'))
    ob('tube3', C.tube([Vector((0.35, 0, 0.22)), Vector((0.6, 0, 0.36))], [0.085, 0.085], seg=10), metal_m('#c9893a'))
    ob('lens', C.ellipsoid(Vector((-0.62, -0.01, -0.31)), (0.12, 0.12, 0.12)), m('lens', '#bfe8ff', rough=0.15, emit='#e8f8ff', es=0.3), O * 0.5)
    ob('wave', C.tube([Vector((-0.7 + 0.14 * k, -0.1, -0.62 + 0.05 * math.sin(k * 1.6))) for k in range(11)], 0.05, seg=6), m('water', '#4fa8e8'), O * 0.6)


def q_log_haul(_):
    log('log', Vector((-0.6, 0, 0.12)), Vector((0.6, 0, 0.12)), 0.22)
    ob('cart', C.box(Vector((0, 0, -0.18)), (1.1, 0.5, 0.1)), m('cart', WOOD))
    for sx in (-1, 1):
        ob(f'wheel{sx}', C.torus(Vector((sx * 0.38, -0.27, -0.4)), 0.15, 0.05, seg=12, ring=6, rot=Euler((math.radians(90), 0, 0))), m('wheel', WOOD_D))
        ob(f'hub{sx}', C.ellipsoid(Vector((sx * 0.38, -0.29, -0.4)), (0.06, 0.04, 0.06)), metal_m('#a3acb6'), O * 0.5)
    ob('rope', C.torus(Vector((0, 0, 0.12)), 0.24, 0.035, seg=12, ring=6, rot=Euler((0, math.radians(90), 0))), m('rope', '#e8d29a'))


def q_village_guard(_):
    ob('shaft', C.tube([Vector((0.3, 0.05, -0.75)), Vector((0.3, 0.05, 0.6))], 0.04, seg=6), m('shaft', WOOD_D))
    ob('head', C.cone(Vector((0.3, 0.05, 0.72)), 0.1, 0.0, 0.3, seg=4), metal_m('#d4dde6'))
    ob('flag', C.box(Vector((0.42, 0.05, 0.45)), (0.2, 0.02, 0.14)), m('flag', '#e8452c'), O * 0.6)
    ob('shield', C.tube([Vector((-0.15, 0.02, -0.05)), Vector((-0.15, -0.1, -0.05))], 0.42, seg=12), m('shield', '#3f7fc4'))
    ob('rim', C.torus(Vector((-0.15, -0.11, -0.05)), 0.4, 0.045, seg=14, ring=6, rot=Euler((math.radians(90), 0, 0))), metal_m('#e8b23a'))
    ob('boss', C.ellipsoid(Vector((-0.15, -0.14, -0.05)), (0.1, 0.05, 0.1)), metal_m('#e8b23a'), O * 0.5)


def q_dam_road(_):
    ob('plank', C.box(Vector((-0.1, 0.05, -0.35)), (1.1, 0.3, 0.12), rot=Euler((0, math.radians(-8), 0))), m('plank', '#d9a560'))
    for k in range(3):
        ob(f'nail{k}', C.ellipsoid(Vector((-0.5 + 0.35 * k, -0.11, -0.3 + 0.05 * k)), (0.035, 0.03, 0.035)), metal_m('#7c858f'), O * 0.4)
    r = Euler((0, math.radians(30), 0))
    ob('hhandle', C.tube([Vector((0.05, -0.05, -0.2)), Vector((0.5, -0.05, 0.62))], 0.05, seg=8), m('handle', WOOD))
    ob('hhead', C.box(Vector((0.52, -0.05, 0.62)), (0.42, 0.16, 0.16), rot=r), metal_m('#a3acb6'))


def q_great_dam(_):
    for row in range(3):
        for k in range(4 - row):
            x = -0.48 + row * 0.16 + k * 0.32
            z = -0.4 + row * 0.27
            log(f'l{row}{k}', Vector((x, -0.25, z)), Vector((x, 0.25, z)), 0.13)
    ob('water', C.ellipsoid(Vector((0, 0.45, -0.25)), (0.7, 0.25, 0.3)), m('water', '#4fa8e8', rough=0.3), O * 0.5)
    ob('pole', C.tube([Vector((0.45, -0.1, 0.0)), Vector((0.45, -0.1, 0.78))], 0.03, seg=6), m('pole', BARK))
    ob('pennant', C.box(Vector((0.6, -0.1, 0.66)), (0.28, 0.02, 0.16)), m('flag', '#f2c232'), O * 0.6)


QUEST_JOBS = {
    'quest-twigs': (q_twigs, (-14, 10), 1.7), 'quest-acorns': (q_acorns, (-14, 16), 1.6), 'quest-dam-patch': (q_dam_patch, (-20, 14), 1.7),
    'quest-river-patrol': (q_river_patrol, (-10, 12), 1.7), 'quest-log-haul': (q_log_haul, (-22, 14), 1.7), 'quest-village-guard': (q_village_guard, (-14, 10), 1.8),
    'quest-dam-road': (q_dam_road, (-16, 12), 1.7), 'quest-great-dam': (q_great_dam, (-28, 18), 1.7),
}

JOBS = {
    'ember-ring': (ember_ring, (-18, 14), 1.9), 'flame-feather': (flame_feather, (-12, 10), 2.0), 'lava-heart': (lava_heart, (-16, 12), 1.7),
    'frost-horn': (frost_horn, (-14, 10), 1.9), 'snow-crystal': (snow_crystal, (0, 6), 1.8), 'ice-lantern': (ice_lantern, (-20, 14), 1.8),
    'golden-acorn': (golden_acorn, (-20, 14), 1.7), 'lucky-coin': (lucky_coin, (-22, 8), 1.7), 'beaver-crown': (beaver_crown, (-12, 22), 1.6),
    'shard': (shard, (-16, 10), 1.6),
    'tree-atk': (t_atk, (-10, 8), 1.8), 'tree-gold': (t_gold, (-22, 14), 1.6), 'tree-idle': (t_idle, (-18, 12), 1.6),
    'tree-start': (t_start, (-26, 14), 1.8), 'tree-crystal': (t_crystal, (-16, 12), 1.6), 'tree-boss': (t_boss, (-16, 10), 1.7),
    'tree-relic': (t_relic, (-14, 10), 1.6),
}
JOBS.update(QUEST_JOBS)
RELICS = ['ember-ring', 'flame-feather', 'lava-heart', 'frost-horn', 'snow-crystal', 'ice-lantern', 'golden-acorn', 'lucky-coin', 'beaver-crown', 'shard']

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['relics', 'tree']
names = []
for a in argv:
    if a == 'relics':
        names += RELICS
    elif a == 'quests':
        names += list(QUEST_JOBS)
    elif a == 'tree':
        names += [k for k in JOBS if k.startswith('tree-')]
    else:
        names.append(a)
os.makedirs(OUTDIR, exist_ok=True)
for name in names:
    fn, (yaw, elev), scale = JOBS[name]
    C.reset()
    C.setup_render(res=(512, 512), samples=40)
    C.lights()
    C.ortho_camera((0.0, 0.0), scale, yaw_deg=0, elev_deg=elev)
    C.FACET = 10
    try:
        fn(None)
    finally:
        C.FACET = 0
    # ortho_camera 는 yaw 를 무시한다 — 모델을 기둥(pivot)에 달아 돌린다
    piv = bpy.data.objects.new('pivot', None)
    bpy.context.scene.collection.objects.link(piv)
    for o in [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.parent is None]:
        o.parent = piv
    piv.rotation_euler = Euler((0, 0, math.radians(yaw)))
    bpy.context.view_layer.update()
    bpy.context.scene.render.filepath = os.path.join(OUTDIR, f'{name}.png')
    bpy.ops.render.render(write_still=True)
    print('wrote', name, flush=True)
print('DONE')
