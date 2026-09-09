#!/usr/bin/env bash
# 그림자 상대 8종 재생성 — 1차는 동료 참조(IP .55)가 강해 전부 초록 망토 기사로 나왔다. IP .3 + 직업별 실루엣·색·포즈를 강하게
set -u
cd "$(dirname "$0")/.."
PY=art-gen/.venv/Scripts/python
gen() { local id="$1" pose="$2" seed="$3"; shift 3; rm -f "art-gen/out/char-shadow-$id-idle.png"; $PY art-gen/gen.py char "shadow-$id" "$@" --pose-from "$pose" --states idle --seed "$seed"; }
gen swordsman  garen 20261001 "grim ronin swordsman, black kimono-style armor, straw hat shadowing the face, two-handed katana held low, no cape"
gen tracker    leon  20261002 "hooded bounty tracker in brown leather and grey fur, crossbow on the arm, wolf pelt hood, no cape"
gen ascetic    sera  20261003 "gaunt bald ascetic monk in tattered white and ochre robes, prayer beads, gnarled wooden staff, bare feet"
gen gatekeeper garen 20261004 "colossal gatekeeper in full plate with a tower shield and halberd, closed great helm, iron grey and bronze"
gen wanderer   nox   20261005 "weathered wanderer in a wide-brimmed hat and patched dusty poncho, curved scimitar, sand-colored"
gen executor   garen 20261006 "masked executioner in black and crimson armor, huge headsman's greatsword resting on the shoulder, chains"
gen observer   sera  20261007 "hooded observer in midnight blue robes with a glowing brass monocle and three floating crystal orbs"
gen blacksmith garen 20261008 "burly blacksmith with a leather apron over bare soot-streaked arms, giant forge hammer, red bandana"
echo "shadow2 done"
