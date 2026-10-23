"""절차적 3D 몬스터 (2026-10-16) — 원형(이족 biped · 사족 quad · 슬라임 blob · 거미 spider) + 설정(cfg)으로 31종을 짓는다.
비버와 같은 규칙: 타원체·관, 잉크 외곽선, 뼈대 리그에 강체로 붙은 부품. 정면 -Y, 발 z=0, 키 ≈ 1.
공격: 이족은 앞발 할퀴기(팔 크게 휘두름)+입 벌림, 사족은 몸을 낮췄다가 덤비며 물기(턱), 슬라임은 눌렸다 튀어 덮치기, 거미는 앞다리 내리찍기.
"""
import bpy
import math
import os
from mathutils import Vector, Matrix, Euler, Quaternion

from lib import bcommon as C
from lib.beaver import _armature, _attach, spline, interp, _shell, _rot_local

OUT = 0.016
# 로우 폴리 (2026-10-23, 사용자: "동료 · 몬스터 · 보스도 각각" — 비버와 같은 BEAVER RAMPAGE 풍) — 각진 면 · 무광 단색 피부 · 큰 흰자 눈
LOWPOLY = os.environ.get('BEAVER_STYLE', 'lowpoly') == 'lowpoly'
FACETS = 12


def _m(name, color, rough=0.5, metal=0.0, emit=None, es=0.0, coat=0.2):
    return C.principled(f"mon_{name}_{color}_{metal}_{es}", color, rough=rough, metal=metal, coat=coat, emit=emit, emit_strength=es)


def _skin(color, dark, bump=0.25):
    """몬스터 피부 (2026-10-16 2차, 사용자: "디테일이 줄어 장난감 같다") — 발쪽으로 짙어지는 그라데이션(월드 z) + 노이즈 결 + 거친 반사.
    단색 매끈한 플라스틱이 원화의 채색·질감과 가장 달랐다"""
    if LOWPOLY:   # 무광 단색 + 발쪽으로 짙어지는 그라데이션만(노이즈 · 비늘 무늬는 각진 면과 겹쳐 지저분했다)
        m, fresh = C.new_mat(f"monskin_lp_{color}_{dark}")
        if not fresh:
            return m
        nt = m.node_tree
        b = nt.nodes['Principled BSDF']
        b.inputs['Roughness'].default_value = 0.88
        b.inputs['Coat Weight'].default_value = 0.0
        geo = nt.nodes.new('ShaderNodeNewGeometry')
        sep = nt.nodes.new('ShaderNodeSeparateXYZ')
        nt.links.new(geo.outputs['Position'], sep.inputs[0])
        mr = nt.nodes.new('ShaderNodeMapRange')
        mr.inputs['From Min'].default_value = -0.1
        mr.inputs['From Max'].default_value = 0.6
        nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
        mixc = nt.nodes.new('ShaderNodeMix'); mixc.data_type = 'RGBA'
        mixc.inputs['A'].default_value = C.srgb(dark)
        mixc.inputs['B'].default_value = C.srgb(color)
        mixc.clamp_factor = True
        mr2 = nt.nodes.new('ShaderNodeMath'); mr2.operation = 'MULTIPLY_ADD'
        mr2.inputs[1].default_value = 0.45
        mr2.inputs[2].default_value = 0.55   # 아래도 본색의 절반 이상 — 너무 어둡지 않게
        nt.links.new(mr.outputs['Result'], mr2.inputs[0])
        nt.links.new(mr2.outputs['Value'], mixc.inputs['Factor'])
        nt.links.new(mixc.outputs['Result'], b.inputs['Base Color'])
        return m
    m, fresh = C.new_mat(f"monskin_{color}_{dark}_{bump}")
    if not fresh:
        return m
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = 0.55
    b.inputs['Coat Weight'].default_value = 0.12
    b.inputs['Sheen Weight'].default_value = 0.25
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(geo.outputs['Position'], sep.inputs[0])
    mr = nt.nodes.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = 0.0
    mr.inputs['From Max'].default_value = 0.75
    nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 9.0
    noise.inputs['Detail'].default_value = 6.0
    mixc = nt.nodes.new('ShaderNodeMix'); mixc.data_type = 'RGBA'
    mixc.inputs['A'].default_value = C.srgb(dark)
    mixc.inputs['B'].default_value = C.srgb(color)
    nt.links.new(mr.outputs['Result'], mixc.inputs['Factor'])
    # 노이즈로 얼룩 — 색을 살짝 흔든다
    mix2 = nt.nodes.new('ShaderNodeMix'); mix2.data_type = 'RGBA'; mix2.blend_type = 'MULTIPLY'
    mix2.inputs['Factor'].default_value = 0.22
    nt.links.new(mixc.outputs['Result'], mix2.inputs['A'])
    nt.links.new(noise.outputs['Color'], mix2.inputs['B'])
    # 잔무늬 (2026-10-16 3차, 사용자: "예전 그림의 잔무늬·잎 장식") — 보로노이 비늘: 칸 가장자리를 짙게
    vor = nt.nodes.new('ShaderNodeTexVoronoi')
    vor.feature = 'DISTANCE_TO_EDGE'
    vor.inputs['Scale'].default_value = 26.0
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (0.52, 0.52, 0.52, 1)
    ramp.color_ramp.elements[1].position = 0.09
    ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    nt.links.new(vor.outputs['Distance'], ramp.inputs['Fac'])
    mix3 = nt.nodes.new('ShaderNodeMix'); mix3.data_type = 'RGBA'; mix3.blend_type = 'MULTIPLY'
    mix3.inputs['Factor'].default_value = 1.0
    nt.links.new(mix2.outputs['Result'], mix3.inputs['A'])
    nt.links.new(ramp.outputs['Color'], mix3.inputs['B'])
    nt.links.new(mix3.outputs['Result'], b.inputs['Base Color'])
    bp = nt.nodes.new('ShaderNodeBump')
    bp.inputs['Strength'].default_value = bump
    bp.inputs['Distance'].default_value = 0.02
    nt.links.new(noise.outputs['Fac'], bp.inputs['Height'])
    nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    return m


