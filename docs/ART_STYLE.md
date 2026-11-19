# 그림체 — 셀(기본) · 도트 · 사냥 화면 집중

2026-11-17 사용자: "리소스가 이게 최선일까 — 메이플이나 바람의나라처럼 집중이 안 돼" → /goal ① 화면 구성 ② 셀 그림결 ③ 도트, 모두 진행.
두 게임은 원칙만 따른다(한 그림결 · 큰 무대 · 얇은 UI). 모습 · 캐릭터는 베끼지 않는다.

## ① 사냥 화면 구성 — `src/ui/huntFocus.css`

| 항목 | 지금 | 예전 |
|---|---|---|
| 전장 높이 | 머리 · 탭 줄 · 내비를 뺀 전부(390×844 에서 75%, 360×640 67%) | 58%, 그 위쪽 절반을 HUD 판이 덮었다 |
| 위 HUD | HP 막대가 띠(30px), 그 위에 'STAGE n · m/10' · 우편. 띠 아래 왼쪽 '● 자동 사냥' · 오른쪽 '다음 목표' 칩 | HP · 스테이지 판 · 자동 사냥 줄 · 우편/다음 목표(131px) |
| 성장 판 | 탭을 누르면 아래에서 올라오는 서랍(▾ 로 닫는다) | 전장 아래에 펼쳐져 화면이 내려갔다 |
| 캐릭터 | 주인공 동료 크기(76~84px, 2026-11-19 — 칭호 명패 · 금색 윤곽선으로 구분) · 대장 160px · 몬스터 130px · 동료 88px | — |
| 배경 | 채도 0.5 · 대비 0.78 · 살짝 흐림(초점이 캐릭터로) | 원래 색 |
| 발판 고리 · 후광 | 대장전(.boss) · 컷인(.has-cutin) · 뽑기 소개 때만 | 늘 |

동료 대열은 세 줄이다(`SpriteArt lineFormation` 의 칸 변수 `--fl-l<칸>-col/-y` · `--fl-r1-*`).
- 동료를 1.5배로 키우면 넷이 366px 폭에 한두 줄로 서야 해서 70% 겹쳤다(verify-formation 문턱 25%). 폭 여유가 예전 크기에서도 49px 뿐이었다.
- 그래서 주인공만 1.5배로 두고, 동료는 1.1배로 두고 세로 깊이로 펼쳤다.
- 2026-11-19 사용자 "캐릭터가 동료 사이즈랑 비슷하게 · 칭호랑 윤곽선으로 내 캐릭터인 걸 명시" — 주인공을 동료 크기로 줄이고(ui/huntFocus.css `--hero-size`), 머리 위 명패(칭호 · 11px)와 금색 윤곽선(drop-shadow 네 방향, 저사양은 빛 하나 + 발밑 고리)으로 구분한다.
- 원거리 주인공은 34px 뒤에 선다. 몬스터와 30px 넘게 떨어져야 한다(verify-hunt-motion).

## ② 셀 그림결 — `art-gen/blender/lib/toon.py`

`ART_STYLE=toon` 이면 렌더 직전에 모든 재질의 Principled BSDF 를 셀 재질로 바꾼다.
- 고정 광원 방향과 법선의 각도로 계단 3단을 만든다. 밝기는 0.84 · 1.05 · 1.18 이다.
- Emission 으로만 그리므로 반사광 · 잡음이 없다. 샘플은 16, 디노이즈는 끈다(동료 하나 14초, 예전엔 100초).
- 기본 색(값이든 연결이든) · 발광 · 투명은 그대로 둔다. 외곽선만 1.3배 굵게 한다.
- 신화 · 초월 후광(`beaver_kit.aura_new`)은 그림에서 빼고 CSS 후광(`SpriteArt .ally-halo`, 속성 색)으로 그린다.

