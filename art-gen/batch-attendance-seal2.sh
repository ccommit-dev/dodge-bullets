#!/usr/bin/env bash
# 출석 '원정 인장' 아이콘 2차 (2026-10-01) — 1차의 "bow emblem" 은 리본(선물 매듭)으로 그려졌다. 활·화살을 피하고 밀랍 도장 자체를 요구한다.
set -u
PY=art-gen/.venv/Scripts/python
for s in 7201 7202 7203; do
  "$PY" art-gen/gen.py icon "att-seal2-$s" "a round crimson wax seal stamp on parchment, embossed with a simple arrowhead symbol, melted wax edges, single object, centered" --seed "$s" --ip 0.3
done
echo "done"
