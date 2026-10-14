#!/usr/bin/env bash
# 카피 12차-c (2026-10-14) — 12차 레온·아리·가렌의 흰 끝 여우 꼬리(nox·mia_dark 참조에서 옴)를 비버 꼬리로.
# 참조 = 자기 현재 대기(오른쪽 ¾ · 의상) + bronn(오른쪽 · 갈색 납작 꼬리), IP 0.5. "brown flat paddle beaver tail" 를 앞쪽에.
set -u
export ARTGEN_THEME=beaver ARTGEN_LOOK=flat
PY=art-gen/.venv/Scripts/python; O=art-gen/out
FACE="three-quarter view facing right, body turned right, tail behind on the left"
have() { [ -f "$O/$1" ]; }
pf() { for k in 0 1 2 3 4 5; do sd=$(( $3 + k )); have "char-capy12-$1-idle-s$sd.png" || { ARTGEN_FACE="$FACE" ARTGEN_REFS="$O/char-$1-idle.png,$O/char-bronn-idle.png" "$PY" art-gen/gen.py char "capy12-$1" "brown flat paddle beaver tail without white tip, $2, $FACE, chibi beaver, round body, full body" --no-pose --seed "$sd" --ip 0.5 --states idle && cp "$O/char-capy12-$1-idle.png" "$O/char-capy12-$1-idle-s$sd.png"; }; done; }
pf leon  "olive green bucket hat, green vest, spear archer" 20263361
pf ari   "red hood, red cape, white belly, flame-tipped spear dragoon" 20263371
pf garen "red pointed knight helmet, silver chest armor knight" 20263381
echo ALL_DONE_CAPY12C
