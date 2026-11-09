"""탈것 전용 3D (2026-11-09, 사용자: "탈것 애니메이션 리소스가 너무 볼품없어 보임 — 특징과 과금 BM 느낌으로 있어 보이게 · 애니메이션 자연스럽게 · 모델링도").

예전 탈것은 몬스터 사족(creature quad) 틀에 색만 바꾼 것이라 넷이 같은 개 몸통이었고(엄니 · 뿔이 거의 안 보였다), 다리가 마디 없는 막대라 걸음이 뻣뻣했다.
- 종마다 몸 · 머리 · 다리 길이 · 꼬리 · 엄니/뿔/날개가 다르다: 멧돼지(통통 · 짧은 다리 · 엄니 · 등 갈기) · 사슴(가는 다리 · 긴 목 · 큰 가지뿔)
  · 늑대(깊은 가슴 · 목 갈기 · 풍성한 꼬리) · 비룡(비늘 배판 · S자 목 · 큰 날개 · 불꽃 꼬리).
- 다리는 세 마디(윗다리 · 아랫다리 · 발굽/발) + 2뼈 IK — 발 자리만 칸마다 정하면 무릎이 굽는다(앞다리는 앞으로, 뒷다리 뜀뼈는 뒤로).
  디딘 발은 땅에 붙어 있고 몸만 오르내린다. 걸음은 종마다: 멧돼지 종종 속보 · 사슴 껑충 구보 · 늑대 습보 · 비룡 묵직한 걸음 + 날갯짓.
- 꾸밈은 상점 등급(economy/cosmetics cosmeticTier: 멧돼지 SR · 사슴 SSR · 늑대 UR · 비룡 LR)대로 화려해진다 —
  가죽 안장 · 도토리 장식 → 은 장식 · 꽃 목걸이 · 빛나는 잎 → 강철 갑주 · 룬 · 얼음 결정 → 금 갑주 · 보석 · 불꽃.
게임과 맞물린 약속: 'body' 뼈 · 안장 가운데 = SEAT(= ride_seat.SADDLE_POINT, 쉬는 자세) · 동작 칸 수(anim-layout mount) · 앞 -Y · 발 z=0 · 왼쪽 보게 렌더(yaw −64).
칸(480², 배율 0.6 고정): 발에서 위로 1.7 · 머리 쪽 1.0 · 꼬리 쪽 0.9 (캐릭터 단위, 옆모습 투영) 안에 들어야 한다.
"""
import bpy
import json
import math
import os
import bmesh
from mathutils import Vector, Matrix

from lib import bcommon as C
from lib.beaver import _attach, spline, interp, _rot_local
from lib.creature import _m, _skin, _eyes, OUT

SEAT = (0.0, 0.03, 0.56)   # 안장 가운데(쉬는 자세) — ride_seat.SADDLE_POINT 와 같아야 한다(게임 CSS 의 주인공 자리가 넷 다 한 값)
TAU = math.tau
_LAYOUT = json.load(open(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'anim-layout.json'), encoding='utf-8'))['mount']['actions']

# ── 종 ── 몸(c, r) · 다리(엉덩이 · 무릎 · 발목, x 는 ±) · 목/머리 · 색. 다리 이름 f=앞 b=뒤, L=+x(카메라 쪽) R=-x
SPECIES = {
    'mount-boar': dict(
        tier='SR', foot='hoof', gait='trot',
        body_c=(0, 0.06, 0.36), body_r=(0.25, 0.36, 0.19),
        front=dict(x=0.13, hip=(-0.21, 0.31), knee=(-0.235, 0.165), ankle=(-0.215, 0.05), r=(0.08, 0.06, 0.05)),
        hind=dict(x=0.13, hip=(0.29, 0.31), knee=(0.335, 0.16), ankle=(0.29, 0.05), r=(0.085, 0.06, 0.05)),
        neck=((0, -0.3, 0.42), (0, -0.44, 0.44)), head_c=(0, -0.53, 0.43), head_r=(0.165, 0.18, 0.155),
        skin='#8b5e3c', dark='#4a2f1e', belly='#c9a07a', eye=0.048,
    ),
    'mount-deer': dict(
        tier='SSR', foot='hoof', gait='canter',
        body_c=(0, 0.05, 0.41), body_r=(0.16, 0.35, 0.13),
        front=dict(x=0.09, hip=(-0.22, 0.37), knee=(-0.245, 0.19), ankle=(-0.22, 0.035), r=(0.05, 0.038, 0.03)),
        hind=dict(x=0.09, hip=(0.27, 0.38), knee=(0.355, 0.175), ankle=(0.3, 0.035), r=(0.06, 0.04, 0.03)),
        neck=((0, -0.28, 0.47), (0, -0.52, 0.68)), head_c=(0, -0.6, 0.75), head_r=(0.095, 0.125, 0.09),
        skin='#c08a50', dark='#6a4a2a', belly='#f5e6cc', eye=0.05,
    ),
    'mount-wolf': dict(
        tier='UR', foot='paw', gait='gallop',
        body_c=(0, 0.06, 0.39), body_r=(0.19, 0.35, 0.155),
        front=dict(x=0.11, hip=(-0.2, 0.33), knee=(-0.225, 0.165), ankle=(-0.2, 0.045), r=(0.065, 0.05, 0.04)),
        hind=dict(x=0.11, hip=(0.27, 0.34), knee=(0.36, 0.17), ankle=(0.3, 0.045), r=(0.075, 0.05, 0.04)),
        neck=((0, -0.29, 0.46), (0, -0.46, 0.6)), head_c=(0, -0.55, 0.66), head_r=(0.15, 0.155, 0.135),
        skin='#8f99ac', dark='#3e4558', belly='#e8ecf2', eye=0.055,
    ),
    'mount-drake': dict(
        tier='LR', foot='claw', gait='stride',
        body_c=(0, 0.06, 0.4), body_r=(0.2, 0.35, 0.15),
        front=dict(x=0.12, hip=(-0.19, 0.33), knee=(-0.215, 0.17), ankle=(-0.19, 0.045), r=(0.075, 0.058, 0.045)),
        hind=dict(x=0.125, hip=(0.27, 0.34), knee=(0.35, 0.17), ankle=(0.29, 0.045), r=(0.09, 0.06, 0.045)),
        neck=((0, -0.28, 0.46), (0, -0.45, 0.76)), head_c=(0, -0.51, 0.84), head_r=(0.11, 0.13, 0.1),
        skin='#b5371c', dark='#4e1a0c', belly='#e8c48a', eye=0.05,
    ),
}
LEGS = ('fl', 'fr', 'bl', 'br')


class MRig:
    def __init__(self, arm, objs, spec, who):
        self.arm, self.objs, self.cfg, self.who = arm, objs, spec, who
        self.kind = 'mount'


def _leg_pts(spec, leg):
    s = spec['front'] if leg[0] == 'f' else spec['hind']
    x = s['x'] * (1 if leg[1] == 'l' else -1)
    hip = Vector((x, s['hip'][0], s['hip'][1]))
    knee = Vector((x, s['knee'][0], s['knee'][1]))
    ankle = Vector((x, s['ankle'][0], s['ankle'][1]))
    return hip, knee, ankle, s['r']


def _bones(spec, who):
    n0, n1 = spec['neck']
    hc = Vector(spec['head_c'])
    B = {
        'root': ((0, 0, 0), (0, 0, 0.08), None),
        'body': ((0, SEAT[1], spec['body_c'][2]), (0, -0.25, spec['body_c'][2]), 'root'),   # 머리 = 안장 아래 — 몸을 숙여도 안장이 제자리에서 돈다
        'neck': (n0, n1, 'body'),
        'head': (n1, tuple(Vector(n1) + (hc - Vector(n1)).normalized() * 0.001 + Vector((0, -0.16, 0.0))), 'neck'),
        'jaw': (tuple(hc + Vector((0, -0.05, -0.06))), tuple(hc + Vector((0, -0.2, -0.1))), 'head'),
        'ear.L': (tuple(hc + Vector((0.07, 0.02, 0.08))), tuple(hc + Vector((0.1, 0.06, 0.18))), 'head'),
        'ear.R': (tuple(hc + Vector((-0.07, 0.02, 0.08))), tuple(hc + Vector((-0.1, 0.06, 0.18))), 'head'),
        'tail1': ((0, 0.38, spec['body_c'][2] + 0.04), (0, 0.52, spec['body_c'][2] + 0.08), 'body'),
        'tail2': ((0, 0.52, spec['body_c'][2] + 0.08), (0, 0.68, spec['body_c'][2] + 0.14), 'tail1'),
    }
    if who == 'mount-drake':
        for sx, s in ((1, 'L'), (-1, 'R')):
            B[f'wing.{s}'] = ((sx * 0.1, -0.1, 0.52), (sx * 0.34, -0.04, 0.76), 'body')
            B[f'wing2.{s}'] = ((sx * 0.34, -0.04, 0.76), (sx * 0.6, 0.14, 0.9), f'wing.{s}')
    for leg in LEGS:
        hip, knee, ankle, _ = _leg_pts(spec, leg)
        B[f'{leg}.u'] = (tuple(hip), tuple(knee), 'body')
        B[f'{leg}.d'] = (tuple(knee), tuple(ankle), f'{leg}.u')
        B[f'{leg}.f'] = (tuple(ankle), tuple(ankle + Vector((0, -0.06, 0))), f'{leg}.d')
    return B


def _armature(name, bones, coll):
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


# ── 부품 도우미 ──
def _ring_on(c, r, y, k=1.04, n=20):
    """몸통 타원체를 y 에서 자른 단면의 윗반 둘레(조금 바깥, +x 옆 → 위 → -x 옆) — 뱃대끈은 이것을 아래로 접어 한 바퀴"""
    c = Vector(c)
    t = 1.0 - ((y - c.y) / r[1]) ** 2
    if t <= 0:
        return []
    ax, az = r[0] * math.sqrt(t) * k, r[2] * math.sqrt(t) * k
    return [Vector((ax * math.cos(math.pi * i / n), y, c.z + az * math.sin(math.pi * i / n))) for i in range(n + 1)]


