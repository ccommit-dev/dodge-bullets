#!/usr/bin/env bash
# 화살 원정 영구 스킬 아이콘 6종 (2026-09-28).
# 참고 게임처럼 스킬마다 한눈에 구분되는 아이콘이 필요하다. 화풍은 기존 보상 아이콘(출석)을 IP 앵커로.
set -u
PY=art-gen/.venv/Scripts/python
gen() { "$PY" art-gen/gen.py icon "dskill-$1" "$2" --seed 20260991 --ip 0.5; }
gen slash      "a curved silver sword slash arc with sharp wind streaks"
gen ultimate   "a brilliant white crescent blade flash bursting outward"
gen footwork   "a pair of winged leather boots with motion streaks"
gen afterimage "three overlapping translucent blue silhouettes of a cloak, motion trail"
gen reflect    "a golden arrow bouncing off a round mirror shield"
gen guard      "an ornate blue heart amulet with a silver guard frame"
