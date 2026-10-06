#!/usr/bin/env bash
# 몬스터·대장 원화 ×3 (2026-10-06, 사용자: "리소스랑 몬스터 종류가 너무 적음 -> 성벽원정, 자동사냥 던전에 몬스터나 보스 몬스터 리소스 x3 배 신규 추가").
# 렌더되던 11장(일반 5 · 지역 보스 5 · 황금 사자) → 일반 변종 10 + 대장 10 을 더한다. 일반은 같은 종족의 지역 변종이라
# 성문 방어에서 몸집·움직임(오우거 = 튕김, 비룡 = 폭발)을 그대로 읽을 수 있다. 대장은 1024 로 뽑는다(대장 2/3 크기 ≈ 330 CSS px).
# 이어서 비트 수련 커스텀 아이템(지휘 북 5 · 구호 5) 아이콘. 한 프로세스씩 차례로 — GPU 는 사용자와 공유한다.
set -u
PY=art-gen/.venv/Scripts/python
M=public/titans/generated/monsters
REF="$M/ogre.png,$M/goblin.png,$M/shadow-wolf-clean.png"
BREF="$M/moss-golem-clean.png,$M/moon-wolf-king-clean.png,$M/ogre.png"
mon() { [ -f "art-gen/out/monster-$1-s$3.png" ] || "$PY" art-gen/gen.py monster "$1" "$2" --ref "$REF" --ip 0.4 --seeds "$3" "$4" "$5" "$6"; }
boss() { [ -f "art-gen/out/monster-$1-s$3.png" ] || "$PY" art-gen/gen.py monster "$1" "$2" --ref "$BREF" --ip 0.4 --px 1024 --seeds "$3" "$4" "$5" "$6"; }

# 일반 변종 10 — 종족 × 지역
mon magma-slime    "glowing molten lava slime blob with cracked black crust, orange magma core, side view facing left" 20261101 20261102 20261103 20261104
mon void-slime     "violet crystal void slime blob with floating shards inside, dark purple glow, side view facing left" 20261105 20261106 20261107 20261108
mon goblin-shaman  "goblin shaman with bone mask and feathered staff, green skin, tribal cloak, side view facing left" 20261111 20261112 20261113 20261114
mon skeleton-goblin "undead skeleton goblin warrior with rusty sword and round shield, glowing red eyes, side view facing left" 20261115 20261116 20261117 20261118
mon frost-wolf     "silver blue frost wolf with icy fur spikes, glowing pale blue eyes, side view facing left, four legs" 20261121 20261122 20261123 20261124
mon hellhound      "black hellhound with burning mane and ember cracks in its skin, side view facing left, four legs" 20261125 20261126 20261127 20261128
mon stone-troll    "hulking grey stone troll with mossy rocks on shoulders, huge fists, side view facing left" 20261131 20261132 20261133 20261134
mon armored-ogre   "brutal ogre in dark iron plate armor with spiked club, violet runes, side view facing left" 20261135 20261136 20261137 20261138
mon lava-drake     "red lava drake dragon on four legs, glowing molten belly, small wings, side view facing left" 20261141 20261142 20261143 20261144
mon storm-drake    "blue storm drake dragon on four legs, crackling lightning on its horns and wings, side view facing left" 20261145 20261146 20261147 20261148

# 대장 10 — 장 중간 보스 5 + 지역 대장 교대·갈림길 대장 5
boss thorn-boar-king "giant boar king covered in thorny vines and moss, huge curved tusks, golden crown, side view facing left" 20261151 20261152 20261153 20261154
boss ancient-treant  "ancient treant guardian, giant walking tree with glowing green eyes and mossy bark arms" 20261155 20261156 20261157 20261158
boss ruin-sentinel   "hulking haunted armor knight sentinel made of cracked stone and iron, glowing red visor, great sword" 20261161 20261162 20261163 20261164
boss magma-golem     "towering magma golem of black basalt with rivers of glowing lava, burning fists" 20261165 20261166 20261167 20261168
boss void-lich       "skeletal lich king in tattered violet robes with floating crown and glowing staff, ghostly purple fire" 20261171 20261172 20261173 20261174
boss goblin-warlord  "fat goblin warlord chieftain in spiked armor with a huge cleaver and horned helmet" 20261175 20261176 20261177 20261178
boss spider-queen    "giant spider queen with purple carapace, glowing eyes and venom dripping fangs, eight legs" 20261181 20261182 20261183 20261184
boss minotaur        "massive minotaur warrior with bronze armor and a giant stone axe, snorting bull head" 20261185 20261186 20261187 20261188
boss fire-demon      "infernal horned fire demon with molten cracks in its skin and flaming wings" 20261191 20261192 20261193 20261194
boss bone-dragon     "skeletal bone dragon standing on four legs with violet ghost fire in its ribs" 20261195 20261196 20261197 20261198

# 비트 수련 커스텀 아이템 아이콘 — 지휘 북 5 · 구호 5 (시드 2개씩, 눈으로 고른다)
ico() { [ -f "art-gen/out/icon-$1.png" ] || "$PY" art-gen/gen.py icon "$1" "$2" --seed "$3" --ip 0.3; }
for s in 20261201 20261202; do
  ico "beat-ring-neon-$s"    "a cyan neon war drum with glowing rim, golden studs" "$s"
  ico "beat-ring-gold-$s"    "a golden marching war drum with red sash and brass fittings" "$s"
  ico "beat-ring-magenta-$s" "a magenta resonance battle drum with glowing pink sound waves" "$s"
  ico "beat-ring-ice-$s"     "a frosty ice blue guardian drum with frozen crystals on the rim" "$s"
  ico "beat-ring-ember-$s"   "a dragon fire war drum wrapped in flames, black and orange" "$s"
  ico "beat-spike-triangle-$s" "a simple silver triangle arrow badge, training emblem" "$s"
  ico "beat-spike-arrow-$s"  "a red charging arrow badge with speed lines, golden rim" "$s"
  ico "beat-spike-diamond-$s" "a blue diamond shield badge with a small arrow, golden rim" "$s"
  ico "beat-spike-star-$s"   "a glowing purple star badge with an arrow tip, golden rim" "$s"
  ico "beat-spike-bolt-$s"   "a yellow lightning bolt arrow badge crackling with energy, golden rim" "$s"
done
echo ALL_DONE
