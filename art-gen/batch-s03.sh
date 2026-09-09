#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/.."
PY=art-gen/.venv/Scripts/python
until grep -aq "cape2 done" art-gen/batch-cape2.log; do sleep 5; done
rm -f art-gen/out/prop-s03.png
$PY art-gen/gen.py prop s03 "exactly one broad steel longsword alone, wide double-edged blade, steel crossguard, single object" --seed 20260974 --ip 0.12
echo "s03 done"
