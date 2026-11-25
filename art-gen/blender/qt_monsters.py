"""Quaternius 'Ultimate Monsters'(CC0) → 몬스터 · 대장 · 펫 애니메이션 2판 칸 (2026-11-25, 사용자: "리소스 풍이 비슷하게 마저 수정" →
"새로운 리소스들로 풍 균일하게" → "몬스터 · 대장 · 펫 전부"). 한 작가 50종이 같은 팔레트 텍스처(Atlas_Monsters.png) · 같은 비율이라
여러 작가 모델을 섞던 때와 달리 그림결이 한 벌로 맞는다.
  blender -b -P art-gen/blender/qt_monsters.py -- [all | <id> …]        (ART_STYLE=toon 셀 · ART_STYLE=pixel 도트)
  QT_PREVIEW=1 … -- all       → 50종 대기 한 장씩(art-gen/out/qt-preview/<모델>.png, 고르기용)
입력: art-gen/out/quaternius/{flying,blob,big}/glTF/*.gltf (저장소 밖, quaternius.com 무료 받기)
출력: art-gen/out/b3d2[-px]/<게임 그림 id>/<동작>_<i>.png + meta.json → node scripts/assemble-anim2.mjs <id…> [--pixel]
카메라 · 조명 · 칸 수 · 외곽선은 sketchfab_monsters.py 와 같다(왼쪽 3/4 · 직교 2.3). 다른 점은 줄마다 모델 자체 동작을 고른다:
  대기 = Idle/Flying_Idle 한 바퀴, 예비 = 공격 동작 앞부분, 덤빔 = 공격 동작 가운데~끝, 피격 = HitReact."""
import bpy
import sys
import os
import json
import math
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import bcommon as C
from lib import toon as TOON
import render_roster as RR

PIXEL = os.environ.get('ART_STYLE', '') == 'pixel'
if PIXEL:
    RR.RES = int(os.environ.get('PIXEL_RES', '89'))
SRC = os.path.join(RR.ROOT, 'art-gen', 'out', 'quaternius')
OUT = os.environ.get('B3D2_OUT') or os.path.join(RR.ROOT, 'art-gen', 'out', 'b3d2-px' if PIXEL else 'b3d2')
INK_W = float(os.environ.get('QT_INK', '0.016'))
VAL = float(os.environ.get('QT_VAL', '1.4'))   # 팔레트 밝기 — 원본 그대로면 셀 계단 위에서 게임 그림(비버 · 유물)보다 탁하고 어두웠다
SAT = float(os.environ.get('QT_SAT', '1.15'))

