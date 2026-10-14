#!/usr/bin/env bash
# 카피 11차 (2026-10-14, 사용자: "동료 애니메이션이 아직 왼쪽인 게 있다 · 오른쪽을 바라보는 리소스로 모두") — 16명 측면(프로필) 재생성.
# 5·8차는 "3/4 측면" 문구가 77토큰 뒤로 밀려 정면에 가까운 그림이 많았다 → "side view profile" 을 맨 앞에, 정면 참조가 자세를 끌지 않게 IP 0.15.
# 고르는 기준(사람 눈): 꼬리가 화면 왼쪽(몸 뒤) · 주둥이가 오른쪽 · 한쪽 눈만 크게. 왼쪽 프로필이 나오면 반전해서 쓴다.
set -u
export ARTGEN_THEME=beaver ARTGEN_LOOK=flat
PY=art-gen/.venv/Scripts/python; O=art-gen/out
REFS="$O/char-capy2-sera-idle-s20262743.png,$O/char-capy2-bronn-idle-s20262749.png,$O/char-capy2-ember-idle-s20262651.png"
SIDE="side view profile facing right, snout pointing right, tail behind on the left"
have() { [ -f "$O/$1" ]; }
pf() { for sd in $3 $(( $3 + 1 )) $(( $3 + 2 )) $(( $3 + 3 )); do have "char-capy11-$1-idle-s$sd.png" || { ARTGEN_FACE="$SIDE" ARTGEN_REFS="$REFS" "$PY" art-gen/gen.py char "capy11-$1" "$SIDE, chibi $2 beaver, paddle tail, full body" --no-pose --seed "$sd" --ip 0.15 --states idle && cp "$O/char-capy11-$1-idle.png" "$O/char-capy11-$1-idle-s$sd.png"; }; done; }
pf mia        "scout, cream fur, teal scarf, leather vest, two small daggers" 20263101
pf leon       "archer, golden tan fur, green leaf cap, green tunic, wooden bow" 20263111
pf sera       "wizard, lavender grey fur, blue star pointy hat, blue robe, crystal staff" 20263121
pf garen      "knight, dark brown fur, red helmet, round wooden shield, log hammer" 20263131
pf ari        "dragoon, auburn fur, red dragon cape, long flame-tipped spear" 20263141
pf nox        "rogue, charcoal fur, dark purple hood, twin daggers" 20263151
pf luna       "paladin, snow white fur, gold circlet, white gold armor, star shield" 20263161
pf volt       "engineer, orange fur, goggles, yellow overalls, big wrench" 20263171
pf bronn      "magma knight, ash grey fur, dark iron armor, lava hammer" 20263181
pf orion      "star mage, navy fur, constellation cloak, telescope staff" 20263191
pf ember      "princess, pink fur, flower crown, frilly dress, flower guitar" 20263201
pf iris       "ice knight, silver fur, blue white armor, crystal sword, shield" 20263211
pf cain       "assassin, dark grey fur, purple hood, curved dagger" 20263221
pf sylph      "wind mage, mint fur, green leaf hood cloak, leafy staff" 20263231
pf mia-dark   "shadow scout, purple hat, pink scarf, dark vest, two daggers" 20263241
pf sera-light "priestess, golden cream fur, white gold robe, sun staff" 20263251
echo ALL_DONE_CAPY11
