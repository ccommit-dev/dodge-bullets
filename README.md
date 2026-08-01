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
