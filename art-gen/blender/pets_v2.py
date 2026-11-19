"""펫 2판 설정 (2026-11-19) — roster.MONSTERS 의 pet-* 를 render_anim2 가 이 값으로 덮는다(roster.py 는 그대로).
'그 몬스터의 아기'로 읽히게 부모 몬스터의 색 · 특징을 따르고(슬라임 = 초록 꼬마 용 · 고블린 = 박쥐 귀 · 늑대 · 오우거 뿔 · 용 · 대장 = 타이탄의 그림자),
비버 얼굴(앞니 · 검은 눈동자) 대신 종족 색 홍채 + 반짝임 둘 · 볼터치 · 웃는 입(lib/pet_kit.py). 몬스터용 빛 반점은 없앤다(spots 0).
keep_style 은 creature.beaver_world(차분한 색 · 앞니)를 건너뛴다. 머리는 몸의 두 배 가까이 — 아기 체형."""
B = 'biped'
_BABY = dict(kind=B, keep_style=True, spots=0, spikes=False, head_r=(0.37, 0.34, 0.34), body_r=(0.2, 0.18, 0.2), eye_size=0.125, eye_spread=0.4, eye_up=0.06)

PETS = {
    'pet-slime': dict(_BABY, pet_kit='slime', color='#7cc84a', belly='#e8f5a8', dark='#3f6a2a', accent='#e8452c', iris='#3a8a2a', tail=True, blush='#ff8a8a'),
    'pet-goblin': dict(_BABY, pet_kit='goblin', color='#8a5a7e', belly='#e8cfe0', dark='#4a2a40', accent='#ff8a3d', iris='#ff8a3d', ears='bat', band='#e8452c'),
    'pet-wolf': dict(kind='quad', keep_style=True, spots=0, spikes=False, pet_kit='wolf', color='#d8cfe6', belly='#ffffff', dark='#7a6a9a', iris='#5a7ad8', eye_size=0.1, ears='wolf', head_r=(0.24, 0.23, 0.22)),
    'pet-ogre': dict(_BABY, pet_kit='ogre', color='#a8705a', belly='#f2d8b8', dark='#5a3a2a', accent='#9ad04a', iris='#6ab84a', horns='curl', horn='#f6ead2', blush='#ff8a7a'),
    'pet-dragon': dict(_BABY, pet_kit='dragon', color='#e8843a', belly='#ffe0a0', dark='#8a3a14', accent='#ffd34d', iris='#e85a1a', wing='#d8662a', wings=True, wing_size=0.75, snout=True, horns='curl', horn='#fff0d0', tail=True, plates=True, spikes=True),
    'pet-boss': dict(_BABY, pet_kit='boss', color='#7a4ab0', belly='#d8c4f0', dark='#3a1e5a', accent='#ffb347', iris='#ffd34d', horns='curl', horn='#3a2a5a', crown=True, cape='#4a1e7a', blush='#ff9ad8'),
}