def _shell(c, r, y0, y1, z_cut, k=1.05):
    """몸통을 덮는 천(안장 깔개) — 타원체를 조금 키워 y0~y1 · z_cut 위만 남긴다"""
    bm = C.ellipsoid(Vector(c), (r[0] * k, r[1] * k, r[2] * k))
    for v in [v for v in bm.verts if v.co.y < y0 or v.co.y > y1 or v.co.z < z_cut]:
        bm.verts.remove(v)
    return bm


def _blanket_edge(c, r, y0, y1, z_cut, k=1.07):
    """깔개 둘레(금/은 테) — 앞 · 뒤 단면 호 + 양옆 아랫선"""
    c = Vector(c)
    def side(y, sx):
        t = 1.0 - ((y - c.y) / r[1]) ** 2 - ((z_cut - c.z) / r[2]) ** 2
        return Vector((sx * r[0] * k * math.sqrt(max(t, 0.01)), y, z_cut))
    def arc(y, rev=False):
        t = 1.0 - ((y - c.y) / r[1]) ** 2
        ax, az = r[0] * k * math.sqrt(max(t, 0.01)), r[2] * k * math.sqrt(max(t, 0.01))
        a0 = math.asin(max(-1.0, min(1.0, (z_cut - c.z) / max(az, 1e-3))))
        A = [a0 + (math.pi - 2 * a0) * i / 12 for i in range(13)]
        P = [Vector((ax * math.cos(a), y, c.z + az * math.sin(a))) for a in A]
        return list(reversed(P)) if rev else P
    near = [side(y0 + (y1 - y0) * i / 8, 1) for i in range(9)]
    far = [side(y1 - (y1 - y0) * i / 8, -1) for i in range(9)]
    return near[:-1] + arc(y1)[:-1] + far[:-1] + arc(y0, rev=True)


def _loop_tube(pts, r, mat, coll, name, outline=OUT * 0.5):
    pts = pts + [pts[0]]
    return C.mesh_obj(name, C.tube(pts, r, seg=6, caps=False), mat, coll, smooth=False, outline=outline)


def _limb(add, leg, hip, knee, ankle, rr, skin, coll):
    r0, r1, r2 = rr
    add(f'{leg}.u', C.mesh_obj(f'{leg}_up', C.tube([hip + Vector((0, 0, 0.03)), hip.lerp(knee, 0.5), knee], [r0, r0 * 0.86, r1], seg=10), skin, coll, outline=OUT))
    add(f'{leg}.d', C.mesh_obj(f'{leg}_kn', C.ellipsoid(knee, (r1 * 1.02, r1 * 1.05, r1 * 1.0)), skin, coll, outline=OUT * 0.8))
    add(f'{leg}.d', C.mesh_obj(f'{leg}_lo', C.tube([knee, knee.lerp(ankle, 0.55), ankle], [r1, r1 * 0.85, r2], seg=10), skin, coll, outline=OUT))


def _foot(add, leg, ankle, kind, r2, M, coll):
    if kind == 'hoof':
        add(f'{leg}.f', C.mesh_obj(f'{leg}_hoof', C.cone(Vector((ankle.x, ankle.y - 0.006, ankle.z * 0.5)), r2 * 1.25, r2 * 1.0, ankle.z + 0.012, seg=8), M['hoof'], coll, outline=OUT * 0.8))
        return
    # 발 · 발톱 — 늑대는 둥근 발, 비룡은 세 발가락 갈고리
    add(f'{leg}.f', C.mesh_obj(f'{leg}_paw', C.ellipsoid(Vector((ankle.x, ankle.y - 0.022, 0.026)), (r2 * 1.35, r2 * 1.7, 0.03)), M['skin'] if kind == 'paw' else M['dark'], coll, outline=OUT * 0.8))
    for k in (-1, 0, 1):
        p = Vector((ankle.x + k * r2 * 0.75, ankle.y - 0.022 - r2 * 1.55, 0.02))
        add(f'{leg}.f', C.mesh_obj(f'{leg}_cl{k}', C.cone(p, 0.013 if kind == 'paw' else 0.018, 0.0, 0.04 if kind == 'paw' else 0.06, seg=6, rot=C.look_rot(Vector((k * 0.15, -1, -0.35)))), M['claw'], coll, outline=OUT * 0.4))


def _mats(spec, who):
    M = {
        'skin': _skin(spec['skin'], spec['dark']),
        'belly': _m('m_belly', spec['belly'], rough=0.7),
        'dark': _m('m_dark', spec['dark'], rough=0.7),
        'hoof': _m('m_hoof', '#3a2a22', rough=0.5),
        'claw': _m('m_claw', '#f3ead8', rough=0.35),
        'tooth': _m('m_tooth', '#fffaf0', rough=0.35),
        'mouth': _m('m_mouth', '#5a1a24', rough=0.6),
        'eyew': _m('m_eyew', '#fbf8f2', rough=0.45, coat=0.1),
        'iris': _m('m_iris', {'mount-wolf': '#38c8ff', 'mount-drake': '#ffb020'}.get(who, '#2a1a12'), rough=0.15,
                   emit={'mount-wolf': '#38c8ff', 'mount-drake': '#ffb020'}.get(who), es=1.4 if who in ('mount-wolf', 'mount-drake') else 0.0),
        'pupil': _m('m_pupil', '#120a0a', rough=0.15),
        'hi': _m('m_hi', '#ffffff', emit='#ffffff', es=1.4),
        'gold': _m('m_gold', '#f2c232', rough=0.28, metal=0.85),
        'silver': _m('m_silver', '#dfe6ee', rough=0.25, metal=0.85),
        'steel': _m('m_steel', '#b6c0ce', rough=0.3, metal=0.8),
        'brass': _m('m_brass', '#d29a3a', rough=0.35, metal=0.7),
        'leather': _m('m_leather', '#6b3a1c', rough=0.75),
        'leather2': _m('m_leather2', '#4a2a16', rough=0.8),
    }
    return M


# ── 안장(등급마다) ── 가운데가 SEAT. 깔개(천) + 테 + 안장(가죽) + 앞/뒤 턱 + 뱃대끈 + 등자
SADDLE_STYLE = {
    'SR': dict(cloth='#b8322c', trim='brass', seat='leather', pommel='brass'),
    'SSR': dict(cloth='#1f8a5e', trim='silver', seat='leather', pommel='silver'),
    'UR': dict(cloth='#2a4fb8', trim='gold', seat='leather2', pommel='steel'),
    'LR': dict(cloth='#8e1b2b', trim='gold', seat='leather2', pommel='gold'),
}


def _saddle(add, spec, M, coll):
    st = SADDLE_STYLE[spec['tier']]
    bc, br = Vector(spec['body_c']), spec['body_r']
    y0, y1, zc = SEAT[1] - 0.17, SEAT[1] + 0.17, bc.z - br[2] * 0.3
    cloth = _m('m_cloth_' + spec['tier'], st['cloth'], rough=0.85, coat=0.0)
    add('body', C.mesh_obj('blanket', _shell(bc, br, y0, y1, zc), cloth, coll, smooth=False, outline=OUT))
    add('body', _loop_tube(_blanket_edge(bc, br, y0, y1, zc), 0.013, M[st['trim']], coll, 'blanket_trim'))
    S = Vector(SEAT)
    add('body', C.mesh_obj('seat', C.ellipsoid(S + Vector((0, 0, -0.012)), (br[0] * 0.62, 0.14, 0.04)), M[st['seat']], coll, smooth=False, outline=OUT))
    add('body', C.mesh_obj('cantle', C.ellipsoid(S + Vector((0, 0.13, 0.03)), (br[0] * 0.5, 0.035, 0.055)), M[st['seat']], coll, smooth=False, outline=OUT * 0.8))
    add('body', C.mesh_obj('pommel', C.ellipsoid(S + Vector((0, -0.12, 0.035)), (0.045, 0.035, 0.05)), M[st['pommel']], coll, smooth=False, outline=OUT * 0.7))
    girth = _ring_on(bc, br, SEAT[1] + 0.0, k=1.035)
    if girth:   # 뱃대끈 — 몸 아래로 한 바퀴
        under = [Vector((p.x, p.y, 2 * bc.z - p.z)) for p in reversed(girth[1:-1])]
        add('body', _loop_tube(girth + under, 0.016, M['leather2'], coll, 'girth'))


# ── 종별 몸 ──
def _body_common(add, spec, M, coll, chest=None, rump=None):
    bc, br = Vector(spec['body_c']), spec['body_r']
    add('body', C.mesh_obj('body', C.ellipsoid(bc, br), M['skin'], coll, outline=OUT))
    add('body', C.mesh_obj('belly', C.ellipsoid(bc + Vector((0, -0.02, -br[2] * 0.42)), (br[0] * 0.78, br[1] * 0.8, br[2] * 0.55)), M['belly'], coll, outline=OUT * 0.5))
    if chest:
        add('body', C.mesh_obj('chest', C.ellipsoid(Vector(chest[0]), chest[1]), M['skin'], coll, outline=OUT))
    if rump:
        add('body', C.mesh_obj('rump', C.ellipsoid(Vector(rump[0]), rump[1]), M['skin'], coll, outline=OUT))
    spec['_chest'], spec['_rump'] = chest, rump   # 등급 메달 자리(_tier_badges)
    n0, n1 = Vector(spec['neck'][0]), Vector(spec['neck'][1])
    return bc, br, n0, n1


