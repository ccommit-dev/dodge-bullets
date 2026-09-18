#!/usr/bin/env bash
# 하단 내비 아이콘 2종 — 동료·상점. 전에는 ✓ ♟ ▰ 같은 글자 기호라 사냥터·콘텐츠의 그림 아이콘과 따로 놀았다.
# 모험은 기존 스프라이트의 포털(event) 칸을 쓰고, 없는 둘만 새로 뽑았다. 저장소 루트에서 실행한다.
#
# ICON_NEG 가 person/character 를 막으므로 '동료'는 사람이 아니라 파티를 뜻하는 물건으로 간다.
# 첫 시도("세 장의 소환 카드")는 보석 문장이 나와 동료로 안 읽혔다 — 투구 셋으로 바꿨다.
set -u
PY=art-gen/.venv/Scripts/python
"$PY" art-gen/gen.py icon nav-ally \
  "three ornate knight helmets in silver blue and gold standing side by side" --seed 20260918 --ip 0.5
"$PY" art-gen/gen.py icon nav-shop \
  "a fantasy market stall with a striped purple awning, wooden counter and gold coins" --seed 20260918 --ip 0.5
# 뽑은 뒤: 알파 여백을 자르고 128px 정사각으로 앉혀 public/ui/content-icons/nav-{ally,shop}.png 로 넣는다.
