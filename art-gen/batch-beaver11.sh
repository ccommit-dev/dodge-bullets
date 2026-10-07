#!/usr/bin/env bash
# 비버 테마 11차 — 3차 주인공 대기(QA 최선)를 참조로 공격 프레임 북·활·지팡이 각 4장. ALL_DONE10 뒤에 돈다
#   nohup bash art-gen/batch-beaver11.sh > art-gen/batch-beaver11.log 2>&1 &
set -u
until grep -q ALL_DONE10 art-gen/batch-beaver10.log 2>/dev/null; do sleep 30; done
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python
O=art-gen/out
BEAVER="cute chibi anthropomorphic beaver, big round sparkling eyes, rosy cheeks, two front teeth, flat paddle tail"
BEST=$(node -e "const r=JSON.parse(require('child_process').execFileSync(process.execPath,['scripts/sprite-qa.mjs','--json','$O/heroidle-beaverking3-20261421.png','$O/heroidle-beaverking3-20261422.png','$O/heroidle-beaverking3-20261423.png'],{encoding:'utf8'}).trim().split('\n').pop());console.log(r[0].file)")
echo "hero idle ref: $BEST"
KING_REFS="$BEST,$O/char-bv2-luna-idle.png,$O/char-bv2-orion-idle.png"
for w in drum bow staff; do
  tag=""; [ "$w" != "drum" ] && tag="--tag $w"
  ARTGEN_REFS="$KING_REFS" "$PY" art-gen/gen.py heroattack beaverking3 "brown beaver king with a gold crown with a blue music note gem and a royal blue cape with gold trim, $BEAVER" --ref "$BEST" --weapon "$w" --no-pose --seed 20261423 --ip 0.6 $tag
done
echo ALL_DONE11
