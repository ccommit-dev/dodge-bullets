"""Sketchfab 몬스터(CC BY) → 애니메이션 2판 칸 (2026-11-23, 사용자: "sketchfab 에서 다운되는 거 찾아다가 게임에 적용" — 우리 그림체로 다시 렌더).
  blender -b -P art-gen/blender/sketchfab_monsters.py -- [all | <id> …]     (ART_STYLE=toon 기본 셀 · ART_STYLE=pixel 도트)
입력: art-gen/out/sketchfab/<파일>.glb (저장소 밖 — 작가 · 라이선스는 docs/CREDITS.md)
출력: art-gen/out/b3d2[-px]/<id>/<동작>_<i>.png + meta.json → node scripts/assemble-anim2.mjs <id> [--pixel]
카메라 · 조명 · 셀 재질은 render_anim2(몬스터)와 같다 — 직교 2.3 · 중심 0.62 · 왼쪽 3/4(−32°). 외곽선은 캐릭터와 같은 잉크 껍질.
받은 모델은 우리 뼈대(anim2)가 없어 발을 축으로 몸 전체를 움직여 칸을 만든다 — 대기 숨쉬기 · 예비 뒤로 젖힘 · 덤빔 앞으로 · 피격 뒤로 튐.
모델에 자체 애니메이션이 있으면(박쥐 날갯짓 · 슬라임 출렁임 …) 각 칸에서 그 동작을 고르게 짚는다."""
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
SRC = os.path.join(RR.ROOT, 'art-gen', 'out', 'sketchfab')
OUT = os.environ.get('B3D2_OUT') or os.path.join(RR.ROOT, 'art-gen', 'out', 'b3d2-px' if PIXEL else 'b3d2')

