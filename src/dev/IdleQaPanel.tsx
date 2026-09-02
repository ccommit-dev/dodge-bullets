import { useEffect, useState } from "react";
import { QA_STYLES } from "./qa-styles";
import { IdleReturnModal } from "../IdleReturnModal";
import { AreaGateModal } from "../AreaGateModal";
import { AreaUnlockBanner } from "../AreaUnlockBanner";
import { HUNTING_AREAS } from "../titans/model";
import { computeIdleYield, idleBottleneck } from "../progression/idle";
import { emptyCharacterProgress, type CharacterProgress } from "../progression/model";

/**
 * 개발 전용 UI 상태 점검 패널 — `?qa=1`로 연다.
 *
 * 왜 별도 갤러리를 만들지 않았나: 정적 갤러리는 마크업을 복제하게 되고,
 * 컴포넌트가 바뀌면 조용히 어긋난다. 여기서는 **실제 컴포넌트를 그대로** 띄워
 * 어긋날 여지를 없앤다. 자동 계측으로는 못 잡는 색 대비·여백·모션 타이밍을
 * 사람이 직접 보기 위한 것이다.
 *
 * `import.meta.env.DEV` 뒤에서만 마운트되므로 프로덕션 번들에는 들어가지 않는다.
 */

type Preview = null | "idle-normal" | "idle-capped" | "idle-maxed" | "gate" | "unlock";

/** 시나리오 세이브를 심고 새로고침 — 인게임에서만 닿을 수 있는 화면용. */
function seed(userHash: string, patch: Partial<CharacterProgress>, titansPatch: Record<string, unknown> = {}, forgePatch: Record<string, unknown> = {}) {
  const pKey = `dodgebullets:progression:v1:${userHash}`;
  const tKey = `dodgebullets:titans:${userHash}`;
  const fKey = `dodgebullets:forge:${userHash}`;
  const read = (k: string) => {
    try {
      return JSON.parse(localStorage.getItem(k) ?? "{}") as Record<string, unknown>;
    } catch {
      return {};
    }
  };
  localStorage.setItem(pKey, JSON.stringify({ ...emptyCharacterProgress(), ...read(pKey), ...patch }));
  localStorage.setItem(tKey, JSON.stringify({ ...read(tKey), ...titansPatch }));
  if (Object.keys(forgePatch).length) {
    localStorage.setItem(fKey, JSON.stringify({ ...read(fKey), ...forgePatch }));
  }
  // 쿼리스트링을 유지해야 새로고침 후에도 QA 패널이 남는다.
  location.href = location.pathname + location.search;
}

function progressFor(kind: "normal" | "capped" | "maxed"): CharacterProgress {
  const base = emptyCharacterProgress();
  if (kind === "normal") {
    return { ...base, titanBestStage: 8, dodgeBestStage: 2, pioneeredArea: 2, bestForgeLevel: 4, beatSkills: { ...base.beatSkills, kick: 8, hat: 5 } };
  }
  if (kind === "capped") {
    return { ...base, titanBestStage: 12, dodgeBestStage: 1, pioneeredArea: 1, bestForgeLevel: 6 };
  }
  return {
    ...base,
    titanBestStage: 60, dodgeBestStage: 4, pioneeredArea: 5, bestForgeLevel: 15,
    reforgeRank: 20, inheritanceCrystals: 80, towerBestFloor: 900, attendanceStreak: 12,
    evolutionPath: "guardian",
    beatSkills: { kick: 40, hat: 40, snare: 40, fire: 40, throat: 40 },
  };
}

const EQUIPPED = { starter: "strike", linkA: "crit", linkB: "clone", finisher: "warcry", passive: "steel" } as const;

