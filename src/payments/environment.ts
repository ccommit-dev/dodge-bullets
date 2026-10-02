/**
 * 결제 환경 (2026-10-02) — 부팅 때 **한 번** 정한다. 결제·광고·가격은 전부 이 값으로 갈라진다.
 *   toss    토스 미니앱 (사용자 키를 토스 SDK 에서 받았다)   → 토스 인앱결제 · 토스 AdMob
 *   android Capacitor 네이티브                              → Google Play Billing (@capgo/native-purchases)
 *   web     그 밖의 브라우저                                 → 판매 없음 (데모·QA 전용)
 * 매 호출마다 SDK 를 더듬지 않는다 — 브리지가 응답 없이 멈추는 WebView 가 있었다(안드로이드 부팅 멈춤).
 */
export type PaymentEnvironment = "toss" | "android" | "web";

let current: PaymentEnvironment = "web";

export function setPaymentEnvironment(env: PaymentEnvironment): void {
  current = env;
}

export function paymentEnvironment(): PaymentEnvironment {
  return current;
}

/** 부팅 결과로 환경을 고른다 — 키 출처가 sdk 면 토스, 아니면 네이티브 여부 */
export function detectPaymentEnvironment(keySource: "sdk" | "mock", native: boolean): PaymentEnvironment {
  if (keySource === "sdk") return "toss";
  return native ? "android" : "web";
}
