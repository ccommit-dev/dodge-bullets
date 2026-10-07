#!/usr/bin/env bash
# 비버 테마 6차 — 아이콘 검수에서 두 시드 모두 작게 나온 설정 아이콘 재생성. ALL_DONE5 뒤에 돈다
set -u
until grep -q ALL_DONE5 art-gen/batch-beaver5.log 2>/dev/null; do sleep 20; done
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python
R=art-gen/ref/beaver
ICON_REFS="$R/crop-beaver-icon.png,$R/crop-forge-cards.png,$R/crop-chest.png,$R/crop-drum-crystal.png"
ARTGEN_REFS="$ICON_REFS" "$PY" art-gen/gen.py icon bv-nav-settings "a big wooden gear cog with a blue crystal center, large, filling the frame, settings icon" --seeds 20261811 20261812 --ip 0.4
echo ALL_DONE6
