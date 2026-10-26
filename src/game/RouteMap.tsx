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
  if (r.relicShards) parts.push(`유물 조각 ${r.relicShards}`);
  return parts.join(" · ");
}

const KIND_LABEL: Record<BranchDef["kind"], string> = { treasure: "보물 동굴", elite: "정예 우회로", secret: "비밀 대장" };
/** 옆 칸(폭 62px)에 넣는 짧은 이름 — 긴 이름은 aria-label */
const KIND_SHORT: Record<BranchDef["kind"], string> = { treasure: "보물", elite: "정예", secret: "비밀" };

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
  // 한 줄 목록 (2026-10-23, 사용자: "UI 조잡한 부분 마저 단순화") — 두 줄 격자 + 옆 칸 갈림길은 이름이 두 줄로 꺾이고 별 · 자물쇠 · 체력이 칸마다 겹쳐 조잡했다.
  // 이제 한 줄에 [번호] 이름 … [대장 표시 · 별] [갈림길 칩] — 잠긴 칸은 흐리게만(자물쇠 · 별 자리 없음), 체력 배율은 뺐다(출발 단추 · 전투 안에서 본다)
  void chainParent;
  return (
    <div className="route-map route-list" data-chapter={chapter}>
      {Array.from({ length: STAGES_PER_CHAPTER }, (_, k) => {
        const index = chapter * STAGES_PER_CHAPTER + k;
        const stage = STAGES[index];
        const unlocked = stageUnlocked(index, best, stars);
        const st = stars[String(index)] ?? 0;
        const node = branches.find((b) => b.row === k + 1);
        return (
          <div key={stage.id} className={`route-row ${node ? "with-branch" : ""}`}>
            <button
              type="button"
              disabled={!unlocked}
              className={`pioneer-row stage-${stage.slotKind} ${st > 0 ? "opened" : ""} ${unlocked ? "" : "far"} ${index === next ? "next" : ""}`}
              onClick={() => onStart(index)}
              aria-label={`${chapter + 1}-${k + 1} ${stage.name}${unlocked ? ` · 별 ${st}/3` : " · 잠김"}`}
            >
              <span className="pioneer-stage">{chapter + 1}-{k + 1}</span>
              <span className="pioneer-name">{stage.name}</span>
              <span className="pioneer-meta">
                {(stage.slotKind === "boss" || stage.slotKind === "midboss") && <span className="pioneer-area">{stage.slotKind === "boss" ? "대장" : "중보스"}</span>}
                {st > 0 && (
                  <span className="pioneer-stars" aria-hidden="true">
                    {[1, 2, 3].map((n) => (
                      <img key={n} src={assetUrl("ui/idle/star.png")} alt="" className={n <= st ? "on" : ""} />
                    ))}
                  </span>
                )}
                {index === next && st === 0 && <span className="pioneer-go">도전</span>}
              </span>
            </button>
            <div className="route-side">
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
                    aria-label={open ? `${KIND_LABEL[node.kind]} ${node.name}` : `${KIND_LABEL[node.kind]} 잠김`}
                  >
                    <small>{KIND_SHORT[node.kind]}{node.kind === "elite" ? (node.id.endsWith("E1") ? "①" : "②") : ""}</small>
                    {/* 칩 한 줄 — 열렸으면 별 또는 첫 보상 한 가지, 잠겼으면 종류만(흐리게) */}
                    {open && (bs > 0 ? <i className="route-stars">{"★".repeat(bs)}</i> : firstLeft ? <i className="route-reward" title={branchRewardLabel(node.firstReward)}>{branchRewardLabel(node.firstReward).split(" · ")[0].split(" ")[0]}</i> : null)}
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