# 게임 그림 id → (묶음/모델, 몸 높이, 더 돌리기°, 띄움). 몸 높이는 캐릭터 단위 — 대장은 크게(조립이 대장 칸 배율을 따로 잰다)
# 짝짓기(2026-11-25) — 그림 id 는 그대로(코드 연결 불변), 모습이 바뀐 것은 도감 이름만 고친다. 대장은 같은 묶음의 진화형 · 큰 모델
MODELS = {   # 펫은 부모 몬스터와 같은 모델(예전 펫도 '그 몬스터의 아기'), 대장은 같은 모델을 크게 · 진화형
    'slime': ('blob/GreenBlob', 1, 0, 0),
    'sf-mushy': ('blob/Mushnub', 1, 0, 0),
    'skeleton-goblin': ('big/Orc_Skull', 1, 0, 0),
    'magma-imp': ('big/Demon', 1, 0, 0),
    'void-imp': ('big/BlueDemon', 1, 0, 0),
    'shadow-wolf-clean': ('blob/Dog', 1, 0, 0),
    'frost-wolf': ('big/Yeti', 1, 0, 0),
    'sf-tentacle': ('flying/Squidle', 1, 0, 0.12),
    'hellhound': ('big/Dino', 1, 0, 0),
    'sf-cyclops': ('blob/Alien', 1, 0, 0),
    'goblin': ('blob/Orc', 1, 0, 0),
    'sf-plant': ('blob/Cactoro', 1, 0, 0),
    'goblin-shaman': ('blob/Wizard', 1, 0, 0),
    'sf-eyeplant': ('big/Alien', 1, 0, 0),
    'ogre': ('big/Orc', 1, 0, 0),
    'armored-ogre': ('big/Cactoro', 1, 0, 0),
    'stone-troll': ('flying/Goleling', 1, 0, 0.12),
    'dragon': ('flying/Dragon', 1, 0, 0.12),
    'sf-bat': ('flying/Ghost', 1, 0, 0.12),
    'sf-dragon-red': ('flying/Demon', 1, 0, 0.12),
    'lava-drake': ('flying/Hywirl', 1, 0, 0.12),
    'storm-drake': ('flying/Glub', 1, 0, 0.12),
    'sf-ghost': ('flying/Ghost_Skull', 1, 0, 0.12),
    'moon-wolf-king-clean': ('big/Monkroose', 1.5, 0, 0, True),
    'moss-golem-clean': ('flying/Goleling_Evolved', 1.5, 0, 0.12, True),
    'thorn-boar-king': ('blob/GreenSpikyBlob', 1.5, 0, 0, True),
    'goblin-warlord': ('big/Tribal', 1.5, 0, 0, True),
    'ancient-treant': ('big/MushroomKing', 1.5, 0, 0, True),
    'spider-queen': ('flying/Armabee_Evolved', 1.5, 0, 0.12, True),
    'wolf-king-clean': ('big/Orc', 1.5, 0, 0, True),
    'ruin-sentinel': ('flying/Tribal', 1.5, 0, 0.12, True),
    'minotaur': ('big/Bunny', 1.5, 0, 0, True),
    'flame-wyvern-clean': ('flying/Dragon_Evolved', 1.5, 0, 0.12, True),
    'magma-golem': ('flying/Glub_Evolved', 1.5, 0, 0.12, True),
    'fire-demon': ('big/Demon', 1.5, 0, 0, True),
    'abyss-titan': ('big/BlueDemon', 1.5, 0, 0, True),
    'void-lich': ('blob/Fish', 1.5, 0, 0, True),
    'bone-dragon': ('big/Fish', 1.5, 0, 0, True),
    'golden-lion-clean': ('flying/Alpaking_Evolved', 1.5, 0, 0.12, True),
    'pet-slime': ('blob/PinkBlob', 1, 0, 0),
    'pet-goblin': ('blob/Orc', 1, 0, 0),
    'pet-wolf': ('blob/Dog', 1, 0, 0),
    'pet-ogre': ('blob/Yeti', 1, 0, 0),
    'pet-dragon': ('flying/Dragon', 1, 0, 0.12),
    'pet-boss': ('blob/Ninja', 1, 0, 0),
    'pet-cat': ('blob/Cat', 1, 0, 0),
    'pet-fox': ('blob/Chicken', 1, 0, 0),
    'pet-penguin': ('blob/Pigeon', 1, 0, 0),
    'pet-frog': ('big/Frog', 1, 0, 0),
}
POSES = {   # (앞뒤 기울기°, 가로 이동) — 동작은 모델이 하니 몸 전체 움직임은 덤빔 앞 이동만 남긴다
    'idle': [(0, 0), (0, 0), (0, 0), (0, 0)],
    'prepare': [(3, 0.02), (6, 0.04)],
    'attack': [(-4, -0.08), (-8, -0.22), (-5, -0.18), (-2, -0.06)],
    'hit': [(6, 0.06), (3, 0.03)],
}
TINT = {'hit': [1.0, 0.55]}
ROWS = {   # 줄 → (동작 후보 이름, 동작 안 시작 · 끝 비율)
    'idle': (('Idle', 'Flying_Idle'), 0.0, 1.0),
    'prepare': (('Punch', 'Bite_Front', 'Headbutt', 'Weapon'), 0.05, 0.3),
    'attack': (('Punch', 'Bite_Front', 'Headbutt', 'Weapon'), 0.35, 0.9),
    'hit': (('HitReact', 'HitRecieve'), 0.15, 0.55),
}


def path_of(rel):
    return os.path.join(SRC, rel.split('/')[0], 'glTF', rel.split('/')[1] + '.gltf')


def import_model(rel):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path_of(rel))
    return [o for o in bpy.data.objects if o not in before]


def brighten(objs):
    """기본 색(팔레트 텍스처) 뒤에 밝기 · 채도 노드를 끼운다 — 재질은 묶음 하나라 한 번만"""
    seen = set()
    for o in objs:
        for slot in getattr(o, 'material_slots', []):
            m = slot.material
            if not m or not m.use_nodes or m.name in seen or m.name.startswith('ink'):
                continue
            seen.add(m.name)
            nt = m.node_tree
            b = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if not b or not b.inputs['Base Color'].is_linked:
                continue
            src = b.inputs['Base Color'].links[0].from_socket
            hs = nt.nodes.new('ShaderNodeHueSaturation')
            hs.inputs['Saturation'].default_value, hs.inputs['Value'].default_value = SAT, VAL
            nt.links.new(src, hs.inputs['Color'])
            nt.links.new(hs.outputs['Color'], b.inputs['Base Color'])


def find_action(names):
    for n in names:
        for a in bpy.data.actions:
            if a.name == n or a.name.endswith('|' + n) or a.name.split('|')[-1] == n:
                return a
    return None


def set_action(arm, act):
    if not arm.animation_data:
        arm.animation_data_create()
    arm.animation_data.action = act
    if hasattr(arm.animation_data, 'action_slot') and getattr(act, 'slots', None):
        arm.animation_data.action_slot = act.slots[0]


def bounds(objs):
    bpy.context.view_layer.update()
    lo, hi = Vector((1e9, 1e9, 1e9)), Vector((-1e9, -1e9, -1e9))
    dg = bpy.context.evaluated_depsgraph_get()
    for o in objs:
        if o.type != 'MESH':
            continue
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        for v in me.vertices:
            w = ev.matrix_world @ v.co
            lo = Vector((min(lo.x, w.x), min(lo.y, w.y), min(lo.z, w.z)))
            hi = Vector((max(hi.x, w.x), max(hi.y, w.y), max(hi.z, w.z)))
        ev.to_mesh_clear()
    return lo, hi


