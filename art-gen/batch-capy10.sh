#!/usr/bin/env bash
# 카피 10차 (2026-10-13, 사용자: "이전 리소스가 남아있어 모두 비버로 재생성") — 주간 도전(그림자 시험) 상대 8종: 옛 인간 원화 → 그림자 비버.
# 1차 시도는 프롬프트가 131토큰(CLIP 77 초과)이라 "그림자·보라 털"이 잘려 평범한 갈색 비버가 나왔다 → 짧게, 그림자 특징을 앞에. 방향은 배치 때 facing-scan 으로 왼쪽 맞춤
set -u
export ARTGEN_THEME=beaver ARTGEN_LOOK=flat
PY=art-gen/.venv/Scripts/python; O=art-gen/out
REFS="$O/char-capy2-sera-idle-s20262743.png,$O/char-capy2-bronn-idle-s20262749.png,$O/char-capy2-ember-idle-s20262651.png"
LEFT="facing left, nose pointing left"
have() { [ -f "$O/$1" ]; }
sh() { for sd in $3 $(( $3 + 100 )); do have "char-capy10-$1-idle-s$sd.png" || { ARTGEN_FACE="$LEFT" ARTGEN_REFS="$REFS" "$PY" art-gen/gen.py char "capy10-$1" "DARK PURPLE furred shadow beaver $2, glowing violet eyes, chibi, paddle tail, full body" --no-pose --seed "$sd" --ip 0.3 --states idle && cp "$O/char-capy10-$1-idle.png" "$O/char-capy10-$1-idle-s$sd.png"; }; done; }
sh swordsman  "swordsman with a dark katana" 20262901
sh tracker    "tracker with a hood and crossbow" 20262902
sh ascetic    "monk with prayer beads and staff" 20262903
sh gatekeeper "gatekeeper with a tall shield and spear" 20262904
sh wanderer   "wanderer with a tattered cape and stick" 20262905
sh executor   "executor with a huge axe and iron mask" 20262906
sh observer   "observer with a crystal orb and wide hat" 20262907
sh blacksmith "blacksmith with a heavy hammer and apron" 20262908
echo ALL_DONE_CAPY10
