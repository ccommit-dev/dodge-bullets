#!/usr/bin/env bash
# 비버 테마 19차-배경 (2026-10-08, 사용자: "지상 안 보이는 맵 재생성") — 성문 방어 5 · 비트 무대 · 허브: 아래 1/3 에 좌우로 곧게 뻗은 수평 통나무 길/무대
# 기기 검사(chain18)가 끝난 뒤 돈다. 결과 backdrop-bv6-<x>-s2026231n.png → place-beaver 가 --seed=backdrop-bv6-<x>= 로 꽂는다
set -u
until grep -q RELEASE_EXIT "$1" 2>/dev/null; do sleep 30; done
export ARTGEN_THEME=beaver ARTGEN_CUT=rembg
PY=art-gen/.venv/Scripts/python; R=art-gen/ref/beaver; O=art-gen/out
have() { [ -f "$O/$1" ]; }
WALK="straight-on side view at eye level, a perfectly horizontal straight wooden plank walkway runs left to right across the entire bottom third as flat solid ground, railing posts in a horizontal row behind it, scenery behind"
NEG="isometric, top-down view, bird's eye view, diagonal bridge, receding bridge, vanishing point, tilted, aerial, overhead, path into the distance, floating island"
bg() { have "backdrop-$1-s$3.png" || ARTGEN_REFS="$R/02-hub-landscape.webp,$O/backdrop-bv5-volcano-s20262217.png" ARTGEN_BG_NEG="$NEG" "$PY" art-gen/gen.py backdrop "$1" "$2, $WALK" --seeds "$3" "$4"; }
bg bv6-dodge1 "top of a beaver dam fortress wall with waterfalls and a bright blue lake behind, sunny sky" 20262311 20262312
bg bv6-dodge2 "top of a beaver dam wall at night over a silver moonlit river, moonbeams" 20262313 20262314
bg bv6-dodge3 "top of a ruined dam wall at sunset, broken timber towers and red autumn leaves behind" 20262315 20262316
bg bv6-dodge4 "top of a scorched wooden dam in a lava canyon, glowing cracks and embers behind" 20262317 20262318
bg bv6-dodge5 "top of a dark thorn castle wall at night, violet crystals and purple sky behind" 20262319 20262320
bg bv6-beat   "night beaver dam fortress concert stage with glowing blue waterfalls and lanterns, starry sky, stage lights" 20262321 20262322
bg bv6-hub    "cozy beaver dam town at golden hour with lanterns on wooden houses and a calm lake behind" 20262323 20262324
echo ALL_DONE19BG
