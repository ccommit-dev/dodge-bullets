"""몬스터 그림결 2판 (2026-11-17, 사용자: "몬스터랑 보스몬스터도 리소스 수정" → "더 괴물답게"
→ 같은 날 참고 모델 둘(고블린 · 원숭이 괴물 GLB) "이거 참고해서 몬스터, 보스 다시").

예전(11-03 beaver_world)은 몬스터에도 비버 눈(큰 흰자 + 검은 눈동자)과 앞니를 달아 30종이 같은 얼굴로 보였다.
이 판은 cfg['mstyle'] 이 있는 전투 몬스터에만 쓴다 — 펫(pet-*) · 탈것(mount-*)은 예전 귀여운 그림결 그대로.
참고 모델에서 빌린 것(모양을 베끼지 않고 표현 방식만):
  · 매끈한 조각 면(로우 폴리 각 없음) · 손발 끝으로 짙어지는 칠 · 잔결
  · 눈: 흰자 + 작은 홍채 + 무거운 윗눈꺼풀 · 눈썹 뼈(노려봄). 대장은 홍채가 빛난다
  · 얼굴: 큰 코 · 주둥이 색 판 · 혀와 송곳니가 보이는 벌린 입(roar) 또는 아랫니가 솟은 찡그린 입(frown)
  · 고블린류: 큰 잎사귀 귀 · 천 옷 · 허리띠
이름에 맞는 특징: skull(해골 머리 · 갈비뼈) · knight(투구 · 견갑 · 방패) · club(몽둥이) · bull(소 뿔 · 코뚜레) …
외곽선은 비버와 같은 세계에서 읽히도록 남긴다.
"""
import math
from mathutils import Vector, Euler, Matrix
from lib import bcommon as C

OUT = 0.016
CUSTOM_WEAPONS = {'club', 'scythe', 'greataxe', 'trident'}


def _hex(h):
    return [int(h[i:i + 2], 16) for i in (1, 3, 5)]


def _mix(a, b, t):
    A, B = _hex(a), _hex(b)
    return '#%02x%02x%02x' % tuple(round(x + (y - x) * t) for x, y in zip(A, B))


def _sat(h, s):
    r, g, b = _hex(h)
    gray = 0.3 * r + 0.59 * g + 0.11 * b
    return '#%02x%02x%02x' % tuple(max(0, min(255, round(gray + (c - gray) * s))) for c in (r, g, b))


def style(cfg):
    """색: 비버 세계의 파스텔 대신 조금 짙고 그늘진 괴물 색. 배는 크림판이 아니라 자기 색의 밝은 판"""
    out = dict(cfg)
    col = _mix(_sat(cfg.get('color', '#8a6a4a'), 0.85), '#1c1220', 0.14)
    out['color'] = col
    if not cfg.get('glow_belly') and not cfg.get('keep_belly'):
        out['belly'] = _mix(col, '#e8d8b8', 0.38)
    out['dark'] = cfg.get('dark') or _mix(col, '#140c12', 0.55)
    out['buck_teeth'] = False
    out['spots'] = cfg.get('spots', 0)   # 빛나는 반점은 만화 장식 — 조각 그림결에선 빼고 필요한 종만
    return out


def _m(name, color, rough=0.5, metal=0.0, emit=None, es=0.0):
    return C.principled(name, color, rough=rough, metal=metal, coat=0.15, emit=emit, emit_strength=es)


def skin(color, dark, name='mskin'):
    """조각 피부 — 발 · 손 쪽(낮은 z)으로 짙어지는 칠 + 잔결(노이즈 범프) + 살짝 비치는 살(sss). 참고 모델의 칠한 질감"""
    m, fresh = C.new_mat(f'{name}_{color}_{dark}')
    if not fresh:
        return m
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = 0.62
    b.inputs['Coat Weight'].default_value = 0.08
    try:
        b.inputs['Subsurface Weight'].default_value = 0.08
        b.inputs['Subsurface Radius'].default_value = (0.4, 0.2, 0.12)
        b.inputs['Subsurface Scale'].default_value = 0.03
    except KeyError:
        pass
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(geo.outputs['Position'], sep.inputs[0])
    mr = nt.nodes.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = 0.02
    mr.inputs['From Max'].default_value = 0.42
    nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
    mixc = nt.nodes.new('ShaderNodeMix'); mixc.data_type = 'RGBA'; mixc.clamp_factor = True
    mixc.inputs['A'].default_value = C.srgb(dark)
    mixc.inputs['B'].default_value = C.srgb(color)
    nt.links.new(mr.outputs['Result'], mixc.inputs['Factor'])
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 7.0
    noise.inputs['Detail'].default_value = 5.0
    mix2 = nt.nodes.new('ShaderNodeMix'); mix2.data_type = 'RGBA'; mix2.blend_type = 'MULTIPLY'
    mix2.inputs['Factor'].default_value = 0.14
    nt.links.new(mixc.outputs['Result'], mix2.inputs['A'])
    nt.links.new(noise.outputs['Color'], mix2.inputs['B'])
    nt.links.new(mix2.outputs['Result'], b.inputs['Base Color'])
    bp = nt.nodes.new('ShaderNodeBump')
    bp.inputs['Strength'].default_value = 0.18
    bp.inputs['Distance'].default_value = 0.015
    nt.links.new(noise.outputs['Fac'], bp.inputs['Height'])
    nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    return m


def materials(M, cfg):
    """creature._build 의 재질 표를 조각 그림결로 바꾼다 — 피부 · 손발(짙은 끝) · 이 · 쇠"""
    col, dk = cfg.get('color', '#7a4a7a'), cfg.get('dark', '#3b2a3b')
    M['skin'] = skin(col, _mix(col, dk, 0.55))
    M['dark'] = skin(_mix(col, dk, 0.62), dk, 'mskind')   # 주먹 · 발 — 참고 모델처럼 끝이 짙다
    M['belly'] = skin(cfg.get('belly', _mix(col, '#e8d8b8', 0.38)), _mix(cfg.get('belly', col), dk, 0.4), 'mskinb')
    M['tooth'] = _m('mtooth', '#f2ead6', rough=0.4)
    M['claw'] = _m('mclaw', cfg.get('claw', '#e8dcc0'), rough=0.45)
    M['horn'] = _m('mhorn', cfg.get('horn', '#e8dcc0'), rough=0.5)
    M['metal'] = _m('mmetal', cfg.get('metal', '#7a8290'), rough=0.45, metal=0.55)


