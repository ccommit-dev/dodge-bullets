"""몬스터 · 대장 그림결 2판 (2026-11-17, 사용자: "몬스터랑 보스몬스터도 리소스 수정" → 30종 모두 · 더 괴물답게 · 대장 크기도
→ 같은 날 참고 모델 둘(고블린 · 원숭이 괴물 GLB) "이거 참고해서 몬스터, 보스 다시").

roster.MONSTERS 의 전투 몬스터 줄 위에 덮어쓴다. mstyle=True 가 lib/monster_style.py 를 켠다
(매끈한 조각 면 · 흰자와 무거운 눈꺼풀 · 코 · 찡그린/벌린 입 · 손발 끝이 짙은 칠).
이름과 모습을 맞춘다: 해골 고블린 = 해골 머리 · 갈비뼈, 폐허의 파수 기사 = 투구 · 견갑 · 방패, 해골 용 = 뼈 용,
고목 수호자 = 껍질 골 · 가지 뿔, 미노타우로스 = 소 머리 · 도끼, 공허의 리치 = 두건 · 해골 · 낫 …
대장(boss_look)은 홍채가 빛나고 장식이 크다. 펫(pet-*) · 탈것(mount-*)은 여기 없다 — 예전 귀여운 그림결 그대로.
참고 원숭이 괴물은 실제 게임 캐릭터를 본뜬 팬 모델이라 디자인(머리 잎 등)은 쓰지 않고 표정 · 칠만 빌렸다.
"""

