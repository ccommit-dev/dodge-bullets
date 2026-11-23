# 외부 그림 크레딧

게임 안에서는 설정 → 더 보기 → **외부 그림 크레딧**에서 볼 수 있다(`src/ui/credits.ts` — 이 문서와 같이 고친다).

## Sketchfab 3D 모델 (2026-11-23 받음)

모두 **CC BY 4.0**(작가 표기 · 상업 이용 허용)이다. 원본을 그대로 쓰지 않고 우리 셀 그림체(평면 음영 · 잉크 외곽선 · 테두리빛)로 다시 렌더했다 — CC BY 의 "변경 표시" 요건.
원본 파일(GLB)은 저장소 밖 `art-gen/out/sketchfab/` 에 둔다(git 에 넣지 않는다). 렌더는 `art-gen/blender/sketchfab_monsters.py`.

| 게임 안 | 원본 | 작가 | 주소 | 파일 |
|---|---|---|---|---|
| 몬스터 '보라 박쥐' (숲 · 늑대 변종) | RPG Monster - Bat ( free download ) | SEMA Game Studio | https://sketchfab.com/3d-models/rpg-monster-bat-free-download-ace4909297244470ae9769f308014d50 | m-bat.glb |
| 몬스터 '버섯 방울이' (초원 · 슬라임 변종) | Mushy Buddy | Mossycrossings | https://sketchfab.com/3d-models/mushy-buddy-669e6965b975416eac05cf1625b21f16 | m-mushy.glb |
| 몬스터 '화분 파리지옥' (숲 · 고블린 변종) | Monster Plant | Batuhan13 | https://sketchfab.com/3d-models/monster-plant-b7e677ebca4e4b6ea247fba10a356bd4 | m-plant.glb |
| 몬스터 '눈알 꽃' (초원 · 고블린 변종) | Eyeball Plant | Snarkle Studios | https://sketchfab.com/3d-models/eyeball-plant-3c020ddcd129468ea065822cc12dfb22 | m-eyeplant.glb |
| 몬스터 '말랑 불가사리' (폐허 · 늑대 변종) | Cute tentacle creature | endike | https://sketchfab.com/3d-models/cute-tentacle-creature-2aec23f475dc4c93a6353fa7052d15d2 | m-tentacle.glb |

받았지만 아직 게임에 넣지 않은 것 — 넣을 때 위 표와 `src/ui/credits.ts` 로 옮긴다.

| 원본 | 작가 | 주소 | 파일 | 상태 |
|---|---|---|---|---|
| Low poly Stylized Nature Pack | Satendra Saraswat | https://sketchfab.com/3d-models/low-poly-stylized-nature-pack-9c773e846c6e4448b26b2cdecb2b91bf | p-nature.glb | 맵 소품 예정 |
| [FREE] Lowpoly Volcanic Rocks [Asset Pack] | SimplePolygon | https://sketchfab.com/3d-models/free-lowpoly-volcanic-rocks-asset-pack-4fe6a72f8afa4bafbd03cf384add10f0 | p-rocks.glb | 맵 소품 예정 |
| Stylized mushrooms | QumoDone | https://sketchfab.com/3d-models/stylized-mushrooms-9d22e02ce2a548959b1c4c4c1d546842 | p-mushrooms.glb | 맵 소품 예정 |
| Cartoon fallen tree | neon_dust | https://sketchfab.com/3d-models/cartoon-fallen-tree-85be5e12759d460cb5f1f0d7a4c109b6 | p-fallentree.glb | 맵 소품 예정 |
| Tree Stump stylized | makcutka250 | https://sketchfab.com/3d-models/tree-stump-stylized-adb24e49311b48e69a95c3a5324817ec | p-stump.glb | 맵 소품 예정 |
| Cactus \| Pack | YadroGames | https://sketchfab.com/3d-models/cactus-pack-588596f1601d48e6ad4cb24b31c3f33c | p-cactus.glb | 맵 소품 예정 |
| Slime 1 | 3DHaupt | https://sketchfab.com/3d-models/slime-1-8b44e345b4a94818837e953a06e571bf | m-slime.glb | 안 씀 — 눈 없는 초록 상자라 셀로 그리면 몬스터로 안 읽혔다 |

## 고르는 규칙

- 라이선스는 CC0 · CC BY 만 쓴다. 상점에서 돈을 받는 게임이라 비상업(NC) · 구매 전용(Standard/Editorial)은 뺀다.
- 남의 작품 캐릭터 팬아트(포켓몬 · 유희왕 · Cuphead · 소닉 등)는 라이선스와 상관없이 뺀다.
- 받은 모델은 그대로 넣지 않고 우리 그림체로 다시 렌더한다(그림결이 작가마다 달라 화면이 섞인다).
