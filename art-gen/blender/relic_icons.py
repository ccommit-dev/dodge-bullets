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
    # 황금 열매 (2026-10-26 — 도토리 콘텐츠 삭제에 맞춰 이름 · 그림을 도토리 → 둥근 황금 열매로. id 는 저장 호환으로 그대로)
    ob('fruit', C.ellipsoid(Vector((0, 0, -0.12)), (0.5, 0.48, 0.48)), metal_m('#f2c232'))
    ob('dimple', C.ellipsoid(Vector((0, 0, 0.32)), (0.12, 0.12, 0.05)), metal_m('#c98a12'), O * 0.5)
    ob('shine', C.ellipsoid(Vector((-0.2, -0.38, 0.05)), (0.08, 0.03, 0.14)), m('shine', '#fff7c0', rough=0.3, emit='#fff7c0', es=0.6), 0)
    ob('stem', C.tube([Vector((0, 0, 0.3)), Vector((0.06, 0, 0.56))], 0.05, seg=6), m('stem', '#7a4a22'))
    ob('leaf', C.ellipsoid(Vector((0.26, 0.0, 0.52)), (0.24, 0.05, 0.1)), m('leaf', '#5fae3a'))
    gem('g', '#4fd8ff', Vector((0.0, -0.47, -0.16)), 0.07)


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


# ── 퀘스트 2판 (2026-10-28, 사용자: "퀘스트탭에 8개가 아니라 30개로") — 새 22줄. 같은 그림체(각진 면 · 잉크 외곽선) ──
WATER, LEAF, STONE = '#4fa8e8', '#5fae3a', '#9a8f84'


def q_reed_weave(_):
    for k in range(5):
        x = -0.36 + k * 0.18
        ob(f'reed{k}', C.tube([Vector((x, 0, -0.7)), Vector((x + 0.05 * (k - 2), 0, 0.55 + 0.06 * (k % 2)))], 0.035, seg=6), m('reed', '#c9b25a'))
        ob(f'tip{k}', C.ellipsoid(Vector((x + 0.05 * (k - 2), 0, 0.6 + 0.06 * (k % 2))), (0.05, 0.04, 0.13)), m('tip', '#8a5a2b'), O * 0.6)
    for z in (-0.35, -0.05):
        ob(f'band{z}', C.box(Vector((0, -0.04, z)), (0.86, 0.06, 0.12)), m('weave', '#e8d29a'))


def q_mud_haul(_):
    ob('bucket', C.cone(Vector((0, 0, -0.2)), 0.42, 0.52, 0.7, seg=12), m('bucket', WOOD))
    for z in (-0.45, 0.05):
        ob(f'hoop{z}', C.torus(Vector((0, 0, z)), 0.47 + 0.05 * (z > 0), 0.035, seg=14, ring=6), metal_m('#7c858f'))
    ob('mud', C.ellipsoid(Vector((0, 0, 0.18)), (0.48, 0.48, 0.18), egg=0.2), m('mud', '#6b4a2f', rough=0.95))
    ob('handle', C.torus(Vector((0, 0, 0.3)), 0.5, 0.03, seg=16, ring=6, rot=Euler((math.radians(90), 0, 0))), metal_m('#a3acb6'))


def q_fish_catch(_):
    ob('body', C.ellipsoid(Vector((0, 0, 0.05)), (0.55, 0.16, 0.28)), m('fish', '#5fa8d8', rough=0.4))
    ob('belly', C.ellipsoid(Vector((0.05, -0.06, -0.08)), (0.42, 0.1, 0.14)), m('belly', '#e8f4ff', rough=0.4), O * 0.5)
    ob('tail', C.cone(Vector((-0.62, 0, 0.05)), 0.0, 0.3, 0.3, seg=4, rot=Euler((0, math.radians(90), 0))), m('fin', '#3f88c4'))
    ob('eye', C.ellipsoid(Vector((0.38, -0.15, 0.12)), (0.06, 0.03, 0.06)), m('eye', '#1a1a1a'), 0)
    ob('net', C.torus(Vector((0.1, 0.1, -0.35)), 0.55, 0.04, seg=16, ring=6), m('net', '#e8d29a'))


def q_lily_garden(_):
    ob('pad', C.ellipsoid(Vector((0, 0, -0.45)), (0.7, 0.55, 0.06)), m('pad', LEAF))
    ob('water', C.ellipsoid(Vector((0, 0.1, -0.55)), (0.85, 0.65, 0.04)), m('water', WATER, rough=0.3), O * 0.5)
    for k in range(6):
        a = k * math.pi / 3
        ob(f'pet{k}', C.ellipsoid(Vector((0.18 * math.cos(a), 0.18 * math.sin(a) - 0.05, -0.12)), (0.14, 0.08, 0.26), rot=Euler((math.radians(25 * math.sin(a)), math.radians(-25 * math.cos(a)), 0))), m('petal', '#ffb3c8'))
    ob('heart', C.ellipsoid(Vector((0, -0.05, -0.02)), (0.1, 0.1, 0.1)), glow('#ffd34d', 0.8), O * 0.5)


def q_bark_strip(_):
    log('log', Vector((-0.6, 0, -0.2)), Vector((0.6, 0, -0.2)), 0.26)
    ob('strip', C.box(Vector((0.1, -0.24, 0.25)), (0.6, 0.05, 0.16), rot=Euler((0, math.radians(-15), 0))), m('bark', BARK))
    ob('blade', C.box(Vector((0.42, -0.25, 0.5)), (0.3, 0.04, 0.1), rot=Euler((0, math.radians(30), 0))), metal_m('#d4dde6'))
    ob('grip', C.tube([Vector((0.55, -0.25, 0.58)), Vector((0.72, -0.25, 0.7))], 0.05, seg=6), m('grip', WOOD_D))


def q_lantern_light(_):
    ob('cap', C.cone(Vector((0, 0, 0.48)), 0.36, 0.06, 0.22, seg=6), metal_m('#5a3418'))
    ob('glass', C.tube([Vector((0, 0, -0.3)), Vector((0, 0, 0.36))], 0.28, seg=6), m('glass', '#ffe9a8', rough=0.2, emit='#ffd34d', es=0.9))
    ob('base', C.tube([Vector((0, 0, -0.45)), Vector((0, 0, -0.3))], 0.34, seg=6), metal_m('#5a3418'))
    flame(Vector((0, -0.02, 0.02)), 0.7)
    ob('ring', C.torus(Vector((0, 0, 0.66)), 0.1, 0.03, seg=10, ring=6, rot=Euler((math.radians(90), 0, 0))), metal_m('#e8b23a'))
    ob('water', C.ellipsoid(Vector((0, 0.1, -0.62)), (0.7, 0.4, 0.05)), m('water', WATER, rough=0.3), O * 0.5)


def q_stone_stack(_):
    for k, (r, z, c) in enumerate(((0.5, -0.55, '#8f8478'), (0.4, -0.25, '#a69a8c'), (0.32, 0.02, '#8f8478'), (0.24, 0.24, '#b5aa9c'), (0.15, 0.42, '#9a8f84'))):
        ob(f's{k}', C.ellipsoid(Vector((0.03 * (k % 2), 0, z)), (r, r * 0.8, 0.14)), m('stone', c, rough=0.95))
    ob('moss', C.ellipsoid(Vector((-0.2, -0.1, -0.42)), (0.16, 0.08, 0.06)), m('moss', LEAF), O * 0.6)


def q_stepping_stones(_):
    ob('water', C.ellipsoid(Vector((0, 0.1, -0.35)), (0.9, 0.55, 0.06)), m('water', WATER, rough=0.3), O * 0.5)
    for k in range(4):
        ob(f'st{k}', C.ellipsoid(Vector((-0.55 + 0.37 * k, -0.08 + 0.12 * (k % 2), -0.25 + 0.03 * k)), (0.17, 0.14, 0.08)), m('stone', STONE, rough=0.95))
    ob('plank', C.box(Vector((0.1, -0.12, 0.2)), (0.8, 0.2, 0.08), rot=Euler((0, math.radians(-10), 0))), m('plank', '#d9a560'))


def q_mill_wheel(_):
    c0 = Vector((0, 0, 0.05))
    ob('rim', C.torus(c0, 0.58, 0.06, seg=18, ring=6, rot=Euler((math.radians(90), 0, 0))), m('rim', WOOD_D))
    ob('hub', C.tube([Vector((0, 0.1, 0.05)), Vector((0, -0.12, 0.05))], 0.12, seg=10), metal_m('#7c858f'))
    for k in range(8):
        a = k * math.pi / 4
        p = Vector((0.6 * math.cos(a), 0, 0.05 + 0.6 * math.sin(a)))
        ob(f'pad{k}', C.box(p, (0.16, 0.18, 0.06), rot=Euler((0, -a, 0))), m('pad', WOOD))
        ob(f'sp{k}', C.tube([c0, p * 0.92 + c0 * 0.08], 0.025, seg=6), m('spoke', WOOD_D), O * 0.5)
    ob('water', C.ellipsoid(Vector((0, 0.15, -0.62)), (0.8, 0.35, 0.08)), m('water', WATER, rough=0.3), O * 0.5)


