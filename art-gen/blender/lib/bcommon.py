"""게임 스프라이트용 Blender 공통 (2026-10-16, mascot-3d-film 스킬의 common·moko 에서 가져와 Windows·스프라이트에 맞춤).

- 렌더: Cycles GPU(OPTIX → CUDA 순), 투명 배경, 직교 카메라. 칸 하나를 한 장씩 렌더한다(영상 아님).
- 외곽선: 인버티드 헐(Solidify, 법선 뒤집기) — 잉크색 #3b2415(게임 UI --flat-ink)로 모든 캐릭터·파츠 통일.
- 단위: 캐릭터 단위(발 z=0, 머리 꼭대기 z≈1, 정면 -Y).
"""
import bpy
import bmesh
import math
from mathutils import Vector, Matrix, Euler

INK = '#3b2415'


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'


def setup_render(res=(512, 512), samples=40, film_transparent=True):
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    s.render.resolution_x, s.render.resolution_y = res
    s.render.resolution_percentage = 100
    s.render.film_transparent = film_transparent
    prefs = bpy.context.preferences.addons['cycles'].preferences
    used = []
    for kind in ('OPTIX', 'CUDA'):
        try:
            prefs.compute_device_type = kind
            prefs.get_devices()
            gpus = [d for d in prefs.devices if d.type == kind]
            if gpus:
                for d in prefs.devices:
                    d.use = (d.type == kind)
                used = [d.name for d in gpus]
                break
        except Exception:
            continue
    c = s.cycles
    c.device = 'GPU' if used else 'CPU'
    c.samples = samples
    c.use_adaptive_sampling = True
    c.adaptive_threshold = 0.02
    c.use_denoising = True
    c.denoiser = 'OPENIMAGEDENOISE'
    c.max_bounces = 6
    c.diffuse_bounces = 2
    c.glossy_bounces = 2
    c.transmission_bounces = 4
    c.transparent_max_bounces = 16
    c.caustics_reflective = False
    c.caustics_refractive = False
    c.sample_clamp_indirect = 6.0
    s.render.use_motion_blur = False
    s.view_settings.view_transform = 'Standard'   # 게임 원화처럼 선명한 색 (AgX 는 채도가 빠진다)
    s.view_settings.look = 'None'
    s.render.image_settings.file_format = 'PNG'
    s.render.image_settings.color_mode = 'RGBA'
    s.render.image_settings.color_depth = '8'
    s.render.dither_intensity = 1.0
    s.render.film_transparent = film_transparent
    return used


def srgb(hexstr, a=1.0):
    h = hexstr.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, a)


def new_mat(name):
    m = bpy.data.materials.get(name)
    if m is not None:
        return m, False
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    return m, True


def principled(name, color, rough=0.45, metal=0.0, sss=0.0, coat=0.25, sheen=0.0, emit=None, emit_strength=0.0):
    m, fresh = new_mat(name)
    if not fresh:
        return m
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = srgb(color) if isinstance(color, str) else color
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if sss:
        b.inputs['Subsurface Weight'].default_value = sss
        b.inputs['Subsurface Radius'].default_value = (1.0, 0.5, 0.35)
        b.inputs['Subsurface Scale'].default_value = 0.04
    b.inputs['Coat Weight'].default_value = coat
    if sheen:
        b.inputs['Sheen Weight'].default_value = sheen
    if emit:
        b.inputs['Emission Color'].default_value = srgb(emit)
        b.inputs['Emission Strength'].default_value = emit_strength
    return m


def mat_outline():
    m, fresh = new_mat('ink_outline')
    if not fresh:
        return m
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    lp = nt.nodes.new('ShaderNodeLightPath')
    inv = nt.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0
    nt.links.new(lp.outputs['Is Camera Ray'], inv.inputs[1])
    mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'MAXIMUM'
    nt.links.new(geo.outputs['Backfacing'], mx.inputs[0])
    nt.links.new(inv.outputs[0], mx.inputs[1])
    em = nt.nodes.new('ShaderNodeEmission')   # 스프라이트는 조명과 상관없이 같은 잉크색이어야 한다
    em.inputs['Color'].default_value = srgb(INK)
    em.inputs['Strength'].default_value = 1.0
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(mx.outputs[0], mix.inputs['Fac'])
    nt.links.new(em.outputs[0], mix.inputs[1])
    nt.links.new(tr.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    return m


def add_outline(obj, thickness):
    obj.data.materials.append(mat_outline())
    m = obj.modifiers.new('outline', 'SOLIDIFY')
    m.thickness = thickness
    m.offset = 1.0
    m.use_flip_normals = True
    m.use_even_offset = False
    m.use_quality_normals = True
    m.material_offset = len(obj.data.materials) - 1
    m.use_rim = False
    return m


def collection(name):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(c)
    return c


def mesh_obj(name, bm, mat=None, coll=None, smooth=True, outline=0.0):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    o = bpy.data.objects.new(name, me)
    (coll or bpy.context.scene.collection).objects.link(o)
    if mat is not None:
        o.data.materials.append(mat)
    if outline > 0:
        add_outline(o, outline)
    return o


def ellipsoid(center, radii, egg=0.0, seg=48, rings=32, rot=None):
    """타원체 bmesh — egg>0 이면 아래가 넓다. rot: Euler 라디안(중심 기준)"""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0)
    R = rot.to_matrix() if rot is not None else None
    for v in bm.verts:
        X, Y, Z = v.co
        w = 1.0 - egg * Z
        p = Vector((radii[0] * X * w, radii[1] * Y * w, radii[2] * Z))
        if R is not None:
            p = R @ p
        v.co = Vector(center) + p
    return bm


