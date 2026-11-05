"""탈것 타는 모습 (2026-11-05, 사용자: "탄 상태가 너무 부자연스러움 · 더 자연스러워야 해").
탈것은 옆모습에 가깝게(몸통 길이가 보이게), 주인공은 안장에 걸터앉는다 — 몸을 앞으로 기울이고 먼 손은 무기, 가까운 손은 고삐, 가까운 다리는 옆구리로 내린다.
먼 다리는 탈것 몸에 가려 안 보이니 그리지 않는다. 게임은 탈것 시트 위에 주인공 시트를 겹치므로 앞뒤가 맞다."""
import bpy
import math
from mathutils import Vector
from lib import bcommon as C
from lib import beaver as BV
import anim2 as A2

MOUNT_YAW = 64        # 탈것 — 오른쪽을 보는 옆모습 쪽 (게임 시트는 왼쪽으로 그려 CSS 로 뒤집는다)
RIDER_YAW = 50        # 주인공 — 얼굴이 보이게 탈것보다 카메라 쪽으로 돈다
RIDER_SCALE = 0.66
RIDER_SINK = 0.02
SADDLE_POINT = (0.0, 0.03, 0.56)   # 탈것 몸 뼈 기준 안장 윗면 (쉬는 자세)


def add_saddle(rig, cfg):
    """안장 — 몸통에 두른 천 · 금 테 · 등자. 탄 사람이 앉을 자리가 보여야 한다"""
    bc = Vector((0, 0.05, 0.38))
    br = cfg.get('body_r', (0.2, 0.42, 0.18))
    cloth = C.principled('saddle_cloth', '#2a5fa8' if cfg.get('wyvern') else '#b8322c', rough=0.85, coat=0.0)
    trim = C.principled('saddle_trim', '#e8b23a', rough=0.45, metal=0.55, coat=0.0)
    saved = C.FACET
    C.FACET = 12
    out = []
    bm = C.ellipsoid(Vector((0, 0.02, 0.38)), (br[0] * 1.07, br[1] * 1.03, br[2] * 1.09))
    for v in [v for v in bm.verts if abs(v.co.y - bc.y) > 0.2 or v.co.z < bc.z - br[2] * 0.45]:
        bm.verts.remove(v)
    out.append(C.mesh_obj('saddle_cloth', bm, cloth, smooth=False, outline=BV.OUT))
    out.append(C.mesh_obj('saddle_seat', C.ellipsoid(Vector((0, bc.y, 0.38 + br[2] * 0.99)), (br[0] * 0.66, 0.15, 0.035)), trim, smooth=False, outline=BV.OUT))
    C.FACET = saved
    bpy.context.view_layer.update()
    for o in out:
        BV._attach(o, rig.arm, 'body')
    return out


def seat_hero(rig):
    """앉은 다리 — 서 있는 다리 둘을 숨기고, 가까운(오른) 다리만 옆구리로 내려 새로 단다. 몸 뼈에 붙어 같이 기운다"""
    fur, dark = None, None
    for bone in ('leg.R', 'leg.L'):
        for o in rig.objs.get(bone, []):
            if bone == 'leg.R':
                if 'foot' in o.name:
                    dark = o.data.materials[0]
                else:
                    fur = o.data.materials[0]
            o.hide_render = True
    saved = C.FACET
    C.FACET = 10
    hip, knee, foot = Vector((-0.2, -0.05, 0.1)), Vector((-0.33, -0.14, -0.08)), Vector((-0.34, -0.1, -0.27))
    made = [
        C.mesh_obj('ride_thigh', C.tube([hip, knee, foot], [0.095, 0.08, 0.07], seg=8), fur, smooth=False, outline=BV.OUT),
        C.mesh_obj('ride_foot', C.ellipsoid(foot + Vector((0, -0.05, -0.03)), (0.075, 0.11, 0.04)), dark, smooth=False, outline=BV.OUT),
    ]
    C.FACET = saved
    bpy.context.view_layer.update()
    for o in made:
        BV._attach(o, rig.arm, 'body')
    return made


def _rider(**kw):
    return A2.full(dict(kw), A2.beaver_base('melee', True), A2.FULL_BEAVER)


SIT = dict(lean=14, head=-10, arm_l=46, arm_l_out=20, aim_l=8, twist_l=55, arm_r=74, arm_r_out=-10)


def rider_actions():
    """자세 — 대기(가볍게 숨) · 달리기(리듬에 맞춰 앞으로 숙였다 편다) · 방어(무기를 앞에 세우고 뒤로 움츠린다). 공격은 게임이 기존 무기별 칸에 앉은 다리만 바꿔 쓴다"""
    idle, walk = [], []
    for i in range(6):
        t = A2.TAU * i / 6
        idle.append(_rider(**dict(SIT, lean=SIT['lean'] + 1.5 * math.sin(t), head=SIT['head'] - 1.5 * math.sin(t), arm_r=SIT['arm_r'] + 2 * math.sin(t))))
        walk.append(_rider(**dict(SIT, lean=SIT['lean'] + 7 + 7 * math.cos(t), head=SIT['head'] - 6 * math.cos(t), arm_r=SIT['arm_r'] + 9 * math.cos(t), arm_l=SIT['arm_l'] + 6 * math.cos(t), tail=8 * math.sin(t))))
    brace = _rider(lean=-6, head=8, arm_l=104, arm_l_out=8, aim_l=-8, twist_l=55, arm_r=88, arm_r_out=-6, sq_all=0.96, tail=10)
    rest = idle[0]
    guard = [A2.lerp(rest, brace, 0.65), brace, dict(brace, lean=-8, sq_all=0.94), A2.lerp(brace, rest, 0.5)]
    out = {'idle': idle, 'walk': walk, 'guard': guard}
    # 공격 — 서서 싸우는 칸과 같은 윗몸(무기 앵커 · 손 자세). 앞으로 내딛는 걸음만 줄이고 안장에 앉은 만큼 숙인다
    def seated(poses):
        return [dict(P, dy=P.get('dy', 0.0) * 0.3, dz=0.0, lean=P.get('lean', 0.0) + 6) for P in poses]
    out['attack'] = seated(A2.beaver_actions('melee', hero=True)['attack'])
    for kind in A2.HERO_WEAPON_ATTACK:
        out[f'attack-{kind}'] = seated(A2.hero_weapon_attack(kind))
    return out
