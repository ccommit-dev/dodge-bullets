#!/usr/bin/env bash
# 비버 테마 15차 (2026-10-08) — 남은 글자 아이콘 대체: 가리키는 손(코치 말풍선 ☝), 닫기 X, 뒤로 화살표. ALL_DONE14 뒤에 돈다
set -u
until grep -q ALL_DONE14 art-gen/batch-beaver14.log 2>/dev/null; do sleep 30; done
export ARTGEN_THEME=beaver ARTGEN_CUT=rembg
PY=art-gen/.venv/Scripts/python; O=art-gen/out
IC_REFS="$O/icon-bv-gold-20261802.png,$O/icon-bv-event-chest-20261802.png,$O/icon-bv-boost-20261801.png,$O/icon-bv-expedition-seal-20261801.png"
ic() { [ -f "$O/icon-$1-20262202.png" ] || ARTGEN_REFS="$IC_REFS" "$PY" art-gen/gen.py icon "$1" "$2" --seeds 20262201 20262202 --ip 0.4; }
ic bv-ui-pointer "a cute beaver paw pointing upward, wooden badge, pointer icon"
ic bv-ui-close "a round wooden button with a bold X mark carved in, close icon"
ic bv-ui-back "a round wooden button with a bold left arrow carved in, back icon"
echo ALL_DONE15
