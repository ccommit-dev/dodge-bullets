#!/usr/bin/env bash
# GPU 큐 1 (2026-10-15) — 장비 그림 → 애니메이션 파일럿(mia·slime). 한 번에 하나만 돈다. 이미 있는 결과는 건너뜀
cd /d/game/dodge-bullets || exit 1
exec > art-gen/queue1.log 2>&1
set -u
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python; O=art-gen/out
try() { for k in 1 2 3; do "$@" && return 0; echo "retry $k"; sleep 20; done; return 1; }
REFS3D="$O/char-r3d-mia-idle-s20263502.png,$O/char-r3d-garen-idle-s20263501.png"
prop() { for sd in $3; do [ -f "$O/prop-$1-s$sd.png" ] || { ARTGEN_REFS="$REFS3D" try "$PY" art-gen/gen.py prop "$1" "$2" --seed $sd && cp "$O/prop-$1.png" "$O/prop-$1-s$sd.png"; }; done; }
echo "== gear $(date +%T)"
prop gear-helmet "single cute chunky knight helmet for a beaver, rounded dome, wooden and metal bands" "20263701 20263702 20263703"
prop gear-armor "single cute chunky chest armor breastplate, rounded, wooden plates with metal rim" "20263711 20263712 20263713"
prop gear-gloves "one pair of cute chunky leather gauntlet gloves side by side" "20263721 20263722 20263723"
prop gear-boots "one pair of cute chunky leather adventure boots side by side" "20263731 20263732 20263733"
prop gear-bow "single cute chunky wooden bow with a string, acorn decoration" "20263741 20263742 20263743"
prop gear-staff "single cute chunky wooden magic staff with a glowing blue crystal on top" "20263751 20263752 20263753"
echo "== pilot frames $(date +%T)"
ARTGEN_REFS="$REFS3D" try "$PY" art-gen/gen.py frames mia "cute chibi beaver scout, teal scarf, leather vest, two daggers, round body, full body, single character" --ref "$O/char-r3d-mia-idle-s20263502.png" --spec art-gen/specs/ally-melee.json --seed 20263801
ARTGEN_REFS="$REFS3D" try "$PY" art-gen/gen.py frames slime "cute chibi green slime dragon monster with red frills and orange eyes, full body, single creature" --ref "$O/r3d-slime-78-s20263411.png" --spec art-gen/specs/monster.json --seed 20263811 --ip 0.75
echo "ALL_DONE_QUEUE1 $(date +%T)"
