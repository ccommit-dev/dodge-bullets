# 총피하기 온라인 서버

게임 사이트(GitHub Pages)에 **접속자 · 채팅 · 랭킹 · 기록 소식**을 붙이는 서버다. Cloudflare Workers + Durable Object 하나(`Lobby`).
게임 쪽 화면은 `src/online/`(오른쪽 가장자리 탭 → 랭킹 · 채팅 · 접속자 판), 주소가 없으면 꺼져 있다.

| 경로 | 내용 |
|---|---|
| `GET /healthz` | 살아 있음 |
| `GET /api/boards` | 랭킹 — 사냥터 최고 층 · 성문 방어 최고 점수 (CORS: 허용 주소만) |
| `GET /api/online` | 접속자 수 |
| `WS /ws` | `hello` → `welcome`, 이후 `chat` · `status` · `score` · `name` |

지키는 것: WebSocket 은 허용 주소(`wrangler.toml` `ALLOWED_ORIGINS` + localhost)만 · IP 하나에 연결 4개(IP 는 해시로만 쓰고 저장하지 않음) ·
채팅 100자 · 0.8초 간격 · 비속어 가림 · `CHAT_ENABLED = "false"` 로 채팅만 끄기 · 상한을 넘는 기록은 버림 · 닉네임 말고 개인정보 없음.
실시간 함께 플레이(협동 · 대전)는 없다 — 기록 · 대화만 나눈다.

## 처음 한 번 — Cloudflare 연결 (약 5분)

1. https://dash.cloudflare.com 에서 무료 계정을 만든다.
2. **Workers & Pages** 를 한 번 열어 `workers.dev` 하위 도메인을 정한다(안 정하면 첫 배포가 실패한다).
3. **My Profile → API Tokens → Create Token → "Edit Cloudflare Workers"** 템플릿으로 토큰을 만든다.
4. 대시보드 오른쪽(또는 Workers & Pages 개요)의 **Account ID** 를 복사한다.
5. GitHub 저장소 **Settings → Secrets and variables → Actions → New repository secret** 에 넣는다:
   `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
6. **Actions → Deploy online server (Cloudflare Workers) → Run workflow**. 요약에 나온 주소(`https://dodge-bullets-online.<하위도메인>.workers.dev`)를
   `server/PUBLIC_URL` 파일에 한 줄로 넣고 커밋 → `npm run pages:head` 로 사이트를 다시 빌드하면 게임에 온라인 판이 켜진다.

그다음부터는 `server/**` 를 고쳐 main 에 푸시하면 Actions 가 자동으로 다시 배포한다.

## 로컬

```bash
cd server
npm ci
npm run dev          # http://127.0.0.1:8787 (wrangler dev, 저장은 server/.wrangler/state)
```

개발 서버(5173)에서 보려면 브라우저 콘솔에서 `localStorage.setItem("dodgebullets:online-url", "http://127.0.0.1:8787")` 뒤 새로 고침.
검사: `node scripts/verify-online.mjs` (로컬 서버가 없으면 건너뜀).
