"""스킬 아이콘 · 성문 방어 화살 (2026-10-16 2차, 사용자: "스킬 아이콘 그림도 그대로 — 부족한 부분 마저").
blender -b -P art-gen/blender/icons.py -- [hunt|dodge|arrows] …   → art-gen/out/b3d-icons/<set>/<id>.png
예전 아이콘은 SDXL 콜라주(한 칸에 물건 여러 개 · 회색 안개)였다 → 원소색 메달 + 가운데 3D 상징 하나, 캐릭터와 같은 잉크 외곽선.
"""
import bpy
import sys
import os
import math
from mathutils import Vector, Euler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import bcommon as C
from lib.beaver import weapon, spline, interp

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
O = 0.018   # 외곽선

EL = {   # 메달 안쪽 색(위, 아래) · 테두리
    'blade': ('#e6edf5', '#8aa0b8'), 'fire': ('#ffcf7a', '#e8541f'), 'wind': ('#bff5e6', '#1fa89a'),
    'earth': ('#ffe2a0', '#b9741f'), 'light': ('#fff6b8', '#f2b81f'), 'water': ('#bfe6ff', '#2f86e0'),
    'ice': ('#e8fbff', '#5ec8e8'), 'bolt': ('#fff3a0', '#e0a81f'), 'poison': ('#e2f7b8', '#6aa81f'),
    'holy': ('#fffbe0', '#f0c84a'), 'shadow': ('#d8c8ff', '#6a3ac8'), 'meteor': ('#ffc89a', '#d8461f'), 'basic': ('#f2e2c0', '#a8783f'),
}


def mat(name, color, rough=0.4, metal=0.0, emit=None, es=0.0):
    return C.principled(f'ic_{name}_{color}_{metal}_{es}', color, rough=rough, metal=metal, coat=0.3, emit=emit, emit_strength=es)


def ob(name, bm, m, outline=O):
    return C.mesh_obj(name, bm, m, outline=outline)


def medal(el):
    top, bot = EL[el]
    # 테두리 — 금빛 고리 + 안쪽 원판(원소색, 위가 밝다 — 두 겹)
    ob('rim', C.torus(Vector((0, 0.05, 0)), 0.86, 0.075, seg=64, rot=Euler((math.radians(90), 0, 0))), mat('gold', '#e8b23a', 0.3, 0.8))
    ob('disc', C.ellipsoid(Vector((0, 0.1, 0)), (0.84, 0.04, 0.84), seg=64, rings=16), mat('disc_' + el, bot, 0.6), outline=0)
    ob('disc2', C.ellipsoid(Vector((0, 0.07, 0.12)), (0.66, 0.03, 0.62), seg=64, rings=16), mat('disc2_' + el, top, 0.6, emit=top, es=0.25), outline=0)


# ── 상징 조각 ──
def acorn(c, s=1.0, rot=0.0):
    R = Euler((0, rot, 0))
    ob('nut', C.ellipsoid(c + Vector((0, 0, -0.06 * s)), (0.2 * s, 0.18 * s, 0.24 * s), egg=-0.3, rot=R), mat('nut', '#c8783a', 0.45))
    ob('cap', C.ellipsoid(c + Vector((0, 0, 0.12 * s)), (0.24 * s, 0.21 * s, 0.12 * s), rot=R), mat('cap', '#7a4a26', 0.7))
    ob('stem', C.tube([c + Vector((0, 0, 0.22 * s)), c + Vector((0.03 * s, 0, 0.32 * s))], 0.03 * s, seg=10), mat('stem', '#5a3418', 0.6), O * 0.6)


def drum(c, s=1.0, color='#d8402f', glow=None):
    ob('drum_body', C.tube([c + Vector((0, 0, -0.16 * s)), c + Vector((0, 0, 0.16 * s))], 0.3 * s, seg=40), mat('drumb', color, 0.45, emit=glow, es=1.5 if glow else 0))
    ob('drum_top', C.ellipsoid(c + Vector((0, 0, 0.165 * s)), (0.3 * s, 0.3 * s, 0.02 * s)), mat('head', '#f6ead2', 0.5))
    for z in (-0.13, 0.13):
        ob(f'drum_ring{z}', C.torus(c + Vector((0, 0, z * s)), 0.305 * s, 0.025 * s, seg=40), mat('gold', '#e8b23a', 0.3, 0.8), O * 0.5)


def log(c, s=1.0, rot=0.0):
    R = Euler((0, rot, 0))
    d = R.to_matrix() @ Vector((1, 0, 0))
    ob('log', C.tube([c - d * 0.42 * s, c + d * 0.42 * s], 0.15 * s, seg=24), mat('bark', '#8a5a2b', 0.75))
    ob('logend', C.ellipsoid(c + d * 0.425 * s, (0.02, 0.135 * s, 0.135 * s), rot=Euler((0, rot, 0))), mat('wood', '#e8c08a', 0.6), O * 0.6)


