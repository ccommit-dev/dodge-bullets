import { useEffect, useState } from "react";
import { storageGet, storageSet } from "./game/toss";
import { updateCharacterProgress } from "./progression/storage";
import type { CharacterProgress, ShoulderId } from "./progression/model";
import { assetUrl } from "./asset";

type AttendanceSave = { lastClaimDate: string | null; lastClaimTimestamp: number; consecutiveDays: number; boardIndex: number; totalDays: number };
const rewards = [
  { name: "골드", amount: "300", icon: "gold", rarity: "normal" },
  { name: "견갑 조각", amount: "15", icon: "shoulder-shards", rarity: "normal" },
  { name: "강화석", amount: "5", icon: "enhance-stone", rarity: "rare" },
  { name: "골드", amount: "1,000", icon: "gold", rarity: "rare" },
  { name: "정찰 견갑", amount: "1", icon: "scout-pauldron", rarity: "epic" },
  { name: "스킬 포인트", amount: "2", icon: "skill-orb", rarity: "epic" },
  { name: "용린 견갑", amount: "1", icon: "dragon-pauldron", rarity: "legend" },
];
const today = () => new Date().toLocaleDateString("sv-SE");

export function AttendanceModal({ userHash, open, onClose, onUpdated }: { userHash: string; open: boolean; onClose: () => void; onUpdated: (p: CharacterProgress) => void }) {
  const [save, setSave] = useState<AttendanceSave | null>(null);
  const [message, setMessage] = useState("");
  /** 수령 진행 중 잠금 — 저장이 끝나기 전 연타하면 보상이 이중 지급된다. */
  const [claiming, setClaiming] = useState(false);
  useEffect(() => {
    // 열릴 때마다 다시 읽는다 — 부팅 시 1회만 읽으면 모달을 닫았다 여는 사이에
    // 바뀐 저장소(자정 경과, 다른 탭)와 어긋난 상태를 보여준다.
    if (!open) return;
    setMessage("");
    void storageGet(`dodgebullets:attendance:v1:${userHash}`).then((raw) => {
      try { setSave(raw ? JSON.parse(raw) as AttendanceSave : { lastClaimDate: null, lastClaimTimestamp: 0, consecutiveDays: 0, boardIndex: 0, totalDays: 0 }); }
      catch { setSave({ lastClaimDate: null, lastClaimTimestamp: 0, consecutiveDays: 0, boardIndex: 0, totalDays: 0 }); }
    });
  }, [userHash, open]);
  if (!open || !save) return null;
  const claimed = save.lastClaimDate === today();
  const claim = async () => {
    // 게이트는 "오늘 이미 받았는가"와 "지금 저장 중인가" 둘뿐이다.
    // 구 가드 `Date.now() < lastClaimTimestamp`는 기기 시계가 뒤로 가 있으면
    // 활성 버튼이 아무 피드백 없이 무시되는 함정이라 제거했다.
    if (claimed || claiming) return;
    setClaiming(true);
    try {
      const day = save.boardIndex;
      const shoulder: ShoulderId | null = day === 4 ? "scout" : day === 6 ? "dragon" : null;
      // 어제 받았으면 연속, 하루라도 건너뛰면 1일부터 다시. 방치 시간 캡(T) 보너스에 쓰인다.
      const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString("sv-SE");
      const streak = save.lastClaimDate === yesterday ? save.consecutiveDays + 1 : 1;
      const progress = await updateCharacterProgress(userHash, (current) => ({
        ...current,
        attendanceStreak: streak,
        sharedCoins: current.sharedCoins + (day === 0 ? 300 : day === 3 ? 1000 : 0),
        shoulderShards: current.shoulderShards + (day === 1 ? 15 : 0),
        enhancementMaterials: current.enhancementMaterials + (day === 2 ? 5 : 0),
        skillPoints: current.skillPoints + (day === 5 ? 2 : 0),
        ownedShoulders: shoulder ? [...new Set([...current.ownedShoulders, shoulder])] : current.ownedShoulders,
      }));
      const next = { lastClaimDate: today(), lastClaimTimestamp: Date.now(), consecutiveDays: streak, boardIndex: (day + 1) % 7, totalDays: save.totalDays + 1 };
      await storageSet(`dodgebullets:attendance:v1:${userHash}`, JSON.stringify(next));
      setSave(next);
      onUpdated(progress);
      setMessage(`${rewards[day].name} ×${rewards[day].amount} 수령 완료!`);
      onClose();
    } finally {
      setClaiming(false);
    }
  };
  return <div className="exit-modal attendance-modal" role="dialog" aria-modal="true">
    <div className="exit-card attendance-card">
      <p className="brand">DAILY CHECK</p><h2 className="exit-title">7일 출석 보상</h2>
      <div className="attendance-grid">{rewards.map((reward, i) => <div key={`${reward.name}-${i}`} className={`${i === save.boardIndex ? "today" : ""} rarity-${reward.rarity}`}><b>DAY {i + 1}</b><span className="attendance-reward-art"><img src={assetUrl(`ui/attendance/${reward.icon}.png`)} alt={reward.name} /></span><span>{reward.name} ×{reward.amount}</span></div>)}</div>
      <p className="attendance-streak">
        연속 {save.consecutiveDays}일 · 방치 시간 +{Math.min(2, Math.floor(save.consecutiveDays / 3))}시간
        {save.consecutiveDays % 3 !== 0 && save.consecutiveDays < 6 && (
          <em> · {3 - (save.consecutiveDays % 3)}일 더 모으면 +1시간</em>
        )}
      </p>
      {message && <p className="shop-toast">{message}</p>}
      <button type="button" className="cta" disabled={claimed || claiming} onClick={() => void claim()}>
        {claimed ? "오늘 출석 완료" : claiming ? "수령 중…" : "오늘 보상 받기"}
      </button>
      {claimed && !message && (
        <p className="attendance-next">오늘 보상은 이미 받았어요 · 내일 0시 이후 DAY {(save.boardIndex % 7) + 1} 보상이 열립니다</p>
      )}
      <button type="button" className="cta cta-ghost" onClick={onClose}>닫기</button>
    </div>
  </div>;
}
