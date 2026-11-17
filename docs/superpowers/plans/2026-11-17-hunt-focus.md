# 사냥 화면 집중 — 화면 구성 · 셀 그림결 · 도트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사냥 화면에서 눈이 캐릭터로 가게 한다. 순서는 ① 화면 구성 → ② 셀 그림결 → ③ 도트 그림체(설정에서 선택)다.

**Architecture:**
- ①은 새 CSS 층 `src/ui/huntFocus.css`(App 맨 뒤)와 TitansGame 의 작은 표지(class)만 쓴다. 성장 판은 이미 있는 가로 서랍(`growthOpen` · unify.css)을 세로에도 켠다.
- ②는 Blender 렌더를 EEVEE 툰으로 바꾼다(`lib/toon.py`: Shader→RGB 계단 · 반사광 없음 · 굵은 외곽선). 후광(aura)은 그림에서 빼고 CSS 후광으로 옮겨 대장전 · 컷인 때만 켠다. 배경은 `scripts/toonify-backgrounds.mjs` 로 같은 색 규칙(색 단 줄이기 · 채도 낮춤 · 어두운 선)을 입힌다.
- ③은 같은 리그를 낮은 해상도 · AA 없이 렌더한다(`render_anim2.py --pixel`). 칸 조립은 `assemble-anim2.mjs --pixel` 이 `public/titans/anim-px/…` 에 쓴다. 게임은 설정 '그림체: 셀 / 도트' 로 시트 경로와 `image-rendering: pixelated` 를 바꾼다.

**Tech Stack:** React 19 · Vite · CSS · Blender 5.2(EEVEE) · sharp(node).

**Spec:** 사용자 /goal 2026-11-17 — ① 전장 60~70% · HUD 얇은 띠 · 성장 판 서랍 · 캐릭터 1.5배 · 배경 채도 · 대비 낮춤 · 발판 고리 · 후광은 대장전 · 컷인만. ② 평면 색 2~3단 · 굵은 외곽선 · 반사광 없음, 배경도 같은 선 · 색 규칙. ③ 도트. 모두 진행.

## Global Constraints

- 공통 동료 배율 `beaver k` 0.346 은 그대로 둔다. 조립 전후로 같아야 한다.
- 밸런스 · 수치는 바꾸지 않는다. 그림과 배치만 바꾼다.
- 특정 게임(메이플 · 바람의나라)의 모습 · 캐릭터를 베끼지 않는다. 원칙만 따른다(한 그림결 · 큰 무대 · 얇은 UI).
- 모바일 390×844 · 360×640 · SE 375×667 · PC 웹 기둥(html.web-frame 460px)에서 가로 넘침이 없어야 한다.
- 커밋은 경로를 적어서 한다. 공유 작업 트리의 옆 세션 파일은 넣지 않는다. 푸시 전에 ci-local 을 통과해야 한다.
- 렌더는 Blender 를 한 번에 하나만 돌린다. 옆 세션과 GPU 를 나눈다.

## Review Focus

1. 360×640 같은 낮은 폰 — 전장을 키우면 탭 줄 · 서랍 손잡이가 아래 내비에 가린다. `verify-hunt-focus` 가 세 크기를 잰다.
2. 서랍이 열린 채 전투 — 판이 전장을 덮어도 탭(공격)은 판 밖에서만 받아야 한다.
3. 대장전 진입 · 컷인 — 이때만 발판 고리 · 후광이 켜지고 끝나면 꺼져야 한다.
4. 도트 모드에서 무기 · 입는 파츠(DOM 겹침)가 시트와 같은 배율로 맞아야 한다. 손잡이 점(verify-weapon-grip)도 맞아야 한다.
5. 옛 검사들의 배치 단언(verify-hud-layout · inspect-formation · walk-y)은 새 높이 기준으로 바꾼다. 문턱은 올리지 않는다.

---

### Task 1: ① 화면 구성 CSS 층 + 서랍

**Files:**
- Create: `src/ui/huntFocus.css`, `scripts/verify-hunt-focus.mjs`
- Modify: `src/App.tsx`(import 맨 뒤), `src/TitansGame.tsx`(`titans-field` 에 `is-boss` · `has-cutin` 표지, 세로 서랍 기본값)

