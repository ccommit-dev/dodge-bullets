#!/usr/bin/env bash
# 원정 리소스 통일감 재생성 (2026-09-28).
# 칩: 서리(눈송이 그 자체)·활력(받침대 위 하트)이 "회로판 조각" 모티프를 벗어났고 예기는 회색으로 죽었다.
#     조준·연사·잔열처럼 **판 위에 새겨진 문양**으로 다시 뽑는다. 시드 3개씩 → 눈으로 선택.
# 무기: 활·지팡이 부착 원화는 카드 34px 에서 가는 선으로 뭉개진다 → 카드용 아이콘을 따로.
set -u
PY=art-gen/.venv/Scripts/python
chip() { "$PY" art-gen/gen.py icon "dchip-$1-c$3" "a flat hexagonal metal circuit chip plate, teal etched circuit lines, and $2 engraved in the center of the plate, single object" --seed "$3" --ip 0.2; }
for s in 5101 5102 5103; do chip rime "a pale blue snowflake symbol" $s; done
for s in 5201 5202 5203; do chip vitality "a green heart symbol glowing" $s; done
for s in 5301 5302 5303; do chip edge "a bright white crossed twin blades symbol, silver and gold accents" $s; done
wicon() { "$PY" art-gen/gen.py icon "dweap-$1" "$2, single item, centered, thick readable silhouette" --seed 5401 --ip 0.25; }
wicon bow   "an ornate elven longbow icon, bold curved limbs, green and gold"
wicon staff "a crystal mage staff icon, large glowing blue gem on top, bold shaft"
