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
import ride_seat as RS
from lib import toon as TOON   # 셀 그림결(ART_STYLE=toon, 2026-11-17)

# 도트 그림체 (2026-11-17, /goal ③) — ART_STYLE=pixel: 같은 리그를 낮은 해상도(PIXEL_RES, 기본 89 = 1024 × beaver k 0.346 ÷ 4)로
# 안티에일리어싱 없이(필터 폭 0.01 — 픽셀마다 한 점) 셀 재질로 렌더해 art-gen/out/b3d2-px 에 쓴다. 큰 그림을 줄이면 뭉개지지만 처음부터 작게 그리면 또렷하다.
# 조립은 assemble-anim2.mjs --pixel(칸 ¼ · 최근접 · 팔레트 줄이기)
PIXEL = os.environ.get('ART_STYLE', '') == 'pixel'
if PIXEL:
    RR.RES = int(os.environ.get('PIXEL_RES', '89'))
OUT = os.environ.get('B3D2_OUT') or os.path.join(RR.ROOT, 'art-gen', 'out', 'b3d2-px' if PIXEL else 'b3d2')
# 주인공 무기 손 = 왼손(적 쪽) — 2판 공격은 왼손으로 휘두른다(anim2.MAIN_LEFT_ROLES 설명). 게임은 hand 앵커에 무기 그림을 얹는다
HERO_PARTS2 = dict(RR.HERO_PARTS)
HERO_PARTS2['hand'] = ('hand.L', tuple(BV.HAND_L), tuple(BV.HAND_L + Vector((0, 0, 0.2))))
HERO_PARTS2['offHand'] = ('hand.R', tuple(BV.HAND_R), tuple(BV.HAND_R + Vector((0, 0, 0.2))))
# 입는 파츠(hero_gear.py) — 신발은 발마다 따로 걷는다, 갑옷 · 투구는 chest · head
HERO_PARTS2['footL'] = ('leg.L', (0.15, -0.08, 0.05), (0.15, -0.08, 0.25))
HERO_PARTS2['footR'] = ('leg.R', (-0.15, -0.08, 0.05), (-0.15, -0.08, 0.25))


