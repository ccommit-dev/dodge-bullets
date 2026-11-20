"""칭호 엠블럼 (2026-11-20, 사용자: "칭호 · 유물 아직인 것 모두 수정 반영" — 칭호는 그림 없이 글자 칩뿐이었다).
참고 그림(11-19)의 원칙대로: 굵은 외곽선 · 평면 셀 · 채도 높은 색. 글자는 넣지 않는다(이름은 게임이 글자로 쓴다).
  심연의 개척자  — 짙은 남색 원형 메달 · 금 테 · 하늘색 나침 별(네 갈래) · 아래 리본
  성벽의 정복자  — 보라 방패 · 크림색 성탑(톱니 · 문) · 탑 위 깃발 · 아래 리본
  타이탄 슬레이어 — 금 방패 · 엇갈린 두 칼 · 가운데 뿔 투구 · 아래 리본
  ART_STYLE=toon blender -b -P art-gen/blender/title_emblems.py -- [title-pioneer|title-wall|title-titan]
  → art-gen/out/b3d-titles/<id>.png (512² 투명) → node scripts/assemble-titles.mjs → public/titans/titles/<id>.png"""
import bpy
import sys
import os
import math
from mathutils import Vector, Euler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import bcommon as C
from lib.beaver import spline, interp

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTDIR = os.environ.get('TITLE_OUT') or os.path.join(ROOT, 'art-gen', 'out', 'b3d-titles')
O = 0.026


def m(name, color, rough=0.6, metal=0.0, emit=None, es=0.0):
    return C.principled(f'title_{name}_{color}', color, rough=rough, metal=metal, coat=0.0, emit=emit, emit_strength=es)


def ob(name, bm, mat, outline=O):
    return C.mesh_obj(name, bm, mat, outline=outline)


def prism(name, pts_xz, depth, mat, y=0.0, outline=O):
    """윤곽(x, z) 을 앞뒤로 민 판"""
    import bmesh
    bm = bmesh.new()
    front = [bm.verts.new((x, y - depth / 2, z)) for x, z in pts_xz]
    back = [bm.verts.new((x, y + depth / 2, z)) for x, z in pts_xz]
    bm.faces.new(front[::-1])
    bm.faces.new(back)
    n = len(pts_xz)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((front[i], front[j], back[j], back[i]))
    return ob(name, bm, mat, outline)


def shield_pts(w, top, bottom, n=24):
    """위는 평평하고 옆은 40% 까지 곧다가 아래 한 점으로 모이는 방패 윤곽(시계 방향)"""
    right = []
    for k in range(n + 1):
        t = k / n
        z = top - (top - bottom) * t
        x = w if t < 0.4 else w * math.cos((t - 0.4) / 0.6 * math.pi / 2) ** 0.8
        right.append((x, z))
    left = [(-x, z) for x, z in reversed(right[:-1])]
    return [(-w, top)] + right + left[:-1]


def circle_pts(r, n=48, cz=0.0):
    return [(r * math.cos(2 * math.pi * k / n), cz + r * math.sin(2 * math.pi * k / n)) for k in range(n)]


def star_pts(r_out, r_in, k=4, cz=0.0, rot=0.0):
    pts = []
    for i in range(k * 2):
        a = rot + math.pi / 2 + i * math.pi / k
        r = r_out if i % 2 == 0 else r_in
        pts.append((r * math.cos(a), cz + r * math.sin(a)))
    return pts[::-1]


def ribbon(cz, col, col_dark):
    """아래 리본 — 가운데 띠 + 양 끝 갈라진 꼬리"""
    prism('rib', [(-0.62, cz + 0.09), (0.62, cz + 0.09), (0.66, cz - 0.09), (-0.66, cz - 0.09)], 0.08, m('rib', col), y=-0.12)
    for sx in (-1, 1):
        tail = [(sx * 0.6, cz + 0.06), (sx * 0.92, cz + 0.02), (sx * 0.84, cz - 0.07), (sx * 0.95, cz - 0.17), (sx * 0.62, cz - 0.12)]
        prism(f'ribt{sx}', tail if sx < 0 else tail[::-1], 0.06, m('ribt', col_dark), y=-0.08)


def pioneer():
    gold, navy, sky = m('gold', '#f2c232', rough=0.35, metal=0.4), m('navy', '#1e3a8a'), m('sky', '#7dd3fc', emit='#7dd3fc', es=0.25)
    prism('rim', circle_pts(0.62, cz=0.08), 0.14, gold)
    prism('disc', circle_pts(0.52, cz=0.08), 0.18, navy)
    # 소용돌이 고리(심연) — 원판 위 얇은 호 셋
    for k in range(3):
        a0 = k * 2 * math.pi / 3
        pts = [Vector((0.38 * math.cos(a0 + t * 1.6), -0.1, 0.08 + 0.38 * math.sin(a0 + t * 1.6))) for t in (0, 0.25, 0.5, 0.75, 1)]
        ob(f'sw{k}', C.tube(spline(pts, 12), interp([0.012, 0.03, 0.012], 13), seg=8), m('sw', '#3b82f6'), O * 0.5)
    prism('star', star_pts(0.42, 0.11, 4, cz=0.08), 0.22, sky, y=-0.04)
    prism('star2', star_pts(0.24, 0.07, 4, cz=0.08, rot=math.pi / 4), 0.2, m('star2', '#e0f2fe'), y=-0.07)
    ob('hub', C.ellipsoid(Vector((0, -0.2, 0.08)), (0.07, 0.04, 0.07)), gold, O * 0.6)
    ribbon(-0.52, '#38bdf8', '#0369a1')


