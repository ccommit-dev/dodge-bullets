#!/usr/bin/env bash
# 카피 7차-b (장갑 2·3, 갑옷 3 추가 시드) — 파츠 아이콘 18장 ×2시드, 참조를 납작 SVG 파츠(한 점·흰 배경)로 바꿔 캐릭터가 섞이지 않게 (IP 0.4). 6차는 동료 참조에 끌려 투구 쓴 캐릭터가 나왔다
set -u
export ARTGEN_THEME=beaver ARTGEN_LOOK=flat ARTGEN_ICON_KIND=gear
PY=art-gen/.venv/Scripts/python; O=art-gen/out
REFS="public/titans/gear/gloves-1.png,public/titans/gear/boots-1.png,public/titans/gear/armor-2.png"  # 방패 참조가 2시드째에 새어 들어 방패를 뺀 참조
have() { [ -f "$O/$1" ]; }
ic() { have "icon-capy7-$1-20277103.png" || ARTGEN_REFS="$REFS" "$PY" art-gen/gen.py icon "capy7-$1" "$2" --seeds 20277103 20277104 20277105 20277106 --ip 0.4; }
ic armor-3 "a golden royal chest plate armor with a green gem"
ic gloves-2 "a pair of iron gauntlets"
ic gloves-3 "a pair of golden royal gauntlets"
echo ALL_DONE_CAPY7B
