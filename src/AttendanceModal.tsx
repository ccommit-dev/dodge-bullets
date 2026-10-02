import { useEffect, useState } from "react";
import { storageGet, storageSet } from "./game/toss";
import { updateCharacterProgress } from "./progression/storage";
import type { CharacterProgress, ShoulderId } from "./progression/model";
import { assetUrl } from "./asset";

/**
 * 30일 출석 (2026-10-02, 사용자: "출석체크 이벤트는 30일 버전으로 수정하고 완료되면 설정칸에서 안보이게").
 *
 * 예전 7일 판은 DAY 7 다음에 DAY 1 로 돌아가 끝이 없었다. 이제 **30칸을 한 번** 채우면 끝난다 —
 * 30일째를 받으면 부팅 때 자동으로 뜨지 않고 설정 메뉴에서도 사라진다(attendanceDone).
 *
 * 저장 키는 그대로(v1). 칸 위치는 누적 출석일(totalDays)이다 — 7일 판을 쓰던 계정은 받은 날 수만큼 앞에서 이어간다.
 * 연속(consecutiveDays)은 방치 시간 캡 보너스용으로 따로 센다 (하루 건너뛰어도 판은 리셋되지 않는다).
 */
export const ATTENDANCE_DAYS = 30;
export const ATTENDANCE_KEY = (userHash: string) => `dodgebullets:attendance:v1:${userHash}`;

type AttendanceSave = { lastClaimDate: string | null; lastClaimTimestamp: number; consecutiveDays: number; boardIndex: number; totalDays: number };
const EMPTY: AttendanceSave = { lastClaimDate: null, lastClaimTimestamp: 0, consecutiveDays: 0, boardIndex: 0, totalDays: 0 };

/** 하루치 보상 — 지급량은 grant 가 유일한 진실이고, name·amount 는 그것을 보여 준다 */
type Grant = { gems?: number; shards?: number; stones?: number; seals?: number; skillPoints?: number; tickets?: number; shoulder?: ShoulderId };
type DayReward = { name: string; amount: string; icon: string; rarity: "normal" | "rare" | "epic" | "legend"; grant: Grant };

const d = (name: string, amount: string, icon: string, rarity: DayReward["rarity"], grant: Grant): DayReward => ({ name, amount, icon, rarity, grant });
/**
 * 30칸 — 7일마다 큰 보상(7·14·21·28), 30일째 최종 보상. 보석은 소환 동선, 인장·조각은 성문 방어 스킬 무기,
 * 등반권은 끝없는 성벽 등반 티켓(하루 무료분 위에 얹힌다). 합계: 보석 600 · 인장 70 · 등반권 9
 */