def q_honey_gather(_):
    ob('pot', C.ellipsoid(Vector((0, 0, -0.2)), (0.46, 0.42, 0.42)), m('pot', '#c97a2a'))
    ob('neck', C.tube([Vector((0, 0, 0.12)), Vector((0, 0, 0.26))], 0.28, seg=12), m('pot', '#c97a2a'))
    ob('honey', C.ellipsoid(Vector((0, 0, 0.27)), (0.3, 0.3, 0.08)), m('honey', '#ffb81c', rough=0.25, emit='#ffcf4a', es=0.2), O * 0.6)
    ob('drip', C.ellipsoid(Vector((0.26, -0.18, 0.1)), (0.06, 0.04, 0.12)), m('honey', '#ffb81c', rough=0.25, emit='#ffcf4a', es=0.2), O * 0.4)
    ob('bee', C.ellipsoid(Vector((-0.42, -0.1, 0.48)), (0.12, 0.08, 0.08)), m('bee', '#f2c232'), O * 0.6)
    ob('stripe', C.torus(Vector((-0.42, -0.1, 0.48)), 0.08, 0.025, seg=10, ring=4, rot=Euler((0, math.radians(90), 0))), m('stripe', '#2b1a0e'), 0)


def q_raft_build(_):
    for k in range(5):
        y = -0.32 + k * 0.16
        log(f'l{k}', Vector((-0.55, y, -0.25)), Vector((0.55, y, -0.25)), 0.08)
    for x in (-0.35, 0.35):
        ob(f'tie{x}', C.box(Vector((x, 0, -0.15)), (0.06, 0.8, 0.04)), m('rope', '#e8d29a'), O * 0.6)
    ob('mast', C.tube([Vector((0, 0, -0.15)), Vector((0, 0, 0.75))], 0.035, seg=6), m('mast', WOOD_D))
    sail = C.box(Vector((0.18, 0, 0.42)), (0.34, 0.02, 0.5))
    ob('sail', sail, m('sail', '#f4ead6'))


def q_watchtower(_):
    for sx in (-1, 1):
        for sy in (-1, 1):
            ob(f'leg{sx}{sy}', C.tube([Vector((sx * 0.3, sy * 0.2, -0.75)), Vector((sx * 0.2, sy * 0.14, 0.2))], 0.04, seg=6), m('leg', WOOD_D))
    ob('floor', C.box(Vector((0, 0, 0.22)), (0.6, 0.45, 0.08)), m('floor', WOOD))
    ob('roof', C.cone(Vector((0, 0, 0.6)), 0.45, 0.0, 0.4, seg=4, rot=Euler((0, 0, math.radians(45)))), m('roof', '#c94a2c'))
    for sx in (-1, 1):
        ob(f'post{sx}', C.tube([Vector((sx * 0.24, -0.16, 0.25)), Vector((sx * 0.24, -0.16, 0.42))], 0.03, seg=6), m('post', WOOD_D), O * 0.5)
    ob('flag', C.box(Vector((0.12, 0, 0.98)), (0.2, 0.02, 0.12)), m('flag', '#f2c232'), O * 0.5)


def q_tool_forge(_):
    ob('anvil', C.box(Vector((0, 0, -0.25)), (0.7, 0.32, 0.2)), metal_m('#5f6872'))
    ob('horn', C.cone(Vector((0.48, 0, -0.2)), 0.12, 0.0, 0.3, seg=6, rot=Euler((0, math.radians(90), 0))), metal_m('#5f6872'))
    ob('foot', C.box(Vector((0, 0, -0.55)), (0.42, 0.26, 0.24)), metal_m('#4a525b'))
    ob('blade', C.box(Vector((-0.05, -0.06, -0.08)), (0.5, 0.06, 0.06)), glow('#ff8a3a', 0.7), O * 0.6)
    ob('hhandle', C.tube([Vector((-0.1, -0.1, 0.1)), Vector((0.3, -0.1, 0.6))], 0.04, seg=6), m('handle', WOOD))
    ob('hhead', C.box(Vector((-0.12, -0.1, 0.12)), (0.24, 0.14, 0.14), rot=Euler((0, math.radians(40), 0))), metal_m('#a3acb6'))


def q_market_trade(_):
    ob('crate', C.box(Vector((0, 0, -0.35)), (0.9, 0.5, 0.4)), m('crate', WOOD))
    for z in (-0.5, -0.2):
        ob(f'slat{z}', C.box(Vector((0, -0.26, z)), (0.92, 0.02, 0.05)), m('slat', WOOD_D), O * 0.5)
    for k, c in enumerate(('#d8323a', '#f2c232', '#6fbf4a')):
        ob(f'fruit{k}', C.ellipsoid(Vector((-0.28 + 0.28 * k, 0, -0.04)), (0.15, 0.15, 0.15)), m('fruit', c, rough=0.45))
    ob('awning', C.box(Vector((0, 0.05, 0.55)), (1.0, 0.5, 0.06), rot=Euler((math.radians(-12), 0, 0))), m('awning', '#e8452c'))
    for sx in (-1, 1):
        ob(f'pole{sx}', C.tube([Vector((sx * 0.48, 0.2, -0.15)), Vector((sx * 0.48, 0.2, 0.55))], 0.03, seg=6), m('pole', WOOD_D), O * 0.5)


def q_canal_dig(_):
    ob('bank', C.ellipsoid(Vector((0, 0.1, -0.5)), (0.9, 0.5, 0.18)), m('dirt', '#8a6a4a', rough=0.95))
    ob('water', C.box(Vector((0, -0.05, -0.38)), (1.4, 0.24, 0.05)), m('water', WATER, rough=0.3), O * 0.5)
    ob('shaft', C.tube([Vector((-0.2, -0.1, -0.3)), Vector((0.3, -0.1, 0.75))], 0.045, seg=6), m('shaft', WOOD))
    ob('blade', C.box(Vector((-0.25, -0.1, -0.42)), (0.3, 0.05, 0.32), rot=Euler((0, math.radians(-25), 0))), metal_m('#a3acb6'))
    ob('grip', C.box(Vector((0.32, -0.1, 0.78)), (0.24, 0.06, 0.06)), m('grip', WOOD_D), O * 0.6)


def q_storehouse(_):
    ob('body', C.box(Vector((0, 0, -0.25)), (0.9, 0.6, 0.6)), m('wall', '#d9a560'))
    ob('roof', C.box(Vector((0, 0, 0.18)), (1.05, 0.7, 0.12), rot=Euler((0, 0, 0))), m('roof', '#8a5a2b'))
    ob('roof2', C.cone(Vector((0, 0, 0.42)), 0.62, 0.0, 0.32, seg=4, rot=Euler((0, 0, math.radians(45)))), m('roof', '#a8402a'))
    ob('door', C.box(Vector((0, -0.31, -0.35)), (0.3, 0.02, 0.4)), m('door', WOOD_D), O * 0.6)
    for k in range(3):
        ob(f'sack{k}', C.ellipsoid(Vector((-0.55 + 0.16 * k, -0.4, -0.45 + 0.05 * (k % 2))), (0.13, 0.12, 0.16)), m('sack', '#e8d29a'))


def q_river_lighthouse(_):
    ob('tower', C.cone(Vector((0, 0, -0.15)), 0.32, 0.22, 0.95, seg=10), m('tower', '#f4ead6'))
    for z in (-0.4, 0.05):
        ob(f'stripe{z}', C.tube([Vector((0, 0, z)), Vector((0, 0, z + 0.14))], 0.3 - 0.05 * (z > 0), seg=10), m('stripe', '#e8452c'), O * 0.5)
    ob('lamp', C.tube([Vector((0, 0, 0.32)), Vector((0, 0, 0.52))], 0.2, seg=8), glow('#ffd34d', 1.1))
    ob('cap', C.cone(Vector((0, 0, 0.64)), 0.26, 0.0, 0.2, seg=8), metal_m('#3f7fc4'))
    ob('rock', C.ellipsoid(Vector((0, 0, -0.65)), (0.6, 0.4, 0.14)), m('rock', STONE, rough=0.95))
    ob('water', C.ellipsoid(Vector((0, 0.12, -0.72)), (0.9, 0.5, 0.05)), m('water', WATER, rough=0.3), O * 0.5)


