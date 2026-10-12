#!/usr/bin/env bash
# 카피(납작 벡터 카툰) 1차 프로브 (2026-10-12, 사용자: "카피바라 키우기 느낌으로 디자인 다시 · 오른쪽 보기 · 땅을 걷는 맵")
#   주인공 ×2 · 동료 미아 ×1 · 몬스터 가시덤불 ×2 · 배경 초원 ×2 — 스타일이 잡히면 batch-capy2 로 전부
#   결과 stem: heroidle-capy1-* · char-capy1-* · monster-capy1-* · backdrop-capy1-*
set -u
export ARTGEN_THEME=beaver ARTGEN_LOOK=flat
PY=art-gen/.venv/Scripts/python; O=art-gen/out
REFS="art-gen/ref/capy/capy-hero.png,art-gen/ref/capy/capy-swim.png"
RIGHT="side view facing right, looking right"
LEFT="side view facing left, looking left"
BEAVER="cute chibi beaver, round body, two front teeth, paddle tail, single character, full body"
have() { [ -f "$O/$1" ]; }
have "heroidle-capy1-20271001.png" || ARTGEN_FACE="$RIGHT" ARTGEN_REFS="$REFS" "$PY" art-gen/gen.py heroidle capy1 "king beaver wearing a small golden crown and a short blue cape, cute chibi beaver, two big front teeth, flat paddle tail, round body, single character, full body" --seeds 20271001 20271002 --ip 0.25
have "char-capy1-mia-idle.png" || ARTGEN_FACE="$RIGHT" ARTGEN_REFS="$REFS" "$PY" art-gen/gen.py char "capy1-mia" "scout beaver with cream pale fur, teal scarf, light leather vest, two small wooden daggers, $BEAVER" --no-pose --seed 20271011 --ip 0.25 --states idle
have "monster-capy1-slime-s20271021.png" || ARTGEN_FACE="$LEFT" ARTGEN_REFS="$REFS" "$PY" art-gen/gen.py monster "capy1-slime" "round red thorny bramble ball monster with glowing orange eyes and an angry grin, tiny root legs" --ip 0.25 --seeds 20271021 20271022
have "backdrop-capy1-meadow-s20271031.png" || "$PY" art-gen/gen.py backdrop "capy1-meadow" "sunny dawn meadow: in the top strip a small wooden beaver cottage with a blue roof and a few round green trees stand on the ground line under a bright blue sky, below it a wide flat tan dirt ground" --seeds 20271031 20271032
echo ALL_DONE_CAPY1
