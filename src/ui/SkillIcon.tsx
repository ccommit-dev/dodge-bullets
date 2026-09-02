import type { TitanSkillId } from "../titans/model";

/**
 * 스킬 아이콘 20종 — 스킬마다 다른 실루엣. (점검 전엔 신규 15종이 같은 그림을 썼다.)
 * 슬롯별 형태 언어: 시동기=단일 검선 · 연계=원/파동 · 마무리=폭발/별 · 패시브=방패/문양
 */
const GLYPH: Record<TitanSkillId, string> = {
  strike: "M9 35c13-1 22-8 30-25-1 18-10 29-28 30 M14 29l8 8",
  pierce: "M6 24h30 M30 16l10 8-10 8 M12 20v8",
  emberCut: "M10 36 38 10 M24 12c-5 6-3 12 2 14 5-3 6-9 2-14z M14 28c-3 3-2 7 1 8 3-2 3-6-1-8z",
  frostEdge: "M8 36 38 8 M24 8v14 M17 15l7 7 7-7 M13 27l5-5 M35 27l-5-5",
  crit: "M7 15h22M4 23h28M9 31h19 M29 11l12 12-12 12 4-12z",
  waterStep: "M8 30c6-6 10-6 16 0s10 6 16 0 M8 20c6-6 10-6 16 0s10 6 16 0 M24 8l4 6-4 6-4-6z",
  stoneGuard: "M24 6 40 12v12c0 9-7 15-16 18-9-3-16-9-16-18V12z M24 14v14 M17 21h14",
  galeChain: "M6 18c8-6 14 6 22 0s10-6 14-2 M6 30c8-6 14 6 22 0s10-6 14-2 M34 10l6 4-6 4",
  clone: "M24 5c7 8 10 13 9 19 5-3 7-7 7-11 5 8 4 21-5 27-8 6-21 3-25-6-4-10 3-17 9-23-1 7 1 11 5 14 4-5 4-11 0-20z M16 38 34 20",
  thunderLink: "M28 4 14 26h10l-4 18 16-24H26z M6 12h6 M36 36h6",
  bloodMoon: "M30 8a16 16 0 1 0 12 24 12 12 0 0 1-12-24z M10 32l8 8 M14 28l8 8",
  dragonBreath: "M6 34c4-12 12-20 26-24l-4 8 10 2-10 6 6 8-14-2-6 8z M26 20l6 1",
  warcry: "m24 4 4 12 12 1-9 8 3 13-10-7-10 7 3-13-9-8 12-1z M24 13v20",
  meteor: "M36 8 14 30 M30 6l8 8 M8 40l6-2 2-6 M22 24a8 8 0 1 0 8 8",
  tidalBurst: "M4 30c6-8 10-8 16 0s10 8 16 0 M24 6v10 M16 12l8 8 8-8 M10 40h28",
  voidFinish: "M24 6a18 18 0 1 0 0 36 18 18 0 0 0 0-36z M14 24h20 M24 14v20 M16 16l16 16 M32 16 16 32",
  steel: "M8 12c9-7 23-7 32 0l-4 24-12 8-12-8z M12 16c8-5 16-5 24 0M24 10v31",
  focus: "M24 8a16 16 0 1 0 0 32 16 16 0 0 0 0-32z M24 16a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M24 22v4",
  guardianSoul: "M24 6 38 11v11c0 8-6 14-14 18-8-4-14-10-14-18V11z M24 16c-4 6-4 10 0 14 4-4 4-8 0-14z",
  elementalMastery: "M24 6l6 10-6 10-6-10z M12 26l6 10-6 10-6-10z M36 26l6 10-6 10-6-10z M18 26h12",
};

export function SkillIcon({ id }: { id: TitanSkillId }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <span className={`skill-icon skill-icon-${id}`} aria-hidden="true">
      <svg viewBox="0 0 48 48">
        <path {...p} d={GLYPH[id]} />
      </svg>
    </span>
  );
}
