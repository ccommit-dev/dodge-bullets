"""동물 옷 스킨 (2026-11-19, 사용자 참고 그림 — 몸 전체를 감싸는 동물 옷을 입은 캐릭터) — hero_skins.py 의 cfg['suit'].
두건은 beaver.hat('hood')가 짓는다(얼굴은 열어 둔다). 여기서는 그 위에 동물 귀 · 눈 · 뿔 · 볏, 몸통 옷(배 판 · 단추),
꼬리 덮개를 붙인다. 몸 · 뼈 · 자세는 기본 주인공 그대로(입는 파츠 앵커 · 무기 손잡이가 같다).
모양은 우리 세계(비버) 것으로 — 참고 그림의 캐릭터를 옮기지 않는다:
  dragon 흑룡(굽은 뿔 둘 · 등 가시 · 꼬리 가시) / chick 새벽 병아리(볏 · 부리 챙 · 작은 날개) /
  fox 여우(큰 세모 귀 · 흰 귀 안 · 흰 끝 꼬리) / bunny 눈토끼(긴 귀 · 솜 꼬리 · 눈송이 단추)
  상점 동료 넷(2026-11-26, 사용자: "동료들 캐릭터랑 풍 비슷한 리소스로" — Sketchfab 동물 대신 비버 동료와 같은 몸에 옷):
  cat 고양이(작은 세모 귀 · 길고 가는 꼬리) / duck 오리(넓적한 부리 챙 · 꽁지깃 — 볏 없음) / squirrel 다람쥐(작은 귀 · 크게 말린 털 꼬리)
돌려주는 것: [(뼈 이름, 물체)]"""
import math
from mathutils import Vector, Euler

from lib import bcommon as C
from lib.beaver import HEAD_C, HEAD_R, BODY_C, BODY_R, HAND_L, HAND_R, OUT, _accent, _shell, spline, interp

TOP = HEAD_C + Vector((0, 0.04, HEAD_R[2] * 1.06 + 0.02))


def _ear(name, base, d, L, r, m_out, m_in, coll, flat=0.45):
    """세모 귀 — 바깥은 옷 색, 안쪽 판은 밝은 색(앞쪽 −Y 를 본다)"""
    d = Vector(d).normalized()
    rot = C.look_rot(d)
    out = [C.mesh_obj(name, C.cone(base + d * L * 0.5, r, 0.0, L, seg=10, rot=rot), m_out, coll, outline=OUT * 0.8)]
    o = out[0]
    for v in o.data.vertices:   # 앞뒤로 눌러 납작한 귀
        rel = v.co - base
        v.co = base + Vector((rel.x, rel.y * flat, rel.z))
    inner = C.cone(base + d * L * 0.42 + Vector((0, -r * flat * 0.55, 0)), r * 0.62, 0.0, L * 0.72, seg=10, rot=rot)
    oi = C.mesh_obj(name + '_in', inner, m_in, coll)
    for v in oi.data.vertices:
        rel = v.co - base
        v.co = base + Vector((rel.x, rel.y * flat * 0.5 - r * flat * 0.6, rel.z))
    out.append(oi)
    return out



