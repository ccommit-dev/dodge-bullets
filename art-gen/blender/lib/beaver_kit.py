"""동료 장식 키트 (2026-11-03, 사용자: "캐릭터와 동료가 너무 특징이 없네 · 마저수정") — 새 동료 40명이 같은 모자 다섯 종에 색만 달라 먼 칸에서 갈리지 않았다.
색이 아니라 실루엣으로 가른다: 머리(hat 새 종류 · over) · 얼굴(face) · 등(back) · 꼬리(tail_fx) · 허리(belt) · 몸 무늬(marks).
칸을 넘으면 전원 배율이 깎이니(assemble-anim2 kB) 위는 z≈1.15, 옆은 |x|≈0.62 안에 둔다. 모두 뼈에 강체로 붙는다."""
import math

import bmesh
from mathutils import Vector, Euler

from lib import bcommon as C
from lib.beaver import HEAD_C, HEAD_R, BODY_C, _accent, _shell, spline, interp, OUT

TOP = HEAD_C + Vector((0, 0, HEAD_R[2]))
EYE_DIR = 0.36, -1.0, 0.42


def _dome(center, radii, cut_z=None, cut_face=None, seg=16, rings=10):
    """머리를 덮는 껍데기 — cut_z 아래를 지우고, cut_face 를 주면 그 높이 아래 얼굴 쪽만 지운다"""
    bm = C.ellipsoid(center, radii, seg=seg, rings=rings)
    for v in list(bm.verts):
        if cut_z is not None and v.co.z < cut_z:
            bm.verts.remove(v)
        elif cut_face is not None and v.co.z < cut_face and v.co.y < HEAD_C.y - 0.05:
            bm.verts.remove(v)
    return bm


def _feather(name, base, d, L, mat, coll, width=0.5, outline=OUT * 0.5):
    """납작한 깃 · 잎 한 장(두께 있게) — 3/4 화면에서 옆선으로 사라지지 않게 면은 뒤(+Y) 쪽을 본다"""
    d = Vector(d).normalized()
    side = d.cross(Vector((0, 1, 0)))
    if side.length < 1e-3:
        side = Vector((1, 0, 0))
    side.normalize()
    bm = bmesh.new()
    left, right, n = [], [], 7
    for i in range(n + 1):
        t = i / n
        w = math.sin(math.pi * min(1.0, t * 0.92 + 0.08)) * (1 - 0.25 * t) * L * width * 0.5
        p = Vector(base) + d * (L * t)
        left.append(bm.verts.new(p - side * w))
        right.append(bm.verts.new(p + side * w))
    for i in range(n):
        bm.faces.new((left[i], left[i + 1], right[i + 1], right[i]))
    bm.normal_update()
    o = C.mesh_obj(name, bm, mat, coll, smooth=False)
    s = o.modifiers.new('solid', 'SOLIDIFY')
    s.thickness = 0.016
    if outline:
        C.add_outline(o, outline)
    return o


def _horn(name, base, sx, mat, coll, rise=0.2, out=0.16, r=0.05):
    pts = spline([base, base + Vector((sx * out * 0.55, 0.01, rise * 0.55)), base + Vector((sx * out, 0.04, rise))], 10)
    return C.mesh_obj(name, C.tube(pts, interp([r, r * 0.65, 0.006], len(pts)), seg=10), mat, coll, outline=OUT * 0.7)


