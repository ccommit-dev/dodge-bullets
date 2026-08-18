import type { ShoulderId } from "../progression/model";

export const SHOULDER_DEFINITIONS: Record<ShoulderId, { name:string; grade:"normal"|"rare"|"epic"|"legendary"; effect:string; color:string }> = {
  scout:{name:"정찰 견갑",grade:"normal",effect:"원정 이동·회피 보조",color:"#94a3b8"},
  shadow:{name:"그림자 견갑",grade:"rare",effect:"FEVER 치명타·기습 강화",color:"#3b82f6"},
  ogre:{name:"오우거 견갑",grade:"epic",effect:"방어 후 반격·동료 피해 강화",color:"#a855f7"},
  dragon:{name:"용린 견갑",grade:"legendary",effect:"화염 공명·스킬 피해 강화",color:"#f59e0b"},
};