def _brows(add, hc, hr, M, coll, tilt=24, w=0.07, up=0.62):
    for sx in (-1, 1):
        bp, bn = C.on_ellipsoid(hc, hr, Vector((sx * 0.42, -1.0, up)))
        add('head', C.mesh_obj(f'brow{sx}', C.ellipsoid(bp + bn * 0.016, (w, 0.026, 0.018), rot=Matrix.Rotation(math.radians(sx * -tilt), 4, 'Y').to_euler()), M['dark'], coll, outline=OUT * 0.4))


def _build_boar(add, spec, M, coll):
    bc, br, n0, n1 = _body_common(add, spec, M, coll, chest=((0, -0.19, 0.39), (0.245, 0.2, 0.2)), rump=((0, 0.27, 0.37), (0.22, 0.15, 0.175)))
    add('neck', C.mesh_obj('neck', C.tube([n0, n0.lerp(n1, 0.5), n1], [0.17, 0.165, 0.15], seg=12), M['skin'], coll, outline=OUT))
    hc, hr = Vector(spec['head_c']), spec['head_r']
    add('head', C.mesh_obj('head', C.ellipsoid(hc, hr, egg=0.1), M['skin'], coll, outline=OUT))
    sn = spline([hc + Vector((0, -0.12, -0.02)), hc + Vector((0, -0.22, -0.05)), hc + Vector((0, -0.29, -0.07))], 8)
    add('head', C.mesh_obj('snout', C.tube(sn, interp([0.105, 0.09, 0.08], len(sn)), seg=12), M['skin'], coll, outline=OUT))
    disc = sn[-1] + Vector((0, -0.012, 0))
    add('head', C.mesh_obj('disc', C.ellipsoid(disc, (0.082, 0.025, 0.07), rot=None), _m('m_snoutdisc', '#d4977f', rough=0.6), coll, outline=OUT * 0.6))
    for sx in (-1, 1):
        add('head', C.mesh_obj(f'nos{sx}', C.ellipsoid(disc + Vector((sx * 0.028, -0.02, 0.005)), (0.017, 0.01, 0.022)), M['dark'], coll))
        # 엄니 — 주둥이 옆에서 바깥 · 위 · 뒤로 휜다(크게 · 상아색)
        t0 = hc + Vector((sx * 0.075, -0.28, -0.11))   # 주둥이 끝 옆 — 위로 짧게 휘어 눈을 가리지 않는다
        tk = spline([t0, t0 + Vector((sx * 0.05, -0.025, 0.045)), t0 + Vector((sx * 0.07, -0.02, 0.09)), t0 + Vector((sx * 0.06, 0.005, 0.12))], 10)
        add('head', C.mesh_obj(f'tusk{sx}', C.tube(tk, interp([0.028, 0.022, 0.012, 0.003], len(tk)), seg=8), _m('m_ivory', '#f6ecd2', rough=0.35), coll, outline=OUT * 0.6))
        # 귀 — 작고 세모, 바깥으로 눕는다
        eb = hc + Vector((sx * 0.1, 0.06, 0.12))
        add(f'ear.{"L" if sx > 0 else "R"}', C.mesh_obj(f'ear{sx}', C.cone(eb + Vector((sx * 0.02, 0.01, 0.05)), 0.06, 0.0, 0.13, seg=4, rot=Matrix.Rotation(math.radians(sx * -38), 4, 'Y').to_euler()), M['skin'], coll, outline=OUT * 0.8))
    add('jaw', C.mesh_obj('jaw', C.ellipsoid(hc + Vector((0, -0.17, -0.12)), (0.085, 0.11, 0.04)), M['belly'], coll, outline=OUT * 0.6))
    _eyes(add, hc, hr, dict(eye_size=spec['eye']), coll, M, spread=0.5, up=0.28, size=1.0)
    _brows(add, hc, hr, M, coll, tilt=22, w=0.06, up=0.66)
    # 등 갈기 — 목덜미부터 어깨까지 뻣뻣한 털 다발(안장 앞에서 멈춘다)
    for k in range(9):
        t = k / 8
        y = -0.52 + t * 0.38
        z = 0.56 + 0.06 * math.sin(math.pi * min(1.0, t * 1.3))
        d = Vector((0, 0.55, 1)).normalized()
        add('neck' if y < -0.36 else 'body', C.mesh_obj(f'bristle{k}', C.cone(Vector((0, y, z)) + d * 0.03, 0.045, 0.0, 0.12 - abs(t - 0.45) * 0.08, seg=4, rot=C.look_rot(d)), M['dark'], coll, smooth=False, outline=OUT * 0.4))
    # 꼬리 — 가는 돼지 꼬리 + 끝 털
    tz = bc.z + 0.04
    tp = spline([Vector((0, 0.38, tz)), Vector((0, 0.45, tz + 0.04)), Vector((0, 0.5, tz + 0.01)), Vector((0, 0.53, tz + 0.06)), Vector((0, 0.56, tz + 0.03))], 12)
    add('tail1', C.mesh_obj('tail', C.tube(tp, interp([0.022, 0.018, 0.014], len(tp)), seg=6), M['skin'], coll, outline=OUT * 0.6))
    add('tail2', C.mesh_obj('tuft', C.cone(tp[-1] + Vector((0, 0.03, -0.01)), 0.035, 0.0, 0.07, seg=4, rot=C.look_rot(Vector((0, 1, -0.4)))), M['dark'], coll, smooth=False, outline=OUT * 0.4))
    # SR 꾸밈 — 굴레(코끈 · 볼끈) · 놋쇠 징 · 도토리 장식
    for y in (-0.2,):
        ring = []
        for i in range(14):
            a = TAU * i / 14
            ring.append(hc + Vector((0.098 * math.cos(a), y, -0.045 + 0.085 * math.sin(a))))
        add('head', _loop_tube(ring, 0.011, M['leather2'], coll, 'noseband'))
    cheek = hc + Vector((0.14, -0.04, -0.01))
    add('head', C.mesh_obj('cheekstrap', C.tube([hc + Vector((0.12, 0.05, 0.1)), cheek, hc + Vector((0.098, -0.2, -0.04))], 0.011, seg=6), M['leather2'], coll, smooth=False, outline=OUT * 0.4))
    add('head', C.mesh_obj('stud', C.ellipsoid(cheek + Vector((0.006, 0, 0)), (0.016, 0.016, 0.016)), M['brass'], coll, outline=OUT * 0.3))
    ac = cheek + Vector((0.02, 0.0, -0.09))
    add('head', C.mesh_obj('acorn_cord', C.tube([cheek, ac + Vector((0, 0, 0.03))], 0.005, seg=6), M['leather2'], coll))
    add('head', C.mesh_obj('acorn', C.ellipsoid(ac, (0.03, 0.03, 0.038), egg=-0.2), _m('m_acorn', '#a8652a', rough=0.5), coll, outline=OUT * 0.4))
    add('head', C.mesh_obj('acorn_cap', C.ellipsoid(ac + Vector((0, 0, 0.026)), (0.034, 0.034, 0.018)), _m('m_acorncap', '#5a3a1e', rough=0.8), coll, outline=OUT * 0.4))


