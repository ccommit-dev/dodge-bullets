#!/usr/bin/env bash
# 대장간 배경판 — 허브·마이페이지에 그린 배경판을 깔았으니 대장간만 평평한 주황 그라데이션으로
# 남으면 화면을 옮길 때 다시 웹처럼 보인다 (2026-09-21).
set -u
PY=art-gen/.venv/Scripts/python
"$PY" art-gen/gen.py backdrop forge \
  "dim blacksmith forge hall interior at night, distant glowing furnace, hanging chains and tools in shadow, embers floating, deep brown and ember orange" \
  --seeds 20260951 20260952 20260953 20260954
