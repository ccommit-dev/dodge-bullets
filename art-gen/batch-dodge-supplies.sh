#!/usr/bin/env bash
# 원정 보급 3종 아이콘 (2026-09-28).
# 스킬·칩·무기는 아이콘이 있는데 보급만 글자뿐이었다. 이름도 판타지 원정에 맞게 바꾸며 같이 뽑는다:
#   정예 선발(두루마리) · 예비 화살통(화살통) · 수호 부적(부적). 소모품이라 "물건"으로 읽혀야 한다.
set -u
PY=art-gen/.venv/Scripts/python
sup() { "$PY" art-gen/gen.py icon "dsup-$1" "$2" --seed 20261204 --ip 0.25; }
sup draft     "a rolled parchment scroll tied with red ribbon and a gold wax seal, fantasy item"
sup primed    "a leather quiver packed with feathered arrows, brass fittings, fantasy item"
sup insurance "a small carved wooden protective amulet on a cord with a glowing blue rune, fantasy item"
# 화살통이 두 개로 나왔다(활과 같은 증상) — 시드를 돌려 한 개짜리를 고른다
for s in 4301 4302 4303 4304; do
  "$PY" art-gen/gen.py icon "dsup-primed-c$s" "one single leather quiver, one object only, centered, packed with feathered arrows, brass fittings, fantasy item" --seed "$s" --ip 0.25
done