def _bones(kind, cfg):
    H = cfg.get('height', 1.0)
    if kind == 'biped':
        hz = cfg.get('head_z', 0.68) * H
        sh = cfg.get('shoulder', (0.2, 0.42))
        return {
            'root': ((0, 0, 0), (0, 0, 0.08), None),
            'body': ((0, 0, 0.05), (0, 0, hz - 0.12), 'root'),
            'head': ((0, 0, hz - 0.12), (0, 0, hz + 0.3), 'body'),
            'jaw': ((0, -0.1, hz - 0.08), (0, -0.25, hz - 0.12), 'head'),
            'arm.R': ((-sh[0], -0.02, sh[1]), (-sh[0] - 0.08, -0.12, sh[1] - 0.22), 'body'),
            'arm.L': ((sh[0], -0.02, sh[1]), (sh[0] + 0.08, -0.12, sh[1] - 0.22), 'body'),
            'wing.R': ((-0.12, 0.12, sh[1] + 0.05), (-0.45, 0.25, sh[1] + 0.3), 'body'),
            'wing.L': ((0.12, 0.12, sh[1] + 0.05), (0.45, 0.25, sh[1] + 0.3), 'body'),
            'leg.R': ((-0.11, 0, 0.14), (-0.12, -0.04, 0), 'root'),
            'leg.L': ((0.11, 0, 0.14), (0.12, -0.04, 0), 'root'),
            'tail': ((0, 0.15, 0.15), (0, 0.45, 0.1), 'body'),
        }
    if kind == 'quad':
        return {
            'root': ((0, 0, 0), (0, 0, 0.08), None),
            'body': ((0, 0.12, 0.36), (0, -0.12, 0.4), 'root'),
            'head': ((0, -0.18, 0.45), (0, -0.4, 0.62), 'body'),
            'jaw': ((0, -0.32, 0.5), (0, -0.48, 0.46), 'head'),
            'arm.R': ((-0.12, -0.14, 0.32), (-0.13, -0.17, 0.0), 'body'),
            'arm.L': ((0.12, -0.14, 0.32), (0.13, -0.17, 0.0), 'body'),
            'leg.R': ((-0.12, 0.2, 0.32), (-0.13, 0.22, 0.0), 'root'),
            'leg.L': ((0.12, 0.2, 0.32), (0.13, 0.22, 0.0), 'root'),
            'wing.R': ((-0.1, 0.05, 0.5), (-0.4, 0.15, 0.75), 'body'),
            'wing.L': ((0.1, 0.05, 0.5), (0.4, 0.15, 0.75), 'body'),
            'tail': ((0, 0.3, 0.42), (0, 0.55, 0.62), 'body'),
        }
    if kind == 'blob':
        return {
            'root': ((0, 0, 0), (0, 0, 0.08), None),
            'body': ((0, 0, 0.0), (0, 0, 0.7), 'root'),
            'head': ((0, 0, 0.35), (0, 0, 0.8), 'body'),
            'jaw': ((0, -0.3, 0.3), (0, -0.4, 0.26), 'head'),
            'arm.R': ((-0.3, -0.05, 0.3), (-0.42, -0.15, 0.2), 'body'),
            'arm.L': ((0.3, -0.05, 0.3), (0.42, -0.15, 0.2), 'body'),
        }
    # spider
    B = {
        'root': ((0, 0, 0), (0, 0, 0.08), None),
        'body': ((0, 0.15, 0.3), (0, -0.1, 0.36), 'root'),
        'head': ((0, -0.12, 0.38), (0, -0.32, 0.5), 'body'),
        'jaw': ((0, -0.3, 0.38), (0, -0.4, 0.3), 'head'),
        'arm.R': ((-0.1, -0.2, 0.36), (-0.3, -0.42, 0.55), 'body'),
        'arm.L': ((0.1, -0.2, 0.36), (0.3, -0.42, 0.55), 'body'),
    }
    for i, (y, z) in enumerate(((-0.05, 0.34), (0.08, 0.34), (0.2, 0.32))):
        B[f'sleg{i}.R'] = ((-0.12, y, z), (-0.45, y - 0.05, 0.0), 'root')
        B[f'sleg{i}.L'] = ((0.12, y, z), (0.45, y - 0.05, 0.0), 'root')
    return B


def leaf_mesh(base, d, L):
    """잎 한 장 — base 에서 d 방향으로 뻗는 납작한 물방울(가운데 잎맥 접힘)"""
    import bmesh
    d = Vector(d).normalized()
    side = d.cross(Vector((0, 0, 1)))
    if side.length < 1e-3:
        side = Vector((1, 0, 0))
    side.normalize()
    up = side.cross(d).normalized()
    bm = bmesh.new()
    n = 10
    left, right = [], []
    for i in range(n + 1):
        t = i / n
        w = math.sin(math.pi * t) * (1 - 0.35 * t) * L * 0.42
        p = Vector(base) + d * (L * t) + up * (0.012 * math.sin(math.pi * t))
        left.append(bm.verts.new(p - side * w))
        right.append(bm.verts.new(p + side * w))
    mid = [bm.verts.new(Vector(base) + d * (L * i / n) + up * 0.02 * math.sin(math.pi * i / n)) for i in range(n + 1)]
    for i in range(n):
        bm.faces.new((left[i], left[i + 1], mid[i + 1], mid[i]))
        bm.faces.new((mid[i], mid[i + 1], right[i + 1], right[i]))
    bm.normal_update()
    return bm


def fierce_face(add, hc, hr, cfg, coll, M):
    """찡그린 얼굴 — V 자 눈썹(안쪽이 내려감) + 눈 위를 덮는 눈꺼풀(안쪽으로 기울어 노려봄) + 미간 주름"""
    spread, up = cfg.get('eye_spread', 0.38), cfg.get('eye_up', 0.1)
    r = cfg.get('eye_size', 0.062)
    for sx in ((0,) if cfg.get('cyclops') else (-1, 1)):
        rr = r * (1.6 if sx == 0 else 1.0)
        p, n = C.on_ellipsoid(hc, hr, Vector((sx * spread, -1.0, up)))
        tilt = 0.0 if sx == 0 else -sx * 0.45   # 안쪽이 내려간다
        lid_c = p + n * (rr * 0.25) + Vector((0, 0, rr * 0.55))
        add('head', C.mesh_obj(f'lid{sx}', C.ellipsoid(lid_c, (rr * 1.2, rr * 0.55, rr * 0.5), rot=(C.look_rot(n).to_matrix() @ Matrix.Rotation(tilt, 3, 'Z')).to_euler()), M['skin'], coll, outline=OUT * 0.6))
        bp = p + n * (rr * 0.3) + Vector((0, 0, rr * 1.15))
        add('head', C.mesh_obj(f'brow{sx}', C.box(bp, (rr * 2.3, 0.035, 0.032), bevel=0.012, rot=Euler((0, tilt * 0.9, 0))), M['dark'], coll, outline=OUT * 0.6))
    if not cfg.get('cyclops'):
        mp, mn = C.on_ellipsoid(hc, hr, Vector((0, -1.0, up + 0.12)))
        add('head', C.mesh_obj('frown', C.box(mp + mn * 0.01, (0.012, 0.01, 0.05), bevel=0.004), M['dark'], coll))