def q_festival(_):
    for k, (x, c) in enumerate(((-0.4, '#e8452c'), (0.0, '#f2c232'), (0.4, '#3fb6f0'))):
        ob(f'bal{k}', C.ellipsoid(Vector((x, 0, 0.3 + 0.1 * (k % 2))), (0.2, 0.18, 0.26)), m('bal', c, rough=0.35))
        ob(f'str{k}', C.tube([Vector((x, 0, 0.04 + 0.1 * (k % 2))), Vector((x * 0.3, 0, -0.55))], 0.012, seg=4), m('str', '#5a3418'), 0)
    pts = [Vector((-0.8 + 0.2 * k, -0.05, -0.15 - 0.08 * math.sin(k * 0.8))) for k in range(9)]
    for k, pt in enumerate(pts):
        ob(f'flag{k}', C.cone(pt, 0.08, 0.0, 0.16, seg=3, rot=Euler((math.radians(180), 0, 0))), m('fl', ('#e8452c', '#f2c232', '#6fbf4a')[k % 3]), O * 0.5)
    ob('rope', C.tube(pts, 0.012, seg=4), m('rope', '#5a3418'), 0)


def q_royal_banner(_):
    ob('pole', C.tube([Vector((-0.3, 0, -0.8)), Vector((-0.3, 0, 0.75))], 0.04, seg=6), metal_m('#e8b23a'))
    ob('knob', C.ellipsoid(Vector((-0.3, 0, 0.8)), (0.07, 0.07, 0.07)), metal_m('#f2c232'), O * 0.5)
    flag = C.box(Vector((0.12, 0, 0.35)), (0.8, 0.03, 0.62))
    for v in flag.verts:
        v.co.z += 0.06 * math.sin((v.co.x + 0.3) * 6)
    ob('flag', flag, m('flag', '#7a3fc4'))
    ob('crest', C.cone(Vector((0.12, -0.05, 0.38)), 0.16, 0.0, 0.2, seg=5), metal_m('#f2c232'), O * 0.6)


def q_crystal_mine(_):
    ob('rock', C.ellipsoid(Vector((0, 0.05, -0.4)), (0.75, 0.45, 0.3)), m('rock', '#7c6a58', rough=0.95))
    saved = C.FACET
    C.FACET = 6
    for k, (x, h, r, c) in enumerate(((0, 0.75, 0.16, '#7fd8ff'), (-0.3, 0.5, 0.12, '#b07cf0'), (0.3, 0.55, 0.12, '#7fd8ff'))):
        ob(f'cr{k}', C.cone(Vector((x, -0.1, -0.2 + h / 2)), r, 0.0, h, seg=6, rot=Euler((0, math.radians(-x * 40), 0))), m('cr', c, rough=0.3, emit=c, es=0.45))
    C.FACET = saved
    ob('pick', C.tube([Vector((0.45, -0.2, -0.3)), Vector((0.7, -0.2, 0.45))], 0.035, seg=6), m('handle', WOOD))
    ob('pickhead', C.box(Vector((0.7, -0.2, 0.45)), (0.4, 0.06, 0.06), rot=Euler((0, math.radians(-20), 0))), metal_m('#a3acb6'))


def q_star_reservoir(_):
    ob('basin', C.tube([Vector((0, 0, -0.55)), Vector((0, 0, -0.2))], 0.62, seg=14), m('stone', STONE, rough=0.95))
    ob('water', C.tube([Vector((0, 0, -0.22)), Vector((0, 0, -0.18))], 0.55, seg=14), m('water', '#3b5bc4', rough=0.25, emit='#5a7aff', es=0.3), O * 0.4)
    for k, (x, y, s) in enumerate(((-0.25, -0.1, 0.09), (0.18, 0.08, 0.07), (0.05, -0.22, 0.06))):
        ob(f'star{k}', C.cone(Vector((x, y, -0.15)), s, 0.0, 0.03, seg=5), glow('#ffe066', 1.2), 0)
    ob('moon', C.ellipsoid(Vector((0.35, 0, 0.45)), (0.18, 0.06, 0.18)), glow('#fff2b0', 0.9))


def q_beaver_kingdom(_):
    ob('wall', C.box(Vector((0, 0, -0.4)), (1.1, 0.4, 0.4)), m('wall', '#c9a27a'))
    for x in (-0.55, 0.55):
        ob(f'tower{x}', C.tube([Vector((x, 0, -0.6)), Vector((x, 0, 0.15))], 0.2, seg=10), m('tower', '#d9b48a'))
        ob(f'troof{x}', C.cone(Vector((x, 0, 0.32)), 0.25, 0.0, 0.32, seg=10), m('roof', '#3f7fc4'))
    ob('keep', C.box(Vector((0, 0.05, 0.05)), (0.5, 0.3, 0.55)), m('keep', '#e0c29a'))
    ob('kroof', C.cone(Vector((0, 0.05, 0.5)), 0.38, 0.0, 0.38, seg=4, rot=Euler((0, 0, math.radians(45)))), m('roof', '#c94a2c'))
    ob('gate', C.box(Vector((0, -0.21, -0.48)), (0.24, 0.02, 0.26)), m('gate', WOOD_D), O * 0.6)
    ob('flag', C.box(Vector((0.1, 0.05, 0.86)), (0.18, 0.02, 0.1)), m('flag', '#f2c232'), O * 0.5)


# ── 유물 3판 (2026-10-28, 사용자: "유물도 … 등급을 동료처럼 메겨서 종류 30개이상 다시생성") — 새 27종 ──
def r_ember_spark(_):
    ob('flint', C.ellipsoid(Vector((-0.15, 0, -0.2)), (0.32, 0.22, 0.24)), m('flint', '#5a524a', rough=0.9))
    ob('steel', C.box(Vector((0.3, 0, -0.1)), (0.36, 0.08, 0.14), rot=Euler((0, math.radians(-30), 0))), metal_m('#a3acb6'))
    flame(Vector((0.05, -0.05, 0.3)), 0.7)


def r_phoenix_plume(_):
    for k, (ang, c) in enumerate(((-20, '#ff5a2a'), (0, '#ffb81c'), (20, '#ff7a1a'))):
        pts = spline([Vector((0, 0, -0.7)), Vector((0.1 * math.sin(math.radians(ang)) * 3, 0, 0.0)), Vector((0.5 * math.sin(math.radians(ang)), 0, 0.7))], 12)
        ob(f'q{k}', C.tube(pts, interp([0.02, 0.12, 0.02], len(pts)), seg=6), glow(c, 0.7))
    ob('eye', C.ellipsoid(Vector((0, -0.05, 0.25)), (0.08, 0.04, 0.08)), m('eye', '#3fb6f0', emit='#7fd8ff', es=0.6), O * 0.5)


def r_sun_core(_):
    ob('core', C.ellipsoid(Vector((0, 0, 0)), (0.36, 0.36, 0.36)), glow('#ffb81c', 1.2))
    for k in range(10):
        a = k * math.pi / 5
        ob(f'ray{k}', C.cone(Vector((0.5 * math.cos(a), 0, 0.5 * math.sin(a))), 0.08, 0.0, 0.22, seg=4, rot=Euler((0, -a + math.pi / 2, 0))), glow('#ff7a1a', 1.0), O * 0.6)
    ob('ring', C.torus(Vector((0, 0, 0)), 0.42, 0.035, seg=18, ring=6, rot=Euler((math.radians(90), 0, 0))), metal_m('#e8b23a'))


def r_frost_pebble(_):
    ob('stone', C.ellipsoid(Vector((0, 0, -0.1)), (0.5, 0.36, 0.34)), m('stone', '#9ab8cc', rough=0.7))
    for k in range(4):
        ob(f'frost{k}', C.ellipsoid(Vector((-0.25 + 0.17 * k, -0.25, 0.08 + 0.05 * (k % 2))), (0.08, 0.04, 0.05)), m('frost', '#e8f8ff', emit='#e8f8ff', es=0.3), O * 0.4)


def r_glacier_shield(_):
    saved = C.FACET
    C.FACET = 6
    ob('shield', C.cone(Vector((0, 0, 0.0)), 0.6, 0.15, 0.95, seg=6, rot=Euler((math.radians(180), 0, 0))), m('ice', '#8ae4ff', rough=0.2, emit='#b8f0ff', es=0.3))
    C.FACET = saved
    ob('rim', C.torus(Vector((0, -0.05, 0.3)), 0.48, 0.05, seg=6, ring=6, rot=Euler((math.radians(90), 0, 0))), metal_m('#d4dde6'))
    gem('g', '#3fb6f0', Vector((0, -0.18, 0.15)), 0.12)


def r_winter_crown(_):
    ob('band', C.tube([Vector((0, 0, -0.3)), Vector((0, 0, -0.05))], 0.45, seg=12), metal_m('#d4dde6'))
    saved = C.FACET
    C.FACET = 6
    for k in range(6):
        a = k * math.pi / 3
        ob(f'sp{k}', C.cone(Vector((0.42 * math.cos(a), 0.42 * math.sin(a), 0.2)), 0.08, 0.0, 0.5, seg=6), m('ice', '#b8f0ff', rough=0.2, emit='#e0faff', es=0.4))
    C.FACET = saved
    gem('g', '#3fb6f0', Vector((0, -0.46, -0.17)), 0.1)


