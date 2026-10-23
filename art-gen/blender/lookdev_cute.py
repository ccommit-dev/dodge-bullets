"""귀여움 룩데브 (2026-10-23, 사용자: "비버가 귀엽지가 않아") — 같은 카메라(render_roster)로 대기 첫 칸을 렌더해 예전과 나란히 본다.
BEAVER_STYLE=old|cute blender -b -P art-gen/blender/lookdev_cute.py -- <outdir> <id…>"""
import bpy
import sys
import os
import math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import beaver as BV
import roster as R
import anim2 as A2
import render_roster as RR

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
outdir = os.path.join(RR.ROOT, argv[0])
os.makedirs(outdir, exist_ok=True)
for who in argv[1:]:
    cam = RR.setup()
    if who == 'hero':
        cfg, role, hero = R.HERO, 'melee', True
    else:
        cfg = A2.swap_hands(R.ALLIES[who])
        role, hero = cfg.get('role', 'melee'), False
    rig = BV.build(who, cfg)
    acts = A2.beaver_actions(role, hero=True) if hero else A2.beaver_actions(role, weapon=cfg.get('weapon_l'))
    P = acts['idle'][0]
    rig.arm.rotation_euler.z = math.radians(RR.YAW)
    BV.pose(rig, P)
    bpy.context.scene.render.filepath = os.path.join(outdir, f'{who}-{BV.STYLE}.png')
    bpy.ops.render.render(write_still=True)
    print('wrote', who, BV.STYLE)
