"""절차적 3D 비버 (2026-10-16) — 주인공·동료 공통 몸 + 의상·무기 설정(cfg). mascot-3d-film moko.py 방식:
타원체 몸·머리, 표면에 얹은 눈·볼, 인버티드 헐 잉크 외곽선, 뼈대 리그(root → body → head / arm.R·hand.R / arm.L·hand.L, legs, tail).
캐릭터 단위: 발 z=0, 머리 꼭대기 z≈1, 정면 -Y. 오른손(무기 손)은 -X 쪽 — 오른쪽을 보게 돌리면 카메라 쪽 앞손이 된다.
부품은 모두 뼈에 강체로 붙는다(치비라 피부 변형이 필요 없다) → 팔·무기가 진짜로 휘두른다.
"""
import bpy
import math
import os
from mathutils import Vector, Matrix, Euler, Quaternion

from lib import bcommon as C

HEAD_C = Vector((0.0, 0.0, 0.62))
HEAD_R = (0.37, 0.33, 0.33)      # 원화처럼 머리가 몸보다 훨씬 크다(머리 폭 ≈ 몸 폭 1.9배)
BODY_C = Vector((0.0, 0.0, 0.205))
BODY_R = (0.19, 0.175, 0.205)
SHOULDER_R = Vector((-0.155, -0.02, 0.33))
SHOULDER_L = Vector((0.155, -0.02, 0.33))
HAND_R = Vector((-0.23, -0.1, 0.18))
HAND_L = Vector((0.23, -0.1, 0.18))
OUT = 0.014   # 외곽선 두께(캐릭터 단위)

# 그림체 (2026-10-23, 사용자: "비버가 귀엽지가 않아") — BEAVER_STYLE=old 로 예전 얼굴 · 재질을 그대로 다시 뽑을 수 있다.
# cute: 눈을 크게 · 낮게 · 넓게(아기 얼굴 비율), 하이라이트 둘, 주둥이 · 코를 작게, 볼 · 귀를 크게, 털은 무광(플라스틱 같은 번들거림을 뺀다)
STYLE = os.environ.get('BEAVER_STYLE', 'lowpoly')
CUTE = STYLE == 'cute'
# lowpoly (2026-10-23, 사용자 참고: BEAVER RAMPAGE 의 로우 폴리 비버) — 머리와 몸이 한 덩어리인 달걀형, 큰 흰자 눈(가운데 모임), 자두색 세모 코,
# 볼 두 덩이 아래로 크게 드러난 하얀 앞니, 짧은 팔다리, 납작한 노 꼬리, 각진 면(평면 셰이딩). 그대로 베끼지 않고 '느낌'만 — 비율 · 얼굴 구성 · 질감
LOWPOLY = STYLE == 'lowpoly'
OLD_BODY_C, OLD_BODY_R = Vector((0.0, 0.0, 0.205)), (0.19, 0.175, 0.205)
if LOWPOLY:
    HEAD_C = Vector((0.0, 0.0, 0.64))
    HEAD_R = (0.3, 0.275, 0.3)
    BODY_C = Vector((0.0, 0.0, 0.3))
    BODY_R = (0.31, 0.28, 0.3)
    SHOULDER_R = Vector((-0.27, -0.03, 0.42))
    SHOULDER_L = Vector((0.27, -0.03, 0.42))
    HAND_R = Vector((-0.35, -0.12, 0.24))
    HAND_L = Vector((0.35, -0.12, 0.24))

BONES = {
    # name: (head, tail, parent)
    'root': ((0, 0, 0), (0, 0, 0.08), None),
    'body': ((0, 0, 0.04), (0, 0, 0.4), 'root'),
    'head': ((0, 0, 0.4), (0, 0, 1.0), 'body'),
    'arm.R': (tuple(SHOULDER_R), tuple(HAND_R), 'body'),
    'hand.R': (tuple(HAND_R), tuple(HAND_R + Vector((0, 0, -0.07))), 'arm.R'),
    'arm.L': (tuple(SHOULDER_L), tuple(HAND_L), 'body'),
    'hand.L': (tuple(HAND_L), tuple(HAND_L + Vector((0, 0, -0.07))), 'arm.L'),
    'leg.R': ((-0.095, -0.01, 0.12), (-0.105, -0.05, 0.0), 'root'),
    'leg.L': ((0.095, -0.01, 0.12), (0.105, -0.05, 0.0), 'root'),
    'tail': ((0, 0.15, 0.1), (0, 0.34, 0.3), 'body'),
}
if LOWPOLY:   # 넓어진 몸 — 다리는 바깥으로, 꼬리 뼈는 엉덩이 뒤
    BONES['leg.R'] = ((-0.14, -0.01, 0.12), (-0.15, -0.05, 0.0), 'root')
    BONES['leg.L'] = ((0.14, -0.01, 0.12), (0.15, -0.05, 0.0), 'root')
    BONES['tail'] = ((0, 0.25, 0.08), (0, 0.5, 0.12), 'body')


class Rig:
    def __init__(self, arm, objs, cfg):
        self.arm, self.objs, self.cfg = arm, objs, cfg


def _armature(name, coll, bones=None):
    bones = bones or BONES
    a = bpy.data.armatures.new(name + '_arm')
    o = bpy.data.objects.new(name + '_rig', a)
    coll.objects.link(o)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode='EDIT')
    eb = {}
    for bn, (h, t, p) in bones.items():
        b = a.edit_bones.new(bn)
        b.head, b.tail = Vector(h), Vector(t)
        b.roll = 0
        eb[bn] = b
    for bn, (h, t, p) in bones.items():
        if p:
            eb[bn].parent = eb[p]
    bpy.ops.object.mode_set(mode='OBJECT')
    return o


def _attach(obj, arm, bone):
    """메시(월드 좌표로 지은 것)를 뼈에 강체로 붙인다 — 쉬는 자세에서 제자리 유지"""
    mw = obj.matrix_world.copy()
    obj.parent = arm
    obj.parent_type = 'BONE'
    obj.parent_bone = bone
    bpy.context.view_layer.update()
    obj.matrix_world = mw


def spline(pts, n=24):
    """Catmull-Rom 으로 점을 촘촘히 — 관이 각지지 않게"""
    P = [Vector(p) for p in pts]
    P = [P[0] * 2 - P[1]] + P + [P[-1] * 2 - P[-2]]
    out = []
    segs = len(P) - 3
    for i in range(segs):
        for k in range(n // segs + 1):
            t = k / (n // segs + 1)
            p0, p1, p2, p3 = P[i], P[i + 1], P[i + 2], P[i + 3]
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t))
    out.append(P[-2])
    return out


def interp(vals, n):
    """반지름 배열을 n 개로 선형 보간"""
    out = []
    for i in range(n):
        u = i / (n - 1) * (len(vals) - 1)
        a = int(min(len(vals) - 2, math.floor(u)))
        t = u - a
        out.append(vals[a] * (1 - t) + vals[a + 1] * t)
    return out


# ── 재질 ──
def _mats(cfg):
    fur = cfg.get('fur', '#9a6640')
    light = cfg.get('light', '#f3dcc0')
    dark = cfg.get('dark', '#6e4426')
    return {
        'fur': C.principled(f"fur_{fur}_{STYLE}", fur, rough=0.92, coat=0.0, sheen=0.0) if LOWPOLY else C.principled(f"fur_{fur}_{STYLE}", fur, rough=0.82 if CUTE else 0.55, sss=0.14 if CUTE else 0.12, coat=0.0 if CUTE else 0.12, sheen=0.25 if CUTE else 0.4),
        'light': C.principled(f"light_{light}_{STYLE}", light, rough=0.9, coat=0.0) if LOWPOLY else C.principled(f"light_{light}_{STYLE}", light, rough=0.8 if CUTE else 0.5, sss=0.18 if CUTE else 0.15, coat=0.0 if CUTE else 0.12, sheen=0.2 if CUTE else 0.3),
        'dark': C.principled(f"dark_{dark}_{STYLE}", dark, rough=0.8 if CUTE else 0.6, coat=0.0 if CUTE else 0.25, sheen=0.3),
        'inner': C.principled('inner_ear', '#f2a3b4', rough=0.5),
        'eye': C.principled(f'eye_{STYLE}', '#140b07' if CUTE else '#1a0f0a', rough=0.3 if CUTE else 0.12, coat=0.25 if CUTE else 1.0),
        'iris': C.principled('iris', '#5a321c', rough=0.35, coat=0.2),
        'sclera': C.principled('sclera', '#fbf8f2', rough=0.45, coat=0.15),
        'pupil': C.principled('pupil', '#050302', rough=0.55, coat=0.0),
        'plum': C.principled('plum_nose', '#4a2230', rough=0.6, coat=0.1),
        'mouth': C.principled('mouth', '#3a1a12', rough=0.8),
        'paddle': C.principled('paddle', '#5b3b27', rough=0.85),
        'white': C.principled('eye_hi', '#ffffff', rough=0.3, emit='#ffffff', emit_strength=1.2),
        'nose': C.principled('nose', '#24140d', rough=0.25, coat=0.8),
        'blush': C.principled(f'blush_{STYLE}', '#ff8fa0' if CUTE else '#f59a9a', rough=0.7, coat=0.0),
        'tooth': C.principled('tooth', '#fffaf0', rough=0.35),
    }


def _accent(name, color, rough=0.4, metal=0.0, emit=None, es=0.0):
    return C.principled(f"{name}_{color}_{metal}", color, rough=rough, metal=metal, coat=0.3, emit=emit, emit_strength=es)


def _shell(o, t=0.018):
    s = o.modifiers.new('solid', 'SOLIDIFY')
    s.thickness = t
    o.modifiers.move(len(o.modifiers) - 1, 0)
    return o