def r_copper_coin(_):
    ob('coin', C.tube([Vector((0, 0.06, 0)), Vector((0, -0.06, 0))], 0.55, seg=16), metal_m('#c87a3a'))
    ob('hole', C.box(Vector((0, -0.07, 0)), (0.18, 0.02, 0.18)), m('hole', '#3b2415'), 0)
    ob('rim', C.torus(Vector((0, -0.065, 0)), 0.48, 0.04, seg=16, ring=6, rot=Euler((math.radians(90), 0, 0))), metal_m('#a8602a'))


def r_treasure_chest(_):
    ob('box', C.box(Vector((0, 0, -0.3)), (0.9, 0.55, 0.45)), m('wood', WOOD))
    ob('lid', C.tube([Vector((-0.45, 0, -0.05)), Vector((0.45, 0, -0.05))], 0.28, seg=10), m('wood', WOOD_D))
    for x in (-0.3, 0.3):
        ob(f'strap{x}', C.box(Vector((x, -0.28, -0.2)), (0.08, 0.02, 0.6)), metal_m('#e8b23a'), O * 0.5)
    ob('lock', C.box(Vector((0, -0.29, -0.12)), (0.14, 0.03, 0.16)), metal_m('#f2c232'), O * 0.5)
    for k in range(4):
        ob(f'c{k}', C.tube([Vector((-0.25 + 0.17 * k, 0.05, 0.22)), Vector((-0.25 + 0.17 * k, -0.02, 0.22))], 0.09, seg=10), metal_m('#f2c232'), O * 0.4)


def r_king_scepter(_):
    ob('rod', C.tube([Vector((0, 0, -0.8)), Vector((0, 0, 0.35))], 0.045, seg=8), metal_m('#e8b23a'))
    ob('orb', C.ellipsoid(Vector((0, 0, 0.5)), (0.18, 0.18, 0.18)), m('orb', '#b07cf0', rough=0.25, emit='#c9a0ff', es=0.5))
    ob('crown', C.torus(Vector((0, 0, 0.36)), 0.16, 0.04, seg=12, ring=6), metal_m('#f2c232'))
    ob('cross', C.box(Vector((0, 0, 0.74)), (0.04, 0.04, 0.16)), metal_m('#f2c232'), O * 0.5)
    ob('pommel', C.ellipsoid(Vector((0, 0, -0.82)), (0.07, 0.07, 0.07)), metal_m('#f2c232'), O * 0.5)


def r_wind_leaf(_):
    ob('leaf', C.ellipsoid(Vector((0, 0, 0.05)), (0.24, 0.05, 0.55), rot=Euler((0, math.radians(-30), 0))), m('leaf', '#7cd06a'))
    ob('vein', C.tube([Vector((0.2, -0.05, -0.4)), Vector((-0.2, -0.05, 0.45))], 0.02, seg=4), m('vein', '#4f9a30'), 0)
    for k in range(3):
        pts = [Vector((-0.6 + 0.1 * j, -0.1, -0.3 + 0.25 * k + 0.05 * math.sin(j))) for j in range(6)]
        ob(f'gust{k}', C.tube(pts, 0.02, seg=4), m('gust', '#d8f4ff', emit='#e8f8ff', es=0.4), 0)


def r_reed_flute(_):
    for k in range(5):
        h = 0.9 - 0.12 * k
        ob(f'pipe{k}', C.tube([Vector((-0.3 + 0.15 * k, 0, -0.45)), Vector((-0.3 + 0.15 * k, 0, -0.45 + h))], 0.065, seg=8), m('reed', '#c9b25a'))
    ob('tie', C.box(Vector((0.0, -0.05, -0.15)), (0.8, 0.04, 0.08)), m('tie', '#e8452c'), O * 0.6)


def r_feather_fan(_):
    for k in range(7):
        a = math.radians(-60 + 20 * k)
        tip = Vector((0.7 * math.sin(a), 0, -0.4 + 0.7 * math.cos(a)))
        ob(f'f{k}', C.ellipsoid((Vector((0, 0, -0.4)) + tip) * 0.5 + Vector((0, 0.01 * k, 0)), (0.11, 0.03, 0.38), rot=Euler((0, a, 0))), m('feather', ('#f4ead6', '#7fd8ff')[k % 2]))
    ob('handle', C.tube([Vector((0, -0.02, -0.4)), Vector((0, -0.02, -0.8))], 0.05, seg=6), m('handle', WOOD_D))


def r_storm_bell(_):
    ob('bell', C.cone(Vector((0, 0, -0.05)), 0.5, 0.18, 0.7, seg=14), metal_m('#7fa8c4'))   # 아래가 넓은 종
    ob('top', C.ellipsoid(Vector((0, 0, 0.3)), (0.2, 0.2, 0.1)), metal_m('#7fa8c4'), O * 0.6)
    ob('lip', C.torus(Vector((0, 0, -0.4)), 0.5, 0.05, seg=16, ring=6), metal_m('#5f88a4'))
    ob('loop', C.torus(Vector((0, 0, 0.38)), 0.1, 0.035, seg=10, ring=6, rot=Euler((math.radians(90), 0, 0))), metal_m('#e8b23a'))
    ob('bolt', C.box(Vector((0.55, -0.2, 0.15)), (0.1, 0.03, 0.42), rot=Euler((0, math.radians(25), 0))), glow('#ffe066', 1.1), O * 0.5)
    ob('clapper', C.ellipsoid(Vector((0, -0.05, -0.48)), (0.09, 0.09, 0.09)), metal_m('#e8b23a'), O * 0.5)


def r_cloud_wing(_):
    for sx in (-1, 1):
        for k in range(3):
            ob(f'w{sx}{k}', C.ellipsoid(Vector((sx * (0.25 + 0.15 * k), 0, 0.2 - 0.18 * k)), (0.22, 0.06, 0.12)), m('wing', '#f4f8ff'))
    for k, (x, z) in enumerate(((-0.25, -0.4), (0.0, -0.32), (0.25, -0.4))):
        ob(f'cl{k}', C.ellipsoid(Vector((x, 0.05, z)), (0.22, 0.18, 0.16)), m('cloud', '#dfe9f5'))


def r_tempest_eye(_):
    for k in range(3):
        ob(f'sw{k}', C.torus(Vector((0, 0, 0)), 0.25 + 0.17 * k, 0.04, seg=18, ring=6, rot=Euler((math.radians(90), 0, math.radians(20 * k)))), m('swirl', ('#7fd8ff', '#3fb6f0', '#b07cf0')[k], emit=('#7fd8ff', '#3fb6f0', '#b07cf0')[k], es=0.35))
    ob('eye', C.ellipsoid(Vector((0, -0.05, 0)), (0.16, 0.08, 0.16)), glow('#f4f8ff', 1.2))


def r_river_stone(_):
    ob('stone', C.ellipsoid(Vector((0, 0, -0.15)), (0.55, 0.38, 0.28)), m('stone', '#7c858f', rough=0.6))
    ob('band', C.torus(Vector((0, 0, -0.1)), 0.46, 0.03, seg=16, ring=4), m('band', '#e8f4ff'), O * 0.4)
    ob('water', C.ellipsoid(Vector((0, 0.1, -0.42)), (0.75, 0.45, 0.05)), m('water', WATER, rough=0.3), O * 0.5)


def r_oak_shield(_):
    ob('board', C.tube([Vector((0, 0.04, 0)), Vector((0, -0.04, 0))], 0.62, seg=14), m('wood', WOOD))
    for x in (-0.3, 0.0, 0.3):
        ob(f'plank{x}', C.box(Vector((x, -0.05, 0)), (0.02, 0.01, 1.1)), m('seam', WOOD_D), 0)
    ob('rim', C.torus(Vector((0, -0.05, 0)), 0.6, 0.05, seg=16, ring=6, rot=Euler((math.radians(90), 0, 0))), metal_m('#7c858f'))
    ob('leaf', C.ellipsoid(Vector((0, -0.1, 0.0)), (0.16, 0.03, 0.26)), m('leaf', LEAF), O * 0.5)


def r_mossy_totem(_):
    ob('pole', C.tube([Vector((0, 0, -0.75)), Vector((0, 0, 0.55))], 0.22, seg=8), m('wood', '#9a7a52'))
    for z in (-0.35, 0.15):
        ob(f'face{z}', C.box(Vector((0, -0.2, z)), (0.3, 0.06, 0.22)), m('face', WOOD_D), O * 0.6)
        for sx in (-1, 1):
            ob(f'eye{z}{sx}', C.ellipsoid(Vector((sx * 0.08, -0.24, z + 0.04)), (0.035, 0.02, 0.035)), glow('#7cd06a', 0.8), 0)
    ob('moss', C.ellipsoid(Vector((0, 0, 0.58)), (0.28, 0.28, 0.12)), m('moss', LEAF))