# id: 파일 · 몸 높이(캐릭터 단위) · 더 돌리기(°, 원본 앞이 −Y 가 아닐 때) · 띄움(나는 몬스터)
MODELS = {
    'sf-bat': dict(file='m-bat.glb', h=1.9, yaw=180, lift=0.08),   # 원본 앞이 +Y · 경계 상자가 날개 휴식 자세로 커서 키를 크게
    'sf-mushy': dict(file='m-mushy.glb', h=1.05, yaw=0, lift=0.0),
    'sf-plant': dict(file='m-plant.glb', h=1.15, yaw=0, lift=0.0),
    'sf-eyeplant': dict(file='m-eyeplant.glb', h=1.15, yaw=0, lift=0.0),
    'sf-tentacle': dict(file='m-tentacle.glb', h=0.95, yaw=0, lift=0.0),
    # sf-slime(m-slime.glb)은 눈 없는 초록 상자라 셀로 그리면 몬스터로 안 읽혀 뺐다(2026-11-23)
    # 상점 펫 4종(2026-11-24, 사용자: "펫 4종 추가") — 펫 시트도 몬스터처럼 왼쪽을 보게 굽고 전장(.hero-pet)이 뒤집는다
    # dx — 덤빔 · 젖힘 가로 이동 배율: 펫은 전장 CSS(hero-pet-pounce)가 뛰어 주니 칸 안 이동을 줄인다(크게 움직이면 조립 배율이 작아져 펫이 작아졌다)
    'pet-cat': dict(file='pet-cat.glb', h=0.95, yaw=0, lift=0.0, dx=0.3),
    'pet-fox': dict(file='pet-fox.glb', h=0.95, yaw=-40, lift=0.0, dx=0.3),   # 원본이 정면 — 왼쪽 3/4 로 더 돌린다
    'pet-penguin': dict(file='pet-penguin.glb', h=0.95, yaw=0, lift=0.0, dx=0.3),
    # 납작하고 넓어 키를 낮춘다 · 자체 동작(점프)은 쓰지 않는다 — 다리를 쭉 뻗는 칸이 조립 배율을 낮춰 개구리가 점만 했다(덤빔은 전장 CSS 가)
    'pet-frog': dict(file='pet-frog.glb', h=0.6, yaw=180, lift=0.0, drop=('Icosphere',), dx=0.3, anim_in=()),   # 재질 없는 지름 2 도우미 구가 경계 상자를 키워 개구리가 점만 했다
    # 2차 몬스터 7종(2026-11-24, 사용자: "sketchfab 에서 바꿀 수 있는 거 다") — 화산 · 심연 · 폐허 · 초원 변종
    # action — 모델에 동작이 여럿이면 대기로 쓸 것. 아기 용 두 파일은 한 장면에 두 마리(…_another)라 한 마리만 남긴다
    # pitch — 뒤로 젖히기(°, 웅크린 모델의 얼굴을 보이게) · trim — 한 메시에 붙은 곁 장식(호박 등)을 떨어진 조각으로 나눠 가운데 몸만 남김
    # sf-fireelem(m-fireelemental.glb)은 웅크린 몸이라 셀로 그리면 얼굴이 안 보여 뺐다(뒤로 젖혀도 머리 없는 몸통) — 대신 용암 골렘
    'sf-lavagolem': dict(file='m-lavagolem.glb', h=1.3, yaw=0, lift=0.0, drop=('Icosphere',), action='Golem.Idle'),
    'sf-dragon-red': dict(file='m-babydragon-red.glb', h=1.15, yaw=70, lift=0.0, drop=('Icosphere', 'Icosphere.001', 'Object_9'), action='idle'),
    'sf-dragon-blue': dict(file='m-babydragon-blue.glb', h=1.0, yaw=-100, lift=0.0, drop=('Icosphere', 'Icosphere.001', 'Object_30'), action='idle'),
    'sf-ghost': dict(file='m-ghost.glb', h=1.15, yaw=-15, lift=0.04, drop=('Ground_M_Ground_0', 'Ghost.002_Outline_0'), trim=0.45),   # 바닥판 · 작가 외곽선 껍질은 뺀다(외곽선은 우리 잉크)
    'sf-magicgolem': dict(file='m-magicgolem.glb', h=1.35, yaw=45, lift=0.0),
    'sf-sandgolem': dict(file='m-sandgolem.glb', h=1.45, yaw=45, lift=0.0),
    'sf-cyclops': dict(file='m-cyclops.glb', h=1.1, yaw=-35, lift=0.0, pitch=-10),   # 네모난 몸이 상자처럼 읽혀(QA boxiness) 더 돌리고 살짝 젖힌다
    # 대장 8종(2026-11-24, 사용자: "대장(보스) 15종 … 모두 다 새로 받아서") — boss=True 면 meta.boss 를 적어 assemble-anim2 가 큰 칸(576²) 시트도 만든다
    'sf-mushking': dict(file='b-mushroom.glb', h=1.6, yaw=-30, lift=0.0, action='Idle', boss=True),
    'sf-werewolf': dict(file='b-werewolf.glb', h=1.6, yaw=-25, lift=0.0, action='Idle', boss=True),
    'sf-treefellow': dict(file='b-treefellow.glb', h=1.7, yaw=-60, lift=0.0, boss=True),
    # sf-stonegiant(b-bigguy.glb, Big Guy)은 셀로 그리면 머리 없이 검게 나와 뺐다
    # 상점 전용 동료(2026-11-24, kind='ally') — 폴더 이름 = 동료 id(allyRoster NEW_ALLIES). 남의 콘셉트를 옮긴 모델 · 다른 IP 태그 모델은 뺐다
    'bunny': dict(file='a-bunny.glb', h=1.0, yaw=-35, lift=0.0, kind='ally', dx=0.5, only='bunny1_'),
    'squirrel': dict(file='a-squirrel.glb', h=1.0, yaw=162, lift=0.0, kind='ally', dx=0.5, arms=(0.36, 1.78, 72)),   # 뼈 없이 T 자세로 와서 팔을 어깨 축으로 내린다
    'cat': dict(file='a-cat.glb', h=0.9, yaw=-30, lift=0.0, kind='ally', dx=0.5, only='Cat_'),   # 배경판 · 그릇 · 물고기는 뺀다
    'duck': dict(file='a-duck.glb', h=1.0, yaw=-15, lift=0.0, kind='ally', dx=0.5, drop=('Plane004__0',)),   # 돌바닥 판은 뺀다
    # 비버 동료 그림 교체 1차(2026-11-25, 사용자: "기존 비버 동료 그림 교체") — Quirky Series FREE Animals Pack(Omabuarts Studio, CC BY).
    # 한 파일에 여덟 동물이 쇼케이스 · LOD 로 여러 벌 — 원점 줄(Scene 동작이 대기)의 한 벌만 keep 으로 남긴다. 폴더는 sfa-<동료 id>,
    # 조립이 meta.ally 이름으로 public/titans/anim/allies/<id>.webp 를 쓰고 비버 조립은 그 동료를 건너뛴다.
    # size — 조립의 몸 높이 배율(땅딸막한 동물은 비버와 같은 높이 비율이면 훨씬 커 보였다) · 길쭉한 도마뱀 · 청어는 h 를 낮춰 덤빌 때 카메라 밖으로 안 나가게
    'sfa-kiki': dict(file='q-pack.glb', h=0.9, yaw=0, lift=0.0, kind='ally', size=0.85, ally='kiki', dx=0.5, keep=('Object_18',)),     # 참새 — 새총 키키
    'sfa-toto': dict(file='q-pack.glb', h=0.5, yaw=0, lift=0.0, kind='ally', size=1, ally='toto', dx=0.5, keep=('Object_32',)),    # 도마뱀 — 견습 토토
    'sfa-nana': dict(file='q-pack.glb', h=0.55, yaw=0, lift=0.0, kind='ally', size=1, ally='nana', dx=0.5, keep=('Object_47',)),    # 청어 — 물길잡이 나나
    'sfa-sisi': dict(file='q-pack.glb', h=0.85, yaw=-60, lift=0.0, kind='ally', size=0.9, ally='sisi', dx=0.5, keep=('Object_61',)),    # 타이판 뱀 — 불씨 시시
    'sfa-gugu': dict(file='q-pack.glb', h=0.85, yaw=-45, lift=0.0, kind='ally', size=0.72, ally='gugu', dx=0.5, keep=('Object_77',)),    # 사향쥐 — 삽질꾼 구구
    'sfa-momo': dict(file='q-pack.glb', h=1.0, yaw=-45, lift=0.0, kind='ally', size=0.9, ally='momo', dx=0.5, keep=('Object_92',)),     # 푸두 사슴 — 약초꾼 모모
    'sfa-pipi': dict(file='q-pack.glb', h=1.0, yaw=0, lift=0.0, kind='ally', size=0.82, ally='pipi', dx=0.5, keep=('Object_108',)),    # 콜로부스 원숭이 — 북치기 피피
    'sfa-dodo': dict(file='q-pack.glb', h=1.0, yaw=0, lift=0.0, kind='ally', size=1, ally='dodo', dx=0.5, keep=('Object_132',)),    # 오징어 — 견습 마법사 도도
    'sf-insect': dict(file='b-insect.glb', h=1.2, yaw=90, lift=0.0, boss=True),
    'sf-magmahound': dict(file='b-magmahound.glb', h=1.3, yaw=0, lift=0.0, action='Idle', boss=True),
    'sf-iceelemental': dict(file='b-iceelemental.glb', h=1.7, yaw=0, lift=0.0, boss=True),
    'sf-icegolem': dict(file='b-icegolem.glb', h=1.6, yaw=0, lift=0.0, boss=True),
    # 몬스터 펫 다섯(2026-11-25, 사용자: "유물이나 icon 탈것, 펫 등등 리소스 3d 모델 찾아다가 다시 반영") — 상점 펫과 같은 길.
    # pet-ogre 는 맞는 모델이 AI 생성뿐이라 그대로 둔다. pet-boss(타이탄의 그림자)는 통통한 유령
    'pet-slime': dict(file='pet-slime.glb', h=0.8, yaw=0, lift=0.0, dx=0.3),
    'pet-dragon': dict(file='pet-dragon.glb', h=0.95, yaw=0, lift=0.0, dx=0.3),
    'pet-wolf': dict(file='pet-wolf.glb', h=0.95, yaw=0, lift=0.0, dx=0.3),
    'pet-goblin': dict(file='pet-goblin.glb', h=0.95, yaw=0, lift=0.0, dx=0.3),
    'pet-boss': dict(file='pet-ghost.glb', h=0.95, yaw=0, lift=0.04, dx=0.3),
}
INK_W = float(os.environ.get('SF_INK', '0.016'))   # 외곽선 굵기(캐릭터 단위) — 셀 OUTLINE_MUL 이 곱해진다

