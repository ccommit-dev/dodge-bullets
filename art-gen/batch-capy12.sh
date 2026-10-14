#!/usr/bin/env bash
# 카피 12차 (2026-10-14, 사용자: "동료 애니메이션 … 오른쪽을 바라보는 리소스로 모두") — 정면으로 남은 4명(leon·ari·sylph·garen)만.
# 11차(측면, IP 0.15)는 화풍이 무너졌다 → 이미 오른쪽 ¾ 로 채택된 같은 화풍 동료(nox·orion·mia_dark) 컷아웃을 IP 0.5 참조로: 화풍과 자세를 같이 끈다.
set -u
export ARTGEN_THEME=beaver ARTGEN_LOOK=flat
PY=art-gen/.venv/Scripts/python; O=art-gen/out
REFS="$O/char-nox-idle.png,$O/char-orion-idle.png,$O/char-mia_dark-idle.png"
FACE="three-quarter view facing right, body turned right, tail behind on the left"
have() { [ -f "$O/$1" ]; }
pf() { for k in 0 1 2 3 4 5; do sd=$(( $3 + k )); have "char-capy12-$1-idle-s$sd.png" || { ARTGEN_FACE="$FACE" ARTGEN_REFS="$REFS" "$PY" art-gen/gen.py char "capy12-$1" "$FACE, chibi $2 beaver, round body, paddle tail, full body" --no-pose --seed "$sd" --ip 0.5 --states idle && cp "$O/char-capy12-$1-idle.png" "$O/char-capy12-$1-idle-s$sd.png"; }; done; }
pf leon  "archer, tan fur, olive green bucket hat, green vest, golden arrow and spear" 20263301
pf ari   "dragoon, red hood with orange flame crest, red cape, white belly, long silver spear" 20263311
pf garen "knight, dark brown fur, red pointed helmet, silver chest armor" 20263321
pf sylph "wind mage, mint green leaf hood, white hair tuft, small spear" 20263331
echo ALL_DONE_CAPY12