# ── 의상 (월드 좌표로 짓고 뼈에 붙인다) ──
def hat(kind, cfg, coll):
    out = []
    col = cfg.get('hat_color', '#3f9a4a')
    col2 = cfg.get('hat_color2', '#2b6e35')
    top = HEAD_C + Vector((0, 0, HEAD_R[2]))
    if kind == 'crown':
        gold = _accent('gold', '#f2c232', rough=0.25, metal=0.85)
        band = _accent('band', cfg.get('band', '#3fb6c9'), rough=0.35)
        out.append(C.mesh_obj('crown_band', C.tube([top + Vector((0, 0, -0.07)), top + Vector((0, 0, -0.01))], 0.225, seg=48, caps=False), band, coll, outline=OUT * 0.8))
        o = C.mesh_obj('crown', C.tube([top + Vector((0, 0, -0.015)), top + Vector((0, 0, 0.1))], [0.23, 0.25], seg=48, caps=False), gold, coll, outline=OUT * 0.8)
        out.append(_shell(o, 0.02))
        for k in range(7):
            a = 2 * math.pi * k / 7
            out.append(C.mesh_obj(f'crown_tip{k}', C.cone(top + Vector((0.24 * math.sin(a), -0.24 * math.cos(a), 0.12)), 0.05, 0.012, 0.07, seg=12), gold, coll, outline=OUT * 0.5))
            out.append(C.mesh_obj(f'crown_ball{k}', C.ellipsoid(top + Vector((0.245 * math.sin(a), -0.245 * math.cos(a), 0.165)), (0.03, 0.03, 0.03), seg=16, rings=10), gold, coll, outline=OUT * 0.5))
        gem = _accent('gem', '#e8467c', rough=0.1, emit='#ff7aa8', es=0.6)
        out.append(C.mesh_obj('crown_gem', C.ellipsoid(top + Vector((0, -0.25, 0.04)), (0.032, 0.016, 0.036), seg=16, rings=10), gem, coll))
    elif kind == 'cap':
        m1 = _accent('cap', col, rough=0.5)
        m2 = _accent('cap2', col2, rough=0.5)
        bm = C.ellipsoid(HEAD_C + Vector((0, 0.02, 0.05)), (HEAD_R[0] * 1.02, HEAD_R[1] * 1.03, HEAD_R[2] * 0.97))
        for v in [v for v in bm.verts if v.co.z < HEAD_C.z + 0.2]:   # 머리 위 1/3 만 덮는 작은 모자(0.12 는 투구처럼 반을 덮었다)
            bm.verts.remove(v)
        out.append(_shell(C.mesh_obj('cap', bm, m1, coll, outline=OUT), 0.015))
        out.append(C.mesh_obj('cap_band', C.torus(HEAD_C + Vector((0, 0.02, 0.21)), 0.29, 0.02, rot=Euler((math.radians(-4), 0, 0))), m2, coll, outline=OUT * 0.6))
        out.append(C.mesh_obj('cap_visor', C.ellipsoid(HEAD_C + Vector((0, -0.25, 0.21)), (0.21, 0.12, 0.016), rot=Euler((math.radians(-16), 0, 0))), m2, coll, outline=OUT * 0.8))
    elif kind == 'wizard':
        m1 = _accent('wiz', col, rough=0.5)
        star = _accent('star', '#f2c232', rough=0.3, metal=0.6)
        out.append(C.mesh_obj('wiz_brim', C.ellipsoid(top + Vector((0, 0, -0.06)), (0.4, 0.37, 0.035)), m1, coll, outline=OUT))
        pts = spline([top + Vector((0, 0, -0.04)), top + Vector((0, 0.02, 0.12)), top + Vector((0, 0.06, 0.2)), top + Vector((0, 0.14, 0.27))], 16)   # 칸 높이에 들게 짧게(0.36 → 0.27)
        out.append(C.mesh_obj('wiz_cone', C.tube(pts, interp([0.24, 0.16, 0.08, 0.015], len(pts)), seg=28), m1, coll, outline=OUT))
        out.append(C.mesh_obj('wiz_star', C.ellipsoid(top + Vector((0.04, -0.2, 0.1)), (0.045, 0.012, 0.045)), star, coll))
    elif kind == 'hood':
        m1 = _accent('hood', col, rough=0.6)
        bm = C.ellipsoid(HEAD_C + Vector((0, 0.04, 0.02)), (HEAD_R[0] * 1.08, HEAD_R[1] * 1.1, HEAD_R[2] * 1.06))
        for v in [v for v in bm.verts if v.co.y < HEAD_C.y - 0.13 and v.co.z < HEAD_C.z + 0.22]:
            bm.verts.remove(v)
        out.append(_shell(C.mesh_obj('hood', bm, m1, coll, outline=OUT), 0.02))
    elif kind == 'helmet':
        steel = _accent('steel', col, rough=0.25, metal=0.8)
        trim = _accent('trim', col2, rough=0.3, metal=0.6)
        bm = C.ellipsoid(HEAD_C + Vector((0, 0.01, 0.06)), (HEAD_R[0] * 1.06, HEAD_R[1] * 1.06, HEAD_R[2] * 0.98))
        for v in [v for v in bm.verts if v.co.z < HEAD_C.z + (0.25 if LOWPOLY else 0.15) and v.co.y < HEAD_C.y - 0.05]:   # 얼굴(눈 z≈0.66 · 로우 폴리는 눈이 더 위)은 열어 둔다
            bm.verts.remove(v)
        out.append(_shell(C.mesh_obj('helmet', bm, steel, coll, outline=OUT), 0.02))
        out.append(C.mesh_obj('helmet_crest', C.ellipsoid(top + Vector((0, 0.0, 0.04)), (0.03, 0.2, 0.08)), trim, coll, outline=OUT * 0.8))
    elif kind == 'tiara':
        gold = _accent('gold', '#f2c232', rough=0.25, metal=0.85)
        out.append(C.mesh_obj('tiara', C.torus(HEAD_C + Vector((0, 0.02, 0.2)), 0.3, 0.02, rot=Euler((math.radians(-18), 0, 0))), gold, coll, outline=OUT * 0.6))
        out.append(C.mesh_obj('tiara_gem', C.ellipsoid(HEAD_C + Vector((0, -0.27, 0.3)), (0.04, 0.02, 0.05)), _accent('gem', col, rough=0.1, emit=col, es=0.5), coll, outline=OUT * 0.5))
    return out


def scarf(color, coll):
    m = _accent('scarf', color, rough=0.55)
    if LOWPOLY:
        out = [C.mesh_obj('scarf', C.torus(Vector((0, -0.01, 0.47)), 0.262, 0.042, rot=Euler((math.radians(8), 0, 0))), m, coll, outline=OUT)]
        pts = spline([Vector((-0.09, -0.27, 0.45)), Vector((-0.11, -0.3, 0.37)), Vector((-0.1, -0.31, 0.3))], 10)
        out.append(C.mesh_obj('scarf_tail', C.tube(pts, interp([0.05, 0.045, 0.026], len(pts)), seg=14), m, coll, outline=OUT))
        return out
    out = [C.mesh_obj('scarf', C.torus(Vector((0, -0.01, 0.385)), 0.165, 0.048, rot=Euler((math.radians(8), 0, 0))), m, coll, outline=OUT)]
    pts = spline([Vector((-0.06, -0.17, 0.37)), Vector((-0.075, -0.2, 0.3)), Vector((-0.06, -0.21, 0.23))], 10)
    out.append(C.mesh_obj('scarf_tail', C.tube(pts, interp([0.055, 0.05, 0.028], len(pts)), seg=14), m, coll, outline=OUT))
    return out


def cape(color, coll, clasp='#f2c232'):
    m = _accent('cape', color, rough=0.55)
    bm = C.ellipsoid(Vector((0, 0.06, 0.21)), (0.235, 0.19, 0.23), egg=-0.15)
    for v in [v for v in bm.verts if v.co.y < -0.02]:
        bm.verts.remove(v)
    out = [_shell(C.mesh_obj('cape', bm, m, coll, outline=OUT), 0.02)]
    out.append(C.mesh_obj('cape_collar', C.torus(Vector((0, -0.0, 0.385)), 0.165, 0.045, rot=Euler((math.radians(8), 0, 0))), m, coll, outline=OUT))
    out.append(C.mesh_obj('cape_clasp', C.ellipsoid(Vector((0, -0.18, 0.37)), (0.045, 0.02, 0.045)), _accent('gold', clasp, rough=0.25, metal=0.85), coll, outline=OUT * 0.6))
    return out


def robe(color, coll, trim='#f2c232'):
    m = _accent('robe', color, rough=0.55)
    if LOWPOLY:
        bm = C.ellipsoid(BODY_C + Vector((0, 0.0, -0.04)), (BODY_R[0] * 1.03, BODY_R[1] * 1.03, BODY_R[2] * 0.86), egg=0.18, seg=11, rings=8)
        for v in [v for v in bm.verts if v.co.z > BODY_C.z + 0.16]:
            v.co.z = BODY_C.z + 0.16
        out = [C.mesh_obj('robe', bm, m, coll, smooth=False, outline=OUT)]
        out.append(C.mesh_obj('robe_trim', C.torus(Vector((0, 0, 0.05)), 0.275, 0.022), _accent('trim', trim, rough=0.3, metal=0.5), coll, outline=OUT * 0.5))
        return out
    bm = C.ellipsoid(BODY_C + Vector((0, 0, -0.01)), (BODY_R[0] * 1.12, BODY_R[1] * 1.12, BODY_R[2] * 1.05), egg=0.25)
    out = [C.mesh_obj('robe', bm, m, coll, outline=OUT)]
    out.append(C.mesh_obj('robe_trim', C.torus(Vector((0, 0, 0.04)), 0.2, 0.02), _accent('trim', trim, rough=0.3, metal=0.5), coll, outline=OUT * 0.5))
    return out


def armor(color, coll, trim='#f2c232'):
    steel = _accent('armor', color, rough=0.25, metal=0.8)
    bm = C.ellipsoid(BODY_C + Vector((0, -0.02, 0.03)), (BODY_R[0] * 1.08, BODY_R[1] * 1.1, BODY_R[2] * 0.85))
    out = [C.mesh_obj('armor', bm, steel, coll, outline=OUT)]
    out.append(C.mesh_obj('armor_emblem', C.ellipsoid(BODY_C + Vector((0, -0.2, 0.05)), (0.05, 0.015, 0.06)), _accent('trim', trim, rough=0.3, metal=0.7), coll, outline=OUT * 0.5))
    for sx in (-1, 1):
        out.append(C.mesh_obj(f'pauldron{sx}', C.ellipsoid(Vector((sx * 0.16, -0.01, 0.34)), (0.08, 0.075, 0.05)), steel, coll, outline=OUT))
    return out


