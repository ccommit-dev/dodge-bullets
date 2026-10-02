#!/usr/bin/env bash
# 사냥터·성문 방어 용(dragon.png) 재생성 — 기존 것은 256px 카툰(치비)체에 오른쪽 날개가 가장자리에서 잘려
# 반실사풍 고블린·오우거·그림자 늑대 사이에서 혼자 어색했다 (사용자: "리소스 어색한거 수정", 2026-10-02).
# 보라색(심연의 성)·네 발·접은 날개는 유지. 화풍은 고블린·오우거·늑대 원화를 IP 참조로.
set -u
PY=art-gen/.venv/Scripts/python
REF="public/titans/generated/monsters/ogre.png,public/titans/generated/monsters/goblin.png,public/titans/generated/monsters/shadow-wolf-clean.png"
"$PY" art-gen/gen.py monster dragon \
  "fierce purple drake dragon standing on four clawed legs, wings folded on back, curved horns, glowing amber eyes, dark violet scales, side view facing left, whole tail visible" \
  --ref "$REF" --ip 0.4 --seeds 20261005 20261006 20261007 20261008 20261009 20261010
