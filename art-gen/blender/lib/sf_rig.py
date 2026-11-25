"""Sketchfab 플레이어블 캐릭터 리그 (2026-11-25, 사용자: "캐릭터랑, 동료 리소스 3d 모델 반영" → "주인공 캐릭터 상품 추가 · 보석으로 판매").

비버 주인공 자세 값(anim2.py — lean · side · squash · sq_all · head · arm_l/r · arm_*_out · aim_* · leg_* · tail · dx/dy/dz · yaw)을
남의 리그(Sketchfab GLB, rigify 비슷한 뼈 이름) 뼈에 옮긴다. 원본은 대개 T 자세라 팔을 먼저 내리고(down) 그 위에 비버와 같은 축으로 돌린다.
비버 pose()와 같은 약속:
  · 캐릭터 공간 — 앞 −Y · 위 +Z · 왼쪽(L) +X (불러온 뒤 변환을 굳혀 아마추어 공간 = 이 공간)
  · arm_* 앞으로 들기 = X 축 −각 · arm_*_out 옆으로 벌림 = Y 축(L −, R +) · leg_* 앞으로 = X 축 −각
  · aim_* 무기 방향(옆에서 본 각, 0 위 · 90 앞) — 손 뼈의 아마추어 공간 회전을 직접 정한다(부모 팔 회전과 무관)
  · root 뼈 위치 = (dx 옆, dz 위, dy 앞) · root 크기 = sq_all(발밑 기준 전신 눌림)
무기는 그림에 없다 — 게임이 손 앵커(hand)에 무기 그림을 얹는다(EquippedCharacter). 앵커 뼈 점은 PARTS."""
import math
import os
import bpy
from mathutils import Matrix, Quaternion, Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
SRC = os.path.join(ROOT, 'art-gen', 'out', 'sketchfab')

# 캐릭터 표 — file: art-gen/out/sketchfab/<file> · h: 몸 높이(귀 끝까지, 비버 주인공 왕관까지 약 0.98) ·
# bones: 비버 뼈 이름 → 이 리그 뼈 이름 · down: T 자세 팔을 내리는 각(Y 축, L 기준 +) · drop: 도우미 메시
CHARS = {
    # MartinDL "Cartoon Character"(여우, CC BY) — 29 뼈 metarig, 동작 없음, T 자세
    'fox': dict(
        file='sfh-fox.glb', h=1.02, drop=('Icosphere',), down=72.0,
        bones=dict(root='GLTF_created_0_rootJoint', hips='spine_30', body='spine.001_17', chest='spine.002_16', head='Head_6',
                   arm_l='upper_arm.L_9', fore_l='forearm.L_8', hand_l='hand.L_7',
                   arm_r='upper_arm.R_13', fore_r='forearm.R_12', hand_r='hand.R_11',
                   leg_l='thigh.L_21', shin_l='shin.L_20', leg_r='thigh.R_23', shin_r='shin.R_22',
                   tail=('Tail_29', 'Tail.001_28', 'Tail.002_27', 'Tail.003_26')),
    ),
    # Mayk Santos "Happy Beaver"(CC BY) — 기본 주인공(2026-11-25, 사용자: "기본 비버 주인공을 받은 모델로" → 4번). FBX 를 바꾼 glTF 라
    # 쉬는 자세가 Y 위 · 앞 +Z 로 누운 T 자세(불러온 장면 자세는 두 손 든 모습) → 쉬는 자세로 되돌리고 X 축 +90° 로 세운다(fix_rx).
    # 손 뼈가 손끝 너머 1.5 까지 길어 쥐는 점은 손 뼈 머리에서 grip 만큼만. 팔은 수평에서 18° 내려와 있다(down 72)
    'hb': dict(
        file='sfh-beaver4.glb', h=1.0, drop=('Icosphere',), down=72.0, fix_rx=90.0, grip=0.14,
        bones=dict(root='_rootJoint', hips='coluna_01', body='Bone.001_02', chest='Bone.001_02', head='Bone.003_08',
                   arm_l='Bone.001_R.005_00', fore_l='Bone.001_R.006_010', hand_l='Bone.001_R.007_011',
                   arm_r='Bone.001_R.001_04', fore_r='Bone.001_R.002_05', hand_r='Bone.001_R.003_06',
                   leg_l='Bone_L.001_017', shin_l='Bone_L.002_018', leg_r='Bone_R.001_021', shin_r='Bone_R.002_022',
                   tail=('Bone.005_012', 'Bone.007_013', 'Bone.006_014', 'Bone.008_015')),
    ),
}


