#!/usr/bin/env bash
# 3D 전체 재생성 (2026-10-14, 사용자: "투디 스프라이트로 생성된 동료·몬스터·보스를 기존 동료처럼 3차원 리소스로") —
# 지금 원화(방향·의상 확정)를 restyle(img2img 0.78 · 3D 참조 IP 0.45)로 3D 토이 렌더로. 동료 11 × 시드 2 · 몬스터·대장 31 × 시드 1.
# CUDA unknown error(다른 GPU 작업과 겹침)는 3번까지 다시. 이미 있는 결과는 건너뛴다(다시 돌려도 이어서).
set -u
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python; O=art-gen/out; M=public/titans/generated/monsters
AREF="$O/char-bv5-mia-idle-s20262601.png,$O/char-bv5-leon-idle-s20262702.png"
MREF="$O/monster-bv5-dragon-s20262710.png,$O/monster-bv5-magma-golem-s20262748.png"
try() { for k in 1 2 3; do "$@" && return 0; echo "retry $k"; sleep 20; done; return 1; }
ally() { for sd in 20263501 20263502; do [ -f "$O/char-r3d-$1-idle-s$sd.png" ] || ARTGEN_REFS="$AREF" try "$PY" art-gen/gen.py restyle "$O/char-$2-idle.png" "char-r3d-$1-idle" "cute chibi beaver $3, three-quarter view facing right" --strength 0.78 --seeds $sd --ip 0.45; done; }
mon() { [ -f "$O/monster-r3d-$1-s20263601.png" ] || ARTGEN_REFS="$MREF" try "$PY" art-gen/gen.py restyle "$M/$1.png" "monster-r3d-$1" "cute chibi $2 monster" --strength 0.78 --seeds 20263601 --ip 0.45; }
ally mia mia "scout, teal scarf, leather vest, two daggers"
ally leon leon "archer, olive green bucket hat, green vest, spear"
ally sera sera "wizard, blue star pointy hat, lavender cape, crystal staff"
ally garen garen "knight, red pointed helmet, silver armor"
ally ari ari "dragoon, red hood, red cape, flame-tipped spear"
ally nox nox "rogue, purple hoodie, mask, dagger"
ally luna luna "paladin, silver circlet, silver armor, sword"
ally volt volt "engineer, orange overalls, blue goggles strap, wrench"
ally bronn bronn "knight, silver chest armor, sword"
ally orion orion "star mage, navy star cloak, wizard hat, magnifier staff"
ally ember ember "princess, flower crown, pink dress, guitar"
mon slime "green slime dragon"; mon goblin "goblin"; mon shadow-wolf-clean "shadow wolf"; mon ogre "ogre"; mon dragon "dragon"
mon magma-imp "magma imp"; mon void-imp "void imp"; mon goblin-shaman "goblin shaman"; mon skeleton-goblin "skeleton goblin"; mon frost-wolf "frost wolf"
mon hellhound "hellhound"; mon stone-troll "stone troll"; mon armored-ogre "armored ogre"; mon lava-drake "lava drake"; mon storm-drake "storm drake"
mon moss-golem-clean "moss golem boss"; mon moon-wolf-king-clean "moon wolf king boss"; mon wolf-king-clean "wolf king boss"; mon flame-wyvern-clean "flame wyvern boss"; mon abyss-titan "abyss titan boss"
mon thorn-boar-king "thorn boar king boss"; mon ancient-treant "ancient treant boss"; mon ruin-sentinel "ruin sentinel golem boss"; mon magma-golem "magma golem boss"; mon void-lich "void lich boss"
mon goblin-warlord "goblin warlord boss"; mon spider-queen "spider queen boss"; mon minotaur "minotaur boss"; mon fire-demon "fire demon boss"; mon bone-dragon "bone dragon boss"; mon golden-lion-clean "golden lion"
echo ALL_DONE_3D_ALL
