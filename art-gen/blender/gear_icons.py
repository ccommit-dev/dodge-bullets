"""장비 파츠 · 북(무기 강화 단계) 로우 폴리 모델 (2026-10-23, 사용자: "무기 파츠 모델링 … BEAVER RAMPAGE 참고해서 수정").
비버 · 몬스터와 같은 그림체 — 각진 면(평면 셰이딩) · 무광 · 잉크 외곽선. 예전 파츠는 SDXL 광택 그림이라 새 캐릭터와 따로 놀았다.
  blender -b -P art-gen/blender/gear_icons.py -- [gear|drums|<이름>…]   → art-gen/out/b3d-gear/<이름>.png (512² 투명)
조립: node scripts/assemble-gear.mjs (public/titans/gear/<이름>.png · public/forge/swords/sNN.png 같은 파일명)"""
import bpy
import bmesh
import sys
import os
import math
from mathutils import Vector, Euler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import bcommon as C
from lib import toon as TOON
from lib.beaver import spline, interp

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# 도트 그림체(2026-11-17, ART_STYLE=pixel) — 48² 로 픽셀마다 한 점 렌더 → assemble-gear --pixel 이 최근접으로 키워 public/titans/gear-px 에
PIXEL = os.environ.get('ART_STYLE', '') == 'pixel'
ICON_RES = int(os.environ.get('PIXEL_ICON_RES', '48')) if PIXEL else 512
OUTDIR = os.environ.get('GEAR_OUT') or os.path.join(ROOT, 'art-gen', 'out', 'b3d-gear-px' if PIXEL else 'b3d-gear')   # 시험 렌더는 GEAR_OUT 으로 따로
# 캐주얼 아이콘(2026-11-23, 사용자: 캐주얼 아이템 아이콘 팩 그림 "이 느낌으로 모두 수정") — 매끈한 면(GEAR_FACET=0) · 셀 4단 · 흰 반짝임 · 짙은 외곽선.
# 렌더: ART_STYLE=toon GEAR_FACET=0 TOON_OUTLINE=2.6 INK_COLOR=#1a1424 TOON_STEPS=0:0.72,0.3:0.95,0.55:1.12,0.82:1.3 TOON_SPEC=0.955:0.8
# 조립(assemble-gear)이 아이콘에만 스티커 외곽선(scripts/lib/sticker)을 두른다 — 손에 드는 무기 그림(weapon · spear · bow · staff-N)은 그대로
GEAR_FACET = int(os.environ.get('GEAR_FACET', '10'))
O = 0.022
F = 1.0   # 무기 굵기 배율 — 아이콘 전용(icon-*)은 1.6(리소스 피드백 ④: 가는 세로 막대라 칸의 15%만 채웠다). 손에 드는 그림은 1.0 그대로

# 단계 색 — 1 나무 · 쇠, 2 푸른 강철 · 금, 3 진홍 · 황금 · 보석
TIER = {
    1: dict(main='#9a6234', metal='#a3acb6', trim='#c9a15a', gem=None, cloth='#7a8a3a'),
    2: dict(main='#3f7fc4', metal='#d4dde6', trim='#e8b23a', gem='#4fd8ff', cloth='#2f6fb0'),
    3: dict(main='#c8402f', metal='#f2c232', trim='#fff0a0', gem='#e8467c', cloth='#8a2a5a'),
}


def _tame_light(c):
    """캐주얼 아이콘(셀 밝은 단 1.3)에서 아주 밝은 색(쇠 · 흰 천)이 하얗게 날아갔다(기사 투구가 달걀로) — 명도 0.8 넘는 색만 0.8 쪽으로"""
    import colorsys
    h = c.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    hh, ss, vv = colorsys.rgb_to_hsv(r, g, b)
    if vv <= 0.8:
        return c
    r, g, b = colorsys.hsv_to_rgb(hh, ss, 0.8 + (vv - 0.8) * 0.35)
    return '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255))


def m(name, color, rough=0.75, metal=0.0, emit=None, es=0.0):
    if GEAR_FACET == 0 and TOON.enabled() and isinstance(color, str) and emit is None and color.lower() not in ('#ffffff', '#fff3c4', '#fffaf0'):
        color = _tame_light(color)
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
    blade = C.box(Vector((0, 0, 0.32)), (0.17 * F, 0.05 * F, 0.95), bevel=0.0)
    for v in blade.verts:   # 끝을 뾰족하게
        if v.co.z > 0.62:
            v.co.x *= max(0.05, (0.8 - v.co.z) / 0.18)
    ob('blade', blade, metal_m(T['metal'] if t > 1 else '#c8d2dc'))
    ob('guard', C.box(Vector((0, 0, -0.18)), (0.52 * (0.5 + F / 2), 0.11 * F, 0.09 * F)), metal_m(T['trim']))
    ob('grip', C.tube([Vector((0, 0, -0.2)), Vector((0, 0, -0.5))], 0.055 * F, seg=8), m('grip', T['main']))
    ob('pommel', C.ellipsoid(Vector((0, 0, -0.55)), (0.08 * F, 0.08 * F, 0.08 * F)), metal_m(T['trim']))
    if T['gem']:
        gem('g', T['gem'], Vector((0, -0.06, -0.18)), 0.06)


