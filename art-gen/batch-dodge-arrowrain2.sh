#!/usr/bin/env bash
# 화살비 아이콘 2차 (2026-10-01) — 1차(참조 0.5)는 화살 없는 문장만 나왔다. 화살을 맨 앞에 두고 참조를 0.3 으로 낮춘다.
set -u
PY=art-gen/.venv/Scripts/python
for s in 6201 6202 6203 6204; do
  "$PY" art-gen/gen.py icon "dskill-arrowrain2-$s" "three golden arrows pointing straight down, falling from a small dark storm cloud at the top, arrowheads at the bottom, simple bold shapes, single icon" --seed "$s" --ip 0.3
done
echo "done"
