"""캐릭터 명단 (2026-10-16) — 주인공·동료 13·스킨 10·몬스터 31 의 3D 설정과 칸별 자세.
지금 원화(SDXL 3D)의 색·의상·무기·실루엣을 보고 맞췄다 — 각자 특징(모자·무기·뿔·날개·외눈 …)은 살리고 그림체는 하나로.
자세 값은 lib/beaver.pose · lib/creature.pose 의 인자(도 · 캐릭터 단위)."""

FUR = dict(fur='#8f6243', light='#f2dcc2', dark='#6a4228')

# 2026-10-19 사용자: "주인공 캐릭터는 무기 제외하고는 포함되지 않게" — 왕관·띠·망토도 뺀 맨 비버(무기는 게임이 손 앵커에 그린다)
HERO = dict(FUR)

ALLIES = {
    'mia': dict(FUR, hat='cap', hat_color='#3a9a5a', hat_color2='#2a7a44', scarf='#2fb8a6', weapon_r='axe', weapon_l='dagger', role='melee'),
    'leon': dict(FUR, hat='cap', hat_color='#5aa83a', hat_color2='#3d7a2a', scarf='#7ec8e8', weapon_l='bow', role='bow'),   # 활은 적 쪽(화면 오른쪽) 손 — 머리에 가리지 않게 손을 낮게·바깥으로 뻗는다
    'sera': dict(FUR, hat='wizard', hat_color='#5a8ee0', robe='#b77ce0', trim='#f2c232', weapon_r='staff', weapon_color='#7fe3ff', role='mage'),
    'garen': dict(FUR, hat='helmet', hat_color='#d8dde6', hat_color2='#d8403a', armor='#cfd6df', trim='#d8403a', weapon_r='sword', weapon_l='shield', weapon_l_color='#d8403a', role='tank'),
    'ari': dict(FUR, hat='hood', hat_color='#d8403a', cape='#c8352e', weapon_r='lance', weapon_color='#f2c232', role='melee'),
    'nox': dict(FUR, hat='hood', hat_color='#9a4ec8', robe='#b05ad8', trim='#2fb8a6', weapon_r='sword', weapon_color='#e0e6ee', role='melee'),
    'luna': dict(FUR, light='#ffffff', hat='helmet', hat_color='#e8ecf2', hat_color2='#f2c232', armor='#eef2f6', trim='#2fb8a6', weapon_r='staff', weapon_color='#fff3a8', weapon_l='shield', weapon_l_color='#dfe6ee', role='healer'),
    'volt': dict(FUR, hat='hood', hat_color='#f08a3a', scarf='#2fb8a6', weapon_r='wand', weapon_color='#ffd34d', role='mage'),
    'bronn': dict(FUR, hat='helmet', hat_color='#f2c232', hat_color2='#2fb8a6', armor='#3fae9a', trim='#f2c232', weapon_r='sword', role='tank'),
    'orion': dict(FUR, hat='wizard', hat_color='#2f8ad8', cape='#3aa0e0', weapon_r='glass', weapon_color='#9fe8ff', role='mage'),
    'ember': dict(FUR, hat='tiara', hat_color='#ff6aa8', robe='#ff7ab0', trim='#ffd34d', weapon_r='guitar', weapon_color='#ffb3cf', role='bard'),
    'pyro': dict(FUR, hat='hood', hat_color='#f0662a', scarf='#ffd34d', weapon_r='sword', weapon_color='#ffb070', role='melee'),
    'marina': dict(FUR, hat='wizard', hat_color='#3ab0e0', robe='#5ac8f0', trim='#ffffff', weapon_r='staff', weapon_color='#a8f0ff', role='healer'),
}