def flames(c, s=1.0, n=3, color='#ff7a2a'):
    for k in range(n):
        x = (k - (n - 1) / 2) * 0.16 * s
        h = (0.42 if k == (n - 1) // 2 else 0.3) * s
        pts = spline([c + Vector((x, -0.05, 0)), c + Vector((x - 0.04 * s, -0.05, h * 0.5)), c + Vector((x + 0.03 * s, -0.05, h))], 10)
        ob(f'flame{k}', C.tube(pts, interp([0.11 * s, 0.08 * s, 0.0], len(pts)), seg=16), mat('flame', color, 0.3, emit=color, es=1.1), O * 0.7)
        pts2 = [p + Vector((0, -0.05, -0.02)) for p in pts[:7]]
        ob(f'flamec{k}', C.tube(pts2, interp([0.05 * s, 0.035 * s, 0.0], len(pts2)), seg=12), mat('flamec', '#fff0a0', 0.3, emit='#fff0a0', es=1.6), 0)


def droplet(c, s=1.0, color='#4ab0ff'):
    """물방울 — 둥근 아래(구) + 위로 뾰족한 끝(구에 맞닿은 원뿔). 예전 관 모양은 마름모로 보였다"""
    R = 0.2 * s
    m = mat('drop', color, 0.08, emit=color, es=0.4)
    ob('drop', C.ellipsoid(c + Vector((0, 0, -0.04 * s)), (R, R * 0.9, R)), m)
    ob('droptip', C.cone(c + Vector((0, 0, 0.12 * s)), R * 0.86, 0.0, 0.3 * s, seg=32), m)
    ob('drophi', C.ellipsoid(c + Vector((-0.07 * s, -R * 0.95, 0.0)), (0.035 * s, 0.01, 0.06 * s)), mat('hi', '#ffffff', 0.2, emit='#ffffff', es=2), 0)


def crystal(c, s=1.0, color='#8ae8ff', rot=0.0):
    R = Euler((0, rot, 0))
    ob('crys', C.cone(c + (R.to_matrix() @ Vector((0, 0, 0.12 * s))), 0.14 * s, 0.0, 0.42 * s, seg=6, rot=R), mat('crys', color, 0.1, emit=color, es=0.8))
    ob('crys2', C.cone(c + (R.to_matrix() @ Vector((0, 0, -0.14 * s))), 0.14 * s, 0.0, 0.2 * s, seg=6, rot=Euler((math.pi, rot, 0))), mat('crys', color, 0.1, emit=color, es=0.8))


def star(c, s=1.0, color='#ffd34d', pts=5):
    import bmesh
    bm = bmesh.new()
    vs = []
    for k in range(pts * 2):
        a = math.pi / 2 + k * math.pi / pts
        r = (0.4 if k % 2 == 0 else 0.17) * s
        vs.append(bm.verts.new(c + Vector((r * math.cos(a), 0, r * math.sin(a)))))
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]:
        v.co.y -= 0.1 * s
    bm.normal_update()
    o = ob('star', bm, mat('star', color, 0.3, 0.3, emit=color, es=1.2))
    o.data.polygons.foreach_set('use_smooth', [False] * len(o.data.polygons))


def bolt_shape(c, s=1.0, color='#ffe14a'):
    pts = [(0.12, 0.42), (-0.12, 0.04), (0.04, 0.04), (-0.1, -0.42), (0.16, -0.02), (0.0, -0.02), (0.14, 0.42)]
    import bmesh
    bm = bmesh.new()
    vs = [bm.verts.new(c + Vector((x * s, 0, z * s))) for x, z in pts]
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]:
        v.co.y -= 0.08 * s
    bm.normal_update()
    ob('bolt', bm, mat('bolt', color, 0.3, emit=color, es=2.0))


def moon(c, s=1.0, color='#e8443a'):
    """초승달 — 바깥 반원(왼쪽)과 오른쪽으로 비낀 안쪽 반원 사이를 채우고 두께를 준다"""
    import bmesh
    bm = bmesh.new()
    pts = [c + Vector((0.36 * s * math.cos(a), 0, 0.36 * s * math.sin(a))) for a in [math.pi / 2 + math.pi * k / 20 for k in range(21)]]
    pts += [c + Vector((0.1 * s + 0.24 * s * math.cos(a), 0, 0.33 * s * math.sin(a))) for a in [math.pi / 2 + math.pi * k / 20 for k in range(19, 0, -1)]]
    f = bm.faces.new([bm.verts.new(p) for p in pts])
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]:
        v.co.y -= 0.1 * s
    bm.normal_update()
    ob('moon', bm, mat('moon', color, 0.35, emit=color, es=1.0))


def shield(c, s=1.0, color='#8a5a2b'):
    ob('shield', C.ellipsoid(c, (0.34 * s, 0.07 * s, 0.4 * s), egg=-0.25), mat('shield', color, 0.6))
    for k in range(3):
        ob(f'plank{k}', C.box(c + Vector(((k - 1) * 0.2 * s, -0.07 * s, 0)), (0.02 * s, 0.01, 0.6 * s)), mat('plk', '#5a3418', 0.7), 0)
    ob('boss', C.ellipsoid(c + Vector((0, -0.09 * s, 0.03 * s)), (0.09 * s, 0.04 * s, 0.09 * s)), mat('gold', '#e8b23a', 0.3, 0.8), O * 0.6)


def teeth(c, s=1.0):
    for sx in (-1, 1):
        ob(f'tooth{sx}', C.box(c + Vector((sx * 0.13 * s, 0, -0.02 * s)), (0.24 * s, 0.1 * s, 0.5 * s), bevel=0.06 * s), mat('tooth', '#fffaf0', 0.3))
    ob('gum', C.ellipsoid(c + Vector((0, 0.02, 0.24 * s)), (0.34 * s, 0.1 * s, 0.1 * s)), mat('gum', '#e87a8a', 0.5))


def leaf(c, s=1.0, color='#5ac83a', rot=0.0):
    pts = spline([c + Vector((-0.3 * s, 0, -0.25 * s)), c + Vector((0, 0, 0.05 * s)), c + Vector((0.3 * s, 0, 0.32 * s))], 14)
    o = ob('leaf', C.tube(pts, interp([0.01, 0.2 * s, 0.01], len(pts)), seg=20), mat('leaf', color, 0.45, emit=color, es=0.4))
    o.scale = (1, 0.35, 1)
    ob('vein', C.tube(pts, 0.012 * s, seg=8), mat('vein', '#2f7a2a', 0.5), 0)


