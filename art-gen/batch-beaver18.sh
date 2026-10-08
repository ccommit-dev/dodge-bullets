#!/usr/bin/env bash
# 비버 테마 18차 (2026-10-08, 사용자: "캐릭터는 모두 오른쪽, 몬스터는 왼쪽(대장 포함)") — ARTGEN_FACE 로 측면 보기 고정:
#   주인공 대기 ×3 · 동료 11 대기 ×3(오른쪽) · 대장 15 ×2(왼쪽, 1024). 결과 stem: heroidle-beaverking4 · char-bv4-* · monster-bv4-*
#   nohup bash art-gen/batch-beaver18.sh > art-gen/batch-beaver18.log 2>&1 &
set -u
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python; O=art-gen/out
BEAVER="cute chibi anthropomorphic beaver, big round sparkling eyes, rosy cheeks, two front teeth, flat paddle tail, exactly one single character, full body, nothing else in frame"
CH_REFS="$O/char-bv3-leon-idle.png,$O/char-bv3-sera-idle.png,$O/char-bv3-ari-idle.png,$O/char-bv3-nox-idle.png"
KING_REFS="$O/heroidle-beaverking3-20261423.png,$O/char-bv3-luna-idle.png,$O/char-bv3-orion-idle.png"
MON_REFS="$O/monster-bv3-moss-golem-s20261631.png,$O/monster-bv3-ogre-s20261607.png,$O/monster-bv3-hellhound-s20261621.png,$O/monster-bv3-dragon-s20261610.png"
have() { [ -f "$O/$1" ]; }
have heroidle-beaverking4-20262403.png || ARTGEN_FACE="facing right" ARTGEN_REFS="$KING_REFS" "$PY" art-gen/gen.py heroidle beaverking4 "brown beaver king with a gold crown with a blue music note gem and a royal blue cape with gold trim, holding two wooden drumsticks, $BEAVER" --seeds 20262401 20262402 20262403 --ip 0.5
one() { for sd in $3 $(( $3 + 100 )) $(( $3 + 200 )); do have "char-bv4-$1-idle-s$sd.png" || { ARTGEN_FACE="facing right" ARTGEN_REFS="$CH_REFS" "$PY" art-gen/gen.py char "bv4-$1" "$2, $BEAVER" --no-pose --seed "$sd" --ip 0.45 --states idle && cp "$O/char-bv4-$1-idle.png" "$O/char-bv4-$1-idle-s$sd.png"; }; done; }
one mia   "scout beaver with CREAM pale ivory fur, teal scarf, light leather vest, two small wooden daggers" 20262441
one leon  "archer beaver with GOLDEN TAN fur, green leaf cap, green tunic, wooden bow and acorn arrow quiver" 20262442
one sera  "wizard beaver with PALE LAVENDER grey fur, big blue star-patterned pointy hat, blue robe, crystal-topped wooden staff" 20262443
one garen "knight beaver with DARK CHOCOLATE brown fur, red acorn-cap helmet, round wooden shield, log hammer" 20262444
one ari   "dragoon beaver with AUBURN reddish fur, red dragon-scale cape, long wooden spear with flame tip" 20262445
one nox   "shadow beaver with CHARCOAL black fur, dark purple hood, twin acorn daggers, sly grin, glowing purple eyes" 20262446
one luna  "paladin beaver with SNOW WHITE fur, golden halo circlet, white and gold armor, star shield" 20262447
one volt  "engineer beaver with BRIGHT ORANGE fur, goggles on forehead, yellow overalls, big wooden wrench" 20262448
one bronn "magma knight beaver with ASH GREY fur, dark iron armor with glowing lava cracks, lava hammer" 20262449
one orion "star mage beaver with DEEP NAVY blue fur, cloak with constellations, telescope staff, glowing stars" 20262450
one ember "princess beaver with PINK fur, pink hair, flower crown, frilly dress, heart-shaped flower guitar" 20262451
bo() { have "monster-$1-s$3.png" || ARTGEN_FACE="facing left" ARTGEN_REFS="$MON_REFS" "$PY" art-gen/gen.py monster "$1" "$2, side view facing left" --ip 0.45 --px 1024 --seeds "$3" "$4"; }
bo bv4-moss-golem "giant moss-covered thorn tree boss with glowing red eyes and a leaf crown, roots as legs" 20262501 20262502
bo bv4-moon-wolf-king "giant silver bramble wolf king with a glowing blue moon crest on its head" 20262503 20262504
bo bv4-wolf-king "giant ancient log golem king wearing a gold crown of twigs, glowing eyes" 20262505 20262506
bo bv4-flame-wyvern "giant burning thorn wyvern boss with lava cracks and ember wings" 20262507 20262508
bo bv4-abyss-titan "giant night thorn titan boss made of dark bark with violet glowing runes and a crystal crown" 20262509 20262510
bo bv4-thorn-boar-king "giant thorny boar king with vine tusks and a gold crown" 20262511 20262512
bo bv4-ancient-treant "ancient treant boss, giant walking tree with glowing green eyes and mossy arms" 20262513 20262514
bo bv4-ruin-sentinel "haunted log knight sentinel boss made of broken dam timber and iron, red visor" 20262515 20262516
bo bv4-magma-golem "towering magma log golem boss with rivers of glowing lava between logs" 20262517 20262518
bo bv4-void-lich "night thorn lich boss in tattered violet leaves with a floating crown and a root staff" 20262519 20262520
bo bv4-goblin-warlord "fat tree stump warlord chieftain with a huge twig cleaver and a horned acorn helmet" 20262521 20262522
bo bv4-spider-queen "giant bramble spider queen with a purple thorn carapace and glowing eyes, eight legs" 20262523 20262524
bo bv4-minotaur "massive log minotaur with bark horns and a giant stone axe" 20262525 20262526
bo bv4-fire-demon "horned fire thorn demon with molten cracks and flaming leaf wings" 20262527 20262528
bo bv4-bone-dragon "dead-wood bone dragon with violet ghost fire in its ribs, four legs" 20262529 20262530
echo ALL_DONE18
