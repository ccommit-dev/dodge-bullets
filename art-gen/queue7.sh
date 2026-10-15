#!/usr/bin/env bash
# GPU 큐 7 (2026-10-15) — 성문 방어 일제 사격 시트(활·지팡이 4칸) 3D restyle. 큐 6 주인공과 같은 프롬프트·시드·참조(무기는 게임이 따로 그린다)
cd /d/game/dodge-bullets || exit 1
exec > art-gen/queue7.log 2>&1
set -u
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python; O=art-gen/out
try() { for k in 1 2 3; do "$@" && return 0; echo "retry $k"; sleep 20; done; return 1; }
REFS3D="$O/char-r3d-mia-idle-s20263502.png,$O/char-r3d-garen-idle-s20263501.png"
for m in bow staff; do for i in 0 1 2 3; do
  st=66
  [ -f "$O/hero-r3d-$m-$i-s$st.png" ] || { ARTGEN_REFS="$REFS3D" try "$PY" art-gen/gen.py restyle "$O/hero-sq-$m-$i.png" "hero-r3d-$m-$i-tmp$st" "cute chibi beaver king with a gold crown, brown hair, light blue cape with gold clasp, cream belly, same pose, facing right" --strength 0.$st --seeds 20264600 --ip 0.5 && mv "$O/hero-r3d-$m-$i-tmp$st-s20264600.png" "$O/hero-r3d-$m-$i-s$st.png"; }
done; done
echo "ALL_DONE_QUEUE7 $(date +%T)"
