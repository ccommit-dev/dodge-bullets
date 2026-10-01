#!/usr/bin/env bash
# 출석 보상 '원정 인장' 아이콘 (2026-10-01) — 골드 300/1,000 대신 인장을 주므로 아이콘이 필요하다. 시드 3개.
set -u
PY=art-gen/.venv/Scripts/python
for s in 7101 7102 7103; do
  "$PY" art-gen/gen.py icon "att-seal-$s" "a round red wax seal stamp with a small golden bow emblem pressed in, single object, centered" --seed "$s" --ip 0.35
done
echo "done"
