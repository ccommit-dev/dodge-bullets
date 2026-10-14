#!/usr/bin/env bash
# 3D 파일럿 2 (2026-10-14) — 0.50/0.62 는 납작 그대로였다 → strength 0.78 · 3D 참조 IP 0.45
set -u
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python; O=art-gen/out
AREF="$O/char-bv5-mia-idle-s20262601.png,$O/char-bv5-leon-idle-s20262702.png"
MREF="$O/monster-bv5-dragon-s20262710.png,$O/monster-bv5-magma-golem-s20262748.png"
ARTGEN_REFS="$AREF" "$PY" art-gen/gen.py restyle "$O/char-mia-idle.png" "r3d-mia-78" "cute chibi beaver scout, teal scarf, leather vest, two daggers, three-quarter view facing right" --strength 0.78 --seeds 20263411 20263412 --ip 0.45
ARTGEN_REFS="$MREF" "$PY" art-gen/gen.py restyle "public/titans/generated/monsters/slime.png" "r3d-slime-78" "cute green slime dragon monster with red frills, three-quarter view facing left" --strength 0.78 --seeds 20263411 20263412 --ip 0.45
echo ALL_DONE_3D_PILOT2
