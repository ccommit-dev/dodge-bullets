# 콘텐츠 역할 분리 계획 (2026-09-10)

세 콘텐츠의 역할 — **비트 수련(비트원정) = 실력·기록**, **사냥터(일반 던전) = 방치·오프라인**, **화살 원정 = 직접 조작·탄막·보스** — 을 기준으로
현재 구현을 분석하고 P0~P3 순서로 보강한다. 기존 코드·UI·저장 구조는 유지하고 필요한 부분만 더한다.

이 프로젝트는 Unity가 아니라 **React 19 + TypeScript + Canvas 2D (Vite, Capacitor Android, 앱인토스 웹뷰)** 다.
스펙의 Scene/Prefab/ScriptableObject 는 각각 화면 컴포넌트/스프라이트 컴포넌트/TS 상수 모듈에 대응한다.

================================
## 현재 프로젝트 분석 결과
================================

### 1. 프로젝트 구조

| 폴더 | 역할 |
|---|---|
| `src/App.tsx` | 루트. `AppMode = titans · dodge · beat · forge · profile` 전환, 화살 원정 캔버스 루프·오버레이(준비/인트로/HUD/클리어/게임오버) |
| `src/TitansGame.tsx` | 사냥터 허브(3184줄). 자동 전투, 스테이지 자동 진행, 방치 정산, 하단 내비(콘텐츠/루틴/상점), 마이페이지 |
| `src/BeatGame.tsx` | 비트 수련 허브+플레이. 캔버스 노트 레일, 판정, 결과 화면 |
| `src/ForgeGame.tsx` | 대장간 (검 강화·견갑·조합소) |
| `src/EventCenter.tsx` | 이벤트(일일 퀘스트·주간 균열·랭크 시험·시즌 패스) |
| `src/game/` | 화살 원정 엔진: `types.ts`(GameWorld/StageDef), `stages.ts`(**StageConfig** 4스테이지+성벽), `arrows.ts`(패턴·보스 화살·베기), `player.ts`, `input.ts`, `world.ts`, `draw.ts`, `storage.ts`, `toss.ts`(앱인토스 SDK), `native.ts`, `backup.ts` |
| `src/beat/` | 비트 엔진: `tracks.ts`(**BeatTrackConfig** 16곡·LEVEL_FEATURES·채보 생성), `world.ts`(판정·홀드·점프·회복), `draw.ts`, `audio.ts`, `rpg.ts`(숙련·SP·스태미나·등급) |
| `src/titans/` | 사냥터 데이터: `model.ts`(**AREAS** 5지역·몬스터·골드), `allies.ts`(동료·파견), `skills.ts`, `gacha.ts`, `pets.ts`, `SpriteArt.tsx` |
| `src/progression/` | 공유 진행도: `model.ts`(CharacterProgress), `storage.ts`, `idle.ts`(**OfflineRewardConfig** = `IDLE` 상수·computeIdleYield), `balance.ts`(**RewardConfig**), `onboarding.ts`(해금 순서), `recommend.ts`(다음 목표 추천) |
| `src/economy/`, `src/payments/`, `src/ads/rewarded.ts` | 상품 카탈로그·결제 어댑터·보상형 광고(AdMob 런타임 탐지, QA 스텁) |
| `public/` | 원화·아틀라스·배경·음원. `docs/game` = GitHub Pages 빌드 |
| `scripts/` | 검증 하니스(verify-*.mjs, beat-sim, dodge-sim, verify-all 순차 러너) |

### 2. 비트 수련(비트원정) 현재 상태

- **있는 것**: 16곡 × 3난이도 채보(레벨 1~10, Tap/Hold/Jump/Hold Jump/Roll), 판정(PERFECT/GREAT/MISS, 판정 창 하한 110ms), **점수·콤보·maxCombo·FEVER 배율**, HP·회복 게이지, 30초~2분 곡, 등급(C/B/A/S) 곡×난이도 저장, 숙련(스킬)·SP·명성(fame)·스태미나, 결과 화면(코인·견갑 조각·숙련↑), 무료 재도전, 첫 클리어 2배.
- **스크립트**: `BeatGame.tsx`, `beat/*.ts`. **UI**: 허브(스케줄 카드·난이도 버튼) → 플레이(캔버스+4패드) → 결과.
- **저장**: `dodgebullets:beatRpg:<hash>`(숙련·등급·명성), `beatUnlock`, `beatCosmetics`, 코인. **문제**: 최고 점수를 `saveHighScore`(= `dodgebullets:highScore:<hash>`, 화살 원정과 **같은 키**)에 써서 화살 원정 "최고" 표시와 섞인다.
- **재사용**: 점수·콤보·판정 엔진 그대로. 특수 보상 축(견갑 조각 `shoulderShards`, 명성 `fame`)이 이미 있어 새 재화가 필요 없다.
- **없는 것**: 곡별 최고 점수/최고 콤보/무피격 기록, 결과 화면의 "최고 기록 대비", 랭킹 UI, 광고 2배.

