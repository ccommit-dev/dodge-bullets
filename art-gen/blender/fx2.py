"""전투 이펙트 2판 (2026-10-21, 사용자: "리소스 · 공격 이펙트가 집중도가 떨어지고 매력적이지 않다 — 리소스 에셋 애니메이션 중점").
blender -b -P art-gen/blender/fx2.py -- [name …]   → art-gen/out/b3d-fx/<name>/f<i>.png (512², 6칸) → scripts/assemble-fx.mjs → public/titans/fx/<name>.webp
예전 impact-* 12종은 모두 '퍼지는 고리 + 가운데 별' 한 틀이라 조준선처럼 읽혔다. 2판은 고리를 거의 없애고 '튀는 것'으로 맞았다는 느낌을 준다:
  hit-<el>    평타 작은 불꽃 — 가운데 번쩍 + 오른쪽(공격 방향)으로 튀는 바늘 불티 + 원소 입자 몇 개. 짧고 작다
  burst-<el>  치명 · 스킬 · 시그니처 큰 폭발 — 큰 번쩍 + 얇은 충격파 한 번 + 원소 파편 다수가 튀었다 떨어진다
  debris      맞은 자리 파편 — 테두리 있는 돌 조각이 위로 튀었다 포물선으로 떨어진다(원소 무관)
  proj-<el>   원거리 · 마법 동료 탄 — 오른쪽으로 나는 탄 머리 + 꼬리(반복 6칸): 바람 화살 · 불덩이 · 물방울 구슬 · 돌덩이
원소: fire · water · earth · wind(동료 ALLY_ELEMENT) + blade(주인공 · 탭) · light(스킬 빛)
"""
import bpy
import sys
import os
import math
import random

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fx as F   # 헬퍼(emit_mat · ink_mat · obj_from · ribbon · star · disc_ring · blob · flame · clear_objs · ease_out · render · setup_scene)

N = F.N
EL = {
    # core(가장 밝은 심) · glow(원소 빛) · accent(입자 · 파편)
    'fire': ('#fff4c2', '#ff5a14', '#ffb21f'),
    'water': ('#eefbff', '#2c8dff', '#7dd3fc'),
    'earth': ('#fff3c8', '#e08a16', '#8b5a2b'),
    'wind': ('#effff9', '#10b981', '#67e8c9'),
    'blade': ('#ffffff', '#ffc93d', '#fff1b0'),
    'light': ('#fffbe8', '#facc15', '#fde68a'),
}


def needle(name, x, z, ang, length, width, mat, y=0.0, fade=1.0, back=0.25):
    """가늘고 뾰족한 불티(마름모) — 머리(ang 방향)가 뾰족하고 꼬리가 길다"""
    ca, sa = math.cos(ang), math.sin(ang)
    nx, nz = -sa, ca
    head = (x + ca * length, z + sa * length)
    tail = (x - ca * length * back, z - sa * length * back)
    v = [(head[0], y, head[1]), (x + nx * width, y, z + nz * width), (tail[0], y, tail[1]), (x - nx * width, y, z - nz * width)]
    return F.obj_from(name, v, [(0, 1, 2, 3)], [fade] * 4, mat)


def chunk(name, x, z, r, rot, mat, y=0.0, fade=1.0, seed=0):
    """모난 돌 조각 — 5~6각 불규칙 다각형"""
    rnd = random.Random(seed)
    n = rnd.choice([5, 6])
    verts = [(x, y, z)]
    for k in range(n):
        a = rot + 2 * math.pi * k / n + rnd.uniform(-0.25, 0.25)
        rr = r * rnd.uniform(0.7, 1.15)
        verts.append((x + rr * math.cos(a), y, z + rr * math.sin(a)))
    faces = [(0, 1 + k, 1 + (k + 1) % n) for k in range(n)]
    return F.obj_from(name, verts, faces, [fade] * (n + 1), mat)


def _crescent(name, cx, cz, r, a0, a1, w, mat, y, fade):
    verts, faces, fades = [], [], []
    n = 16
    for i in range(n + 1):
        t = i / n
        a = a0 + (a1 - a0) * t
        hw = w * math.sin(math.pi * t)   # 가운데가 굵고 양끝이 뾰족
        for rr in (r - hw, r + hw):
            verts.append((cx + rr * math.cos(a), y, cz + rr * math.sin(a)))
            fades.append(fade)
    for i in range(n):
        faces.append((2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2))
    return F.obj_from(name, verts, faces, fades, mat)


