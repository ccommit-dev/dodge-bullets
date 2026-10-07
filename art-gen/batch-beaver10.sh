#!/usr/bin/env bash
# 비버 테마 10차 (2026-10-07, pixcel-studio 방식 적용) — 참조에 배경이 섞여 생성 원본이 풍경으로 나오던 것을 고친다:
#   · IP 참조 = 배경 없는 우리 컷아웃(동료 v2 대기 · 몬스터 1차 선택본) → 흰 배경 원본 → NX 위치 기반 매트(gen.py 기본 ARTGEN_CUT=nx)
#   · 동료 대기 시드 3개(-s<seed> 보관) · 몬스터 시드 2개 → scripts/sprite-qa.mjs 로 자동 선택 (눈 대신 수치)
#   · 결과 stem: char-bv3-* · monster-bv3-* · heroidle-beaverking3-* (1·2차는 그대로 둔다)
#   nohup bash art-gen/batch-beaver10.sh > art-gen/batch-beaver10.log 2>&1 &
set -u
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python
O=art-gen/out
BEAVER="cute chibi anthropomorphic beaver, big round sparkling eyes, rosy cheeks, two front teeth, flat paddle tail, exactly one single character, full body, nothing else in frame"
CH_REFS="$O/char-bv2-leon-idle.png,$O/char-bv2-sera-idle.png,$O/char-bv2-ari-idle.png,$O/char-bv2-nox-idle.png"
KING_REFS="$O/heroidle-beaverking-20261403.png,$O/char-bv2-luna-idle.png,$O/char-bv2-orion-idle.png"
MON_REFS="$O/monster-bv-moss-golem-s20261673.png,$O/monster-bv-ogre-s20261607.png,$O/monster-bv-hellhound-s20261622.png,$O/monster-bv-dragon-s20261610.png"
have() { [ -f "art-gen/out/$1" ]; }
one() { for sd in $3 $(( $3 + 100 )) $(( $3 + 200 )); do have "char-bv3-$1-idle-s$sd.png" || { ARTGEN_REFS="$CH_REFS" "$PY" art-gen/gen.py char "bv3-$1" "$2, $BEAVER" --no-pose --seed "$sd" --ip 0.45 --states idle && cp "$O/char-bv3-$1-idle.png" "$O/char-bv3-$1-idle-s$sd.png"; }; done; }
mo() { have "monster-$1-s$3.png" || ARTGEN_REFS="$MON_REFS" "$PY" art-gen/gen.py monster "$1" "$2, side view facing left" --ip 0.45 --seeds "$3" "$4"; }
bo() { have "monster-$1-s$3.png" || ARTGEN_REFS="$MON_REFS" "$PY" art-gen/gen.py monster "$1" "$2" --ip 0.45 --px 1024 --seeds "$3" "$4"; }
# ── 주인공 대기 후보 3 ──
have heroidle-beaverking3-20261423.png || ARTGEN_REFS="$KING_REFS" "$PY" art-gen/gen.py heroidle beaverking3 "brown beaver king with a gold crown with a blue music note gem and a royal blue cape with gold trim, holding two wooden drumsticks, $BEAVER" --seeds 20261421 20261422 20261423 --ip 0.5
# ── 동료 11 대기 × 3시드 ──
one mia   "scout beaver with CREAM pale ivory fur, teal scarf, light leather vest, two small wooden daggers" 20261541
one leon  "archer beaver with GOLDEN TAN fur, green leaf cap, green tunic, wooden bow and acorn arrow quiver" 20261542
one sera  "wizard beaver with PALE LAVENDER grey fur, big blue star-patterned pointy hat, blue robe, crystal-topped wooden staff" 20261543
one garen "knight beaver with DARK CHOCOLATE brown fur, red acorn-cap helmet, round wooden shield, log hammer" 20261544
one ari   "dragoon beaver with AUBURN reddish fur, red dragon-scale cape, long wooden spear with flame tip" 20261545
one nox   "shadow beaver with CHARCOAL black fur, dark purple hood, twin acorn daggers, sly grin, glowing purple eyes" 20261546
one luna  "paladin beaver with SNOW WHITE fur, golden halo circlet, white and gold armor, star shield" 20261547
one volt  "engineer beaver with BRIGHT ORANGE fur, goggles on forehead, yellow overalls, big wooden wrench" 20261548
one bronn "magma knight beaver with ASH GREY fur, dark iron armor with glowing lava cracks, lava hammer" 20261549
one orion "star mage beaver with DEEP NAVY blue fur, cloak with constellations, telescope staff, glowing stars" 20261550
one ember "princess beaver with PINK fur, pink hair, flower crown, frilly dress, heart-shaped flower guitar" 20261551
# ── 몬스터 31 × 2시드 ──
mo bv3-slime        "round red thorny bramble ball monster with glowing orange eyes and an angry grin, tiny root legs" 20261601 20261602
mo bv3-goblin       "small angry tree stump goblin with leafy hair and a twig club, glowing eyes" 20261603 20261604
mo bv3-wolf         "bramble wolf made of thorny vines with glowing red eyes, four legs" 20261605 20261606
mo bv3-ogre         "big log golem ogre made of stacked logs and moss with huge fists" 20261607 20261608
mo bv3-dragon       "small thorn dragon with bark scales, leafy wings and glowing orange eyes, four legs" 20261609 20261610
mo bv3-magma-slime  "molten lava thorn ball monster with cracked black bark and orange glow" 20261611 20261612
mo bv3-void-slime   "violet night thorn ball monster with glowing purple eyes and dark petals" 20261613 20261614
mo bv3-goblin-shaman "tree stump shaman goblin with a mushroom hat and a glowing root staff" 20261615 20261616
mo bv3-skeleton-goblin "pale dead-wood stump goblin with hollow eyes and a bone twig sword" 20261617 20261618
mo bv3-frost-wolf   "frost bramble wolf covered in ice crystals with glowing pale blue eyes, four legs" 20261619 20261620
mo bv3-hellhound    "burning bramble hound with ember eyes and smoke, four legs" 20261621 20261622
mo bv3-stone-troll  "hulking boulder and log troll covered in moss with huge fists" 20261623 20261624
mo bv3-armored-ogre "log golem ogre wearing dark iron plates with violet rune glow" 20261625 20261626
mo bv3-lava-drake   "red lava thorn drake with glowing molten belly and bark wings, four legs" 20261627 20261628
mo bv3-storm-drake  "blue storm thorn drake crackling with lightning on bark horns, four legs" 20261629 20261630
bo bv3-moss-golem   "giant moss-covered thorn tree boss with glowing red eyes and a leaf crown, roots as legs" 20261631 20261632
bo bv3-moon-wolf-king "giant silver bramble wolf king with a glowing blue moon crest on its head" 20261633 20261634
bo bv3-wolf-king    "giant ancient log golem king wearing a gold crown of twigs, glowing eyes" 20261635 20261636
bo bv3-flame-wyvern "giant burning thorn wyvern boss with lava cracks and ember wings" 20261637 20261638
bo bv3-abyss-titan  "giant night thorn titan boss made of dark bark with violet glowing runes and a crystal crown" 20261639 20261640
bo bv3-thorn-boar-king "giant thorny boar king with vine tusks and a gold crown" 20261641 20261642
bo bv3-ancient-treant "ancient treant boss, giant walking tree with glowing green eyes and mossy arms" 20261643 20261644
bo bv3-ruin-sentinel "haunted log knight sentinel boss made of broken dam timber and iron, red visor" 20261645 20261646
bo bv3-magma-golem  "towering magma log golem boss with rivers of glowing lava between logs" 20261647 20261648
bo bv3-void-lich    "night thorn lich boss in tattered violet leaves with a floating crown and a root staff" 20261649 20261650
bo bv3-goblin-warlord "fat tree stump warlord chieftain with a huge twig cleaver and a horned acorn helmet" 20261651 20261652
bo bv3-spider-queen "giant bramble spider queen with a purple thorn carapace and glowing eyes, eight legs" 20261653 20261654
bo bv3-minotaur     "massive log minotaur with bark horns and a giant stone axe" 20261655 20261656
bo bv3-fire-demon   "horned fire thorn demon with molten cracks and flaming leaf wings" 20261657 20261658
bo bv3-bone-dragon  "dead-wood bone dragon with violet ghost fire in its ribs, four legs" 20261659 20261660
mo bv3-golden-lion  "shiny golden acorn lion monster with a leafy mane, glowing gold" 20261661 20261662
echo ALL_DONE10
