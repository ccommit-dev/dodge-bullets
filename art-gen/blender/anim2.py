"""애니메이션 2판 — 동작마다 6~8칸 (2026-10-19, 사용자: "모든 캐릭터, 동료의 애니메이션이 아직도 어색하네 다시 만들어서 적용").

1판(roster.ally_poses · HERO_* · MON_POSES)은 동작마다 1~4칸이라 대기·걷기가 두 칸을 번갈아 '툭툭' 바뀌었고, 공격은 예비 → 타격으로
바로 건너뛰었다(휘두름 칸은 게임에서 아예 안 보였다). 큰 머리를 통째로 16° 숙여 치는 칸은 '넘어지는' 것처럼 읽혔다.
2판 원칙
  · 칸 간격으로 속도를 낸다 — 예비 동작은 촘촘히(천천히), 휘두름은 크게 건너뛰고(빠르게), 임팩트에서 한 칸 멈추고, 복귀는 감속.
  · 숙임(lean)은 10° 이하. 대신 전신 눌림·늘림(sq_all, 머리까지 같이 — 만화식)과 몸통 이동(dy·dz)으로 힘을 보인다.
  · 대기·걷기는 사인 곡선으로 이어지는 고리 — 마지막 칸 다음이 첫 칸으로 매끈하게 이어진다.
  · 모든 칸이 같은 키 묶음(FULL_*)을 갖는다 — 키가 빠지면 beaver.pose 의 손목 방식이 바뀌어 칸 사이가 튄다.
칸 수·줄·재생 시간은 art-gen/anim-layout.json 이 정한다(게임·조립과 공유)."""
import json
import math
import os

LAYOUT = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'anim-layout.json'), encoding='utf-8'))

FULL_BEAVER = dict(lean=0.0, side=0.0, squash=1.0, sq_all=1.0, head=0.0, head_turn=0.0, arm_r=0.0, arm_l=0.0, arm_r_out=0.0, arm_l_out=0.0,
                   aim_r=12.0, aim_l=12.0, twist_r=0.0, twist_l=0.0, leg_r=0.0, leg_l=0.0, tail=0.0, dx=0.0, dz=0.0, dy=0.0, yaw=0.0)
FULL_MONSTER = dict(lean=0.0, squash=1.0, sq_all=1.0, head=0.0, jaw=0.0, arm_r=0.0, arm_l=0.0, arm_r_out=0.0, arm_l_out=0.0, wing=0.0,
                    leg_r=0.0, leg_l=0.0, tail=0.0, slegs=0.0, dx=0.0, dz=0.0, dy=0.0, yaw=0.0)


def full(P, base, defaults):
    out = dict(defaults)
    out.update(base)
    out.update(P)
    return out


def lerp(a, b, w):
    return {k: a[k] + (b[k] - a[k]) * w for k in a}


TAU = 2 * math.pi
# 탄력 배율 (2026-10-23, 참고: BEAVER RAMPAGE) — 로우 폴리 달걀 비버는 몸 전체가 말랑하게 출렁여야 산다.
# 대기 숨쉬기 · 걷기 뒤뚱 · 공격 눌림/늘림을 키운다. BEAVER_STYLE 이 lowpoly 가 아니면 예전 값(1)
LP = os.environ.get('BEAVER_STYLE', 'lowpoly') == 'lowpoly'


# ── 비버(동료·스킨·주인공) ──
# 주 무기 손 (2026-10-19 자세 실험) — 3/4 카메라에서 오른손은 카메라 쪽(화면 왼쪽), 왼손은 적 쪽(화면 오른쪽 · 몸 뒤)이다.
# 오른손 무기를 앞으로 휘두르면 큰 머리 앞을 가로지르거나 머리 뒤에 묻혔다(1판 휘두름 칸에서 무기가 사라진 이유).
# 근접·탱커·마법·힐러는 주 무기를 왼손(적 쪽)에 쥐어, 예비 동작은 어깨 위 바깥으로(arm_l_out 60↑ — 머리에 안 가린다), 타격은 화면 오른쪽(적)으로 뻗는다.
# 보조(단검·방패)는 오른손(카메라 쪽)으로 옮겨 몸 앞에 든다. 활은 원래 왼손, 기타는 몸 앞이라 그대로.
MAIN_LEFT_ROLES = {'melee', 'tank', 'mage', 'healer'}