# ── 머리 ── hat() 에 없는 종류. 돌려준 조각은 모두 head 뼈
def hat_new(kind, cfg, coll):
    out = []
    col = cfg.get('hat_color', '#3f9a4a')
    col2 = cfg.get('hat_color2', '#2b6e35')
    m1 = _accent('k1', col, rough=0.55)
    m2 = _accent('k2', col2, rough=0.5)
    gold = _accent('gold', '#f2c232', rough=0.25, metal=0.85)
    metal = _accent('kmetal', col, rough=0.28, metal=0.75)

    def o(name, bm, mat=m1, outline=OUT):
        out.append(C.mesh_obj(name, bm, mat, coll, outline=outline))

    if kind == 'straw':   # 챙 넓은 밀짚모자
        o('brim', C.ellipsoid(HEAD_C + Vector((0, 0.03, 0.235)), (0.47, 0.44, 0.022), rot=Euler((math.radians(-7), 0, 0))))
        o('crown', C.ellipsoid(HEAD_C + Vector((0, 0.03, 0.3)), (0.2, 0.19, 0.115)))
        o('band', C.torus(HEAD_C + Vector((0, 0.03, 0.262)), 0.195, 0.022, rot=Euler((math.radians(-7), 0, 0))), m2, OUT * 0.5)
    elif kind == 'cone':   # 삿갓
        o('cone', C.cone(HEAD_C + Vector((0, 0.03, 0.31)), 0.5, 0.012, 0.22, seg=16))
        o('strap', C.torus(HEAD_C + Vector((0, 0.03, 0.208)), 0.47, 0.012, rot=Euler((math.radians(-3), 0, 0))), m2, 0)
    elif kind == 'beanie':   # 털실 모자 + 방울
        out.append(_shell(C.mesh_obj('beanie', _dome(HEAD_C + Vector((0, 0.01, 0.05)), (HEAD_R[0] * 1.05, HEAD_R[1] * 1.06, HEAD_R[2] * 1.02), cut_z=HEAD_C.z + 0.19), m1, coll, outline=OUT), 0.015))
        o('fold', C.torus(HEAD_C + Vector((0, 0.01, 0.2)), 0.277, 0.038, rot=Euler((math.radians(-4), 0, 0))), m2)
        o('pom', C.ellipsoid(TOP + Vector((0, 0.01, 0.13)), (0.075, 0.075, 0.075), seg=12, rings=8), m2, OUT * 0.7)
    elif kind == 'headphones':
        pts = [Vector((math.cos(a) * 0.335, 0.0, HEAD_C.z + 0.05 + math.sin(a) * 0.325)) for a in [math.pi * k / 16 for k in range(17)]]
        o('hband', C.tube(pts, 0.03, seg=8))
        for sx in (-1, 1):
            o(f'cup{sx}', C.ellipsoid(HEAD_C + Vector((sx * 0.31, 0.0, 0.03)), (0.05, 0.1, 0.115), seg=14, rings=8), m2)
    elif kind == 'miner':   # 광부 안전모 + 등
        out.append(_shell(C.mesh_obj('miner', _dome(HEAD_C + Vector((0, 0.01, 0.06)), (HEAD_R[0] * 1.06, HEAD_R[1] * 1.08, HEAD_R[2] * 0.98), cut_z=HEAD_C.z + 0.19), metal, coll, outline=OUT), 0.018))
        o('rim', C.torus(HEAD_C + Vector((0, 0.01, 0.2)), 0.292, 0.022), m2, OUT * 0.5)
        o('lamp', C.ellipsoid(HEAD_C + Vector((0, -0.285, 0.26)), (0.07, 0.04, 0.07), seg=14, rings=8), _accent('lamp', '#fff0a0', rough=0.1, emit='#fff0a0', es=1.2), OUT * 0.5)
    elif kind == 'sailor':   # 흰 수병 모자 + 파란 띠
        o('sail_top', C.tube([HEAD_C + Vector((0, 0.01, 0.2)), HEAD_C + Vector((0, 0.01, 0.31))], [0.235, 0.215], seg=16))
        o('sail_lid', C.ellipsoid(HEAD_C + Vector((0, 0.01, 0.31)), (0.215, 0.215, 0.022), seg=16, rings=6))
        o('sail_rim', C.torus(HEAD_C + Vector((0, 0.01, 0.215)), 0.25, 0.034), m2)
    elif kind == 'pot':   # 냄비 투구 — 일반 등급 탱커의 웃음 포인트
        out.append(_shell(C.mesh_obj('pot', _dome(HEAD_C + Vector((0, 0.01, 0.06)), (HEAD_R[0] * 1.05, HEAD_R[1] * 1.08, HEAD_R[2] * 0.96), cut_z=HEAD_C.z + 0.19), metal, coll, outline=OUT), 0.018))
        o('pot_rim', C.torus(HEAD_C + Vector((0, 0.01, 0.2)), 0.29, 0.026), metal, OUT * 0.5)
        o('pot_knob', C.ellipsoid(TOP + Vector((0, 0.01, 0.075)), (0.04, 0.04, 0.05), seg=12, rings=8), m2, OUT * 0.6)
        for sx in (-1, 1):
            o(f'pot_h{sx}', C.torus(HEAD_C + Vector((sx * 0.33, 0.01, 0.24)), 0.055, 0.016, seg=14, ring=6, rot=Euler((math.radians(90), 0, 0))), m2, OUT * 0.4)
    elif kind == 'beret':
        o('beret', C.ellipsoid(HEAD_C + Vector((-0.05, 0.02, 0.285)), (0.32, 0.3, 0.075), rot=Euler((0, math.radians(-10), 0))))
        o('beret_nub', C.cone(TOP + Vector((-0.06, 0.02, 0.035)), 0.022, 0.008, 0.06, seg=8), m2, OUT * 0.5)
    elif kind == 'leaf':   # 큰 잎 한 장을 쓴다
        lm = _accent('leaf', col, rough=0.6)
        out.append(_feather('leaf0', HEAD_C + Vector((0, -0.2, 0.25)), (0, 1.0, 0.14), 0.68, lm, coll, width=0.95))
        out.append(_feather('leaf1', HEAD_C + Vector((-0.12, -0.13, 0.27)), (-0.75, 0.6, 0.02), 0.42, _accent('leaf2', col2, rough=0.6), coll, width=0.8))
        out.append(_feather('leaf2', HEAD_C + Vector((0.12, -0.13, 0.27)), (0.75, 0.6, 0.02), 0.42, _accent('leaf2', col2, rough=0.6), coll, width=0.8))
        o('stem', C.tube(spline([TOP + Vector((0, -0.02, -0.02)), TOP + Vector((0.01, -0.03, 0.05)), TOP + Vector((0.04, -0.04, 0.11))], 6), 0.018, seg=6), m2, OUT * 0.5)
    elif kind == 'sprout':   # 새싹 두 잎
        o('stem', C.tube([TOP + Vector((0, 0, -0.02)), TOP + Vector((0, 0, 0.1))], 0.018, seg=6), m2, OUT * 0.5)
        lm = _accent('sprout', col, rough=0.5)
        for sx in (-1, 1):
            out.append(_feather(f'sprout{sx}', TOP + Vector((0, 0, 0.09)), (sx * 0.9, 0.0, 0.45), 0.22, lm, coll, width=0.85))
    elif kind == 'viking':   # 뿔 투구
        out.append(_shell(C.mesh_obj('viking', _dome(HEAD_C + Vector((0, 0.01, 0.06)), (HEAD_R[0] * 1.06, HEAD_R[1] * 1.08, HEAD_R[2] * 0.98), cut_z=HEAD_C.z + 0.19), metal, coll, outline=OUT), 0.018))
        o('vk_rim', C.torus(HEAD_C + Vector((0, 0.01, 0.2)), 0.292, 0.026), m2, OUT * 0.5)
        ivory = _accent('ivory', '#f1e4c8', rough=0.4)
        for sx in (-1, 1):
            out.append(_horn(f'vk_horn{sx}', HEAD_C + Vector((sx * 0.25, 0.0, 0.2)), sx, ivory, coll, rise=0.24, out=0.17, r=0.06))
    elif kind == 'mohawk':
        for k in range(6):
            t = k / 5
            a = math.radians(-35 + t * 110)
            p = HEAD_C + Vector((0, math.sin(a) * HEAD_R[1], math.cos(a) * HEAD_R[2] - 0.01))
            d = Vector((0, math.sin(a) * 0.8, math.cos(a))).normalized()
            L = 0.2 - abs(t - 0.4) * 0.1
            o(f'mo{k}', C.cone(p + d * L * 0.5, 0.065, 0.004, L, seg=6, rot=C.look_rot(d)), m1 if k % 2 else m2, OUT * 0.5)
    elif kind == 'drop':   # 물방울 고깔 — 물 치유사
        wm = _accent('drop', col, rough=0.12, emit=col, es=0.25)
        pts = spline([TOP + Vector((0, 0.01, -0.09)), TOP + Vector((0, 0.01, 0.02)), TOP + Vector((0, 0.03, 0.12)), TOP + Vector((0, 0.07, 0.22))], 12)
        o('dropm', C.tube(pts, interp([0.27, 0.2, 0.085, 0.006], len(pts)), seg=14), wm)
        o('drop_rim', C.torus(HEAD_C + Vector((0, 0.01, 0.21)), 0.268, 0.024), m2, OUT * 0.5)
    elif kind == 'flamehair':   # 머리가 불꽃
        fm = _accent('flame', '#ff7a2a', rough=0.3, emit='#ff6a1a', es=0.9)
        fy = _accent('flamey', '#ffd34d', rough=0.3, emit='#ffb020', es=1.1)
        for k, (x, y, r, L, tilt) in enumerate(((0, -0.03, 0.11, 0.3, 0), (-0.13, 0.05, 0.09, 0.22, 16), (0.13, 0.05, 0.09, 0.22, -16), (0, 0.13, 0.085, 0.2, 0), (-0.07, -0.12, 0.07, 0.15, 10), (0.07, -0.12, 0.07, 0.15, -10))):
            d = Vector((math.sin(math.radians(-tilt)), 0.12, 1)).normalized()
            p = TOP + Vector((x, y, -0.05))
            out.append(C.mesh_obj(f'fh{k}', C.cone(p + d * L * 0.5, r, 0.0, L, seg=8, rot=C.look_rot(d)), fm, coll, smooth=False))
        out.append(C.mesh_obj('fh_core', C.cone(TOP + Vector((0, -0.09, 0.05)), 0.06, 0.0, 0.16, seg=6), fy, coll, smooth=False))
    elif kind == 'wreath':   # 꽃 화관
        o('wr', C.torus(HEAD_C + Vector((0, 0.01, 0.2)), 0.285, 0.036, rot=Euler((math.radians(-8), 0, 0))), m2, OUT * 0.5)
        fl = _accent('flower', col, rough=0.5)
        ce = _accent('flowerc', '#ffd34d', rough=0.5)
        for k in range(7):
            a = -math.pi * 0.9 + k * (math.pi * 1.8 / 6)
            p = HEAD_C + Vector((math.sin(a) * 0.29, -math.cos(a) * 0.29, 0.2 + 0.035 * math.cos(a)))
            o(f'wf{k}', C.ellipsoid(p, (0.062, 0.062, 0.045), seg=10, rings=6), fl, OUT * 0.5)
            out.append(C.mesh_obj(f'wfc{k}', C.ellipsoid(p + Vector((0, 0, 0.034)), (0.026, 0.026, 0.018), seg=8, rings=5), ce, coll))
    elif kind == 'aviator':   # 가죽 비행모 + 귀덮개
        out.append(_shell(C.mesh_obj('avi', _dome(HEAD_C + Vector((0, 0.03, 0.03)), (HEAD_R[0] * 1.07, HEAD_R[1] * 1.08, HEAD_R[2] * 1.04), cut_z=HEAD_C.z - 0.16, cut_face=HEAD_C.z + 0.2), m1, coll, outline=OUT), 0.016))
        o('avi_rim', C.torus(HEAD_C + Vector((0, -0.01, 0.21)), 0.268, 0.022, rot=Euler((math.radians(-6), 0, 0))), m2, OUT * 0.4)
    elif kind == 'coral':   # 산호 가지
        cm = _accent('coralm', col, rough=0.55)
        for sx, x, tall in ((-1, -0.17, 0.22), (1, 0.17, 0.25), (1, 0.03, 0.17)):
            b = HEAD_C + Vector((x, 0.0, 0.26))
            pts = spline([b, b + Vector((sx * 0.02, 0, tall * 0.5)), b + Vector((sx * 0.07, 0.01, tall))], 8)
            o(f'co{x}', C.tube(pts, interp([0.042, 0.03, 0.012], len(pts)), seg=7), cm, OUT * 0.5)
            pt2 = spline([pts[4], pts[4] + Vector((sx * 0.08, 0, 0.03)), pts[4] + Vector((sx * 0.12, 0, 0.09))], 6)
            o(f'cob{x}', C.tube(pt2, interp([0.024, 0.016, 0.006], len(pt2)), seg=6), cm, OUT * 0.4)
    elif kind in ('antlers', 'worldtree'):
        bark = _accent('bark', col2, rough=0.7)
        for sx in (-1, 1):
            b = HEAD_C + Vector((sx * 0.14, 0.03, 0.26))
            pts = spline([b, b + Vector((sx * 0.07, 0.0, 0.1)), b + Vector((sx * 0.2, 0.02, 0.2))], 9)
            o(f'ant{sx}', C.tube(pts, interp([0.036, 0.026, 0.008], len(pts)), seg=7), bark, OUT * 0.6)
            for i, (dx, dz) in ((3, (0.0, 0.1)), (6, (0.1, 0.03))):
                pt2 = spline([pts[i], pts[i] + Vector((sx * dx * 0.5, 0, dz * 0.6)), pts[i] + Vector((sx * dx, 0.0, dz))], 5)
                o(f'antb{sx}{i}', C.tube(pt2, interp([0.02, 0.014, 0.005], len(pt2)), seg=6), bark, OUT * 0.45)
            if kind == 'worldtree':   # 가지 끝에 빛나는 잎
                lm = _accent('wtleaf', col, rough=0.4, emit=col, es=0.8)
                for k, (tip, deg) in enumerate(((pts[-1], 30), (pts[6] + Vector((sx * 0.1, 0, 0.03)), 0), (pts[3] + Vector((0, 0, 0.1)), 60))):
                    out.append(_feather(f'wtl{sx}{k}', tip, (sx * math.cos(math.radians(deg)), 0.05, math.sin(math.radians(deg))), 0.15, lm, coll, width=0.8, outline=OUT * 0.35))
    elif kind == 'tophat':
        o('th_brim', C.ellipsoid(HEAD_C + Vector((0, 0.01, 0.23)), (0.33, 0.31, 0.022)))
        o('th_top', C.tube([HEAD_C + Vector((0, 0.01, 0.23)), HEAD_C + Vector((0, 0.01, 0.46))], [0.17, 0.195], seg=14))
        o('th_lid', C.ellipsoid(HEAD_C + Vector((0, 0.01, 0.46)), (0.195, 0.195, 0.012), seg=14, rings=5))
        o('th_band', C.tube([HEAD_C + Vector((0, 0.01, 0.255)), HEAD_C + Vector((0, 0.01, 0.31))], [0.176, 0.183], seg=14, caps=False), m2, 0)
    elif kind == 'winghelm':   # 날개 투구
        out.append(_shell(C.mesh_obj('wh', _dome(HEAD_C + Vector((0, 0.01, 0.06)), (HEAD_R[0] * 1.06, HEAD_R[1] * 1.08, HEAD_R[2] * 0.98), cut_z=HEAD_C.z + 0.19), metal, coll, outline=OUT), 0.018))
        o('wh_rim', C.torus(HEAD_C + Vector((0, 0.01, 0.2)), 0.292, 0.024), gold, OUT * 0.5)
        wm = _accent('whw', '#f4f7ff', rough=0.5)
        for sx in (-1, 1):
            for k, deg in enumerate((22, 48, 74)):
                d = Vector((sx * math.cos(math.radians(deg)), 0.18, math.sin(math.radians(deg))))
                out.append(_feather(f'whf{sx}{k}', HEAD_C + Vector((sx * 0.26, 0.02, 0.22)), d, 0.25 - k * 0.02, wm, coll, width=0.42))
    elif kind == 'icecrown':
        ice = _accent('ice', col, rough=0.08, emit=col, es=0.9)
        o('ic_band', C.torus(HEAD_C + Vector((0, 0.01, 0.2)), 0.276, 0.024), m2, OUT * 0.5)
        for k in range(7):
            a = -math.pi * 0.85 + k * (math.pi * 1.7 / 6)
            L = 0.27 if k == 3 else (0.2 if k in (2, 4) else 0.14)
            p = HEAD_C + Vector((math.sin(a) * 0.27, -math.cos(a) * 0.27, 0.2))
            d = Vector((math.sin(a) * 0.2, -math.cos(a) * 0.2, 1)).normalized()
            out.append(C.mesh_obj(f'ic{k}', C.cone(p + d * L * 0.5, 0.05, 0.0, L, seg=4, rot=C.look_rot(d)), ice, coll, smooth=False, outline=OUT * 0.45))
    elif kind == 'kabuto':   # 초승달 투구
        out.append(_shell(C.mesh_obj('kb', _dome(HEAD_C + Vector((0, 0.01, 0.06)), (HEAD_R[0] * 1.06, HEAD_R[1] * 1.08, HEAD_R[2] * 0.98), cut_z=HEAD_C.z + 0.19), metal, coll, outline=OUT), 0.018))
        for sx in (-1, 1):   # 옆으로 젖힌 귀덮개
            out.append(_feather(f'kbf{sx}', HEAD_C + Vector((sx * 0.25, 0.03, 0.2)), (sx * 0.95, 0.15, -0.3), 0.22, _accent('kb2', col2, rough=0.35, metal=0.5), coll, width=0.72))
        pts = [HEAD_C + Vector((math.sin(a) * 0.19, -0.29, 0.25 + (1 - math.cos(a)) * 0.2)) for a in [math.radians(-70 + 140 * k / 12) for k in range(13)]]
        o('kb_moon', C.tube(pts, interp([0.006, 0.026, 0.006], len(pts)), seg=7), gold, OUT * 0.4)
    elif kind == 'plume':   # 깃털 머리띠 — 매
        o('pl_band', C.torus(HEAD_C + Vector((0, 0.01, 0.2)), 0.275, 0.028, rot=Euler((math.radians(-6), 0, 0))), m2, OUT * 0.5)
        fm = _accent('plf', col, rough=0.55)
        fm2 = _accent('plf2', '#fff4dc', rough=0.55)
        for k in range(7):
            a = math.radians(-54 + k * 18)
            d = Vector((math.sin(a) * 0.82, 0.46, math.cos(a))).normalized()
            out.append(_feather(f'plf{k}', HEAD_C + Vector((math.sin(a) * 0.19, 0.17, 0.25)), d, 0.3 - abs(k - 3) * 0.03, fm if k % 2 else fm2, coll, width=0.4))
    elif kind == 'tricorn':   # 해군 삼각모
        bm = C.ellipsoid(HEAD_C + Vector((0, 0.02, 0.215)), (0.42, 0.37, 0.024), seg=30, rings=10)
        for v in bm.verts:
            a = math.atan2(v.co.x, -(v.co.y - HEAD_C.y - 0.02))
            rr = Vector((v.co.x, v.co.y - HEAD_C.y - 0.02, 0)).length / 0.42
            v.co.z += 0.15 * max(0.0, (1 - math.cos(3 * a + math.pi * 0.0)) / 2) * rr * rr
        o('tc_brim', bm)
        o('tc_top', C.ellipsoid(HEAD_C + Vector((0, 0.02, 0.27)), (0.225, 0.215, 0.1), seg=14, rings=8))
        o('tc_gem', C.ellipsoid(HEAD_C + Vector((0, -0.215, 0.285)), (0.035, 0.015, 0.035), seg=10, rings=6), gold, OUT * 0.4)
    elif kind == 'horncrown':   # 뿔 왕관
        o('hc_ring', C.tube([HEAD_C + Vector((0, 0.01, 0.195)), HEAD_C + Vector((0, 0.01, 0.285))], [0.25, 0.265], seg=14, caps=False), gold, OUT * 0.7)
        hm = _accent('hcm', col2, rough=0.4)
        for sx in (-1, 1):
            out.append(_horn(f'hc_horn{sx}', HEAD_C + Vector((sx * 0.21, 0.01, 0.24)), sx, hm, coll, rise=0.28, out=0.2, r=0.062))
        o('hc_gem', C.ellipsoid(HEAD_C + Vector((0, -0.262, 0.255)), (0.04, 0.016, 0.042), seg=10, rings=6), _accent('hcg', col, rough=0.1, emit=col, es=1.4), OUT * 0.4)
    elif kind == 'sunburst':   # 머리 뒤 해살
        rm = _accent('ray', col, rough=0.3, emit=col, es=0.35)
        o('sb_disc', C.ellipsoid(HEAD_C + Vector((0, 0.13, 0.02)), (0.31, 0.03, 0.31), seg=18, rings=10), rm, OUT * 0.4)
        for k in range(11):
            a = math.radians(-120 + k * 24)
            d = Vector((math.sin(a), 0.0, math.cos(a)))
            L = 0.2 if k % 2 else 0.14
            p = HEAD_C + Vector((0, 0.13, 0.02)) + d * (0.3 + L * 0.45)
            out.append(C.mesh_obj(f'sb{k}', C.cone(p, 0.05, 0.0, L, seg=4, rot=C.look_rot(d)), rm, coll, smooth=False, outline=OUT * 0.4))
    elif kind == 'hornhood':   # 뿔 달린 두건
        bm = C.ellipsoid(HEAD_C + Vector((0, 0.04, 0.02)), (HEAD_R[0] * 1.08, HEAD_R[1] * 1.1, HEAD_R[2] * 1.06), seg=16, rings=10)
        for v in [v for v in bm.verts if v.co.y < HEAD_C.y - 0.13 and v.co.z < HEAD_C.z + 0.22]:
            bm.verts.remove(v)
        out.append(_shell(C.mesh_obj('hh', bm, m1, coll, outline=OUT), 0.02))
        hm = _accent('hhm', col2, rough=0.4, emit=col2, es=0.4)
        for sx in (-1, 1):
            out.append(_horn(f'hh_h{sx}', HEAD_C + Vector((sx * 0.2, 0.03, 0.27)), sx, hm, coll, rise=0.22, out=0.13, r=0.05))
    return out


