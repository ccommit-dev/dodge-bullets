#!/usr/bin/env bash
# 추격대장(궁수) 재생성 — 기존 archer-captain.png 는 (2026-09-21 실측) 네 변이 전부 잘려 있다
# (활 상단·다리·왼팔·망토). 게임 표시 크기 70x118 에서도 잘린 게 보인다.
# monster 는 네거티브에 person/human 이 있어 사람에게 못 쓴다 — 같은 취지의 npc 명령을 쓴다.
set -u
PY=art-gen/.venv/Scripts/python
REF="art-gen/ref/leon-idle.png,art-gen/ref/garen-idle.png,art-gen/ref/mia-idle.png"
"$PY" art-gen/gen.py npc archer-captain \
  "female elite archer captain in dark red hooded cloak and ornate black armor, drawing a longbow with both hands, quiver on back, standing on the ground, boots visible" \
  --ref "$REF" --ip 0.5 --seeds 20260931 20260932 20260933 20260934
