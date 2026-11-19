"""비트 수련 표지 16장 (2026-11-19, 리소스 피드백 ⑤ "비트 표지가 반실사 비버 · 도트가 섞여 게임 비버와 다른 동물처럼 보인다").
예전 표지는 SDXL 그림(털 · 코가 사실적인 비버)이었다. 게임 동료 키트(lib/beaver · roster)로 곡마다 동료 하나 · 둘을 세우고
곡 주제 소품(별 · 행성 · 도시 · 벚꽃 · 네온 격자 · 과일 · 디스코 공 · 북 · 마이크 …)과 두 색 그라데이션 배경을 둔다 — 같은 셀 그림결.
'픽셀' 곡 둘(pixel-rush · playful-pixels)은 ART_STYLE=pixel 로 같은 장면을 도트로.
  ART_STYLE=toon blender -b -P art-gen/blender/beat_covers.py -- <id>     → art-gen/out/beat-covers/<id>.png (512², 불투명)
  (pixel 곡은 ART_STYLE=pixel — 112² 로 렌더해 조립이 최근접으로 키운다)
조립: node scripts/assemble-beat-covers.mjs → public/beat/covers/<id>.png (256²) — 같은 파일명이라 코드는 그대로.
한 Blender 에 캐릭터를 여럿 연달아 렌더하면 멈춘 적이 있어(메모: blender-rig-sprites) 표지마다 Blender 를 따로 띄운다."""
import bpy
import sys
import os
import math
import random
from mathutils import Vector, Euler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import bcommon as C
from lib import beaver as BV
from lib import toon as TOON
import roster as R
import anim2 as A2

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTDIR = os.path.join(ROOT, 'art-gen', 'out', 'beat-covers')
PIXEL = os.environ.get('ART_STYLE', '') == 'pixel'
RES = 112 if PIXEL else 512
OUT = 0.012
_mats = {}


def M(color, emit=None, es=0.0, metal=0.0, rough=0.7):
    k = (color, emit, es, metal, rough)
    if k not in _mats:
        _mats[k] = C.principled(f'cv{len(_mats)}', color, rough=rough, metal=metal, coat=0.0, emit=emit, emit_strength=es)
    return _mats[k]


def put(name, bm, m, outline=OUT):
    return C.mesh_obj(name, bm, m, smooth=False, outline=outline)


def backdrop(top, bottom):
    """뒤 판 — 세로 그라데이션(발광 재질이라 셀 계단이 안 걸린다)"""
    mat = bpy.data.materials.new('backdrop')
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    em = nt.nodes.new('ShaderNodeEmission')
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    nt.links.new(sep.outputs['Z'], ramp.inputs['Fac'])
    ramp.color_ramp.elements[0].color = C.srgb(bottom)
    ramp.color_ramp.elements[1].color = C.srgb(top)
    nt.links.new(ramp.outputs['Color'], em.inputs['Color'])
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    C.mesh_obj('backdrop', C.box(Vector((0, 3.0, 0.6)), (14, 0.05, 6)), mat, smooth=False, outline=0.0)


# ── 소품 ──
def stars(rng, n, cols, x=(-1.1, 1.1), z=(0.3, 1.55), y=2.0, s=1.0):
    for i in range(n):
        c = rng.choice(cols)
        r = rng.uniform(0.025, 0.06) * s
        at = Vector((rng.uniform(*x), y, rng.uniform(*z)))
        for k in range(2):   # 네 갈래 반짝임 = 납작한 마름모 둘
            put('star', C.box(at, (r * 2.4, 0.01, r * 0.5), rot=Euler((0, math.radians(90 * k), 0))), M(c, emit=c, es=1.2), 0)


def planet(at, r, col, ring):
    put('planet', C.ellipsoid(Vector(at), (r, r, r), seg=20, rings=12), M(col), OUT * 1.2)
    put('ring', C.torus(Vector(at), r * 1.55, r * 0.09, rot=Euler((math.radians(70), math.radians(-18), 0))), M(ring), OUT * 0.8)


