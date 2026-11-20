/**
 * 총피하기 온라인 서버 (2026-11-20) — 접속자 · 채팅 · 랭킹 · 기록 소식.
 * 게임(GitHub Pages 정적 사이트)이 WebSocket 하나로 붙는다. 방은 하나(Durable Object "main").
 *
 *   GET  /healthz       살아 있음
 *   GET  /api/boards    랭킹(사냥터 최고 층 · 성문 방어 최고 점수) — CORS 허용
 *   GET  /api/online    접속자 수
 *   WS   /ws            hello → welcome(접속자 · 최근 채팅 · 소식 · 랭킹) 뒤 chat · status · score · name
 *
 * 공개 인터넷이라 지키는 것:
 *   - WebSocket 은 허용한 게임 주소(Origin)에서만 — wrangler.toml ALLOWED_ORIGINS + localhost
 *   - IP 하나에 연결 4개까지(IP 는 해시로만 태그에 쓰고 저장 · 로그에 남기지 않는다)
 *   - 채팅 100자 · 0.8초에 한 번 · 비속어 가림 · CHAT_ENABLED="false" 면 채팅만 끔
 *   - 기록은 각자의 브라우저가 보낸 값을 믿되(치트 방지는 안 함) 상한을 넘으면 버린다(잘라 받으면 그 값이 1위가 된다)
 *   - 이름은 각자 정한 닉네임뿐 — 계정 · 개인정보 없음
 * 절전(hibernation): 메모리는 언제든 비워진다 — 접속자는 소켓에 붙인 작은 정보(serializeAttachment)에서, 랭킹 · 채팅 · 소식은 저장소에서 다시 읽는다.
 */
import { DurableObject } from "cloudflare:workers";

const CHAT_LEN = 100, CHAT_GAP_MS = 800, CHAT_KEEP = 40, FEED_KEEP = 30, BOARD_TOP = 50, BOARD_KEEP = 500;
const PER_IP = 4, MAX_CONN = 300, PRESENCE_MS = 1500;
const BOARDS = {
  hunt: { title: "사냥터 최고 층", max: 100_000 },
  dodge: { title: "성문 방어 최고 점수", max: 50_000_000 },
};
const WHERE = { hunt: "사냥터", dodge: "성문 방어", beat: "비트 수련", menu: "둘러보는 중" };
const BAD = ["씨발", "시발", "ㅅㅂ", "병신", "ㅂㅅ", "개새", "좆", "니미", "fuck", "shit", "bitch"];

const json = (data, init = {}, extra = {}) => new Response(JSON.stringify(data), { ...init, headers: { "content-type": "application/json; charset=utf-8", ...extra, ...(init.headers || {}) } });

function allowedOrigin(origin, env) {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return true;
  } catch { return false; }
  return String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean).includes(origin);
}
function corsHeaders(req, env) {
  const origin = req.headers.get("Origin") || "";
  return allowedOrigin(origin, env) ? { "access-control-allow-origin": origin, vary: "Origin" } : {};
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/healthz") return json({ status: "ok" });
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...corsHeaders(req, env), "access-control-allow-methods": "GET", "access-control-max-age": "86400" } });
    const lobby = env.LOBBY.get(env.LOBBY.idFromName("main"));
    if (url.pathname === "/ws") {
      if (req.headers.get("Upgrade") !== "websocket") return new Response("WebSocket only", { status: 426 });
      if (!allowedOrigin(req.headers.get("Origin") || "", env)) return new Response("origin not allowed", { status: 403 });
      return lobby.fetch(req);
    }
    if (url.pathname === "/api/boards" || url.pathname === "/api/online") {
      const res = await lobby.fetch(req);
      return new Response(res.body, { status: res.status, headers: { ...Object.fromEntries(res.headers), ...corsHeaders(req, env), "cache-control": "no-store" } });
    }
    return json({ error: "not found" }, { status: 404 });
  },
};

