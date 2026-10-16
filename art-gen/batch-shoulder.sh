#!/usr/bin/env bash
# 견갑 아이콘 4종 (2026-10-16, 사용자: "무기란 견갑이 다른 아이콘 대비 통일성이 없네 수정") — 장비 파츠(queue5)와 같은 방식:
# 북 원화(s01·s05·s15)를 화풍 참조(IP 0.32)로, 같은 "glossy 3D toy render" 문구 · 같은 네거티브. 등급 색은 테두리와 같은 계열
# (일반 나무·가죽 · 희귀 은+파랑 · 영웅 보라 · 전설 금+주황 용비늘). 종류마다 시드 4개 → 눈으로 골라 art-gen/gear-picks.json "shoulder" 에.
cd /d/game/dodge-bullets || exit 1
exec > art-gen/batch-shoulder.log 2>&1
set -u
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python; O=art-gen/out
try() { for k in 1 2 3; do "$@" && return 0; echo "retry $k"; sleep 20; done; return 1; }
DRUMS="public/forge/swords/s01.png,public/forge/swords/s05.png,public/forge/swords/s15.png"
sp() { for k in 0 1 2 3; do sd=$(( $4 + k )); f="$O/prop-g2-shoulder-$1-s$sd.png"; [ -f "$f" ] || { ARTGEN_NEG_EXTRA=", barrel, drum, bucket, keg, cask, planks, multiple items, sheet, grid, collection, bust, mannequin, leaves, fruit, helmet, face" ARTGEN_REFS="$DRUMS" try "$PY" art-gen/gen.py prop "g2-shoulder-$1" "single $2, glossy 3D toy render, $3, one single cute chunky item centered, plain white background, empty item only, no character, no animal" --seed $sd --ip 0.32 && cp "$O/prop-g2-shoulder-$1.png" "$f"; }; done; }
echo "== shoulder $(date +%T)"
sp scout "rounded shoulder pauldron armor" "warm polished wood and brown leather with brass rivets" 20266000
sp shadow "layered shoulder pauldron armor" "polished dark navy steel with silver trim, light blue ribbon, small blue crystal" 20266100
sp ogre "big spiked shoulder pauldron armor" "polished purple iron with gold trim and ivory horn spikes, purple gem" 20266200
sp dragon "dragon scale shoulder pauldron armor" "shiny gold with orange dragon scales, small horns, big orange crystal gem" 20266300
echo "ALL_DONE_SHOULDER $(date +%T)"
