/** 애니메이션 2판 배치 — scripts/assemble-anim2.mjs 가 art-gen/anim-layout.json 에서 쓴다 (손대지 말 것).
 * 시트는 줄 = 동작 · 칸 = 프레임. ms 는 한 바퀴(loop) 또는 한 번 재생 시간. 게임(SpriteArt · EquippedCharacter · player · sprite-anim.css)이 이 값으로 칸을 넘긴다 */
export type AnimAction = { row: number; frames: number; ms: number; loop: boolean };
export type HeroSheet = { width: number; frames: number; ms: number; loop: boolean };
export const ANIM_LAYOUT = {
  "ally": {
    "cell": [
      360,
      274
    ],
    "feet": 0.87,
    "cols": 8,
    "actions": {
      "idle": {
        "row": 0,
        "frames": 6,
        "ms": 1200,
        "loop": true
      },
      "walk": {
        "row": 1,
        "frames": 6,
        "ms": 600,
        "loop": true
      },
      "attack": {
        "row": 2,
        "frames": 8,
        "ms": 560,
        "loop": false
      },
      "hit": {
        "row": 3,
        "frames": 4,
        "ms": 320,
        "loop": false
      }
    }
  },
  "monster": {
    "cell": [
      384,
      384
    ],
    "feet": 0.955,
    "cols": 4,
    "actions": {
      "idle": {
        "row": 0,
        "frames": 4,
        "ms": 1400,
        "loop": true
      },
      "prepare": {
        "row": 1,
        "frames": 2,
        "ms": 240,
        "loop": false
      },
      "attack": {
        "row": 2,
        "frames": 4,
        "ms": 420,
        "loop": false
      },
      "hit": {
        "row": 3,
        "frames": 2,
        "ms": 240,
        "loop": false
      }
    }
  },
  "hero": {
    "cellHeight": 754,
    "feet": [
      0.4795,
      0.999
    ],
    "sheets": {
      "idle": {
        "width": 377,
        "frames": 6,
        "ms": 1200,
        "loop": true
      },
      "walk": {
        "width": 377,
        "frames": 6,
        "ms": 600,
        "loop": true
      },
      "attack": {
        "width": 470,
        "frames": 8,
        "ms": 480,
        "loop": false
      }
    }
  }
} as const;
export const ALLY_ANIM_SET: readonly string[] = ["ari","ari-blaze","bronn","bronn-iron","ember","ember-ruby","garen","garen-magma","leon","leon-frost","luna","luna-eclipse","marina","mia","nox","nox-abyss","orion","orion-nova","pyro","season-1","season-2","sera","volt"];
export const MONSTER_ANIM_SET: readonly string[] = ["abyss-titan","ancient-treant","armored-ogre","bone-dragon","dragon","fire-demon","flame-wyvern-clean","frost-wolf","goblin","goblin-shaman","goblin-warlord","golden-lion-clean","hellhound","lava-drake","magma-golem","magma-imp","minotaur","moon-wolf-king-clean","moss-golem-clean","ogre","ruin-sentinel","shadow-wolf-clean","skeleton-goblin","slime","spider-queen","stone-troll","storm-drake","thorn-boar-king","void-imp","void-lich","wolf-king-clean"];
export const HERO_ANIM_READY = true;
/** 큰 칸(576²) 대장 시트가 있는 종 → 원래 원화(PNG)에서 몸이 차지한 세로 비율(그 화면 크기를 지키려고) */
export const MONSTER_HD: Readonly<Record<string, number>> = {"abyss-titan":0.841,"ancient-treant":0.829,"bone-dragon":0.596,"fire-demon":0.774,"flame-wyvern-clean":0.69,"goblin-warlord":0.785,"magma-golem":0.679,"minotaur":0.857,"moon-wolf-king-clean":0.848,"moss-golem-clean":0.94,"ruin-sentinel":0.708,"spider-queen":0.678,"thorn-boar-king":0.846,"void-lich":0.94,"wolf-king-clean":0.789};