def particle(el, name, x, z, s, ang, t, fade, glow, core, accent, rnd):
    """원소별 입자 하나 (잉크 테두리 + 빛)"""
    ink = F.ink_mat()
    if el == 'fire':
        F.flame(name + 'i', x, z, s * 2.2 + 0.03, s * 0.9 + 0.02, ang - math.pi / 2, ink, y=0.01, fade=fade)
        F.flame(name, x, z, s * 2.2, s * 0.9, ang - math.pi / 2, F.emit_mat('fp', glow, 3.6, fade), y=0.0, fade=fade)
        F.flame(name + 'c', x, z, s * 1.2, s * 0.45, ang - math.pi / 2, F.emit_mat('fc', core, 5.0, fade), y=-0.01, fade=fade)
    elif el == 'water':
        F.flame(name + 'i', x, z, s * 1.9 + 0.03, s * 0.95 + 0.02, ang + math.pi / 2, ink, y=0.01, fade=fade)
        F.flame(name, x, z, s * 1.9, s * 0.95, ang + math.pi / 2, F.emit_mat('wp', glow, 3.0, fade), y=0.0, fade=fade)
        F.blob(name + 'h', x - s * 0.25, z + s * 0.3, s * 0.28, F.emit_mat('wh', core, 5.0, fade), y=-0.01, seg=10)
    elif el == 'earth':
        chunk(name + 'i', x, z, s * 1.15 + 0.02, ang, ink, y=0.01, fade=fade, seed=hash(name) % 997)
        chunk(name, x, z, s * 1.15, ang, F.emit_mat('ep', accent, 1.6, fade), y=0.0, fade=fade, seed=hash(name) % 997)
        F.star(name + 's', x + s * 0.4, z + s * 0.4, s * 0.45, F.emit_mat('es', core, 4.5, fade), points=4, inner=0.3, rot=ang, y=-0.01, fade=fade)
    elif el == 'wind':
        a0 = ang - 0.9
        _crescent(name + 'i', x - math.cos(ang) * s * 1.5, z - math.sin(ang) * s * 1.5, s * 1.6, a0, a0 + 1.6, s * 0.45 + 0.02, ink, 0.01, fade)
        _crescent(name, x - math.cos(ang) * s * 1.5, z - math.sin(ang) * s * 1.5, s * 1.6, a0, a0 + 1.6, s * 0.45, F.emit_mat('np', glow, 3.6, fade), 0.0, fade)
    elif el == 'blade':
        needle(name + 'i', x, z, ang, s * 2.6 + 0.03, s * 0.42 + 0.02, ink, y=0.01, fade=fade)
        needle(name, x, z, ang, s * 2.6, s * 0.42, F.emit_mat('bp', glow, 4.0, fade), y=0.0, fade=fade)
        needle(name + 'c', x, z, ang, s * 1.8, s * 0.18, F.emit_mat('bc', core, 6.0, fade), y=-0.01, fade=fade)
    else:   # light — 짧은 빛살 + 반짝이
        F.star(name + 'i', x, z, s * 1.4 + 0.025, ink, points=4, inner=0.22, rot=ang, y=0.01, fade=fade)
        F.star(name, x, z, s * 1.4, F.emit_mat('lp', glow, 4.5, fade), points=4, inner=0.22, rot=ang, y=0.0, fade=fade)
        F.star(name + 'c', x, z, s * 0.7, F.emit_mat('lc', core, 6.0, fade), points=4, inner=0.25, rot=ang + 0.78, y=-0.01, fade=fade)


def flash(prefix, s, core, glow, rot=0.3, points=6):
    """가운데 번쩍 — 잉크 테두리 별 + 밝은 심 + 빛 원반"""
    F.star(prefix + 'i', 0, 0, s + 0.035, F.ink_mat(), points=points, inner=0.34, rot=rot, y=0.02)
    F.star(prefix, 0, 0, s, F.emit_mat(prefix + 'g', glow, 4.0, 1.0), points=points, inner=0.34, rot=rot, y=0.01)
    F.blob(prefix + 'c', 0, 0, s * 0.42, F.emit_mat(prefix + 'c', core, 7.0, 1.0), y=0.0, seg=24)


