#!/usr/bin/env bash
# 활을 당기는 주인공 4프레임 (2026-10-01) — 화살 원정은 활만 쓴다. 검 시트(hero-attack-sheet)는 지웠다.
#
#   bash art-gen/batch-dodge-hero-bow.sh  →  node scripts/make-hero-attack-sheet.mjs bow  (· staff)
#
# 1차(--no-pose, IP-Adapter 만)는 한 장에 인물이 2~4명 그려져(캐릭터 시트처럼) 쓸 수 없었다 — 자세 제어가 "한 명"도 강제한다.
# 자세 참조는 검 찌르기(hero-attack-*)뿐이지만 앞팔을 뻗은 attack-1·3 이 활을 든 팔과 맞는다.
# 프레임: 0 메김(attack-0 양팔 앞) · 1 당김(attack-1 앞팔 뻗음) · 2 놓음(attack-3) · 3 복귀(idle-0). 조건 0.7 로 뒷팔이 접히게 둔다.
set -u
PY=art-gen/.venv/Scripts/python
REF=public/titans/character/base/hero-idle.png
POSES=hero-attack-0,hero-attack-1,hero-attack-3,hero-idle-0
"$PY" art-gen/gen.py heroattack bow "young fantasy archer hero, brown hair, white scarf, orange coat" --ref "$REF" --weapon bow --pose-set "$POSES" --cn 0.7 --ip 0.6
"$PY" art-gen/gen.py heroattack staff "young fantasy archer hero, brown hair, white scarf, orange coat" --ref "$REF" --weapon staff --pose-set "$POSES" --cn 0.7 --ip 0.6
echo "done — node scripts/make-hero-attack-sheet.mjs bow / staff"
