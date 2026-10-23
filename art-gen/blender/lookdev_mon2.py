"""몬스터 · 대장 룩데브 (2026-10-23, 사용자: "동료 · 몬스터 · 보스도 각각") — 대기 첫 칸을 게임과 같은 카메라 · 방향으로 렌더.
BEAVER_STYLE=lowpoly|old blender -b -P art-gen/blender/lookdev_mon2.py -- <outdir> <art…>"""
import bpy
import sys
import os
import math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import creature as CR
import roster as R
import anim2 as A2
import render_roster as RR

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
outdir = os.path.join(RR.ROOT, argv[0])
os.makedirs(outdir, exist_ok=True)
style = os.environ.get('BEAVER_STYLE', 'cute')
for who in argv[1:]:
    cam = RR.setup()
    cfg = R.MONSTERS[who]
    flip = who in R.FLIP_MONSTERS
    rig = CR.build(who, cfg)
    P = A2.monster_actions(cfg.get('kind', 'biped'), R.MON_POSES)['idle'][0]
    rig.arm.rotation_euler.z = math.radians(RR.YAW if flip else -RR.YAW) + (1 if flip else -1) * math.radians(P.get('yaw', 0))
    CR.pose(rig, P)
    bpy.context.scene.render.filepath = os.path.join(outdir, f'{who}-{style}.png')
    bpy.ops.render.render(write_still=True)
    print('wrote', who, style)
