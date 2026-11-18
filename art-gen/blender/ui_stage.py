"""메뉴 화면 배경 · 받침대 (2026-11-18, 사용자 /goal: "이런 느낌의 ui랑 배경 리소스를 변경 — 간단 명료").
참고 그림은 캐릭터를 받침대 위에 크게 세운 '출전 무대'와 등급색 카드 격자였다 — 구조만 따르고 세계는 비버 오두막이다(공상 과학 격납고 아님).
캐릭터와 같은 셀 그림결(lib/toon · 잉크 외곽선 #3b2415)로 그린다.
  ART_STYLE=toon blender -b -P art-gen/blender/ui_stage.py -- pedestal   → art-gen/out/b3d-ui/pedestal.png (투명, 그루터기 받침대)
  ART_STYLE=toon blender -b -P art-gen/blender/ui_stage.py -- lodge      → art-gen/out/b3d-ui/lodge.png    (불투명, 오두막 무대)
  ART_STYLE=toon blender -b -P art-gen/blender/ui_stage.py -- vault      → art-gen/out/b3d-ui/vault.png    (불투명, 보물 선반 — 유물 도감)
조립: node scripts/assemble-ui-stage.mjs → public/ui/stage/*.webp"""
import bpy
import bmesh
import sys
import os
import math
import random
from mathutils import Vector, Euler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import bcommon as C
from lib import toon as TOON

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTDIR = os.environ.get('UI_STAGE_OUT') or os.path.join(ROOT, 'art-gen', 'out', 'b3d-ui')
OUT = 0.02


def mat(name, color, emit=None, strength=0.0):
    return C.principled(name, color, rough=0.8, coat=0.0, emit=emit, emit_strength=strength)


def obj(name, bm, m, outline=OUT, smooth=False, top=None):
    """top: 위를 보는 면의 둘째 재질 — 외곽선(Solidify material_offset)보다 먼저 넣어야 한다.
    나중에 넣으면 껍질 면의 재질 번호가 범위를 넘어 마지막 재질(나무색)로 칠해져 윗면을 덮었다(나이테가 안 보였다)"""
    o = C.mesh_obj(name, bm, m, smooth=smooth, outline=0.0)
    if top is not None:
        two_mat_top(o, top)
    if outline > 0:
        C.add_outline(o, outline)
    return o


def cyl_x(center, r, length, seg=20):
    """X 축으로 누운 원기둥(통나무)"""
    return C.cone(center, r, r, length, seg=seg, rot=Euler((0, math.radians(90), 0)))


def two_mat_top(o, top_mat, thresh=0.9):
    """위를 보는 면에 둘째 재질 — 그루터기 나이테 면 · 상자 뚜껑"""
    o.data.materials.append(top_mat)
    idx = len(o.data.materials) - 1
    for p in o.data.polygons:
        if p.normal.z > thresh:
            p.material_index = idx


