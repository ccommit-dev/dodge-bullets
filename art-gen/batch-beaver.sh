#!/usr/bin/env bash
# 「비버 키우기: 방치형 비트 디펜스」 리소스 전면 개편 (2026-10-07) — 노션 콘셉트(art-gen/ref/beaver) 화풍으로 전부 다시 그린다.
# 치비 3D 장난감 렌더 · 따뜻한 나무 + 맑은 물 · 도토리/잎/물방울/음표. ControlNet 없이(치비엔 사람 골격이 안 맞고 25배 느림) IP 참조만.
#   nohup bash art-gen/batch-beaver.sh > art-gen/batch-beaver.log 2>&1 &
# 이미 나온 결과는 건너뛴다. 끝나면 scripts/place-beaver.mjs 가 배치한다.
set -u
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python
R=art-gen/ref/beaver
BEAVER="cute chibi anthropomorphic beaver, big round sparkling eyes, rosy cheeks, two front teeth, flat paddle tail"
CHAR_REFS="$R/crop-beaver-king.png,$R/crop-ally-ranger.png,$R/crop-ally-wizard.png,$R/crop-ally-princess.png"
MON_REFS="$R/crop-enemy-stumps.png,$R/crop-boss-tree.png,$R/crop-beaver-icon.png"
ICON_REFS="$R/crop-beaver-icon.png,$R/crop-forge-cards.png,$R/crop-chest.png,$R/crop-drum-crystal.png"
BG_REFS="$R/crop-dam-castle.png,$R/09-dam-landscape.webp,$R/01-keyart.webp"
have() { [ -f "art-gen/out/$1" ]; }

# ── A. 주인공 비버 왕 — 공격(북 치기) 4프레임, 대기 후보 20261403 과 같은 시드 ──
have heroattack-beaverking-3.png || ARTGEN_REFS="$CHAR_REFS" "$PY" art-gen/gen.py heroattack beaverking \
  "brown beaver king with a gold crown with a blue music note gem and a royal blue cape with gold trim, $BEAVER" \
  --ref art-gen/out/heroidle-beaverking-20261403.png --weapon drum --no-pose --seed 20261403 --ip 0.6
# 코스튬 대기 2종 (ember 붉은 망토 · frost 서리 망토) — 같은 시드
have heroidle-beaverember-20261403.png || ARTGEN_REFS="$CHAR_REFS" "$PY" art-gen/gen.py heroidle beaverember "brown beaver king with a gold crown and a crimson red cape with ember sparks, holding two wooden drumsticks, $BEAVER" --seeds 20261403 --ip 0.5
have heroidle-beaverfrost-20261403.png || ARTGEN_REFS="$CHAR_REFS" "$PY" art-gen/gen.py heroidle beaverfrost "brown beaver king with a silver crown and an icy pale blue cape with frost crystals, holding two wooden drumsticks, $BEAVER" --seeds 20261403 --ip 0.5

# ── B. 동료 비버 11 × 4상태 (글로만 자세) ──
ch() { have "char-$1-hit.png" || ARTGEN_REFS="$CHAR_REFS" "$PY" art-gen/gen.py char "$1" "$2, $BEAVER" --no-pose --seed "$3" --ip 0.5; }
ch bv-mia   "scout beaver with a teal scarf and two small wooden daggers, light leather vest" 20261501
ch bv-leon  "archer beaver with a green leaf cap and a wooden bow with a leaf, quiver of acorn arrows" 20261502
ch bv-sera  "wizard beaver with a blue star-patterned pointy hat and a crystal-topped wooden staff" 20261503
ch bv-garen "knight beaver with an acorn-cap helmet and a round wooden shield and a log hammer" 20261504
ch bv-ari   "dragoon beaver with a red dragon-scale cape and a long wooden spear with a flame tip" 20261505
ch bv-nox   "shadow beaver with a dark purple hood and twin acorn daggers, sly grin" 20261506
ch bv-luna  "paladin beaver with a golden halo circlet and a white-gold shield with a star" 20261507
ch bv-volt  "engineer beaver with goggles on the forehead and a big wooden wrench, tool belt" 20261508
ch bv-bronn "magma knight beaver with dark iron armor and a glowing lava hammer" 20261509
ch bv-orion "star mage beaver with a navy cloak with constellations and a telescope staff" 20261510
ch bv-ember "pink-haired princess beaver with a flower crown and a heart-shaped flower guitar" 20261511