# 무기 — 그립을 손 위치에 두고 +Z 로 뻗게 짓는다(hand 뼈에 붙는다)
def weapon(kind, at, coll, color='#cfd6df', accent='#8a5a2b'):
    out = []
    steel = _accent('blade', color, rough=0.2, metal=0.85)
    wood = _accent('wood', accent, rough=0.6)
    gold = _accent('gold', '#f2c232', rough=0.3, metal=0.8)
    g = Vector(at)
    if kind in ('sword', 'dagger', 'axe'):
        L = 0.4 if kind == 'sword' else 0.22
        out.append(C.mesh_obj('grip', C.tube([g + Vector((0, 0, -0.06)), g + Vector((0, 0, 0.05))], 0.02, seg=12), wood, coll, outline=OUT * 0.6))
        if kind == 'axe':
            out.append(C.mesh_obj('haft', C.tube([g + Vector((0, 0, 0.05)), g + Vector((0, 0, 0.3))], 0.018, seg=12), wood, coll, outline=OUT * 0.6))
            out.append(C.mesh_obj('axehead', C.ellipsoid(g + Vector((-0.07, 0, 0.26)), (0.09, 0.016, 0.08)), steel, coll, outline=OUT * 0.6))
        else:
            out.append(C.mesh_obj('guard', C.box(g + Vector((0, 0, 0.06)), (0.12, 0.035, 0.028), bevel=0.008), gold, coll, outline=OUT * 0.6))
            bm = C.box(g + Vector((0, 0, 0.08 + L / 2)), (0.065, 0.016, L), bevel=0.005)
            for v in bm.verts:   # 끝을 뾰족하게
                t = (v.co.z - (g.z + 0.08)) / L
                if t > 0.8:
                    v.co.x = g.x + (v.co.x - g.x) * max(0.05, (1 - t) / 0.2)
            out.append(C.mesh_obj('blade', bm, steel, coll, outline=OUT * 0.6))
    elif kind == 'hammer':   # 대장장이 · 거인 망치(2026-11-03) — 무광 쇠 · 밝은 자루 · 넓적한 머리. 번들거리는 쇠는 작은 칸에서 하얀 네모로 보였다
        iron = _accent('hammerhead', color, rough=0.55, metal=0.25)
        handle = _accent('hammerwood', '#c8924a', rough=0.65)
        out.append(C.mesh_obj('grip', C.tube([g + Vector((0, 0, -0.08)), g + Vector((0, 0, 0.32))], 0.027, seg=10), handle, coll, outline=OUT * 0.7))
        out.append(C.mesh_obj('hm_head', C.box(g + Vector((0, 0, 0.35)), (0.12, 0.095, 0.1), bevel=0.012), iron, coll, smooth=False, outline=OUT * 0.7))
        for sx in (-1, 1):   # 양쪽으로 넓어지는 때리는 면
            out.append(C.mesh_obj(f'hm_face{sx}', C.box(g + Vector((sx * 0.085, 0, 0.35)), (0.05, 0.12, 0.125), bevel=0.01), iron, coll, smooth=False, outline=OUT * 0.7))
        out.append(C.mesh_obj('hm_band', C.box(g + Vector((0, 0, 0.35)), (0.035, 0.104, 0.108)), gold, coll, smooth=False, outline=OUT * 0.3))
    elif kind in ('spear', 'trident', 'shovel', 'lance'):
        out.append(C.mesh_obj('shaft', C.tube([g + Vector((0, 0, -0.2)), g + Vector((0, 0, 0.42))], 0.018, seg=12), wood, coll, outline=OUT * 0.6))
        tip = g + Vector((0, 0, 0.42))
        if kind in ('spear', 'lance'):
            out.append(C.mesh_obj('tip', C.cone(tip + Vector((0, 0, 0.08)), 0.05, 0.0, 0.17, seg=4), steel, coll, outline=OUT * 0.6))
            if kind == 'lance':
                fl = _accent('flame', '#ff8a3d', rough=0.3, emit='#ffb347', es=2.0)
                out.append(C.mesh_obj('flame', C.cone(tip + Vector((0, 0, 0.1)), 0.06, 0.0, 0.22, seg=12), fl, coll))
        elif kind == 'trident':
            for dx in (-0.045, 0, 0.045):
                out.append(C.mesh_obj(f'prong{dx}', C.tube([tip + Vector((dx, 0, 0)), tip + Vector((dx * 1.1, 0, 0.13))], 0.012, seg=8), steel, coll, outline=OUT * 0.5))
            out.append(C.mesh_obj('tbar', C.box(tip, (0.11, 0.02, 0.02)), steel, coll, outline=OUT * 0.5))
        else:
            out.append(C.mesh_obj('spade', C.ellipsoid(tip + Vector((0, 0, 0.08)), (0.075, 0.014, 0.1), egg=0.3), steel, coll, outline=OUT * 0.6))
    elif kind in ('staff', 'wand'):
        L = 0.44 if kind == 'staff' else 0.24
        out.append(C.mesh_obj('shaft', C.tube([g + Vector((0, 0, -0.16 if kind == 'staff' else -0.04)), g + Vector((0, 0, L))], 0.02, seg=12), wood, coll, outline=OUT * 0.6))
        orb = _accent('orb', color, rough=0.05, emit=color, es=2.5)
        out.append(C.mesh_obj('orb', C.ellipsoid(g + Vector((0, 0, L + 0.06)), (0.06, 0.06, 0.06), seg=24, rings=16), orb, coll, outline=OUT * 0.6))
        out.append(C.mesh_obj('orb_cup', C.torus(g + Vector((0, 0, L + 0.02)), 0.05, 0.014), gold, coll, outline=OUT * 0.4))
    elif kind == 'bow':
        # 활 면은 X-Z(옆) — 3/4 화면에서 D 모양이 보이게(Y-Z 면은 거의 옆선으로만 보였다)
        pts = [g + Vector((0.16 * math.cos(t) - 0.16, 0, 0.3 * math.sin(t))) for t in [(-1.25 + 2.5 * k / 16) for k in range(17)]]   # 깊게 휜 D — 가운데(손잡이)가 앞으로
        # 2026-10-19 애니메이션 2판: 갈색 가는 활(굵기 0.016)이 털색에 묻혀 2px 선으로만 보였다 — 굵게(0.028) · 밝은 황금 나무색 · 끝 장식 · 시위 굵게
        out.append(C.mesh_obj('bow', C.tube(pts, 0.028, seg=10), _accent('bowwood', '#e2a24a', rough=0.45), coll, outline=OUT * 0.7))
        for tip in (pts[0], pts[-1]):
            out.append(C.mesh_obj('bowtip', C.ellipsoid(tip, (0.03, 0.03, 0.03)), _accent('bowtip', '#f7e6a8', rough=0.3), coll, outline=OUT * 0.5))
        out.append(C.mesh_obj('string', C.tube([pts[0], pts[-1]], 0.007, seg=6), _accent('string', '#fffaf0'), coll))
    elif kind == 'guitar':
        out.append(C.mesh_obj('g_body', C.ellipsoid(g + Vector((0.08, -0.06, -0.02)), (0.13, 0.05, 0.11)), _accent('gbody', color, rough=0.35), coll, outline=OUT * 0.6))
        out.append(C.mesh_obj('g_hole', C.ellipsoid(g + Vector((0.07, -0.11, 0.0)), (0.035, 0.008, 0.035)), _accent('hole', '#3b2415'), coll))
        out.append(C.mesh_obj('g_neck', C.box(g + Vector((-0.08, -0.06, 0.14)), (0.04, 0.02, 0.3), rot=Euler((0, math.radians(-38), 0))), wood, coll, outline=OUT * 0.6))
    elif kind == 'shield':
        out.append(C.mesh_obj('shield', C.ellipsoid(g + Vector((0, -0.06, 0.02)), (0.15, 0.035, 0.19), egg=-0.2), _accent('shield', color, rough=0.3, metal=0.6), coll, outline=OUT * 0.7))
        out.append(C.mesh_obj('shield_boss', C.ellipsoid(g + Vector((0, -0.1, 0.03)), (0.05, 0.02, 0.05)), gold, coll, outline=OUT * 0.5))
    elif kind == 'glass':   # 돋보기(오리온)
        out.append(C.mesh_obj('g_handle', C.tube([g + Vector((0, 0, -0.04)), g + Vector((0, 0, 0.14))], 0.018, seg=12), wood, coll, outline=OUT * 0.6))
        out.append(C.mesh_obj('g_ring', C.torus(g + Vector((0, 0, 0.23)), 0.08, 0.016, rot=Euler((math.radians(90), 0, 0))), gold, coll, outline=OUT * 0.5))
        out.append(C.mesh_obj('g_lens', C.ellipsoid(g + Vector((0, 0, 0.23)), (0.07, 0.01, 0.07)), _accent('lens', color, rough=0.05, emit=color, es=1.0), coll))
    elif kind == 'carrot':   # 당근 지팡이(상점 동료 보니, 2026-11-26) — 아래 뾰족한 끝을 쥐고 위로 굵어지는 주황 몸 · 홈 · 초록 잎 셋
        orange = _accent('carrot', '#ff8a2a', rough=0.5)
        out.append(C.mesh_obj('carrot', C.cone(g + Vector((0, 0, 0.13)), 0.0, 0.075, 0.36, seg=16, rot=Euler((math.pi, 0, 0))), orange, coll, outline=OUT * 0.7))
        for k, z in enumerate((0.06, 0.14, 0.22)):
            out.append(C.mesh_obj(f'carrot_ring{k}', C.torus(g + Vector((0, 0, z)), 0.02 + 0.045 * (z + 0.05) / 0.36, 0.006, seg=24), _accent('carrotln', '#d8661a', rough=0.6), coll))
        for k in range(3):
            a = (k - 1) * 0.45
            out.append(C.mesh_obj(f'carrot_leaf{k}', C.ellipsoid(g + Vector((math.sin(a) * 0.05, 0, 0.36 + math.cos(a) * 0.06)), (0.025, 0.012, 0.075), rot=Euler((0, a, 0))), _accent('leaf', '#5ac83a', rough=0.5), coll, outline=OUT * 0.5))
    elif kind == 'slingshot':   # 새총(상점 동료 레드, 2026-11-26) — Y 자 나무 · 고무줄 · 도토리 한 알
        out.append(C.mesh_obj('ss_grip', C.tube([g + Vector((0, 0, -0.06)), g + Vector((0, 0, 0.1))], 0.022, seg=10), wood, coll, outline=OUT * 0.6))
        tips = [g + Vector((sx * 0.08, 0, 0.24)) for sx in (-1, 1)]
        for k, t in enumerate(tips):
            out.append(C.mesh_obj(f'ss_prong{k}', C.tube([g + Vector((0, 0, 0.1)), t], 0.02, seg=10), wood, coll, outline=OUT * 0.6))
        pouch = g + Vector((0, 0.05, 0.2))
        for k, t in enumerate(tips):
            out.append(C.mesh_obj(f'ss_band{k}', C.tube([t, pouch], 0.008, seg=6), _accent('band', '#d8403a', rough=0.5), coll))
        out.append(C.mesh_obj('ss_acorn', C.ellipsoid(pouch + Vector((0, 0.01, -0.01)), (0.035, 0.035, 0.042), egg=-0.3), _accent('nut', '#c8783a', rough=0.45), coll, outline=OUT * 0.5))
        out.append(C.mesh_obj('ss_cap', C.ellipsoid(pouch + Vector((0, 0.01, 0.02)), (0.04, 0.04, 0.02)), _accent('cap', '#7a4a26', rough=0.7), coll, outline=OUT * 0.4))
    # 굵기만 (2026-11-19 리소스 피드백 ⑤: 사냥터 88px 에서 무기가 가는 막대라 손에 든 게 거의 안 보였다) — 칼날 · 자루 · 손잡이를 무기 축(+Z)에 수직으로만 키운다
    th = WEAPON_THICK.get(kind, 1.0)
    if th != 1.0:
        for o in out:
            if not o.name.split('.')[0] in THICK_PARTS:
                continue
            for v in o.data.vertices:
                v.co.x = g.x + (v.co.x - g.x) * th
                v.co.y = g.y + (v.co.y - g.y) * th
    # 게임 크기(키 60~80px)에서 무기가 읽히게 그립 기준 1.35배 (2026-10-16 관문 — 미아 도끼·단검이 점처럼 보였다)
    s = WEAPON_SCALE.get(kind, 1.35)
    for o in out:
        me = o.data
        for v in me.vertices:
            v.co = g + (v.co - g) * s
    return out


# 2026-10-19 애니메이션 2판: 칼은 목록에 없어 기본 1.35 였다 — 왼손으로 적 쪽에 내려치면 칸 오른쪽을 넘거나(비버 전원 배율 0.394) 땅에 꽂혔다(+10~20px).
# 칼 1.1 · 창 0.9 에 임팩트 112~120° 면 둘 다 안 넘는다(pose_lab 실측)
WEAPON_THICK = {'sword': 1.5, 'dagger': 1.5, 'axe': 1.4, 'spear': 1.6, 'lance': 1.4, 'trident': 1.4, 'shovel': 1.3, 'staff': 1.6, 'wand': 1.6}
THICK_PARTS = ('grip', 'haft', 'blade', 'shaft', 'tip', 'guard')
WEAPON_SCALE = {'hammer': 1.2, 'shield': 1.15, 'guitar': 1.15, 'spear': 1.05, 'lance': 0.9, 'sword': 1.1, 'trident': 1.1, 'shovel': 1.1, 'staff': 1.1, 'bow': 0.78}   # 긴 무기는 칸을 넘어 캐릭터 전체가 줄었다


