/**
 * 게임 지식 · 지난 판 기억 — 화면 지도(화면 서명 → 단추 → 다음 화면)와 눌러 본 횟수.
 * 판이 끝나면 파일로 남겨, 다음 판은 아는 길을 하네스로 빨리 지나가고 안 가 본 곳부터 간다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export class Memory {
  constructor(file) {
    this.file = file;
    const empty = { screens: {}, edges: {}, tried: {}, keyTried: {}, fails: {}, runs: 0 };
    try { this.m = file && existsSync(file) ? { ...empty, ...JSON.parse(readFileSync(file, "utf8")) } : empty; } catch { this.m = empty; }
  }
  see(o) {
    const s = (this.m.screens[o.screen] ??= { title: o.title, keys: [], visits: 0 });
    s.visits += 1;
    if (o.title && !s.title) s.title = o.title;
    const keys = new Set(s.keys);
    for (const c of o.clickables) if (!c.disabled) keys.add(c.key);
    s.keys = [...keys].slice(0, 200);
  }
  tried(screen, key) { return this.m.tried[screen]?.[key] ?? 0; }
  keyTried(key) { return this.m.keyTried[key] ?? 0; }
  learn(from, action, to) {
    if (action.type !== "tap" || !action.key) return;
    (this.m.tried[from.screen] ??= {})[action.key] = this.tried(from.screen, action.key) + 1;
    this.m.keyTried[action.key] = this.keyTried(action.key) + 1;
    const e = ((this.m.edges[from.screen] ??= {})[action.key] ??= {});
    e[to.screen] = (e[to.screen] ?? 0) + 1;
  }
  /** 못 누른 단추(덮임 · 사라짐)도 눌러 본 것으로 센다 — 안 세면 같은 자리를 계속 고른다 */
  fail(screen, key) {
    if (!key) return;
    (this.m.fails[screen] ??= {})[key] = (this.m.fails[screen]?.[key] ?? 0) + 1;
    (this.m.tried[screen] ??= {})[key] = this.tried(screen, key) + 1;
    this.m.keyTried[key] = this.keyTried(key) + 1;
  }
  /** 이 단추가 (어느 화면에서든) 이 화면으로 데려온 적이 있나 — 이미 와 있는데 또 누르면 그대로인 게 정상 */
  leadsTo(key, screen) { return Object.values(this.m.edges).some((byKey) => (byKey[key]?.[screen] ?? 0) > 0); }
  /** 이 화면에 아직 안 눌러 본 단추 수 */
  untried(screen) { const s = this.m.screens[screen]; return s ? s.keys.filter((k) => !this.tried(screen, k)).length : 0; }
  /** 아는 길 — 지금 화면에서 조건을 만족하는 화면까지 가장 짧은 단추 순서(넓이 우선) */
  route(from, isGoal, maxDepth = 6) {
    const q = [[from, []]], seen = new Set([from]);
    while (q.length) {
      const [s, path] = q.shift();
      if (path.length && isGoal(s)) return path;
      if (path.length >= maxDepth) continue;
      for (const [key, tos] of Object.entries(this.m.edges[s] ?? {})) {
        const to = Object.entries(tos).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (!to || seen.has(to) || to === s || (this.m.fails[s]?.[key] ?? 0) >= 2) continue; // 두 번 막힌 길은 안 간다
        seen.add(to);
        q.push([to, [...path, { key, to }]]);
      }
    }
    return null;
  }
  /** 단추 이름이 맞는 화면 */
  screensWith(re) { return Object.entries(this.m.screens).filter(([, s]) => s.keys.some((k) => re.test(k))).map(([sig]) => sig); }
  stats() {
    const screens = Object.keys(this.m.screens).length;
    let edges = 0, keys = 0, tried = 0;
    for (const t of Object.values(this.m.edges)) edges += Object.keys(t).length;
    for (const [sig, s] of Object.entries(this.m.screens)) { keys += s.keys.length; tried += s.keys.filter((k) => this.tried(sig, k)).length; }
    return { screens, edges, keys, tried, runs: this.m.runs };
  }
  save() {
    if (!this.file) return;
    this.m.runs += 1;
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(this.m));
  }
}