def render_actions(rig, actions, pose_fn, outdir, cam, base_yaw, sign=1, parts=None, only=None):
    scene = bpy.context.scene
    if PIXEL:
        scene.cycles.filter_width = 0.01   # 픽셀마다 한 점 — 가장자리 반투명 섞임이 없게
    if TOON.enabled():   # 장면을 다 지은 뒤 재질을 셀로(lib/toon) — 주인공 · 동료 · 몬스터 · 탈것 모두 이 함수를 지난다
        TOON.apply(scene)
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
    # 기본 주인공 모델(2026-11-25, 사용자: "기본 비버 주인공을 받은 모델로" → Happy Beaver) — HERO_MODEL=<sf_rig 캐릭터 id> 이면
    # hero · hero-<무기> · hero-ride 를 그 모델로 굽는다. 자세 값(anim2 · ride_seat)은 비버와 같고, 앉은 다리는 seat 로 무릎을 굽힌다.
    # 조립(assemble-anim2 hero)은 meta.model 이 있으면 몸 높이를 렌더에서 잰다
    HM = os.environ.get('HERO_MODEL')
    if HM and '@' not in who and (who in ('hero', 'hero-ride') or (who.startswith('hero-') and who[5:] in A2.HERO_WEAPON_ATTACK)):
        from lib import sf_rig as SR
        rig = SR.build(HM)
        if who == 'hero':
            acts, yaw = A2.beaver_actions('melee', hero=True), RR.YAW
        elif who == 'hero-ride':
            acts, yaw = {k: [dict(P, seat=1.0) for P in v] for k, v in RS.rider_actions().items()}, RS.RIDER_YAW
        else:
            acts, yaw = {'attack': A2.hero_weapon_attack(who[5:])}, RR.YAW
        render_actions(rig, acts, SR.pose, outdir, cam, math.radians(yaw), 1, SR.parts(rig), only)
        mp = os.path.join(outdir, 'meta.json')
        meta = json.load(open(mp, encoding='utf-8'))
        meta['model'] = HM
        json.dump(meta, open(mp, 'w', encoding='utf-8'), indent=1)
        print('DONE', who)
        return
    # Sketchfab 플레이어블 캐릭터(2026-11-25, lib/sf_rig.py) — 'char@fox' · 'char-spear@fox' 등. 남의 리그라 몸 · 손 자리가 비버와 달라
    # 조립(assemble-anim2 char@<id>)이 자기 배율 · 자기 앵커 표(src/equipment/charAnchors.ts)를 쓴다. 탈것 위 시트는 없다(타지 않는다)
    if who.startswith('char') and '@' in who:
        from lib import sf_rig as SR
        kind, cid = who.split('@', 1)
        rig = SR.build(cid)
        if kind == 'char':
            acts = A2.beaver_actions('melee', hero=True)
        else:
            assert kind.startswith('char-') and kind[5:] in A2.HERO_WEAPON_ATTACK, f'모르는 캐릭터 렌더: {who}'
            acts = {'attack': A2.hero_weapon_attack(kind[5:])}
        render_actions(rig, acts, SR.pose, outdir, cam, math.radians(RR.YAW), 1, SR.parts(rig), only)
        print('DONE', who)
        return
    # 플레이어블 캐릭터 스킨(2026-11-19, hero_skins.py) — 'hero@obsidian' · 'hero-bow@obsidian' · 'hero-ride@obsidian'. 몸 · 뼈 · 자세는 기본 주인공 그대로
    hero_cfg = R.HERO
    if '@' in who:
        import hero_skins as HS
        who, skin = who.split('@', 1)
        hero_cfg = HS.cfg_for(skin, R.HERO)
        assert who == 'hero' or who == 'hero-ride' or (who.startswith('hero-') and who[5:] in A2.HERO_WEAPON_ATTACK), f'스킨은 주인공 렌더만: {who}'
    if who == 'hero':
        rig = BV.build('hero', hero_cfg)
        render_actions(rig, A2.beaver_actions('melee', hero=True), BV.pose, outdir, cam, math.radians(RR.YAW), 1, HERO_PARTS2, only)
    elif who.startswith('hero-') and who[5:] in A2.HERO_WEAPON_ATTACK:   # 주인공 무기별 공격 시트(창 · 활 · 지팡이, 2026-10-27) — 공격 한 줄만
        rig = BV.build('hero', hero_cfg)
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
    elif who.startswith('mount-'):   # 탈것 — 안장 자리를 칸마다 적어 주인공이 같이 움직인다. 2026-11-09 부터 탈것 전용 모델 · 걸음(lib/mount.py)
        from lib import mount as MT
        rig = MT.build(who)
        seat = MT.seat_of(who)   # 종마다 앉는 높이(2026-11-09) — 조립이 MOUNT_SEAT 로 적고 게임이 그 차이만큼 주인공을 옮긴다
        up = (seat[0], seat[1], seat[2] + 0.2)
        render_actions(rig, MT.actions(who), MT.pose, outdir, cam, math.radians(-RS.MOUNT_YAW), -1, {'saddle': ('body', seat, up)}, only)
    elif who == 'hero-ride':   # 탈것 위 주인공 — 앉은 자세 · 먼 다리 없음
        rig = BV.build('hero', hero_cfg)
        RS.seat_hero(rig)
        render_actions(rig, RS.rider_actions(), BV.pose, outdir, cam, math.radians(RS.RIDER_YAW), 1, HERO_PARTS2, only)
    elif who in R.MONSTERS:
        cfg = R.MONSTERS[who]
        if who.startswith('pet-'):   # 펫 2판(2026-11-19, pets_v2.py · lib/pet_kit.py) — 아기 얼굴 · 종별 소품
            import pets_v2 as PV
            cfg = PV.PETS.get(who, cfg)
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
