"""플레이어블 캐릭터 스킨 = 진짜 의상 (2026-11-19, 사용자: "동료, 칭호, 유물, 펫 등 도감 리소스 퀄이 안 좋아 동기부여가 안 돼 — 모델링부터 다시 제작").
예전 스킨은 기본 시트의 색만 돌린 것(scripts/make-character-skins.mjs, 팔레트 파생)이라 도감에서 같은 비버가 색만 다르게 보였다.

규칙 — 주인공 몸 · 뼈 · 자세는 손대지 않는다:
  입는 파츠(투구 · 갑옷 · 견갑 · 신발)와 무기는 기본 주인공 뼈 앵커(src/equipment/heroAnchors.ts) 하나로 붙는다.
  그래서 form 은 몸 · 머리 배율(body · head) 없이 얼굴(eyes · brows) · 귀 · 꼬리 모양만, 모자(hat)는 쓰지 않는다(투구 슬롯과 겹친다).
  실루엣은 털색 · 등(back) · 꼬리 장식(tail_fx) · 목도리(scarf) · 망토(cape) · 얼굴(face) · 머리 옆 장식(over)으로 가른다.
roster.HERO 위에 덮어쓴다 — render_anim2.py 의 'hero@<스킨>' · 'hero-<무기>@<스킨>' · 'hero-ride@<스킨>'."""

SKINS = {
    # 흑요석 검사 — 숯빛 털 · 보랏빛 결정 망토 · 날카로운 눈 · 등 뒤 결정 셋
    'obsidian': dict(fur='#4a4452', light='#e4dcec', dark='#2a2532', mark_color='#c9b8ff',
                     form=dict(eyes='sharp', brows='fierce', ears='tufted'),
                     cape='#3a2458', trim='#a78bfa', back='stars', back_color='#8b5cf6', back_color2='#e9d5ff',
                     tail_fx='bands', tail_color='#8b7bd8'),
    # 새벽의 무희 — 복숭아빛 털 · 분홍 목도리 · 해 뜨는 빛 날개 · 머리 옆 깃털
    'dawn': dict(fur='#e39a6a', light='#fff4e8', dark='#a8603a', mark_color='#fff8ee',
                 form=dict(ears='big', tail='plume'),
                 scarf='#ff8fb8', over='feather', over_color='#ffd34d',
                 back='wings', back_color='#ffb38a', back_color2='#fff0a0', wing_len=0.42, wing_glow=0.4),
    # 붉은 잔영 — 붉은 털 · 눈가 가면 · 긴 붉은 목도리 · 꼬리 끝 불꽃 · 불 날개
    'ember': dict(fur='#a8452a', light='#ffe2cc', dark='#5e1e10', mark_color='#ffd9a8',
                  form=dict(eyes='sharp', ears='pointed'),
                  face='mask', scarf='#e0302a', back='firewings', wing_len=0.4,
                  tail_fx='ember'),
    # 서리 무희 — 눈빛 털 · 하늘색 망토 · 얼음 날개 · 지느러미 귀(서리 깃)
    'frost': dict(fur='#dfe8f2', light='#ffffff', dark='#8aa4c0', mark_color='#bfe6ff',
                  form=dict(ears='big', tail='plume', eyes='sleepy'),
                  cape='#5ab4e8', trim='#ffffff', over='finears', over_color='#9fe0ff',
                  back='wings', back_color='#bfe8ff', back_color2='#ffffff', wing_len=0.44, wing_glow=0.5,
                  tail_fx='bands', tail_color='#bfe6ff'),
}


def cfg_for(skin, hero):
    """roster.HERO 에 스킨을 덮은 설정 — form 은 합친다(주인공 기본 form 이 있으면 그 위에)"""
    over = dict(SKINS[skin])
    form = dict(hero.get('form', {}), **over.pop('form', {}))
    for k in ('body', 'head'):
        assert k not in form, f'{skin}: 몸 배율은 바꾸지 않는다(파츠 앵커가 어긋난다)'
    out = dict(hero, **over)
    if form:
        out['form'] = form
    return out
