"""플레이어블 캐릭터 스킨 = 동물 옷 (2026-11-19, 사용자: "동료, 칭호, 유물, 펫 등 도감 리소스 퀄이 안 좋아 동기부여가 안 돼 — 모델링부터 다시 제작"
+ 같은 날 참고 그림: 몸 전체를 감싸는 동물 옷을 입은 캐릭터). 예전 스킨은 기본 시트의 색만 돌린 것(scripts/make-character-skins.mjs)이라
도감에서 같은 비버가 색만 다르게 보였다. 이제는 두건(귀 · 뿔 · 볏) + 몸통 옷 + 꼬리 덮개로 실루엣부터 다르다(lib/suit_kit.py).

규칙 — 주인공 몸 · 뼈 · 자세는 손대지 않는다:
  입는 파츠(투구 · 갑옷 · 견갑 · 신발)와 무기는 기본 주인공 뼈 앵커(src/equipment/heroAnchors.ts) 하나로 붙는다.
  그래서 form 은 몸 · 머리 배율(body · head) 없이 얼굴(eyes · brows) 만. 두건은 투구 자리라 게임에서 옷을 입으면 투구 · 갑옷 그림은 가린다
  (능력치는 그대로 · 무기는 보인다 — EquippedCharacter .costume-<스킨>).
roster.HERO 위에 덮어쓴다 — render_anim2.py 의 'hero@<스킨>' · 'hero-<무기>@<스킨>' · 'hero-ride@<스킨>'."""

SKINS = {
    # 흑요석 검사 → 흑룡 옷: 짙은 보라 두건 · 굽은 연보라 뿔 · 두건에서 등으로 가시 · 금 단추
    'obsidian': dict(hat_color='#4a3470', hat_color2='#c9b8ff', suit='dragon', suit_light='#d9ccf2', suit_accent='#f2c232',
                     form=dict(eyes='sharp', brows='fierce')),
    # 새벽의 무희 → 새벽 병아리 옷: 노란 두건 · 주황 볏 · 부리 챙 · 꽁지깃
    'dawn': dict(hat_color='#ffd34d', suit='chick', suit_light='#fff4d0', suit_accent='#ff7a4a'),
    # 붉은 잔영 → 여우 옷: 붉은 주황 두건 · 큰 세모 귀(흰 안) · 흰 끝 꼬리 · 흰 배
    'ember': dict(hat_color='#e0582a', suit='fox', suit_light='#fff2e4', suit_accent='#3a2418',
                  form=dict(eyes='sharp')),
    # 서리 무희 → 눈토끼 옷: 흰 하늘 두건 · 끝이 처진 긴 귀(분홍 안) · 솜 꼬리 · 눈송이 단추
    'frost': dict(hat_color='#e8f2fb', suit='bunny', suit_light='#ffffff', suit_accent='#7fc8f0',
                  form=dict(eyes='sleepy')),
}


def cfg_for(skin, hero):
    """roster.HERO 에 스킨을 덮은 설정 — form 은 합친다(주인공 기본 form 이 있으면 그 위에)"""
    over = dict(SKINS[skin])
    form = dict(hero.get('form', {}), **over.pop('form', {}))
    for k in ('body', 'head'):
        assert k not in form, f'{skin}: 몸 배율은 바꾸지 않는다(파츠 앵커가 어긋난다)'
    out = dict(hero, **over)
    if out.get('suit'):   # 머리 꼭대기 털 뭉치 · 이마 흰 줄(marks 'hero' · tuft)은 두건을 뚫고 나온다
        out['marks'] = None
        out['tuft'] = False
    if out.get('suit'):   # 비버 둥근 귀가 두건 옆으로 삐져나왔다 — 귀는 두건(옷) 것만
        form['ears'] = 'none'
    if form:
        out['form'] = form
    return out
