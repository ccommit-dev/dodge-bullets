"""무기·스킬 이펙트 스프라이트 (2026-10-16, 사용자: "스킬, 무기 이펙트 잘되게 리소스 다시 생성 — mascot-3d-film 써서").
blender -b -P art-gen/blender/fx.py -- [name …]   → art-gen/out/b3d-fx/<name>/f<i>.png (512², 6칸)
3D 발광 메시(빛나는 리본 · 고리 · 파편 · 원소 입자)를 직교 카메라로 렌더 — 캐릭터와 같은 잉크 테두리를 얇게 둘러 그림체를 맞춘다.
  slash-<fx>  무기 베기 호(초승달 리본 + 흰 심 + 반짝이) — default · crimson · glacier · solar · season (WEAPON_FX 와 같은 이름)
  impact-<el> 명중 폭발(충격 고리 + 별 파편 + 원소 입자) — blade · fire · wind · earth · light · crit · warcry
"""
import bpy
import bmesh
import sys
import os
import math
import random
from mathutils import Vector, Euler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import bcommon as C

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
N = 6
RES = 512

SLASH = {
    'default': ('#ffe08a', '#ffb02e'),
    'crimson': ('#ff8a9a', '#e11d48'),
    'glacier': ('#bff0ff', '#38bdf8'),
    'solar': ('#fff3a8', '#f59e0b'),
    'season': ('#f0c8ff', '#a855f7'),
}
IMPACT = {
    'blade': ('#ffffff', '#cbd5e1', 'shards'),
    'fire': ('#ffe08a', '#ff5a1f', 'flames'),
    'wind': ('#d6fff4', '#14b8a6', 'swirl'),
    'earth': ('#fde68a', '#b45309', 'rocks'),
    'light': ('#fffbe0', '#facc15', 'rays'),
    'crit': ('#ffe4ea', '#e11d48', 'shards'),
    'warcry': ('#fff1d6', '#f97316', 'stars'),
    # 성문 방어(캔버스) 원소 — 2026-10-16 2차: 물·얼음·번개·독·그림자 (불·흙·바람·빛은 위와 같은 그림)
    'water': ('#e0f7ff', '#3b9eff', 'drops'),
    'ice': ('#f0fdff', '#67e8f9', 'icicles'),
    'bolt': ('#fffbd0', '#facc15', 'zigzag'),
    'poison': ('#ecfccb', '#84cc16', 'bubbles'),
    'shadow': ('#ede9fe', '#7c3aed', 'shards'),
}


def emit_mat(name, color, strength=3.0, alpha=1.0):
    m, fresh = C.new_mat(f'fx_{name}_{color}_{strength}_{alpha}')
    if not fresh:
        return m
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = C.srgb(color)
    em.inputs['Strength'].default_value = strength
    attr = nt.nodes.new('ShaderNodeAttribute')
    attr.attribute_name = 'fade'
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = alpha
    nt.links.new(attr.outputs['Fac'], mul.inputs[0])
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(mul.outputs[0], mix.inputs['Fac'])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    m.blend_method = 'BLEND' if hasattr(m, 'blend_method') else None
    return m


def ink_mat():
    return emit_mat('ink', C.INK, 1.0, 1.0)


def obj_from(name, verts, faces, fades, mat):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    a = me.attributes.new('fade', 'FLOAT', 'POINT')
    for i, f in enumerate(fades):
        a.data[i].value = f
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(mat)
    return o


def ribbon(name, a0, a1, r_in, r_out, mat, n=64, y=0.0, taper=True, fade_tail=True, outline=0.0):
    """XZ 평면의 초승달 리본 — a0→a1(라디안), 머리(a1) 쪽이 굵고 꼬리 쪽이 가늘며 사라진다"""
    verts, faces, fades = [], [], []
    for i in range(n + 1):
        t = i / n
        a = a0 + (a1 - a0) * t
        w = (min(1.0, t * 2.2) * (1.0 if t < 0.82 else max(0.25, (1 - t) / 0.18))) if taper else 1.0   # 꼬리에서 굵어져 머리 끝만 살짝 가늘게
        w = max(0.0, w) ** 0.8
        rm = (r_in + r_out) / 2
        hw = (r_out - r_in) / 2 * w + outline
        for rr in (rm - hw, rm + hw):
            verts.append((rr * math.cos(a), y, rr * math.sin(a)))
            fades.append((t ** 0.35) if fade_tail else 1.0)
    for i in range(n):
        faces.append((2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2))
    return obj_from(name, verts, faces, fades, mat)


