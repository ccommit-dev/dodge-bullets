#!/usr/bin/env bash
# GPU 큐 6 (2026-10-15) — 주인공 대기·공격 8칸 3D restyle. 자세를 지키려 strength 0.6 · 모든 칸 같은 시드
cd /d/game/dodge-bullets || exit 1
exec > art-gen/queue6.log 2>&1
set -u
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python; O=art-gen/out
try() { for k in 1 2 3; do "$@" && return 0; echo "retry $k"; sleep 20; done; return 1; }
REFS3D="$O/char-r3d-mia-idle-s20263502.png,$O/char-r3d-garen-idle-s20263501.png"
for m in idle attack; do for i in 0 1 2 3; do
  for st in 66 74; do
    [ -f "$O/hero-r3d-$m-$i-s$st.png" ] || { ARTGEN_REFS="$REFS3D" try "$PY" art-gen/gen.py restyle "$O/hero-sq-$m-$i.png" "hero-r3d-$m-$i-tmp$st" "cute chibi beaver king with a gold crown, brown hair, light blue cape with gold clasp, cream belly, holding a wooden drum, same pose, facing right" --strength 0.$st --seeds 20264600 --ip 0.5 && mv "$O/hero-r3d-$m-$i-tmp$st-s20264600.png" "$O/hero-r3d-$m-$i-s$st.png"; }
  done
done; done
echo "ALL_DONE_QUEUE6 $(date +%T)"
