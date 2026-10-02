/**
 * 헤드리스 브라우저 띄우기 — scripts/ 의 모든 puppeteer 실행은 여기를 지난다 (2026-10-02).
 *
 * headless: true (새 headless 모드 · 일반 chrome.exe 를 화면 없이). 예전의 headless: "shell" 은 chrome-headless-shell.exe 를 쓰는데,
 * 그건 **콘솔 프로그램**이라 창 없는 셸(검증 하니스 · 에이전트)이 띄우면 Windows 가 그것과 하위 프로세스(gpu · renderer · network)마다
 * 검은 콘솔 창을 열어 사용자 화면에 쌓였다. chrome.exe 는 창 프로그램이라 콘솔이 생기지 않는다. 같은 버전이 ~/.cache/puppeteer/chrome 에 있다.
 *
 * 검증 품질은 그대로여야 한다 — 두 모드를 나란히 재 보니 기능 차이는 **Web Share API** 하나였다:
 * shell 에는 navigator.share 가 없었고, chrome.exe 에는 있는데 공유 시트를 띄울 수 없어 영원히 대기한다(공유 카드 검사 2건이 멈춤).
 * 검사들이 보던 것은 공유 API 가 없는 경로(안드로이드 WebView 와 같은 조건)이므로, 새로 여는 모든 페이지에서 그 API 를 지워
 * shell 과 같은 조건으로 맞춘다. 옵션은 그대로 넘긴다 — 호출마다 args(--no-sandbox · 배율 등)가 다르다.
 */
import puppeteer from "puppeteer";

export async function launchBrowser(options = {}) {
  const browser = await puppeteer.launch({ ...options, headless: true });
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async (...args) => {
    const page = await newPage(...args);
    await page.evaluateOnNewDocument(() => {
      delete Navigator.prototype.share;
      delete Navigator.prototype.canShare;
    });
    return page;
  };
  return browser;
}
