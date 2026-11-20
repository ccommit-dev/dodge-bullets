/**
 * 온라인(접속자 · 채팅 · 랭킹) 서버 주소 (2026-11-20, 사용자: "github action 에서도 서버 동작 — 서버 · 채팅 · 랭킹 · 화면").
 * 서버는 server/(Cloudflare Workers)이고 GitHub Actions(.github/workflows/server.yml)가 배포한다.
 * 주소는 사이트 빌드(scripts/build-pages-head.mjs)만 넣는다(server/PUBLIC_URL → VITE_ONLINE_URL) — 안드로이드 · 토스 빌드엔 없어 꺼진다.
 * 개발 서버에서는 localStorage dodgebullets:online-url 로 덮어 볼 수 있다(검사 하니스 · 로컬 wrangler dev). 없으면 꺼짐 — 기존 검사 판은 그대로.
 */
export const ONLINE_URL_KEY = "dodgebullets:online-url";

export function onlineUrl(): string {
  if (import.meta.env.DEV) {
    try {
      const o = typeof localStorage !== "undefined" ? localStorage.getItem(ONLINE_URL_KEY) : null;
      if (o) return o.trim().replace(/\/+$/, "");
    } catch { /* 저장 못 읽으면 빌드 값 */ }
  }
  return (import.meta.env.VITE_ONLINE_URL ?? "").trim().replace(/\/+$/, "");
}

/** http(s)://… → ws(s)://…/ws */
export function wsUrl(base: string): string {
  return base.replace(/^http/, "ws") + "/ws";
}