def stump(at=(0, 0, 0), r=0.62, h=0.3, rng=None):
    """그루터기 받침대 — 윗면이 무대(z=at.z), 나무껍질 옆면 · 밝은 나이테 · 이끼 몇 줌 · 뿌리"""
    rng = rng or random.Random(7)
    x, y, z = at
    bark = mat('bark', '#8a5530')
    wood = mat('wood_top', '#dfb173')
    ring = mat('ring', '#b97f47')
    moss = mat('moss', '#7fb24a')
    bm = C.cone((x, y, z - h / 2), r * 1.06, r, h, seg=40)
    o = obj('stump', bm, bark, top=wood)
    # 나이테 — 겹친 원판(바깥부터 조금씩 높게): 진한 고리 · 밝은 면이 번갈아
    for i, rr in enumerate((0.52, 0.48, 0.36, 0.32, 0.2, 0.16)):
        obj(f'ring{i}', C.cone((x, y, z + 0.003 + i * 0.003), rr * r / 0.62, rr * r / 0.62, 0.004, seg=48), ring if i % 2 == 0 else wood, outline=0.0)
    # 껍질 골 — 옆면에 세로 홈(어두운 막대)
    groove = mat('groove', '#5e3719')
    for i in range(14):
        a = i / 14 * math.tau + rng.uniform(-0.1, 0.1)
        rr = r * 1.04
        gb = C.box((x + math.cos(a) * rr, y + math.sin(a) * rr, z - h * 0.5), (0.036, 0.036, h * 0.84), rot=Euler((0, 0, a)))
        obj(f'groove{i}', gb, groove, outline=0.0)
    # 뿌리 — 아래로 퍼지는 혹 넷
    for i, a in enumerate((-2.4, -1.0, 0.5, 2.0)):
        rb = C.ellipsoid((x + math.cos(a) * r * 1.02, y + math.sin(a) * r * 1.02, z - h + 0.04), (0.16, 0.09, 0.07), seg=20, rings=12)
        obj(f'root{i}', rb, bark)
    # 이끼 — 윗면 가장자리 앞쪽 왼편에 작은 덩이
    for i in range(3):
        a = math.radians(205 + i * 22)
        mb = C.ellipsoid((x + math.cos(a) * r * 0.9, y + math.sin(a) * r * 0.9, z + 0.012), (0.08, 0.06, 0.025), seg=16, rings=10)
        obj(f'moss{i}', mb, moss, outline=0.0)
    return o


def lantern(at, rope_top):
    x, y, z = at
    rope = mat('rope', '#5e3719')
    glow = mat('lamp', '#ffd27a', emit='#ffc95a', strength=2.2)
    cap = mat('lampcap', '#6b3f1f')
    obj('rope', C.box((x, y, (z + rope_top) / 2), (0.024, 0.024, rope_top - z)), rope, outline=0.0)
    obj('lamp', C.ellipsoid((x, y, z - 0.18), (0.15, 0.15, 0.19), seg=24, rings=14), glow)
    obj('lampcapt', C.cone((x, y, z - 0.02), 0.13, 0.05, 0.08, seg=16), cap)
    obj('lampcapb', C.cone((x, y, z - 0.36), 0.07, 0.11, 0.05, seg=16), cap)


def garland(y, z, x0, x1, n=9):
    cols = ['#e2563b', '#f2b63c', '#5fb35a', '#4a9ad6', '#c46ad6']
    rope = mat('grope', '#5e3719')
    sag = 0.22
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append(Vector((x0 + (x1 - x0) * t, y, z - sag * math.sin(math.pi * t))))
    obj('grope', C.tube(pts, [0.012] * len(pts), seg=6), rope, outline=0.0)
    for i in range(n):
        t = (i + 0.5) / n
        cx = x0 + (x1 - x0) * t
        cz = z - sag * math.sin(math.pi * t)
        bm = bmesh.new()
        a = bm.verts.new((cx - 0.13, y, cz))
        b = bm.verts.new((cx + 0.13, y, cz))
        c = bm.verts.new((cx, y, cz - 0.3))
        bm.faces.new((a, c, b))
        bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.01)
        obj(f'flag{i}', bm, mat(f'flag{i % len(cols)}', cols[i % len(cols)]), outline=0.008)


def barrel(at, r=0.26, h=0.56):
    x, y, z = at
    wood = mat('barrel', '#a86a36')
    hoop = mat('hoop', '#5b4a3a')
    bm = C.cone((x, y, z + h / 2), r, r, h, seg=28)
    # 배 볼록
    for v in bm.verts:
        k = 1 + 0.12 * math.cos((v.co.z - z - h / 2) / h * math.pi)
        v.co.x = x + (v.co.x - x) * k
        v.co.y = y + (v.co.y - y) * k
    o = obj('barrel', bm, wood, top=mat('barreltop', '#c98f55'))
    for i, zz in enumerate((0.14, 0.42)):
        t = C.torus((x, y, z + h * zz / 0.56), r * 1.07, 0.022, seg=36, ring=6)
        obj(f'hoop{i}', t, hoop, outline=0.0)


