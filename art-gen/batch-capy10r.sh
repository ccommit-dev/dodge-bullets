#!/usr/bin/env bash
# 카피 10차-r (2026-10-14 보완): 그림자 시험 상대 8종의 털만 어두운 보라로 — gen.py recolor(img2img, IP 참조 없음, strength 0.45). 자세·무기·방향은 유지
set -u
export ARTGEN_THEME=beaver ARTGEN_LOOK=flat
PY=art-gen/.venv/Scripts/python; O=art-gen/out
have() { [ -f "$O/$1" ]; }
rc() { have "shadow-$1.png" || "$PY" art-gen/gen.py recolor "$O/char-capy10-$1-idle-s$2.png" "shadow-$1" "DARK PURPLE furred shadow beaver, deep violet fur, glowing violet eyes, dark aura, chibi, same pose and outfit" --strength 0.45 --seed 2027$2; }
rc swordsman 20262901
rc tracker 20262902
rc ascetic 20262913
rc gatekeeper 20262904
rc wanderer 20262905
rc executor 20262906
rc observer 20262907
rc blacksmith 20263008
echo ALL_DONE_CAPY10R
