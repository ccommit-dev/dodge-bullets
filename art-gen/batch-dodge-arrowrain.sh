#!/usr/bin/env bash
# 화살비 아이콘 (2026-10-01) — 일섬 시절의 검 문장(ultimate.png)이 그대로 남아 있었다. 시드 4개를 뽑아 눈으로 고른다.
set -u
PY=art-gen/.venv/Scripts/python
for s in 6101 6102 6103 6104; do
  "$PY" art-gen/gen.py icon "dskill-arrowrain-$s" "a volley of golden arrows raining down from a dark storm cloud, many arrows falling, emblem, single object" --seed "$s" --ip 0.5
done
echo "done"
