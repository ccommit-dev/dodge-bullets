#!/usr/bin/env bash
# 비버 테마 5차 — 불꽃 악마(작은 잔상 여럿) 재생성. ALL_DONE4 뒤에 돈다
set -u
until grep -q ALL_DONE4 art-gen/batch-beaver4.log 2>/dev/null; do sleep 20; done
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python
R=art-gen/ref/beaver
MON_REFS="$R/crop-enemy-stumps.png,$R/crop-boss-tree.png,$R/crop-beaver-icon.png"
SOLID="solid saturated colors, one single creature centered, large in frame, dark outline"
ARTGEN_REFS="$MON_REFS" "$PY" art-gen/gen.py monster bv-fire-demon "horned fire thorn demon with molten cracks and flaming leaf wings, $SOLID" --ip 0.45 --px 1024 --seeds 20261681 20261682
echo ALL_DONE5