def r_mountain_heart(_):
    saved = C.FACET
    C.FACET = 6
    ob('mtn', C.cone(Vector((0, 0, -0.1)), 0.65, 0.0, 0.9, seg=5), m('rock', '#8a7a6a', rough=0.95))
    C.FACET = saved
    ob('snow', C.cone(Vector((0, 0, 0.27)), 0.2, 0.0, 0.17, seg=5), m('snow', '#f4f8ff'), O * 0.5)
    ob('heart', C.ellipsoid(Vector((0, -0.32, -0.2)), (0.16, 0.06, 0.16)), m('heart', '#e0283c', emit='#ff4a5a', es=0.5), O * 0.5)


def r_ancient_root(_):
    for k in range(5):
        a = math.radians(-70 + 35 * k)
        pts = spline([Vector((0, 0, 0.2)), Vector((0.3 * math.sin(a), 0, -0.2)), Vector((0.65 * math.sin(a), 0, -0.6 - 0.1 * (k % 2)))], 10)
        ob(f'root{k}', C.tube(pts, interp([0.12, 0.07, 0.02], len(pts)), seg=6), m('root', BARK))
    ob('stump', C.tube([Vector((0, 0, 0.1)), Vector((0, 0, 0.5))], 0.22, seg=10), m('bark', BARK))
    ob('rings', C.ellipsoid(Vector((0, 0, 0.51)), (0.2, 0.2, 0.02)), m('cut', '#e8c38a'), O * 0.5)
    ob('glow', C.ellipsoid(Vector((0, -0.1, 0.62)), (0.08, 0.08, 0.08)), glow('#9be86a', 1.0), 0)


def r_world_seed(_):
    ob('seed', C.ellipsoid(Vector((0, 0, -0.1)), (0.36, 0.34, 0.48), egg=0.3), m('seed', '#a8743a', rough=0.5))
    ob('sprout', C.tube([Vector((0, 0, 0.36)), Vector((0.05, 0, 0.65))], 0.03, seg=6), m('stem', '#4f9a30'))
    for sx in (-1, 1):
        ob(f'leaf{sx}', C.ellipsoid(Vector((sx * 0.16, 0, 0.7)), (0.16, 0.04, 0.08), rot=Euler((0, math.radians(sx * 20), 0))), m('leaf', '#7cd06a'))
    ob('aura', C.torus(Vector((0, 0, -0.1)), 0.55, 0.03, seg=18, ring=6, rot=Euler((math.radians(75), 0, 0))), glow('#9be86a', 0.9), 0)


def r_star_sand(_):
    ob('bottle', C.ellipsoid(Vector((0, 0.06, -0.15)), (0.36, 0.3, 0.42)), m('glass', '#9fc8e8', rough=0.2))
    ob('sand', C.ellipsoid(Vector((0, -0.2, -0.3)), (0.3, 0.12, 0.22)), glow('#ffd34d', 0.8), O * 0.4)   # 앞쪽에 보이게
    for k, (x, z) in enumerate(((-0.12, -0.05), (0.1, 0.02), (0.0, -0.18))):
        ob(f'twinkle{k}', C.ellipsoid(Vector((x, -0.3, z)), (0.03, 0.02, 0.03)), glow('#fff7c0', 1.2), 0)
    ob('neck', C.tube([Vector((0, 0, 0.22)), Vector((0, 0, 0.42))], 0.12, seg=10), m('glass', '#d8f0ff', rough=0.15))
    ob('cork', C.tube([Vector((0, 0, 0.42)), Vector((0, 0, 0.55))], 0.13, seg=10), m('cork', '#c9893a'))


def r_moon_shell(_):
    for k in range(7):
        a = math.radians(-60 + 20 * k)
        ob(f'rib{k}', C.ellipsoid(Vector((0.3 * math.sin(a), 0, -0.25 + 0.3 * math.cos(a))), (0.12, 0.08, 0.32), rot=Euler((0, a, 0))), m('shell', '#f4e0f0'))
    ob('pearl', C.ellipsoid(Vector((0, -0.12, -0.25)), (0.14, 0.14, 0.14)), m('pearl', '#fff8ff', rough=0.2, emit='#f0f0ff', es=0.3))
    ob('moon', C.ellipsoid(Vector((0.4, -0.05, 0.5)), (0.12, 0.04, 0.12)), glow('#fff2b0', 0.9), O * 0.5)


def r_comet_shard(_):
    saved = C.FACET
    C.FACET = 6
    ob('shard', C.ellipsoid(Vector((0.25, 0, 0.25)), (0.26, 0.2, 0.3), rot=Euler((0, math.radians(-40), 0))), m('cr', '#7fd8ff', rough=0.25, emit='#b8f0ff', es=0.5))
    C.FACET = saved
    pts = [Vector((0.15 - 0.15 * k, 0.05, 0.12 - 0.13 * k)) for k in range(6)]
    ob('tail', C.tube(pts, interp([0.2, 0.15, 0.02], len(pts)), seg=8), glow('#c9a0ff', 0.8), O * 0.5)


def r_star_compass(_):
    ob('case', C.tube([Vector((0, 0.06, 0)), Vector((0, -0.06, 0))], 0.55, seg=16), metal_m('#e8b23a'))
    ob('face', C.tube([Vector((0, -0.06, 0)), Vector((0, -0.08, 0))], 0.45, seg=16), m('face', '#1f2a5a', emit='#2a3a7a', es=0.2), O * 0.5)
    ob('needle', C.box(Vector((0, -0.1, 0.1)), (0.06, 0.02, 0.6), rot=Euler((0, math.radians(30), 0))), m('needle', '#e0283c'), O * 0.4)
    for k in range(4):
        a = k * math.pi / 2 + 0.4
        ob(f's{k}', C.cone(Vector((0.3 * math.cos(a), -0.1, 0.3 * math.sin(a))), 0.05, 0.0, 0.02, seg=5), glow('#ffe066', 1.1), 0)


def r_galaxy_pearl(_):
    ob('pearl', C.ellipsoid(Vector((0, 0, 0)), (0.45, 0.45, 0.45)), m('pearl', '#3b2a7a', rough=0.2, emit='#5a3aa8', es=0.5))
    ob('swirl', C.torus(Vector((0, 0, 0)), 0.3, 0.05, seg=18, ring=6, rot=Euler((math.radians(70), math.radians(20), 0))), glow('#c9a0ff', 0.9), 0)
    for k, (x, z) in enumerate(((-0.18, 0.2), (0.2, -0.1), (0.05, 0.28))):
        ob(f'st{k}', C.ellipsoid(Vector((x, -0.43, z)), (0.03, 0.02, 0.03)), glow('#fff2b0', 1.2), 0)
    ob('shell', C.ellipsoid(Vector((0, 0.1, -0.5)), (0.6, 0.3, 0.08)), m('shell', '#f4e0f0'))


def r_aurora_orb(_):
    ob('orb', C.ellipsoid(Vector((0, 0, 0.1)), (0.42, 0.42, 0.42)), m('glass', '#c8fff0', rough=0.15, emit='#9ff5dc', es=0.35))
    for k, c in enumerate(('#5eead4', '#c9a0ff', '#7fd8ff')):
        pts = [Vector((-0.3 + 0.12 * j, -0.3, 0.0 + 0.1 * k + 0.06 * math.sin(j * 1.3 + k))) for j in range(6)]
        ob(f'band{k}', C.tube(pts, 0.035, seg=4), glow(c, 1.0), 0)
    ob('stand', C.cone(Vector((0, 0, -0.42)), 0.2, 0.32, 0.2, seg=8), metal_m('#e8b23a'))

# ── 유물 4판 (2026-10-28, 사용자: "유물 개수도 20개더 늘려줘") — 새 20종 ──
def r_cinder_chunk(_):
    ob('coal', C.ellipsoid(Vector((0, 0, -0.15)), (0.45, 0.35, 0.32)), m('coal', '#2b2420', rough=0.9))
    for k, (x, z) in enumerate(((-0.15, -0.05), (0.12, 0.05), (0.0, -0.25))):
        ob(f'glow{k}', C.ellipsoid(Vector((x, -0.3, z)), (0.08, 0.03, 0.06)), glow('#ff7a1a', 1.2), 0)
    flame(Vector((0.05, 0, 0.28)), 0.55)


def r_flame_dagger(_):
    ob('blade', C.cone(Vector((0, 0, 0.25)), 0.12, 0.0, 0.85, seg=4, rot=Euler((0, 0, math.radians(45)))), metal_m('#d4dde6'))
    ob('edge', C.cone(Vector((0, -0.02, 0.2)), 0.07, 0.0, 0.7, seg=4, rot=Euler((0, 0, math.radians(45)))), glow('#ff7a1a', 0.9), O * 0.4)
    ob('guard', C.box(Vector((0, 0, -0.2)), (0.44, 0.12, 0.08)), metal_m('#e8b23a'))
    ob('grip', C.tube([Vector((0, 0, -0.22)), Vector((0, 0, -0.62))], 0.06, seg=8), m('grip', '#7a2a1a'))
    ob('pommel', C.ellipsoid(Vector((0, 0, -0.66)), (0.08, 0.08, 0.08)), metal_m('#e8b23a'), O * 0.5)


