#!/usr/bin/env bash
# GPU 큐 10 (2026-10-15) — 스킨 2차: 1~8칸을 그 스킨 0칸 결과를 IP 참조로(칸마다 디자인 통일) · 용암 가렌·황금 녹스는 0칸부터 다시
cd /d/game/dodge-bullets || exit 1
exec > art-gen/queue10.log 2>&1
set -u
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python
try() { for k in 1 2 3; do "$@" && return 0; echo "retry $k"; sleep 20; done; return 1; }
try "$PY" art-gen/gen.py restyle-batch art-gen/skin-jobs2.json
echo "ALL_DONE_QUEUE10 $(date +%T)"