def over_new(kind, cfg, coll):
    """모자 위에 하나 더 — 깃털 · 후광 · 귀 지느러미"""
    out = []
    col = cfg.get('over_color', '#f2c232')
    if kind == 'feather':   # 모자 옆에 꽂은 깃털
        m = _accent('ovf', col, rough=0.55)
        out.append(_feather('ovf', HEAD_C + Vector((0.2, 0.08, 0.2)), (0.32, 0.32, 1), 0.34, m, coll, width=0.4))
    elif kind == 'halo':
        m = _accent('halo', col, rough=0.2, emit=col, es=0.7)
        out.append(C.mesh_obj('halo', C.torus(TOP + Vector((0, 0.03, 0.16)), 0.2, 0.024, rot=Euler((math.radians(-12), 0, 0))), m, coll, outline=OUT * 0.4))
    elif kind == 'finears':   # 지느러미 귀
        m = _accent('fine', col, rough=0.35)
        for sx in (-1, 1):
            for k, deg in enumerate((12, 36)):
                out.append(_feather(f'fine{sx}{k}', HEAD_C + Vector((sx * 0.27, 0.05, 0.12 + k * 0.05)), (sx * math.cos(math.radians(deg)), 0.32, math.sin(math.radians(deg))), 0.27 - k * 0.04, m, coll, width=0.55))
    return out


