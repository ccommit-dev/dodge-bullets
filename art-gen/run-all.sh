#!/usr/bin/env bash
# 분리 실행용: 동료 → 나머지. 툴 타임아웃과 무관하게 끝까지 돈다. 진행은 run-all.log
cd "$(dirname "$0")"
echo "RUN-ALL START $(date +%H:%M:%S)"
bash batch-allies.sh
bash batch-rest.sh
echo "RUN-ALL DONE $(date +%H:%M:%S)"
