"""룩데브 관문 (2026-10-16) — blender -b -P art-gen/blender/lookdev.py -- <char> <outdir>
주인공·미아를 대기·예비·타격 세 자세로 512² 투명 PNG 렌더. 게임 화면에 놓아 지금 그림과 비교한다."""
import bpy
import sys
import os
import math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import bcommon as C
from lib import beaver as B

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
who = argv[0] if argv else 'hero'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
outdir = os.path.join(ROOT, argv[1] if len(argv) > 1 else 'art-gen/out/blender-lookdev')
os.makedirs(outdir, exist_ok=True)

CFG = {
    'hero': dict(fur='#a8703f', light='#f6e2c6', dark='#7a4a26', hat='crown', band='#3fb6c9', cape='#7fd0e8', weapon_r=None),
    'mia': dict(fur='#a86a3c', light='#f6e2c6', dark='#6e4426', hat='cap', hat_color='#3a9a5a', hat_color2='#2a7a44', scarf='#2fb8a6', weapon_r='shovel', weapon_l='trident'),
}
POSES = {
    'idle': dict(aim_r=12, aim_l=12),
    'windup': dict(lean=-10, squash=1.04, arm_r=-150, arm_r_out=30, aim_r=-100, arm_l=30, aim_l=40, head=-6, tail=10, dy=-0.02),
    'strike': dict(lean=14, squash=0.94, arm_r=70, aim_r=125, arm_l=-20, aim_l=0, head=8, dy=0.05, tail=-12),
}

C.reset()
gpus = C.setup_render(res=(512, 512), samples=40)
print('GPU', gpus)
C.lights()
rig = B.build(who, CFG[who])
rig.arm.rotation_euler = (0, 0, math.radians(32))   # 오른쪽을 보는 3/4
C.ortho_camera((0.0, 0.62), 1.75, elev_deg=8)
for name, P in POSES.items():
    B.pose(rig, P)
    bpy.context.scene.render.filepath = os.path.join(outdir, f'{who}-{name}.png')
    bpy.ops.render.render(write_still=True)
    print('wrote', name)
