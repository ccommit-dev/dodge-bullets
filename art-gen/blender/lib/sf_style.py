"""비버 풍 처리 (2026-11-25, 사용자: "전반적인 아트 풍이 일정했으면 좋겠어" → 기준 = 비버 그림체).

남의 3D 모델(Sketchfab)은 텍스처에 털결 · 돌결 · 그라데이션이 그려져 있어, 셀 재질(lib/toon)을 입혀도 비버(납작한 2~3단 색 ·
굵은 갈색 외곽선)보다 사실적으로 보였다. 렌더 전에 재질 색을 비버 쪽으로 끌어온다.
  · flatten — 이미지 텍스처마다 흐리게 한 뒤 몇 가지 색(k-means)으로 줄여 넓은 색 면만 남긴다(눈 · 무늬 같은 큰 면은 남는다)
  · 팔레트 — 줄인 색(과 텍스처 없는 재질 색)의 채도 · 밝기를 비버 그림 범위 안으로(형광 · 거의 검정 · 회색 흙빛을 막는다)
  · 부드러운 법선 — 털 뭉치 · 돌 면 같은 잔 굴곡이 셀 계단(lib/toon, 법선 각도)을 잘게 쪼갰다. 매끈하게 민 복제본의 법선을 옮겨(DataTransfer
    custom normal) 빛 · 그늘이 비버처럼 큰 면으로 갈린다. 실루엣(정점 위치)은 그대로 — 애니메이션 모델은 복제본도 같은 뼈로 움직인다
비버 쪽 외곽선 굵기는 부르는 쪽(sketchfab_monsters INK_W · sf_rig)이 맞춘다."""
import colorsys
import numpy as np
import bpy

K = 5                  # 텍스처 한 장의 색 수
SAT = (0.18, 0.78)     # 채도 범위 — 비버 털 갈색 0.45~0.6 · 옷 원색 0.7 안팎
VAL = (0.22, 0.95)     # 밝기 범위 — 외곽선(#3b2415, V 0.23)보다 어둡지 않게(어두운 몸이 선에 묻히지 않게)
MAX_SIDE = 512         # 줄인 텍스처 크기(더 크면 줄여서 처리 — 어차피 스프라이트는 작다)


def harmonize(rgb):
    """선형이 아닌 sRGB 0~1 색 하나 → 채도 · 밝기를 범위 안으로"""
    h, s, v = colorsys.rgb_to_hsv(*rgb)
    s = min(max(s, SAT[0] if s > 0.08 else s), SAT[1])   # 원래 회색(흰 털 · 은)은 그대로 회색
    v = min(max(v, VAL[0]), VAL[1])
    return colorsys.hsv_to_rgb(h, s, v)


def _blur(a, r):
    """상자 흐림(가로 · 세로 따로) — 털 · 돌 잔결을 지운다"""
    if r < 1:
        return a
    k = 2 * r + 1
    for axis in (0, 1):
        pad = [(0, 0)] * a.ndim
        pad[axis] = (r, r)
        p = np.pad(a, pad, mode='edge')
        c = np.cumsum(p, axis=axis, dtype=np.float64)
        c = np.concatenate([np.zeros_like(np.take(c, [0], axis=axis)), c], axis=axis)
        a = (np.take(c, range(k, c.shape[axis]), axis=axis) - np.take(c, range(0, c.shape[axis] - k), axis=axis)) / k
    return a.astype(np.float32)


def _mode(lab, k, r):
    """색 번호 지도의 다수결(반지름 r 상자) — 가는 털결 · 돌결(폭 < r)은 둘레 색에 먹히고 점 · 문양 같은 넓은 면은 남는다"""
    votes = np.stack([_blur((lab == j).astype(np.float32), r) for j in range(k)], axis=-1)
    return votes.argmax(-1)


MERGE = 0.16   # 이보다 가까운 두 색(RGB 거리)은 한 색 — 같은 털의 짙은 · 옅은 결이 얼룩무늬로 갈렸다(늑대인간)


def _merge(cent, x):
    """가까운 색 묶음을 하나로(많은 쪽 무게) — 다른 색(눈 · 입 · 무늬)은 멀어서 남는다"""
    lab = ((x[:, None, :] - cent[None]) ** 2).sum(-1).argmin(1)
    cnt = np.bincount(lab, minlength=len(cent)).astype(np.float64)
    cent = [c for c in cent]
    cnt = list(cnt)
    while len(cent) > 2:
        best = None
        for i in range(len(cent)):
            for j in range(i + 1, len(cent)):
                d = float(np.sqrt(((cent[i] - cent[j]) ** 2).sum()))
                if d < MERGE and (best is None or d < best[0]):
                    best = (d, i, j)
        if not best:
            break
        _, i, j = best
        w = cnt[i] + cnt[j]
        cent[i] = (cent[i] * cnt[i] + cent[j] * cnt[j]) / max(w, 1)
        cnt[i] = w
        del cent[j], cnt[j]
    return np.array(cent, dtype=np.float32)


