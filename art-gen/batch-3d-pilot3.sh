#!/usr/bin/env bash
# 3D 파일럿 3 (2026-10-14) — 동료(mia·garen) 0.78. CUDA unknown error(다른 GPU 작업과 겹침)가 잦아 3번까지 다시 시도
set -u
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python; O=art-gen/out
AREF="$O/char-bv5-mia-idle-s20262601.png,$O/char-bv5-leon-idle-s20262702.png"
try() { for k in 1 2 3; do "$@" && return 0; echo "retry $k"; sleep 20; done; return 1; }
for sd in 20263411 20263412; do
  [ -f "$O/r3d-mia-78-s$sd.png" ] || ARTGEN_REFS="$AREF" try "$PY" art-gen/gen.py restyle "$O/char-mia-idle.png" "r3d-mia-78" "cute chibi beaver scout, teal scarf, leather vest, two daggers, three-quarter view facing right" --strength 0.78 --seeds $sd --ip 0.45
  [ -f "$O/r3d-garen-78-s$sd.png" ] || ARTGEN_REFS="$AREF" try "$PY" art-gen/gen.py restyle "$O/char-garen-idle.png" "r3d-garen-78" "cute chibi beaver knight, red pointed helmet, silver armor, three-quarter view facing right" --strength 0.78 --seeds $sd --ip 0.45
done
echo ALL_DONE_3D_PILOT3