LOOKS = {
    # ── 일반 15 ──
    # 10-16 엔 젤리로 바꿨다가 "모양이 바뀌었다"로 꼬마 용 몸에 뒀는데, 11-17 사용자 "슬라임 임프가 너무 체형이 똑같네" — 이번엔 젤리 덩어리
    'slime': dict(kind='blob', body_r=(0.44, 0.4, 0.36), color='#6ab83a', dark='#2a5a1a', iris='#e05a1a', bulge=True, horn='#3a5a1a', spikes=False, wings=False, tail=None),   # 다리 없는 젤리 덩어리 — 벌린 입 · 흘러내린 자락 · 웅덩이 · 기포
    # 참고 고블린(11-17 GLB) — 올리브 피부 · 큰 잎사귀 귀 · 긴 코 · 갈색 아래 얼굴 · 찡그린 입과 솟은 아랫니 · 검은 천 옷 · 단검
    'goblin': dict(tail=None, color='#8f8f3a', dark='#4a3f1c', muzzle='#8a5a2a', muzzle_patch=True, nose='long', ears='goblin', iris='#7a4a2a',
                   tunic='#3a3636', belt='#241a14', wings=False, horns=None, crest=False, spikes=False,
                   head_r=(0.31, 0.28, 0.29), body_r=(0.22, 0.19, 0.23), weapon='dagger', weapon_color='#a8b4c8'),
    'goblin-shaman': dict(tail=None, color='#7a8a3a', dark='#3a3a18', muzzle='#7a4a2a', muzzle_patch=True, nose='long', ears='goblin', iris='#3cc8b0',
                          boss_look=False, tunic='#4a2a5a', belt='#2a1a14', leaves=True, leaf='#c8a040', leaf2='#8a5a2a', wings=False,
                          horns=None, crest=False, spikes=False, weapon='staff', weapon_color='#3cc8b0', weapon_wood='#5a3a22'),
    'frost-wolf': dict(meye=0.08, color='#c8d4e8', dark='#5a6a8a', belly='#f0f4ff', mane='#e8f0ff', iris='#3cc8ff', slit=True, spikes_quad=True,
                       accent='#9ae0ff'),
    # 이름은 그림자 늑대인데 노란 늑대였다 — 짙은 보라 털 · 붉은 눈
    'shadow-wolf-clean': dict(meye=0.08, color='#3a3048', dark='#16121e', belly='#5a4a6a', mane='#241c30', iris='#ff4a3a', slit=True,
                              spikes_quad=True, accent='#6a4a8a'),
    'skeleton-goblin': dict(tail=None, skull=True, color='#d8ccb0', dark='#3a2e2a', horn='#cfc2a4', iris='#7dff6a', accent='#7dff6a',
                            wings=False, horns=None, spikes=False, arm_thick=0.72, ears='goblin', tunic='#4a3a30',
                            head_r=(0.29, 0.26, 0.27), weapon='sword', weapon_color='#8a7464'),
    'stone-troll': dict(tail=None, color='#6a7a62', dark='#2a3228', iris='#e0b030', nose='snub', rock_chunks=True, stone='#7a7480', moss=True,
                        leaves=False, maw_open=True, mouth='roar', muzzle='#5a5a4a', horns=None, spikes=False,
                        head_r=(0.27, 0.25, 0.25), body_r=(0.36, 0.3, 0.35), head_z=0.74),
    'ogre': dict(tail=None, color='#7d8a4e', iris='#c89030', leaves=False, moss=False, horns=None, tusks=True, fierce=True, arm_thick=1.75,
                 head_r=(0.26, 0.24, 0.24), body_r=(0.36, 0.3, 0.35), head_z=0.74, spikes=False,
                 nose='snub', tunic='#5a4430', belt='#2e2016', weapon='club', weapon_wood='#6a4426'),
    # 벌린 입 · 튀어나온 눈(참고 원숭이 괴물의 표정만) — 용암 임프
    'magma-imp': dict(tail=True, tail_tip=True, color='#8a3a20', dark='#3a140c', muzzle='#a8522a', muzzle_patch=True, mouth='roar', bulge=True, iris='#e0a020', nose='long', ears='goblin', wings=False, horns='curl', horn='#3a2420', spikes=False, glow_belly=True, belly='#ffb347', body_r=(0.13, 0.11, 0.17), head_r=(0.3, 0.27, 0.27), shoulder=(0.13, 0.33), arm_thick=0.55, rock_chunks=False),   # 깡마른 그렘린 — 가는 몸 · 긴 팔 · 큰 머리 · 큰 귀 · 긴 꼬리
    'lava-drake': dict(color='#4a2a24', dark='#1a0c08', belly='#ff9a3d', accent='#ff8a1a', glow=True, wing='#6a2a1a', iris='#ffd34d',
                       rock_chunks=True, stone='#3a2a28', lava='#ff7a1a',
                       slit=True, mouth='roar', muzzle='#5a1a10', spots=6),
    'hellhound': dict(meye=0.08, color='#5a1a1a', dark='#1a0808', belly='#8a3a2a', iris='#ffd34d', slit=True, flames=True, spikes_quad=True,
                      accent='#ff7a1a', horn='#2a1a14'),
    'storm-drake': dict(color='#b8c4dc', dark='#3a4460', belly='#e8f0ff', accent='#7fe8ff', glow=True, wing='#5a6a9a', horn='#2a3048',
                        iris='#7fe8ff', slit=True, mouth='roar', muzzle='#7a88a8'),
    # 이름은 보라 비룡인데 주황 용이었다
    'dragon': dict(color='#6a3a9a', dark='#241238', belly='#c8a0e8', wing='#4a2a7a', accent='#ffd34d', horn='#e8dcc0', iris='#ffd34d',
                   slit=True, mouth='roar', muzzle='#4a2a6a'),
    'void-imp': dict(tail=None, hood=True, cloth='#1e1430', color='#3a2a5a', dark='#140c24', cyclops=True, iris='#c084fc', boss_look=True, mouth='roar', muzzle='#5a3a8a', wings=False, horns='curl', horn='#1a1028', accent='#c084fc', glow=True, spots=0, spikes=False, body_r=(0.2, 0.18, 0.24)),   # 떠 있는 외눈 망령 — 다리 대신 끌리는 망토 자락 · 두건
    'armored-ogre': dict(tail=None, color='#6a5a7a', dark='#241c2c', iris='#ff8a3d', nose='snub', tusks=True, fierce=True, arm_thick=1.75,
                         armor=True, metal='#5a6070', horns='curl', horn='#d8c8a8', crest=False, spikes=False, weapon='hammer',
                         weapon_color='#6a7080', head_r=(0.27, 0.25, 0.25), body_r=(0.36, 0.3, 0.35), head_z=0.74),

    # ── 대장 15 ── (boss_look: 홍채가 빛나고 장식이 크다)
    'moss-golem-clean': dict(tail=None, boss_look=True, color='#5a6a4a', dark='#1e2618', iris='#9aff5a', rock_chunks=True, stone='#6a6a62',
                             lava='#7aff5a', moss=True, leaves=True, leaf='#6aa83a', horns=None, mouth='roar', muzzle='#3a4230',
                             arm_thick=1.9, head_r=(0.24, 0.22, 0.22), body_r=(0.38, 0.31, 0.36), head_z=0.74, spikes=False),
    'thorn-boar-king': dict(boss_look=True, color='#6a3a28', dark='#1e0e08', iris='#ff4a2a', nose='pig', tusks=True, mouth='frown',
                            wings=False, mcrown=True, crest=False, horns=None, spikes=True, accent='#c8b088', mane='#3a2014',
                            arm_thick=1.6, weapon='greataxe', weapon_color='#8a8a92'),
    'goblin-warlord': dict(tail=None, boss_look=True, color='#7a8a34', dark='#3a3a14', muzzle='#7a4a2a', muzzle_patch=True, nose='long', ears='goblin',
                           iris='#ff3a2a', tunic='#5a1a1a', belt='#2a1a10', mcrown=True, horns=None, crest=False, spikes=False,
                           arm_thick=1.3, weapon='greataxe', weapon_color='#a8b0bc'),
    'moon-wolf-king-clean': dict(meye=0.08, boss_look=True, color='#d8d0ec', dark='#5a4a8a', belly='#ffffff', mane='#f0eaff', iris='#c084fc', slit=True,
                                 spikes_quad=True, accent='#c084fc', horns=True, horn='#8a7ab0', crown=False),
    'ancient-treant': dict(tail=None, boss_look=True, bark=True, color='#5a4030', dark='#1e140c', iris='#9aff5a', leaves=True, leaf='#6aa83a',
                           leaf2='#4a8a2a', moss=True, horns=None, mouth='roar', muzzle='#3a2818', arm_thick=1.7, spikes=False,
                           head_r=(0.27, 0.25, 0.27), body_r=(0.3, 0.27, 0.38), head_z=0.8),
    'spider-queen': dict(boss_look=True, color='#3a1e4a', dark='#120818', belly='#ff3a6a', accent='#ff3a6a', iris='#ff3a6a', slit=True),
    # 그림 이름은 늑대 왕이지만 게임 이름은 고대 오우거 — 이끼 낀 회색 거인 왕
    'wolf-king-clean': dict(tail=None, boss_look=True, color='#6a6a7a', dark='#22222c', iris='#ffb020', nose='snub', tusks=True, fierce=True,
                            arm_thick=1.85, ears=None, mane=None, mcrown=True, moss=True, horns=None, crest=False, spikes=False,
                            tunic='#4a3a2a', belt='#2a1e14', weapon='club', weapon_wood='#5a3a22',
                            head_r=(0.27, 0.25, 0.25), body_r=(0.37, 0.31, 0.36), head_z=0.74),
    'ruin-sentinel': dict(tail=None, knight=True, boss_look=True, armor=False, shield=True, color='#4a3a4a', metal='#5a6274', iris='#7fe8ff',
                          accent='#c8402a', horns=None, crest=False, spikes=False, weapon='sword', weapon_color='#c8d0dc'),
    'minotaur': dict(tail=None, boss_look=True, bull=True, color='#5a3a2a', dark='#1e120c', iris='#ff4a2a', horns=None, horn='#e8dcc0', snout=False,
                     mouth='frown', tusks=False, arm_thick=1.75, tunic='#3a2a1a', belt='#1e140c', weapon='greataxe', weapon_color='#9aa0aa',
                     spikes=False),
    'flame-wyvern-clean': dict(boss_look=True, flame_hair=True, wing_size=1.5, horns='curl', horn='#e8b830', color='#a8301a', dark='#2a0a06', belly='#ffb347', accent='#ff8a1a', glow=True, wing='#c83a1a',
                               iris='#ffe14a', slit=True, mouth='roar', muzzle='#5a1a10', flames=True, spots=6),
    'magma-golem': dict(tail=None, boss_look=True, color='#3a2a28', dark='#140a08', iris='#ffd34d', rock_chunks=True, stone='#4a3a38', lava='#ff7a1a',
                        glow_belly=True, belly='#ff9a3d', mouth='roar', muzzle='#2a1a18', arm_thick=1.9, horns=None, spikes=False),
    'fire-demon': dict(boss_look=True, color='#7a1a1a', dark='#240606', iris='#ffe14a', slit=True, flame_hair=True, horns='curl', horn='#2a1414',
                       mouth='roar', muzzle='#4a0e0e', wing='#5a1414', crest=False, spikes=False, nose='snub'),
    'abyss-titan': dict(tail=None, boss_look=True, cyclops=True, color='#3a2050', dark='#120a1c', iris='#ffd34d', horns='curl', horn='#1a1028',
                        accent='#c084fc', glow=True, rock_chunks=True, stone='#2a1e3a', lava='#c084fc', mouth='roar', muzzle='#24143a',
                        crest=False, spikes=False, arm_thick=1.8),
    'void-lich': dict(tail=None, boss_look=True, skull=True, hood=True, cloth='#24163a', color='#d8ccb0', dark='#2a1e2a', iris='#ff6aff',
                      accent='#c084fc', wings=False, horns=None, crest=False, spikes=False, weapon='scythe', weapon_color='#b8c0d0'),
    'bone-dragon': dict(skull=True, boss_look=True, color='#e0d4b8', dark='#3a2e3a', keep_belly=True, belly='#3a2a3a',
                        wing='#4a2a5a', iris='#c06aff', accent='#e0d4b8', horn='#cfc2a4', snout=True),

    # 황금 상자 몬스터 — 몸은 그대로, 얼굴만 같은 그림결로(금빛은 전장 필터가 입힌다)
    'golden-lion-clean': dict(meye=0.08, iris='#e0a020', slit=True),
}


def apply(monsters):
    for art, look in LOOKS.items():
        if art in monsters:
            cfg = dict(monsters[art])
            cfg.update(look)
            cfg['mstyle'] = True
            monsters[art] = {k: v for k, v in cfg.items() if v is not None}
