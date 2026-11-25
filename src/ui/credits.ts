/**
 * 외부 3D 모델 크레딧 (2026-11-23, 사용자: "sketchfab 에서 다운되는 거 찾아다가 게임에 적용").
 * 모두 Sketchfab 의 CC BY 4.0(작가 표기 · 상업 이용 허용). 원본 모델을 그대로 쓰지 않고 우리 셀 그림체로 다시 렌더했다(변경 표시 — CC BY 요건).
 * 설정 → 더 보기 → 외부 그림 크레딧 이 이 표를 보여 준다. 문서 사본은 docs/CREDITS.md(같이 고친다)
 */
export type ModelCredit = { title: string; author: string; url: string; use: string };

export const SKETCHFAB_CREDITS: readonly ModelCredit[] = [
  { title: "RPG Monster - Bat ( free download )", author: "SEMA Game Studio", url: "https://sketchfab.com/3d-models/rpg-monster-bat-free-download-ace4909297244470ae9769f308014d50", use: "몬스터 '보라 박쥐'" },
  { title: "Mushy Buddy", author: "Mossycrossings", url: "https://sketchfab.com/3d-models/mushy-buddy-669e6965b975416eac05cf1625b21f16", use: "몬스터 '버섯 방울이'" },
  { title: "Monster Plant", author: "Batuhan13", url: "https://sketchfab.com/3d-models/monster-plant-b7e677ebca4e4b6ea247fba10a356bd4", use: "몬스터 '화분 파리지옥'" },
  { title: "Eyeball Plant", author: "Snarkle Studios", url: "https://sketchfab.com/3d-models/eyeball-plant-3c020ddcd129468ea065822cc12dfb22", use: "몬스터 '눈알 꽃'" },
  { title: "Cute tentacle creature", author: "endike", url: "https://sketchfab.com/3d-models/cute-tentacle-creature-2aec23f475dc4c93a6353fa7052d15d2", use: "몬스터 '말랑 불가사리'" },
  // 2차 몬스터 일곱 · 대장 일곱(2026-11-24, 사용자: "sketchfab 에서 바꿀 수 있는 거 다" — 성문 방어 장별 적 그림에도 쓴다)
  { title: "Kino – Cute Cyclops Monster", author: "BenAissa_Karim", url: "https://sketchfab.com/3d-models/kino-cute-cyclops-monster-aa66111d23cb41f49da7705631e1ade9", use: "몬스터 '외눈 말랑이'" },
  { title: "Stylized Red/Black dragon_baby", author: "BBangzip", url: "https://sketchfab.com/3d-models/stylized-redblack-dragon-baby-1d3cc450c8914665bf950c4fe06fc127", use: "몬스터 '아기 홍룡'" },
  { title: "Cute ghost", author: "P3D", url: "https://sketchfab.com/3d-models/cute-ghost-2c8c03bb0e5049529e653f9011a8fc90", use: "몬스터 '꼬마 유령'" },
  // 사냥터 바닥 소품(art-gen/blender/hunt_ground.py SF_PROPS)
  { title: "Low poly Stylized Nature Pack", author: "Satendra Saraswat", url: "https://sketchfab.com/3d-models/low-poly-stylized-nature-pack-9c773e846c6e4448b26b2cdecb2b91bf", use: "사냥터 바닥 덤불 · 꽃 · 버섯 · 결정 · 바위" },
  { title: "[FREE] Lowpoly Volcanic Rocks [Asset Pack]", author: "SimplePolygon", url: "https://sketchfab.com/3d-models/free-lowpoly-volcanic-rocks-asset-pack-4fe6a72f8afa4bafbd03cf384add10f0", use: "사냥터 바닥 바위 · 광석 · 성문 방어 낙석 바위" },
  { title: "Stylized mushrooms", author: "QumoDone", url: "https://sketchfab.com/3d-models/stylized-mushrooms-9d22e02ce2a548959b1c4c4c1d546842", use: "사냥터 바닥 빛나는 버섯(숲 · 심연)" },
  { title: "Cartoon fallen tree", author: "neon_dust", url: "https://sketchfab.com/3d-models/cartoon-fallen-tree-85be5e12759d460cb5f1f0d7a4c109b6", use: "사냥터 바닥 쓰러진 통나무(숲)" },
  { title: "Tree Stump stylized", author: "makcutka250", url: "https://sketchfab.com/3d-models/tree-stump-stylized-adb24e49311b48e69a95c3a5324817ec", use: "사냥터 바닥 그루터기(초원 · 숲)" },
  { title: "Cactus | Pack", author: "YadroGames", url: "https://sketchfab.com/3d-models/cactus-pack-588596f1601d48e6ad4cb24b31c3f33c", use: "사냥터 바닥 선인장(폐허)" },
  // 상점 펫 4종(2026-11-24, src/titans/pets.ts SHOP_PET_IDS — 렌더 art-gen/blender/sketchfab_monsters.py pet-*)
  { title: "Toon Cat FREE", author: "Omabuarts Studio", url: "https://sketchfab.com/3d-models/toon-cat-free-b2bd1ee7858444bda366110a2d960386", use: "펫 '아기 고양이'" },
  { title: "PBR Low-poly Fox Character", author: "Ida Faber", url: "https://sketchfab.com/3d-models/pbr-low-poly-fox-character-88ed6191446749b9a9e24b995bcb5e1d", use: "펫 '꼬마 여우'" },
  { title: "Penguin plush", author: "SunnyBuns", url: "https://sketchfab.com/3d-models/penguin-plush-228fddb7362f42e2a349b84cbe8191b4", use: "펫 '아기 펭귄'" },
  { title: "Frog", author: "gooseg489", url: "https://sketchfab.com/3d-models/frog-b3fb06508c5649fd8ecb30d79e2b9050", use: "펫 '풀잎 개구리'" },
  // 상점 전용 동료 넷(2026-11-24, allyRoster shop — 렌더 sketchfab_monsters.py kind='ally', 칸마다 좌우를 뒤집어 오른쪽을 본다)
  { title: "Cute Bunny", author: "Minimoku", url: "https://sketchfab.com/3d-models/cute-bunny-7d30845d69c4474ebeddd177df6b7f02", use: "상점 동료 '솜털 토끼 보니'" },
  { title: "Just a Hungry Cat", author: "Coco Jinjo", url: "https://sketchfab.com/3d-models/just-a-hungry-cat-97913cc5c44e4e6793385b988aac97c1", use: "상점 동료 '밤고양이 감자'" },
  { title: "John, The Knight Duck (Armored)", author: "TheKnightDuck", url: "https://sketchfab.com/3d-models/john-the-knight-duck-armored-f976354f020949bf8cd0380ea0837b14", use: "상점 동료 '방패기사 덕'" },
  { title: "Low-Poly Squirrel Character (Game-Ready, Rigged)", author: "SomeNortherner", url: "https://sketchfab.com/3d-models/low-poly-squirrel-character-game-ready-rigged-7983c9e011ad427fab0c428ff84b3ddb", use: "상점 동료 '도토리 다람쥐 레드'" },
  // 보석 주인공 캐릭터(2026-11-25, art-gen/blender/lib/sf_rig.py · render_anim2 char@fox — 비버 자세 값을 여우 뼈에 옮겨 렌더)
  { title: "Cartoon Character", author: "MartinDL", url: "https://sketchfab.com/3d-models/cartoon-character-c951392387944060966ac6e8e5cfd2e3", use: "주인공 캐릭터 '여우 모험가'" },
  // 기본 주인공(2026-11-25, 사용자: "기본 비버 주인공을 받은 모델로" — render_anim2 HERO_MODEL=hb · lib/sf_rig.py)
  { title: "Happy Beaver", author: "Mayk Santos", url: "https://sketchfab.com/3d-models/happy-beaver-a43fc138613c4de3aeb138ce02b79890", use: "기본 주인공 '모험가' 비버" },
];

export const CREDIT_LICENSE = "CC BY 4.0 — 우리 그림체(셀 음영 · 외곽선)로 다시 렌더해 바꿨다";
