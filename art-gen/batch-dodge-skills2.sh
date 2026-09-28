#!/usr/bin/env bash
# 검격·일섬·반사 아이콘 재생성 — 1차는 icon_refs(출석 보상 아이콘)가 화풍을 너무 끌어
# 셋 다 같은 청금색 구슬/조개가 됐다. IP 를 0.25 로 낮추고 형태를 또렷하게 지시한다 (2026-09-28).
set -u
PY=art-gen/.venv/Scripts/python
gen() { "$PY" art-gen/gen.py icon "dskill-$1" "$2" --seed "$3" --ip 0.25; }
gen slash    "one large white curved sword blade cutting diagonally, sharp crescent motion streak, silver steel" 20260995
gen ultimate "two crossed brilliant white energy slashes forming an X flash, radiating light" 20260995
gen reflect  "a wooden arrow bouncing off a round blue steel shield, arrow shaft clearly visible, spark at impact" 20260995