def clouds(rng, spots, col='#ffffff'):
    for (x, z, s) in spots:
        for k in range(3):
            put('cloud', C.ellipsoid(Vector((x + (k - 1) * 0.16 * s, 1.4, z + (0.05 if k == 1 else 0) * s)), (0.17 * s, 0.08, 0.11 * s), seg=12, rings=8), M(col), OUT)


def city(rng, col, win, n=9):
    for i in range(n):
        x = -1.6 + i * 0.4 + rng.uniform(-0.05, 0.05)
        h = rng.uniform(0.5, 1.4)
        put('bld', C.box(Vector((x, 1.6, h / 2 - 0.1)), (0.34, 0.3, h)), M(col), OUT)
        for j in range(int(h / 0.18)):
            for c in (-1, 1):
                if rng.random() < 0.55:
                    put('win', C.box(Vector((x + c * 0.07, 1.44, 0.05 + j * 0.18)), (0.06, 0.01, 0.07)), M(win, emit=win, es=1.4), 0)


def petals(rng, n, cols, x=(-1.1, 1.1), z=(0.0, 1.85)):
    for i in range(n):
        put('petal', C.ellipsoid(Vector((rng.uniform(*x), rng.uniform(0.3, 1.8), rng.uniform(*z))), (0.06, 0.012, 0.035), seg=8, rings=4,
                                 rot=Euler((rng.uniform(0, 3), rng.uniform(0, 3), rng.uniform(0, 3)))), M(rng.choice(cols)), OUT * 0.5)


def neon_grid(col):
    for i in range(-6, 7):
        put('gx', C.box(Vector((i * 0.32, 0.6, -0.08)), (0.02, 4.0, 0.01)), M(col, emit=col, es=2.0), 0)
    for j in range(0, 12):
        put('gy', C.box(Vector((0, -0.8 + j * 0.32, -0.08)), (4.2, 0.02, 0.01)), M(col, emit=col, es=2.0), 0)


def cubes(rng, n, cols, x=(-1.1, 1.1), z=(-0.1, 1.8)):
    for i in range(n):
        s = rng.uniform(0.1, 0.22)
        put('cube', C.box(Vector((rng.uniform(*x), rng.uniform(0.6, 2.0), rng.uniform(*z))), (s, s, s), rot=Euler((0, 0, rng.uniform(0, 0.6)))), M(rng.choice(cols)), OUT)


def disco(at, r=0.32):
    C.FACET = 10
    put('disco', C.ellipsoid(Vector(at), (r, r, r)), M('#d8dde6', metal=0.8, rough=0.2), OUT)
    C.FACET = 0
    put('dstr', C.tube([Vector(at) + Vector((0, 0, r)), Vector(at) + Vector((0, 0, r + 0.6))], 0.012, seg=6), M('#3b2415'), 0)


def strawberry(at, s=1.0):
    p = Vector(at)
    put('sb', C.ellipsoid(p, (0.13 * s, 0.13 * s, 0.16 * s), egg=0.45), M('#e8334a'), OUT)
    put('sbl', C.cone(p + Vector((0, 0, 0.15 * s)), 0.1 * s, 0.0, 0.06 * s, seg=6), M('#4f9a3a'), OUT * 0.6)


def lemon(at, s=1.0, rot=0.0):
    p = Vector(at)
    put('lem', C.cone(p, 0.17 * s, 0.17 * s, 0.05 * s, seg=18, rot=Euler((math.radians(80), 0, rot))), M('#ffd84d'), OUT)
    put('lemw', C.cone(p + Vector((0, -0.03 * s, 0)), 0.13 * s, 0.13 * s, 0.055 * s, seg=18, rot=Euler((math.radians(80), 0, rot))), M('#fff6c8'), 0)


