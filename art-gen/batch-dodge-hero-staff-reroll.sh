#!/usr/bin/env bash
# 지팡이 0·3프레임 재추첨 (2026-10-01) — 1차는 메김·복귀 프레임에 지팡이가 안 보였다. 손에 든 지팡이를 더 세게 요구한다.
set -u
PY=art-gen/.venv/Scripts/python
REF=public/titans/character/base/hero-idle.png
POSES=hero-attack-0,hero-attack-1,hero-attack-3,hero-idle-0
PROMPT="young fantasy archer hero, brown hair, white scarf, orange coat, gripping one tall wooden wizard staff with a glowing blue crystal, the staff clearly visible"
for s in 31 32 33; do
  "$PY" art-gen/gen.py heroattack staff "$PROMPT" --ref "$REF" --weapon staff --pose-set "$POSES" --cn 0.7 --ip 0.6 --frames 0,3 --seed $((20260918 + s)) --tag "s$s"
done
echo "done"
