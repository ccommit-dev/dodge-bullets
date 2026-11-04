"""장비 파츠 · 북(무기 강화 단계) 로우 폴리 모델 (2026-10-23, 사용자: "무기 파츠 모델링 … BEAVER RAMPAGE 참고해서 수정").
비버 · 몬스터와 같은 그림체 — 각진 면(평면 셰이딩) · 무광 · 잉크 외곽선. 예전 파츠는 SDXL 광택 그림이라 새 캐릭터와 따로 놀았다.
  blender -b -P art-gen/blender/gear_icons.py -- [gear|drums|<이름>…]   → art-gen/out/b3d-gear/<이름>.png (512² 투명)
조립: node scripts/assemble-gear.mjs (public/titans/gear/<이름>.png · public/forge/swords/sNN.png 같은 파일명)"""
import bpy
import sys
import os
import math
from mathutils import Vector, Euler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import bcommon as C
from lib.beaver import spline, interp

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTDIR = os.path.join(ROOT, 'art-gen', 'out', 'b3d-gear')
O = 0.022

# 단계 색 — 1 나무 · 쇠, 2 푸른 강철 · 금, 3 진홍 · 황금 · 보석
TIER = {
    1: dict(main='#9a6234', metal='#a3acb6', trim='#c9a15a', gem=None, cloth='#7a8a3a'),
    2: dict(main='#3f7fc4', metal='#d4dde6', trim='#e8b23a', gem='#4fd8ff', cloth='#2f6fb0'),
    3: dict(main='#c8402f', metal='#f2c232', trim='#fff0a0', gem='#e8467c', cloth='#8a2a5a'),
}


def m(name, color, rough=0.75, metal=0.0, emit=None, es=0.0):
    return C.principled(f'gear_{name}_{color}_{metal}_{es}', color, rough=rough, metal=metal, coat=0.0, emit=emit, emit_strength=es)


def ob(name, bm, mat, outline=O):
    return C.mesh_obj(name, bm, mat, outline=outline)


def metal_m(c):
    return m('metal', c, rough=0.45, metal=0.55)


def gem(name, c, at, r=0.07):
    saved = C.FACET
    C.FACET = 6   # 보석은 더 각지게
    ob(name, C.ellipsoid(at, (r, r * 0.6, r * 1.2)), m('gem', c, rough=0.25, emit=c, es=0.6), O * 0.5)
    C.FACET = saved


# ── 파츠 ──
def sword(t):
    T = TIER[t]
    blade = C.box(Vector((0, 0, 0.32)), (0.17, 0.05, 0.95), bevel=0.0)
    for v in blade.verts:   # 끝을 뾰족하게
        if v.co.z > 0.62:
            v.co.x *= max(0.05, (0.8 - v.co.z) / 0.18)
    ob('blade', blade, metal_m(T['metal'] if t > 1 else '#c8d2dc'))
    ob('guard', C.box(Vector((0, 0, -0.18)), (0.52, 0.11, 0.09)), metal_m(T['trim']))
    ob('grip', C.tube([Vector((0, 0, -0.2)), Vector((0, 0, -0.5))], 0.055, seg=8), m('grip', T['main']))
    ob('pommel', C.ellipsoid(Vector((0, 0, -0.55)), (0.08, 0.08, 0.08)), metal_m(T['trim']))
    if T['gem']:
        gem('g', T['gem'], Vector((0, -0.06, -0.18)), 0.06)


def bow(t):
    T = TIER[t]
    pts = [Vector((0.42 * math.cos(a) - 0.3, 0, 0.78 * math.sin(a))) for a in [(-1.2 + 2.4 * k / 16) for k in range(17)]]
    ob('bow', C.tube(pts, interp([0.035, 0.06, 0.07, 0.06, 0.035], len(pts)), seg=8), m('bow', T['main'] if t > 1 else '#b9783a'))
    ob('string', C.tube([pts[0], pts[-1]], 0.012, seg=5), m('str', '#fffaf0'), 0)
    ob('wrap', C.tube([pts[8] + Vector((0, 0, -0.1)), pts[8] + Vector((0, 0, 0.1))], 0.085, seg=8), m('wrap', T['trim']))
    for p in (pts[0], pts[-1]):
        ob('tip', C.ellipsoid(p, (0.06, 0.06, 0.06)), metal_m(T['trim']))
    if T['gem']:
        gem('g', T['gem'], pts[8] + Vector((0.03, -0.09, 0)))


def staff(t):
    T = TIER[t]
    ob('shaft', C.tube([Vector((0, 0, -0.8)), Vector((0, 0, 0.45))], 0.05, seg=8), m('shaft', '#8a5a2b' if t == 1 else T['main']))
    orb = T['gem'] or '#9ad04a'
    ob('orb', C.ellipsoid(Vector((0, 0, 0.66)), (0.2, 0.2, 0.2)), m('orb', orb, rough=0.3, emit=orb, es=0.9))
    for k in range(4 if t > 1 else 3):
        a = 2 * math.pi * k / (4 if t > 1 else 3)
        pts = spline([Vector((0, 0, 0.42)), Vector((0.2 * math.cos(a), 0.2 * math.sin(a), 0.6)), Vector((0.1 * math.cos(a), 0.1 * math.sin(a), 0.86))], 8)
        ob(f'prong{k}', C.tube(pts, interp([0.04, 0.035, 0.015], len(pts)), seg=6), metal_m(T['trim']))
    ob('cuff', C.tube([Vector((0, 0, 0.36)), Vector((0, 0, 0.45))], 0.075, seg=8), metal_m(T['trim']))


def shield(t):
    T = TIER[t]
    body = C.ellipsoid(Vector((0, 0, 0)), (0.6, 0.12, 0.72), egg=-0.35)
    ob('shield', body, m('sh', T['main']))
    ob('rim', C.torus(Vector((0, -0.02, 0.02)), 0.55, 0.05, rot=Euler((math.radians(90), 0, 0))), metal_m(T['trim'] if t > 1 else T['metal']))
    ob('boss', C.ellipsoid(Vector((0, -0.12, 0.05)), (0.17, 0.08, 0.17)), metal_m(T['metal']))
    if T['gem']:
        gem('g', T['gem'], Vector((0, -0.2, 0.05)), 0.08)