def wall():
    purple, cream, stone = m('purple', '#7c3aed'), m('cream', '#f6ecd6'), m('stone', '#c9b8a0')
    prism('sh_rim', shield_pts(0.6, 0.66, -0.62), 0.14, m('rimg', '#f2c232', rough=0.35, metal=0.4))
    prism('sh', shield_pts(0.52, 0.58, -0.52), 0.18, purple)
    # 성탑 — 몸통 · 톱니 넷 · 문(아치)
    prism('tower', [(-0.22, -0.3), (0.22, -0.3), (0.22, 0.22), (-0.22, 0.22)], 0.22, cream, y=-0.05)
    for k in range(4):
        x = -0.22 + 0.04 + k * 0.12
        prism(f'cren{k}', [(x - 0.035, 0.22), (x + 0.035, 0.22), (x + 0.035, 0.3), (x - 0.035, 0.3)], 0.22, cream, y=-0.05)
    door = [(-0.08, -0.3), (0.08, -0.3)] + [(0.08 * math.cos(math.pi * t / 8), -0.12 + 0.08 * math.sin(math.pi * t / 8)) for t in range(0, 9)]
    prism('door', door[:2] + door[2:], 0.24, m('door', '#4c1d95'), y=-0.07)
    for k, (x, z) in enumerate(((-0.1, 0.06), (0.1, 0.06))):
        prism(f'win{k}', [(x - 0.03, z - 0.05), (x + 0.03, z - 0.05), (x + 0.03, z + 0.05), (x - 0.03, z + 0.05)], 0.24, m('door', '#4c1d95'), y=-0.07)
    ob('pole', C.tube([Vector((0, -0.08, 0.3)), Vector((0, -0.08, 0.6))], [0.014, 0.014], seg=8), stone, O * 0.5)
    prism('flag', [(0.0, 0.6), (0.24, 0.53), (0.0, 0.46)], 0.04, m('flag', '#fbbf24'), y=-0.08)
    ribbon(-0.56, '#a78bfa', '#5b21b6')


def titan():
    gold, steel, dark = m('gold', '#f2c232', rough=0.35, metal=0.4), m('steel', '#e2e8f0', rough=0.3, metal=0.5), m('dark', '#3a2418')
    prism('sh_rim', shield_pts(0.6, 0.66, -0.62), 0.14, m('rimd', '#b45309'))
    prism('sh', shield_pts(0.52, 0.58, -0.52), 0.18, gold)
    for sx in (-1, 1):   # 엇갈린 두 칼 — 칼날 · 코등이 · 손잡이 · 끝 구슬
        a = math.radians(sx * 38)
        d = Vector((math.sin(a), 0, math.cos(a)))
        side = Vector((math.cos(a), 0, -math.sin(a)))
        base = Vector((0, -0.16, -0.06)) - d * 0.46
        tip = base + d * 1.12
        blade = [base + d * 0.16 + side * 0.07, tip - d * 0.14 + side * 0.07, tip, tip - d * 0.14 - side * 0.07, base + d * 0.16 - side * 0.07]
        prism(f'blade{sx}', [(p.x, p.z) for p in blade][::-1 if sx > 0 else 1], 0.05, steel, y=-0.16 - 0.01 * sx)
        g0, g1 = base + d * 0.16 + side * 0.15, base + d * 0.16 - side * 0.15
        ob(f'guard{sx}', C.tube([g0 + Vector((0, -0.16, 0)), g1 + Vector((0, -0.16, 0))], [0.03, 0.03], seg=8), gold, O * 0.6)
        ob(f'grip{sx}', C.tube([base + Vector((0, -0.16, 0)), base + d * 0.15 + Vector((0, -0.16, 0))], [0.032, 0.032], seg=8), dark, O * 0.6)
        ob(f'pom{sx}', C.ellipsoid(base + Vector((0, -0.16, 0)) - d * 0.02, (0.045, 0.045, 0.045)), gold, O * 0.6)
    # 가운데 뿔 투구(쓰러뜨린 타이탄)
    ob('helm', C.ellipsoid(Vector((0, -0.26, 0.02)), (0.25, 0.14, 0.22), egg=0.15), m('helm', '#6b6460'), O)
    ob('visor', C.box(Vector((0, -0.4, 0.0)), (0.28, 0.03, 0.06)), dark, O * 0.5)
    for sx in (-1, 1):
        base = Vector((sx * 0.2, -0.3, 0.12))
        pts = spline([base, base + Vector((sx * 0.13, 0, 0.06)), base + Vector((sx * 0.2, 0, 0.22))], 10)
        ob(f'horn{sx}', C.tube(pts, interp([0.06, 0.04, 0.008], len(pts)), seg=10), m('horn', '#f6ead2'), O * 0.7)
        ob(f'eye{sx}', C.ellipsoid(Vector((sx * 0.07, -0.42, 0.0)), (0.03, 0.01, 0.018)), m('eye', '#ff5a3a', emit='#ff5a3a', es=1.5), 0)
    ribbon(-0.56, '#f59e0b', '#92400e')


JOBS = {'title-pioneer': pioneer, 'title-wall': wall, 'title-titan': titan}
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else list(JOBS)
os.makedirs(OUTDIR, exist_ok=True)
for name in argv:
    C.reset()
    C.setup_render(res=(512, 512), samples=24)
    C.lights()
    C.ortho_camera((0.0, 0.0), 2.25, elev_deg=6)
    JOBS[name]()
    if os.environ.get('ART_STYLE', '') == 'toon':
        from lib import toon as TOON
        TOON.apply(bpy.context.scene)
    bpy.context.scene.render.filepath = os.path.join(OUTDIR, f'{name}.png')
    bpy.ops.render.render(write_still=True)
    print('wrote', name, flush=True)
print('DONE')