def swirl(c, s=1.0, color='#3fd0c0', turns=1.4):
    pts = []
    for k in range(40):
        u = k / 39
        a = u * turns * 2 * math.pi
        r = (0.08 + 0.3 * u) * s
        pts.append(c + Vector((r * math.cos(a), -0.02 * u, r * math.sin(a))))
    ob('swirl', C.tube(pts, interp([0.02 * s, 0.07 * s, 0.03 * s], len(pts)), seg=12), mat('swirl', color, 0.2, emit=color, es=1.2))


def thorns(c, s=1.0):
    ob('vine', C.torus(c, 0.3 * s, 0.05 * s, seg=40, rot=Euler((math.radians(90), 0, 0))), mat('vine', '#4a7a2a', 0.6))
    for k in range(8):
        a = k * math.pi / 4
        p = c + Vector((0.3 * s * math.cos(a), 0, 0.3 * s * math.sin(a)))
        ob(f'thorn{k}', C.cone(p + Vector((0.06 * s * math.cos(a), 0, 0.06 * s * math.sin(a))), 0.05 * s, 0.0, 0.14 * s, seg=8, rot=C.look_rot(Vector((math.cos(a), 0, math.sin(a))))), mat('thorn', '#e8d8b0', 0.4), O * 0.6)


def arrow_obj(c, s=1.0, rot=-45, tip='#cfd6df', shaft='#8a5a2b', fletch='#ef5a5a', glow=None):
    R = Euler((0, math.radians(rot), 0))
    d = R.to_matrix() @ Vector((0, 0, 1))
    ob('shaft', C.tube([c - d * 0.4 * s, c + d * 0.3 * s], 0.025 * s, seg=10), mat('shaft', shaft, 0.6), O * 0.6)
    ob('tip', C.cone(c + d * 0.38 * s, 0.07 * s, 0.0, 0.18 * s, seg=4, rot=R), mat('tip', tip, 0.25, 0.7, emit=glow, es=2 if glow else 0), O * 0.6)
    n = R.to_matrix() @ Vector((1, 0, 0))
    for sx in (-1, 1):
        ob(f'fl{sx}', C.ellipsoid(c - d * 0.34 * s + n * sx * 0.05 * s, (0.05 * s, 0.01, 0.11 * s), rot=R), mat('fl', fletch, 0.5), O * 0.5)


# ── 성문(댐) 방어 스킬 무기 (2026-11-09, 사용자: "댐 방어전 스킬 ui 조금 더 고급지고 스킬에 연관된 거로 퀄 좋게") ──
# 예전 상징은 화살 · 공 · 별이라 화염 · 물살 · 독침 · 기본이 모두 '화살'로 보였다 → 스킬 이름의 무기를 그대로(석궁 · 작살 · 지팡이 · 투석기 · 창 · 부메랑 · 단궁 · 홀 · 표창 · 낙하포)
def _dir(deg):
    """화면 안 방향 — 0° 위, 양수는 시계 방향(오른쪽으로). (회전, 진행 방향 d, 그 옆 n)"""
    R = Euler((0, math.radians(deg), 0))
    return R, R.to_matrix() @ Vector((0, 0, 1)), R.to_matrix() @ Vector((1, 0, 0))


def _steel(glow=None, es=0.0, c='#dfe6ee'):
    return mat('steel', c, 0.22, 0.85, emit=glow, es=es)


def _gold():
    return mat('gold', '#e8b23a', 0.3, 0.8)


def crossbow(c, deg=40):
    """화염 석궁 — 각목 개머리 · 앞의 휜 활 몸 · 당긴 시위 · 불붙은 볼트"""
    R, d, n = _dir(deg)
    ob('cb_stock', C.box(c - d * 0.06, (0.11, 0.08, 0.6), bevel=0.025, rot=R), mat('cbw', '#7a4a26', 0.55))
    f = c + d * 0.18
    pts = spline([f - n * 0.36 - d * 0.12, f - n * 0.18 + d * 0.01, f + d * 0.04, f + n * 0.18 + d * 0.01, f + n * 0.36 - d * 0.12], 16)
    ob('cb_prod', C.tube(pts, interp([0.034, 0.05, 0.058, 0.05, 0.034], len(pts)), seg=12), mat('cbp', '#3a2a22', 0.35, 0.45))
    for sx in (-1, 1):
        ob(f'cb_str{sx}', C.tube([f + n * sx * 0.35 - d * 0.12, c - d * 0.05], 0.008, seg=6), mat('str', '#f6ecd2', 0.6), O * 0.4)
        ob(f'cb_cap{sx}', C.ellipsoid(f + n * sx * 0.36 - d * 0.12, (0.03, 0.03, 0.03)), _gold(), O * 0.4)
    ob('cb_bolt', C.tube([c - d * 0.06, c + d * 0.3], 0.026, seg=8), mat('cbb', '#5a2a12', 0.6), O * 0.5)
    ob('cb_tip', C.cone(c + d * 0.36, 0.06, 0.0, 0.14, seg=4, rot=R), _steel('#ff7a2a', 2.2, '#ff9a4a'), O * 0.6)
    ob('cb_trig', C.box(c - d * 0.2 - n * 0.06, (0.05, 0.03, 0.09), rot=R), _gold(), O * 0.4)
    flames(c + d * 0.36 + Vector((0.0, -0.06, 0.02)), 0.36, color='#ff6a1f')