export const ATTENDANCE_REWARDS: DayReward[] = [
  d("보석", "20", "gem", "normal", { gems: 20 }),
  d("견갑 조각", "15", "shoulder-shards", "normal", { shards: 15 }),
  d("강화석", "5", "enhance-stone", "normal", { stones: 5 }),
  d("원정 인장", "10", "expedition-seal", "rare", { seals: 10 }),
  d("성벽 등반권", "2", "event-chest", "rare", { tickets: 2 }),
  d("스킬 포인트", "2", "skill-orb", "rare", { skillPoints: 2 }),
  d("정찰 견갑 + 보석", "50", "scout-pauldron", "epic", { shoulder: "scout", gems: 50 }),
  d("보석", "20", "gem", "normal", { gems: 20 }),
  d("강화석", "8", "enhance-stone", "normal", { stones: 8 }),
  d("견갑 조각", "20", "shoulder-shards", "normal", { shards: 20 }),
  d("원정 인장", "10", "expedition-seal", "rare", { seals: 10 }),
  d("성벽 등반권", "2", "event-chest", "rare", { tickets: 2 }),
  d("스킬 포인트", "3", "skill-orb", "rare", { skillPoints: 3 }),
  d("보석", "80", "gem", "epic", { gems: 80 }),
  d("강화석", "10", "enhance-stone", "normal", { stones: 10 }),
  d("보석", "20", "gem", "normal", { gems: 20 }),
  d("원정 인장", "15", "expedition-seal", "rare", { seals: 15 }),
  d("견갑 조각", "25", "shoulder-shards", "normal", { shards: 25 }),
  d("스킬 포인트", "3", "skill-orb", "rare", { skillPoints: 3 }),
  d("성벽 등반권", "2", "event-chest", "rare", { tickets: 2 }),
  d("보석 + 강화석", "100", "gem", "epic", { gems: 100, stones: 10 }),
  d("강화석", "12", "enhance-stone", "normal", { stones: 12 }),
  d("보석", "30", "gem", "normal", { gems: 30 }),
  d("원정 인장", "15", "expedition-seal", "rare", { seals: 15 }),
  d("견갑 조각", "30", "shoulder-shards", "normal", { shards: 30 }),
  d("스킬 포인트", "4", "skill-orb", "rare", { skillPoints: 4 }),
  d("성벽 등반권", "3", "event-chest", "rare", { tickets: 3 }),
  d("보석 + 인장", "100", "gem", "epic", { gems: 100, seals: 20 }),
  d("강화석", "15", "enhance-stone", "normal", { stones: 15 }),
  d("용린 견갑 + 보석", "160", "dragon-pauldron", "legend", { shoulder: "dragon", gems: 160 }),
];

const today = () => new Date().toLocaleDateString("sv-SE");

function parseSave(raw: string | null): AttendanceSave {
  if (!raw) return { ...EMPTY };
  try { return { ...EMPTY, ...(JSON.parse(raw) as Partial<AttendanceSave>) }; } catch { return { ...EMPTY }; }
}

/** 오늘 받을 칸(0~29) — 누적 출석일. 30 이면 끝 */
export function attendanceDay(save: Pick<AttendanceSave, "totalDays">): number { return Math.max(0, Math.min(ATTENDANCE_DAYS, save.totalDays)); }

/** 30칸을 다 받았는가 — 설정 메뉴·부팅 자동 열기가 이걸 본다 */
export async function readAttendanceDone(userHash: string): Promise<boolean> {
  return attendanceDay(parseSave(await storageGet(ATTENDANCE_KEY(userHash)))) >= ATTENDANCE_DAYS;
}

/** 오늘 이미 받았는가 — 부팅 자동 열기는 받을 것이 있을 때만 */
export async function readAttendanceClaimedToday(userHash: string): Promise<boolean> {
  return parseSave(await storageGet(ATTENDANCE_KEY(userHash))).lastClaimDate === today();
}

