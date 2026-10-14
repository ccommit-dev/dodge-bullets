/**
 * 모험 허브 카드 6장 (2026-10-13, docs/FOCUS_CAPYGO P0 — 카피바라 Go! "가운데 모험 한 화면").
 *
 * 전부 기존 저장 상태에서 파생한다. 카드마다 ① 남은 횟수/티켓 ② 오늘 얻는 재화 ③ 빨간 점(지금 할 수 있고 오늘 안 한 것만, 최대 3개).
 * 탭하면 그 콘텐츠로 간다 — 안내가 곧 내비게이션이다(routine 과 같은 원칙).
 */
import type { CharacterProgress } from "../progression/model";
import { contentUnlocked, unlockInfo, type UnlockInfo } from "../progression/onboarding";
import { dateKey, riftAttemptsFor, type EventSave } from "../events/eventSave";
import { TOWER_DAILY_TICKETS } from "../game/towerTickets";
import { EXPEDITION_MAX } from "./allies";

export type HubCardId = "dodge" | "beat" | "tower" | "rift" | "forge" | "expedition";
export type HubGo =
  | { kind: "content"; content: "dodge" | "beat" | "forge" | "tower" }
  | { kind: "events"; tab: "rift" }
  | { kind: "tab"; tab: "heroes" };

export type HubCard = {
  id: HubCardId;
  label: string;
  /** 한 줄 — 무엇을 하는 콘텐츠인가 */
  desc: string;
  /** 오늘 얻는 재화 (아이콘 이름 = ContentIcon 이름이 아니라 재화 이름 그대로) */
  feeds: string[];
  /** 남은 횟수·티켓·기록 */
  remaining: string;
  /** 지금 할 수 있고 오늘 보상이 남았다 */
  dot: boolean;
  locked: boolean;
  /** 잠금 조건과 진행도 (2026-10-14) — 카드 위 진행 막대·말풍선·토스트가 같이 쓴다 */
  unlock?: UnlockInfo;
  /** 잠겼을 때 이유 */
  lockHint?: string;
  go: HubGo;
};

/** 빨간 점 상한 — 알림 폭탄 금지(카피바라 Go! 비판) */
export const HUB_DOT_MAX = 3;

export function hubCards(progress: CharacterProgress, events: EventSave, opts: { beatBest?: number; now?: number } = {}): HubCard[] {
  const now = opts.now ?? Date.now();
  const today = dateKey();
  const riftMax = riftAttemptsFor(progress.patronUntil, now);
  const riftLeft = Math.max(0, riftMax - events.riftAttempts);
  const activeExpeditions = progress.expeditions.filter((e) => e.endsAt > now).length;
  const step = progress.onboardingStep;
  const dodgeToday = progress.firstClearDates.dodge === today;
  const beatToday = progress.firstClearDates.beat === today;
  const forgeToday = progress.firstClearDates.forge === today;
  const cards: HubCard[] = [
    {
      id: "dodge", label: "성문 방어", desc: "직접 플레이 · 50 스테이지 · 스킬 무기", feeds: ["강화석", "견갑 조각", "인장"],
      remaining: progress.dodgeBestStage > 0 ? `최고 S${progress.dodgeBestStage} · 다음 S${progress.dodgeBestStage + 1}` : "첫 출격",
      dot: !dodgeToday, locked: !contentUnlocked(step, "dodge"), lockHint: unlockInfo("dodge", progress).hint, unlock: unlockInfo("dodge", progress), go: { kind: "content", content: "dodge" },
    },
    {
      id: "beat", label: "비트 수련", desc: "30초~2분 기록 도전", feeds: ["견갑 조각"],
      remaining: (opts.beatBest ?? 0) > 0 ? `최고 ${(opts.beatBest ?? 0).toLocaleString()}점` : "첫 연주",
      dot: !beatToday, locked: !contentUnlocked(step, "beat"), lockHint: unlockInfo("beat", progress).hint, unlock: unlockInfo("beat", progress), go: { kind: "content", content: "beat" },
    },
    {
      id: "tower", label: "끝없는 성벽", desc: "죽을 때까지 층을 잇는 한 판 · 실패해도 등반권은 그대로", feeds: ["동료 조각", "방치 배율"],
      remaining: progress.towerOpen ? `등반권 ${progress.towerTickets}/${TOWER_DAILY_TICKETS} · 최고 ${progress.towerBestFloor}층` : "1장 대장을 깨면 열림",
      dot: progress.towerOpen && progress.towerTickets > 0, locked: !progress.towerOpen, lockHint: unlockInfo("tower", progress).hint, unlock: unlockInfo("tower", progress), go: { kind: "content", content: "tower" },
    },
    {
      id: "rift", label: "균열", desc: "방치 2시간치를 즉시 정산 · 요일마다 보상 축", feeds: ["골드", "강화석", "조각"],
      remaining: riftLeft > 0 ? `오늘 ${riftMax - riftLeft}/${riftMax}` : `${riftMax}/${riftMax} 완료`,
      dot: riftLeft > 0, locked: !contentUnlocked(step, "events"), lockHint: unlockInfo("events", progress).hint, unlock: unlockInfo("events", progress), go: { kind: "events", tab: "rift" },
    },
    {
      id: "forge", label: "대장간", desc: "쌓인 골드·강화석으로 장비 제작·강화", feeds: ["장비 +1"],
      remaining: forgeToday ? "오늘 강화 성공" : `강화석 ${progress.enhancementMaterials.toLocaleString()}`,
      dot: !forgeToday && progress.enhancementMaterials > 0, locked: !contentUnlocked(step, "forge"), lockHint: unlockInfo("forge", progress).hint, unlock: unlockInfo("forge", progress), go: { kind: "content", content: "forge" },
    },
    {
      id: "expedition", label: "파견", desc: "동료를 보내 두면 시간이 지난 뒤 들고 돌아온다", feeds: ["강화석", "조각"],
      remaining: activeExpeditions > 0 ? `${activeExpeditions}/${EXPEDITION_MAX} 진행 중` : `빈 자리 ${EXPEDITION_MAX}`,
      dot: activeExpeditions < EXPEDITION_MAX, locked: false, go: { kind: "tab", tab: "heroes" },
    },
  ];
  // 잠긴 카드엔 점이 없다. 점은 위에서부터 최대 3개
  let dots = 0;
  for (const c of cards) {
    if (c.locked) c.dot = false;
    if (c.dot) { dots += 1; if (dots > HUB_DOT_MAX) c.dot = false; }
  }
  return cards;
}
