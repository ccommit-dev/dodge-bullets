/// <reference types="vite/client" />

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_COMMUNITY_URL?: string;
  /** "true" 면 QA 빌드 — CI 디버그 APK · GitHub Pages 데모. 출시 빌드는 비워 둔다 (progression/storage.ts QA_BUILD) */
  readonly VITE_QA_BUILD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
