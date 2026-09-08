import { assetUrl } from "../asset";
import type { EventGrant } from "../economy/eventShop";

/**
 * 보상 아이콘 — 텍스트 라벨("보석 35")만 있던 시즌 패스·토벌령·주간 도전·원정 일지·이벤트 상점에 실제 에셋을 붙인다.
 * 파일: public/ui/rewards/<id>.png (art-gen batch-icons.sh → scripts/place-icons.mjs) + 기존 출석 아이콘(public/ui/attendance).
 */
export type RewardIconKind =
  | "gems" | "materials" | "shards" | "cores" | "boost" | "allySkin" | "weaponFx"
  | "gold" | "shoulderShards" | "forgeTickets" | "seasonXp";

const ICON_PATH: Record<RewardIconKind, string> = {
  gems: "ui/rewards/gem.png",
  materials: "ui/attendance/enhance-stone.png",
  shards: "ui/rewards/ally-shard.png",
  cores: "ui/attendance/skill-orb.png",
  boost: "ui/rewards/boost.png",
  allySkin: "ui/rewards/ally-skin.png",
  weaponFx: "ui/rewards/weapon-fx.png",
  gold: "ui/attendance/gold.png",
  shoulderShards: "ui/attendance/shoulder-shards.png",
  forgeTickets: "ui/rewards/forge-ticket.png",
  seasonXp: "ui/rewards/season-xp.png",
};

export const REWARD_ICON_KINDS = Object.keys(ICON_PATH) as RewardIconKind[];
export function rewardIconUrl(kind: RewardIconKind): string {
  return assetUrl(ICON_PATH[kind]);
}

export function RewardIcon({ kind, size = 22, className = "" }: { kind: RewardIconKind; size?: number; className?: string }) {
  return <img className={`reward-icon reward-icon-${kind} ${className}`} src={rewardIconUrl(kind)} width={size} height={size} alt="" aria-hidden="true" data-reward={kind} />;
}

/** 아이콘 + 라벨 한 줄 — 셀·칩 공용 */
export function RewardChip({ kind, label, size = 20 }: { kind: RewardIconKind; label: string; size?: number }) {
  return <span className="reward-chip"><RewardIcon kind={kind} size={size} />{label}</span>;
}

/** 이벤트 상점 지급 내용 → 아이콘 종류 (카탈로그 순서 고정) */
export function grantRewardKinds(g: EventGrant): RewardIconKind[] {
  const out: RewardIconKind[] = [];
  if (g.gems) out.push("gems");
  if (g.gold) out.push("gold");
  if (g.materials) out.push("materials");
  if (g.allyShards) out.push("shards");
  if (g.cores) out.push("cores");
  if (g.shoulderShards) out.push("shoulderShards");
  if (g.forgeTickets) out.push("forgeTickets");
  if (g.idleBoostHours) out.push("boost");
  return out;
}
