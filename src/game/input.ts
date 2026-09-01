export type InputState = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  /** When true, horizontal follow toward pointerX. */
  pointerActive: boolean;
  pointerX: number;
  pointerY: number;
  /** Edge-triggered actions consumed each frame by world update. */
  jumpPressed: boolean;
  dashPressed: boolean;
  slowPressed: boolean;
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
    jumpPressed: false,
    dashPressed: false,
    slowPressed: false,
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
    code === "KeyS" ||
    code === "Space" ||
    code === "ShiftLeft" ||
    code === "ShiftRight" ||
    code === "Enter" ||
    code === "ControlLeft" ||
    code === "ControlRight" ||
    code === "KeyE"
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
    case "Space":
      input.up = true;
      input.jumpPressed = true;
      break;
    case "ArrowDown":
    case "KeyS":
      input.down = true;
      break;
    case "ShiftLeft":
    case "ShiftRight":
      input.dashPressed = true;
      break;
    case "KeyE":
    case "Enter":
    case "ControlLeft":
    case "ControlRight":
      input.slowPressed = true;
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
    case "Space":
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
  input.jumpPressed = false;
  input.dashPressed = false;
  input.slowPressed = false;
}

export function consumeActionEdges(input: InputState): void {
  input.jumpPressed = false;
  input.dashPressed = false;
  input.slowPressed = false;
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
