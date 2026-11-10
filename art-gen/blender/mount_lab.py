"""탈것 미리보기 (2026-11-09) — 주인공을 태운 채 여러 칸을 한 번에 렌더해 눈으로 본다(게임 조립 전 3D 확인).
  blender -b -P art-gen/blender/mount_lab.py -- <탈것 id> <출력 폴더> [동작:칸,…] [--solo]
기본 칸: idle:0 · walk:0~5 · attack:1,3 · guard:1. --solo 는 주인공 없이(탈것만). 저해상도(50%) · 16spp.
"""
import bpy
import sys
import os
import math
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import beaver as BV
from lib import mount as MT
import roster as R
import render_roster as RR
import ride_seat as RS

argv = sys.argv[sys.argv.index('--') + 1:]
who, outdir = argv[0], argv[1]
solo = '--solo' in argv
rest = [a for a in argv[2:] if not a.startswith('--')]
shots = [tuple(x.split(':')) for x in rest[0].split(',')] if rest else [('idle', '0')] + [('walk', str(i)) for i in range(6)] + [('attack', '1'), ('attack', '3'), ('guard', '1')]
os.makedirs(outdir, exist_ok=True)
cam = RR.setup()
scene = bpy.context.scene
scene.cycles.samples = 16
scene.render.resolution_percentage = 50
mount = MT.build(who)
acts = MT.actions(who)
hero = None
if not solo:
    hero = BV.build('hero', R.HERO)
    RS.seat_hero(hero)
    rider = RS.rider_actions()
for action, f in shots:
    i = int(f)
    mount.arm.rotation_euler.z = math.radians(RS.MOUNT_YAW)   # 게임 화면과 같은 쪽(오른쪽 — 시트는 왼쪽으로 렌더해 CSS 가 뒤집는다)
    MT.pose(mount, acts[action][i])
    if hero is not None:
        ra = rider[action]
        BV.pose(hero, ra[min(len(ra) - 1, round(i * len(ra) / len(acts[action])))])
        bpy.context.view_layer.update()
        hero.arm.scale = (RS.RIDER_SCALE,) * 3
        hero.arm.rotation_euler.z = math.radians(RS.RIDER_YAW)
        hero.arm.location = RR.bone_point(mount, 'body', MT.seat_of(who)) - Vector((0, 0, RS.RIDER_SINK))
    bpy.context.view_layer.update()
    scene.render.filepath = os.path.join(outdir, f'{action}_{i}.png')
    bpy.ops.render.render(write_still=True)
    print('SHOT', action, i, flush=True)
print('DONE', who, flush=True)
