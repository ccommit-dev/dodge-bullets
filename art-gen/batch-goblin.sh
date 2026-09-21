#!/usr/bin/env bash
# 고블린 재생성 — 기존 goblin.png 는 오른쪽 방패가 세로로 잘려 있고(2026-09-21 실측) 발도 하단 0% 에 붙어 있다.
# 오우거와 같은 monster 명령: 기존 몬스터 원화를 IP 참조로 화풍을 고정하고 전신·소품 온전함을 프롬프트/네거티브로 건다.
set -u
PY=art-gen/.venv/Scripts/python
REF="public/titans/generated/monsters/ogre.png,public/titans/generated/monsters/goblin.png,public/titans/generated/monsters/moss-golem.png,public/titans/generated/monsters/wolf.png"
"$PY" art-gen/gen.py monster goblin \
  "small green goblin warrior with big pointed ears, leather cap and harness, curved dagger in one hand, a whole round wooden shield with iron rim in the other hand, thin legs and bare feet standing on ground" \
  --ref "$REF" --ip 0.45 --seeds 20260921 20260922 20260923 20260924
