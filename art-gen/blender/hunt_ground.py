"""사냥터 바닥 (2026-11-19, 리소스 피드백 ② "사냥터 바닥이 단색이다").
전투가 벌어지는 아래 56%(.titans-ground)가 단색 + 얼룩 넷이라 캐릭터가 색종이 위에 떠 보였다.
지역마다 같은 셀 그림결(lib/toon · 잉크 외곽선)로 바닥 한 장을 그린다 — 직교 카메라로 내려다본 땅.
  ART_STYLE=toon blender -b -P art-gen/blender/hunt_ground.py -- meadow|forest|ruins|volcano|abyss|all
  → art-gen/out/b3d-ground/<지역>.png (불투명 1024×1180)
조립: node scripts/assemble-hunt-ground.mjs → public/titans/backgrounds/ground-<지역>.webp (+ backgrounds-px)

배치 규칙 — 게임은 그림을 폭에 맞춰(100% auto) 위에 붙인다(center top). 390×844 에서 띠 높이는 그림의 약 79%.
  · 캐릭터 발 자리(그림 세로 25~62% · 가운데 가로 70%)는 비운다 — 잔돌 몇 개와 옅은 얼룩만(캐릭터가 묻히지 않게)
  · 소품은 뒤 가장자리(위 0~14%)와 아래 양 모서리
  · 위 가장자리는 풀 · 돌을 촘촘히 — 배경 그림과 만나는 이음선을 CSS 가 부드럽게 녹인다
"""
import bpy
import bmesh
import sys
import os
import math
import random
from mathutils import Euler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import bcommon as C
from lib import toon as TOON

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTDIR = os.environ.get('GROUND_OUT') or os.path.join(ROOT, 'art-gen', 'out', 'b3d-ground')
RES = (1024, 1180)
W = 8.0                                    # 그림 폭(월드 단위)
ELEV = 38.0                                # 내려다보는 각
VEXT = W * RES[1] / RES[0]                 # 화면 세로 범위
DEPTH = VEXT / math.sin(math.radians(ELEV))  # 땅 위 깊이 범위


def v2y(v):
    """그림 세로 위치(0 위 · 1 아래) → 땅 y (멀수록 +)"""
    return (0.5 - v) * DEPTH


def u2x(u):
    return (u - 0.5) * W


PATH_V = (0.29, 0.61)                      # 걷는 길 띠(그림 세로) — 캐릭터 발 자리


def calm(u, v):
    """캐릭터 발 자리 — 큰 소품 금지"""
    return 0.15 < u < 0.85 and 0.2 < v < 0.68


AREAS = {
    # base: 땅 · patch: 얼룩 둘 · tuft: 풀 · stone: 돌 · ink 외곽선 굵기 기본
    'meadow':  dict(path=('#dcbb82', '#cfa96c'), bush=('#6aa84a', '#86bf58'), base='#9cc46a', patch=('#b7d27e', '#d7b67c'), tuft=('#5f9e3c', '#7cb84a'), stone=('#c9c0ae', '#a99f8c'), flower=('#ffffff', '#ffd84d', '#ff8fb1')),
    'forest':  dict(path=('#9a7a50', '#8a6a44'), bush=('#4b8a3e', '#3c7434'), base='#6f9150', patch=('#5d7d43', '#8a6c48'), tuft=('#3f7a35', '#5a9440'), stone=('#9a978a', '#7d7a6e'), leaf=('#d98a3a', '#e8b84a', '#b8572e')),
    'ruins':   dict(path=('#d9bd92', '#ccae80'), base='#d6b487', patch=('#c9a374', '#e4c89c'), tuft=('#b7a056', '#9b8a45'), stone=('#cbb99c', '#b19f80'), slab=('#d9c8a8', '#c7b493')),
    'volcano': dict(path=('#8d7062', '#7f6254'), base='#7a5747', patch=('#5f4338', '#8f6957'), tuft=('#5a3a2c', '#6e4a38'), stone=('#4f3a33', '#3e2d28'), lava=('#ff7a2a', '#ffb347')),
    'abyss':   dict(path=('#8a7db0', '#7d70a2'), base='#77699b', patch=('#665a88', '#8a7cb0'), tuft=('#5b4f80', '#6d5f96'), stone=('#5d5478', '#4b4365'), crystal=('#b48cff', '#7fe6ff')),
}


