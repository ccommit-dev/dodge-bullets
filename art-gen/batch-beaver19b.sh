#!/usr/bin/env bash
# 19차-b (2026-10-08) — 통나무 길이 원근으로 나온 방어전 1·3·4 를 다시: CLIP 77토큰 때문에 WALK 문구를 **맨 앞**에, 장면 묘사는 짧게. 3시드. 빈칸 채우기 뒤에 돈다
set -u
until grep -q ALL_DONE19FILL art-gen/batch-beaver19-fill.log 2>/dev/null; do sleep 30; done
export ARTGEN_THEME=beaver ARTGEN_CUT=rembg
PY=art-gen/.venv/Scripts/python; R=art-gen/ref/beaver; O=art-gen/out
have() { [ -f "$O/$1" ]; }
WALK="side view at eye level, a flat horizontal wooden plank walkway spans the whole bottom third from left edge to right edge, parallel to the picture plane, no perspective"
NEG="isometric, top-down view, bird's eye view, diagonal bridge, receding bridge, vanishing point, tilted, aerial, overhead, path into the distance, floating island, stairs"
bg() { for sd in $3 $4 $5; do have "backdrop-$1-s$sd.png" || ARTGEN_REFS="$O/backdrop-bv6-dodge2-s20262313.png,$O/backdrop-bv6-hub-s20262323.png" ARTGEN_BG_NEG="$NEG" "$PY" art-gen/gen.py backdrop "$1" "$WALK, $2" --seeds "$sd"; done; }
bg bv6-dodge1 "beaver dam waterfalls and blue lake behind, sunny" 20262331 20262332 20262333
bg bv6-dodge3 "ruined dam and red autumn trees behind, sunset" 20262334 20262335 20262336
bg bv6-dodge4 "lava canyon and charred logs behind, orange glow" 20262337 20262338 20262339
echo ALL_DONE19B
