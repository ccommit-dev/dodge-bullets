#!/usr/bin/env bash
# 성문 방어 스킬 무기 10종 (2026-10-02, 사용자: "아웃로 디펜스 참고해서 레벨별로 10개 스킬무기 장착하되 한 판에는 최대 4개").
# 기존 5속성(불·물·얼음·흙·번개) 아이콘은 그대로, 새 5종 아이콘 + 5장 구성의 둘째 장(달빛 숲) 전장 배경.
set -u
PY=art-gen/.venv/Scripts/python
"$PY" art-gen/gen.py backdrop dodge5 \
  "moonlit ancient forest clearing at night, giant twisted trees on both sides, silver moonbeams through the canopy, glowing mushrooms, open mossy path between the trunks" \
  --seeds 20261011 20261012 20261013
ico() { "$PY" art-gen/gen.py icon "$1" "$2" --seed "$3" --ip 0.3; }
for s in 20261021 20261022; do
  ico "dskill-wind-$s"   "a teal green spinning boomerang emblem with swirling wind gusts, golden rim" "$s"
  ico "dskill-poison-$s" "a purple poison dart emblem dripping green venom drops, golden rim" "$s"
  ico "dskill-holy-$s"   "a radiant white and gold holy scepter emblem with a beam of light, golden rim" "$s"
  ico "dskill-shadow-$s" "a dark violet four bladed shuriken emblem trailing black smoke, golden rim" "$s"
  ico "dskill-meteor-$s" "a flaming orange red meteor rock emblem falling diagonally with a fire tail, golden rim" "$s"
done