function cleanName(v) {
  const s = Array.from(String(v ?? "")).filter((ch) => ch >= " " && !"<>&\"'`".includes(ch)).join("").replace(/\s+/g, " ").trim();
  return Array.from(s).slice(0, 12).join("") || `비버${100 + Math.floor(Math.random() * 900)}`;
}
function cleanText(v) {
  let s = Array.from(String(v ?? "")).filter((ch) => ch >= " ").join("").replace(/\s+/g, " ").trim();
  s = Array.from(s).slice(0, CHAT_LEN).join("");
  for (const w of BAD) s = s.split(w).join("*".repeat(Array.from(w).length));
  if (/^\*+$/.test(s.replace(/\s/g, ""))) return "";
  return s;
}
function cleanId(v) {
  const s = String(v ?? "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 40);
  return s || `anon-${crypto.randomUUID().slice(0, 12)}`;
}
async function ipTag(ip) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`dbo:${ip || "?"}`));
  return "ip-" + [...new Uint8Array(buf)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class Lobby extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
    this.ctx.blockConcurrencyWhile(async () => {
      const [boards, chat, feed] = await Promise.all([ctx.storage.get("boards"), ctx.storage.get("chat"), ctx.storage.get("feed")]);
      this.boards = { hunt: {}, dodge: {}, ...(boards || {}) };
      this.chat = Array.isArray(chat) ? chat : [];
      this.feed = Array.isArray(feed) ? feed : [];
    });
  }

  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/api/boards") return json(this.allTops());
    if (url.pathname === "/api/online") return json({ online: this.presence().length });
    if (url.pathname !== "/ws") return json({ error: "not found" }, { status: 404 });
    if (this.ctx.getWebSockets().length >= MAX_CONN) return new Response("full", { status: 503 });
    const tag = await ipTag(req.headers.get("cf-connecting-ip"));
    if (this.ctx.getWebSockets(tag).length >= PER_IP) return new Response("too many connections", { status: 429 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [tag]);
    server.serializeAttachment({ id: null, name: "", where: "menu", stage: 0, lastChat: 0 });
    return new Response(null, { status: 101, webSocket: client });
  }

  // ── 그리기용 ──
  top(key, n = BOARD_TOP) {
    return Object.values(this.boards[key] || {}).sort((a, b) => b.value - a.value || a.at - b.at).slice(0, n).map((r) => ({ id: r.id, name: r.name, value: r.value }));
  }
  allTops() {
    return Object.fromEntries(Object.keys(BOARDS).map((k) => [k, { title: BOARDS[k].title, rows: this.top(k) }]));
  }
  presence() {
    const seen = new Map();
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment();
      if (a && a.id) seen.set(a.id, { id: a.id, name: a.name, where: a.where, stage: a.stage });
    }
    return [...seen.values()];
  }
  send(ws, msg) { try { ws.send(JSON.stringify(msg)); } catch { /* 닫힌 소켓 */ } }
  broadcast(msg) {
    const data = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment();
      if (a && a.id) { try { ws.send(data); } catch { /* 닫힌 소켓 */ } }
    }
  }
  async presenceSoon() {
    if ((await this.ctx.storage.getAlarm()) == null) await this.ctx.storage.setAlarm(Date.now() + PRESENCE_MS);
  }
  async alarm() { this.broadcast({ t: "online", online: this.presence() }); }
  async addFeed(text) {
    const item = { text, at: Math.floor(Date.now() / 1000) };
    this.feed = [...this.feed, item].slice(-FEED_KEEP);
    await this.ctx.storage.put("feed", this.feed);
    this.broadcast({ t: "feed", item });
  }

  // ── 메시지 ──
  async webSocketMessage(ws, raw) {
    if (typeof raw !== "string" || raw.length > 2048) return;
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== "object") return;
    const a = ws.deserializeAttachment() || {};
    if (m.t === "hello") {
      a.id = cleanId(m.id); a.name = cleanName(m.name);
      ws.serializeAttachment(a);
      this.send(ws, { t: "welcome", you: { id: a.id, name: a.name }, online: this.presence(), chat: this.chat.slice(-CHAT_KEEP), feed: this.feed.slice(-FEED_KEEP), boards: this.allTops(), where: WHERE, chatEnabled: this.env.CHAT_ENABLED !== "false" });
      await this.presenceSoon();
      return;
    }
    if (!a.id) return;   // hello 전에는 아무것도 안 받는다
    if (m.t === "chat") {
      if (this.env.CHAT_ENABLED === "false") { this.send(ws, { t: "notice", text: "지금은 채팅을 쉬고 있어요" }); return; }
      const text = cleanText(m.text);
      const nowMs = Date.now();
      if (!text || nowMs - (a.lastChat || 0) < CHAT_GAP_MS) return;
      a.lastChat = nowMs; ws.serializeAttachment(a);
      const item = { name: a.name, text, at: Math.floor(nowMs / 1000) };
      this.chat = [...this.chat, item].slice(-CHAT_KEEP);
      await this.ctx.storage.put("chat", this.chat);
      this.broadcast({ t: "chat", item });
    } else if (m.t === "name") {
      a.name = cleanName(m.name); ws.serializeAttachment(a);
      let changed = false;
      for (const key of Object.keys(BOARDS)) { const row = this.boards[key][a.id]; if (row) { row.name = a.name; changed = true; } }
      if (changed) await this.ctx.storage.put("boards", this.boards);
      this.send(ws, { t: "you", you: { id: a.id, name: a.name } });
      await this.presenceSoon();
    } else if (m.t === "status") {
      const where = Object.hasOwn(WHERE, m.where) ? m.where : "menu";
      const stage = Math.max(0, Math.min(BOARDS.hunt.max, Math.floor(Number(m.stage) || 0)));
      if (where !== a.where || stage !== a.stage) { a.where = where; a.stage = stage; ws.serializeAttachment(a); await this.presenceSoon(); }
    } else if (m.t === "score") {
      const key = m.board;
      if (!Object.hasOwn(BOARDS, key)) return;
      const value = Math.floor(Number(m.value));
      if (!(value > 0 && value <= BOARDS[key].max)) return;   // 상한을 넘으면 잘라 받지 않고 버린다
      await this.submit(a, key, value);
    }
  }

  async submit(a, key, value) {
    const board = this.boards[key];
    const prev = board[a.id];
    if (prev && prev.value >= value) return;
    const before = this.top(key, 10).map((r) => r.id);
    board[a.id] = { id: a.id, name: a.name, value, at: Date.now() };
    const rows = Object.values(board);
    if (rows.length > BOARD_KEEP) for (const r of rows.sort((x, y) => x.value - y.value || x.at - y.at).slice(0, rows.length - BOARD_KEEP)) delete board[r.id];
    await this.ctx.storage.put("boards", this.boards);
    const tops = this.top(key);
    this.broadcast({ t: "board", board: key, title: BOARDS[key].title, rows: tops });
    const rank = tops.findIndex((r) => r.id === a.id) + 1;
    // 소식 — 사냥터는 10층마다, 성문 방어는 처음 10위 안에 들거나 1위를 바꿀 때만(매 판 알리면 채팅이 묻힌다)
    if (key === "hunt" && value % 10 === 0 && (!prev || Math.floor(prev.value / 10) < value / 10)) await this.addFeed(`${a.name} 님이 사냥터 ${value}층에 올랐어요`);
    else if (key === "dodge" && rank && ((rank === 1 && before[0] !== a.id) || (rank <= 10 && !before.includes(a.id)))) await this.addFeed(`${a.name} 님 성문 방어 ${value.toLocaleString("ko-KR")}점 — 전체 ${rank}위`);
  }

  async webSocketClose(ws) { try { ws.close(); } catch { /* 이미 닫힘 */ } await this.presenceSoon(); }
  async webSocketError() { await this.presenceSoon(); }
}