# 칸 자세 — (앞뒤 기울기°: − 가 앞(왼쪽), 가로 이동(− 가 앞), 세로 배율, 가로 배율). 몬스터는 왼쪽을 본다
POSES = {
    'idle': [(0, 0, 1.0, 1.0), (0, 0, 0.975, 1.012), (0, 0, 0.955, 1.022), (0, 0, 0.975, 1.012)],
    'prepare': [(6, 0.03, 0.96, 1.02), (12, 0.06, 0.93, 1.04)],
    'attack': [(-10, -0.12, 1.03, 0.98), (-18, -0.30, 1.05, 0.97), (-12, -0.24, 1.0, 1.0), (-4, -0.08, 1.0, 1.0)],
    'hit': [(12, 0.08, 0.94, 1.03), (6, 0.04, 0.97, 1.015)],
}
TINT = {'hit': [1.0, 0.55]}
# 동료(kind='ally', 2026-11-24 상점 전용 동료) — 동료 시트 배치(anim-layout ally: 대기 6 · 걷기 6 · 덤빔 8 · 피격 4).
# 몬스터처럼 왼쪽을 보게 굽고 조립(assemble-anim2)이 칸마다 좌우를 뒤집어 오른쪽을 보게 한다. 다섯째 값 = 들썩임(위로)
ALLY_POSES = {
    'idle': [(0, 0, 1.0, 1.0, 0), (0, 0, 0.99, 1.005, 0), (0, 0, 0.975, 1.012, 0), (0, 0, 0.965, 1.018, 0), (0, 0, 0.975, 1.012, 0), (0, 0, 0.99, 1.005, 0)],
    'walk': [(-4, 0, 1.0, 1.0, 0.0), (-6, 0, 0.98, 1.01, 0.05), (-4, 0, 1.0, 1.0, 0.08), (-2, 0, 0.98, 1.01, 0.0), (-4, 0, 1.0, 1.0, 0.05), (-6, 0, 0.98, 1.01, 0.08)],
    'attack': [(6, 0.03, 0.97, 1.02, 0), (12, 0.06, 0.94, 1.04, 0), (-8, -0.08, 1.03, 0.98, 0.02), (-18, -0.22, 1.05, 0.97, 0.03), (-14, -0.18, 1.02, 0.99, 0.02), (-8, -0.1, 1.0, 1.0, 0), (-3, -0.04, 1.0, 1.0, 0), (0, 0, 1.0, 1.0, 0)],
    'hit': [(12, 0.08, 0.94, 1.03, 0), (8, 0.05, 0.96, 1.02, 0), (4, 0.02, 0.98, 1.01, 0), (0, 0, 1.0, 1.0, 0)],
}
ALLY_TINT = {'hit': [1.0, 0.7, 0.4, 0.0]}


