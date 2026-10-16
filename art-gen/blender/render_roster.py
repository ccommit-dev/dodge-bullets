"""명단 렌더 (2026-10-16) — blender -b -P art-gen/blender/render_roster.py -- <id> [<id> …]
id: hero · 동료 id · 스킨 id · 몬스터 art. 칸마다 투명 PNG(1024²) + meta.json(발 기준점 픽셀 · 주인공은 파츠 뼈 투영) 을
art-gen/out/b3d/<id>/ 에 쓴다. 조립(크기 맞춤·칸 배치·띠)은 scripts/assemble-b3d.mjs.
카메라: 직교, 캐릭터 단위 고정 배율 — 같은 캐릭터의 모든 칸이 같은 배율·같은 발 위치라 칸 사이에 크기가 튀지 않는다."""
import bpy
import sys
import os
import json
import math
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import bcommon as C
from lib import beaver as BV
from lib import creature as CR
import roster as R

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RES = 1024
ORTHO = 2.3      # 캐릭터 단위 — 머리 위로 든 무기·날개까지 들어가게
CENTER_Z = 0.62
YAW = 32         # 3/4 — 동료·주인공은 오른쪽(+), 몬스터는 왼쪽(−, FLIP 4종은 +)


def setup():
    C.reset()
    C.setup_render(res=(RES, RES), samples=44)
    C.lights()
    return C.ortho_camera((0.0, CENTER_Z), ORTHO, elev_deg=8)


def px(scene, cam, co):
    v = world_to_camera_view(scene, cam, Vector(co))
    return [v.x * RES, (1 - v.y) * RES]


def bone_point(rig, bone, rest_pt):
    """쉬는 자세 캐릭터 공간 점 → 지금 자세의 월드 점(그 뼈를 따라감)"""
    arm = rig.arm
    b = arm.data.bones[bone]
    pb = arm.pose.bones[bone]
    local = b.matrix_local.inverted() @ Vector(rest_pt)
    return arm.matrix_world @ (pb.matrix @ local)


# 주인공 파츠 기준점(쉬는 자세, 캐릭터 단위) — 투구는 머리 위(왕관 자리), 갑옷은 배 앞, 방패는 왼손, 신발은 두 발 사이
HERO_PARTS = {
    'head': ('head', (0.0, -0.02, 1.04), (0.0, -0.02, 1.24)),        # (뼈, 점, 위쪽 방향 끝점) — 회전은 이 두 점의 화면 각도. 투구는 왕관 자리(눈을 가리지 않게)
    'chest': ('body', (0.0, -0.14, 0.2), (0.0, -0.14, 0.4)),
    'hand': ('hand.R', tuple(BV.HAND_R), tuple(BV.HAND_R + Vector((0, 0, 0.2)))),
    'offHand': ('hand.L', tuple(BV.HAND_L), tuple(BV.HAND_L + Vector((0, 0, 0.2)))),
    'feet': ('root', (0.0, -0.05, 0.02), (0.0, -0.05, 0.2)),
    'shoulderLeft': ('body', tuple(BV.SHOULDER_L + Vector((0, -0.02, 0.02))), tuple(BV.SHOULDER_L + Vector((0, -0.02, 0.2)))),
    'shoulderRight': ('body', tuple(BV.SHOULDER_R + Vector((0, -0.02, 0.02))), tuple(BV.SHOULDER_R + Vector((0, -0.02, 0.2)))),
}


# 공격할 때 적 쪽으로 몸을 더 튼다(3/4 대기는 얼굴이 보이게 32°, 타격은 55°) — 앞으로 휘두르는 동작이 화면 옆으로 읽힌다
YAW_ALLY = [0, 0, 0, 0, 6, 10, 15, 10, -8]   # 타격 23° 는 뒤통수가 보였다
YAW_HERO = [0, 0, 0, 0, 6, 10, 20, 12]
YAW_MON = [0, 0, 6, 20, -8]


def render_frames(who, rig, poses, pose_fn, outdir, cam, parts=None, yaws=None, sign=1):
    scene = bpy.context.scene
    meta = {'res': RES, 'frames': []}
    base = rig.arm.rotation_euler.z
    for i, P in enumerate(poses):
        rig.arm.rotation_euler.z = base + sign * math.radians(P.get('yaw', (yaws or [0] * len(poses))[i]))
        pose_fn(rig, P)
        scene.render.filepath = os.path.join(outdir, f'f{i}.png')
        bpy.ops.render.render(write_still=True)
        fm = {'pivot': px(scene, cam, rig.arm.matrix_world @ Vector((0, 0, 0)))}
        if parts:
            fm['parts'] = {}
            for name, (bone, p, up) in parts.items():
                a = px(scene, cam, bone_point(rig, bone, p))
                b = px(scene, cam, bone_point(rig, bone, up))
                ang = math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1])))   # 화면 위쪽 기준 시계방향
                fm['parts'][name] = {'x': a[0], 'y': a[1], 'rot': ang}
        meta['frames'].append(fm)
    with open(os.path.join(outdir, 'meta.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=1)


def run(who):
    outdir = os.path.join(ROOT, 'art-gen', 'out', 'b3d', who)
    os.makedirs(outdir, exist_ok=True)
    cam = setup()
    if who == 'hero':
        rig = BV.build('hero', R.HERO)
        rig.arm.rotation_euler = (0, 0, math.radians(YAW))
        render_frames(who, rig, R.HERO_IDLE + R.HERO_ATTACK, BV.pose, outdir, cam, HERO_PARTS, YAW_HERO)
    elif who in R.ALLIES or who in R.SKINS:
        if who in R.SKINS:
            base, over = R.SKINS[who]
            cfg = dict(R.ALLIES[base], **over)
        else:
            cfg = R.ALLIES[who]
        rig = BV.build(who, cfg)
        rig.arm.rotation_euler = (0, 0, math.radians(YAW))
        render_frames(who, rig, R.ally_poses(cfg.get('role', 'melee')), BV.pose, outdir, cam, None, YAW_ALLY)
    elif who in R.MONSTERS:
        cfg = R.MONSTERS[who]
        rig = CR.build(who, cfg)
        rig.arm.rotation_euler = (0, 0, math.radians(YAW if who in R.FLIP_MONSTERS else -YAW))
        render_frames(who, rig, R.MON_POSES[cfg.get('kind', 'biped')], CR.pose, outdir, cam, None, YAW_MON, 1 if who in R.FLIP_MONSTERS else -1)
    else:
        raise SystemExit(f'unknown {who}')
    print('DONE', who)


argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
for w in argv:
    run(w)
