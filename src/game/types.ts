export type GameState = "ready" | "playing" | "gameover";

export type Player = {
  x: number;
  y: number;
  radius: number;
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
  elapsedMs: number;
};