class Rig:
    def __init__(self, arm, cfg, objs):
        self.arm = arm
        self.cfg = cfg
        self.objs = objs
        self.B = cfg['bones']


def _import(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


def build(char_id):
    """GLB 를 불러와 변환을 굳힌다 — 아마추어 공간 = 캐릭터 공간(앞 −Y · 위 +Z), 발밑 z=0 · 몸 높이 h"""
    cfg = CHARS[char_id]
    objs = _import(os.path.join(SRC, cfg['file']))
    for o in [o for o in objs if o.name in cfg.get('drop', ())]:
        objs.remove(o)
        bpy.data.objects.remove(o, do_unlink=True)
    arm = next(o for o in objs if o.type == 'ARMATURE')
    meshes = [o for o in objs if o.type == 'MESH']
    bpy.context.view_layer.update()
    # 부모(Sketchfab_model 의 Y-up 회전 · 단위 배율)를 떼고 세계 변환을 그대로 지닌 채 굳힌다
    bpy.ops.object.select_all(action='DESELECT')
    for o in [arm] + meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    for pbn in arm.pose.bones:   # 불러온 장면 자세(glTF 노드 TRS)를 걷고 쉬는 자세로 — 굳힐 때 뼈 · 메시가 같은 자세여야 한다
        pbn.matrix_basis = Matrix()
    bpy.context.view_layer.update()
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    if cfg.get('fix_rx'):   # 누운 쉬는 자세를 세운다 — 원점 둘레로 X 축 회전
        R = Matrix.Rotation(math.radians(cfg['fix_rx']), 4, 'X')
        for o in [arm] + meshes:
            o.matrix_world = R @ o.matrix_world
        bpy.context.view_layer.update()
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    for o in [o for o in objs if o.type == 'EMPTY']:
        bpy.data.objects.remove(o, do_unlink=True)
    objs = [arm] + meshes
    # 높이 · 바닥 맞추기 — 메시 경계(쉬는 자세)
    lo, hi = _bounds(meshes)
    s = cfg['h'] / (hi.z - lo.z)
    cx, cy = (lo.x + hi.x) / 2, (lo.y + hi.y) / 2
    for o in objs:
        o.location = ((o.location.x - cx) * s, (o.location.y - cy) * s, (o.location.z - lo.z) * s)
        o.scale = (s, s, s)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # 메시를 아마추어 자식으로 — 아마추어(원점 = 발밑)를 돌리면 같이 돈다
    for m in meshes:
        m.parent = arm
        m.matrix_parent_inverse = Matrix()
    # 비버 풍(2026-11-25 아트 풍 통일) — 재질 색을 납작한 면 · 비버 팔레트로, 외곽선은 비버 주인공과 같은 잉크 껍질 · 같은 굵기(beaver.OUT).
    # 부모를 붙인 뒤 — 매끈한 복제본(sf_style.smooth_normals)도 아마추어를 따라간다
    from lib import sf_style as SFS
    from lib import bcommon as C
    from lib import beaver as BV
    SFS.apply(meshes)
    for m in meshes:
        C.add_outline(m, BV.OUT)
    arm.location = (0, 0, 0)
    arm.rotation_mode = 'XYZ'   # glTF 는 쿼터니언으로 들어온다 — 렌더가 rotation_euler.z 로 돌린다(안 바꾸면 돌림이 먹지 않는다)
    arm.rotation_euler = (0, 0, 0)
    bpy.context.view_layer.update()
    for p in arm.pose.bones:
        p.rotation_mode = 'QUATERNION'
    return Rig(arm, cfg, objs)


def _bounds(meshes):
    bpy.context.view_layer.update()
    lo, hi = Vector((1e9, 1e9, 1e9)), Vector((-1e9, -1e9, -1e9))
    for o in meshes:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector((min(lo.x, w.x), min(lo.y, w.y), min(lo.z, w.z)))
            hi = Vector((max(hi.x, w.x), max(hi.y, w.y), max(hi.z, w.z)))
    return lo, hi


def _rot_local(arm, bone, Rw):
    """캐릭터 공간 회전 Rw(3×3) → 뼈 로컬 회전(쉬는 자세 기준). 부모가 안 돌았을 때 정확 — 비버 _rot_local 과 같다"""
    R0 = arm.data.bones[bone].matrix_local.to_3x3()
    return (R0.inverted() @ Rw @ R0).to_quaternion()


def _R(axis, deg):
    return Matrix.Rotation(math.radians(deg), 3, axis)


def arm_down(rig, side):
    """T 자세 팔을 내리는 회전(캐릭터 공간) — L 은 Y 축 +, R 은 Y 축 −"""
    d = rig.cfg.get('down', 0.0)
    return _R('Y', d if side == 'l' else -d)


def hand_rest_up(rig, side):
    """무기 위쪽 방향의 쉬는 자세 벡터 — 팔을 내린 중립 자세에서 화면 위(+Z)를 가리키게 down 회전을 되돌린 값"""
    return arm_down(rig, side).inverted() @ Vector((0, 0, 0.2))


def _set_world_rot(arm, bone, Rarm):
    """뼈의 아마추어 공간 회전을 Rarm(3×3, 쉬는 자세 대비 아님 — 절대)으로. 머리 위치는 부모를 따라간 그대로"""
    bpy.context.view_layer.update()
    pb = arm.pose.bones[bone]
    head = pb.matrix.to_translation()
    pb.matrix = Matrix.LocRotScale(head, Rarm.to_quaternion(), pb.matrix.to_scale())


def pose(rig, P):
    arm, B = rig.arm, rig.B
    pb = arm.pose.bones
    for b in pb:
        b.rotation_quaternion = Quaternion()
        b.scale = (1, 1, 1)
        b.location = (0, 0, 0)
    X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
    # 몸통 — 숙임 · 옆 기울기는 허리 위(body)만. 엉덩이(hips)는 다리 · 꼬리의 부모라 그대로 둔다
    pb[B['body']].rotation_quaternion = _rot_local(arm, B['body'], _R(X, P.get('lean', 0)) @ _R(Y, P.get('side', 0)))
    sq = P.get('squash', 1.0)
    pb[B['body']].scale = (1 / math.sqrt(sq), sq, 1 / math.sqrt(sq))   # 뼈 로컬 Y = 위(척추 뼈가 위를 향한다)
    pb[B['head']].rotation_quaternion = _rot_local(arm, B['head'], _R(X, P.get('head', 0)) @ _R(Z, P.get('head_turn', 0)))
    pb[B['head']].scale = (math.sqrt(sq), 1 / sq, math.sqrt(sq))
    # 다리 — 앞으로 +. 앉은 자세(seat — 탈것 위)는 넓적다리를 앞으로 들고 무릎을 굽힌다
    seat = P.get('seat', 0.0)
    pb[B['leg_l']].rotation_quaternion = _rot_local(arm, B['leg_l'], _R(X, -(P.get('leg_l', 0) + 80 * seat)) @ _R(Y, -14 * seat))
    pb[B['leg_r']].rotation_quaternion = _rot_local(arm, B['leg_r'], _R(X, -(P.get('leg_r', 0) + 80 * seat)) @ _R(Y, 14 * seat))
    if seat:
        for s_ in ('l', 'r'):
            sh = B[f'shin_{s_}']
            pb[sh].rotation_quaternion = _rot_local(arm, sh, _R(X, 75 * seat))
    # 꼬리 — 사슬에 나눠 흔든다(옆으로, 여우 꼬리는 위아래보다 좌우가 산다)
    tail = B.get('tail') or ()
    for i, t in enumerate(tail):
        pb[t].rotation_quaternion = _rot_local(arm, t, _R(Z, P.get('tail', 0) * (0.5 + 0.25 * i)))
    # 뿌리 — 이동 · 전신 눌림(발밑 기준)
    root = pb[B['root']]
    sa = P.get('sq_all', 1.0)
    root.scale = (1 / math.sqrt(sa), sa, 1 / math.sqrt(sa))
    bpy.context.view_layer.update()
    M = root.matrix.copy()
    M.translation = M.translation + Vector((P.get('dx', 0), -P.get('dy', 0), P.get('dz', 0)))
    root.matrix = M
    # 팔 — 내림(down) 위에 비버와 같은 축으로 들기 · 벌리기. 몸통 숙임을 따라가게 부모 회전은 그대로 둔다
    for s in ('l', 'r'):
        sign = 1 if s == 'l' else -1
        Rpose = _R(X, -P.get(f'arm_{s}', 0)) @ _R(Y, -sign * P.get(f'arm_{s}_out', 0)) @ arm_down(rig, s)
        pb[B[f'arm_{s}']].rotation_quaternion = _rot_local(arm, B[f'arm_{s}'], Rpose)
    # 손 — 무기 방향(aim)을 아마추어 공간에서 바로 정한다: 중립(팔 내림)의 손 회전에 X 축 aim 만큼. 몸 숙임 · 옆 기울기도 같이
    bpy.context.view_layer.update()
    body_R = _R(X, P.get('lean', 0)) @ _R(Y, P.get('side', 0))
    for s in ('l', 'r'):
        h = B[f'hand_{s}']
        R0 = arm.data.bones[h].matrix_local.to_3x3()
        aim = P.get(f'aim_{s}', 12.0)
        Rt = _R(X, aim) @ arm_down(rig, s) @ R0
        if P.get(f'twist_{s}', 0):
            Rt = Rt @ _R(Y, P[f'twist_{s}'])
        _set_world_rot(arm, h, body_R @ Rt)
    bpy.context.view_layer.update()


def parts(rig):
    """게임 앵커용 뼈 점 — (뼈, 쉬는 자세 점, 위쪽 끝 점). 비버 HERO_PARTS2 와 같은 이름(EquipmentFrameAnchors)"""
    arm, B = rig.arm, rig.B
    bones = arm.data.bones

    def mid(b):
        return tuple((bones[b].head_local + bones[b].tail_local) / 2)

    def head(b):
        return tuple(bones[b].head_local)

    def up(p, v=(0, 0, 0.2)):
        return tuple(Vector(p) + Vector(v))

    def grip(b):   # 쥐는 점 — 손 뼈 끝. 손 뼈가 손끝 너머로 긴 리그(cfg grip)는 손 뼈 머리에서 grip 만큼
        h, t = bones[b].head_local, bones[b].tail_local
        g = rig.cfg.get('grip')
        return tuple(h + (t - h).normalized() * g) if g else tuple(t)

    hl, hr = grip(B['hand_l']), grip(B['hand_r'])
    return {
        'hand': (B['hand_l'], hl, tuple(Vector(hl) + hand_rest_up(rig, 'l'))),
        'offHand': (B['hand_r'], hr, tuple(Vector(hr) + hand_rest_up(rig, 'r'))),
        'head': (B['head'], mid(B['head']), up(mid(B['head']))),
        'chest': (B['chest'], head(B['chest']), up(head(B['chest']))),
        'feet': (B['root'], head(B['root']), up(head(B['root']))),
        'shoulderLeft': (B['arm_l'], head(B['arm_l']), up(head(B['arm_l']))),
        'shoulderRight': (B['arm_r'], head(B['arm_r']), up(head(B['arm_r']))),
        'footL': (B['shin_l'], tuple(bones[B['shin_l']].tail_local), up(tuple(bones[B['shin_l']].tail_local))),
        'footR': (B['shin_r'], tuple(bones[B['shin_r']].tail_local), up(tuple(bones[B['shin_r']].tail_local))),
    }
