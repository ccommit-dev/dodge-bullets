"""동료 3배 (2026-10-27, 사용자: "3단계 말고 6단계로 동료 새로 만들어줘 · 동료도 지금보다 3배는 많게 · 레벨에 따라 리소스 · 스킬 애니메이션도 화려하게").
기존 20명 + 새 40명. 등급이 높을수록 머리 장식 · 금 장식 · 빛나는 무기색으로 화려하게 — 몸 · 자세는 같은 비버 리그(roster.ALLIES 와 같은 키).
등급(게임 쪽 src/titans/allyRoster.ts): N 일반 · R 희귀 · SR 영웅 · UR 신화 · LR 초월 (SSR 전설은 기존 10명).
2026-11-03 (사용자: "동료가 너무 특징이 없네 · 마저수정"): 색만 다른 모자 다섯 종이던 것을 한 명 한 명 실루엣으로 가른다 — 털색 + 머리(hat) + 얼굴(face) + 등(back) + 꼬리(tail_fx). 부품은 lib/beaver_kit.py."""

FUR = dict(fur='#8f6243', light='#f2dcc2', dark='#6a4228')
PALE = dict(fur='#b88a5c', light='#f8ead6', dark='#8a6440')     # 밝은 털
DARKF = dict(fur='#6a4a36', light='#e8d2b8', dark='#4a3020')    # 짙은 털
SNOW = dict(fur='#d8d2c8', light='#ffffff', dark='#a8a094')     # 흰 털(신화 · 초월)
RUST = dict(fur='#a8562e', light='#f6dcc0', dark='#6e3218')     # 붉은 털
GRAY = dict(fur='#858a90', light='#e8e8e4', dark='#55595e')     # 회색 털
CHAR = dict(fur='#3f3a3c', light='#b8b0a8', dark='#28242a')     # 숯빛 털
CREAM = dict(fur='#d8c098', light='#fff6e4', dark='#a68c64')    # 크림 털
MOSSY = dict(fur='#76824f', light='#e8e8c0', dark='#4f5a32')    # 이끼 털
ROSE = dict(fur='#c08a80', light='#fbe6dc', dark='#8e5c54')     # 분홍 털
GOLDF = dict(fur='#d8a03a', light='#fff0c0', dark='#a06c1c')    # 금빛 털
INK = dict(fur='#34344e', light='#a8a4c8', dark='#20203a')      # 먹빛 털
LILAC = dict(fur='#b8a4d8', light='#f8f0ff', dark='#8470ac')    # 보랏빛 털(초월)
TEAL = dict(fur='#3f8a98', light='#d8f4f4', dark='#256070')     # 청록 털(초월)
SKYF = dict(fur='#7a94b4', light='#eef4fc', dark='#546c8c')     # 하늘빛 털

