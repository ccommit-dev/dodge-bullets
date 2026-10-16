"""절차적 3D 비버 (2026-10-16) — 주인공·동료 공통 몸 + 의상·무기 설정(cfg). mascot-3d-film moko.py 방식:
타원체 몸·머리, 표면에 얹은 눈·볼, 인버티드 헐 잉크 외곽선, 뼈대 리그(root → body → head / arm.R·hand.R / arm.L·hand.L, legs, tail).
캐릭터 단위: 발 z=0, 머리 꼭대기 z≈1, 정면 -Y. 오른손(무기 손)은 -X 쪽 — 오른쪽을 보게 돌리면 카메라 쪽 앞손이 된다.
부품은 모두 뼈에 강체로 붙는다(치비라 피부 변형이 필요 없다) → 팔·무기가 진짜로 휘두른다.
"""
import bpy
import math
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


class Rig:
    def __init__(self, arm, objs, cfg):
        self.arm, self.objs, self.cfg = arm, objs, cfg


def _armature(name, coll):
    a = bpy.data.armatures.new(name + '_arm')
    o = bpy.data.objects.new(name + '_rig', a)
    coll.objects.link(o)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode='EDIT')
    eb = {}
    for bn, (h, t, p) in BONES.items():
        b = a.edit_bones.new(bn)
        b.head, b.tail = Vector(h), Vector(t)
        b.roll = 0
        eb[bn] = b
    for bn, (h, t, p) in BONES.items():
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
        'fur': C.principled(f"fur_{fur}", fur, rough=0.55, sss=0.12, coat=0.12, sheen=0.4),
        'light': C.principled(f"light_{light}", light, rough=0.5, sss=0.15, coat=0.12, sheen=0.3),
        'dark': C.principled(f"dark_{dark}", dark, rough=0.6, sheen=0.3),
        'inner': C.principled('inner_ear', '#f2a3b4', rough=0.5),
        'eye': C.principled('eye', '#1a0f0a', rough=0.12, coat=1.0),
        'white': C.principled('eye_hi', '#ffffff', rough=0.3, emit='#ffffff', emit_strength=1.2),
        'nose': C.principled('nose', '#24140d', rough=0.25, coat=0.8),
        'blush': C.principled('blush', '#f59a9a', rough=0.6),
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
        for v in [v for v in bm.verts if v.co.z < HEAD_C.z + 0.15 and v.co.y < HEAD_C.y - 0.05]:   # 얼굴(눈 z≈0.66)은 열어 둔다
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
        out.append(C.mesh_obj('bow', C.tube(pts, 0.016, seg=10), wood, coll, outline=OUT * 0.6))
        out.append(C.mesh_obj('string', C.tube([pts[0], pts[-1]], 0.004, seg=6), _accent('string', '#f5f0e6'), coll))
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
    # 게임 크기(키 60~80px)에서 무기가 읽히게 그립 기준 1.35배 (2026-10-16 관문 — 미아 도끼·단검이 점처럼 보였다)
    s = WEAPON_SCALE.get(kind, 1.35)
    for o in out:
        me = o.data
        for v in me.vertices:
            v.co = g + (v.co - g) * s
    return out


WEAPON_SCALE = {'shield': 1.15, 'guitar': 1.15, 'spear': 1.05, 'lance': 1.0, 'trident': 1.1, 'shovel': 1.1, 'staff': 1.1, 'bow': 0.9}   # 긴 무기는 칸을 넘어 캐릭터 전체가 줄었다


def build(name, cfg, coll=None):
    coll = coll or C.collection(name)
    M = _mats(cfg)
    arm = _armature(name, coll)
    parts = {k: [] for k in BONES}

    def add(bone, o):
        parts[bone].append(o)

    # 머리
    add('head', C.mesh_obj('head', C.ellipsoid(HEAD_C, HEAD_R, egg=0.08), M['fur'], coll, outline=OUT))
    add('head', C.mesh_obj('muzzle', C.ellipsoid(HEAD_C + Vector((0, -0.24, -0.1)), (0.16, 0.115, 0.115)), M['light'], coll, outline=OUT))
    add('head', C.mesh_obj('nose', C.ellipsoid(HEAD_C + Vector((0, -0.36, -0.05)), (0.045, 0.03, 0.03)), M['nose'], coll))
    for sx in (-1, 1):
        add('head', C.mesh_obj(f'tooth{sx}', C.box(HEAD_C + Vector((sx * 0.018, -0.338, -0.17)), (0.03, 0.016, 0.05), bevel=0.006), M['tooth'], coll, outline=OUT * 0.5))
    # 눈 · 하이라이트 · 볼 · 귀
    for sx in (-1, 1):
        p, n = C.on_ellipsoid(HEAD_C, HEAD_R, Vector((sx * 0.36, -1.0, 0.13)))
        rot = C.look_rot(n)
        add('head', C.mesh_obj(f'eye{sx}', C.ellipsoid(p - n * 0.012, (0.064, 0.08, 0.03), rot=rot), M['eye'], coll))
        add('head', C.mesh_obj(f'eyehi{sx}', C.ellipsoid(p + n * 0.018 + Vector((-0.018, 0, 0.032)), (0.024, 0.024, 0.006), rot=rot), M['white'], coll))
        bp, bn = C.on_ellipsoid(HEAD_C, HEAD_R, Vector((sx * 0.68, -0.85, -0.16)))
        add('head', C.mesh_obj(f'blush{sx}', C.ellipsoid(bp - bn * 0.008, (0.055, 0.035, 0.012), rot=C.look_rot(bn)), M['blush'], coll))
        ep = HEAD_C + Vector((sx * 0.26, 0.05, 0.235))
        add('head', C.mesh_obj(f'ear{sx}', C.ellipsoid(ep, (0.078, 0.045, 0.072)), M['fur'], coll, outline=OUT))
        add('head', C.mesh_obj(f'earin{sx}', C.ellipsoid(ep + Vector((0, -0.03, 0)), (0.048, 0.02, 0.044)), M['inner'], coll))
    if cfg.get('tuft', True):
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
    for o in hat(cfg.get('hat', 'none'), cfg, coll):
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
            add('body', o)
    # 무기
    if cfg.get('weapon_r'):
        for o in weapon(cfg['weapon_r'], HAND_R, coll, cfg.get('weapon_color', '#cfd6df'), cfg.get('weapon_wood', '#8a5a2b')):
            add('hand.R', o)
    if cfg.get('weapon_l'):
        for o in weapon(cfg['weapon_l'], HAND_L, coll, cfg.get('weapon_l_color', cfg.get('weapon_color', '#cfd6df')), cfg.get('weapon_wood', '#8a5a2b')):
            add('hand.L', o)
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
    pb['leg.R'].rotation_quaternion = _rot_local(arm, 'leg.R', X, -P.get('leg_r', 0))
    pb['leg.L'].rotation_quaternion = _rot_local(arm, 'leg.L', X, -P.get('leg_l', 0))
    pb['tail'].rotation_quaternion = _rot_local(arm, 'tail', X, P.get('tail', 0))
    pb['root'].location = (P.get('dx', 0), P.get('dz', 0), P.get('dy', 0))   # 뼈 로컬: X 옆 · Y 위 · Z 앞(-Y 월드)
    bpy.context.view_layer.update()