# ── 눈 ──────────────────────────────────────────────────────────────

def eyes(add, head_c, head_r, cfg, coll, M, bone, spread, up, size):
    """괴물 눈 — 흰자 없음. 어두운 눈구멍 · 빛나는 홍채 · 세로 동공 · 노려보는 눈썹 뼈"""
    if cfg.get('knight'):
        return   # 투구 안 — 면갑 틈의 빛이 눈 노릇(knight_parts)
    saved = C.FACET
    C.FACET = 0
    try:
        boss = cfg.get('boss_look')
        sock = _m('msock', '#140a10', rough=0.7)
        glow = _m('mglow', cfg.get('iris', '#ffd34d'), rough=0.2, emit=cfg.get('iris', '#ffd34d'), es=3.2 if boss else 2.4)
        slit = _m('mslit', '#0a0506', rough=0.2)
        hi = _m('mhi', '#ffffff', emit='#ffffff', es=1.2)
        browm = skin(_mix(cfg.get('color', '#7a4a7a'), cfg.get('dark', '#2a1a20'), 0.3), cfg.get('dark', '#2a1a20'), 'mbrow')
        sides = (0,) if cfg.get('cyclops') else (-1, 1)
        for sx in sides:
            p, n = C.on_ellipsoid(head_c, head_r, Vector((sx * spread, -1.0, up)))
            r = cfg.get('meye', 0.062) * size * (1.9 if sx == 0 else 1.0) * (1.12 if boss else 1.0)
            tilt = 0.0 if sx == 0 else -sx * 0.42   # 안쪽이 내려간다
            rot = (C.look_rot(n).to_matrix() @ Matrix.Rotation(-tilt, 3, 'Z')).to_euler()   # look_rot 프레임은 월드 Y 회전과 부호가 반대(11-17: 처진 눈으로 나왔다)
            if cfg.get('skull'):
                # 해골 — 깊은 검은 눈구멍 + 그 안의 작은 불씨
                # 둥근 큰 구멍은 비버 눈처럼 귀여워 보였다(11-17 시험) — 납작하게 기울인 각진 구멍 + 크게 빛나는 불씨
                add(bone, C.mesh_obj(f'msock{sx}', C.ellipsoid(p - n * 0.012, (r * 1.55, r * 0.95, r * 0.5), rot=rot), sock, coll, outline=OUT * 0.5))
                add(bone, C.mesh_obj(f'mglow{sx}', C.ellipsoid(p + n * (r * 0.14), (r * 0.62, r * 0.5, r * 0.22), rot=rot), _m('mglowsk', cfg.get('iris', '#ffd34d'), rough=0.2, emit=cfg.get('iris', '#ffd34d'), es=4.5), coll))
                bp = p + n * (r * 0.3) + Vector((0, 0, r * 0.85))
                add(bone, C.mesh_obj(f'mbrow{sx}', C.box(bp, (r * 2.6, 0.045, 0.035), bevel=0.012, rot=Euler((0, tilt * 0.9, 0))), M['skin'], coll, outline=OUT * 0.6))
                continue
            # 참고 모델 눈(11-17) — 흰자 + 작은 홍채 + 무거운 윗눈꺼풀이 위를 덮어 노려본다. bulge 는 눈꺼풀 없이 툭 튀어나온 눈
            white = _m('mwhite', cfg.get('sclera', '#eee4cc'), rough=0.35)
            iris = _m('miris2', cfg.get('iris', '#c8a030'), rough=0.25, emit=cfg.get('iris') if boss else None, es=0.9 if boss else 0)
            bulge = cfg.get('bulge')
            rr = r * (1.25 if bulge else 1.0)
            add(bone, C.mesh_obj(f'meyeb{sx}', C.ellipsoid(p + n * (rr * (0.3 if bulge else 0.12)), (rr, rr * 0.95, rr * 0.62), rot=rot), white, coll, outline=OUT * 0.5))
            pc = p + n * (rr * (0.9 if bulge else 0.72))   # 홍채가 흰자 속에 묻혀 옆 머리(네발)에선 빈 흰 눈으로 보였다(11-17)
            ir = rr * (0.46 if bulge else 0.56 if cfg.get('kind') == 'quad' else 0.5)
            add(bone, C.mesh_obj(f'miris{sx}', C.ellipsoid(pc + Vector((-sx * rr * 0.08, 0, -rr * 0.05)), (ir, ir, ir * 0.3), rot=rot), iris, coll))
            add(bone, C.mesh_obj(f'mpupil{sx}', C.ellipsoid(pc + n * (ir * 0.12) + Vector((-sx * rr * 0.08, 0, -rr * 0.05)), (ir * (0.3 if cfg.get('slit') else 0.48), ir * 0.52, ir * 0.18), rot=rot), slit, coll))
            add(bone, C.mesh_obj(f'mhi{sx}', C.ellipsoid(pc + n * (ir * 0.3) + Vector((-ir * 0.4, 0, ir * 0.35)), (ir * 0.2, ir * 0.2, ir * 0.06), rot=rot), hi, coll))
            if bulge:
                continue
            if sx == 0 or cfg.get('kind') in ('quad', 'spider'):   # 외눈 · 네발 · 거미는 눈꺼풀이 모자 챙 · 졸린 눈으로 보였다(11-17) — 눈썹 뼈만
                if cfg.get('kind') == 'quad':   # 늑대 · 사자 — 흰 털 눈썹 덩이가 눈을 덮었다(11-17). 짙은 가는 눈썹 줄만(노려봄)
                    bq = p + n * (rr * 0.5) + Vector((0, 0, rr * 0.95))
                    add(bone, C.mesh_obj(f'mqbrow{sx}', C.box(bq, (rr * 1.9, 0.026, 0.022), bevel=0.008, rot=(C.look_rot(n).to_matrix() @ Matrix.Rotation(-tilt * 1.2, 3, 'Z')).to_euler()), _m('mqbrowd', cfg.get('dark', '#2a1a20'), rough=0.7), coll, outline=OUT * 0.4))
                    continue
                bp = p + n * (rr * 0.45) + Vector((0, 0, rr * 1.05))
                add(bone, C.mesh_obj(f'mbrow{sx}', C.ellipsoid(bp, (rr * (0.95 if sx == 0 else 1.3), rr * 0.36, rr * 0.42), rot=(C.look_rot(n).to_matrix() @ Matrix.Rotation(-tilt * 1.15, 3, 'Z')).to_euler()), browm, coll, outline=OUT * 0.6))
                continue
            # 윗눈꺼풀 — 눈 위 40% 를 덮고 안쪽이 내려간다(찡그림). 아랫눈꺼풀은 얇게
            lc = p + n * (rr * 0.3) + Vector((0, 0, rr * 0.86))   # 위 1/4 만 — 더 내리면 졸린 얼굴(11-17 31종 시험)
            add(bone, C.mesh_obj(f'mlid{sx}', C.ellipsoid(lc, (rr * 1.2, rr * 0.5, rr * 0.74), rot=rot), M['skin'], coll, outline=OUT * 0.55))
            lw = p + n * (rr * 0.25) + Vector((0, 0, -rr * 0.82))
            add(bone, C.mesh_obj(f'mlidl{sx}', C.ellipsoid(lw, (rr * 1.05, rr * 0.3, rr * 0.55), rot=rot), M['skin'], coll, outline=OUT * 0.45))
            # 눈썹 뼈 — 눈꺼풀 위 굵은 살 턱. 외눈은 가운데 하나를 크게
            bp = p + n * (rr * 0.45) + Vector((0, 0, rr * 1.3))
            add(bone, C.mesh_obj(f'mbrow{sx}', C.ellipsoid(bp, (rr * (1.25 if sx == 0 else 1.45), rr * 0.42, rr * 0.5), rot=(C.look_rot(n).to_matrix() @ Matrix.Rotation(-tilt * 1.15, 3, 'Z')).to_euler()), browm, coll, outline=OUT * 0.6))
    finally:
        C.FACET = saved