### 3. 사냥터(일반 던전) 현재 상태

- **있는 것**: 동료 파티 자동 전투(플레이어 조작 없음), 스테이지 자동 진행(보스 처치 → `stage + 1`), 5지역(AREAS: 새벽 초원~심연의 성, 개척 `pioneeredArea`로 상한), **오프라인 정산** `computeIdleYield`(실제 시간 = now − `idleClaimedAt`, 시간 캡 `idleCapHours` 8~14h, 효율 R·배율 M, 따라잡기 스테이지), 귀환 정산 모달(골드·EXP·강화석·동료 조각, **광고 2배**, 방치 가속 4h 광고, 후원 계약), 캡 도달 로컬 푸시, 파견(동료 시간제).
- **전투 방식**: 실시간 자동. 화면을 켜 두면 골드(save.gold)가 액티브로, 꺼 두면 공유 지갑(sharedCoins)으로 방치 골드가 간다.
- **저장**: `dodgebullets:titans:<hash>`(stage·bestStage·gold·heroes·party), 공유 `dodgebullets:progression:v1:<hash>`(idleClaimedAt·idleBoostUntil·adRewards).
- **없는 것**: 허브에 **"자동 진행 중 · 경과/남은 시간 · 예상 보상 · 누적"** 상시 표시(정산 모달은 귀환 시에만), 즉시 완료 버튼(가속 광고는 모달 안에만).

### 4. 화살 원정 현재 상태

- **있는 것**: 직접 조작(좌우 드래그/키, 점프, 베기, 일섬), 4스테이지 + 끝없는 성벽(StageDef: 시간대별 패턴 = rain/aimed/cross/fan/side/ricochet/sweep/explosive/burst), 화살 베기 = 적 처치 대응(반사로 궁수 격추 `reflectKills`), 스테이지 끝 **보스 화살**(베기 n회, 티어별 분열 변종 homing/ricochet/explosive/fan 랜덤; 4스테이지 추격대장 원화), 콤보(`combo/maxCombo`), 점수, HP, 위험도, 별 3개, 클리어 보상(코인·EXP·강화석 `dodgeClearReward`, 견갑 드랍), 게임 오버·재도전·보스 +10초 광고, 기록 카드 공유, 봇 시뮬 게이트.
- **없는 것**: 패턴 구간을 "Wave n/N → BOSS"로 보여 주는 HUD, 보스별 **고정 탄막 패턴**(지금은 랜덤 변종), 런 중 성장 선택, 클리어 보상 2배 광고.

### 5. 재사용 가능한 시스템

| 스펙 명칭 | 실제 |
|---|---|
| PlayerController | `game/player.ts` + `game/input.ts` |
| BulletSystem | `game/arrows.ts` (패턴·보스·베기·파편) |
| EnemySystem | 화살 원정: 궁수(반사 격추)·보스 화살 / 사냥터: `titans/model.ts` 몬스터 |
| StageManager | `game/stages.ts`, `TitansGame` 스테이지 진행, `beat/tracks.ts` |
| RewardSystem | `progression/balance.ts`, `grantCharacterReward`, `computeClearReward` |
| SaveSystem | `progression/storage.ts` + 콘텐츠별 storage (localStorage, 앱인토스 storage 어댑터) |
| UIManager | `App.tsx` AppMode + 각 화면 컴포넌트, `titans-bottom-nav` |
| Ads | `ads/rewarded.ts` (idleDouble·booster4h·bossRetry, 일일 한도, QA 스텁) |
| Recommend | `progression/recommend.ts` (다음 목표) |

### 6. 수정 대상 (파일 단위)