def build_hit(el, i):
    core, glow, accent = EL[el]
    t = (i + 1) / N
    rnd = random.Random(sum(map(ord, 'hit' + el)))
    fade = 1.0 if t < 0.45 else max(0.0, 1 - (t - 0.45) / 0.6)
    # 번쩍은 처음 두 칸만 — 짧고 세게
    if i == 0:
        flash('fl', 0.34, core, glow)
    elif i == 1:
        flash('fl', 0.2, core, glow, rot=0.6, points=4)
    # 바늘 불티 7개 — 공격이 왼쪽에서 오므로 오른쪽(+x)으로 부채꼴(−70°~+70°) + 위로 조금
    for k in range(7):
        ang = rnd.uniform(-1.2, 1.25) + 0.12
        speed = rnd.uniform(0.55, 0.9)
        d = 0.08 + speed * F.ease_out(t, 2)
        x, z = d * math.cos(ang), d * math.sin(ang) - t * t * 0.12
        L = (0.2 + 0.12 * rnd.random()) * (1 - t * 0.7)
        if L > 0.02 and fade > 0.02:
            needle(f'n{k}i', x, z, ang, L + 0.02, 0.026, F.ink_mat(), y=0.01, fade=fade)
            needle(f'n{k}', x, z, ang, L, 0.017, F.emit_mat('nd', core if k % 2 else glow, 5.0, fade), y=0.0, fade=fade)
    # 원소 입자 3~4개
    for k in range(4 if el != 'blade' else 3):
        ang = rnd.uniform(-1.0, 1.1)
        d = 0.12 + 0.45 * F.ease_out(t, 2) * rnd.uniform(0.75, 1.1)
        grav = (0.35 if el in ('earth', 'water') else 0.08) * t * t
        rise = 0.12 * t if el == 'fire' else 0.0
        x, z = d * math.cos(ang), d * math.sin(ang) - grav + rise
        s = 0.07 * (1 - t * 0.45) * rnd.uniform(0.85, 1.2)
        if fade > 0.02:
            particle(el, f'q{k}', x, z, s, ang, t, fade, glow, core, accent, rnd)


def build_burst(el, i):
    core, glow, accent = EL[el]
    t = (i + 1) / N
    rnd = random.Random(sum(map(ord, 'burst' + el)))
    fade = 1.0 if t < 0.55 else max(0.0, 1 - (t - 0.55) / 0.5)
    if i == 0:
        flash('fl', 0.62, core, glow, points=8)
    elif i == 1:
        flash('fl', 0.46, core, glow, rot=0.7, points=8)
    elif i == 2:
        flash('fl', 0.22, core, glow, rot=1.0, points=4)
    # 얇은 충격파 한 번 — 1~3칸만, 빨리 커지며 사라진다(예전처럼 끝까지 남는 굵은 고리가 아니다)
    if 1 <= i <= 3:
        r = 0.3 + 0.62 * F.ease_out((i) / 3, 2)
        w = 0.022 * (1 - (i - 1) / 3) + 0.006
        f2 = (1 - (i - 1) / 3) ** 1.6
        F.disc_ring('swi', r - w - 0.01, r + w + 0.01, F.ink_mat(), y=0.02, fade=f2)
        F.disc_ring('sw', r - w, r + w, F.emit_mat('sw', glow, 3.5, f2), y=0.01)
    # 큰 바늘 불티 12개 — 전 방향, 오른쪽에 더 많이
    for k in range(12):
        ang = rnd.uniform(-1.4, 1.4) if k < 8 else rnd.uniform(1.6, 4.6)
        speed = rnd.uniform(0.65, 1.05)
        d = 0.15 + speed * F.ease_out(t, 2)
        x, z = d * math.cos(ang), d * math.sin(ang) - t * t * 0.18
        L = (0.3 + 0.18 * rnd.random()) * (1 - t * 0.65)
        if L > 0.02 and fade > 0.02:
            needle(f'n{k}i', x, z, ang, L + 0.025, 0.04, F.ink_mat(), y=0.01, fade=fade)
            needle(f'n{k}', x, z, ang, L, 0.027, F.emit_mat('nd', core if k % 3 == 0 else glow, 5.5, fade), y=0.0, fade=fade)
    # 원소 파편 9개 — 튀었다 떨어진다
    for k in range(9):
        ang = 2 * math.pi * k / 9 + rnd.uniform(-0.3, 0.3)
        d = 0.22 + 0.62 * F.ease_out(t, 2) * rnd.uniform(0.8, 1.15)
        grav = (0.5 if el in ('earth', 'water') else 0.2) * t * t
        rise = 0.2 * t if el == 'fire' else 0.0
        x, z = d * math.cos(ang), d * math.sin(ang) - grav + rise
        s = 0.11 * (1 - t * 0.4) * rnd.uniform(0.8, 1.25)
        if fade > 0.02:
            particle(el, f'q{k}', x, z, s, ang, t, fade, glow, core, accent, rnd)