def grimace(add, mz, hr, cfg, coll, M):
    """이빨을 드러낸 입 — 넓은 어두운 입 + 윗니 줄 + 아래에서 솟은 엄니"""
    big = 1.45 if cfg.get('maw_open') else 1.0   # 트롤은 크게 벌린 보라 입
    add('head', C.mesh_obj('maw', C.ellipsoid(mz + Vector((0, 0.0, 0.03)), (hr[0] * (0.42 + 0.12 * (big - 1)), hr[1] * 0.14, hr[2] * 0.16 * big)), _m('maw', '#7a2a8a' if big > 1 else '#5a1a24', rough=0.5), coll, outline=OUT * 0.5))
    for k in range(5):
        x = (k - 2) * hr[0] * 0.17
        add('head', C.mesh_obj(f'tooth{k}', C.cone(mz + Vector((x, -hr[1] * 0.17, 0.07)), 0.022, 0.0, 0.05, seg=8, rot=Euler((math.pi, 0, 0))), M['tooth'], coll, outline=OUT * 0.35))
    for sx in (-1, 1):
        add('jaw', C.mesh_obj(f'ltusk{sx}', C.cone(mz + Vector((sx * hr[0] * 0.33, -hr[1] * 0.15, 0.0)), 0.03, 0.0, 0.09, seg=10), M['tooth'], coll, outline=OUT * 0.4))


def bat_wing(name, root, sx, size, M, coll):
    """박쥐 날개 — 뿌리에서 부채꼴로 퍼지는 손가락 뼈 3개 + 그 사이 막(X-Z 면, 뒤로 살짝). 막 끝은 손가락 사이로 오목하게.
    예전 얇은 타원 하나는 3/4 화면에서 옆선으로 보여 막대 사탕처럼 보였다"""
    L = 0.5 * size
    tips = [root + Vector((sx * L * 0.35, 0.1 * L, L * 0.95)), root + Vector((sx * L * 0.85, 0.16 * L, L * 0.62)), root + Vector((sx * L * 1.0, 0.2 * L, L * 0.1))]
    elbow = root + Vector((sx * L * 0.3, 0.06 * L, L * 0.45))
    out = []
    out.append(C.mesh_obj(f'{name}_arm', C.tube([root, elbow], [0.03 * size + 0.01, 0.022 * size + 0.008], seg=10), M['dark'], coll, outline=OUT * 0.6))
    for k, t in enumerate(tips):
        out.append(C.mesh_obj(f'{name}_f{k}', C.tube([elbow, t], [0.02 * size + 0.006, 0.006], seg=8), M['dark'], coll, outline=OUT * 0.5))
        out.append(C.mesh_obj(f'{name}_c{k}', C.cone(t, 0.018, 0.0, 0.05, seg=8, rot=C.look_rot(t - elbow)), M['claw'], coll, outline=OUT * 0.4))
    # 막 — 팔꿈치·뿌리와 손가락 끝 사이 부채꼴, 사이 가장자리는 팔꿈치 쪽으로 당겨 오목하게
    pts = [root + Vector((sx * 0.02, 0, -0.04 * size))]
    edge = [tips[0]]
    for a, b in zip(tips, tips[1:]):
        mid = a.lerp(b, 0.5)
        edge += [mid.lerp(elbow, 0.32), b]
    edge.append(root + Vector((sx * L * 0.25, 0.08 * L, -0.02)))
    import bmesh
    bm = bmesh.new()
    vs = [bm.verts.new(elbow)] + [bm.verts.new(p) for p in edge]
    for i in range(1, len(vs) - 1):
        bm.faces.new((vs[0], vs[i], vs[i + 1]))
    bm.normal_update()
    o = C.mesh_obj(f'{name}_mem', bm, M['wing'], coll)
    s = o.modifiers.new('solid', 'SOLIDIFY'); s.thickness = 0.012
    C.add_outline(o, OUT * 0.6)
    out.append(o)
    return out


class CRig:
    def __init__(self, arm, objs, cfg, kind):
        self.arm, self.objs, self.cfg, self.kind = arm, objs, cfg, kind


def _eyes(add, head_c, head_r, cfg, coll, M, bone='head', spread=0.38, up=0.12, size=1.0):
    """눈 — 작은 흰자 + 크게 빛나는 홍채 + 세로 동공(용·악마) / 둥근 동공. 예전 큰 흰 눈은 모두 같은 장난감으로 보였다"""
    for sx in ((0,) if cfg.get('cyclops') else (-1, 1)):
        sz = size * (1.6 if sx == 0 else 1.0)
        p, n = C.on_ellipsoid(head_c, head_r, Vector((sx * spread, -1.0, up)))
        rot = C.look_rot(n)
        r = cfg.get('eye_size', 0.062) * sz
        add(bone, C.mesh_obj(f'eyew{sx}', C.ellipsoid(p - n * 0.012, (r * 1.0, r * 1.05, r * 0.42), rot=rot), M['eyew'], coll, outline=OUT * 0.9))
        add(bone, C.mesh_obj(f'iris{sx}', C.ellipsoid(p + n * (r * 0.18), (r * 0.86, r * 0.9, r * 0.3), rot=rot), M['iris'], coll))
        slit = cfg.get('slit', bool(cfg.get('snout') or cfg.get('horns')))
        add(bone, C.mesh_obj(f'pupil{sx}', C.ellipsoid(p + n * (r * 0.32), (r * (0.16 if slit else 0.38), r * 0.6, r * 0.2), rot=rot), M['pupil'], coll))
        add(bone, C.mesh_obj(f'ehi{sx}', C.ellipsoid(p + n * (r * 0.42) + Vector((-r * 0.3, 0, r * 0.32)), (r * 0.2, r * 0.2, r * 0.07), rot=rot), M['hi'], coll))


def bat_wing(name, root, sx, size, M, coll):
    """박쥐 날개 — 뿌리에서 부채꼴로 퍼지는 손가락 뼈 3개 + 그 사이 막(X-Z 면, 뒤로 살짝). 막 끝은 손가락 사이로 오목하게.
    예전 얇은 타원 하나는 3/4 화면에서 옆선으로 보여 막대 사탕처럼 보였다"""
    L = 0.5 * size
    tips = [root + Vector((sx * L * 0.35, 0.1 * L, L * 0.95)), root + Vector((sx * L * 0.85, 0.16 * L, L * 0.62)), root + Vector((sx * L * 1.0, 0.2 * L, L * 0.1))]
    elbow = root + Vector((sx * L * 0.3, 0.06 * L, L * 0.45))
    out = []
    out.append(C.mesh_obj(f'{name}_arm', C.tube([root, elbow], [0.03 * size + 0.01, 0.022 * size + 0.008], seg=10), M['dark'], coll, outline=OUT * 0.6))
    for k, t in enumerate(tips):
        out.append(C.mesh_obj(f'{name}_f{k}', C.tube([elbow, t], [0.02 * size + 0.006, 0.006], seg=8), M['dark'], coll, outline=OUT * 0.5))
        out.append(C.mesh_obj(f'{name}_c{k}', C.cone(t, 0.018, 0.0, 0.05, seg=8, rot=C.look_rot(t - elbow)), M['claw'], coll, outline=OUT * 0.4))
    # 막 — 팔꿈치·뿌리와 손가락 끝 사이 부채꼴, 사이 가장자리는 팔꿈치 쪽으로 당겨 오목하게
    pts = [root + Vector((sx * 0.02, 0, -0.04 * size))]
    edge = [tips[0]]
    for a, b in zip(tips, tips[1:]):
        mid = a.lerp(b, 0.5)
        edge += [mid.lerp(elbow, 0.32), b]
    edge.append(root + Vector((sx * L * 0.25, 0.08 * L, -0.02)))
    import bmesh
    bm = bmesh.new()
    vs = [bm.verts.new(elbow)] + [bm.verts.new(p) for p in edge]
    for i in range(1, len(vs) - 1):
        bm.faces.new((vs[0], vs[i], vs[i + 1]))
    bm.normal_update()
    o = C.mesh_obj(f'{name}_mem', bm, M['wing'], coll)
    s = o.modifiers.new('solid', 'SOLIDIFY'); s.thickness = 0.012
    C.add_outline(o, OUT * 0.6)
    out.append(o)
    return out


