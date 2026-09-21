#!/usr/bin/env bash
# 앱 셸 배경판 — 지금은 .titans-layer 가 순수 CSS 그라데이션(남색 + 시안 발광)이라
# 전장·아이콘은 그림인데 화면 전체는 웹 대시보드처럼 보인다 (2026-09-21 사용자 지적).
# UI 가 위에 얹히는 판이므로 가운데를 비우고 어둡게 — 인물·글자·강한 대비는 네거티브로 막는다.
set -u
PY=art-gen/.venv/Scripts/python
"$PY" art-gen/gen.py backdrop hub \
  "ancient stone fortress terrace at dusk overlooking a vast misty valley, distant mountains, banners, warm lantern glow far below, deep blue and amber" \
  --seeds 20260941 20260942 20260943 20260944
