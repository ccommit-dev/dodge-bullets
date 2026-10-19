#!/usr/bin/env bash
# 애니메이션 2판 보정 렌더 (2026-10-19) — 칼·창 길이/임팩트 각 보정(beaver.WEAPON_SCALE · anim2.LONG_AIM) 전에 그린 비버 + 무기 뒤 표시(wb)를 넣은 주인공.
# 본 배치(batch-anim2.sh)가 끝난 뒤 돈다(한 번에 Blender 하나)
cd /d/game/dodge-bullets || exit 1
exec > art-gen/batch-anim2-fix.log 2>&1
BL="C:/Program Files/Blender Foundation/Blender 5.2/blender.exe"
until grep -q "ALL_DONE_ANIM2" art-gen/batch-anim2.log 2>/dev/null; do sleep 20; done
for w in garen ari nox bronn pyro garen-magma ari-blaze nox-abyss bronn-iron hero; do echo "== $w $(date +%T)"; "$BL" -b -P art-gen/blender/render_anim2.py -- "$w" > /dev/null 2>&1 && echo "DONE $w" || echo "FAIL $w"; done
echo "ALL_DONE_FIX $(date +%T)"