def star(name, cx, cz, r, mat, points=4, inner=0.28, rot=0.0, y=0.0, fade=1.0):
    verts = [(cx, y, cz)]
    fades = [fade]
    for k in range(points * 2):
        a = rot + k * math.pi / points
        rr = r if k % 2 == 0 else r * inner
        verts.append((cx + rr * math.cos(a), y, cz + rr * math.sin(a)))
        fades.append(fade)
    faces = [(0, 1 + k, 1 + (k + 1) % (points * 2)) for k in range(points * 2)]
    return obj_from(name, verts, faces, fades, mat)


def disc_ring(name, r_in, r_out, mat, y=0.0, fade=1.0, seg=72):
    verts, faces, fades = [], [], []
    for k in range(seg):
        a = 2 * math.pi * k / seg
        verts += [(r_in * math.cos(a), y, r_in * math.sin(a)), (r_out * math.cos(a), y, r_out * math.sin(a))]
        fades += [fade, fade]
    for k in range(seg):
        j = (k + 1) % seg
        faces.append((2 * k, 2 * k + 1, 2 * j + 1, 2 * j))
    return obj_from(name, verts, faces, fades, mat)


def blob(name, cx, cz, r, mat, y=0.0, fade=1.0, seg=20, wob=0.0, rnd=None):
    verts = [(cx, y, cz)]
    fades = [fade]
    for k in range(seg):
        a = 2 * math.pi * k / seg
        rr = r * (1 + (rnd.uniform(-wob, wob) if rnd else 0))
        verts.append((cx + rr * math.cos(a), y, cz + rr * math.sin(a)))
        fades.append(fade)
    faces = [(0, 1 + k, 1 + (k + 1) % seg) for k in range(seg)]
    return obj_from(name, verts, faces, fades, mat)


def flame(name, cx, cz, h, w, ang, mat, y=0.0, fade=1.0):
    """물방울/불꽃 모양 — 바닥이 둥글고 끝이 뾰족(ang 방향)"""
    verts = [(cx, y, cz)]
    fades = [fade]
    n = 24
    for k in range(n):
        t = 2 * math.pi * k / n
        # 물방울: 끝(θ=0)이 뾰족하고 바닥(θ=π)이 둥글다
        px = w * math.sin(t) * math.sin(t / 2)
        pz = h * 0.5 * math.cos(t)
        ca, sa = math.cos(ang), math.sin(ang)
        verts.append((cx + px * ca - pz * sa, y, cz + px * sa + pz * ca))
        fades.append(fade)
    faces = [(0, 1 + k, 1 + (k + 1) % n) for k in range(n)]
    return obj_from(name, verts, faces, fades, mat)


def clear_objs():
    for o in list(bpy.data.objects):
        if o.type == 'MESH':
            bpy.data.objects.remove(o, do_unlink=True)


def ease_out(t, p=2):
    return 1 - (1 - t) ** p


def build_slash(fx, i):
    core, glow = SLASH[fx]
    t = (i + 1) / N
    head = -1.25 + 2.9 * ease_out(min(1, t * 1.35))   # 넓게 휘두르는 호(예전 2.3 rad 은 짧은 초승달이었다)
    tail = -1.25 + 2.9 * ease_out(max(0, t * 1.35 - 0.55))
    fade = 1.0 if t < 0.7 else max(0.0, 1 - (t - 0.7) / 0.32)
    R = 0.8
    ribbon('ink', tail, head, R - 0.33, R + 0.05, ink_mat(), y=0.02, outline=0.014)
    ribbon('glow', tail, head, R - 0.32, R + 0.04, emit_mat('glow', glow, 2.4, 0.9 * fade), y=0.01)
    ribbon('core', tail + (head - tail) * 0.2, head, R - 0.12, R + 0.01, emit_mat('core', core, 4.5, fade), y=0.0)
    # 끝을 따라가는 반짝이
    rnd = random.Random(7 + i)
    for k in range(5):
        a = head - rnd.uniform(0.0, 0.9) * (head - tail)
        rr = R + rnd.uniform(-0.12, 0.12)
        s = rnd.uniform(0.04, 0.08) * fade
        if s > 0.01:
            star(f'sp{k}', rr * math.cos(a), rr * math.sin(a), s, emit_mat('spk', core, 5.0, fade), rot=rnd.uniform(0, 1), y=-0.01)


