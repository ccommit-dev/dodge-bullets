#!/usr/bin/env bash
# GPU 큐 3 (2026-10-15) — 큐 2(장비 재생성) 뒤: 몬스터·대장 31종 3D restyle (0.78 · 3D 참조 IP 0.45). 동료 22장은 이미 있다
cd /d/game/dodge-bullets || exit 1
exec > art-gen/queue3.log 2>&1
until grep -q ALL_DONE_QUEUE2 art-gen/queue2.log 2>/dev/null; do sleep 20; done
set -u
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python; O=art-gen/out; M=public/titans/generated/monsters
MREF="$O/monster-bv5-dragon-s20262710.png,$O/monster-bv5-magma-golem-s20262748.png"
try() { for k in 1 2 3; do "$@" && return 0; echo "retry $k"; sleep 20; done; return 1; }
mon() { [ -f "$O/monster-r3d-$1-s20263601.png" ] || ARTGEN_REFS="$MREF" try "$PY" art-gen/gen.py restyle "$M/$1.png" "monster-r3d-$1" "cute chibi $2 monster" --strength 0.78 --seeds 20263601 --ip 0.45; }
mon slime "green slime dragon"; mon goblin "goblin"; mon shadow-wolf-clean "shadow wolf"; mon ogre "ogre"; mon dragon "dragon"
mon magma-imp "magma imp"; mon void-imp "void imp"; mon goblin-shaman "goblin shaman"; mon skeleton-goblin "skeleton goblin"; mon frost-wolf "frost wolf"
mon hellhound "hellhound"; mon stone-troll "stone troll"; mon armored-ogre "armored ogre"; mon lava-drake "lava drake"; mon storm-drake "storm drake"
mon moss-golem-clean "moss golem boss"; mon moon-wolf-king-clean "moon wolf king boss"; mon wolf-king-clean "wolf king boss"; mon flame-wyvern-clean "flame wyvern boss"; mon abyss-titan "abyss titan boss"
mon thorn-boar-king "thorn boar king boss"; mon ancient-treant "ancient treant boss"; mon ruin-sentinel "ruin sentinel golem boss"; mon magma-golem "magma golem boss"; mon void-lich "void lich boss"
mon goblin-warlord "goblin warlord boss"; mon spider-queen "spider queen boss"; mon minotaur "minotaur boss"; mon fire-demon "fire demon boss"; mon bone-dragon "bone dragon boss"; mon golden-lion-clean "golden lion"
echo "ALL_DONE_QUEUE3 $(date +%T)"
