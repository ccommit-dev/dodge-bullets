#!/usr/bin/env bash
# 비버 테마 7차 — 소품 검수에서 여러 개로 나온 북 1~3단계·아리 창 재생성. ALL_DONE6 뒤에 돈다
set -u
until grep -q ALL_DONE6 art-gen/batch-beaver6.log 2>/dev/null; do sleep 20; done
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python
R=art-gen/ref/beaver
ICON_REFS="$R/crop-beaver-icon.png,$R/crop-forge-cards.png,$R/crop-chest.png,$R/crop-drum-crystal.png"
ONE="exactly one single object, large, centered, filling the frame"
for n in 01 02 03; do
  ARTGEN_REFS="$ICON_REFS" "$PY" art-gen/gen.py prop "bv-drum$n" "a plain wooden log drum with a rope band, tier $n, held upright, $ONE" --seed "2026193$n" --ip 0.35
done
ARTGEN_REFS="$ICON_REFS" "$PY" art-gen/gen.py prop bv-w-ari "a long wooden spear with a flame crystal tip, $ONE" --seed 20261937 --ip 0.35
echo ALL_DONE7