class CRig:
    def __init__(self, arm, objs, cfg, kind):
        self.arm, self.objs, self.cfg, self.kind = arm, objs, cfg, kind


def _eyes(add, head_c, head_r, cfg, coll, M, bone='head', spread=0.38, up=0.12, size=1.0):
    saved = C.FACET
    C.FACET = 0
    try:
        _eyes_round(add, head_c, head_r, cfg, coll, M, bone, spread, up, size)
    finally:
        C.FACET = saved


def _eyes_round(add, head_c, head_r, cfg, coll, M, bone, spread, up, size):
    for sx in ((0,) if cfg.get('cyclops') else (-1, 1)):
        if sx == 0:
            size *= 1.7
        p, n = C.on_ellipsoid(head_c, head_r, Vector((sx * spread, -1.0, up)))
        rot = C.look_rot(n)
        r = cfg.get('eye_size', 0.085) * size
        if LOWPOLY:   # 흰자를 크게(1.3배) · 검은 눈동자 · 그 둘레에 얇은 색 홍채(종족 색은 남긴다)
            r *= 1.3
            add(bone, C.mesh_obj(f'eyew{sx}', C.ellipsoid(p - n * 0.01, (r * 1.05, r * 1.15, r * 0.45), rot=rot), M['eyew'], coll, outline=OUT * 0.8))
            pc = p + n * (r * 0.4) + Vector((-sx * r * 0.12, 0, -r * 0.08))
            add(bone, C.mesh_obj(f'iris{sx}', C.ellipsoid(pc, (r * 0.6, r * 0.66, r * 0.12), rot=rot), M['iris'], coll))
            add(bone, C.mesh_obj(f'pupil{sx}', C.ellipsoid(pc + n * (r * 0.06), (r * 0.46, r * 0.52, r * 0.1), rot=rot), M['pupil'], coll))
            add(bone, C.mesh_obj(f'ehi{sx}', C.ellipsoid(pc + n * (r * 0.14) + Vector((-r * 0.18, 0, r * 0.22)), (r * 0.16, r * 0.16, r * 0.05), rot=rot), M['hi'], coll))
            continue
        add(bone, C.mesh_obj(f'eyew{sx}', C.ellipsoid(p - n * 0.01, (r * 1.05, r * 1.15, r * 0.45), rot=rot), M['eyew'], coll, outline=OUT * 0.7))
        add(bone, C.mesh_obj(f'iris{sx}', C.ellipsoid(p + n * (r * 0.22), (r * 0.72, r * 0.78, r * 0.3), rot=rot), M['iris'], coll))
        add(bone, C.mesh_obj(f'pupil{sx}', C.ellipsoid(p + n * (r * 0.36), (r * 0.34, r * 0.5, r * 0.2), rot=rot), M['pupil'], coll))
        add(bone, C.mesh_obj(f'ehi{sx}', C.ellipsoid(p + n * (r * 0.46) + Vector((-r * 0.25, 0, r * 0.3)), (r * 0.22, r * 0.22, r * 0.08), rot=rot), M['hi'], coll))


def build(name, cfg, coll=None):
    if not LOWPOLY:
        return _build(name, cfg, coll)
    saved = C.FACET
    C.FACET = FACETS
    try:
        return _build(name, cfg, coll)
    finally:
        C.FACET = saved


