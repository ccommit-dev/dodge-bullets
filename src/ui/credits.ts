/**
 * 외부 3D 모델 크레딧 (2026-11-23, 사용자: "sketchfab 에서 다운되는 거 찾아다가 게임에 적용").
 * 모두 Sketchfab 의 CC BY 4.0(작가 표기 · 상업 이용 허용). 원본 모델을 그대로 쓰지 않고 우리 셀 그림체로 다시 렌더했다(변경 표시 — CC BY 요건).
 * 설정 → 더 보기 → 외부 그림 크레딧 이 이 표를 보여 준다. 문서 사본은 docs/CREDITS.md(같이 고친다)
 */
export type ModelCredit = { title: string; author: string; url: string; use: string };

export const SKETCHFAB_CREDITS: readonly ModelCredit[] = [
  // 몬스터 · 대장 · 펫 전부(2026-11-25, 사용자: "새로운 리소스들로 풍 균일하게") — 한 작가 50종 묶음(CC0, 표기는 의무 아님 · 감사 표기). 렌더 art-gen/blender/qt_monsters.py
  { title: "Ultimate Monsters", author: "Quaternius", url: "https://quaternius.com/packs/ultimatemonsters.html", use: "몬스터 · 대장 · 펫 그림 전부 (CC0)" },
  // 사냥터 바닥 소품(art-gen/blender/hunt_ground.py SF_PROPS)
  { title: "Low poly Stylized Nature Pack", author: "Satendra Saraswat", url: "https://sketchfab.com/3d-models/low-poly-stylized-nature-pack-9c773e846c6e4448b26b2cdecb2b91bf", use: "사냥터 바닥 덤불 · 꽃 · 버섯 · 결정 · 바위" },
  { title: "[FREE] Lowpoly Volcanic Rocks [Asset Pack]", author: "SimplePolygon", url: "https://sketchfab.com/3d-models/free-lowpoly-volcanic-rocks-asset-pack-4fe6a72f8afa4bafbd03cf384add10f0", use: "사냥터 바닥 바위 · 광석 · 성문 방어 낙석 바위" },
  { title: "Stylized mushrooms", author: "QumoDone", url: "https://sketchfab.com/3d-models/stylized-mushrooms-9d22e02ce2a548959b1c4c4c1d546842", use: "사냥터 바닥 빛나는 버섯(숲 · 심연)" },
  { title: "Cartoon fallen tree", author: "neon_dust", url: "https://sketchfab.com/3d-models/cartoon-fallen-tree-85be5e12759d460cb5f1f0d7a4c109b6", use: "사냥터 바닥 쓰러진 통나무(숲)" },
  { title: "Tree Stump stylized", author: "makcutka250", url: "https://sketchfab.com/3d-models/tree-stump-stylized-adb24e49311b48e69a95c3a5324817ec", use: "사냥터 바닥 그루터기(초원 · 숲)" },
  { title: "Cactus | Pack", author: "YadroGames", url: "https://sketchfab.com/3d-models/cactus-pack-588596f1601d48e6ad4cb24b31c3f33c", use: "사냥터 바닥 선인장(폐허)" },
  // 상점 전용 동료 넷(2026-11-24, allyRoster shop — 렌더 sketchfab_monsters.py kind='ally', 칸마다 좌우를 뒤집어 오른쪽을 본다)
  { title: "Cute Bunny", author: "Minimoku", url: "https://sketchfab.com/3d-models/cute-bunny-7d30845d69c4474ebeddd177df6b7f02", use: "상점 동료 '솜털 토끼 보니'" },
  { title: "Just a Hungry Cat", author: "Coco Jinjo", url: "https://sketchfab.com/3d-models/just-a-hungry-cat-97913cc5c44e4e6793385b988aac97c1", use: "상점 동료 '밤고양이 감자'" },
  { title: "John, The Knight Duck (Armored)", author: "TheKnightDuck", url: "https://sketchfab.com/3d-models/john-the-knight-duck-armored-f976354f020949bf8cd0380ea0837b14", use: "상점 동료 '방패기사 덕'" },
  { title: "Low-Poly Squirrel Character (Game-Ready, Rigged)", author: "SomeNortherner", url: "https://sketchfab.com/3d-models/low-poly-squirrel-character-game-ready-rigged-7983c9e011ad427fab0c428ff84b3ddb", use: "상점 동료 '도토리 다람쥐 레드'" },
  // 보석 주인공 캐릭터(2026-11-25, art-gen/blender/lib/sf_rig.py · render_anim2 char@fox — 비버 자세 값을 여우 뼈에 옮겨 렌더)
  { title: "Cartoon Character", author: "MartinDL", url: "https://sketchfab.com/3d-models/cartoon-character-c951392387944060966ac6e8e5cfd2e3", use: "주인공 캐릭터 '여우 모험가'" },
];

export const CREDIT_LICENSE = "CC BY 4.0(Quaternius 는 CC0) — 우리 그림체(셀 음영 · 외곽선)로 다시 렌더해 바꿨다";
