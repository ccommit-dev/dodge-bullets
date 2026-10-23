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


# 3/4 로 보일 파츠 — (옆으로 도는 각, 앞으로 숙이는 각)
TURN = {'helmet': (-32, 8), 'armor': (-26, 4), 'gloves': (-30, 6), 'boots': (-62, 4), 'shoulder': (-58, 14)}

JOBS = {}
for t in (1, 2, 3):
    JOBS[f'weapon-{t}'] = (sword, t, (25, 15), 2.0)
    JOBS[f'bow-{t}'] = (bow, t, (-20, 12), 2.1)
    JOBS[f'staff-{t}'] = (staff, t, (-20, 12), 2.1)
    JOBS[f'shield-{t}'] = (shield, t, (-25, 12), 1.9)
    JOBS[f'helmet-{t}'] = (helmet, t, (-30, 18), 1.75)
    JOBS[f'armor-{t}'] = (armor, t, (-28, 14), 1.75)
    JOBS[f'gloves-{t}'] = (gloves, t, (-22, 20), 1.6)
    JOBS[f'boots-{t}'] = (boots, t, (-30, 18), 1.6)
for k in SHOULDERS:
    JOBS[f'shoulder-{k}'] = (shoulder, k, (-35, 24), 1.9)
for lv in range(16):
    JOBS[f'drum-{lv:02d}'] = (drum, lv, (-24, 22), 2.3)

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['gear', 'drums']
names = []
for a in argv:
    if a == 'gear':
        names += [k for k in JOBS if not k.startswith('drum-')]
    elif a == 'drums':
        names += [k for k in JOBS if k.startswith('drum-')]
    else:
        names.append(a)
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
    turn = TURN.get(name.split('-')[0], 0)
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