def _fit_body(o):
    if not LOWPOLY:
        return o
    k = (BODY_R[0] / OLD_BODY_R[0] * 1.02, BODY_R[1] / OLD_BODY_R[1] * 1.02, BODY_R[2] / OLD_BODY_R[2])
    for v in o.data.vertices:
        v.co = Vector((v.co.x * k[0], v.co.y * k[1], BODY_C.z + (v.co.z - OLD_BODY_C.z) * k[2]))
    return o


_LOOK = None   # 지금 짓는 동료의 얼굴(cfg['look']) — build() 가 넣고 뺀다. 주인공 · 몬스터는 늘 None


def _lp(name, bm, mat, coll, outline=OUT):
    """로우 폴리 조각 — 평면 셰이딩(각진 면). 동료 얼굴(look.smooth)이면 매끈하게 · 외곽선 굵게(look.ink)"""
    if _LOOK:
        return C.mesh_obj(name, bm, mat, coll, smooth=bool(_LOOK.get('smooth')), outline=outline * _LOOK.get('ink', 1.0))
    return C.mesh_obj(name, bm, mat, coll, smooth=False, outline=outline)


def _E(center, radii, egg=0.0, seg=8, rings=6, rot=None):
    """몸 조각 타원체 — 매끈한 동료(look.smooth)는 면을 세 배로 나눠 둥글게"""
    k = 3 if (_LOOK and _LOOK.get('smooth')) else 1
    return C.ellipsoid(center, radii, egg=egg, seg=seg * k, rings=rings * k, rot=rot)


def _lowpoly_body(add, M, coll, cfg):
    """달걀형 한 덩어리 비버 — 머리(위 덩이)는 head 뼈에 붙어 끄덕이고, 몸(아래 덩이)이 더 넓어 이음매 없이 이어진다"""
    add('head', _lp('head', _E(HEAD_C, HEAD_R, egg=0.12, seg=11, rings=8), M['fur'], coll))
    add('body', _lp('body', _E(BODY_C, BODY_R, egg=0.16, seg=11, rings=8), M['fur'], coll))
    look = cfg.get('look')
    clothed = bool(cfg.get('robe') or cfg.get('armor'))
    if look and look.get('element'):   # 속성 몸통 — 배 무늬 모양 · 어깨 장식
        _element_body(add, M, coll, look['element'], not clothed)
    elif not clothed:   # 로브 · 갑옷이 있으면 배 무늬가 옷을 뚫고 나왔다
        if look:   # 동료 얼굴 — 배 무늬를 낮춰 주둥이와 배 사이에 갈색 턱이 보이게(이어지면 긴 흰 띠 · 앞니가 배에 묻힌다)
            add('body', _lp('belly', _E(BODY_C + Vector((0, -0.2, -0.085)), (0.17, 0.1, 0.15), egg=0.1, seg=9, rings=6), M['light'], coll, OUT * 0.6))
        else:
            add('body', _lp('belly', _E(BODY_C + Vector((0, -0.2, -0.04)), (0.19, 0.1, 0.19), egg=0.1, seg=9, rings=6), M['light'], coll, OUT * 0.6))
    if look:   # 동료 얼굴(2026-11-17) — 큰 크림 주둥이 · 작은 눈 · 동료마다 다른 눈 · 코 · 이 · 무늬
        _look_face(add, M, coll, look, cfg)
    # 눈 — 큰 흰자 · 가운데로 모인 검은 눈동자 · 작은 반사광 (위쪽 · 가깝게)
    for sx in (-1, 1):
        p, n = C.on_ellipsoid(HEAD_C, HEAD_R, Vector((sx * 0.36, -1.0, 0.42)), egg=0.12)
        rot = C.look_rot(n)
        if not look:
            add('head', C.mesh_obj(f'eye{sx}', _E(p - n * 0.02, (0.085, 0.095, 0.05), rot=rot, seg=20, rings=12), M['sclera'], coll, outline=OUT * 0.8))
            pc = p + n * 0.036 + Vector((-sx * 0.016, 0, -0.01))   # 흰자 겉면 위에 — 안에 묻혀 초승달처럼 잘리던 것
            add('head', C.mesh_obj(f'pupil{sx}', _E(pc, (0.05, 0.058, 0.008), rot=rot, seg=16, rings=10), M['pupil'], coll))
            add('head', C.mesh_obj(f'eyehi{sx}', _E(pc + n * 0.012 + Vector((-0.014, 0, 0.022)), (0.016, 0.016, 0.004), rot=rot, seg=10, rings=6), M['white'], coll))
        # 귀 — 작고 둥근(어두운 안쪽). 체형(form ears)이 있으면 그 귀로
        if (cfg.get('form') or {}).get('ears', 'round') == 'round':
            ep = HEAD_C + Vector((sx * 0.22, 0.04, 0.25))
            add('head', _lp(f'ear{sx}', _E(ep, (0.075, 0.045, 0.07), seg=8, rings=6), M['fur'], coll))
            add('head', _lp(f'earin{sx}', _E(ep + Vector((0, -0.03, -0.005)), (0.045, 0.02, 0.042), seg=8, rings=6), M['dark'], coll, 0))
        if look:
            continue
        # 볼 두 덩이(주둥이) — 코 아래 양쪽
        add('head', _lp(f'cheek{sx}', _E(HEAD_C + Vector((sx * 0.085, -0.25, -0.07)), (0.1, 0.075, 0.075), seg=9, rings=6), M['light'], coll))
        # 앞니 — 크고 하얗게(볼 아래로 길게)
        add('head', C.mesh_obj(f'tooth{sx}', C.box(HEAD_C + Vector((sx * 0.03, -0.3, -0.2)), (0.052, 0.022, 0.11), bevel=0.008), M['tooth'], coll, smooth=False, outline=OUT * 0.6))
    if not look:
        add('head', _lp('mouth', _E(HEAD_C + Vector((0, -0.25, -0.15)), (0.09, 0.05, 0.05), seg=8, rings=5), M['mouth'], coll, 0))
        # 코 — 자두색 세모(위가 넓다)
        nose = _E(HEAD_C + Vector((0, -0.3, 0.0)), (0.07, 0.04, 0.045), seg=6, rings=4)
        for v in nose.verts:
            dz = v.co.z - HEAD_C.z
            v.co.x = v.co.x * (1.0 + dz * 7)   # 아래로 갈수록 좁아지는 세모
        add('head', _lp('nose', nose, M['plum'], coll, OUT * 0.6))
    # 팔 — 짧고 굵게 · 발톱 끝(어두운 손)
    tseg = 24 if (look and look.get('smooth')) else 8
    for side, sh, hd in (('R', SHOULDER_R, HAND_R), ('L', SHOULDER_L, HAND_L)):
        add(f'arm.{side}', _lp(f'arm{side}', C.tube([sh, sh.lerp(hd, 0.5), hd], [0.075, 0.068, 0.06], seg=tseg), M['fur'], coll))
        add(f'hand.{side}', _lp(f'paw{side}', _E(hd, (0.062, 0.058, 0.06), seg=8, rings=6), M['dark'], coll))
    # 다리 · 발
    for sx, side in ((-1, 'R'), (1, 'L')):
        add(f'leg.{side}', _lp(f'leg{side}', _E(Vector((sx * 0.14, -0.03, 0.07)), (0.085, 0.085, 0.08), seg=8, rings=6), M['fur'], coll))
        add(f'leg.{side}', _lp(f'foot{side}', _E(Vector((sx * 0.15, -0.08, 0.022)), (0.085, 0.1, 0.03), seg=8, rings=5), M['dark'], coll))
    # 꼬리 — 납작한 노(비버 꼬리) · 엉덩이 뒤에서 살짝 들린다. 체형(form tail)이 있으면 그 꼬리로
    form = cfg.get('form') or {}
    if form.get('tail', 'paddle') == 'paddle':
        tail = _E(Vector((0, 0.42, 0.06)), (0.13, 0.2, 0.028), seg=10, rings=6, rot=Euler((math.radians(-14), 0, 0)))
        add('tail', _lp('tail', tail, M['paddle'], coll))
    else:
        _form_tail(add, M, coll, form['tail'])
    if form.get('ears', 'round') != 'round':
        _form_ears(add, M, coll, form['ears'])
    if (form.get('eyes') and not look) or form.get('brows'):   # 동료 얼굴(look)은 눈꺼풀 대신 눈 모양 자체가 다르다
        _form_face(add, M, coll, None if look else form.get('eyes'), form.get('brows'))


# ── 체형 (2026-11-16, 사용자: "원형 비버가 너무 똑같네 — 아예 변형해서 수정") ──
# cfg['form'] = dict(body=(가로, 세로), head=머리 배율, ears=, tail=, eyes=, brows=). 없으면 예전 그대로.
# 몸은 발(뿌리) 위 PIVOT 을 기준으로 늘리고 줄인다. 머리 · 팔 · 꼬리는 크기는 두고 자리만 따라간다(목 · 어깨 · 엉덩이).
# 날개 · 등짐 · 후광처럼 등에 붙은 단단한 장식은 늘리지 않고 옮기기만 한다 — 늘리면 칸 위로 넘쳐 전원 배율(beaver k)이 깎인다.
# 팔은 가로로 조금만 벌린다(ARM_SPREAD) — 칸 오른쪽은 무기 끝 때문에 여유가 3~9px 뿐이다(ally-bbox).
PIVOT = Vector((0.0, 0.0, 0.04))
NECK = Vector((0.0, 0.0, 0.4))
ARM_SPREAD = 0.35
RIGID_BACK = ('wf', 'pk', 'qv', 'qa', 'orbk', 'gr', 'fin', 'bn_', 'lcf', 'st', 'shell', 'scute')


def _form_vals(form):
    bx, by = form.get('body', (1.0, 1.0))
    return bx, by, form.get('head', 1.0)


def _scaled(pt, bx, by):
    """몸 배율로 옮긴 점 — 가로(x) · 앞뒤(y) = bx, 세로(z) = by, PIVOT 기준"""
    d = Vector(pt) - PIVOT
    return PIVOT + Vector((d.x * bx, d.y * bx, d.z * by))


def _arm_shift(sh, bx, by):
    sc = _scaled(sh, bx, by)
    return Vector(((sc.x - sh.x) * ARM_SPREAD, sc.y - sh.y, sc.z - sh.z))


def _form_bones(form):
    bx, by, hs = _form_vals(form)
    out = dict(BONES)
    head_d = _scaled(NECK, bx, by) - NECK
    h, t, p = BONES['body']
    out['body'] = (h, tuple(_scaled(t, bx, by)), p)
    h, t, p = BONES['head']
    out['head'] = (tuple(Vector(h) + head_d), tuple(Vector(t) + head_d), p)
    for side in ('R', 'L'):
        d = _arm_shift(Vector(BONES[f'arm.{side}'][0]), bx, by)
        for bn in (f'arm.{side}', f'hand.{side}'):
            h, t, p = BONES[bn]
            out[bn] = (tuple(Vector(h) + d), tuple(Vector(t) + d), p)
    h, t, p = BONES['tail']
    d = _scaled(h, bx, by) - Vector(h)
    out['tail'] = (tuple(Vector(h) + d), tuple(Vector(t) + d), p)
    return out


