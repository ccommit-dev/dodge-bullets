#!/usr/bin/env bash
# 카피 12차-b (2026-10-14) — 12차에서 의상이 흐른 가렌(빨간 투구)·아리(불꽃 볏 빨간 두건·망토)만 다시.
# 참조 = 자기 현재 대기(의상) + nox(오른쪽 ¾ 자세), IP 0.5. 의상 낱말을 프롬프트 앞쪽에.
set -u
export ARTGEN_THEME=beaver ARTGEN_LOOK=flat
PY=art-gen/.venv/Scripts/python; O=art-gen/out
FACE="three-quarter view facing right, body turned right, tail behind on the left"
have() { [ -f "$O/$1" ]; }
pf() { for k in 0 1 2 3 4 5; do sd=$(( $3 + k )); have "char-capy12-$1-idle-s$sd.png" || { ARTGEN_FACE="$FACE" ARTGEN_REFS="$O/char-$1-idle.png,$O/char-nox-idle.png" "$PY" art-gen/gen.py char "capy12-$1" "$2, $FACE, chibi beaver, round body, paddle tail, full body" --no-pose --seed "$sd" --ip 0.5 --states idle && cp "$O/char-capy12-$1-idle.png" "$O/char-capy12-$1-idle-s$sd.png"; }; done; }
pf garen "red pointed knight helmet, silver chest armor, dark brown fur knight" 20263341
pf ari   "red hood with orange flame crest, red cape, white belly, long silver spear dragoon" 20263351
echo ALL_DONE_CAPY12B
