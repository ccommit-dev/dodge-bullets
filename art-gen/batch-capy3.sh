#!/usr/bin/env bash
# 카피 3차 — QA 60 미만(미노타우로스 57)·늑대왕이 늑대가 아닌 것 재생성 (2026-10-12). batch-capy2 가 끝난 뒤 복사본으로 돈다
set -u
export ARTGEN_THEME=beaver ARTGEN_LOOK=flat
PY=art-gen/.venv/Scripts/python; O=art-gen/out
REFS="art-gen/ref/capy/capy-hero.png,art-gen/ref/capy/capy-swim.png"
LEFT="side view facing left, looking left"
have() { [ -f "$O/$1" ]; }
have "monster-capy3-minotaur-s20273001.png" || ARTGEN_FACE="$LEFT" ARTGEN_REFS="$REFS" "$PY" art-gen/gen.py monster "capy3-minotaur" "big round bull-headed minotaur monster with short horns, thick chunky body, holding a wooden axe, bold shape" --ip 0.25 --px 1024 --seeds 20273001 20273002 20273003
have "monster-capy3-wolf-king-s20273011.png" || ARTGEN_FACE="$LEFT" ARTGEN_REFS="$REFS" "$PY" art-gen/gen.py monster "capy3-wolf-king" "big grey wolf king monster with a small golden crown, thick fur mane, four legs, fangs" --ip 0.25 --px 1024 --seeds 20273011 20273012 20273013
echo ALL_DONE_CAPY3
