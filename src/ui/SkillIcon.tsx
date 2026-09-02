import type { TitanSkillId } from "../titans/model";

export function SkillIcon({ id }: { id: TitanSkillId }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <span className={`skill-icon skill-icon-${id}`} aria-hidden="true"><svg viewBox="0 0 48 48">
    {id === "strike" && <><path {...p} d="M9 35c13-1 22-8 30-25-1 18-10 29-28 30"/><path {...p} d="m14 29 8 8"/></>}
    {id === "crit" && <><path {...p} d="M7 15h22M4 23h28M9 31h19"/><path {...p} d="m29 11 12 12-12 12 4-12z"/></>}
    {id === "clone" && <><path {...p} d="M24 5c7 8 10 13 9 19 5-3 7-7 7-11 5 8 4 21-5 27-8 6-21 3-25-6-4-10 3-17 9-23-1 7 1 11 5 14 4-5 4-11 0-20z"/><path {...p} d="M16 38 34 20"/></>}
    {id === "warcry" && <><path {...p} d="m24 4 4 12 12 1-9 8 3 13-10-7-10 7 3-13-9-8 12-1z"/><path {...p} d="M24 13v20"/></>}
    {id === "steel" && <><path {...p} d="M8 12c9-7 23-7 32 0l-4 24-12 8-12-8z"/><path {...p} d="M12 16c8-5 16-5 24 0M24 10v31"/></>}
    {!(["strike","crit","clone","warcry","steel"] as TitanSkillId[]).includes(id) && <><path {...p} d="M7 34c11-2 23-11 34-27-3 17-12 29-30 34"/><circle {...p} cx="31" cy="17" r="7"/><path {...p} d="m10 13 7 4-7 4m22 12 7 4-7 4"/></>}
  </svg></span>;
}
