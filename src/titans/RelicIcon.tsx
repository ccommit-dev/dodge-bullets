/**
 * 유물 아이콘 (2026-11-06, 사용자: "유물 ui 아이콘을 조금 더 강렬하고 갖고 싶게 모두 수정 · 특징에 맞게").
 * 그림(relic_icons.py 렌더) 뒤에 계열 빛과 등급 연출을 겹친다 — 불씨 · 눈 · 금빛 · 바람결 · 잎 · 별빛 · 물방울.
 * 등급이 오를수록 후광 → 효과 → 회전 광선 → 빛 쓸기 → 무지개 광선. 탭 목록 · 뽑기 결과 · 도감 · 상점 · 복귀 보상이 모두 이것을 쓴다.
 * 크기는 감싸는 칸의 img 규칙이 그대로 정한다(img 는 바로 안에 있다).
 */
import { assetUrl } from "../asset";
import { relicDef, relicIconUrl, type RelicId } from "./relics";
import "./relicIcon.css";

export function RelicIcon({ id, lazy = false }: { id: RelicId; lazy?: boolean }) {
  const d = relicDef(id);
  return (
    <span className={`relic-gem fam-${d.family} rg-${d.tier.toLowerCase()}`} data-family={d.family} aria-hidden="true">
      <i className="rg-aura" />
      <i className="rg-rays" />
      <img src={assetUrl(relicIconUrl(id))} alt="" loading={lazy ? "lazy" : undefined} draggable={false} />
      <i className="rg-fx" />
      <i className="rg-shine" />
    </span>
  );
}
