#!/usr/bin/env bash
# 비버 테마 16차 (2026-10-08, 사용자: "캐릭터 이동 방향과 다리 같은 지면이 일치하게") — 사냥터 5 + 허브 배경을 **정면 측면 시점**으로:
#   아래 1/3 에 화면 왼쪽에서 오른쪽으로 곧게 뻗은 수평 통나무 다리/선창(캐릭터가 그 위를 좌우로 걷는다), 아이소메트릭·사선·부감 금지
# ALL_DONE15 뒤에 돈다.  결과 backdrop-bv5-<x>-s2026221n.png
set -u
until grep -q ALL_DONE15 art-gen/batch-beaver15.log 2>/dev/null; do sleep 30; done
export ARTGEN_THEME=beaver ARTGEN_CUT=rembg
PY=art-gen/.venv/Scripts/python; R=art-gen/ref/beaver; O=art-gen/out
have() { [ -f "$O/$1" ]; }
WALK="straight-on side view at eye level, a perfectly horizontal straight wooden plank bridge runs left to right across the entire bottom third as flat solid ground, railing behind it, scenery and water behind the bridge"
BG_REFS="$R/02-hub-landscape.webp,$R/06-defense-portrait.webp"
bg() { have "backdrop-$1-s$3.png" || ARTGEN_REFS="$BG_REFS" ARTGEN_BG_NEG="isometric, top-down view, bird's eye view, diagonal bridge, tilted, aerial, overhead" "$PY" art-gen/gen.py backdrop "$1" "$2, $WALK" --seeds "$3" "$4"; }
bg bv5-meadow  "sunny beaver dam fortress with waterfalls and a bright lake behind, pine trees, flowers" 20262211 20262212
bg bv5-forest  "moonlit deep forest beaver lodge with glowing mushrooms and fireflies behind" 20262213 20262214
bg bv5-ruins   "ruined old wooden dam fortress at sunset, broken logs, red autumn leaves behind" 20262215 20262216
bg bv5-volcano "red thorn canyon with lava streams and charred logs behind, orange glow" 20262217 20262218
bg bv5-abyss   "night thorn castle of dark bark with violet crystals and purple sky behind" 20262219 20262220
echo ALL_DONE16