# 스킨 — 같은 동료 몸·무기에 테마 색·재질만 바꾼다(용암·설원·화염·심연·월식·강철·신성·홍옥·자수정·황금)
SKINS = {
    'garen-magma': ('garen', dict(hat_color='#3a2a2a', hat_color2='#ff6a2a', armor='#4a2e2a', trim='#ff7a2a', weapon_l_color='#ff6a2a', weapon_color='#ffb070')),
    'leon-frost': ('leon', dict(hat_color='#e8f4ff', hat_color2='#7ec8e8', scarf='#bfe8ff')),
    'ari-blaze': ('ari', dict(hat_color='#f2a23a', cape='#e0841a', weapon_color='#fff0a0')),
    'nox-abyss': ('nox', dict(hat_color='#4a2a8a', robe='#5a3aa8', trim='#c084fc', weapon_color='#c084fc')),
    'luna-eclipse': ('luna', dict(hat_color='#4a4a8a', hat_color2='#e0e6ff', armor='#3a3a6a', trim='#e0e6ff', weapon_color='#c8c0ff', weapon_l_color='#3a3a6a')),
    'bronn-iron': ('bronn', dict(hat_color='#6a7480', hat_color2='#9aa4b0', armor='#4a525c', trim='#9aa4b0')),
    'orion-nova': ('orion', dict(hat_color='#f4fbff', cape='#7fe8ff', weapon_color='#ffffff')),
    'ember-ruby': ('ember', dict(hat_color='#d81a4a', robe='#c81a40', trim='#ffd34d', weapon_color='#ff4a6a')),
    'season-1': ('ari', dict(hat_color='#9a5ad8', cape='#7a3ac8', weapon_color='#d8b0ff')),
    'season-2': ('nox', dict(hat_color='#f2c232', robe='#d8a62a', trim='#3b2415', weapon_color='#fff0a0')),
}

# 동료 9칸 [대기0, 대기1, 걷기0, 걷기1, 예비, 휘두름, 타격, 따라가기, 피격] — 역할별 공격
_IDLE = [dict(aim_r=12, aim_l=12), dict(squash=0.972, head=3, aim_r=14, aim_l=14, tail=4),
         dict(leg_r=22, leg_l=-14, arm_r=-14, arm_l=16, aim_r=12, aim_l=12, dz=0.02, side=3, tail=-6),
         dict(leg_r=-14, leg_l=22, arm_r=16, arm_l=-14, aim_r=12, aim_l=12, dz=0.02, side=-3, tail=6)]
_HIT = dict(lean=-14, squash=1.04, head=-12, arm_r=-35, arm_r_out=25, arm_l=-35, arm_l_out=25, aim_r=-20, aim_l=-20, dy=-0.06, tail=14)
ATTACK = {
    # 머리 위로 들었다가 앞 아래로 내리치기
    'melee': [dict(lean=-8, squash=1.04, arm_r=-128, arm_r_out=22, aim_r=-55, arm_l=30, aim_l=40, head=-6, dy=-0.02, tail=10),
              dict(lean=4, arm_r=-40, arm_r_out=12, aim_r=10, arm_l=10, aim_l=20, head=2, dy=0.02),
              dict(lean=16, squash=0.93, arm_r=75, aim_r=100, arm_l=-25, aim_l=0, head=10, dy=0.06, tail=-12),   # 타격 — 무기가 앞으로(바닥 아래로 안 꽂히게)
              dict(lean=8, squash=0.98, arm_r=55, aim_r=112, arm_l=-10, aim_l=10, head=5, dy=0.04, tail=-6)],
    'tank': [dict(lean=-10, squash=1.05, arm_r=-135, arm_r_out=22, aim_r=-60, arm_l=50, aim_l=10, head=-6, dy=-0.03, tail=10),
             dict(lean=2, arm_r=-50, arm_r_out=12, aim_r=0, arm_l=40, aim_l=10, dy=0.01),
             dict(lean=18, squash=0.9, arm_r=80, aim_r=102, arm_l=55, aim_l=20, head=10, dy=0.07, tail=-14),
             dict(lean=9, squash=0.97, arm_r=60, aim_r=112, arm_l=45, aim_l=15, head=5, dy=0.04)],
    # 활: 적 쪽 손(왼손, 화면 오른쪽)을 머리 아래 높이로 바깥·앞으로 뻗어 활을 세우고, 오른손이 몸 앞을 가로질러 시위를 당겼다 놓는다
    'bow': [dict(yaw=0, lean=-4, arm_l=45, arm_l_out=35, aim_l=0, arm_r=30, arm_r_out=-25, head=2),
            dict(yaw=0, lean=-8, arm_l=55, arm_l_out=40, aim_l=-4, arm_r=10, arm_r_out=-10, head=1, squash=1.03, tail=6),
            dict(yaw=0, lean=6, arm_l=52, arm_l_out=40, aim_l=0, arm_r=45, arm_r_out=-35, head=5, dy=0.03, squash=0.95, tail=-8),
            dict(yaw=0, lean=3, arm_l=50, arm_l_out=36, aim_l=0, arm_r=35, arm_r_out=-28, head=2)],
    # 지팡이: 위로 치켜들었다가 앞으로 내밀며 시전
    'mage': [dict(lean=-8, squash=1.04, arm_r=-110, aim_r=-20, arm_l=40, head=-8, tail=8),
             dict(lean=-2, arm_r=-135, aim_r=20, arm_l=50, head=-10, squash=1.04),
             dict(lean=14, squash=0.95, arm_r=95, aim_r=95, arm_l=-30, head=8, dy=0.05),
             dict(lean=6, arm_r=70, aim_r=80, arm_l=-10, head=4, dy=0.03)],
    'healer': [dict(lean=-6, arm_r=-120, aim_r=0, arm_l=60, aim_l=10, head=-10, squash=1.03),
               dict(lean=-8, arm_r=-145, aim_r=25, arm_l=70, aim_l=10, head=-12, squash=1.04),
               dict(lean=12, squash=0.94, arm_r=60, aim_r=100, arm_l=50, aim_l=20, head=8, dy=0.04),
               dict(lean=5, arm_r=30, aim_r=60, arm_l=40, aim_l=15, head=3)],
    # 기타: 몸을 젖혔다가 크게 긁는다
    'bard': [dict(lean=-8, side=-6, arm_r=-30, arm_l=40, head=-10, squash=1.03),
             dict(lean=-4, side=-3, arm_r=-60, arm_l=45, head=-6),
             dict(lean=12, side=8, arm_r=50, arm_l=40, head=12, squash=0.94, dy=0.03),
             dict(lean=6, side=4, arm_r=30, arm_l=40, head=6)],
}
# 기타·활은 무기를 쥔 손이 다르다 — 기타는 몸 앞에 매고(오른손) 왼손으로 줄을 짚는다
def ally_poses(role):
    idle, hit = _IDLE, _HIT
    if role == 'bow':   # 활(왼손)은 조금 들고 바깥으로 — 아래 끝이 바닥 밑으로 안 내려가고 몸에 안 가린다
        idle = [dict(P, arm_l=P.get('arm_l', 0) + 30, arm_l_out=20) for P in _IDLE]
        hit = dict(_HIT, arm_l=10)
    return idle + ATTACK.get(role, ATTACK['melee']) + [hit]


