#!/usr/bin/env bash
# GPU 큐 8 (2026-10-15, 원화 감사) — 북 2단계(s02, 반투명 두 개짜리) 다시 · 상점 외형 북 스킨 3종(진홍·빙하·황금) 북 원화 참조로 · 큐 7 이 끝난 뒤
cd /d/game/dodge-bullets || exit 1
exec > art-gen/queue8.log 2>&1
set -u
until grep -q ALL_DONE_QUEUE7 art-gen/queue7.log 2>/dev/null; do sleep 10; done
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python; O=art-gen/out
try() { for k in 1 2 3; do "$@" && return 0; echo "retry $k"; sleep 20; done; return 1; }
DRUMS="art-gen/out/drum-tier-backup/s01.png,art-gen/out/drum-tier-backup/s05.png,art-gen/out/drum-tier-backup/s15.png"
NEG=", multiple items, two drums, pair, sheet, grid, collection, character, animal, sword, blade, knife"
pd() { for k in 0 1 2; do sd=$(( $3 + k )); f="$O/prop-$1-s$sd.png"; [ -f "$f" ] || { ARTGEN_NEG_EXTRA="$NEG" ARTGEN_REFS="$DRUMS" try "$PY" art-gen/gen.py prop "$1" "single $2, glossy 3D toy render, one single cute chunky drum centered, plain white background, item only" --seed $sd --ip 0.4 && cp "$O/prop-$1.png" "$f"; }; done; }
pd drum-t2 "small wooden hand drum with green braided rope bands and a light wood drumhead" 20264700
pd drum-crimson "crimson ruby drum, red lacquered wood with gold trim, glowing red gems" 20264710
pd drum-glacier "icy glacier drum, frosted pale blue wood with ice crystals and snow on the rim" 20264720
pd drum-solar "golden sun drum, shiny gold body with a radiant sun emblem and sparkles" 20264730
echo "ALL_DONE_QUEUE8 $(date +%T)"