# ── 입 ──────────────────────────────────────────────────────────────

def mouth(add, mz, hr, cfg, coll, M):
    """넓은 입 · 윗니 줄 · 송곳니 · 아래 엄니. 해골은 입술 없이 이빨 줄만. 기사는 투구 안이라 입이 없다"""
    if cfg.get('knight'):
        return
    tooth = M['tooth']
    if cfg.get('skull'):
        add('jaw', C.mesh_obj('mjawbone', C.ellipsoid(mz + Vector((0, 0, -0.01)), (hr[0] * 0.5, hr[1] * 0.26, hr[2] * 0.15)), M['skin'], coll, outline=OUT))
        add('head', C.mesh_obj('mmaw', C.ellipsoid(mz + Vector((0, -0.005, 0.02)), (hr[0] * 0.44, hr[1] * 0.16, hr[2] * 0.09)), _m('mmawd', '#140a10'), coll))
        for k in range(6):
            x = (k - 2.5) * hr[0] * 0.13
            add('head', C.mesh_obj(f'mst{k}', C.box(mz + Vector((x, -hr[1] * 0.2, 0.035)), (0.028, 0.02, 0.05), bevel=0.006), tooth, coll, outline=OUT * 0.35))
            add('jaw', C.mesh_obj(f'msb{k}', C.box(mz + Vector((x, -hr[1] * 0.2, -0.02)), (0.026, 0.02, 0.045), bevel=0.006), tooth, coll, outline=OUT * 0.35))
        return
    lipc = cfg.get('muzzle') or _mix(cfg.get('color', '#7a4a7a'), cfg.get('dark', '#2a1a20'), 0.35)
    lip = skin(lipc, _mix(lipc, '#140a0a', 0.4), 'mlip')
    maw = _m('mmawd', '#2a0a12', rough=0.6)
    if cfg.get('mouth', 'frown') == 'roar':
        # 크게 벌린 입(참고: 원숭이 괴물) — 두꺼운 입술 테 · 어두운 입안 · 혀 · 위아래 송곳니
        W, Hh = hr[0] * 0.6, hr[2] * 0.34
        add('head', C.mesh_obj('mlipu', C.ellipsoid(mz + Vector((0, -hr[1] * 0.08, Hh * 1.12)), (W * 0.92, hr[1] * 0.16, Hh * 0.3)), lip, coll, outline=OUT * 0.6))
        add('jaw', C.mesh_obj('mlipd', C.ellipsoid(mz + Vector((0, -hr[1] * 0.08, -Hh * 1.15)), (W * 0.85, hr[1] * 0.16, Hh * 0.32)), lip, coll, outline=OUT * 0.6))
        add('head', C.mesh_obj('mmaw', C.ellipsoid(mz + Vector((0, -hr[1] * 0.06, 0.0)), (W * 0.9, hr[1] * 0.14, Hh * 1.12)), maw, coll))
        add('jaw', C.mesh_obj('mtongue', C.ellipsoid(mz + Vector((0, -hr[1] * 0.08, -Hh * 0.45)), (W * 0.55, hr[1] * 0.12, Hh * 0.35)), _m('mtongue', '#c86a78', rough=0.45), coll))
        for sx in (-1, 1):
            add('head', C.mesh_obj(f'mfang{sx}', C.cone(mz + Vector((sx * W * 0.55, -hr[1] * 0.16, Hh * 0.75)), 0.026, 0.0, 0.085, seg=8, rot=Euler((math.pi, 0, 0))), tooth, coll, outline=OUT * 0.35))
            add('jaw', C.mesh_obj(f'mlfang{sx}', C.cone(mz + Vector((sx * W * 0.42, -hr[1] * 0.16, -Hh * 0.75)), 0.022, 0.0, 0.065, seg=8), tooth, coll, outline=OUT * 0.35))
        return
    # 찡그린 입(참고: 고블린) — 아래로 처진 굵은 입술 + 아랫니가 위로 솟는다
    W = hr[0] * 0.5
    add('jaw', C.mesh_obj('mlipl', C.ellipsoid(mz + Vector((0, -hr[1] * 0.08, -0.012)), (W, hr[1] * 0.16, hr[2] * 0.1)), lip, coll, outline=OUT * 0.6))
    add('head', C.mesh_obj('mmaw', C.ellipsoid(mz + Vector((0, -hr[1] * 0.12, 0.02)), (W * 0.9, hr[1] * 0.08, hr[2] * 0.035)), maw, coll))
    for sx in (-1, 1):
        add('head', C.mesh_obj(f'mcorner{sx}', C.ellipsoid(mz + Vector((sx * W * 0.92, -hr[1] * 0.06, 0.0)), (0.025, 0.03, 0.03)), maw, coll))
    tusk = (-1, 1) if cfg.get('tusks') or cfg.get('fierce') else (1,)
    for sx in tusk:   # 한쪽만 솟은 아랫니가 참고 고블린의 얼굴. 거친 종은 양쪽 엄니
        big = 1.5 if cfg.get('tusks') else 1.0
        add('jaw', C.mesh_obj(f'mtusk{sx}', C.cone(mz + Vector((sx * W * 0.45, -hr[1] * 0.2, 0.0)), 0.026 * big, 0.0, 0.07 * big, seg=8), tooth, coll, outline=OUT * 0.4))


