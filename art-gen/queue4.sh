#!/usr/bin/env bash
# GPU 큐 4 (2026-10-15) — 큐 3(몬스터 3D) 뒤: 동료 10명 프레임 9장 · 몬스터 31종 프레임 4장 (사용자: "애니메이션이 부족한 몬스터·동료 재생성")
cd /d/game/dodge-bullets || exit 1
exec > art-gen/queue4.log 2>&1
until grep -q ALL_DONE_QUEUE3 art-gen/queue3.log 2>/dev/null; do sleep 30; done
set -u
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python; O=art-gen/out
try() { for k in 1 2 3; do "$@" && return 0; echo "retry $k"; sleep 20; done; return 1; }
REFS3D="$O/char-r3d-mia-idle-s20263502.png,$O/char-r3d-garen-idle-s20263501.png"
al() { ARTGEN_REFS="$REFS3D" try "$PY" art-gen/gen.py frames "$1" "cute chibi beaver $3, round body, full body, single character" --ref "$O/char-r3d-$1-idle-s20263$2.png" --spec "art-gen/specs/ally-$4.json" --seed $5; }
al garen 501 "knight, red pointed helmet, silver armor, sword" melee 20263821
al ari 501 "dragoon, red hood, red cape, flame-tipped spear" melee 20263831
al nox 501 "rogue, purple hoodie, mask, dagger" melee 20263841
al bronn 502 "knight, silver chest armor, sword and round shield" melee 20263851
al leon 502 "archer, green bucket hat, green vest, spear" ranged 20263861
al sera 502 "wizard, blue star pointy hat, lavender cape, crystal staff" ranged 20263871
al luna 501 "paladin, gold helmet, silver armor, sword and shield" ranged 20263881
al volt 501 "engineer, orange overalls, goggles strap, wrench" ranged 20263891
al orion 501 "star mage, navy star cloak, wizard hat, magnifier staff" ranged 20263901
al ember 502 "princess, flower crown, pink dress, guitar" ranged 20263911
echo "== monsters $(date +%T)"
for f in $O/monster-r3d-*-s20263601.png; do
  id=$(basename "$f" | sed -e 's/^monster-r3d-//' -e 's/-s20263601.png$//')
  ARTGEN_REFS="$f" try "$PY" art-gen/gen.py frames "m-$id" "cute chibi $(echo "$id" | sed -e 's/-clean//' -e 's/-/ /g') monster, full body, single creature" --ref "$f" --spec art-gen/specs/monster.json --seed 20263951 --ip 0.75
done
echo "ALL_DONE_QUEUE4 $(date +%T)"