def mat(name, color, emit=None, strength=0.0):
    return C.principled(name, color, rough=0.85, coat=0.0, emit=emit, emit_strength=strength)


_mats = {}


def M(color, emit=None, strength=0.0):
    k = (color, emit, strength)
    if k not in _mats:
        _mats[k] = mat(f'm{len(_mats)}', color, emit, strength)
    return _mats[k]


def put(name, bm, m, outline=0.0):
    return C.mesh_obj(name, bm, m, smooth=False, outline=outline)


def jitter(bm, rng, amt):
    for v in bm.verts:
        v.co.x += rng.uniform(-amt, amt)
        v.co.y += rng.uniform(-amt, amt)
        v.co.z += rng.uniform(-amt * .6, amt * .6)


def ground(cfg, rng):
    put('slab', C.box((0, 0, -0.05), (W + 3, DEPTH + 4, 0.1)), M(cfg['base']))
    # 큰 옅은 얼룩 — 타원 서너 개를 겹친 무더기(완전한 타원은 오려 붙인 듯했다) · 대비는 낮게
    for i in range(18):
        u, v = rng.uniform(-0.05, 1.05), rng.uniform(0.0, 1.0)
        r = rng.uniform(0.3, 0.7)
        blob(u2x(u), v2y(v), r, M(cfg['patch'][i % 2]), rng, z=0.002 + i * 0.0002)
    # 걷는 길 — 캐릭터 발 자리(그림 세로 약 26~64%)를 가로지르는 흙길. 가장자리는 들쭉날쭉(타원 무더기)
    path = cfg.get('path')
    if path:
        top, bot = PATH_V
        yc, h = (v2y(top) + v2y(bot)) / 2, v2y(top) - v2y(bot)
        put('path', C.box((0, yc, 0.004), (W + 3, h, 0.004)), M(path[0]))
        n = 30
        for k in range(n):
            u = -0.08 + k * (1.16 / (n - 1))
            for edge in (top, bot):
                v = edge + rng.uniform(-0.012, 0.012)
                blob(u2x(u), v2y(v), rng.uniform(0.3, 0.5), M(path[0]), rng, z=0.006, squash=0.55)
        for k in range(16):
            u, v = rng.uniform(0, 1), rng.uniform(PATH_V[0] + 0.03, PATH_V[1] - 0.03)
            blob(u2x(u), v2y(v), rng.uniform(0.2, 0.4), M(path[1]), rng, z=0.008, squash=0.45)
    # 잔풀 자국 — 납작한 짧은 획(외곽선 없음), 땅이 '칠한 판'으로 안 보이게
    for i in range(90):
        u, v = rng.uniform(-0.03, 1.03), rng.uniform(0.0, 1.0)
        if path and PATH_V[0] - 0.01 < v < PATH_V[1] + 0.01 and rng.random() < 0.8:
            continue
        rot = Euler((0, 0, rng.uniform(-0.5, 0.5)))
        put('mark', C.ellipsoid((u2x(u), v2y(v), 0.01), (0.07, 0.016, 0.003), seg=6, rings=3, rot=rot), M(cfg['tuft'][i % 2]))


def blob(x, y, r, m, rng, z=0.002, squash=0.62):
    for k in range(rng.randint(3, 4)):
        a = rng.uniform(0, math.tau)
        d = r * rng.uniform(0.15, 0.5)
        rr = r * rng.uniform(0.55, 0.9)
        rot = Euler((0, 0, rng.uniform(-0.4, 0.4)))
        put('patch', C.ellipsoid((x + math.cos(a) * d, y + math.sin(a) * d * 0.6, z), (rr, rr * squash, 0.003), seg=16, rings=5, rot=rot), m)


def bush(x, y, cfg, rng, s=1.0):
    """덤불 — 둥근 잎 뭉치 세 개(외곽선)"""
    for k in range(3):
        r = rng.uniform(0.2, 0.3) * s
        put('bush', C.ellipsoid((x + (k - 1) * 0.2 * s, y + rng.uniform(-0.05, 0.05), r * 0.8), (r, r * 0.85, r * 0.8), seg=12, rings=8), M(cfg['bush'][k % 2]), outline=0.012)


