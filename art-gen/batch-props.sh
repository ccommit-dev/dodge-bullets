#!/usr/bin/env bash
# 무기 원화 배치 — 동료 장착 무기 6종(벡터 SVG 오버레이 대체) + 영웅 강화 검 16티어(SwordArt 벡터 대체).
# 이미 나온 out/prop-<id>.png 는 건너뛴다. 배치: node scripts/place-props.mjs
set -u
cd "$(dirname "$0")/.."
PY=art-gen/.venv/Scripts/python
gen() { local id="$1"; shift; if [ -f "art-gen/out/prop-$id.png" ]; then echo "skip $id"; return; fi; "$PY" art-gen/gen.py prop "$id" "$@"; }
# 동료 무기 (SpriteArt AllyWeapon)
gen w-mia   "pair of short curved steel daggers with teal wrapped grips" --seed 20260920
gen w-leon  "elegant recurve longbow of pale wood with silver tips and taut string" --seed 20260921
gen w-sera  "slender mage staff with a floating violet crystal orb at the top" --seed 20260922
gen w-garen "massive two-handed greatsword with gold guard and blue gem" --seed 20260923
gen w-ari   "long knight lance with red tassel and steel spiral tip" --seed 20260924
gen w-nox   "black curved assassin blade with purple runes" --seed 20260925
# 영웅 강화 검 16티어 (forge/model FORGE_TIERS)
gen s00 "worn iron dagger, chipped, plain wooden grip" --seed 20260930
gen s01 "sturdy iron dagger, clean edge, leather grip" --seed 20260931
gen s02 "bronze longsword, warm metal, simple crossguard" --seed 20260932
gen s03 "polished steel longsword, straight double edge" --seed 20260933
gen s04 "blue knight sword with sapphire pommel and silver guard" --seed 20260934
gen s05 "flaming sword, blade wreathed in orange fire" --seed 20260935
gen s06 "lightning sword, blade crackling with yellow electricity" --seed 20260936
gen s07 "frost lord sword, ice crystal blade with cold mist" --seed 20260937
gen s08 "abyssal greatsword, dark violet blade with void glow" --seed 20260938
gen s09 "starlight magic sword, glowing pink-white blade with sparkles" --seed 20260939
gen s10 "dragon slayer sword, crimson blade with dragon-scale guard" --seed 20260940
gen s11 "celestial sky sword, azure blade with white feather motifs and gold trim" --seed 20260941
gen s12 "dimension cutter sword, fractured purple crystal blade with rifts of light" --seed 20260942
gen s13 "mythic sword of ending, golden blade with radiant halo rings" --seed 20260943
gen s14 "infinity sword, blade of swirling magenta galaxy and stars" --seed 20260944
gen s15 "transcendent sword, translucent emerald-white blade with divine light" --seed 20260945
echo "batch-props done"