def _xform(o, T, seen):
    """메시 데이터에 월드 변환 T 를 굽는다(물체 변환은 그대로) — 같은 데이터를 두 번 굽지 않게"""
    if o.type != 'MESH' or o.data in seen:
        return
    seen.add(o.data)
    mw = o.matrix_world.copy()
    o.data.transform(mw.inverted() @ T @ mw)


def _apply_form(parts, form):
    bx, by, hs = _form_vals(form)
    seen = set()
    move = lambda d: Matrix.Translation(d)
    about = lambda c, sx, sy, sz: Matrix.Translation(c) @ Matrix.Diagonal((sx, sy, sz, 1.0)) @ Matrix.Translation(-c)
    neck1 = _scaled(NECK, bx, by)
    head_d = neck1 - NECK
    back_d = _scaled(Vector((0, 0.27, 0.42)), bx, by) - Vector((0, 0.27, 0.42))
    for bone, objs in parts.items():
        for o in objs:
            nm = o.name
            if bone == 'body':
                if nm.startswith('aura'):
                    T = move(head_d)   # 후광은 머리를 따라간다(늘리면 타원 · 칸 위로 넘친다)
                elif nm.startswith(RIGID_BACK):
                    T = move(back_d)
                else:
                    T = about(PIVOT, bx, bx, by)
            elif bone == 'head':
                T = about(neck1, hs, hs, hs) @ move(head_d)
            elif bone.startswith(('arm.', 'hand.')):
                side = bone[-1]
                T = move(_arm_shift(Vector(BONES[f'arm.{side}'][0]), bx, by))
            elif bone == 'tail':
                h = Vector(BONES['tail'][0])
                T = move(_scaled(h, bx, by) - h)
            else:
                continue
            _xform(o, T, seen)


# ── 역할 몸매 · 속성 몸통 (2026-11-17, 사용자: "몸통도 너무 똑같네 — 특징 · 성능에 따라 조금 더 특색 있게") ──
# look.build: 몸통을 높이(z)에 따라 가로 · 앞뒤로 휘게 한다. 옷(로브 · 갑옷 · 망토)도 몸 뼈에 붙어 있어 같이 휜다.
#   bulky 탱커 — 통 크고 깊게 · athletic 근접 — 넓은 가슴 · 좁은 엉덩이 · lean 원거리 · 마법 — 가늘고 허리 잘록 · pear 치유 — 아래가 넓다
# 팔은 옮기지 않는다 — 칸 오른쪽은 무기 끝 때문에 여유가 3~9px 뿐이다(beaver k).
BUILDS = {
    'bulky': lambda u: (1.15 + 0.05 * u, 1.12),
    'athletic': lambda u: (1.0 + 0.14 * u, 1.0),
    'lean': lambda u: (0.87 - 0.08 * (1 - u * u), 0.92),
    'pear': lambda u: (1.05 - 0.16 * u, 1.05),
}


def _build_s(build, z):
    u = max(-1.0, min(1.0, (z - BODY_C.z) / BODY_R[2]))
    s, d = BUILDS[build](u)
    return s, s * d


def _apply_build(parts, build):
    """몸 뼈 메시를 정점마다 휜다(후광 · 등 장식은 등 표면만큼 옮긴다). 꼬리는 엉덩이 뒤 표면을 따라간다"""
    seen = set()
    for bone, objs in parts.items():
        for o in objs:
            if o.type != 'MESH' or o.data in seen:
                continue
            if bone == 'body' and not o.name.startswith('aura'):
                seen.add(o.data)
                mw = o.matrix_world.copy()
                if o.name.startswith(RIGID_BACK):
                    o.data.transform(mw.inverted() @ Matrix.Translation(Vector((0, 0.27 * (_build_s(build, 0.42)[1] - 1), 0))) @ mw)
                    continue
                inv = mw.inverted()
                for v in o.data.vertices:
                    p = mw @ v.co
                    sx, sy = _build_s(build, p.z)
                    v.co = inv @ Vector((p.x * sx, p.y * sy, p.z))
            elif bone == 'tail':
                _xform(o, Matrix.Translation(Vector((0, 0.25 * (_build_s(build, 0.1)[1] - 1), 0))), seen)


EL_COLOR = {'fire': '#ff8a2a', 'water': '#62c8f0', 'earth': '#9a8c76', 'wind': '#bff2dc'}   # 바람 깃털은 옅은 민트 — 흰색은 밝은 털에 묻혔다


def _element_body(add, M, coll, element, belly):
    """속성 몸통 — 배 무늬 모양(불꽃 · 물방울 · 잎 · 구름)과 어깨 장식(불꽃 · 지느러미 · 돌 어깨 · 깃털). belly=False 면 옷이 배를 덮는다"""
    B = BODY_C
    L = M['light']
    if belly:
        if element == 'fire':   # 불꽃 — 아래 덩이 + 가운데 혀 + 양옆 작은 혀
            add('body', _lp('belly', _E(B + Vector((0, -0.2, -0.13)), (0.15, 0.1, 0.09), seg=9, rings=6), L, coll, OUT * 0.6))
            add('body', _lp('belly1', _E(B + Vector((0, -0.215, -0.05)), (0.075, 0.09, 0.085), seg=9, rings=6), L, coll, OUT * 0.6))
            add('body', _lp('belly2', _E(B + Vector((0, -0.22, 0.02)), (0.035, 0.085, 0.05), seg=8, rings=6), L, coll, OUT * 0.6))
            for sx in (-1, 1):
                add('body', _lp(f'bellyf{sx}', _E(B + Vector((sx * 0.1, -0.19, -0.06)), (0.04, 0.085, 0.065), seg=8, rings=6, rot=Euler((0, math.radians(sx * 24), 0))), L, coll, OUT * 0.6))
        elif element == 'water':   # 물방울 — 둥근 아래 · 뾰족한 위
            add('body', _lp('belly', _E(B + Vector((0, -0.2, -0.12)), (0.15, 0.1, 0.1), seg=9, rings=6), L, coll, OUT * 0.6))
            add('body', _lp('belly1', _E(B + Vector((0, -0.21, -0.035)), (0.085, 0.095, 0.075), seg=9, rings=6), L, coll, OUT * 0.6))
            add('body', _lp('belly2', _E(B + Vector((0, -0.22, 0.025)), (0.035, 0.09, 0.05), seg=8, rings=6), L, coll, OUT * 0.6))
        elif element == 'earth':   # 잎 — 위아래 뾰족한 렌즈 + 가운데 잎맥
            leaf = _E(B + Vector((0, -0.205, -0.075)), (0.115, 0.1, 0.15), seg=10, rings=8)
            zc = B.z - 0.075
            for v in leaf.verts:
                t = min(0.999, abs(v.co.z - zc) / 0.15)
                v.co.x *= (1 - t) / math.sqrt(1 - t * t)
            add('body', _lp('belly', leaf, L, coll, OUT * 0.6))
            vein = spline([B + Vector((0, -0.302, -0.2)), B + Vector((0, -0.31, -0.08)), B + Vector((0, -0.29, 0.04))], 8)
            add('body', C.mesh_obj('bellyvein', C.tube(vein, 0.009, seg=6), M['dark'], coll))
        else:   # wind — 구름: 납작한 아래 + 위에 둥근 봉우리 셋
            add('body', _lp('belly', _E(B + Vector((0, -0.2, -0.13)), (0.15, 0.1, 0.085), seg=9, rings=6), L, coll, OUT * 0.6))
            for k, (x, z, r) in enumerate(((-0.09, -0.085, 0.07), (0.0, -0.045, 0.085), (0.09, -0.085, 0.07))):   # 봉우리를 겹쳐야 구름 — 떨어지면 발자국처럼 보였다
                add('body', _lp(f'belly{k}', _E(B + Vector((x, -0.205, z)), (r, 0.09, r * 0.9), seg=9, rings=6), L, coll, OUT * 0.6))
    col = EL_COLOR[element]
    for side, sh in (('R', SHOULDER_R), ('L', SHOULDER_L)):
        sx = -1 if side == 'R' else 1
        if element == 'fire':   # 어깨 불꽃
            m = _accent('el_fire', col, rough=0.5, emit=col, es=0.6)
            m2 = _accent('el_fire2', '#ffd34d', rough=0.5, emit='#ffd34d', es=0.6)
            for k, (d, L_, r) in enumerate(((Vector((sx * 0.45, 0.25, 1.0)), 0.13, 0.042), (Vector((sx * 0.9, 0.35, 0.6)), 0.09, 0.03))):
                d = d.normalized()
                base = sh + Vector((sx * 0.02, 0.03, 0.05))
                add(f'arm.{side}', _lp(f'el_fl{side}{k}', C.cone(base + d * L_ * 0.5, r, 0.0, L_, seg=6, rot=C.look_rot(d)), m, coll, OUT * 0.5))
                add(f'arm.{side}', _lp(f'el_fi{side}{k}', C.cone(base + d * L_ * 0.38, r * 0.55, 0.0, L_ * 0.6, seg=5, rot=C.look_rot(d)), m2, coll, 0))
        elif element == 'water':   # 팔 뒤 지느러미 둘
            m = _accent('el_fin', col, rough=0.35)
            hd = HAND_R if side == 'R' else HAND_L
            for k, (t, sz) in enumerate(((0.3, (0.016, 0.105, 0.085)), (0.66, (0.014, 0.07, 0.06)))):   # 팔 바깥 뒤로 — 몸 뒤에 숨으면 안 보였다
                p = sh.lerp(hd, t) + Vector((sx * 0.07, 0.07, 0.035))
                add(f'arm.{side}', _lp(f'el_fin{side}{k}', _E(p, sz, seg=8, rings=6, rot=Euler((math.radians(-25), 0, 0))), m, coll, OUT * 0.5))
        elif element == 'earth':   # 돌 어깨 + 이끼
            m = _accent('el_rock', col, rough=0.9)
            mo = _accent('el_moss', '#7aa04a', rough=0.9)
            add(f'arm.{side}', C.mesh_obj(f'el_rk{side}', C.ellipsoid(sh + Vector((sx * 0.025, 0.0, 0.055)), (0.095, 0.085, 0.06), seg=6, rings=4), m, coll, smooth=False, outline=OUT * _LOOK.get('ink', 1.0) if _LOOK else OUT))
            add(f'arm.{side}', C.mesh_obj(f'el_ms{side}', C.ellipsoid(sh + Vector((sx * 0.01, 0.01, 0.105)), (0.05, 0.045, 0.02), seg=8, rings=5), mo, coll, smooth=False))
        else:   # wind — 어깨 깃털 셋(바깥 · 뒤로)
            m = _accent('el_fth', col, rough=0.8)
            for k, d in enumerate((Vector((sx * 1.0, 0.1, 0.75)), Vector((sx * 1.0, 0.35, 0.25)), Vector((sx * 0.45, 0.3, 1.0)))):   # 바깥 · 위로 — 뒤로 누우면 몸에 가렸다
                d = d.normalized()
                base = sh + Vector((sx * 0.04, 0.0, 0.04))
                add(f'arm.{side}', _lp(f'el_ft{side}{k}', C.cone(base + d * 0.08, 0.036, 0.0, 0.16, seg=5, rot=C.look_rot(d)), m, coll, OUT * 0.5))


