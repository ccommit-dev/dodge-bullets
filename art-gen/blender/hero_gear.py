"""주인공이 입는 세트 파츠 (2026-11-04, 사용자: 파츠를 껴도 주인공 그림이 안 바뀐다 → 입은 모습까지).
아이콘(gear_icons.py set_*)과 같은 색 · 같은 생김새를 비버 몸에 맞춰 다시 지었다. 투구는 얼굴을 가리지 않는다(주인공 표정이 안 보이면 캐릭터가 사라진다).
대기 0칸 자세 · 같은 카메라로 파츠만 그린다(주인공 몸은 holdout — 몸에 가린 부분은 투명). 그림은 칸 전체 크기라 그대로 겹치면 맞고,
칸마다 뼈 앵커(heroAnchors)만큼 옮겨 몸을 따라간다(EquippedCharacter). 부위 하나 = 뼈 하나 = 강체.
  blender -b -P art-gen/blender/hero_gear.py -- <sword|spear|bow|staff> [--preview]
  → art-gen/out/b3d2-gear/<무기>-<부위>.png, 조립: node scripts/assemble-anim2.mjs hero-gear
--preview 는 몸까지 그려 입은 모습 한 장(<무기>-preview.png)."""
import bpy
import sys
import os
import math
from mathutils import Vector, Euler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import bcommon as C
from lib import beaver as BV
from lib.beaver import spline, interp
import roster as R
import anim2 as A2
import render_roster as RR
import ride_seat as RS

OUT = os.path.join(RR.ROOT, 'art-gen', 'out', 'b3d2-gear')
O = BV.OUT
# gear_icons.SETS 와 같은 값 — 슬롯 아이콘과 입은 모습이 같은 색이어야 한다
SETS = {
    'sword': dict(metal='#c8d2dc', main='#b8322c', trim='#e8b23a', dark='#5a1c18'),
    'spear': dict(metal='#8fa6bf', main='#2a5fa8', trim='#dfe8f2', dark='#173a6a'),
    'bow': dict(metal='#9a6a3a', main='#4f8a3f', trim='#d8b86a', dark='#2f5a2a'),
    'staff': dict(metal='#e6d6a8', main='#6a3fb0', trim='#f2c232', dark='#3a2070', gem='#7fe3ff'),
}
HEAD = BV.HEAD_C
GROUPS = {}


def mat(name, color, rough=0.75, metal=0.0, emit=None, es=0.0):
    return C.principled(f'hg_{name}_{color}_{metal}_{es}', color, rough=rough, metal=metal, coat=0.0, emit=emit, emit_strength=es)


def metal_m(c):
    return mat('metal', c, rough=0.45, metal=0.55)


def put(group, bone, name, bm, material, outline=O):
    o = C.mesh_obj(f'{group}_{name}', bm, material, smooth=False, outline=outline)
    GROUPS.setdefault(group, []).append((o, bone))


def shell(center, radii, keep, egg=0.0):
    """타원체에서 keep 이 참인 꼭짓점만 남긴다 — 몸에 씌우는 껍데기"""
    bm = C.ellipsoid(center, radii, egg=egg)
    for v in [v for v in bm.verts if not keep(v.co)]:
        bm.verts.remove(v)
    return bm


def cap(k_r=1.12, brow=0.77, back=0.56):
    """머리 위 껍데기 — 앞은 눈썹 위까지(brow), 옆 · 뒤는 back 까지 덮는다. 눈 · 입은 항상 보인다"""
    return shell(HEAD + Vector((0, 0.01, 0.015)), (BV.HEAD_R[0] * k_r, BV.HEAD_R[1] * k_r, BV.HEAD_R[2] * k_r), lambda c: c.z > (brow if c.y < 0.04 else back))


