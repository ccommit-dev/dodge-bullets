#!/usr/bin/env bash
# 망토 파츠 1종 + 랭크 시험 그림자 상대 원화 (직업 명사별) — redo6 뒤에 순차 실행
set -u
cd "$(dirname "$0")/.."
PY=art-gen/.venv/Scripts/python
until grep -aq "redo6 done" art-gen/batch-props-redo6.log; do sleep 5; done
[ -f art-gen/out/prop-cape.png ] || $PY art-gen/gen.py prop cape "a single flowing hooded cloak cape alone, seen from behind, dark red cloth with gold trim, hanging from shoulders, no person, nothing else" --seed 20260980 --ip 0.15
echo "cape done"
gen() { local id="$1"; shift; [ -f "art-gen/out/char-shadow-$id-idle.png" ] && return; $PY art-gen/gen.py char "shadow-$id" "$@" --states idle --seed 20260990; }
gen swordsman  "grim wandering swordsman in worn dark armor, two-handed sword on back" --pose-from garen
gen tracker    "hooded tracker with a crossbow and fur cloak, scarred face" --pose-from leon
gen ascetic    "gaunt ascetic monk in tattered robes with prayer beads and a staff" --pose-from sera
gen gatekeeper "heavy gatekeeper knight with tower shield and halberd, full plate" --pose-from garen
gen wanderer   "weathered wanderer in a wide hat and patched cloak, curved blade" --pose-from nox
gen executor   "masked executor in black and crimson armor, executioner's greatsword" --pose-from garen
gen observer   "cloaked observer with a glowing monocle and floating orbs" --pose-from sera
gen blacksmith "burly blacksmith with leather apron, giant hammer, soot-streaked arms" --pose-from garen
echo "shadow done"