def tuft(x, y, cfg, rng, s=1.0):
    n = rng.randint(4, 7)
    col = cfg['tuft'][rng.randrange(2)]
    for k in range(n):
        a = rng.uniform(0, math.tau)
        dx, dy = math.cos(a) * 0.06 * s, math.sin(a) * 0.04 * s
        h = rng.uniform(0.18, 0.32) * s
        tilt = Euler((rng.uniform(-0.45, 0.45), rng.uniform(-0.45, 0.45), 0))
        put('blade', C.cone((x + dx, y + dy, h / 2), 0.035 * s, 0.0, h, seg=4, rot=tilt), M(col), outline=0.006)


def pebble(x, y, cfg, rng, r=None, outline=0.008):
    r = r or rng.uniform(0.05, 0.11)
    bm = C.ellipsoid((x, y, r * 0.35), (r, r * rng.uniform(0.7, 0.95), r * 0.55), seg=8, rings=5)
    jitter(bm, rng, r * 0.12)
    put('pebble', bm, M(cfg['stone'][rng.randrange(2)]), outline=outline)


def rock(x, y, cfg, rng, r=None):
    r = r or rng.uniform(0.22, 0.42)
    bm = C.ellipsoid((x, y, r * 0.45), (r, r * rng.uniform(0.65, 0.9), r * 0.75), seg=7, rings=5)
    jitter(bm, rng, r * 0.14)
    put('rock', bm, M(cfg['stone'][rng.randrange(2)]), outline=0.014)


def flower(x, y, cfg, rng):
    h = rng.uniform(0.1, 0.16)
    put('stem', C.cone((x, y, h / 2), 0.012, 0.012, h, seg=4), M('#4f8a33'))
    put('petal', C.ellipsoid((x, y, h + 0.03), (0.05, 0.05, 0.035), seg=8, rings=5), M(rng.choice(cfg['flower'])), outline=0.006)


def mushroom(x, y, rng, s=1.0):
    h = 0.16 * s
    put('mstem', C.cone((x, y, h / 2), 0.05 * s, 0.045 * s, h, seg=8), M('#f3e6c8'), outline=0.008)
    put('mcap', C.ellipsoid((x, y, h + 0.03 * s), (0.17 * s, 0.17 * s, 0.1 * s), seg=12, rings=6), M('#d9473a'), outline=0.01)
    for k in range(4):
        a = k * 1.7 + rng.uniform(0, 0.5)
        put('mdot', C.ellipsoid((x + math.cos(a) * 0.09 * s, y + math.sin(a) * 0.09 * s - 0.02, h + 0.1 * s), (0.025 * s, 0.025 * s, 0.012), seg=6, rings=4), M('#fff8e6'))


def leaf(x, y, cfg, rng):
    rot = Euler((0, 0, rng.uniform(0, math.tau)))
    put('leaf', C.ellipsoid((x, y, 0.006), (0.09, 0.045, 0.006), seg=8, rings=4, rot=rot), M(rng.choice(cfg['leaf'])), outline=0.004)


def twig(x, y, rng):
    a = rng.uniform(0, math.pi)
    L = rng.uniform(0.4, 0.7)
    put('twig', C.cone((x, y, 0.035), 0.03, 0.022, L, seg=6, rot=Euler((0, math.radians(90), a))), M('#7a5532'), outline=0.008)


def slabs(cfg, rng):
    """폐허 — 깨진 포석 줄(발 자리는 반쯤 빈 칸이 많게)"""
    sw, sh = 1.25, 0.95
    for iy in range(-10, 11):
        for ix in range(-5, 6):
            off = (sw / 2) if iy % 2 else 0
            x, y = ix * sw + off + rng.uniform(-0.03, 0.03), iy * sh
            u, v = x / W + 0.5, 0.5 - y / DEPTH
            keep = 0.3 if calm(u, v) else 0.5
            if rng.random() > keep:
                continue
            k = rng.uniform(0.62, 0.92)
            bm = C.box((x + rng.uniform(-0.06, 0.06), y + rng.uniform(-0.05, 0.05), 0.015), ((sw - 0.09) * k, (sh - 0.09) * k, 0.03), bevel=0.02, rot=Euler((0, 0, rng.uniform(-0.12, 0.12))))
            put('slab', bm, M(cfg['slab'][rng.randrange(2)]), outline=0.006)