def _build_deer(add, spec, M, coll):
    bc, br, n0, n1 = _body_common(add, spec, M, coll, chest=((0, -0.2, 0.43), (0.15, 0.16, 0.15)), rump=((0, 0.26, 0.42), (0.15, 0.14, 0.14)))
    add('neck', C.mesh_obj('neck', C.tube([n0, n0.lerp(n1, 0.5) + Vector((0, -0.01, 0)), n1], [0.09, 0.07, 0.06], seg=12), M['skin'], coll, outline=OUT))
    add('neck', C.mesh_obj('throat', C.tube([n0 + Vector((0, -0.04, -0.03)), n0.lerp(n1, 0.55) + Vector((0, -0.04, -0.01))], [0.06, 0.045], seg=10), M['belly'], coll, outline=OUT * 0.5))
    hc, hr = Vector(spec['head_c']), spec['head_r']
    add('head', C.mesh_obj('head', C.ellipsoid(hc, hr, egg=0.1), M['skin'], coll, outline=OUT))
    mz = hc + Vector((0, -0.13, -0.04))
    add('head', C.mesh_obj('muzzle', C.ellipsoid(mz, (0.055, 0.08, 0.05)), M['belly'], coll, outline=OUT * 0.8))
    add('head', C.mesh_obj('nose', C.ellipsoid(mz + Vector((0, -0.075, 0.018)), (0.028, 0.02, 0.02)), M['dark'], coll))
    add('jaw', C.mesh_obj('jaw', C.ellipsoid(mz + Vector((0, -0.01, -0.035)), (0.04, 0.06, 0.018)), M['belly'], coll, outline=OUT * 0.5))
    _eyes(add, hc, hr, dict(eye_size=spec['eye']), coll, M, spread=0.62, up=0.3, size=1.0)
    antler = _m('m_antler', '#f1e3c2', rough=0.4)
    leafm = _m('m_glowleaf', '#9be15d', rough=0.5, emit='#b6f06a', es=1.0)
    flower = _m('m_flower', '#ffd1e8', rough=0.5, emit='#ffc2e0', es=0.6)
    for sx in (-1, 1):
        side = 'L' if sx > 0 else 'R'
        # 귀 — 큰 나뭇잎꼴, 옆으로 눕는다(안쪽 분홍)
        eb = hc + Vector((sx * 0.085, 0.03, 0.06))
        rot = Matrix.Rotation(math.radians(sx * -62), 4, 'Y') @ Matrix.Rotation(math.radians(-18), 4, 'X')
        add(f'ear.{side}', C.mesh_obj(f'ear{sx}', C.ellipsoid(eb + Vector((sx * 0.07, 0.02, 0.03)), (0.035, 0.018, 0.075), rot=rot.to_euler()), M['skin'], coll, outline=OUT * 0.6))
        # 가지뿔 — 큰 줄기가 뒤로 · 위로 휘고, 앞으로 가지 셋 · 끝마다 빛나는 잎 · 꽃(SSR)
        a0 = hc + Vector((sx * 0.04, 0.03, 0.075))
        beam = spline([a0, a0 + Vector((sx * 0.04, 0.03, 0.1)), a0 + Vector((sx * 0.1, 0.09, 0.2)), a0 + Vector((sx * 0.13, 0.17, 0.3)), a0 + Vector((sx * 0.12, 0.23, 0.36))], 14)
        add('head', C.mesh_obj(f'beam{sx}', C.tube(beam, interp([0.022, 0.018, 0.013, 0.006], len(beam)), seg=7), antler, coll, smooth=False, outline=OUT * 0.5))
        for j, (fi, d, L) in enumerate(((0.3, Vector((sx * 0.02, -0.7, 0.7)), 0.09), (0.55, Vector((sx * 0.1, -0.5, 0.85)), 0.11), (0.78, Vector((sx * 0.08, -0.35, 0.95)), 0.09))):
            p = beam[int(fi * (len(beam) - 1))]
            tip = p + d.normalized() * L
            add('head', C.mesh_obj(f'tine{sx}{j}', C.tube([p, p.lerp(tip, 0.5) + Vector((0, 0, 0.01)), tip], [0.012, 0.009, 0.003], seg=6), antler, coll, smooth=False, outline=OUT * 0.4))
            add('head', C.mesh_obj(f'leaf{sx}{j}', C.ellipsoid(tip + Vector((0, -0.008, -0.01)), (0.012, 0.03, 0.016), rot=C.look_rot(d)), leafm, coll, outline=OUT * 0.3))
        add('head', C.mesh_obj(f'bloom{sx}', C.ellipsoid(beam[-1], (0.022, 0.022, 0.016)), flower, coll, outline=OUT * 0.3))
    # 흰 반점 — 엉덩이 · 어깨(안장 밖)
    spot = _m('m_spot', '#fff6e6', rough=0.8)
    for sx in (-1, 1):
        for k, (y, z) in enumerate(((0.26, 0.47), (0.33, 0.43), (0.22, 0.42), (-0.24, 0.47), (-0.3, 0.44))):
            p, n = C.on_ellipsoid(bc, br, Vector((sx * 0.9, (y - bc.y) / br[1], (z - bc.z) / br[2])))
            add('body', C.mesh_obj(f'spot{sx}{k}', C.ellipsoid(p + n * 0.004, (0.024, 0.024, 0.008), rot=C.look_rot(n)), spot, coll))
    # 꼬리 — 짧고 흰 솜
    tz = bc.z + 0.06
    add('tail1', C.mesh_obj('tail', C.ellipsoid(Vector((0, 0.42, tz)), (0.04, 0.05, 0.06), rot=Matrix.Rotation(math.radians(-25), 4, 'X').to_euler()), M['skin'], coll, outline=OUT * 0.6))
    add('tail2', C.mesh_obj('tailw', C.ellipsoid(Vector((0, 0.45, tz - 0.01)), (0.032, 0.03, 0.045), rot=Matrix.Rotation(math.radians(-25), 4, 'X').to_euler()), spot, coll, outline=OUT * 0.4))
    # SSR 꾸밈 — 꽃 목걸이 · 은 굴레 · 초승달 장식
    gar = []
    for i in range(16):
        a = TAU * i / 16
        gar.append(n0 + Vector((0.11 * math.cos(a), -0.02 + 0.03 * math.sin(a), 0.03 + 0.1 * math.sin(a))))
    cols = ['#ff8fb8', '#fff3a6', '#ffffff', '#ffb36b']
    for i, p in enumerate(gar):
        if p.z < n0.z - 0.02 and abs(p.x) < 0.06:
            continue
        add('neck', C.mesh_obj(f'gar{i}', C.ellipsoid(p, (0.024, 0.024, 0.02)), _m(f'm_gar{i % 4}', cols[i % 4], rough=0.55), coll, outline=OUT * 0.3))
        if i % 2:
            add('neck', C.mesh_obj(f'garleaf{i}', C.ellipsoid(p + Vector((0, 0.015, -0.012)), (0.012, 0.028, 0.008)), _m('m_garleaf', '#4caf50', rough=0.6), coll))
    ring = [mz + Vector((0.058 * math.cos(TAU * i / 12), 0.0, 0.05 * math.sin(TAU * i / 12))) for i in range(12)]
    add('head', _loop_tube(ring, 0.008, M['silver'], coll, 'noseband'))
    add('head', C.mesh_obj('cheek', C.tube([hc + Vector((0.08, 0.02, 0.06)), hc + Vector((0.09, -0.06, -0.02)), mz + Vector((0.055, 0.02, 0.0))], 0.008, seg=6), M['silver'], coll, smooth=False, outline=OUT * 0.3))
    moon = hc + Vector((0.0, -0.1, 0.075))
    add('head', C.mesh_obj('moon', C.torus(moon, 0.022, 0.007, seg=14, ring=6, rot=Matrix.Rotation(math.radians(90), 4, 'X').to_euler()), M['silver'], coll, smooth=False, outline=OUT * 0.3))