# ── 이름에 맞는 특징 ─────────────────────────────────────────────────

def _face(add, cfg, M, coll, hc, hr, hcf, hr_):
    """코 · 주둥이 판 · 큰 귀 (참고 모델의 얼굴 덩어리)"""
    nose = cfg.get('nose')
    lipc = cfg.get('muzzle') or _mix(cfg.get('color', '#7a4a7a'), cfg.get('dark', '#2a1a20'), 0.35)
    if cfg.get('muzzle_patch'):
        add('head', C.mesh_obj('mmuzpatch', C.ellipsoid(hcf + Vector((0, -hr_[1] * 0.55, -hr_[2] * 0.42)), (hr_[0] * 0.66, hr_[1] * 0.34, hr_[2] * 0.36)), skin(lipc, _mix(lipc, '#140a0a', 0.35), 'mmuz'), coll, outline=OUT * 0.6))
    if nose:
        p, n = C.on_ellipsoid(hcf, hr_, Vector((0, -1.0, -0.05)))
        nm = skin(_mix(cfg.get('color', '#7a4a7a'), lipc, 0.4), cfg.get('dark', '#2a1a20'), 'mnose')
        if nose == 'long':   # 고블린 — 앞으로 길게 뻗어 아래로 굽은 코
            tip = p + n * 0.11 + Vector((0, 0, -0.06))
            pts = C_spline([p - n * 0.02, p + n * 0.06 + Vector((0, 0, -0.01)), tip], 8)
            add('head', C.mesh_obj('mnose', C.tube(pts, C_interp([0.06, 0.05, 0.035], len(pts)), seg=14), nm, coll, outline=OUT * 0.6))
            add('head', C.mesh_obj('mnosetip', C.ellipsoid(tip, (0.045, 0.04, 0.04)), nm, coll, outline=OUT * 0.5))
        elif nose == 'pig':   # 멧돼지 — 납작한 콧등 + 콧구멍 둘
            add('head', C.mesh_obj('mnose', C.ellipsoid(p + n * 0.04, (0.09, 0.05, 0.07), rot=C.look_rot(n)), nm, coll, outline=OUT * 0.6))
            for sx in (-1, 1):
                add('head', C.mesh_obj(f'mnost{sx}', C.ellipsoid(p + n * 0.085 + Vector((sx * 0.035, 0, 0)), (0.018, 0.012, 0.025)), _m('mnosd', '#1a0c0c'), coll))
        else:   # snub — 넓적한 코
            add('head', C.mesh_obj('mnose', C.ellipsoid(p + n * 0.03, (0.075, 0.05, 0.05), rot=C.look_rot(n)), nm, coll, outline=OUT * 0.6))
            for sx in (-1, 1):
                add('head', C.mesh_obj(f'mnost{sx}', C.ellipsoid(p + n * 0.07 + Vector((sx * 0.03, 0, -0.02)), (0.016, 0.01, 0.012)), _m('mnosd', '#1a0c0c'), coll))
    if cfg.get('ears') == 'goblin':   # 옆으로 크게 뻗은 잎사귀 귀 + 안쪽 짙은 판
        inner = skin(_mix(cfg.get('color', '#7a4a7a'), lipc, 0.55), cfg.get('dark', '#2a1a20'), 'mearin')
        for sx in (-1, 1):
            es = 0.62 if cfg.get('skull') else 1.0
            c = hc + Vector((sx * (hr[0] + 0.12 * es), 0.03, hr[2] * 0.22))
            rot = Euler((0, sx * math.radians(-18), sx * math.radians(-12)))
            add('head', C.mesh_obj(f'mear{sx}', C.ellipsoid(c, (0.2 * es, 0.035, 0.1 * es * (0.7 if cfg.get('skull') else 1.0)), egg=0.3, rot=rot), M['skin'], coll, outline=OUT))
            add('head', C.mesh_obj(f'mearin{sx}', C.ellipsoid(c + Vector((0, -0.022, -0.005)), (0.15 * es, 0.015, 0.065 * es * (0.7 if cfg.get('skull') else 1.0)), rot=rot), inner, coll))


