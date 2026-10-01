#!/usr/bin/env bash
# 깨진 프레임 재추첨 (2026-10-01): 활 1프레임(당김) · 지팡이 1·2프레임. 시드 3개씩 뽑아 눈으로 고른다.
set -u
PY=art-gen/.venv/Scripts/python
REF=public/titans/character/base/hero-idle.png
POSES=hero-attack-0,hero-attack-1,hero-attack-3,hero-idle-0
PROMPT="young fantasy archer hero, brown hair, white scarf, orange coat"
for s in 11 12 13; do
  "$PY" art-gen/gen.py heroattack bow "$PROMPT" --ref "$REF" --weapon bow --pose-set "$POSES" --cn 0.7 --ip 0.6 --frames 1 --seed $((20260918 + s)) --tag "s$s"
done
for s in 21 22 23; do
  "$PY" art-gen/gen.py heroattack staff "$PROMPT" --ref "$REF" --weapon staff --pose-set "$POSES" --cn 0.7 --ip 0.6 --frames 1,2 --seed $((20260918 + s)) --tag "s$s"
done
echo "done"