def swap_hands(cfg):
    if cfg.get('role', 'melee') not in MAIN_LEFT_ROLES or not cfg.get('weapon_r'):
        return cfg
    out = dict(cfg)
    out['weapon_l'] = cfg['weapon_r']
    out['weapon_l_color'] = cfg.get('weapon_color', '#cfd6df')
    out.pop('weapon_r', None)
    out.pop('weapon_color', None)
    if cfg.get('weapon_l'):
        out['weapon_r'] = cfg['weapon_l']
        out['weapon_color'] = cfg.get('weapon_l_color', cfg.get('weapon_color', '#cfd6df'))
    return out


def beaver_base(role, hero=False):
    """역할별 쉬는 자세 — 주 무기(왼손)가 머리 오른쪽 바깥으로 보이게 든다"""
    if role == 'bow':   # 활(왼손)은 조금 들고 바깥으로 — 몸에 안 가리고 아래 끝이 바닥 밑으로 안 내려간다
        return dict(arm_l=30.0, arm_l_out=20.0, aim_l=12.0, twist_l=55.0)
    if hero or role == 'melee':
        return dict(arm_l=25.0, arm_l_out=28.0, aim_l=45.0, arm_r=4.0, aim_r=12.0)
    if role == 'tank':   # 방패(오른손)는 몸 앞에 든다
        return dict(arm_l=25.0, arm_l_out=28.0, aim_l=45.0, arm_r=30.0, aim_r=10.0)
    if role in ('mage', 'healer'):
        return dict(arm_l=20.0, arm_l_out=25.0, aim_l=15.0, arm_r=4.0 if role == 'mage' else 20.0, aim_r=12.0)
    return {}


def beaver_idle(base, n):
    """숨쉬기 고리 — 몸 눌림 · 머리 끄덕 · 꼬리 · 팔이 한 사인으로 이어진다(칸 사이가 1~3° 씩만 바뀐다)"""
    out = []
    for i in range(n):
        t = i / n
        s, c = math.sin(TAU * t), math.cos(TAU * t)
        breath = (1 - c) / 2   # 0 → 1 → 0
        if LP:   # 숨이 눈에 보이게 — 몸 눌림 5% · 전신 늘림 2% · 머리 끄덕 5° · 좌우 흔들 3° · 꼬리 노 젓기 · 팔 까딱
            P = dict(squash=1 - 0.05 * breath, sq_all=1 + 0.02 * s, head=5.0 * breath - 1.0, tail=14 * s, side=3.0 * math.sin(TAU * t + 1.2),
                     arm_r=base.get('arm_r', 0) + 7 * s, arm_l=base.get('arm_l', 0) - 7 * s,
                     aim_r=base.get('aim_r', 12) + 5 * s, aim_l=base.get('aim_l', 12) - 5 * s)
        else:
            P = dict(squash=1 - 0.024 * breath, sq_all=1 + 0.006 * s, head=2.6 * breath, tail=7 * s, side=1.4 * math.sin(TAU * t + 1.2),
                     arm_r=base.get('arm_r', 0) + 3.5 * s, arm_l=base.get('arm_l', 0) - 3.5 * s,
                     aim_r=base.get('aim_r', 12) + 2.5 * s, aim_l=base.get('aim_l', 12) - 2.5 * s)
        out.append(full(P, base, FULL_BEAVER))
    return out


def beaver_walk(base, n, bow=False):
    """통통 걷기 고리 — 다리 ±28° · 반대 팔 ±18° · 내딛을 때 눌리고 지날 때 떠오름 · 뒤뚱(side) · 앞으로 살짝 숙임"""
    out = []
    for i in range(n):
        t = (i + 0.5) / n   # 반 칸 밀어 양쪽 끝 자세(내딛기)를 한 번씩 정확히 지난다
        s, c = math.sin(TAU * t), math.cos(TAU * t)
        k = 1.35 if LP else 1.0   # 로우 폴리: 짧은 다리로 통통 — 뒤뚱 · 들썩임을 크게
        P = dict(leg_r=30 * s, leg_l=-30 * s,
                 arm_r=base.get('arm_r', 0) - 18 * k * s, arm_l=base.get('arm_l', 0) + (6 if bow else 18 * k) * s,
                 dz=0.021 * k * c * c, squash=1.018 - 0.058 * k * s * s, side=4.5 * (1.6 if LP else 1.0) * s, lean=5.0,
                 head=2 - 2.2 * math.cos(2 * TAU * t), tail=10 * math.sin(TAU * t + math.pi / 2),
                 aim_r=base.get('aim_r', 12) + 6 * s, aim_l=base.get('aim_l', 12) - 6 * s)
        out.append(full(P, base, FULL_BEAVER))
    return out


