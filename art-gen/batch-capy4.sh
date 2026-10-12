#!/usr/bin/env bash
# 카피 4차 — 서리 늑대 재생성 (흰 몸이 흰 배경과 섞여 컷아웃이 조각나 QA 41). 옅은 파랑 몸으로 (2026-10-12)
set -u
export ARTGEN_THEME=beaver ARTGEN_LOOK=flat
PY=art-gen/.venv/Scripts/python; O=art-gen/out
REFS="art-gen/ref/capy/capy-hero.png,art-gen/ref/capy/capy-swim.png"
LEFT="side view facing left, looking left"
have() { [ -f "$O/$1" ]; }
have "monster-capy4-frost-wolf-s20274001.png" || ARTGEN_FACE="$LEFT" ARTGEN_REFS="$REFS" "$PY" art-gen/gen.py monster "capy4-frost-wolf" "chunky pale ice-blue frost wolf monster with dark blue outlines, ice crystal spikes on its back, glowing pale blue eyes, four legs, solid body" --ip 0.25 --seeds 20274001 20274002 20274003
echo ALL_DONE_CAPY4
