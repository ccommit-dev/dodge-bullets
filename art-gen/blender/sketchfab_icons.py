"""상점 묶음 그림 — Sketchfab 보석 · 상자 · 물약(CC BY) → 셀 아이콘 (2026-11-24, 사용자: "sketchfab … 아이콘 · UI" → "상점 묶음 그림 만들기").
  blender -b -P art-gen/blender/sketchfab_icons.py -- [all | <job> …]      (ART_STYLE=toon 기본 셀)
  SFI_PREVIEW=1 … -- gems chest potion   → 원본 그대로 한 장씩(모양 · 앞쪽 확인)
입력: art-gen/out/sketchfab/i-gems.glb · i-chest.glb · i-potion.glb (저장소 밖 — 작가 · 라이선스는 docs/CREDITS.md)
출력: art-gen/out/b3d-sficons/pkg-<상품>.png (512²) → PKG_SRC=art-gen/out/b3d-sficons node scripts/assemble-shop-icons.mjs
보석 팩은 수량이 늘수록 그림도 커진다 — 보석 하나(80) → 보석 더미(450) → 보석 넘치는 상자(1200).
재화 탭: 황금 보급 상자 = 금화 넘치는 상자 · 강화석 상자 = 푸른 결정 넘치는 상자 · 방치 가속권 = 물약.
카메라 · 조명 · 셀 설정은 유물/패키지 아이콘(relic_icons.py)과 같다 — 직교 · 위에서 비스듬히, 외곽선은 assemble 의 스티커."""
import bpy
import sys
import os
import math
import random
from mathutils import Vector, Euler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import bcommon as C

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'art-gen', 'out', 'sketchfab')
OUT = os.environ.get('SFI_OUT') or os.path.join(ROOT, 'art-gen', 'out', 'b3d-sficons')
INK_W = float(os.environ.get('SFI_INK', '0.018'))


def import_glb(file, keep=None, piece=None):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, file))
    objs = [o for o in bpy.data.objects if o not in before]
    if keep:   # 메시 이름에 keep 이 든 것만(묶음 파일에서 하나 고르기)
        for o in [o for o in objs if o.type == 'MESH' and keep not in o.name]:
            objs.remove(o)
            bpy.data.objects.remove(o, do_unlink=True)
    if piece is not None:   # 한 메시에 물건이 줄지어 붙어 있다(보석 팩: 결정 덩어리 + 보석 6) — 떨어진 조각으로 나눠 왼쪽부터 piece 번째 무리만
        objs = only_piece(objs, piece)
    return objs


def only_piece(objs, idx):
    mesh = next(o for o in objs if o.type == 'MESH')
    bpy.ops.object.select_all(action='DESELECT')
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.separate(type='LOOSE')
    bpy.ops.object.mode_set(mode='OBJECT')
    parts = [o for o in bpy.context.selected_objects if o.type == 'MESH']
    bpy.context.view_layer.update()

    def xr(o):
        xs = [(o.matrix_world @ Vector(c)).x for c in o.bound_box]
        return min(xs), max(xs)
    parts.sort(key=lambda o: xr(o)[0])
    groups, hi = [], -1e9
    for o in parts:   # x 범위가 겹치면 같은 무리(결정 덩어리는 조각 여럿)
        lo_, hi_ = xr(o)
        if groups and lo_ < hi + 0.02:
            groups[-1].append(o)
            hi = max(hi, hi_)
        else:
            groups.append([o])
            hi = hi_
    keep = set(groups[idx])
    for o in parts:
        if o not in keep:
            objs.remove(o) if o in objs else None
            bpy.data.objects.remove(o, do_unlink=True)
    return [o for o in objs if o.name in bpy.data.objects] + [o for o in keep if o not in objs]


def bounds(objs):
    bpy.context.view_layer.update()
    lo, hi = Vector((1e9, 1e9, 1e9)), Vector((-1e9, -1e9, -1e9))
    for o in objs:
        if o.type != 'MESH':
            continue
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector((min(lo.x, w.x), min(lo.y, w.y), min(lo.z, w.z)))
            hi = Vector((max(hi.x, w.x), max(hi.y, w.y), max(hi.z, w.z)))
    return lo, hi


