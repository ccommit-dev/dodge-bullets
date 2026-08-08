import type { BeatPatternId, BeatTrackDef } from "./tracks";
import { BEAT_TRACKS } from "./tracks";

/** Solo raising stats (Roadmap A). */
export type SkillId = "kick" | "hat" | "snare" | "fire" | "throat";

export type BeatSkills = Record<SkillId, number>;

export type BeatRpgProgress = {
  skills: BeatSkills;
  /** Skill points banked from clears / sparring. */
  sp: number;
  /** Practice stamina (Roadmap C). */
  stamina: number;
  maxStamina: number;
  /** Season fame for weekly rank feel. */
  fame: number;
  /** YYYY-MM-DD of last stamina refresh. */
  lastDayKey: string;
  /** 0=Mon … 6=Sun style season day (derived from lastDayKey). */
  seasonDay: number;
  /** Lessons cleared today (for schedule UI). */
  clearedToday: string[];
};

export const SKILL_LABEL: Record<SkillId, string> = {
  kick: "킥",
  hat: "하이햇",
  snare: "스네어",
  fire: "파이어",
  throat: "스로트",
};

export const PATTERN_SKILLS: Record<BeatPatternId, SkillId[]> = {
  "kick-only": ["kick"],
  "hat-only": ["hat"],
  "snare-only": ["snare"],
  "boots-cats": ["kick", "hat"],
  "eight-basic": ["kick", "hat", "snare"],
  firebeat: ["fire"],
  "throat-trumpet": ["throat"],
  "sixteen-mix": ["kick", "hat", "snare", "fire", "throat"],
};

/** Free practice for now — stamina is shown for RPG feel but does not gate play. */
export const STAMINA_COST_LESSON = 0;
export const STAMINA_COST_SPAR = 0;
export const MAX_STAMINA_BASE = 10;

export function emptySkills(): BeatSkills {
  return { kick: 0, hat: 0, snare: 0, fire: 0, throat: 0 };
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Mon=0 … Sun=6 */
export function seasonDayFromKey(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const js = date.getDay(); // Sun=0
  return js === 0 ? 6 : js - 1;
}

export function emptyBeatRpg(): BeatRpgProgress {
  const key = todayKey();
  return {
    skills: emptySkills(),
    sp: 0,
    stamina: MAX_STAMINA_BASE,
    maxStamina: MAX_STAMINA_BASE,
    fame: 0,
    lastDayKey: key,
    seasonDay: seasonDayFromKey(key),
    clearedToday: [],
  };
}

export function normalizeBeatRpg(raw: Partial<BeatRpgProgress> | null): BeatRpgProgress {
  const base = emptyBeatRpg();
  if (!raw) return refreshStaminaForToday(base);
  const skills = { ...base.skills, ...(raw.skills ?? {}) };
  (Object.keys(skills) as SkillId[]).forEach((id) => {
    const v = skills[id];
    skills[id] = Number.isFinite(v) ? Math.max(0, Math.min(99, Math.floor(v))) : 0;
  });
  const progress: BeatRpgProgress = {
    skills,
    sp: Math.max(0, Math.floor(raw.sp ?? 0)),
    stamina: Math.max(0, Math.floor(raw.stamina ?? base.stamina)),
    maxStamina: Math.max(MAX_STAMINA_BASE, Math.floor(raw.maxStamina ?? base.maxStamina)),
    fame: Math.max(0, Math.floor(raw.fame ?? 0)),
    lastDayKey: typeof raw.lastDayKey === "string" ? raw.lastDayKey : base.lastDayKey,
    seasonDay: Math.max(0, Math.min(6, Math.floor(raw.seasonDay ?? base.seasonDay))),
    clearedToday: Array.isArray(raw.clearedToday)
      ? raw.clearedToday.filter((x) => typeof x === "string")
      : [],
  };
  const refreshed = refreshStaminaForToday(progress);
  // Free-practice mode: keep stamina full so the HUD never looks blocked.
  if (STAMINA_COST_LESSON <= 0 && STAMINA_COST_SPAR <= 0) {
    return { ...refreshed, stamina: refreshed.maxStamina, maxStamina: MAX_STAMINA_BASE };
  }
  return refreshed;
}

/** New calendar day → full stamina + clear daily checklist. */
export function refreshStaminaForToday(progress: BeatRpgProgress, now = new Date()): BeatRpgProgress {
  const key = todayKey(now);
  if (progress.lastDayKey === key) {
    return { ...progress, seasonDay: seasonDayFromKey(key) };
  }
  return {
    ...progress,
    lastDayKey: key,
    seasonDay: seasonDayFromKey(key),
    stamina: progress.maxStamina,
    clearedToday: [],
  };
}

export function skillTotal(skills: BeatSkills): number {
  return skills.kick + skills.hat + skills.snare + skills.fire + skills.throat;
}

/** HP bonus from raising (A). Soft — keeps orbit readable. */
export function hpBonusFromSkills(skills: BeatSkills): number {
  const t = skillTotal(skills);
  if (t >= 40) return 2;
  if (t >= 20) return 1;
  return 0;
}

/** Timing window widen slightly with hat/snare skill. */
export function timingBonusFromSkills(skills: BeatSkills): number {
  return Math.min(0.12, (skills.hat + skills.snare) * 0.004);
}

export type PracticeSlot = {
  kind: "lesson" | "spar";
  track: BeatTrackDef;
  stageIndex: number;
  title: string;
  hint: string;
  staminaCost: number;
};

/**
 * Free practice board: the player picks any lesson, in either mode.
 * Spar keeps the same chart but pays out more skill/fame.
 */
export function buildStageSlots(kind: "lesson" | "spar"): PracticeSlot[] {
  return BEAT_TRACKS.map((track, stageIndex) => ({
    kind,
    track,
    stageIndex,
    title: track.lessonTitle,
    hint: track.lessonHint,
    staminaCost: kind === "spar" ? STAMINA_COST_SPAR : STAMINA_COST_LESSON,
  }));
}

export function applyLessonClear(
  progress: BeatRpgProgress,
  track: BeatTrackDef,
  opts: { perfectRatio: number; isSpar: boolean },
): BeatRpgProgress {
  const next = refreshStaminaForToday({ ...progress, skills: { ...progress.skills } });
  const gains = PATTERN_SKILLS[track.patternId] ?? ["kick"];
  const skillGain = opts.isSpar ? 2 : 1;
  for (const id of gains) {
    next.skills[id] = Math.min(99, next.skills[id] + skillGain);
  }
  const spGain = opts.isSpar ? 3 : 2;
  const fameGain =
    (opts.isSpar ? 12 : 6) + Math.round(opts.perfectRatio * (opts.isSpar ? 20 : 10));
  next.sp += spGain;
  next.fame += fameGain;
  if (!next.clearedToday.includes(track.id)) {
    next.clearedToday = [...next.clearedToday, track.id];
  }
  return next;
}

export function spendStamina(progress: BeatRpgProgress, cost: number): BeatRpgProgress | null {
  const next = refreshStaminaForToday(progress);
  // cost 0 = free practice (always allowed)
  if (cost <= 0) return next;
  if (next.stamina < cost) return null;
  return { ...next, stamina: next.stamina - cost };
}
