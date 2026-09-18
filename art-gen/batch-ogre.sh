#!/usr/bin/env bash
# 오우거 전신 재생성 — 기존 ogre.png 는 허벅지에서 잘려 있었다 (2026-09-18 실측: 하단 여백 0%).
# 화풍은 기존 몬스터 원화를 IP 참조로 맞춘다. 저장소 루트에서 실행한다 (다른 배치와 같은 규칙).
set -u
PY=art-gen/.venv/Scripts/python
REF="public/titans/generated/monsters/ogre.png,public/titans/generated/monsters/ogre-king.png,public/titans/generated/monsters/goblin.png,public/titans/generated/monsters/moss-golem.png"
"$PY" art-gen/gen.py monster ogre \
  "huge red-skinned ogre brute with tusks, leather harness and loincloth, spiked wooden club in one hand, thick legs and bare feet standing on ground" \
  --ref "$REF" --ip 0.45 --seeds 20260918 20260919 20260920 20260921