def blob_extras(add, cfg, M, coll, bc, br, mz, col):
    """슬라임 젤리 몸 (11-17, 사용자: "슬라임 임프가 너무 체형이 똑같네") — 다리 없이 흘러내리는 덩어리:
    벌린 입 · 몸 옆으로 흘러내린 자락 · 바닥에 퍼진 웅덩이 · 몸 안에 떠 있는 기포 · 머리 위 작은 뿔 둘"""
    goo = C.principled('mgoo', col, rough=0.12, coat=0.85, sss=0.2)
    hr = (br[0] * 0.62, br[1] * 0.62, br[2] * 0.62)
    mouth(add, mz + Vector((0, 0.02, -0.02)), hr, dict(cfg, mouth='roar'), coll, M)
    add('body', C.mesh_obj('mpuddle', C.ellipsoid(Vector((0, 0.0, 0.02)), (br[0] * 1.25, br[1] * 1.2, 0.035)), goo, coll, outline=OUT * 0.6))
    for k, (x, y, z, r) in enumerate(((-0.36, -0.12, 0.16, 0.07), (0.38, -0.05, 0.12, 0.08), (-0.18, -0.3, 0.06, 0.06), (0.22, -0.3, 0.05, 0.055), (0.0, 0.3, 0.1, 0.07))):
        add('body', C.mesh_obj(f'mdrip{k}', C.ellipsoid(Vector((x, y, z)), (r, r, r * 1.5), egg=-0.3), goo, coll, outline=OUT * 0.5))
    bub = C.principled('mbubble', _mix(col, '#ffffff', 0.55), rough=0.1, coat=0.9)
    for k, (x, z, r) in enumerate(((0.18, 0.5, 0.035), (-0.22, 0.42, 0.025), (0.08, 0.22, 0.03))):
        add('body', C.mesh_obj(f'mbub{k}', C.ellipsoid(bc + Vector((x, -br[1] * 0.7, z - bc.z)), (r, r * 0.6, r)), bub, coll))
    for sx in (-1, 1):
        base = bc + Vector((sx * br[0] * 0.38, 0.0, br[2] * 0.9))
        add('head', C.mesh_obj(f'mnub{sx}', C.cone(base, 0.05, 0.0, 0.12, seg=8, rot=Euler((0, sx * math.radians(-18), 0))), M['horn'], coll, outline=OUT * 0.5))


def _tunic(add, cfg, M, coll, bc, br):
    """천 옷 · 허리띠 (참고 고블린) — 몸 아래쪽을 감싸는 옷 + 띠 + 쇠고리"""
    cloth = skin(cfg['tunic'], _mix(cfg['tunic'], '#0a0808', 0.5), 'mcloth')
    add('body', C.mesh_obj('mtunic', C.ellipsoid(bc + Vector((0, 0, -br[2] * 0.12)), (br[0] * 1.07, br[1] * 1.08, br[2] * 0.86), egg=-0.1), cloth, coll, outline=OUT))
    belt = _m('mbelt', cfg.get('belt', '#3a2618'), rough=0.7)
    add('body', C.mesh_obj('mbelt', C.torus(Vector((0, 0, bc.z - br[2] * 0.32)), br[0] * 1.02, 0.032, seg=36, ring=8), belt, coll, outline=OUT * 0.5))
    p, n = C.on_ellipsoid(bc, br, Vector((0, -1.0, -0.36)))
    add('body', C.mesh_obj('mbuckle', C.box(p + n * 0.03, (0.06, 0.02, 0.05), bevel=0.008), _m('mbuckm', '#a08a5a', rough=0.4, metal=0.6), coll, outline=OUT * 0.4))


def biped_features(add, cfg, bones, M, coll, hc, hr, hcf, hr_, bc, br):
    _face(add, cfg, M, coll, hc, hr, hcf, hr_)
    if cfg.get('tunic'):
        _tunic(add, cfg, M, coll, bc, br)
    if cfg.get('skull'):
        _skull_parts(add, cfg, M, coll, hcf, hr_, bc, br)
    if cfg.get('knight'):
        _knight_parts(add, cfg, bones, M, coll, hc, hr, hcf, hr_, bc, br)
    if cfg.get('bull'):
        _bull_parts(add, cfg, M, coll, hcf, hr_)
    if cfg.get('hood'):
        _hood(add, cfg, M, coll, hc, hr, bc, br)
    if cfg.get('rock_chunks'):
        _rock_chunks(add, cfg, bones, M, coll, hc, hr, bc, br)
    if cfg.get('bark'):
        _bark(add, cfg, bones, M, coll, hc, hr, bc, br)
    if cfg.get('flame_hair'):
        _flame_hair(add, cfg, coll, hc, hr)
    if cfg.get('mcrown'):
        _crown(add, cfg, coll, hc, hr)
    if cfg.get('weapon') in CUSTOM_WEAPONS:
        hd = Vector(bones['arm.R'][1])
        for o in weapon(cfg['weapon'], hd, cfg, coll):
            add('arm.R', o)
    if cfg.get('shield'):
        hd = Vector(bones['arm.L'][1])
        add('arm.L', C.mesh_obj('mshield', C.cone(hd + Vector((0.05, -0.1, 0.02)), 0.17, 0.17, 0.035, seg=8, rot=Euler((math.radians(90), 0, math.radians(-15)))), M['metal'], coll, outline=OUT))
        add('arm.L', C.mesh_obj('mshieldb', C.cone(hd + Vector((0.05, -0.125, 0.02)), 0.06, 0.0, 0.05, seg=8, rot=Euler((math.radians(90), 0, math.radians(-15)))), _m('memb', cfg.get('accent', '#ff8a3d'), rough=0.35, emit=cfg.get('accent', '#ff8a3d'), es=1.2), coll, outline=OUT * 0.5))


def _skull_parts(add, cfg, M, coll, hcf, hr_, bc, br):
    """해골 — 콧구멍(거꾸로 된 세모) · 광대 · 갈비뼈(배 위 짙은 틈 넷)"""
    dk = _m('mbone_d', '#1a1016', rough=0.7)
    p, n = C.on_ellipsoid(hcf, hr_, Vector((0, -1.0, -0.15)))
    add('head', C.mesh_obj('mnose', C.cone(p + n * 0.005, 0.035, 0.0, 0.06, seg=3, rot=Euler((math.pi / 2, 0, 0))), dk, coll))
    for sx in (-1, 1):
        q, m = C.on_ellipsoid(hcf, hr_, Vector((sx * 0.55, -1.0, -0.2)))
        add('head', C.mesh_obj(f'mcheek{sx}', C.ellipsoid(q, (0.06, 0.03, 0.035), rot=C.look_rot(m)), M['skin'], coll, outline=OUT * 0.5))
    for k in range(4):
        z = bc.z + br[2] * (0.45 - k * 0.28)
        q, m = C.on_ellipsoid(bc, br, Vector((0, -1.0, (z - bc.z) / br[2])))
        add('body', C.mesh_obj(f'mrib{k}', C.ellipsoid(q + m * 0.004, (br[0] * (0.62 - abs(k - 1.5) * 0.08), 0.012, 0.022), rot=C.look_rot(m)), dk, coll))
    q, m = C.on_ellipsoid(bc, br, Vector((0, -1.0, 0.0)))
    add('body', C.mesh_obj('mspine', C.ellipsoid(q + m * 0.006, (0.018, 0.012, br[2] * 0.62), rot=C.look_rot(m)), dk, coll))