# ── 얼굴 ── 모두 head 뼈. 앞니 · 눈동자는 가리지 않는다(비버다움의 중심)
def face_new(kind, cfg, coll):
    out = []
    col = cfg.get('face_color', '#3a2a1e')
    m = _accent('fc', col, rough=0.4)

    def eye(sx):
        return C.on_ellipsoid(HEAD_C, HEAD_R, Vector((sx * EYE_DIR[0], EYE_DIR[1], EYE_DIR[2])), egg=0.12)

    if kind in ('glasses', 'sunglasses', 'monocle'):
        for sx in ((-1,) if kind == 'monocle' else (-1, 1)):
            p, n = eye(sx)
            out.append(C.mesh_obj(f'rim{sx}', C.torus(p + n * 0.045, 0.104, 0.013, seg=22, ring=6, rot=C.look_rot(n)), m, coll, outline=OUT * 0.3))
            if kind == 'sunglasses':
                out.append(C.mesh_obj(f'lens{sx}', C.ellipsoid(p + n * 0.05, (0.1, 0.1, 0.012), rot=C.look_rot(n), seg=18, rings=8), _accent('shade', '#1a1a24', rough=0.08, metal=0.3), coll))
        if kind != 'monocle':
            a, b = eye(-1)[0] + eye(-1)[1] * 0.05 + Vector((0.09, 0, 0.01)), eye(1)[0] + eye(1)[1] * 0.05 + Vector((-0.09, 0, 0.01))
            out.append(C.mesh_obj('bridge', C.tube([a, (a + b) / 2 + Vector((0, -0.012, 0.012)), b], 0.012, seg=6), m, coll))
        else:   # 외알 안경 줄
            p, n = eye(-1)
            s = p + n * 0.045 + Vector((-0.08, 0, -0.07))
            out.append(C.mesh_obj('chain', C.tube(spline([s, s + Vector((-0.04, 0.03, -0.09)), s + Vector((-0.04, 0.06, -0.2))], 6), 0.006, seg=5), _accent('gold', '#f2c232', rough=0.25, metal=0.85), coll))
    elif kind == 'eyepatch':
        p, n = eye(-1)
        out.append(C.mesh_obj('patch', C.ellipsoid(p + n * 0.05, (0.11, 0.115, 0.022), rot=C.look_rot(n), seg=14, rings=8), m, coll, outline=OUT * 0.4))
        pts = [HEAD_C + Vector((math.cos(a) * 0.315, math.sin(a) * 0.29, 0.13 + (a - math.radians(-120)) * -0.0)) for a in [math.radians(-120 + 300 * k / 24) for k in range(25)]]
        out.append(C.mesh_obj('strap', C.tube(pts, 0.012, seg=5), m, coll))
    elif kind == 'mustache':
        for sx in (-1, 1):
            pts = spline([HEAD_C + Vector((0, -0.335, -0.035)), HEAD_C + Vector((sx * 0.11, -0.335, -0.075)), HEAD_C + Vector((sx * 0.21, -0.27, -0.045)), HEAD_C + Vector((sx * 0.27, -0.21, 0.03))], 12)
            out.append(C.mesh_obj(f'mu{sx}', C.tube(pts, interp([0.03, 0.04, 0.025, 0.006], len(pts)), seg=8), m, coll, outline=OUT * 0.5))
    elif kind == 'beard':   # 흰 수염 — 앞니 뒤로
        bm = C.ellipsoid(HEAD_C + Vector((0, -0.2, -0.235)), (0.22, 0.09, 0.15), egg=-0.25, seg=12, rings=8)
        out.append(C.mesh_obj('beard', bm, m, coll, smooth=False, outline=OUT * 0.7))
        out.append(C.mesh_obj('beardt', C.cone(HEAD_C + Vector((0, -0.21, -0.42)), 0.11, 0.0, 0.17, seg=7, rot=Euler((math.pi, 0, 0))), m, coll, smooth=False, outline=OUT * 0.5))
    elif kind == 'goggles':   # 이마에 올린 보안경
        band = _accent('gband', '#3a2a1e', rough=0.6)
        out.append(C.mesh_obj('gband', C.torus(HEAD_C + Vector((0, 0.0, 0.205)), 0.277, 0.024, rot=Euler((math.radians(-6), 0, 0))), band, coll, outline=OUT * 0.4))
        for sx in (-1, 1):
            p, n = C.on_ellipsoid(HEAD_C, HEAD_R, Vector((sx * 0.3, -0.85, 0.76)), egg=0.12)
            out.append(C.mesh_obj(f'gring{sx}', C.torus(p + n * 0.035, 0.074, 0.02, seg=18, ring=6, rot=C.look_rot(n)), m, coll, outline=OUT * 0.4))
            out.append(C.mesh_obj(f'glens{sx}', C.ellipsoid(p + n * 0.035, (0.066, 0.066, 0.012), rot=C.look_rot(n), seg=14, rings=6), _accent('glens', cfg.get('lens', '#7fe3ff'), rough=0.05, emit=cfg.get('lens', '#7fe3ff'), es=0.8), coll))
    elif kind == 'warpaint':
        for sx in (-1, 1):
            for k in (0, 1):
                p, n = C.on_ellipsoid(HEAD_C, HEAD_R, Vector((sx * 0.92, -0.72, 0.1 - k * 0.26)), egg=0.12)
                out.append(C.mesh_obj(f'wp{sx}{k}', C.ellipsoid(p, (0.1, 0.028, 0.012), rot=C.look_rot(n), seg=10, rings=5), m, coll))
    elif kind == 'mask':   # 눈 둘레 어두운 무늬(암살 · 어둠)
        for sx in (-1, 1):
            p, n = eye(sx)
            out.append(C.mesh_obj(f'mk{sx}', C.ellipsoid(p - n * 0.016, (0.142, 0.13, 0.03), rot=C.look_rot(n), seg=14, rings=8), m, coll))
    return out