# 공격 8칸 — 역할별. 칸: 0 예비 시작 · 1 들어 올림 · 2 웅크림(멈칫) · 3 휘두름(크게 건너뜀) · 4 임팩트 · 5 임팩트 유지 · 6 복귀 · 7 정착
ATTACK8 = {
    # 근접(왼손 주 무기): 어깨 위 바깥으로 들어 올려 웅크렸다가 → 적 쪽(화면 오른쪽) 아래로 크게 내려친다. 오른손(보조)은 반대로 당긴다
    'melee': [
        dict(sq_all=0.97, arm_l=-30, arm_l_out=40, aim_l=10, arm_r=14, lean=-3, head=-2, tail=6),
        dict(sq_all=1.05, arm_l=-95, arm_l_out=66, aim_l=-18, arm_r=24, lean=-6, head=-5, dy=-0.02, tail=12, yaw=2),
        dict(sq_all=0.94, arm_l=-105, arm_l_out=70, aim_l=-28, arm_r=26, lean=-7, head=-6, dy=-0.025, tail=14, yaw=3),
        dict(sq_all=1.06, arm_l=10, arm_l_out=48, aim_l=50, arm_r=-6, lean=4, head=3, dy=0.035, tail=-2, yaw=7),
        dict(sq_all=0.9, squash=0.97, arm_l=75, arm_l_out=22, aim_l=104, arm_r=-18, lean=8, head=6, dy=0.055, tail=-12, yaw=10),
        dict(sq_all=0.93, squash=0.98, arm_l=82, arm_l_out=20, aim_l=110, arm_r=-16, lean=9, head=7, dy=0.06, tail=-14, yaw=10),
        dict(sq_all=1.01, arm_l=45, arm_l_out=24, aim_l=70, arm_r=0, lean=3, head=3, dy=0.025, tail=-4, yaw=5),
        dict(sq_all=1.0, arm_l=28, arm_l_out=27, aim_l=48, arm_r=4, lean=1, head=1, dy=0.006, tail=2, yaw=1),
    ],
    # 탱커: 칼(왼손)은 근접과 같은 궤적, 방패(오른손)는 몸 앞에서 함께 밀고 나간다
    'tank': [
        dict(sq_all=0.97, arm_l=-30, arm_l_out=40, aim_l=10, arm_r=34, aim_r=10, lean=-3, head=-2, tail=6),
        dict(sq_all=1.05, arm_l=-95, arm_l_out=66, aim_l=-18, arm_r=45, aim_r=10, lean=-6, head=-5, dy=-0.02, tail=12, yaw=2),
        dict(sq_all=0.93, arm_l=-105, arm_l_out=70, aim_l=-28, arm_r=50, aim_r=12, lean=-7, head=-6, dy=-0.025, tail=14, yaw=3),
        dict(sq_all=1.06, arm_l=10, arm_l_out=48, aim_l=50, arm_r=60, aim_r=14, lean=5, head=3, dy=0.04, tail=-2, yaw=7),
        dict(sq_all=0.89, squash=0.97, arm_l=75, arm_l_out=22, aim_l=104, arm_r=62, aim_r=16, lean=8, head=6, dy=0.055, tail=-12, yaw=10),
        dict(sq_all=0.92, squash=0.98, arm_l=82, arm_l_out=20, aim_l=110, arm_r=60, aim_r=16, lean=9, head=7, dy=0.06, tail=-14, yaw=10),
        dict(sq_all=1.01, arm_l=45, arm_l_out=24, aim_l=70, arm_r=40, aim_r=12, lean=3, head=3, dy=0.025, tail=-4, yaw=5),
        dict(sq_all=1.0, arm_l=28, arm_l_out=27, aim_l=48, arm_r=32, aim_r=10, lean=1, head=1, dy=0.006, tail=2, yaw=1),
    ],
    # 활: 활(왼손)은 몸 오른쪽에 세워 D 모양이 보이게(손목 비틀기 55° — 0° 는 옆선만 보였다) 거의 그대로 두고,
    # 오른손(카메라 쪽)이 시위를 당겼다(몸 뒤로 젖힘·늘림) 놓는다(앞으로 튕기며 눌림). 몸 틀기(yaw)는 0 — 활이 머리에 가린다
    'bow': [
        dict(arm_l=34, arm_l_out=24, aim_l=10, twist_l=55, arm_r=18, arm_r_out=-12, lean=-1, head=0),
        dict(arm_l=38, arm_l_out=27, aim_l=8, twist_l=55, arm_r=24, arm_r_out=-24, lean=-3, head=1, tail=3),
        dict(sq_all=1.02, squash=1.02, arm_l=40, arm_l_out=28, aim_l=6, twist_l=55, arm_r=-8, arm_r_out=-14, lean=-7, head=1, tail=6),
        dict(sq_all=1.03, squash=1.03, arm_l=40, arm_l_out=28, aim_l=6, twist_l=55, arm_r=-14, arm_r_out=-10, lean=-8, head=1, tail=8),
        dict(sq_all=0.95, squash=0.96, arm_l=38, arm_l_out=27, aim_l=8, twist_l=55, arm_r=46, arm_r_out=-36, lean=5, head=4, dy=0.02, tail=-8),
        dict(sq_all=0.98, arm_l=37, arm_l_out=26, aim_l=9, twist_l=55, arm_r=52, arm_r_out=-38, lean=6, head=5, dy=0.022, tail=-10),
        dict(arm_l=34, arm_l_out=23, aim_l=11, twist_l=55, arm_r=26, arm_r_out=-18, lean=2, head=2, dy=0.01, tail=-2),
        dict(arm_l=31, arm_l_out=21, aim_l=12, twist_l=55, arm_r=6, arm_r_out=-4, lean=0, tail=2),
    ],
    # 지팡이·완드·유리구(왼손): 어깨 위 바깥으로 높이 들어 모았다가 → 적 쪽으로 곧게 내밀며 쏜다
    'mage': [
        dict(sq_all=0.98, arm_l=-20, arm_l_out=40, aim_l=0, lean=-2, head=-2, tail=4),
        dict(sq_all=1.03, squash=1.015, arm_l=-72, arm_l_out=62, aim_l=-5, lean=-6, head=-8, tail=8),
        dict(sq_all=1.035, squash=1.02, arm_l=-82, arm_l_out=66, aim_l=5, lean=-7, head=-9, tail=10),
        dict(sq_all=0.97, arm_l=30, arm_l_out=40, aim_l=60, lean=6, head=4, dy=0.03, tail=0, yaw=5),
        dict(sq_all=0.92, squash=0.97, arm_l=84, arm_l_out=18, aim_l=98, lean=9, head=7, dy=0.045, tail=-10, yaw=8),
        dict(sq_all=0.95, arm_l=88, arm_l_out=16, aim_l=100, lean=9, head=7, dy=0.045, tail=-10, yaw=8),
        dict(sq_all=1.01, arm_l=50, arm_l_out=22, aim_l=55, lean=3, head=3, dy=0.02, tail=-3, yaw=4),
        dict(sq_all=1.0, arm_l=26, arm_l_out=25, aim_l=22, lean=1, head=1, dy=0.005, tail=2, yaw=1),
    ],
    # 힐러: 지팡이를 높이 들어 축복(발끝으로 서서 멈춤) → 적 쪽으로 내려 퍼뜨린다
    'healer': [
        dict(sq_all=0.98, arm_l=-30, arm_l_out=40, aim_l=0, lean=-2, head=-3),
        dict(sq_all=1.05, squash=1.02, arm_l=-100, arm_l_out=60, aim_l=5, lean=-5, head=-10, tail=6),
        dict(sq_all=1.05, squash=1.02, arm_l=-108, arm_l_out=62, aim_l=10, lean=-7, head=-12, dz=0.012, tail=8),
        dict(sq_all=1.05, squash=1.02, arm_l=-110, arm_l_out=63, aim_l=12, lean=-7, head=-12, dz=0.014, tail=9),
        dict(sq_all=0.95, arm_l=0, arm_l_out=40, aim_l=55, lean=4, head=3, tail=-4, yaw=5),
        dict(sq_all=0.93, squash=0.97, arm_l=66, arm_l_out=20, aim_l=98, lean=7, head=6, dy=0.03, tail=-8, yaw=8),
        dict(sq_all=1.0, arm_l=40, arm_l_out=24, aim_l=50, lean=3, head=2, dy=0.012, tail=-2, yaw=4),
        dict(sq_all=1.0, arm_l=22, arm_l_out=25, aim_l=18, lean=0, head=0, tail=1, yaw=1),
    ],
    # 기타(오른손, 몸 앞): 목을 치켜들고 젖혔다가(파워 코드) → 앞으로 내리꽂듯 긁는다(눌림·앞으로) — 긁는 손만 움직이던 1판은 안 읽혔다
    'bard': [
        dict(arm_r=-12, aim_r=4, side=-3, lean=-3, head=-4, sq_all=1.0),
        dict(arm_r=-40, aim_r=-10, side=-6, lean=-8, head=-10, sq_all=1.04, tail=6),
        dict(arm_r=-66, aim_r=-28, side=-8, lean=-10, head=-12, sq_all=1.05, tail=9, dz=0.01),
        dict(arm_r=-10, aim_r=30, side=0, lean=2, head=0, sq_all=1.02, tail=2),
        dict(arm_r=50, aim_r=70, side=5, lean=8, head=10, sq_all=0.92, dy=0.03, tail=-8, yaw=4),
        dict(arm_r=34, aim_r=96, side=6, lean=9, head=10, sq_all=0.92, dy=0.032, tail=-10, yaw=4),
        dict(arm_r=14, aim_r=40, side=2, lean=3, head=4, sq_all=1.0, dy=0.012, tail=-2, yaw=2),
        dict(arm_r=0, aim_r=12, side=0, lean=0, head=0, tail=2),
    ]
}
# 기타는 몸 앞에 매고 오른손으로 긁는다 — 쉬는 자세의 왼손은 줄을 짚는 자리
BARD_BASE = dict(arm_l=38.0)

