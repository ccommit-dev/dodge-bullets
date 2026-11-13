"""댐 방어전 낙석 (2026-11-13, 사용자: 바위가 쏟아지고 쏘면 부서지는 "느낌"으로) — 일반 적 다섯 종류를 지역 재질 바위로.
몬스터와 같은 그림체: 각진 면(평면 셰이딩) · 무광 · 잉크 외곽선 · 장난감 조명(bcommon.lights) · 발쪽으로 짙어지는 그라데이션.
  blender -b -P art-gen/blender/rocks.py -- <장 0~4> <모양>      → art-gen/out/b3d-rocks/<장>-<모양>.png (투명)
모양: pebble(normal) · chunk(fan) · shard(aimed) · boulder(ricochet) · blast(explosive) · bit0~3(부서질 때 튀는 조각)
한 Blender 에 그림 하나 — 로우 폴리를 연달아 렌더하면 둘째가 한 코어로 멈췄다(blender-rig-sprites 메모). 배치는 art-gen/_run-rocks.sh
조립: node scripts/assemble-rocks.mjs → public/dodge/rocks/<장>-<모양>.webp"""
import bpy
import bmesh
import sys
import os
import math
import random
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import bcommon as C

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTDIR = os.environ.get('ROCK_OUT') or os.path.join(ROOT, 'art-gen', 'out', 'b3d-rocks')
RES = 384
ORTHO = 1.6
OUT = 0.022

# 장 재질 — 그 장 배경과 같은 지역: 0 새벽 초원 · 1 달빛 숲 · 2 왕실 폐허 · 3 용암 협곡 · 4 심연의 성
# base(몸) · dark(아래쪽) · cap(위를 향한 면: 이끼 · 서리 · 밝은 사암 · 재 · 결정 먼지) · glow(폭발 바위 · 결정)
CHAPTERS = [
    dict(base='#8f8170', dark='#4f453b', cap='#6e9442', glow='#ff9d1a'),
    dict(base='#5f6c8c', dark='#323a55', cap='#a3bcd8', glow='#7fd8ff'),
    dict(base='#c08f55', dark='#7a5530', cap='#e6c48a', glow='#ffc23a'),
    dict(base='#54413c', dark='#2a1f1f', cap='#7d4a35', glow='#ff6a10'),
    dict(base='#64519a', dark='#342a55', cap='#9c84d8', glow='#c97cff'),
]

# 모양 — 반지름(x, y, z) · 면 분할 · 울퉁불퉁 세기 · 씨앗
SHAPES = {
    'pebble': dict(r=(0.40, 0.36, 0.33), sub=1, amp=0.16, seed=11),
    'chunk': dict(r=(0.48, 0.40, 0.34), sub=1, amp=0.18, seed=23),
    'shard': dict(r=(0.30, 0.28, 0.50), sub=1, amp=0.12, seed=37, spike=0.36),
    'boulder': dict(r=(0.60, 0.55, 0.56), sub=2, amp=0.08, seed=41),
    'blast': dict(r=(0.48, 0.44, 0.44), sub=1, amp=0.14, seed=53, crystals=4),
    'bit0': dict(r=(0.22, 0.18, 0.16), sub=0, amp=0.20, seed=61),
    'bit1': dict(r=(0.18, 0.20, 0.14), sub=0, amp=0.22, seed=67),
    'bit2': dict(r=(0.24, 0.16, 0.15), sub=0, amp=0.18, seed=71),
    'bit3': dict(r=(0.16, 0.15, 0.18), sub=0, amp=0.24, seed=79),
}


def rock_mat(name, color, dark, rough=0.9):
    """몬스터 lowpoly 피부와 같은 식 — 무광 단색 + 아래로 짙어지는 그라데이션(월드 z)"""
    m, fresh = C.new_mat(name)
    if not fresh:
        return m
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough
    b.inputs['Coat Weight'].default_value = 0.0
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(geo.outputs['Position'], sep.inputs[0])
    mr = nt.nodes.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = -0.5
    mr.inputs['From Max'].default_value = 0.4
    nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
    mixc = nt.nodes.new('ShaderNodeMix'); mixc.data_type = 'RGBA'
    mixc.inputs['A'].default_value = C.srgb(dark)
    mixc.inputs['B'].default_value = C.srgb(color)
    mixc.clamp_factor = True
    mr2 = nt.nodes.new('ShaderNodeMath'); mr2.operation = 'MULTIPLY_ADD'
    mr2.inputs[1].default_value = 0.68
    mr2.inputs[2].default_value = 0.32
    nt.links.new(mr.outputs['Result'], mr2.inputs[0])
    nt.links.new(mr2.outputs['Value'], mixc.inputs['Factor'])
    # 면마다 명암 (shade 색 속성, 0.78~1.12) — 같은 색 면이 이어지면 다면체 장난감처럼 보였다
    at = nt.nodes.new('ShaderNodeAttribute'); at.attribute_name = 'shade'
    mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'
    mul.inputs['Factor'].default_value = 1.0
    nt.links.new(mixc.outputs['Result'], mul.inputs['A'])
    nt.links.new(at.outputs['Color'], mul.inputs['B'])
    nt.links.new(mul.outputs['Result'], b.inputs['Base Color'])
    return m


def glow_mat(name, color, strength):
    m, fresh = C.new_mat(name)
    if not fresh:
        return m
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = C.srgb(color)
    b.inputs['Roughness'].default_value = 0.35
    b.inputs['Emission Color'].default_value = C.srgb(color)
    b.inputs['Emission Strength'].default_value = strength
    return m


