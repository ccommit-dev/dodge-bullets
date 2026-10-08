#!/usr/bin/env bash
# 비버 테마 19차-캐릭터 프로브 (2026-10-08) — pixcel-studio(NX Pixel) directions.js 의 '방향 잠금' 문구(¾ 앞·우 / 앞·좌)를 그대로 써서
# 동료 2 · 주인공 1 · 몬스터 2 를 2시드씩 뽑아 방향이 잡히는지 본다. 배경 19차 뒤에 돈다. 결과 stem: char-bv5-* · heroidle-beaverking5 · monster-bv5-*
set -u
until grep -q ALL_DONE19BG art-gen/batch-beaver19-bg.log 2>/dev/null; do sleep 30; done
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python; O=art-gen/out
RIGHT="three-quarter front-right view, camera at front-right rotated about 45 degrees, the character is turned about 45 degrees to the RIGHT and faces toward the right edge, right side emphasized, both eyes visible"
LEFT="three-quarter front-left view, camera at front-left rotated about 45 degrees, the creature is turned about 45 degrees to the LEFT and faces toward the left edge, left side emphasized"
BEAVER="cute chibi anthropomorphic beaver, big round sparkling eyes, rosy cheeks, two front teeth, flat paddle tail, exactly one single character, full body, nothing else in frame"
CH_REFS="$O/char-bv3-leon-idle.png,$O/char-bv3-sera-idle.png,$O/char-bv3-ari-idle.png,$O/char-bv3-nox-idle.png"
MON_REFS="$O/monster-bv3-moss-golem-s20261631.png,$O/monster-bv3-ogre-s20261607.png,$O/monster-bv3-hellhound-s20261621.png,$O/monster-bv3-dragon-s20261610.png"
have() { [ -f "$O/$1" ]; }
one() { for sd in $3 $(( $3 + 100 )); do have "char-bv5-$1-idle-s$sd.png" || { ARTGEN_FACE="$RIGHT" ARTGEN_REFS="$CH_REFS" "$PY" art-gen/gen.py char "bv5-$1" "$2, $BEAVER" --no-pose --seed "$sd" --ip 0.4 --states idle && cp "$O/char-bv5-$1-idle.png" "$O/char-bv5-$1-idle-s$sd.png"; }; done; }
one mia  "scout beaver with a teal scarf and light leather vest, two small wooden daggers" 20262601
one leon "archer beaver with a green leaf cap and green tunic, wooden bow and acorn arrow quiver" 20262602
have heroidle-beaverking5-20262612.png || ARTGEN_FACE="$RIGHT" ARTGEN_REFS="$O/heroidle-beaverking3-20261423.png,$O/char-bv3-luna-idle.png" "$PY" art-gen/gen.py heroidle beaverking5 "brown beaver king with a gold crown with a blue music note gem and a royal blue cape with gold trim, holding two wooden drumsticks, $BEAVER" --seeds 20262611 20262612 --ip 0.45
mo() { have "monster-$1-s$3.png" || ARTGEN_FACE="$LEFT" ARTGEN_REFS="$MON_REFS" "$PY" art-gen/gen.py monster "$1" "$2" --ip 0.4 --seeds "$3" "$4"; }
mo bv5-goblin "small angry brown tree stump goblin with leafy hair and a twig club, glowing orange eyes" 20262621 20262622
mo bv5-wolf   "bramble wolf made of thorny vines with glowing red eyes, four legs" 20262623 20262624
echo ALL_DONE19CH