def _knight_parts(add, cfg, bones, M, coll, hc, hr, hcf, hr_, bc, br):
    """폐허의 파수 기사 — 머리 전체를 덮는 투구 · 면갑 틈(빛) · 깃털 볏 · 견갑 둘"""
    # 반짝이는 쇠는 작은 칸에서 하얗게 날아갔다(11-17 시험) — 무광에 가까운 짙은 쇠
    metal = _m('mknight', cfg.get('metal', '#6a7080'), rough=0.55, metal=0.45)
    M['metal'] = metal
    add('body', C.mesh_obj('mbreast', C.ellipsoid(bc + Vector((0, -0.02, 0.04)), (br[0] * 1.07, br[1] * 1.07, br[2] * 0.72), egg=0.1), metal, coll, outline=OUT))
    p0, n0 = C.on_ellipsoid(bc, br, Vector((0, -1.0, 0.25)))
    add('body', C.mesh_obj('mcrest', C.cone(p0 + n0 * 0.06, 0.07, 0.0, 0.03, seg=4, rot=C.look_rot(n0)), _m('mcrestc', cfg.get('accent', '#c8402a'), rough=0.4), coll, outline=OUT * 0.5))
    glow = _m('mvisor', cfg.get('iris', '#7fe8ff'), rough=0.2, emit=cfg.get('iris', '#7fe8ff'), es=4.0)
    add('head', C.mesh_obj('mhelm', C.ellipsoid(hcf + Vector((0, -0.01, 0.01)), (hr_[0] * 1.1, hr_[1] * 1.1, hr_[2] * 1.12), egg=0.12), metal, coll, outline=OUT))
    p, n = C.on_ellipsoid(hcf, (hr_[0] * 1.1, hr_[1] * 1.1, hr_[2] * 1.12), Vector((0, -1.0, 0.12)))
    add('head', C.mesh_obj('mvisorbar', C.box(p + n * 0.012, (hr_[0] * 1.15, 0.035, 0.07), bevel=0.012), _m('mvisd', '#1a1218', rough=0.6), coll, outline=OUT * 0.5))
    add('head', C.mesh_obj('mvisorglow', C.box(p + n * 0.035, (hr_[0] * 0.95, 0.012, 0.022), bevel=0.004), glow, coll))
    q, m = C.on_ellipsoid(hcf, (hr_[0] * 1.1, hr_[1] * 1.1, hr_[2] * 1.12), Vector((0, -1.0, -0.4)))
    for k in range(3):
        add('head', C.mesh_obj(f'mgrill{k}', C.box(q + m * 0.01 + Vector(((k - 1) * 0.05, 0, 0)), (0.014, 0.012, 0.07), bevel=0.003), _m('mvisd', '#1a1218', rough=0.6), coll))
    plume = _m('mplume', cfg.get('accent', '#ff8a3d'), rough=0.6)
    # 턱 가리개 — 투구 아래로 턱 · 입이 삐져나와 보였다(11-17 시험 2)
    mz = hcf + Vector((0, -hr_[1] * 0.9, -hr[2] * 0.5))
    add('jaw', C.mesh_obj('mchin', C.ellipsoid(mz + Vector((0, -0.01, 0.0)), (hr[0] * 0.62, hr[1] * 0.34, hr[2] * 0.26)), metal, coll, outline=OUT))
    for k in range(6):   # 머리 위에서 뒤로 흐르는 큰 깃털 볏
        a = math.radians(-15 + k * 12)
        base = hc + Vector((0, -0.08 + k * 0.055, hr_[2] * 1.2 - k * 0.02))
        add('head', C.mesh_obj(f'mplume{k}', C.cone(base, 0.06, 0.0, 0.26 - k * 0.025, seg=6, rot=Euler((a, 0, 0))), plume, coll, outline=OUT * 0.5))
    for side, sx in (('R', -1), ('L', 1)):
        sh = Vector(bones[f'arm.{side}'][0])
        add(f'arm.{side}', C.mesh_obj(f'mpaul{side}', C.ellipsoid(sh + Vector((sx * 0.03, 0, 0.05)), (0.15, 0.13, 0.09), egg=0.2), metal, coll, outline=OUT))
        add(f'arm.{side}', C.mesh_obj(f'mpaulr{side}', C.ellipsoid(sh + Vector((sx * 0.05, 0, 0.0)), (0.13, 0.115, 0.05)), metal, coll, outline=OUT * 0.6))


