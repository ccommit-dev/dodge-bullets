#!/usr/bin/env bash
# 상태 포즈 img2img 시험 (2026-10-13 보완): 자기 대기 PNG 를 초기 이미지로 공격·피격 — 동료 2(mia·leon) · 몬스터 2(goblin·frost-wolf) · 주인공 1
set -u
export ARTGEN_THEME=beaver ARTGEN_LOOK=flat
PY=art-gen/.venv/Scripts/python; O=art-gen/out
st() { [ -f "$O/$2-attack.png" ] || "$PY" art-gen/gen.py states "$1" "$2" "$3" --seed "$4" --strength "${5:-0.42}"; }
st "$O/char-capy5-mia-idle.png"       "st-mia"       "scout beaver with cream pale ivory fur, teal scarf, light leather vest, two small wooden daggers, cute chibi beaver, facing right" 20263001
st "$O/char-capy5-leon-idle.png"      "st-leon"      "archer beaver with golden tan fur, green leaf cap, green tunic, wooden bow, cute chibi beaver, facing right" 20263002
st "public/titans/generated/monsters/goblin.png"     "st-goblin"     "small brown goblin monster with green leaf wings and glowing green eyes, flat vector cartoon, facing left" 20263003
st "public/titans/generated/monsters/frost-wolf.png" "st-frost-wolf" "white frost wolf cub with ice crystals, flat vector cartoon, facing left" 20263004
st "$O/hero-idle-0.png"               "st-hero"      "king beaver wearing a small golden crown and a short blue cape, cute chibi beaver, facing right" 20263005
echo ALL_DONE_STATES_TEST