def helmet(t):
    """투구 — 둥근 머리통 · 볼 가리개 둘 · 이마 띠 · 짧은 코 가리개 · 안쪽 어두운 얼굴 자리(그릇 뚜껑처럼 보이던 1판을 고쳤다)"""
    T = TIER[t]
    dome = C.ellipsoid(Vector((0, 0, 0.05)), (0.5, 0.52, 0.55))
    for v in [v for v in dome.verts if v.co.z < -0.02]:
        dome.verts.remove(v)
    ob('dome', dome, metal_m(T['metal']))
    ob('inside', C.ellipsoid(Vector((0, -0.12, -0.12)), (0.36, 0.3, 0.3)), m('dark', '#2a1a12', rough=0.9), 0)
    for sx in (-1, 1):
        ob(f'cheek{sx}', C.ellipsoid(Vector((sx * 0.4, -0.12, -0.2)), (0.13, 0.26, 0.3), rot=Euler((0, sx * 0.2, 0))), metal_m(T['metal']))
    ob('band', C.torus(Vector((0, 0, 0.0)), 0.5, 0.055), m('band', T['main']))
    ob('nose', C.box(Vector((0, -0.52, -0.1)), (0.09, 0.07, 0.26)), metal_m(T['trim']))
    if t == 1:
        ob('knob', C.ellipsoid(Vector((0, 0, 0.62)), (0.08, 0.08, 0.08)), metal_m(T['trim']))
    elif t == 2:   # 깃털 장식
        pts = spline([Vector((0, 0.0, 0.58)), Vector((0, 0.25, 0.85)), Vector((0, 0.6, 0.85))], 10)
        ob('plume', C.tube(pts, interp([0.1, 0.14, 0.04], len(pts)), seg=8), m('plume', '#e8452c'))
    else:   # 왕관 가시 · 보석
        for k in range(5):
            a = math.pi * (0.1 + 0.8 * k / 4)
            ob(f'spike{k}', C.cone(Vector((0.42 * math.cos(a), -0.42 * math.sin(a), 0.38)), 0.07, 0.0, 0.24, seg=6), metal_m(T['trim']))
        gem('g', T['gem'], Vector((0, -0.53, 0.05)), 0.07)


def armor(t):
    """흉갑 — 어깨가 넓은 몸통 · 목 구멍 · 납작하게 기운 어깨받이(곰 귀처럼 보이던 1판을 고쳤다) · 허리띠 · 가슴 문장"""
    T = TIER[t]
    chest = C.ellipsoid(Vector((0, 0, 0)), (0.5, 0.3, 0.62), egg=-0.22)
    ob('chest', chest, metal_m(T['metal']) if t > 1 else m('leather', '#8a5a2b'))
    ob('neck', C.ellipsoid(Vector((0, -0.04, 0.58)), (0.2, 0.15, 0.06)), m('dark', '#2a1a12', rough=0.9), 0)
    for sx in (-1, 1):
        ob(f'pad{sx}', C.ellipsoid(Vector((sx * 0.5, -0.02, 0.38)), (0.3, 0.3, 0.1), rot=Euler((0, sx * 0.55, 0))), m('pad', T['main']))
        ob(f'padrim{sx}', C.torus(Vector((sx * 0.5, -0.02, 0.38)), 0.28, 0.025, rot=Euler((0, sx * 0.55, 0))), metal_m(T['trim']), O * 0.5)
    ob('belt', C.torus(Vector((0, -0.02, -0.4)), 0.4, 0.06, rot=Euler((math.radians(4), 0, 0))), m('belt', '#5a3418'))
    ob('buckle', C.box(Vector((0, -0.33, -0.4)), (0.14, 0.04, 0.12)), metal_m(T['trim']))
    ob('emblem', C.ellipsoid(Vector((0, -0.28, 0.08)), (0.17, 0.05, 0.2), egg=-0.4), metal_m(T['trim']))
    if T['gem']:
        gem('g', T['gem'], Vector((0, -0.33, 0.1)), 0.07)


def gloves(t):
    """장갑 한 짝 — 손바닥 · 손가락 넷 · 엄지 · 손목 덮개 · 손등 판"""
    T = TIER[t]
    col = T['main'] if t > 1 else '#8a5a2b'
    ob('palm', C.ellipsoid(Vector((0, 0, 0.1)), (0.3, 0.17, 0.3)), m('glove', col))
    for k in range(4):
        x = -0.2 + 0.135 * k
        ob(f'finger{k}', C.tube([Vector((x, -0.02, 0.32)), Vector((x * 1.05, -0.06, 0.55 - abs(k - 1.5) * 0.05))], 0.065, seg=7), m('glove', col))
    ob('thumb', C.tube([Vector((-0.28, -0.04, 0.12)), Vector((-0.44, -0.1, 0.32))], 0.07, seg=7), m('glove', col))
    ob('cuff', C.tube([Vector((0, 0.02, -0.42)), Vector((0, 0.02, -0.12))], [0.26, 0.22], seg=9), metal_m(T['metal']))
    ob('plate', C.ellipsoid(Vector((0, -0.16, 0.12)), (0.24, 0.05, 0.2)), metal_m(T['trim']))
    if T['gem']:
        gem('g', T['gem'], Vector((0, -0.22, 0.12)), 0.06)


def boots(t):
    """장화 한 짝 — 옆에서 보면 발끝이 앞으로 나온다(기둥처럼 보이던 1판을 고쳤다)"""
    T = TIER[t]
    col = T['main'] if t > 1 else '#8a5a2b'
    ob('leg', C.tube([Vector((0, 0.12, -0.2)), Vector((0, 0.1, 0.5))], [0.2, 0.19], seg=9), m('boot', col))
    ob('foot', C.ellipsoid(Vector((0, -0.15, -0.32)), (0.2, 0.38, 0.17), egg=0.1), m('boot', col))
    ob('toe', C.ellipsoid(Vector((0, -0.42, -0.33)), (0.17, 0.12, 0.13)), metal_m(T['trim']) if t > 1 else m('toe', '#6a4020'))
    ob('sole', C.box(Vector((0, -0.12, -0.47)), (0.4, 0.8, 0.07)), m('sole', '#3b2415'))
    ob('heel', C.box(Vector((0, 0.18, -0.52)), (0.3, 0.2, 0.1)), m('sole', '#3b2415'))
    ob('cuffb', C.torus(Vector((0, 0.1, 0.48)), 0.21, 0.06), metal_m(T['trim']) if t > 1 else m('fold', '#c9a15a'))
    for k in range(3):
        ob(f'lace{k}', C.box(Vector((0, -0.06 + 0.0, 0.02 + 0.13 * k)), (0.22, 0.03, 0.03)), m('lacec', '#f1e4c8'), 0)
    if T['gem']:
        gem('g', T['gem'], Vector((0, -0.12, 0.38)), 0.055)


