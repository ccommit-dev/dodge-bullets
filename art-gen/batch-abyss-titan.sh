#!/usr/bin/env bash
# 심연 타이탄 재생성 — 기존 abyss-titan.png 는 (2026-09-21 실측) 부츠가 발등에서 잘려 있고
# 256px 로 다른 보스(512px)보다 작다. 심연 지역 보스이자 BOSS_ASSET 의 폴백이라 가장 자주 보인다.
# 오우거·고블린과 같은 monster 명령 (전신·단일 개체 프롬프트/네거티브 + 기존 보스 IP 참조).
set -u
PY=art-gen/.venv/Scripts/python
REF="public/titans/generated/monsters/abyss-titan.png,public/titans/generated/monsters/wolf-king-clean.png,public/titans/generated/monsters/moss-golem-clean.png"
"$PY" art-gen/gen.py monster abyss-titan \
  "towering dark knight titan in black spiked plate armor wreathed in purple void flames, glowing violet eyes, huge two-handed axe, heavy armored greaves and full sabatons planted on ground" \
  --ref "$REF" --ip 0.45 --seeds 20260921 20260922 20260923 20260924