# ── C. 몬스터 31 (일반 15 · 대장 15 · 황금) — 가시덤불·통나무·도토리 ──
mo() { have "monster-$1-s$3.png" || ARTGEN_REFS="$MON_REFS" "$PY" art-gen/gen.py monster "$1" "$2, side view facing left" --ip 0.45 --seeds "$3" "$4"; }
bo() { have "monster-$1-s$3.png" || ARTGEN_REFS="$MON_REFS" "$PY" art-gen/gen.py monster "$1" "$2" --ip 0.45 --px 1024 --seeds "$3" "$4"; }
mo bv-slime        "round red thorny bramble ball monster with glowing orange eyes and an angry grin, tiny root legs" 20261601 20261602
mo bv-goblin       "small angry tree stump goblin with leafy hair and a twig club, glowing eyes" 20261603 20261604
mo bv-wolf         "bramble wolf made of thorny vines with glowing red eyes, four legs" 20261605 20261606
mo bv-ogre         "big log golem ogre made of stacked logs and moss with huge fists" 20261607 20261608
mo bv-dragon       "small thorn dragon with bark scales, leafy wings and glowing orange eyes, four legs" 20261609 20261610
mo bv-magma-slime  "molten lava thorn ball monster with cracked black bark and orange glow" 20261611 20261612
mo bv-void-slime   "violet night thorn ball monster with glowing purple eyes and dark petals" 20261613 20261614
mo bv-goblin-shaman "tree stump shaman goblin with a mushroom hat and a glowing root staff" 20261615 20261616
mo bv-skeleton-goblin "pale dead-wood stump goblin with hollow eyes and a bone twig sword" 20261617 20261618
mo bv-frost-wolf   "frost bramble wolf covered in ice crystals with glowing pale blue eyes, four legs" 20261619 20261620
mo bv-hellhound    "burning bramble hound with ember eyes and smoke, four legs" 20261621 20261622
mo bv-stone-troll  "hulking boulder and log troll covered in moss with huge fists" 20261623 20261624
mo bv-armored-ogre "log golem ogre wearing dark iron plates with violet rune glow" 20261625 20261626
mo bv-lava-drake   "red lava thorn drake with glowing molten belly and bark wings, four legs" 20261627 20261628
mo bv-storm-drake  "blue storm thorn drake crackling with lightning on bark horns, four legs" 20261629 20261630
bo bv-moss-golem   "giant moss-covered thorn tree boss with glowing red eyes and a leaf crown, roots as legs" 20261631 20261632
bo bv-moon-wolf-king "giant silver bramble wolf king with a glowing blue moon crest on its head" 20261633 20261634
bo bv-wolf-king    "giant ancient log golem king wearing a gold crown of twigs, glowing eyes" 20261635 20261636
bo bv-flame-wyvern "giant burning thorn wyvern boss with lava cracks and ember wings" 20261637 20261638
bo bv-abyss-titan  "giant night thorn titan boss made of dark bark with violet glowing runes and a crystal crown" 20261639 20261640
bo bv-thorn-boar-king "giant thorny boar king with vine tusks and a gold crown" 20261641 20261642
bo bv-ancient-treant "ancient treant boss, giant walking tree with glowing green eyes and mossy arms" 20261643 20261644
bo bv-ruin-sentinel "haunted log knight sentinel boss made of broken dam timber and iron, red visor" 20261645 20261646
bo bv-magma-golem  "towering magma log golem boss with rivers of glowing lava between logs" 20261647 20261648
bo bv-void-lich    "night thorn lich boss in tattered violet leaves with a floating crown and a root staff" 20261649 20261650
bo bv-goblin-warlord "fat tree stump warlord chieftain with a huge twig cleaver and a horned acorn helmet" 20261651 20261652
bo bv-spider-queen "giant bramble spider queen with a purple thorn carapace and glowing eyes, eight legs" 20261653 20261654
bo bv-minotaur     "massive log minotaur with bark horns and a giant stone axe" 20261655 20261656
bo bv-fire-demon   "horned fire thorn demon with molten cracks and flaming leaf wings" 20261657 20261658
bo bv-bone-dragon  "dead-wood bone dragon with violet ghost fire in its ribs, four legs" 20261659 20261660
mo bv-golden-lion  "shiny golden acorn lion monster with a leafy mane, glowing gold" 20261661 20261662

