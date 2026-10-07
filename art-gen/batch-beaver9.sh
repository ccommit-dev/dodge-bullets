#!/usr/bin/env bash
# 비버 테마 9차 — 대기 검수에서 두 마리(레온)·잡동사니(가렌)로 나온 동료 대기 재생성, 시드 3개씩. ALL_DONE8 뒤에 돈다
set -u
until grep -q ALL_DONE8 art-gen/batch-beaver8.log 2>/dev/null; do sleep 20; done
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python
R=art-gen/ref/beaver
BEAVER="cute chibi anthropomorphic beaver, big round sparkling eyes, rosy cheeks, two front teeth, flat paddle tail, exactly one single character, full body, nothing else in frame, no props on the ground"
CHAR_REFS="$R/crop-beaver-king.png,$R/crop-ally-ranger.png,$R/crop-ally-wizard.png,$R/crop-ally-princess.png"
one() { for sd in $3 $4 $5; do ARTGEN_REFS="$CHAR_REFS" "$PY" art-gen/gen.py char "bv2-$1" "$2, $BEAVER" --no-pose --seed "$sd" --ip 0.45 --states idle && cp "art-gen/out/char-bv2-$1-idle.png" "art-gen/out/char-bv2-$1-idle-s$sd.png"; done; }
one leon  "archer beaver with GOLDEN TAN fur, green leaf cap, green tunic, holding one wooden bow" 20261573 20261574 20261575
one garen "knight beaver with DARK CHOCOLATE brown fur, red acorn-cap helmet, holding one round wooden shield" 20261576 20261577 20261578
echo ALL_DONE9