def bow(t):
    T = TIER[t]
    pts = [Vector((0.42 * math.cos(a) - 0.3, 0, 0.78 * math.sin(a))) for a in [(-1.2 + 2.4 * k / 16) for k in range(17)]]
    ob('bow', C.tube(pts, interp([r * F for r in (0.035, 0.06, 0.07, 0.06, 0.035)], len(pts)), seg=8), m('bow', T['main'] if t > 1 else '#b9783a'))
    ob('string', C.tube([pts[0], pts[-1]], 0.012 * (0.5 + F / 2), seg=5), m('str', '#fffaf0'), 0)
    ob('wrap', C.tube([pts[8] + Vector((0, 0, -0.1)), pts[8] + Vector((0, 0, 0.1))], 0.085 * F, seg=8), m('wrap', T['trim']))
    for p in (pts[0], pts[-1]):
        ob('tip', C.ellipsoid(p, (0.06 * F, 0.06 * F, 0.06 * F)), metal_m(T['trim']))
    if T['gem']:
        gem('g', T['gem'], pts[8] + Vector((0.03, -0.09, 0)))


def staff(t):
    T = TIER[t]
    ob('shaft', C.tube([Vector((0, 0, -0.8)), Vector((0, 0, 0.45))], 0.05 * F, seg=8), m('shaft', '#8a5a2b' if t == 1 else T['main']))
    orb = T['gem'] or '#9ad04a'
    ro = 0.2 * (0.6 + 0.4 * F)
    ob('orb', C.ellipsoid(Vector((0, 0, 0.66)), (ro, ro, ro)), m('orb', orb, rough=0.3, emit=orb, es=0.9))
    for k in range(4 if t > 1 else 3):
        a = 2 * math.pi * k / (4 if t > 1 else 3)
        pts = spline([Vector((0, 0, 0.42)), Vector((0.2 * math.cos(a), 0.2 * math.sin(a), 0.6)), Vector((0.1 * math.cos(a), 0.1 * math.sin(a), 0.86))], 8)
        ob(f'prong{k}', C.tube(pts, interp([r * F for r in (0.04, 0.035, 0.015)], len(pts)), seg=6), metal_m(T['trim']))
    ob('cuff', C.tube([Vector((0, 0, 0.36)), Vector((0, 0, 0.45))], 0.075 * F, seg=8), metal_m(T['trim']))


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


