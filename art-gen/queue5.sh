#!/usr/bin/env bash
# GPU 큐 5 (2026-10-15, 사용자: "만들어진 아이템 파츠들이 어색함 · 기존 북과 어울리게") — 파츠 6종 × 티어 3 × 시드 2 를 북 원화(s01·s05·s15) 참조로.
# 단색 색 입히기(나무·철·금)를 버리고 북처럼 티어마다 재질·장식이 다른 그림: 1 나무+잎·열매 · 2 나무+금 띠·파란 리본·별 · 3 금+파란 보석.
# 이어서 큐 4(동료·몬스터 프레임)를 이어 돈다 — frames 는 이미 있는 그림을 건너뛴다
cd /d/game/dodge-bullets || exit 1
exec > art-gen/queue5.log 2>&1
set -u
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python; O=art-gen/out
try() { for k in 1 2 3; do "$@" && return 0; echo "retry $k"; sleep 20; done; return 1; }
DRUMS="public/forge/swords/s01.png,public/forge/swords/s05.png,public/forge/swords/s15.png"
T1="glossy 3D toy render, warm polished wood and brown leather with brass rivets"
T2="glossy 3D toy render, polished silver with gold trim and gold rivets, light blue ribbon, small gold star"
T3="glossy 3D toy render, shiny gold with big blue crystal gems and gold sparkles, light blue ribbon"
gp() { for t in 1 2 3; do eval "TT=\$T$t"; for k in 0 1 2; do sd=$(( $3 + t * 10 + k )); f="$O/prop-g2-$1-$t-s$sd.png"; [ -f "$f" ] || { ARTGEN_NEG_EXTRA=", barrel, drum, bucket, keg, cask, planks, multiple items, sheet, grid, collection, bust, mannequin, leaves, fruit" ARTGEN_REFS="$DRUMS" try "$PY" art-gen/gen.py prop "g2-$1" "single $2, $TT, one single cute chunky item centered, plain white background, empty item only, no character, no animal" --seed $sd --ip 0.32 && cp "$O/prop-g2-$1.png" "$f"; }; done; done; }
echo "== gear $(date +%T)"
gp helmet "knight helmet with a visor, rounded dome helmet" 20264000
gp armor "chest breastplate armor" 20264100
gp gloves "pair of gauntlet gloves side by side" 20264200
gp boots "pair of adventure boots side by side" 20264300
gp bow "recurve bow with a string" 20264400
gp staff "magic staff with a round crystal orb on top" 20264500
echo "ALL_DONE_GEAR2 $(date +%T)"
echo "== frames $(date +%T)"
sed -n '/^REFS3D=/,/^echo "ALL_DONE_QUEUE4/p' art-gen/queue4.sh > art-gen/_q4body.sh
PY=$PY O=$O bash -c "set -u; export ARTGEN_THEME=beaver; PY=$PY; O=$O; try() { for k in 1 2 3; do \"\$@\" && return 0; echo retry \$k; sleep 20; done; return 1; }; source art-gen/_q4body.sh"
echo "ALL_DONE_QUEUE5 $(date +%T)"