def rock_mesh(shape, rng):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=shape['sub'], radius=1.0)
    rx, ry, rz = shape['r']
    for v in bm.verts:
        n = v.co.normalized()
        k = 1.0 + rng.uniform(-shape['amp'], shape['amp'])
        v.co = Vector((n.x * rx * k, n.y * ry * k, n.z * rz * k))
        spike = shape.get('spike', 0.0)
        if spike and n.z < -0.6:   # 떨어지는 쪽(아래)으로 뾰족 — 돌진하는 파편 바위
            v.co.z -= spike * (-n.z - 0.6) / 0.4
    # 아래를 살짝 깎아 바닥에 앉은 느낌(완전한 공처럼 보이지 않게)
    for v in bm.verts:
        if v.co.z < -shape['r'][2] * 0.78 and not shape.get('spike'):
            v.co.z = -shape['r'][2] * 0.78 + (v.co.z + shape['r'][2] * 0.78) * 0.35
    # 깎기 — 무작위 평면 몇 장으로 잘라 평평한 큰 면을 만든다(돌을 쪼갠 단면처럼). 조각(bit)은 둘, 나머지 셋~넷
    cuts = 2 if shape['sub'] == 0 else (3 if shape['sub'] == 2 else 4)
    rx, ry, rz = shape['r']
    for _ in range(cuts):
        d = Vector((rng.uniform(-1, 1), rng.uniform(-1, 0.4), rng.uniform(-0.6, 1))).normalized()
        depth = rng.uniform(0.70, 0.84)
        co = Vector((d.x * rx * depth, d.y * ry * depth, d.z * rz * depth))
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=d, clear_outer=True)
        edges = [e for e in res['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
        if edges:
            try:
                bmesh.ops.holes_fill(bm, edges=edges, sides=0)
            except Exception:
                pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()
    bm.faces.index_update()
    lay = bm.loops.layers.color.new('shade')
    for f in bm.faces:
        k = rng.uniform(0.72, 1.14)
        for l in f.loops:
            l[lay] = (k, k, k, 1.0)
    return bm


def build(ch, name):
    cfg = CHAPTERS[ch]
    shape = SHAPES[name]
    rng = random.Random(shape['seed'] * 7 + ch)
    body = rock_mat(f'rock{ch}', cfg['base'], cfg['dark'])
    cap = rock_mat(f'cap{ch}', cfg['cap'], cfg['base'], rough=0.95 if ch != 1 else 0.6)
    bm = rock_mesh(shape, rng)
    # 위를 향한 면은 덮개 재질(이끼 · 서리 · …) — 조각(bit)은 깨진 속이라 덮개가 없다
    caps = []
    if not name.startswith('bit'):
        for f in bm.faces:
            if f.normal.z > 0.55 and rng.random() < 0.8:
                caps.append(f.index)
    o = C.mesh_obj(f'rock_{name}', bm, body, smooth=False, outline=0.0)
    o.data.materials.append(cap)
    for p in o.data.polygons:
        p.use_smooth = False
        if p.index in caps:
            p.material_index = 1
    C.add_outline(o, OUT if not name.startswith('bit') else OUT * 0.8)
    # 폭발 바위 — 몸에 박힌 빛나는 결정(불씨). 용암 협곡은 더 밝게
    # 용암 · 심연 바위는 작은 불씨 결정 하나(뿔처럼 보이지 않게 짧게) · 불씨 바위는 넷
    n_cr = shape.get('crystals', 0) + (1 if ch in (3, 4) and name in ('boulder', 'chunk', 'pebble') else 0)
    blast = name == 'blast'
    if n_cr:
        gm = glow_mat(f'glow{ch}', cfg['glow'], 1.5 if blast else 0.9)
        for i in range(n_cr):
            a = (i / n_cr) * math.tau + rng.uniform(-0.4, 0.4)
            el = rng.uniform(-0.1, 0.55)
            d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el) - 0.35, math.sin(el))).normalized()
            rx, ry, rz = shape['r']
            base = Vector((d.x * rx * 0.6, d.y * ry * 0.6, d.z * rz * 0.6))
            cbm = bmesh.new()
            length = rng.uniform(0.40, 0.46) if blast else rng.uniform(0.32, 0.36)
            bmesh.ops.create_cone(cbm, cap_ends=True, segments=6, radius1=0.10 if blast else 0.08, radius2=0.0, depth=length)
            for v in cbm.verts:
                v.co.z += length / 2
            co = C.mesh_obj(f'cr{i}', cbm, gm, smooth=False, outline=OUT * 0.6)
            co.location = base
            co.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    return o


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ch, name = int(argv[0]), argv[1]
    C.reset()
    C.FACET = 1
    C.setup_render(res=(RES if not name.startswith('bit') else RES // 2,) * 2, samples=40)
    C.lights()
    C.ortho_camera((0.0, 0.0), ORTHO if not name.startswith('bit') else ORTHO * 0.42, elev_deg=22)
    o = build(ch, name)
    # 조금 돌려 3/4 — 면이 더 갈려 보인다
    o.rotation_euler.z = math.radians(18 + ch * 7)
    for c in bpy.data.objects:
        if c.name.startswith('cr'):
            c.parent = o
            c.matrix_parent_inverse = o.matrix_world.inverted()
    os.makedirs(OUTDIR, exist_ok=True)
    bpy.context.scene.render.filepath = os.path.join(OUTDIR, f'{ch}-{name}.png')
    bpy.ops.render.render(write_still=True)


main()