def band(R0, R1, z0, z1, p0, p1, n=14, th=0.035):
    """바깥(−Y)을 감싼 굽은 판 — 위 반지름 R0 · 아래 R1, 각 p0~p1(라디안, 0 = −Y 정면). 관(tube)이 아니라 판이라 고리로 안 읽힌다"""
    bm = bmesh.new()
    rows = []
    for R, z in ((R0, z0), (R1, z1)):
        for inner in (0, 1):
            r = R - th * inner
            rows.append([bm.verts.new((r * math.sin(p0 + (p1 - p0) * j / n), -r * math.cos(p0 + (p1 - p0) * j / n), z)) for j in range(n + 1)])
    to, ti, bo, bi = rows
    for j in range(n):
        bm.faces.new((to[j], to[j + 1], bo[j + 1], bo[j]))
        bm.faces.new((ti[j + 1], ti[j], bi[j], bi[j + 1]))
        bm.faces.new((ti[j], ti[j + 1], to[j + 1], to[j]))
        bm.faces.new((bo[j], bo[j + 1], bi[j + 1], bi[j]))
    bm.faces.new((to[0], bo[0], bi[0], ti[0]))
    bm.faces.new((ti[n], bi[n], bo[n], to[n]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def shoulder(kind):
    """견갑 3판 (2026-11-19, 리소스 피드백 ④) — 옆에서 본 어깨판: 둥근 돔 + 아래로 겹쳐 내려오는 굽은 판 셋 · 판 끝 테 · 징 · 가죽 끈.
    1 · 2판은 판을 관(tube) 고리로 만들고 위에서 내려다봐 장비창에서 '초록 마카롱 · 감긴 고리'로 읽혔다"""
    S = SHOULDERS[kind]
    dark = '#%02x%02x%02x' % tuple(int(int(S['main'][i:i + 2], 16) * 0.72) for i in (1, 3, 5))   # 아래 판은 한 단 어둡게 — 같은 색이면 돔과 한 덩어리로 보였다
    cap = C.ellipsoid(Vector((0, 0, 0.2)), (0.56, 0.5, 0.46))
    for v in [v for v in cap.verts if v.co.z < 0.1]:
        cap.verts.remove(v)
    ob('cap', cap, m('pl0', S['main']))
    ob('caprim', band(0.575, 0.59, 0.17, 0.09, -1.75, 1.75, th=0.05), metal_m(S['trim']))
    ridge = [Vector((0, -0.5 * math.cos(a), 0.2 + 0.46 * math.sin(a) + 0.02)) for a in [math.radians(20 + 140 * j / 10) for j in range(11)]]
    ob('ridge', C.tube(ridge, 0.045, seg=6), metal_m(S['trim']))   # 돔 가운데 등줄
    for k in (1, 2, 3):
        zt = 0.13 - 0.15 * k
        zb = zt - 0.2
        R0 = 0.55 + 0.035 * k
        R1 = R0 + 0.07
        p = 1.5 - 0.12 * k
        ob(f'lame{k}', band(R0, R1, zt, zb, -p, p), m('pl', dark))
        ob(f'edge{k}', band(R1 + 0.004, R1 + 0.012, zb + 0.04, zb, -p, p, th=0.05), metal_m(S['trim']))
        for j, a in enumerate((-0.75, 0.0, 0.75)):
            rr = (R0 + R1) / 2 + 0.01
            ob(f'rivet{k}{j}', C.ellipsoid(Vector((rr * math.sin(a), -rr * math.cos(a), (zt + zb) / 2 + 0.02)), (0.04, 0.03, 0.04)), metal_m(S['trim']), 0)
    # 가죽 끈 · 버클(안쪽 왼편)
    ob('strap', C.box(Vector((-0.5, -0.18, -0.28)), (0.08, 0.05, 0.5)), m('strap', '#6b3f1f'))
    ob('buckle', C.box(Vector((-0.5, -0.22, -0.36)), (0.13, 0.04, 0.1)), metal_m(S['trim']), O * 0.6)
    for k in range(S['spikes']):
        a = -0.6 + 1.2 * k / max(1, S['spikes'] - 1)
        ob(f'spike{k}', C.cone(Vector((0.42 * math.sin(a), -0.1, 0.56)), 0.09, 0.0, 0.32, seg=6, rot=Euler((0, a * 0.8, 0))), m('horn', '#f1e4c8'))
    if S['gem']:
        gem('g', S['gem'], Vector((0, -0.5, 0.34)), 0.08)


# ── 무기 아이콘 전용 (2026-11-19, 리소스 피드백 ④) — 굵게(F 1.6) · 45° 대각선(손잡이 왼쪽 아래 → 끝 오른쪽 위) · 단계 장식
#    2단계 리본 · 3단계 금 날개. 손에 드는 그림(weapon-N 등, 손잡이 점 WEAPON_GRIP)은 그대로 두고 titans/gear/icon/<kind>-<t>.png 로 따로
ICON_GRIP = {'sword': (0, 0, -0.38), 'spear': (0, 0, -0.1), 'staff': (0, 0, -0.15), 'bow': (0.14, 0, 0)}
ICON_WING = {'sword': (0, 0, -0.18), 'spear': (0, 0, 0.5), 'staff': (0, 0, 0.4)}


def wings(at, s=1.0):
    for side in (-1, 1):
        for j in range(3):
            c = Vector(at) + Vector((side * (0.2 + 0.11 * j) * s, -0.04, (0.07 + 0.06 * j) * s))
            rot = Euler((0, side * (-0.55 - 0.18 * j), 0))
            ob(f'wing{side}{j}', C.ellipsoid(c, ((0.17 - 0.03 * j) * s, 0.03, 0.065 * s), rot=rot), m('wing', '#fff3c4' if j else '#f2c232'), O * 0.7)


def icon_weapon(arg):
    global F
    kind, t = arg
    F = float(os.environ.get('GEAR_ICON_F', '1.6'))   # 캐주얼 아이콘은 2.2 — 몽툭하게(조립에서 세로를 줄여 짧게도 본다: ICON_SQUASH)
    try:
        {'sword': sword, 'spear': spear, 'staff': staff, 'bow': bow}[kind](t)
    finally:
        F = 1.0
    T = TIER[t]
    g = Vector(ICON_GRIP[kind])
    if t >= 2:   # 리본 — 손잡이에서 늘어진 천
        pts = spline([g, g + Vector((-0.12, -0.03, -0.14)), g + Vector((-0.06, -0.03, -0.36))], 8)
        ob('ribbon', C.tube(pts, interp([0.05, 0.06, 0.025], len(pts)), seg=6), m('ribbon', T['cloth']))
    if t == 3:
        if kind == 'bow':
            for z in (-0.62, 0.62):
                wings((0.0, 0, z), 0.75)
        else:
            wings(ICON_WING[kind])


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
    ob('shaft', C.tube([Vector((0, 0, -0.85)), Vector((0, 0, 0.5))], 0.04 * F, seg=8), m('shaft', '#8a5a2b' if t == 1 else T['main']))
    head = C.cone(Vector((0, 0, 0.72)), 0.13 * (0.5 + F / 2), 0.0, 0.42, seg=4)
    ob('head', head, metal_m(T['metal'] if t > 1 else '#c8d2dc'))
    ob('collar', C.tube([Vector((0, 0, 0.46)), Vector((0, 0, 0.54))], 0.075 * F, seg=8), metal_m(T['trim']))
    for k, z in enumerate((-0.15, 0.05)):
        ob(f'wrap{k}', C.tube([Vector((0, 0, z)), Vector((0, 0, z + 0.08))], 0.052 * F, seg=8), m('wrap', T['cloth']), O * 0.6)
    if t >= 2:   # 술 장식
        pts = spline([Vector((0, 0, 0.5)), Vector((0.12, -0.02, 0.36)), Vector((0.16, -0.02, 0.18))], 8)
        ob('tassel', C.tube(pts, interp([r * F for r in (0.05, 0.04, 0.012)], len(pts)), seg=6), m('tassel', '#e8452c' if t == 2 else '#ffd34d'))
    if T['gem']:
        gem('g', T['gem'], Vector((0, -0.05, 0.5)), 0.05)
    ob('butt', C.cone(Vector((0, 0, -0.92)), 0.05 * F, 0.0, 0.12, seg=6, rot=Euler((math.radians(180), 0, 0))), metal_m(T['trim']))


def sword_lv(level):
    """대장간 검 16단계 — 2026-11-23 캐주얼 2판(리소스 피드백 ④: 가는 막대에 단계 차이가 보석 한두 개뿐이었다).
    단계마다 날 폭 · 길이 · 가드 · 보석 · 빛이 자란다 — 0~1 나무 · 2~4 쇠 · 5~9 푸른 강철(룬) · 10~14 황금(큰 보석 · 날개) · 15 왕관.
    두껍고 뭉툭하게(날 두께 0.09) — 매끈한 면(GEAR_FACET=0) · 셀 4단 · 스티커 외곽선(assemble-gear)으로 칸 아이콘과 같은 그림결"""
    t = 1 if level < 5 else 2 if level < 10 else 3
    T = TIER[t]
    wood = level <= 1
    bw = 0.25 + 0.009 * level            # 날 폭 0.25 → 0.385
    top = 0.80 + 0.012 * level           # 칼끝 높이
    blade_c = '#d9a86a' if wood else '#c3ccd6' if t == 1 else '#8fc0ee' if t == 2 else '#ffd34d'
    core_c = '#b98848' if wood else '#eef3f8' if t == 1 else '#dff3ff' if t == 2 else '#fff6c8'
    es = 0.0 if level < 7 else 0.18 + 0.05 * (level - 7)
    blade = C.box(Vector((0, 0, (top - 0.16) / 2 - 0.02)), (bw, 0.09, top + 0.16), bevel=0.0)
    for v in blade.verts:   # 칼끝 — 위 22% 를 좁혀 뾰족하게(나무 검은 둥글게 덜)
        z0 = top - (top + 0.16) * 0.22
        if v.co.z > z0:
            k = (v.co.z - z0) / max(0.01, top - z0)
            v.co.x *= max(0.18 if wood else 0.04, 1 - k)
    ob('blade', blade, m('blade', blade_c, rough=0.4, metal=0.0 if wood else 0.5, emit=blade_c if es else None, es=es))
    # 가운데 줄 — 나무는 결, 쇠는 밝은 날 등, 5+ 는 빛나는 룬 홈
    rune = level >= 5
    ob('core', C.box(Vector((0, -0.05, top * 0.42)), (bw * 0.28, 0.012, top * 0.72)), m('core', ('#7fd4ff' if t == 2 else '#fff3a0') if rune else core_c, emit=('#7fd4ff' if t == 2 else '#ffe066') if rune else None, es=0.6 + 0.08 * (level - 5) if rune else 0.0), 0)
    gw = 0.6 + 0.028 * min(level, 12)
    guard_c = '#8a5a2b' if wood else '#7f8a96' if t == 1 else T['trim']
    ob('guard', C.box(Vector((0, 0, -0.18)), (gw, 0.15, 0.13)), metal_m(guard_c) if not wood else m('guardw', guard_c))
    if level >= 8:   # 가드 끝이 위로 말린다
        for sx in (-1, 1):
            ob(f'curl{sx}', C.ellipsoid(Vector((sx * gw / 2, 0, -0.1)), (0.08, 0.08, 0.11)), metal_m(T['trim']))
    grip_c = '#6b4423' if t == 1 else T['main']
    ob('grip', C.tube([Vector((0, 0, -0.22)), Vector((0, 0, -0.52))], 0.072, seg=10), m('grip', grip_c))
    for k in range(3):   # 손잡이 감은 끈
        ob(f'wrap{k}', C.torus(Vector((0, 0, -0.28 - 0.09 * k)), 0.075, 0.018, seg=14, ring=6), m('wrap', '#3b2415' if t == 1 else T['trim']), 0)
    ob('pommel', C.ellipsoid(Vector((0, 0, -0.6)), (0.11, 0.11, 0.11)), metal_m(T['trim']) if not wood else m('pomw', '#b9783a'))
    cols = ['#4fd8ff', '#e8467c', '#9ad04a', '#ffd34d']
    if level >= 3:   # 가드 보석 — 3 · 6 · 9 단계에 하나씩
        n = min(3, 1 + (level - 3) // 3)
        xs = [0.0] if n == 1 else [-0.16, 0.16] if n == 2 else [-0.2, 0.0, 0.2]
        for k, x in enumerate(xs):
            gem(f'gem{k}', cols[(level + k) % 4], Vector((x, -0.09, -0.18)), 0.06 if level < 10 else 0.075)
    if level >= 6:   # 손잡이 끝 보석
        gem('pgem', cols[level % 4], Vector((0, -0.1, -0.6)), 0.055)
    if level >= 10:   # 날 밑동 큰 보석 · 금 테
        ob('bez', C.torus(Vector((0, -0.06, 0.02)), 0.1, 0.03, seg=20, ring=8, rot=Euler((math.radians(90), 0, 0))), metal_m('#ffd34d'))
        gem('bgem', '#e8467c', Vector((0, -0.08, 0.02)), 0.085)
    if level >= 11:   # 가드 날개 — 단계마다 커진다
        s = 1.0 + 0.08 * (level - 11)
        for sx in (-1, 1):
            for j in range(3):
                c = Vector((sx * (gw / 2 + (0.08 + 0.09 * j) * s), 0.02, -0.1 + 0.08 * j * s))
                ob(f'wing{sx}{j}', C.ellipsoid(c, ((0.16 - 0.03 * j) * s, 0.05, (0.075 - 0.01 * j) * s), rot=Euler((0, sx * (-0.35 - 0.3 * j), 0))), m('dwing', '#ffd34d' if j == 0 else '#fff3c4'), O * 0.7)
    if level >= 15:   # 왕관 손잡이
        for k in range(5):
            a = 2 * math.pi * k / 5
            ob(f'crown{k}', C.cone(Vector((0.09 * math.cos(a), 0.09 * math.sin(a), -0.66)), 0.04, 0.0, 0.13, seg=6, rot=Euler((math.radians(180), 0, 0))), metal_m('#ffd34d'), O * 0.5)



# ── 무기 세트 파츠 (2026-11-04, 사용자: "나머지 부위 파츠별도 · 무기 속성 4개 있는 것처럼 속성에 맞는 파츠 모두 생성") ──
# 검 = 기사(판금 · 진홍) · 창 = 창기병(푸른 강철 · 꼬리털) · 활 = 숲 사수(가죽 · 초록) · 지팡이 = 현자(보라 천 · 금 · 보석). 색이 아니라 모양으로 갈린다 — 게임 칸은 62px
SETS = {
    'sword': dict(metal='#c8d2dc', main='#b8322c', trim='#e8b23a', dark='#5a1c18'),
    'spear': dict(metal='#8fa6bf', main='#2a5fa8', trim='#dfe8f2', dark='#173a6a'),
    'bow': dict(metal='#9a6a3a', main='#4f8a3f', trim='#d8b86a', dark='#2f5a2a'),
    'staff': dict(metal='#e6d6a8', main='#6a3fb0', trim='#f2c232', dark='#3a2070', gem='#7fe3ff'),
    'autumn': dict(metal='#7a3e1c', main='#d8502a', trim='#f2b632', dark='#5a2410'),   # 월간 한정 전용 장갑(2026-11-16) — 단풍 사냥꾼
}
# 한정 장비는 한 부위만 — 세트 다섯 칸 일감에서 뺀다
LIMITED_SETS = {'autumn': 'gloves'}


def set_helmet(k):
    S = SETS[k]
    if k == 'sword':   # 통투구 — 눈 틈 · 숨구멍 · 금 십자 · 진홍 볏
        # 2026-11-23 캐주얼 아이콘: 길쭉한 타원이라 매끈하게 그리니 달걀로 읽혔다 → 넓고 낮은 통 · 바닥 평평 · 금 테
        dome = C.ellipsoid(Vector((0, 0, 0.04)), (0.52, 0.52, 0.56))
        for v in dome.verts:
            if v.co.z < -0.34:
                v.co.z = -0.34
        ob('dome', dome, metal_m(S['metal']))
        ob('band', C.torus(Vector((0, 0, -0.31)), 0.5, 0.075), metal_m(S['trim']))
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
    elif k == 'bow' and os.environ.get('GEAR_FACET', '10') == '0':   # 사수 두건(2026-11-23 캐주얼) — 매끈하게 그리니 구멍 난 초록 공이었다.
        # 입은 모습(hero_gear 두건)과 같은 물건으로: 뒤로 뾰족한 끝 · 얼굴 구멍 테 · 어깨 망토 · 깃털 둘
        hood = C.ellipsoid(Vector((0, 0.04, 0.06)), (0.48, 0.5, 0.52))
        for v in hood.verts:
            if v.co.z > 0.24:
                v.co.y += (v.co.z - 0.24) * 1.3
                v.co.z += (v.co.z - 0.24) * 0.5
        ob('hood', hood, m('hood', S['main'], rough=0.9))
        ob('face', C.ellipsoid(Vector((0, -0.4, -0.02)), (0.3, 0.16, 0.32)), m('dark', '#1c2616', rough=0.95), 0)
        ob('fold', C.torus(Vector((0, -0.38, -0.02)), 0.32, 0.075, rot=Euler((math.radians(84), 0, 0))), m('fold', S['dark'], rough=0.9))
        ob('mantle', C.ellipsoid(Vector((0, 0.04, -0.46)), (0.66, 0.52, 0.17)), m('hood', S['main'], rough=0.9))
        ob('clasp', C.ellipsoid(Vector((0, -0.46, -0.42)), (0.09, 0.05, 0.09)), metal_m(S['trim']))
        fp = spline([Vector((0.36, -0.06, 0.18)), Vector((0.6, 0.02, 0.52)), Vector((0.62, 0.14, 0.88))], 12)
        ob('feather', C.tube(fp, interp([0.05, 0.12, 0.015], len(fp)), seg=8), m('feather', '#f8e9c8'))
        fp2 = spline([Vector((0.34, -0.02, 0.16)), Vector((0.5, 0.12, 0.42)), Vector((0.48, 0.28, 0.7))], 10)
        ob('feather2', C.tube(fp2, interp([0.04, 0.09, 0.012], len(fp2)), seg=8), m('feather2', '#e8452c'))
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
    elif k == 'bow':   # 사수 튜닉 — 초록 웃옷 · 화살통 끈 · 끈 매듭 · 허리띠 금 버클
        # 2026-11-23 캐주얼 아이콘: 갈색 조끼 위에 초록 깃 원판이라 그루터기로 읽혔다 → 입은 모습(hero_gear 튜닉)처럼 초록 웃옷 · 어깨 · 금 버클
        ob('chest', C.ellipsoid(Vector((0, 0, 0)), (0.46, 0.3, 0.6), egg=-0.12), m('tunic', S['main'], rough=0.85))
        for sx in (-1, 1):
            ob(f'sleeve{sx}', C.ellipsoid(Vector((sx * 0.46, 0, 0.32)), (0.2, 0.24, 0.24), rot=Euler((0, sx * 0.5, 0))), m('sleeve', S['dark'], rough=0.9))
        ob('neckv', C.cone(Vector((0, -0.27, 0.42)), 0.16, 0.0, 0.22, seg=3, rot=Euler((math.radians(180), 0, 0))), m('dark', '#1c2616', rough=0.95), 0)
        strap = spline([Vector((-0.34, -0.26, 0.42)), Vector((0, -0.33, 0.04)), Vector((0.34, -0.25, -0.34))], 10)
        ob('strap', C.tube(strap, 0.06, seg=8), m('strap', S['metal']))
        ob('buckle', C.box(Vector((0, -0.34, -0.38)), (0.16, 0.05, 0.12)), metal_m(S['trim']))
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
    elif k == 'autumn':   # 단풍 사냥꾼 장갑 — 붉은 가죽 · 손등에 금빛 단풍잎 · 긴 팔찌
        col = m('glove', S['main'], rough=0.8)
        ob('palm', C.ellipsoid(Vector((0, 0, 0.1)), (0.29, 0.16, 0.28)), col)
        for j in range(4):
            x = -0.2 + 0.135 * j
            ob(f'f{j}', C.tube([Vector((x, -0.02, 0.3)), Vector((x * 1.04, -0.05, 0.52 - abs(j - 1.5) * 0.05))], 0.06, seg=6), col)
        ob('thumb', C.tube([Vector((-0.27, -0.04, 0.1)), Vector((-0.4, -0.1, 0.28))], 0.065, seg=6), col)
        ob('bracer', C.tube([Vector((0, 0.02, -0.5)), Vector((0, 0.02, -0.1))], [0.27, 0.22], seg=8), m('bracer', S['metal'], rough=0.85))
        ob('rim', C.torus(Vector((0, 0.02, -0.1)), 0.22, 0.035), metal_m(S['trim']))
        leaf = m('leaf', S['trim'], rough=0.35)
        c0 = Vector((0, -0.2, 0.14))
        for j, deg in enumerate((90, 45, 135, 10, 170)):
            d = Vector((math.cos(math.radians(deg)), 0, math.sin(math.radians(deg))))
            L = 0.26 if j == 0 else (0.2 if j < 3 else 0.14)
            ob(f'leaf{j}', C.cone(c0 + d * L * 0.5, 0.075, 0.0, L, seg=4, rot=C.look_rot(d)), leaf, O * 0.45)
        ob('stem', C.tube([c0, c0 + Vector((0.02, 0, -0.16))], 0.018, seg=5), m('stem', S['dark']), O * 0.3)
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
TURN = {'helmet': (-32, 8), 'armor': (-26, 4), 'gloves': (-30, 6), 'boots': (-62, 4), 'shoulder': (-60, 0, 25)}   # 견갑은 어깨에 얹힌 듯 25° 기울여 옆에서(위에서 내려다보면 고리, 정면이면 쌓은 투구로 읽혔다)

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
    JOBS[f'shoulder-{k}'] = (shoulder, k, (0, 12), 1.9)
for k in SETS:
    if k in LIMITED_SETS:
        JOBS[f'set-{k}-{LIMITED_SETS[k]}'] = (set_gloves, k, (-22, 20), 1.75)
        continue
    JOBS[f'set-{k}-helmet'] = (set_helmet, k, (-30, 18), 1.95 if k in ('sword', 'spear') else 2.1)
    JOBS[f'set-{k}-armor'] = (set_armor, k, (-28, 14), 1.8)
    JOBS[f'set-{k}-gloves'] = (set_gloves, k, (-22, 20), 1.75)
    JOBS[f'set-{k}-boots'] = (set_boots, k, (-30, 18), 1.75)
    JOBS[f'set-{k}-shoulder'] = (set_shoulder, k, (0, 12), 2.0)
# ── 합성 등급 그림 (2026-11-23, 사용자: 캐주얼 아이템 아이콘 팩 — 등급이 오를수록 커지고 화려하게) ──
# 세트 파츠 등급 5단(일반 · 희귀 · 영웅 · 전설 · 신화)을 그림 3단으로: 일반 · 희귀 = 기본(set-<k>-<부위>.png),
# 영웅 · 전설 = -2(앞면 금 테 보석 + 금 징 둘), 신화 = -3(큰 빛 보석 + 금 날개 + 징). 색 · 모양은 세트 그대로 — 무엇인지는 안 바뀌고 값어치만 오른다.
# 붙일 자리는 앞(-Y)에서 쏜 광선이 닿는 표면이라 부위 모양이 달라도 몸에 붙는다. 반짝임 · 테두리 빛은 조립(assemble-gear)이 2D 로 더한다
DRESS_Z = {'helmet': 0.6, 'armor': 0.64, 'gloves': 0.42, 'boots': 0.68, 'shoulder': 0.55}
DRESS_GEM = {'sword': '#ff3b5c', 'spear': '#3fd0ff', 'bow': '#6dff5a', 'staff': '#ff5ad8'}


def _mesh_bounds():
    xs, ys, zs = [], [], []
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            xs.append(w.x); ys.append(w.y); zs.append(w.z)
    return (min(xs), max(xs)), (min(ys), max(ys)), (min(zs), max(zs))


def _front_hit(x, z):
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    ok, loc, nrm, _i, _o, _m = bpy.context.scene.ray_cast(dg, Vector((x, -6.0, z)), Vector((0, 1, 0)))
    return (Vector(loc), Vector(nrm).normalized()) if ok else (None, None)


def tier_dress(stage, slot, k):
    (x0, x1), (y0, y1), (z0, z1) = _mesh_bounds()
    W, H = x1 - x0, z1 - z0
    cx, z = (x0 + x1) / 2, z0 + H * DRESS_Z.get(slot, 0.55)
    loc, nrm = _front_hit(cx, z)
    if loc is None:
        loc, nrm = Vector((cx, y0, z)), Vector((0, -1, 0))
    if nrm.y > -0.3:   # 옆이나 위를 보는 면이면 정면으로
        nrm = Vector((0, -1, 0))
    rot = nrm.to_track_quat('Z', 'Y').to_euler()
    r = (0.135 if stage >= 3 else 0.105) * max(0.85, min(1.25, W / 0.95))
    gc = DRESS_GEM.get(k, '#ff3b5c')
    gold = metal_m('#ffd34d')
    ob('dress_bezel', C.torus(loc + nrm * 0.02, r * 1.18, r * 0.3, seg=28, ring=10, rot=rot), gold)
    ob('dress_gem', C.ellipsoid(loc + nrm * 0.04, (r, r, r * 0.55), rot=rot), m('dgem', gc, rough=0.2, emit=gc, es=1.4 if stage >= 3 else 0.7), O * 0.6)
    ob('dress_glint', C.ellipsoid(loc + nrm * (0.04 + r * 0.5) + Vector((-r * 0.35, 0, r * 0.35)), (r * 0.22, r * 0.1, r * 0.22), rot=rot), m('glint', '#ffffff', emit='#ffffff', es=1.0), 0)
    for sx in (-1, 1):   # 금 징 둘
        sl, sn = _front_hit(cx + sx * r * 2.6, z - r * 0.4)
        if sl is not None:
            ob(f'dress_stud{sx}', C.ellipsoid(sl + sn * 0.015, (r * 0.38, r * 0.38, r * 0.38)), gold, O * 0.6)
    if stage >= 3:   # 금 날개 — 몸 양옆 위쪽에서 바깥으로
        s = max(0.85, min(1.3, H / 1.15))
        ym, zt = (y0 + y1) / 2, z0 + H * 0.7
        for side in (-1, 1):
            base = (x1 if side > 0 else x0) - side * 0.14   # 몸 안쪽에서 시작 — 바깥으로 길면 칸에 맞추느라 물건이 작아졌다(2차 시험)
            for j in range(3):   # 깃 셋을 부채꼴로 — 가늘면 막대로 읽혔다(1차 시험)
                c = Vector((base + side * (0.11 + 0.07 * j) * s, ym + 0.08, zt + 0.1 * j * s))
                ob(f'dwing{side}{j}', C.ellipsoid(c, ((0.2 - 0.035 * j) * s, 0.06, (0.11 - 0.012 * j) * s), rot=Euler((0, side * (-0.25 - 0.34 * j), 0))), m('dwing', '#ffd34d' if j == 0 else '#fff3c4'), O * 0.7)


def dressed(arg):
    fn, k, slot, stage = arg
    fn(k)
    tier_dress(stage, slot, k)


for k in SETS:
    if k in LIMITED_SETS:
        continue
    for slot, fn in (('helmet', set_helmet), ('armor', set_armor), ('gloves', set_gloves), ('boots', set_boots), ('shoulder', set_shoulder)):
        base = JOBS[f'set-{k}-{slot}']
        for stage in (2, 3):
            JOBS[f'set-{k}-{slot}-{stage}'] = (dressed, (fn, k, slot, stage), base[2], base[3] * (1.04 if stage == 2 else 1.14))
for kd in ('sword', 'spear', 'bow', 'staff'):
    for t in (1, 2, 3):
        JOBS[f'icon-{kd}-{t}'] = (icon_weapon, (kd, t), (0, 8), 2.6)
for lv in range(16):
    JOBS[f'drum-{lv:02d}'] = (drum, lv, (-24, 22), 2.3)
    JOBS[f'sword-{lv:02d}'] = (sword_lv, lv, (25, 15), 2.0)

# 다른 스크립트(icons.py — 스킬 아이콘이 같은 무기 모델을 쓴다, 2026-11-25)가 불러 쓸 때는 렌더하지 않는다
if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['gear', 'drums']
    names = []
    for a in argv:
        if a == 'gear':
            names += [k for k in JOBS if not k.startswith('drum-') and not k.startswith('sword-') and not k.startswith('set-') and not k.startswith('icon-')]
        elif a == 'drums':
            names += [k for k in JOBS if k.startswith('drum-')]
        elif a == 'icons':
            names += [k for k in JOBS if k.startswith('icon-')]
        elif a == 'shoulders':
            names += [k for k in JOBS if k.startswith('shoulder-') or k.endswith('-shoulder')]
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
        C.setup_render(res=(ICON_RES, ICON_RES), samples=40)
        if PIXEL:
            bpy.context.scene.cycles.filter_width = 0.01
        C.lights()
        C.ortho_camera((0.0, 0.0), scale, yaw_deg=yaw, elev_deg=elev)
        C.FACET = GEAR_FACET
        # 손에 드는 무기 굵기(2026-11-25, 사용자: 손 무기를 아이콘과 같은 물건으로 "제일 신경써서") — GEAR_HAND_F(기본 1.0). 길이 · 손잡이 높이는 그대로라 WEAPON_GRIP(%) 이 맞는다
        hand = name.split('-')[0] in ('weapon', 'spear', 'bow', 'staff') and name.split('-')[-1].isdigit() and not name.startswith('icon-')
        if hand:
            F = float(os.environ.get('GEAR_HAND_F', '1.0'))
        try:
            fn(arg)
        finally:
            C.FACET = 0
            if hand:
                F = 1.0
        sname = name[:-2] if name.startswith('set-') and name[-2:] in ('-2', '-3') else name   # 합성 등급 그림(-2 · -3)도 같은 부위 각도
        turn = TURN.get(sname.split('-')[-1] if sname.startswith('set-') else sname.split('-')[0], 0)
        if name.startswith('icon-'):
            piv = bpy.data.objects.new('pivot', None)
            bpy.context.scene.collection.objects.link(piv)
            for o in [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.parent is None]:
                o.parent = piv
            piv.rotation_euler = Euler((0, math.radians(45), 0))   # 끝이 오른쪽 위
            piv.scale = (1.0, 1.0, float(os.environ.get('ICON_SQUASH', '1.0')))   # 캐주얼 아이콘 0.8 — 길이만 줄여 몽툭하게(칸을 더 채운다)
            bpy.context.view_layer.update()
        elif turn:
            piv = bpy.data.objects.new('pivot', None)
            bpy.context.scene.collection.objects.link(piv)
            for o in [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.parent is None]:
                o.parent = piv
            rx, ry, rz = turn[1], (turn[2] if len(turn) > 2 else 0), turn[0]   # (옆으로 도는 각, 앞으로 숙이는 각[, 기울기])
            piv.rotation_euler = Euler((math.radians(rx), math.radians(ry), math.radians(rz)))
            bpy.context.view_layer.update()
        if TOON.enabled():   # 셀 그림결(ART_STYLE=toon, 2026-11-17) — 사냥터에서 주인공 손에 드는 무기 그림도 같은 결로
            TOON.apply(bpy.context.scene)
        bpy.context.scene.render.filepath = os.path.join(OUTDIR, f'{name}.png')
        bpy.ops.render.render(write_still=True)
        print('wrote', name, flush=True)
    print('DONE')