# 주인공 — 대기 4 · 공격 4(북을 높이 들었다 내리친다). 무기는 게임이 손 앵커에 겹쳐 그린다
HERO_IDLE = [dict(aim_r=15, aim_l=10), dict(squash=0.975, head=2, aim_r=18, aim_l=12, tail=3), dict(dz=0.008, aim_r=15, aim_l=10), dict(squash=1.012, head=-1, aim_r=12, aim_l=10, tail=-3)]
HERO_ATTACK = [dict(lean=-6, squash=1.02, arm_r=-110, arm_r_out=20, aim_r=-20, arm_l=25, head=-4, tail=8),
               dict(lean=-10, squash=1.05, arm_r=-155, arm_r_out=25, aim_r=-45, arm_l=35, head=-7, tail=12),
               dict(lean=12, squash=0.94, arm_r=60, aim_r=95, arm_l=-15, head=8, dy=0.04, tail=-10),
               dict(lean=5, squash=0.98, arm_r=35, aim_r=60, arm_l=-5, head=3, dy=0.02, tail=-4)]

# 몬스터 — 원형 biped(이족) · quad(사족) · blob(슬라임) · spider. FLIP_MONSTERS 4종은 원화가 오른쪽을 보므로 오른쪽을 보게 렌더한다
B = 'biped'
MONSTERS = {
    'abyss-titan': dict(kind=B, fierce=True, arm_thick=1.55, color='#7a3fa0', belly='#f2b33d', accent='#ff9a3d', iris='#ffd34d', cyclops=True, eye_size=0.1, horns='curl', horn='#5a3a6a', crest=True, spots=8, head_r=(0.33, 0.29, 0.29), body_r=(0.3, 0.26, 0.3), head_z=0.74, shoulder=(0.27, 0.48), height=1.0),
    'ancient-treant': dict(kind=B, leaves=True, fierce=True, arm_thick=1.55, color='#6b7a3a', belly='#f2a93b', glow_belly=True, accent='#9ad04a', iris='#ffd34d', moss=True, horns='straight', horn='#6a4a2a', head_r=(0.29, 0.26, 0.28), body_r=(0.3, 0.26, 0.3), head_z=0.76, shoulder=(0.27, 0.48), spots=6),
    'armored-ogre': dict(kind=B, fierce=True, arm_thick=1.55, color='#8a4a9a', belly='#f2c94c', accent='#ff9a3d', iris='#7fe8ff', horns='curl', horn='#d8c8a8', armor=True, metal='#a0a8b8', crest=True, head_r=(0.34, 0.31, 0.31), body_r=(0.32, 0.27, 0.32), head_z=0.78, shoulder=(0.29, 0.5)),
    'bone-dragon': dict(kind=B, plates=True, wing_size=1.25, color='#e08a3a', belly='#f5d7a0', accent='#c03fe0', wing='#c03fe0', wings=True, snout=True, horns='straight', horn='#f1e4c8', tail=True, tail_tip=True, iris='#7fe8ff', spots=6),
    'dragon': dict(kind=B, plates=True, wing_size=1.25, color='#e0843a', belly='#f5d7a0', accent='#ffd34d', wing='#d8662a', wings=True, snout=True, horns='straight', tail=True, tail_tip=True, iris='#5be0ff'),
    'fire-demon': dict(kind=B, fierce=True, wing_size=1.25, color='#d0502a', belly='#ffb347', glow_belly=True, accent='#ffd34d', wing='#b8402a', wings=True, horns='curl', horn='#5a2a2a', iris='#5bffb0', crest=True, spots=8),
    'flame-wyvern-clean': dict(kind=B, plates=True, wing_size=1.25, color='#c8452a', belly='#ffd34d', accent='#ff8a3d', wing='#e0662a', wings=True, snout=True, horns='straight', tail=True, tail_tip=True, iris='#5be0ff', spots=6),
    'frost-wolf': dict(kind='quad', color='#e6dcf0', belly='#ffffff', dark='#7a6a9a', iris='#3cc8ff', eye_size=0.07, mane='#c8b8e8'),
    'goblin': dict(kind=B, color='#7d4a6c', belly='#f2c94c', accent='#ff8a3d', iris='#5be05a', eye_size=0.11, ears='bat', wings=True, wing='#5b7a3a', crest=True, spots=10, head_r=(0.33, 0.29, 0.3), body_r=(0.2, 0.18, 0.22), head_z=0.66, shoulder=(0.17, 0.36), tail=True),
    'goblin-shaman': dict(kind=B, leaves=True, color='#b04a3a', belly='#ffb347', glow_belly=True, accent='#3cc8b0', iris='#3cc8b0', ears='bat', crest=True, head_r=(0.32, 0.28, 0.29), body_r=(0.21, 0.19, 0.23), head_z=0.67, shoulder=(0.18, 0.37), weapon='staff', weapon_color='#3cc8b0', spots=6),
    'goblin-warlord': dict(kind=B, fierce=True, color='#8a4a3a', belly='#f2c94c', accent='#9ad04a', iris='#9ad04a', horns='curl', crest=True, head_r=(0.31, 0.28, 0.29), body_r=(0.23, 0.2, 0.25), head_z=0.7, shoulder=(0.2, 0.4), weapon='axe', weapon_color='#cfd6df', spots=6),
    'golden-lion-clean': dict(kind='quad', color='#e0a43a', belly='#f5d7a0', dark='#8a5a2a', iris='#5bd0ff', mane='#b0702a', ears='wolf'),
    'hellhound': dict(kind='quad', color='#a03a3a', belly='#f2a23a', dark='#4a2020', iris='#ffd34d', horns=True, flames=True, ears='wolf'),
    'lava-drake': dict(kind=B, plates=True, wing_size=1.25, color='#b8402a', belly='#ffb347', accent='#ff8a3d', wing='#e0662a', wings=True, snout=True, horns='straight', tail=True, tail_tip=True, iris='#5be0ff', spots=6, head_r=(0.28, 0.26, 0.26)),
    'magma-golem': dict(kind=B, fierce=True, arm_thick=1.55, color='#8a3030', belly='#ffcc33', glow_belly=True, accent='#ff8a3d', glow=True, iris='#5bffb0', eye_size=0.07, head_r=(0.26, 0.24, 0.23), body_r=(0.36, 0.29, 0.34), head_z=0.84, shoulder=(0.33, 0.56), spots=10),
    'magma-imp': dict(kind=B, color='#c0402a', belly='#ffcc33', accent='#ffd34d', iris='#5be0ff', horns='curl', horn='#6a3a2a', head_r=(0.32, 0.28, 0.29), body_r=(0.21, 0.19, 0.23), head_z=0.67, shoulder=(0.18, 0.37), spots=8, tail=True),
    'minotaur': dict(kind=B, fierce=True, arm_thick=1.55, color='#8a4a30', belly='#f2b33d', accent='#ff8a3d', iris='#ffd34d', horns='curl', horn='#f1e4c8', snout=True, head_r=(0.33, 0.31, 0.31), body_r=(0.3, 0.26, 0.31), head_z=0.76, shoulder=(0.27, 0.48), spots=6),
    'moon-wolf-king-clean': dict(kind='quad', color='#e8d8f0', belly='#ffffff', dark='#8a6ab0', iris='#c084fc', mane='#f4ecff', horns=True, ears='wolf', crown=True),
    'moss-golem-clean': dict(kind=B, leaves=True, fierce=True, arm_thick=1.55, color='#6aa83a', belly='#b9ab8f', dark='#4a5a2a', iris='#ff6a3a', horns='straight', horn='#5a3a2a', moss=True, head_r=(0.27, 0.24, 0.23), body_r=(0.34, 0.28, 0.33), head_z=0.84, shoulder=(0.31, 0.55)),
    'ogre': dict(kind=B, leaves=True, fierce=True, arm_thick=1.55, color='#8a4a4a', belly='#f2c94c', accent='#9ad04a', iris='#5be0ff', moss=True, horns='straight', tusks=True, head_r=(0.34, 0.31, 0.31), body_r=(0.34, 0.28, 0.33), head_z=0.8, shoulder=(0.31, 0.53)),
    'ruin-sentinel': dict(kind=B, fierce=True, arm_thick=1.55, color='#7a3a4a', belly='#ff9a3d', accent='#ff8a3d', iris='#5be0ff', eye_size=0.1, armor=True, metal='#8a6a7a', crest=True, horns='straight', head_r=(0.28, 0.26, 0.26), body_r=(0.3, 0.26, 0.3), head_z=0.76, shoulder=(0.28, 0.5)),
    'shadow-wolf-clean': dict(kind='quad', color='#e8b84a', belly='#f5e0a0', dark='#5a3a2a', iris='#ff4a3a', mane='#5a3a2a', ears='wolf'),
    'skeleton-goblin': dict(kind=B, color='#b0503a', belly='#ffd34d', accent='#ff9a3d', iris='#5be05a', horns='curl', wings=True, wing='#5a2a3a', head_r=(0.3, 0.27, 0.28), body_r=(0.2, 0.18, 0.22), head_z=0.67, shoulder=(0.17, 0.37), weapon='spear', weapon_color='#cfd6df'),
    'slime': dict(kind=B, color='#7cc84a', belly='#f2d36b', dark='#3f6a2a', accent='#e8452c', iris='#ff7a2a', eye_size=0.085, horns='straight', horn='#7a4a2a', wings=True, wing='#d8552c', wing_size=0.7, spots=16, tail=True, head_r=(0.34, 0.3, 0.31), body_r=(0.25, 0.22, 0.25), head_z=0.66, shoulder=(0.21, 0.38)),   # 원화(초록 꼬마 용)대로 — 젤리 모양은 2026-10-16 되돌림
    'spider-queen': dict(kind='spider', color='#9a3ab0', belly='#ffd34d', accent='#ffd34d', dark='#5a2a6a', horn='#f1e4c8', iris='#ffd34d', crown=True),
    'stone-troll': dict(kind=B, leaves=True, maw_open=True, fierce=True, arm_thick=1.55, color='#5a9a3a', belly='#c8a86a', accent='#9ad04a', iris='#ffd34d', moss=True, horns='straight', horn='#5a4a3a', tusks=True, head_r=(0.35, 0.31, 0.31), body_r=(0.32, 0.27, 0.32), head_z=0.78, shoulder=(0.29, 0.51)),
    'storm-drake': dict(kind=B, plates=True, wing_size=1.25, color='#d8d0e8', belly='#f5f0ff', accent='#7fe8ff', wing='#f4f0ff', wings=True, snout=True, horns='straight', horn='#4a3a5a', tail=True, iris='#3cc8ff'),
    'thorn-boar-king': dict(kind=B, fierce=True, color='#8a3a2a', belly='#f2b33d', accent='#9ad04a', iris='#ffd34d', horns='curl', tusks=True, snout=True, crest=True, wings=True, wing='#e0662a', head_r=(0.31, 0.28, 0.28), body_r=(0.28, 0.24, 0.29), head_z=0.74, shoulder=(0.25, 0.46)),
    'void-imp': dict(kind=B, color='#6a3a9a', belly='#ffd34d', accent='#c084fc', iris='#5be0ff', eye_size=0.1, horns='curl', wings=True, wing='#4a2a7a', head_r=(0.33, 0.29, 0.3), body_r=(0.21, 0.19, 0.23), head_z=0.67, shoulder=(0.18, 0.37)),
    'void-lich': dict(kind=B, fierce=True, color='#6a3a8a', belly='#c084fc', glow_belly=True, accent='#c084fc', iris='#ff6aff', horns='curl', horn='#3a2a4a', wings=True, wing='#4a2a6a', crest=True, weapon='staff', weapon_color='#c084fc', head_r=(0.28, 0.26, 0.27), body_r=(0.24, 0.21, 0.26), head_z=0.72, shoulder=(0.21, 0.42)),
    'wolf-king-clean': dict(kind=B, fierce=True, color='#7a3a5a', belly='#ffd34d', accent='#ff9a3d', iris='#5bffb0', ears='wolf', mane='#5a2a3a', crown=True, head_r=(0.3, 0.27, 0.28), body_r=(0.26, 0.22, 0.27), head_z=0.72, shoulder=(0.22, 0.44)),
}
FLIP_MONSTERS = {'fire-demon', 'thorn-boar-king', 'flame-wyvern-clean', 'lava-drake'}