HIT4 = [
    dict(lean=-12, sq_all=1.05, head=-12, arm_r=-35, arm_r_out=25, arm_l=-35, arm_l_out=25, aim_r=-10, aim_l=-10, dy=-0.05, tail=14, yaw=-4),
    dict(lean=-9, sq_all=0.94, head=-8, arm_r=-20, arm_r_out=18, arm_l=-20, arm_l_out=18, aim_r=-2, aim_l=-2, dy=-0.06, tail=10, yaw=-3),
    dict(lean=-3, sq_all=1.02, head=-2, arm_r=-6, arm_r_out=6, arm_l=-6, arm_l_out=6, aim_r=8, aim_l=8, dy=-0.025, tail=4, yaw=-1),
    dict(lean=-0.5, sq_all=1.0, head=0, arm_r=0, arm_l=0, aim_r=12, aim_l=12, dy=-0.004, tail=1),
]
HIT_TINT = [1.0, 0.55, 0.0, 0.0]


# 긴 무기는 임팩트에서 더 아래로 겨눈다 — 앞으로 길게 뻗으면 칸 오른쪽을 넘어 비버 전원의 배율이 줄었다(가렌 칼: 0.424 → 0.394)
LONG_AIM = {'sword': 8, 'lance': 10, 'spear': 10, 'trident': 10}   # 더 낮추면 칼끝이 땅에 꽂힌다(+10~20px) — 칼 길이(WEAPON_SCALE)와 같이 맞춘 값
LONG_W = {3: 0.5, 4: 1.0, 5: 1.0, 6: 0.6}


