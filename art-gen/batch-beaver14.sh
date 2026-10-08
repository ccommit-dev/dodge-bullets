#!/usr/bin/env bash
# 비버 테마 14차 (2026-10-08) — 동료 털색 구분: 고른 대기(bv3)를 img2img 로 털색만 바꿔 본다. strength 0.45 / 0.6 두 단계, IP 참조 0
#   nohup bash art-gen/batch-beaver14.sh > art-gen/batch-beaver14.log 2>&1 &
set -u
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python
O=art-gen/out
B="cute chibi anthropomorphic beaver, big round sparkling eyes, rosy cheeks, two front teeth, flat paddle tail, one single character, full body, plain white background"
rc() { for st in 0.45 0.6; do "$PY" art-gen/gen.py recolor "$O/char-bv3-$1-idle.png" "recolor-$1-s${st/./}" "$2, $B" --strength $st --seed 20262301 --ip 0; done; }
rc luna  "paladin beaver with SNOW WHITE fur all over the body, golden halo circlet, white and gold armor, star shield"
rc nox   "shadow beaver with CHARCOAL BLACK fur all over the body, dark purple hood, twin acorn daggers, glowing purple eyes"
rc volt  "engineer beaver with BRIGHT ORANGE fur all over the body, goggles on forehead, yellow overalls, big wooden wrench"
rc sera  "wizard beaver with PALE LAVENDER fur all over the body, big blue star-patterned pointy hat, blue robe, crystal staff"
rc mia   "scout beaver with CREAM IVORY fur all over the body, teal scarf, light leather vest, two small wooden daggers"
rc bronn "magma knight beaver with ASH GREY fur all over the body, dark iron armor with glowing lava cracks, lava hammer"
echo ALL_DONE14
