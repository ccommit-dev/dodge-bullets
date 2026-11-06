"""유물 · 결정 강화 트리 아이콘 (2026-10-26, 사용자: "오늘도 환생 2" 차용 — "리소스도 모두 현재 아트에 어색하지 않게 새로 생성").
장비 파츠(gear_icons.py)와 같은 그림체 — 각진 면 · 무광 · 잉크 외곽선 · 장난감 조명.
  blender -b -P art-gen/blender/relic_icons.py -- [relics|tree|<이름>…]   → art-gen/out/b3d-relics/<이름>.png (512² 투명)
조립: node scripts/assemble-relics.mjs (public/titans/relics/<이름>.png)
한 프로세스에 그림 여럿이 멈추면(로우 폴리 렌더) 이름 하나씩 따로 돌린다.
다른 세션이 전체 검사(scripts/verify-all.mjs)를 돌리는 중이면 렌더하지 않는다 — 부하에 민감한 고정 대기가 깨진다. 틈을 받아 우선순위를 낮추고(BelowNormal) 한 번에 하나씩(유물 28개 약 2분 반)."""
import bpy
import sys
import os
import math
from mathutils import Vector, Euler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import bcommon as C
from lib.beaver import spline, interp

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTDIR = os.environ.get('RELIC_OUT') or os.path.join(ROOT, 'art-gen', 'out', 'b3d-relics')   # 시험 렌더는 RELIC_OUT 으로 따로
O = 0.022

# 선명 모드 (2026-11-06, 사용자: "유물 아이콘을 더 강렬하고 갖고 싶게 · 특징에 맞게") — 유물을 그릴 때만 켠다(퀘스트 · 결정 트리 그림은 그대로).
# 모양은 그대로 두고 색 채도 · 유광 코팅 · 금속 반짝임 · 발광 세기와 계열 림 라이트만 올린다. 세기는 등급(VIVID_K)
VIVID = False
VIVID_K = 1.0


def _vivid_hex(c):
    """채도를 올린 색 — HSV 채도 ×1.38 · 명도 ×1.05 (흰색 · 회색은 그대로)"""
    import colorsys
    h = c.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    hh, ss, vv = colorsys.rgb_to_hsv(r, g, b)
    r, g, b = colorsys.hsv_to_rgb(hh, min(1.0, ss * 1.38), min(1.0, vv * 1.05))
    return '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255))


def m(name, color, rough=0.75, metal=0.0, emit=None, es=0.0, matte=False):
    """matte — 선명 모드에서도 유광 코팅을 입히지 않는다. 각진 평면 바위는 면 전체가 면광원을 통째로 반사해 짙은 갈색이 크림색으로 떴다(산의 심장)"""
    if VIVID and isinstance(color, str):
        color = _vivid_hex(color)
        emit = _vivid_hex(emit) if isinstance(emit, str) else emit
        es = es * (2.0 + 0.6 * (VIVID_K - 1))
        return C.principled(f'relicV_{name}_{color}_{metal}_{es}{"_m" if matte else ""}', color, rough=rough if matte else rough * 0.78, metal=metal, coat=0.0 if matte else 0.35, emit=emit, emit_strength=es)
    return C.principled(f'relic_{name}_{color}_{metal}_{es}', color, rough=rough, metal=metal, coat=0.0, emit=emit, emit_strength=es)


def ob(name, bm, mat, outline=O):
    return C.mesh_obj(name, bm, mat, outline=outline)


def metal_m(c):
    if VIVID:
        return m('metal', c, rough=0.24, metal=0.6)   # 0.82 는 반사할 환경이 없어 금이 갈색으로 어두워졌다
    return m('metal', c, rough=0.45, metal=0.55)


def glow(c, es=0.9):
    return m('glow', c, rough=0.3, emit=c, es=es)


def gem(name, c, at, r=0.07):
    saved = C.FACET
    C.FACET = 6
    ob(name, C.ellipsoid(at, (r, r * 0.6, r * 1.2)), m('gem', c, rough=0.12 if VIVID else 0.25, emit=c, es=0.85 if VIVID else 0.6), O * 0.5)
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


