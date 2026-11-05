/**
 * 사냥터 순간 연출 (2026-11-05, 사용자: 광고 릴스에서 "차용할 만한 게 있으면 콘텐츠에 차용") — 릴스에서 재미가 또렷했던 것을 실제 게임에 넣는다.
 * 황금 몬스터 시간 제한 · 연타 수, 무기 기술까지 남은 탭, 환생 뒤 예전 기록을 넘는 순간. 값이 아니라 보이는 것만 다룬다(골드 ×10 은 그대로).
 */
import "./huntMoments.css";

/** 황금 몬스터가 도망가기까지(초) — 릴스 golden-monster 와 같은 7초. 배속이면 그만큼 빨리 지난다 */
export const GOLDEN_ESCAPE_SEC = 7;
/** N 연타마다 크게 알린다 */
export const GOLDEN_COMBO_EVERY = 5;

/** 황금 몬스터 위 시간 막대 — 길이는 transform 으로만 줄인다(칸마다 다시 그리지 않게 CSS 가 7초 동안 돈다) */
export function GoldenRush({ seq, hits, sec }: { seq: number; hits: number; sec: number }) {
  return (
    <div className="golden-rush" role="status" data-hits={hits}>
      <b>황금 몬스터! 도망가기 전에 탭!</b>
      <span className="golden-rush-bar"><i key={seq} style={{ animationDuration: `${sec}s` }} /></span>
      {hits > 0 && <em key={hits} className={hits % GOLDEN_COMBO_EVERY === 0 ? "is-big" : ""}>{hits}연타</em>}
    </div>
  );
}

/** 무기 기술까지 남은 탭 — 칸이 다 차면 다음 탭이 기술 */
export function TechGauge({ name, every, count }: { name: string; every: number; count: number }) {
  const left = every - count;
  return (
    <div className={`tech-gauge ${left === 1 ? "is-ready" : ""}`} data-left={left} aria-label={`${name}까지 ${left}탭`}>
      <small>{left === 1 ? `다음 탭 ${name}!` : name}</small>
      <span aria-hidden="true">{Array.from({ length: every - 1 }, (_, i) => <i key={i} className={i < count ? "on" : ""} />)}</span>
    </div>
  );
}

/** 한 번 크게 찍히는 글자 — 황금 처치 · 신기록 */
export function HuntStamp({ text, sub, tone }: { text: string; sub?: string; tone: "gold" | "record" }) {
  return (
    <div className={`hunt-stamp tone-${tone}`} role="status">
      <b>{text}</b>
      {sub && <small>{sub}</small>}
    </div>
  );
}
