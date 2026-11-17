"""동료 얼굴 · 체형 (2026-11-17, 사용자: 와르르비버 영상 · 그림을 보여 주며 "리소스 참고해서 동료는 다르게 수정").
참고는 느낌만 — 크고 둥근 크림 주둥이 · 작고 까만 눈 · 굵은 외곽선 · 매끈한 몸(lib/beaver.py _look_face). 그 게임 비버를 베끼지 않는다.
동료마다 눈 · 주둥이 · 코 · 이 · 볼 · 무늬를 성격대로 골라 같은 얼굴이 없게 한다. 주인공(roster.HERO)은 look 이 없어 예전 얼굴 그대로.
등급이 높을수록 눈이 빛난다(신화 · 초월 일부 eye_glow). FORMS 는 체형이 없던 일반 · 희귀 26명 — 상위 동료 체형(roster_ext)과 같은 범위."""

BASE = dict(smooth=True, ink=1.35)

LOOKS = {
    # ── 일반 ──
    'toto': dict(eyes='smile', cheek='blush'),                                   # 웃는 농부
    'bobo': dict(eyes='dot', muzzle='round', nose='big'),                        # 콧수염 나무꾼
    'kiki': dict(eyes='bead', muzzle='round', cheek='blush', teeth='small'),     # 꼬마 사수
    'dodo': dict(eyes='bead', teeth='one', cheek='freckle'),                     # 안경 수습 마법사
    'momo': dict(eyes='line', cheek='blush', nose='pink', teeth='small'),        # 느긋한 약초꾼
    'pipi': dict(eyes='wink', teeth='gap'),                                      # 윙크 기타
    'gugu': dict(eyes='button', muzzle='wide', nose='big', cheek='freckle'),     # 광부(검댕 주근깨)
    'nana': dict(eyes='dot', cheek='blush', nose='pink'),                        # 수병
    'rara': dict(eyes='wide', muzzle='round', teeth='one'),                      # 냄비 투구(놀란 눈)
    'sisi': dict(eyes='bead', nose='plum', cheek='freckle'),                     # 베레모 불 마법사
    'lulu': dict(eyes='button', cheek='blush', mark='spot', mark_color='#e8e8c0'),   # 숲 사수
    'haha': dict(eyes='smile', nose='big', teeth='small'),                       # 껄껄 바이킹
    # ── 희귀 ──
    'mia': dict(eyes='dot', mark='patch', teeth='gap'),                          # 한쪽 눈가 흰 털
    'leon': dict(eyes='sharp', teeth='small'),                                   # 사냥꾼
    'pyro': dict(eyes='sharp', teeth='fang', mark='stripes', mark_color='#e0482a'),   # 불 줄무늬
    'brook': dict(eyes='bead', muzzle='round', cheek='blush', nose='pink'),      # 물방울 치유사
    'flint': dict(eyes='sharp', teeth='fang', nose='big'),                       # 닭벼슬 전사
    'moss': dict(eyes='line', muzzle='wide'),                                    # 느긋한 등껍질 수호자
    'reed': dict(eyes='dot', cheek='freckle', teeth='one'),                      # 삿갓 사수
    'cinder': dict(eyes='bead', eye_color='#ff8a3a', eye_glow=True),             # 불꽃 머리 — 불씨 눈
    'pebble': dict(eyes='button', muzzle='wide', teeth='fang', mark='stripes'),  # 안대 창병
    'willow': dict(eyes='smile', cheek='blush', nose='pink', teeth='small'),     # 꽃 화관
    'gale': dict(eyes='wide', teeth='gap', cheek='freckle'),                     # 비행사
    'coral': dict(eyes='bead', cheek='blush', nose='pink', mark='spot', mark_color='#ffd8c8'),   # 산호
    'ash': dict(eyes='dot', teeth='fang', nose='big', rim=False),                # 선글라스 기타(눈 흰 테가 안경테처럼 보였다)
    'birch': dict(eyes='dot', muzzle='wide', mark='spot', mark_color='#fff6e4'),   # 사슴뿔(이마 흰 점)
    # ── 영웅 ──
    'sera': dict(eyes='bead', cheek='blush', nose='pink'),
    'garen': dict(eyes='sharp'),
    'volt': dict(eyes='wide', mark='stripes', mark_color='#ffd34d'),             # 번쩍 놀란 눈 · 번개 줄
    'marina': dict(eyes='line', muzzle='round', nose='pink', cheek='blush'),
    'storm': dict(eyes='dot', teeth='gap', mark='stripes', mark_color='#2a3a7a'),
    'frost': dict(eyes='sharp', eye_color='#2f7ac8', nose='button'),
    'blaze': dict(eyes='sharp', teeth='fang', mark='mask', mark_color='#7a2a20'),
    'sage': dict(eyes='line', nose='big'),
    'hawk': dict(eyes='sharp', nose='plum', mark='mask', mark_color='#6a3a1a'),
    'tide': dict(eyes='dot', nose='big', teeth='gap'),
    'anvil': dict(eyes='sharp', teeth='one'),
    # ── 전설 ──
    'ari': dict(eyes='sharp', teeth='fang', mark='stripes', mark_color='#f2c232'),
    'nox': dict(eyes='sharp', mark='mask', eye_color='#c8a8ff', eye_glow=True),
    'luna': dict(eyes='wink', cheek='blush', mark='spot', mark_color='#f2c232'),
    'bronn': dict(eyes='sharp', nose='big', mark='stripes', mark_color='#ff6a2a'),
    'orion': dict(eyes='bead', eye_color='#2f5ad8', mark='spot', mark_color='#9fe8ff'),
    'ember': dict(eyes='bead', cheek='blush', nose='pink', teeth='small'),
    # ── 신화 ──
    'aurora': dict(eyes='line', cheek='blush', nose='pink', mark='spot', mark_color='#7affd8'),
    'titan': dict(eyes='sharp', muzzle='wide', nose='big'),
    'solar': dict(eyes='smile', cheek='blush', mark='stripes', mark_color='#ff7a2a'),
    'tempest': dict(eyes='sharp', eye_color='#3a8ad8', eye_glow=True, mark='stripes', mark_color='#ffe87a'),
    'abyss': dict(eyes='sharp', eye_color='#c084fc', eye_glow=True),
    'phoenix': dict(eyes='sharp', eye_color='#ff7a2a', eye_glow=True, mark='mask', mark_color='#ffd34d'),
    'autumn': dict(eyes='sharp', cheek='freckle', nose='button', mark='spot', mark_color='#f2c232'),
    # ── 초월 ──
    'celes': dict(eyes='line', cheek='blush', nose='pink', mark='spot', mark_color='#fff4c8'),
    'gaia': dict(eyes='smile', muzzle='wide', nose='big', mark='stripes', mark_color='#b8ff7a'),
    'inferno': dict(eyes='sharp', eye_color='#ff5a2a', eye_glow=True, teeth='fang'),
    'leviathan': dict(eyes='sharp', eye_color='#3ae0ff', eye_glow=True, nose='button', teeth='gap', mark='stripes', mark_color='#1a6ad8'),
}

