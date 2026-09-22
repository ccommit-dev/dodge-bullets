#!/usr/bin/env bash
# 12티어 '차원 절단검' 재생성 — 기존 s12.png 는 얇은 칼에 두 번째 칼날이 대각선으로 겹친 생성물이고
# 어두워서 11(천공의 검, 파란)·13(신화의 종언, 금색)보다 약해 보인다. 16티어 중 12번째가 성장 역행.
# batch-props-redo5 와 같은 방식: 후보 2시드 → scripts/pick-sword-candidates.mjs 로 단일 검 판정 → 눈검사.
set -u
cd "$(dirname "$0")/.."
PY=art-gen/.venv/Scripts/python
for seed in 20260981 20260982 20260983; do
  [ -f "art-gen/out/prop-cand-s12-$seed.png" ] && continue
  "$PY" art-gen/gen.py prop "cand-s12-$seed" \
    "a single massive two-handed greatsword alone, thick wide violet blade split by a glowing rift down the center, ornate silver crossguard, nothing else" \
    --seed "$seed" --ip 0.15
done
echo "s12 done"