def placed(file, size, at=(0, 0, 0), rot=(0, 0, 0), keep=None, axis='max', piece=None):
    """모델을 크기 size(가장 긴 변 · axis='z' 면 높이)로 맞춰 바닥 가운데를 at 에 둔다. 돌림은 바닥 가운데 기준"""
    objs = import_glb(file, keep, piece)
    norm = bpy.data.objects.new('norm', None)
    holder = bpy.data.objects.new('holder', None)
    for e in (norm, holder):
        bpy.context.scene.collection.objects.link(e)
    for o in objs:
        if o.parent is None:
            o.parent = norm
    lo, hi = bounds(objs)
    d = hi - lo
    s = size / max(1e-6, d.z if axis == 'z' else max(d.x, d.y, d.z))
    norm.scale = (s, s, s)
    norm.location = (-s * (lo.x + hi.x) / 2, -s * (lo.y + hi.y) / 2, -s * lo.z)
    norm.parent = holder
    holder.location = at
    holder.rotation_euler = Euler([math.radians(a) for a in rot])
    bpy.context.view_layer.update()
    meshes = [o for o in objs if o.type == 'MESH']
    for o in meshes:
        sc = o.matrix_world.to_scale()
        C.add_outline(o, INK_W / max(1e-6, (abs(sc.x) + abs(sc.y) + abs(sc.z)) / 3))
    return holder, meshes


def tint(meshes, dark, light, hi=0.32):
    """원본 손그림 텍스처의 밝기만 살려 두 색 사이로 다시 칠한다(어두운 곳 dark · 밝은 곳 light).
    보석 팩 원색은 어두운 자주라 곱하기로 물들이면 상점 보석(밝은 루비)보다 탁했다"""
    c0, c1 = C.srgb(dark), C.srgb(light)
    for o in meshes:
        for slot in o.material_slots:
            mat = slot.material
            if not mat or not mat.use_nodes:
                continue
            mat = mat.copy()
            slot.material = mat
            nt = mat.node_tree
            bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            emit = next((n for n in nt.nodes if n.type == 'EMISSION'), None)   # 보석 팩은 빛 안 받는 손그림(텍스처 → 발광)
            if not bsdf and not emit:
                continue
            base = bsdf.inputs['Base Color'] if bsdf else emit.inputs['Color']
            ramp = nt.nodes.new('ShaderNodeValToRGB')
            ramp.color_ramp.elements[0].position, ramp.color_ramp.elements[0].color = 0.0, c0
            ramp.color_ramp.elements[1].position, ramp.color_ramp.elements[1].color = hi, c1
            if base.is_linked:
                bw = nt.nodes.new('ShaderNodeRGBToBW')
                nt.links.new(base.links[0].from_socket, bw.inputs[0])
                nt.links.new(bw.outputs[0], ramp.inputs[0])
            else:
                ramp.inputs[0].default_value = 0.6
            nt.links.new(ramp.outputs[0], base)
            if bsdf:
                bsdf.inputs['Roughness'].default_value = 0.3


def vivid(meshes, sat=1.5, val=1.3, hue=0.5):
    """텍스처 색을 더 짙고 밝게(물약 원본은 탁한 갈색이라 상점 판에서 묻혔다)"""
    for o in meshes:
        for slot in o.material_slots:
            mat = slot.material
            if not mat or not mat.use_nodes:
                continue
            nt = mat.node_tree
            bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if not bsdf or not bsdf.inputs['Base Color'].is_linked:
                continue
            src = bsdf.inputs['Base Color'].links[0].from_socket
            hs = nt.nodes.new('ShaderNodeHueSaturation')
            hs.inputs['Hue'].default_value, hs.inputs['Saturation'].default_value, hs.inputs['Value'].default_value = hue, sat, val
            nt.links.new(src, hs.inputs['Color'])
            nt.links.new(hs.outputs['Color'], bsdf.inputs['Base Color'])


