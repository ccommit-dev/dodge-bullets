# 월간 한정 동료 운영 (2026-11-16)

달마다 한정 동료 한 명과 그 동료 전용 장비 하나를 내놓는다. 이번 달에만 얻을 수 있다.
새 재화는 없다. 동료는 지금 뽑기로, 장비는 이벤트 상점(이벤트 코인)으로 얻는다.

## 규칙

| 항목 | 규칙 | 코드 |
|---|---|---|
| 기간 | 표의 `start` 이상 `end` 미만(KST). 첫 줄은 11-16 ~ 12-16, 30일 | `src/titans/limitedAllies.ts` `LIMITED_ALLIES` |
| 뽑기 | 기간 안에서만 풀에 있다. 같은 등급 안에서 픽업 가중 ×2. 2주 픽업 회전과는 따로 간다 | `src/titans/gacha.ts` `gachaPool` |
| 확률 공시 | 공시 표(`rateTable`)와 배너에 같은 값이 나온다 | 뽑기 페이지 `.limited-banner` |
| 기간이 끝나면 | 뽑기에서만 빠진다. 이미 얻은 동료는 그대로 쓰고 도감에도 남는다 | `limitedInPool` |
| 힘 | 기본 값은 같은 층 · 같은 등급 곡선 그대로다. 쓰임새만 다르다(대장 전용: 대장 ×1.2 · 일반 ×0.82) | `allyRoster` 곡선 · `limitedAllyHitMul` |
| 곡선 안 | 대장 배율 < 한 층 위 같은 등급 곡선 비(층당 ×1.3 안팎), 일반 배율 < 1 | `scripts/verify-limited-ally.mjs` |
| 사냥 속도 | balance-sim 이 한정 배율을 넣고 잰다. 한정 동료를 늘 얻는다고 보는 상한 쪽 가정이다. 30일차 24~25층 · 벽 27~28일 | `scripts/verify-pace-lock.mjs` |
| 전용 장비 | 장갑 칸. 그 동료가 출전 중이면 대장 피해 +4%로, 창 세트 한 부위와 같은 크기다. 세트 보너스에는 안 들고 강화도 없다 | `equipment/gearSets.ts` `LIMITED_GEAR` · `limitedGearBossMul` |
| 장비 얻기 | 이벤트 상점에서 이벤트 코인 100개, 주 1회. 기간 안이고 아직 없을 때만 진열된다 | `economy/eventShop.ts` `coin-limited-gear` |

## 새 달 추가 순서

1. `src/titans/limitedAllies.ts` `LIMITED_ALLIES` 에 한 줄을 넣는다. id · gear · start · end · title · bossMul · mobMul.
2. `src/titans/allyRoster.ts` 의 `NEW_ALLY_IDS` 와 `NEW_ALLIES` 에 한 줄씩 넣는다. 등급 · 역할 · 속성 · 층 · 기술 이름.
3. `art-gen/blender/roster_ext.py` 에 한 줄을 넣는다. 체형(form) · 등급 장식(aura · 날개)까지 적는다.
   - 얼굴은 `art-gen/blender/roster_looks.py` 의 `LOOKS` 에 한 줄을 넣는다(눈 · 주둥이 · 코 · 이 · 볼 · 무늬). 다른 동료와 같은 조합이 없게 고른다.
   - 렌더: `blender -b -P art-gen/blender/render_anim2.py -- <id>`
   - 조립: `node scripts/assemble-anim2.mjs <id>`. 공유 배율 `beaver k` 가 그대로 0.346 인지 본다.
4. 전용 장비를 넣는다. `LimitedGearId` 와 `LIMITED_GEAR` 에 한 줄을 넣고, `gear_icons.py` · `hero_gear.py` 의 `SETS` 에 색을 넣는다.
   - 아이콘: `gear_icons.py -- set-<id>` 로 렌더하고 `node scripts/assemble-gear.mjs set-<id>` 로 조립한다.
   - 입은 모습: `hero_gear.py -- <kind> --only=gloves` 와 `--ride` 로 렌더하고 `assemble-anim2.mjs hero-gear` 로 조립한다.
5. 검사: `verify-limited-ally` 의 창 날짜와 기대값, `verify-systems` 로스터 수, `verify-pace-lock` 을 돌린다.