def beaver_actions(role, hero=False, weapon=None):
    """{동작: [자세 …]} — 칸 수는 anim-layout.json. weapon: 주 무기(왼손) 종류 — 긴 무기면 임팩트 겨냥을 낮춘다"""
    L = LAYOUT['hero']['sheets'] if hero else LAYOUT['ally']['actions']
    base = beaver_base(role, hero)
    if role == 'bard' and not hero:
        base = dict(base, **BARD_BASE)
    out = {
        'idle': beaver_idle(base, L['idle']['frames']),
        'walk': beaver_walk(base, L['walk']['frames'], bow=role == 'bow'),
        'attack': [full(P, base, FULL_BEAVER) for P in ATTACK8['melee' if hero or role not in ATTACK8 else role]],
    }
    if LP:   # 공격 눌림 · 늘림을 1.6배 — 웅크렸다 튀어 나가는 만화 탄력(머리까지 같이 → 달걀 몸이 출렁)
        for P in out['attack']:
            P['sq_all'] = 1 + (P['sq_all'] - 1) * 1.6
            P['squash'] = 1 + (P['squash'] - 1) * 1.6
    if hero:   # 주인공 무기는 게임이 손 앵커에 덧그린다 — 예비 0~2칸은 먼 손이 머리 뒤라 무기를 몸 뒤에 그리게 표시(wb)
        for i in (0, 1, 2):
            out['attack'][i]['wb'] = 1
        for i in (3, 4, 5, 6, 7):   # 휘두름~정착: 손을 바깥으로 — 덧그린 북이 주둥이를 덮지 않고 얼굴 오른쪽에 온다
            out['attack'][i]['arm_l_out'] = max(out['attack'][i]['arm_l_out'], 50)
    extra =LONG_AIM.get(weapon, 0) if role in ('melee', 'tank') and not hero else 0
    if extra:
        for i, w in LONG_W.items():
            out['attack'][i]['aim_l'] += extra * w
    if not hero:
        hb = dict(base)
        if role == 'bow':
            hb = dict(hb, arm_l=10.0)
        hit = []
        for P in HIT4:
            Q = dict(P)
            if role == 'bow':   # 활 든 손은 맞아도 들고 있다 — 아래로 꽂히지 않게
                Q.update(arm_l=10, arm_l_out=20)
            hit.append(full(Q, hb, FULL_BEAVER))
        out['hit'] = hit
    for name, poses in out.items():
        want = (L[name]['frames'])
        assert len(poses) == want, (name, len(poses), want)
    return out


