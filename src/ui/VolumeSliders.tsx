import { useState } from "react";
import { loadVolume, saveVolume, type VolumeKind } from "../game/sound";
import { sfxUiTap } from "./sfx";

const ROWS: { kind: VolumeKind; label: string }[] = [{ kind: "bgm", label: "배경 음악" }, { kind: "sfx", label: "효과음" }];

/** 설정 메뉴의 음량 (2026-11-03) — 켜고 끄기만 있어 음악만 줄일 수 없었다. 효과음은 손을 뗄 때 들려 준다 */
export function VolumeSliders() {
  const [values, setValues] = useState(() => ({ bgm: loadVolume("bgm"), sfx: loadVolume("sfx") }));
  return (
    <div className="volume-sliders" role="group" aria-label="음량">
      {ROWS.map(({ kind, label }) => (
        <label key={kind} className={`volume-row volume-${kind}`}>
          <span>{label}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(values[kind] * 100)}
            aria-label={`${label} 음량`}
            onChange={(e) => {
              const v = Number(e.target.value) / 100;
              setValues((cur) => ({ ...cur, [kind]: v }));
              saveVolume(kind, v);
            }}
            onPointerUp={() => { if (kind === "sfx") sfxUiTap(); }}
          />
          <b>{Math.round(values[kind] * 100)}</b>
        </label>
      ))}
    </div>
  );
}
