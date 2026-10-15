#!/usr/bin/env bash
# GPU 큐 9 (2026-10-15, 사용자: "어색한 거 모두 다시 재생성") — 동료 스킨 10종 × 3D 프레임 9칸(restyle-batch, 모델 한 번) · 북 0단계 새로 3장
cd /d/game/dodge-bullets || exit 1
exec > art-gen/queue9.log 2>&1
set -u
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python; O=art-gen/out
try() { for k in 1 2 3; do "$@" && return 0; echo "retry $k"; sleep 20; done; return 1; }
echo "== skins $(date +%T)"
try "$PY" art-gen/gen.py restyle-batch art-gen/skin-jobs.json
echo "== drum t0 $(date +%T)"
DRUMS="art-gen/out/drum-tier-backup/s01.png,art-gen/out/drum-tier-backup/s05.png,art-gen/out/drum-tier-backup/s15.png"
NEG=", multiple items, two drums, pair, sheet, grid, collection, character, animal, sword, blade, knife, ribbon, flag"
for k in 0 1 2; do sd=$(( 20264740 + k )); f="$O/prop-drum-t0-s$sd.png"; [ -f "$f" ] || { ARTGEN_NEG_EXTRA="$NEG" ARTGEN_REFS="$DRUMS" try "$PY" art-gen/gen.py prop "drum-t0" "single old weathered wooden barrel drum with blue and cream painted stripes and thin gold rings, a rope handle, glossy 3D toy render, one single cute chunky drum centered, plain white background, item only" --seed $sd --ip 0.4 && cp "$O/prop-drum-t0.png" "$f"; }; done
echo "ALL_DONE_QUEUE9 $(date +%T)"
