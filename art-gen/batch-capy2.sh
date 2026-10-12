#!/usr/bin/env bash
# 카피(납작 벡터 카툰) 2차 — 전부 (2026-10-12): 주인공 ×3시드 · 동료 11 ×2시드(오른쪽) · 몬스터 31 ×2시드(왼쪽, 대장 1024) · 배경 13 ×2시드(옆에서 본 땅 띠)
#   1차 프로브(batch-capy1)로 화풍을 확인한 뒤 돈다. 결과 stem: heroidle-capy2-* · char-capy2-* · monster-capy2-* · backdrop-capy2-*
set -u
export ARTGEN_THEME=beaver ARTGEN_LOOK=flat ARTGEN_BG_SIZE=1216x832
PY=art-gen/.venv/Scripts/python; O=art-gen/out
REFS="art-gen/ref/capy/capy-hero.png,art-gen/ref/capy/capy-swim.png"
RIGHT="side view facing right, looking right"
LEFT="side view facing left, looking left"
BEAVER="cute chibi beaver, round body, two front teeth, paddle tail, single character, full body"
have() { [ -f "$O/$1" ]; }
have "heroidle-capy2-20272001.png" || ARTGEN_FACE="$RIGHT" ARTGEN_REFS="$REFS" "$PY" art-gen/gen.py heroidle capy2 "king beaver wearing a small golden crown and a short blue cape, cute chibi beaver, two big front teeth, flat paddle tail, round body, single character, full body" --seeds 20272001 20272002 20272003 --ip 0.25
one() { for sd in $3 $(( $3 + 100 )); do have "char-capy2-$1-idle-s$sd.png" || { ARTGEN_FACE="$RIGHT" ARTGEN_REFS="$REFS" "$PY" art-gen/gen.py char "capy2-$1" "$2, $BEAVER" --no-pose --seed "$sd" --ip 0.25 --states idle && cp "$O/char-capy2-$1-idle.png" "$O/char-capy2-$1-idle-s$sd.png"; }; done; }
mo() { have "monster-$1-s$3.png" || ARTGEN_FACE="$LEFT" ARTGEN_REFS="$REFS" "$PY" art-gen/gen.py monster "$1" "$2" --ip 0.25 --seeds "$3" "$4"; }
bo() { have "monster-$1-s$3.png" || ARTGEN_FACE="$LEFT" ARTGEN_REFS="$REFS" "$PY" art-gen/gen.py monster "$1" "$2" --ip 0.25 --px 1024 --seeds "$3" "$4"; }
bg() { have "backdrop-capy2-$1-s$3.png" || "$PY" art-gen/gen.py backdrop "capy2-$1" "$2" --seeds "$3" "$4"; }
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
mo capy2-slime "round red thorny bramble ball monster with glowing orange eyes and an angry grin, tiny root legs" 20262701 20262702
mo capy2-goblin "small angry tree stump goblin with leafy hair and a twig club, glowing eyes" 20262703 20262704
mo capy2-wolf "bramble wolf made of thorny vines with glowing red eyes, four legs" 20262705 20262706
mo capy2-ogre "big log golem ogre made of stacked logs and moss with huge fists" 20262707 20262708
mo capy2-dragon "small thorn dragon with bark scales, leafy wings and glowing orange eyes, four legs" 20262709 20262710
mo capy2-magma-slime "molten lava thorn ball monster with cracked black bark and orange glow" 20262711 20262712
mo capy2-void-slime "violet night thorn ball monster with glowing purple eyes and dark petals" 20262713 20262714
mo capy2-goblin-shaman "tree stump shaman goblin with a mushroom hat and a glowing root staff" 20262715 20262716
mo capy2-skeleton-goblin "pale dead-wood stump goblin with hollow eyes and a bone twig sword" 20262717 20262718
mo capy2-frost-wolf "frost bramble wolf covered in ice crystals with glowing pale blue eyes, four legs" 20262719 20262720
mo capy2-hellhound "burning bramble hound with ember eyes and smoke, four legs" 20262721 20262722
mo capy2-stone-troll "hulking boulder and log troll covered in moss with huge fists" 20262723 20262724
mo capy2-armored-ogre "log golem ogre wearing dark iron plates with violet rune glow" 20262725 20262726
mo capy2-lava-drake "red lava thorn drake with glowing molten belly and bark wings, four legs" 20262727 20262728
mo capy2-storm-drake "blue storm thorn drake crackling with lightning on bark horns, four legs" 20262729 20262730
bo capy2-moss-golem "giant moss-covered thorn tree boss with glowing red eyes and a leaf crown, roots as legs" 20262731 20262732
bo capy2-moon-wolf-king "giant silver bramble wolf king with a glowing blue moon crest on its head" 20262733 20262734
bo capy2-wolf-king "giant ancient log golem king wearing a gold crown of twigs, glowing eyes" 20262735 20262736
bo capy2-flame-wyvern "giant burning thorn wyvern boss with lava cracks and ember wings" 20262737 20262738
bo capy2-abyss-titan "giant night thorn titan boss made of dark bark with violet glowing runes and a crystal crown" 20262739 20262740
bo capy2-thorn-boar-king "giant thorny boar king with vine tusks and a gold crown" 20262741 20262742
bo capy2-ancient-treant "ancient treant boss, giant walking tree with glowing green eyes and mossy arms" 20262743 20262744
bo capy2-ruin-sentinel "haunted log knight sentinel boss made of broken dam timber and iron, red visor" 20262745 20262746
bo capy2-magma-golem "towering magma log golem boss with rivers of glowing lava between logs" 20262747 20262748
bo capy2-void-lich "night thorn lich boss in tattered violet leaves with a floating crown and a root staff" 20262749 20262750
bo capy2-goblin-warlord "fat tree stump warlord chieftain with a huge twig cleaver and a horned acorn helmet" 20262751 20262752
bo capy2-spider-queen "giant bramble spider queen with a purple thorn carapace and glowing eyes, eight legs" 20262753 20262754
bo capy2-minotaur "massive log minotaur with bark horns and a giant stone axe" 20262755 20262756
bo capy2-fire-demon "horned fire thorn demon with molten cracks and flaming leaf wings" 20262757 20262758
bo capy2-bone-dragon "dead-wood bone dragon with violet ghost fire in its ribs, four legs" 20262759 20262760
mo capy2-golden-lion "shiny golden acorn lion monster with a leafy mane, glowing gold" 20262761 20262762
bg meadow "a small wooden beaver cottage with a blue roof and round green trees stand on the ground line under a bright blue sky, all standing on one flat ground line, flat tan dirt strip along the bottom" 20272101 20272102
bg forest "dark green pine trees and glowing mushrooms stand on the ground line under a dusk sky, all standing on one flat ground line, flat tan dirt strip along the bottom" 20272103 20272104
bg ruins "broken stone pillars and a crumbling wall stand on the ground line under an orange sky, all standing on one flat ground line, flat tan dirt strip along the bottom" 20272105 20272106
bg volcano "dark rocks and a small volcano with smoke stand on the ground line under a red sky, all standing on one flat ground line, flat tan dirt strip along the bottom" 20272107 20272108
bg abyss "a dark castle gate and purple crystals stand on the ground line under a deep violet sky, all standing on one flat ground line, flat tan dirt strip along the bottom" 20272109 20272110
bg dodge1 "a tall wooden log dam wall with a gate under a bright sky, all standing on one flat ground line, flat tan dirt strip along the bottom" 20272111 20272112
bg dodge2 "a wooden palisade gate between pine trees under a dusk sky, all standing on one flat ground line, flat tan dirt strip along the bottom" 20272113 20272114
bg dodge3 "a cracked stone gate between broken pillars under an orange sky, all standing on one flat ground line, flat tan dirt strip along the bottom" 20272115 20272116
bg dodge4 "a dark iron gate in a lava rock wall under a red sky, all standing on one flat ground line, flat tan dirt strip along the bottom" 20272117 20272118
bg dodge5 "a dark castle gate with purple crystals under a violet sky, all standing on one flat ground line, flat tan dirt strip along the bottom" 20272119 20272120
bg hub "a row of small wooden cottages with blue roofs and round trees under a bright blue sky, all standing on one flat ground line, flat tan dirt strip along the bottom" 20272121 20272122
bg forge "a wooden forge hut with a chimney and an anvil under a warm sky, all standing on one flat ground line, flat tan dirt strip along the bottom" 20272123 20272124
bg beat "a wooden concert stage with drums and lanterns under a night sky with stars, all standing on one flat ground line, flat tan dirt strip along the bottom" 20272125 20272126
echo ALL_DONE_CAPY2