def coin_mat():
    mat = bpy.data.materials.new('coin')
    mat.use_nodes = True
    b = mat.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = C.srgb('#ffc928')
    b.inputs['Metallic'].default_value = 0.6
    b.inputs['Roughness'].default_value = 0.35
    return mat


def coin(at, r=0.13, rot=(0, 0, 0), mat=None, edge=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=r, depth=r * 0.3, location=at, rotation=[math.radians(a) for a in rot])
    o = bpy.context.active_object
    o.data.materials.append(mat or coin_mat())
    if edge:   # 옆면은 어두운 금 — 동전끼리 겹쳐도 한 닢씩 읽히게
        o.data.materials.append(edge)
        for poly in o.data.polygons:
            if abs(poly.normal.z) < 0.5:
                poly.material_index = 1
    bpy.ops.object.shade_smooth()
    C.add_outline(o, INK_W)
    return o


# (어두운 곳, 밝은 곳) — 상점 붉은 보석(ui/attendance 보석 · 루비)과 강화석(하늘빛 결정) 색
GEM_RED, GEM_BLUE = ('#a50d2c', '#ff6a86'), ('#1f7fd0', '#c8f8ff')


def gem(at, size, rot=(0, 0, 0), col=GEM_RED, piece=2):
    """보석 팩의 조각 하나 — 메시 4개가 모양이 같고 색만 달라 첫 것을 다시 칠한다. piece 0 = 결정 덩어리 · 1~6 = 낱개 원석"""
    h, ms = placed('i-gems.glb', size, at, rot, keep='gem_Material', piece=piece, axis='z')
    tint(ms, *col)
    return h


def open_chest(at=(0, 0, 0), size=1.5, lid=-105, yaw=0):
    """상자 — 뚜껑(Top_*)을 뒤쪽 경첩 축으로 열어 젖힌다"""
    objs = import_glb('i-chest.glb')
    lo, hi = bounds(objs)
    s = size / max(1e-6, max(hi.x - lo.x, hi.y - lo.y))
    root = bpy.data.objects.new('chest', None)
    hinge = bpy.data.objects.new('hinge', None)
    for e in (root, hinge):
        bpy.context.scene.collection.objects.link(e)
    # 경첩: 뒤쪽 위(+Y 끝 · 뚜껑 바닥 높이 0.336 — 원본 좌표)
    hinge.location = (0, hi.y, 0.336)
    hinge.parent = root
    bpy.context.view_layer.update()   # 경첩 월드 행렬을 먼저 맞춘다 — 안 하면 뚜껑이 경첩 자리만큼 떠 있었다(닫힌 상자에서 보임)
    for o in objs:
        if o.type == 'MESH' and o.name.startswith('Top_'):
            mw = o.matrix_world.copy()
            o.parent = hinge
            o.matrix_parent_inverse = hinge.matrix_world.inverted()
            o.matrix_world = mw
        elif o.parent is None:
            o.parent = root
    bpy.context.view_layer.update()
    hinge.rotation_euler = (math.radians(lid), 0, 0)
    root.scale = (s, s, s)
    root.location = at
    root.rotation_euler = (0, 0, math.radians(yaw))
    bpy.context.view_layer.update()
    for o in objs:
        if o.type == 'MESH':
            sc = o.matrix_world.to_scale()
            C.add_outline(o, INK_W / max(1e-6, (abs(sc.x) + abs(sc.y) + abs(sc.z)) / 3))
    rim = (0.336 - lo.z) * s   # 상자 몸 윗면 높이(바닥 0 기준) — 내용물을 여기 쌓는다
    return root, rim, s * (hi.x - lo.x), s * (hi.y - lo.y)


