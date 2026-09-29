#!/usr/bin/env bash
# 화살 원정 — 속성 화살 리소스 (2026-09-29).
# 활을 장착해도 실제 화살이 안 나가고, 스킬 이름이 활과 무관했다(연속 사격·화염탄·빙결 파동).
# 스킬을 속성 화살(불·물·얼음·흙·번개)로 다시 설계하며 두 종류를 뽑는다:
#   · 투사체 스프라이트 6종 (prop: 대각선 → place 때 수평으로 세운다) — 실제로 날아가는 물체
#   · 스킬 아이콘 5종 (icon: 화살 모티프로 통일 — 지금 아이콘은 구슬·문양이라 활과 연결이 안 읽힌다)
set -u
PY=art-gen/.venv/Scripts/python
arrow() { "$PY" art-gen/gen.py prop "arrow-$1" "one single $2 arrow projectile, one object only, fletched shaft with arrowhead, isolated" --seed 6101 --ip 0.15; }
arrow basic     "plain wooden"
arrow fire      "burning flame-wreathed"
arrow water     "glowing blue water-swirl"
arrow ice       "frost-crystal coated pale blue"
arrow earth     "heavy stone-tipped brown rock"
arrow lightning "crackling yellow lightning-charged"
ico() { "$PY" art-gen/gen.py icon "dskill-$1" "a single fantasy arrow $2, arrow pointing up-right, bold readable silhouette" --seed 6201 --ip 0.25; }
ico fire      "wreathed in orange flames"
ico water     "wrapped in a blue water spiral"
ico ice       "encased in pale blue ice crystals"
ico earth     "with a heavy brown stone arrowhead and dust"
ico lightning "crackling with yellow lightning"
echo ARROWS_DONE