SHOULDERS = {   # 견갑 넷 — 색 · 장식
    'scout': dict(main='#6a8a3a', trim='#c9a15a', spikes=0, gem=None),
    'shadow': dict(main='#4a3a6a', trim='#9a7ad8', spikes=0, gem='#c084fc'),
    'ogre': dict(main='#9a6a3a', trim='#d8c8a0', spikes=3, gem=None),
    'dragon': dict(main='#c8402f', trim='#f2c232', spikes=4, gem='#ffd34d'),
}


def shoulder(kind):
    """견갑 — 어깨를 덮는 둥근 덮개 하나 + 바깥쪽으로만 늘어진 판 두 장(띠 조각) · 징 · 가시 · 보석.
    1 · 2판(통째 고리를 겹침)은 햄버거 · 토성 고리처럼 읽혔다 — 판은 바깥 반쪽만 남긴다"""
    S = SHOULDERS[kind]
    cap = C.ellipsoid(Vector((0, 0, 0.22)), (0.55, 0.46, 0.42))
    for v in [v for v in cap.verts if v.co.z < 0.12]:
        cap.verts.remove(v)
    ob('cap', cap, m('pl0', S['main']))
    for k in (1, 2):   # 늘어진 판 — 바깥 반쪽 호를 따라 굵은 띠(로우 폴리 타원체를 얇게 자르면 면이 남지 않았다)
        zc = 0.1 - 0.17 * k
        R = (0.58 + 0.05 * k, 0.47 + 0.03 * k)
        arc = [Vector((0.06 * k + R[0] * math.cos(a), R[1] * math.sin(a), zc)) for a in [(-1.7 + 3.4 * j / 12) for j in range(13)]]
        ob(f'lame{k}', C.tube(arc, interp([0.05, 0.085, 0.09, 0.085, 0.05], len(arc)), seg=6), m('pl', S['main']))
        for j in (3, 6, 9):
            ob(f'rivet{k}{j}', C.ellipsoid(arc[j] + Vector((0, 0, 0.0)) + (arc[j] - Vector((0.06 * k, 0, zc))).normalized() * 0.08, (0.035, 0.035, 0.035)), metal_m(S['trim']), 0)
    rim = C.torus(Vector((0, 0, 0.14)), 0.53, 0.035)
    for v in [v for v in rim.verts if v.co.x < -0.3]:
        rim.verts.remove(v)
    ob('rim', rim, metal_m(S['trim']))
    for k in range(S['spikes']):
        a = -0.6 + 1.2 * k / max(1, S['spikes'] - 1)
        ob(f'spike{k}', C.cone(Vector((0.3 * math.sin(a) + 0.1, 0.0, 0.58)), 0.08, 0.0, 0.3, seg=6, rot=Euler((0, a * 0.7 + 0.3, 0))), m('horn', '#f1e4c8'))
    if S['gem']:
        gem('g', S['gem'], Vector((0.1, -0.42, 0.36)), 0.08)