# ── 등 ── 모두 body 뼈
def back_new(kind, cfg, coll):
    out = []
    col = cfg.get('back_color', '#8a5a2b')
    col2 = cfg.get('back_color2', '#5a3a1e')
    m = _accent('bk1', col, rough=0.6)
    m2 = _accent('bk2', col2, rough=0.55)

    def o(name, bm, mat=m, outline=OUT):
        out.append(C.mesh_obj(name, bm, mat, coll, outline=outline))

    if kind == 'pack':   # 봇짐 + 말아 올린 이불
        o('pk', C.box(Vector((0, 0.33, 0.34)), (0.38, 0.2, 0.36), bevel=0.04), m)
        o('pkflap', C.box(Vector((0, 0.34, 0.47)), (0.4, 0.22, 0.09), bevel=0.03), m2, OUT * 0.6)
        o('pkroll', C.tube([Vector((-0.23, 0.33, 0.58)), Vector((0.23, 0.33, 0.58))], 0.075, seg=10), m2, OUT * 0.7)
    elif kind == 'quiver':
        a, b = Vector((0.16, 0.33, 0.14)), Vector((-0.16, 0.36, 0.6))
        o('qv', C.tube([a, a.lerp(b, 0.5), b], [0.07, 0.085, 0.085], seg=10), m)
        o('qvrim', C.torus(b, 0.086, 0.016, seg=14, ring=6, rot=C.look_rot(b - a)), m2, OUT * 0.4)
        fl = _accent('qvf', cfg.get('fletch', '#f4f0e0'), rough=0.6)
        d = (b - a).normalized()
        for k, off in enumerate((Vector((-0.04, 0, 0)), Vector((0.04, 0.0, 0.0)), Vector((0, -0.03, 0.02)))):
            s = b + off
            e = s + d * (0.22 + k * 0.02)
            o(f'qa{k}', C.tube([s, e], 0.009, seg=5), m2, 0)
            out.append(_feather(f'qaf{k}', e - d * 0.09, d, 0.14, fl, coll, width=0.55, outline=OUT * 0.3))
    elif kind in ('wings', 'firewings', 'leafwings'):
        L = cfg.get('wing_len', 0.46)
        if kind == 'firewings':
            ma, mb = _accent('fw', '#ff5a1a', rough=0.3, emit='#ff4a10', es=0.7), _accent('fw2', '#ffb030', rough=0.3, emit='#ff9a10', es=0.8)
        elif kind == 'leafwings':
            ma, mb = _accent('lw', col, rough=0.55), _accent('lw2', col2, rough=0.55)
        else:
            glow = cfg.get('wing_glow', 0.0)
            ma, mb = _accent('wg', col, rough=0.5, emit=col if glow else None, es=glow), _accent('wg2', col2, rough=0.5, emit=col2 if glow else None, es=glow)
        for sx in (-1, 1):
            root = Vector((sx * 0.13, 0.27, 0.42))
            for k, deg in enumerate((86, 62, 40, 18, -4)):
                d = Vector((sx * math.cos(math.radians(deg)), 0.24, math.sin(math.radians(deg))))
                length = L * (0.82 + 0.28 * math.sin(math.radians(deg + 30))) * (1.38 if sx > 0 else 1.0)   # 3/4 화면에서 먼 쪽(+X) 날개는 몸에 가려 길게
                out.append(_feather(f'wf{sx}{k}', root, d, length, ma if k % 2 else mb, coll, width=0.36, outline=OUT * 0.4))
    elif kind == 'shell':   # 등껍질
        bm = C.ellipsoid(Vector((0, 0.17, 0.32)), (0.37, 0.25, 0.33), seg=14, rings=9)
        for v in [v for v in bm.verts if v.co.y < 0.08]:
            bm.verts.remove(v)
        out.append(_shell(C.mesh_obj('shell', bm, m, coll, smooth=False, outline=OUT), 0.03))
        for k, (dx, dz) in enumerate(((0, 0.6), (0.62, 0.3), (-0.62, 0.3), (0, 0.0), (0.62, -0.36), (-0.62, -0.36), (0, -0.62))):
            p, n = C.on_ellipsoid(Vector((0, 0.17, 0.32)), (0.37, 0.25, 0.33), Vector((dx, 0.9, dz)))
            out.append(C.mesh_obj(f'scute{k}', C.ellipsoid(p, (0.09, 0.09, 0.016), rot=C.look_rot(n), seg=6, rings=4), m2, coll, smooth=False, outline=OUT * 0.3))
    elif kind == 'orbs':   # 몸 둘레에 뜬 구슬
        gm = _accent('orbk', col, rough=0.08, emit=col, es=0.7)
        for k, (x, y, z, r) in enumerate(((-0.5, 0.12, 0.66, 0.062), (0.52, 0.16, 0.5, 0.078), (0.43, 0.24, 0.98, 0.05))):
            o(f'orbk{k}', C.ellipsoid(Vector((x, y, z)), (r, r, r), seg=14, rings=9), gm, OUT * 0.4)
    elif kind == 'gear':   # 등에 멘 큰 톱니바퀴
        c0 = Vector((0, 0.33, 0.42))
        o('gr', C.tube([c0 + Vector((0, -0.035, 0)), c0 + Vector((0, 0.035, 0))], 0.3, seg=20), m)
        o('grh', C.tube([c0 + Vector((0, 0.03, 0)), c0 + Vector((0, 0.05, 0))], 0.11, seg=12), m2, OUT * 0.5)
        for k in range(10):
            a = 2 * math.pi * k / 10
            p = c0 + Vector((math.cos(a) * 0.32, 0, math.sin(a) * 0.32))
            o(f'grt{k}', C.box(p, (0.1, 0.07, 0.08), rot=Euler((0, -a, 0))), m, OUT * 0.6)
    elif kind == 'fin':   # 등지느러미 돛
        bm = bmesh.new()
        prof = [(0.12, 0.74), (0.3, 0.86), (0.42, 0.66), (0.5, 0.42), (0.5, 0.18), (0.3, 0.3), (0.2, 0.5)]
        vs = [bm.verts.new((0.0, y, z)) for y, z in prof]
        bm.faces.new(vs)
        bm.normal_update()
        f = C.mesh_obj('fin', bm, m, coll, smooth=False)
        s = f.modifiers.new('solid', 'SOLIDIFY'); s.thickness = 0.03
        C.add_outline(f, OUT * 0.6)
        out.append(f)
    elif kind == 'banner':   # 등에 꽂은 깃발
        o('bn_pole', C.tube([Vector((0.16, 0.31, 0.1)), Vector((0.2, 0.34, 1.12))], 0.016, seg=6), m2, OUT * 0.5)
        bm = bmesh.new()
        vs = [bm.verts.new((0.2, 0.34, 1.1)), bm.verts.new((0.56, 0.36, 1.0)), bm.verts.new((0.2, 0.34, 0.86))]
        bm.faces.new(vs)
        bm.normal_update()
        f = C.mesh_obj('bn_flag', bm, m, coll, smooth=False)
        s = f.modifiers.new('solid', 'SOLIDIFY'); s.thickness = 0.016
        C.add_outline(f, OUT * 0.5)
        out.append(f)
    elif kind == 'leafcape':   # 잎 망토
        ma, mb = _accent('lc', col, rough=0.6), _accent('lc2', col2, rough=0.6)
        for r, (z, n, sp) in enumerate(((0.52, 5, 0.28), (0.34, 6, 0.3), (0.2, 5, 0.28))):
            for k in range(n):
                x = (k - (n - 1) / 2) / max(1, n - 1) * 2 * sp
                base = Vector((x, 0.3 - abs(x) * 0.32, z))
                out.append(_feather(f'lcf{r}{k}', base, (x * 0.5, 0.22, -1), 0.28, ma if (k + r) % 2 else mb, coll, width=0.7, outline=OUT * 0.4))
    elif kind == 'stars':   # 등 뒤 별 셋
        gm = _accent('stark', col, rough=0.2, emit=col, es=0.8)
        for k, (x, y, z, r) in enumerate(((-0.47, 0.2, 0.88, 0.075), (0.5, 0.2, 0.72, 0.09), (0.0, 0.3, 1.12, 0.058))):
            for a in range(4):
                d = Vector((math.cos(a * math.pi / 2 + 0.3), 0.0, math.sin(a * math.pi / 2 + 0.3)))
                out.append(C.mesh_obj(f'st{k}{a}', C.cone(Vector((x, y, z)) + d * r * 0.8, r * 0.45, 0.0, r * 1.6, seg=4, rot=C.look_rot(d)), gm, coll, smooth=False, outline=OUT * 0.25))
    return out