def harpoon(c, deg=40):
    """물살 작살 — 긴 자루 · 미늘 둘 · 감긴 밧줄 · 물방울"""
    R, d, n = _dir(deg)
    ob('hp_shaft', C.tube([c - d * 0.48, c + d * 0.2], 0.038, seg=12), mat('hpw', '#5a4a3a', 0.6))
    ob('hp_head', C.cone(c + d * 0.3, 0.095, 0.0, 0.26, seg=4, rot=R), _steel('#4ab0ff', 0.6))
    for sx in (-1, 1):
        ob(f'hp_barb{sx}', C.cone(c + d * 0.2 + n * sx * 0.07, 0.03, 0.0, 0.13, seg=4, rot=Euler((0, math.radians(deg + sx * 155), 0))), _steel(), O * 0.6)
    ob('hp_band', C.torus(c + d * 0.17, 0.038, 0.012, seg=24, rot=R), _gold(), O * 0.4)
    ob('hp_coil', C.torus(c - d * 0.3 + n * 0.12, 0.1, 0.022, seg=32, rot=Euler((math.radians(90), 0, 0))), mat('rope', '#d8b47a', 0.7), O * 0.5)
    droplet(c + d * 0.42 + n * 0.12, 0.3)
    droplet(c + d * 0.24 - n * 0.2, 0.24, '#8ad8ff')


def frost_staff(c, deg=-12):
    """서리 지팡이 — 짙은 자루 · 위로 벌어진 은 갈래 · 얼음 결정"""
    R, d, n = _dir(deg)
    ob('fs_shaft', C.tube([c - d * 0.5, c + d * 0.17], 0.042, seg=12), mat('fsw', '#3e3456', 0.5))
    ob('fs_band', C.torus(c + d * 0.15, 0.045, 0.014, seg=24, rot=R), _gold(), O * 0.4)
    for sx in (-1, 1):
        pts = spline([c + d * 0.16, c + d * 0.24 + n * sx * 0.14, c + d * 0.36 + n * sx * 0.13], 10)
        ob(f'fs_prong{sx}', C.tube(pts, interp([0.03, 0.026, 0.01], len(pts)), seg=8), _steel(c='#e6eef8'), O * 0.5)
    crystal(c + d * 0.24, 0.86, '#2aa8f0', math.radians(deg))
    crystal(c - n * 0.24 - d * 0.02, 0.24, '#e0faff', math.radians(30))
    crystal(c + n * 0.22 - d * 0.18, 0.2, '#e0faff', math.radians(-25))


def catapult(c):
    """바위 투석기 — 바퀴 달린 받침 · 기둥 · 젖혀진 팔 끝 바위"""
    wood, dark = mat('ctw', '#8a5a2b', 0.6), mat('ctd', '#5a3418', 0.7)
    b = c + Vector((0.0, 0.0, -0.28))
    ob('ct_base', C.box(b, (0.64, 0.1, 0.07), bevel=0.015), wood)
    for sx in (-1, 1):
        ob(f'ct_wheel{sx}', C.torus(b + Vector((sx * 0.23, -0.08, -0.05)), 0.085, 0.026, seg=24, rot=Euler((math.radians(90), 0, 0))), dark, O * 0.5)
        ob(f'ct_hub{sx}', C.ellipsoid(b + Vector((sx * 0.23, -0.1, -0.05)), (0.03, 0.02, 0.03)), _gold(), O * 0.3)
    ob('ct_post', C.box(b + Vector((0.1, 0.0, 0.15)), (0.06, 0.06, 0.3), bevel=0.01), wood)
    piv = b + Vector((0.1, -0.04, 0.29))
    R, d, n = _dir(-56)
    ob('ct_arm', C.box(piv + d * 0.17, (0.05, 0.05, 0.52), bevel=0.01, rot=R), wood)
    cup = piv + d * 0.4
    ob('ct_cup', C.ellipsoid(cup, (0.1, 0.07, 0.05), rot=R), dark)
    ob('ct_rock', C.ellipsoid(cup + Vector((0.0, -0.05, 0.09)), (0.13, 0.11, 0.12)), mat('rock', '#8a7a62', 0.85))
    ob('ct_rope', C.torus(piv, 0.045, 0.013, seg=20, rot=Euler((math.radians(90), 0, 0))), mat('rope', '#d8b47a', 0.7), O * 0.4)
    for k, (dx, dz, r) in enumerate(((0.12, 0.34, 0.04), (0.24, 0.26, 0.03))):
        ob(f'ct_peb{k}', C.ellipsoid(c + Vector((dx, -0.08, dz)), (r, r * 0.9, r)), mat('rock', '#8a7a62', 0.85), O * 0.4)


def bolt_spear(c, deg=40):
    """번개 창 — 짙은 자루 · 금 띠 · 노란 빛 나는 잎날 · 옆을 가르는 번개"""
    R, d, n = _dir(deg)
    ob('bs_shaft', C.tube([c - d * 0.5, c + d * 0.18], 0.038, seg=12), mat('bsw', '#3a2a5a', 0.5))
    for t in (0.17, -0.12):
        ob(f'bs_band{t}', C.torus(c + d * t, 0.036, 0.012, seg=24, rot=R), _gold(), O * 0.4)
    ob('bs_blade', C.ellipsoid(c + d * 0.3, (0.09, 0.03, 0.17), rot=R), _steel('#ffe14a', 0.9, '#fff7c0'))
    ob('bs_tip', C.cone(c + d * 0.44, 0.045, 0.0, 0.11, seg=4, rot=R), _steel('#ffe14a', 1.2, '#fff7c0'), O * 0.5)
    bolt_shape(c + n * 0.18 + d * 0.04 + Vector((0, -0.06, 0)), 0.72)


