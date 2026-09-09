#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/.."
PY=art-gen/.venv/Scripts/python
until grep -aq "shadow done" art-gen/batch-cape-shadow.log; do sleep 5; done
rm -f art-gen/out/prop-cape.png
$PY art-gen/gen.py prop cape "a single empty hooded cloak hanging on a wooden coat stand, dark red cloth with gold trim, garment only, no person, no mannequin body" --seed 20260981 --ip 0.1
echo "cape2 done"
