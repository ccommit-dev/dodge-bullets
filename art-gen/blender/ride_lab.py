"""탈것 + 주인공 함께 보기 (2026-11-05) — 한 장면에 같이 놓고 자세 · 크기 · 앉는 높이를 맞춘다. 결과는 눈으로 보는 용도.
  blender -b -P art-gen/blender/ride_lab.py -- <탈것 id> <출력.png> [자세 이름]
"""
import bpy
import sys
import os
import math
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import bcommon as C
from lib import beaver as BV
from lib import creature as CR
import roster as R
import anim2 as A2
import render_roster as RR
import ride_seat as RS

argv = sys.argv[sys.argv.index('--') + 1:]
who, out = argv[0], argv[1]
action = argv[2] if len(argv) > 2 else 'idle'
frame = int(argv[3]) if len(argv) > 3 else 0
bpy.context.scene.render.resolution_percentage = 100
cam = RR.setup()
bpy.context.scene.cycles.samples = 24
mount = CR.build(who, R.MONSTERS[who])
RS.add_saddle(mount, R.MONSTERS[who])
hero = BV.build('hero', R.HERO)
RS.seat_hero(hero)
ma = A2.mount_actions('quad', R.MON_POSES)[action][frame]
hp = RS.rider_actions()[action][frame]
mount.arm.rotation_euler.z = math.radians(RS.MOUNT_YAW)
CR.pose(mount, ma)
BV.pose(hero, hp)
bpy.context.view_layer.update()
hero.arm.scale = (RS.RIDER_SCALE,) * 3
hero.arm.rotation_euler.z = math.radians(RS.RIDER_YAW + hp.get('yaw', 0))
hero.arm.location = RR.bone_point(mount, 'body', RS.SADDLE_POINT) - Vector((0, 0, RS.RIDER_SINK))
bpy.context.view_layer.update()
bpy.context.scene.render.filepath = out
bpy.ops.render.render(write_still=True)
print('DONE', who, flush=True)