def boomerang(c):
    """질풍 부메랑 — 꺾인 나무 날개 둘(청록 줄) · 뒤의 바람 소용돌이"""
    wood = mat('bmw', '#c8873a', 0.5)
    stripe = mat('bms', '#1fa89a', 0.4, emit='#3ff0c4', es=0.6)
    apex = c + Vector((0.02, 0.0, 0.2))
    swirl(c + Vector((0.0, 0.12, -0.06)), 0.85)
    for sx, deg in ((-1, -118), (1, 118)):
        R, d, n = _dir(deg)
        ob(f'bm_arm{sx}', C.box(apex + d * 0.22, (0.12, 0.05, 0.46), bevel=0.04, rot=R), wood)
        ob(f'bm_str{sx}', C.box(apex + d * 0.22 + Vector((0, -0.03, 0)), (0.035, 0.01, 0.32), rot=R), stripe, 0)
    ob('bm_apex', C.ellipsoid(apex, (0.075, 0.05, 0.075)), wood)


def short_bow(c, wood='#4a2a5a', tip='#9ad04a', glow='#9ad04a', poison=True):
    """독침 단궁(또는 기본 활) — 오른쪽으로 불룩한 짧은 활 · 당긴 시위 · 걸린 화살 · 독 방울"""
    V = Vector
    pts = spline([c + V((-0.06, 0, -0.38)), c + V((0.12, 0, -0.2)), c + V((0.17, 0, 0)), c + V((0.12, 0, 0.2)), c + V((-0.06, 0, 0.38))], 18)
    ob('sb_bow', C.tube(pts, interp([0.028, 0.045, 0.055, 0.045, 0.028], len(pts)), seg=10), mat('sbw', wood, 0.5))
    for sz in (-1, 1):
        ob(f'sb_tip{sz}', C.ellipsoid(c + V((-0.06, 0, sz * 0.38)), (0.03, 0.03, 0.03)), _gold(), O * 0.4)
        ob(f'sb_str{sz}', C.tube([c + V((-0.06, 0, sz * 0.37)), c + V((-0.22, 0, 0))], 0.008, seg=6), mat('str', '#f6ecd2', 0.6), O * 0.4)
    R = Euler((0, math.radians(90), 0))
    ob('sb_arrow', C.tube([c + V((-0.24, 0, 0)), c + V((0.32, 0, 0))], 0.024, seg=8), mat('sba', '#6a4a2a', 0.6), O * 0.5)
    ob('sb_head', C.cone(c + V((0.37, 0, 0)), 0.055, 0.0, 0.13, seg=4, rot=R), _steel(glow, 1.8 if poison else 0.0, tip), O * 0.5)
    for sz in (-1, 1):
        ob(f'sb_fl{sz}', C.ellipsoid(c + V((-0.2, 0, sz * 0.04)), (0.07, 0.01, 0.03)), mat('fl', '#7a3ac8' if poison else '#ef5a5a', 0.5), O * 0.4)
    if poison:
        droplet(c + V((0.34, -0.06, -0.16)), 0.26, '#9ad04a')
        ob('sb_bub', C.ellipsoid(c + V((0.22, -0.08, -0.26)), (0.05, 0.05, 0.05)), mat('bub', '#b8f05a', 0.1, emit='#b8f05a', es=1.2), O * 0.4)


def holy_scepter(c):
    """성광 홀 — 금 자루 · 빛나는 구슬 · 흰 날개 둘 · 뒤의 광륜"""
    V = Vector
    ob('hs_halo', C.torus(c + V((0, 0.08, 0.22)), 0.27, 0.022, seg=48, rot=Euler((math.radians(90), 0, 0))), mat('halo', '#ffe08a', 0.3, emit='#ffe08a', es=1.4), O * 0.4)
    ob('hs_shaft', C.tube([c + V((0, 0, -0.48)), c + V((0, 0, 0.1))], 0.038, seg=12), _gold())
    ob('hs_grip', C.tube([c + V((0, 0, -0.3)), c + V((0, 0, -0.14))], 0.034, seg=12), mat('grip', '#f6ecd2', 0.6), O * 0.4)
    ob('hs_gem', C.ellipsoid(c + V((0, -0.02, -0.5)), (0.045, 0.04, 0.045)), mat('gem', '#ff6a8a', 0.15, emit='#ff6a8a', es=0.6), O * 0.4)
    for sx in (-1, 1):
        ob(f'hs_wing{sx}', C.ellipsoid(c + V((sx * 0.19, 0.02, 0.2)), (0.14, 0.03, 0.065), rot=Euler((0, math.radians(sx * -28), 0))), mat('wing', '#fffaf0', 0.5))
        ob(f'hs_wing2{sx}', C.ellipsoid(c + V((sx * 0.16, 0.01, 0.12)), (0.11, 0.025, 0.05), rot=Euler((0, math.radians(sx * -12), 0))), mat('wing', '#fffaf0', 0.5), O * 0.6)
    ob('hs_cradle', C.torus(c + V((0, -0.01, 0.24)), 0.13, 0.02, seg=32, rot=Euler((math.radians(90), 0, 0))), _gold(), O * 0.4)
    ob('hs_orb', C.ellipsoid(c + V((0, -0.03, 0.24)), (0.115, 0.115, 0.115)), mat('orb', '#fff6b8', 0.15, emit='#fff6b8', es=1.5))


def shuriken(c):
    """그림자 표창 — 네 날 쇠 별(보라 빛 날) · 금 가운데 고리 · 도는 보라 잔상"""
    for k in range(4):
        R, d, n = _dir(45 + 90 * k)
        ob(f'sk_blade{k}', C.cone(c + d * 0.17, 0.12, 0.0, 0.34, seg=4, rot=R), mat('skb', '#4a4a62', 0.25, 0.75, emit='#b07aff', es=0.35))
    ob('sk_ring', C.torus(c + Vector((0, -0.04, 0)), 0.075, 0.022, seg=28, rot=Euler((math.radians(90), 0, 0))), _gold(), O * 0.4)
    ob('sk_hole', C.ellipsoid(c + Vector((0, -0.05, 0)), (0.04, 0.01, 0.04)), mat('hole', '#1a1428', 0.8), 0)
    for k, (a0, a1, r) in enumerate(((200, 290, 0.43), (20, 110, 0.43))):
        pts = [c + Vector((r * math.sin(math.radians(a)), 0.06, r * math.cos(math.radians(a)))) for a in range(a0, a1 + 1, 6)]
        ob(f'sk_trail{k}', C.tube(pts, interp([0.0, 0.022, 0.0], len(pts)), seg=8), mat('trail', '#a06aff', 0.3, emit='#a06aff', es=1.6), 0)


