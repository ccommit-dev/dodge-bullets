#!/usr/bin/env bash
# GPU 큐 2 (2026-10-15) — 큐 1(장비·파일럿)이 끝나면: 투구·갑옷·활·지팡이를 물건 참조(신발·장갑·지팡이 채택본)로 다시. 동료 참조는 캐릭터를 끌었다
cd /d/game/dodge-bullets || exit 1
exec > art-gen/queue2.log 2>&1
until grep -q ALL_DONE_QUEUE1 art-gen/queue1.log 2>/dev/null; do sleep 20; done
set -u
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python; O=art-gen/out
try() { for k in 1 2 3; do "$@" && return 0; echo "retry $k"; sleep 20; done; return 1; }
OBJ="$O/prop-gear-boots-s20263731.png,$O/prop-gear-gloves-s20263721.png,$O/prop-gear-staff-s20263751.png"
prop() { for sd in $3; do [ -f "$O/prop-$1-s$sd.png" ] || { ARTGEN_REFS="$OBJ" try "$PY" art-gen/gen.py prop "$1" "$2, empty item only, no character, no animal, no face" --seed $sd --ip 0.3 && cp "$O/prop-$1.png" "$O/prop-$1-s$sd.png"; }; done; }
prop gear-helmet "single cute chunky round knight helmet, wooden dome with metal bands and a small acorn crest" "20263704 20263705 20263706 20263707"
prop gear-armor "single cute chunky chest armor breastplate, rounded wooden plates with a metal rim and leather straps" "20263714 20263715 20263716 20263717"
prop gear-bow "single cute chunky wooden recurve bow with a string and a small acorn charm" "20263744 20263745 20263746 20263747"
prop gear-staff "single cute chunky wooden magic staff with a glowing blue crystal on top" "20263754 20263755"
echo "ALL_DONE_QUEUE2 $(date +%T)"
