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
  { title: "Sand Golem", author: "Yury Misiyuk", url: "https://sketchfab.com/3d-models/sand-golem-41346d6cff3646809ee8af11da9882ef", use: "몬스터 '모래 골렘'" },
  { title: "Lava Golem", author: "Lucas Coutinho", url: "https://sketchfab.com/3d-models/lava-golem-76e7424f81ac4fb1b1c72613e049fbe5", use: "몬스터 '불씨 골렘'" },
  { title: "Stylized Red/Black dragon_baby", author: "BBangzip", url: "https://sketchfab.com/3d-models/stylized-redblack-dragon-baby-1d3cc450c8914665bf950c4fe06fc127", use: "몬스터 '아기 홍룡'" },
  { title: "Stylized Blue dragon baby", author: "BBangzip", url: "https://sketchfab.com/3d-models/stylized-blue-dragon-baby-350ca0b2199a4af18bde907dec7433a4", use: "몬스터 '아기 청룡'" },
  { title: "Cute ghost", author: "P3D", url: "https://sketchfab.com/3d-models/cute-ghost-2c8c03bb0e5049529e653f9011a8fc90", use: "몬스터 '꼬마 유령'" },
  { title: "Magical Golem - FREE 3D Game Asset", author: "Kostas3D", url: "https://sketchfab.com/3d-models/magical-golem-free-3d-game-asset-faf1961b1ca24c83987c19244e309286", use: "몬스터 '마법 골렘'" },
  { title: "Mushroom Boss - game ready with animations", author: "iamjohnhult", url: "https://sketchfab.com/3d-models/mushroom-boss-game-ready-with-animations-ee611e4925e94a98baa4cfd3d89d3449", use: "대장 '버섯 대왕'" },
  { title: "Werewolf Stylized Animated", author: "imitate", url: "https://sketchfab.com/3d-models/werewolf-stylized-animated-16cefdf83e5e457eb6e53f1fbd97edb5", use: "대장 '푸른 늑대인간'" },
  { title: "Treefellow", author: "paburoviii", url: "https://sketchfab.com/3d-models/treefellow-05b311c607564274a26b3c26f4318066", use: "대장 '떠도는 고목'" },
  { title: "Stylized insect monster PBR low-poly game ready", author: "Vladies", url: "https://sketchfab.com/3d-models/stylized-insect-monster-pbr-low-poly-game-ready-ecfe06377ddd4059bb12b50f5d3af5f1", use: "대장 '모래 갑충'" },
  { title: "Infernal Magma Hound - Free Lava Creature Asset", author: "Yury Misiyuk", url: "https://sketchfab.com/3d-models/infernal-magma-hound-free-lava-creature-asset-bd8290074df34eb99f174edb176fcc46", use: "대장 '용암 사냥개'" },
  { title: "Ice Elemental", author: "InaLaAtzu", url: "https://sketchfab.com/3d-models/ice-elemental-aad46bfde099472481b1536428a122ae", use: "대장 '서리 정령'" },
  { title: "Ice Golem", author: "Caboose3d", url: "https://sketchfab.com/3d-models/ice-golem-f7370eebe4cf4f81b49c83925c0d3d0c", use: "대장 '얼음 골렘'" },
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
  // 몬스터 펫 다섯(2026-11-25, sketchfab_monsters.py pet-* → assemble-anim2 · 셀/도트 시트) — 꼬마 오우거는 그대로
  { title: "Slime low-poly", author: "Parado10", url: "https://sketchfab.com/3d-models/slime-low-poly-446d179577354f9794dde57f98943adc", use: "펫 '아기 슬라임'" },
  { title: "Cute Pet Dragon Baby", author: "outcast945", url: "https://sketchfab.com/3d-models/cute-pet-dragon-baby-17c80b80927044a4bf95c15ed8407bcb", use: "펫 '새끼 용'" },
  { title: "Cartoon Wolf", author: "CGulia", url: "https://sketchfab.com/3d-models/cartoon-wolf-9bb48adc8e7a428084abd0742999778b", use: "펫 '아기 늑대'" },
  { title: "Low Poly Goblin", author: "BaGaDa41", url: "https://sketchfab.com/3d-models/low-poly-goblin-78145db3e9a44120bacc3afaa5eb87f6", use: "펫 '꼬마 고블린'" },
  { title: "Chubby Ghost", author: "Elyse Darby", url: "https://sketchfab.com/3d-models/chubby-ghost-753c85362d7446169f1b30d6a2c26d34", use: "펫 '타이탄의 그림자'" },
  // 비버 동료 그림 교체 1차(2026-11-25, 일반 등급 여덟 — sketchfab_monsters.py sfa-* → 조립이 그 동료 시트로)
  { title: "Quirky Series - FREE Animals Pack", author: "Omabuarts Studio", url: "https://sketchfab.com/3d-models/quirky-series-free-animals-pack-19e91ef86cd0448f9cbb5d6c538dade2", use: "동료 여덟 그림(키키 참새 · 토토 도마뱀 · 나나 청어 · 시시 뱀 · 구구 사향쥐 · 모모 푸두 · 피피 원숭이 · 도도 오징어)" },
  // 상점 전용 동료 넷(2026-11-24, allyRoster shop — 렌더 sketchfab_monsters.py kind='ally', 칸마다 좌우를 뒤집어 오른쪽을 본다)
  { title: "Cute Bunny", author: "Minimoku", url: "https://sketchfab.com/3d-models/cute-bunny-7d30845d69c4474ebeddd177df6b7f02", use: "상점 동료 '솜털 토끼 보니'" },
  { title: "Just a Hungry Cat", author: "Coco Jinjo", url: "https://sketchfab.com/3d-models/just-a-hungry-cat-97913cc5c44e4e6793385b988aac97c1", use: "상점 동료 '밤고양이 감자'" },
  { title: "John, The Knight Duck (Armored)", author: "TheKnightDuck", url: "https://sketchfab.com/3d-models/john-the-knight-duck-armored-f976354f020949bf8cd0380ea0837b14", use: "상점 동료 '방패기사 덕'" },
  { title: "Low-Poly Squirrel Character (Game-Ready, Rigged)", author: "SomeNortherner", url: "https://sketchfab.com/3d-models/low-poly-squirrel-character-game-ready-rigged-7983c9e011ad427fab0c428ff84b3ddb", use: "상점 동료 '도토리 다람쥐 레드'" },
  // 유물 넷(2026-11-24, art-gen/blender/sketchfab_icons.py relics → assemble-relics 의 스티커 · 계열 빛 · 등급 별빛)
  { title: "Stylized Wood Shield", author: "Brett Murphy", url: "https://sketchfab.com/3d-models/stylized-wood-shield-66058be8e4e749bf8ce234d94dd6d863", use: "유물 '참나무 방패'" },
  { title: "Stylized Dagger", author: "xwhn", url: "https://sketchfab.com/3d-models/stylized-dagger-f742183b679f4964bcbf2b9381ed6c70", use: "유물 '불꽃 단검'" },
  { title: "Stylized Treasure Map", author: "Izzy", url: "https://sketchfab.com/3d-models/stylized-treasure-map-cec61143abbc46bc99201b591942688b", use: "유물 '금박 지도'" },
  { title: "Hand painted shovel", author: "Bohdan Lvov", url: "https://sketchfab.com/3d-models/hand-painted-shovel-04e4270e92b649c6b34273eac360081e", use: "유물 '청동 삽'" },
  // 유물 2차 아홉(2026-11-25, sketchfab_icons.py RELIC_JOBS r2_* → assemble-relics — 열아홉을 시험 렌더해 지금 그림보다 잘 읽히는 것만)
  { title: "Low Poly Stylized Compass", author: "pau.raurellgomis", url: "https://sketchfab.com/3d-models/low-poly-stylized-compass-8de466ea26ab43cdadcf67d86344052a", use: "유물 '해류 나침반'" },
  { title: "Low Poly Clam Shell", author: "gabrielmendesm", url: "https://sketchfab.com/3d-models/low-poly-clam-shell-708f83d6fce940c5827cfd6ce942004d", use: "유물 '조개 껍데기'" },
  { title: "Viking Horn Stylized", author: "Mamba_Negra", url: "https://sketchfab.com/3d-models/viking-horn-stylized-43413df1e06f4129b31c3e3dd989ae1f", use: "유물 '서리 뿔피리'" },
  { title: "Ring Stylized", author: "Gabrieltim3D", url: "https://sketchfab.com/3d-models/ring-stylized-f57bd7f5c3804bdd926642175287f1d2", use: "유물 '불씨 반지'" },
  { title: "Colorful pinwheel", author: "CiboBlu", url: "https://sketchfab.com/3d-models/colorful-pinwheel-13c59b5341df4989888a219436d173dc", use: "유물 '바람개비'" },
  { title: "Toy haniwa, Japan", author: "kofun", url: "https://sketchfab.com/3d-models/toy-haniwa-japan-856079b4564049ee9e0f81d3d2fa7021", use: "유물 '점토 인형'" },
  { title: "pearl shell", author: "abdullahpowerfull", url: "https://sketchfab.com/3d-models/pearl-shell-902012feb9364cb5bdc44676e5c079a1", use: "유물 '달 조개'" },
  { title: "Golden crown", author: "Pieter Ferreira", url: "https://sketchfab.com/3d-models/golden-crown-5689a9525a2c425d93f7d483b93d8cfa", use: "유물 '비버 왕관'" },
  { title: "Ruby Scepter", author: "Cre-8", url: "https://sketchfab.com/3d-models/ruby-scepter-fc714bca404c4d9e99896d663e8b15e9", use: "유물 '왕의 홀'" },
  // 상점 묶음 그림(2026-11-24, art-gen/blender/sketchfab_icons.py → public/ui/shop)
  { title: "Stylized Crystal Gem pack - Handpainted", author: "ashkan.fancy", url: "https://sketchfab.com/3d-models/stylized-crystal-gem-pack-handpainted-9aa1af6e18b24c99af00e850f9fd2658", use: "상점 붉은 보석 팩 · 강화석 상자 · 유물 '눈꽃 결정' · '혜성 조각' 그림" },
  { title: "Stylized Treasure Chest", author: "Tom Verbeeck", url: "https://sketchfab.com/3d-models/stylized-treasure-chest-dbeae8db89eb433f832d0ef48f12480e", use: "상점 보석 120 · 황금 보급 상자 · 강화석 상자 · 비버 상자 · 성문 방어 보상 상자 · 유물 '보물 상자' 그림" },
  { title: "Stylized Potion", author: "Moon Cube Studios (@KinanArts)", url: "https://sketchfab.com/3d-models/stylized-potion-78d411a585144c4f91ca51d876982ed7", use: "상점 방치 가속권 그림" },
];

export const CREDIT_LICENSE = "CC BY 4.0 — 우리 그림체(셀 음영 · 외곽선)로 다시 렌더해 바꿨다";
