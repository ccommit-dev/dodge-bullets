#!/usr/bin/env bash
# 검수에서 걸린 무기 재생성: 아리 창(인물이 섞임) · 4티어 푸른 기사검(3자루) — 시드·프롬프트 교체
set -u
cd "$(dirname "$0")/.."
PY=art-gen/.venv/Scripts/python
rm -f art-gen/out/prop-w-ari.png art-gen/out/prop-s04.png
$PY art-gen/gen.py prop w-ari "one long steel spear with red tassel below the spiral tip, wooden shaft, isolated weapon only" --seed 20260950 --ip 0.25
$PY art-gen/gen.py prop s04 "one blue knight sword, sapphire pommel, silver crossguard, straight blade, isolated single weapon only" --seed 20260951 --ip 0.25
echo "redo done"
