/**
 * 온라인 연결 (2026-11-20) — WebSocket 하나로 server/src/index.js 와 말한다. 화면(OnlineDock)은 subscribe 로 상태만 받는다.
 * 보내는 것: hello(id · 닉네임) · chat · name · status(지금 하는 것 · 사냥터 층) · score(사냥터 최고 층 · 성문 방어 최고 점수 — 오른 값만).
 * 기록은 게임 저장 함수(titans/storage · game/storage)로 4초마다 읽는다. 끊기면 1.6배씩(최대 약 17초) 기다렸다 다시 붙는다.
 * 닉네임 · 기기 id 는 이 브라우저에만(localStorage) — 계정 · 개인정보 없음.
 */
import { resolveUserKey } from "../game/toss";
import { loadHighScore } from "../game/storage";
import { profileHash } from "../progression/storage";
import { loadTitansSave } from "../titans/storage";
import { wsUrl } from "./config";

export type BoardKey = "hunt" | "dodge";
export type BoardRow = { id: string; name: string; value: number };
export type Board = { title: string; rows: BoardRow[] };
export type Person = { id: string; name: string; where: string; stage: number };
export type ChatItem = { name: string; text: string; at: number };
export type FeedItem = { text: string; at: number };
export type LogLine = { kind: "chat"; item: ChatItem } | { kind: "feed"; item: FeedItem };
export type OnlineState = {
  connected: boolean; full: boolean; chatEnabled: boolean;
  me: { id: string; name: string };
  online: Person[]; log: LogLine[]; boards: Partial<Record<BoardKey, Board>>; where: Record<string, string>;
  unread: number; toast: { seq: number; text: string } | null;
};