def drum(at, col, s=1.0):
    p = Vector(at)
    put('drum', C.cone(p, 0.26 * s, 0.26 * s, 0.32 * s, seg=18), M(col), OUT)
    put('drumtop', C.cone(p + Vector((0, 0, 0.165 * s)), 0.25 * s, 0.25 * s, 0.01, seg=18), M('#fff6e0'), OUT * 0.6)
    for z in (-0.13, 0.13):
        put('drumrim', C.torus(p + Vector((0, 0, z * s)), 0.262 * s, 0.022 * s), M('#f2c232', metal=0.6, rough=0.3), OUT * 0.5)


def mic(at):
    p = Vector(at)
    put('micst', C.tube([p, p + Vector((0, 0, 0.75))], 0.018, seg=8), M('#3a3a44'), OUT * 0.6)
    put('micb', C.cone(p + Vector((0, 0, 0.01)), 0.14, 0.14, 0.02, seg=12), M('#3a3a44'), OUT * 0.6)
    put('mich', C.ellipsoid(p + Vector((0, 0, 0.8)), (0.06, 0.06, 0.08)), M('#c8ccd4', metal=0.6, rough=0.3), OUT * 0.6)


def notes(rng, n, cols, x=(-1.05, 1.05), z=(0.85, 1.5)):
    for i in range(n):
        c = rng.choice(cols)
        at = Vector((rng.uniform(*x), 0.9, rng.uniform(*z)))
        put('nh', C.ellipsoid(at, (0.06, 0.03, 0.045), rot=Euler((0, math.radians(-25), 0))), M(c), OUT * 0.6)
        put('ns', C.box(at + Vector((0.05, 0, 0.11)), (0.018, 0.018, 0.22)), M(c), OUT * 0.5)


def cabinet(at, col, screen):
    p = Vector(at)
    put('cab', C.box(p + Vector((0, 0, 0.45)), (0.5, 0.4, 0.9)), M(col), OUT)
    put('scr', C.box(p + Vector((0, -0.21, 0.62)), (0.38, 0.01, 0.3)), M(screen, emit=screen, es=1.6), 0)
    for k, bc in enumerate(('#ff4a6a', '#ffd34d', '#4ad8ff')):
        put('btn', C.ellipsoid(p + Vector((-0.12 + k * 0.12, -0.22, 0.38)), (0.035, 0.02, 0.035)), M(bc, emit=bc, es=0.6), OUT * 0.5)


def plasma(at, col):
    p = Vector(at)
    put('pl', C.ellipsoid(p, (0.18, 0.18, 0.18), seg=16, rings=10), M(col, emit=col, es=3.0), 0)
    for k in range(3):
        put('plr', C.torus(p, 0.26 + 0.08 * k, 0.012, rot=Euler((math.radians(60 + 40 * k), math.radians(20 * k), 0))), M(col, emit=col, es=1.5), 0)


def sun(at, r, col):
    put('sun', C.ellipsoid(Vector(at), (r, r * 0.3, r), seg=20, rings=10), M(col, emit=col, es=1.0), OUT)


def moon(at, r):
    put('moon', C.ellipsoid(Vector(at), (r, r * 0.3, r), seg=20, rings=10), M('#fff4c8', emit='#fff4c8', es=0.8), OUT)
    put('moonc', C.ellipsoid(Vector(at) + Vector((r * 0.45, -0.05, r * 0.25)), (r * 0.82, r * 0.3, r * 0.82), seg=20, rings=10), M('#2a2450'), 0)


def floor_disc(col, r=1.2):
    put('floor', C.cone(Vector((0, 0.15, -0.05)), r, r, 0.08, seg=40), M(col), OUT)


# ── 자세 ──
POSES = {
    'idle': {},
    'cheer': dict(arm_r=150.0, arm_r_out=20.0, arm_l=125.0, arm_l_out=30.0, head=8.0, lean=-4.0),
    'wave': dict(arm_r=140.0, arm_r_out=35.0, head=6.0),
    'fight': dict(arm_l=95.0, aim_l=70.0, lean=10.0),
    'point': dict(arm_l=110.0, arm_l_out=10.0, aim_l=80.0, head=4.0),
}