NEW_ALLIES = {
    # ── N 일반 12 — 생활 도구 · 나무 무기 · 금 장식 없음 ──
    'toto': dict(FUR, hat='straw', hat_color='#e0c070', hat_color2='#a0503a', back='pack', back_color='#9a7a50', back_color2='#6e8a4a', weapon_l='dagger', weapon_color='#c8ccd2', role='melee'),   # 봇짐 멘 농부
    'bobo': dict(DARKF, hat='beanie', hat_color='#b0442f', hat_color2='#f2e6d0', face='mustache', face_color='#2e1c12', weapon_l='axe', weapon_color='#b8bcc2', role='melee'),   # 털실 모자 · 콧수염 나무꾼
    'kiki': dict(PALE, hat='cap', hat_color='#5a9ad0', hat_color2='#3a7ab0', over='feather', over_color='#f4e8c8', back='quiver', back_color='#8a5a2b', weapon_l='bow', role='bow'),   # 깃털 꽂은 꼬마 사수
    'dodo': dict(GRAY, hat='wizard', hat_color='#6a7ab0', robe='#8a9ad0', face='glasses', face_color='#3a2a1e', weapon_r='wand', weapon_color='#a8d8ff', role='mage'),   # 안경 쓴 수습 마법사
    'momo': dict(CREAM, hat='sprout', hat_color='#6ac04a', hat_color2='#4f8a3a', belt='#8a6a4a', weapon_r='staff', weapon_color='#c8f0a0', role='healer'),   # 새싹 약초꾼
    'pipi': dict(FUR, hat='headphones', hat_color='#30343c', hat_color2='#e8604a', scarf='#ffd34d', weapon_r='guitar', weapon_color='#e8a060', role='bard'),   # 헤드폰 기타
    'gugu': dict(DARKF, hat='miner', hat_color='#e0b030', hat_color2='#8a6a2a', belt='#5a4230', weapon_l='shovel', weapon_color='#a8acb2', role='melee'),   # 광부
    'nana': dict(PALE, hat='sailor', hat_color='#f4f4f0', hat_color2='#2a6ab0', scarf='#2a6ab0', weapon_l='trident', weapon_color='#c8d8e0', role='melee'),   # 수병
    'rara': dict(FUR, hat='pot', hat_color='#a8acb2', hat_color2='#4a4e54', armor='#b8bcc4', weapon_r='sword', weapon_l='shield', weapon_l_color='#8a6a4a', role='tank'),   # 냄비 투구
    'sisi': dict(RUST, hat='beret', hat_color='#c8503a', hat_color2='#7a2a20', robe='#e07a5a', scarf='#f2e2b8', weapon_r='wand', weapon_color='#ffb070', role='mage'),   # 베레모 불 마법사
    'lulu': dict(MOSSY, hat='leaf', hat_color='#5aa05a', hat_color2='#3f8040', back='quiver', back_color='#6a5230', weapon_l='bow', role='bow'),   # 큰 잎 쓴 숲 사수
    'haha': dict(GRAY, hat='viking', hat_color='#8a94a0', hat_color2='#4a7ab0', armor='#a8b4c0', face='mustache', face_color='#d8c8a0', weapon_r='sword', weapon_l='shield', weapon_l_color='#4a7ab0', role='tank'),   # 뿔 투구 · 흰 콧수염
    # ── R 희귀 11 — 원소가 보이기 시작 · 은 장식 ──
    'brook': dict(PALE, hat='drop', hat_color='#5ab8f0', hat_color2='#e8f4ff', robe='#6ac0f0', trim='#e8f4ff', back='orbs', back_color='#8ae8ff', weapon_r='staff', weapon_color='#a8f0ff', role='healer'),   # 물방울 고깔 · 물 구슬
    'flint': dict(DARKF, hat='mohawk', hat_color='#e0482a', hat_color2='#ff8a3a', face='warpaint', face_color='#e0482a', weapon_l='axe', weapon_color='#ffcf9a', role='melee'),   # 닭벼슬 전사
    'moss': dict(MOSSY, hat='helmet', hat_color='#6a9a4a', hat_color2='#3a6a2a', armor='#7aaa5a', trim='#d8e8a8', back='shell', back_color='#4f7a3a', back_color2='#7aa050', weapon_r='sword', weapon_l='shield', weapon_l_color='#5a8a3a', role='tank'),   # 등껍질 수호자
    'reed': dict(PALE, hat='cone', hat_color='#d8b86a', hat_color2='#6a4a2a', scarf='#3aa07a', back='quiver', back_color='#3a7a5a', weapon_l='bow', role='bow'),   # 삿갓 사수
    'cinder': dict(CHAR, hat='flamehair', robe='#8a3a2a', trim='#ff8a3a', tail_fx='ember', weapon_r='staff', weapon_color='#ff7a3a', role='mage'),   # 불꽃 머리 · 불꽃 꼬리
    'pebble': dict(GRAY, hat='beanie', hat_color='#3a6a8a', hat_color2='#d8d0b8', face='eyepatch', face_color='#26221e', belt='#4a4238', weapon_l='spear', weapon_color='#d8dce2', role='melee'),   # 안대 창병
    'willow': dict(CREAM, hat='wreath', hat_color='#ffb0c8', hat_color2='#6aa04a', back='leafcape', back_color='#8ac86a', back_color2='#5a9a4a', weapon_r='staff', weapon_color='#d8ffb0', role='healer'),   # 꽃 화관 · 잎 망토
    'gale': dict(SKYF, hat='aviator', hat_color='#7a5230', hat_color2='#4a3018', face='goggles', face_color='#caa050', lens='#9ff0e8', scarf='#e8fff8', back='quiver', back_color='#5ac8b8', weapon_l='bow', role='bow'),   # 비행사 사수
    'coral': dict(ROSE, hat='coral', hat_color='#ff7a7a', tail_fx='fish', tail_color='#ff9a8a', scarf='#ffd8c8', weapon_l='trident', weapon_color='#ffb0a0', role='melee'),   # 산호 뿔 · 물고기 꼬리
    'ash': dict(CHAR, hat='tophat', hat_color='#2a2a30', hat_color2='#ff8a3a', face='sunglasses', face_color='#d8d8d8', scarf='#ff8a3a', weapon_r='guitar', weapon_color='#9a5a3a', role='bard'),   # 실크해트 · 선글라스 기타
    'birch': dict(CREAM, hat='antlers', hat_color2='#6a4a2a', armor='#d8d0c0', trim='#6a4a2a', weapon_r='axe', weapon_l='shield', weapon_l_color='#c8b89a', role='tank'),   # 사슴뿔 수호자
    # ── SR 영웅 7 — 망토 · 금 장식 ──
    'storm': dict(SKYF, hat='winghelm', hat_color='#4a6ad8', cape='#3a5ac8', weapon_l='lance', weapon_color='#bfe8ff', role='melee'),   # 날개 투구
    'frost': dict(SNOW, hat='icecrown', hat_color='#a8e8ff', hat_color2='#5ab8f0', cape='#5ab8f0', weapon_l='sword', weapon_color='#dff6ff', role='melee'),   # 얼음 왕관
    'blaze': dict(RUST, hat='kabuto', hat_color='#b82a22', hat_color2='#ffd34d', armor='#a8302a', trim='#ffd34d', back='banner', back_color='#d8302a', back_color2='#3a2a22', weapon_l='axe', weapon_color='#ffb070', role='melee'),   # 초승달 투구 · 등 깃발
    'sage': dict(PALE, hat='wizard', hat_color='#4a8a3a', robe='#6aaa4a', trim='#ffd34d', face='beard', face_color='#f6f2e8', belt='#3a5a2a', weapon_r='staff', weapon_color='#b8ff7a', role='healer'),   # 흰 수염 현자
    'hawk': dict(GOLDF, hat='plume', hat_color='#8a4a22', hat_color2='#c8862a', cape='#c8862a', back='quiver', back_color='#6a3a1a', fletch='#c8862a', weapon_l='bow', role='bow'),   # 깃털 관
    'tide': dict(PALE, hat='tricorn', hat_color='#2a4aa8', hat_color2='#ffd34d', robe='#3a6ad0', trim='#ffd34d', face='monocle', face_color='#f2c232', weapon_r='staff', weapon_color='#5ae0ff', role='mage'),   # 해군 제독
    'anvil': dict(CHAR, hat='beanie', hat_color='#6a3a20', hat_color2='#c8682a', pom_z=0.065, face='goggles', face_color='#8a8a92', lens='#ff9a3a', armor='#4a4a52', trim='#ffd34d', back='gear', back_color='#8a8a92', back_color2='#ffd34d', weapon_r='hammer', weapon_color='#5a6068', weapon_l='shield', weapon_l_color='#ff8a3a', role='tank'),   # 대장장이 — 등에 톱니바퀴 · 망치
    # ── UR 신화 6 — 날개 · 후광 · 빛나는 무기 ──
    'aurora': dict(SNOW, hat='tiara', hat_color='#7affd8', over='halo', over_color='#a8fff0', robe='#bfe8ff', trim='#ffd34d', back='wings', back_color='#e8fff8', back_color2='#a8f0e0', wing_len=0.4, wing_glow=0.35, weapon_r='staff', weapon_color='#a8fff0', role='healer'),   # 후광 · 오로라 날개
    'titan': dict(DARKF, hat='horncrown', hat_color='#ffb83a', hat_color2='#efe4c8', horn_rise=0.22, armor='#8a7a5a', trim='#ffd34d', cape='#6a5a3a', back='shell', back_color='#7a6a4a', back_color2='#ffd34d', weapon_r='hammer', weapon_l='shield', weapon_l_color='#ffd34d', weapon_color='#b0862a', role='tank'),   # 뿔 왕관 · 금 등판 · 큰 망치
    'solar': dict(GOLDF, hat='sunburst', hat_color='#ffc83a', cape='#ff7a2a', weapon_l='sword', weapon_color='#fff07a', role='melee'),   # 머리 뒤 해살
    'tempest': dict(SKYF, hat='crown', hat_color='#7ad8ff', band='#3a8ad8', cape='#3a8ad8', back='orbs', back_color='#ffe87a', weapon_l='bow', role='bow'),   # 번개 구슬
    'abyss': dict(INK, hat='hornhood', hat_color='#3a2a6a', hat_color2='#c084fc', face='mask', face_color='#14142a', robe='#4a2a8a', trim='#c084fc', back='orbs', back_color='#c084fc', tail_fx='ember', weapon_r='staff', weapon_color='#c084fc', role='mage'),   # 뿔 두건 · 어둠 구슬
    'phoenix': dict(RUST, hat='plume', hat_color='#ff5a2a', hat_color2='#ffd34d', back='firewings', wing_len=0.42, tail_fx='ember', weapon_l='lance', weapon_color='#ffd34d', role='melee'),   # 불사조 날개 · 불꽃 꼬리
    # ── LR 초월 4 — 털부터 다른 색 · 큰 날개 · 강한 발광 ──
    'celes': dict(LILAC, hat='tiara', hat_color='#e8d8ff', over='halo', over_color='#fff4c8', robe='#c8b0ff', trim='#ffffff', back='wings', back_color='#ffffff', back_color2='#e0d0ff', wing_len=0.52, wing_glow=0.7, tail_fx='fish', tail_color='#e8d8ff', weapon_r='staff', weapon_color='#ffffff', role='mage'),   # 천상 — 큰 빛 날개 · 후광
    'gaia': dict(MOSSY, hat='worldtree', hat_color='#b8ff7a', hat_color2='#6a4a2a', robe='#7ad85a', trim='#ffd34d', back='leafwings', back_color='#8ae05a', back_color2='#5ab83a', wing_len=0.5, weapon_r='staff', weapon_color='#d8ff7a', role='healer'),   # 세계수 — 빛나는 가지 · 잎 날개
    'inferno': dict(CHAR, hat='horncrown', hat_color='#ff3a2a', hat_color2='#1e1416', face='warpaint', face_color='#ff5a2a', back='firewings', wing_len=0.52, tail_fx='ember', weapon_l='axe', weapon_color='#ff9a3a', role='melee'),   # 지옥 — 불 날개 · 불 꼬리
    'leviathan': dict(TEAL, hat='crown', hat_color='#3ae0ff', band='#1a6ad8', over='finears', over_color='#5ae8ff', back='fin', back_color='#2ab8d8', tail_fx='fish', tail_color='#3ae0ff', weapon_l='trident', weapon_color='#7af0ff', role='melee'),   # 바다 왕 — 지느러미 귀 · 등지느러미 · 물고기 꼬리
}

# 주 무기를 weapon_l(적 쪽 손)에 바로 적은 줄은 색도 weapon_l_color 로 옮긴다(anim2.main_left 는 weapon_r 가 있을 때만 바꾼다)
for _cfg in NEW_ALLIES.values():
    if 'weapon_l' in _cfg and 'weapon_r' not in _cfg and 'weapon_color' in _cfg and 'weapon_l_color' not in _cfg:
        _cfg['weapon_l_color'] = _cfg['weapon_color']