def crack(x, y, rng, n=5, col='#3b2415', emit=None, strength=0.0, w=0.035):
    a = rng.uniform(0, math.tau)
    for k in range(n):
        a += rng.uniform(-0.9, 0.9)
        L = rng.uniform(0.18, 0.34)
        cx, cy = x + math.cos(a) * L / 2, y + math.sin(a) * L / 2
        put('crack', C.box((cx, cy, 0.006), (L, w, 0.006), rot=Euler((0, 0, a))), M(col, emit, strength))
        x, y = x + math.cos(a) * L, y + math.sin(a) * L


def column(x, y, rng, cfg):
    h = rng.uniform(0.35, 0.65)
    put('col', C.cone((x, y, h / 2), 0.3, 0.27, h, seg=10), M(cfg['slab'][0]), outline=0.014)
    put('colcap', C.box((x, y, h + 0.04), (0.72, 0.72, 0.08), bevel=0.02), M(cfg['slab'][1]), outline=0.012)


def crystal(x, y, cfg, rng, s=1.0):
    col = cfg['crystal'][rng.randrange(2)]
    for k in range(rng.randint(2, 4)):
        h = rng.uniform(0.3, 0.6) * s
        tilt = Euler((rng.uniform(-0.4, 0.4), rng.uniform(-0.4, 0.4), rng.uniform(0, 1)))
        put('cry', C.cone((x + rng.uniform(-0.08, 0.08), y + rng.uniform(-0.05, 0.05), h / 2), 0.09 * s, 0.0, h, seg=5, rot=tilt),
            M(col, emit=col, strength=0.55), outline=0.01)


def lava_pool(x, y, cfg, rng, r=0.45):
    put('pool_rim', C.ellipsoid((x, y, 0.01), (r * 1.18, r * 0.7, 0.012), seg=16, rings=5), M('#3e2d28'), outline=0.01)
    put('pool', C.ellipsoid((x, y, 0.02), (r, r * 0.56, 0.01), seg=16, rings=5), M(cfg['lava'][0], emit=cfg['lava'][0], strength=1.2))
    put('pool_hi', C.ellipsoid((x - r * 0.2, y + r * 0.05, 0.028), (r * 0.4, r * 0.18, 0.006), seg=12, rings=4), M(cfg['lava'][1], emit=cfg['lava'][1], strength=1.4))


def scatter(fn, n, rng, vmin, vmax, umin=-0.04, umax=1.04, avoid_calm=True, tries=60):
    placed = 0
    for _ in range(n * tries):
        if placed >= n:
            break
        u, v = rng.uniform(umin, umax), rng.uniform(vmin, vmax)
        if avoid_calm and calm(u, v):
            continue
        fn(u2x(u), v2y(v))
        placed += 1


