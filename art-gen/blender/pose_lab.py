"""자세 실험실 (2026-10-19) — blender -b -P art-gen/blender/pose_lab.py -- <id> <poses.json> <outdir>
poses.json: [{"name": "...", "pose": {...}}, …] — 각 자세를 512² · 16spp 로 빠르게 렌더해 무기가 머리에 가리는지 · 호가 읽히는지 본다.
비버(동료·주인공)는 anim2.FULL_BEAVER 를 채워 넣고 역할 기본 자세를 깐다. 결과는 <outdir>/<name>.png"""
import bpy
import sys
import os
import json
import math

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import bcommon as C
from lib import beaver as BV
from lib import creature as CR
import roster as R
import anim2 as A2
import render_roster as RR

argv = sys.argv[sys.argv.index('--') + 1:]
who, posefile, outdir = argv[0], argv[1], argv[2]
os.makedirs(outdir, exist_ok=True)
C.reset()
C.setup_render(res=(512, 512), samples=16)
if os.environ.get('LAB_CPU'):   # 배치 렌더가 GPU 를 쓰는 동안은 CPU 로(한 번에 Blender 하나만 GPU)
    bpy.context.scene.cycles.device = 'CPU'
for kv in filter(None, os.environ.get('LAB_WSCALE', '').split(',')):   # 무기 배율 실험: LAB_WSCALE=sword=0.85,lance=0.9
    k, v = kv.split('=')
    BV.WEAPON_SCALE[k] = float(v)
C.lights()
C.ortho_camera((0.0, RR.CENTER_Z), RR.ORTHO, elev_deg=8)
poses = json.load(open(posefile, encoding='utf-8'))
if who in R.MONSTERS:
    cfg = R.MONSTERS[who]
    flip = who in R.FLIP_MONSTERS
    rig = CR.build(who, cfg)
    base_yaw, sign, fn, defaults, base = math.radians(RR.YAW if flip else -RR.YAW), (1 if flip else -1), CR.pose, A2.FULL_MONSTER, {}
else:
    cfg = R.HERO if who == 'hero' else (dict(R.ALLIES[R.SKINS[who][0]], **R.SKINS[who][1]) if who in R.SKINS else R.ALLIES[who])
    if who != 'hero':
        cfg = A2.swap_hands(cfg)
    rig = BV.build(who, cfg)
    base_yaw, sign, fn, defaults = math.radians(RR.YAW), 1, BV.pose, A2.FULL_BEAVER
    base = A2.beaver_base(cfg.get('role', 'melee'), who == 'hero')
pivots = {}
cam = bpy.context.scene.camera
for p in poses:
    P = A2.full(p['pose'], base, defaults)
    rig.arm.rotation_euler.z = base_yaw + sign * math.radians(P.get('yaw', 0))
    fn(rig, P)
    bpy.context.scene.render.filepath = os.path.join(outdir, p['name'] + '.png')
    bpy.ops.render.render(write_still=True)
    from bpy_extras.object_utils import world_to_camera_view
    from mathutils import Vector
    v = world_to_camera_view(bpy.context.scene, cam, rig.arm.matrix_world @ Vector((0, 0, 0)))
    pivots[p['name']] = [v.x * 512, (1 - v.y) * 512]
json.dump(pivots, open(os.path.join(outdir, 'pivots.json'), 'w'))
print('LAB DONE', len(poses))
