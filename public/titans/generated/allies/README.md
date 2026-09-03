# 동료 아트 교체 안내 (계획안 F)

원화가 도착하면 **같은 파일명으로 덮어쓰기만** 하면 게임에 반영된다. 코드 수정은 필요 없다.

## 1. 4상태 아틀라스 (우선 — 전투에서 움직인다)

| 파일 | 격자 | 셀 크기 | 행 순서 |
|---|---|---|---|
| `ally-animation-atlas-v1.png` | 4열 × 6행 | 313.5 × 209 | mia, leon, sera, garen, ari, nox |
| `ally-variant-atlas-v1.png` | 4열 × 10행 | 313.5 × 209 | pyro, marina, terra, zephyr, bronn, iris, cain, sylph, orion, ember |
| `ally-skin-atlas-v1.png` | 4열 × 2행 | 313.5 × 209 | garen-magma, leon-frost |
| `ally-special-animation-atlas-v1.png` | 4열 × 4행 | 313.5 × 313.5 (정사각) | luna, volt, mia_dark, sera_light |

열 순서는 고정: **0 대기 · 1 이동 · 2 공격 · 3 피격**.
가로로 넓은 셀(1.5:1)은 렌더에서 폭 150%로 보정되므로 셀 비율만 지키면 된다.
변형·스킨 아틀라스는 현재 원본 행의 tint 파생(`scripts/make-variant-atlas.mjs`)이다. 원화를 같은 격자로 배치해 덮어쓴다.

무기: `src/titans/SpriteArt.tsx`의 `WEAPON_STATE_ANCHOR`가 상태별 무기 위치를 원본 6명 기준으로 잡는다. 원화의 손 위치가 다르면 그 표의 dx·dy·rot만 수정한다.

## 2. 개별 PNG (정지 폴백 · 도감·뽑기 쇼케이스)

`<id>.png` — 아틀라스에 행이 없는 동료만 전투에서 이 파일을 쓴다(정지). 도감 카드·뽑기 쇼케이스는 아틀라스 대기 프레임을 쓴다.
현재 파일: luna, volt, mia-dark, sera-light, pyro, marina, terra, zephyr, bronn, iris, cain, sylph, orion, ember, garen-magma, leon-frost.
투명 배경 PNG, 세로 기준 하단 정렬(`center bottom`)이라 폭·높이는 자유.

## 3. 검증

```bash
node scripts/verify-systems.mjs   # 4상태 프레임 상이·비율 보정·앵커 표
node scripts/verify-anim.mjs      # 전투에서 프레임 전환·무기 앵커 (dev 서버 필요)
node scripts/shot-variants.mjs    # 변형·스킨 프레임 캡처 → store/anim-inspect
```
