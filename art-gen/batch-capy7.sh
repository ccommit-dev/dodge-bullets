#!/usr/bin/env bash
# 카피 7차 — 파츠 아이콘 18장 ×2시드, 참조를 납작 SVG 파츠(한 점·흰 배경)로 바꿔 캐릭터가 섞이지 않게 (IP 0.4). 6차는 동료 참조에 끌려 투구 쓴 캐릭터가 나왔다
set -u
export ARTGEN_THEME=beaver ARTGEN_LOOK=flat ARTGEN_ICON_KIND=gear
PY=art-gen/.venv/Scripts/python; O=art-gen/out
REFS="public/titans/gear/helmet-2.png,public/titans/gear/shield-2.png,public/titans/gear/weapon-3.png,public/titans/gear/boots-1.png"
have() { [ -f "$O/$1" ]; }
ic() { have "icon-capy7-$1-20277101.png" || ARTGEN_REFS="$REFS" "$PY" art-gen/gen.py icon "capy7-$1" "$2" --seeds 20277101 20277102 --ip 0.4; }
ic helmet-1 "a simple round wooden helmet with a green leaf on top"
ic helmet-2 "an iron knight helmet with a blue feather plume"
ic helmet-3 "a golden royal helmet with a red ruby on the front"
ic armor-1 "a simple brown leather vest chest armor"
ic armor-2 "an iron chest plate armor with blue trim"
ic armor-3 "a golden royal chest plate armor with a green gem"
ic weapon-1 "a simple short wooden sword"
ic weapon-2 "an iron broadsword with a blue hilt"
ic weapon-3 "a golden royal sword with a glowing red ruby in the hilt"
ic shield-1 "a round wooden shield with an iron rim"
ic shield-2 "an iron kite shield with a blue emblem"
ic shield-3 "a golden royal shield with a green gem"
ic gloves-1 "a pair of simple brown leather gloves"
ic gloves-2 "a pair of iron gauntlets"
ic gloves-3 "a pair of golden royal gauntlets"
ic boots-1 "a pair of simple brown leather boots"
ic boots-2 "a pair of iron armored boots"
ic boots-3 "a pair of golden royal boots"
echo ALL_DONE_CAPY7