# ── D. 배경 (832×1216 세로판) — 사냥터 5 · 성문 방어 5 · 허브 · 대장간 ──
bg() { have "backdrop-$1-s$3.png" || ARTGEN_REFS="$BG_REFS" "$PY" art-gen/gen.py backdrop "$1" "$2" --seeds "$3" "$4"; }
bg bv-meadow  "sunny beaver dam meadow by a bright blue lake, wooden dam with small waterfalls, pine trees, flowers" 20261701 20261702
bg bv-forest  "moonlit deep forest with giant pines, a wooden beaver lodge, glowing mushrooms and fireflies" 20261703 20261704
bg bv-ruins   "ruined old wooden dam fortress at sunset, broken logs, red autumn leaves, waterfalls" 20261705 20261706
bg bv-volcano "red thorn canyon with lava streams and charred logs, orange glow, embers in the air" 20261707 20261708
bg bv-abyss   "night thorn castle made of dark bark with violet crystals and a purple sky, misty" 20261709 20261710
bg bv-dodge1  "beaver dam battlefield seen from above the dam wall, bright lake below, wooden walkway in the middle, sunny" 20261711 20261712
bg bv-dodge2  "moonlit forest river battlefield, wooden dam wall at the bottom, silver moonbeams" 20261713 20261714
bg bv-dodge3  "ruined dam battlefield at sunset with broken timber towers and red leaves" 20261715 20261716
bg bv-dodge4  "lava canyon battlefield with a scorched wooden dam and glowing cracks" 20261717 20261718
bg bv-dodge5  "night thorn castle battlefield with violet crystals and dark bark walls" 20261719 20261720
bg bv-hub     "wide cozy beaver dam town at golden hour, lanterns on wooden houses, calm blue lake, soft blur" 20261721 20261722
bg bv-forge   "cozy wooden beaver workshop interior with a glowing crystal furnace, tools and log piles, warm light" 20261723 20261724