def _bull_parts(add, cfg, M, coll, hcf, hr_):
    """소 머리 — 넓은 콧등 · 금 코뚜레 · 옆으로 뻗어 올라가는 큰 뿔"""
    gold = _m('mgold', '#e8b830', rough=0.25, metal=0.85)
    p, n = C.on_ellipsoid(hcf, hr_, Vector((0, -1.0, -0.25)))
    add('head', C.mesh_obj('mmuzzle', C.ellipsoid(p + n * 0.02, (hr_[0] * 0.62, 0.09, hr_[2] * 0.32), rot=C.look_rot(n)), _m('mmuz', _mix(cfg.get('color', '#8a4a30'), '#e8c8a8', 0.45), rough=0.6), coll, outline=OUT))
    for sx in (-1, 1):
        add('head', C.mesh_obj(f'mnost{sx}', C.ellipsoid(p + n * 0.1 + Vector((sx * 0.05, 0, 0.0)), (0.022, 0.012, 0.016)), _m('mnosd', '#1a0c0c'), coll))
    add('head', C.mesh_obj('mring', C.torus(p + n * 0.1 + Vector((0, 0, -0.045)), 0.045, 0.011, rot=Euler((0, 0, 0))), gold, coll, outline=OUT * 0.4))
    hm = M['horn']
    for sx in (-1, 1):
        base = hcf + Vector((sx * hr_[0] * 0.8, 0.02, hr_[2] * 0.55))
        curve = C_spline([base, base + Vector((sx * 0.16, -0.02, 0.02)), base + Vector((sx * 0.3, -0.04, 0.12)), base + Vector((sx * 0.34, -0.06, 0.26))], 12)
        add('head', C.mesh_obj(f'mbhorn{sx}', C.tube(curve, C_interp([0.06, 0.05, 0.03, 0.006], len(curve)), seg=10), hm, coll, outline=OUT * 0.8))


def _hood(add, cfg, M, coll, hc, hr, bc, br):
    """리치 — 머리를 감싸는 두건 · 바닥까지 끌리는 옷자락(다리 대신)"""
    cloth = _m('mcloth', cfg.get('cloth', '#2a1a3a'), rough=0.8)
    trim = _m('mtrim', cfg.get('accent', '#c084fc'), rough=0.4, emit=cfg.get('accent', '#c084fc'), es=1.4)
    add('head', C.mesh_obj('mhood', C.ellipsoid(hc + Vector((0, 0.05, 0.03)), (hr[0] * 1.18, hr[1] * 1.1, hr[2] * 1.15), egg=0.25), cloth, coll, outline=OUT))
    add('body', C.mesh_obj('mrobe', C.cone(Vector((0, 0.0, bc.z * 0.7)), br[0] * 1.75, br[0] * 0.55, bc.z * 1.4 + br[2] * 0.6, seg=10), cloth, coll, outline=OUT))
    add('body', C.mesh_obj('mrobetrim', C.cone(Vector((0, 0.0, 0.03)), br[0] * 1.72, br[0] * 1.78, 0.05, seg=10), trim, coll))


def _rock_chunks(add, cfg, bones, M, coll, hc, hr, bc, br):
    """돌 · 용암 골렘 — 어깨 · 등에 박힌 각진 바위 덩이, 사이 틈이 빛난다(lava)"""
    stone = _m('mstone', cfg.get('stone', '#6a6470'), rough=0.85)
    lava = cfg.get('lava')
    crack = _m('mcrack', lava or '#3a3040', rough=0.5, emit=lava, es=2.6 if lava else 0)
    import random
    rnd = random.Random(sum(map(ord, cfg.get('color', 'x'))))
    saved = C.FACET
    C.FACET = 6
    try:
        for side, sx in (('R', -1), ('L', 1)):
            sh = Vector(bones[f'arm.{side}'][0])
            for k in range(2):
                c = sh + Vector((sx * (0.04 + k * 0.06), 0.02 + k * 0.03, 0.08 - k * 0.05))
                add(f'arm.{side}', C.mesh_obj(f'mrock{side}{k}', C.ellipsoid(c, (0.12 - k * 0.03, 0.1, 0.1 - k * 0.02)), stone, coll, outline=OUT))
        for k in range(4):
            d = Vector((rnd.uniform(-0.7, 0.7), 1.0, rnd.uniform(-0.2, 0.9))).normalized()
            p, n = C.on_ellipsoid(bc, br, d)
            add('body', C.mesh_obj(f'mbrock{k}', C.ellipsoid(p + n * 0.02, (0.1, 0.08, 0.09), rot=C.look_rot(n)), stone, coll, outline=OUT))
        for k in range(5):
            d = Vector((rnd.uniform(-0.8, 0.8), -1.0, rnd.uniform(-0.7, 0.8))).normalized()
            p, n = C.on_ellipsoid(bc, br, d)
            add('body', C.mesh_obj(f'mcrack{k}', C.box(p + n * 0.004, (0.012, 0.012, 0.09 + 0.03 * (k % 2)), rot=(C.look_rot(n).to_matrix() @ Matrix.Rotation(rnd.uniform(-0.8, 0.8), 3, 'Z')).to_euler()), crack, coll))
    finally:
        C.FACET = saved


def _bark(add, cfg, bones, M, coll, hc, hr, bc, br):
    """고목 수호자 — 몸에 세로 껍질 골 · 머리 위 가지 뿔(잎 달린) · 어깨 잎 무더기"""
    groove = skin(_mix(cfg.get('color', '#5a4030'), '#140c08', 0.55), '#140c08', 'mbark')
    import random
    rnd = random.Random(7)
    for k in range(9):
        a = math.radians(-70 + k * 17.5)
        d = Vector((math.sin(a), -math.cos(a), rnd.uniform(-0.2, 0.3))).normalized()
        p, n = C.on_ellipsoid(bc, br, d)
        add('body', C.mesh_obj(f'mgroove{k}', C.ellipsoid(p - n * 0.004, (0.014, 0.012, br[2] * rnd.uniform(0.45, 0.7)), rot=C.look_rot(n)), groove, coll))
    wood = skin(cfg.get('color', '#5a4030'), _mix(cfg.get('color', '#5a4030'), '#140c08', 0.5), 'mbranch')
    leaf = _m('mleaf', cfg.get('leaf', '#6aa83a'), rough=0.6)
    for sx in (-1, 1):
        base = hc + Vector((sx * hr[0] * 0.4, 0.03, hr[2] * 0.85))
        pts = C_spline([base, base + Vector((sx * 0.06, 0, 0.14)), base + Vector((sx * 0.16, 0.02, 0.26)), base + Vector((sx * 0.2, 0.03, 0.36))], 10)
        add('head', C.mesh_obj(f'mbranch{sx}', C.tube(pts, C_interp([0.045, 0.034, 0.022, 0.008], len(pts)), seg=8), wood, coll, outline=OUT * 0.7))
        tw = base + Vector((sx * 0.1, 0.01, 0.2))
        add('head', C.mesh_obj(f'mtwig{sx}', C.tube([tw, tw + Vector((-sx * 0.05, 0, 0.1))], [0.016, 0.005], seg=6), wood, coll, outline=OUT * 0.5))
        for k, q in enumerate((pts[-1], tw + Vector((-sx * 0.05, 0, 0.1)))):
            add('head', C.mesh_obj(f'mbleaf{sx}{k}', C.ellipsoid(q + Vector((0, 0, 0.03)), (0.06, 0.025, 0.04)), leaf, coll, outline=OUT * 0.5))


