"""펫 2판 꾸밈 (2026-11-19, 사용자: "펫 등 도감 리소스 퀄이 안 좋아 동기부여가 안 돼 — 모델링부터 다시").
예전 펫 여섯은 같은 몸 · 같은 비버 얼굴(흰자 + 검은 눈동자 + 앞니)에 털색 · 귀 · 뿔만 달랐고, 몬스터용 빛나는 반점 20개가 몸을 덮었다.
여기서는 '그 몬스터의 아기'로 읽히게 종마다 실루엣 소품을 하나씩 주고, 얼굴을 아기답게 바꾼다:
  · 눈: 종족 색 홍채 + 큰 반짝임 둘(위 큰 것 · 아래 작은 것) — creature._eyes_round 의 반짝임 하나에 하나를 더한다
  · 볼터치 두 덩이 · 앞니 대신 작은 웃는 입(creature 가 buck_teeth 를 안 그리게 keep_style)
  · 종별 소품(cfg['pet_kit']): slime 새싹 · 젤리 방울 / goblin 두건 · 주머니 / wolf 목 털 · 꼬리 끝 흰 털 / ogre 뼈 장난감 · 허리띠 /
    dragon 꼬리 불꽃 · 배판 / boss 망토 · 떠도는 별 구슬
creature._build 끝(왕관 앞)에서 PK.dress(...) 로 부른다. 모두 뼈에 강체로 붙는다."""
import math
from mathutils import Vector, Euler

from lib import bcommon as C
from lib.beaver import spline, interp

OUT = 0.016


def _m(name, color, rough=0.5, metal=0.0, emit=None, es=0.0):
    return C.principled(name, color, rough=rough, metal=metal, coat=0.15, emit=emit, emit_strength=es)


def _face(add, coll, hc, hr, cfg):
    """볼터치 · 아래 반짝임 · 작은 웃는 입"""
    blush = _m('pblush', cfg.get('blush', '#ff9aa8'), rough=0.8)
    for sx in (-1, 1):
        p, n = C.on_ellipsoid(hc, hr, Vector((sx * 0.62, -1.0, -0.18)))
        add('head', C.mesh_obj(f'blush{sx}', C.ellipsoid(p + n * 0.004, (0.055, 0.03, 0.012), rot=C.look_rot(n)), blush, coll))
        # 아래 작은 반짝임 — 눈 위치(creature._eyes_round spread · up)를 같은 식으로 다시 구한다
        e, en = C.on_ellipsoid(hc, hr, Vector((sx * cfg.get('eye_spread', 0.38), -1.0, cfg.get('eye_up', 0.1))))
        r = cfg.get('eye_size', 0.085) * 1.3
        pc = e + en * (r * 0.4) + Vector((-sx * r * 0.12, 0, -r * 0.08))
        add('head', C.mesh_obj(f'ehi2{sx}', C.ellipsoid(pc + en * (r * 0.16) + Vector((r * 0.2, 0, -r * 0.24)), (r * 0.09, r * 0.09, r * 0.04), rot=C.look_rot(en)), _m('phi2', '#ffffff', emit='#ffffff', es=1.2), coll))
    # 웃는 입 — 아래로 휜 짧은 관
    mz, mn = C.on_ellipsoid(hc, hr, Vector((0, -1.0, -0.42)))
    pts = [mz + Vector((x * 0.05, 0, -0.016 * (1 - abs(x)) ** 0.5 * 2)) + mn * 0.006 for x in (-1, -0.5, 0, 0.5, 1)]
    add('head', C.mesh_obj('psmile', C.tube(spline(pts, 10), [0.009] * 11, seg=8), _m('pmouth', '#4a1a20', rough=0.6), coll))


def _leaf(base, d, L, w=0.42):
    import bmesh
    d = Vector(d).normalized()
    side = d.cross(Vector((0, 1, 0)))
    if side.length < 1e-3:
        side = Vector((1, 0, 0))
    side.normalize()
    bm = bmesh.new()
    left, right, n = [], [], 7
    for i in range(n + 1):
        t = i / n
        hw = math.sin(math.pi * min(1.0, t * 0.92 + 0.08)) * L * w * 0.5
        p = Vector(base) + d * (L * t)
        left.append(bm.verts.new(p - side * hw + Vector((0, -0.006, 0))))
        right.append(bm.verts.new(p + side * hw + Vector((0, -0.006, 0))))
    for i in range(n):
        bm.faces.new((left[i], left[i + 1], right[i + 1], right[i]))
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.012)
    return bm


