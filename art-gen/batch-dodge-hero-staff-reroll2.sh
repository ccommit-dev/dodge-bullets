#!/usr/bin/env bash
# 지팡이 1(당김)·3(복귀) 재추첨 2차 (2026-10-01) — 1차는 당김에 지팡이가 작고 복귀에 지팡이가 없었다. 두 손으로 든 지팡이를 요구한다.
set -u
PY=art-gen/.venv/Scripts/python
REF=public/titans/character/base/hero-idle.png
POSES=hero-attack-0,hero-attack-1,hero-attack-3,hero-idle-0
PROMPT="young fantasy archer hero, brown hair, white scarf, orange coat, holding one tall wooden wizard staff with both hands, large glowing blue crystal on the staff top, the full staff clearly visible"
for s in 41 42 43 44; do
  "$PY" art-gen/gen.py heroattack staff "$PROMPT" --ref "$REF" --weapon staff --pose-set "$POSES" --cn 0.6 --ip 0.6 --frames 1,3 --seed $((20260918 + s)) --tag "s$s"
done
echo "done"
