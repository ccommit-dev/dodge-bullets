#!/usr/bin/env bash
# 동료 8명 4상태 생성 — 점검 순서(루나·볼트 → SSR 6명). 포즈는 원본 계열 동료의 아틀라스 셀에서 추출.
set -e
cd "$(dirname "$0")"
PY=.venv/Scripts/python.exe
run() { [ -e "out/char-$1-hit.png" ] && { echo "skip $1 (done)"; return; }; echo "=== $1 ($(date +%H:%M:%S))"; $PY gen.py char "$1" "$2" --pose-from "$3" 2>&1 | grep -E "^saved|\[wait\]|Error|error|Traceback" ; }
run luna  "female holy paladin Luna, long silver hair, white and silver plate armor with gold filigree, white cape, radiant golden halo, greatsword of light" garen
run volt  "young male lightning engineer Volt, short spiky blond hair, brass goggles, yellow and teal jacket with copper gear armor, electric gauntlet crackling with lightning, wrench at belt" leon
run bronn "male magma knight Bronn, heavy obsidian plate armor with glowing lava cracks, molten orange trim, horned helmet, massive lava greatsword" garen
run iris  "female frost sorceress Iris, pale blue hair, ice crystal robe with silver embroidery, frost lance spear, snowflakes drifting" sera
run cain  "male lightning swordsman Cain, black hair with violet streak, dark iaido coat with gold lightning patterns, katana crackling with thunder" nox
run sylph "female wind spirit queen Sylph, long emerald hair, flowing translucent green and white dress with leaf motifs, wind spirit orbs floating, bare feet" sera
run orion "male star spear hunter Orion, dark navy armor with star constellation patterns, silver star spear, short blue hair, cape of night sky" leon
run ember "female phoenix warrior Ember, crimson and gold feathered armor, flaming red hair, phoenix wing motif cape, twin fire blades" ari
echo "ALL ALLIES DONE ($(date +%H:%M:%S))"