| 대상 | 렌더 | 조립 |
|---|---|---|
| 동료 · 스킨 · 주인공(공격 · 탈것 위) · 몬스터 · 펫 · 탈것 | `ART_STYLE=toon blender -b -P art-gen/blender/render_anim2.py -- <id>` | `node scripts/assemble-anim2.mjs` · `hero-ride` · 주인공 스킨 `make-character-skins.mjs --anim2` |
| 입는 파츠 | `ART_STYLE=toon … hero_gear.py -- <kind> [--ride]` (오텀은 `--only=gloves`) | `assemble-anim2.mjs hero-gear` |
| 손에 드는 무기 | `ART_STYLE=toon … gear_icons.py -- weapon-1 … staff-3` | `assemble-gear.mjs weapon spear bow staff` → `art-gen/weapon-skin-tint.mjs` |
| 사냥터 배경 | — | `node scripts/style-backgrounds.mjs`(원본 `art-gen/backgrounds-src`: 잔결 지우기 → 28색 평면 → 색 경계 잉크선) |
| 사냥터 바닥(2026-11-19) | `ART_STYLE=toon … hunt_ground.py -- all` | `node scripts/assemble-hunt-ground.mjs` → `backgrounds/ground-<지역>.webp` · `backgrounds-px`. 가운데 흙길(그림 세로 29~61%)이 발 자리 — 소품은 뒤 가장자리 · 아래 모서리만 |
| 몬스터 테두리빛(2026-11-19) | — | `assemble-anim2` 가 적 시트(탈것 · 펫 빼고, 셀만)에 굽는다(`scripts/lib/monster-rim.mjs`). 지금 시트만 다시 굽기: `node scripts/monster-rim.mjs [id…]`(원본 `art-gen/out/monster-sheets-orig`) |
| 무기 아이콘 · 견갑(2026-11-19) | `ART_STYLE=toon … gear_icons.py -- icons shoulders` | `assemble-gear.mjs icon- shoulder-… set-…-shoulder` → `titans/gear/icon/<kind>-<t>.png`(칸 아이콘 전용 · `weaponBadgePath`). 손에 드는 그림(`weaponIconPath`)과 따로 |
| 비트 표지(2026-11-19) | `ART_STYLE=toon … beat_covers.py -- <id>`(픽셀 곡 둘은 `ART_STYLE=pixel`) — 표지마다 Blender 따로 | `node scripts/assemble-beat-covers.mjs` → `public/beat/covers/<id>.png` 256² |

## ③ 도트 — 설정 '그림체: 셀 · 도트'

- 큰 그림을 줄이면 뭉개진다. 그래서 같은 리그를 처음부터 작게 렌더한다. `ART_STYLE=pixel` 은 89px(= 1024 × 0.346 ÷ 4), 픽셀 필터 0.01, 외곽선 2.2배다.
- 출력은 `art-gen/out/b3d2-px` · `b3d2-gear-px` · `b3d-gear-px`(무기 48px) 이다.
- 조립은 `--pixel` 이다(`assemble-anim2` · `assemble-gear` · `weapon-skin-tint` · `make-character-skins`). 최근접 확대 · 무손실 webp로 `public/titans/anim-px` · `gear-px` 에 쓴다. 배경은 `style-backgrounds.mjs` 가 ¼ · 24색으로 `backgrounds-px` 에 쓴다.
- 게임 쪽(`src/ui/artStyle.ts`):
  - `assetUrl` 이 경로를 바꾼다(시트 · 무기 · 배경).
  - `html.art-pixel` 이면 `image-rendering: pixelated` 다(ui/pixelMode.css).
  - 성문 방어 캔버스는 `imageSmoothingEnabled = false` 다.
  - 앵커 · 배치 TS 는 셀과 같은 것을 쓴다. 같은 리그 · 같은 칸 비율이라 맞는다.
  - 값은 기기마다 localStorage 에 두고, 바꾸면 다시 불러온다.

## 검사

`verify-hunt-focus`(화면 3크기 · 서랍 · 고리/후광 · 셀/도트 경로 · 404) · `verify-formation` · `verify-hunt-motion` · `verify-wing-clip` · `verify-tier-visuals`(고리: 일반 숨김 · 대장 켜짐) · `audit-anim2-motion` · `beaver k 0.346`.
