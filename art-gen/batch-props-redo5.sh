#!/usr/bin/env bash
# 강화 검 4·5·10·14티어 — 두 번째 검이 붙은 생성물을 시드 후보 2개씩 다시 뽑는다 (candidate-<id>-<seed>.png 로 저장, 선별은 scripts/pick-sword-candidates.mjs)
set -u
cd "$(dirname "$0")/.."
PY=art-gen/.venv/Scripts/python
gen() { local id="$1" seed="$2"; shift 2; [ -f "art-gen/out/prop-cand-$id-$seed.png" ] && return; "$PY" art-gen/gen.py prop "cand-$id-$seed" "$@" --seed "$seed" --ip 0.15; }
for seed in 20260960 20260961; do gen s04 $seed "a single blue knight longsword alone, sapphire pommel, silver crossguard, nothing else"; done
for seed in 20260962 20260963; do gen s05 $seed "a single flaming longsword alone, blade wreathed in orange fire, nothing else"; done
for seed in 20260964 20260965; do gen s10 $seed "a single dragon slayer sword alone, crimson blade, dragon-scale guard, nothing else"; done
for seed in 20260966 20260967; do gen s14 $seed "a single infinity sword alone, blade of swirling magenta galaxy and stars, nothing else"; done
echo "redo5 done"