def build(rel, h, yaw, lift):
    C.reset()
    C.setup_render(res=(RR.RES, RR.RES), samples=44)
    C.lights()
    cam = C.ortho_camera((0.0, RR.CENTER_Z), RR.ORTHO, elev_deg=8)
    objs = import_model(rel)
    brighten(objs)
    arm = next((o for o in objs if o.type == 'ARMATURE'), None)
    idle = find_action(ROWS['idle'][0])
    if arm and idle:   # 대기 첫 장면에서 크기를 잰다(쉬는 자세 T 자는 팔 폭이 커 몸이 작아졌다)
        set_action(arm, idle)
        bpy.context.scene.frame_set(int(idle.frame_range[0]))
    norm = bpy.data.objects.new('norm', None)
    pose = bpy.data.objects.new('pose', None)
    for e in (norm, pose):
        bpy.context.scene.collection.objects.link(e)
    for o in objs:
        if o.parent is None:
            o.parent = norm
    lo, hi = bounds(objs)
    s = h / max(1e-6, hi.z - lo.z)
    norm.scale = (s, s, s)
    norm.location = (-s * (lo.x + hi.x) / 2, -s * (lo.y + hi.y) / 2, -s * lo.z + lift)
    norm.parent = pose
    pose.rotation_euler = (0, 0, math.radians(-RR.YAW + yaw))
    bpy.context.view_layer.update()
    for o in objs:
        if o.type == 'MESH' and not o.modifiers.get('outline'):
            sc = o.matrix_world.to_scale()
            C.add_outline(o, INK_W / max(1e-6, (abs(sc.x) + abs(sc.y) + abs(sc.z)) / 3))
    return cam, pose, arm


def render(mid):
    rel, h, yaw, lift = MODELS[mid][:4]
    boss = len(MODELS[mid]) > 4 and MODELS[mid][4]
    cam, pose, arm = build(rel, h, yaw, lift)
    scene = bpy.context.scene
    if PIXEL:
        scene.cycles.filter_width = 0.01
    if TOON.enabled():
        TOON.apply(scene)
    outdir = os.path.join(OUT, mid)
    os.makedirs(outdir, exist_ok=True)
    pivot = RR.px(scene, cam, (0, 0, 0))
    base_yaw = pose.rotation_euler.z
    meta = {'res': RR.RES, 'actions': {}, 'source': 'sketchfab', 'pack': 'quaternius',   # source 표시는 조립기가 sf-* 폴더를 찾는 표(assemble-anim2 SKETCHFAB_MONSTERS) 그대로
            'boss': bool(boss), 'kind': 'monster', 'model': rel}
    for row, frames in POSES.items():
        names, a0, a1 = ROWS[row]
        act = find_action(names) if arm else None
        if arm and act:
            set_action(arm, act)
        out = []
        n = len(frames)
        for i, (tilt, dx) in enumerate(frames):
            if act:
                f0, f1 = act.frame_range
                t = a0 + (a1 - a0) * (i / n if row == 'idle' else (i / max(1, n - 1)))
                scene.frame_set(int(round(f0 + (f1 - f0) * t)))
            pose.location = (dx, 0, 0)
            pose.rotation_euler = (0, math.radians(tilt), base_yaw)
            bpy.context.view_layer.update()
            scene.render.filepath = os.path.join(outdir, f'{row}_{i}.png')
            bpy.ops.render.render(write_still=True)
            out.append({'pivot': pivot, 'tint': TINT[row][i] if row in TINT else 0.0, 'weaponBehind': False})
        meta['actions'][row] = out
    with open(os.path.join(outdir, 'meta.json'), 'w') as fp:
        json.dump(meta, fp, indent=1)
    print('wrote', mid, rel, flush=True)


def preview_all():
    out = os.path.join(RR.ROOT, 'art-gen', 'out', 'qt-preview')
    os.makedirs(out, exist_ok=True)
    for pack in ('flying', 'blob', 'big'):
        d = os.path.join(SRC, pack, 'glTF')
        for f in sorted(os.listdir(d)):
            if not f.endswith('.gltf'):
                continue
            rel = f'{pack}/{f[:-5]}'
            cam, pose, arm = build(rel, 1.1, 0, 0.0)
            scene = bpy.context.scene
            scene.render.resolution_x = scene.render.resolution_y = 256
            if TOON.enabled():
                TOON.apply(scene)
            scene.render.filepath = os.path.join(out, f'{pack}-{f[:-5]}.png')
            bpy.ops.render.render(write_still=True)
            print('preview', rel, flush=True)


argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if os.environ.get('QT_PREVIEW') == '1':
    preview_all()
else:
    for mid in (list(MODELS) if 'all' in argv else [a for a in argv if a in MODELS]):
        render(mid)
print('DONE')
