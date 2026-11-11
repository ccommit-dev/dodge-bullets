/**
 * 사냥터 특수 대결 (2026-11-11) — 스테이지 흐름 밖의 한 판. 처치 수 · 도감 · 사다리 · 다음 층은 건드리지 않고, 끝나면 싸우던 자리로 돌아온다.
 * 긴급 의뢰의 현상범(titans/urgent.ts)과 승급전의 수호자(titans/promotion.ts)가 같은 길(spawn 네 번째 인자 · 처치 · 시간 초과 · 대장의 반격)을 쓴다.
 */
import { huntingArea, type HuntingAreaDef } from "./model";
import { huntBossVariant } from "./bestiary";
import { urgentFaceStage, urgentHp, urgentTimeSec, type UrgentKind } from "./urgent";
import { guardianFace, guardianHp } from "./promotion";

export type SpecialFight =
  /** day — 도전을 누른 날. 자정을 넘겨 끝나도 그날 의뢰로 친다 */
  | { kind: "urgent"; urgent: UrgentKind; day: string }
  /** rank — 이기면 오를 등급 */
  | { kind: "promotion"; rank: number };

export type SpecialKind = SpecialFight["kind"];

/** 판 머리 제목 */
export const SPECIAL_TITLE: Record<SpecialKind, string> = { urgent: "긴급 의뢰", promotion: "승급전" };
/** 제한 시간 줄 이름 */
export const SPECIAL_FOE: Record<SpecialKind, string> = { urgent: "현상범", promotion: "수호자" };

export function specialHp(f: SpecialFight, stage: number): number {
  return f.kind === "urgent" ? urgentHp(stage) : guardianHp(f.rank);
}

export function specialTimeSec(f: SpecialFight, bossTimeSec: number): number {
  return f.kind === "urgent" ? urgentTimeSec(bossTimeSec) : Math.max(10, Math.round(bossTimeSec));
}

/** 그림 · 이름 — area 와 stage 는 monsterAssetFor 에 그대로 넘긴다(그 지역 대장 교대 규칙으로 얼굴이 정해진다) */
export function specialFace(f: SpecialFight, stage: number): { area: HuntingAreaDef; stage: number; name: string } {
  if (f.kind === "urgent") {
    const area = huntingArea(stage);
    const faceStage = urgentFaceStage(stage);
    return { area, stage: faceStage, name: huntBossVariant(area, faceStage).name };
  }
  const g = guardianFace(f.rank);
  return { area: g.area, stage: g.stage, name: g.name };
}
