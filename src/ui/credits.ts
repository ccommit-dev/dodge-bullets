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
];

export const CREDIT_LICENSE = "CC BY 4.0 — 우리 그림체(셀 음영 · 외곽선)로 다시 렌더해 바꿨다";
