#!/usr/bin/env bash
# 강화 검 0~3티어 — 가늘어서 손에 들면 실처럼 보였다 → 폭 넓은 단검/장검으로 재생성
set -u
cd "$(dirname "$0")/.."
PY=art-gen/.venv/Scripts/python
for id in s00 s01 s02 s03; do rm -f "art-gen/out/prop-$id.png"; done
$PY art-gen/gen.py prop s00 "a single wide worn iron dagger alone, broad thick blade, chipped edge, plain wooden grip, nothing else" --seed 20260970 --ip 0.15
$PY art-gen/gen.py prop s01 "a single wide sturdy iron dagger alone, broad polished blade, leather grip, nothing else" --seed 20260971 --ip 0.15
$PY art-gen/gen.py prop s02 "a single broad bronze shortsword alone, wide warm metal blade, simple crossguard, nothing else" --seed 20260972 --ip 0.15
$PY art-gen/gen.py prop s03 "a single broad polished steel longsword alone, wide double-edged blade, steel crossguard, nothing else" --seed 20260973 --ip 0.15
echo "redo6 done"