def _build_wolf(add, spec, M, coll):
    bc, br, n0, n1 = _body_common(add, spec, M, coll, chest=((0, -0.18, 0.39), (0.19, 0.19, 0.2)), rump=((0, 0.26, 0.4), (0.17, 0.15, 0.15)))
    add('neck', C.mesh_obj('neck', C.tube([n0, n0.lerp(n1, 0.5), n1], [0.13, 0.12, 0.1], seg=12), M['skin'], coll, outline=OUT))
    ruff = _m('m_ruff', '#dfe5ee', rough=0.8)
    # 목 갈기 — 목둘레로 뾰족한 털 다발이 사방으로(실루엣이 커진다)
    for k in range(18):
        a = TAU * k / 18
        if 1.15 < a < 2.0:   # 안장 쪽 위로는 짧게
            continue
        d = Vector((math.cos(a) * 0.9, 0.35, math.sin(a))).normalized()
        base = n0.lerp(n1, 0.35) + Vector((math.cos(a) * 0.11, 0.0, math.sin(a) * 0.11))
        add('neck', C.mesh_obj(f'ruff{k}', C.cone(base + d * 0.04, 0.05, 0.0, 0.14, seg=4, rot=C.look_rot(d)), ruff, coll, smooth=False, outline=OUT * 0.4))
    hc, hr = Vector(spec['head_c']), spec['head_r']
    add('head', C.mesh_obj('head', C.ellipsoid(hc, hr), M['skin'], coll, outline=OUT))
    sn = spline([hc + Vector((0, -0.1, -0.03)), hc + Vector((0, -0.2, -0.05)), hc + Vector((0, -0.28, -0.065))], 8)
    add('head', C.mesh_obj('snout', C.tube(sn, interp([0.08, 0.066, 0.05], len(sn)), seg=10), M['belly'], coll, outline=OUT))
    add('head', C.mesh_obj('nose', C.ellipsoid(sn[-1] + Vector((0, -0.015, 0.02)), (0.03, 0.022, 0.022)), M['dark'], coll))
    add('jaw', C.mesh_obj('jaw', C.ellipsoid(hc + Vector((0, -0.18, -0.105)), (0.055, 0.11, 0.024)), M['belly'], coll, outline=OUT * 0.6))
    for sx in (-1, 1):
        add('head', C.mesh_obj(f'fang{sx}', C.cone(hc + Vector((sx * 0.032, -0.25, -0.1)), 0.013, 0.0, 0.04, seg=6, rot=Matrix.Rotation(math.pi, 4, 'X').to_euler()), M['tooth'], coll, outline=OUT * 0.3))
        side = 'L' if sx > 0 else 'R'
        eb = hc + Vector((sx * 0.07, 0.04, 0.09))
        add(f'ear.{side}', C.mesh_obj(f'ear{sx}', C.cone(eb + Vector((0, 0, 0.07)), 0.05, 0.0, 0.17, seg=4, rot=Matrix.Rotation(math.radians(sx * -12), 4, 'Y').to_euler()), M['skin'], coll, smooth=False, outline=OUT * 0.7))
        add(f'ear.{side}', C.mesh_obj(f'eartip{sx}', C.cone(eb + Vector((sx * -0.01, 0, 0.14)), 0.022, 0.0, 0.05, seg=4, rot=Matrix.Rotation(math.radians(sx * -12), 4, 'Y').to_euler()), M['dark'], coll, smooth=False))
    _eyes(add, hc, hr, dict(eye_size=spec['eye']), coll, M, spread=0.5, up=0.24, size=1.0)
    _brows(add, hc, hr, M, coll, tilt=28, w=0.06, up=0.56)
    # 꼬리 — 굵고 풍성하게, 위로 휘고 끝은 흰색
    tz = bc.z + 0.04
    tp = spline([Vector((0, 0.38, tz)), Vector((0, 0.5, tz + 0.05)), Vector((0, 0.6, tz + 0.12)), Vector((0, 0.66, tz + 0.22))], 12)
    h = len(tp) // 2
    add('tail1', C.mesh_obj('tail1', C.tube(tp[:h + 1], interp([0.065, 0.1], h + 1), seg=10), M['skin'], coll, smooth=False, outline=OUT))
    add('tail2', C.mesh_obj('tail2', C.tube(tp[h:], interp([0.1, 0.095, 0.05], len(tp) - h), seg=10), M['skin'], coll, smooth=False, outline=OUT))
    add('tail2', C.mesh_obj('tailtip', C.ellipsoid(tp[-1] + Vector((0, 0.01, 0.01)), (0.07, 0.07, 0.085)), ruff, coll, outline=OUT * 0.6))
    for k in range(5):   # 꼬리 털 다발 — 위 · 옆으로 삐죽
        p = tp[3 + k * 2] if 3 + k * 2 < len(tp) else tp[-1]
        for sx in (-1, 1):
            d = Vector((sx * 0.8, 0.4, 0.6)).normalized()
            add('tail1' if 3 + k * 2 <= h else 'tail2', C.mesh_obj(f'tfur{k}{sx}', C.cone(p + d * 0.06, 0.035, 0.0, 0.09, seg=4, rot=C.look_rot(d)), M['skin'], coll, smooth=False, outline=OUT * 0.4))
    cape = _m('m_wolfback', '#5b6478', rough=0.85)
    add('body', C.mesh_obj('backmark', C.ellipsoid(Vector((0, 0.27, bc.z + 0.1)), (0.13, 0.14, 0.07)), cape, coll, smooth=False, outline=OUT * 0.5))
    add('neck', C.mesh_obj('neckmark', C.ellipsoid(n0.lerp(n1, 0.6) + Vector((0, 0.03, 0.07)), (0.08, 0.1, 0.05)), cape, coll, smooth=False, outline=OUT * 0.5))
    # UR 꾸밈 — 강철 이마 판(금 테 · 푸른 보석) · 어깨 갑주(얼음 결정) · 안장 옆 룬
    plate = spline([hc + Vector((0, 0.04, 0.115)), hc + Vector((0, -0.06, 0.1)), hc + Vector((0, -0.16, 0.05))], 8)
    add('head', C.mesh_obj('chamfron', C.tube(plate, interp([0.055, 0.06, 0.04], len(plate)), seg=8), M['steel'], coll, smooth=False, outline=OUT * 0.6))
    gem = _m('m_icegem', '#4fd2ff', rough=0.1, emit='#4fd2ff', es=1.3)
    add('head', C.mesh_obj('gem', C.ellipsoid(plate[len(plate) // 2] + Vector((0, -0.01, 0.045)), (0.02, 0.02, 0.016)), gem, coll, outline=OUT * 0.3))
    add('head', C.mesh_obj('gemrim', C.torus(plate[len(plate) // 2] + Vector((0, -0.01, 0.04)), 0.026, 0.006, seg=12, ring=5), M['gold'], coll, smooth=False))
    ice = _m('m_ice', '#bdf1ff', rough=0.1, emit='#9fe8ff', es=0.7)
    for sx in (-1, 1):
        sh = Vector((sx * 0.17, -0.2, 0.42))
        add('body', C.mesh_obj(f'pauldron{sx}', C.ellipsoid(sh, (0.07, 0.11, 0.085), rot=Matrix.Rotation(math.radians(sx * 20), 4, 'Y').to_euler()), M['steel'], coll, smooth=False, outline=OUT * 0.7))
        add('body', C.mesh_obj(f'paurim{sx}', C.tube([sh + Vector((sx * 0.02, -0.1, -0.06)), sh + Vector((sx * 0.065, 0.0, -0.065)), sh + Vector((sx * 0.02, 0.1, -0.06))], 0.012, seg=6), M['gold'], coll, smooth=False, outline=OUT * 0.3))
        for j in range(3):
            d = Vector((sx * 0.6, -0.3 + j * 0.3, 1)).normalized()
            add('body', C.mesh_obj(f'ice{sx}{j}', C.cone(sh + Vector((sx * 0.02, -0.04 + j * 0.04, 0.06)) + d * 0.03, 0.018, 0.0, 0.07 - abs(j - 1) * 0.02, seg=4, rot=C.look_rot(d)), ice, coll, smooth=False, outline=OUT * 0.3))
    # 투구 볏 — 이마 판 위로 금 테 두른 강철 날 둘(탄 사람에 가리지 않는 머리에 등급을 보인다)
    for sx in (-1, 1):
        cb = hc + Vector((sx * 0.06, 0.0, 0.12))
        add('head', C.mesh_obj(f'crestfin{sx}', C.cone(cb + Vector((sx * 0.01, 0.04, 0.05)), 0.03, 0.0, 0.12, seg=3, rot=C.look_rot(Vector((sx * 0.35, 0.8, 0.7)))), M['steel'], coll, smooth=False, outline=OUT * 0.5))
        add('head', C.mesh_obj(f'crestrim{sx}', C.tube([cb, cb + Vector((sx * 0.03, 0.07, 0.07))], [0.008, 0.004], seg=5), M['gold'], coll, smooth=False))
    rune = _m('m_rune', '#7fe8ff', rough=0.3, emit='#7fe8ff', es=1.1)
    for sx in (-1, 1):   # 엉덩이 서리 룬 — 빛나는 고리 + 갈래(뒤에서도 보인다)
        rp, rn = C.on_ellipsoid(Vector((0, 0.26, 0.4)), (0.17, 0.15, 0.15), Vector((sx * 1.0, 0.25, 0.25)))
        add('body', C.mesh_obj(f'rumprune{sx}', C.torus(rp + rn * 0.006, 0.045, 0.006, seg=16, ring=4, rot=C.look_rot(rn)), rune, coll, smooth=False))
        for j in range(3):
            d = Matrix.Rotation(math.radians(120 * j), 4, rn) @ (rn.cross(Vector((0, 0, 1))).normalized())
            add('body', C.mesh_obj(f'rumpray{sx}{j}', C.tube([rp + rn * 0.006 + d * 0.012, rp + rn * 0.006 + d * 0.04], 0.005, seg=4), rune, coll, smooth=False))
    rc = Vector((spec['body_r'][0] * 1.07, SEAT[1] - 0.04, bc.z - 0.01))
    add('body', C.mesh_obj('rune', C.torus(rc, 0.04, 0.006, seg=16, ring=4, rot=Matrix.Rotation(math.radians(90), 4, 'Y').to_euler()), rune, coll, smooth=False))
    add('body', C.mesh_obj('rune_x', C.box(rc + Vector((0.004, 0, 0)), (0.004, 0.05, 0.006), rot=Matrix.Rotation(math.radians(45), 4, 'X').to_euler()), rune, coll))
    add('body', C.mesh_obj('rune_y', C.box(rc + Vector((0.004, 0, 0)), (0.004, 0.05, 0.006), rot=Matrix.Rotation(math.radians(-45), 4, 'X').to_euler()), rune, coll))


def _build_drake(add, spec, M, coll):
    bc, br, n0, n1 = _body_common(add, spec, M, coll, chest=((0, -0.18, 0.4), (0.2, 0.19, 0.18)), rump=((0, 0.26, 0.4), (0.19, 0.15, 0.15)))
    plates = _m('m_plates', spec['belly'], rough=0.6)
    for k in range(5):   # 배 비늘판 — 가슴부터 배까지 띠
        y = -0.24 + k * 0.11
        add('body', C.mesh_obj(f'plate{k}', C.ellipsoid(Vector((0, y, bc.z - br[2] * 0.82)), (br[0] * 0.62, 0.05, 0.035)), plates, coll, smooth=False, outline=OUT * 0.4))
    neckp = spline([n0, n0 + Vector((0, -0.1, 0.1)), n0.lerp(n1, 0.7) + Vector((0, 0.02, 0)), n1], 12)
    add('neck', C.mesh_obj('neck', C.tube(neckp, interp([0.12, 0.1, 0.085, 0.075], len(neckp)), seg=10), M['skin'], coll, outline=OUT))
    add('neck', C.mesh_obj('neckp', C.tube([p + Vector((0, -0.05, -0.015)) for p in neckp[1:-1]], interp([0.075, 0.06, 0.05], len(neckp) - 2), seg=8), plates, coll, smooth=False, outline=OUT * 0.4))
    hc, hr = Vector(spec['head_c']), spec['head_r']
    add('head', C.mesh_obj('head', C.ellipsoid(hc, hr), M['skin'], coll, outline=OUT))
    sn = spline([hc + Vector((0, -0.07, -0.02)), hc + Vector((0, -0.16, -0.035)), hc + Vector((0, -0.24, -0.045))], 8)
    add('head', C.mesh_obj('snout', C.tube(sn, interp([0.075, 0.064, 0.052], len(sn)), seg=8), M['skin'], coll, smooth=False, outline=OUT))
    ember = _m('m_ember', '#ff8a3d', rough=0.3, emit='#ff7a1a', es=1.2)
    for sx in (-1, 1):
        add('head', C.mesh_obj(f'nos{sx}', C.ellipsoid(sn[-1] + Vector((sx * 0.026, -0.03, 0.03)), (0.014, 0.012, 0.01)), ember, coll))
        bp = hc + Vector((sx * 0.05, 0.02, 0.07))
        horn = spline([bp, bp + Vector((sx * 0.03, 0.08, 0.05)), bp + Vector((sx * 0.05, 0.18, 0.07)), bp + Vector((sx * 0.045, 0.26, 0.12))], 10)
        add('head', C.mesh_obj(f'horn{sx}', C.tube(horn, interp([0.034, 0.026, 0.014, 0.003], len(horn)), seg=7), _m('m_dhorn', '#efe0c0', rough=0.35), coll, smooth=False, outline=OUT * 0.6))
        cs = hc + Vector((sx * 0.1, 0.03, -0.03))
        add('head', C.mesh_obj(f'cheekspike{sx}', C.cone(cs + Vector((sx * 0.03, 0.04, 0)), 0.022, 0.0, 0.08, seg=4, rot=C.look_rot(Vector((sx * 0.7, 0.7, 0.1)))), M['dark'], coll, smooth=False, outline=OUT * 0.4))
        side = 'L' if sx > 0 else 'R'
        add(f'ear.{side}', C.mesh_obj(f'frill{sx}', C.cone(hc + Vector((sx * 0.1, 0.06, 0.03)), 0.035, 0.0, 0.09, seg=3, rot=C.look_rot(Vector((sx * 1.0, 0.6, 0.3)))), M['dark'], coll, smooth=False, outline=OUT * 0.4))
    add('jaw', C.mesh_obj('jaw', C.tube([hc + Vector((0, -0.06, -0.07)), hc + Vector((0, -0.15, -0.085)), hc + Vector((0, -0.22, -0.09))], [0.06, 0.05, 0.035], seg=8), M['skin'], coll, smooth=False, outline=OUT * 0.7))
    for k in range(4):
        for sx in (-1, 1):
            add('jaw', C.mesh_obj(f'tooth{k}{sx}', C.cone(hc + Vector((sx * 0.035, -0.1 - k * 0.035, -0.06)), 0.009, 0.0, 0.025, seg=4), M['tooth'], coll))
    _eyes(add, hc, hr, dict(eye_size=spec['eye']), coll, M, spread=0.55, up=0.3, size=1.0)
    _brows(add, hc, hr, M, coll, tilt=30, w=0.06, up=0.6)
    # LR 꾸밈 — 금 머리 장식(붉은 보석) · 금 가슴 갑주 · 등 가시(안장 밖)
    gem = _m('m_rubygem', '#ff3b30', rough=0.1, emit='#ff4a3a', es=1.2)
    crest = hc + Vector((0, -0.05, 0.095))
    add('head', C.mesh_obj('crest', C.tube([crest + Vector((0, 0.08, -0.01)), crest, crest + Vector((0, -0.07, -0.02))], [0.045, 0.05, 0.03], seg=8), M['gold'], coll, smooth=False, outline=OUT * 0.5))
    add('head', C.mesh_obj('crestgem', C.ellipsoid(crest + Vector((0, -0.012, 0.035)), (0.024, 0.02, 0.02)), gem, coll, outline=OUT * 0.3))
    for k, d in enumerate((-1, 0, 1)):
        add('head', C.mesh_obj(f'crown{k}', C.cone(crest + Vector((d * 0.03, 0.02 + abs(d) * 0.02, 0.05)), 0.016, 0.0, 0.06 - abs(d) * 0.015, seg=4), M['gold'], coll, smooth=False, outline=OUT * 0.3))
    cp = Vector((0, -0.31, 0.39))
    add('body', C.mesh_obj('chestplate', C.ellipsoid(cp, (0.17, 0.06, 0.15), rot=Matrix.Rotation(math.radians(-25), 4, 'X').to_euler()), M['gold'], coll, smooth=False, outline=OUT * 0.6))
    add('body', C.mesh_obj('chestgem', C.ellipsoid(cp + Vector((0, -0.055, 0.03)), (0.03, 0.02, 0.03)), gem, coll, outline=OUT * 0.3))
    spike = _m('m_dspike', '#ffb347', rough=0.4)
    for k in range(5):   # 목덜미 가시
        p = neckp[2 + k * 2] if 2 + k * 2 < len(neckp) else neckp[-1]
        add('neck', C.mesh_obj(f'nspike{k}', C.cone(p + Vector((0, 0.06, 0.07)), 0.03, 0.0, 0.08, seg=4, rot=C.look_rot(Vector((0, 0.8, 1)))), spike, coll, smooth=False, outline=OUT * 0.4))
    # 꼬리 — 길게 뒤로 빼고(칸 안) 끝에 금 날 + 불꽃
    tz = bc.z + 0.03
    tp = spline([Vector((0, 0.38, tz)), Vector((0, 0.5, tz - 0.02)), Vector((0, 0.62, tz + 0.0)), Vector((0, 0.72, tz + 0.06))], 14)
    h = len(tp) // 2
    add('tail1', C.mesh_obj('tail1', C.tube(tp[:h + 1], interp([0.1, 0.07], h + 1), seg=8), M['skin'], coll, smooth=False, outline=OUT))
    add('tail2', C.mesh_obj('tail2', C.tube(tp[h:], interp([0.07, 0.045, 0.02], len(tp) - h), seg=8), M['skin'], coll, smooth=False, outline=OUT))
    for k in range(3):
        p = tp[3 + k * 3]
        add('tail1' if 3 + k * 3 <= h else 'tail2', C.mesh_obj(f'tspike{k}', C.cone(p + Vector((0, 0.0, 0.06)), 0.025, 0.0, 0.07, seg=4, rot=C.look_rot(Vector((0, 0.6, 1)))), spike, coll, smooth=False, outline=OUT * 0.4))
    add('tail2', C.mesh_obj('blade', C.cone(tp[-1] + Vector((0, 0.03, 0.02)), 0.05, 0.0, 0.09, seg=3, rot=C.look_rot(Vector((0, 1, 0.5)))), M['gold'], coll, smooth=False, outline=OUT * 0.5))
    flame = _m('m_tflame', '#ffb347', rough=0.3, emit='#ff8a1a', es=1.3)
    for k in range(3):
        add('tail2', C.mesh_obj(f'tflame{k}', C.cone(tp[-1] + Vector(((k - 1) * 0.035, 0.05, 0.12 - abs(k - 1) * 0.035)), 0.05, 0.0, 0.19 - abs(k - 1) * 0.05, seg=6), flame, coll))
    # 날개 — 팔 뼈(wing) + 손가락 · 막(wing2). 접고 펼 수 있게 둘로 나눈다
    wm = _m('m_wingmem', '#7a1f14', rough=0.6)
    wm2 = _m('m_wingmem2', '#c2452a', rough=0.6)
    for sx, s in ((1, 'L'), (-1, 'R')):
        root = Vector((sx * 0.1, -0.1, 0.52))
        elbow = Vector((sx * 0.34, -0.04, 0.76))
        tips = [Vector((sx * 0.52, 0.06, 1.0)), Vector((sx * 0.66, 0.2, 0.86)), Vector((sx * 0.6, 0.34, 0.66)), Vector((sx * 0.42, 0.36, 0.52))]
        add(f'wing.{s}', C.mesh_obj(f'warm{s}', C.tube([root, root.lerp(elbow, 0.5) + Vector((0, 0, 0.03)), elbow], [0.04, 0.032, 0.026], seg=8), M['skin'], coll, smooth=False, outline=OUT * 0.6))
        add(f'wing.{s}', C.mesh_obj(f'wclaw{s}', C.cone(elbow + Vector((0, -0.03, 0.03)), 0.016, 0.0, 0.05, seg=4, rot=C.look_rot(Vector((0, -0.6, 1)))), M['claw'], coll))
        for k, t in enumerate(tips[:3]):
            add(f'wing2.{s}', C.mesh_obj(f'wf{s}{k}', C.tube([elbow, t], [0.022, 0.006], seg=6), M['skin'], coll, smooth=False, outline=OUT * 0.5))
        # 막 — 팔꿈치에서 부채꼴(손가락 사이 오목) · 안쪽 막은 몸 쪽 팔 뼈에
        bm = bmesh.new()
        edge = [tips[0]]
        for a, b in zip(tips, tips[1:]):
            edge += [a.lerp(b, 0.5).lerp(elbow, 0.22), b]
        vs = [bm.verts.new(elbow)] + [bm.verts.new(p) for p in edge]
        for i in range(1, len(vs) - 1):
            bm.faces.new((vs[0], vs[i], vs[i + 1]))
        bm.normal_update()
        o = C.mesh_obj(f'wmem{s}', bm, wm, coll, smooth=False)
        so = o.modifiers.new('solid', 'SOLIDIFY'); so.thickness = 0.012
        C.add_outline(o, OUT * 0.5)
        add(f'wing2.{s}', o)
        bm = bmesh.new()
        vs = [bm.verts.new(p) for p in (root, elbow, tips[3], Vector((sx * 0.12, 0.2, 0.5)))]
        bm.faces.new(vs)
        bm.normal_update()
        o = C.mesh_obj(f'wmemin{s}', bm, wm2, coll, smooth=False)
        so = o.modifiers.new('solid', 'SOLIDIFY'); so.thickness = 0.012
        C.add_outline(o, OUT * 0.5)
        add(f'wing.{s}', o)


# 등급 메달 (2026-11-09, 사용자 목록 "안장 꾸밈은 주인공에 가려 등급 차이가 머리 · 꼬리 · 날개로만 보임") — 탄 사람에 가리지 않는
# 가슴 앞 · 엉덩이(카메라 쪽)에 테 + 보석 메달과 술 두 가닥. 등급색: 영웅 놋쇠 · 홍옥 / 전설 은 · 비취 / 신화 금 · 청옥(빛) / 초월 금 · 홍옥(빛) + 가시 테
BADGE = {
    'SR': dict(rim='brass', gem='#d23a2a', glow=0.0, tassel='#b8322c'),
    'SSR': dict(rim='silver', gem='#22c55e', glow=0.7, tassel='#1f8a5e'),
    'UR': dict(rim='gold', gem='#3b82f6', glow=1.1, tassel='#2a4fb8'),
    'LR': dict(rim='gold', gem='#ff3b30', glow=1.2, tassel='#8e1b2b'),
}


def _badge(add, bone, p, n, spec, M, coll, name, r=0.045, tassel=True):
    b = BADGE[spec['tier']]
    rot = C.look_rot(n)
    add(bone, C.mesh_obj(f'{name}_back', C.ellipsoid(p + n * 0.004, (r * 1.05, r * 1.05, r * 0.25), rot=rot), _m('m_badgeback', '#3b2415', rough=0.8), coll))
    add(bone, C.mesh_obj(f'{name}_rim', C.torus(p + n * 0.012, r * 0.92, r * 0.2, seg=16, ring=5, rot=rot), M[b['rim']], coll, smooth=False, outline=OUT * 0.35))
    gm = _m('m_badgegem_' + spec['tier'], b['gem'], rough=0.12, emit=b['gem'] if b['glow'] else None, es=b['glow'])
    add(bone, C.mesh_obj(f'{name}_gem', C.ellipsoid(p + n * 0.022, (r * 0.55, r * 0.55, r * 0.35), rot=rot), gm, coll, outline=OUT * 0.25))
    if spec['tier'] == 'LR':   # 초월 — 테 둘레 금 가시 여섯
        for k in range(6):
            a = math.tau * k / 6
            t1 = rot.to_matrix() @ Vector((math.cos(a), math.sin(a), 0))
            add(bone, C.mesh_obj(f'{name}_spk{k}', C.cone(p + n * 0.012 + t1 * r * 1.15, r * 0.18, 0.0, r * 0.45, seg=4, rot=C.look_rot(t1)), M['gold'], coll, smooth=False))
    if tassel:
        tm = _m('m_tassel_' + spec['tier'], b['tassel'], rough=0.8)
        for sx in (-1, 1):
            top = p + n * 0.01 + Vector((sx * r * 0.45, 0, -r * 0.8))
            add(bone, C.mesh_obj(f'{name}_cord{sx}', C.tube([top, top + Vector((0, 0, -0.05))], 0.008, seg=5), tm, coll, smooth=False))
            add(bone, C.mesh_obj(f'{name}_tas{sx}', C.cone(top + Vector((0, 0, -0.08)), 0.022, 0.005, 0.07, seg=6), tm, coll, smooth=False, outline=OUT * 0.3))


def _tier_badges(add, spec, M, coll, who):
    """가슴 앞(비룡은 금 갑주가 이미 있어 뺀다) · 엉덩이 옆(늑대는 서리 룬 위쪽). 양옆 모두 — 게임은 +x 옆을, 미리보기(mount_lab)는 거울상이라 -x 옆을 본다"""
    chest, rump = spec.get('_chest'), spec.get('_rump')
    for sx in (1, -1):
        if chest and who != 'mount-drake':
            c, r = Vector(chest[0]), chest[1]
            p, n = C.on_ellipsoid(c, r, Vector((sx * 0.6, -1.0, 0.1)))
            _badge(add, 'body', p, n, spec, M, coll, f'chestbadge{sx}', r=0.068)
        if rump:
            c, r = Vector(rump[0]), rump[1]
            d = Vector((sx * 1.0, 0.45, 0.85)) if who == 'mount-wolf' else Vector((sx * 1.0, 0.35, 0.25))
            p, n = C.on_ellipsoid(c, r, d)
            _badge(add, 'body', p, n, spec, M, coll, f'rumpbadge{sx}', r=0.058 if who == 'mount-wolf' else 0.068)


BUILDERS = {'mount-boar': _build_boar, 'mount-deer': _build_deer, 'mount-wolf': _build_wolf, 'mount-drake': _build_drake}


def build(who, coll=None):
    spec = SPECIES[who]
    coll = coll or C.collection(who)
    bones = _bones(spec, who)
    arm = _armature(who, bones, coll)
    parts = {k: [] for k in bones}

    def add(bone, o):
        parts.setdefault(bone, []).append(o)

    saved = C.FACET
    C.FACET = 12   # 로우 폴리 — 주인공 · 동료 · 몬스터와 같은 각진 면
    try:
        M = _mats(spec, who)
        for leg in LEGS:
            hip, knee, ankle, rr = _leg_pts(spec, leg)
            _limb(add, leg, hip, knee, ankle, rr, M['skin'], coll)
            _foot(add, leg, ankle, spec['foot'], rr[2], M, coll)
        BUILDERS[who](add, spec, M, coll)
        _tier_badges(add, spec, M, coll, who)
        _saddle(add, spec, M, coll)
    finally:
        C.FACET = saved
    bpy.context.view_layer.update()
    for bone, objs in parts.items():
        for o in objs:
            _attach(o, arm, bone)
    return MRig(arm, parts, spec, who)


# ── 자세 ──
def _aim(arm, name, want):
    """뼈를 지금 자리에서 want(아마추어 공간 방향) 쪽으로 돌린다 — 최소 회전"""
    bpy.context.view_layer.update()
    pb = arm.pose.bones[name]
    cur = pb.tail - pb.head
    if cur.length < 1e-6 or Vector(want).length < 1e-6:
        return
    M = pb.matrix.to_3x3().normalized()
    Rd = cur.normalized().rotation_difference(Vector(want).normalized()).to_matrix()
    pb.rotation_quaternion = pb.rotation_quaternion @ (M.inverted() @ Rd @ M).to_quaternion()


def _leg_ik(arm, leg, T, pole):
    pu = arm.pose.bones[f'{leg}.u']
    bpy.context.view_layer.update()
    hip = pu.head.copy()
    L1 = arm.data.bones[f'{leg}.u'].length
    L2 = arm.data.bones[f'{leg}.d'].length
    D = T - hip
    d = max(abs(L1 - L2) + 1e-3, min(D.length, (L1 + L2) * 0.999))
    u = D.normalized()
    p = Vector(pole)
    n = p - u * u.dot(p)
    n = n.normalized() if n.length > 1e-6 else Vector((0, -1, 0))
    a = (L1 * L1 - L2 * L2 + d * d) / (2 * d)
    h = math.sqrt(max(0.0, L1 * L1 - a * a))
    knee = hip + u * a + n * h
    _aim(arm, f'{leg}.u', knee - hip)
    bpy.context.view_layer.update()
    pd = arm.pose.bones[f'{leg}.d']
    _aim(arm, f'{leg}.d', T - pd.head)


def pose(rig, P):
    """P: dz 몸 높이 · dy 앞으로(+) · pitch 몸 숙임(+ 코가 아래, 안장 가운데 축) · neck/head 숙임+ · jaw 벌림+ · ear_l/ear_r 뒤로 젖힘+
    tail/tail2 위로+ · wing 날개 위로+ · wfold 접기+ · feet {다리: (dy 뒤로+, dz 들기, toe 발끝 숙임°)} — 디딘 발은 땅에 남는다"""
    arm = rig.arm
    pb = arm.pose.bones
    for b in pb:
        b.rotation_mode = 'QUATERNION'
        b.rotation_quaternion = (1, 0, 0, 0)
        b.scale = (1, 1, 1)
        b.location = (0, 0, 0)
    X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)
    dy, dz = P.get('dy', 0.0), P.get('dz', 0.0)
    R0 = arm.data.bones['root'].matrix_local.to_3x3()
    pb['root'].location = R0.inverted() @ Vector((0, -dy, dz))
    pb['body'].rotation_quaternion = _rot_local(arm, 'body', X, P.get('pitch', 0.0))
    pb['neck'].rotation_quaternion = _rot_local(arm, 'neck', X, P.get('neck', 0.0))
    pb['head'].rotation_quaternion = _rot_local(arm, 'head', X, P.get('head', 0.0))
    pb['jaw'].rotation_quaternion = _rot_local(arm, 'jaw', X, P.get('jaw', 0.0))
    pb['ear.L'].rotation_quaternion = _rot_local(arm, 'ear.L', X, -P.get('ear_l', P.get('ear', 0.0)))
    pb['ear.R'].rotation_quaternion = _rot_local(arm, 'ear.R', X, -P.get('ear_r', P.get('ear', 0.0)))
    pb['tail1'].rotation_quaternion = _rot_local(arm, 'tail1', X, P.get('tail', 0.0))
    pb['tail2'].rotation_quaternion = _rot_local(arm, 'tail2', X, P.get('tail2', P.get('tail', 0.0) * 0.8))
    if 'wing.L' in pb:
        for s, sx in (('L', 1), ('R', -1)):
            pb[f'wing.{s}'].rotation_quaternion = _rot_local(arm, f'wing.{s}', Y, -sx * P.get('wing', 0.0))
            pb[f'wing2.{s}'].rotation_quaternion = _rot_local(arm, f'wing2.{s}', Y, -sx * P.get('wing2', P.get('wing', 0.0) * 0.6)) @ _rot_local(arm, f'wing2.{s}', Z, sx * P.get('wfold', 0.0))
    feet = P.get('feet', {})
    spec = rig.cfg
    for leg in LEGS:
        _, _, ankle, _ = _leg_pts(spec, leg)
        fdy, fdz, toe = feet.get(leg, (0.0, 0.0, 0.0))
        T = ankle + Vector((0, fdy - dy, fdz))
        _leg_ik(arm, leg, T, (0, -1, 0.15) if leg[0] == 'f' else (0, 1, 0.15))
        t = math.radians(toe)
        _aim(arm, f'{leg}.f', Vector((0, -math.cos(t), -math.sin(t))))
    bpy.context.view_layer.update()


# ── 동작 ──
def _step(phi, beta, S, H, toe):
    """발 하나의 한 주기(0~1) — 디딤(앞→뒤로 땅을 민다) · 들기(뒤→앞으로 들어 옮긴다). 반환 (dy 뒤로+, dz, 발끝°)"""
    phi %= 1.0
    if phi < beta:
        u = phi / beta
        return (-S / 2 + S * u, 0.0, -6.0 * u)
    u = (phi - beta) / (1 - beta)
    e = 0.5 - 0.5 * math.cos(math.pi * u)
    return (S / 2 - S * e, H * math.sin(math.pi * u) ** 0.8, toe * math.sin(math.pi * u))


GAITS = {
    # 다리 위상 · 디딤 비율 · 보폭 · 들기 · 몸 출렁(위아래 · 앞뒤 흔들) — 6칸 한 바퀴(600ms)
    'trot': dict(phase=dict(fl=0.0, br=0.0, fr=0.5, bl=0.5), beta=0.56, S=0.17, H=0.075, toe=(40, 25), bob=0.018, bobn=2, pitch=1.5, head=4, tail=10, ear=10),
    'canter': dict(phase=dict(bl=0.0, br=0.12, fl=0.45, fr=0.6), beta=0.42, S=0.3, H=0.13, toe=(55, 35), bob=0.03, bobn=1, pitch=4.5, head=7, tail=14, ear=6),
    'gallop': dict(phase=dict(bl=0.0, br=0.1, fl=0.5, fr=0.6), beta=0.4, S=0.32, H=0.1, toe=(45, 30), bob=0.026, bobn=1, pitch=4.0, head=6, tail=16, ear=8),
    'stride': dict(phase=dict(fl=0.0, br=0.04, fr=0.5, bl=0.54), beta=0.6, S=0.22, H=0.075, toe=(30, 25), bob=0.016, bobn=2, pitch=1.5, head=5, tail=12, ear=6),
}


def _n(name):
    return _LAYOUT[name]['frames']


def actions(who):
    spec = SPECIES[who]
    g = GAITS[spec['gait']]
    drake = who == 'mount-drake'
    base = dict(neck=0.0, head=0.0, tail=0.0, wing=12.0 if drake else 0.0, wfold=26.0 if drake else 0.0)
    # 대기 — 숨(몸이 오르내림) · 머리 끄덕 · 꼬리 살랑 · 귀 한 번 털기 · 비룡은 날개를 천천히 고른다
    idle = []
    n = _n('idle')
    for i in range(n):
        t = TAU * i / n
        P = dict(base, dz=0.006 * math.sin(t), pitch=0.6 * math.sin(t), neck=-2.5 * math.sin(t), head=3.0 * math.sin(t + 0.6),
                 tail=8 * math.sin(t + 1.2), tail2=12 * math.sin(t + 0.4), jaw=1.5 + 1.5 * math.sin(t))
        if i == 2:
            P['ear_l'] = 28
        if drake:
            P['wing'] = base['wing'] + 7 * math.sin(t)
            P['wfold'] = base['wfold'] - 6 * math.sin(t)
        idle.append(P)
    # 달리기 — 종마다 걸음새. 디딘 발은 땅을 밀고 몸은 출렁, 머리는 반대로 끄덕여 균형 · 꼬리 · 귀는 반 박자 늦게 따라온다
    walk = []
    n = _n('walk')
    for i in range(n):
        u = i / n
        t = TAU * u
        feet = {}
        for leg in LEGS:
            front = leg[0] == 'f'
            feet[leg] = _step(u + g['phase'][leg], g['beta'], g['S'], g['H'] * (1.0 if front else 0.9), g['toe'][0 if front else 1])
        bob = g['bob'] * (0.5 + 0.5 * math.cos(g['bobn'] * t)) if g['bobn'] == 2 else g['bob'] * max(0.0, math.sin(t + 0.6))
        P = dict(base, feet=feet, dz=bob, pitch=g['pitch'] * math.sin(t + 0.3), neck=-g['head'] * 0.6 * math.sin(t + 0.3), head=g['head'] * math.sin(t + 1.1),
                 tail=6 + g['tail'] * math.sin(t - 1.0), tail2=g['tail'] * 1.2 * math.sin(t - 1.6), ear=g['ear'] * (0.6 + 0.4 * math.sin(t - 0.8)), jaw=3 + 2 * math.sin(t))
        if drake:   # 날갯짓 — 한 걸음에 한 번 크게(내려칠 때 몸이 뜬다)
            P['wing'] = 22 + 26 * math.sin(t + 0.4)
            P['wing2'] = 10 + 26 * math.sin(t - 0.3)
            P['wfold'] = 12 - 10 * math.sin(t)
        walk.append(P)
    # 공격 — 예비 2칸(움츠림) + 공격 4칸. 종마다: 멧돼지 엄니 치받기 · 사슴 뿔 찌르기 · 늑대 물기 · 비룡 포효(날개 펼침). 사람을 태워 몸째 튀어 나가진 않는다
    planted = {leg: (0.0, 0.0, 0.0) for leg in LEGS}
    def braced(fd=-0.05, bd=0.03):
        return {'fl': (fd, 0.0, 0.0), 'fr': (fd * 0.7, 0.0, 0.0), 'bl': (bd, 0.0, 0.0), 'br': (bd * 0.7, 0.0, 0.0)}
    A = {
        'mount-boar': [dict(dy=-0.02, dz=-0.012, pitch=3, neck=10, head=18, ear=20, tail=-4, feet=braced(-0.04, 0.02)),
                       dict(dy=-0.03, dz=-0.02, pitch=5, neck=16, head=26, ear=30, tail=-6, feet=braced(-0.05, 0.03)),
                       dict(dy=0.03, dz=0.0, pitch=-2, neck=4, head=0, jaw=10, ear=10, tail=10, feet={'fl': (-0.06, 0.05, 30), 'fr': (-0.02, 0.0, 0), 'bl': (0.04, 0, 0), 'br': (0.03, 0, 0)}),
                       dict(dy=0.05, dz=0.012, pitch=-5, neck=-8, head=-28, jaw=18, ear=-10, tail=16, feet={'fl': (-0.08, 0.02, 10), 'fr': (-0.04, 0.0, 0), 'bl': (0.06, 0, 0), 'br': (0.05, 0, 0)}),
                       dict(dy=0.04, dz=0.006, pitch=-3, neck=-4, head=-18, jaw=10, ear=-4, tail=12, feet=braced(-0.06, 0.04)),
                       dict(dy=0.01, dz=0.0, pitch=0, neck=0, head=-4, jaw=4, tail=6, feet=planted)],
        'mount-deer': [dict(dy=-0.02, pitch=-3, neck=-8, head=-10, ear=16, tail=8, feet=braced(-0.03, 0.02)),
                       dict(dy=-0.03, dz=0.01, pitch=-5, neck=-14, head=-16, ear=24, tail=12, feet={'fl': (-0.04, 0.07, 40), 'fr': (-0.02, 0.0, 0), 'bl': (0.03, 0, 0), 'br': (0.02, 0, 0)}),
                       dict(dy=0.02, dz=0.0, pitch=2, neck=14, head=18, ear=6, tail=6, feet={'fl': (-0.07, 0.02, 10), 'fr': (-0.03, 0, 0), 'bl': (0.04, 0, 0), 'br': (0.03, 0, 0)}),
                       dict(dy=0.03, dz=-0.008, pitch=5, neck=15, head=27, jaw=6, ear=-6, tail=-4, feet=braced(-0.07, 0.04)),   # 칸(480) 안 — 앞으로 더 빼면 머리가 칸 밖
                       dict(dy=0.025, dz=-0.004, pitch=4, neck=11, head=21, jaw=3, tail=0, feet=braced(-0.06, 0.035)),
                       dict(dy=0.01, pitch=1, neck=6, head=6, tail=4, feet=planted)],
        'mount-wolf': [dict(dy=-0.02, dz=-0.015, pitch=3, neck=8, head=10, ear=24, tail=-6, feet=braced(-0.03, 0.03)),
                       dict(dy=-0.035, dz=-0.025, pitch=5, neck=14, head=14, ear=32, tail=-10, jaw=6, feet=braced(-0.04, 0.04)),
                       dict(dy=0.03, dz=0.01, pitch=-3, neck=-4, head=-8, jaw=26, ear=10, tail=12, feet={'fl': (-0.07, 0.05, 30), 'fr': (-0.05, 0.03, 20), 'bl': (0.05, 0, 0), 'br': (0.04, 0, 0)}),
                       dict(dy=0.06, dz=0.0, pitch=-1, neck=8, head=10, jaw=4, ear=-6, tail=16, feet=braced(-0.09, 0.05)),
                       dict(dy=0.05, dz=-0.004, pitch=0, neck=10, head=12, jaw=14, ear=-2, tail=12, feet=braced(-0.08, 0.05)),
                       dict(dy=0.015, pitch=0, neck=2, head=2, jaw=3, tail=6, feet=planted)],
        'mount-drake': [dict(dy=-0.02, dz=-0.01, pitch=-2, neck=-10, head=-12, jaw=6, tail=8, wing=40, wing2=30, wfold=6, feet=braced(-0.02, 0.03)),
                        dict(dy=-0.03, dz=-0.015, pitch=-4, neck=-18, head=-18, jaw=10, tail=12, wing=52, wing2=40, wfold=0, feet=braced(-0.03, 0.04)),
                        dict(dy=0.02, dz=0.0, pitch=1, neck=8, head=6, jaw=26, tail=4, wing=30, wing2=18, wfold=4, feet=braced(-0.05, 0.03)),
                        dict(dy=0.045, dz=0.01, pitch=3, neck=18, head=12, jaw=36, tail=-2, wing=10, wing2=-4, wfold=8, feet=braced(-0.07, 0.04)),
                        dict(dy=0.04, dz=0.006, pitch=2, neck=16, head=10, jaw=32, tail=0, wing=18, wing2=6, wfold=10, feet=braced(-0.07, 0.04)),
                        dict(dy=0.01, pitch=0, neck=4, head=2, jaw=10, tail=4, wing=14, wing2=10, wfold=20, feet=planted)],
    }[who]
    attack = [dict(base, **P) for P in A]
    # 방어 — 뒤로 물러앉아 앞발을 버티고 머리를 숙여 막는다(비룡은 날개로 몸을 감싼다)
    brace = dict(base, dy=-0.03, dz=-0.02, pitch=-4, neck=10, head=16, ear=26, tail=-8, feet=braced(-0.08, -0.02))
    if drake:
        brace.update(wing=-8, wing2=-20, wfold=-6)
    guard = [_lerp(idle[0], brace, 0.6), brace, dict(brace, dz=-0.026, pitch=-5, head=20), _lerp(brace, idle[0], 0.5)]
    out = {'idle': idle, 'walk': walk, 'attack': attack, 'guard': guard}
    for name, poses in out.items():
        assert len(poses) == _n(name), (name, len(poses))
    return out


def _lerp(a, b, t):
    out = {}
    for k in set(a) | set(b):
        if k == 'feet':
            fa, fb = a.get('feet', {}), b.get('feet', {})
            out['feet'] = {leg: tuple((1 - t) * x + t * y for x, y in zip(fa.get(leg, (0, 0, 0)), fb.get(leg, (0, 0, 0)))) for leg in LEGS}
            continue
        out[k] = (1 - t) * a.get(k, 0.0) + t * b.get(k, 0.0)
    return out