def build(area):
    cfg = AREAS[area]
    rng = random.Random(sum(ord(c) * (i + 1) for i, c in enumerate(area)))   # hash() 는 실행마다 바뀐다
    ground(cfg, rng)
    # 뒤 가장자리(위 0~14%) — 촘촘히: 이음선이 풀숲 · 돌무더기로 보이게
    edge_tuft = {'meadow': 34, 'forest': 30, 'ruins': 14, 'volcano': 0, 'abyss': 6}[area]
    scatter(lambda x, y: tuft(x, y, cfg, rng, 1.25), edge_tuft, rng, -0.01, 0.08, avoid_calm=False)
    scatter(lambda x, y: rock(x, y, cfg, rng), {'meadow': 4, 'forest': 4, 'ruins': 6, 'volcano': 9, 'abyss': 7}[area], rng, 0.0, 0.13, avoid_calm=False)
    scatter(lambda x, y: pebble(x, y, cfg, rng), 18, rng, 0.0, 0.16, avoid_calm=False)
    if cfg.get('bush'):
        scatter(lambda x, y: bush(x, y, cfg, rng, rng.uniform(0.8, 1.15)), 7, rng, -0.02, 0.07, avoid_calm=False)
        for side in ((-0.04, 0.12), (0.88, 1.04)):
            scatter(lambda x, y: bush(x, y, cfg, rng, 0.85), 1, rng, 0.72, 0.9, side[0], side[1], avoid_calm=False)
    # 양옆 · 아래 모서리
    for side in ((-0.04, 0.16), (0.84, 1.04)):
        scatter(lambda x, y: tuft(x, y, cfg, rng), 6 if area in ('meadow', 'forest') else 2, rng, 0.62, 0.95, side[0], side[1], avoid_calm=False)
        scatter(lambda x, y: rock(x, y, cfg, rng, rng.uniform(0.16, 0.3)), 2, rng, 0.66, 0.92, side[0], side[1], avoid_calm=False)
    # 발 자리 — 잔돌 몇 개만(작고 외곽선 가늘게)
    scatter(lambda x, y: pebble(x, y, cfg, rng, rng.uniform(0.03, 0.06), outline=0.005), 10, rng, 0.2, 0.7, avoid_calm=False)
    scatter(lambda x, y: tuft(x, y, cfg, rng, 0.7), 8 if area in ('meadow', 'forest') else 3, rng, 0.15, 0.9)

    if area == 'meadow':
        scatter(lambda x, y: flower(x, y, cfg, rng), 26, rng, 0.0, 0.2, avoid_calm=False)
        scatter(lambda x, y: flower(x, y, cfg, rng), 14, rng, 0.6, 0.95)
    elif area == 'forest':
        scatter(lambda x, y: mushroom(x, y, rng, rng.uniform(0.8, 1.2)), 5, rng, 0.0, 0.14, avoid_calm=False)
        scatter(lambda x, y: mushroom(x, y, rng, 0.8), 3, rng, 0.66, 0.95)
        scatter(lambda x, y: leaf(x, y, cfg, rng), 40, rng, 0.0, 1.0, avoid_calm=False)
        scatter(lambda x, y: twig(x, y, rng), 6, rng, 0.04, 0.95)
    elif area == 'ruins':
        slabs(cfg, rng)
        for u, v in ((0.04, 0.05), (0.95, 0.07), (0.02, 0.86), (0.97, 0.83)):
            column(u2x(u), v2y(v), rng, cfg)
        scatter(lambda x, y: crack(x, y, rng, n=4), 9, rng, 0.0, 1.0, avoid_calm=False)
        scatter(lambda x, y: pebble(x, y, cfg, rng, rng.uniform(0.07, 0.13)), 14, rng, 0.0, 1.0)
    elif area == 'volcano':
        scatter(lambda x, y: crack(x, y, rng, n=6, col=cfg['lava'][0], emit=cfg['lava'][0], strength=1.1, w=0.045), 7, rng, 0.0, 1.0)
        scatter(lambda x, y: crack(x, y, rng, n=4, w=0.03), 8, rng, 0.0, 1.0, avoid_calm=False)
        lava_pool(u2x(0.1), v2y(0.06), cfg, rng, 0.55)
        lava_pool(u2x(0.88), v2y(0.1), cfg, rng, 0.42)
        lava_pool(u2x(0.94), v2y(0.88), cfg, rng, 0.38)
    elif area == 'abyss':
        scatter(lambda x, y: crystal(x, y, cfg, rng, rng.uniform(0.9, 1.3)), 7, rng, 0.0, 0.13, avoid_calm=False)
        scatter(lambda x, y: crystal(x, y, cfg, rng, 0.8), 4, rng, 0.66, 0.95)
        scatter(lambda x, y: crack(x, y, rng, n=5, col='#b48cff', emit='#b48cff', strength=0.5, w=0.025), 5, rng, 0.0, 1.0)


def render(area):
    C.reset()
    _mats.clear()
    C.setup_render(res=RES, samples=24, film_transparent=False)
    C.lights()
    C.ortho_camera((0.0, 0.0), max(W, VEXT), elev_deg=ELEV, dist=14)   # ortho_scale 은 긴 변(세로) 기준
    build(area)
    if TOON.enabled():
        TOON.apply(bpy.context.scene)
    os.makedirs(OUTDIR, exist_ok=True)
    bpy.context.scene.render.filepath = os.path.join(OUTDIR, f'{area}.png')
    bpy.ops.render.render(write_still=True)
    print('DONE', area)


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    what = argv[0] if argv else 'meadow'
    for a in (AREAS if what == 'all' else [what]):
        render(a)


main()
