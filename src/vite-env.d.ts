/// <reference types="vite/client" />

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_COMMUNITY_URL?: string;
  /** "true" 면 QA 빌드 — CI 디버그 APK · GitHub Pages 데모. 출시 빌드는 비워 둔다 (progression/storage.ts QA_BUILD) */
  readonly VITE_QA_BUILD?: string;
  /** 토스 미니앱 보상형 광고 그룹 ID (앱인토스 콘솔 발급). 비어 있으면 토스에서도 광고 자리를 숨긴다 */
  readonly VITE_TOSS_AD_GROUP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