def crate(at, s=0.42, col='#c08a4e'):
    x, y, z = at
    o = obj('crate', C.box((x, y, z + s / 2), (s, s, s), bevel=0.015), mat('crate' + col, col))
    slat = mat('slat', '#8a5a2e')
    for dz in (-0.3, 0.3):
        obj('slat', C.box((x, y - s / 2 - 0.006, z + s / 2 + dz * s), (s * 0.96, 0.012, 0.06)), slat, outline=0.0)
    return o


def acorn(at, s=1.0):
    x, y, z = at
    obj('acorn', C.ellipsoid((x, y, z + 0.11 * s), (0.1 * s, 0.1 * s, 0.12 * s), egg=0.25, seg=20, rings=12), mat('acornb', '#c8803c'))
    obj('acornc', C.ellipsoid((x, y, z + 0.2 * s), (0.11 * s, 0.11 * s, 0.06 * s), seg=20, rings=10), mat('acornc', '#7a4a26'))


def round_window(at, r=0.42):
    x, y, z = at
    sky = mat('sky', '#9fd6ef', emit='#bfe6f6', strength=0.6)
    frame = mat('wframe', '#6b3f1f')
    d = C.cone((x, y + 0.02, z), r, r, 0.02, seg=40, rot=Euler((math.radians(90), 0, 0)))
    obj('sky', d, sky, outline=0.0)
    obj('wframe', C.torus((x, y - 0.02, z), r, 0.05, seg=40, ring=8, rot=Euler((math.radians(90), 0, 0))), frame)
    obj('wbar1', C.box((x, y - 0.02, z), (2 * r, 0.04, 0.05)), frame, outline=0.0)
    obj('wbar2', C.box((x, y - 0.02, z), (0.05, 0.04, 2 * r)), frame, outline=0.0)
    # 창밖 언덕
    hill = mat('hill', '#8cc46a', emit='#9fd27a', strength=0.4)
    hb = C.ellipsoid((x - 0.1, y + 0.01, z - r * 0.85), (r * 0.9, 0.01, r * 0.45), seg=24, rings=10)
    obj('hill', hb, hill, outline=0.0)


def lodge():
    """오두막 무대 — 통나무 벽 · 널빤지 바닥 · 둥근 창 둘 · 등불 · 깃발 줄 · 가운데 양탄자(받침대 자리)"""
    rng = random.Random(3)
    W = 7.4
    logA, logB = mat('logA', '#a8683a'), mat('logB', '#955b30')
    for i in range(12):
        zc = 0.16 + i * 0.31
        obj(f'log{i}', cyl_x((0, 1.3, zc), 0.165, W), logA if i % 2 == 0 else logB, outline=0.012)
    plankA, plankB = mat('plankA', '#d39a5c'), mat('plankB', '#c48a4f')
    for i in range(12):
        y = 1.1 - i * 0.34
        obj(f'plank{i}', C.box((0, y, -0.03), (W, 0.33, 0.06)), plankA if i % 2 == 0 else plankB, outline=0.006)
    # 바닥 걸레받이 그림자 줄
    obj('skirt', C.box((0, 1.12, 0.05), (W, 0.06, 0.1)), mat('skirt', '#6b3f1f'), outline=0.0)
    round_window((-2.05, 1.13, 1.55))
    round_window((2.05, 1.13, 1.55))
    lantern((-1.0, 0.9, 2.25), 3.1)
    lantern((1.0, 0.9, 2.25), 3.1)
    garland(1.05, 2.75, -3.4, 3.4, n=11)
    # 양탄자 — 받침대가 설 자리(가운데)
    rug = mat('rug', '#b8433a')
    rim = mat('rugrim', '#f2c45a')
    rb = C.cone((0, -0.05, 0.005), 1.25, 1.25, 0.01, seg=56)
    for v in rb.verts:
        v.co.y = -0.05 + (v.co.y + 0.05) * 0.55
    obj('rug', rb, rim, outline=0.0)
    rb2 = C.cone((0, -0.05, 0.012), 1.1, 1.1, 0.01, seg=56)
    for v in rb2.verts:
        v.co.y = -0.05 + (v.co.y + 0.05) * 0.55
    obj('rug2', rb2, rug, outline=0.0)
    # 소품 — 왼쪽 통 둘 · 도토리, 오른쪽 상자 더미 · 도토리
    barrel((-3.0, 0.75, 0.0))
    barrel((-2.45, 0.95, 0.0), r=0.22, h=0.48)
    acorn((-2.6, 0.35, 0.0), 1.1)
    acorn((-2.35, 0.25, 0.0), 0.9)
    crate((2.75, 0.85, 0.0))
    crate((3.15, 0.75, 0.0), s=0.36, col='#b07a42')
    crate((2.95, 0.82, 0.42), s=0.32, col='#cf9a5c')
    acorn((2.45, 0.3, 0.0), 1.0)


