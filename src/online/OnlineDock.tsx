/**
 * 온라인 판 (2026-11-20) — 오른쪽 가장자리 탭(접속자 수 · 안 읽은 채팅) → 판: 랭킹 · 채팅 · 접속자. 기록 소식은 위에 잠깐 뜬다(누르지 못함).
 * 게임과 따로 뜨는 React 루트(mount.tsx)라 게임 화면 코드는 그대로다.
 * 판 안의 키 · 터치는 게임으로 새지 않는다(방향키 · Space 탭 · 끌기) — 네이티브 리스너로 막는다(React 합성 이벤트는 window 리스너보다 늦다).
 * 글자는 13px 이상(가독성 스캔), 남이 보낸 이름 · 글은 React 텍스트로만(HTML 로 실행되지 않음).
 */
import { useEffect, useRef, useState } from "react";
import type { BoardKey, Online, OnlineState } from "./client";

const BOARD_ORDER: BoardKey[] = ["hunt", "dodge"];
const VIEWS = [["rank", "랭킹"], ["chat", "채팅"], ["who", "접속자"]] as const;
type View = (typeof VIEWS)[number][0];
const VIEW_KEY = "dodgebullets:online-view";

function hhmm(sec: number): string {
  const d = new Date(sec * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function fmt(key: BoardKey, v: number): string {
  return key === "hunt" ? `${v}층` : `${v.toLocaleString("ko-KR")}점`;
}

export function OnlineDock({ online }: { online: Online }) {
  const [s, setS] = useState<OnlineState>(online.state);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>(() => { try { const v = localStorage.getItem(VIEW_KEY); return v === "chat" || v === "who" ? v : "rank"; } catch { return "rank"; } });
  const [draft, setDraft] = useState("");
  const [toasts, setToasts] = useState<{ seq: number; text: string }[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => online.subscribe(setS), [online]);
  useEffect(() => { online.viewingChat(open && view === "chat"); try { localStorage.setItem(VIEW_KEY, view); } catch { /* 이번만 */ } }, [online, open, view]);
  useEffect(() => {
    if (!s.toast) return;
    const t = s.toast;
    setToasts((prev) => [...prev.slice(-2), t]);
    const id = window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.seq !== t.seq)), 4200);
    return () => window.clearTimeout(id);
  }, [s.toast]);
  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [s.log, view, open]);
  // 판 · 탭 안의 키 · 터치가 게임(window · document 리스너)으로 새지 않게 — 네이티브로 막는다
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const stop = (e: Event) => e.stopPropagation();
    const evs = ["keydown", "keyup", "keypress", "pointerdown", "pointerup", "touchstart", "touchend", "mousedown", "wheel"];
    for (const ev of evs) el.addEventListener(ev, stop);
    return () => { for (const ev of evs) el.removeEventListener(ev, stop); };
  }, []);

  const rename = () => {
    const v = window.prompt("닉네임 (12자까지 · 랭킹에 보입니다)", s.me.name);
    if (v != null) online.rename(v);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !s.connected) return;
    online.chat(draft);
    setDraft("");
  };

  return (
    <div ref={rootRef} className={`dbo-root ${open ? "is-open" : ""} ${s.connected ? "" : "is-offline"}`}>
      <button type="button" className="dbo-tab" aria-label={`온라인 ${s.online.length}명 — 랭킹 · 채팅 · 접속자`} onClick={() => setOpen(true)}>
        <i className="dbo-dot" aria-hidden="true" />
        <b>{s.online.length}</b>
        <small aria-hidden="true">온라인</small>
        {s.unread > 0 && <em className="dbo-new" aria-hidden="true">{s.unread}</em>}
      </button>
      <section className="dbo-panel" aria-label="온라인" aria-hidden={!open}>
        <header className="dbo-head">
          <strong>모두의 기록</strong>
          <button type="button" className="dbo-name" title="닉네임 바꾸기" onClick={rename}>{s.me.name} ✎</button>
          <button type="button" className="dbo-close" aria-label="닫기" onClick={() => setOpen(false)}>×</button>
        </header>
        <nav className="dbo-tabs">
          {VIEWS.map(([k, label]) => (
            <button key={k} type="button" className={view === k ? "on" : ""} onClick={() => setView(k)}>{label}</button>
          ))}
        </nav>
        {view === "rank" && (
          <div className="dbo-view">
            {BOARD_ORDER.map((key) => {
              const b = s.boards[key];
              if (!b) return null;
              return (
                <div key={key} className="dbo-board">
                  <h3>{b.title}</h3>
                  <ol>
                    {b.rows.slice(0, 20).map((r, i) => (
                      <li key={r.id} className={r.id === s.me.id ? "me" : ""}>
                        <span className="dbo-rk">{i + 1}</span><span className="dbo-nm">{r.name}</span><span className="dbo-val">{fmt(key, r.value)}</span>
                      </li>
                    ))}
                    {!b.rows.length && <li className="dbo-empty">아직 기록이 없어요 — 첫 번째가 되어 보세요</li>}
                  </ol>
                </div>
              );
            })}
            <p className="dbo-note">내 기록은 게임 저장에서 자동으로 올라가요.</p>
          </div>
        )}
        {view === "chat" && (
          <div className="dbo-view dbo-view-chat">
            <ol ref={logRef} className="dbo-chat">
              {s.log.map((l, i) => l.kind === "chat"
                ? <li key={i}><time>{hhmm(l.item.at)}</time><b>{l.item.name}</b><span>{l.item.text}</span></li>
                : <li key={i} className="dbo-feed"><time>{hhmm(l.item.at)}</time><span>📣 {l.item.text}</span></li>)}
              {!s.log.length && <li className="dbo-empty">첫 인사를 남겨 보세요</li>}
            </ol>
            <form className="dbo-chat-form" onSubmit={submit}>
              <input type="text" value={draft} maxLength={100} autoComplete="off" placeholder={s.chatEnabled ? "Enter 로 보내기 (100자)" : "지금은 채팅을 쉬고 있어요"}
                disabled={!s.chatEnabled} onChange={(e) => setDraft(e.target.value)} aria-label="채팅 입력" />
              <button type="submit" disabled={!s.chatEnabled || !s.connected}>보내기</button>
            </form>
          </div>
        )}
        {view === "who" && (
          <div className="dbo-view">
            <ul className="dbo-who">
              {s.online.map((p) => (
                <li key={p.id} className={p.id === s.me.id ? "me" : ""}>
                  <b>{p.name}</b>
                  <span>{p.where === "hunt" && p.stage ? `${s.where.hunt ?? "사냥터"} ${p.stage}층` : s.where[p.where] ?? "둘러보는 중"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!s.connected && <p className="dbo-status">연결 중… 끊겼다면 잠시 뒤 다시 붙어요</p>}
      </section>
      <div className="dbo-toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.seq} className="dbo-toast">{t.text}</div>)}
      </div>
    </div>
  );
}
