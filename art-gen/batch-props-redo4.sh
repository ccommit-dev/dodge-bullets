#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/.."
PY=art-gen/.venv/Scripts/python
until grep -aq "redo3 done" art-gen/batch-props-redo2.log; do sleep 5; done
rm -f art-gen/out/prop-w-ari.png art-gen/out/prop-s04.png
$PY art-gen/gen.py prop w-ari "a single long spear, exactly one weapon, steel leaf-shaped tip with red tassel, dark wooden shaft" --seed 20260957 --ip 0.2
$PY art-gen/gen.py prop s04 "a single blue knight longsword, exactly one weapon, sapphire pommel, silver crossguard" --seed 20260958 --ip 0.2
echo "redo4 done"