def r_icicle(_):
    saved = C.FACET
    C.FACET = 6
    for k, (x, h, r) in enumerate(((0, 1.1, 0.16), (-0.3, 0.75, 0.11), (0.28, 0.85, 0.12))):
        ob(f'ice{k}', C.cone(Vector((x, 0, 0.45 - h / 2)), r, 0.0, h, seg=6, rot=Euler((math.radians(180), 0, 0))), m('ice', '#b8f0ff', rough=0.15, emit='#e0faff', es=0.35))
    C.FACET = saved
    ob('ledge', C.box(Vector((0, 0, 0.5)), (0.9, 0.3, 0.1)), m('snow', '#f4f8ff'))


def r_frost_cloak(_):
    cloak = C.cone(Vector((0, 0, -0.1)), 0.6, 0.2, 1.0, seg=12)
    ob('cloak', cloak, m('cloak', '#5a8ac4'))
    ob('collar', C.torus(Vector((0, 0, 0.38)), 0.24, 0.07, seg=14, ring=6), m('fur', '#f4f8ff'))
    ob('clasp', C.ellipsoid(Vector((0, -0.26, 0.36)), (0.08, 0.04, 0.08)), m('gem', '#b8f0ff', emit='#e0faff', es=0.6), O * 0.5)
    for k in range(4):
        ob(f'flake{k}', C.ellipsoid(Vector((-0.3 + 0.2 * k, -0.42, -0.1 - 0.12 * (k % 2))), (0.04, 0.02, 0.04)), glow('#f4f8ff', 1.0), 0)


def r_silver_button(_):
    ob('btn', C.tube([Vector((0, 0.05, 0)), Vector((0, -0.05, 0))], 0.45, seg=16), metal_m('#c8d0d8'))
    ob('rim', C.torus(Vector((0, -0.055, 0)), 0.4, 0.04, seg=16, ring=6, rot=Euler((math.radians(90), 0, 0))), metal_m('#a3acb6'))
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        ob(f'hole{k}', C.ellipsoid(Vector((0.12 * math.cos(a), -0.07, 0.12 * math.sin(a))), (0.045, 0.02, 0.045)), m('hole', '#3b4148'), 0)


def r_gold_map(_):
    scroll = C.box(Vector((0, 0, 0)), (1.0, 0.03, 0.7))
    for v in scroll.verts:
        v.co.y += 0.05 * math.sin(v.co.x * 5)
    ob('map', scroll, m('paper', '#f2d68a'))
    for sx in (-1, 1):
        ob(f'roll{sx}', C.tube([Vector((sx * 0.52, 0, -0.38)), Vector((sx * 0.52, 0, 0.38))], 0.07, seg=8), m('roll', '#c99a3a'))
    ob('path', C.tube([Vector((-0.3, -0.05, -0.2)), Vector((-0.05, -0.05, 0.05)), Vector((0.2, -0.05, -0.05)), Vector((0.3, -0.05, 0.18))], 0.02, seg=4), m('ink', '#8a3a1a'), 0)
    ob('x', C.box(Vector((0.3, -0.06, 0.18)), (0.12, 0.01, 0.03), rot=Euler((0, math.radians(45), 0))), m('x', '#e0283c'), 0)
    ob('x2', C.box(Vector((0.3, -0.06, 0.18)), (0.12, 0.01, 0.03), rot=Euler((0, math.radians(-45), 0))), m('x', '#e0283c'), 0)


def r_dandelion(_):
    ob('stem', C.tube([Vector((0, 0, -0.8)), Vector((0.05, 0, 0.1))], 0.03, seg=6), m('stem', '#6fbf4a'))
    ob('head', C.ellipsoid(Vector((0.05, 0, 0.22)), (0.12, 0.12, 0.12)), m('seedhead', '#d8c89a'))
    for k in range(14):
        a = k * math.pi * 2 / 14
        tip = Vector((0.05 + 0.4 * math.cos(a), 0, 0.22 + 0.4 * math.sin(a)))
        ob(f'pap{k}', C.ellipsoid(tip, (0.06, 0.03, 0.06)), m('fluff', '#ffffff'), O * 0.4)
    for k in range(3):
        ob(f'fly{k}', C.ellipsoid(Vector((0.55 + 0.12 * k, -0.05, 0.55 + 0.1 * k)), (0.04, 0.02, 0.04)), m('fluff', '#ffffff'), O * 0.3)


def r_pinwheel(_):
    ob('stick', C.tube([Vector((0, 0.05, -0.85)), Vector((0, 0.05, 0.1))], 0.035, seg=6), m('stick', WOOD))
    for k, c in enumerate(('#e8452c', '#f2c232', '#3fb6f0', '#6fbf4a')):
        a = k * math.pi / 2
        ob(f'blade{k}', C.cone(Vector((0.22 * math.cos(a), 0, 0.15 + 0.22 * math.sin(a))), 0.24, 0.0, 0.04, seg=3, rot=Euler((math.radians(90), a, 0))), m('paper', c))
    ob('pin', C.ellipsoid(Vector((0, -0.04, 0.15)), (0.06, 0.04, 0.06)), metal_m('#f2c232'), O * 0.5)


def r_clay_doll(_):
    ob('body', C.ellipsoid(Vector((0, 0, -0.3)), (0.3, 0.25, 0.4)), m('clay', '#c97a4a'))
    ob('head', C.ellipsoid(Vector((0, 0, 0.25)), (0.24, 0.22, 0.22)), m('clay', '#d98a5a'))
    for sx in (-1, 1):
        ob(f'eye{sx}', C.ellipsoid(Vector((sx * 0.08, -0.2, 0.28)), (0.035, 0.02, 0.035)), m('eye', '#3b2415'), 0)
        ob(f'arm{sx}', C.ellipsoid(Vector((sx * 0.32, 0, -0.2)), (0.1, 0.08, 0.2), rot=Euler((0, math.radians(sx * 25), 0))), m('clay', '#c97a4a'))
    ob('band', C.torus(Vector((0, 0, -0.1)), 0.28, 0.035, seg=14, ring=4), m('band', '#3f7fc4'), O * 0.5)


def r_bronze_shovel(_):
    ob('shaft', C.tube([Vector((0, 0, -0.2)), Vector((0, 0, 0.75))], 0.045, seg=8), m('shaft', WOOD))
    ob('grip', C.torus(Vector((0, 0, 0.82)), 0.1, 0.035, seg=10, ring=4, rot=Euler((math.radians(90), 0, 0))), m('grip', WOOD_D))
    ob('blade', C.ellipsoid(Vector((0, 0, -0.45)), (0.3, 0.06, 0.32), egg=0.3), metal_m('#c9893a'))
    ob('rivet', C.ellipsoid(Vector((0, -0.07, -0.22)), (0.04, 0.02, 0.04)), metal_m('#e8b23a'), O * 0.4)


def r_firefly_jar(_):
    ob('jar', C.tube([Vector((0, 0, -0.55)), Vector((0, 0, 0.35))], 0.36, seg=12), m('glass', '#9fc8e8', rough=0.2))
    ob('lid', C.tube([Vector((0, 0, 0.35)), Vector((0, 0, 0.47))], 0.38, seg=12), metal_m('#a3acb6'))
    for k, (x, z) in enumerate(((-0.12, -0.25), (0.14, -0.05), (0.0, 0.18), (-0.15, 0.05), (0.12, -0.35))):
        ob(f'fly{k}', C.ellipsoid(Vector((x, -0.3, z)), (0.05, 0.03, 0.05)), glow('#d4ff6a', 1.4), 0)


def r_star_arrow(_):
    ob('shaft', C.tube([Vector((-0.6, 0, -0.5)), Vector((0.4, 0, 0.4))], 0.035, seg=6), m('shaft', '#f4ead6'))
    ob('tip', C.cone(Vector((0.48, 0, 0.47)), 0.16, 0.0, 0.08, seg=5, rot=Euler((0, math.radians(45), 0))), glow('#ffe066', 1.2))
    for k in range(2):
        ob(f'fl{k}', C.box(Vector((-0.55, 0, -0.45 + 0.06 * k)), (0.18, 0.02, 0.08), rot=Euler((0, math.radians(-45 + 30 * k), 0))), m('fletch', '#c9a0ff'), O * 0.5)
    pts = [Vector((-0.6 - 0.08 * k, 0.02, -0.5 - 0.08 * k)) for k in range(4)]
    ob('trail', C.tube(pts, interp([0.06, 0.01], len(pts)), seg=4), glow('#fff2b0', 0.9), 0)


def r_clam_shell(_):
    for k in range(9):
        a = math.radians(-70 + 17.5 * k)
        ob(f'rib{k}', C.ellipsoid(Vector((0.3 * math.sin(a), 0, -0.2 + 0.3 * math.cos(a))), (0.09, 0.07, 0.3), rot=Euler((0, a, 0))), m('shell', '#f4c8b0' if k % 2 else '#ffd8c0'))
    ob('hinge', C.ellipsoid(Vector((0, 0, -0.42)), (0.16, 0.1, 0.08)), m('hinge', '#d89a7a'))