export function AttendanceModal({ userHash, open, onClose, onUpdated, onDone }: { userHash: string; open: boolean; onClose: () => void; onUpdated: (p: CharacterProgress) => void; onDone?: () => void }) {
  const [save, setSave] = useState<AttendanceSave | null>(null);
  const [message, setMessage] = useState("");
  /** 수령 진행 중 잠금 — 저장이 끝나기 전 연타하면 보상이 이중 지급된다. */
  const [claiming, setClaiming] = useState(false);
  useEffect(() => {
    // 열릴 때마다 다시 읽는다 — 부팅 시 1회만 읽으면 모달을 닫았다 여는 사이에
    // 바뀐 저장소(자정 경과, 다른 탭)와 어긋난 상태를 보여준다.
    if (!open) return;
    setMessage("");
    void storageGet(ATTENDANCE_KEY(userHash)).then((raw) => setSave(parseSave(raw)));
  }, [userHash, open]);
  if (!open || !save) return null;
  const day = attendanceDay(save);
  const finished = day >= ATTENDANCE_DAYS;
  const claimed = save.lastClaimDate === today();
  const claim = async () => {
    // 게이트는 "오늘 이미 받았는가"와 "지금 저장 중인가" 둘뿐이다 (기기 시계 역행 가드는 피드백 없는 함정이라 없앴다)
    if (claimed || claiming || finished) return;
    setClaiming(true);
    try {
      const g = ATTENDANCE_REWARDS[day].grant;
      // 어제 받았으면 연속, 하루라도 건너뛰면 1부터. 방치 시간 캡(T) 보너스에 쓰인다 — 판(칸)은 리셋되지 않는다
      const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString("sv-SE");
      const streak = save.lastClaimDate === yesterday ? save.consecutiveDays + 1 : 1;
      const progress = await updateCharacterProgress(userHash, (current) => ({
        ...current,
        attendanceStreak: streak,
        redGems: current.redGems + (g.gems ?? 0),
        shoulderShards: current.shoulderShards + (g.shards ?? 0),
        enhancementMaterials: current.enhancementMaterials + (g.stones ?? 0),
        expeditionSeals: current.expeditionSeals + (g.seals ?? 0),
        skillPoints: current.skillPoints + (g.skillPoints ?? 0),
        towerTickets: current.towerTickets + (g.tickets ?? 0),
        ownedShoulders: g.shoulder ? [...new Set([...current.ownedShoulders, g.shoulder])] : current.ownedShoulders,
      }));
      const next: AttendanceSave = { lastClaimDate: today(), lastClaimTimestamp: Date.now(), consecutiveDays: streak, boardIndex: day + 1, totalDays: day + 1 };
      await storageSet(ATTENDANCE_KEY(userHash), JSON.stringify(next));
      setSave(next);
      onUpdated(progress);
      setMessage(`DAY ${day + 1} ${ATTENDANCE_REWARDS[day].name} ×${ATTENDANCE_REWARDS[day].amount} 수령 완료!`);
      if (next.totalDays >= ATTENDANCE_DAYS) onDone?.();
      onClose();
    } finally {
      setClaiming(false);
    }
  };
  return <div className="exit-modal attendance-modal" role="dialog" aria-modal="true">
    <div className="exit-card attendance-card attendance-30">
      <p className="brand">DAILY CHECK</p><h2 className="exit-title">30일 출석 보상</h2>
      <p className="attendance-progress">{Math.min(day, ATTENDANCE_DAYS)} / {ATTENDANCE_DAYS}일 · 7·14·21·28일 큰 보상 · 30일째 용린 견갑</p>
      <div className="attendance-grid">{ATTENDANCE_REWARDS.map((reward, i) => <div key={`${reward.name}-${i}`} className={`${i === day && !finished ? "today" : ""} ${i < day ? "done" : ""} rarity-${reward.rarity}`}>
        <b>DAY {i + 1}</b>
        <span className="attendance-reward-art"><img src={assetUrl(`ui/attendance/${reward.icon}.png`)} alt={reward.name} /></span>
        <span>{reward.name} ×{reward.amount}</span>
      </div>)}</div>
      <p className="attendance-streak">
        연속 {save.consecutiveDays}일 · 방치 시간 +{Math.min(2, Math.floor(save.consecutiveDays / 3))}시간
        {save.consecutiveDays % 3 !== 0 && save.consecutiveDays < 6 && (
          <em> · {3 - (save.consecutiveDays % 3)}일 더 모으면 +1시간</em>
        )}
      </p>
      {message && <p className="shop-toast">{message}</p>}
      <button type="button" className="cta" disabled={claimed || claiming || finished} onClick={() => void claim()}>
        {finished ? "30일 출석 완료" : claimed ? "오늘 출석 완료" : claiming ? "수령 중…" : `DAY ${day + 1} 보상 받기`}
      </button>
      {claimed && !message && !finished && (
        <p className="attendance-next">오늘 보상은 이미 받았어요 · 내일 0시 이후 DAY {day + 1} 보상이 열립니다</p>
      )}
      <button type="button" className="cta cta-ghost" onClick={onClose}>닫기</button>
    </div>
  </div>;
}
