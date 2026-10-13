#!/usr/bin/env bash
# 카피 7차-c (2026-10-13) — 장갑 2·3 은 손 모양 참조(7차 장갑 1 아이콘), 갑옷 3 은 갑옷 1·2 아이콘 참조로 다시. 방패·가죽 참조가 실루엣을 끌던 것(7차-b)을 같은 종류 참조로 바꾼다
set -u
export ARTGEN_THEME=beaver ARTGEN_LOOK=flat ARTGEN_ICON_KIND=gear
PY=art-gen/.venv/Scripts/python; O=art-gen/out
have() { [ -f "$O/$1" ]; }
ic() { have "icon-capy7-$1-20277201.png" || ARTGEN_REFS="$3" "$PY" art-gen/gen.py icon "capy7-$1" "$2" --seeds 20277201 20277202 20277203 20277204 --ip 0.5; }
ic gloves-2 "a pair of iron gauntlet gloves with fingers, two gloves side by side" "$O/icon-capy7-gloves-1-20277101.png"
ic gloves-3 "a pair of golden royal gauntlet gloves with fingers and a red gem, two gloves side by side" "$O/icon-capy7-gloves-1-20277101.png"
ic armor-3 "a golden royal chest plate armor with shoulder pads and a green gem" "$O/icon-capy7-armor-1-20277101.png,$O/icon-capy7-armor-2-20277101.png"
echo ALL_DONE_CAPY7C