def r_water_drop(_):
    ob('drop', C.ellipsoid(Vector((0, 0, -0.08)), (0.4, 0.4, 0.5), egg=-0.45), m('water', '#4fa8e8', rough=0.15, emit='#7fd8ff', es=0.3))
    ob('shine', C.ellipsoid(Vector((-0.14, -0.33, 0.08)), (0.07, 0.02, 0.14)), m('shine', '#ffffff', emit='#ffffff', es=0.5), 0)
    ob('ripple', C.torus(Vector((0, 0, -0.6)), 0.5, 0.03, seg=18, ring=4), m('ripple', '#7fd8ff'), O * 0.4)


def r_kingfisher_feather(_):
    pts = spline([Vector((-0.25, 0, -0.75)), Vector((0.0, 0, -0.1)), Vector((0.15, 0, 0.45)), Vector((0.1, 0, 0.8))], 14)
    ob('quill', C.tube(pts, interp([0.03, 0.025, 0.02, 0.01], len(pts)), seg=6), m('quill', '#fff0d0'))
    ob('vane', C.ellipsoid(Vector((0.08, 0.01, 0.2)), (0.18, 0.03, 0.55), rot=Euler((0, math.radians(-12), 0))), m('vane', '#1fa3c4'))
    ob('tip', C.ellipsoid(Vector((0.13, 0.0, 0.6)), (0.1, 0.035, 0.16), rot=Euler((0, math.radians(-12), 0))), m('tip', '#f28c28'))


def r_reed_rod(_):
    ob('rod', C.tube([Vector((-0.55, 0, -0.75)), Vector((0.45, 0, 0.7))], 0.035, seg=6), m('rod', '#c9b25a'))
    pts = [Vector((0.45, -0.02, 0.7)), Vector((0.55, -0.02, 0.2)), Vector((0.55, -0.02, -0.3))]
    ob('line', C.tube(pts, 0.01, seg=4), m('line', '#f4ead6'), 0)
    ob('bob', C.ellipsoid(Vector((0.55, -0.02, -0.35)), (0.08, 0.08, 0.1)), m('bob', '#e8452c'))
    ob('reel', C.tube([Vector((-0.35, 0.06, -0.45)), Vector((-0.35, -0.06, -0.45))], 0.1, seg=10), metal_m('#a3acb6'))
    ob('fish', C.ellipsoid(Vector((0.3, 0, -0.62)), (0.22, 0.08, 0.1)), m('fish', '#5fa8d8'), O * 0.6)


def r_coral_crown(_):
    ob('band', C.tube([Vector((0, 0, -0.35)), Vector((0, 0, -0.12))], 0.42, seg=12), metal_m('#e8b23a'))
    for k in range(6):
        a = k * math.pi / 3
        base = Vector((0.38 * math.cos(a), 0.38 * math.sin(a), -0.1))
        ob(f'cor{k}', C.tube([base, base + Vector((0.05 * math.cos(a), 0.05 * math.sin(a), 0.35 + 0.1 * (k % 2)))], [0.06, 0.03], seg=6), m('coral', '#ff7a8a'))
    ob('pearl', C.ellipsoid(Vector((0, -0.43, -0.24)), (0.08, 0.06, 0.08)), m('pearl', '#fff8ff', emit='#f0f0ff', es=0.3), O * 0.5)


def r_tide_compass(_):
    ob('case', C.tube([Vector((0, 0.06, 0)), Vector((0, -0.06, 0))], 0.55, seg=16), metal_m('#5fa8c4'))
    ob('face', C.tube([Vector((0, -0.06, 0)), Vector((0, -0.08, 0))], 0.45, seg=16), m('face', '#e8f4ff'), O * 0.5)
    pts = [Vector((-0.3 + 0.1 * k, -0.1, -0.05 + 0.06 * math.sin(k * 1.4))) for k in range(7)]
    ob('wave', C.tube(pts, 0.025, seg=4), m('wave', '#3f88c4'), 0)
    ob('needle', C.box(Vector((0, -0.11, 0.08)), (0.05, 0.02, 0.5), rot=Euler((0, math.radians(-35), 0))), m('needle', '#1f5a8a'), O * 0.4)
    ob('ring', C.torus(Vector((0, 0, 0.62)), 0.1, 0.03, seg=10, ring=4, rot=Euler((math.radians(90), 0, 0))), metal_m('#e8b23a'))


def r_mermaid_harp(_):
    pts = spline([Vector((-0.4, 0, -0.6)), Vector((-0.45, 0, 0.2)), Vector((-0.1, 0, 0.65)), Vector((0.35, 0, 0.55))], 14)
    ob('frame', C.tube(pts, 0.06, seg=8), metal_m('#e8b23a'))
    ob('pillar', C.tube([Vector((-0.4, 0, -0.6)), Vector((0.35, 0, -0.6)), Vector((0.35, 0, 0.55))], 0.05, seg=8), metal_m('#e8b23a'))
    for k in range(5):
        x = -0.25 + 0.13 * k
        ob(f'str{k}', C.tube([Vector((x, -0.02, -0.55)), Vector((x, -0.02, 0.45 - 0.05 * (k - 2) ** 2 * 0.3))], 0.012, seg=4), m('str', '#f4f8ff'), 0)
    ob('shell', C.ellipsoid(Vector((-0.1, -0.05, 0.62)), (0.12, 0.05, 0.1)), m('shell', '#ffc8d8'), O * 0.5)


def r_sea_tear(_):
    # 2판 (2026-10-29 "물방울과 비슷해 보인다") — 맨 물방울(파랑 · 물결 고리) 대신 보라 눈물 보석 펜던트:
    # 금 갓 · 고리 · 사슬이 달린 실루엣으로 물방울과 색 · 모양을 갈라 놓는다
    ob('tear', C.ellipsoid(Vector((0, 0, -0.18)), (0.32, 0.27, 0.44), egg=-0.45), m('tear', '#8b5cf6', rough=0.12, emit='#c4b5fd', es=0.55))
    ob('core', C.ellipsoid(Vector((0, -0.11, -0.26)), (0.12, 0.07, 0.16)), glow('#f5f3ff', 1.0), 0)
    ob('shine', C.ellipsoid(Vector((-0.12, -0.24, -0.02)), (0.05, 0.02, 0.11)), m('shine', '#ffffff', emit='#ffffff', es=0.6), 0)
    ob('cap', C.ellipsoid(Vector((0, 0, 0.27)), (0.13, 0.13, 0.08)), metal_m('#f2c232'))
    ob('bail', C.torus(Vector((0, 0, 0.42)), 0.09, 0.028, seg=14, ring=6, rot=Euler((math.radians(90), 0, 0))), metal_m('#e0a92a'))
    chain = spline([Vector((-0.62, 0, 0.82)), Vector((-0.3, 0, 0.6)), Vector((0, 0, 0.5)), Vector((0.3, 0, 0.6)), Vector((0.62, 0, 0.82))], 16)
    ob('chain', C.tube(chain, 0.022, seg=6), metal_m('#d9dde3'))
    for k, (x, z) in enumerate(((-0.42, -0.2), (0.4, -0.38), (0.36, 0.05))):
        ob(f'sp{k}', C.ellipsoid(Vector((x, -0.1, z)), (0.035, 0.02, 0.035)), glow('#fff7c0', 1.2), 0)

# ── 재화 아이콘 (2026-10-26 사용자: "붉은 보석, 강화석도 UI 가 너무 복잡해 조금 더 단순하게" · "성장은 도토리인데 골드로" — 골드가 도토리 그림이었다)
# 장식 테두리 없이 물건 하나 — 금화 한 닢 · 루비 한 알 · 푸른 결정 하나. → public/ui/attendance/{gold,gem,enhance-stone}.png (128²)
def cur_gold(_):
    ob('coin', C.tube([Vector((0, 0.07, 0)), Vector((0, -0.07, 0))], 0.66, seg=16), metal_m('#f2c232'))
    ob('rim', C.torus(Vector((0, -0.075, 0)), 0.58, 0.05, seg=16, ring=6, rot=Euler((math.radians(90), 0, 0))), metal_m('#d99a14'))
    ob('face', C.tube([Vector((0, -0.07, 0)), Vector((0, -0.1, 0))], 0.4, seg=16), metal_m('#ffd95a'), O * 0.6)
    ob('shine', C.ellipsoid(Vector((-0.2, -0.12, 0.2)), (0.07, 0.02, 0.12)), m('shine', '#fff7c0', rough=0.3, emit='#fff7c0', es=0.7), 0)