# ── 꼬리 ── tail 뼈
def tail_new(kind, cfg, coll):
    out = []
    tip = Vector((0, 0.6, 0.11))
    if kind == 'ember':   # 꼬리 끝 불꽃
        fm = _accent('tflame', '#ff7a2a', rough=0.3, emit='#ff6a1a', es=0.9)
        fy = _accent('tflamey', '#ffd34d', rough=0.3, emit='#ffb020', es=1.1)
        for k, (x, r, L) in enumerate(((0.0, 0.1, 0.32), (-0.1, 0.07, 0.2), (0.1, 0.07, 0.2))):
            d = Vector((x * 0.7, 0.18, 1)).normalized()
            out.append(C.mesh_obj(f'tf{k}', C.cone(tip + Vector((x, -0.03, 0.02)) + d * L * 0.5, r, 0.0, L, seg=7, rot=C.look_rot(d)), fm, coll, smooth=False))
        out.append(C.mesh_obj('tfc', C.cone(tip + Vector((0, -0.04, 0.09)), 0.05, 0.0, 0.15, seg=6), fy, coll, smooth=False))
    elif kind == 'fish':   # 물고기 꼬리
        m = _accent('tfish', cfg.get('tail_color', '#3ac8d8'), rough=0.3)
        for sx in (-1, 1):
            out.append(_feather(f'tfs{sx}', tip + Vector((0, -0.05, 0.02)), (sx * 0.75, 0.55, 0.32), 0.34, m, coll, width=0.7))
    elif kind == 'bands':   # 꼬리 가로 띠 — 주인공
        m = _accent('tband', cfg.get('tail_color', '#f8e0b0'), rough=0.85)
        for k, (y, w) in enumerate(((0.36, 0.115), (0.46, 0.125), (0.56, 0.095))):
            out.append(C.mesh_obj(f'tb{k}', C.ellipsoid(Vector((0, y, 0.058 + (y - 0.42) * 0.25)), (w, 0.024, 0.031), rot=Euler((math.radians(-14), 0, 0)), seg=10, rings=5), m, coll, smooth=False))
    return out


