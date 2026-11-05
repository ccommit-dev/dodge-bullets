# 플레이어블 숏폼 정리

비버 키우기 유도 광고용 25초 안팎 플레이어블 14편. 2026-11-04 게임 소스와 문구를 대조해 정리했다.

- 소스: `scripts/reels/scenes/<id>.js`, 공용 `engine.js` · `kit.js`, 피드 `feed.html`
- 만들기: `node scripts/reels/prep-art.mjs && node scripts/reels/build.mjs` (결과 `art-gen/out/reels/site/`)
- 검사: `node scripts/reels/verify-reels.mjs`, `node scripts/reels/verify-feed.mjs`
- 그림: `art-gen/out/b3d2` 렌더를 그대로 쓴다. 동료 · 몬스터를 다시 렌더하면 `prep-art` 부터 다시 돌린다

## 지금 편성

| 순서 | id | 첫 문구 | 보여 주는 콘텐츠 | 문구 근거 |
|---|---|---|---|---|
| 1 | first-ten | 첫 10연차 전설 확정 | 동료 뽑기 | `titans/gacha.ts`, `titans/model.ts` |
| 2 | sword-forge | 낡은 나무 검이 초월자의 검이 되기까지 | 대장간 검 +15 | `forge/model.ts` FORGE_TIERS |
| 3 | golden-monster | 황금 몬스터 출현, 잡으면 골드 ×10 | 사냥터 황금 몬스터 | `TitansGame.tsx` spawn, `titans/model.ts` killGold |
| 4 | dam-hold | 댐이 뚫리기 직전 막아라 | 성문 방어 | `game/arrows.ts`, `game/world.ts` |
| 5 | beat-combo | 박자에 맞춰 누르면 원정대가 싸운다 | 비트 수련 | `beat/tracks.ts` 16곡 |
| 6 | mount-ride | 걷지 말고 타고 사냥하자 | 탈것 (신규) | `titans/mounts.ts` |
| 7 | weapon-tech | 6번째 탭마다 연속 베기 ×2.5 | 무기 기술 (신규) | `titans/weapons.ts` WEAPON_TECH |
| 8 | boss-ladder | 더 높은 대장 잡으면 영구 강화 | 대장 사다리 | `titans/bossLadder.ts` |
| 9 | dam-skill | 화살 한 줄로는 못 막는다 | 스킬 무기 · 원소 전환 | `game/skills.ts`, `game/perks.ts` |
| 10 | relic-set | 유물 세 개를 모으면 세트 효과 | 유물 세트 (신규) | `titans/relics.ts` |
| 11 | party-assemble | 혼자서는 못 이긴다, 원정대 모으기 | 동료 편성 | `titans/allies.ts` |
| 12 | beat-shoulder | 챕터 대장을 넘기면 견갑이 떨어진다 | 비트 수련 보상 | `BeatGame.tsx` |
| 13 | rebirth-speed | 대장에게 꽉 막혔다? 환생하면 질주 | 환생 | `progression/rebirth.ts` |
| 14 | idle-wake | 폰 내려놓고 8시간, 일어나 보니? | 방치 보상 · 보상형 광고 2배 | `progression/idle.ts`, `ads/rewarded.ts` |

## 2026-11-04 에 바꾼 것

| 편 | 예전 | 지금 | 이유 |
|---|---|---|---|
| acorn-merge | 도토리 합성, 동료 피해 ×4.8 | 뺌 | 합성 화면이 2026-10-26 에 없어졌다 |
| lightning-tap | 10번째 탭마다 번개 | weapon-tech 로 교체 | 번개 강화가 2026-10-28 에 없어지고 무기 기술이 됐다 |
| drum-forge | 나무북 → 왕관북 | sword-forge 로 교체 | 주인공 무기가 북에서 검 · 창 · 활 · 지팡이로 바뀌었다 |
| golden-monster | 도망 타이머 · 잭팟 상자 · 강화석 · 보석 | 골드 ×10 만 | 실제 게임에 도망도 상자도 없다 |
| idle-wake | 최대 12시간 | 기본 8시간, 키우면 14시간까지 | `idle.ts` 값 |
| dam-hold | 원정 인장 +20 · 강화석 +12, 줄을 탭 | 원정 인장 +3, 누른 쪽으로 이동 | 일반 클리어는 2~5개, 이동은 포인터를 따른다 |
| dam-skill | 궁극기 운석, 불화살 부채 · 얼음 화살비 | 스킬 무기 운석, 불화살 · 얼음화살 | 궁극기는 화살비, 운석은 스킬 무기다 |
| boss-ladder | 대장 잡을 때마다 | 더 높은 대장 잡으면 | 최고 기록을 넘길 때만 오른다 |
| beat-shoulder | 보상 상자, 조각 +40 | 챕터 대장 첫 클리어 | 상자가 아니라 첫 클리어 보상이다 |
| rebirth-speed | 30층에서 막힘 | 대장에게 막힘 | 조건은 층수가 아니라 대장에게 연속으로 진 지역이다 |
| first-ten | 보석 +50 | 뺌 | 근거를 찾지 못했다 |
| 피드 | 좋아요 · 댓글 · 공유 수 | 숫자 뺌 | 지어낸 수치였다 |

## 2026-11-05 릴스에서 게임으로 가져온 것

| 릴스 | 게임 | 자리 |
|---|---|---|
| golden-monster | 황금 몬스터 7초 제한 · 연타 수 · 처치 글자. 못 잡으면 도망, 같은 라운드 일반 몬스터가 대신 나온다. 골드 ×10 은 그대로 | `titans/huntMoments.tsx` |
| weapon-tech | 무기 기술까지 남은 탭 칸 | 위와 같음 |
| rebirth-speed | 환생 뒤 예전 최고 층을 처음 넘으면 신기록 글자 | 위와 같음 |
| sword-forge | 검 외형이 바뀌는 +5 · +10 · +15 에 외형 변화 글자 | `ForgeGame.tsx` |

탈것 시트 배치가 바뀌어(anim-layout `mount`) `mount-ride` 편은 `prep-art` 부터 다시 만들어야 새 모습이 된다. 뽑기 편의 "마지막 한 장" 긴장 문구는 아직 게임에 없다.

## 문구를 쓸 때

- 숫자와 상품 이름은 위 근거 파일에서 확인한다. 게임 수치를 바꾸면 이 표의 해당 편도 같이 본다
- 뽑기 편은 연출이 잘 풀린 경우를 보여 준다. 실제 집행 전에 확률 고지와 광고 심의 기준은 따로 확인한다
