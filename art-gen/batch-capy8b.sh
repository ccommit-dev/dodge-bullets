#!/usr/bin/env bash
set -u
export ARTGEN_THEME=beaver ARTGEN_LOOK=flat
PY=art-gen/.venv/Scripts/python; O=art-gen/out
REFS="$O/char-capy2-sera-idle-s20262743.png,$O/char-capy2-bronn-idle-s20262749.png,$O/char-capy2-ember-idle-s20262651.png"
MREFS="$O/monster-capy2-bone-dragon-s20262759.png,$O/monster-capy2-lava-drake-s20262727.png,$O/monster-capy2-flame-wyvern-s20262737.png"
RIGHT="three-quarter side view turned to the right, head turned right, both eyes looking to the right edge, nose pointing right"
LEFT="three-quarter side view turned to the left, head turned left, both eyes looking to the left edge, nose pointing left"
BEAVER="cute chibi beaver, round body, two front teeth, paddle tail, single character, full body"
have() { [ -f "$O/$1" ]; }
one() { for sd in $3 $(( $3 + 100 )); do have "char-capy8-$1-idle-s$sd.png" || { ARTGEN_FACE="$RIGHT" ARTGEN_REFS="$REFS" "$PY" art-gen/gen.py char "capy8-$1" "$2, $BEAVER" --no-pose --seed "$sd" --ip 0.3 --states idle && cp "$O/char-capy8-$1-idle.png" "$O/char-capy8-$1-idle-s$sd.png"; }; done; }
four() { for sd in $3 $(( $3 + 1 )) $(( $3 + 2 )) $(( $3 + 3 )); do have "char-capy8-$1-idle-s$sd.png" || { ARTGEN_FACE="$RIGHT" ARTGEN_REFS="$REFS" "$PY" art-gen/gen.py char "capy8-$1" "$2, $BEAVER" --no-pose --seed "$sd" --ip 0.3 --states idle && cp "$O/char-capy8-$1-idle.png" "$O/char-capy8-$1-idle-s$sd.png"; }; done; }
four iris       "ice knight beaver with SILVER white fur, blue and white plate armor, crystal ice sword, short blue cape" 20262861
four cain       "assassin beaver with DARK GREY fur, black hooded cloak, purple scarf, two curved black daggers, narrow eyes" 20262871
four sylph      "wind sorceress beaver with MINT green fur, flowing green leaf cloak, silver hair tuft, wooden wind staff with leaves" 20262881
four mia-dark   "shadow scout beaver with DARK PURPLE fur, black scarf, dark leather vest, two shadow daggers, glowing violet eyes" 20262891
four sera-light "light priestess beaver with GOLDEN cream fur, white robe with gold trim, small glowing halo above the head, golden staff with sun orb" 20262801
echo ALL_DONE_CAPY8B
