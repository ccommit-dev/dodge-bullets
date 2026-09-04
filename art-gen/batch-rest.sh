#!/usr/bin/env bash
# 영웅 4상태(idle·attack 시트) → 보스 5종 피격·처치 → 코스튬 2종 → 비트 커버 16. batch-allies.sh 뒤에 실행.
set -e
cd "$(dirname "$0")"
PY=.venv/Scripts/python.exe
log() { echo "=== $* ($(date +%H:%M:%S))"; }
flt() { grep -E "^saved|\[wait\]|Error|error|Traceback"; }

log hero
[ -e out/hero-attack-3.png ] || $PY gen.py hero "young male adventurer hero, short dark navy hair, blue tunic with brown belt and orange scarf, dark trousers, brown boots, unarmed, roster painterly style" 2>&1 | flt

M=../public/titans/generated/monsters
log boss moss-golem-clean
[ -e out/boss-moss-golem-clean-defeat.png ] || $PY gen.py boss $M/moss-golem-clean.png "giant moss covered stone golem with glowing green rune core, thick outlines, monster concept art" 2>&1 | flt
log boss moon-wolf-king-clean
[ -e out/boss-moon-wolf-king-clean-defeat.png ] || $PY gen.py boss $M/moon-wolf-king-clean.png "giant silver moon wolf king with glowing blue markings, monster concept art" 2>&1 | flt
log boss wolf-king-clean
[ -e out/boss-wolf-king-clean-defeat.png ] || $PY gen.py boss $M/wolf-king-clean.png "giant armored dire wolf king with red eyes and bone armor, monster concept art" 2>&1 | flt
log boss flame-wyvern-clean
[ -e out/boss-flame-wyvern-clean-defeat.png ] || $PY gen.py boss $M/flame-wyvern-clean.png "flame wyvern dragon with molten scales and fire breath, monster concept art" 2>&1 | flt
log boss abyss-titan
[ -e out/boss-abyss-titan-defeat.png ] || $PY gen.py boss $M/abyss-titan.png "colossal abyss titan of dark stone and violet void energy, monster concept art" 2>&1 | flt

log costume ember
[ -e out/costume-ember-attack-3.png ] || $PY gen.py costume ember "young male adventurer in crimson ember armor with glowing orange cracks, dark red scarf, ash grey trousers, same face and pose" 2>&1 | flt
log costume frost
[ -e out/costume-frost-attack-3.png ] || $PY gen.py costume frost "young male adventurer in pale ice blue frost armor with silver rime, white fur collar scarf, same face and pose" 2>&1 | flt

log covers
cover() { [ -e "out/cover-$1.png" ] && return; $PY gen.py cover "$1" "$2" 2>&1 | flt; }
cover azure-sky "wide azure sky with rising sunlit clouds and soaring birds, synthwave gradient"
cover cherry-pop "pop art cherries and bubbles, bright pink and yellow, playful"
cover strawberry-lemonade "strawberry lemonade glass with lemon slices, summer sparkle, fast motion streaks"
cover turkish-march "grand piano keys marching with ottoman ornament patterns, gold and crimson"
cover plasma-gun "neon plasma gun firing electric bolts, dark sci-fi, boss rush"
cover dual-racing "two racing cars red versus blue at high speed, split composition, motion blur"
cover black-city-beat "black city skyline at night with heavy rock guitar silhouette, purple neon"
cover andromeda "andromeda galaxy nebula with techno grid, deep space synth"
cover one-more-time "clock and repeating stairs rising into light, endurance, warm gold"
cover duel "two crossed swords clashing with sparks, red and blue duel"
cover cybernetic-overload "cybernetic circuit brain overloading with hard trance energy, cyan and magenta"
cover arcade-overdrive "retro arcade cabinet with synthwave sunset grid, chrome and pink"
cover pixel-rush "8-bit pixel art hero dashing through chiptune blocks, bright primary colors"
cover playful-pixels "playful pixel creatures bouncing on a checkerboard, pastel"
cover happy-strum-day "acoustic guitar strumming with clapping hands and sunshine, warm folk"
cover starlight-strut "disco dancer silhouette strutting under starlight and mirror ball, swing gold"
echo "ALL REST DONE ($(date +%H:%M:%S))"