- `src/beat/rpg.ts` — `records`(곡×난이도 최고 점수·콤보·무피격) 추가, 정규화.
- `src/BeatGame.tsx` — 결과 화면에 최고 기록·신기록, 허브 카드에 최고 점수, 공유 highScore 키 사용 중단.
- `src/TitansGame.tsx` — 허브 상단에 방치 상태 카드(자동 진행 중·경과·캡까지 남은 시간·예상 보상·정산). 콘텐츠 팝업 문구를 역할+기록으로.
- `src/App.tsx` — 화살 원정 HUD에 Wave n/N·BOSS 진행 표시, 결과 화면 문구.
- `src/game/arrows.ts` — (P1) 보스 티어별 고정 패턴.
- `src/App.css`, `src/idle.css` — 카드/HUD 스타일.

### 7. 신규 구현 대상

- `src/analytics/events.ts` — 이벤트 큐(로컬 링버퍼, P3에서 SDK 연결). `game_start … revive` 최소 세트.
- `src/progression/idleStatus.ts` — 허브 카드용 "지금 정산하면" 계산(기존 computeIdleYield 래핑).
- (P1) `src/game/bossPatterns.ts` — 보스 A~E 패턴 표.

### 8. UI 구조

`App` → `titans`(허브: 헤더·스테이지바·필드·하단 내비[사냥터/콘텐츠/루틴/상점/마이페이지]) → 콘텐츠 팝업(`nav-popup-grid`: 화살 원정·비트 수련·대장간) → 각 콘텐츠 전체 화면. 화살 원정은 `App` 안 캔버스+오버레이, 비트/대장간/이벤트는 컴포넌트.

### 9. 데이터 구조

TS 상수 모듈이 설정 역할: `STAGES`(StageConfig), `BEAT_TRACKS`+`LEVEL_FEATURES`(BeatExpeditionConfig), `AREAS`(DungeonConfig), `IDLE`(OfflineRewardConfig), `PROGRESSION_BALANCE`(RewardConfig), `AD_LIMITS`, 상품 카탈로그. 새 데이터 시스템 없이 여기에 추가한다.

### 10. 저장 구조

localStorage(앱인토스 storage 폴백) 키 `dodgebullets:*:<userHash>`. 공유 진행도(`progression:v1`)에 레벨·재화·기록(dodgeBestStage/Score, titanBestStage, towerBestFloor)·idleClaimedAt·adRewards. 콘텐츠별: titans, beatRpg, coins, shop, forge. 백업/복원(`game/backup.ts`).

================================
## 구현 계획
================================

### P0 (이번 단계)
- **P0-1 화살 원정**: 패턴 구간을 Wave n/N → BOSS 로 HUD에 표시(기존 패턴 표 그대로), 결과 화면에 "직접 플레이 보상" 축(강화석·견갑) 강조. 나머지(조작·회피·처치·게임오버·재도전·보상·성장 연결)는 이미 있음 → 그대로 유지.
- **P0-2 사냥터**: 허브 상단 방치 상태 카드 — 현재 스테이지·자동 진행 중·경과 시간·캡까지 남은 시간·예상 보상(골드/EXP/강화석)·[정산] (기존 claimIdle/귀환 모달 재사용). 광고 가속은 기존 자리 유지.
- **P0-3 비트 수련**: 곡×난이도 기록(최고 점수·최고 콤보·최고 정확도) 저장, 결과 화면 최고 기록·신기록, 허브 카드에 최고 점수. 공유 highScore 키 오염 제거.
- **콘텐츠 선택**: 콘텐츠 팝업 문구를 "역할 + 내 기록"으로(비트: 최고점수·기록 도전 / 화살: 직접 플레이·강력한 보상 / 사냥터 카드는 허브 자체).
- **분석 이벤트 구조**: `analytics/events.ts` 링버퍼 + 콘텐츠 시작/종료/기록/정산/광고 이벤트 호출.

### P1
- 비트 랭킹(로컬 기록 + 시드 Mock 상위권 UI), 고득점 조건(무피격·위험 노트 보너스 표시).
- 화살 원정 보스 A~E 고정 패턴(원형·추적·벽·나선·복합) — 스테이지/성벽 티어에 매핑, 학습 가능하게 예고.
- 화살 원정 런 중 성장 선택(웨이브 경계에서 3택: 참격 게이지·이동·HP).
- 사냥터 다중 지역 방치 슬롯(후원 계약 확장), 즉시 완료 버튼 상시 노출.
- 클리어 보상 2배 광고 자리(비트·화살) — 기존 `rewarded.ts` placement 추가.

### P2
- 특수 스킬·업적·미션·시즌 확장, 추가 보스·탄막, 고급 방치 던전, 특수 원정.

