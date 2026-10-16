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
    # 성문 방어 스킬 12
    'd-basic': ('basic', lambda: arrow_obj(Vector((0, -0.2, 0)), 1.25)),
    'd-fire': ('fire', lambda: (arrow_obj(Vector((0, -0.2, 0)), 1.15, tip='#ff7a2a', glow='#ff7a2a'), flames(Vector((0.18, -0.36, 0.16)), 0.5))),
    'd-water': ('water', lambda: (arrow_obj(Vector((0, -0.2, 0)), 1.15, tip='#4ab0ff', glow='#4ab0ff', fletch='#4ab0ff'), droplet(Vector((-0.24, -0.34, -0.22)), 0.55))),
    'd-ice': ('ice', lambda: crystal(Vector((0, -0.2, 0)), 1.3, '#a8f0ff', math.radians(-35))),
    'd-earth': ('earth', lambda: C.mesh_obj('boulder', C.ellipsoid(Vector((0, -0.2, 0)), (0.36, 0.3, 0.32)), mat('rock', '#8a7a62', 0.85), outline=O)),
    'd-bolt': ('bolt', lambda: bolt_shape(Vector((0, -0.2, 0)), 1.2)),
    'd-wind': ('wind', lambda: (swirl(Vector((0, -0.2, 0)), 1.1), C.mesh_obj('boomer', C.tube(spline([Vector((-0.3, -0.35, 0.25)), Vector((0, -0.35, 0.05)), Vector((0.3, -0.35, 0.25))], 10), 0.05, seg=10), mat('bm', '#d8a24a', 0.5), outline=O))),
    'd-poison': ('poison', lambda: (arrow_obj(Vector((0, -0.2, 0)), 1.0, tip='#9ad04a', glow='#9ad04a', fletch='#7a3ac8'), C.mesh_obj('bub', C.ellipsoid(Vector((-0.22, -0.34, -0.22)), (0.12, 0.12, 0.12)), mat('bub', '#b8f05a', 0.1, emit='#b8f05a', es=1.2), outline=O))),
    'd-holy': ('holy', lambda: (star(Vector((0, -0.2, 0.0)), 1.1, '#fff6b8'), C.mesh_obj('halo', C.torus(Vector((0, -0.12, 0)), 0.5, 0.03, seg=48, rot=Euler((math.radians(90), 0, 0))), mat('halo', '#ffe08a', 0.3, emit='#ffe08a', es=1.5), outline=O * 0.6))),
    'd-shadow': ('shadow', lambda: star(Vector((0, -0.2, 0)), 1.15, '#4a3a6a', 4)),
    'd-meteor': ('meteor', lambda: (flames(Vector((0.16, -0.2, 0.1)), 0.9), C.mesh_obj('met', C.ellipsoid(Vector((-0.12, -0.34, -0.14)), (0.24, 0.22, 0.22)), mat('met', '#6a4a3a', 0.8, emit='#ff7a2a', es=0.4), outline=O))),
    'd-ultimate': ('basic', lambda: (arrow_obj(Vector((-0.22, -0.2, 0.05)), 0.85, -30), arrow_obj(Vector((0.0, -0.24, 0.1)), 0.85, -45), arrow_obj(Vector((0.22, -0.28, 0.15)), 0.85, -60))),
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
