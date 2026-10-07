#!/usr/bin/env bash
# 비버 테마 12차 (2026-10-07, 사용자: "아이콘·UI·배경(물에서 걸어서 어색)·비트 배경 너무 그대로") — 콘셉트 그림을 참조로:
#   · 배경 12 + 비트 1: 화면 아래 1/3 은 캐릭터가 설 **나무 무대·통나무 선창**(물은 그 뒤) — 콘셉트의 댐 요새 구도
#   · 방치/원정 UI 아이콘 16(ui/idle/*.svg 대체): 아케이드 아이콘 스타일, 참조는 이미 만든 아케이드 아이콘
# ALL_DONE11 뒤에 돈다.  nohup bash art-gen/batch-beaver12.sh > art-gen/batch-beaver12.log 2>&1 &
set -u
until grep -q ALL_DONE11 art-gen/batch-beaver11.log 2>/dev/null; do sleep 30; done
export ARTGEN_THEME=beaver ARTGEN_CUT=rembg
PY=art-gen/.venv/Scripts/python
R=art-gen/ref/beaver; O=art-gen/out
have() { [ -f "art-gen/out/$1" ]; }
STAGE="a flat wooden log stage and dock runs across the entire bottom third of the picture as solid ground, water and scenery behind it, no water in the bottom third"
BG_REFS="$R/02-hub-landscape.webp,$R/06-defense-portrait.webp,$R/01-keyart.webp"
bg() { have "backdrop-$1-s$3.png" || ARTGEN_REFS="$BG_REFS" "$PY" art-gen/gen.py backdrop "$1" "$2, $STAGE" --seeds "$3" "$4"; }
bg bv4-meadow  "sunny beaver dam fortress with waterfalls and a bright lake, pine trees, flowers" 20262101 20262102
bg bv4-forest  "moonlit deep forest beaver lodge with glowing mushrooms and fireflies" 20262103 20262104
bg bv4-ruins   "ruined old wooden dam fortress at sunset, broken logs, red autumn leaves" 20262105 20262106
bg bv4-volcano "red thorn canyon with lava streams and charred logs, orange glow" 20262107 20262108
bg bv4-abyss   "night thorn castle of dark bark with violet crystals and purple sky" 20262109 20262110
bg bv4-dodge1  "beaver dam fortress wall with waterfalls, bright lake, sunny sky" 20262111 20262112
bg bv4-dodge2  "moonlit beaver dam wall over a silver river, moonbeams" 20262113 20262114
bg bv4-dodge3  "ruined dam fortress at sunset with broken timber towers and red leaves" 20262115 20262116
bg bv4-dodge4  "scorched wooden dam in a lava canyon with glowing cracks" 20262117 20262118
bg bv4-dodge5  "night thorn castle with violet crystals and dark bark walls" 20262119 20262120
bg bv4-hub     "wide cozy beaver dam town at golden hour, lanterns on wooden houses, calm lake" 20262121 20262122
bg bv4-forge   "cozy wooden beaver workshop interior with a glowing crystal furnace, tools, log piles" 20262123 20262124
# 비트 무대 — 콘셉트 04-beat: 댐 요새 앞, 물 위로 뻗은 통나무 레일
have backdrop-bv4-beat-s20262132.png || ARTGEN_REFS="$R/04-beat.webp,$R/02-hub-landscape.webp" "$PY" art-gen/gen.py backdrop bv4-beat "night beaver dam fortress stage with glowing blue waterfalls and lanterns, dark blue sky with stars, wooden log platform at the bottom, concert stage lighting" --seeds 20262131 20262132
# 방치·원정 UI 아이콘 16 (참조 = 우리 아케이드 아이콘)
IC_REFS="$O/icon-bv-gold-20261802.png,$O/icon-bv-event-chest-20261802.png,$O/icon-bv-boost-20261801.png,$O/icon-bv-expedition-seal-20261801.png"
ic() { have "icon-$1-20262202.png" || ARTGEN_REFS="$IC_REFS" "$PY" art-gen/gen.py icon "$1" "$2" --seeds 20262201 20262202 --ip 0.4; }
ic bv-idle-report  "a wooden hourglass with blue water instead of sand, sleeping moon badge, idle report icon"
ic bv-idle-anvil   "a wooden log stump anvil with a small hammer, forge icon"
ic bv-idle-exp-orb "a glowing cyan music note orb on a wooden base, experience icon"
ic bv-idle-expedition "a rolled wooden map scroll with a red ribbon and a beaver paw stamp, expedition icon"
ic bv-idle-gate-fund "a wooden dam gate with a gold coin lock, gate icon"
ic bv-idle-gate-locked "a wooden dam gate with an iron padlock, locked icon"
ic bv-idle-gate-supply "a wooden supply crate with acorns and a blue ribbon, supply icon"
ic bv-idle-journal "an open wooden-covered journal with a leaf bookmark, journal icon"
ic bv-idle-lock "a round wooden padlock with a blue crystal keyhole, lock icon"
ic bv-idle-pioneer-flag "a wooden pole flag with a beaver paw print, pioneer flag icon"
ic bv-idle-rift "a swirling violet thorn portal ring made of bark, rift icon"
ic bv-idle-shadow-seal "a dark purple wax seal with a thorn emblem on a log, seal icon"
ic bv-idle-star "a shiny gold star carved from wood with a blue gem center, star icon"
ic bv-idle-tower "a tall wooden watchtower on a dam with a blue flag, tower icon"
ic bv-idle-unlock-crest "an open golden lock crest with a beaver paw and leaves, unlock icon"
ic bv-idle-weekend-rift "a swirling golden portal ring with a crescent moon, weekend rift icon"
echo ALL_DONE12