def meteor_cannon(c, deg=48):
    """운석 낙하포 — 쇠 포신 · 금 고리 · 나무 받침 바퀴 · 불붙은 운석"""
    R, d, n = _dir(deg)
    iron = mat('iron', '#3a3a48', 0.35, 0.6)
    ob('mc_barrel', C.cone(c - d * 0.08, 0.13, 0.1, 0.46, seg=28, rot=R), iron)
    for t, r in ((0.14, 0.108), (-0.28, 0.135)):
        ob(f'mc_ring{t}', C.torus(c + d * t, r, 0.022, seg=28, rot=R), _gold(), O * 0.4)
    ob('mc_cart', C.box(c + Vector((-0.06, 0.03, -0.26)), (0.34, 0.08, 0.08), bevel=0.012), mat('mcw', '#7a4a26', 0.6))
    ob('mc_wheel', C.torus(c + Vector((-0.08, -0.08, -0.31)), 0.09, 0.026, seg=24, rot=Euler((math.radians(90), 0, 0))), mat('mcd', '#5a3418', 0.7), O * 0.5)
    met = c + d * 0.36 + Vector((0.0, -0.06, 0.0))
    ob('mc_met', C.ellipsoid(met, (0.11, 0.1, 0.1)), mat('met', '#6a4a3a', 0.8, emit='#ff7a2a', es=0.5))
    flames(met + Vector((-0.02, -0.02, -0.1)), 0.45, color='#ff5a1f')


def sword_obj(c, deg=35):
    """기본 사격 · 검 — 곧은 날 · 금 코등이 · 가죽 손잡이 · 보석 끝"""
    R, d, n = _dir(deg)
    ob('sw_blade', C.box(c + d * 0.08, (0.085, 0.022, 0.46), bevel=0.006, rot=R), _steel())
    ob('sw_tip', C.cone(c + d * 0.36, 0.062, 0.0, 0.14, seg=4, rot=R), _steel(), O * 0.6)
    ob('sw_fuller', C.box(c + d * 0.06 + Vector((0, -0.012, 0)), (0.016, 0.004, 0.34), rot=R), mat('fuller', '#9fb0c4', 0.3, 0.8), 0)
    ob('sw_guard', C.box(c - d * 0.17, (0.28, 0.05, 0.05), bevel=0.012, rot=R), _gold())
    ob('sw_grip', C.tube([c - d * 0.19, c - d * 0.34], 0.03, seg=10), mat('grip', '#6a3a1a', 0.6), O * 0.5)
    ob('sw_pommel', C.ellipsoid(c - d * 0.38, (0.045, 0.045, 0.045)), _gold(), O * 0.5)
    ob('sw_gem', C.ellipsoid(c - d * 0.17 + Vector((0, -0.03, 0)), (0.03, 0.015, 0.03)), mat('gem', '#e8443a', 0.15, emit='#e8443a', es=0.5), O * 0.3)


def plain_spear(c, deg=40):
    """기본 사격 · 창 — 나무 자루 · 잎날 · 금 띠 · 붉은 술"""
    R, d, n = _dir(deg)
    ob('ps_shaft', C.tube([c - d * 0.5, c + d * 0.18], 0.038, seg=12), mat('psw', '#8a5a2b', 0.6))
    ob('ps_band', C.torus(c + d * 0.17, 0.036, 0.012, seg=24, rot=R), _gold(), O * 0.4)
    ob('ps_blade', C.ellipsoid(c + d * 0.3, (0.09, 0.03, 0.17), rot=R), _steel())
    ob('ps_tip', C.cone(c + d * 0.44, 0.045, 0.0, 0.11, seg=4, rot=R), _steel(), O * 0.5)
    ob('ps_tassel', C.ellipsoid(c + d * 0.12 + n * 0.05, (0.05, 0.03, 0.08), rot=R), mat('tassel', '#e8443a', 0.6), O * 0.4)


def magic_staff(c, deg=-12):
    """기본 사격 · 지팡이 — 나무 자루 · 감싼 가지 · 보라 마력 구슬"""
    R, d, n = _dir(deg)
    ob('ms_shaft', C.tube([c - d * 0.5, c + d * 0.16], 0.042, seg=12), mat('msw', '#7a4a26', 0.6))
    for sx in (-1, 1):
        pts = spline([c + d * 0.12, c + d * 0.24 + n * sx * 0.12, c + d * 0.38 + n * sx * 0.02], 10)
        ob(f'ms_twig{sx}', C.tube(pts, interp([0.024, 0.02, 0.008], len(pts)), seg=8), mat('msw', '#7a4a26', 0.6), O * 0.5)
    ob('ms_orb', C.ellipsoid(c + d * 0.27, (0.14, 0.14, 0.14)), mat('orb', '#b07aff', 0.15, emit='#b07aff', es=1.2))
    ob('ms_band', C.torus(c + d * 0.1, 0.045, 0.014, seg=24, rot=R), _gold(), O * 0.4)


