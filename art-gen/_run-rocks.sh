#!/usr/bin/env bash
# 댐 방어전 낙석 전체 렌더 (art-gen/blender/rocks.py) — 그림 하나에 Blender 하나. 끝나면 node scripts/assemble-rocks.mjs
B="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"
cd "$(dirname "$0")/.."
fail=0
for ch in 0 1 2 3 4; do
  for s in pebble chunk shard boulder blast bit0 bit1 bit2 bit3; do
    timeout 180 "$B" -b -P art-gen/blender/rocks.py -- $ch $s > /dev/null 2>&1 || { echo "FAIL $ch-$s"; fail=$((fail+1)); }
  done
done
echo "done fail=$fail"; ls art-gen/out/b3d-rocks | wc -l
