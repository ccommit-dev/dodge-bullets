export type GameState = "ready" | "playing" | "gameover";

export type Player = {
  x: number;
  y: number;
  radius: number;
};

export type Bullet = {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  vy: number;
};

export type GameWorld = {
  width: number;
  height: number;
  dpr: number;
  safeTop: number;
  safeBottom: number;
  safeLeft: number;
  safeRight: number;
  player: Player;
  bullets: Bullet[];
  spawnAccMs: number;
  elapsedMs: number;
  /** Dodged bullets that left the screen */
  dodged: number;
  /** Survival + dodge combined score */
  score: number;
};
