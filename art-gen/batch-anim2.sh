#!/usr/bin/env bash
# 애니메이션 2판 전체 렌더 (2026-10-19) — 비버(주인공·동료 13·스킨 10) → 몬스터 31. 한 번에 Blender 하나(GPU 공유 — 사용자 작업 안 죽임)
# 복사본으로 돌린다(돌고 있는 배치 파일을 고치면 bash 가 줄 단위로 읽다 엉킨다): cp art-gen/batch-anim2.sh art-gen/_run-anim2.sh && bash art-gen/_run-anim2.sh
cd /d/game/dodge-bullets || exit 1
exec > art-gen/batch-anim2.log 2>&1
BL="C:/Program Files/Blender Foundation/Blender 5.2/blender.exe"
BEAVERS="hero mia leon sera garen ari nox luna volt bronn orion ember pyro marina garen-magma leon-frost ari-blaze nox-abyss luna-eclipse bronn-iron orion-nova ember-ruby season-1 season-2"
MONSTERS="abyss-titan ancient-treant armored-ogre bone-dragon dragon fire-demon flame-wyvern-clean frost-wolf goblin goblin-shaman goblin-warlord golden-lion-clean hellhound lava-drake magma-golem magma-imp minotaur moon-wolf-king-clean moss-golem-clean ogre ruin-sentinel shadow-wolf-clean skeleton-goblin slime spider-queen stone-troll storm-drake thorn-boar-king void-imp void-lich wolf-king-clean"
for w in $BEAVERS; do echo "== $w $(date +%T)"; "$BL" -b -P art-gen/blender/render_anim2.py -- "$w" > /dev/null 2>&1 && echo "DONE $w" || echo "FAIL $w"; done
for w in $MONSTERS; do echo "== $w $(date +%T)"; "$BL" -b -P art-gen/blender/render_anim2.py -- "$w" > /dev/null 2>&1 && echo "DONE $w" || echo "FAIL $w"; done
echo "ALL_DONE_ANIM2 $(date +%T)"
