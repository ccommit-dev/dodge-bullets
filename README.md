# 총알 피하기 (dodge-bullets)

앱인토스 미니앱용 총알 피하기 웹게임 MVP입니다.  
인앱 광고/결제는 포함하지 않습니다.

## 스택

- React + TypeScript + Canvas
- `@apps-in-toss/web-framework`

## 실행

```bash
npm install
npm run dev
```

로컬: `http://localhost:5173`

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 로컬 개발 서버 |
| `npm run build` | `.ait` 빌드 |
| `npm run deploy` | 배포 |
| `npm run lint` | ESLint |

## 포트 충돌 (EADDRINUSE)

`granite dev`는 8081, Vite는 5173을 씁니다.  
이전 dev 서버가 남아 있으면 `EADDRINUSE 0.0.0.0:8081`이 납니다.

```bash
lsof -nP -tiTCP:8081 -sTCP:LISTEN | xargs kill -9
lsof -nP -tiTCP:5173 -sTCP:LISTEN | xargs kill -9
```

## 설정

`granite.config.ts`의 `appName`, `brand.displayName`, `brand.icon`을  
앱인토스 콘솔에 등록한 값과 동일하게 맞추세요.

## 스테이지 · 상점 밸런스

| Stage | 이름 | 생존 | 기본 보상 | 패턴 포인트 |
|------|------|------|-----------|-------------|
| 1 | 워밍업 | 14s | 55c | 즉시 rain |
| 2 | 횡풍 | 15s | 75c | side → rain |
| 3 | 교차 | 16s | 95c | cross → burst |
| 4 | 바닥쓸기 | 16s | 120c | sweep → burst |
| 5 | 폭풍전야 | 17s | 150c | 0.5s rest 후 burst |
| 6 | 결전 | 18s | 200c | 전 패턴 연속 |

속도감: 긴 rest 제거 · 니어미스 콤보 · 인트로 0.75s 자동시작 · 기본 이동 상향  
상점 (코인만, 광고/결제 없음): 이동속도 / 점프력 / 대시 / 슬로우 / 여분생명  
수치: `src/game/shop.ts` · 스테이지: `src/game/stages.ts`

## Day 1-6 (SDK)

- `granite.config.ts` `appName: dodgebullets` (콘솔과 동일)
- 식별키: `getAnonymousKey` / `getUserKeyForGame` + 로컬 mock
- 최고점: `Storage` 우선, 실패 시 `localStorage` (`dodgebullets:highScore:{hash}`)
- Safe Area: `SafeAreaInsets` + CSS 폴백
- 종료: 좌측 **종료** → 확인 모달 → `closeView()`
- 광고/결제 코드 없음

## Day 1에서 건드릴 파일

- `src/App.tsx` — 게임 상태 / 오버레이 / rAF 루프
- `src/App.css` — Safe Area / HUD / 오버레이
- `src/game/types.ts` — 상태·월드 타입
- `src/game/world.ts` — 리사이즈·플레이어·업데이트
- `src/game/draw.ts` — Canvas 렌더
- `granite.config.ts` — 앱인토스 앱 메타
- `index.html` — viewport / 풀스크린 메타

### Day 1-1 완료

- 전체 화면 Canvas + `requestAnimationFrame` + deltaTime
- DPR/리사이즈 대응
- `ready | playing | gameover` 상태 전환 UI
- playing 중 플레이어 미세 상하 움직임(루프 동작 확인용)