def cur_gem(_):
    saved = C.FACET
    C.FACET = 8
    ob('crown', C.cone(Vector((0, 0, 0.16)), 0.6, 0.36, 0.3, seg=8), m('ruby', '#e0283c', rough=0.25, emit='#ff4a5a', es=0.25))
    ob('pavilion', C.cone(Vector((0, 0, -0.3)), 0.0, 0.6, 0.62, seg=8), m('ruby_d', '#b81428', rough=0.25, emit='#e0283c', es=0.2))
    ob('table', C.cone(Vector((0, 0, 0.32)), 0.36, 0.36, 0.02, seg=8), m('ruby_t', '#ff6070', rough=0.2, emit='#ff8a96', es=0.35), 0)
    C.FACET = saved


def cur_stone(_):
    saved = C.FACET
    C.FACET = 6
    ob('body', C.cone(Vector((0, 0, -0.14)), 0.46, 0.46, 0.62, seg=6), m('crys', '#3fb6f0', rough=0.25, emit='#7fd8ff', es=0.3))
    ob('tip', C.cone(Vector((0, 0, 0.36)), 0.46, 0.0, 0.4, seg=6), m('crys_t', '#8ae4ff', rough=0.2, emit='#b8f0ff', es=0.4))
    ob('base', C.ellipsoid(Vector((0, 0.05, -0.5)), (0.62, 0.34, 0.08)), m('rock', '#8a7a6a', rough=0.95))
    C.FACET = saved


CUR_JOBS = {
    'cur-gold': (cur_gold, (-18, 8), 1.6), 'cur-gem': (cur_gem, (-14, 18), 1.6), 'cur-stone': (cur_stone, (-16, 10), 1.6),
}

QUEST_JOBS = {
    'quest-twigs': (q_twigs, (-14, 10), 1.7), 'quest-acorns': (q_acorns, (-14, 16), 1.6), 'quest-dam-patch': (q_dam_patch, (-20, 14), 1.7),
    'quest-river-patrol': (q_river_patrol, (-10, 12), 1.7), 'quest-log-haul': (q_log_haul, (-22, 14), 1.7), 'quest-village-guard': (q_village_guard, (-14, 10), 1.8),
    'quest-dam-road': (q_dam_road, (-16, 12), 1.7), 'quest-great-dam': (q_great_dam, (-28, 18), 1.7),
    # 2026-10-28 새 22줄
    'quest-reed-weave': (q_reed_weave, (-16, 12), 1.7),
    'quest-mud-haul': (q_mud_haul, (-16, 12), 1.7),
    'quest-fish-catch': (q_fish_catch, (-16, 12), 1.7),
    'quest-lily-garden': (q_lily_garden, (-16, 12), 1.7),
    'quest-bark-strip': (q_bark_strip, (-16, 12), 1.7),
    'quest-lantern-light': (q_lantern_light, (-16, 12), 1.7),
    'quest-stone-stack': (q_stone_stack, (-16, 12), 1.7),
    'quest-stepping-stones': (q_stepping_stones, (-16, 12), 1.7),
    'quest-mill-wheel': (q_mill_wheel, (-16, 12), 1.7),
    'quest-honey-gather': (q_honey_gather, (-16, 12), 1.7),
    'quest-raft-build': (q_raft_build, (-16, 12), 1.7),
    'quest-watchtower': (q_watchtower, (-16, 12), 1.7),
    'quest-tool-forge': (q_tool_forge, (-16, 12), 1.7),
    'quest-market-trade': (q_market_trade, (-16, 12), 1.7),
    'quest-canal-dig': (q_canal_dig, (-16, 12), 1.7),
    'quest-storehouse': (q_storehouse, (-16, 12), 1.7),
    'quest-river-lighthouse': (q_river_lighthouse, (-16, 12), 1.7),
    'quest-festival': (q_festival, (-16, 12), 1.7),
    'quest-royal-banner': (q_royal_banner, (-16, 12), 1.7),
    'quest-crystal-mine': (q_crystal_mine, (-16, 12), 1.7),
    'quest-star-reservoir': (q_star_reservoir, (-16, 12), 1.7),
    'quest-beaver-kingdom': (q_beaver_kingdom, (-16, 12), 1.7),
}

# 2026-10-28 유물 3판 새 27종
RELIC_JOBS_V3 = {
    'ember-spark': (r_ember_spark, (-16, 12), 1.7),
    'phoenix-plume': (r_phoenix_plume, (-16, 12), 1.7),
    'sun-core': (r_sun_core, (-16, 12), 1.7),
    'frost-pebble': (r_frost_pebble, (-16, 12), 1.7),
    'glacier-shield': (r_glacier_shield, (-16, 12), 1.7),
    'winter-crown': (r_winter_crown, (-16, 12), 1.7),
    'copper-coin': (r_copper_coin, (-16, 12), 1.7),
    'treasure-chest': (r_treasure_chest, (-16, 12), 1.7),
    'king-scepter': (r_king_scepter, (-16, 12), 1.7),
    'wind-leaf': (r_wind_leaf, (-16, 12), 1.7),
    'reed-flute': (r_reed_flute, (-16, 12), 1.7),
    'feather-fan': (r_feather_fan, (-16, 12), 1.7),
    'storm-bell': (r_storm_bell, (-16, 12), 1.7),
    'cloud-wing': (r_cloud_wing, (-16, 12), 1.7),
    'tempest-eye': (r_tempest_eye, (-16, 12), 1.7),
    'river-stone': (r_river_stone, (-16, 12), 1.7),
    'oak-shield': (r_oak_shield, (-16, 12), 1.7),
    'mossy-totem': (r_mossy_totem, (-16, 12), 1.7),
    'mountain-heart': (r_mountain_heart, (-16, 12), 1.7),
    'ancient-root': (r_ancient_root, (-16, 12), 1.7),
    'world-seed': (r_world_seed, (-16, 12), 1.7),
    'star-sand': (r_star_sand, (-16, 12), 1.7),
    'moon-shell': (r_moon_shell, (-16, 12), 1.7),
    'comet-shard': (r_comet_shard, (-16, 12), 1.7),
    'star-compass': (r_star_compass, (-16, 12), 1.7),
    'galaxy-pearl': (r_galaxy_pearl, (-16, 12), 1.7),
    'aurora-orb': (r_aurora_orb, (-16, 12), 1.7),
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
JOBS.update(RELIC_JOBS_V3)
# 2026-10-28 유물 4판 새 20종
RELIC_JOBS_V4 = {
    'cinder-chunk': (r_cinder_chunk, (-16, 12), 1.7),
    'flame-dagger': (r_flame_dagger, (-16, 12), 1.7),
    'icicle': (r_icicle, (-16, 12), 1.7),
    'frost-cloak': (r_frost_cloak, (-16, 12), 1.7),
    'silver-button': (r_silver_button, (-16, 12), 1.7),
    'gold-map': (r_gold_map, (-16, 12), 1.7),
    'dandelion': (r_dandelion, (-16, 12), 1.7),
    'pinwheel': (r_pinwheel, (-16, 12), 1.7),
    'clay-doll': (r_clay_doll, (-16, 12), 1.7),
    'bronze-shovel': (r_bronze_shovel, (-16, 12), 1.7),
    'firefly-jar': (r_firefly_jar, (-16, 12), 1.7),
    'star-arrow': (r_star_arrow, (-16, 12), 1.7),
    'clam-shell': (r_clam_shell, (-16, 12), 1.7),
    'water-drop': (r_water_drop, (-16, 12), 1.7),
    'kingfisher-feather': (r_kingfisher_feather, (-16, 12), 1.7),
    'reed-rod': (r_reed_rod, (-16, 12), 1.7),
    'coral-crown': (r_coral_crown, (-16, 12), 1.7),
    'tide-compass': (r_tide_compass, (-16, 12), 1.7),
    'mermaid-harp': (r_mermaid_harp, (-16, 12), 1.7),
    'sea-tear': (r_sea_tear, (-16, 12), 1.7),
}
JOBS.update(RELIC_JOBS_V4)
JOBS.update(CUR_JOBS)
RELICS = ['ember-ring', 'flame-feather', 'lava-heart', 'frost-horn', 'snow-crystal', 'ice-lantern', 'golden-acorn', 'lucky-coin', 'beaver-crown', 'shard'] + list(RELIC_JOBS_V3) + list(RELIC_JOBS_V4)

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['relics', 'tree']
names = []
for a in argv:
    if a == 'relics':
        names += RELICS
    elif a == 'quests':
        names += list(QUEST_JOBS)
    elif a == 'relics3':
        names += list(RELIC_JOBS_V3)
    elif a == 'relics4':
        names += list(RELIC_JOBS_V4)
    elif a == 'quests2':
        names += [k for k in QUEST_JOBS if k[len('quest-'):] in ('reed-weave', 'mud-haul', 'fish-catch', 'lily-garden', 'bark-strip', 'lantern-light', 'stone-stack', 'stepping-stones', 'mill-wheel', 'honey-gather', 'raft-build', 'watchtower', 'tool-forge', 'market-trade', 'canal-dig', 'storehouse', 'river-lighthouse', 'festival', 'royal-banner', 'crystal-mine', 'star-reservoir', 'beaver-kingdom')]
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
