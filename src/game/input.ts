export type InputState = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  /** When true, player snaps toward pointerX/Y immediately. */
  pointerActive: boolean;
  pointerX: number;
  pointerY: number;
};

export function createInputState(): InputState {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    pointerActive: false,
    pointerX: 0,
    pointerY: 0,
  };
}

function isMoveKey(code: string): boolean {
  return (
    code === "ArrowLeft" ||
    code === "ArrowRight" ||
    code === "ArrowUp" ||
    code === "ArrowDown" ||
    code === "KeyA" ||
    code === "KeyD" ||
    code === "KeyW" ||
    code === "KeyS"
  );
}

export function applyKeyDown(input: InputState, code: string): boolean {
  if (!isMoveKey(code)) return false;
  switch (code) {
    case "ArrowLeft":
    case "KeyA":
      input.left = true;
      break;
    case "ArrowRight":
    case "KeyD":
      input.right = true;
      break;
    case "ArrowUp":
    case "KeyW":
      input.up = true;
      break;
    case "ArrowDown":
    case "KeyS":
      input.down = true;
      break;
  }
  return true;
}

export function applyKeyUp(input: InputState, code: string): boolean {
  if (!isMoveKey(code)) return false;
  switch (code) {
    case "ArrowLeft":
    case "KeyA":
      input.left = false;
      break;
    case "ArrowRight":
    case "KeyD":
      input.right = false;
      break;
    case "ArrowUp":
    case "KeyW":
      input.up = false;
      break;
    case "ArrowDown":
    case "KeyS":
      input.down = false;
      break;
  }
  return true;
}

export function clearKeys(input: InputState): void {
  input.left = false;
  input.right = false;
  input.up = false;
  input.down = false;
}

export function setPointer(
  input: InputState,
  active: boolean,
  x = input.pointerX,
  y = input.pointerY,
): void {
  input.pointerActive = active;
  input.pointerX = x;
  input.pointerY = y;
}
