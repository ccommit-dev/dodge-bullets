#!/usr/bin/env bash
# 비버 테마 17차 (2026-10-08) — 16차에서 다리가 사선·원근으로 나온 폐허·가시 성 사냥터 배경을 더 강한 문구로 다시 (2시드)
set -u
until grep -q ALL_DONE16 art-gen/batch-beaver16.log 2>/dev/null; do sleep 30; done
export ARTGEN_THEME=beaver ARTGEN_CUT=rembg
PY=art-gen/.venv/Scripts/python; R=art-gen/ref/beaver; O=art-gen/out
WALK="camera exactly level with the ground, the bridge is seen exactly from the side and runs parallel to the picture plane as a flat horizontal band across the bottom third, no perspective on the bridge, railing posts in a horizontal row"
bg() { [ -f "$O/backdrop-$1-s$3.png" ] || ARTGEN_REFS="$R/02-hub-landscape.webp,$O/backdrop-bv5-volcano-s20262217.png" ARTGEN_BG_NEG="isometric, top-down view, bird's eye view, diagonal bridge, receding bridge, vanishing point, tilted, aerial, overhead, path into the distance" "$PY" art-gen/gen.py backdrop "$1" "$2, $WALK" --seeds "$3" "$4"; }
bg bv5-ruins "ruined old wooden dam fortress at sunset with broken timber towers and red autumn leaves in the background" 20262225 20262226
bg bv5-abyss "night thorn castle of dark bark with violet crystals and a purple starry sky in the background" 20262227 20262228
echo ALL_DONE17