# ── E. 아이콘 (2시드) ──
ic() { have "icon-$1-20261802.png" || ARTGEN_REFS="$ICON_REFS" "$PY" art-gen/gen.py icon "$1" "$2" --seeds 20261801 20261802 --ip 0.4; }
# 재화·출석
ic bv-gold "a shiny golden acorn, game currency icon"
ic bv-gem "a glossy red heart-cut ruby gem, game currency icon"
ic bv-enhance-stone "a glowing blue crystal shard cluster, upgrade material icon"
ic bv-expedition-seal "a round wooden seal stamp with a beaver paw print, badge icon"
ic bv-skill-orb "a glowing cyan music note orb, skill core icon"
ic bv-shoulder-shards "a pile of small wooden pauldron fragments with gold trim, material icon"
ic bv-scout-pauldron "a small leather and wood shoulder pauldron with a leaf, armor piece icon"
ic bv-dragon-pauldron "an ornate golden dragon-scale shoulder pauldron, armor piece icon"
ic bv-event-chest "a wooden treasure chest with gold rim overflowing with acorns and gems, icon"
# 보상
ic bv-ally-shard "a glowing blue star fragment, ally shard icon"
ic bv-boost "a golden hourglass with blue water inside, boost icon"
ic bv-ally-skin "a cute beaver costume on a wooden hanger, costume icon"
ic bv-weapon-fx "a wooden drumstick with a glowing blue music note trail, effect icon"
ic bv-forge-ticket "a wooden ticket stamped with a crystal, voucher icon"
ic bv-season-xp "a golden star badge with a blue ribbon, season badge icon"
# 성문 방어 스킬 무기 12
ic bv-sk-basic "a simple wooden slingshot with an acorn, weapon icon"
ic bv-sk-fire "an orange flaming acorn crossbow emblem, weapon icon"
ic bv-sk-water "a blue water drop harpoon emblem, weapon icon"
ic bv-sk-ice "a frosty ice crystal wand emblem, weapon icon"
ic bv-sk-earth "a wooden catapult launching a boulder emblem, weapon icon"
ic bv-sk-bolt "a yellow lightning twig spear emblem, weapon icon"
ic bv-sk-wind "a teal spinning leaf boomerang emblem, weapon icon"
ic bv-sk-poison "a purple thorn dart blowgun emblem dripping green, weapon icon"
ic bv-sk-holy "a radiant white and gold flower scepter emblem with light beam, weapon icon"
ic bv-sk-shadow "a dark violet acorn shuriken emblem trailing smoke, weapon icon"
ic bv-sk-meteor "a flaming orange giant acorn meteor falling emblem, weapon icon"
ic bv-sk-ultimate "a rain of golden acorns and leaves from a cloud emblem, ultimate skill icon"
# 성문 방어 투사체 6 · 칩 6 · 보급 3 · 무기 4
ic bv-ar-basic "a small flying acorn with motion lines, projectile icon"
ic bv-ar-bolt "a yellow lightning acorn projectile with sparks"
ic bv-ar-earth "a mossy rock acorn projectile"
ic bv-ar-fire "a flaming orange acorn projectile"
ic bv-ar-ice "a frosty ice acorn projectile with crystals"
ic bv-ar-water "a blue water drop projectile with splash"
ic bv-chip-barrage "a wooden chip carved with three acorns, upgrade chip icon"
ic bv-chip-edge "a wooden chip carved with a sharp leaf, upgrade chip icon"
ic bv-chip-ember "a wooden chip carved with a flame, upgrade chip icon"
ic bv-chip-focus "a wooden chip carved with a target eye, upgrade chip icon"
ic bv-chip-rime "a wooden chip carved with a snowflake, upgrade chip icon"
ic bv-chip-vitality "a wooden chip carved with a green heart, upgrade chip icon"
ic bv-sup-draft "a rolled parchment scroll with a blue ribbon, supply icon"
ic bv-sup-insurance "a wooden shield charm with a heart, supply icon"
ic bv-sup-primed "a glowing blue drum with sparks, supply icon"
ic bv-wp-bow "a wooden recurve bow with a leaf and vine string, weapon icon"
ic bv-wp-staff "a crystal-topped wooden staff with blue glow, weapon icon"
# 모험가 스킬 20
ic bv-ts-strike "a wooden drumstick swinging with a silver crescent arc, skill icon"
ic bv-ts-pierce "a sharpened twig spear piercing forward with a light streak, skill icon"
ic bv-ts-emberCut "an orange flaming drumstick with embers, skill icon"
ic bv-ts-frostEdge "a frozen drumstick covered in ice crystals, skill icon"
ic bv-ts-crit "a teal wind swirl around a beaver paw boot with speed lines, skill icon"
ic bv-ts-waterStep "teal water ripple paw prints on a pond, skill icon"
ic bv-ts-stoneGuard "an amber wooden tower shield with a carved beaver crest, skill icon"
ic bv-ts-galeChain "a teal tornado of leaves with chained links, skill icon"
ic bv-ts-clone "an orange fire silhouette of a beaver twin, skill icon"
ic bv-ts-thunderLink "golden lightning chaining between three music note orbs, skill icon"
ic bv-ts-bloodMoon "two acorn daggers under a crimson blood moon, skill icon"
ic bv-ts-dragonBreath "an orange thorn dragon head breathing a cone of fire, skill icon"
ic bv-ts-warcry "a golden star burst with a drumstick stabbing down, skill icon"
ic bv-ts-meteor "an orange flaming giant acorn meteor with a fiery tail, skill icon"
ic bv-ts-tidalBurst "a teal giant tidal wave crashing over a log, skill icon"
ic bv-ts-voidFinish "a drumstick cutting a dark purple void rift, skill icon"
ic bv-ts-steel "an amber wooden breastplate with a glowing breath swirl, skill icon"
ic bv-ts-focus "a beaver eye inside a crosshair of leaves, skill icon"
ic bv-ts-guardianSoul "an amber spirit flame inside an acorn helmet, skill icon"
ic bv-ts-elementalMastery "four element orbs (fire water leaf lightning) orbiting a music note, skill icon"
# 비트 커스텀 10
ic bv-ring-neon "a cyan glowing wooden log drum, instrument icon"
ic bv-ring-gold "a golden marching log drum with a red sash, instrument icon"
ic bv-ring-magenta "a magenta resonance log drum with pink sound waves, instrument icon"
ic bv-ring-ice "a frosty ice-blue log drum with frozen crystals, instrument icon"
ic bv-ring-ember "a log drum wrapped in orange flames, instrument icon"
ic bv-spike-triangle "a simple wooden triangle arrow badge, badge icon"
ic bv-spike-arrow "a red charging arrow badge with leaf speed lines, badge icon"
ic bv-spike-diamond "a blue diamond wooden shield badge with a small arrow, badge icon"
ic bv-spike-star "a glowing purple star badge with an acorn, badge icon"
ic bv-spike-bolt "a yellow lightning arrow badge crackling with energy, badge icon"
# 내비·콘텐츠 10
ic bv-nav-hunt "a wooden sword crossed with a drumstick over a beaver dam, menu icon"
ic bv-nav-dodge "a wooden dam gate wall with a blue shield glow, menu icon"
ic bv-nav-beat "a glowing blue music note over a log drum, menu icon"
ic bv-nav-forge "a wooden anvil with a glowing blue crystal and hammer, menu icon"
ic bv-nav-profile "a cute beaver face portrait in a round wooden frame, menu icon"
ic bv-nav-attendance "a wooden calendar with a gold check mark and acorn, menu icon"
ic bv-nav-event "a golden trumpet with a blue banner flag, menu icon"
ic bv-nav-settings "a wooden gear with a leaf, menu icon"
ic bv-nav-ally "two cute beaver faces side by side in a wooden frame, menu icon"
ic bv-nav-shop "a wooden market stall with a chest of acorns and gems, menu icon"
# 견갑 4 · 프리미엄 무기 외형 3
ic bv-sh-scout "a leather scout shoulder pauldron with a leaf, armor icon"
ic bv-sh-shadow "a dark blue shadow shoulder pauldron with silver trim, armor icon"
ic bv-sh-ogre "a heavy purple log pauldron with iron studs, armor icon"
ic bv-sh-dragon "a golden dragon-scale pauldron with flame glow, armor icon"
ic bv-blade-crimson "a crimson glowing wooden drumstick with a ruby, weapon skin icon"
ic bv-blade-glacier "an ice-blue frosted drumstick with crystals, weapon skin icon"
ic bv-blade-solar "a golden sun-blessed drumstick with radiant glow, weapon skin icon"

