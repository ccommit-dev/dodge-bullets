#!/usr/bin/env bash
# 영웅 대기 시트 재생성 — 오른쪽을 보는 3/4 자세 (사냥터에서 몬스터 쪽). 후보: 시드 2 + 포즈(레온 이동 셀) 1 → PICK 시드로 코스튬 2종.
set -u
cd "$(dirname "$0")/.."
PY=art-gen/.venv/Scripts/python
HERO="young male adventurer, short dark hair, blue tunic, brown belt, orange scarf, dark trousers, boots"
if [ -z "${PICK:-}" ]; then
  $PY art-gen/gen.py heroidle base "$HERO" --seeds 20260915 20260916
  $PY art-gen/gen.py heroidle base "$HERO" --seed 20260915 --pose-from art-gen/ref/leon-run.png
else
  $PY art-gen/gen.py heroidle ember "young male adventurer, crimson ember armor with glowing orange cracks, dark red scarf, ash grey trousers" --seed "$PICK" ${POSE:+--pose-from "$POSE"}
  $PY art-gen/gen.py heroidle frost "young male adventurer, pale ice blue frost armor with silver rime, white fur collar scarf" --seed "$PICK" ${POSE:+--pose-from "$POSE"}
fi
echo "batch-hero-idle done"
# 2차 후보: 색 지시(주황 스카프)를 앞에, IP-Adapter 0.4 (동료 참조의 청록 스카프가 섞였다)
if [ -z "${PICK:-}" ]; then
  $PY art-gen/gen.py heroidle base "orange scarf, blue tunic, young male adventurer, short dark hair, brown belt, dark trousers, boots" --seeds 20260917 20260918 --ip 0.4
fi
