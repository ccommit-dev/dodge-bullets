"""동료 3배 (2026-10-27, 사용자: "3단계 말고 6단계로 동료 새로 만들어줘 · 동료도 지금보다 3배는 많게 · 레벨에 따라 리소스 · 스킬 애니메이션도 화려하게").
기존 20명 + 새 40명. 등급이 높을수록 머리 장식(왕관 · 티아라) · 금 장식 · 빛나는 무기색으로 화려하게 — 몸 · 자세는 같은 비버 리그(roster.ALLIES 와 같은 키).
등급(게임 쪽 src/titans/allyRoster.ts): N 일반 · R 희귀 · SR 영웅 · UR 신화 · LR 초월 (SSR 전설은 기존 10명)."""

FUR = dict(fur='#8f6243', light='#f2dcc2', dark='#6a4228')
PALE = dict(fur='#b88a5c', light='#f8ead6', dark='#8a6440')     # 밝은 털
DARKF = dict(fur='#6a4a36', light='#e8d2b8', dark='#4a3020')    # 짙은 털
SNOW = dict(fur='#d8d2c8', light='#ffffff', dark='#a8a094')     # 흰 털(신화 · 초월)

NEW_ALLIES = {
    # ── N 일반 12 — 모자 · 두건 · 나무 무기, 장식 없음 ──
    'toto': dict(FUR, hat='cap', hat_color='#8a9a5a', hat_color2='#6a7a44', scarf='#c8b48a', weapon_l='dagger', weapon_color='#c8ccd2', role='melee'),
    'bobo': dict(DARKF, hat='cap', hat_color='#a05a3a', hat_color2='#7a3a2a', weapon_l='axe', weapon_color='#b8bcc2', role='melee'),
    'kiki': dict(PALE, hat='cap', hat_color='#5a9ad0', hat_color2='#3a7ab0', scarf='#e8d29a', weapon_l='bow', role='bow'),
    'dodo': dict(FUR, hat='wizard', hat_color='#6a7ab0', robe='#8a9ad0', weapon_r='wand', weapon_color='#a8d8ff', role='mage'),
    'momo': dict(PALE, hat='hood', hat_color='#7ab05a', scarf='#d8e8a8', weapon_r='staff', weapon_color='#c8f0a0', role='healer'),
    'pipi': dict(FUR, hat='cap', hat_color='#d87a3a', hat_color2='#b05a2a', scarf='#ffd34d', weapon_r='guitar', weapon_color='#e8a060', role='bard'),
    'gugu': dict(DARKF, hat='cap', hat_color='#9a8a6a', hat_color2='#7a6a4a', weapon_l='shovel', weapon_color='#a8acb2', role='melee'),
    'nana': dict(PALE, hat='hood', hat_color='#4aa8c8', scarf='#a8e0f0', weapon_l='trident', weapon_color='#c8d8e0', role='melee'),
    'rara': dict(FUR, hat='helmet', hat_color='#a8acb2', hat_color2='#7a8088', armor='#b8bcc4', weapon_r='sword', weapon_l='shield', weapon_l_color='#8a6a4a', role='tank'),
    'sisi': dict(FUR, hat='wizard', hat_color='#c8503a', robe='#e07a5a', weapon_r='wand', weapon_color='#ffb070', role='mage'),
    'lulu': dict(PALE, hat='hood', hat_color='#5aa05a', scarf='#e8c87a', weapon_l='bow', role='bow'),
    'haha': dict(DARKF, hat='helmet', hat_color='#9aa4b0', hat_color2='#4a7ab0', armor='#a8b4c0', weapon_r='sword', weapon_l='shield', weapon_l_color='#4a7ab0', role='tank'),
    # ── R 희귀 11 — 색 두 겹 · 은 장식 ──
    'brook': dict(PALE, hat='wizard', hat_color='#3a9ad8', robe='#6ac0f0', trim='#e8f4ff', weapon_r='staff', weapon_color='#a8f0ff', role='healer'),
    'flint': dict(DARKF, hat='hood', hat_color='#c84a2a', scarf='#ffb070', weapon_l='axe', weapon_color='#ffcf9a', role='melee'),
    'moss': dict(FUR, hat='helmet', hat_color='#6a9a4a', hat_color2='#3a6a2a', armor='#7aaa5a', trim='#d8e8a8', weapon_r='sword', weapon_l='shield', weapon_l_color='#5a8a3a', role='tank'),
    'reed': dict(PALE, hat='cap', hat_color='#3aa07a', hat_color2='#2a7a5a', scarf='#f2e2a0', weapon_l='bow', role='bow'),
    'cinder': dict(DARKF, hat='wizard', hat_color='#5a3a3a', robe='#8a3a2a', trim='#ff8a3a', weapon_r='staff', weapon_color='#ff7a3a', role='mage'),
    'pebble': dict(FUR, hat='cap', hat_color='#8a8478', hat_color2='#6a6458', scarf='#c8c0a8', weapon_l='spear', weapon_color='#d8dce2', role='melee'),
    'willow': dict(PALE, hat='hood', hat_color='#8ac86a', scarf='#f0f8d8', weapon_r='staff', weapon_color='#d8ffb0', role='healer'),
    'gale': dict(FUR, hat='hood', hat_color='#5ac8b8', scarf='#e8fff8', weapon_l='bow', role='bow'),
    'coral': dict(PALE, hat='hood', hat_color='#f08a8a', scarf='#ffd8c8', weapon_l='trident', weapon_color='#ffb0a0', role='melee'),
    'ash': dict(DARKF, hat='cap', hat_color='#5a5a5a', hat_color2='#3a3a3a', scarf='#ff8a3a', weapon_r='guitar', weapon_color='#9a5a3a', role='bard'),
    'birch': dict(PALE, hat='helmet', hat_color='#e8e0d0', hat_color2='#8a6a4a', armor='#d8d0c0', trim='#6a4a2a', weapon_r='axe', weapon_l='shield', weapon_l_color='#c8b89a', role='tank'),
    # ── SR 영웅 7 — 망토 · 금 장식 ──
    'storm': dict(FUR, hat='helmet', hat_color='#4a6ad8', hat_color2='#ffd34d', cape='#3a5ac8', weapon_l='lance', weapon_color='#bfe8ff', role='melee'),
    'frost': dict(SNOW, hat='hood', hat_color='#8ad8ff', cape='#5ab8f0', weapon_l='sword', weapon_color='#dff6ff', role='melee'),
    'blaze': dict(DARKF, hat='helmet', hat_color='#d8402a', hat_color2='#ffd34d', armor='#a8302a', trim='#ffd34d', weapon_l='axe', weapon_color='#ffb070', role='melee'),
    'sage': dict(PALE, hat='wizard', hat_color='#4a8a3a', robe='#6aaa4a', trim='#ffd34d', weapon_r='staff', weapon_color='#b8ff7a', role='healer'),
    'hawk': dict(FUR, hat='hood', hat_color='#8a5a2a', cape='#c8862a', weapon_l='bow', role='bow'),
    'tide': dict(PALE, hat='wizard', hat_color='#2a6ad8', robe='#3a8af0', trim='#ffd34d', weapon_r='staff', weapon_color='#5ae0ff', role='mage'),
    'anvil': dict(DARKF, hat='helmet', hat_color='#5a5a62', hat_color2='#ff8a3a', armor='#4a4a52', trim='#ffd34d', weapon_r='axe', weapon_l='shield', weapon_l_color='#ff8a3a', role='tank'),
    # ── UR 신화 6 — 흰 털 · 왕관/티아라 · 빛나는 무기 ──
    'aurora': dict(SNOW, hat='tiara', hat_color='#7affd8', robe='#bfe8ff', trim='#ffd34d', weapon_r='staff', weapon_color='#a8fff0', role='healer'),
    'titan': dict(DARKF, hat='crown', hat_color='#ffd34d', armor='#8a7a5a', trim='#ffd34d', cape='#6a5a3a', weapon_r='axe', weapon_l='shield', weapon_l_color='#ffd34d', weapon_color='#fff0a0', role='tank'),
    'solar': dict(FUR, hat='crown', hat_color='#ffb83a', cape='#ff7a2a', weapon_l='sword', weapon_color='#fff07a', role='melee'),
    'tempest': dict(SNOW, hat='crown', hat_color='#7ad8ff', cape='#3a8ad8', weapon_l='bow', role='bow'),
    'abyss': dict(DARKF, hat='hood', hat_color='#3a2a6a', robe='#4a2a8a', trim='#c084fc', weapon_r='staff', weapon_color='#c084fc', role='mage'),
    'phoenix': dict(FUR, hat='tiara', hat_color='#ff5a3a', cape='#ff7a2a', weapon_l='lance', weapon_color='#ffd34d', role='melee'),
    # ── LR 초월 4 — 흰 털 · 왕관 · 강한 발광 ──
    'celes': dict(SNOW, hat='tiara', hat_color='#e8d8ff', robe='#c8b0ff', trim='#ffffff', weapon_r='staff', weapon_color='#ffffff', role='mage'),
    'gaia': dict(SNOW, hat='crown', hat_color='#9aff7a', robe='#7ad85a', trim='#ffd34d', weapon_r='staff', weapon_color='#d8ff7a', role='healer'),
    'inferno': dict(DARKF, hat='crown', hat_color='#ff3a2a', cape='#d81a1a', weapon_l='axe', weapon_color='#ff9a3a', role='melee'),
    'leviathan': dict(SNOW, hat='crown', hat_color='#3ae0ff', cape='#1a8ad8', weapon_l='trident', weapon_color='#7af0ff', role='melee'),
}

# 주 무기를 weapon_l(적 쪽 손)에 바로 적은 줄은 색도 weapon_l_color 로 옮긴다(anim2.main_left 는 weapon_r 가 있을 때만 바꾼다)
for _cfg in NEW_ALLIES.values():
    if 'weapon_l' in _cfg and 'weapon_r' not in _cfg and 'weapon_color' in _cfg and 'weapon_l_color' not in _cfg:
        _cfg['weapon_l_color'] = _cfg['weapon_color']
