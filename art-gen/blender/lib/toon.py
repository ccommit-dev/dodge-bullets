"""셀 그림결 (2026-11-17, /goal ② "3D 렌더를 2D 셀 느낌으로 — 평면 색 2~3단 · 굵은 외곽선 · 반사광 없음").
ART_STYLE=toon 이면 render_anim2 가 장면을 다 지은 뒤 apply() 를 부른다. 모든 재질의 Principled BSDF 를 셀 재질로 바꾼다.
- 빛 대신 고정 광원 방향(화면 왼쪽 위 앞)과 표면 법선의 각도로 계단 세 단(ColorRamp CONSTANT)을 만든다. 조명 · 반사광 · 코트 · 쉰은 없다.
  계단은 Emission 으로만 그려 Cycles 잡음이 없다 → 샘플을 줄여도 된다(SAMPLES).
- 기본 색은 원래 Base Color 다. 값이든 연결이든(monster_style 의 손발 그라데이션 · 잔결) 그대로 쓴다.
- 발광(Emission)은 그대로 더한다(눈 반사광 · 빛나는 무기 · 불꽃). 투명(Alpha)은 투명 셰이더와 섞는다.
- 외곽선(ink_outline 인버티드 헐)은 그대로 두고 굵기만 OUTLINE_MUL 배 — 2D 셀처럼 바깥 선을 또렷하게.
"""
import math
import os
import bpy

LIGHT = (-0.45, -0.62, 0.64)          # 화면 왼쪽 위 앞(카메라는 -Y 에서 본다)
STEPS = ((0.0, 0.84), (0.36, 1.05), (0.66, 1.18))   # (법선 · 빛 각도 0~1, 밝기) — 그늘 · 중간 · 밝은 면. 예전 렌더는 조명이 바탕색보다 밝게 비춰 1 이 기준이면 어두웠다
# 계단을 환경 변수로 덮는다(2026-11-20, 유물 · 칭호 아이콘) — "위치:밝기,…". 아이콘은 밝게 + 빛 받는 끝에 밝은 넷째 단(반짝임)을 둔다.
# 캐릭터 렌더는 TOON_STEPS 를 안 넘겨 그대로
SPEC = tuple(float(x) for x in os.environ['TOON_SPEC'].split(':')) if os.environ.get('TOON_SPEC') else None   # "문턱:세기" — 예: 0.9:0.85
if os.environ.get('TOON_STEPS'):
    STEPS = tuple(tuple(float(x) for x in kv.split(':')) for kv in os.environ['TOON_STEPS'].split(','))
OUTLINE_MUL = float(os.environ.get('TOON_OUTLINE', '2.2' if os.environ.get('ART_STYLE', '') == 'pixel' else '1.3'))   # 도트는 굵게 — 가는 칼날이 점선으로 끊겼다(89px)
SAMPLES = int(os.environ.get('TOON_SAMPLES', '16'))


def enabled():
    return os.environ.get('ART_STYLE', '') in ('toon', 'pixel')


def _light():
    l = math.sqrt(sum(v * v for v in LIGHT))
    return tuple(v / l for v in LIGHT)