def _form_ears(add, M, coll, kind):
    """귀 — round(기본) 말고: pointed 뾰족 · tufted 뾰족 + 끝 털 · big 큰 둥근 귀 · droop 늘어진 귀"""
    for sx in (-1, 1):
        if kind in ('pointed', 'tufted'):
            base = HEAD_C + Vector((sx * 0.19, 0.05, 0.22))
            d = Vector((sx * 0.38, 0.12, 1.0)).normalized()
            add('head', _lp(f'ear{sx}', C.cone(base + d * 0.1, 0.085, 0.0, 0.22, seg=6, rot=C.look_rot(d)), M['fur'], coll))
            add('head', _lp(f'earin{sx}', C.cone(base + d * 0.09 + Vector((0, -0.035, 0)), 0.05, 0.0, 0.15, seg=5, rot=C.look_rot(d)), M['dark'], coll, 0))
            if kind == 'tufted':
                add('head', _lp(f'eartuft{sx}', C.cone(base + d * 0.25, 0.028, 0.0, 0.1, seg=4, rot=C.look_rot(d)), M['dark'], coll, OUT * 0.5))
        elif kind == 'big':
            ep = HEAD_C + Vector((sx * 0.25, 0.05, 0.25))
            add('head', _lp(f'ear{sx}', _E(ep, (0.12, 0.05, 0.115), seg=9, rings=6), M['fur'], coll))
            add('head', _lp(f'earin{sx}', _E(ep + Vector((0, -0.035, -0.008)), (0.075, 0.022, 0.07), seg=8, rings=6), M['dark'], coll, 0))
        elif kind == 'droop':
            ep = HEAD_C + Vector((sx * 0.29, 0.03, 0.1))
            add('head', _lp(f'ear{sx}', _E(ep, (0.06, 0.05, 0.13), seg=8, rings=6, rot=Euler((0, math.radians(sx * 22), 0))), M['fur'], coll))
            add('head', _lp(f'earin{sx}', _E(ep + Vector((0, -0.03, 0)), (0.035, 0.02, 0.09), seg=8, rings=6, rot=Euler((0, math.radians(sx * 22), 0))), M['dark'], coll, 0))


def _form_tail(add, M, coll, kind):
    """꼬리 — paddle(기본 노 꼬리) 말고: plume 크게 말린 털 꼬리 · long 긴 채찍 꼬리 + 끝 털 · fan 세 갈래 노"""
    if kind == 'plume':
        tp = spline([Vector((0, 0.24, 0.1)), Vector((0, 0.42, 0.2)), Vector((0, 0.5, 0.42)), Vector((0, 0.44, 0.62)), Vector((0, 0.32, 0.68))], 20)
        tr = interp([0.07, 0.13, 0.16, 0.13, 0.05], len(tp))
        add('tail', _lp('tail', C.tube(tp, tr, seg=9), M['fur'], coll))
        k = int(len(tp) * 0.7)
        add('tail', _lp('tailtip', C.tube(tp[k:], [r * 1.05 for r in tr[k:]], seg=9), M['light'], coll, 0))
    elif kind == 'long':
        tp = spline([Vector((0, 0.24, 0.08)), Vector((0, 0.5, 0.1)), Vector((0, 0.68, 0.22)), Vector((0, 0.74, 0.42))], 18)
        add('tail', _lp('tail', C.tube(tp, interp([0.05, 0.035, 0.028, 0.022], len(tp)), seg=7), M['fur'], coll))
        add('tail', _lp('tailtuft', _E(tp[-1] + Vector((0, 0.01, 0.04)), (0.06, 0.06, 0.09), seg=8, rings=6), M['dark'], coll))
    elif kind == 'fan':
        for k, deg in enumerate((-28, 0, 28)):
            t = _E(Vector((0, 0.4, 0.07)), (0.085, 0.17, 0.024), seg=9, rings=6, rot=Euler((math.radians(-16), 0, math.radians(deg))))
            add('tail', _lp(f'tail{k}', t, M['paddle'], coll))


def _form_face(add, M, coll, eyes, brows):
    """눈꺼풀 · 눈썹 — sharp 매서운(안쪽으로 내려온 윗꺼풀) · sleepy 졸린(반쯤 덮은 꺼풀) · brows fierce 굵은 八 눈썹"""
    for sx in (-1, 1):
        p, n = C.on_ellipsoid(HEAD_C, HEAD_R, Vector((sx * 0.36, -1.0, 0.42)), egg=0.12)
        rot = C.look_rot(n)
        if eyes in ('sharp', 'sleepy'):
            tilt = Euler((0, 0, math.radians(-sx * (18 if eyes == 'sharp' else 0)))).to_matrix().to_4x4()
            lid = _E(Vector((0, 0, 0)), (0.098, 0.062 if eyes == 'sharp' else 0.075, 0.03), seg=12, rings=8)
            for v in [v for v in lid.verts if v.co.y < -0.004]:
                lid.verts.remove(v)
            o = _lp(f'lid{sx}', lid, M['fur'], coll, OUT * 0.5)
            o.data.transform(Matrix.Translation(p + n * 0.045 + Vector((0, 0, 0.034 if eyes == 'sharp' else 0.02))) @ rot.to_matrix().to_4x4() @ tilt)
            add('head', o)
        if brows == 'fierce':
            b = C.box(Vector((0, 0, 0)), (0.11, 0.03, 0.026), bevel=0.008)
            o = C.mesh_obj(f'brow{sx}', b, M['dark'], coll, smooth=False, outline=OUT * 0.5)
            o.data.transform(Matrix.Translation(p + n * 0.05 + Vector((sx * -0.01, 0, 0.1))) @ Euler((0, math.radians(-sx * 24), 0)).to_matrix().to_4x4())
            add('head', o)


# ── 동료 얼굴 (2026-11-17, 사용자: 와르르비버 영상 · 그림을 "참고해서 동료는 다르게") ──
# 참고는 느낌만 — 크고 둥근 크림 주둥이 · 그 위 까만 코 · 작고 까만 눈 · 굵은 외곽선 · 매끈한 몸. 그 게임 비버를 베끼지 않는다.
# 동료마다 눈 · 주둥이 · 코 · 이 · 볼 · 무늬 조합을 달리해 같은 얼굴이 없게 한다(roster_looks.py). 주인공은 look 이 없어 예전 얼굴 그대로.
# cfg['look'] = dict(eyes=dot|bead|button|sharp|smile|line|wink|wide, muzzle=big|round|wide|small, nose=oval|button|big|pink|plum,
#                    teeth=buck|one|gap|small|fang, cheek=blush|freckle|none, mark=mask|patch|spot|stripes|none, mark_color=, muzzle_color=,
#                    eye_color=, eye_glow=, smooth=True, ink=1.35)
EYE_AT = (0.36, -1.0, 0.42)   # beaver_kit.EYE_DIR 와 같다 — 안경 · 안대 · 가면이 눈 자리에 맞는다


def _basis(n):
    """얼굴 표면 점의 (오른쪽, 위, 바깥) — 눈 · 무늬를 표면에 눕혀 짓는다"""
    r = Vector((0, 0, 1)).cross(n).normalized()
    u = n.cross(r).normalized()
    return Matrix((r, u, n)).transposed()


def _on_face(name, bm, mat, coll, p, n, tilt=0.0, outline=0.0):
    o = C.mesh_obj(name, bm, mat, coll, smooth=True, outline=outline)
    o.data.transform(Matrix.Translation(p) @ _basis(n).to_4x4() @ Matrix.Rotation(math.radians(tilt), 4, 'Z'))
    return o


