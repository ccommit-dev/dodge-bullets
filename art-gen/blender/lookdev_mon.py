"""몬스터 룩데브 (2026-10-16) — blender -b -P art-gen/blender/lookdev_mon.py -- <name> <outdir>"""
import bpy
import sys
import os
import math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import bcommon as C
from lib import creature as CR

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
who = argv[0] if argv else 'goblin'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
outdir = os.path.join(ROOT, argv[1] if len(argv) > 1 else 'art-gen/out/blender-lookdev')
os.makedirs(outdir, exist_ok=True)

CFG = {
    'goblin': dict(kind='biped', color='#7d4a6c', belly='#f2c94c', accent='#ff8a3d', iris='#5be05a', eye_size=0.11, ears='bat', wings=True,
                   wing='#5b7a3a', crest=True, spots=10, head_r=(0.33, 0.29, 0.3), body_r=(0.2, 0.18, 0.22), head_z=0.66, shoulder=(0.17, 0.36), tail=True),
    'moss-golem-clean': dict(kind='biped', color='#8d8577', belly='#b9ab8f', dark='#5d564c', iris='#ffd34d', eye_size=0.065, moss=True,
                             head_r=(0.27, 0.24, 0.23), body_r=(0.34, 0.28, 0.33), head_z=0.84, shoulder=(0.31, 0.55), sclera='#2b2a26'),
    'frost-wolf': dict(kind='quad', color='#d9e2ee', belly='#f5f8fc', dark='#5a6b82', iris='#3cc8ff', eye_size=0.07, ears='wolf'),
    'slime': dict(kind='blob', color='#6fd36a', iris='#2a2a2a', eye_size=0.09, drip=True),
}
POSES = {
    'idle': dict(),
    'windup': dict(lean=-10, squash=1.05, arm_r=-130, arm_r_out=25, arm_l=-60, jaw=10, head=-8, dy=-0.03, wing=25, tail=12),
    'strike': dict(lean=18, squash=0.92, arm_r=85, arm_l=40, jaw=28, head=10, dy=0.07, wing=-15, tail=-14),
}

C.reset()
C.setup_render(res=(512, 512), samples=40)
C.lights()
rig = CR.build(who, CFG[who])
rig.arm.rotation_euler = (0, 0, math.radians(-32))   # 몬스터는 왼쪽을 보는 3/4
C.ortho_camera((0.0, 0.55), 1.7, elev_deg=8)
for name, P in POSES.items():
    CR.pose(rig, P)
    bpy.context.scene.render.filepath = os.path.join(outdir, f'{who}-{name}.png')
    bpy.ops.render.render(write_still=True)
    print('wrote', name)
