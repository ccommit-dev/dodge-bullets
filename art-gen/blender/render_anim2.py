"""애니메이션 2판 렌더 (2026-10-19) — blender -b -P art-gen/blender/render_anim2.py -- <id> [<id> …]
id: hero · hero-spear|hero-bow|hero-staff(무기별 공격 한 줄) · 동료 id · 스킨 id · 몬스터 art. 동작마다 칸을 art-gen/out/b3d2/<id>/<동작>_<i>.png 로, meta.json 에
{res, actions: {동작: [{pivot, tint, parts?}]}} 를 쓴다. 자세는 anim2.py(동작마다 6~8칸 · 고리 · 예비/임팩트/복귀),
칸 수는 art-gen/anim-layout.json. 카메라·조명·재질은 1판(render_roster)과 같아 그림체가 같다. 조립은 scripts/assemble-anim2.mjs."""
import bpy
import sys
import os
import json
import math
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import beaver as BV
from lib import creature as CR
import roster as R
import anim2 as A2
import render_roster as RR

OUT = os.path.join(RR.ROOT, 'art-gen', 'out', 'b3d2')
# 주인공 무기 손 = 왼손(적 쪽) — 2판 공격은 왼손으로 휘두른다(anim2.MAIN_LEFT_ROLES 설명). 게임은 hand 앵커에 무기 그림을 얹는다
HERO_PARTS2 = dict(RR.HERO_PARTS)
HERO_PARTS2['hand'] = ('hand.L', tuple(BV.HAND_L), tuple(BV.HAND_L + Vector((0, 0, 0.2))))
HERO_PARTS2['offHand'] = ('hand.R', tuple(BV.HAND_R), tuple(BV.HAND_R + Vector((0, 0, 0.2))))


def render_actions(rig, actions, pose_fn, outdir, cam, base_yaw, sign=1, parts=None, only=None):
    scene = bpy.context.scene
    meta = {'res': RR.RES, 'actions': {}}
    for action, poses in actions.items():
        frames = []
        for i, P in enumerate(poses):
            rig.arm.rotation_euler.z = base_yaw + sign * math.radians(P.get('yaw', 0))
            pose_fn(rig, P)
            path = os.path.join(outdir, f'{action}_{i}.png')
            if only is None or action in only:
                scene.render.filepath = path
                bpy.ops.render.render(write_still=True)
            fm = {'pivot': RR.px(scene, cam, rig.arm.matrix_world @ Vector((0, 0, 0))), 'tint': A2.tint_of(action, i), 'weaponBehind': bool(P.get('wb', 0))}
            if parts:
                fm['parts'] = {}
                for name, (bone, p, up) in parts.items():
                    a = RR.px(scene, cam, RR.bone_point(rig, bone, p))
                    b = RR.px(scene, cam, RR.bone_point(rig, bone, up))
                    ang = math.degrees(math.atan2(b[0] - a[0], -(b[1] - a[1])))
                    fm['parts'][name] = {'x': a[0], 'y': a[1], 'rot': ang}
            frames.append(fm)
        meta['actions'][action] = frames
    with open(os.path.join(outdir, 'meta.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=1)


def run(who, only=None):
    outdir = os.path.join(OUT, who)
    os.makedirs(outdir, exist_ok=True)
    cam = RR.setup()
    if who == 'hero':
        rig = BV.build('hero', R.HERO)
        render_actions(rig, A2.beaver_actions('melee', hero=True), BV.pose, outdir, cam, math.radians(RR.YAW), 1, HERO_PARTS2, only)
    elif who.startswith('hero-') and who[5:] in A2.HERO_WEAPON_ATTACK:   # 주인공 무기별 공격 시트(창 · 활 · 지팡이, 2026-10-27) — 공격 한 줄만
        rig = BV.build('hero', R.HERO)
        render_actions(rig, {'attack': A2.hero_weapon_attack(who[5:])}, BV.pose, outdir, cam, math.radians(RR.YAW), 1, HERO_PARTS2, only)
    elif who in R.ALLIES or who in R.SKINS:
        if who in R.SKINS:
            base, over = R.SKINS[who]
            cfg = dict(R.ALLIES[base], **over)
        else:
            cfg = R.ALLIES[who]
        cfg = A2.swap_hands(cfg)   # 주 무기는 왼손(적 쪽)
        rig = BV.build(who, cfg)
        render_actions(rig, A2.beaver_actions(cfg.get('role', 'melee'), weapon=cfg.get('weapon_l')), BV.pose, outdir, cam, math.radians(RR.YAW), 1, None, only)
    elif who in R.MONSTERS:
        cfg = R.MONSTERS[who]
        flip = who in R.FLIP_MONSTERS
        rig = CR.build(who, cfg)
        render_actions(rig, A2.monster_actions(cfg.get('kind', 'biped'), R.MON_POSES), CR.pose, outdir, cam, math.radians(RR.YAW if flip else -RR.YAW), 1 if flip else -1, None, only)
    else:
        raise SystemExit(f'unknown {who}')
    print('DONE', who)


argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
only = None
ids = []
for a in argv:
    if a.startswith('--only='):
        only = set(a.split('=', 1)[1].split(','))
    else:
        ids.append(a)
for w in ids:
    run(w, only)