# 몬스터 5칸 [대기0, 대기1(숨), 예비, 덤빔, 피격] — 원형별
MON_POSES = {
    # 이족: 예비 — 한 팔을 머리 위 뒤로 크게 들고 몸을 젖힘 · 덤빔 — 그 팔을 앞으로 크게 휘두르며 앞으로 나감(숙임은 10° 이하, 입 크게)
    'biped': [dict(), dict(squash=0.97, jaw=4, head=2, wing=8),
              dict(lean=-10, squash=1.05, arm_r=-160, arm_r_out=20, arm_l=-40, arm_l_out=15, jaw=12, head=-10, dy=-0.04, wing=30, tail=14),
              dict(lean=9, squash=0.94, arm_r=105, arm_r_out=-5, arm_l=40, jaw=34, head=6, dy=0.14, wing=-20, tail=-16),
              dict(lean=-14, squash=1.04, head=-14, jaw=18, arm_r=-35, arm_r_out=20, arm_l=-35, arm_l_out=20, dy=-0.06, wing=22, tail=10)],
    'quad': [dict(), dict(squash=0.97, jaw=3, head=3),
             dict(lean=-8, squash=1.04, head=-14, jaw=8, arm_r=-25, arm_l=-25, dy=-0.04, tail=14, wing=25),
             dict(lean=10, squash=0.93, head=16, jaw=34, arm_r=40, arm_l=40, leg_r=-20, leg_l=-20, dy=0.09, tail=-12, wing=-15),
             dict(lean=-10, squash=1.03, head=-18, jaw=14, arm_r=-20, arm_l=-20, dy=-0.05, tail=10)],
    'blob': [dict(), dict(squash=0.95), dict(squash=0.78, dy=-0.03), dict(squash=1.18, lean=12, jaw=1, dy=0.09, dz=0.04), dict(squash=0.9, lean=-12, dy=-0.05)],
    'spider': [dict(), dict(squash=0.97, slegs=3), dict(lean=-10, arm_r=-60, arm_l=-60, jaw=10, slegs=-6, dy=-0.03), dict(lean=12, arm_r=70, arm_l=70, jaw=25, slegs=8, dy=0.08), dict(lean=-12, slegs=-8, dy=-0.05, jaw=15)],
}
