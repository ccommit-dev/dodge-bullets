#!/usr/bin/env bash
# 비버 테마 8차 — 동료 v2 대기만 다시(여러 마리로 나온 미아·브론·세라·볼트, 시드 3개씩 → -s<seed> 로 보관해 눈으로 고른다).
# 이동·공격·피격은 scripts/make-ally-states.mjs 가 대기에서 파생한다 (자기 대기 IP 참조 방식은 콜라주를 만들어 폐기, 2026-10-07). ALL_DONE7 뒤에 돈다
set -u
until grep -q ALL_DONE7 art-gen/batch-beaver7.log 2>/dev/null; do sleep 20; done
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python
R=art-gen/ref/beaver
BEAVER="cute chibi anthropomorphic beaver, big round sparkling eyes, rosy cheeks, two front teeth, flat paddle tail, exactly one single character, full body, nothing else in frame"
CHAR_REFS="$R/crop-beaver-king.png,$R/crop-ally-ranger.png,$R/crop-ally-wizard.png,$R/crop-ally-princess.png"
one() { for sd in $3 $4 $5; do ARTGEN_REFS="$CHAR_REFS" "$PY" art-gen/gen.py char "bv2-$1" "$2, $BEAVER" --no-pose --seed "$sd" --ip 0.45 --states idle && cp "art-gen/out/char-bv2-$1-idle.png" "art-gen/out/char-bv2-$1-idle-s$sd.png"; done; }
one mia   "scout beaver with CREAM pale ivory fur, teal scarf, light leather vest, two small wooden daggers" 20261561 20261562 20261563
one bronn "magma knight beaver with ASH GREY fur, dark iron armor with glowing lava cracks, lava hammer" 20261564 20261565 20261566
one sera  "wizard beaver with PALE LAVENDER grey fur, big blue star-patterned pointy hat, blue robe, crystal-topped wooden staff" 20261567 20261568 20261569
one volt  "engineer beaver with BRIGHT ORANGE fur, goggles on forehead, yellow overalls, big wooden wrench" 20261570 20261571 20261572
echo ALL_DONE8
