#!/usr/bin/env bash
# 21차 (2026-10-08) — 방어전 3(폐허) 통나무 길 재생성: 19b 가 전부 원근 → "stairs/plank road into distance" 금지, 참조를 수평 널(dodge4 2338)로. 20차 뒤에 돈다
set -u
until grep -q ALL_DONE20 art-gen/batch-beaver20.log 2>/dev/null; do sleep 30; done
export ARTGEN_THEME=beaver ARTGEN_CUT=rembg
PY=art-gen/.venv/Scripts/python; O=art-gen/out
have() { [ -f "$O/$1" ]; }
WALK="side view at eye level, a flat horizontal wooden plank deck spans the whole bottom third from left edge to right edge, parallel to the picture plane, no perspective, railing posts in a horizontal row"
NEG="isometric, top-down view, bird's eye view, diagonal bridge, receding bridge, vanishing point, tilted, aerial, overhead, path into the distance, floating island, stairs, plank road, boardwalk leading away"
for sd in 20262341 20262342 20262343; do have "backdrop-bv6-dodge3-s$sd.png" || ARTGEN_REFS="$O/backdrop-bv6-dodge4-s20262338.png,$O/backdrop-bv6-dodge2-s20262313.png" ARTGEN_BG_NEG="$NEG" "$PY" art-gen/gen.py backdrop bv6-dodge3 "$WALK, ruined dam and red autumn trees behind, sunset" --seeds "$sd"; done
echo ALL_DONE21