def tint_of(action, i):
    return HIT_TINT[i] if action == 'hit' else 0.0


# ── 몬스터 ── 1판 극점 5자세(대기0 · 대기1 · 예비 · 덤빔 · 피격)를 칸 사이에 이어 붙인다
MON_YAW = [0, 0, 6, 20, -8]


def monster_actions(kind, mon_poses):
    L = LAYOUT['monster']['actions']
    ext = [full(dict(P, yaw=P.get('yaw', MON_YAW[i])), {}, FULL_MONSTER) for i, P in enumerate(mon_poses[kind])]
    idle0, idle1, prep, atk, hit = ext
    n = L['idle']['frames']
    idle = [lerp(idle0, idle1, (1 - math.cos(TAU * i / n)) / 2) for i in range(n)]
    for i, P in enumerate(idle):   # 꼬리·날개는 숨과 반 박자 어긋나게
        P['tail'] += 6 * math.sin(TAU * i / n)
        P['wing'] += 6 * math.sin(TAU * i / n + 1.0)
    prepare = [dict(lerp(idle0, prep, 0.55), sq_all=0.97), dict(prep, sq_all=0.92)]
    over = dict(atk)
    over.update(jaw=atk['jaw'] + 4, lean=atk['lean'] + 2, dy=atk['dy'] + 0.02)
    attack = [dict(lerp(prep, atk, 0.55), sq_all=1.07), dict(atk, sq_all=0.92), dict(over, sq_all=0.95), dict(lerp(atk, idle0, 0.5), sq_all=1.0)]
    hitf = [dict(hit, sq_all=1.04), dict(lerp(hit, idle0, 0.55), sq_all=0.98)]
    out = {'idle': idle, 'prepare': prepare, 'attack': attack, 'hit': hitf}
    for name, poses in out.items():
        assert len(poses) == L[name]['frames'], (name, len(poses))
    return out