def _toon_material(m):
    nt = m.node_tree if m.use_nodes else None
    if nt is None or m.get('toon_done'):
        return
    b = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
    if b is None or out is None:
        return
    m['toon_done'] = True
    N = nt.nodes.new
    geo = N('ShaderNodeNewGeometry')
    dot = N('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'
    dot.inputs[1].default_value = _light()
    nt.links.new(geo.outputs['Normal'], dot.inputs[0])
    mr = N('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = -1.0
    mr.inputs['From Max'].default_value = 1.0
    nt.links.new(dot.outputs['Value'], mr.inputs['Value'])
    ramp = N('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    els = ramp.color_ramp.elements
    while len(els) < len(STEPS):
        els.new(0.5)
    for el, (pos, v) in zip(els, STEPS):
        el.position = pos
        el.color = (v, v, v, 1.0)
    nt.links.new(mr.outputs['Result'], ramp.inputs['Fac'])
    mix = N('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1.0
    base = b.inputs['Base Color']
    if base.is_linked:
        nt.links.new(base.links[0].from_socket, mix.inputs['A'])
    else:
        mix.inputs['A'].default_value = base.default_value
    nt.links.new(ramp.outputs['Color'], mix.inputs['B'])
    color_out = mix.outputs['Result']
    if SPEC:   # 흰 반짝임(2026-11-20 아이콘 3판) — 빛을 정면으로 받는 끝만 흰색 쪽으로(곱하기로는 짙은 색이 희어지지 않는다)
        sr = N('ShaderNodeValToRGB'); sr.color_ramp.interpolation = 'CONSTANT'
        se = sr.color_ramp.elements
        se[0].position, se[0].color = 0.0, (0, 0, 0, 1)
        se[1].position, se[1].color = SPEC[0], (SPEC[1], SPEC[1], SPEC[1], 1)
        nt.links.new(mr.outputs['Result'], sr.inputs['Fac'])
        wm = N('ShaderNodeMix'); wm.data_type = 'RGBA'; wm.blend_type = 'MIX'
        nt.links.new(sr.outputs['Color'], wm.inputs['Factor'])
        nt.links.new(color_out, wm.inputs['A'])
        wm.inputs['B'].default_value = (1, 1, 1, 1)
        color_out = wm.outputs['Result']
    em = N('ShaderNodeEmission')
    em.inputs['Strength'].default_value = 1.0
    nt.links.new(color_out, em.inputs['Color'])
    shader = em.outputs['Emission']
    es = b.inputs['Emission Strength']
    if es.is_linked or es.default_value > 0:
        glow = N('ShaderNodeEmission')
        ec = b.inputs['Emission Color']
        if ec.is_linked:
            nt.links.new(ec.links[0].from_socket, glow.inputs['Color'])
        else:
            glow.inputs['Color'].default_value = ec.default_value
        if es.is_linked:
            nt.links.new(es.links[0].from_socket, glow.inputs['Strength'])
        else:
            glow.inputs['Strength'].default_value = es.default_value
        add = N('ShaderNodeAddShader')
        nt.links.new(shader, add.inputs[0])
        nt.links.new(glow.outputs['Emission'], add.inputs[1])
        shader = add.outputs['Shader']
    alpha = b.inputs['Alpha']
    if alpha.is_linked or alpha.default_value < 0.999:
        tr = N('ShaderNodeBsdfTransparent')
        mx = N('ShaderNodeMixShader')
        if alpha.is_linked:
            nt.links.new(alpha.links[0].from_socket, mx.inputs['Fac'])
        else:
            mx.inputs['Fac'].default_value = alpha.default_value
        nt.links.new(tr.outputs['BSDF'], mx.inputs[1])
        nt.links.new(shader, mx.inputs[2])
        shader = mx.outputs['Shader']
    for l in list(out.inputs['Surface'].links):
        nt.links.remove(l)
    nt.links.new(shader, out.inputs['Surface'])


def apply(scene=None):
    """장면의 모든 재질을 셀 재질로 · 외곽선을 굵게 · 샘플을 줄인다. 여러 번 불러도 한 번만 바꾼다"""
    scene = scene or bpy.context.scene
    for m in bpy.data.materials:
        if m.name.startswith('ink_outline'):
            continue
        _toon_material(m)
    for o in bpy.data.objects:
        if o.type != 'MESH' or o.get('toon_outline'):
            continue
        md = o.modifiers.get('outline')
        if md is not None:
            md.thickness *= OUTLINE_MUL
            o['toon_outline'] = True
    try:
        scene.cycles.samples = SAMPLES
        scene.cycles.use_denoising = False   # 평면 색이라 잡음이 없다 — 디노이저가 계단 경계를 뭉갰다
    except Exception:
        pass
