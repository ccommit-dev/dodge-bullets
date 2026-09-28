#!/usr/bin/env bash
# 원거리 스킬 아이콘 5종 + 원거리 무기 2종 (2026-09-28).
# 스킬을 근접(검격·보법)에서 원거리 요격으로 다시 설계하면서 아이콘도 새로 뽑는다.
# 1차에서 icon_refs(출석 보상)가 화풍을 너무 끌어 전부 같은 구슬이 됐다 — IP 0.25 로 낮춘다.
set -u
PY=art-gen/.venv/Scripts/python
ico() { "$PY" art-gen/gen.py icon "dskill-$1" "$2" --seed 20261001 --ip 0.25; }
ico volley   "three silver arrows flying in a tight spread, sharp motion streaks"
ico pierce   "one long golden arrow piercing straight upward through a shattered target ring"
ico flame    "a burning orange fireball with a trailing flame tail"
ico frost    "a pale blue circular frost shockwave ring with ice shards"
ico chain    "a branching yellow lightning bolt splitting into three forks"
ico ultimate "two crossed brilliant white energy slashes forming an X flash, radiating light"
# 원거리 무기 — 주인공이 장착한다 (prop: 좌하→우상 대각선, place-props 가 세로 정렬)
"$PY" art-gen/gen.py prop "w-expbow"   "a single ornate elven longbow alone, curved limbs, taut string, nothing else" --ip 0.2
"$PY" art-gen/gen.py prop "w-expstaff" "a single crystal mage staff alone, glowing blue gem at the top, nothing else" --ip 0.2
