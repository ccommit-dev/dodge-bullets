#!/usr/bin/env bash
# 비버 테마 3차 — 동료 11명 v2 (2026-10-07 사용자: "캐릭터들이 너무 분간이 안 가 · 애니메이션 자연스럽게").
#   · 분간: 털색·의상색을 11명 다르게 (크림·황갈·연보라·초콜릿·적갈·숯검정·흰·주황·회색·남색·분홍)
#   · 자연스러운 상태 전환: 대기를 먼저 뽑고, 이동·공격·피격은 **자기 대기 그림을 IP 참조**(ip 0.65)로 뽑아 같은 체형·의상·크기로 나오게
# ALL_DONE2 뒤에 돈다. 결과 char-bv2-<id>-<state>.png → place-beaver.mjs allies 가 꽂는다
#   nohup bash art-gen/batch-beaver3.sh > art-gen/batch-beaver3.log 2>&1 &
set -u
until grep -q ALL_DONE2 art-gen/batch-beaver2.log 2>/dev/null; do sleep 20; done
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python
R=art-gen/ref/beaver
BEAVER="cute chibi anthropomorphic beaver, big round sparkling eyes, rosy cheeks, two front teeth, flat paddle tail, one single character, full body"
CHAR_REFS="$R/crop-beaver-king.png,$R/crop-ally-ranger.png,$R/crop-ally-wizard.png,$R/crop-ally-princess.png"
have() { [ -f "art-gen/out/$1" ]; }
# $1 id · $2 설명 · $3 시드
ch2() {
  have "char-bv2-$1-idle.png" || ARTGEN_REFS="$CHAR_REFS" "$PY" art-gen/gen.py char "bv2-$1" "$2, $BEAVER" --no-pose --seed "$3" --ip 0.5 --states idle
  have "char-bv2-$1-hit.png" || ARTGEN_REFS="art-gen/out/char-bv2-$1-idle.png,$R/crop-ally-ranger.png" "$PY" art-gen/gen.py char "bv2-$1" "$2, $BEAVER" --no-pose --seed "$3" --ip 0.65 --states run,attack,hit
}
ch2 mia   "scout beaver with CREAM pale ivory fur, teal scarf, light leather vest, two small wooden daggers" 20261541
ch2 leon  "archer beaver with GOLDEN TAN fur, green leaf cap, green tunic, wooden bow and acorn arrow quiver" 20261542
ch2 sera  "wizard beaver with PALE LAVENDER grey fur, big blue star-patterned pointy hat, blue robe, crystal-topped wooden staff" 20261543
ch2 garen "knight beaver with DARK CHOCOLATE brown fur, red acorn-cap helmet, round wooden shield, log hammer" 20261544
ch2 ari   "dragoon beaver with AUBURN reddish fur, red dragon-scale cape, long wooden spear with flame tip" 20261545
ch2 nox   "shadow beaver with CHARCOAL black fur, dark purple hood, twin acorn daggers, sly grin, glowing purple eyes" 20261546
ch2 luna  "paladin beaver with SNOW WHITE fur, golden halo circlet, white and gold armor, star shield" 20261547
ch2 volt  "engineer beaver with BRIGHT ORANGE fur, goggles on forehead, yellow overalls, big wooden wrench" 20261548
ch2 bronn "magma knight beaver with ASH GREY fur, dark iron armor with glowing lava cracks, lava hammer" 20261549
ch2 orion "star mage beaver with DEEP NAVY blue fur, cloak with constellations, telescope staff, glowing stars" 20261550
ch2 ember "princess beaver with PINK fur, pink hair, flower crown, frilly dress, heart-shaped flower guitar" 20261551
echo ALL_DONE3