- [ ] 검사 먼저(`verify-hunt-focus`, 390×844 · 360×640 · 375×667):
  - 전장(.titans-field) 높이 ≥ 화면의 60%
  - HUD 띠 높이 ≤ 44px
  - 성장 판은 닫힌 채 시작한다. 탭을 누르면 서랍이 올라오고 ▾ 로 닫힌다.
  - 캐릭터 높이 ≥ 예전(동료 74px)의 1.4배
  - 배경 filter 에 saturate(<1)
  - 일반 몬스터 때 발판 고리 · 후광 0, 대장 때 > 0
  - 가로 넘침 0
- [ ] huntFocus.css: 세로에서도 `growth-open` 서랍을 쓴다(unify.css 의 가로 규칙과 같은 모양), 필드 높이는 `calc(100dvh - 머리 - 탭 줄 - 내비)`. stagebar · idle 줄 · HP · 우편/다음 목표는 한 줄 띠로 둔다. 다음 목표는 탭 줄 바로 위 한 줄. 캐릭터 크기 변수 ×1.5, 배경 `saturate(.6) contrast(.85)`.
- [ ] 발판 고리 · 후광: `.titans-field:not(.is-boss):not(.has-cutin)` 일 때 숨긴다.
- [ ] 깨지는 옛 배치 검사를 새 기준으로 고친다. 고친 이유를 검사 주석에 쓴다.
- [ ] verify-all 의 사냥터 묶음 · ci-local 통과 · 커밋.

### Task 2: ② 셀 그림결 렌더

**Files:**
- Create: `art-gen/blender/lib/toon.py`(EEVEE 툰 재질 · 외곽선 굵기 · 조명)
- Modify: `art-gen/blender/render_roster.py`(setup 에 `ART_STYLE=toon` 이면 EEVEE + toon), `lib/beaver.py` · `lib/creature.py` · `lib/mount.py` 재질 생성 지점(`C.principled` → 툰이면 `toon.material`), `beaver_kit.aura_new`(툰이면 건너뜀)
- Test: look_lab 시트 · `audit-anim2-motion` · `beaver k` · `verify-anim2` · `verify-ally-desire`

- [ ] 룩데브: 주인공 · 동료 4 · 몬스터 2 를 셀(EEVEE)로 렌더해 지금 그림과 나란히 둔다. 평면 색 3단 · 외곽선 굵기 · 반사광 없음을 눈으로 확인한다.
- [ ] 후광 CSS(`ally-halo`, 등급 UR · LR)를 Task 1 의 대장전 · 컷인 규칙에 넣는다.
- [ ] 일괄 렌더(동료 54 + 스킨 10 + 주인공 시트 + 무기별 공격 + 탈것 위 + 몬스터 31 + 펫 6 + 탈것 4 + 입는 파츠)와 조립. beaver k 를 확인한다.
- [ ] 배경: `scripts/toonify-backgrounds.mjs` 가 `public/titans/backgrounds/*`(사냥터 지역 배경)를 색 단 줄이기 · 채도 낮춤 · 어두운 테두리 선으로 바꾼다. 원본은 `art-gen/backgrounds-src/` 에 둔다.
- [ ] 검사 · 커밋 · 푸시.

### Task 3: ③ 도트 그림체(설정 선택)

**Files:**
- Modify: `art-gen/blender/render_anim2.py`(`--pixel`: 해상도 1/8 · filter 0 · 외곽선 1px), `scripts/assemble-anim2.mjs`(`--pixel` → `public/titans/anim-px`), `src/titans/animLayout.ts` 소비부(`sheetUrl(style)`), 설정 화면(그림체 줄), `src/ui/pixelMode.css`
- Create: `scripts/verify-pixel-mode.mjs`

- [ ] 도트 렌더 · 조립(같은 목록). 팔레트는 16~24색으로 줄인다.
- [ ] 설정 '그림체: 셀 · 도트'. 저장은 localStorage 편의 값이다. 도트일 때 시트 경로를 바꾸고 `image-rendering: pixelated`, 배경은 픽셀화본을 쓴다.
- [ ] 검사: 도트 모드에서 시트가 anim-px 에서 오는지, 404 가 없는지, 손잡이 점이 맞는지, 넘침이 없는지 본다.
- [ ] 커밋 · 푸시.