def build_debris(_, i):
    """돌 조각 7개 — 위로 튀어 포물선으로 떨어지며 돈다(원소 무관, 어두운 갈색 · 회색)"""
    t = (i + 1) / N
    rnd = random.Random(4242)
    fade = 1.0 if t < 0.65 else max(0.0, 1 - (t - 0.65) / 0.4)
    for k in range(7):
        vx = rnd.uniform(0.15, 0.85) * (1 if k % 4 else -0.6)
        vz = rnd.uniform(0.55, 1.05)
        x = vx * t * 0.9
        z = vz * t * 0.75 - 1.35 * t * t - 0.1
        s = rnd.uniform(0.06, 0.12)
        col = rnd.choice(['#6b4f3a', '#8a6a4f', '#5b5e66', '#7b7f88'])
        if fade > 0.02:
            chunk(f'd{k}i', x, z, s + 0.018, k + t * 6, F.ink_mat(), y=0.01, fade=fade, seed=k)
            chunk(f'd{k}', x, z, s, k + t * 6, F.emit_mat(f'dc{col}', col, 1.2, fade), y=0.0, fade=fade, seed=k)
            if k % 3 == 0:
                F.blob(f'd{k}h', x - s * 0.3, z + s * 0.3, s * 0.25, F.emit_mat('dh', '#e5d3b3', 2.0, fade), y=-0.01, seg=8)