def dress(add, cfg, coll, M, kind, hc, hr, bc, br, bones):
    kit = cfg.get('pet_kit')
    if not kit:
        return
    if kind == 'biped':
        _face(add, coll, hc, hr, cfg)
    acc = _m('pacc', cfg.get('accent', '#ff8a3d'), rough=0.45)
    top = hc + Vector((0, 0, hr[2]))
    if kit == 'slime':   # 머리 위 새싹 두 잎 + 어깨 · 머리에 맺힌 젤리 방울
        lm = _m('psprout', '#8ad84a', rough=0.5)
        stem = spline([top + Vector((0, 0.01, -0.02)), top + Vector((0.01, 0.0, 0.06)), top + Vector((0.0, -0.01, 0.1))], 8)
        add('head', C.mesh_obj('pstem', C.tube(stem, interp([0.016, 0.013, 0.01], len(stem)), seg=8), _m('pstemm', '#5aa63a'), coll, outline=OUT * 0.5))
        for sx in (-1, 1):
            add('head', C.mesh_obj(f'pleaf{sx}', _leaf(stem[-1], (sx * 0.9, -0.1, 0.45), 0.15), lm, coll, outline=OUT * 0.5))
        jm = _m('pjelly', cfg.get('color', '#7cc84a'), rough=0.08)
        for k, d in enumerate((Vector((0.75, -0.2, 0.55)), Vector((-0.6, 0.1, 0.75)), Vector((0.2, 0.4, 0.95)))):
            p, n = C.on_ellipsoid(hc, hr, d)
            add('head', C.mesh_obj(f'pdrop{k}', C.ellipsoid(p + n * 0.02, (0.04, 0.04, 0.05), egg=0.3, rot=C.look_rot(n)), jm, coll, outline=OUT * 0.4))
            add('head', C.mesh_obj(f'pdrophi{k}', C.ellipsoid(p + n * 0.05 + Vector((-0.01, -0.01, 0.015)), (0.01, 0.006, 0.012)), M['hi'], coll))
    elif kit == 'goblin':   # 붉은 두건(이마 띠 + 뒤 매듭 자락 둘) · 배 앞 가죽 주머니
        cloth = _m('pband', cfg.get('band', '#e8452c'), rough=0.7)
        add('head', C.mesh_obj('pbandana', C.torus(hc + Vector((0, 0.0, hr[2] * 0.52)), hr[0] * 0.93, 0.03, seg=32, ring=8, rot=Euler((math.radians(-10), 0, 0))), cloth, coll, outline=OUT * 0.5))
        knot = hc + Vector((0, hr[1] * 0.95, hr[2] * 0.45))
        add('head', C.mesh_obj('pknot', C.ellipsoid(knot, (0.04, 0.03, 0.035)), cloth, coll, outline=OUT * 0.5))
        for sx in (-1, 1):
            tail = spline([knot, knot + Vector((sx * 0.05, 0.08, -0.06)), knot + Vector((sx * 0.09, 0.12, -0.14))], 8)
            add('head', C.mesh_obj(f'pbtail{sx}', C.tube(tail, interp([0.028, 0.022, 0.012], len(tail)), seg=8), cloth, coll, outline=OUT * 0.5))
        p, n = C.on_ellipsoid(bc, br, Vector((0.35, -1.0, -0.35)))
        leather = _m('ppouch', '#8a5a2e', rough=0.75)
        add('body', C.mesh_obj('ppouch', C.ellipsoid(p + n * 0.03, (0.06, 0.04, 0.055), egg=0.2), leather, coll, outline=OUT * 0.5))
        add('body', C.mesh_obj('ppouchtie', C.torus(p + n * 0.03 + Vector((0, 0, 0.045)), 0.03, 0.008, seg=16, ring=6), _m('pgold', '#f2c232', rough=0.3, metal=0.7), coll))
    elif kit == 'wolf':   # 목 둘레 흰 털 뭉치 · 별 무늬 목걸이 · 꼬리 끝 흰 털
        fluff = _m('pfluff', cfg.get('belly', '#ffffff'), rough=0.85)
        neck = hc + Vector((0, 0.12, -hr[2] * 0.75))
        for k in range(7):
            a = -math.pi * 0.85 + k * (math.pi * 1.7 / 6)
            p = neck + Vector((math.sin(a) * hr[0] * 0.95, -math.cos(a) * 0.06 - 0.04, math.cos(a) * 0.03))
            add('head', C.mesh_obj(f'pruff{k}', C.ellipsoid(p, (0.07, 0.06, 0.06)), fluff, coll, outline=OUT * 0.6))
        star = _m('pstar', '#ffd34d', rough=0.3, emit='#ffd34d', es=0.6)
        add('head', C.mesh_obj('ptag', C.cone(neck + Vector((0, -0.16, -0.05)), 0.035, 0.035, 0.012, seg=5, rot=Euler((math.radians(90), 0, 0))), star, coll, outline=OUT * 0.4))
        tip = Vector((0, 0.48, 0.74))
        add('tail', C.mesh_obj('ptailtip', C.ellipsoid(tip + Vector((0, 0.0, 0.03)), (0.07, 0.07, 0.09), egg=0.2), fluff, coll, outline=OUT * 0.6))
    elif kit == 'ogre':   # 왼손 뼈 장난감 · 허리 가죽 띠 + 이빨 장식
        bone_m = _m('pbone', '#f6ead2', rough=0.5)
        hd = Vector(bones['arm.L'][1])
        b0, b1 = hd + Vector((0.02, -0.05, -0.08)), hd + Vector((0.04, -0.06, 0.16))
        add('arm.L', C.mesh_obj('pbonestick', C.tube([b0, b1], [0.022, 0.022], seg=10), bone_m, coll, outline=OUT * 0.5))
        for e in (b0, b1):
            for sx in (-1, 1):
                add('arm.L', C.mesh_obj(f'pbonek{sx}{e.z:.2f}', C.ellipsoid(e + Vector((sx * 0.025, 0, 0)), (0.03, 0.03, 0.03)), bone_m, coll, outline=OUT * 0.4))
        belt = _m('pbelt', '#6a4228', rough=0.75)
        add('body', C.mesh_obj('pbelt', C.torus(bc + Vector((0, 0, -br[2] * 0.25)), br[0] * 1.0, 0.026, seg=32, ring=6), belt, coll, outline=OUT * 0.5))
        p, n = C.on_ellipsoid(bc, br, Vector((0, -1, -0.3)))
        add('body', C.mesh_obj('pbelttooth', C.cone(p + n * 0.03 + Vector((0, 0, -0.03)), 0.022, 0.0, 0.06, seg=8, rot=Euler((math.pi, 0, 0))), bone_m, coll, outline=OUT * 0.4))
    elif kit == 'dragon':   # 꼬리 끝 작은 불꽃(빛) · 등 작은 가시는 creature spikes 그대로
        fm = _m('pflame', '#ffb347', rough=0.3, emit='#ff8a1a', es=1.6)
        tip = Vector((0, 0.5, 0.32))
        for k in range(3):
            add('tail', C.mesh_obj(f'pflame{k}', C.cone(tip + Vector(((k - 1) * 0.035, 0.0, 0.07 - abs(k - 1) * 0.02)), 0.035, 0.0, 0.13 - abs(k - 1) * 0.04, seg=8), fm, coll))
    elif kit == 'boss':   # 작은 망토(금 테) · 머리 위 떠도는 별 구슬 둘
        cape = _m('pcape', cfg.get('cape', '#4a1e7a'), rough=0.6)
        trim = _m('pcapet', '#f2c232', rough=0.3, metal=0.6)
        import bmesh
        bm = bmesh.new()
        rows, cols = 5, 9
        grid = []
        for i in range(rows + 1):
            t = i / rows
            row = []
            for j in range(cols + 1):
                u = j / cols - 0.5
                w = br[0] * (1.0 + 0.5 * t)
                x = u * 2 * w
                y = br[1] * 0.55 + 0.05 + t * 0.06 + (u * u) * 0.15
                z = bc.z + br[2] * 0.85 - t * (bc.z + br[2] * 0.85 - 0.06)
                row.append(bm.verts.new((x, y, z)))
            grid.append(row)
        for i in range(rows):
            for j in range(cols):
                bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
        bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.014)
        add('body', C.mesh_obj('pcape', bm, cape, coll, outline=OUT * 0.6))
        hem = [Vector((u * 2 * br[0] * 1.5, br[1] * 0.55 + 0.11 + u * u * 0.15, 0.06)) for u in (-0.5, -0.25, 0, 0.25, 0.5)]
        add('body', C.mesh_obj('pcapehem', C.tube(spline(hem, 12), [0.014] * 13, seg=8), trim, coll))
        orb = _m('porb', '#c084fc', rough=0.2, emit='#c084fc', es=1.8)
        for k, sx in enumerate((-1, 1)):
            p = top + Vector((sx * 0.22, 0.04, 0.02 + 0.05 * k))
            add('head', C.mesh_obj(f'porb{k}', C.ellipsoid(p, (0.035, 0.035, 0.035)), orb, coll, outline=OUT * 0.3))
