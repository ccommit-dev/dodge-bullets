#!/usr/bin/env bash
# 3D 재생성 파일럿 (2026-10-14, 사용자: "투디 스프라이트로 생성된 동료·몬스터·보스를 기존 동료처럼 3차원 리소스로") —
# 지금 원화(방향·의상 확정)를 img2img(restyle)로 3D 토이 렌더로만 바꾼다. strength 0.50/0.62 × 시드 2 × 동료 2·몬스터 1
set -u
export ARTGEN_THEME=beaver
PY=art-gen/.venv/Scripts/python; O=art-gen/out
AREF="$O/char-bv5-mia-idle-s20262601.png,$O/char-bv5-leon-idle-s20262702.png"
MREF="$O/monster-bv3-moss-golem-s20261631.png,$O/monster-bv3-ogre-s20261607.png"
r() { ARTGEN_REFS="$2" "$PY" art-gen/gen.py restyle "$1" "$3" "$4" --strength "$5" --seeds 20263401 20263402 --ip 0.25; }
r "$O/char-mia-idle.png"   "$AREF" "r3d-mia-50"   "cute chibi beaver scout, teal scarf, leather vest, two daggers, facing right" 0.50
r "$O/char-mia-idle.png"   "$AREF" "r3d-mia-62"   "cute chibi beaver scout, teal scarf, leather vest, two daggers, facing right" 0.62
r "$O/char-garen-idle.png" "$AREF" "r3d-garen-50" "cute chibi beaver knight, red pointed helmet, silver armor, facing right" 0.50
r "$O/char-garen-idle.png" "$AREF" "r3d-garen-62" "cute chibi beaver knight, red pointed helmet, silver armor, facing right" 0.62
r "public/titans/generated/monsters/slime.png" "$MREF" "r3d-slime-50" "cute round slime monster, facing left" 0.50
r "public/titans/generated/monsters/slime.png" "$MREF" "r3d-slime-62" "cute round slime monster, facing left" 0.62
echo ALL_DONE_3D_PILOT