def _build(name, cfg, coll=None):
    coll = coll or C.collection(name)
    kind = cfg.get('kind', 'biped')
    bones = _bones(kind, cfg)
    import lib.beaver as B
    saved = B.BONES
    B.BONES = bones
    try:
        arm = _armature(name, coll)
    finally:
        B.BONES = saved
    parts = {k: [] for k in bones}

    def add(bone, o):
        parts.setdefault(bone, []).append(o)

    col = cfg.get('color', '#7a4a7a')
    M = {
        'skin': _skin(col, cfg.get('dark', '#3b2a3b'), 0.35 if cfg.get('fierce') else 0.2),
        'belly': _m('belly', cfg.get('belly', '#f2c94c'), rough=0.5),
        'dark': _m('dark', cfg.get('dark', '#3b2a3b'), rough=0.6),
        'accent': _m('acc', cfg.get('accent', '#ff8a3d'), rough=0.4, emit=cfg.get('accent') if cfg.get('glow') else None, es=1.5 if cfg.get('glow') else 0),
        'horn': _m('horn', cfg.get('horn', '#f1e4c8'), rough=0.35),
        'eyew': _m('eyew', '#fbf8f2' if LOWPOLY else cfg.get('sclera', '#fff3d6'), rough=0.45 if LOWPOLY else 0.2, coat=0.1 if LOWPOLY else 0.6),
        'iris': _m('iris', cfg.get('iris', '#3ad15a'), rough=0.15, emit=cfg.get('iris', '#3ad15a'), es=1.6),
        'pupil': _m('pupil', '#120a0a', rough=0.15),
        'hi': _m('hi', '#ffffff', emit='#ffffff', es=1.5),
        'mouth': _m('mouth', '#5a1a24', rough=0.6),
        'tooth': _m('tooth', '#fffaf0', rough=0.35),
        'claw': _m('claw', cfg.get('claw', '#f6efe0'), rough=0.35),
        'wing': _m('wing', cfg.get('wing', cfg.get('dark', '#3b2a3b')), rough=0.55),
        'metal': _m('metal', cfg.get('metal', '#9aa4b0'), rough=0.3, metal=0.8),
    }
    H = cfg.get('height', 1.0)
    if kind == 'biped':
        hz = cfg.get('head_z', 0.68) * H
        hr = cfg.get('head_r', (0.3, 0.27, 0.27))
        br = cfg.get('body_r', (0.24, 0.21, 0.25))
        bc = Vector((0, 0, br[2] + 0.06))
        hc = Vector((0, -0.02, hz))
        add('body', C.mesh_obj('body', C.ellipsoid(bc, br, egg=0.15), M['skin'], coll, outline=OUT))
        # 배 — 용 계열은 마디진 배판(가로 띠 4장), 나머지는 원화처럼 큰 노란 배 한 덩어리
        if not cfg.get('plates'):
            add('body', C.mesh_obj('belly', C.ellipsoid(bc + Vector((0, -br[1] * 0.42, -0.01)), (br[0] * 0.78, br[1] * 0.62, br[2] * 0.86)), M['belly'], coll, outline=OUT * 0.5))
        for k in range(4 if cfg.get('plates') else 0):
            t = k / 3
            pz = bc.z + br[2] * (0.55 - t * 1.05)
            wdt = br[0] * (0.52 + 0.18 * math.sin(math.pi * (0.25 + t * 0.6)))
            p, n = C.on_ellipsoid(bc, br, Vector((0, -1, (pz - bc.z) / br[2] * 1.2)))
            add('body', C.mesh_obj(f'plate{k}', C.ellipsoid(p - n * 0.035, (wdt, 0.045, br[2] * 0.19), rot=C.look_rot(n)), M['belly'], coll, outline=OUT * 0.4))   # 몸에 반쯤 묻은 납작한 배판(튀어나오면 소시지처럼 보였다)
        hr_ = (hr[0], hr[1] * (1.25 if cfg.get('snout') else 1.0), hr[2])   # 용 계열은 머리가 앞으로 길다
        hcf = hc + Vector((0, -hr[1] * 0.12 if cfg.get('snout') else 0, 0))   # 얼굴(눈·입)은 늘린 머리 표면에 — 예전엔 눈이 머리 속에 묻혀 뒤통수만 보였다
        add('head', C.mesh_obj('head', C.ellipsoid(hcf, hr_, egg=cfg.get('head_egg', 0.1)), M['skin'], coll, outline=OUT))
        if cfg.get('snout'):
            # 주둥이 — 머리에서 앞으로 뻗어 가늘어지는 관 + 위 콧구멍 (예전 납작 타원은 오리 부리로 보였다)
            s0 = hcf + Vector((0, -hr_[1] * 0.72, -hr[2] * 0.22))
            sp = spline([s0, s0 + Vector((0, -0.14, -0.02)), s0 + Vector((0, -0.26, -0.05))], 10)
            add('head', C.mesh_obj('snout', C.tube(sp, interp([hr[0] * 0.55, hr[0] * 0.45, hr[0] * 0.36], len(sp)), seg=20), M['skin'], coll, outline=OUT))
            for sx in (-1, 1):
                add('head', C.mesh_obj(f'nostril{sx}', C.ellipsoid(sp[-1] + Vector((sx * 0.04, -0.01, hr[0] * 0.3)), (0.02, 0.015, 0.012)), M['dark'], coll))
        _eyes(add, hcf, hr_, cfg, coll, M, spread=cfg.get('eye_spread', 0.38), up=cfg.get('eye_up', 0.1))
        if cfg.get('fierce') or cfg.get('arm_thick', 1.0) > 1.2:
            fierce_face(add, hcf, hr_, cfg, coll, M)
        # 입(턱 뼈) — 벌리면 이빨
        mz = hcf + Vector((0, -hr_[1] * 0.9, -hr[2] * 0.5))
        if cfg.get('fierce'):
            grimace(add, mz, hr, cfg, coll, M)
        add('jaw', C.mesh_obj('jaw', C.ellipsoid(mz, (hr[0] * 0.45, hr[1] * 0.25, hr[2] * 0.16)), M['skin'], coll, outline=OUT))
        add('head', C.mesh_obj('mouth', C.ellipsoid(mz + Vector((0, -0.01, 0.02)), (hr[0] * 0.38, hr[1] * 0.18, hr[2] * 0.12)), M['mouth'], coll))
        for sx in (-1, 1):
            add('head', C.mesh_obj(f'fang{sx}', C.cone(mz + Vector((sx * hr[0] * 0.2, -hr[1] * 0.12, -0.0)), 0.022, 0.0, 0.06, seg=10, rot=Euler((math.pi, 0, 0))), M['tooth'], coll, outline=OUT * 0.4))
        # 귀 · 뿔 · 볏
        ears = cfg.get('ears')
        for sx in (-1, 1):
            if ears == 'bat':
                pts = [hc + Vector((sx * hr[0] * 0.75, 0, hr[2] * 0.5)), hc + Vector((sx * hr[0] * 1.35, 0.05, hr[2] * 1.25))]
                add('head', C.mesh_obj(f'ear{sx}', C.cone(pts[0].lerp(pts[1], 0.5), 0.1, 0.0, (pts[1] - pts[0]).length, seg=4, rot=C.look_rot(pts[1] - pts[0])), M['skin'], coll, outline=OUT))
            elif ears == 'wolf':
                base = hc + Vector((sx * hr[0] * 0.55, 0.04, hr[2] * 0.75))
                add('head', C.mesh_obj(f'ear{sx}', C.cone(base + Vector((sx * 0.02, 0, 0.08)), 0.08, 0.0, 0.2, seg=4, rot=Euler((0, sx * math.radians(-12), 0))), M['skin'], coll, outline=OUT))
            elif ears == 'round':
                add('head', C.mesh_obj(f'ear{sx}', C.ellipsoid(hc + Vector((sx * hr[0] * 0.75, 0.03, hr[2] * 0.8)), (0.08, 0.04, 0.08)), M['skin'], coll, outline=OUT))
            horns = cfg.get('horns')
            if horns:
                base = hc + Vector((sx * hr[0] * 0.45, 0.02, hr[2] * 0.82))
                curve = spline([base, base + Vector((sx * 0.08, 0.02, 0.12)), base + Vector((sx * 0.18, 0.06, 0.2)) if horns == 'curl' else base + Vector((sx * 0.05, 0.0, 0.28))], 10)
                add('head', C.mesh_obj(f'horn{sx}', C.tube(curve, interp([0.055, 0.035, 0.005], len(curve)), seg=12), M['horn'], coll, outline=OUT * 0.8))
        if cfg.get('tusks'):
            for sx in (-1, 1):
                tb = mz + Vector((sx * hr[0] * 0.35, -0.02, -0.01))
                add('jaw', C.mesh_obj(f'tusk{sx}', C.tube(spline([tb, tb + Vector((sx * 0.03, -0.04, 0.07)), tb + Vector((sx * 0.06, -0.03, 0.13))], 8), interp([0.028, 0.02, 0.004], 9), seg=10), M['horn'], coll, outline=OUT * 0.5))
        if cfg.get('mane'):
            mm = _m('mane', cfg['mane'], rough=0.7)
            for k in range(9):
                a = -math.pi * 0.85 + k * (math.pi * 1.7 / 8)
                p = hc + Vector((math.sin(a) * hr[0] * 1.0, 0.06, math.cos(a) * hr[2] * 1.0))
                add('head', C.mesh_obj(f'mane{k}', C.ellipsoid(p, (0.11, 0.08, 0.11)), mm, coll, outline=OUT * 0.8))
        if cfg.get('glow_belly'):
            gm = _m('glowb', cfg.get('belly', '#ffd34d'), rough=0.4, emit=cfg.get('belly', '#ffd34d'), es=2.2)
            add('body', C.mesh_obj('glowcore', C.ellipsoid(bc + Vector((0, -br[1] * 0.6, 0.0)), (br[0] * 0.45, br[1] * 0.42, br[2] * 0.62)), gm, coll))
        if cfg.get('crest'):
            for k in range(3):
                add('head', C.mesh_obj(f'crest{k}', C.cone(hc + Vector((0, 0.04 + k * 0.08, hr[2] * 0.95 - k * 0.04)), 0.05, 0.0, 0.14, seg=8), M['accent'], coll, outline=OUT * 0.6))
        # 팔 · 발톱
        for side, sx in (('R', -1), ('L', 1)):
            sh = Vector(bones[f'arm.{side}'][0]); hd = Vector(bones[f'arm.{side}'][1])
            ar = cfg.get('arm_thick', 1.0)   # 골렘·오우거·트롤은 굵은 팔과 큰 주먹(머리는 작다) — 실루엣이 임프와 달라야 한다
            add(f'arm.{side}', C.mesh_obj(f'arm{side}', C.tube([sh, sh.lerp(hd, 0.5), hd], [0.08 * ar, 0.07 * ar, 0.065 * ar], seg=14), M['skin'], coll, outline=OUT))
            add(f'arm.{side}', C.mesh_obj(f'fist{side}', C.ellipsoid(hd, (0.08 * ar, 0.075 * ar, 0.075 * ar)), M['dark'] if ar > 1.2 else M['skin'], coll, outline=OUT))
            if cfg.get('fierce'):
                for k in range(3):   # 어깨 가시 3개 · 주먹 마디 가시 2개
                    d = Vector((sx * 0.5, 0.2 - k * 0.25, 1.0)).normalized()
                    add(f'arm.{side}', C.mesh_obj(f'sspike{side}{k}', C.cone(sh + d * 0.07 * ar, 0.04 * ar, 0.0, 0.13 * ar - k * 0.02, seg=8, rot=C.look_rot(d)), M['horn'], coll, outline=OUT * 0.5))
                for k in (-1, 1):
                    d = Vector((sx * 0.3, -1, 0.2)).normalized()
                    add(f'arm.{side}', C.mesh_obj(f'kspike{side}{k}', C.cone(hd + Vector((k * 0.035 * ar, -0.07 * ar, 0.03)), 0.022, 0.0, 0.06, seg=8, rot=C.look_rot(d)), M['horn'], coll, outline=OUT * 0.4))
            for k in (-1, 0, 1):
                add(f'arm.{side}', C.mesh_obj(f'claw{side}{k}', C.cone(hd + Vector((k * 0.035, -0.07, -0.03)), 0.02, 0.0, 0.07, seg=8, rot=Euler((math.radians(110), 0, 0))), M['claw'], coll, outline=OUT * 0.4))
            # 다리
            add(f'leg.{side}', C.mesh_obj(f'leg{side}', C.ellipsoid(Vector((sx * 0.12, -0.01, 0.08)), (0.085, 0.085, 0.1)), M['skin'], coll, outline=OUT))
            add(f'leg.{side}', C.mesh_obj(f'foot{side}', C.ellipsoid(Vector((sx * 0.13, -0.06, 0.025)), (0.085, 0.1, 0.035)), M['dark'], coll, outline=OUT))
            if cfg.get('wings'):
                for o in bat_wing(f'wing{side}', Vector(bones[f'wing.{side}'][0]), sx, cfg.get('wing_size', 1.0) * cfg.get('height', 1.0), M, coll):
                    add(f'wing.{side}', o)
        if cfg.get('tail'):
            tp = spline([Vector((0, 0.15, 0.15)), Vector((0, 0.3, 0.14)), Vector((0, 0.42, 0.2)), Vector((0, 0.5, 0.32))], 16)
            add('tail', C.mesh_obj('tail', C.tube(tp, interp([0.08, 0.06, 0.04, 0.012], len(tp)), seg=14), M['skin'], coll, outline=OUT))
            if cfg.get('tail_tip'):
                add('tail', C.mesh_obj('tailtip', C.cone(tp[-1] + Vector((0, 0.02, 0.04)), 0.06, 0.0, 0.1, seg=4), M['accent'], coll, outline=OUT * 0.6))
        # 빛나는 무늬 점 — 원화의 반짝이는 반점(크고 작게 섞어 20개 안팎). 얼굴 정면은 피한다
        import random
        rnd = random.Random(sum(map(ord, name)))
        gm = _m('spotglow', cfg.get('accent', '#ff8a3d'), rough=0.35, emit=cfg.get('accent', '#ff8a3d'), es=2.2)
        for k in range(cfg.get('spots', 14) + 6):
            on_head = k % 3 == 0
            d = Vector((rnd.uniform(-1, 1), rnd.uniform(-0.3, 1), rnd.uniform(-0.6, 1))).normalized()
            p, n = C.on_ellipsoid(hc, hr, d) if on_head else C.on_ellipsoid(bc, br, d)
            r = rnd.choice((0.03, 0.04, 0.05, 0.065))   # 원화처럼 눈에 띄는 반점
            add('head' if on_head else 'body', C.mesh_obj(f'spot{k}', C.ellipsoid(p - n * 0.004, (r, r * 0.8, 0.012), rot=C.look_rot(n)), gm, coll, outline=OUT * 0.35))
        # 등 가시 줄 — 머리 뒤에서 꼬리까지
        if cfg.get('spikes', True):
            for k in range(6):
                t = k / 5
                d = Vector((0, 0.95, 0.75 - t * 1.2)).normalized()
                p, n = C.on_ellipsoid(hc, hr, d) if k < 2 else C.on_ellipsoid(bc, br, Vector((0, 1, 0.9 - (t - 0.3) * 1.6)).normalized())
                add('head' if k < 2 else 'body', C.mesh_obj(f'spike{k}', C.cone(p + n * 0.03, 0.045 - t * 0.012, 0.0, 0.11 - t * 0.03, seg=8, rot=C.look_rot(n)), M['accent'], coll, outline=OUT * 0.5))
        if cfg.get('leaves'):
            lm = _m('leafdeco', cfg.get('leaf', '#7ac83a'), rough=0.5)
            ld = _m('leafdeco2', cfg.get('leaf2', '#4f9a2a'), rough=0.5)
            for side, sx in (('R', -1), ('L', 1)):
                sh = Vector(bones[f'arm.{side}'][0])
                for k in range(4):
                    a = math.radians(-50 + k * 33)
                    d = Vector((sx * math.cos(a) * 0.9, -0.15 + 0.1 * k, math.sin(a) + 0.6)).normalized()
                    add(f'arm.{side}', C.mesh_obj(f'sleaf{side}{k}', leaf_mesh(sh + d * 0.08, d, 0.24 + 0.04 * (k % 2)), lm if k % 2 else ld, coll, outline=OUT * 0.55))
            for k in range(7):   # 목 깃
                a = math.radians(-150 + k * 50)
                d = Vector((math.sin(a) * 0.9, -math.cos(a) * 0.9, -0.35)).normalized()
                base = Vector((0, 0, bc.z + br[2] * 0.82)) + Vector((math.sin(a) * br[0] * 0.75, -math.cos(a) * br[1] * 0.75, 0))
                add('body', C.mesh_obj(f'cleaf{k}', leaf_mesh(base, d, 0.2), lm if k % 2 else ld, coll, outline=OUT * 0.55))
        if cfg.get('moss'):
            mm = _m('moss', '#5aa63a', rough=0.8)
            for k, d in enumerate([Vector((0, 0.1, 1)), Vector((0.6, 0, 0.7)), Vector((-0.6, 0.2, 0.7)), Vector((0.3, -0.4, 0.8))]):
                p, n = C.on_ellipsoid(hc, hr, d)
                add('head', C.mesh_obj(f'moss{k}', C.ellipsoid(p, (0.1, 0.1, 0.05), rot=C.look_rot(n)), mm, coll, outline=OUT * 0.6))
            for k, d in enumerate([Vector((0.7, 0, 0.6)), Vector((-0.7, 0, 0.6))]):
                p, n = C.on_ellipsoid(bc, br, d)
                add('body', C.mesh_obj(f'bmoss{k}', C.ellipsoid(p, (0.09, 0.09, 0.05), rot=C.look_rot(n)), mm, coll, outline=OUT * 0.6))
        if cfg.get('armor'):
            add('body', C.mesh_obj('armorplate', C.ellipsoid(bc + Vector((0, -0.02, 0.05)), (br[0] * 1.06, br[1] * 1.06, br[2] * 0.7)), M['metal'], coll, outline=OUT))
    elif kind == 'quad':
        bc = Vector((0, 0.02, 0.38))
        br = cfg.get('body_r', (0.2, 0.3, 0.18))
        hc = Vector((0, -0.33, 0.58))
        hr = cfg.get('head_r', (0.2, 0.2, 0.19))
        add('body', C.mesh_obj('body', C.ellipsoid(bc, br), M['skin'], coll, outline=OUT))
        add('body', C.mesh_obj('belly', C.ellipsoid(bc + Vector((0, 0, -0.07)), (br[0] * 0.75, br[1] * 0.8, br[2] * 0.6)), M['belly'], coll, outline=OUT * 0.5))
        add('head', C.mesh_obj('head', C.ellipsoid(hc, hr), M['skin'], coll, outline=OUT))
        add('head', C.mesh_obj('snout', C.ellipsoid(hc + Vector((0, -hr[1] * 1.0, -hr[2] * 0.25)), (hr[0] * 0.5, hr[1] * 0.75, hr[2] * 0.4)), M['belly'], coll, outline=OUT))   # 늑대·사자 주둥이를 길게
        add('head', C.mesh_obj('nose', C.ellipsoid(hc + Vector((0, -hr[1] * 1.72, -hr[2] * 0.08)), (0.045, 0.035, 0.035)), M['dark'], coll))
        _eyes(add, hc, hr, cfg, coll, M, spread=0.42, up=0.18, size=0.8)
        mz = hc + Vector((0, -hr[1] * 1.35, -hr[2] * 0.6))   # 턱도 긴 주둥이 아래로
        add('jaw', C.mesh_obj('jaw', C.ellipsoid(mz, (hr[0] * 0.42, hr[1] * 0.38, hr[2] * 0.14)), M['belly'], coll, outline=OUT))
        add('head', C.mesh_obj('mouth', C.ellipsoid(mz + Vector((0, 0, 0.03)), (hr[0] * 0.36, hr[1] * 0.32, hr[2] * 0.1)), M['mouth'], coll))
        for sx in (-1, 1):
            add('head', C.mesh_obj(f'fang{sx}', C.cone(mz + Vector((sx * 0.05, -hr[1] * 0.3, 0.0)), 0.02, 0.0, 0.055, seg=10, rot=Euler((math.pi, 0, 0))), M['tooth'], coll, outline=OUT * 0.4))
            base = hc + Vector((sx * hr[0] * 0.55, 0.05, hr[2] * 0.7))
            if cfg.get('ears', 'wolf') == 'wolf':
                add('head', C.mesh_obj(f'ear{sx}', C.cone(base + Vector((0, 0, 0.08)), 0.07, 0.0, 0.18, seg=4, rot=Euler((0, sx * math.radians(-10), 0))), M['skin'], coll, outline=OUT))
            if cfg.get('horns'):
                curve = spline([base, base + Vector((sx * 0.1, 0.03, 0.08)), base + Vector((sx * 0.2, 0.1, 0.14))], 10)
                add('head', C.mesh_obj(f'horn{sx}', C.tube(curve, interp([0.045, 0.03, 0.005], len(curve)), seg=12), M['horn'], coll, outline=OUT * 0.8))
            if cfg.get('mane'):
                add('head', C.mesh_obj(f'mane{sx}', C.ellipsoid(hc + Vector((sx * 0.08, 0.12, 0.0)), (hr[0] * 1.1, 0.15, hr[2] * 1.25)), _m('mane', cfg['mane'], rough=0.7), coll, outline=OUT))
        for leg in ('arm.R', 'arm.L', 'leg.R', 'leg.L'):
            h0 = Vector(bones[leg][0]); h1 = Vector(bones[leg][1])
            add(leg, C.mesh_obj(f'{leg}m', C.tube([h0, h0.lerp(h1, 0.5), h1 + Vector((0, 0, 0.04))], [0.075, 0.06, 0.055], seg=12), M['skin'], coll, outline=OUT))
            add(leg, C.mesh_obj(f'{leg}p', C.ellipsoid(h1 + Vector((0, -0.03, 0.025)), (0.065, 0.08, 0.035)), M['dark'], coll, outline=OUT))
        tp = spline([Vector((0, 0.3, 0.42)), Vector((0, 0.42, 0.5)), Vector((0, 0.5, 0.64)), Vector((0, 0.48, 0.74))], 14)
        add('tail', C.mesh_obj('tail', C.tube(tp, interp([0.07, 0.09, 0.07, 0.02], len(tp)), seg=14), M['skin'], coll, outline=OUT))
        if cfg.get('flames'):
            fm = _m('flame', '#ff8a3d', rough=0.3, emit='#ffb347', es=3.0)
            for k in range(3):
                add('body', C.mesh_obj(f'flame{k}', C.cone(bc + Vector((0, -0.1 + k * 0.12, br[2] * 0.95)), 0.06, 0.0, 0.18, seg=10), fm, coll))
        if cfg.get('wings'):
            for side, sx in (('R', -1), ('L', 1)):
                w0 = Vector(bones[f'wing.{side}'][0]); w1 = Vector(bones[f'wing.{side}'][1])
                add(f'wing.{side}', C.mesh_obj(f'wing{side}', C.ellipsoid(w0.lerp(w1, 0.55), (0.2, 0.02, 0.14), rot=Euler((0, sx * math.radians(30), 0))), M['wing'], coll, outline=OUT * 0.7))
    elif kind == 'blob':
        bc = Vector((0, 0, 0.33))
        br = cfg.get('body_r', (0.42, 0.38, 0.34))
        add('body', C.mesh_obj('body', C.ellipsoid(bc, br, egg=0.35), _m('slime', col, rough=0.15, coat=0.8), coll, outline=OUT))
        add('body', C.mesh_obj('shine', C.ellipsoid(bc + Vector((-0.15, -0.25, 0.18)), (0.08, 0.04, 0.05)), M['hi'], coll))
        _eyes(add, bc, br, cfg, coll, M, bone='head', spread=0.3, up=0.2, size=1.1)
        mz = bc + Vector((0, -br[1] * 0.95, -0.03))
        add('jaw', C.mesh_obj('mouth', C.ellipsoid(mz, (0.1, 0.03, 0.05)), M['mouth'], coll))
        if cfg.get('drip'):
            for k in range(3):
                add('body', C.mesh_obj(f'drip{k}', C.ellipsoid(bc + Vector((-0.25 + k * 0.25, -0.15, -0.3)), (0.06, 0.06, 0.05)), _m('slime', col, rough=0.15, coat=0.8), coll, outline=OUT * 0.6))
    else:   # spider
        bc = Vector((0, 0.15, 0.36))
        add('body', C.mesh_obj('abdomen', C.ellipsoid(bc + Vector((0, 0.12, 0.05)), (0.3, 0.32, 0.27)), M['skin'], coll, outline=OUT))
        add('body', C.mesh_obj('mark', C.ellipsoid(bc + Vector((0, 0.1, 0.32)), (0.12, 0.14, 0.03)), M['accent'], coll))
        hc = Vector((0, -0.18, 0.42))
        hr = (0.2, 0.18, 0.17)
        add('head', C.mesh_obj('head', C.ellipsoid(hc, hr), M['skin'], coll, outline=OUT))
        _eyes(add, hc, hr, cfg, coll, M, spread=0.35, up=0.25, size=0.8)
        for sx in (-1, 1):
            add('jaw', C.mesh_obj(f'mand{sx}', C.cone(hc + Vector((sx * 0.06, -0.17, -0.1)), 0.03, 0.0, 0.1, seg=8, rot=Euler((math.radians(150), 0, 0))), M['horn'], coll, outline=OUT * 0.5))
        for bn, (h0, h1, _) in bones.items():
            if bn.startswith('sleg'):
                h0 = Vector(h0); h1 = Vector(h1)
                knee = h0.lerp(h1, 0.45) + Vector((0, 0, 0.18))
                add(bn, C.mesh_obj(f'{bn}m', C.tube(spline([h0, knee, h1], 10), interp([0.035, 0.03, 0.015], 11), seg=10), M['dark'], coll, outline=OUT * 0.7))
        for side in ('R', 'L'):
            h0 = Vector(bones[f'arm.{side}'][0]); h1 = Vector(bones[f'arm.{side}'][1])
            add(f'arm.{side}', C.mesh_obj(f'fore{side}', C.tube([h0, h1], [0.04, 0.02], seg=10), M['dark'], coll, outline=OUT * 0.7))
    if cfg.get('crown'):
        gold = _m('gold', '#f2c232', rough=0.25, metal=0.85)
        hz = (cfg.get('head_z', 0.68) * H) if kind == 'biped' else (0.37 if kind == 'spider' else 0.75)
        hr = cfg.get('head_r', (0.3, 0.27, 0.27))
        add('head', C.mesh_obj('mcrown', C.tube([Vector((0, -0.02, hz + hr[2] * 0.8)), Vector((0, -0.02, hz + hr[2] * 0.8 + 0.1))], [0.16, 0.19], seg=32, caps=False), gold, coll, outline=OUT * 0.7))
    if cfg.get('weapon'):
        from lib.beaver import weapon as bweapon
        hd = Vector(bones['arm.R'][1])
        for o in bweapon(cfg['weapon'], hd, coll, cfg.get('weapon_color', '#cfd6df'), cfg.get('weapon_wood', '#6b4a2b')):
            add('arm.R', o)
    bpy.context.view_layer.update()
    for bone, objs in parts.items():
        for o in objs:
            _attach(o, arm, bone)
    # 키 맞추기 — 원형마다 키가 달라도 발 z=0 · 가장 높은 곳이 cfg height(기본 1)
    return CRig(arm, parts, cfg, kind)


