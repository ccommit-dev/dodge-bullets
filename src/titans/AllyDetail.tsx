/**
 * 보유 동료 상세 (2026-11-03, 사용자: "현재 보유와 동료의 상세 스킬 능력치를 보여주는 페이지 신설 · 가능하다면 공격 스킬모션도").
 * 위 칸에서 실제 전투와 같은 공격 시트를 1.8초마다 다시 돌린다. 숫자는 사냥터 화면이 계산해 넘긴다.
 */
import { useEffect, useState } from "react";
import { ALLY_ELEMENT, ALLY_RARITY, ALLY_ROLE, ELEMENT_LABEL, RARITY_COLOR, RARITY_LABEL, ROLE_LABEL, STAR_CAP, STAR_MULT } from "./allies";
import { ALLY_FEATURES } from "./allyFeatures";
import { AllySigInfo } from "./AllySigInfo";
import type { TitanHeroDef } from "./model";
import { AllyArt } from "./SpriteArt";

const ATTACK_EVERY_MS = 1800;

type Props = {
  hero: TitanHeroDef;
  level: number;
  stars: number;
  skin?: string;
  /** 지금 편성 기준 DPS 표기 */
  dpsText: string;
  shards: number;
  nextStarCost: number | null;
  inParty: boolean;
};

export function AllyDetail({ hero, level, stars, skin, dpsText, shards, nextStarCost, inParty }: Props) {
  const [pulse, setPulse] = useState(1);
  useEffect(() => {
    const t = window.setInterval(() => setPulse((n) => n + 1), ATTACK_EVERY_MS);
    return () => window.clearInterval(t);
  }, []);
  const rarity = ALLY_RARITY[hero.id];
  const feat = ALLY_FEATURES[hero.id as keyof typeof ALLY_FEATURES];
  const cap = STAR_CAP[rarity];
  return (
    <article className={`ally-detail rarity-${rarity.toLowerCase()}`} data-ally-detail={hero.id}>
      <div className="ally-detail-stage" aria-label={`${hero.name} 공격 모션`}>
        <span className="ally-detail-art"><AllyArt id={hero.id} skin={skin} stars={stars} attacking pulse={pulse} /></span>
        <em>공격 모션 · {hero.attackType}</em>
      </div>
      <header className="ally-detail-head">
        <b style={{ color: RARITY_COLOR[rarity] }}>{RARITY_LABEL[rarity]}</b>
        <strong>{hero.name}</strong>
        <small>{inParty ? "출전 중" : "대기"} · Lv.{level}</small>
      </header>
      <dl className="ally-detail-stats">
        <div><dt>역할</dt><dd>{ROLE_LABEL[ALLY_ROLE[hero.id]]}</dd></div>
        <div><dt>속성</dt><dd>{ELEMENT_LABEL[ALLY_ELEMENT[hero.id]]}</dd></div>
        <div><dt>DPS</dt><dd>{dpsText}</dd></div>
        <div><dt>공격 간격</dt><dd>{hero.attackInterval.toFixed(1)}초</dd></div>
        <div><dt>성급</dt><dd>★{stars}/{cap} · ×{STAR_MULT[stars] ?? 1}</dd></div>
        <div><dt>승급 조각</dt><dd>{nextStarCost !== null ? `${shards}/${nextStarCost}` : "최대 성급"}</dd></div>
      </dl>
      <section className="ally-detail-skill" aria-label="스킬">
        <h4>스킬</h4>
        <AllySigInfo hero={hero} />
      </section>
      <section className="ally-detail-skill" aria-label="특성">
        <h4>특성</h4>
        <p>{hero.feature}</p>
        {feat && <p><b>{feat.label}</b> {feat.desc}</p>}
      </section>
    </article>
  );
}