# ── 북 16단계 (대장간 강화 단계 0~15) ──
def drum(level):
    wood = '#b9783a' if level < 5 else '#a8643a' if level < 10 else '#8a3a2a'
    ring = '#7c858f' if level < 5 else '#e8b23a' if level < 13 else '#fff0a0'
    hoopc = '#5a3418' if level < 10 else '#3a2a5a'
    ob('body', C.tube([Vector((0, 0, -0.42)), Vector((0, 0, 0.42))], [0.5, 0.56, 0.5], seg=10), m('wood', wood))
    for z in (-0.44, 0.44):
        ob(f'head{z}', C.ellipsoid(Vector((0, 0, z)), (0.5, 0.5, 0.03)), m('skin', '#f6ead2', rough=0.85), O * 0.6)
        ob(f'hoop{z}', C.torus(Vector((0, 0, z)), 0.52, 0.05, seg=12, ring=6), m('hoop', hoopc))
    nring = 1 + min(3, level // 3)
    for k in range(nring):
        z = -0.25 + 0.5 * (k + 0.5) / nring
        ob(f'ring{k}', C.torus(Vector((0, 0, z)), 0.565, 0.035, seg=12, ring=6), metal_m(ring))
    for k in range(6):   # 줄 매기 — 지그재그 끈
        a0, a1 = 2 * math.pi * k / 6, 2 * math.pi * (k + 0.5) / 6
        ob(f'lace{k}', C.tube([Vector((0.52 * math.cos(a0), 0.52 * math.sin(a0), 0.4)), Vector((0.56 * math.cos(a1), 0.56 * math.sin(a1), -0.4))], 0.018, seg=5), m('lace', '#f1e4c8'), 0)
    if level >= 3:   # 징 박기
        for k in range(8):
            a = 2 * math.pi * k / 8
            ob(f'stud{k}', C.ellipsoid(Vector((0.58 * math.cos(a), 0.58 * math.sin(a), 0.0)), (0.04, 0.04, 0.04)), metal_m(ring), O * 0.4)
    if level >= 7:   # 보석
        cols = ['#4fd8ff', '#e8467c', '#9ad04a', '#ffd34d']
        for k in range(min(4, 1 + (level - 7) // 2)):
            a = -math.pi / 2 + (k - 1.5) * 0.45
            gem(f'gem{k}', cols[k % 4], Vector((0.6 * math.cos(a), 0.6 * math.sin(a), 0.2)), 0.07)
    if level >= 11:   # 날개 장식
        for sx in (-1, 1):
            pts = spline([Vector((sx * 0.55, 0, 0.2)), Vector((sx * 0.85, 0, 0.45)), Vector((sx * 0.95, 0, 0.8))], 8)
            ob(f'wing{sx}', C.tube(pts, interp([0.09, 0.07, 0.01], len(pts)), seg=6), metal_m(ring))
    if level >= 15:   # 왕관
        for k in range(6):
            a = 2 * math.pi * k / 6
            ob(f'crown{k}', C.cone(Vector((0.42 * math.cos(a), 0.42 * math.sin(a), 0.55)), 0.08, 0.0, 0.2, seg=6), metal_m('#ffd34d'))
    # 북채 두 개
    for sx in (-1, 1):
        ob(f'stick{sx}', C.tube([Vector((sx * 0.25, -0.15, 0.5)), Vector((sx * 0.65, -0.3, 0.95))], 0.03, seg=6), m('stick', '#8a5a2b'))
        ob(f'tip{sx}', C.ellipsoid(Vector((sx * 0.67, -0.31, 0.97)), (0.07, 0.07, 0.07)), m('tipb', '#f1e4c8'))



# ── 무기 4종 (2026-10-27, 사용자: "비버의 무기가 북이라 너무 어색해 … 검 · 창 · 활 · 지팡이") ──
def spear(t):
    T = TIER[t]
    ob('shaft', C.tube([Vector((0, 0, -0.85)), Vector((0, 0, 0.5))], 0.04, seg=8), m('shaft', '#8a5a2b' if t == 1 else T['main']))
    head = C.cone(Vector((0, 0, 0.72)), 0.13, 0.0, 0.42, seg=4)
    ob('head', head, metal_m(T['metal'] if t > 1 else '#c8d2dc'))
    ob('collar', C.tube([Vector((0, 0, 0.46)), Vector((0, 0, 0.54))], 0.075, seg=8), metal_m(T['trim']))
    for k, z in enumerate((-0.15, 0.05)):
        ob(f'wrap{k}', C.tube([Vector((0, 0, z)), Vector((0, 0, z + 0.08))], 0.052, seg=8), m('wrap', T['cloth']), O * 0.6)
    if t >= 2:   # 술 장식
        pts = spline([Vector((0, 0, 0.5)), Vector((0.12, -0.02, 0.36)), Vector((0.16, -0.02, 0.18))], 8)
        ob('tassel', C.tube(pts, interp([0.05, 0.04, 0.012], len(pts)), seg=6), m('tassel', '#e8452c' if t == 2 else '#ffd34d'))
    if T['gem']:
        gem('g', T['gem'], Vector((0, -0.05, 0.5)), 0.05)
    ob('butt', C.cone(Vector((0, 0, -0.92)), 0.05, 0.0, 0.12, seg=6, rot=Euler((math.radians(180), 0, 0))), metal_m(T['trim']))


def sword_lv(level):
    """대장간 검 16단계 (예전 북 drum(level) 자리) — 0~4 나무 · 쇠, 5~9 푸른 강철, 10~15 황금 · 보석 · 빛 · 날개"""
    t = 1 if level < 5 else 2 if level < 10 else 3
    T = TIER[t]
    blade_c = '#c8d2dc' if level < 2 else T['metal'] if t > 1 else '#d4dde6'
    if level <= 1:
        blade_c = '#c9a46a'   # 나무 검
    blade = C.box(Vector((0, 0, 0.32)), (0.17 + 0.006 * level, 0.05, 0.95), bevel=0.0)
    for v in blade.verts:
        if v.co.z > 0.62:
            v.co.x *= max(0.05, (0.8 - v.co.z) / 0.18)
    es = 0.0 if level < 7 else 0.25 + 0.06 * (level - 7)
    ob('blade', blade, m('blade', blade_c, rough=0.4, metal=0.0 if level <= 1 else 0.6, emit=blade_c if es else None, es=es))
    ob('guard', C.box(Vector((0, 0, -0.18)), (0.52 + 0.02 * min(level, 10), 0.11, 0.09)), metal_m(T['trim']))
    ob('grip', C.tube([Vector((0, 0, -0.2)), Vector((0, 0, -0.5))], 0.055, seg=8), m('grip', T['main']))
    ob('pommel', C.ellipsoid(Vector((0, 0, -0.55)), (0.08, 0.08, 0.08)), metal_m(T['trim']))
    if level >= 3:   # 가드 보석
        cols = ['#4fd8ff', '#e8467c', '#9ad04a', '#ffd34d']
        for k in range(min(3, 1 + (level - 3) // 3)):
            gem(f'gem{k}', cols[(level + k) % 4], Vector((-0.16 + 0.16 * k, -0.07, -0.18)), 0.05)
    if level >= 5:   # 칼날 홈(룬)
        ob('fuller', C.box(Vector((0, -0.03, 0.3)), (0.04, 0.01, 0.6)), m('rune', '#7fd4ff' if t == 2 else '#ffd34d', emit='#7fd4ff' if t == 2 else '#ffd34d', es=0.9), 0)
    if level >= 11:   # 가드 날개
        for sx in (-1, 1):
            pts = spline([Vector((sx * 0.26, 0, -0.16)), Vector((sx * 0.5, 0, -0.02)), Vector((sx * 0.56, 0, 0.22))], 8)
            ob(f'wing{sx}', C.tube(pts, interp([0.07, 0.05, 0.01], len(pts)), seg=6), metal_m('#ffd34d'))
    if level >= 15:   # 왕관 손잡이
        for k in range(5):
            a = 2 * math.pi * k / 5
            ob(f'crown{k}', C.cone(Vector((0.07 * math.cos(a), 0.07 * math.sin(a), -0.6)), 0.03, 0.0, 0.1, seg=5, rot=Euler((math.radians(180), 0, 0))), metal_m('#ffd34d'), O * 0.5)



# ── 무기 세트 파츠 (2026-11-04, 사용자: "나머지 부위 파츠별도 · 무기 속성 4개 있는 것처럼 속성에 맞는 파츠 모두 생성") ──
# 검 = 기사(판금 · 진홍) · 창 = 창기병(푸른 강철 · 꼬리털) · 활 = 숲 사수(가죽 · 초록) · 지팡이 = 현자(보라 천 · 금 · 보석). 색이 아니라 모양으로 갈린다 — 게임 칸은 62px
SETS = {
    'sword': dict(metal='#c8d2dc', main='#b8322c', trim='#e8b23a', dark='#5a1c18'),
    'spear': dict(metal='#8fa6bf', main='#2a5fa8', trim='#dfe8f2', dark='#173a6a'),
    'bow': dict(metal='#9a6a3a', main='#4f8a3f', trim='#d8b86a', dark='#2f5a2a'),
    'staff': dict(metal='#e6d6a8', main='#6a3fb0', trim='#f2c232', dark='#3a2070', gem='#7fe3ff'),
}


def set_helmet(k):
    S = SETS[k]
    if k == 'sword':   # 통투구 — 눈 틈 · 숨구멍 · 금 십자 · 진홍 볏
        dome = C.ellipsoid(Vector((0, 0, 0.02)), (0.46, 0.48, 0.62))
        ob('dome', dome, metal_m(S['metal']))
        ob('slit', C.box(Vector((0, -0.46, 0.1)), (0.62, 0.06, 0.09)), m('dark', '#1a1210', rough=0.9), 0)
        ob('crossv', C.box(Vector((0, -0.47, -0.08)), (0.08, 0.05, 0.62)), metal_m(S['trim']))
        ob('crossh', C.box(Vector((0, -0.47, 0.2)), (0.66, 0.05, 0.07)), metal_m(S['trim']))
        pts = spline([Vector((0, -0.25, 0.52)), Vector((0, 0.05, 0.84)), Vector((0, 0.42, 0.7)), Vector((0, 0.62, 0.3))], 14)
        ob('crest', C.tube(pts, interp([0.05, 0.13, 0.13, 0.03], len(pts)), seg=7), m('crest', S['main']))
    elif k == 'spear':   # 뾰족 투구 — 원뿔 · 넓은 챙 · 푸른 꼬리털
        dome = C.ellipsoid(Vector((0, 0, -0.02)), (0.48, 0.5, 0.44))
        for v in [v for v in dome.verts if v.co.z < -0.14]:
            dome.verts.remove(v)
        ob('dome', dome, metal_m(S['metal']))
        ob('spike', C.cone(Vector((0, 0, 0.62)), 0.2, 0.0, 0.62, seg=7), metal_m(S['trim']))
        ob('inside', C.ellipsoid(Vector((0, -0.12, -0.2)), (0.36, 0.3, 0.26)), m('dark', '#1c2230', rough=0.9), 0)
        ob('rim', C.torus(Vector((0, 0, -0.14)), 0.5, 0.06), m('rim', S['main']))
        for sx in (-1, 1):
            ob(f'cheek{sx}', C.ellipsoid(Vector((sx * 0.42, -0.1, -0.34)), (0.11, 0.22, 0.26), rot=Euler((0, sx * 0.2, 0))), metal_m(S['metal']))
        pts = spline([Vector((0, 0.3, 0.26)), Vector((0, 0.62, 0.1)), Vector((0, 0.72, -0.34))], 12)
        ob('tail', C.tube(pts, interp([0.07, 0.15, 0.03], len(pts)), seg=7), m('tail', S['main']))
    elif k == 'bow':   # 두건 — 부드러운 천 · 뒤로 늘어진 끝 · 얼굴 구멍 · 깃털
        hood = C.ellipsoid(Vector((0, 0.04, 0.02)), (0.52, 0.56, 0.58))
        ob('hood', hood, m('hood', S['main'], rough=0.9))
        ob('face', C.ellipsoid(Vector((0, -0.42, -0.08)), (0.32, 0.18, 0.34)), m('dark', '#1c2616', rough=0.95), 0)
        fold = C.torus(Vector((0, -0.34, -0.08)), 0.34, 0.06, rot=Euler((math.radians(88), 0, 0)))
        ob('fold', fold, m('fold', S['dark'], rough=0.9))
        pts = spline([Vector((0, 0.4, 0.2)), Vector((0, 0.72, 0.02)), Vector((0, 0.9, -0.34))], 12)
        ob('tip', C.tube(pts, interp([0.2, 0.13, 0.02], len(pts)), seg=7), m('hood', S['main'], rough=0.9))
        fp = spline([Vector((0.38, -0.02, 0.26)), Vector((0.6, 0.02, 0.6)), Vector((0.62, 0.1, 0.92))], 10)
        ob('feather', C.tube(fp, interp([0.03, 0.09, 0.01], len(fp)), seg=6), m('feather', '#f1e4c8'))
    else:   # 마법사 모자 — 넓은 챙 · 꺾인 고깔 · 금 띠 · 빛나는 보석
        ob('brim', C.ellipsoid(Vector((0, 0, -0.3)), (0.82, 0.78, 0.07)), m('brim', S['dark'], rough=0.85))
        pts = spline([Vector((0, 0, -0.28)), Vector((0, 0.02, 0.14)), Vector((0.03, 0.12, 0.5)), Vector((0.2, 0.28, 0.76))], 16)
        ob('cone', C.tube(pts, interp([0.46, 0.3, 0.15, 0.015], len(pts)), seg=10), m('cone', S['main'], rough=0.85))
        ob('band', C.torus(Vector((0, 0, -0.17)), 0.42, 0.06), metal_m(S['trim']))
        gem('g', S['gem'], Vector((0, -0.45, -0.12)), 0.09)


def set_armor(k):
    S = SETS[k]
    ob('neck', C.ellipsoid(Vector((0, -0.04, 0.58)), (0.2, 0.15, 0.06)), m('dark', '#2a1a12', rough=0.9), 0)
    if k == 'sword':   # 판금 흉갑 — 큰 어깨받이 · 금 십자
        ob('chest', C.ellipsoid(Vector((0, 0, 0)), (0.5, 0.32, 0.62), egg=-0.22), metal_m(S['metal']))
        for sx in (-1, 1):
            ob(f'pad{sx}', C.ellipsoid(Vector((sx * 0.56, -0.02, 0.42)), (0.32, 0.32, 0.18), rot=Euler((0, sx * 0.5, 0))), m('pad', S['main']))
        ob('cv', C.box(Vector((0, -0.3, 0.06)), (0.12, 0.05, 0.62)), metal_m(S['trim']))
        ob('ch', C.box(Vector((0, -0.3, 0.14)), (0.42, 0.05, 0.11)), metal_m(S['trim']))
        ob('belt', C.torus(Vector((0, -0.02, -0.4)), 0.4, 0.06), m('belt', S['main']))
    elif k == 'spear':   # 미늘 갑옷 — 가로 띠 여러 줄 · 푸른 앞자락
        ob('chest', C.ellipsoid(Vector((0, 0, 0.02)), (0.46, 0.3, 0.6), egg=-0.15), metal_m(S['metal']))
        for j in range(5):
            z = 0.36 - 0.17 * j
            r = 0.47 - 0.015 * abs(j - 1)
            # 몸에 붙은 앞쪽 호만 — 둥근 고리를 두르면 몸에서 떠 용수철처럼 보였다
            arc = [Vector((math.cos(u) * r * 1.02, -math.sin(u) * 0.31, z)) for u in [math.radians(10 + 160 * q / 12) for q in range(13)]]
            ob(f'lame{j}', C.tube(arc, 0.038, seg=6), m('lame', S['main']), O * 0.4)
        ob('tabard', C.box(Vector((0, -0.31, -0.32)), (0.34, 0.05, 0.62)), m('tabard', S['main']))
        ob('emblem', C.ellipsoid(Vector((0, -0.34, 0.2)), (0.14, 0.04, 0.17), egg=-0.4), metal_m(S['trim']))
        for sx in (-1, 1):
            ob(f'wing{sx}', C.cone(Vector((sx * 0.52, 0, 0.42)), 0.13, 0.0, 0.34, seg=5, rot=Euler((0, sx * 1.15, 0))), metal_m(S['trim']))
    elif k == 'bow':   # 가죽 조끼 — 초록 망토 깃 · 화살통 끈 · 끈 매듭
        ob('chest', C.ellipsoid(Vector((0, 0, 0)), (0.44, 0.28, 0.58), egg=-0.1), m('leather', S['metal'], rough=0.85))
        ob('collar', C.ellipsoid(Vector((0, 0.02, 0.5)), (0.58, 0.42, 0.2)), m('cloak', S['main'], rough=0.9))
        strap = [Vector((-0.34, -0.26, 0.42)), Vector((0, -0.31, 0.04)), Vector((0.34, -0.25, -0.34))]
        ob('strap', C.tube(strap, 0.05, seg=6), m('strap', '#3b2415'))
        for j in range(3):
            ob(f'lace{j}', C.box(Vector((0.02, -0.29, 0.28 - 0.2 * j)), (0.2, 0.03, 0.03)), m('lacec', S['trim']), 0)
        ob('belt', C.torus(Vector((0, -0.02, -0.38)), 0.36, 0.05), m('belt', '#3b2415'))
        ob('leaf', C.ellipsoid(Vector((-0.22, -0.34, 0.46)), (0.11, 0.03, 0.07), rot=Euler((0, 0.5, 0))), m('leaf', S['trim']))
    else:   # 긴 로브 — 아래로 넓게 퍼지고 금 띠 · 큰 보석
        ob('robe', C.ellipsoid(Vector((0, 0, -0.04)), (0.48, 0.3, 0.72), egg=0.34), m('robe', S['main'], rough=0.85))
        ob('hem', C.torus(Vector((0, 0, -0.58)), 0.5, 0.05), metal_m(S['trim']))
        ob('center', C.box(Vector((0, -0.3, -0.12)), (0.12, 0.05, 0.9)), metal_m(S['trim']))
        ob('collar', C.torus(Vector((0, -0.03, 0.5)), 0.24, 0.07), m('col', S['dark']))
        gem('g', S['gem'], Vector((0, -0.34, 0.2)), 0.11)
        for sx in (-1, 1):
            ob(f'sleeve{sx}', C.ellipsoid(Vector((sx * 0.5, 0, 0.26)), (0.17, 0.2, 0.3), rot=Euler((0, sx * 0.4, 0))), m('sl', S['dark'], rough=0.85))


def set_gloves(k):
    S = SETS[k]
    if k == 'sword':   # 건틀릿 — 판금 손가락 · 손등 판 · 마디 가시 · 넓은 손목
        col = metal_m(S['metal'])
        ob('palm', C.ellipsoid(Vector((0, 0, 0.1)), (0.32, 0.19, 0.3)), col)
        for j in range(4):
            x = -0.21 + 0.14 * j
            ob(f'f{j}', C.tube([Vector((x, -0.02, 0.32)), Vector((x * 1.05, -0.06, 0.58 - abs(j - 1.5) * 0.05))], 0.075, seg=6), col)
            ob(f'kn{j}', C.cone(Vector((x, -0.2, 0.3)), 0.05, 0.0, 0.13, seg=5, rot=Euler((math.radians(90), 0, 0))), metal_m(S['trim']), O * 0.5)
        ob('thumb', C.tube([Vector((-0.3, -0.04, 0.12)), Vector((-0.47, -0.1, 0.34))], 0.08, seg=6), col)
        ob('cuff', C.tube([Vector((0, 0.02, -0.46)), Vector((0, 0.02, -0.12))], [0.36, 0.24], seg=8), m('cuff', S['main']))
        ob('rim', C.torus(Vector((0, 0.02, -0.45)), 0.36, 0.04), metal_m(S['trim']))
    elif k == 'spear':   # 긴 팔덮개 — 지느러미 판 셋
        col = m('glove', S['main'])
        ob('palm', C.ellipsoid(Vector((0, 0, 0.16)), (0.28, 0.17, 0.26)), col)
        for j in range(4):
            x = -0.2 + 0.135 * j
            ob(f'f{j}', C.tube([Vector((x, -0.02, 0.36)), Vector((x * 1.05, -0.06, 0.6 - abs(j - 1.5) * 0.05))], 0.06, seg=6), col)
        ob('thumb', C.tube([Vector((-0.27, -0.04, 0.18)), Vector((-0.42, -0.1, 0.36))], 0.065, seg=6), col)
        ob('cuff', C.tube([Vector((0, 0.02, -0.66)), Vector((0, 0.02, -0.04))], [0.25, 0.22], seg=8), metal_m(S['metal']))
        for j in range(3):
            ob(f'fin{j}', C.cone(Vector((0.26, 0.02, -0.5 + 0.2 * j)), 0.09, 0.0, 0.26, seg=4, rot=Euler((0, 1.25, 0))), metal_m(S['trim']), O * 0.6)
        ob('rim', C.torus(Vector((0, 0.02, -0.04)), 0.23, 0.035), metal_m(S['trim']))
    elif k == 'bow':   # 궁수 장갑 — 손가락 세 개만 · 맨 손끝 · 초록 팔찌 · 깃털
        col = m('glove', S['metal'], rough=0.85)
        ob('palm', C.ellipsoid(Vector((0, 0, 0.1)), (0.29, 0.16, 0.28)), col)
        for j in range(3):
            x = -0.14 + 0.135 * j
            ob(f'f{j}', C.tube([Vector((x, -0.02, 0.3)), Vector((x, -0.04, 0.44))], 0.065, seg=6), col)
            ob(f'tip{j}', C.ellipsoid(Vector((x, -0.04, 0.48)), (0.055, 0.055, 0.06)), m('skin', '#e8c49a'), O * 0.5)
        ob('thumb', C.tube([Vector((-0.27, -0.04, 0.1)), Vector((-0.4, -0.1, 0.28))], 0.065, seg=6), col)
        ob('bracer', C.tube([Vector((0, 0.02, -0.44)), Vector((0, 0.02, -0.12))], [0.25, 0.21], seg=8), m('bracer', S['main'], rough=0.85))
        for j in range(2):
            ob(f'strap{j}', C.torus(Vector((0, 0.02, -0.36 + 0.16 * j)), 0.235, 0.022), m('strap', '#3b2415'), O * 0.4)
        fp = spline([Vector((0.2, -0.02, -0.24)), Vector((0.46, 0.0, -0.3)), Vector((0.66, 0.02, -0.5))], 9)
        ob('feather', C.tube(fp, interp([0.03, 0.09, 0.01], len(fp)), seg=6), m('feather', S['trim']))
    else:   # 비단 장갑 — 얇은 손가락 · 금 고리 · 손등 보석 · 나팔 소매
        col = m('glove', S['main'], rough=0.8)
        ob('palm', C.ellipsoid(Vector((0, 0, 0.1)), (0.26, 0.14, 0.27)), col)
        for j in range(4):
            x = -0.18 + 0.12 * j
            ob(f'f{j}', C.tube([Vector((x, -0.02, 0.3)), Vector((x * 1.05, -0.05, 0.6 - abs(j - 1.5) * 0.06))], 0.045, seg=6), col)
        ob('ring', C.torus(Vector((0.06, -0.04, 0.42)), 0.052, 0.018, rot=Euler((0, 0, 0))), metal_m(S['trim']), O * 0.4)
        ob('thumb', C.tube([Vector((-0.24, -0.04, 0.1)), Vector((-0.38, -0.09, 0.3))], 0.05, seg=6), col)
        ob('cuff', C.tube([Vector((0, 0.02, -0.5)), Vector((0, 0.02, -0.12))], [0.38, 0.2], seg=9), m('cuff', S['dark'], rough=0.85))
        ob('rim', C.torus(Vector((0, 0.02, -0.5)), 0.38, 0.04), metal_m(S['trim']))
        gem('g', S['gem'], Vector((0, -0.17, 0.12)), 0.08)


def set_boots(k):
    S = SETS[k]
    ob('sole', C.box(Vector((0, -0.12, -0.47)), (0.4, 0.8, 0.07)), m('sole', '#3b2415'))
    if k == 'sword':   # 판금 신 — 무릎 덮개 · 뾰족 발끝 · 진홍 띠
        col = metal_m(S['metal'])
        ob('leg', C.tube([Vector((0, 0.12, -0.2)), Vector((0, 0.1, 0.5))], [0.22, 0.2], seg=8), col)
        ob('foot', C.ellipsoid(Vector((0, -0.15, -0.32)), (0.22, 0.4, 0.17), egg=0.1), col)
        ob('toe', C.cone(Vector((0, -0.58, -0.36)), 0.11, 0.0, 0.26, seg=6, rot=Euler((math.radians(90), 0, 0))), metal_m(S['trim']))
        ob('knee', C.ellipsoid(Vector((0, -0.08, 0.52)), (0.2, 0.14, 0.17)), metal_m(S['trim']))
        ob('band', C.torus(Vector((0, 0.11, 0.1)), 0.215, 0.05), m('band', S['main']))
    elif k == 'spear':   # 긴 정강이받이 — 푸른 천 · 앞 판 · 박차
        col = m('boot', S['main'])
        ob('leg', C.tube([Vector((0, 0.12, -0.2)), Vector((0, 0.1, 0.64))], [0.2, 0.2], seg=8), col)
        ob('foot', C.ellipsoid(Vector((0, -0.15, -0.32)), (0.2, 0.38, 0.17), egg=0.1), col)
        ob('greave', C.box(Vector((0, -0.09, 0.2)), (0.26, 0.06, 0.8)), metal_m(S['metal']))
        ob('fin', C.cone(Vector((0.22, 0.1, 0.56)), 0.09, 0.0, 0.3, seg=4, rot=Euler((0, 1.1, 0))), metal_m(S['trim']), O * 0.6)
        ob('spur', C.cone(Vector((0, 0.42, -0.32)), 0.05, 0.0, 0.26, seg=5, rot=Euler((math.radians(-90), 0, 0))), metal_m(S['trim']), O * 0.6)
    elif k == 'bow':   # 부드러운 가죽 장화 — 접은 초록 끝 · 끈 셋
        col = m('boot', S['metal'], rough=0.85)
        ob('leg', C.tube([Vector((0, 0.12, -0.2)), Vector((0, 0.12, 0.42))], [0.19, 0.2], seg=8), col)
        ob('foot', C.ellipsoid(Vector((0, -0.17, -0.33)), (0.19, 0.36, 0.15), egg=0.1), col)
        ob('fold', C.tube([Vector((0, 0.12, 0.34)), Vector((0, 0.12, 0.58))], [0.26, 0.28], seg=8), m('fold', S['main'], rough=0.9))
        for j in range(3):
            ob(f'lace{j}', C.torus(Vector((0, 0.12, -0.14 + 0.15 * j)), 0.2, 0.02), m('lacec', '#3b2415'), O * 0.4)
        ob('leaf', C.ellipsoid(Vector((0.14, -0.13, 0.48)), (0.03, 0.1, 0.07)), m('leaf', S['trim']))
    else:   # 끝이 말린 신 — 보라 천 · 금 끝 · 작은 보석
        col = m('boot', S['main'], rough=0.8)
        ob('leg', C.tube([Vector((0, 0.14, -0.22)), Vector((0, 0.14, 0.22))], [0.2, 0.2], seg=8), col)
        ob('foot', C.ellipsoid(Vector((0, -0.12, -0.33)), (0.2, 0.42, 0.15), egg=0.1), col)
        pts = spline([Vector((0, -0.44, -0.32)), Vector((0, -0.66, -0.24)), Vector((0, -0.74, -0.04)), Vector((0, -0.62, 0.06))], 12)
        ob('curl', C.tube(pts, interp([0.12, 0.08, 0.05, 0.02], len(pts)), seg=7), col)
        ob('pom', C.ellipsoid(pts[-1], (0.06, 0.06, 0.06)), metal_m(S['trim']), O * 0.5)
        ob('rim', C.torus(Vector((0, 0.14, 0.22)), 0.21, 0.05), metal_m(S['trim']))
        gem('g', S['gem'], Vector((0, -0.28, -0.14)), 0.06)


# 견갑 네 벌 — 기존 틀에 색 · 장식(모양 차이는 가시 수 · 보석 · 어깨 위 장식)
SHOULDERS.update({
    'set-sword': dict(main='#b8322c', trim='#e8b23a', spikes=0, gem=None, extra='plate'),
    'set-spear': dict(main='#2a5fa8', trim='#dfe8f2', spikes=3, gem=None, extra='fins'),
    'set-bow': dict(main='#4f8a3f', trim='#d8b86a', spikes=0, gem=None, extra='feathers'),
    'set-staff': dict(main='#6a3fb0', trim='#f2c232', spikes=0, gem='#7fe3ff', extra='orb'),
})


def set_shoulder(k):
    kind = f'set-{k}'
    shoulder(kind)
    S = SETS[k]
    if k == 'sword':   # 금 십자 판
        ob('plate', C.ellipsoid(Vector((0.1, -0.36, 0.3)), (0.18, 0.05, 0.22), egg=-0.3), metal_m(S['metal']))
        ob('cv', C.box(Vector((0.1, -0.41, 0.3)), (0.06, 0.03, 0.3)), metal_m(S['trim']), O * 0.5)
        ob('ch', C.box(Vector((0.1, -0.41, 0.34)), (0.22, 0.03, 0.06)), metal_m(S['trim']), O * 0.5)
    elif k == 'bow':   # 깃털 셋
        for j, a in enumerate((-0.45, 0.0, 0.45)):
            base = Vector((0.08 + 0.2 * j - 0.12, 0.08, 0.52))
            tip = base + Vector((math.sin(a) * 0.3 + 0.1, 0.1, 0.5))
            pts = spline([base, base.lerp(tip, 0.5), tip], 8)
            ob(f'fe{j}', C.tube(pts, interp([0.03, 0.09, 0.01], len(pts)), seg=6), m('feather', S['trim'] if j == 1 else '#f1e4c8'))
    elif k == 'staff':   # 떠 있는 작은 구슬
        for j, (x, z) in enumerate(((-0.1, 0.84), (0.34, 0.72))):
            ob(f'orb{j}', C.ellipsoid(Vector((x, -0.02, z)), (0.08, 0.08, 0.08)), m('orb', S['gem'], rough=0.2, emit=S['gem'], es=0.7), O * 0.5)


# 3/4 로 보일 파츠 — (옆으로 도는 각, 앞으로 숙이는 각)
TURN = {'helmet': (-32, 8), 'armor': (-26, 4), 'gloves': (-30, 6), 'boots': (-62, 4), 'shoulder': (-58, 14)}

JOBS = {}
for t in (1, 2, 3):
    JOBS[f'weapon-{t}'] = (sword, t, (25, 15), 2.0)
    JOBS[f'bow-{t}'] = (bow, t, (-20, 12), 2.1)
    JOBS[f'staff-{t}'] = (staff, t, (-20, 12), 2.1)
    JOBS[f'spear-{t}'] = (spear, t, (-20, 12), 2.2)
    JOBS[f'shield-{t}'] = (shield, t, (-25, 12), 1.9)
    JOBS[f'helmet-{t}'] = (helmet, t, (-30, 18), 1.75)
    JOBS[f'armor-{t}'] = (armor, t, (-28, 14), 1.75)
    JOBS[f'gloves-{t}'] = (gloves, t, (-22, 20), 1.6)
    JOBS[f'boots-{t}'] = (boots, t, (-30, 18), 1.6)
for k in SHOULDERS:
    JOBS[f'shoulder-{k}'] = (shoulder, k, (-35, 24), 1.9)
for k in SETS:
    JOBS[f'set-{k}-helmet'] = (set_helmet, k, (-30, 18), 1.95 if k in ('sword', 'spear') else 2.1)
    JOBS[f'set-{k}-armor'] = (set_armor, k, (-28, 14), 1.8)
    JOBS[f'set-{k}-gloves'] = (set_gloves, k, (-22, 20), 1.75)
    JOBS[f'set-{k}-boots'] = (set_boots, k, (-30, 18), 1.75)
    JOBS[f'set-{k}-shoulder'] = (set_shoulder, k, (-35, 24), 2.0)
for lv in range(16):
    JOBS[f'drum-{lv:02d}'] = (drum, lv, (-24, 22), 2.3)
    JOBS[f'sword-{lv:02d}'] = (sword_lv, lv, (25, 15), 2.0)

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['gear', 'drums']
names = []
for a in argv:
    if a == 'gear':
        names += [k for k in JOBS if not k.startswith('drum-') and not k.startswith('sword-') and not k.startswith('set-')]
    elif a == 'drums':
        names += [k for k in JOBS if k.startswith('drum-')]
    elif a == 'swords':
        names += [k for k in JOBS if k.startswith('sword-')]
    else:
        names.append(a)
if 'sets' in argv:   # 세트 파츠만: gear_icons.py -- sets
    names = [k for k in JOBS if k.startswith('set-')]
os.makedirs(OUTDIR, exist_ok=True)
for name in names:
    fn, arg, (yaw, elev), scale = JOBS[name]
    C.reset()
    C.setup_render(res=(512, 512), samples=40)
    C.lights()
    C.ortho_camera((0.0, 0.0), scale, yaw_deg=yaw, elev_deg=elev)
    C.FACET = 10
    try:
        fn(arg)
    finally:
        C.FACET = 0
    turn = TURN.get(name.split('-')[-1] if name.startswith('set-') else name.split('-')[0], 0)
    if turn:
        piv = bpy.data.objects.new('pivot', None)
        bpy.context.scene.collection.objects.link(piv)
        for o in [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.parent is None]:
            o.parent = piv
        piv.rotation_euler = Euler((math.radians(turn[1]), 0, math.radians(turn[0])))
        bpy.context.view_layer.update()
    bpy.context.scene.render.filepath = os.path.join(OUTDIR, f'{name}.png')
    bpy.ops.render.render(write_still=True)
    print('wrote', name, flush=True)
print('DONE')