def heap(cx, cz, w, d, n, make, seed=3):
    """상자 위에 쌓인 더미 — 가운데가 볼록하게"""
    rnd = random.Random(seed)
    for k in range(n):
        u, v = rnd.uniform(-0.5, 0.5), rnd.uniform(-0.5, 0.5)
        bump = (1 - (2 * u) ** 2) * (1 - (2 * v) ** 2)
        make(Vector((cx + u * w, v * d, cz + 0.02 + bump * 0.34 + rnd.uniform(0, 0.06))), rnd)


# ── 일 ──
def j_gems_80():   # 원석 하나 + 작은 것 하나
    gem((0.12, 0.1, -0.8), 1.45, rot=(0, 10, 0), piece=5)
    gem((-0.45, -0.25, -0.8), 0.7, rot=(0, -28, 40), piece=2)


def j_gems_450():   # 결정 덩어리 + 원석 셋 — 한 줌
    gem((0.05, 0.25, -0.8), 1.5, rot=(0, 0, 10), piece=0)
    for (x, y, sz, ry, rz, pc) in ((-0.55, -0.35, 0.75, -30, 30, 5), (0.6, -0.3, 0.7, 32, -20, 4), (0.0, -0.55, 0.55, -10, 80, 2)):
        gem((x, y, -0.8), sz, rot=(0, ry, rz), piece=pc)


def _chest_with(fill):
    root, rim, w, d = open_chest((0, 0, -0.75), 1.6, yaw=0)
    fill(-0.75 + rim, w * 0.82, d * 0.75)


def j_gems_1200():
    _chest_with(lambda z, w, d: heap(0, z, w, d, 9, lambda at, r: gem(tuple(at), r.uniform(0.42, 0.56), rot=(r.uniform(-30, 30), r.uniform(-30, 30), r.uniform(0, 180)), piece=r.randint(1, 6)), seed=5))


def j_gold_pack():
    m, e = coin_mat(), coin_mat()
    e.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = C.srgb('#c9780a')
    _chest_with(lambda z, w, d: heap(0, z, w, d, 22, lambda at, r: coin(tuple(at), 0.17, rot=(r.uniform(-60, 60), r.uniform(-60, 60), 0), mat=m, edge=e), seed=7))


def j_material_pack():
    _chest_with(lambda z, w, d: (gem((0, 0, z - 0.05), 0.75, rot=(0, 0, 20), col=GEM_BLUE, piece=0), heap(0, z, w, d, 6, lambda at, r: gem(tuple(at), r.uniform(0.36, 0.48), rot=(r.uniform(-30, 30), r.uniform(-30, 30), r.uniform(0, 180)), col=GEM_BLUE, piece=r.randint(1, 6)), seed=11)))


def j_chest_closed():   # 닫힌 상자 — 성문 방어 보상 상자(ui/attendance/event-chest) · 비버 상자 아이콘(2026-11-24)
    open_chest((0, 0, -0.62), 1.7, lid=0)


def j_idle_boost():
    h, ms = placed('i-potion.glb', 1.75, (0, 0, -0.85), (0, 0, 0), axis='z')
    vivid(ms)


# ── 유물 일곱(2026-11-24, 사용자: "유물 … 더 받아 6~8종 교체") — 결과는 art-gen/out/b3d-sfrelics/<유물 id>.png →
#    RELIC_SRC=art-gen/out/b3d-sfrelics node scripts/assemble-relics.mjs <id…> (스티커 외곽선 · 계열 테두리 빛 · 등급 별빛은 조립이 더한다)
#    조명은 relic_icons.py 와 같은 계열색 림 둘 + 위 반짝임(등급이 높을수록 세다)
GEM_ICE, GEM_STAR = ('#3d8fd8', '#eafcff'), ('#6a3cc8', '#efd8ff')
FAMILY_RIM = {'fire': '#ff6a1a', 'frost': '#6cd2ff', 'gold': '#ffc23a', 'wind': '#3ff0c4', 'earth': '#8fdc4a', 'star': '#c08bff', 'water': '#3aa8ff'}
TIER_K = {'N': 0.85, 'R': 1.0, 'SR': 1.15, 'SSR': 1.3, 'UR': 1.45, 'LR': 1.6}