def pose(rig, P):
    """P(도): lean 앞으로 숙임+ · squash · head 끄덕 앞+ · jaw 벌림 · arm_r/arm_l 앞으로 휘두름+ · arm_r_out
    wing 펄럭임 · leg 앞+ · tail · dy 앞으로 이동"""
    arm = rig.arm
    pb = arm.pose.bones
    for b in pb:
        b.rotation_mode = 'QUATERNION'
        b.rotation_quaternion = Quaternion()
        b.scale = (1, 1, 1)
        b.location = (0, 0, 0)
    X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)
    pb['body'].rotation_quaternion = _rot_local(arm, 'body', X, P.get('lean', 0))
    sq = P.get('squash', 1.0)
    pb['body'].scale = (1 / math.sqrt(sq), sq, 1 / math.sqrt(sq))
    if 'head' in pb:
        pb['head'].rotation_quaternion = _rot_local(arm, 'head', X, P.get('head', 0))
    if 'jaw' in pb:
        pb['jaw'].rotation_quaternion = _rot_local(arm, 'jaw', X, -P.get('jaw', 0))
    for s in ('R', 'L'):
        if f'arm.{s}' in pb:
            pb[f'arm.{s}'].rotation_quaternion = _rot_local(arm, f'arm.{s}', X, -P.get(f'arm_{s.lower()}', 0)) @ _rot_local(arm, f'arm.{s}', Y, (1 if s == 'R' else -1) * P.get(f'arm_{s.lower()}_out', 0))
        if f'wing.{s}' in pb:
            pb[f'wing.{s}'].rotation_quaternion = _rot_local(arm, f'wing.{s}', Y, (1 if s == 'R' else -1) * P.get('wing', 0))
        if f'leg.{s}' in pb:
            pb[f'leg.{s}'].rotation_quaternion = _rot_local(arm, f'leg.{s}', X, -P.get(f'leg_{s.lower()}', 0))
    if 'tail' in pb:
        pb['tail'].rotation_quaternion = _rot_local(arm, 'tail', X, P.get('tail', 0))
    for bn in pb.keys():
        if bn.startswith('sleg'):
            pb[bn].rotation_quaternion = _rot_local(arm, bn, X, P.get('slegs', 0) * (1 if '0' in bn else 0.5))
    pb['root'].location = (P.get('dx', 0), P.get('dz', 0), P.get('dy', 0))
    sa = P.get('sq_all', 1.0)   # 전신 눌림·늘림(anim2, 2026-10-19) — 발밑 기준
    pb['root'].scale = (1 / math.sqrt(sa), sa, 1 / math.sqrt(sa))
    bpy.context.view_layer.update()