def _frames_along(pts):
    out = []
    n = len(pts)
    prev_nrm = None
    for i in range(n):
        t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        if prev_nrm is None:
            ref = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
            nrm = (ref - t * ref.dot(t)).normalized()
        else:
            nrm = (prev_nrm - t * prev_nrm.dot(t)).normalized()
        out.append((t, nrm, t.cross(nrm)))
        prev_nrm = nrm
    return out


def tube(pts, radii, seg=16, caps=True):
    """점 배열을 따라가는 관(반지름 배열). 끝은 반구 대신 평평한 뚜껑"""
    pts = [Vector(p) for p in pts]
    if not isinstance(radii, (list, tuple)):
        radii = [radii] * len(pts)
    bm = bmesh.new()
    rings = []
    for (p, r, (t, n, b)) in zip(pts, radii, _frames_along(pts)):
        ring = []
        for k in range(seg):
            a = 2 * math.pi * k / seg
            ring.append(bm.verts.new(p + (n * math.cos(a) + b * math.sin(a)) * r))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for k in range(seg):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]))
    if caps:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bm.normal_update()
    return bm


def box(center, size, bevel=0.0, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    R = rot.to_matrix() if rot is not None else None
    for v in bm.verts:
        p = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
        if R is not None:
            p = R @ p
        v.co = Vector(center) + p
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=3, affect='EDGES', profile=0.5)
    return bm


def cone(center, r1, r2, depth, seg=24, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=depth)
    R = rot.to_matrix() if rot is not None else None
    for v in bm.verts:
        p = Vector(v.co)
        if R is not None:
            p = R @ p
        v.co = Vector(center) + p
    return bm


def torus(center, R1, r2, seg=40, ring=12, rot=None):
    bm = bmesh.new()
    for i in range(seg):
        a = 2 * math.pi * i / seg
        for j in range(ring):
            b = 2 * math.pi * j / ring
            bm.verts.new(Vector(((R1 + r2 * math.cos(b)) * math.cos(a), (R1 + r2 * math.cos(b)) * math.sin(a), r2 * math.sin(b))))
    bm.verts.ensure_lookup_table()
    for i in range(seg):
        for j in range(ring):
            a = i * ring + j; b_ = ((i + 1) % seg) * ring + j; c = ((i + 1) % seg) * ring + (j + 1) % ring; d = i * ring + (j + 1) % ring
            bm.faces.new((bm.verts[a], bm.verts[b_], bm.verts[c], bm.verts[d]))
    Rm = rot.to_matrix() if rot is not None else None
    for v in bm.verts:
        p = Vector(v.co)
        if Rm is not None:
            p = Rm @ p
        v.co = Vector(center) + p
    bm.normal_update()
    return bm


def on_ellipsoid(center, radii, direction, egg=0.0):
    """타원체 표면 위 점(중심에서 direction 쪽) + 그 점의 바깥 법선"""
    d = Vector(direction).normalized()
    # egg 보정은 무시하고 근사(작다) — 표면에서 살짝 묻히게 쓰므로 충분
    s = 1.0 / math.sqrt((d.x / radii[0]) ** 2 + (d.y / radii[1]) ** 2 + (d.z / radii[2]) ** 2)
    p = Vector(center) + d * s
    n = Vector(((p.x - center[0]) / radii[0] ** 2, (p.y - center[1]) / radii[1] ** 2, (p.z - center[2]) / radii[2] ** 2)).normalized()
    return p, n


def look_rot(n):
    """+Z 를 n 쪽으로 돌리는 회전(Euler)"""
    return Vector((0, 0, 1)).rotation_difference(Vector(n)).to_euler()


def ortho_camera(center_xz, ortho_scale, yaw_deg=0.0, dist=10.0, elev_deg=8.0):
    """앞(-Y)에서 보는 직교 카메라 — 살짝 내려다보게(elev). center_xz 를 화면 가운데에"""
    cam = bpy.data.cameras.new('cam')
    cam.type = 'ORTHO'
    cam.ortho_scale = ortho_scale
    o = bpy.data.objects.new('cam', cam)
    bpy.context.scene.collection.objects.link(o)
    e = math.radians(elev_deg)
    o.location = Vector((center_xz[0], -dist * math.cos(e), center_xz[1] + dist * math.sin(e)))
    o.rotation_euler = Euler((math.radians(90) - e, 0, 0))
    bpy.context.scene.camera = o
    return o


def lights(strength=1.0):
    """원화 같은 장난감 조명 — 왼쪽 위 앞 키 · 오른쪽 채움 · 뒤 림 · 하늘색 환경"""
    w = bpy.data.worlds.new('w')
    bpy.context.scene.world = w
    try:
        w.use_nodes = True
    except Exception:
        pass
    bg = w.node_tree.nodes.get('Background')
    bg.inputs['Color'].default_value = srgb('#fff4e0')
    bg.inputs['Strength'].default_value = 0.55 * strength
    def area(name, loc, rot, energy, size, color='#ffffff'):
        L = bpy.data.lights.new(name, 'AREA')
        L.energy = energy * strength
        L.size = size
        L.color = srgb(color)[:3]
        o = bpy.data.objects.new(name, L)
        bpy.context.scene.collection.objects.link(o)
        o.location = loc
        o.rotation_euler = Euler([math.radians(a) for a in rot])
        return o
    area('key', (-3.2, -4.0, 4.2), (52, 0, -38), 900, 3.0, '#fff1dc')
    area('fill', (3.8, -3.2, 1.6), (72, 0, 48), 260, 4.0, '#e6f0ff')
    area('rim', (1.5, 3.8, 3.4), (-58, 0, 160), 520, 2.0, '#fff6e8')
