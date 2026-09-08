#!/usr/bin/env bash
# 보상 아이콘 배치 — 시즌 패스·토벌령·주간 도전·원정 일지·이벤트 상점 보상에 쓰는 실제 에셋.
# 이미 나온 out/icon-<id>.png 는 건너뛴다. 결과 배치: node scripts/place-icons.mjs
set -u
cd "$(dirname "$0")/.."
PY=art-gen/.venv/Scripts/python
gen() { local id="$1"; shift; if [ -f "art-gen/out/icon-$id.png" ]; then echo "skip $id"; return; fi; "$PY" art-gen/gen.py icon "$id" "$@"; }
gen gem            "cluster of glowing red ruby gems, faceted crystal, sparkling" --seed 20260908
gen ally-shard     "glowing blue crystal shard fragment with a small gold hero emblem inside, floating" --seed 20260909
gen boost          "golden winged hourglass with swirling blue time energy" --seed 20260910
gen ally-skin      "ornate fantasy costume set on a display stand, flowing cape and jeweled armor pieces, season limited outfit" --seed 20260911
gen weapon-fx      "fantasy sword with blazing magical aura trail, glowing runes on blade" --seed 20260912
gen forge-ticket   "wax-sealed parchment ticket scroll with an anvil emblem, gold trim" --seed 20260913
gen season-xp      "glowing golden star badge with laurel wreath, season rank emblem" --seed 20260914
echo "batch-icons done"