def relic_table():
    import re
    with open(os.path.join(ROOT, 'src', 'titans', 'relics.ts'), encoding='utf-8') as f:
        return {i: (fam, tier) for i, fam, tier in re.findall(r'def\("([a-z-]+)", "([a-z]+)", "([A-Z]+)"', f.read())}


def rim_lights(fam, k):
    col = FAMILY_RIM.get(fam, '#fff6e8')
    for nm, loc, rot, e, sz in (('vrim_r', (2.4, 3.0, 2.0), (-62, 0, 145), 1700, 1.4), ('vrim_l', (-2.6, 2.8, 1.2), (-70, 0, -150), 1150, 1.2), ('vtop', (0.0, -1.2, 4.6), (12, 0, 0), 480, 1.2)):
        L = bpy.data.lights.new(nm, 'AREA')
        L.energy, L.size = e * k, sz
        L.color = C.srgb(col if nm != 'vtop' else '#ffffff')[:3]
        o = bpy.data.objects.new(nm, L)
        bpy.context.scene.collection.objects.link(o)
        o.location = loc
        o.rotation_euler = Euler([math.radians(a) for a in rot])


def r_comet_shard():   # 혜성 조각(별 · SR) — 보석 팩 원석 하나를 별빛 보라로, 비스듬히
    gem((0, 0, -0.8), 1.55, rot=(0, -24, 30), col=GEM_STAR, piece=3)


def r_snow_crystal():   # 눈꽃 결정(서리 · SR) — 결정 덩어리를 얼음빛으로
    gem((0, 0, -0.8), 1.6, rot=(0, 0, 15), col=GEM_ICE, piece=0)


def r_treasure_chest():   # 보물 상자(금 · UR) — 열린 상자에 금화 · 붉은 보석
    m, e = coin_mat(), coin_mat()
    e.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = C.srgb('#c9780a')
    root, rim, w, d = open_chest((0, 0, -0.75), 1.6, yaw=0)
    z = -0.75 + rim
    heap(0, z, w * 0.82, d * 0.75, 16, lambda at, r: coin(tuple(at), 0.17, rot=(r.uniform(-60, 60), r.uniform(-60, 60), 0), mat=m, edge=e), seed=13)
    gem((0.05, -0.05, z + 0.12), 0.5, rot=(0, 10, 20), piece=4)


def r_oak_shield():   # 참나무 방패(땅 · R)
    placed('r-shield.glb', 1.75, (0, 0, -0.88), (0, 0, 180))   # 원본 앞면이 +Y — 돌려 앞면(나무 결 · 테)을 보인다


def r_flame_dagger():   # 불꽃 단검(불 · R) — 칼날이 오른쪽 위로
    placed('r-dagger.glb', 1.85, (0, 0, -0.92), (0, -38, 0))


def r_gold_map():   # 금박 지도(금 · R) — 배경 판은 빼고 지도만
    placed('r-map.glb', 1.95, (0, 0, -0.75), (72, 0, 0), keep='Treasure Map')


def r_bronze_shovel():   # 청동 삽(땅 · R)
    placed('r-shovel.glb', 1.85, (0, 0, -0.92), (0, -32, 0))


RELIC_JOBS = {
    'comet-shard': (r_comet_shard, 18, 2.0, -20), 'snow-crystal': (r_snow_crystal, 18, 2.0, -20), 'treasure-chest': (r_treasure_chest, 26, 2.7, -24),
    'oak-shield': (r_oak_shield, 12, 2.0, -24), 'flame-dagger': (r_flame_dagger, 10, 2.0, -16), 'gold-map': (r_gold_map, 22, 2.0, -18),
    'bronze-shovel': (r_bronze_shovel, 10, 2.0, -16),
}
RELIC_OUT = os.environ.get('SFI_RELIC_OUT') or os.path.join(ROOT, 'art-gen', 'out', 'b3d-sfrelics')


