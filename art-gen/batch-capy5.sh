#!/usr/bin/env bash
# 카피 5차 (2026-10-12, 사용자: "적은 왼쪽을, 아군은 오른쪽을 눈을 정확하게 바라보게") — 3/4 측면 엄격 프롬프트 + 같은 방향 납작 참조(IP 0.3)
#   주인공 우 ×3 · 뒷모습 ×3 · 동료 11 ×2(우) · 몬스터 31 ×2(좌, 대장 1024) · 파츠 아이콘 6×3 · 콘텐츠 카드 4. 결과 stem: *-capy5-*
set -u
export ARTGEN_THEME=beaver ARTGEN_LOOK=flat
PY=art-gen/.venv/Scripts/python; O=art-gen/out
REFS="$O/char-capy2-sera-idle-s20262743.png,$O/char-capy2-bronn-idle-s20262749.png,$O/char-capy2-ember-idle-s20262651.png"
MREFS="$O/monster-capy2-bone-dragon-s20262759.png,$O/monster-capy2-lava-drake-s20262727.png,$O/monster-capy2-flame-wyvern-s20262737.png"
RIGHT="three-quarter side view turned to the right, head turned right, both eyes looking to the right edge, nose pointing right"
LEFT="three-quarter side view turned to the left, head turned left, both eyes looking to the left edge, nose pointing left"
BEAVER="cute chibi beaver, round body, two front teeth, paddle tail, single character, full body"
have() { [ -f "$O/$1" ]; }
have "heroidle-capy5-20275001.png" || ARTGEN_FACE="$RIGHT" ARTGEN_REFS="$REFS" "$PY" art-gen/gen.py heroidle capy5 "king beaver wearing a small golden crown and a short blue cape, cute chibi beaver, two big front teeth, flat paddle tail, round body, single character, full body" --seeds 20275001 20275002 20275003 --ip 0.3
have "char-capy5-heroback-idle.png" || ARTGEN_FACE="back view seen from behind, looking up at the sky, back of the head, cape and paddle tail visible, no face" ARTGEN_REFS="$REFS" "$PY" art-gen/gen.py char "capy5-heroback" "king beaver wearing a small golden crown and a short blue cape, $BEAVER" --no-pose --seed 20275011 --ip 0.25 --states idle
one() { for sd in $3 $(( $3 + 100 )); do have "char-capy5-$1-idle-s$sd.png" || { ARTGEN_FACE="$RIGHT" ARTGEN_REFS="$REFS" "$PY" art-gen/gen.py char "capy5-$1" "$2, $BEAVER" --no-pose --seed "$sd" --ip 0.3 --states idle && cp "$O/char-capy5-$1-idle.png" "$O/char-capy5-$1-idle-s$sd.png"; }; done; }
mo() { have "monster-$1-s$3.png" || ARTGEN_FACE="$LEFT" ARTGEN_REFS="$MREFS" "$PY" art-gen/gen.py monster "$1" "$2" --ip 0.3 --seeds "$3" "$4"; }
bo() { have "monster-$1-s$3.png" || ARTGEN_FACE="$LEFT" ARTGEN_REFS="$MREFS" "$PY" art-gen/gen.py monster "$1" "$2" --ip 0.3 --px 1024 --seeds "$3" "$4"; }
ic() { have "icon-capy5-$1-20275101.png" || "$PY" art-gen/gen.py icon "capy5-$1" "$2" --seeds 20275101 20275102; }
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
mo capy5-slime "round red thorny bramble ball monster with glowing orange eyes and an angry grin, tiny root legs" 20262701 20262702
mo capy5-goblin "small angry tree stump goblin with leafy hair and a twig club, glowing eyes" 20262703 20262704
mo capy5-wolf "bramble wolf made of thorny vines with glowing red eyes, four legs" 20262705 20262706
mo capy5-ogre "big log golem ogre made of stacked logs and moss with huge fists" 20262707 20262708
mo capy5-dragon "small thorn dragon with bark scales, leafy wings and glowing orange eyes, four legs" 20262709 20262710
mo capy5-magma-slime "molten lava thorn ball monster with cracked black bark and orange glow" 20262711 20262712
mo capy5-void-slime "violet night thorn ball monster with glowing purple eyes and dark petals" 20262713 20262714
mo capy5-goblin-shaman "tree stump shaman goblin with a mushroom hat and a glowing root staff" 20262715 20262716
mo capy5-skeleton-goblin "pale dead-wood stump goblin with hollow eyes and a bone twig sword" 20262717 20262718
mo capy5-frost-wolf "frost bramble wolf covered in ice crystals with glowing pale blue eyes, four legs" 20262719 20262720
mo capy5-hellhound "burning bramble hound with ember eyes and smoke, four legs" 20262721 20262722
mo capy5-stone-troll "hulking boulder and log troll covered in moss with huge fists" 20262723 20262724
mo capy5-armored-ogre "log golem ogre wearing dark iron plates with violet rune glow" 20262725 20262726
mo capy5-lava-drake "red lava thorn drake with glowing molten belly and bark wings, four legs" 20262727 20262728
mo capy5-storm-drake "blue storm thorn drake crackling with lightning on bark horns, four legs" 20262729 20262730
bo capy5-moss-golem "giant moss-covered thorn tree boss with glowing red eyes and a leaf crown, roots as legs" 20262731 20262732
bo capy5-moon-wolf-king "giant silver bramble wolf king with a glowing blue moon crest on its head" 20262733 20262734
bo capy5-wolf-king "giant ancient log golem king wearing a gold crown of twigs, glowing eyes" 20262735 20262736
bo capy5-flame-wyvern "giant burning thorn wyvern boss with lava cracks and ember wings" 20262737 20262738
bo capy5-abyss-titan "giant night thorn titan boss made of dark bark with violet glowing runes and a crystal crown" 20262739 20262740
bo capy5-thorn-boar-king "giant thorny boar king with vine tusks and a gold crown" 20262741 20262742
bo capy5-ancient-treant "ancient treant boss, giant walking tree with glowing green eyes and mossy arms" 20262743 20262744
bo capy5-ruin-sentinel "haunted log knight sentinel boss made of broken dam timber and iron, red visor" 20262745 20262746
bo capy5-magma-golem "towering magma log golem boss with rivers of glowing lava between logs" 20262747 20262748
bo capy5-void-lich "night thorn lich boss in tattered violet leaves with a floating crown and a root staff" 20262749 20262750
bo capy5-goblin-warlord "fat tree stump warlord chieftain with a huge twig cleaver and a horned acorn helmet" 20262751 20262752
bo capy5-spider-queen "giant bramble spider queen with a purple thorn carapace and glowing eyes, eight legs" 20262753 20262754
bo capy5-minotaur "massive log minotaur with bark horns and a giant stone axe" 20262755 20262756
bo capy5-fire-demon "horned fire thorn demon with molten cracks and flaming leaf wings" 20262757 20262758
bo capy5-bone-dragon "dead-wood bone dragon with violet ghost fire in its ribs, four legs" 20262759 20262760
mo capy5-golden-lion "shiny golden acorn lion monster with a leafy mane, glowing gold" 20262761 20262762
# ── 파츠 6종 × 3단계 (카피바라처럼 투구·갑옷·무기·방패·장갑·신발) — 아이콘 + 캐릭터 오버레이 원본
ic helmet-1 "simple wooden beaver helmet with a leaf, game equipment icon"
ic helmet-2 "iron knight helmet with a blue plume, game equipment icon"
ic helmet-3 "golden royal helmet with a ruby, game equipment icon"
ic armor-1 "simple leather vest armor, game equipment icon"
ic armor-2 "iron chest plate armor with blue trim, game equipment icon"
ic armor-3 "golden royal chest armor with a gem, game equipment icon"
ic weapon-1 "simple wooden sword, game equipment icon"
ic weapon-2 "iron broadsword with a blue hilt, game equipment icon"
ic weapon-3 "golden royal sword with a glowing ruby, game equipment icon"
ic shield-1 "round wooden shield, game equipment icon"
ic shield-2 "iron kite shield with a blue emblem, game equipment icon"
ic shield-3 "golden royal shield with a gem, game equipment icon"
ic gloves-1 "simple leather gloves pair, game equipment icon"
ic gloves-2 "iron gauntlets pair, game equipment icon"
ic gloves-3 "golden royal gauntlets pair, game equipment icon"
ic boots-1 "simple leather boots pair, game equipment icon"
ic boots-2 "iron armored boots pair, game equipment icon"
ic boots-3 "golden royal boots pair, game equipment icon"
# ── 던전/강화 콘텐츠 카드 4종 (1024 정사각) ──
cc() { have "backdrop-capy5-$1-s20275201.png" || ARTGEN_BG_SIZE=1024x1024 "$PY" art-gen/gen.py backdrop "capy5-$1" "$2" --seeds 20275201 20275202; }
cc card-gate "a tall wooden log dam gate with a glowing blue barrier dome in front of it, flat cartoon game content card"
cc card-tower "a tall stone watchtower with wooden ladders climbing into the clouds, flat cartoon game content card"
cc card-beat "a wooden concert stage with big drums, lanterns and music notes, flat cartoon game content card"
cc card-forge "a blacksmith anvil with a glowing sword, hammer and sparks on a wooden workbench, flat cartoon game content card"
echo ALL_DONE_CAPY5