def _extras(kind, cfg, m, ml, ma, coll):
    """상점 동료 넷의 특색(2026-11-26, 사용자: "조금 더 특색 있는 모델") — 같은 비버 몸 · 옷 위에 종마다 한눈에 갈리는 소품. cfg suit_extras 일 때만(주인공 스킨은 그대로)"""
    out = []
    face = HEAD_C + Vector((0, -HEAD_R[1] * 0.86, -0.07))   # 주둥이 둘레(볼) 높이
    neck = Vector((0, BODY_C.y - 0.01, HEAD_C.z - HEAD_R[2] * 0.86))
    if kind == 'cat':
        ink = _accent('whisker', '#2a1e1a', rough=0.6)
        for sx in (-1, 1):   # 수염 셋 — 볼에서 바깥으로 살짝 퍼진다
            for k, dz in enumerate((0.03, 0.0, -0.03)):
                a = face + Vector((sx * 0.1, -0.02, dz))
                b = a + Vector((sx * 0.17, 0.03, dz * 1.6))
                out.append(('head', C.mesh_obj(f'whisker{sx}{k}', C.tube([a, b], 0.006, seg=5), ink, coll)))
        out.append(('body', C.mesh_obj('collar', C.torus(neck, 0.21, 0.025, seg=36), _accent('collar', '#d8403a', rough=0.5), coll, outline=OUT * 0.5)))
        bell = neck + Vector((0, -0.21, -0.03))
        out.append(('body', C.mesh_obj('bell', C.ellipsoid(bell, (0.045, 0.045, 0.045)), _accent('bell', '#f2c232', rough=0.3, metal=0.7), coll, outline=OUT * 0.5)))
        pad = _accent('pad', '#ffb0c4', rough=0.6)
        for side, hp in (('L', HAND_L), ('R', HAND_R)):   # 큰 앞발 장갑 + 분홍 젤리
            out.append((f'hand.{side}', C.mesh_obj(f'mitt{side}', C.ellipsoid(hp + Vector((0, -0.01, 0)), (0.085, 0.08, 0.08)), ml, coll, outline=OUT * 0.7)))
            out.append((f'hand.{side}', C.mesh_obj(f'mittpad{side}', C.ellipsoid(hp + Vector((0, -0.08, -0.005)), (0.04, 0.012, 0.035)), pad, coll)))
    elif kind == 'duck':
        top = TOP + Vector((0, 0.02, 0.0))
        for k in range(3):   # 기사 깃털 장식 — 정수리에서 뒤로 넘어가는 붉은 깃 셋
            pts = spline([top + Vector(((k - 1) * 0.03, 0, -0.02)), top + Vector(((k - 1) * 0.04, 0.08, 0.12)), top + Vector(((k - 1) * 0.06, 0.2, 0.16))], 10)
            out.append(('head', C.mesh_obj(f'plume{k}', C.tube(pts, interp([0.035, 0.04, 0.012], len(pts)), seg=10), _accent('plume', '#d8403a', rough=0.6), coll, outline=OUT * 0.6)))
        web = _accent('web', '#ff9a3d', rough=0.5)
        for sx, side in ((-1, 'R'), (1, 'L')):   # 주황 물갈퀴 발
            out.append((f'leg.{side}', C.mesh_obj(f'web{side}', C.ellipsoid(Vector((sx * 0.15, -0.12, 0.024)), (0.11, 0.14, 0.032)), web, coll, outline=OUT * 0.7)))
    elif kind == 'squirrel':
        nut = TOP + Vector((0.0, 0.02, 0.06))   # 두건 꼭대기 도토리
        out.append(('head', C.mesh_obj('hood_acorn', C.ellipsoid(nut, (0.06, 0.06, 0.075), egg=-0.3), _accent('nut', '#c8783a', rough=0.45), coll, outline=OUT * 0.6)))
        out.append(('head', C.mesh_obj('hood_acorn_cap', C.ellipsoid(nut + Vector((0, 0, 0.05)), (0.068, 0.068, 0.035)), _accent('cap', '#7a4a26', rough=0.7), coll, outline=OUT * 0.5)))
        for sx in (-1, 1):   # 볼주머니 — 도토리를 문 통통한 볼
            out.append(('head', C.mesh_obj(f'pouch{sx}', C.ellipsoid(face + Vector((sx * 0.13, 0.02, -0.01)), (0.07, 0.05, 0.055)), ml, coll, outline=OUT * 0.4)))
    elif kind == 'bunny':
        flower = TOP + Vector((-0.16, -0.02, 0.02))   # 귀 밑동 꽃 한 송이
        petal = _accent('petal', '#ff9ab8', rough=0.6)
        for k in range(5):
            a = 2 * math.pi * k / 5
            out.append(('head', C.mesh_obj(f'petal{k}', C.ellipsoid(flower + Vector((math.cos(a) * 0.035, -0.01, math.sin(a) * 0.035)), (0.025, 0.01, 0.025)), petal, coll, outline=OUT * 0.3)))
        out.append(('head', C.mesh_obj('petal_core', C.ellipsoid(flower + Vector((0, -0.02, 0)), (0.018, 0.01, 0.018)), _accent('core', '#ffd34d', rough=0.5), coll)))
        blush = _accent('blush', '#ffb0c4', rough=0.7)
        for sx in (-1, 1):
            out.append(('head', C.mesh_obj(f'blush{sx}', C.ellipsoid(face + Vector((sx * 0.15, -0.005, 0.02)), (0.04, 0.008, 0.025)), blush, coll)))
    return out