### P3
- 실제 광고 SDK·IAP·서버 랭킹·Remote Config·Analytics 연동·서버 오프라인 검증·치팅 방지.

================================
## P0 구현 결과 (2026-09-10)
================================

- **분석 이벤트** `src/analytics/events.ts` — `track(event, data)` 로컬 링버퍼(최근 200건, `dodgebullets:analytics`), DEV 콘솔 출력. 호출 지점: 화살 원정 start/clear/fail, 비트 start/end/score_record, 방치 정산 dungeon_reward_claim, 광고 ad_start/ad_complete. P3에서 SDK flush만 붙인다.
- **비트 기록** `beat/rpg.ts` — `records[trackId:difficulty] = {score, combo, accuracy, plays, cleared}`, `applyBeatRecord`(신기록 판정)·`bestRecord`·`bestScoreOverall`. 결과 화면(클리어/게임오버)에 "신기록! 점수/최고 · 콤보/최고", 허브 카드에 "최고 N점 · 콤보 · 정확도". 화살 원정과 공유하던 `highScore` 키 사용을 비트에서 제거.
- **사냥터 방치 카드** — 스테이지바 아래 "● 자동 사냥 중 · STAGE n / 시간당 +골드·EXP·강화석 / 최대 Th 누적 → 합계 — 닫아도 계속 쌓이고 다시 열면 정산". `computeIdleYield` 재사용. 화면 높이 720px 이하(360×640)에서는 숨겨 스킬 독·하단 내비 겹침을 막는다(inspect-mobile 게이트).
- **화살 원정 Wave HUD** — `stages.waveAt()` 로 패턴 구간을 `WAVE n/N` 으로, 보스는 기존 `BOSS k` 유지. 스크린샷으로 1/4 → 2/4 진행 확인.
- **콘텐츠 선택 팝업** — 화살 원정 "직접 플레이 · 탄막 회피 → 강화석·견갑 · 최고 S{n}", 비트 수련 "30초~2분 기록 도전 → 견갑 조각 · 최고점수 {n}", 대장간 "쌓인 골드·강화석으로 장비 제작·강화". 사냥터 자체가 '일반 던전' 카드 역할.
- **게이트**: verify-systems에 비트 기록 신기록/정규화, Wave 계산, 분석 링버퍼 단언 추가. 전체 순차 스위트 통과.

다음 단계(P1): 비트 랭킹 Mock UI · 화살 원정 보스 A~E 고정 패턴 · 런 중 성장 선택 · 클리어 보상 2배 광고 자리.

================================
## P1 구현 결과 (2026-09-10)
================================

- **화살 원정 보스 고정 패턴 A~E** `game/bossPatterns.ts` — 1스테이지 A 직선 조준, 2 B 부채 탄막(2발 ±28°, 느림), 3 C 추적탄+직선, 4 D 도탄 벽, 성벽(5+) E 복합(추적·도탄·부채 3발). `spawnBossSplitPattern` 이 랜덤 종류 대신 표를 쓴다. HUD `BOSS n · 패턴명`. 봇 게이트(1·2스테이지 5/5, 4스테이지 3/5) 유지.
- **런 중 성장 선택** `game/perks.ts` — 두 번째 웨이브에 들어설 때(보스는 58% 지점) 한 번 멈추고 3택: 참격 게이지 +35 / 이동 +12% / HP +1(가득이면 최대 +1) / 참격 강화 +1 / 회피 쿨 −15%(대시 해금 시). 런 한정, 상점 영구 강화와 별개. `GameState` 에 `perk` 추가, 선택 후 재개.
- **비트 주간 랭킹** `beat/ranking.ts` — 로컬 최고점 + 주차·유저 시드 Mock 6명(내 최고점 기준 배치), 내 순위·다음 순위까지 점수. 허브 상단 패널. 서버 랭킹은 P3.
- **클리어 보상 ×2 광고 자리** — `rewarded.ts` 에 `dodgeDouble`·`beatDouble`(하루 3회) 추가, 진행도 `adRewards` 확장. 화살 원정 클리어·비트 클리어 화면에 "광고 보고 코인 ×2"(광고 제거 보유 시 즉시). 미연동(웹)이면 자리 자체가 없다.
- **QA 훅** — 개발 빌드에서 `dodgebullets:qa-godmode=1` 이면 피격해도 죽지 않아 브라우저 검증이 성장 선택·보스·클리어 화면까지 도달한다(프로덕션 번들에는 없음).
- **게이트**: verify-systems 에 보스 패턴 고정/구성, 성장 선택 3택·적용, 주간 랭킹 정렬·재현, 광고 자리 가용성, 진행도 정규화 단언. 전체 순차 스위트 통과.

