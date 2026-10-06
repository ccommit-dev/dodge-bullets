import { assetUrl } from "../asset";
import { BRANCHES, STAGES, STAGES_PER_CHAPTER, branchUnlocked, stageUnlocked, type BranchDef, type BranchReward } from "./stages";

/**
 * 원정 지도 (2026-10-06, 사용자: "일직선으로 가는게 아니라 루트가 좀 있었으면 좋겠음").
 * 왼쪽 줄 = 본선 10칸(예전 목록 그대로 — 순서대로 열린다), 오른쪽 줄 = 갈림길. 3칸에서 보물 동굴로 새고,
 * 6칸에서 정예 우회로 ① → ② → 비밀 대장으로 이어지는 다른 길이 본선과 나란히 내려간다.
 */

export function branchRewardLabel(r: BranchReward): string {
  const parts: string[] = [];
  if (r.gems) parts.push(`보석 ${r.gems}`);
  if (r.coins) parts.push(`골드 ${r.coins.toLocaleString()}`);
  if (r.materials) parts.push(`강화석 ${r.materials}`);
  if (r.seals) parts.push(`인장 ${r.seals}`);
  if (r.forgeTickets) parts.push(`방지권 ${r.forgeTickets}`);
  if (r.shoulderShards) parts.push(`견갑 조각 ${r.shoulderShards}`);
  return parts.join(" · ");
}

const KIND_LABEL: Record<BranchDef["kind"], string> = { treasure: "보물 동굴", elite: "정예 우회로", secret: "비밀 대장" };

type Props = {
  chapter: number;
  best: number;
  stars: Record<string, number>;
  branchStars: Record<string, number>;
  claimed: string[];
  next: number;
  onStart: (index: number) => void;
};

export function RouteMap({ chapter, best, stars, branchStars, claimed, next, onStart }: Props) {
  const branches = BRANCHES.filter((b) => b.chapter === chapter);
  const chainParent = (b: BranchDef) => ("branch" in b.requires ? branches.find((x) => x.id === (b.requires as { branch: string }).branch) : undefined);
  return (
    <div className="route-map" data-chapter={chapter}>
      {Array.from({ length: STAGES_PER_CHAPTER }, (_, k) => {
        const index = chapter * STAGES_PER_CHAPTER + k;
        const stage = STAGES[index];
        const unlocked = stageUnlocked(index, best, stars);
        const st = stars[String(index)] ?? 0;
        const node = branches.find((b) => b.row === k + 1);
        // 갈림길 사이를 잇는 세로 길 — 위 칸의 갈림길이 아래 칸 갈림길의 선행이면 그 사이 줄에 관을 그린다
        const pipe = !node && branches.some((b) => { const p = chainParent(b); return !!p && p.row < k + 1 && b.row > k + 1; });
        return (
          <div key={stage.id} className="route-row">
            <button
              type="button"
              disabled={!unlocked}
              className={`pioneer-row stage-${stage.slotKind} ${st > 0 ? "opened" : ""} ${unlocked ? "" : "far"} ${index === next ? "next" : ""}`}
              onClick={() => onStart(index)}
            >
              <span className="pioneer-stage">{chapter + 1}-{k + 1}</span>
              <span className="pioneer-name">
                {stage.name}
                <span className="pioneer-stars" aria-label={`별 ${st}/3`}>
                  {[1, 2, 3].map((n) => (
                    <img key={n} src={assetUrl("ui/idle/star.svg")} alt="" className={n <= st ? "on" : ""} />
                  ))}
                </span>
              </span>
              <span className="pioneer-area">{stage.slotKind === "boss" ? "장 대장" : stage.slotKind === "midboss" ? "중간 보스" : unlocked ? `체력 ×${stage.monsterHp}` : "🔒"}</span>
            </button>
            <div className={`route-side ${node ? `has-node link-${chainParent(node) ? "up" : "main"}` : pipe ? "pipe" : ""}`}>
              {node && (() => {
                const open = branchUnlocked(node, best, stars, branchStars);
                const bs = branchStars[node.id] ?? 0;
                const firstLeft = !claimed.includes(`dodge-branch:${node.id}`);
                return (
                  <button
                    type="button"
                    disabled={!open}
                    data-branch={node.id}
                    className={`route-node route-${node.kind} ${bs > 0 ? "cleared" : ""} ${open ? "" : "locked"}`}
                    onClick={() => onStart(node.index)}
                    title={open ? node.name : "앞 칸을 깨면 열린다"}
                  >
                    <small>{KIND_LABEL[node.kind]}{node.kind === "elite" ? (node.id.endsWith("E1") ? " ①" : " ②") : ""}</small>
                    <b>{open ? node.name : "🔒 잠김"}</b>
                    {bs > 0 ? <i className="route-stars">{"★".repeat(bs)}</i> : firstLeft && <i className="route-reward">{branchRewardLabel(node.firstReward).split(" · ")[0]}</i>}
                  </button>
                );
              })()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