def _kmeans(x, k, iters=12, seed=7):
    rng = np.random.default_rng(seed)
    k = min(k, len(x))
    # 시작점: 밝기 순으로 고르게(무작위보다 매번 같은 결과)
    order = np.argsort(x.sum(1))
    cent = x[order[np.linspace(0, len(x) - 1, k).astype(int)]].copy()
    for _ in range(iters):
        d = ((x[:, None, :] - cent[None, :, :]) ** 2).sum(-1)
        lab = d.argmin(1)
        for j in range(k):
            m = lab == j
            cent[j] = x[m].mean(0) if m.any() else x[rng.integers(len(x))]
    return cent


def _flat_image(img):
    w, h = img.size
    if not w or not h:
        return None
    a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    step = max(1, int(round(max(w, h) / MAX_SIDE)))
    a = a[::step, ::step].copy()
    rgb = _blur(a[..., :3], max(1, int(a.shape[1] / 200)))   # 살짝만 — 큰 흐림은 버섯 점 · 방패 문양까지 지웠다(잔결은 아래 다수결이 지운다)
    sample = rgb[a[..., 3] > 0.5].reshape(-1, 3)
    if len(sample) < 16:
        return None
    if len(sample) > 60000:
        sample = sample[np.random.default_rng(3).choice(len(sample), 60000, replace=False)]
    cent = _merge(_kmeans(sample, K), sample)
    cent = np.array([harmonize(tuple(c)) for c in np.clip(cent, 0, 1)], dtype=np.float32)
    flat = rgb.reshape(-1, 3)
    lab = np.concatenate([((flat[i:i + 65536, None, :] - cent[None]) ** 2).sum(-1).argmin(1) for i in range(0, len(flat), 65536)])
    lab = _mode(lab.reshape(a.shape[0], a.shape[1]), len(cent), max(2, int(a.shape[1] / 96)))   # 512px 이면 반지름 5 — 8 은 오리 방패 문양을 지웠다
    out = np.concatenate([cent[lab], a[..., 3:4]], axis=-1)
    new = bpy.data.images.new(img.name + '.flat', a.shape[1], a.shape[0], alpha=True)
    new.colorspace_settings.name = img.colorspace_settings.name
    new.pixels.foreach_set(out.ravel())
    new.pack()
    return new


def smooth_normals(objs, repeat=24):
    """매끈한 복제본(Smooth 모디파이어)의 법선을 원본에 옮긴다 — 셀 계단이 큰 면으로. 원본 모디파이어 순서: 뼈(armature) → 법선 옮기기 → (부르는 쪽이 붙이는) 외곽선"""
    for o in [o for o in objs if o.type == 'MESH' and len(o.data.polygons) > 40]:
        proxy = o.copy()
        proxy.data = o.data.copy()
        for c in o.users_collection:
            c.objects.link(proxy)
        proxy.name = o.name + '.smooth'
        sm = proxy.modifiers.new('smooth', 'SMOOTH')
        sm.factor, sm.iterations = 1.0, repeat
        proxy.hide_render = True
        proxy.visible_camera = False
        dt = o.modifiers.new('soft_normals', 'DATA_TRANSFER')
        dt.object = proxy
        dt.use_loop_data = True
        dt.data_types_loops = {'CUSTOM_NORMAL'}
        dt.loop_mapping = 'POLYINTERP_NEAREST'
        dt.mix_factor = 0.85
        dt.use_object_transform = False   # 복제본과 원본은 같은 로컬 공간 — 원본만 부모(돌림)를 따라가도 짝이 맞는다


def apply(objs):
    """메시들의 재질 색을 비버 쪽으로 — 이미지 텍스처는 납작한 색 면으로, 값 색은 팔레트 범위로. 같은 재질 · 이미지는 한 번만"""
    mats, done = set(), {}
    for o in objs:
        if o.type == 'MESH':
            mats.update(m for m in o.data.materials if m and m.use_nodes and not m.name.startswith('ink_outline'))
    for m in mats:
        for n in m.node_tree.nodes:
            if n.type == 'TEX_IMAGE' and n.image and n.image.colorspace_settings.name.lower().startswith('srgb'):
                if n.image.name not in done:
                    done[n.image.name] = _flat_image(n.image)
                if done[n.image.name] is not None:
                    n.image = done[n.image.name]
            elif n.type == 'BSDF_PRINCIPLED':
                bc = n.inputs['Base Color']
                if not bc.is_linked:
                    lin = tuple(bc.default_value[:3])
                    srgb = tuple(c ** (1 / 2.2) for c in lin)
                    out = harmonize(srgb)
                    bc.default_value = (*(c ** 2.2 for c in out), bc.default_value[3])
    smooth_normals(objs)
    return len(done)