def _lum(hexstr):
    h = hexstr.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _look_face(add, M, coll, look, cfg):
    form = cfg.get('form') or {}
    eyes = look.get('eyes') or {'sharp': 'sharp', 'sleepy': 'line'}.get(form.get('eyes'), 'dot')
    muz, nose, teeth = look.get('muzzle', 'big'), look.get('nose', 'oval'), look.get('teeth', 'buck')
    cheek, mark = look.get('cheek', 'none'), look.get('mark', 'none')
    O = Vector((0, 0, 0))
    ec = look.get('eye_color', '#120a06')
    eye_m = C.principled(f'lk_eye_{ec}_{bool(look.get("eye_glow"))}', ec, rough=0.3, coat=0.4, emit=ec if look.get('eye_glow') else None, emit_strength=1.6 if look.get('eye_glow') else 0.0)
    # 짙은 털 · 눈가 무늬 위의 까만 눈은 묻힌다 — 흰 테를 두른다
    rim = look.get('rim', _lum(cfg.get('fur', '#9a6640')) < 0.16 or mark == 'mask' or cfg.get('face') == 'mask')
    mz_m = C.principled(f"lk_muz_{look['muzzle_color']}", look['muzzle_color'], rough=0.9, coat=0.0) if look.get('muzzle_color') else M['light']
    ink = OUT * look.get('ink', 1.0)

    # 무늬 — 눈보다 먼저(눈 뒤에 깔린다)
    mk_col = look.get('mark_color')
    mk_m = C.principled(f'lk_mark_{mk_col}', mk_col, rough=0.9, coat=0.0) if mk_col else M['dark']
    for sx in (-1, 1):
        p, n = C.on_ellipsoid(HEAD_C, HEAD_R, Vector((sx * EYE_AT[0], EYE_AT[1], EYE_AT[2])), egg=0.12)
        if mark == 'mask':
            add('head', _on_face(f'lk_mask{sx}', C.ellipsoid(O, (0.112, 0.088, 0.02), seg=24, rings=12), mk_m, coll, p - n * 0.008, n, tilt=-sx * 12))
        elif mark == 'patch' and sx == -1:   # 카메라 쪽 눈(-X)
            add('head', _on_face('lk_patch', C.ellipsoid(O, (0.12, 0.105, 0.02), seg=24, rings=12), mk_m, coll, p - n * 0.008 + Vector((0, 0, 0.01)), n))
    if mark == 'spot':
        p, n = C.on_ellipsoid(HEAD_C, HEAD_R, Vector((0, -0.72, 0.95)), egg=0.12)
        add('head', _on_face('lk_spot', C.ellipsoid(O, (0.075, 0.06, 0.018), seg=20, rings=10), mk_m, coll, p - n * 0.006, n))
    elif mark == 'stripes':
        for k, x in enumerate((-0.16, 0.0, 0.16)):
            p, n = C.on_ellipsoid(HEAD_C, HEAD_R, Vector((x, -0.62, 1.05 - abs(x) * 0.6)), egg=0.12)
            add('head', _on_face(f'lk_str{k}', C.ellipsoid(O, (0.02, 0.07, 0.016), seg=12, rings=8), mk_m, coll, p - n * 0.005, n, tilt=x * 90))

    # 눈
    for sx in (-1, 1):
        kind = {'wink': ('smile' if sx < 0 else 'dot')}.get(eyes, eyes)
        p, n = C.on_ellipsoid(HEAD_C, HEAD_R, Vector((sx * EYE_AT[0], EYE_AT[1], EYE_AT[2])), egg=0.12)
        if kind == 'wide':   # 예전 큰 흰자 눈(놀란 얼굴 한두 명만)
            rot = C.look_rot(n)
            add('head', C.mesh_obj(f'eye{sx}', C.ellipsoid(p - n * 0.02, (0.08, 0.09, 0.05), rot=rot, seg=20, rings=12), M['sclera'], coll, outline=ink * 0.8))
            pc = p + n * 0.034 + Vector((-sx * 0.012, 0, -0.008))
            add('head', C.mesh_obj(f'pupil{sx}', C.ellipsoid(pc, (0.04, 0.048, 0.008), rot=rot, seg=16, rings=10), eye_m, coll))
            add('head', C.mesh_obj(f'eyehi{sx}', C.ellipsoid(pc + n * 0.012 + Vector((-0.012, 0, 0.018)), (0.014, 0.014, 0.004), rot=rot, seg=10, rings=6), M['white'], coll))
            continue
        if kind in ('smile', 'line'):   # 감은 눈 — 웃는 ∩ · 졸린 ─
            pts = []
            for k in range(9):
                t = -1 + k / 4
                y = (1 - t * t) * 0.03 - 0.012 if kind == 'smile' else -(1 - t * t) * 0.008
                pts.append(Vector((t * 0.055, y, 0.0)))
            o = C.mesh_obj(f'eye{sx}', C.tube(pts, 0.013, seg=8), eye_m, coll)
            o.data.transform(Matrix.Translation(p + n * 0.012) @ _basis(n).to_4x4())
            add('head', o)
            continue
        r = {'dot': (0.044, 0.058), 'bead': (0.06, 0.068), 'button': (0.032, 0.036), 'sharp': (0.062, 0.034)}.get(kind, (0.044, 0.058))
        tilt = -sx * 16 if kind == 'sharp' else 0.0
        if rim:
            add('head', _on_face(f'eyerim{sx}', C.ellipsoid(O, (r[0] + 0.016, r[1] + 0.016, 0.012), seg=24, rings=12), M['sclera'], coll, p + n * 0.002, n, tilt))
        add('head', _on_face(f'eye{sx}', C.ellipsoid(O, (r[0], r[1], 0.02), seg=24, rings=12), eye_m, coll, p + n * 0.008, n, tilt))
        hi = 0.022 if kind == 'bead' else 0.014 if kind != 'button' else 0.009
        add('head', _on_face(f'eyehi{sx}', C.ellipsoid(O, (hi, hi, 0.005), seg=12, rings=8), M['white'], coll, p + n * 0.026 + _basis(n) @ Vector((-r[0] * 0.35, r[1] * 0.38, 0)), n))
        if kind == 'bead':
            add('head', _on_face(f'eyehi2{sx}', C.ellipsoid(O, (0.01, 0.01, 0.004), seg=10, rings=6), M['white'], coll, p + n * 0.026 + _basis(n) @ Vector((r[0] * 0.4, -r[1] * 0.42, 0)), n))

    # 볼
    for sx in (-1, 1):
        p, n = C.on_ellipsoid(HEAD_C, HEAD_R, Vector((sx * 0.66, -0.78, 0.1)), egg=0.12)
        if cheek == 'blush':
            add('head', _on_face(f'blush{sx}', C.ellipsoid(O, (0.058, 0.034, 0.012), seg=16, rings=8), M['blush'], coll, p, n))
        elif cheek == 'freckle':
            for k, (dx, dy) in enumerate(((-0.03, 0.012), (0.0, -0.014), (0.03, 0.01))):
                add('head', _on_face(f'frk{sx}{k}', C.ellipsoid(O, (0.011, 0.011, 0.006), seg=8, rings=6), M['dark'], coll, p + _basis(n) @ Vector((dx, dy, 0)), n))

    # 주둥이 — 크림 두 덩이가 한 덩어리로(위 가운데가 살짝 파인 콩 모양)
    if muz in ('big', 'wide'):
        w = 0.095 if muz == 'wide' else 0.078
        R = (0.135, 0.09, 0.095) if muz == 'wide' else (0.128, 0.095, 0.105)
        for sx in (-1, 1):
            add('head', _lp(f'muz{sx}', _E(HEAD_C + Vector((sx * w, -0.215, -0.095)), R, seg=10, rings=7), mz_m, coll, OUT))
        add('head', _lp('muzc', _E(HEAD_C + Vector((0, -0.225, -0.085)), (0.1, 0.09, 0.09), seg=10, rings=7), mz_m, coll, OUT))
    elif muz == 'round':
        add('head', _lp('muzc', _E(HEAD_C + Vector((0, -0.22, -0.1)), (0.14, 0.1, 0.105), seg=10, rings=7), mz_m, coll, OUT))
    else:   # small — 예전 볼 두 덩이
        for sx in (-1, 1):
            add('head', _lp(f'muz{sx}', _E(HEAD_C + Vector((sx * 0.085, -0.25, -0.07)), (0.1, 0.075, 0.075), seg=9, rings=6), mz_m, coll, OUT))
    # 코 — 주둥이 위 가운데
    nz = {'button': (0.04, 0.03, 0.034), 'big': (0.078, 0.046, 0.056), 'pink': (0.06, 0.036, 0.042)}.get(nose, (0.06, 0.038, 0.044))
    if nose == 'plum':
        nb = C.ellipsoid(HEAD_C + Vector((0, -0.31, -0.02)), (0.07, 0.04, 0.045), seg=12, rings=8)
        for v in nb.verts:
            v.co.x = v.co.x * (1.0 + (v.co.z - HEAD_C.z + 0.02) * 7)
        add('head', _lp('nose', nb, M['plum'], coll, OUT * 0.6))
    else:
        nm = C.principled('lk_nose_pink', '#e9788c', rough=0.45, coat=0.4) if nose == 'pink' else M['nose']
        add('head', _lp('nose', C.ellipsoid(HEAD_C + Vector((0, -0.312, -0.025)), nz, seg=20, rings=12), nm, coll, OUT * 0.6))
    # 앞니 — 주둥이 아래로
    tw = {'buck': [(-0.026, 0.046, 0.085), (0.026, 0.046, 0.085)], 'one': [(0.0, 0.07, 0.09)], 'gap': [(-0.04, 0.042, 0.08), (0.04, 0.042, 0.08)],
          'small': [(-0.022, 0.036, 0.058), (0.022, 0.036, 0.058)], 'fang': [(-0.03, 0.044, 0.085), (0.028, 0.03, 0.05)]}.get(teeth, [])
    for k, (x, wd, ht) in enumerate(tw):
        add('head', C.mesh_obj(f'tooth{k}', C.box(HEAD_C + Vector((x, -0.24, -0.172 - ht / 2)), (wd, 0.06, ht), bevel=0.01), M['tooth'], coll, smooth=False, outline=ink * 0.6))


def build(name, cfg, coll=None):
    global _LOOK
    _LOOK = cfg.get('look')
    try:
        return _build(name, cfg, coll)
    finally:
        _LOOK = None