# ── F. 소품 — 북 강화 16단계 · 활·지팡이 · 동료 무기 6 ──
pr() { have "prop-$1.png" || ARTGEN_REFS="$ICON_REFS" "$PY" art-gen/gen.py prop "$1" "$2" --seed "$3" --ip 0.35; }
for n in 00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15; do
  case $n in
    0[0-3]) d="a plain wooden log drum with a rope band";;
    0[4-7]) d="a wooden log drum with a blue ribbon band and a gold star";;
    0[8-9]|1[0-1]) d="a wooden log drum with gold trim bands and blue crystal studs";;
    *) d="a royal wooden log drum with a gold crown rim, blue crystals and glowing music notes";;
  esac
  pr "bv-drum$n" "$d, tier $n, held upright" "2026190$n"
done
pr bv-w-bow "a wooden recurve bow with a vine string and a leaf" 20261921
pr bv-w-staff "a crystal-topped wooden staff with a blue glow" 20261922
pr bv-w-mia "a small wooden dagger with a leaf-shaped blade" 20261923
pr bv-w-leon "a wooden bow with a leaf and acorn arrow" 20261924
pr bv-w-sera "a crystal-topped wooden wizard staff" 20261925
pr bv-w-garen "a big wooden log hammer with iron bands" 20261926
pr bv-w-ari "a long wooden spear with a flame crystal tip" 20261927
pr bv-w-nox "an acorn-pommel curved dagger with purple glow" 20261928

# ── G. 곡 커버 16 ──
cv() { have "cover-$1.png" || ARTGEN_REFS="$BG_REFS" "$PY" art-gen/gen.py cover "$1" "$2" --seed "$3"; }
cv bv-azure-sky "a cute beaver on a log raft under a bright azure sky with clouds and music notes" 20262001
cv bv-cherry-pop "a cute beaver under cherry blossom trees with pink petals and music notes" 20262002
cv bv-strawberry-lemonade "a cute beaver with a giant strawberry and lemonade glass, bright pink and yellow" 20262003
cv bv-turkish-march "a cute beaver marching with a drum and a golden crescent, warm gold" 20262004
cv bv-andromeda "a cute beaver gazing at a purple galaxy spiral above the lake" 20262005
cv bv-black-city-beat "a cute beaver drummer in a neon night city of wooden skyscrapers" 20262006
cv bv-dual-racing "two cute beavers racing log boats on a river with speed lines" 20262007
cv bv-duel "two cute beavers facing off with drumsticks at sunset" 20262008
cv bv-one-more-time "a cute beaver cheering with a glowing blue music note, confetti" 20262009
cv bv-plasma-gun "a cute beaver engineer with a glowing blue water cannon" 20262010
cv bv-arcade-overdrive "a cute beaver playing a wooden arcade machine with neon lights" 20262011
cv bv-cybernetic-overload "a cute beaver with cyan glowing goggles and circuit vines" 20262012
cv bv-happy-strum-day "a cute beaver strumming a flower guitar in a sunny meadow" 20262013
cv bv-pixel-rush "a cute pixel-art styled beaver running through a pixel forest" 20262014
cv bv-playful-pixels "cute pixel beavers bouncing on pixel logs, colorful" 20262015
cv bv-starlight-strut "a cute beaver strutting under starlight on the dam wall" 20262016
echo ALL_DONE