def build(cfg, coll):
    kind = cfg.get('suit')
    if not kind:
        return []
    col = cfg.get('hat_color', '#6a4aa8')
    light = cfg.get('suit_light', '#f6efe0')
    acc = cfg.get('suit_accent', '#ffd34d')
    m = _accent('suit', col, rough=0.6)
    ml = _accent('suitl', light, rough=0.7)
    ma = _accent('suita', acc, rough=0.4)
    out = []
    # 두건 — 머리보다 조금 큰 껍질에서 얼굴 쪽 타원 구멍(눈 · 볼 · 입이 다 보이게)을 뚫는다. beaver.hat('hood')는 구멍이 작아 눈썹을 덮었다
    hc, hr = HEAD_C + Vector((0, 0.03, 0.02)), (HEAD_R[0] * 1.09, HEAD_R[1] * 1.1, HEAD_R[2] * 1.07)
    hb = C.ellipsoid(hc, hr, seg=72, rings=44)   # 촘촘하게 — 28×18 은 얼굴 구멍 가장자리가 계단처럼 깨졌다
    for v in [v for v in hb.verts if ((v.co - hc).normalized().y < -0.2 and ((v.co.x - hc.x) / (hr[0] * 0.86)) ** 2 + ((v.co.z - (hc.z - 0.02)) / (hr[2] * 0.8)) ** 2 < 1.0)]:
        hb.verts.remove(v)
    out.append(('head', _shell(C.mesh_obj('suit_hood', hb, m, coll, outline=OUT), 0.022)))
    # 몸통 옷 — 몸보다 조금 큰 껍질 + 앞 배 판(밝은 색) + 단추 둘
    bm = C.ellipsoid(BODY_C + Vector((0, 0.005, 0.01)), (BODY_R[0] * 1.13, BODY_R[1] * 1.13, BODY_R[2] * 1.06), egg=0.1, seg=24, rings=16)
    out.append(('body', _shell(C.mesh_obj('suit_body', bm, m, coll, outline=OUT), 0.012)))
    p, n = C.on_ellipsoid(BODY_C, (BODY_R[0] * 1.13, BODY_R[1] * 1.13, BODY_R[2] * 1.06), Vector((0, -1, -0.05)))
    # 배 판 — 납작한 원반은 몸 밖으로 접시처럼 튀어나왔다(3/4 화면). 몸 안에 묻은 타원체를 앞쪽만 살짝 내민다(creature 배와 같은 방식)
    out.append(('body', C.mesh_obj('suit_belly', C.ellipsoid(BODY_C + Vector((0, -BODY_R[1] * 0.5, -0.01)), (BODY_R[0] * 0.82, BODY_R[1] * 0.7, BODY_R[2] * 0.82)), ml, coll, outline=OUT * 0.4)))
    for k, z in enumerate((0.07, -0.03)):
        bp, bn = C.on_ellipsoid(BODY_C, (BODY_R[0] * 1.13, BODY_R[1] * 1.13, BODY_R[2] * 1.06), Vector((0, -1, z * 4)))
        if kind == 'bunny':   # 눈송이 단추 — 여섯 갈래 납작 막대
            for a in range(3):
                out.append(('body', C.mesh_obj(f'suit_snow{k}{a}', C.box(bp + bn * 0.03, (0.05, 0.008, 0.012), rot=Euler((0, math.radians(60 * a), 0))), ma, coll)))
        else:
            out.append(('body', C.mesh_obj(f'suit_btn{k}', C.ellipsoid(bp + bn * 0.028, (0.022, 0.022, 0.012), rot=C.look_rot(bn)), ma, coll, outline=OUT * 0.3)))
    if kind == 'dragon':
        horn = _accent('suith', cfg.get('hat_color2', '#c9b8ff'), rough=0.35)
        for sx in (-1, 1):
            base = TOP + Vector((sx * 0.2, 0.0, -0.06))
            pts = spline([base, base + Vector((sx * 0.08, 0.04, 0.1)), base + Vector((sx * 0.17, 0.12, 0.13))], 10)
            out.append(('head', C.mesh_obj(f'suit_horn{sx}', C.tube(pts, interp([0.05, 0.034, 0.006], len(pts)), seg=12), horn, coll, outline=OUT * 0.7)))
        for k in range(4):   # 두건 뒤에서 등으로 내려가는 가시
            t = k / 3
            d = Vector((0, 1, 0.9 - t * 1.4)).normalized()
            if k < 2:
                pp, nn = C.on_ellipsoid(HEAD_C + Vector((0, 0.04, 0.02)), (HEAD_R[0] * 1.08, HEAD_R[1] * 1.1, HEAD_R[2] * 1.06), d)
                bone = 'head'
            else:
                pp, nn = C.on_ellipsoid(BODY_C, (BODY_R[0] * 1.13, BODY_R[1] * 1.13, BODY_R[2] * 1.06), Vector((0, 1, 0.6 - (k - 2) * 0.8)))
                bone = 'body'
            out.append((bone, C.mesh_obj(f'suit_spike{k}', C.cone(pp + nn * 0.03, 0.045 - t * 0.01, 0.0, 0.1 - t * 0.02, seg=6, rot=C.look_rot(nn)), horn, coll, smooth=False, outline=OUT * 0.5)))
    elif kind == 'chick':
        out.append(('head', C.mesh_obj('suit_comb', C.ellipsoid(TOP + Vector((0, 0.0, 0.02)), (0.03, 0.09, 0.07)), ma, coll, outline=OUT * 0.6)))
        for k, (dy, dz) in enumerate(((-0.07, 0.0), (0.06, -0.01))):
            out.append(('head', C.mesh_obj(f'suit_comb{k}', C.ellipsoid(TOP + Vector((0, dy, dz)), (0.025, 0.05, 0.05)), ma, coll, outline=OUT * 0.5)))
        # 이마 위 작은 부리 챙(두건 앞 가장자리)
        bp, bn = C.on_ellipsoid(HEAD_C + Vector((0, 0.04, 0.02)), (HEAD_R[0] * 1.08, HEAD_R[1] * 1.1, HEAD_R[2] * 1.06), Vector((0, -1, 0.95)))
        out.append(('head', C.mesh_obj('suit_beak', C.cone(bp + bn * 0.03, 0.06, 0.0, 0.08, seg=8, rot=C.look_rot(bn + Vector((0, 0, -0.3)))), _accent('suitbk', '#ff9a3d', rough=0.4), coll, outline=OUT * 0.6)))
    elif kind == 'fox':
        for sx in (-1, 1):
            out.extend(('head', o) for o in _ear(f'suit_ear{sx}', TOP + Vector((sx * 0.2, 0.0, -0.08)), (sx * 0.42, 0.05, 1), 0.24, 0.1, m, ml, coll))
    elif kind == 'cat':
        for sx in (-1, 1):
            out.extend(('head', o) for o in _ear(f'suit_ear{sx}', TOP + Vector((sx * 0.19, 0.0, -0.07)), (sx * 0.32, 0.05, 1), 0.17, 0.085, m, ml, coll))
    elif kind == 'squirrel':
        for sx in (-1, 1):
            out.extend(('head', o) for o in _ear(f'suit_ear{sx}', TOP + Vector((sx * 0.17, 0.02, -0.06)), (sx * 0.22, 0.04, 1), 0.13, 0.075, m, ml, coll, flat=0.6))
    elif kind == 'duck':   # 넓적한 부리 챙 — 이마 위 두건 앞 가장자리에서 앞으로 납작하게
        bp, bn = C.on_ellipsoid(HEAD_C + Vector((0, 0.04, 0.02)), (HEAD_R[0] * 1.08, HEAD_R[1] * 1.1, HEAD_R[2] * 1.06), Vector((0, -1, 0.9)))
        out.append(('head', C.mesh_obj('suit_bill', C.ellipsoid(bp + bn * 0.05 + Vector((0, -0.03, -0.02)), (0.16, 0.1, 0.035), rot=Euler((math.radians(-18), 0, 0))), _accent('suitbk', '#ff9a3d', rough=0.4), coll, outline=OUT * 0.6)))
    elif kind == 'bunny':
        for sx in (-1, 1):
            base = TOP + Vector((sx * 0.12, 0.02, -0.04))
            pts = spline([base, base + Vector((sx * 0.06, 0.02, 0.16)), base + Vector((sx * 0.16, 0.08, 0.26))], 12)   # 끝이 옆으로 늘어진 긴 귀
            if cfg.get('suit_extras') and sx > 0:   # 상점 보니 — 한쪽 귀가 접혀 내려온다
                pts = spline([base, base + Vector((0.08, 0.02, 0.14)), base + Vector((0.22, 0.06, 0.1)), base + Vector((0.28, 0.08, -0.02))], 12)
            out.append(('head', C.mesh_obj(f'suit_ear{sx}', C.tube(pts, interp([0.06, 0.065, 0.04], len(pts)), seg=12), m, coll, outline=OUT * 0.8)))
            inner = [q + Vector((0, -0.035, 0)) for q in pts]
            out.append(('head', C.mesh_obj(f'suit_earin{sx}', C.tube(inner, interp([0.03, 0.035, 0.018], len(inner)), seg=10), _accent('suitpink', '#ffc4d6', rough=0.7), coll)))
    # 꼬리 덮개 — 여우는 흰 끝 털 뭉치, 토끼는 솜 뭉치, 용은 꼬리 가시, 병아리는 깃 셋
    tb = Vector((0, 0.3, 0.12))
    if kind == 'fox':
        pts = spline([tb, tb + Vector((0, 0.12, 0.06)), tb + Vector((0, 0.2, 0.2)), tb + Vector((0, 0.18, 0.34))], 14)
        out.append(('tail', C.mesh_obj('suit_tail', C.tube(pts, interp([0.06, 0.11, 0.1, 0.05], len(pts)), seg=14), m, coll, outline=OUT)))
        out.append(('tail', C.mesh_obj('suit_tailtip', C.ellipsoid(pts[-1] + Vector((0, -0.01, 0.02)), (0.07, 0.07, 0.08), egg=0.2), ml, coll, outline=OUT * 0.7)))
    elif kind == 'bunny':
        out.append(('tail', C.mesh_obj('suit_tail', C.ellipsoid(tb + Vector((0, 0.02, 0.06)), (0.09, 0.08, 0.09)), ml, coll, outline=OUT * 0.7)))
    elif kind == 'cat':   # 길고 가는 꼬리 — 뒤로 뻗었다 위로 휘고 끝이 밝다
        pts = spline([tb, tb + Vector((0, 0.14, 0.02)), tb + Vector((0.02, 0.24, 0.16)), tb + Vector((0.03, 0.22, 0.32)), tb + Vector((0.02, 0.14, 0.4))], 16)
        out.append(('tail', C.mesh_obj('suit_tail', C.tube(pts, interp([0.045, 0.04, 0.036, 0.034], len(pts)), seg=12), m, coll, outline=OUT)))
        out.append(('tail', C.mesh_obj('suit_tailtip', C.ellipsoid(pts[-1], (0.045, 0.045, 0.05)), ml, coll, outline=OUT * 0.6)))
    elif kind == 'squirrel':   # 크게 말린 털 꼬리 — 등을 따라 머리 높이까지 S 자로, 굵다
        pts = spline([tb, tb + Vector((0, 0.14, 0.04)), tb + Vector((0, 0.3, 0.22)), tb + Vector((0, 0.34, 0.48)), tb + Vector((0, 0.24, 0.7)), tb + Vector((0, 0.12, 0.74))], 22)   # 머리 높이까지 — 낮으면 3/4 화면에서 몸 뒤에 숨었다
        out.append(('tail', C.mesh_obj('suit_tail', C.tube(pts, interp([0.07, 0.14, 0.18, 0.17, 0.13, 0.07], len(pts)), seg=16), m, coll, outline=OUT)))
        out.append(('tail', C.mesh_obj('suit_tailin', C.tube([q + Vector((0, -0.06, 0)) for q in pts[5:18]], interp([0.06, 0.1, 0.07], 13), seg=12), ml, coll)))
    elif kind in ('chick', 'duck'):
        for k in range(3):
            d = Vector(((k - 1) * 0.5, 1, 0.6)).normalized()
            out.append(('tail', C.mesh_obj(f'suit_tf{k}', C.ellipsoid(tb + d * 0.08, (0.03, 0.08, 0.03), rot=C.look_rot(d)), m, coll, outline=OUT * 0.5)))
    if cfg.get('suit_extras'):
        out.extend(_extras(kind, cfg, m, ml, ma, coll))
    return out
