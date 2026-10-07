#!/usr/bin/env bash
# 비버 테마 4차 — 1차 몬스터 중 두 시드 모두 흐릿·작게 나온 4종 재생성(시드 2개씩). ALL_DONE3 뒤에 돈다
#   nohup bash art-gen/batch-beaver4.sh > art-gen/batch-beaver4.log 2>&1 &
set -u
until grep -q ALL_DONE3 art-gen/batch-beaver3.log 2>/dev/null; do sleep 20; done
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python
R=art-gen/ref/beaver
MON_REFS="$R/crop-enemy-stumps.png,$R/crop-boss-tree.png,$R/crop-beaver-icon.png"
SOLID="solid saturated colors, one single creature centered, large in frame, dark outline"
mo() { ARTGEN_REFS="$MON_REFS" "$PY" art-gen/gen.py monster "$1" "$2, side view facing left, $SOLID" --ip 0.45 --seeds "$3" "$4"; }
bo() { ARTGEN_REFS="$MON_REFS" "$PY" art-gen/gen.py monster "$1" "$2, $SOLID" --ip 0.45 --px 1024 --seeds "$3" "$4"; }
mo bv-goblin       "small angry brown tree stump goblin with leafy hair and a twig club, glowing orange eyes" 20261671 20261672
bo bv-moss-golem   "giant moss-covered brown thorn tree boss with glowing red eyes and a leaf crown, roots as legs" 20261673 20261674
bo bv-wolf-king    "giant ancient brown log golem king wearing a gold crown of twigs, glowing eyes, thick wooden arms" 20261675 20261676
bo bv-spider-queen "giant brown bramble spider queen with a purple thorn carapace and glowing eyes, eight thick legs" 20261677 20261678
echo ALL_DONE4