EMBLEM = {
    # 사냥터 스킬 20 — (원소, 그리기)
    'strike': ('blade', lambda: (drum(Vector((0.04, -0.2, -0.12)), 1.0), acorn(Vector((-0.22, -0.32, 0.3)), 0.7))),
    'pierce': ('blade', lambda: (log(Vector((0, -0.2, 0)), 1.0, math.radians(-30)), arrow_obj(Vector((0.28, -0.35, 0.22)), 0.6, -60))),
    'emberCut': ('fire', lambda: (log(Vector((0, -0.2, -0.22)), 0.9), flames(Vector((0, -0.25, -0.12)), 1.0))),
    'frostEdge': ('wind', lambda: (droplet(Vector((-0.1, -0.2, 0.0)), 1.2, '#8ad8ff'), crystal(Vector((0.26, -0.3, -0.12)), 0.6, '#e0faff', 0.4))),
    'crit': ('wind', lambda: (star(Vector((0.18, -0.32, 0.2)), 0.55, '#fff0a0'), log(Vector((-0.05, -0.2, -0.08)), 0.75, math.radians(35)))),
    'waterStep': ('wind', lambda: (droplet(Vector((-0.22, -0.2, 0.08)), 0.7), droplet(Vector((0.05, -0.22, -0.05)), 0.85), droplet(Vector((0.3, -0.24, -0.18)), 0.6))),
    'stoneGuard': ('earth', lambda: (shield(Vector((0, -0.2, 0)), 1.05), drum(Vector((0.26, -0.36, -0.28)), 0.45))),
    'galeChain': ('wind', lambda: swirl(Vector((0, -0.2, 0)), 1.25)),
    'clone': ('fire', lambda: (drum(Vector((-0.2, -0.18, -0.08)), 0.75), drum(Vector((0.22, -0.28, -0.14)), 0.75, '#e8742f'), flames(Vector((0.0, -0.4, 0.12)), 0.6))),
    'thunderLink': ('light', lambda: bolt_shape(Vector((0, -0.2, 0)), 1.25)),
    'bloodMoon': ('blade', lambda: moon(Vector((0.04, -0.2, 0.02)), 1.15)),
    'dragonBreath': ('fire', lambda: (drum(Vector((0, -0.2, -0.16)), 1.0, '#a8301f', glow='#ff7a2a'), flames(Vector((0, -0.3, 0.06)), 0.8, color='#ff5a1f'))),
    'warcry': ('light', lambda: star(Vector((0, -0.2, 0.02)), 1.15)),
    'meteor': ('fire', lambda: (flames(Vector((0.14, -0.2, 0.05)), 0.9), acorn(Vector((-0.12, -0.35, -0.14)), 1.1, 0.5))),
    'tidalBurst': ('wind', lambda: (shield(Vector((0, -0.18, 0.08)), 0.85, '#7a5a3a'), droplet(Vector((-0.14, -0.34, -0.26)), 0.6), droplet(Vector((0.16, -0.34, -0.28)), 0.6))),
    'voidFinish': ('blade', lambda: thorns(Vector((0, -0.2, 0)), 1.3)),
    'steel': ('earth', lambda: teeth(Vector((0, -0.2, -0.02)), 1.1)),
    'focus': ('blade', lambda: (C.mesh_obj('target', C.torus(Vector((0, -0.12, 0)), 0.42, 0.05, seg=48, rot=Euler((math.radians(90), 0, 0))), mat('tg', '#ef5a5a', 0.4), outline=O), acorn(Vector((0.02, -0.3, 0.0)), 0.75))),
    'guardianSoul': ('earth', lambda: (log(Vector((0, -0.2, -0.3)), 0.75), flames(Vector((0, -0.3, -0.1)), 0.9, color='#7fe8ff'))),
    'elementalMastery': ('light', lambda: (leaf(Vector((0, -0.2, 0)), 1.25), star(Vector((0.3, -0.36, 0.3)), 0.35, '#fff6b8'))),
    # 성문(댐) 방어 스킬 무기 12 + 기본 사격 무기 4 (2026-11-09) — 스킬 이름의 무기 그대로
    "d-basic": ("basic", lambda: arrow_obj(Vector((0, -0.2, 0)), 1.25)),
    "d-basic-sword": ("blade", lambda: sword_obj(Vector((0, -0.24, 0)))),
    "d-basic-spear": ("blade", lambda: plain_spear(Vector((0, -0.24, 0)))),
    "d-basic-bow": ("basic", lambda: short_bow(Vector((-0.04, -0.24, 0)), wood="#8a5a2b", tip="#cfd6df", glow=None, poison=False)),
    "d-basic-staff": ("shadow", lambda: magic_staff(Vector((0, -0.24, 0)))),
    "d-fire": ("fire", lambda: crossbow(Vector((0, -0.24, 0)))),
    "d-water": ("water", lambda: harpoon(Vector((0, -0.24, 0)))),
    "d-ice": ("ice", lambda: frost_staff(Vector((0, -0.24, 0)))),
    "d-earth": ("earth", lambda: catapult(Vector((0, -0.24, 0)))),
    "d-bolt": ("bolt", lambda: bolt_spear(Vector((0, -0.24, 0)))),
    "d-wind": ("wind", lambda: boomerang(Vector((0, -0.24, 0)))),
    "d-poison": ("poison", lambda: short_bow(Vector((-0.04, -0.24, 0)))),
    "d-holy": ("holy", lambda: holy_scepter(Vector((0, -0.24, 0)))),
    "d-shadow": ("shadow", lambda: shuriken(Vector((0, -0.24, 0)))),
    "d-meteor": ("meteor", lambda: meteor_cannon(Vector((0, -0.24, 0)))),
    "d-ultimate": ("light", lambda: (arrow_obj(Vector((-0.2, -0.22, 0.06)), 0.85, 205, tip="#ffd34d", glow="#ffd34d", fletch="#ffe08a"), arrow_obj(Vector((0.02, -0.26, 0.0)), 0.85, 215, tip="#ffd34d", glow="#ffd34d", fletch="#ffe08a"), arrow_obj(Vector((0.24, -0.3, -0.06)), 0.85, 225, tip="#ffd34d", glow="#ffd34d", fletch="#ffe08a"))),
}