def _build(name, cfg, coll=None):
    coll = coll or C.collection(name)
    M = _mats(cfg)
    form = cfg.get('form')
    arm = _armature(name, coll, _form_bones(form) if form else None)
    parts = {k: [] for k in BONES}

    def add(bone, o):
        parts[bone].append(o)

    if LOWPOLY:
        _lowpoly_body(add, M, coll, cfg)
    else:
        # 머리
        add('head', C.mesh_obj('head', C.ellipsoid(HEAD_C, HEAD_R, egg=0.08), M['fur'], coll, outline=OUT))
        if CUTE:   # 작고 낮은 주둥이 · 작은 코 · 동그란 앞니 두 개 — 얼굴 아래쪽 1/3 에 모아 아기 얼굴 비율
            add('head', C.mesh_obj('muzzle', C.ellipsoid(HEAD_C + Vector((0, -0.25, -0.13)), (0.125, 0.095, 0.09)), M['light'], coll, outline=OUT))
            add('head', C.mesh_obj('nose', C.ellipsoid(HEAD_C + Vector((0, -0.345, -0.085)), (0.034, 0.022, 0.024)), M['nose'], coll))
            for sx in (-1, 1):
                add('head', C.mesh_obj(f'tooth{sx}', C.box(HEAD_C + Vector((sx * 0.019, -0.322, -0.19)), (0.033, 0.016, 0.046), bevel=0.012), M['tooth'], coll, outline=OUT * 0.5))
        else:
            add('head', C.mesh_obj('muzzle', C.ellipsoid(HEAD_C + Vector((0, -0.24, -0.1)), (0.16, 0.115, 0.115)), M['light'], coll, outline=OUT))
            add('head', C.mesh_obj('nose', C.ellipsoid(HEAD_C + Vector((0, -0.36, -0.05)), (0.045, 0.03, 0.03)), M['nose'], coll))
            for sx in (-1, 1):
                add('head', C.mesh_obj(f'tooth{sx}', C.box(HEAD_C + Vector((sx * 0.018, -0.338, -0.17)), (0.03, 0.016, 0.05), bevel=0.006), M['tooth'], coll, outline=OUT * 0.5))
        # 눈 · 하이라이트 · 볼 · 귀
        for sx in (-1, 1):
            if CUTE:   # 크고(1.35배) 낮고(코 높이 가까이) 넓게 — 큰 하이라이트 + 작은 반사광 둘
                p, n = C.on_ellipsoid(HEAD_C, HEAD_R, Vector((sx * 0.43, -1.0, 0.08)))
                rot = C.look_rot(n)
                add('head', C.mesh_obj(f'eye{sx}', C.ellipsoid(p - n * 0.014, (0.086, 0.104, 0.034), rot=rot), M['eye'], coll))
                add('head', C.mesh_obj(f'iris{sx}', C.ellipsoid(p + n * 0.012 + Vector((0, 0, -0.025)), (0.05, 0.05, 0.008), rot=rot), M['iris'], coll))
                add('head', C.mesh_obj(f'eyehi{sx}', C.ellipsoid(p + n * 0.02 + Vector((-0.026, 0, 0.042)), (0.032, 0.032, 0.007), rot=rot), M['white'], coll))
                add('head', C.mesh_obj(f'eyehi2{sx}', C.ellipsoid(p + n * 0.02 + Vector((0.026, 0, -0.04)), (0.014, 0.014, 0.005), rot=rot), M['white'], coll))
                bp, bn = C.on_ellipsoid(HEAD_C, HEAD_R, Vector((sx * 0.82, -0.62, -0.22)))
                add('head', C.mesh_obj(f'blush{sx}', C.ellipsoid(bp - bn * 0.008, (0.075, 0.045, 0.012), rot=C.look_rot(bn)), M['blush'], coll))
                ep = HEAD_C + Vector((sx * 0.27, 0.05, 0.24))
                add('head', C.mesh_obj(f'ear{sx}', C.ellipsoid(ep, (0.092, 0.05, 0.088)), M['fur'], coll, outline=OUT))
                add('head', C.mesh_obj(f'earin{sx}', C.ellipsoid(ep + Vector((0, -0.032, 0)), (0.058, 0.02, 0.054)), M['inner'], coll))
                continue
            p, n = C.on_ellipsoid(HEAD_C, HEAD_R, Vector((sx * 0.36, -1.0, 0.13)))
            rot = C.look_rot(n)
            add('head', C.mesh_obj(f'eye{sx}', C.ellipsoid(p - n * 0.012, (0.064, 0.08, 0.03), rot=rot), M['eye'], coll))
            add('head', C.mesh_obj(f'eyehi{sx}', C.ellipsoid(p + n * 0.018 + Vector((-0.018, 0, 0.032)), (0.024, 0.024, 0.006), rot=rot), M['white'], coll))
            bp, bn = C.on_ellipsoid(HEAD_C, HEAD_R, Vector((sx * 0.68, -0.85, -0.16)))
            add('head', C.mesh_obj(f'blush{sx}', C.ellipsoid(bp - bn * 0.008, (0.055, 0.035, 0.012), rot=C.look_rot(bn)), M['blush'], coll))
            ep = HEAD_C + Vector((sx * 0.26, 0.05, 0.235))
            add('head', C.mesh_obj(f'ear{sx}', C.ellipsoid(ep, (0.078, 0.045, 0.072)), M['fur'], coll, outline=OUT))
            add('head', C.mesh_obj(f'earin{sx}', C.ellipsoid(ep + Vector((0, -0.03, 0)), (0.048, 0.02, 0.044)), M['inner'], coll))
        if cfg.get('tuft', True) and CUTE:   # 뿔처럼 읽히던 긴 털 → 작은 곱슬 한 가닥(2026-10-23)
            pts = spline([HEAD_C + Vector((0.0, -0.06, 0.33)), HEAD_C + Vector((-0.03, -0.13, 0.36)), HEAD_C + Vector((-0.07, -0.15, 0.32)), HEAD_C + Vector((-0.06, -0.12, 0.28))], 14)
            add('head', C.mesh_obj('tuft', C.tube(pts, interp([0.045, 0.035, 0.025, 0.01], len(pts)), seg=14), M['dark'], coll, outline=OUT * 0.8))
        elif cfg.get('tuft', True):
            pts = spline([HEAD_C + Vector((0.03, -0.12, 0.3)), HEAD_C + Vector((-0.02, -0.22, 0.24)), HEAD_C + Vector((-0.07, -0.28, 0.15))], 12)
            add('head', C.mesh_obj('tuft', C.tube(pts, interp([0.075, 0.05, 0.012], len(pts)), seg=14), M['dark'], coll, outline=OUT))
        # 몸 · 배
        add('body', C.mesh_obj('body', C.ellipsoid(BODY_C, BODY_R, egg=0.12), M['fur'], coll, outline=OUT))
        add('body', C.mesh_obj('belly', C.ellipsoid(BODY_C + Vector((0, -0.11, -0.02)), (0.135, 0.09, 0.155), egg=0.15), M['light'], coll, outline=OUT * 0.6))
        # 팔 + 앞발
        for side, sh, hd in (('R', SHOULDER_R, HAND_R), ('L', SHOULDER_L, HAND_L)):
            add(f'arm.{side}', C.mesh_obj(f'arm{side}', C.tube([sh, sh.lerp(hd, 0.5), hd], [0.055, 0.05, 0.046], seg=16), M['fur'], coll, outline=OUT))
            add(f'hand.{side}', C.mesh_obj(f'paw{side}', C.ellipsoid(hd, (0.054, 0.05, 0.054)), M['fur'], coll, outline=OUT))
        # 다리 · 발
        for sx, side in ((-1, 'R'), (1, 'L')):
            add(f'leg.{side}', C.mesh_obj(f'leg{side}', C.ellipsoid(Vector((sx * 0.095, -0.02, 0.065)), (0.065, 0.065, 0.075)), M['fur'], coll, outline=OUT))
            add(f'leg.{side}', C.mesh_obj(f'foot{side}', C.ellipsoid(Vector((sx * 0.1, -0.06, 0.02)), (0.07, 0.085, 0.028)), M['dark'], coll, outline=OUT))
        # 꼬리 — 크고 폭신한 꼬리(원화처럼 끝이 밝다)
        tp = spline([Vector((0, 0.14, 0.09)), Vector((0, 0.25, 0.14)), Vector((0, 0.32, 0.26)), Vector((0, 0.31, 0.4)), Vector((0, 0.26, 0.48))], 24)
        tr = interp([0.06, 0.11, 0.125, 0.1, 0.025], len(tp))
        add('tail', C.mesh_obj('tail', C.tube(tp, tr, seg=22), M['fur'], coll, outline=OUT))
        k = int(len(tp) * 0.72)
        add('tail', C.mesh_obj('tailtip', C.tube(tp[k:], [r * 1.04 for r in tr[k:]], seg=22), M['light'], coll))
    # 의상
    from lib import beaver_kit as KIT   # 새 동료 장식(2026-11-03) — cfg 에 키가 없으면 아무것도 짓지 않는다
    for o in hat(cfg.get('hat', 'none'), cfg, coll) or KIT.hat_new(cfg.get('hat', 'none'), cfg, coll):
        add('head', o)
    if cfg.get('robe'):
        for o in robe(cfg['robe'], coll, cfg.get('trim', '#f2c232')):
            add('body', o)
    if cfg.get('armor'):
        for o in armor(cfg['armor'], coll, cfg.get('trim', '#f2c232')):
            add('body', o)
    if cfg.get('scarf'):
        for o in scarf(cfg['scarf'], coll):
            add('body', o)
    if cfg.get('cape'):
        for o in cape(cfg['cape'], coll):
            add('body', _fit_body(o))
    KIT.dress(add, cfg, coll)
    # 무기
    if cfg.get('weapon_r'):
        for o in weapon(cfg['weapon_r'], HAND_R, coll, cfg.get('weapon_color', '#cfd6df'), cfg.get('weapon_wood', '#8a5a2b')):
            add('hand.R', o)
    if cfg.get('weapon_l'):
        for o in weapon(cfg['weapon_l'], HAND_L, coll, cfg.get('weapon_l_color', cfg.get('weapon_color', '#cfd6df')), cfg.get('weapon_wood', '#8a5a2b')):
            add('hand.L', o)
    if _LOOK and _LOOK.get('build'):   # 역할 몸매 — 체형 배율보다 먼저(몸 원래 좌표 기준)
        _apply_build(parts, _LOOK['build'])
    if form:   # 체형 — 붙이기 전에 월드 좌표에서 굽는다(뼈 자리는 _form_bones 가 같은 식으로 옮겼다)
        _apply_form(parts, form)
    bpy.context.view_layer.update()
    for bone, objs in parts.items():
        for o in objs:
            _attach(o, arm, bone)
    return Rig(arm, parts, cfg)


# ── 자세 ──
def _rot_local(arm, bone, axis, deg):
    """캐릭터 공간 축(쉬는 자세 기준)으로 deg 만큼 — 뼈 로컬 회전으로 바꿔 넣는다"""
    b = arm.data.bones[bone]
    R0 = b.matrix_local.to_3x3()
    Rw = Matrix.Rotation(math.radians(deg), 3, Vector(axis))
    return (R0.inverted() @ Rw @ R0).to_quaternion()


def pose(rig, P):
    """P(도): lean 앞으로 숙임+ · side 옆 기울기 · squash 세로 배율 · head 끄덕 앞+ · head_turn
    arm_r/arm_l 앞으로 들기+(어깨 기준, 뒤로는 −) · arm_r_out/arm_l_out 옆으로 벌림+ · wrist_r/wrist_l 손목(무기) 앞으로+
    leg_r/leg_l 앞으로+ · tail · dx/dz/dy 이동(캐릭터 단위, dy 앞+)"""
    arm = rig.arm
    pb = arm.pose.bones
    for b in pb:
        b.rotation_mode = 'QUATERNION'
        b.rotation_quaternion = Quaternion()
        b.scale = (1, 1, 1)
        b.location = (0, 0, 0)
    X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)
    pb['body'].rotation_quaternion = _rot_local(arm, 'body', X, P.get('lean', 0)) @ _rot_local(arm, 'body', Y, P.get('side', 0))
    sq = P.get('squash', 1.0)
    # 체형(form)으로 몸이 길어지면 같은 눌림 배율이 더 크게 움직인다 — 실제 움직임이 예전 비버와 같게 세로 배율로 나눈다(audit-anim2-motion 키 튐, 2026-11-16)
    _by = ((rig.cfg or {}).get('form') or {}).get('body', (1.0, 1.0))[1]
    sq = 1 + (sq - 1) / _by
    pb['body'].scale = (1 / math.sqrt(sq), sq, 1 / math.sqrt(sq))   # 뼈 로컬 Y 가 세로
    pb['head'].rotation_quaternion = _rot_local(arm, 'head', X, P.get('head', 0)) @ _rot_local(arm, 'head', Z, P.get('head_turn', 0))
    pb['head'].scale = (math.sqrt(sq), 1 / sq, math.sqrt(sq))   # 머리는 몸 눌림을 되돌려 찌그러지지 않게
    pb['arm.R'].rotation_quaternion = _rot_local(arm, 'arm.R', X, -P.get('arm_r', 0)) @ _rot_local(arm, 'arm.R', Y, P.get('arm_r_out', 0))
    pb['arm.L'].rotation_quaternion = _rot_local(arm, 'arm.L', X, -P.get('arm_l', 0)) @ _rot_local(arm, 'arm.L', Y, -P.get('arm_l_out', 0))
    # 무기 방향: aim_r/aim_l(도) 을 주면 무기가 캐릭터 옆에서 본 그 방향을 가리키게 손목을 맞춘다 — 0 위 · 90 앞 · 180 아래 · −90 뒤
    for s in ('r', 'l'):
        S = s.upper()
        if f'aim_{s}' in P:
            pb[f'hand.{S}'].rotation_quaternion = _rot_local(arm, f'hand.{S}', X, P[f'aim_{s}'] + P.get(f'arm_{s}', 0))
        else:
            pb[f'hand.{S}'].rotation_quaternion = _rot_local(arm, f'hand.{S}', X, -P.get(f'wrist_{s}', 0))
        # 손목 비틀기(무기 축 둘레, 2026-10-19 anim2) — 활 면(D 모양)을 카메라 쪽으로 돌린다
        if P.get(f'twist_{s}', 0):
            pb[f'hand.{S}'].rotation_quaternion = pb[f'hand.{S}'].rotation_quaternion @ _rot_local(arm, f'hand.{S}', Y, P[f'twist_{s}'])
    pb['leg.R'].rotation_quaternion = _rot_local(arm, 'leg.R', X, -P.get('leg_r', 0))
    pb['leg.L'].rotation_quaternion = _rot_local(arm, 'leg.L', X, -P.get('leg_l', 0))
    pb['tail'].rotation_quaternion = _rot_local(arm, 'tail', X, P.get('tail', 0))
    pb['root'].location = (P.get('dx', 0), P.get('dz', 0), P.get('dy', 0))   # 뼈 로컬: X 옆 · Y 위 · Z 앞(-Y 월드)
    # 전신 눌림·늘림(머리까지 — 만화식 squash & stretch, 2026-10-19 anim2). 뿌리 뼈 머리(발밑)를 기준으로 줄어 발은 바닥에 붙어 있다
    sa = 1 + (P.get('sq_all', 1.0) - 1) / _by
    pb['root'].scale = (1 / math.sqrt(sa), sa, 1 / math.sqrt(sa))
    bpy.context.view_layer.update()
