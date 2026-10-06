#!/usr/bin/env bash
# 사냥터 모험가 스킬 20종 아이콘 (2026-10-06, 사용자: "스킬 체계랑 icon 이팩트 전면 재생성").
# 예전 아이콘은 선 몇 개짜리 SVG 글리프였다. 원소 색을 프롬프트 맨 앞에(칼날 은 · 불 주황 · 바람 청록 · 대지 호박 · 빛 금), 스킬마다 다른 물체.
# 시드 3개씩 — 아이콘은 물건을 두 개 그리는 일이 잦아 회색 시트로 골라 쓴다 (scripts/place-skill-icons.mjs).
set -u
PY=art-gen/.venv/Scripts/python
ico() { [ -f "art-gen/out/icon-tskill-$1-20261303.png" ] || "$PY" art-gen/gen.py icon "tskill-$1" "$2" --seeds 20261301 20261302 20261303 --ip 0.3; }
# 시동기 — 단일 타격
ico strike      "silver crescent sword slash arc, single curved blade swipe, glowing white edge, skill icon"
ico pierce      "silver spear tip piercing forward with a straight light streak, skill icon"
ico emberCut    "orange flaming sword blade with embers and sparks, skill icon"
ico frostEdge   "teal frozen sword blade covered in ice crystals, skill icon"
# 연계 A — 몸놀림·강화
ico crit        "teal swirling wind around a winged boot, speed lines, skill icon"
ico waterStep   "teal water ripple footprints on a pond, skill icon"
ico stoneGuard  "amber stone tower shield with rune carvings, skill icon"
ico galeChain   "teal tornado with chained links spinning, skill icon"
# 연계 B — 분신·원소
ico clone       "orange fire silhouette of a warrior twin, flame clone, skill icon"
ico thunderLink "golden lightning bolts chaining between three orbs, skill icon"
ico bloodMoon   "silver blades under a crimson blood moon, skill icon"
ico dragonBreath "orange dragon head breathing a cone of fire, skill icon"
# 마무리 — 큰 한 방
ico warcry      "golden star burst with a sword stabbing down, radiant, skill icon"
ico meteor      "orange flaming meteor falling with a fiery tail, skill icon"
ico tidalBurst  "teal giant tidal wave crashing in a burst, skill icon"
ico voidFinish  "silver blade cutting a dark purple void rift, skill icon"
# 패시브 — 문장
ico steel       "amber steel breastplate with a glowing breath swirl, skill icon"
ico focus       "silver eye inside a sword crosshair, focus emblem, skill icon"
ico guardianSoul "amber spirit flame inside a guardian helmet, skill icon"
ico elementalMastery "golden four element orbs orbiting in a ring, skill icon"
echo ALL_DONE
