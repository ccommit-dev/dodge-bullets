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

## 설정

`granite.config.ts`의 `appName`, `brand.displayName`, `brand.icon`을  
앱인토스 콘솔에 등록한 값과 동일하게 맞추세요.

## Day 1에서 건드릴 파일

- `src/App.tsx` — 게임 상태 / 오버레이
- `src/App.css` — Safe Area / HUD / 오버레이
- `src/game/` (예정) — 루프, 플레이어, 총알, 충돌
- `granite.config.ts` — 앱인토스 앱 메타
- `index.html` — viewport / 풀스크린 메타