def vault():
    """보물 선반 — 유물 도감 바탕. 짙은 나무 벽 · 선반 세 칸 · 빛나는 보석 몇 개 · 아래 바닥"""
    W = 7.4
    wall = mat('vwall', '#6e4426')
    obj('vwall', C.box((0, 1.3, 1.6), (W, 0.1, 3.6)), wall, outline=0.0)
    for i in range(12):
        x = -W / 2 + (i + 0.5) * W / 12
        obj(f'vline{i}', C.box((x, 1.24, 1.6), (0.024, 0.02, 3.6)), mat('vline', '#58361d'), outline=0.0)
    shelf = mat('shelf', '#b07a42')
    gems = [('#ef4444', '#ff7b7b'), ('#3b82f6', '#7fb4ff'), ('#22c55e', '#7ce3a0'), ('#eab308', '#ffe27a'), ('#a855f7', '#d6a6ff')]
    rng = random.Random(5)
    for row, zc in enumerate((0.75, 1.55, 2.35)):
        obj(f'shelf{row}', C.box((0, 1.05, zc), (W - 0.4, 0.44, 0.08)), shelf, outline=0.012)
        for k in range(7):
            x = -2.9 + k * 0.97 + rng.uniform(-0.12, 0.12)
            kind = rng.randrange(4)
            if kind == 0:
                g, e = gems[rng.randrange(len(gems))]
                obj('gem', C.ellipsoid((x, 1.0, zc + 0.16), (0.11, 0.08, 0.13), seg=6, rings=4), mat('gem' + g, g, emit=e, strength=0.6), outline=0.012)
            elif kind == 1:
                crate((x, 1.0, zc + 0.04), s=0.26, col='#c08a4e')
            elif kind == 2:
                barrel((x, 1.0, zc + 0.04), r=0.13, h=0.3)
            else:
                acorn((x, 0.98, zc + 0.04), 1.0)
    plankA, plankB = mat('plankA', '#a8703e'), mat('plankB', '#9a6536')
    for i in range(12):
        y = 1.1 - i * 0.34
        obj(f'plank{i}', C.box((0, y, -0.03), (W, 0.33, 0.06)), plankA if i % 2 == 0 else plankB, outline=0.006)
    lantern((-2.0, 0.8, 3.0), 3.6)
    lantern((2.0, 0.8, 3.0), 3.6)


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    what = argv[0] if argv else 'pedestal'
    C.reset()
    if what == 'pedestal':
        C.setup_render(res=(512, 288), samples=24, film_transparent=True)
        C.lights()
        C.ortho_camera((0.0, -0.14), 1.62, elev_deg=30)
        stump()
    elif what in ('lodge', 'vault'):
        C.setup_render(res=(1024, 560), samples=24, film_transparent=False)
        C.lights()
        C.ortho_camera((0.0, 1.45), 6.6, elev_deg=18, dist=12)
        (lodge if what == 'lodge' else vault)()
    else:
        raise SystemExit(f'unknown {what}')
    if TOON.enabled():
        TOON.apply(bpy.context.scene)
    os.makedirs(OUTDIR, exist_ok=True)
    bpy.context.scene.render.filepath = os.path.join(OUTDIR, f'{what}.png')
    bpy.ops.render.render(write_still=True)
    print('DONE', what)


main()