def clear():
    for o in list(bpy.data.objects):
        if o.type == 'MESH':
            bpy.data.objects.remove(o, do_unlink=True)


def render_icon(key, out):
    clear()
    el, draw = EMBLEM[key]
    medal(el)
    before = {o.name for o in bpy.data.objects}
    draw()
    for o in bpy.data.objects:   # 상징을 메달 안쪽을 채우게 1.6배(메달 가운데 기준) — 처음 그림은 메달의 30% 만 차지했다
        if o.type == 'MESH' and o.name not in before:
            o.scale = (1.6, 1.6, 1.6)
    bpy.context.scene.render.filepath = out
    bpy.ops.render.render(write_still=True)


# ── 성문 방어 화살(수평, 촉이 오른쪽) ──
ARROWS = {
    'basic': dict(tip='#cfd6df', shaft='#8a5a2b', fletch='#ef5a5a'),
    'fire': dict(tip='#ff8a3a', shaft='#6a3a1a', fletch='#ffb347', glow='#ff7a2a', fx='flame'),
    'water': dict(tip='#5ab8ff', shaft='#3a5a8a', fletch='#8ad8ff', glow='#4ab0ff', fx='drop'),
    'ice': dict(tip='#c8f8ff', shaft='#5a8aa8', fletch='#e0faff', glow='#8ae8ff', fx='crys'),
    'earth': dict(tip='#a8907a', shaft='#6a4a2a', fletch='#c8a86a', fx='rock'),
    'bolt': dict(tip='#ffe14a', shaft='#8a6a2a', fletch='#fff3a0', glow='#ffe14a', fx='bolt'),
}


def render_arrow(key, out):
    clear()
    a = ARROWS[key]
    R = Euler((0, math.radians(90), 0))   # +Z → +X(오른쪽)
    d = Vector((1, 0, 0))
    ob('shaft', C.tube([Vector((-1.6, 0, 0)), Vector((1.0, 0, 0))], 0.07, seg=12), mat('shaft', a['shaft'], 0.6), O * 2)
    fx = a.get('fx')
    if fx == 'rock':
        ob('tip', C.ellipsoid(Vector((1.25, 0, 0)), (0.42, 0.3, 0.3)), mat('rock', a['tip'], 0.85), O * 2)
    elif fx == 'crys':
        ob('tip', C.cone(Vector((1.3, 0, 0)), 0.24, 0.0, 0.8, seg=6, rot=R), mat('tip', a['tip'], 0.1, emit=a.get('glow'), es=1.2), O * 2)
    else:
        ob('tip', C.cone(Vector((1.2, 0, 0)), 0.22, 0.0, 0.55, seg=4, rot=R), mat('tip', a['tip'], 0.25, 0.6, emit=a.get('glow'), es=2.0 if a.get('glow') else 0), O * 2)
    for sz in (-1, 1):
        ob(f'fl{sz}', C.ellipsoid(Vector((-1.35, 0, sz * 0.13)), (0.32, 0.03, 0.12)), mat('fl', a['fletch'], 0.5), O * 1.5)
    if fx == 'flame':
        for k in range(3):
            ob(f'f{k}', C.cone(Vector((0.7 - k * 0.45, -0.02, 0.06)), 0.16 - k * 0.03, 0.0, 0.6, seg=10, rot=Euler((0, math.radians(-90), 0))), mat('fl', '#ff9a3a', 0.3, emit='#ff7a2a', es=3.0), O)
    elif fx == 'drop':
        for k in range(3):
            ob(f'd{k}', C.ellipsoid(Vector((0.5 - k * 0.5, -0.02, 0.18 * (1 if k % 2 else -1))), (0.12, 0.05, 0.08)), mat('dr', '#8ad8ff', 0.1, emit='#4ab0ff', es=1.0), O)
    elif fx == 'bolt':
        pts = [Vector((-1.2 + k * 0.3, -0.03, 0.15 * (1 if k % 2 else -1))) for k in range(8)]
        ob('zz', C.tube(pts, 0.035, seg=8), mat('zz', '#fff3a0', 0.3, emit='#ffe14a', es=3.0), O)
    bpy.context.scene.render.filepath = out
    bpy.ops.render.render(write_still=True)


C.reset()
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['hunt', 'dodge', 'arrows']
C.lights(1.1)
for setname in argv:
    outdir = os.path.join(ROOT, 'art-gen', 'out', 'b3d-icons', setname)
    os.makedirs(outdir, exist_ok=True)
    if setname == 'arrows':
        C.setup_render(res=(640, 152), samples=40)
        cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = 3.6
        co = bpy.data.objects.new('cam', cam); bpy.context.scene.collection.objects.link(co)
        co.location = (-0.05, -6, 0); co.rotation_euler = Euler((math.radians(90), 0, 0)); bpy.context.scene.camera = co
        for k in ARROWS:
            render_arrow(k, os.path.join(outdir, f'{k}.png'))
        bpy.data.objects.remove(co, do_unlink=True)
    else:
        C.setup_render(res=(512, 512), samples=48)
        cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = 2.0
        co = bpy.data.objects.new('cam', cam); bpy.context.scene.collection.objects.link(co)
        co.location = (0, -6, 0.0); co.rotation_euler = Euler((math.radians(90), 0, 0)); bpy.context.scene.camera = co
        keys = [k for k in EMBLEM if (k.startswith('d-') if setname == 'dodge' else not k.startswith('d-'))]
        for k in keys:
            render_icon(k, os.path.join(outdir, f"{k[2:] if k.startswith('d-') else k}.png"))
        bpy.data.objects.remove(co, do_unlink=True)
    print('DONE', setname)