def character(who, over, at, yaw, pose, idx):
    cfg = dict(R.ALLIES[who], **over)
    cfg = A2.swap_hands(cfg)
    rig = BV.build(f'{who}{idx}', cfg)
    P = A2.full(POSES[pose], A2.beaver_base(cfg.get('role', 'melee')), A2.FULL_BEAVER)
    rig.arm.rotation_euler.z = math.radians(yaw)
    BV.pose(rig, P)
    rig.arm.location = Vector(at)
    return rig


# 곡마다 — 배경(위, 아래) · 동료 [(id, 덮을 cfg, (x, y, z), yaw, 자세)] · 소품 함수
COVERS = {
    'andromeda': dict(bg=('#2a1a5e', '#0b0a24'), chars=[('orion', {}, (0.0, 0, 0), 32, 'point')],
                      props=lambda rng: (stars(rng, 26, ('#fff6c8', '#9fe8ff', '#ffb8f0')), planet((-0.72, 1.4, 1.3), 0.24, '#c084fc', '#7fe3ff'), floor_disc('#3a2a7a'))),
    'arcade-overdrive': dict(bg=('#ff4a9a', '#3a0a5a'), chars=[('pipi', {}, (0.25, 0, 0), 32, 'cheer')],
                             props=lambda rng: (cabinet((-0.72, 0.6, -0.05), '#2a2a4a', '#4ad8ff'), stars(rng, 10, ('#4ad8ff', '#ffd34d')), floor_disc('#5a1a7a'))),
    'azure-sky': dict(bg=('#5ac8ff', '#e8f8ff'), chars=[('gale', {}, (0.0, 0, 0), 32, 'cheer')],
                      props=lambda rng: (clouds(rng, [(-0.78, 1.4, 0.95), (0.8, 1.45, 0.8), (0.15, 0.25, 1.3)]), floor_disc('#9ad8ff'))),
    'black-city-beat': dict(bg=('#1a2040', '#0a0a14'), chars=[('ash', {}, (0.15, 0, 0), 32, 'idle')],
                            props=lambda rng: (city(rng, '#2a2f48', '#ffd34d'), drum((-0.62, -0.2, 0.12), '#c8352e', 0.85), floor_disc('#2a2a3a'))),
    'cherry-pop': dict(bg=('#ffb8d8', '#fff0f6'), chars=[('ember', {}, (0.0, 0, 0), 32, 'idle')],
                       props=lambda rng: (petals(rng, 40, ('#ff8fb8', '#ffd0e4', '#ffffff')), strawberry((-0.78, 0.2, 0.05), 0.9), floor_disc('#ff9ac4'))),
    'cybernetic-overload': dict(bg=('#0a3a5a', '#05060f'), chars=[('volt', {}, (0.0, 0, 0), 32, 'fight')],
                                props=lambda rng: (neon_grid('#3ae0ff'), stars(rng, 12, ('#3ae0ff', '#ff4a9a')))),
    'dual-racing': dict(bg=('#ff5a4a', '#4a8aff'), chars=[('pyro', {}, (-0.5, 0, 0), 40, 'fight'), ('kiki', {}, (0.5, 0, 0), -40, 'fight')],
                        props=lambda rng: (floor_disc('#3a3a4a', 1.5),)),
    'duel': dict(bg=('#ffb04a', '#3a2a5a'), chars=[('blaze', {}, (-0.5, 0, 0), 40, 'fight'), ('storm', {}, (0.5, 0, 0), -40, 'fight')],
                 props=lambda rng: (sun((0, 1.4, 1.25), 0.36, '#ffe08a'), floor_disc('#6a4a3a', 1.5))),
    'happy-strum-day': dict(bg=('#8fd8ff', '#c8f0a0'), chars=[('toto', {'weapon_r': 'guitar', 'weapon_color': '#e8a060', 'weapon_l': None, 'role': 'bard'}, (0.0, 0, 0), 32, 'idle')],
                            props=lambda rng: (sun((0.78, 1.4, 1.32), 0.25, '#ffd34d'), clouds(rng, [(-0.75, 1.4, 1.3)]), notes(rng, 5, ('#3b2415', '#e8604a')), floor_disc('#7ac04a'))),
    'one-more-time': dict(bg=('#7a3aff', '#ff4a9a'), chars=[('nana', {}, (0.0, 0, 0), 32, 'cheer')],
                          props=lambda rng: (disco((0.62, 1.2, 1.45), 0.26), stars(rng, 18, ('#ffffff', '#ffd34d')), mic((-0.72, 0.0, -0.05)), floor_disc('#4a1a7a'))),
    'pixel-rush': dict(bg=('#4ad86a', '#2a7aff'), chars=[('kiki', {}, (0.0, 0, 0), 32, 'fight')],
                       props=lambda rng: (cubes(rng, 14, ('#ffd34d', '#ff5a4a', '#4ad8ff', '#ffffff')), floor_disc('#2a5a2a'))),
    'plasma-gun': dict(bg=('#1a0a3a', '#000008'), chars=[('flint', {}, (-0.15, 0, 0), 32, 'point')],
                       props=lambda rng: (plasma((0.72, 0.6, 0.85), '#b48cff'), stars(rng, 14, ('#b48cff', '#7fe3ff')), floor_disc('#2a1a4a'))),
    'playful-pixels': dict(bg=('#ffd84d', '#ff8a4a'), chars=[('momo', {}, (0.0, 0, 0), 32, 'cheer')],
                           props=lambda rng: (cubes(rng, 16, ('#4ad8ff', '#ff4a9a', '#ffffff', '#7ac04a')), floor_disc('#c8602a'))),
    'starlight-strut': dict(bg=('#1a1a4a', '#3a2a6a'), chars=[('celes', {}, (0.0, 0, 0), 32, 'wave')],
                            props=lambda rng: (moon((-0.72, 1.4, 1.32), 0.24), stars(rng, 30, ('#fff6c8', '#ffffff', '#ffd0f0')), floor_disc('#4a3a8a'))),
    'strawberry-lemonade': dict(bg=('#ff8fb0', '#ffe68a'), chars=[('lulu', {}, (0.0, 0, 0), 32, 'cheer')],
                                props=lambda rng: (strawberry((-0.78, 0.3, 0.05)), strawberry((0.8, 0.5, 1.4), 0.8), lemon((-0.78, 1.0, 1.45), 1.0, 0.4), lemon((0.82, 0.1, 0.05), 0.85, -0.3), floor_disc('#ff6a90'))),
    'turkish-march': dict(bg=('#c8352e', '#3a0a0a'), chars=[('haha', {}, (0.2, 0, 0), 32, 'idle')],
                          props=lambda rng: (drum((-0.6, -0.2, 0.12), '#f2c232', 0.9), notes(rng, 6, ('#ffd34d', '#fff6e0')), floor_disc('#5a1a1a'))),
}


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    cid = argv[0]
    spec = COVERS[cid]
    C.reset()
    _mats.clear()
    C.setup_render(res=(RES, RES), samples=24, film_transparent=False)
    if PIXEL:
        bpy.context.scene.cycles.filter_width = 0.01
    if os.environ.get('LAB_CPU'):
        bpy.context.scene.cycles.device = 'CPU'
    C.lights()
    C.ortho_camera((0.0, 0.78), 2.2, elev_deg=6, dist=10)   # 화면 세로 −0.32 ~ 1.88 · 가로 ±1.1 — 캐릭터가 표지 높이의 절반 넘게
    rng = random.Random(sum(ord(c) * (i + 1) for i, c in enumerate(cid)))
    backdrop(*spec['bg'])
    for i, (who, over, at, yaw, pose) in enumerate(spec['chars']):
        character(who, over, at, yaw, pose, i)
    spec['props'](rng)
    if TOON.enabled():
        TOON.apply(bpy.context.scene)
    os.makedirs(OUTDIR, exist_ok=True)
    bpy.context.scene.render.filepath = os.path.join(OUTDIR, f'{cid}.png')
    bpy.ops.render.render(write_still=True)
    print('DONE', cid)


main()
