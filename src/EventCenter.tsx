import { useEffect, useMemo, useState } from "react";
import { storageGet, storageSet } from "./game/toss";
import { combatPower, type CharacterProgress } from "./progression/model";
import { updateCharacterProgress } from "./progression/storage";
import { assetUrl } from "./asset";

type EventTab = "daily" | "rift" | "weekly";
type EventSave = { date: string; week: string; claimed: string[]; raidAttempts: number; raidBestDamage: number };
const dateKey = () => new Date().toLocaleDateString("sv-SE");
const weekKey = () => { const d = new Date(); const start = new Date(d.getFullYear(), 0, 1); return `${d.getFullYear()}-${Math.ceil(((+d - +start) / 86400000 + start.getDay() + 1) / 7)}`; };

export function EventCenter({ userHash, progress, open, onClose, onUpdated }: { userHash: string; progress: CharacterProgress; open: boolean; onClose: () => void; onUpdated: (p: CharacterProgress) => void }) {
  const [tab, setTab] = useState<EventTab>("daily");
  const [save, setSave] = useState<EventSave | null>(null);
  const [raidDamage, setRaidDamage] = useState(0);
  useEffect(() => { void storageGet(`dodgebullets:events:v1:${userHash}`).then((raw) => {
    let value: EventSave = { date: dateKey(), week: weekKey(), claimed: [], raidAttempts: 0, raidBestDamage: 0 };
    try { if (raw) value = { ...value, ...(JSON.parse(raw) as EventSave) }; } catch { /* fallback */ }
    if (value.date !== dateKey()) value = { ...value, date: dateKey(), claimed: value.claimed.filter((id) => id.startsWith("weekly:")), raidAttempts: 0 };
    if (value.week !== weekKey()) value = { ...value, week: weekKey(), claimed: value.claimed.filter((id) => id.startsWith("daily:")) };
    setSave(value);
  }); }, [userHash]);
  const daily = useMemo(() => [
    { id: "hunt", title: "사냥터 보스 진척", value: Math.max(0, progress.titanBestStage - 1), goal: 2 },
    { id: "expedition", title: "화살 원정 돌파", value: progress.dodgeBestStage, goal: 2 },
    { id: "forge", title: "장비 강화 기록", value: progress.bestForgeLevel, goal: 3 },
  ], [progress]);
  if (!open || !save) return null;
  const persist = async (next: EventSave) => { setSave(next); await storageSet(`dodgebullets:events:v1:${userHash}`, JSON.stringify(next)); };
  const claimMission = async (id: string) => {
    const key = `daily:${dateKey()}:${id}`; if (save.claimed.includes(key)) return;
    const nextProgress = await updateCharacterProgress(userHash, (current) => ({ ...current, sharedCoins: current.sharedCoins + 250, enhancementMaterials: current.enhancementMaterials + 2 }));
    onUpdated(nextProgress); await persist({ ...save, claimed: [...save.claimed, key] });
  };
  const raid = async () => {
    if (save.raidAttempts >= 3) return;
    const damage = Math.floor(combatPower(progress) * (18 + Math.random() * 8));
    setRaidDamage(damage);
    await persist({ ...save, raidAttempts: save.raidAttempts + 1, raidBestDamage: Math.max(save.raidBestDamage, damage) });
  };
  const weeklyPoints = daily.reduce((sum, m) => sum + Math.min(m.goal, m.value), 0) + Math.min(4, progress.dodgeBestStage) + Math.min(3, Math.floor(Object.values(progress.beatSkills).reduce((a,b) => a+b,0) / 5));
  const claimWeekly = async () => {
    const key = `weekly:${weekKey()}:chest`; if (weeklyPoints < 8 || save.claimed.includes(key)) return;
    const nextProgress = await updateCharacterProgress(userHash, (current) => ({ ...current, sharedCoins: current.sharedCoins + 1500, shoulderShards: current.shoulderShards + 30 }));
    onUpdated(nextProgress); await persist({ ...save, claimed: [...save.claimed, key] });
  };
  return <div className="exit-modal event-modal" role="dialog" aria-modal="true"><div className="exit-card event-card">
    <p className="brand">ADVENTURE EVENT</p><h2 className="exit-title">모험가 이벤트</h2>
    <div className="event-tabs">{(["daily","rift","weekly"] as EventTab[]).map(id => <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{id === "daily" ? "오늘의 토벌령" : id === "rift" ? "차원 균열" : "주간 원정"}</button>)}</div>
    {tab === "daily" && <div className="event-list">{daily.map(m => { const key=`daily:${dateKey()}:${m.id}`; const done=m.value>=m.goal; return <article key={m.id}><div><b>{m.title}</b><span>{Math.min(m.goal,m.value)} / {m.goal}</span><i><em style={{width:`${Math.min(100,m.value/m.goal*100)}%`}} /></i></div><button disabled={!done || save.claimed.includes(key)} onClick={() => void claimMission(m.id)}>{save.claimed.includes(key) ? "완료" : "받기"}</button></article>;})}</div>}
    {tab === "rift" && <section className="rift-event"><img src={assetUrl("ui/attendance/event-chest.png")} alt="차원 균열 보상"/><h3>심연의 균열 보스</h3><p>10초간 전투력을 집중해 최고 피해량에 도전합니다.</p><strong>{raidDamage ? `이번 피해 ${raidDamage.toLocaleString()}` : `최고 ${save.raidBestDamage.toLocaleString()}`}</strong><button className="cta" disabled={save.raidAttempts >= 3} onClick={() => void raid()}>도전 {save.raidAttempts}/3</button></section>}
    {tab === "weekly" && <section className="weekly-event"><img src={assetUrl("ui/attendance/event-chest.png")} alt="주간 보상 상자"/><h3>주간 원정 패스</h3><p>사냥·원정·강화·비트 수련을 진행해 포인트를 모으세요.</p><strong>{weeklyPoints} / 8 POINT</strong><button className="cta" disabled={weeklyPoints < 8 || save.claimed.includes(`weekly:${weekKey()}:chest`)} onClick={() => void claimWeekly()}>주간 상자 받기</button></section>}
    <button className="cta cta-ghost" onClick={onClose}>닫기</button>
  </div></div>;
}
