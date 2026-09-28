#!/usr/bin/env bash
# 원정 칩 6종 아이콘 (2026-09-28).
# 가이드 2순위 — "모든 런에 걸쳐 능력치를 올려 주는 칩과 장비 슬롯. 랜덤에 좌우되지 않는 패시브".
# 스킬 아이콘(구슬·문양)과 섞이지 않게 **회로판 조각** 형태로 통일한다.
set -u
PY=art-gen/.venv/Scripts/python
chip() { "$PY" art-gen/gen.py icon "dchip-$1" "$2, a small hexagonal circuit chip plate, glowing etched lines, metal frame" --seed 20261108 --ip 0.2; }
chip focus    "a teal targeting reticle etched into the plate"
chip barrage  "three parallel silver arrow marks etched into the plate"
chip ember    "an orange ember flame mark etched into the plate"
chip rime     "a pale blue snowflake mark etched into the plate"
chip vitality "a green heart-shaped core glowing in the plate"
chip edge     "a white crossed-blade mark etched into the plate"