export function IdleQaPanel({ userHash }: { userHash: string }) {
  const [preview, setPreview] = useState<Preview>(null);
  const [areaIndex, setAreaIndex] = useState(1);
  const [collapsed, setCollapsed] = useState(false);

  // 스타일은 마운트될 때만 주입한다 — CSS 파일에 두면 프로덕션 번들에 그대로 남는다.
  useEffect(() => {
    const style = document.createElement("style");
    style.dataset.qaPanel = "1";
    style.textContent = QA_STYLES;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  const buildIdle = (kind: "normal" | "capped" | "maxed") => {
    const p = progressFor(kind);
    const stage = kind === "maxed" ? 60 : kind === "capped" ? 5 : 8;
    const away = kind === "normal" ? 4 * 3600 : 26 * 3600;
    const result = computeIdleYield(p, stage, EQUIPPED, away);
    return { p, stage, result, bottleneck: idleBottleneck(p, result, stage, p.pioneeredArea) };
  };

  const idleProps =
    preview === "idle-normal" ? buildIdle("normal")
    : preview === "idle-capped" ? buildIdle("capped")
    : preview === "idle-maxed" ? buildIdle("maxed")
    : null;

  return (
    <>
      <div className={`qa-panel ${collapsed ? "collapsed" : ""}`}>
        <button type="button" className="qa-toggle" onClick={() => setCollapsed((v) => !v)}>
          {collapsed ? "QA ▸" : "UI 상태 점검 ▾"}
        </button>
        {!collapsed && (
          <div className="qa-body">
            <p className="qa-note">실제 컴포넌트를 그대로 띄웁니다. 색 대비·여백·모션을 눈으로 확인하세요.</p>

            <span className="qa-group">오버레이</span>
            <div className="qa-row">
              <button type="button" onClick={() => setPreview("idle-normal")}>정산 · 일반</button>
              <button type="button" onClick={() => setPreview("idle-capped")}>정산 · 캡 도달</button>
              <button type="button" onClick={() => setPreview("idle-maxed")}>정산 · 최대치</button>
            </div>
            <div className="qa-row">
              <button type="button" onClick={() => setPreview("gate")}>게이트 차단</button>
              <button type="button" onClick={() => setPreview("unlock")}>개척 연출</button>
            </div>
            <div className="qa-row qa-area-pick">
              <span>지역</span>
              {HUNTING_AREAS.map((area, i) => (
                <button
                  key={area.id}
                  type="button"
                  className={areaIndex === i ? "on" : ""}
                  onClick={() => setAreaIndex(i)}
                  style={{ borderColor: area.accent }}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <span className="qa-group">시나리오 심기 (새로고침)</span>
            <div className="qa-row">
              <button type="button" onClick={() => seed(userHash, { pioneeredArea: 1, titanBestStage: 5, idleClaimedAt: Date.now() }, { stage: 5, bestStage: 5, lastActiveAt: Date.now(), equipmentTraining: { weaponMastery: 60, shoulderMastery: 0 } })}>
                게이트 직전
              </button>
              <button type="button" onClick={() => seed(userHash, { dodgeBestStage: 4, pioneeredArea: 5, towerBestFloor: 250 }, {}, {})}>
                성벽 해금
              </button>
            </div>
            <div className="qa-row">
              <button type="button" onClick={() => seed(userHash, { reforgeRank: 12, bestForgeLevel: 15, sharedCoins: 5_000_000_000 }, {}, { level: 15, bestLevel: 15, totalAttempts: 200, goldMigrated: true })}>
                무한 재련
              </button>
              <button type="button" onClick={() => seed(userHash, { idleClaimedAt: Date.now() - 20 * 3600 * 1000 }, { lastActiveAt: Date.now() - 20 * 3600 * 1000 })}>
                20시간 방치
              </button>
            </div>
            <div className="qa-row">
              <button type="button" onClick={() => seed(userHash, { redGems: 5000, ownedCharacters: ["obsidian", "dawn"] })}>
                보석+캐릭터 지급
              </button>
              <button
                type="button"
                onClick={() =>
                  seed(userHash, {
                    allyShards: { mia: 200, leon: 200, sera: 200, garen: 200, ari: 400, nox: 400, luna: 400, volt: 200 } as CharacterProgress["allyShards"],
                  })
                }
              >
                조각 지급
              </button>
            </div>
            <div className="qa-row">
              <button
                type="button"
                className="qa-danger"
                onClick={() => {
                  Object.keys(localStorage)
                    .filter((k) => k.startsWith("dodgebullets:"))
                    .forEach((k) => localStorage.removeItem(k));
                  // 쿼리스트링을 유지해야 새로고침 후에도 QA 패널이 남는다.
  location.href = location.pathname + location.search;
                }}
              >
                세이브 초기화
              </button>
            </div>
          </div>
        )}
      </div>

      {/*
        게임 자체 오버레이(귀환 정산 등)가 이미 떠 있을 수 있다. 그 위에 겹치면
        두 카드가 포개져 육안 리뷰가 불가능해지므로 프리뷰를 더 위 레이어에 올린다.
      */}
      {preview && (
        <div className="qa-preview">
          {idleProps && (
            <IdleReturnModal
              result={idleProps.result}
              stage={idleProps.stage}
              bottleneck={idleProps.bottleneck}
              onClaim={() => setPreview(null)}
              onGoContent={() => setPreview(null)}
            />
          )}
          {preview === "gate" && (
            <AreaGateModal
              pioneeredArea={Math.min(HUNTING_AREAS.length - 1, areaIndex + 1)}
              onGoDodge={() => setPreview(null)}
              onDismiss={() => setPreview(null)}
            />
          )}
          {preview === "unlock" && (
            <AreaUnlockBanner area={HUNTING_AREAS[areaIndex]} onDone={() => setPreview(null)} />
          )}
        </div>
      )}
    </>
  );
}