# ── 투구 ──
def helmet(k, S):
    g, b = 'helmet', 'head'
    if k == 'sword':   # 강철 투구 — 금 띠 · 가운데 금 줄 · 진홍 볏
        put(g, b, 'dome', cap(), metal_m(S['metal']))
        put(g, b, 'band', C.torus(HEAD + Vector((0, 0.01, 0.16)), 0.288, 0.024), metal_m(S['trim']))
        put(g, b, 'strip', C.box(HEAD + Vector((0, -0.3, 0.2)), (0.06, 0.03, 0.09)), metal_m(S['trim']))
        pts = spline([HEAD + Vector((0, -0.2, 0.3)), HEAD + Vector((0, 0.0, 0.46)), HEAD + Vector((0, 0.24, 0.36)), HEAD + Vector((0, 0.38, 0.1))], 14)
        put(g, b, 'crest', C.tube(pts, interp([0.03, 0.075, 0.07, 0.02], len(pts)), seg=7), mat('crest', S['main']))
    elif k == 'spear':   # 뾰족 투구 — 넓은 테 · 꼭대기 창끝 · 푸른 꼬리
        put(g, b, 'dome', cap(1.1, 0.79, 0.62), metal_m(S['metal']))
        put(g, b, 'rim', C.torus(HEAD + Vector((0, 0.01, 0.17)), 0.315, 0.03), mat('rim', S['main']))
        put(g, b, 'spike', C.cone(HEAD + Vector((0, 0.01, 0.46)), 0.1, 0.0, 0.3, seg=7), metal_m(S['trim']))
        pts = spline([HEAD + Vector((0, 0.2, 0.28)), HEAD + Vector((0, 0.4, 0.18)), HEAD + Vector((0, 0.46, -0.1))], 12)
        put(g, b, 'tail', C.tube(pts, interp([0.04, 0.09, 0.02], len(pts)), seg=7), mat('tail', S['main']))
    elif k == 'bow':   # 두건 — 얼굴을 크게 틔우고 뒤로 늘어진다 · 깃털
        hood = shell(HEAD + Vector((0, 0.03, 0.0)), (BV.HEAD_R[0] * 1.16, BV.HEAD_R[1] * 1.2, BV.HEAD_R[2] * 1.14), lambda c: not (c.y < -0.03 and c.z < 0.78) and c.z > 0.38)
        put(g, b, 'hood', hood, mat('hood', S['main'], rough=0.9))
        put(g, b, 'fold', C.torus(HEAD + Vector((0, -0.2, -0.02)), 0.27, 0.035, rot=Euler((math.radians(82), 0, 0))), mat('fold', S['dark'], rough=0.9))
        pts = spline([HEAD + Vector((0, 0.26, 0.1)), HEAD + Vector((0, 0.46, 0.0)), HEAD + Vector((0, 0.56, -0.2))], 12)
        put(g, b, 'tip', C.tube(pts, interp([0.12, 0.08, 0.015], len(pts)), seg=7), mat('hood', S['main'], rough=0.9))
        fp = spline([HEAD + Vector((0.26, 0.0, 0.2)), HEAD + Vector((0.38, 0.02, 0.38)), HEAD + Vector((0.4, 0.06, 0.56))], 10)
        put(g, b, 'feather', C.tube(fp, interp([0.018, 0.05, 0.008], len(fp)), seg=6), mat('feather', '#f1e4c8'))
    else:   # 마법사 모자 — 넓은 챙 · 꺾인 고깔 · 금 띠 · 빛나는 보석
        put(g, b, 'brim', C.ellipsoid(HEAD + Vector((0, 0.0, 0.215)), (0.47, 0.45, 0.035)), mat('brim', S['dark'], rough=0.85))
        pts = spline([HEAD + Vector((0, 0, 0.225)), HEAD + Vector((0, 0.01, 0.425)), HEAD + Vector((0.02, 0.07, 0.605)), HEAD + Vector((0.12, 0.17, 0.725))], 16)
        put(g, b, 'cone', C.tube(pts, interp([0.27, 0.17, 0.085, 0.01], len(pts)), seg=10), mat('cone', S['main'], rough=0.85))
        put(g, b, 'band', C.torus(HEAD + Vector((0, 0, 0.275)), 0.235, 0.03), metal_m(S['trim']))
        put(g, b, 'gem', C.ellipsoid(HEAD + Vector((0, -0.24, 0.275)), (0.05, 0.03, 0.06)), mat('gem', S['gem'], rough=0.25, emit=S['gem'], es=0.6), O * 0.6)


