import { assetUrl } from "../asset";

/** 자물쇠 (2026-11-02) — 🔒 이모지는 OS 마다 모양이 달라 그림 아이콘 옆에서 튀었다. 글자 크기를 따른다 */
export function LockIcon() {
  return <img className="lock-ico" src={assetUrl("ui/idle/lock.png")} alt="" aria-hidden="true" />;
}
