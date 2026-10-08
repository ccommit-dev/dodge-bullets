#!/usr/bin/env bash
# 비버 테마 20차 (2026-10-08) — 프로브(19차-캐릭터)가 ¾ 앞·우/앞·좌 를 잘 잡아서 전부 적용: 동료 11 ×2시드(오른쪽) · 몬스터 31 ×2시드(왼쪽, 대장 1024). 19b 뒤에 돈다
#   결과 stem: char-bv5-* · monster-bv5-* (주인공은 heroidle-beaverking5-20262611/12 에 이미 있다)
set -u
until grep -q ALL_DONE19B art-gen/batch-beaver19b.log 2>/dev/null; do sleep 30; done
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python; O=art-gen/out
RIGHT="three-quarter front-right view, camera at front-right rotated about 45 degrees, the character is turned about 45 degrees to the RIGHT and faces toward the right edge, right side emphasized, both eyes visible"
LEFT="three-quarter front-left view, camera at front-left rotated about 45 degrees, the creature is turned about 45 degrees to the LEFT and faces toward the left edge, left side emphasized"
BEAVER="cute chibi anthropomorphic beaver, big round sparkling eyes, rosy cheeks, two front teeth, flat paddle tail, exactly one single character, full body, nothing else in frame"
CH_REFS="$O/char-bv5-mia-idle-s20262601.png,$O/char-bv5-leon-idle-s20262702.png,$O/heroidle-beaverking5-20262611.png"
MON_REFS="$O/monster-bv3-moss-golem-s20261631.png,$O/monster-bv3-ogre-s20261607.png,$O/monster-bv3-hellhound-s20261621.png,$O/monster-bv3-dragon-s20261610.png"
have() { [ -f "$O/$1" ]; }
one() { for sd in $3 $(( $3 + 100 )); do have "char-bv5-$1-idle-s$sd.png" || { ARTGEN_FACE="$RIGHT" ARTGEN_REFS="$CH_REFS" "$PY" art-gen/gen.py char "bv5-$1" "$2, $BEAVER" --no-pose --seed "$sd" --ip 0.4 --states idle && cp "$O/char-bv5-$1-idle.png" "$O/char-bv5-$1-idle-s$sd.png"; }; done; }
one mia   "scout beaver with CREAM pale ivory fur, teal scarf, light leather vest, two small wooden daggers" 20262641
one leon  "archer beaver with GOLDEN TAN fur, green leaf cap, green tunic, wooden bow and acorn arrow quiver" 20262642
one sera  "wizard beaver with PALE LAVENDER grey fur, big blue star-patterned pointy hat, blue robe, crystal-topped wooden staff" 20262643
one garen "knight beaver with DARK CHOCOLATE brown fur, red acorn-cap helmet, round wooden shield, log hammer" 20262644
one ari   "dragoon beaver with AUBURN reddish fur, red dragon-scale cape, long wooden spear with flame tip" 20262645
one nox   "shadow beaver with CHARCOAL black fur, dark purple hood, twin acorn daggers, sly grin, glowing purple eyes" 20262646
one luna  "paladin beaver with SNOW WHITE fur, golden halo circlet, white and gold armor, star shield" 20262647
one volt  "engineer beaver with BRIGHT ORANGE fur, goggles on forehead, yellow overalls, big wooden wrench" 20262648
one bronn "magma knight beaver with ASH GREY fur, dark iron armor with glowing lava cracks, lava hammer" 20262649
one orion "star mage beaver with DEEP NAVY blue fur, cloak with constellations, telescope staff, glowing stars" 20262650
one ember "princess beaver with PINK fur, pink hair, flower crown, frilly dress, heart-shaped flower guitar" 20262651
mo() { have "monster-$1-s$3.png" || ARTGEN_FACE="$LEFT" ARTGEN_REFS="$MON_REFS" "$PY" art-gen/gen.py monster "$1" "$2" --ip 0.4 --seeds "$3" "$4"; }
bo() { have "monster-$1-s$3.png" || ARTGEN_FACE="$LEFT" ARTGEN_REFS="$MON_REFS" "$PY" art-gen/gen.py monster "$1" "$2" --ip 0.4 --px 1024 --seeds "$3" "$4"; }
mo bv5-slime "round red thorny bramble ball monster with glowing orange eyes and an angry grin, tiny root legs" 20262701 20262702
mo bv5-goblin "small angry tree stump goblin with leafy hair and a twig club, glowing eyes" 20262703 20262704
mo bv5-wolf "bramble wolf made of thorny vines with glowing red eyes, four legs" 20262705 20262706
mo bv5-ogre "big log golem ogre made of stacked logs and moss with huge fists" 20262707 20262708
mo bv5-dragon "small thorn dragon with bark scales, leafy wings and glowing orange eyes, four legs" 20262709 20262710
mo bv5-magma-slime "molten lava thorn ball monster with cracked black bark and orange glow" 20262711 20262712
mo bv5-void-slime "violet night thorn ball monster with glowing purple eyes and dark petals" 20262713 20262714
mo bv5-goblin-shaman "tree stump shaman goblin with a mushroom hat and a glowing root staff" 20262715 20262716
mo bv5-skeleton-goblin "pale dead-wood stump goblin with hollow eyes and a bone twig sword" 20262717 20262718
mo bv5-frost-wolf "frost bramble wolf covered in ice crystals with glowing pale blue eyes, four legs" 20262719 20262720
mo bv5-hellhound "burning bramble hound with ember eyes and smoke, four legs" 20262721 20262722
mo bv5-stone-troll "hulking boulder and log troll covered in moss with huge fists" 20262723 20262724
mo bv5-armored-ogre "log golem ogre wearing dark iron plates with violet rune glow" 20262725 20262726
mo bv5-lava-drake "red lava thorn drake with glowing molten belly and bark wings, four legs" 20262727 20262728
mo bv5-storm-drake "blue storm thorn drake crackling with lightning on bark horns, four legs" 20262729 20262730
bo bv5-moss-golem "giant moss-covered thorn tree boss with glowing red eyes and a leaf crown, roots as legs" 20262731 20262732
bo bv5-moon-wolf-king "giant silver bramble wolf king with a glowing blue moon crest on its head" 20262733 20262734
bo bv5-wolf-king "giant ancient log golem king wearing a gold crown of twigs, glowing eyes" 20262735 20262736
bo bv5-flame-wyvern "giant burning thorn wyvern boss with lava cracks and ember wings" 20262737 20262738
bo bv5-abyss-titan "giant night thorn titan boss made of dark bark with violet glowing runes and a crystal crown" 20262739 20262740
bo bv5-thorn-boar-king "giant thorny boar king with vine tusks and a gold crown" 20262741 20262742
bo bv5-ancient-treant "ancient treant boss, giant walking tree with glowing green eyes and mossy arms" 20262743 20262744
bo bv5-ruin-sentinel "haunted log knight sentinel boss made of broken dam timber and iron, red visor" 20262745 20262746
bo bv5-magma-golem "towering magma log golem boss with rivers of glowing lava between logs" 20262747 20262748
bo bv5-void-lich "night thorn lich boss in tattered violet leaves with a floating crown and a root staff" 20262749 20262750
bo bv5-goblin-warlord "fat tree stump warlord chieftain with a huge twig cleaver and a horned acorn helmet" 20262751 20262752
bo bv5-spider-queen "giant bramble spider queen with a purple thorn carapace and glowing eyes, eight legs" 20262753 20262754
bo bv5-minotaur "massive log minotaur with bark horns and a giant stone axe" 20262755 20262756
bo bv5-fire-demon "horned fire thorn demon with molten cracks and flaming leaf wings" 20262757 20262758
bo bv5-bone-dragon "dead-wood bone dragon with violet ghost fire in its ribs, four legs" 20262759 20262760
mo bv5-golden-lion "shiny golden acorn lion monster with a leafy mane, glowing gold" 20262761 20262762
echo ALL_DONE20