# ── 서리 계열 ──
def frost_horn(_):
    pts = spline([Vector((-0.55, 0, -0.35)), Vector((-0.1, 0, -0.45)), Vector((0.35, 0, -0.1)), Vector((0.5, 0, 0.45))], 18)
    ob('horn', C.tube(pts, interp([0.06, 0.12, 0.2, 0.28], len(pts)), seg=10), m('ice', '#bfe8ff', rough=0.4))
    for k in (5, 10, 15):
        p = pts[k]
        ob(f'band{k}', C.tube([p + Vector((-0.02, 0, -0.02)), p + Vector((0.02, 0, 0.02))], [0.06, 0.12, 0.2, 0.28][min(3, k // 5)] + 0.035, seg=10), metal_m('#d4dde6'))
    ob('mouth', C.ellipsoid(pts[-1] + Vector((0, -0.02, 0.02)), (0.25, 0.25, 0.06)), glow('#7fd4ff', 0.8), O * 0.6)
    ob('tipcap', C.ellipsoid(pts[0], (0.08, 0.08, 0.08)), metal_m('#d4dde6'))


# ── 황금 계열 ──
def lucky_coin(_):
    rot = Euler((math.radians(90), 0, 0))
    ob('coin', C.tube([Vector((0, 0.06, 0)), Vector((0, -0.06, 0))], 0.62, seg=16), metal_m('#f2c232'))
    ob('rim', C.torus(Vector((0, -0.07, 0)), 0.56, 0.04, seg=16, ring=6, rot=rot), metal_m('#e8a21a'))
    for k in range(4):   # 네잎 클로버 무늬
        a = math.pi / 4 + k * math.pi / 2
        ob(f'leaf{k}', C.ellipsoid(Vector((0.15 * math.cos(a), -0.09, 0.15 * math.sin(a))), (0.13, 0.04, 0.13)), m('leaf', '#5fb84a'), O * 0.6)
    ob('dot', C.ellipsoid(Vector((0, -0.12, 0)), (0.05, 0.03, 0.05)), metal_m('#fff0a0'), O * 0.5)


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


def r_frost_pebble(_):
    ob('stone', C.ellipsoid(Vector((0, 0, -0.1)), (0.5, 0.36, 0.34)), m('stone', '#9ab8cc', rough=0.7))
    for k in range(4):
        ob(f'frost{k}', C.ellipsoid(Vector((-0.25 + 0.17 * k, -0.25, 0.08 + 0.05 * (k % 2))), (0.08, 0.04, 0.05)), m('frost', '#e8f8ff', emit='#e8f8ff', es=0.3), O * 0.4)


def r_copper_coin(_):
    ob('coin', C.tube([Vector((0, 0.06, 0)), Vector((0, -0.06, 0))], 0.55, seg=16), metal_m('#c87a3a'))
    ob('hole', C.box(Vector((0, -0.07, 0)), (0.18, 0.02, 0.18)), m('hole', '#3b2415'), 0)
    ob('rim', C.torus(Vector((0, -0.065, 0)), 0.48, 0.04, seg=16, ring=6, rot=Euler((math.radians(90), 0, 0))), metal_m('#a8602a'))


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


# ── 유물 5판 장식 (2026-11-06, 사용자: "마저수정" — 선명 재질만 올린 4판 뒤 남은 것: 모양) ──
# 영웅(SR) 이상 28종은 보석을 금 · 은 테에 박고, 금 덩굴 · 깃 · 받침 같은 장식으로 실루엣까지 키운다. 일반(N) · 희귀(R)는 그대로 — 등급 차이가 모양으로도 보이게.
# 넓은 단색 면(화염 깃털 깃 · 산의 심장 바위)은 여러 장 · 여러 톤으로 쪼갠다.
GOLD, GOLD_D, SILVER = '#f2c232', '#d99a1e', '#d4dde6'
_FRONT = Euler((math.radians(90), 0, 0))   # 고리를 앞(−y)으로 세운다


def jewel(name, c, at, r=0.08, rim=GOLD):
    """테 박힌 보석 — 깎은 둥근 알 + 금(은) 테. 앞(−y)을 본다"""
    saved = C.FACET
    C.FACET = 6
    ob(name, C.ellipsoid(at, (r, r * 0.55, r)), m('gem', c, rough=0.12 if VIVID else 0.25, emit=c, es=0.9 if VIVID else 0.6), O * 0.5)
    C.FACET = saved
    ob(f'{name}_rim', C.torus(at + Vector((0, 0.015, 0)), r * 1.08, r * 0.26, seg=12, ring=5, rot=_FRONT), metal_m(rim), O * 0.45)


def stud(name, at, r=0.04, c=GOLD):
    ob(name, C.ellipsoid(at, (r, r, r)), metal_m(c), O * 0.4)


def curl(name, at, sx=1, s=1.0, c=GOLD):
    """금 덩굴 무늬 — 바깥(sx)으로 말린 C 자"""
    pts = spline([at, at + Vector((sx * 0.12 * s, 0, 0.1 * s)), at + Vector((sx * 0.24 * s, 0, 0.02 * s)), at + Vector((sx * 0.2 * s, 0, -0.1 * s)), at + Vector((sx * 0.1 * s, 0, -0.06 * s))], 12)
    ob(name, C.tube(pts, interp([0.03 * s, 0.026 * s, 0.02 * s, 0.014 * s], len(pts)), seg=6), metal_m(c), O * 0.5)


def plume(name, base, ang, ln, w, c, tip=None, y=0.0):
    """깃 한 장 — base 에서 ang 도(0 = 위, + 오른쪽)로 ln. tip 색을 끝에 겹쳐 넓은 단색 면을 쪼갠다"""
    a = math.radians(ang)
    d = Vector((math.sin(a), 0, math.cos(a)))
    rot = Euler((0, a, 0))
    ob(name, C.ellipsoid(base + d * (ln * 0.5) + Vector((0, y, 0)), (w, 0.03, ln * 0.5), rot=rot), m(name, c))
    if tip:
        ob(f'{name}_t', C.ellipsoid(base + d * (ln * 0.8) + Vector((0, y - 0.025, 0)), (w * 0.72, 0.025, ln * 0.2), rot=rot), m(f'{name}t', tip), O * 0.5)


def prism(name, outline_xz, depth, mat, y=0.0, outline=O):
    """볼록한 윤곽(x, z)을 앞뒤로 민 판 — 방패처럼 모서리가 있는 판"""
    import bmesh
    bm = bmesh.new()
    front = [bm.verts.new((x, y - depth / 2, z)) for x, z in outline_xz]
    back = [bm.verts.new((x, y + depth / 2, z)) for x, z in outline_xz]
    bm.faces.new(front)
    bm.faces.new(list(reversed(back)))
    n = len(outline_xz)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((front[i], front[j], back[j], back[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return ob(name, bm, mat, outline)


def tilt_since(before, deg):
    """이 함수가 만든 물체를 원점 기준으로 y 축 deg 도 기울인다(오른쪽 위로) — 가는 막대를 대각선으로 눕혀 칸을 채운다"""
    from mathutils import Matrix
    R = Matrix.Rotation(math.radians(deg), 4, 'Y')
    for o in [o for o in bpy.context.scene.objects if o.name not in before and o.parent is None]:
        o.matrix_world = R @ o.matrix_world


def ember(name, at, r=0.035, c='#ffd34d'):
    ob(name, C.ellipsoid(at, (r, r * 0.6, r)), glow(c, 1.4), 0)


# ── 불 ──
def flame_feather(_):
    # 넓은 빨강 깃 한 장을 깃가지 열두 장(진홍 → 주황 → 노랑)으로 쪼개 결을 낸다 · 깃대 밑 금 고리 + 루비
    pts = spline([Vector((-0.3, 0, -0.78)), Vector((0.0, 0, -0.1)), Vector((0.12, 0, 0.45)), Vector((0.05, 0, 0.82))], 14)
    ob('quill', C.tube(pts, interp([0.03, 0.025, 0.02, 0.01], len(pts)), seg=6), m('quill', '#fff0d0'))
    cols = ('#b8232a', '#d8362a', '#ec5228', '#f6762a', '#ff9a2a', '#ffc23a')
    for k in range(6):
        p = pts[3 + k * 2]
        for sx in (-1, 1):
            plume(f'barb{k}{sx}', p, sx * (46 - 5 * k) + 6, 0.34 - 0.025 * k, 0.115, cols[k], y=0.004 * k)   # 넓고 위로 눕혀 겹쳐야 잎 가지가 아닌 깃으로 읽힌다
    ob('cap', C.torus(pts[2], 0.05, 0.02, seg=10, ring=5), metal_m(GOLD), O * 0.4)
    jewel('ruby', '#ff3a3a', pts[1] + Vector((0, -0.05, 0)), 0.065)
    flame(Vector((0.06, -0.02, 0.86)), 0.7)


def lava_heart(_):
    # 돌 심장 위에 금 받침관 + 루비, 표면 용암 균열, 아래 끝 금 덮개
    for sx in (-1, 1):
        ob(f'lobe{sx}', C.ellipsoid(Vector((sx * 0.24, 0, 0.2)), (0.32, 0.26, 0.32)), m('rock', '#7a2420'))
    ob('tip', C.cone(Vector((0, 0, -0.2)), 0.5, 0.02, 0.6, seg=8, rot=Euler((math.radians(180), 0, 0))), m('rock', '#7a2420'))
    ob('core', C.ellipsoid(Vector((0, -0.2, 0.06)), (0.24, 0.1, 0.26), egg=-0.3), glow('#ff8a1f', 1.3), O * 0.6)
    for k, pts in enumerate((((-0.44, 0.32), (-0.33, 0.2), (-0.38, 0.04)), ((0.42, 0.36), (0.32, 0.22), (0.38, 0.08)), ((-0.14, -0.3), (-0.04, -0.2), (0.08, -0.28)))):
        ob(f'crack{k}', C.tube([Vector((x, -0.27, z)) for x, z in pts], 0.018, seg=4), glow('#ffb03a', 1.2), 0)
    ob('crown', C.cone(Vector((0, 0, 0.4)), 0.2, 0.13, 0.12, seg=8), metal_m(GOLD))
    for k in range(5):
        a = math.radians(-60 + 30 * k)
        stud(f'cp{k}', Vector((0.17 * math.sin(a), -0.12 * math.cos(a), 0.48)), 0.03)
    jewel('ruby', '#ff2a3a', Vector((0, -0.25, 0.36)), 0.07)
    ob('tipcap', C.cone(Vector((0, 0, -0.47)), 0.1, 0.0, 0.14, seg=8, rot=Euler((math.radians(180), 0, 0))), metal_m(GOLD), O * 0.5)
    flame(Vector((0, 0.02, 0.68)), 0.72)


def r_phoenix_plume(_):
    # 막대 셋이던 꽁지깃을 넓은 깃 다섯 장(붉은 바탕 · 금 끝)으로 펼치고, 깃마다 눈 무늬 보석 · 밑동은 금 고리 + 루비 · 불티
    base = Vector((0, 0, -0.62))
    for k, (ang, ln, c, tip) in enumerate(((-38, 0.95, '#d8362a', '#ffb81c'), (-18, 1.15, '#ec5228', '#ffd34d'), (0, 1.3, '#ff6a1a', '#ffe066'), (18, 1.15, '#ec5228', '#ffd34d'), (38, 0.95, '#d8362a', '#ffb81c'))):
        y = 0.03 * abs(k - 2)
        plume(f'pl{k}', base, ang, ln, 0.15 if k == 2 else 0.13, c, tip, y=y)
        a = math.radians(ang)
        gem(f'eye{k}', '#3fb6f0', base + Vector((math.sin(a), 0, math.cos(a))) * (ln * 0.8) + Vector((0, y - 0.07, 0)), 0.05)
    ob('clasp', C.torus(base + Vector((0, 0, 0.06)), 0.09, 0.035, seg=12, ring=5), metal_m(GOLD))
    jewel('ruby', '#ff2a3a', base + Vector((0, -0.09, 0.1)), 0.07)
    for k, (x, z) in enumerate(((-0.55, 0.32), (0.58, 0.18), (-0.2, 0.74))):
        ember(f'ember{k}', Vector((x, -0.12, z)))


def r_sun_core(_):
    # 빛 공 앞에 금 테 태양석, 긴 금빛 살 · 짧은 불꽃 살을 번갈아, 바깥 금 고리에 보석 여덟 알
    ob('core', C.ellipsoid(Vector((0, 0, 0)), (0.36, 0.36, 0.36)), glow('#ffb81c', 1.2))
    for k in range(12):
        a = k * math.pi / 6
        long = k % 2 == 0
        ln = 0.3 if long else 0.18
        d = Vector((math.cos(a), 0, math.sin(a)))
        ob(f'ray{k}', C.cone(d * (0.44 + ln / 2), 0.09 if long else 0.07, 0.0, ln, seg=4, rot=Euler((0, math.pi / 2 - a, 0))), metal_m(GOLD) if long else glow('#ff7a1a', 1.0), O * 0.6)
    ob('ring', C.torus(Vector((0, 0, 0)), 0.42, 0.04, seg=24, ring=6, rot=_FRONT), metal_m('#e8b23a'))
    for k in range(8):
        a = math.pi / 8 + k * math.pi / 4
        gem(f'rg{k}', ('#ff3a3a', '#ffe066')[k % 2], Vector((0.42 * math.cos(a), -0.05, 0.42 * math.sin(a))), 0.04)
    jewel('sunstone', '#ff8a1f', Vector((0, -0.34, 0)), 0.13)


# ── 서리 ──
def snow_crystal(_):
    saved = C.FACET
    C.FACET = 6
    ice = m('flake', '#a8dcff', rough=0.35, emit='#7fd4ff', es=0.35)
    for k in range(6):
        a = math.pi / 2 + 2 * math.pi * k / 6
        d = Vector((math.cos(a), 0, math.sin(a)))
        ob(f'arm{k}', C.tube([d * 0.08, d * 0.7], [0.07, 0.04], seg=6), ice)
        for t, ln in ((0.38, 0.2), (0.58, 0.13)):
            base = d * t
            for sgn in (-1, 1):
                side = Vector((math.cos(a + sgn * 1.0), 0, math.sin(a + sgn * 1.0)))
                ob(f'br{k}{t}{sgn}', C.tube([base, base + side * ln], [0.035, 0.015], seg=5), ice, O * 0.7)
        gem(f'tip{k}', '#e8fbff', d * 0.75 + Vector((0, -0.02, 0)), 0.055)   # 팔 끝 얼음 알
    C.FACET = saved
    # 가운데를 은 테 사파이어로
    jewel('hub', '#3fb6f0', Vector((0, -0.05, 0)), 0.14, rim=SILVER)


def ice_lantern(_):
    ob('core', C.ellipsoid(Vector((0, 0, -0.05)), (0.26, 0.26, 0.34)), glow('#7fd4ff', 1.2), O * 0.5)
    ob('top', C.cone(Vector((0, 0, 0.42)), 0.38, 0.1, 0.22, seg=8), metal_m('#a3acb6'))
    ob('base', C.tube([Vector((0, 0, -0.5)), Vector((0, 0, -0.4))], 0.38, seg=8), metal_m('#a3acb6'))
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        x, y = 0.33 * math.cos(a), 0.33 * math.sin(a)
        ob(f'bar{k}', C.tube([Vector((x, y, -0.42)), Vector((x, y, 0.34))], 0.035, seg=6), metal_m(SILVER))
    ob('ring', C.torus(Vector((0, 0, 0.66)), 0.14, 0.035, seg=12, ring=6, rot=_FRONT), metal_m(SILVER))
    for k in range(3):   # 고드름
        x = -0.2 + 0.2 * k
        ob(f'icicle{k}', C.cone(Vector((x, -0.2, -0.62)), 0.05, 0.0, 0.18, seg=6, rot=Euler((math.radians(180), 0, 0))), m('ice', '#bfe8ff', rough=0.4), O * 0.6)
    # 5판 — 지붕 · 받침 앞 보석, 지붕 옆 은 덩굴, 불빛 안 눈꽃
    jewel('gtop', '#3fb6f0', Vector((0, -0.27, 0.43)), 0.065, rim=SILVER)
    jewel('gbase', '#7fd4ff', Vector((0, -0.38, -0.45)), 0.05, rim=SILVER)
    for sx in (-1, 1):
        curl(f'curl{sx}', Vector((sx * 0.3, -0.05, 0.5)), sx, 0.9, SILVER)
        stud(f'bs{sx}', Vector((sx * 0.27, -0.3, -0.45)), 0.035, SILVER)
    for k in range(3):
        a = k * math.pi / 3
        ob(f'flake{k}', C.box(Vector((0, -0.27, -0.05)), (0.03, 0.01, 0.26), rot=Euler((0, a, 0))), glow('#ffffff', 1.3), 0)


def r_glacier_shield(_):
    # 원뿔 깔때기 대신 진짜 방패 꼴(위 둥근 어깨 · 아래 뾰족), 은 테두리, 가운데 큰 사파이어 + 눈꽃 문장, 위 두 모서리 얼음 가시
    shape = [(-0.55, 0.5), (-0.3, 0.6), (0, 0.63), (0.3, 0.6), (0.55, 0.5), (0.55, 0.0), (0.38, -0.4), (0, -0.72), (-0.38, -0.4), (-0.55, 0.0)]
    prism('shield', shape, 0.14, m('ice', '#8ae4ff', rough=0.2, emit='#b8f0ff', es=0.3))
    rim = [Vector((x * 0.93, -0.08, z * 0.93 - 0.01)) for x, z in shape] + [Vector((shape[0][0] * 0.93, -0.08, shape[0][1] * 0.93 - 0.01))]
    ob('rim', C.tube(rim, 0.04, seg=6), metal_m(SILVER), O * 0.6)
    for k in range(6):
        a = k * math.pi / 3
        ob(f'em{k}', C.box(Vector((0, -0.09, 0.02)), (0.04, 0.01, 0.62), rot=Euler((0, a, 0))), m('emblem', '#e8fbff', emit='#ffffff', es=0.5), 0)
    jewel('g', '#3fb6f0', Vector((0, -0.12, 0.02)), 0.14, rim=SILVER)
    saved = C.FACET
    C.FACET = 6
    for sx in (-1, 1):
        ob(f'spike{sx}', C.cone(Vector((sx * 0.6, 0, 0.68)), 0.08, 0.0, 0.3, seg=6, rot=Euler((0, math.radians(sx * 25), 0))), m('ice', '#b8f0ff', rough=0.2, emit='#e0faff', es=0.4), O * 0.6)
    C.FACET = saved


def r_winter_crown(_):
    # 은 띠 + 흰 털 테, 얼음 가시 일곱(가운데가 가장 높다) · 가시마다 밑에 사파이어, 가운데 큰 보석
    ob('band', C.tube([Vector((0, 0, -0.32)), Vector((0, 0, -0.06))], 0.46, seg=14), metal_m(SILVER))
    ob('fur', C.torus(Vector((0, 0, -0.34)), 0.48, 0.08, seg=16, ring=6), m('fur', '#ffffff', rough=0.9))
    saved = C.FACET
    C.FACET = 6
    for k in range(7):
        t = (k - 3) / 3.0                     # −1 … 1, 앞쪽 반원
        a = -math.pi / 2 + t * 1.25
        h = 0.62 - 0.22 * abs(t) - (0.08 if k % 2 else 0.0)
        base = Vector((0.44 * math.cos(a), 0.44 * math.sin(a), -0.06))
        ob(f'sp{k}', C.cone(base + Vector((0, 0, h / 2)), 0.09 if k == 3 else 0.075, 0.0, h, seg=6), m('ice', '#b8f0ff', rough=0.2, emit='#e0faff', es=0.4))
        if k != 3:
            gem(f'g{k}', '#3f8ff0', base + Vector((0, -0.05, -0.12)), 0.045)
    for k in range(4):                         # 뒤쪽도 비지 않게
        a = math.pi / 2 + (k - 1.5) * 0.7
        ob(f'bk{k}', C.cone(Vector((0.42 * math.cos(a), 0.42 * math.sin(a), 0.12)), 0.06, 0.0, 0.36, seg=6), m('ice', '#b8f0ff', rough=0.2, emit='#e0faff', es=0.4))
    C.FACET = saved
    jewel('g', '#3fb6f0', Vector((0, -0.5, -0.19)), 0.11, rim=SILVER)


# ── 황금 ──
def golden_acorn(_):
    # 황금 열매 (2026-10-26 — 도토리 콘텐츠 삭제에 맞춰 이름 · 그림을 도토리 → 둥근 황금 열매로. id 는 저장 호환으로 그대로)
    ob('fruit', C.ellipsoid(Vector((0, 0, -0.12)), (0.5, 0.48, 0.48)), metal_m('#f2c232'))
    ob('dimple', C.ellipsoid(Vector((0, 0, 0.32)), (0.12, 0.12, 0.05)), metal_m('#c98a12'), O * 0.5)
    ob('shine', C.ellipsoid(Vector((-0.2, -0.38, 0.05)), (0.08, 0.03, 0.14)), m('shine', '#fff7c0', rough=0.3, emit='#fff7c0', es=0.6), 0)
    ob('stem', C.tube([Vector((0, 0, 0.3)), Vector((0.06, 0, 0.56))], 0.05, seg=6), m('stem', '#7a4a22'))
    for sx, ang in ((1, 0), (-1, 25)):
        ob(f'leaf{sx}', C.ellipsoid(Vector((sx * 0.24, 0.0, 0.52)), (0.22, 0.05, 0.1), rot=Euler((0, math.radians(sx * ang), 0))), m('leaf', '#5fae3a'))
    # 5판 — 가운데 띠(짙은 금)에 보석 셋
    ob('band', C.torus(Vector((0, 0, -0.14)), 0.5, 0.04, seg=20, ring=6), metal_m(GOLD_D))
    jewel('g', '#4fd8ff', Vector((0.0, -0.5, -0.14)), 0.08)
    for sx in (-1, 1):
        a = sx * 0.75
        gem(f'gs{sx}', '#ff3a6a' if sx < 0 else '#5fe08a', Vector((0.49 * math.sin(a), -0.49 * math.cos(a), -0.14)), 0.05)


def beaver_crown(_):
    ob('velvet', C.ellipsoid(Vector((0, 0, -0.02)), (0.44, 0.44, 0.32)), m('velvet', '#b8233a', rough=0.9))   # 5판 — 안쪽 붉은 벨벳
    ob('ring', C.tube([Vector((0, 0, -0.35)), Vector((0, 0, -0.05))], [0.5, 0.5], seg=10), metal_m('#f2c232'))
    for k in range(5):
        a = -math.pi / 2 + (k - 2) * 0.62
        ob(f'spike{k}', C.cone(Vector((0.48 * math.cos(a), 0.48 * math.sin(a), 0.12)), 0.14, 0.0, 0.42 if k % 2 == 0 else 0.3, seg=6), metal_m('#f2c232'))
        gem(f'sg{k}', ('#e8467c', '#4fd8ff', '#9ad04a')[k % 3], Vector((0.48 * math.cos(a), 0.48 * math.sin(a), 0.36 if k % 2 == 0 else 0.29)), 0.05)
    ob('fur', C.torus(Vector((0, 0, -0.36)), 0.52, 0.08, seg=14, ring=6), m('fur', '#fff4e4', rough=0.9))
    jewel('g0', '#e8467c', Vector((0, -0.53, -0.2)), 0.1)
    gem('g1', '#4fd8ff', Vector((-0.36, -0.38, -0.2)), 0.06)
    gem('g2', '#9ad04a', Vector((0.36, -0.38, -0.2)), 0.06)
    # 앞니 문장 — 비버 왕관
    for sx in (-1, 1):
        ob(f'tooth{sx}', C.box(Vector((sx * 0.045, -0.53, 0.04)), (0.08, 0.03, 0.1)), m('tooth', '#fffaf0'), O * 0.5)
    # 벨벳 꼭대기 금 구슬 + 십자
    stud('orb', Vector((0, 0, 0.34)), 0.08)
    ob('crossV', C.box(Vector((0, 0, 0.49)), (0.035, 0.035, 0.16)), metal_m(GOLD), O * 0.4)
    ob('crossH', C.box(Vector((0, 0, 0.51)), (0.12, 0.035, 0.035)), metal_m(GOLD), O * 0.4)


def r_treasure_chest(_):
    ob('box', C.box(Vector((0, 0, -0.3)), (0.9, 0.55, 0.45)), m('wood', WOOD))
    ob('lid', C.tube([Vector((-0.45, 0, -0.05)), Vector((0.45, 0, -0.05))], 0.28, seg=10), m('wood', WOOD_D))
    for x in (-0.3, 0.3):
        ob(f'strap{x}', C.box(Vector((x, -0.28, -0.2)), (0.08, 0.02, 0.6)), metal_m('#e8b23a'), O * 0.5)
    for sx in (-1, 1):   # 5판 — 모서리 금 장식
        for z in (-0.5, -0.1):
            ob(f'corner{sx}{z}', C.box(Vector((sx * 0.43, -0.28, z)), (0.08, 0.02, 0.08)), metal_m(GOLD), O * 0.4)
    ob('seam', C.box(Vector((0, -0.285, -0.07)), (0.8, 0.01, 0.03)), glow('#ffe066', 1.2), 0)   # 뚜껑 틈 금빛
    ob('lock', C.box(Vector((0, -0.29, -0.12)), (0.16, 0.03, 0.18)), metal_m('#f2c232'), O * 0.5)
    jewel('lockgem', '#ff2a3a', Vector((0, -0.32, -0.12)), 0.05)
    # 뚜껑 위 금화 더미 + 보석
    for k, (x, z, tilt) in enumerate(((-0.28, 0.22, 10), (-0.1, 0.27, -8), (0.08, 0.3, 14), (0.26, 0.22, -12), (-0.18, 0.36, 5), (0.15, 0.4, -5), (0.0, 0.46, 0))):
        ob(f'c{k}', C.tube([Vector((x, 0.05, z)), Vector((x, -0.03, z))], 0.09, seg=10), metal_m('#f2c232'), O * 0.4)
    for k, (x, z, c) in enumerate(((-0.36, 0.3, '#3fb6f0'), (0.33, 0.33, '#5fe08a'), (-0.02, 0.56, '#e8467c'))):
        gem(f'pg{k}', c, Vector((x, -0.06, z)), 0.06)


def r_king_scepter(_):
    # 굵은 금 자루 · 붉은 벨벳 손잡이 · 루비 띠, 머리는 금 테 두 줄로 감싼 보라 구슬 + 금 날개 + 십자 — 대각선으로 눕혀 칸을 채운다
    before = {o.name for o in bpy.context.scene.objects}
    ob('rod', C.tube([Vector((0, 0, -0.72)), Vector((0, 0, 0.3))], 0.06, seg=8), metal_m('#e8b23a'))
    ob('grip', C.tube([Vector((0, 0, -0.62)), Vector((0, 0, -0.38))], 0.078, seg=8), m('velvet', '#7a2a9a', rough=0.85))
    for z in (-0.36, -0.05):
        ob(f'band{z}', C.torus(Vector((0, 0, z)), 0.08, 0.03, seg=12, ring=5), metal_m(GOLD_D))
        gem(f'bg{z}', '#ff2a3a', Vector((0, -0.1, z)), 0.04)
    ob('collar', C.torus(Vector((0, 0, 0.32)), 0.15, 0.045, seg=12, ring=6), metal_m(GOLD))
    ob('orb', C.ellipsoid(Vector((0, 0, 0.52)), (0.2, 0.2, 0.2)), m('orb', '#b07cf0', rough=0.2, emit='#c9a0ff', es=0.6))
    for k, rot in enumerate((_FRONT, Euler((math.radians(90), 0, math.radians(90))))):
        ob(f'cage{k}', C.torus(Vector((0, 0, 0.52)), 0.21, 0.025, seg=16, ring=5, rot=rot), metal_m(GOLD), O * 0.5)
    for sx in (-1, 1):
        for k, (ang, ln) in enumerate(((60, 0.34), (85, 0.3), (110, 0.24))):
            plume(f'wing{sx}{k}', Vector((sx * 0.12, 0.04, 0.42)), sx * ang, ln, 0.06, GOLD if k == 0 else '#ffd86a')
    ob('crossV', C.box(Vector((0, 0, 0.82)), (0.04, 0.04, 0.18)), metal_m(GOLD), O * 0.5)
    ob('crossH', C.box(Vector((0, 0, 0.84)), (0.13, 0.04, 0.04)), metal_m(GOLD), O * 0.5)
    jewel('pommel', '#ff2a3a', Vector((0, -0.02, -0.78)), 0.07)
    tilt_since(before, 35)


# ── 바람 ──
def r_feather_fan(_):
    for k in range(7):
        ang = -60 + 20 * k
        cyan = k % 2 == 1
        plume(f'f{k}', Vector((0, 0.01 * k, -0.4)), ang, 0.78, 0.11, '#7fd8ff' if cyan else '#f4ead6', '#1fa3c4' if cyan else '#c8f0ff')
        if cyan:   # 깃 끝 눈 무늬
            a = math.radians(ang)
            ob(f'eye{k}', C.ellipsoid(Vector((0, 0.01 * k - 0.06, -0.4)) + Vector((math.sin(a), 0, math.cos(a))) * 0.62, (0.04, 0.02, 0.05), rot=Euler((0, a, 0))), glow('#f2c232', 0.9), 0)
    ob('handle', C.tube([Vector((0, -0.02, -0.4)), Vector((0, -0.02, -0.78))], 0.05, seg=6), m('handle', WOOD_D))
    ob('hub', C.tube([Vector((0, 0.02, -0.4)), Vector((0, -0.08, -0.4))], 0.13, seg=12), metal_m(GOLD))   # 5판 — 사북 금판 + 비취
    jewel('jade', '#3ff0c4', Vector((0, -0.12, -0.4)), 0.07)
    stud('cap', Vector((0, -0.02, -0.8)), 0.06)


def r_storm_bell(_):
    ob('bell', C.cone(Vector((0, 0, -0.05)), 0.5, 0.18, 0.7, seg=14), metal_m('#7fa8c4'))   # 아래가 넓은 종
    ob('top', C.ellipsoid(Vector((0, 0, 0.3)), (0.2, 0.2, 0.1)), metal_m('#7fa8c4'), O * 0.6)
    ob('lip', C.torus(Vector((0, 0, -0.4)), 0.5, 0.05, seg=16, ring=6), metal_m('#5f88a4'))
    ob('loop', C.torus(Vector((0, 0, 0.38)), 0.1, 0.035, seg=10, ring=6, rot=_FRONT), metal_m('#e8b23a'))
    ob('clapper', C.ellipsoid(Vector((0, -0.05, -0.48)), (0.09, 0.09, 0.09)), metal_m('#e8b23a'), O * 0.5)
    # 5판 — 허리 금 띠 + 보석 셋, 꼭대기 금 덩굴, 지그재그 번개 둘
    ob('band', C.torus(Vector((0, 0, -0.15)), 0.4, 0.035, seg=16, ring=5), metal_m(GOLD))
    for k, t in enumerate((-0.55, 0.0, 0.55)):
        gem(f'bg{k}', ('#3ff0c4', '#ffe066', '#3ff0c4')[k], Vector((0.41 * math.sin(t), -0.41 * math.cos(t), -0.15)), 0.05 if k != 1 else 0.065)
    for sx in (-1, 1):
        curl(f'curl{sx}', Vector((sx * 0.14, -0.02, 0.32)), sx, 0.8)
    for k, pts in enumerate((((0.44, 0.62), (0.56, 0.38), (0.47, 0.36), (0.63, 0.06)), ((-0.46, 0.5), (-0.56, 0.32), (-0.49, 0.3), (-0.6, 0.1)))):
        ob(f'bolt{k}', C.tube([Vector((x, -0.2, z)) for x, z in pts], 0.032 if k == 0 else 0.024, seg=4), glow('#ffe066', 1.2), O * 0.5)


def r_cloud_wing(_):
    # 구름 덩이 대신 깃을 두 층 쌓은 날개 한 쌍(흰 깃 · 하늘색 끝) · 가운데 금 덩굴 + 바람색 보석 · 아래 작은 구름
    for sx in (-1, 1):
        root = Vector((sx * 0.1, 0.05, 0.08))
        for k in range(5):
            plume(f'p{sx}{k}', root + Vector((sx * 0.04 * k, 0, -0.03 * k)), sx * (38 + 16 * k), 0.66 - 0.06 * k, 0.09, '#f4f8ff', '#8fe3ff', y=0.0)
        for k in range(4):
            plume(f'c{sx}{k}', root + Vector((sx * 0.03 * k, -0.04, 0.02 - 0.03 * k)), sx * (48 + 18 * k), 0.4 - 0.04 * k, 0.1, '#ffffff', '#c8f4ff', y=-0.04)
        curl(f'curl{sx}', Vector((sx * 0.08, -0.1, 0.0)), sx, 0.9)
    jewel('g', '#3ff0c4', Vector((0, -0.14, 0.04)), 0.1)
    for k, (x, z) in enumerate(((-0.22, -0.46), (0.0, -0.4), (0.22, -0.46))):
        ob(f'cl{k}', C.ellipsoid(Vector((x, 0.05, z)), (0.18, 0.15, 0.12)), m('cloud', '#dfe9f5'))


def r_tempest_eye(_):
    # 동심원 셋 대신 바깥으로 풀리는 소용돌이 팔 셋(청록 · 파랑 · 보라) · 가운데 금 홍채 테 큰 눈 보석 · 번개 둘
    for k, c in enumerate(('#3ff0c4', '#3fb6f0', '#b07cf0')):
        pts = []
        for j in range(18):
            t = j / 17.0
            a = k * 2 * math.pi / 3 + t * 3.4
            r = 0.16 + 0.56 * t
            pts.append(Vector((r * math.cos(a), 0.02 * k, r * math.sin(a))))
        ob(f'arm{k}', C.tube(pts, interp([0.05, 0.075, 0.06, 0.02], len(pts)), seg=6), m('swirl', c, emit=c, es=0.5))
    ob('iris', C.torus(Vector((0, -0.04, 0)), 0.17, 0.045, seg=16, ring=6, rot=_FRONT), metal_m(GOLD))
    saved = C.FACET
    C.FACET = 6
    ob('eye', C.ellipsoid(Vector((0, -0.06, 0)), (0.15, 0.09, 0.15)), m('eye', '#e8fbff', rough=0.1, emit='#ffffff', es=1.0), O * 0.5)
    C.FACET = saved
    ob('pupil', C.ellipsoid(Vector((0, -0.155, 0)), (0.04, 0.02, 0.09)), m('pupil', '#1f2a5a'), 0)
    for k, pts in enumerate((((0.5, 0.6), (0.62, 0.42), (0.55, 0.4), (0.7, 0.18)), ((-0.6, -0.3), (-0.7, -0.48), (-0.62, -0.5), (-0.74, -0.68)))):
        ob(f'bolt{k}', C.tube([Vector((x, -0.15, z)) for x, z in pts], 0.026, seg=4), glow('#ffe066', 1.2), O * 0.5)


# ── 대지 ──
def r_mossy_totem(_):
    ob('pole', C.tube([Vector((0, 0, -0.75)), Vector((0, 0, 0.5))], 0.3, seg=8), m('wood', '#9a7a52'))
    for z in (-0.35, 0.15):
        ob(f'face{z}', C.box(Vector((0, -0.28, z)), (0.42, 0.06, 0.26)), m('face', WOOD_D), O * 0.6)
        for sx in (-1, 1):
            ob(f'eye{z}{sx}', C.ellipsoid(Vector((sx * 0.11, -0.32, z + 0.04)), (0.045, 0.02, 0.045)), glow('#7cd06a', 0.8), 0)
    ob('moss', C.ellipsoid(Vector((0, 0, 0.52)), (0.36, 0.36, 0.13)), m('moss', LEAF))
    # 5판 — 잎 머리장식 다섯 장, 이마 에메랄드, 금 띠 둘
    for k in range(5):
        plume(f'lf{k}', Vector((0, 0.06, 0.55)), -60 + 30 * k, 0.28 if k != 2 else 0.32, 0.09, ('#4f9a30', '#7cd06a', '#9be86a', '#7cd06a', '#4f9a30')[k], y=0.0)
    jewel('brow', '#5fe08a', Vector((0, -0.33, 0.34)), 0.07)
    for z in (-0.6, -0.1):
        ob(f'band{z}', C.torus(Vector((0, 0, z)), 0.31, 0.035, seg=12, ring=5), metal_m(GOLD))
        stud(f'bs{z}', Vector((0, -0.33, z)), 0.04)


def r_mountain_heart(_):
    # 베이지 한 면이던 산을 톤이 다른 바위 덩어리(어두운 뒤 봉우리 · 밝은 앞 능선)로 쌓고(선명 조명이 거친 중간색을 두 배 가까이 밝혀 바탕을 짙은 갈색으로 둔다), 심장은 금 테 큰 루비 · 거기서 뻗는 금맥 · 밑동 초록 결정
    saved = C.FACET
    C.FACET = 6
    ob('mtnR', C.cone(Vector((0.36, 0.14, -0.3)), 0.4, 0.0, 0.62, seg=5), m('rockD', '#2f2622', rough=0.9, matte=True))
    ob('mtnL', C.cone(Vector((-0.38, 0.12, -0.34)), 0.36, 0.0, 0.5, seg=5), m('rockD', '#2f2622', rough=0.9, matte=True))
    ob('mtn', C.cone(Vector((0, 0, -0.1)), 0.6, 0.0, 0.95, seg=5), m('rock', '#4a3d34', rough=0.9, matte=True))
    ob('ridge', C.cone(Vector((0.1, -0.1, 0.0)), 0.3, 0.0, 0.62, seg=4, rot=Euler((0, 0, math.radians(20)))), m('rockL', '#66564a', rough=0.85, matte=True), O * 0.6)
    for k, (x, z, h, ang) in enumerate(((-0.4, -0.47, 0.28, -28), (-0.27, -0.5, 0.2, -10), (0.42, -0.48, 0.24, 26))):
        ob(f'cry{k}', C.cone(Vector((x, -0.38, z + h / 2)), 0.065, 0.0, h, seg=5, rot=Euler((0, math.radians(ang), 0))), m('cry', '#5fe08a', rough=0.2, emit='#8fffb0', es=0.6), O * 0.5)
    C.FACET = saved
    ob('snow', C.cone(Vector((0, 0, 0.29)), 0.22, 0.0, 0.2, seg=5), m('snow', '#f4f8ff'), O * 0.5)
    for k, (dx, dz) in enumerate(((-0.24, 0.24), (0.2, 0.3), (-0.3, -0.12), (0.28, -0.16))):
        v = ob(f'vein{k}', C.tube([Vector((0, -0.42, -0.2)), Vector((dx * 0.55, -0.4, -0.2 + dz * 0.55)), Vector((dx, -0.36, -0.2 + dz))], [0.022, 0.016, 0.006], seg=4), glow('#ffcf5a', 1.1), 0)
        v.visible_diffuse = v.visible_glossy = False   # 바위에 붙은 발광 줄이 면을 비춰 짙은 바위를 베이지로 밝혔다 — 빛나기만 하고 비추지는 않게
    jewel('heart', '#e0283c', Vector((0, -0.44, -0.2)), 0.15)


def r_ancient_root(_):
    for k in range(5):
        a = math.radians(-70 + 35 * k)
        pts = spline([Vector((0, 0, 0.2)), Vector((0.3 * math.sin(a), 0, -0.2)), Vector((0.65 * math.sin(a), 0, -0.6 - 0.1 * (k % 2)))], 10)
        ob(f'root{k}', C.tube(pts, interp([0.12, 0.07, 0.02], len(pts)), seg=6), m('root', BARK))
        ember(f'rune{k}', pts[5] + Vector((0, -0.09, 0)), 0.03, '#9be86a')   # 뿌리 빛 무늬
    ob('stump', C.tube([Vector((0, 0, 0.1)), Vector((0, 0, 0.5))], 0.22, seg=10), m('bark', BARK))
    ob('rings', C.ellipsoid(Vector((0, 0, 0.51)), (0.2, 0.2, 0.02)), m('cut', '#e8c38a'), O * 0.5)
    # 5판 — 그루터기 금 띠 + 에메랄드, 위에 빛나는 어린 나무
    ob('band', C.torus(Vector((0, 0, 0.22)), 0.23, 0.035, seg=14, ring=5), metal_m(GOLD))
    jewel('g', '#5fe08a', Vector((0, -0.25, 0.35)), 0.075)
    ob('sap', C.tube([Vector((0, 0, 0.5)), Vector((0.03, 0, 0.72))], [0.035, 0.02], seg=6), m('stem', '#6b8a3a'))
    for k, (x, z, r) in enumerate(((-0.14, 0.72, 0.13), (0.15, 0.74, 0.12), (0.02, 0.84, 0.13))):
        ob(f'leaf{k}', C.ellipsoid(Vector((x, 0, z)), (r, r * 0.8, r * 0.8)), m('leaf', '#7cd06a', emit='#9be86a', es=0.35))


def r_world_seed(_):
    ob('seed', C.ellipsoid(Vector((0, 0, -0.1)), (0.36, 0.34, 0.48), egg=0.3), m('seed', '#a8743a', rough=0.5))
    ob('sprout', C.tube([Vector((0, 0, 0.36)), Vector((0.05, 0, 0.62))], 0.03, seg=6), m('stem', '#4f9a30'))
    for k, (x, z, ang) in enumerate(((-0.17, 0.66, -25), (0.2, 0.66, 25), (-0.08, 0.76, -10), (0.12, 0.78, 15))):
        ob(f'leaf{k}', C.ellipsoid(Vector((x, 0, z)), (0.16 if k < 2 else 0.11, 0.04, 0.07), rot=Euler((0, math.radians(ang), 0))), m('leaf', ('#7cd06a', '#9be86a')[k % 2], emit='#9be86a', es=0.25))
    ob('aura', C.torus(Vector((0, 0, -0.1)), 0.55, 0.03, seg=18, ring=6, rot=Euler((math.radians(75), 0, 0))), glow('#9be86a', 0.9), 0)
    ob('aura2', C.torus(Vector((0, 0, -0.1)), 0.62, 0.02, seg=20, ring=5, rot=Euler((math.radians(75), math.radians(-25), 0))), glow('#ffe066', 0.9), 0)
    # 5판 — 씨앗을 감는 금 덩굴 둘(앞에 보이는 반만) + 덩굴 위 에메랄드
    for k in range(2):
        pts = []
        for j in range(14):
            t = j / 13.0
            z = -0.5 + 0.78 * t
            a = -math.pi * 0.9 + t * math.pi * 0.8 + k * 0.5
            rr = 0.36 * math.sqrt(max(0.05, 1 - ((z + 0.1) / 0.5) ** 2)) + 0.02
            pts.append(Vector((rr * math.cos(a) * (1 if k == 0 else -1), -abs(rr * math.sin(a)) - 0.02, z)))
        ob(f'vine{k}', C.tube(pts, 0.022, seg=5), metal_m(GOLD), O * 0.5)
    jewel('g', '#5fe08a', Vector((0, -0.36, -0.12)), 0.075)


# ── 별 ──
def r_comet_shard(_):
    saved = C.FACET
    C.FACET = 6
    ob('shard', C.ellipsoid(Vector((0.25, 0, 0.25)), (0.26, 0.2, 0.3), rot=Euler((0, math.radians(-40), 0))), m('cr', '#7fd8ff', rough=0.25, emit='#b8f0ff', es=0.5))
    # 5판 — 곁 결정 둘
    ob('sub1', C.ellipsoid(Vector((0.5, -0.02, 0.0)), (0.1, 0.08, 0.15), rot=Euler((0, math.radians(-20), 0))), m('cr2', '#c08bff', rough=0.25, emit='#d8b8ff', es=0.5), O * 0.6)
    ob('sub2', C.ellipsoid(Vector((0.05, -0.02, 0.52)), (0.08, 0.07, 0.13), rot=Euler((0, math.radians(-60), 0))), m('cr2', '#c08bff', rough=0.25, emit='#d8b8ff', es=0.5), O * 0.6)
    C.FACET = saved
    pts = [Vector((0.15 - 0.15 * k, 0.05, 0.12 - 0.13 * k)) for k in range(6)]
    ob('tail', C.tube(pts, interp([0.2, 0.15, 0.02], len(pts)), seg=8), glow('#c9a0ff', 0.8), O * 0.5)
    ob('orbit', C.torus(Vector((0.25, 0, 0.25)), 0.4, 0.022, seg=24, ring=5, rot=Euler((math.radians(70), math.radians(-35), 0))), metal_m(GOLD), O * 0.4)
    for k, (x, z) in enumerate(((-0.25, -0.2), (-0.45, -0.45), (-0.1, -0.5))):
        ember(f'star{k}', Vector((x, -0.1, z)), 0.035, '#fff7c0')


def r_star_compass(_):
    ob('case', C.tube([Vector((0, 0.06, 0)), Vector((0, -0.06, 0))], 0.55, seg=16), metal_m('#e8b23a'))
    ob('face', C.tube([Vector((0, -0.06, 0)), Vector((0, -0.08, 0))], 0.45, seg=16), m('face', '#1f2a5a', emit='#2a3a7a', es=0.2), O * 0.5)
    ob('needle', C.box(Vector((0, -0.1, 0.1)), (0.06, 0.02, 0.6), rot=Euler((0, math.radians(30), 0))), m('needle', '#e0283c'), O * 0.4)
    for k in range(4):
        a = k * math.pi / 2 + 0.4
        ob(f's{k}', C.cone(Vector((0.3 * math.cos(a), -0.1, 0.3 * math.sin(a))), 0.05, 0.0, 0.02, seg=5), glow('#ffe066', 1.1), 0)
    # 5판 — 테 밖으로 여덟 갈래 나침 장미(긴 넷 · 짧은 넷), 가운데 보라 보석 축
    for k in range(8):
        a = k * math.pi / 4
        long = k % 2 == 0
        ln = 0.3 if long else 0.18
        d = Vector((math.cos(a), 0, math.sin(a)))
        ob(f'pt{k}', C.cone(d * (0.52 + ln / 2) + Vector((0, 0.02, 0)), 0.08 if long else 0.055, 0.0, ln, seg=4, rot=Euler((0, math.pi / 2 - a, 0))), metal_m(GOLD if long else GOLD_D), O * 0.6)
    jewel('pivot', '#c08bff', Vector((0, -0.12, 0)), 0.065)


def r_galaxy_pearl(_):
    ob('pearl', C.ellipsoid(Vector((0, 0, 0.04)), (0.43, 0.43, 0.43)), m('pearl', '#3b2a7a', rough=0.2, emit='#5a3aa8', es=0.5))
    ob('swirl', C.torus(Vector((0, 0, 0.04)), 0.3, 0.05, seg=18, ring=6, rot=Euler((math.radians(70), math.radians(20), 0))), glow('#c9a0ff', 0.9), 0)
    for k, (x, z) in enumerate(((-0.18, 0.24), (0.2, -0.06), (0.05, 0.32))):
        ob(f'st{k}', C.ellipsoid(Vector((x, -0.41, z)), (0.03, 0.02, 0.03)), glow('#fff2b0', 1.2), 0)
    # 5판 — 납작한 조개 받침 대신 금 받침잔 + 진주를 붙든 금 발톱 넷 · 받침 앞 보석
    ob('cup', C.cone(Vector((0, 0, -0.5)), 0.2, 0.3, 0.16, seg=10), metal_m(GOLD))
    ob('foot', C.cone(Vector((0, 0, -0.66)), 0.32, 0.22, 0.12, seg=10), metal_m(GOLD_D))
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        c, s = math.cos(a), math.sin(a)
        pts = spline([Vector((0.18 * c, 0.18 * s, -0.42)), Vector((0.4 * c, 0.4 * s, -0.25)), Vector((0.47 * c, 0.47 * s, 0.02)), Vector((0.4 * c, 0.4 * s, 0.22))], 10)
        ob(f'claw{k}', C.tube(pts, interp([0.045, 0.04, 0.03, 0.018], len(pts)), seg=6), metal_m(GOLD), O * 0.5)
        stud(f'ct{k}', pts[-1], 0.035)
    jewel('g', '#c08bff', Vector((0, -0.3, -0.52)), 0.06)


def r_aurora_orb(_):
    ob('orb', C.ellipsoid(Vector((0, 0, 0.12)), (0.42, 0.42, 0.42)), m('glass', '#9fe8d8', rough=0.15, emit='#7fe0c8', es=0.25))
    # 5판 — 앞 줄 셋 대신 구슬을 감는 기운 고리 셋, 금 발톱 받침 + 보석
    for k, (c, rx, rz) in enumerate((('#2ee6c0', 70, -20), ('#b07cff', 60, 25), ('#4fc0ff', 80, 5))):
        ob(f'band{k}', C.torus(Vector((0, 0, 0.12)), 0.46 + 0.04 * k, 0.062, seg=24, ring=5, rot=Euler((math.radians(rx), math.radians(rz), 0))), glow(c, 1.3), O * 0.4)
    ob('stand', C.cone(Vector((0, 0, -0.44)), 0.2, 0.34, 0.2, seg=10), metal_m('#e8b23a'))
    ob('foot', C.cone(Vector((0, 0, -0.6)), 0.36, 0.26, 0.12, seg=10), metal_m(GOLD_D))
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        c, s = math.cos(a), math.sin(a)
        pts = spline([Vector((0.16 * c, 0.16 * s, -0.36)), Vector((0.36 * c, 0.36 * s, -0.24)), Vector((0.42 * c, 0.42 * s, -0.04))], 8)
        ob(f'claw{k}', C.tube(pts, interp([0.045, 0.035, 0.02], len(pts)), seg=6), metal_m(GOLD), O * 0.5)
    jewel('g', '#c08bff', Vector((0, -0.3, -0.46)), 0.06)
    for k, (x, z) in enumerate(((-0.12, 0.26), (0.14, 0.04))):
        ember(f'tw{k}', Vector((x, -0.42, z)), 0.03, '#ffffff')


# ── 물 ──
def r_coral_crown(_):
    ob('band', C.tube([Vector((0, 0, -0.35)), Vector((0, 0, -0.12))], 0.42, seg=12), metal_m('#e8b23a'))
    for k in range(6):
        a = k * math.pi / 3
        base = Vector((0.38 * math.cos(a), 0.38 * math.sin(a), -0.1))
        top = base + Vector((0.05 * math.cos(a), 0.05 * math.sin(a), 0.36 + 0.1 * (k % 2)))
        ob(f'cor{k}', C.tube([base, top], [0.06, 0.035], seg=6), m('coral', '#ff7a8a'))
        fork = base + (top - base) * 0.55
        side = Vector((-math.sin(a), math.cos(a), 0)) * 0.12
        ob(f'fork{k}', C.tube([fork, fork + side + Vector((0, 0, 0.14))], [0.035, 0.02], seg=5), m('coral', '#ff9aa6'), O * 0.6)
        ob(f'pt{k}', C.ellipsoid(top + Vector((0, 0, 0.03)), (0.045, 0.045, 0.045)), m('pearl', '#fff8ff', rough=0.2, emit='#f0f0ff', es=0.3), O * 0.4)   # 5판 — 가지 끝 진주
    jewel('g', '#3aa8ff', Vector((0, -0.43, -0.235)), 0.085)
    for sx in (-1, 1):
        a = sx * 0.8
        ob(f'pearl{sx}', C.ellipsoid(Vector((0.42 * math.sin(a), -0.42 * math.cos(a), -0.235)), (0.05, 0.04, 0.05)), m('pearl', '#fff8ff', rough=0.2, emit='#f0f0ff', es=0.3), O * 0.4)


def r_tide_compass(_):
    ob('case', C.tube([Vector((0, 0.06, 0)), Vector((0, -0.06, 0))], 0.55, seg=16), metal_m('#5fa8c4'))
    ob('face', C.tube([Vector((0, -0.06, 0)), Vector((0, -0.08, 0))], 0.45, seg=16), m('face', '#e8f4ff'), O * 0.5)
    pts = [Vector((-0.3 + 0.1 * k, -0.1, -0.05 + 0.06 * math.sin(k * 1.4))) for k in range(7)]
    ob('wave', C.tube(pts, 0.025, seg=4), m('wave', '#3f88c4'), 0)
    ob('needle', C.box(Vector((0, -0.11, 0.08)), (0.05, 0.02, 0.5), rot=Euler((0, math.radians(-35), 0))), m('needle', '#1f5a8a'), O * 0.4)
    # 5판 — 테 네 방위에 진주, 양옆 물결 덩굴, 위에 조개 문장, 가운데 보석 축
    for k in range(4):
        a = k * math.pi / 2
        ob(f'pearl{k}', C.ellipsoid(Vector((0.55 * math.cos(a), -0.08, 0.55 * math.sin(a))), (0.07, 0.06, 0.07)), m('pearl', '#fff8ff', rough=0.2, emit='#eef4ff', es=0.3), O * 0.5)
    for sx in (-1, 1):
        curl(f'wave{sx}', Vector((sx * 0.54, 0.0, -0.28)), sx, 1.0, GOLD)
    for k in range(5):
        a = math.radians(-50 + 25 * k)
        ob(f'shell{k}', C.ellipsoid(Vector((0.13 * math.sin(a), 0.0, 0.6 + 0.13 * math.cos(a) - 0.06)), (0.05, 0.04, 0.12), rot=Euler((0, a, 0))), m('shell', '#ffc8d8' if k % 2 else '#ffe0e8'), O * 0.5)
    jewel('pivot', '#3aa8ff', Vector((0, -0.13, 0.0)), 0.055)


def r_mermaid_harp(_):
    pts = spline([Vector((-0.4, 0, -0.6)), Vector((-0.45, 0, 0.2)), Vector((-0.1, 0, 0.65)), Vector((0.35, 0, 0.55))], 14)
    ob('frame', C.tube(pts, 0.06, seg=8), metal_m('#e8b23a'))
    ob('pillar', C.tube([Vector((-0.4, 0, -0.6)), Vector((0.35, 0, -0.6)), Vector((0.35, 0, 0.55))], 0.05, seg=8), metal_m('#e8b23a'))
    for k in range(7):
        x = -0.28 + 0.1 * k
        ob(f'str{k}', C.tube([Vector((x, -0.02, -0.55)), Vector((x, -0.02, 0.5 - 0.06 * abs(k - 2.5)))], 0.012, seg=4), m('str', '#f4f8ff'), 0)
    ob('shell', C.ellipsoid(Vector((-0.1, -0.05, 0.64)), (0.13, 0.05, 0.11)), m('shell', '#ffc8d8'), O * 0.5)
    # 5판 — 틀을 따라 진주, 기둥 위 보석, 틀 끝 금 덩굴, 밑동 산호
    for k in (2, 5, 8, 11):
        ob(f'pr{k}', C.ellipsoid(pts[k] + Vector((0, -0.06, 0)), (0.04, 0.035, 0.04)), m('pearl', '#fff8ff', rough=0.2, emit='#f0f0ff', es=0.3), O * 0.4)
    jewel('g', '#3aa8ff', Vector((0.35, -0.07, 0.55)), 0.07)
    curl('curl', Vector((-0.42, -0.02, 0.1)), -1, 0.9)
    for k, (dx, h) in enumerate(((-0.08, 0.2), (0.0, 0.28), (0.09, 0.18))):
        ob(f'cor{k}', C.tube([Vector((-0.4 + dx, -0.04, -0.6)), Vector((-0.4 + dx * 1.6, -0.04, -0.6 + h))], [0.04, 0.02], seg=5), m('coral', '#ff7a8a'), O * 0.6)


def r_sea_tear(_):
    # 2판 (2026-10-29 "물방울과 비슷해 보인다") — 맨 물방울(파랑 · 물결 고리) 대신 보라 눈물 보석 펜던트:
    # 금 갓 · 고리 · 사슬이 달린 실루엣으로 물방울과 색 · 모양을 갈라 놓는다
    ob('tear', C.ellipsoid(Vector((0, 0, -0.18)), (0.32, 0.27, 0.44), egg=-0.45), m('tear', '#8b5cf6', rough=0.12, emit='#c4b5fd', es=0.55))
    ob('core', C.ellipsoid(Vector((0, -0.11, -0.26)), (0.12, 0.07, 0.16)), glow('#f5f3ff', 1.0), 0)
    ob('shine', C.ellipsoid(Vector((-0.12, -0.24, -0.02)), (0.05, 0.02, 0.11)), m('shine', '#ffffff', emit='#ffffff', es=0.6), 0)
    ob('cap', C.ellipsoid(Vector((0, 0, 0.27)), (0.13, 0.13, 0.08)), metal_m('#f2c232'))
    ob('bail', C.torus(Vector((0, 0, 0.42)), 0.09, 0.028, seg=14, ring=6, rot=_FRONT), metal_m('#e0a92a'))
    chain = spline([Vector((-0.62, 0, 0.82)), Vector((-0.3, 0, 0.6)), Vector((0, 0, 0.5)), Vector((0.3, 0, 0.6)), Vector((0.62, 0, 0.82))], 16)
    ob('chain', C.tube(chain, 0.022, seg=6), metal_m('#d9dde3'))
    for k, (x, z) in enumerate(((-0.42, -0.2), (0.4, -0.38), (0.36, 0.05))):
        ob(f'sp{k}', C.ellipsoid(Vector((x, -0.1, z)), (0.035, 0.02, 0.035)), glow('#fff7c0', 1.2), 0)
    # 5판 — 눈물을 감싸는 금 갓 발톱 셋, 사슬 진주, 갓 위 다이아
    for k, sx in enumerate((-1, 0, 1)):
        pts = spline([Vector((0.1 * sx, -0.08, 0.24)), Vector((0.24 * sx, -0.2, 0.08)), Vector((0.26 * sx, -0.22, -0.08))], 8)
        ob(f'prong{k}', C.tube(pts, interp([0.03, 0.02, 0.012], len(pts)), seg=5), metal_m(GOLD), O * 0.45)
    for k in (3, 6, 9, 12):
        ob(f'cp{k}', C.ellipsoid(chain[k] + Vector((0, -0.03, 0)), (0.035, 0.03, 0.035)), m('pearl', '#fff8ff', rough=0.2, emit='#f0f0ff', es=0.3), O * 0.4)
    jewel('dia', '#e8fbff', Vector((0, -0.15, 0.3)), 0.05)


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
    'glacier-shield': (r_glacier_shield, (-16, 12), 1.8),
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
    'mossy-totem': (r_mossy_totem, (-16, 12), 1.85),
    'mountain-heart': (r_mountain_heart, (-16, 12), 1.7),
    'ancient-root': (r_ancient_root, (-16, 12), 2.0),
    'world-seed': (r_world_seed, (-16, 12), 1.85),
    'star-sand': (r_star_sand, (-16, 12), 1.7),
    'moon-shell': (r_moon_shell, (-16, 12), 1.7),
    'comet-shard': (r_comet_shard, (-16, 12), 1.7),
    'star-compass': (r_star_compass, (-16, 12), 1.7),
    'galaxy-pearl': (r_galaxy_pearl, (-16, 12), 1.7),
    'aurora-orb': (r_aurora_orb, (-16, 12), 1.7),
}

JOBS = {
    'ember-ring': (ember_ring, (-18, 14), 1.9), 'flame-feather': (flame_feather, (-12, 10), 2.1), 'lava-heart': (lava_heart, (-16, 12), 1.7),
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
# 유물 계열 · 등급은 게임 표(src/titans/relics.ts)에서 읽는다 — 그림과 효과 수치가 한 곳을 본다
import re as _re
_REL = {}
try:
    with open(os.path.join(ROOT, 'src', 'titans', 'relics.ts'), encoding='utf-8') as _f:
        for _id, _fam, _tier in _re.findall(r'def\("([a-z-]+)", "([a-z]+)", "([A-Z]+)"', _f.read()):
            _REL[_id] = (_fam, _tier)
except OSError:
    pass
FAMILY_RIM = {'fire': '#ff6a1a', 'frost': '#6cd2ff', 'gold': '#ffc23a', 'wind': '#3ff0c4', 'earth': '#8fdc4a', 'star': '#c08bff', 'water': '#3aa8ff'}
TIER_K = {'N': 0.85, 'R': 1.0, 'SR': 1.15, 'SSR': 1.3, 'UR': 1.45, 'LR': 1.6}
NO_VIVID = os.environ.get('RELIC_VIVID', '1') == '0'


def vivid_lights(fam, k):
    """계열색 림 둘(오른쪽 뒤 · 왼쪽 뒤) + 위에서 내리는 반짝임 — 등급이 높을수록 세다"""
    col = FAMILY_RIM.get(fam, '#fff6e8')
    for nm, loc, rot, e, sz in (('vrim_r', (2.4, 3.0, 2.0), (-62, 0, 145), 1700, 1.4), ('vrim_l', (-2.6, 2.8, 1.2), (-70, 0, -150), 1150, 1.2), ('vtop', (0.0, -1.2, 4.6), (12, 0, 0), 480, 1.2)):
        L = bpy.data.lights.new(nm, 'AREA')
        L.energy = e * k
        L.size = sz
        L.color = C.srgb(col if nm != 'vtop' else '#ffffff')[:3]
        o = bpy.data.objects.new(nm, L)
        bpy.context.scene.collection.objects.link(o)
        o.location = loc
        o.rotation_euler = Euler([math.radians(a) for a in rot])


os.makedirs(OUTDIR, exist_ok=True)
for name in names:
    fn, (yaw, elev), scale = JOBS[name]
    C.reset()
    C.setup_render(res=(512, 512), samples=40)
    C.lights()
    fam, tier = _REL.get(name, (None, 'SR'))
    VIVID = (name in _REL) and not NO_VIVID
    VIVID_K = TIER_K.get(tier, 1.0)
    if VIVID:
        vivid_lights(fam, VIVID_K)
        # 환경광을 낮추고 키를 올려 명암을 세게 — 장난감 조명의 평평함을 줄인다
        _bg = bpy.context.scene.world.node_tree.nodes.get('Background')
        if _bg:
            _bg.inputs['Strength'].default_value = 0.4
        _key = bpy.data.objects.get('key')
        if _key:
            _key.data.energy *= 1.25
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