def build_proj(el, i):
    """오른쪽(+x)으로 나는 탄 — 머리는 x≈0.45, 꼬리는 왼쪽으로 길게. 6칸이 고리로 반복(꼬리 입자 위치만 바뀐다)"""
    core, glow, accent = EL[el]
    rnd = random.Random(i * 31 + len(el))
    hx = 0.42
    ink = F.ink_mat()
    if el == 'wind':   # 바람 화살 — 대 + 촉 + 깃 + 바람 줄
        L = 0.95
        verts = [(hx - L, 0, -0.018), (hx - 0.12, 0, -0.018), (hx - 0.12, 0, 0.018), (hx - L, 0, 0.018)]
        F.obj_from('shafti', [(x, 0.01, z * 2.2) for x, _, z in verts], [(0, 1, 2, 3)], [1] * 4, ink)
        F.obj_from('shaft', verts, [(0, 1, 2, 3)], [1] * 4, F.emit_mat('sh', '#f5e6c8', 2.2, 1.0))
        needle('headi', hx - 0.1, 0, 0, 0.2, 0.085, ink, y=0.01, back=0.2)
        needle('head', hx - 0.1, 0, 0, 0.17, 0.065, F.emit_mat('hd', core, 5.0, 1.0), y=0.0, back=0.2)
        for s2 in (1, -1):
            needle(f'fl{s2}', hx - L + 0.08, s2 * 0.05, math.pi + s2 * 0.5, 0.12, 0.03, F.emit_mat('fl', glow, 3.5, 1.0), y=0.0)
        for k in range(4):
            z = rnd.uniform(-0.16, 0.16)
            x0 = rnd.uniform(-0.75, 0.05)
            _crescent(f'w{k}', x0, z - 0.3, 0.3, math.pi / 2 - 0.5, math.pi / 2 + 0.5, 0.012, F.emit_mat('wl', glow, 3.0, 0.8), 0.0, 0.8)
    elif el == 'blade':   # 칼날 검기 — 볼록한 쪽이 앞(+x)인 초승달 + 뒤로 남는 속도선
        cx = hx - 0.26
        _crescent('bi', cx, 0, 0.3, -1.2, 1.2, 0.075, ink, 0.012, 1.0)
        _crescent('bg', cx, 0, 0.3, -1.15, 1.15, 0.06, F.emit_mat('bg', glow, 3.8, 1.0), 0.006, 1.0)
        _crescent('bc', cx + 0.012, 0, 0.3, -1.05, 1.05, 0.026, F.emit_mat('bc', core, 6.0, 1.0), 0.0, 1.0)
        for k in range(4):
            z = (k - 1.5) * 0.09 + rnd.uniform(-0.02, 0.02)
            needle(f'sp{k}', hx - 0.45 - rnd.uniform(0, 0.25), z, 0.0, rnd.uniform(0.14, 0.24), 0.012, F.emit_mat('sp', accent, 3.2, 0.8), y=-0.004, back=1.2)
    else:
        R = 0.17 if el != 'earth' else 0.15
        # 꼬리 — 머리 뒤로 가늘어지는 혜성 꼬리 + 입자
        verts = [(hx, 0.005, R * 0.9), (hx - 1.0, 0.005, 0.0), (hx, 0.005, -R * 0.9)]
        F.obj_from('tail', verts, [(0, 1, 2)], [1.0, 0.0, 1.0], F.emit_mat('tl', glow, 3.0, 0.85))
        verts2 = [(hx, 0.0, R * 0.45), (hx - 0.6, 0.0, 0.0), (hx, 0.0, -R * 0.45)]
        F.obj_from('tail2', verts2, [(0, 1, 2)], [1.0, 0.0, 1.0], F.emit_mat('tl2', core, 5.0, 0.9))
        for k in range(5):
            x = hx - rnd.uniform(0.25, 0.95)
            z = rnd.uniform(-0.13, 0.13) * (1 - (hx - x))
            s = rnd.uniform(0.025, 0.05)
            if el == 'fire':
                F.flame(f'e{k}', x, z, s * 2.2, s, math.pi / 2, F.emit_mat('ef', accent, 4.0, 0.9), y=-0.005)
            elif el == 'water':
                F.blob(f'e{k}', x, z, s, F.emit_mat('ew', accent, 3.5, 0.85), y=-0.005, seg=10)
            elif el == 'light':
                F.star(f'e{k}', x, z, s * 1.6, F.emit_mat('el', accent, 4.5, 0.9), points=4, y=-0.005)
            else:
                chunk(f'e{k}', x, z, s, k, F.emit_mat('ee', accent, 1.5, 0.9), y=-0.005, seed=k + i)
        # 머리
        if el == 'earth':
            chunk('headi', hx, 0, R + 0.025, i * 0.5, ink, y=0.012, seed=7)
            chunk('head', hx, 0, R, i * 0.5, F.emit_mat('hd', '#9a6a3a', 1.6, 1.0), y=0.006, seed=7)
            F.star('hs', hx + 0.05, 0.05, 0.06, F.emit_mat('hs', core, 4.0, 1.0), points=4, y=0.0)
        else:
            F.blob('headi', hx, 0, R + 0.025, ink, y=0.012, seg=28)
            F.blob('head', hx, 0, R, F.emit_mat('hd', glow, 3.6, 1.0), y=0.006, seg=28)
            F.blob('headc', hx + 0.03, 0.02, R * 0.55, F.emit_mat('hc', core, 6.0, 1.0), y=0.0, seg=24)
            if el == 'light':
                F.star('hs', hx, 0, R * 1.5, F.emit_mat('hs', core, 7.0, 1.0), points=4, y=-0.004)
            if el == 'fire':
                for k in range(5):
                    a = math.pi * 0.55 + k * 0.22 + (i % 2) * 0.1
                    F.flame(f'fh{k}', hx + math.cos(a) * R * 0.9, math.sin(a) * R * 0.9, 0.12, 0.05, a - math.pi / 2, F.emit_mat('fh', accent, 4.2, 1.0), y=0.008)


BUILDERS = {'hit': build_hit, 'burst': build_burst, 'debris': build_debris, 'proj': build_proj}

if __name__ == "__main__":
    F.setup_scene(samples=int(os.environ.get("FX_SAMPLES", "16")))
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    names = argv or ([f"hit-{e}" for e in EL] + [f"burst-{e}" for e in EL] + ["debris-rock"] + [f"proj-{e}" for e in ('fire', 'water', 'earth', 'wind')])
    for nm in names:
        kind, key = nm.split("-", 1)
        F.render(nm, BUILDERS[kind], key)