def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


def mesh_bounds(objs):
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    lo, hi = Vector((1e9, 1e9, 1e9)), Vector((-1e9, -1e9, -1e9))
    for o in objs:
        if o.type != 'MESH':
            continue
        ev = o.evaluated_get(dg)
        for c in ev.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector((min(lo.x, w.x), min(lo.y, w.y), min(lo.z, w.z)))
            hi = Vector((max(hi.x, w.x), max(hi.y, w.y), max(hi.z, w.z)))
    return lo, hi


def anim_owner(objs):
    for o in objs:
        ad = o.animation_data
        if ad and ad.action:
            return ad.action
    return None


def arms_down(objs, sx, sz, ang, blend=0.18):
    """T 자세 팔 내리기(뼈 없는 GLB) — 월드 좌표에서 어깨(±sx, sz)보다 바깥 꼭짓점을 어깨를 축으로 ang° 아래로 돌린다.
    어깨 근처(blend 폭)는 조금씩만 돌려 찢어지지 않게"""
    from mathutils import Matrix
    bpy.context.view_layer.update()
    for o in objs:
        if o.type != 'MESH':
            continue
        mw = o.matrix_world.copy()
        inv = mw.inverted()
        me = o.data
        for v in me.vertices:
            w = mw @ v.co
            side = 1 if w.x > 0 else -1
            d = abs(w.x) - sx
            if d <= 0 or w.z < sz - 0.6:
                continue
            t = min(1.0, d / blend)
            piv = Vector((side * sx, w.y, sz))
            rot = Matrix.Rotation(math.radians(side * ang * t), 3, 'Y')
            v.co = inv @ (piv + rot @ (w - piv))
        me.update()