def build_impact(el, i):
    core, glow, kind = IMPACT[el]
    t = (i + 1) / N
    fade = 1.0 if t < 0.5 else max(0.0, 1 - (t - 0.5) / 0.55)
    rnd = random.Random(sum(map(ord, el)))
    # 번쩍 — 첫 두 칸 가운데 별
    if i < 3:
        s = [0.42, 0.5, 0.3][i]
        star('flashink', 0, 0, s + 0.03, ink_mat(), points=4, inner=0.22, rot=0.3, y=0.02)
        star('flash', 0, 0, s, emit_mat('flash', core, 5.0, 1.0), points=4, inner=0.22, rot=0.3, y=0.0)
        star('flash2', 0, 0, s * 0.6, emit_mat('flash2', glow, 3.0, 0.9), points=4, inner=0.3, rot=0.3 + math.pi / 4, y=-0.01)
    # 충격 고리
    r = 0.18 + 0.72 * ease_out(t)
    w = 0.09 * (1 - t) + 0.015
    disc_ring('ringink', r - w - 0.012, r + w + 0.012, ink_mat(), y=0.03, fade=1.0 if fade > 0.15 else fade * 6)
    disc_ring('ring', r - w, r + w, emit_mat('ring', glow, 3.0, fade), y=0.02)
    disc_ring('ring2', r - w * 0.35, r + w * 0.35, emit_mat('ring2', core, 4.0, fade), y=0.01)
    # 원소 입자
    count = 8
    for k in range(count):
        a = 2 * math.pi * k / count + rnd.uniform(-0.2, 0.2)
        d = (0.25 + 0.55 * ease_out(t)) * rnd.uniform(0.8, 1.15)
        x, z = d * math.cos(a), d * math.sin(a)
        if kind in ('shards', 'stars'):
            s = (0.2 if kind == 'shards' else 0.16) * (1 - t * 0.5)
            pts = 4 if kind == 'shards' else 5
            star(f'p{k}i', x, z, s + 0.02, ink_mat(), points=pts, inner=0.3 if kind == 'stars' else 0.2, rot=a, y=0.0, fade=fade)
            star(f'p{k}', x, z, s, emit_mat('p', core if k % 2 else glow, 4.0, fade), points=pts, inner=0.3 if kind == 'stars' else 0.2, rot=a, y=-0.01, fade=fade)
        elif kind == 'flames':
            h = 0.36 * (1 - t * 0.45)
            flame(f'p{k}i', x, z, h + 0.04, 0.13 + 0.02, a - math.pi / 2, ink_mat(), y=0.0, fade=fade)
            flame(f'p{k}', x, z, h, 0.13, a - math.pi / 2, emit_mat('p', glow, 3.5, fade), y=-0.01, fade=fade)
            flame(f'p{k}c', x, z, h * 0.55, 0.065, a - math.pi / 2, emit_mat('pc', core, 5.0, fade), y=-0.02, fade=fade)
        elif kind == 'swirl':
            a0 = a + t * 1.6
            ribbon(f'p{k}i', a0, a0 + 0.9, d * 0.82 - 0.016, d * 0.82 + 0.09, ink_mat(), n=20, y=0.0, fade_tail=False)
            ribbon(f'p{k}', a0, a0 + 0.9, d * 0.82, d * 0.82 + 0.075, emit_mat('p', glow, 3.5, fade), n=20, y=-0.01)
        elif kind == 'rocks':
            s = 0.15 * (1 - t * 0.35)
            blob(f'p{k}i', x, z - t * t * 0.25, s + 0.018, ink_mat(), y=0.0, seg=7, wob=0.25, rnd=random.Random(k))
            blob(f'p{k}', x, z - t * t * 0.25, s, emit_mat(f'rock{k % 2}', '#c2410c' if k % 2 else '#a16207', 1.3, fade), y=-0.01, seg=7, wob=0.25, rnd=random.Random(k))
        elif kind == 'drops':   # 물방울 — 바깥으로 튀며 떨어진다
            h = 0.3 * (1 - t * 0.4)
            flame(f'p{k}i', x, z - t * t * 0.2, h + 0.04, 0.12 + 0.02, a - math.pi / 2, ink_mat(), y=0.0, fade=fade)
            flame(f'p{k}', x, z - t * t * 0.2, h, 0.12, a - math.pi / 2, emit_mat('p', glow, 3.0, fade), y=-0.01, fade=fade)
            blob(f'p{k}h', x - 0.02, z - t * t * 0.2 + 0.03, 0.025, emit_mat('ph', core, 5.0, fade), y=-0.02, seg=10)
        elif kind == 'icicles':   # 고드름 — 길쭉한 수정
            s2 = 0.26 * (1 - t * 0.4)
            star(f'p{k}i', x, z, s2 + 0.03, ink_mat(), points=2, inner=0.22, rot=a, y=0.0, fade=fade)
            star(f'p{k}', x, z, s2, emit_mat('p', glow, 3.5, fade), points=2, inner=0.22, rot=a, y=-0.01, fade=fade)
            star(f'p{k}c', x, z, s2 * 0.55, emit_mat('pc', core, 5.0, fade), points=2, inner=0.18, rot=a, y=-0.02, fade=fade)
        elif kind == 'zigzag':   # 번개 — 꺾인 띠
            pts = [(x * 0.35, z * 0.35)]
            for j in range(1, 4):
                u = j / 3
                off = (0.06 if j % 2 else -0.06)
                pts.append((x * (0.35 + 0.65 * u) - math.sin(a) * off, z * (0.35 + 0.65 * u) + math.cos(a) * off))
            for j in range(len(pts) - 1):
                (x0, z0), (x1, z1) = pts[j], pts[j + 1]
                ang = math.atan2(z1 - z0, x1 - x0); L2 = math.hypot(x1 - x0, z1 - z0)
                for nm, wd, mt, yy in ((f'p{k}_{j}i', 0.045, ink_mat(), 0.0), (f'p{k}_{j}', 0.03, emit_mat('p', glow, 4.0, fade), -0.01), (f'p{k}_{j}c', 0.012, emit_mat('pc', core, 6.0, fade), -0.02)):
                    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
                    ca, sa = math.cos(ang), math.sin(ang)
                    v = [(cx - ca * L2 / 2 - sa * wd, yy, cz - sa * L2 / 2 + ca * wd), (cx + ca * L2 / 2 - sa * wd, yy, cz + sa * L2 / 2 + ca * wd), (cx + ca * L2 / 2 + sa * wd, yy, cz + sa * L2 / 2 - ca * wd), (cx - ca * L2 / 2 + sa * wd, yy, cz - sa * L2 / 2 - ca * wd)]
                    obj_from(nm, v, [(0, 1, 2, 3)], [fade] * 4, mt)
        elif kind == 'bubbles':   # 독 거품 — 동그란 방울이 부풀었다 터진다
            r2 = (0.06 + 0.06 * (k % 3) / 2) * (0.6 + t * 0.8) * (1 if t < 0.8 else 0.4)
            blob(f'p{k}i', x, z + t * 0.15, r2 + 0.02, ink_mat(), y=0.0, seg=18)
            blob(f'p{k}', x, z + t * 0.15, r2, emit_mat('p', glow, 3.0, fade), y=-0.01, seg=18)
            blob(f'p{k}h', x - r2 * 0.35, z + t * 0.15 + r2 * 0.35, r2 * 0.25, emit_mat('ph', core, 5.0, fade), y=-0.02, seg=10)
        elif kind == 'rays':
            L = 0.42 * (1 - t * 0.3)
            ribbon(f'p{k}i', a - 0.07, a + 0.07, d - 0.012, d + L + 0.012, ink_mat(), n=4, y=0.0, taper=False, fade_tail=False)
            ribbon(f'p{k}', a - 0.05, a + 0.05, d, d + L, emit_mat('p', core, 5.0, fade), n=4, y=-0.01, taper=False, fade_tail=False)


def render(name, builder, key):
    out = os.path.join(ROOT, 'art-gen', 'out', 'b3d-fx', name)
    os.makedirs(out, exist_ok=True)
    for i in range(N):
        clear_objs()
        builder(key, i)
        bpy.context.scene.render.filepath = os.path.join(out, f'f{i}.png')
        bpy.ops.render.render(write_still=True)
    print('DONE', name)


C.reset()
C.setup_render(res=(RES, RES), samples=24)
bpy.context.scene.render.film_transparent = True
w = bpy.data.worlds.new('w'); bpy.context.scene.world = w
cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = 2.2
co = bpy.data.objects.new('cam', cam); bpy.context.scene.collection.objects.link(co)
co.location = (0, -5, 0); co.rotation_euler = Euler((math.radians(90), 0, 0))
bpy.context.scene.camera = co

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
names = argv or [f'slash-{k}' for k in SLASH] + [f'impact-{k}' for k in IMPACT]
for nm in names:
    kind, key = nm.split('-', 1)
    render(nm, build_slash if kind == 'slash' else build_impact, key)