const ID_KEY = "dodgebullets:online-id", NAME_KEY = "dodgebullets:online-name";
const ls = {
  get(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string): void { try { localStorage.setItem(k, v); } catch { /* 이번만 */ } },
};
function myId(): string {
  let id = ls.get(ID_KEY);
  if (!id) { id = `p-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`; ls.set(ID_KEY, id); }
  return id;
}
export function cleanNick(v: string): string {
  return v.replace(/[<>&"'`]/g, "").replace(/\s+/g, " ").trim().slice(0, 12);
}

type Listener = (s: OnlineState) => void;

export function createOnline(base: string) {
  let state: OnlineState = {
    connected: false, full: false, chatEnabled: true,
    me: { id: myId(), name: ls.get(NAME_KEY) || `비버${100 + Math.floor(Math.random() * 900)}` },
    online: [], log: [], boards: {}, where: {}, unread: 0, toast: null,
  };
  const listeners = new Set<Listener>();
  let ws: WebSocket | null = null, retry = 0, stopped = false, timer = 0, toastSeq = 0;
  let panelOnChat = false;
  let lastSent: Partial<Record<BoardKey, number>> = {}, lastStatus = "";
  let userHash = "";
  void resolveUserKey().then((k) => { userHash = profileHash(k.hash); }).catch(() => { userHash = ""; });

  const set = (patch: Partial<OnlineState>) => { state = { ...state, ...patch }; for (const l of listeners) l(state); };
  const send = (m: object) => { if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m)); };
  const pushLog = (line: LogLine, notify: boolean) => {
    const log = [...state.log, line].slice(-80);
    const patch: Partial<OnlineState> = { log };
    if (notify && line.kind === "chat" && !panelOnChat) patch.unread = Math.min(99, state.unread + 1);
    if (notify && line.kind === "feed") patch.toast = { seq: ++toastSeq, text: line.item.text };
    set(patch);
  };

  function connect() {
    if (stopped) return;
    try { ws = new WebSocket(wsUrl(base)); } catch { later(); return; }
    ws.onopen = () => { retry = 0; lastSent = {}; lastStatus = ""; send({ t: "hello", id: state.me.id, name: state.me.name }); };
    ws.onmessage = (ev) => {
      let m: Record<string, unknown>;
      try { m = JSON.parse(String(ev.data)); } catch { return; }
      if (m.t === "welcome") {
        const chat = ((m.chat as ChatItem[]) || []).map((item): LogLine => ({ kind: "chat", item }));
        const feed = ((m.feed as FeedItem[]) || []).map((item): LogLine => ({ kind: "feed", item }));
        set({ connected: true, full: false, chatEnabled: m.chatEnabled !== false, online: (m.online as Person[]) || [], boards: (m.boards as OnlineState["boards"]) || {},
          where: (m.where as Record<string, string>) || {}, log: [...chat, ...feed].sort((a, b) => a.item.at - b.item.at).slice(-80) });
        void report(true);
      } else if (m.t === "online") set({ online: (m.online as Person[]) || [] });
      else if (m.t === "chat") pushLog({ kind: "chat", item: m.item as ChatItem }, true);
      else if (m.t === "feed") pushLog({ kind: "feed", item: m.item as FeedItem }, true);
      else if (m.t === "board") set({ boards: { ...state.boards, [m.board as BoardKey]: { title: String(m.title), rows: (m.rows as BoardRow[]) || [] } } });
      else if (m.t === "you" && m.you) { const you = m.you as { id: string; name: string }; ls.set(NAME_KEY, you.name); set({ me: you }); }
      else if (m.t === "notice") set({ toast: { seq: ++toastSeq, text: String(m.text) } });
    };
    ws.onclose = (ev) => { set({ connected: false, full: ev.code === 1013 }); later(); };
    ws.onerror = () => { try { ws?.close(); } catch { /* 닫힘 */ } };
  }
  function later() {
    if (stopped) return;
    retry = Math.min(retry + 1, 6);
    window.setTimeout(connect, 1000 * Math.pow(1.6, retry));
  }

  /** 지금 하는 것 — 화면에 보이는 것으로(비트 판 · 사냥터 전장 · 성문 방어 캔버스) */
  function whereNow(): string {
    const vis = (sel: string) => { const e = document.querySelector(sel); return !!(e && e.getClientRects().length && getComputedStyle(e).visibility !== "hidden"); };
    if (vis(".beat-battle-canvas")) return "beat";
    if (vis(".titans-field")) return "hunt";
    const c = document.querySelector<HTMLCanvasElement>("canvas.game-canvas");
    if (c && c.getClientRects().length && c.clientHeight > 300 && !vis(".titans-layer")) return "dodge";
    return "menu";
  }
  async function report(force: boolean) {
    if (!state.connected || !userHash) return;
    let hunt = 0, stage = 0, dodge = 0;
    try { const t = await loadTitansSave(userHash); hunt = Math.floor(t.bestStage || 0); stage = Math.floor(t.stage || 0); } catch { /* 저장 없음 */ }
    try { dodge = Math.floor((await loadHighScore(userHash)) || 0); } catch { /* 저장 없음 */ }
    for (const [k, v] of [["hunt", hunt], ["dodge", dodge]] as const) {
      // 사냥터 1층은 새로 온 사람 누구나라 판을 채우기만 한다 — 2층부터
      if (v > (k === "hunt" ? 1 : 0) && (force || v > (lastSent[k] ?? 0))) { send({ t: "score", board: k, value: v }); lastSent[k] = v; }
    }
    const where = whereNow(), key = `${where}:${stage}`;
    if (force || key !== lastStatus) { lastStatus = key; send({ t: "status", where, stage: where === "hunt" ? stage : 0 }); }
  }

  connect();
  timer = window.setInterval(() => { void report(false); }, 4000);

  return {
    get state() { return state; },
    subscribe(l: Listener) { listeners.add(l); l(state); return () => { listeners.delete(l); }; },
    chat(text: string) { const t = text.trim().slice(0, 100); if (t) send({ t: "chat", text: t }); },
    rename(name: string) { const n = cleanNick(name); if (!n) return; ls.set(NAME_KEY, n); set({ me: { ...state.me, name: n } }); send({ t: "name", name: n }); },
    viewingChat(on: boolean) { panelOnChat = on; if (on && state.unread) set({ unread: 0 }); },
    stop() { stopped = true; window.clearInterval(timer); try { ws?.close(); } catch { /* 닫힘 */ } },
  };
}
export type Online = ReturnType<typeof createOnline>;