def trim_parts(objs, frac):
    """메시를 떨어진 조각으로 나누고, 전체 가운데(가로)에서 반폭 × frac 보다 먼 조각을 지운다 — 몸 곁에 붙은 소품(호박) 떼기"""
    meshes = [o for o in objs if o.type == 'MESH']
    others = [o for o in objs if o.type != 'MESH']   # 지운 조각을 다시 만지면 ReferenceError
    parts = []
    for m in meshes:
        bpy.ops.object.select_all(action='DESELECT')
        m.select_set(True)
        bpy.context.view_layer.objects.active = m
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.separate(type='LOOSE')
        bpy.ops.object.mode_set(mode='OBJECT')
        parts += [o for o in bpy.context.selected_objects if o.type == 'MESH']
    lo, hi = mesh_bounds(parts)
    cx, cy, half = (lo.x + hi.x) / 2, (lo.y + hi.y) / 2, max(hi.x - lo.x, hi.y - lo.y) / 2
    keep = []
    for o in parts:
        a, b = mesh_bounds([o])
        if math.hypot((a.x + b.x) / 2 - cx, (a.y + b.y) / 2 - cy) > half * frac:
            bpy.data.objects.remove(o, do_unlink=True)
        else:
            keep.append(o)
    return others + keep


def build(mid):
    spec = MODELS[mid]
    C.reset()
    C.setup_render(res=(RR.RES, RR.RES), samples=44)
    C.lights()
    cam = C.ortho_camera((0.0, RR.CENTER_Z), RR.ORTHO, elev_deg=8)
    objs = import_glb(os.path.join(SRC, spec['file']))
    if spec.get('keep'):   # 쇼케이스 파일(같은 동물이 LOD · 동작별로 여러 벌) — 이 메시 오브젝트만 남긴다
        for o in [o for o in objs if o.type == 'MESH' and o.name not in spec['keep']]:
            objs.remove(o)
            bpy.data.objects.remove(o, do_unlink=True)
    if spec.get('only'):   # 한 파일에 여럿(토끼 둘) — 이름 앞부분이 맞는 메시만
        for o in [o for o in objs if o.type == 'MESH' and not o.name.startswith(spec['only'])]:
            objs.remove(o)
            bpy.data.objects.remove(o, do_unlink=True)
    for o in [o for o in objs if o.name in spec.get('drop', ()) or (o.type == 'MESH' and o.name.startswith('Icosphere') and not o.data.materials)]:   # 작가가 남긴 도우미 메시
        objs.remove(o)
        bpy.data.objects.remove(o, do_unlink=True)
    if spec.get('trim'):
        objs = trim_parts(objs, spec['trim'])
    if spec.get('arms'):
        arms_down(objs, *spec['arms'])
    # 정규화 — 몸 높이 h · 바닥 z=0 · 가운데 x,y=0 (norm) → 자세 축(pose, 발 가운데 원점)
    norm = bpy.data.objects.new('norm', None)
    pose = bpy.data.objects.new('pose', None)
    for e in (norm, pose):
        bpy.context.scene.collection.objects.link(e)
    for o in objs:
        if o.parent is None:
            o.parent = norm
    lo, hi = mesh_bounds(objs)
    s = spec['h'] / max(1e-6, hi.z - lo.z)
    norm.scale = (s, s, s)
    norm.location = (-s * (lo.x + hi.x) / 2, -s * (lo.y + hi.y) / 2, -s * lo.z + spec['lift'])
    if spec.get('pitch'):   # 발 가운데를 축으로 뒤로 젖힌다 — norm(발 가운데가 원점) 과 pose(돌림) 사이에 하나 더
        tilt = bpy.data.objects.new('tilt', None)
        bpy.context.scene.collection.objects.link(tilt)
        norm.parent = tilt
        tilt.rotation_euler = (math.radians(spec['pitch']), 0, 0)
        tilt.parent = pose
    else:
        norm.parent = pose
    pose.rotation_euler = (0, 0, math.radians(-RR.YAW + spec['yaw']))
    bpy.context.view_layer.update()
    # 외곽선 — 캐릭터와 같은 잉크 껍질. 굵기는 월드 단위로 맞춘다(오브젝트 배율로 나눔)
    for o in objs:
        if o.type == 'MESH' and not o.modifiers.get('outline'):
            sc = o.matrix_world.to_scale()
            C.add_outline(o, INK_W / max(1e-6, (abs(sc.x) + abs(sc.y) + abs(sc.z)) / 3))
    if spec.get('action'):   # 이름으로 동작 고르기(남긴 메시의 뼈대에 붙은 것 — 다른 동작은 쓰지 않는다)
        want = bpy.data.actions.get(spec['action'])
        for o in objs:
            if o.type == 'ARMATURE' and o.animation_data and want:
                o.animation_data.action = want
                if hasattr(o.animation_data, 'action_slot') and want.slots:
                    o.animation_data.action_slot = want.slots[0]
        return cam, pose, want
    act = anim_owner(objs)
    return cam, pose, act


