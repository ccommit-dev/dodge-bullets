#!/usr/bin/env bash
# 화살 원정 전용 스테이지 배경 4종 — 지금은 사냥터 지역 배경(초원·폐허·용암·심연)을 재사용하고
# 스테이지 이름(외곽 초소·붉은 협곡·왕실 사격장·검은 성문)과 맞지 않는다. 게다가 화살 가독성 때문에
# 62% 어둡게 덮어 무엇이 있는지 안 보인다 — 콘텐츠 고유의 장소로 읽히지 않는다 (2026-09-22).
# backdrop 명령을 쓴다: 가운데를 비우고 어둡게, 인물·글자·강한 대비는 네거티브로 막는다.
set -u
PY=art-gen/.venv/Scripts/python
"$PY" art-gen/gen.py backdrop dodge1 \
  "frontier fortress outpost wall at dawn, wooden palisade and watchtowers on both sides, open dirt road between them, distant banners, cold mist" \
  --seeds 20260971 20260972
"$PY" art-gen/gen.py backdrop dodge2 \
  "narrow red sandstone canyon at sunset, tall striated cliffs on both sides, dust haze, open sandy floor between the walls" \
  --seeds 20260971 20260972
"$PY" art-gen/gen.py backdrop dodge3 \
  "royal archery range courtyard at night, stone arcades and marble columns on both sides, straw targets on the walls, torch light, empty flagstone floor" \
  --seeds 20260971 20260972
"$PY" art-gen/gen.py backdrop dodge4 \
  "colossal black iron castle gate at night, huge portcullis in the distance, braziers along dark stone walls, storm clouds, empty courtyard floor" \
  --seeds 20260971 20260972