def belt(color, coll):
    m = _accent('blt', color, rough=0.5)
    out = [C.mesh_obj('blt', C.torus(Vector((0, 0.0, 0.215)), 0.298, 0.028, seg=22, ring=6, rot=Euler((math.radians(4), 0, 0))), m, coll, outline=OUT * 0.5)]
    out.append(C.mesh_obj('blt_b', C.box(Vector((0, -0.3, 0.2)), (0.09, 0.03, 0.08), bevel=0.01), _accent('gold', '#f2c232', rough=0.25, metal=0.85), coll, outline=OUT * 0.4))
    out.append(C.mesh_obj('blt_p', C.ellipsoid(Vector((-0.27, -0.14, 0.15)), (0.06, 0.05, 0.07), seg=8, rings=5), m, coll, smooth=False, outline=OUT * 0.5))
    return out


def marks(cfg, coll):
    """몸에 난 특징 (주인공 · 2026-11-03) — 옷 · 장식이 아니라 털이라 '무기 말고 아무것도 없게'(2026-10-19)를 지킨다.
    (뼈, 조각) 목록을 돌려준다. 머리 곡선을 따르는 이마 흰 줄 · 머리 꼭대기 털 뭉치"""
    out = []
    kind = cfg.get('marks')
    if kind != 'hero':
        return out
    wm = _accent('blaze', cfg.get('mark_color', '#fff6e2'), rough=0.9)
    for k, up in enumerate((0.14, 0.42, 0.72, 1.05)):
        p, n = C.on_ellipsoid(HEAD_C, HEAD_R, Vector((0, -1, up)), egg=0.12)
        w = (0.05, 0.062, 0.07, 0.06)[k]
        out.append(('head', C.mesh_obj(f'blaze{k}', C.ellipsoid(p, (w, 0.075, 0.014), rot=C.look_rot(n), seg=8, rings=5), wm, coll, smooth=False)))
    tm = _accent('tuft', cfg.get('dark', '#6a4228'), rough=0.9)
    for k, (x, y, lean, L, r) in enumerate(((0.0, -0.03, -0.22, 0.17, 0.052), (-0.06, 0.02, -0.34, 0.13, 0.042), (0.06, 0.02, 0.12, 0.13, 0.042))):
        d = Vector((lean * 0.7 if k else 0.0, 0.3 if k == 0 else lean, 1)).normalized()
        out.append(('head', C.mesh_obj(f'tuft{k}', C.cone(TOP + Vector((x, y, -0.012)) + d * L * 0.5, r, 0.0, L, seg=6, rot=C.look_rot(d)), tm, coll, smooth=False, outline=OUT * 0.6)))
    return out


def dress(add, cfg, coll):
    """build() 끝에서 부른다 — cfg 에 없는 키는 아무것도 짓지 않아 옛 동료 · 몬스터 그림은 그대로"""
    for b, o in marks(cfg, coll):
        add(b, o)
    if cfg.get('over'):
        for o in over_new(cfg['over'], cfg, coll):
            add('head', o)
    if cfg.get('face'):
        for o in face_new(cfg['face'], cfg, coll):
            add('head', o)
    if cfg.get('back'):
        for o in back_new(cfg['back'], cfg, coll):
            add('body', o)
    if cfg.get('tail_fx'):
        for o in tail_new(cfg['tail_fx'], cfg, coll):
            add('tail', o)
    if cfg.get('belt'):
        for o in belt(cfg['belt'], coll):
            add('body', o)