# 체형 — 일반 · 희귀 26명(상위 동료는 roster_ext 에 이미 있다). 불꽃 · 물고기 꼬리(tail_fx)가 있는 동료는 노 꼬리를 둔다
FORMS = {
    'toto': dict(body=(1.12, 0.92)),
    'bobo': dict(body=(1.16, 1.0), head=0.95, brows='fierce', tail='fan'),
    'kiki': dict(body=(0.86, 0.88), head=1.12, ears='big'),
    'dodo': dict(body=(0.92, 1.04), head=1.06, ears='droop'),
    'momo': dict(body=(0.9, 0.9), head=1.1, ears='big', tail='plume'),
    'pipi': dict(body=(0.88, 1.1), ears='pointed', tail='long'),
    'gugu': dict(body=(1.18, 0.9), head=0.96, tail='fan'),
    'nana': dict(body=(0.94, 1.02), ears='droop'),
    'rara': dict(body=(1.12, 0.94)),
    'sisi': dict(body=(0.9, 1.08), ears='pointed', tail='plume'),
    'lulu': dict(body=(0.88, 1.06), ears='tufted', tail='plume'),
    'haha': dict(body=(1.16, 1.04), head=0.95, brows='fierce', tail='fan'),
    'mia': dict(body=(0.94, 1.04), ears='pointed'),
    'leon': dict(body=(0.92, 1.1), ears='tufted', tail='long'),
    'pyro': dict(body=(1.0, 1.06), ears='pointed', brows='fierce'),
    'brook': dict(body=(0.96, 0.96), head=1.06, ears='big', tail='fan'),
    'flint': dict(body=(1.08, 1.04), ears='pointed', brows='fierce'),
    'moss': dict(body=(1.16, 0.88), head=0.96),
    'reed': dict(body=(0.88, 1.12), ears='droop', tail='long'),
    'cinder': dict(body=(0.92, 1.1), ears='pointed'),
    'pebble': dict(body=(1.04, 0.96), ears='tufted'),
    'willow': dict(body=(0.9, 1.02), head=1.06, ears='droop', tail='plume'),
    'gale': dict(body=(0.9, 1.08), ears='big', tail='long'),
    'coral': dict(body=(0.96, 1.0), ears='big'),
    'ash': dict(body=(0.9, 1.14), ears='pointed', tail='long'),
    'birch': dict(body=(1.12, 1.06), ears='big', tail='fan'),
}


def apply(allies):
    for k, f in FORMS.items():
        allies[k].setdefault('form', f)
    for k, lk in LOOKS.items():
        allies[k]['look'] = dict(BASE, **lk)