# ── 갑옷 ── 몸 앞을 덮는 껍데기. 머리 아래 턱선 위로는 올라가지 않는다
def armor(k, S):
    g, b = 'armor', 'body'
    c, r = BV.BODY_C, BV.BODY_R
    keep = lambda co: 0.07 < co.z < 0.42
    if k == 'sword':
        put(g, b, 'plate', shell(c, (r[0] * 1.07, r[1] * 1.2, r[2] * 1.05), keep, egg=0.16), metal_m(S['metal']))
        put(g, b, 'cv', C.box(c + Vector((0, -r[1] * 1.16, -0.06)), (0.05, 0.03, 0.2)), metal_m(S['trim']))
        put(g, b, 'ch', C.box(c + Vector((0, -r[1] * 1.16, -0.03)), (0.17, 0.03, 0.045)), metal_m(S['trim']))
        put(g, b, 'belt', C.torus(c + Vector((0, -0.02, -0.19)), 0.272, 0.026), mat('belt', S['main']))
    elif k == 'spear':
        put(g, b, 'scale', shell(c, (r[0] * 1.06, r[1] * 1.2, r[2] * 1.05), keep, egg=0.16), metal_m(S['metal']))
        for i, z in enumerate((-0.2, -0.13, -0.06)):
            put(g, b, f'row{i}', C.torus(c + Vector((0, -0.02, z + 0.02)), 0.285, 0.016), metal_m(S['trim'] if i == 1 else S['metal']), O * 0.7)
        put(g, b, 'apron', C.box(c + Vector((0, -r[1] * 1.12, -0.17)), (0.17, 0.03, 0.14)), mat('apron', S['main']))
    elif k == 'bow':
        put(g, b, 'tunic', shell(c, (r[0] * 1.06, r[1] * 1.2, r[2] * 1.05), keep, egg=0.16), mat('tunic', S['main'], rough=0.9))
        strap = spline([c + Vector((-0.26, -0.17, 0.08)), c + Vector((0.0, -0.31, -0.03)), c + Vector((0.27, -0.17, -0.17))], 10)
        put(g, b, 'strap', C.tube(strap, 0.024, seg=6), mat('strap', S['metal']), O * 0.7)
        put(g, b, 'belt', C.torus(c + Vector((0, -0.02, -0.19)), 0.272, 0.022), mat('belt', S['metal']))
        put(g, b, 'buckle', C.box(c + Vector((0, -0.3, -0.19)), (0.07, 0.024, 0.06)), metal_m(S['trim']))
    else:
        put(g, b, 'robe', shell(c, (r[0] * 1.08, r[1] * 1.2, r[2] * 1.06), lambda co: 0.03 < co.z < 0.42, egg=0.18), mat('robe', S['main'], rough=0.85))
        put(g, b, 'hem', C.torus(c + Vector((0, -0.02, -0.22)), 0.268, 0.02), metal_m(S['trim']))
        put(g, b, 'stole', C.box(c + Vector((0, -r[1] * 1.17, -0.08)), (0.09, 0.03, 0.27)), metal_m(S['trim']))
        put(g, b, 'gem', C.ellipsoid(c + Vector((0, -r[1] * 1.22, 0.01)), (0.045, 0.024, 0.055)), mat('gem', S['gem'], rough=0.25, emit=S['gem'], es=0.6), O * 0.6)


# ── 견갑 ── 팔이 시작하는 어깨 위 (몸 뼈에 붙어 팔을 휘둘러도 제자리)
def shoulder(k, S):
    g, b = 'shoulder', 'body'
    for sx, sh in ((1, BV.SHOULDER_L), (-1, BV.SHOULDER_R)):
        at = sh + Vector((sx * 0.03, 0.0, 0.03))
        rot = Euler((0, sx * 0.45, 0))
        if k == 'sword':
            put(g, b, f'pad{sx}', C.ellipsoid(at, (0.125, 0.125, 0.07), rot=rot), metal_m(S['metal']))
            put(g, b, f'rim{sx}', C.torus(at + Vector((0, 0, -0.022)), 0.112, 0.018, rot=rot), metal_m(S['trim']), O * 0.7)
        elif k == 'spear':
            put(g, b, f'pad{sx}', C.ellipsoid(at, (0.115, 0.115, 0.075), rot=rot), metal_m(S['metal']))
            put(g, b, f'spike{sx}', C.cone(at + Vector((sx * 0.03, 0, 0.1)), 0.04, 0.0, 0.13, seg=6, rot=rot), metal_m(S['trim']))
        elif k == 'bow':
            put(g, b, f'pad{sx}', C.ellipsoid(at, (0.115, 0.115, 0.06), rot=rot), mat('leather', S['metal'], rough=0.9))
            put(g, b, f'fur{sx}', C.ellipsoid(at + Vector((-sx * 0.05, 0, 0.03)), (0.09, 0.1, 0.05), rot=rot), mat('fur', S['trim'], rough=0.95))
        else:
            put(g, b, f'pad{sx}', C.ellipsoid(at, (0.115, 0.115, 0.065), rot=rot), mat('cloth', S['dark'], rough=0.85))
            put(g, b, f'rim{sx}', C.torus(at + Vector((0, 0, -0.02)), 0.1, 0.016, rot=rot), metal_m(S['trim']), O * 0.7)
            put(g, b, f'orb{sx}', C.ellipsoid(at + Vector((0, 0, 0.075)), (0.036, 0.036, 0.036)), mat('gem', S['gem'], rough=0.25, emit=S['gem'], es=0.6), O * 0.6)