# 이름: (일, 카메라 위 각도, 직교 크기, 돌림(°)) — 돌림은 모델 전체를 기둥에 달아 돌린다(ortho_camera 는 yaw 를 무시)
JOBS = {
    'pkg-gems-80': (j_gems_80, 16, 2.0, -20),
    'pkg-gems-450': (j_gems_450, 20, 2.1, -18),
    'pkg-gems-1200': (j_gems_1200, 26, 2.7, -24),
    'pkg-gold-pack': (j_gold_pack, 26, 2.7, -24),
    'pkg-material-pack': (j_material_pack, 26, 2.7, -24),
    'pkg-idle-boost': (j_idle_boost, 10, 2.0, -20),
    'pkg-chest-closed': (j_chest_closed, 20, 2.4, -24),
}


def frame(elev, scale, yaw):
    piv = bpy.data.objects.new('pivot', None)
    bpy.context.scene.collection.objects.link(piv)
    for o in [o for o in bpy.context.scene.objects if o.parent is None and o.type in ('MESH', 'EMPTY') and o is not piv]:
        o.parent = piv
    piv.rotation_euler = Euler((0, 0, math.radians(yaw)))
    C.ortho_camera((0.0, 0.0), scale, yaw_deg=0, elev_deg=elev)


def shoot(name):
    bpy.context.view_layer.update()
    if os.environ.get('ART_STYLE', 'toon') == 'toon':
        from lib import toon as TOON
        TOON.apply(bpy.context.scene)
    bpy.context.scene.render.filepath = os.path.join(OUT, f'{name}.png')
    bpy.ops.render.render(write_still=True)
    print('wrote', name, flush=True)


os.makedirs(OUT, exist_ok=True)
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['all']
if os.environ.get('SFI_PREVIEW') == '1':
    for key, file in (('gems', 'i-gems.glb'), ('chest', 'i-chest.glb'), ('potion', 'i-potion.glb')):
        if key not in argv:
            continue
        for yaw in (0, 90):
            C.reset()
            C.setup_render(res=(384, 384), samples=24)
            C.lights()
            placed(file, 1.6, (0, 0, -0.8))
            frame(18, 2.2, yaw)
            shoot(f'preview-{key}-{yaw}')
    if 'gem1' in argv:   # 보석 조각 7(왼쪽부터 0 = 결정 덩어리) — 고르기
        for k in range(7):
            C.reset()
            C.setup_render(res=(384, 384), samples=24)
            C.lights()
            h, ms = placed('i-gems.glb', 1.5, (0, 0, -0.75), (0, 0, 0), keep='gem_Material', piece=k)
            tint(ms, *GEM_RED)
            frame(18, 2.2, -20)
            shoot(f'preview-gem1-{k}')
else:
    rel = relic_table()
    for name in (list(RELIC_JOBS) if 'relics' in argv else [a for a in argv if a in RELIC_JOBS]):
        fn, elev, scale, yaw = RELIC_JOBS[name]
        fam, tier = rel.get(name, ('gold', 'R'))
        C.reset()
        C.setup_render(res=(512, 512), samples=40)
        C.lights()
        rim_lights(fam, TIER_K.get(tier, 1.0))
        fn()
        frame(elev, scale, yaw)
        os.makedirs(RELIC_OUT, exist_ok=True)
        bpy.context.view_layer.update()
        if os.environ.get('ART_STYLE', 'toon') == 'toon':
            from lib import toon as TOON
            TOON.apply(bpy.context.scene)
        bpy.context.scene.render.filepath = os.path.join(RELIC_OUT, f'{name}.png')
        bpy.ops.render.render(write_still=True)
        print('wrote relic', name, flush=True)
    for name in (list(JOBS) if 'all' in argv else [a for a in argv if a in JOBS]):
        fn, elev, scale, yaw = JOBS[name]
        C.reset()
        C.setup_render(res=(512, 512), samples=40)
        C.lights()
        fn()
        frame(elev, scale, yaw)
        shoot(name)
print('DONE')
