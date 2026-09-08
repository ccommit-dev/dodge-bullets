#!/usr/bin/env bash
# 2차 재생성: 검에 인물이 섞인 티어 — 화풍 참조(동료 원화)가 사람을 부르므로 IP 0.2 + "isolated weapon only"
set -u
cd "$(dirname "$0")/.."
PY=art-gen/.venv/Scripts/python
until grep -aq "redo done" art-gen/batch-props-redo.log; do sleep 5; done
for id in s05 s08 s14; do rm -f "art-gen/out/prop-$id.png"; done
$PY art-gen/gen.py prop s05 "one flaming longsword, blade wreathed in orange fire, isolated weapon only, no person" --seed 20260952 --ip 0.2
$PY art-gen/gen.py prop s08 "one abyssal greatsword, wide dark violet blade with void glow, isolated weapon only, no person" --seed 20260953 --ip 0.2
$PY art-gen/gen.py prop s14 "one infinity sword, blade of swirling magenta galaxy and stars, isolated weapon only, no person" --seed 20260954 --ip 0.2
echo "redo2 done"
rm -f art-gen/out/prop-s06.png
$PY art-gen/gen.py prop s06 "one lightning longsword, straight blade crackling with yellow electricity, isolated weapon only, no person" --seed 20260955 --ip 0.2
echo "redo3 done"