def _flame_hair(add, cfg, coll, hc, hr):
    """화염 마신 — 머리 뒤로 솟는 불꽃 갈기(빛남)"""
    f1 = _m('mflame1', '#ff7a1a', rough=0.3, emit='#ff6a10', es=2.2)
    f2 = _m('mflame2', '#ffd04a', rough=0.3, emit='#ffc030', es=2.6)
    for k in range(7):
        a = math.radians(-60 + k * 20)
        base = hc + Vector((math.sin(a) * hr[0] * 0.7, 0.08, hr[2] * 0.7 + math.cos(a) * 0.05))
        h = 0.22 + 0.1 * (1 - abs(k - 3) / 3)
        add('head', C.mesh_obj(f'mflame{k}', C.cone(base, 0.065, 0.0, h, seg=8, rot=Euler((math.radians(-25), math.sin(a) * 0.5, 0))), f1 if k % 2 else f2, coll, outline=OUT * 0.4))


def _crown(add, cfg, coll, hc, hr):
    """왕관 — 뾰족한 끝 다섯 개 + 보석"""
    gold = _m('mcrowng', '#e8b830', rough=0.3, metal=0.85)
    gem = _m('mcrowngem', cfg.get('gem', '#e0303a'), rough=0.2, emit=cfg.get('gem', '#e0303a'), es=0.8)
    z = hc.z + hr[2] * 0.88
    add('head', C.mesh_obj('mcrownb', C.tube([Vector((0, 0.0, z)), Vector((0, 0.0, z + 0.05))], [hr[0] * 0.5, hr[0] * 0.55], seg=24, caps=False), gold, coll, outline=OUT * 0.6))
    for k in range(5):
        a = k * 2 * math.pi / 5 + math.pi / 2
        p = Vector((math.cos(a) * hr[0] * 0.53, math.sin(a) * hr[0] * 0.53, z + 0.05))
        add('head', C.mesh_obj(f'mcrownt{k}', C.cone(p + Vector((0, 0, 0.04)), 0.035, 0.0, 0.08, seg=6), gold, coll, outline=OUT * 0.4))
    p = Vector((0, -hr[0] * 0.55, z + 0.03))
    add('head', C.mesh_obj('mcrowngem', C.ellipsoid(p, (0.03, 0.015, 0.03)), gem, coll, outline=OUT * 0.3))


# ── 무기 ────────────────────────────────────────────────────────────

def weapon(kind, at, cfg, coll):
    g = Vector(at)
    wood = _m('mwood', cfg.get('weapon_wood', '#5a3a22'), rough=0.75)
    steel = _m('msteel', cfg.get('weapon_color', '#9aa2ae'), rough=0.35, metal=0.7)
    out = []
    if kind == 'club':   # 오우거 몽둥이 — 끝이 굵은 통나무 + 박힌 못
        pts = [g + Vector((0, 0, -0.06)), g + Vector((0, 0.01, 0.16)), g + Vector((0, 0.02, 0.38))]
        out.append(C.mesh_obj('mclub', C.tube(pts, [0.03, 0.06, 0.1], seg=8), wood, coll, outline=OUT * 0.8))
        for k in range(6):
            a = k * math.pi / 3
            d = Vector((math.cos(a), math.sin(a) * 0.6, 0.2)).normalized()
            out.append(C.mesh_obj(f'mspike{k}', C.cone(g + Vector((0, 0.02, 0.32)) + d * 0.08, 0.02, 0.0, 0.06, seg=5, rot=C.look_rot(d)), steel, coll, outline=OUT * 0.4))
    elif kind == 'greataxe':   # 미노타우로스 양날 도끼
        out.append(C.mesh_obj('mhaft', C.tube([g + Vector((0, 0, -0.1)), g + Vector((0, 0, 0.42))], 0.022, seg=8), wood, coll, outline=OUT * 0.6))
        for sx in (-1, 1):
            out.append(C.mesh_obj(f'mblade{sx}', C.ellipsoid(g + Vector((sx * 0.1, 0, 0.36)), (0.1, 0.018, 0.12)), steel, coll, outline=OUT * 0.6))
    elif kind == 'scythe':   # 리치 낫 지팡이
        out.append(C.mesh_obj('mhaft', C.tube([g + Vector((0, 0, -0.25)), g + Vector((0, 0, 0.5))], 0.018, seg=8), wood, coll, outline=OUT * 0.6))
        curve = C_spline([g + Vector((0, 0, 0.48)), g + Vector((-0.12, 0, 0.5)), g + Vector((-0.26, 0, 0.42)), g + Vector((-0.32, 0, 0.3))], 12)
        out.append(C.mesh_obj('mblade', C.tube(curve, C_interp([0.03, 0.03, 0.02, 0.004], len(curve)), seg=6), steel, coll, outline=OUT * 0.6))
    elif kind == 'trident':
        out.append(C.mesh_obj('mhaft', C.tube([g + Vector((0, 0, -0.2)), g + Vector((0, 0, 0.45))], 0.018, seg=8), wood, coll, outline=OUT * 0.6))
        for sx in (-1, 0, 1):
            out.append(C.mesh_obj(f'mprong{sx}', C.cone(g + Vector((sx * 0.06, 0, 0.5 - abs(sx) * 0.02)), 0.018, 0.0, 0.12, seg=6), steel, coll, outline=OUT * 0.4))
    return out


def C_spline(pts, n):
    from lib.beaver import spline
    return spline(pts, n)


def C_interp(vals, n):
    from lib.beaver import interp
    return interp(vals, n)
