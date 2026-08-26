/**
 * 로컬 오류 로그.
 *
 * 이 게임은 "데이터 수집 없음"이 개인정보처리방침의 핵심이라 Sentry류 원격
 * 수집기를 붙일 수 없다. 대신 기기 안에만 남는 링 버퍼에 오류를 쌓고,
 * 설정 메뉴에서 사용자가 직접 복사해 문의 채널(GitHub Issues)에 붙여넣게 한다.
 * 크래시·ANR 집계는 Play Console 기본 통계가 별도로 제공한다.
 */

const KEY = "dodgebullets:errorlog:v1";
const MAX_ENTRIES = 30;

export type ErrorEntry = {
  at: string;
  kind: "error" | "unhandledrejection";
  message: string;
  stack?: string;
};

function read(): ErrorEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as ErrorEntry[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list: ErrorEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX_ENTRIES)));
  } catch {
    // 저장 실패는 무시 — 로그 때문에 게임이 죽으면 본말전도다
  }
}

function push(entry: ErrorEntry): void {
  write([...read(), entry]);
}

let installed = false;

/** 부팅 시 1회 — 전역 오류를 링 버퍼에 기록한다. */
export function installErrorLog(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (event) => {
    push({
      at: new Date().toISOString(),
      kind: "error",
      message: String(event.message ?? "unknown").slice(0, 300),
      stack: typeof event.error?.stack === "string" ? event.error.stack.slice(0, 600) : undefined,
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason as { message?: string; stack?: string } | string | undefined;
    push({
      at: new Date().toISOString(),
      kind: "unhandledrejection",
      message: String(typeof reason === "object" ? reason?.message ?? reason : reason).slice(0, 300),
      stack: typeof reason === "object" && typeof reason?.stack === "string" ? reason.stack.slice(0, 600) : undefined,
    });
  });
}

export function errorLogCount(): number {
  return read().length;
}

/** 문의용 텍스트 — 앱 버전·UA를 머리에 붙인다 (기기 밖으로는 사용자가 복사할 때만 나간다). */
export function serializeErrorLog(): string {
  return JSON.stringify(
    {
      app: "dodgelab",
      exportedAt: new Date().toISOString(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      errors: read(),
    },
    null,
    2,
  );
}

export function clearErrorLog(): void {
  write([]);
}
