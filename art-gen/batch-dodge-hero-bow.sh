#!/usr/bin/env bash
# 활을 당기는 주인공 4프레임 (2026-10-01) — 화살 원정은 활만 쓴다. 검 시트(hero-attack-sheet)는 지웠다.
#
# 아직 **돌리지 않았다**: 작성 시점에 GPU 를 다른 작업이 14.7/16.3GB 쓰고 있었다 (VRAM 가드가 막는다).
# GPU 가 비면:  bash art-gen/batch-dodge-hero-bow.sh  →  node scripts/make-hero-attack-sheet.mjs bow
# 그 다음 player.ts 의 "skill" 애니메이션에 시트를 다시 연결한다 (지금은 대기 시트 + 무기 당김 포즈).
# 자세 참조가 검 찌르기뿐이라 --no-pose 로 ControlNet 을 끄고 IP-Adapter(정체성)만 쓴다 — 프레임마다 시드가 +i 된다.
set -u
PY=art-gen/.venv/Scripts/python
REF=public/titans/character/base/hero-idle.png
"$PY" art-gen/gen.py heroattack bow "young fantasy archer hero, brown hair, white scarf, orange coat" --ref "$REF" --weapon bow --no-pose --ip 0.65
"$PY" art-gen/gen.py heroattack staff "young fantasy archer hero, brown hair, white scarf, orange coat" --ref "$REF" --weapon staff --no-pose --ip 0.65
echo "done — node scripts/make-hero-attack-sheet.mjs bow / staff"