# ── 장갑 ── 부위 그림이 손마다 따로(손이 따로 움직인다)
def gloves(k, S):
    main = metal_m(S['metal']) if k in ('sword', 'spear') else mat('glove', S['metal'] if k == 'bow' else S['main'], rough=0.88)
    trim = metal_m(S['trim'])
    for side, hd in (('L', BV.HAND_L), ('R', BV.HAND_R)):
        g, b = f'glove{side}', f'hand.{side}'
        put(g, b, 'paw', C.ellipsoid(hd, (0.076, 0.072, 0.074)), main)
        put(g, b, 'plate', C.ellipsoid(hd + Vector((0, -0.055, 0.012)), (0.05, 0.026, 0.044)), trim, O * 0.7)


# ── 신발 ── 발도 따로
def boots(k, S):
    main = metal_m(S['metal']) if k in ('sword', 'spear') else mat('boot', S['metal'] if k == 'bow' else S['main'], rough=0.88)
    trim = metal_m(S['trim'])
    for sx, side in ((1, 'L'), (-1, 'R')):
        g, b = f'boot{side}', f'leg.{side}'
        put(g, b, 'foot', C.ellipsoid(Vector((sx * 0.15, -0.085, 0.03)), (0.1, 0.122, 0.042)), main)
        put(g, b, 'shin', C.ellipsoid(Vector((sx * 0.14, -0.03, 0.085)), (0.094, 0.094, 0.062)), main)
        put(g, b, 'cuff', C.torus(Vector((sx * 0.14, -0.03, 0.125)), 0.082, 0.018), trim, O * 0.7)


def ride_boot(k, S):
    """앉아서 옆구리로 내린 다리(ride_seat.seat_hero)에 맞춘 신발 — 몸 뼈에 붙는다"""
    main = metal_m(S['metal']) if k in ('sword', 'spear') else mat('boot', S['metal'] if k == 'bow' else S['main'], rough=0.88)
    knee, foot = Vector((-0.33, -0.14, -0.08)), Vector((-0.34, -0.1, -0.27))
    put('bootR', 'body', 'shin', C.tube([knee.lerp(foot, 0.35), foot], [0.095, 0.09], seg=8), main)
    put('bootR', 'body', 'foot', C.ellipsoid(foot + Vector((0, -0.05, -0.03)), (0.09, 0.125, 0.052)), main)
    put('bootR', 'body', 'cuff', C.torus(knee.lerp(foot, 0.35), 0.092, 0.018, rot=Euler((0, 0, 0))), metal_m(S['trim']), O * 0.7)


def run(kind, preview, ride=False):
    os.makedirs(OUT, exist_ok=True)
    cam = RR.setup()
    C.FACET = 14
    rig = BV.build('hero', R.HERO)
    if ride:
        RS.seat_hero(rig)
    C.FACET = 14
    hero_objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    S = SETS[kind]
    for fn in (helmet, armor, shoulder, gloves, ride_boot if ride else boots):
        fn(kind, S)
    C.FACET = 0
    bpy.context.view_layer.update()
    for objs in GROUPS.values():
        for o, bone in objs:
            BV._attach(o, rig.arm, bone)
    P = RS.rider_actions()['idle'][0] if ride else A2.beaver_actions('melee', hero=True)['idle'][0]
    rig.arm.rotation_euler.z = math.radians(RS.RIDER_YAW if ride else RR.YAW) + math.radians(P.get('yaw', 0))
    BV.pose(rig, P)
    bpy.context.view_layer.update()
    scene = bpy.context.scene
    if preview:
        scene.render.filepath = os.path.join(OUT, f'{kind}-preview.png')
        bpy.ops.render.render(write_still=True)
    else:
        for o in hero_objs:
            o.is_holdout = True
        for name in GROUPS:
            for other, objs in GROUPS.items():
                for o, _ in objs:
                    o.hide_render = other != name
            scene.render.filepath = os.path.join(OUT, f"{kind}-{'ride-' if ride else ''}{name}.png")
            bpy.ops.render.render(write_still=True)
            print('wrote', kind, name, flush=True)
    print('DONE', kind, cam.name, flush=True)


argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
run(next(a for a in argv if not a.startswith('--')), '--preview' in argv, '--ride' in argv)