남은 P1: 사냥터 다중 방치 슬롯·즉시 완료 상시 노출(후원 계약과 연동 필요). P2·P3 는 계획 유지.

================================
## 아트·애니메이션 후속 점검 (2026-09-10, P0/P1 적용분)
================================

### 분석 — 어색한 것

| 화면 | 어색한 점 | 원인 |
|---|---|---|
| 사냥터 방치 카드 | 글자만 있는 초록 블록이 필드 위에 크게 앉아 있다. 골드·EXP·강화석이 텍스트라 한눈에 안 읽힌다 | 아이콘 없이 문장 3줄로 만들었다 |
| 화살 원정 성장 선택 | 같은 색 버튼 3개가 즉시 뜨고, 고르면 아무 피드백 없이 게임이 재개된다 | 아이콘·등장 애니메이션·적용 토스트가 없다 |
| 화살 원정 WAVE/BOSS | HUD 글자만 바뀌어 웨이브 전환과 보스 등장을 놓친다. 보스 패턴 이름은 있으나 "어떻게 오는지" 안내가 없다 | 전환 배너가 없다. `bossPatterns.hint` 를 쓰지 않는다 |
| 비트 주간 랭킹 | 이름과 숫자만 있는 표. 상위권 구분이 없고 Mock 이름 2종(무희·연주자)은 원화가 없어 검객으로 폴백 | 아바타·메달 없음, 이름 표가 그림자 원화 8종과 안 맞음 |
| 비트 결과 신기록 | 노란 글자만 바뀐다 | 팝 애니메이션 없음 |

### 계획 — 기존 자산만 재사용, 새 생성 없음

1. 방치 카드: `RewardIcon`(gold·materials)과 `ui/idle/exp-orb.svg` 로 칩 3개 + 하단에 자동 사냥 진행 시머 라인. 문장은 한 줄로.
2. 성장 선택: 항목별 아이콘(`cores`·`boost`·`materials`·`weaponFx`·exp-orb), 0/90/180ms 순차 팝인, 선택 시 HUD 토스트 "○○ 적용".
3. WAVE/BOSS 배너: 웨이브가 바뀔 때 "WAVE n · 패턴 이름" 1.6초 배너, 보스 등장 시 "BOSS · 패턴명 — 힌트" 배너(`bossPatterns.hint`). `.combo-flash` 계열 애니메이션 재사용.
4. 랭킹: 그림자 원화 아바타(이름 명사 = 직업 8종으로 맞춤), 1~3위 메달 색, 내 줄은 주인공 아이콘.
5. 신기록 줄: 팝(scale) + 글로우 애니메이션.
6. 검증: inspect-mobile(겹침), verify-all, 스크린샷(허브·성장 선택·배너·랭킹).

### 결과 (2026-09-10)

- **방치 카드**: 아이콘 칩 3개(골드·EXP 오브·강화석) + 우측 "시간당 · 최대 Th" + 하단 스위프 라인(자동 사냥이 돌고 있다는 느낌). 최대 누적 합계는 한 줄 문장으로. 360×640에서는 여전히 숨김(inspect-mobile 0 겹침).
- **성장 선택**: 항목별 색(회복 장미·이동 호박·참격 보라·회피 청록)과 아이콘, 90ms 간격 팝인, 제목 글로우. 선택하면 HUD에 "○○ / 이번 런 동안 적용" 배너.
- **WAVE/BOSS 배너**: 웨이브 전환 "WAVE n · 패턴 이름"(1.7초), 보스 등장 "BOSS · 패턴명 — 힌트"(2.6초, 장미색). 추격대장 예고 바와 겹치지 않게 150px 아래, 제목 한 줄 고정.
- **랭킹**: 그림자 원화 아바타(이름 명사를 직업 8종으로 맞춤), 1~3위 금·은·동 메달 색, 내 줄은 주인공 아이콘 + 시안 테두리.
- **신기록 줄**: 팝 + 글로우 0.6초.
- 스크린샷: `scratchpad/art/{hub,rank,perk,toast,wave,boss}.png` 로 확인. 새 원화 생성은 없고 기존 보상·출석·그림자 원화만 재사용했다.
