#!/usr/bin/env bash
# 원거리 무기 2종 재생성 (2026-09-28).
#
# 1차 결과(batch-dodge-skills3.sh)는 둘 다 **무기가 두 자루** 겹쳐 나왔다 — 연결 성분이 하나로 붙어
# 사각형 크롭으로 떼어낼 수 없고, 주인공 손에 겹쳐 그리면 허리춤에 얼룩처럼 보인다 (실측 스크린샷).
# "single ... alone, nothing else" 로도 막히지 않아 **시드를 여러 개 돌려 고른다**.
# 고르는 기준은 scripts/pick-weapon.mjs — 주성분 비(가늘고 긴가)로 한 자루를 자동 선별한다.
set -u
PY=art-gen/.venv/Scripts/python
for s in 4101 4102 4103 4104 4105 4106; do
  "$PY" art-gen/gen.py prop "w-cand-bow$s" \
    "one single elven longbow, one weapon only, isolated object, curved wooden limbs with a single taut bowstring, no arrow" \
    --seed "$s" --ip 0.15
done
for s in 4201 4202 4203 4204 4205 4206; do
  "$PY" art-gen/gen.py prop "w-cand-staff$s" \
    "one single wizard staff, one weapon only, isolated object, straight wooden shaft with one glowing blue crystal at the top" \
    --seed "$s" --ip 0.15
done
echo "done — node scripts/pick-weapon.mjs 로 한 자루짜리를 고르세요"
