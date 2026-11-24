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


def build(mid):
    spec = MODELS[mid]
    C.reset()
    C.setup_render(res=(RR.RES, RR.RES), samples=44)
    C.lights()
    cam = C.ortho_camera((0.0, RR.CENTER_Z), RR.ORTHO, elev_deg=8)
    objs = import_glb(os.path.join(SRC, spec['file']))
    for o in [o for o in objs if o.name in spec.get('drop', ())]:   # 작가가 남긴 도우미 메시
        objs.remove(o)
        bpy.data.objects.remove(o, do_unlink=True)
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
    norm.parent = pose
    pose.rotation_euler = (0, 0, math.radians(-RR.YAW + spec['yaw']))
    bpy.context.view_layer.update()
    # 외곽선 — 캐릭터와 같은 잉크 껍질. 굵기는 월드 단위로 맞춘다(오브젝트 배율로 나눔)
    for o in objs:
        if o.type == 'MESH' and not o.modifiers.get('outline'):
            sc = o.matrix_world.to_scale()
            C.add_outline(o, INK_W / max(1e-6, (abs(sc.x) + abs(sc.y) + abs(sc.z)) / 3))
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
    meta = {'res': RR.RES, 'actions': {}, 'source': 'sketchfab'}
    step = 0
    spec = MODELS[mid]
    for action, frames in POSES.items():
        out = []
        for i, (tilt, dx, sz, sxy) in enumerate(frames):
            if act and f1 > f0 and 'anim_in' in spec:   # 정한 줄에서만 자체 동작을 처음부터 끝까지(나머지 줄은 첫 장면)
                scene.frame_set(f0 + int((f1 - f0) * (i / len(frames))) if action in spec['anim_in'] else f0)
            elif act and f1 > f0:   # 자체 동작을 칸마다 고르게 짚는다(대기 4칸이 한 바퀴)
                scene.frame_set(f0 + int((f1 - f0) * ((step % 4) / 4)))
            step += 1
            dx *= spec.get('dx', 1.0)
            pose.location = (dx, 0, 0)
            pose.rotation_euler = (0, math.radians(tilt), base_yaw)
            pose.scale = (sxy, sxy, sz)
            bpy.context.view_layer.update()
            scene.render.filepath = os.path.join(outdir, f'{action}_{i}.png')
            bpy.ops.render.render(write_still=True)
            out.append({'pivot': pivot, 'tint': TINT.get(action, [0] * 9)[i] if action in TINT else 0.0, 'weaponBehind': False})
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