def render(mid):
    cam, pose, act = build(mid)
    scene = bpy.context.scene
    if PIXEL:
        scene.cycles.filter_width = 0.01
    if TOON.enabled():
        TOON.apply(scene)
    outdir = os.path.join(OUT, mid)
    os.makedirs(outdir, exist_ok=True)
    pivot = RR.px(scene, cam, (0, 0, 0))
    base_yaw = pose.rotation_euler.z
    f0, f1 = (int(act.frame_range[0]), int(act.frame_range[1])) if act else (0, 0)
    spec = MODELS[mid]
    ally = spec.get('kind') == 'ally'
    meta = {'res': RR.RES, 'actions': {}, 'source': 'sketchfab', 'boss': bool(spec.get('boss')), 'kind': 'ally' if ally else 'monster', 'ally': spec.get('ally'), 'size': spec.get('size', 1.0)}
    step = 0
    tints = ALLY_TINT if ally else TINT
    for action, frames in (ALLY_POSES if ally else POSES).items():
        out = []
        for i, fr in enumerate(frames):
            tilt, dx, sz, sxy = fr[:4]
            dz = fr[4] if len(fr) > 4 else 0.0
            if act and f1 > f0 and 'anim_in' in spec:   # 정한 줄에서만 자체 동작을 처음부터 끝까지(나머지 줄은 첫 장면)
                scene.frame_set(f0 + int((f1 - f0) * (i / len(frames))) if action in spec['anim_in'] else f0)
            elif act and f1 > f0:   # 자체 동작을 칸마다 고르게 짚는다(대기 4칸이 한 바퀴)
                scene.frame_set(f0 + int((f1 - f0) * ((step % 4) / 4)))
            step += 1
            dx *= spec.get('dx', 1.0)
            pose.location = (dx, 0, dz)
            pose.rotation_euler = (0, math.radians(tilt), base_yaw)
            pose.scale = (sxy, sxy, sz)
            bpy.context.view_layer.update()
            scene.render.filepath = os.path.join(outdir, f'{action}_{i}.png')
            bpy.ops.render.render(write_still=True)
            out.append({'pivot': pivot, 'tint': tints[action][i] if action in tints else 0.0, 'weaponBehind': False})
        meta['actions'][action] = out
    with open(os.path.join(outdir, 'meta.json'), 'w') as fp:
        json.dump(meta, fp, indent=1)
    print('wrote', mid, flush=True)


def preview(mid):
    """앞쪽 정하기 — 더 돌리기 0 · 90 · 180 · 270° 네 장(SF_PREVIEW=1). 원본마다 앞이 달라(−Y · +Y · ±X) 처음 한 번 본다"""
    cam, pose, act = build(mid)
    scene = bpy.context.scene
    scene.render.resolution_x = scene.render.resolution_y = 384
    if TOON.enabled():
        TOON.apply(scene)
    base = pose.rotation_euler.z
    for k in (0, 90, 180, 270):
        pose.rotation_euler = (0, 0, base + math.radians(k))
        scene.render.filepath = os.path.join(OUT, mid, f'preview_{k}.png')
        bpy.ops.render.render(write_still=True)


argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['all']
ids = list(MODELS) if 'all' in argv else [a for a in argv if a in MODELS]
for mid in ids:
    preview(mid) if os.environ.get('SF_PREVIEW') == '1' else render(mid)
print('DONE')
