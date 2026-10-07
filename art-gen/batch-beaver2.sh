#!/usr/bin/env bash
# 비버 테마 2차 — 성문 방어 주인공(활·지팡이 공격 4프레임, 대기와 같은 시드) · 1차가 끝난 뒤 돈다 (ALL_DONE 대기)
set -u
until grep -q ALL_DONE art-gen/batch-beaver.log; do sleep 20; done
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python
R=art-gen/ref/beaver
BEAVER="cute chibi anthropomorphic beaver, big round sparkling eyes, rosy cheeks, two front teeth, flat paddle tail"
CHAR_REFS="$R/crop-beaver-king.png,$R/crop-ally-ranger.png,$R/crop-ally-wizard.png,$R/crop-ally-princess.png"
have() { [ -f "art-gen/out/$1" ]; }
have heroattack-beaverking-3-bow.png || ARTGEN_REFS="$CHAR_REFS" "$PY" art-gen/gen.py heroattack beaverking \
  "brown beaver king with a gold crown with a blue music note gem and a royal blue cape with gold trim, $BEAVER" \
  --ref art-gen/out/heroidle-beaverking-20261403.png --weapon bow --no-pose --seed 20261403 --ip 0.6 --tag bow
have heroattack-beaverking-3-staff.png || ARTGEN_REFS="$CHAR_REFS" "$PY" art-gen/gen.py heroattack beaverking \
  "brown beaver king with a gold crown with a blue music note gem and a royal blue cape with gold trim, $BEAVER" \
  --ref art-gen/out/heroidle-beaverking-20261403.png --weapon staff --no-pose --seed 20261403 --ip 0.6 --tag staff
echo ALL_DONE2
