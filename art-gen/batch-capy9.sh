#!/usr/bin/env bash
# 카피 9차 (2026-10-13, 사용자: "댐지키기 모드에 배경 잘려있는거 재생성") — 성문 방어 배경을 세로(832x1216)로 다시.
# 2차 가로 띠(720×492)는 폰 세로 화면에서 위가 잘려 하늘 그라데이션과 경계가 보였다 → 세로 한 장이 바닥선 위를 전부 덮는다
set -u
export ARTGEN_THEME=beaver ARTGEN_LOOK=flat ARTGEN_BG_SIZE=832x1216
PY=art-gen/.venv/Scripts/python; O=art-gen/out
have() { [ -f "$O/$1" ]; }
bg() { have "backdrop-capy9-$1-s$3.png" || "$PY" art-gen/gen.py backdrop "capy9-$1" "$2" --seeds "$3" "$4"; }
TALL="tall vertical composition, the gate stands on a flat ground line at the bottom quarter, wide open sky filling the upper two thirds, no characters"
bg dodge1 "a tall wooden log dam wall with a gate under a bright blue sky with soft clouds, $TALL" 20272911 20272912
bg dodge2 "a wooden palisade gate between pine trees under a dusk sky with stars, $TALL" 20272913 20272914
bg dodge3 "a cracked stone gate between broken pillars under an orange sunset sky, $TALL" 20272915 20272916
bg dodge4 "a dark iron gate in a lava rock wall under a red glowing sky with embers, $TALL" 20272917 20272918
bg dodge5 "a dark castle gate with purple crystals under a violet night sky, $TALL" 20272919 20272920
echo ALL_DONE_CAPY9
