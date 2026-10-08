"""
로컬 SDXL 원화 생성기 — dodge-bullets 아트 파이프라인.

  python gen.py smoke                       # 설치 확인: SDXL 1장
  python gen.py sample                      # 화풍 앵커 샘플 4장 (art-gen/out/sample-*.png)
  python gen.py char <id> "<prompt>" [--pose-from <base>] [--seed N]
                                            # 동료 4상태 (idle/run/attack/hit) — 포즈는 base 동료의 아틀라스 셀에서 OpenPose 추출
  python gen.py hero "<prompt>" [--seed N]  # 영웅 idle 4 + attack 4 (기존 프레임 포즈 유지)
  python gen.py costume <id> "<prompt>"     # 영웅 코스튬: 기본 시트 프레임을 img2img (포즈 유지)
  python gen.py boss <file> "<prompt>"      # 보스 피격/처치 포즈: img2img 2장
  python gen.py cover <id> "<prompt>"       # 비트 곡 커버 1장 (정사각)
  python gen.py icon <id> "<prompt>"        # 보상 아이콘 1장 (256px 투명, 참조 = public/ui/attendance)

화풍 앵커: IP-Adapter(plus, ViT-H)에 기본 동료 6명의 idle 셀을 참조로 넣는다. 프롬프트·시드는 STYLE에 고정.
배경 제거: rembg(isnet-general-use). 출력은 art-gen/out/, 배치는 node scripts/place-art.mjs가 담당.
"""
from __future__ import annotations
import argparse, os, sys, json, glob
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "out"
REF = ROOT / "ref"
os.environ.setdefault("HF_HOME", str(ROOT / "hf-cache"))
os.environ.setdefault("HF_HUB_ENABLE_HF_TRANSFER", "0")
# 16GB에서 8명 연속 생성 시 단편화로 OOM(여유 3GB인데 40MB 할당 실패) — 확장 세그먼트 할당자로 회피
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")

import torch
from PIL import Image

# Windows 콘솔(cp949)에서 유니코드 출력이 UnicodeEncodeError로 프로세스를 죽였다(ember 이후 중단 원인) — stdout을 utf-8로
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
CONTROLNET = "thibaud/controlnet-openpose-sdxl-1.0"
IPA_REPO = "h94/IP-Adapter"

# 화풍 앵커 — 기본 동료 아틀라스(사실적 판타지 원화, 세필 페인팅, 전신, 투명 배경) 기준
STYLE = (
    "full body fantasy character concept art, painterly semi-realistic anime style, detailed armor and cloth, "
    "dynamic lighting, clean silhouette, plain white background, no text, no watermark, single character, centered"
)
NEG = (
    "lowres, blurry, deformed, extra limbs, extra fingers, bad anatomy, cropped, text, watermark, logo, frame, "
    "multiple characters, chibi, flat vector, clipart, photo, 3d render, background scenery"
)
BASE_SEED = 20260904

# ── 테마 (2026-10-07, "비버 키우기: 방치형 비트 디펜스" 리소스 전면 개편) ──
# ARTGEN_THEME=beaver: 노션 콘셉트(art-gen/ref/beaver)의 치비 3D 장난감 렌더 화풍. 참조는 ARTGEN_REFS(쉼표 경로) 로 명시
THEME = os.environ.get("ARTGEN_THEME", "")
BEAVER_LOOK = (
    "cute chibi anthropomorphic beaver, big round sparkling eyes, rosy cheeks, two front teeth, flat paddle tail, "
    "3D toy render look, soft rounded shapes, glossy highlights, vibrant saturated colors, warm wood and bright blue water palette"
)
if THEME == "beaver":
    STYLE = (
        "full body cute chibi mobile game character, 3D toy render look, soft rounded shapes, glossy highlights, "
        "vibrant saturated colors, clean silhouette, plain white background, no text, no watermark, single character, centered"
    )
    NEG = (
        "lowres, blurry, deformed, extra limbs, bad anatomy, cropped, text, watermark, logo, frame, multiple characters, "
        "realistic human, photo, dark gritty, scary, background scenery"
    )
    STATE_PROMPT = {
        "idle": "standing relaxed idle pose, facing viewer slightly to the right, cheerful",
        "run": "mid-stride running pose, facing right, cheerful",
        "attack": "lunging forward striking attack pose, facing right, swinging weapon",
        "hit": "knocked back flinching surprised pose, off balance",
    }

# ARTGEN_CHROMA=magenta|green (2026-10-07, pixcel-studio/NX Pixel 방식): 단색 키 배경으로 생성하고 rembg 대신
# scripts/chroma-cut.mjs(키 거리 분류 + 테두리 소프트 언믹스)로 오려낸다 — isnet 이 남기던 반투명 띠·배경 조각이 없다.
# 프롬프트의 "plain white background" 는 모듈 끝에서 키 배경 문구로 바뀐다(스타일 상수가 그 뒤에 정의되므로).
CHROMA = os.environ.get("ARTGEN_CHROMA", "")
CHROMA_BG = {"magenta": "solid flat pure magenta background (#ff00ff)", "green": "solid flat pure green background (#00ff00)"}


def chroma_cutout(im: Image.Image) -> Image.Image:
    import subprocess
    OUT.mkdir(parents=True, exist_ok=True)
    tmp, res = OUT / "_chroma-in.png", OUT / "_chroma-out.png"
    im.convert("RGBA").save(tmp)
    r = subprocess.run(["node", str(ROOT.parent / "scripts" / "chroma-cut.mjs"), str(tmp), str(res), CHROMA], capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        raise RuntimeError("chroma-cut 실패: " + (r.stderr or r.stdout)[-400:])
    print("chroma", r.stdout.strip()[:160])
    return Image.open(res).convert("RGBA").copy()


def env_refs() -> list[Image.Image] | None:
    """ARTGEN_REFS=a.png,b.png — IP-Adapter 참조를 바꾼다 (없으면 None → 기본 참조)"""
    v = os.environ.get("ARTGEN_REFS", "")
    if not v:
        return None
    imgs = []
    for f in v.split(","):
        im = Image.open(f.strip()).convert("RGBA")
        bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
        bg.alpha_composite(im)
        imgs.append(bg.convert("RGB").resize((384, 384)))
    return imgs
STATE_PROMPT = {
    "idle": "standing relaxed idle pose, facing viewer slightly to the right",
    "run": "mid-stride running pose, facing right",
    "attack": "lunging forward striking attack pose, facing right, weapon swing",
    "hit": "knocked back flinching hit reaction pose, off balance",
}

_pipe = None
_pose = None
_session = None


import time

MIN_FREE_GB = 8.0


def wait_for_vram(min_free_gb: float = MIN_FREE_GB, max_wait_s: int = 7200):
    """다른 프로세스가 GPU를 쓰는 동안 대기 — 여유가 min_free_gb 이상일 때만 진행."""
    t0 = time.time()
    while True:
        free, total = torch.cuda.mem_get_info()
        if free / 2**30 >= min_free_gb:
            return
        if time.time() - t0 > max_wait_s:
            raise RuntimeError(f"VRAM 대기 시간 초과 (free {free/2**30:.1f} GiB)")
        print(f"[wait] free VRAM {free/2**30:.1f} GiB < {min_free_gb} - retry in 30s", flush=True)
        time.sleep(30)


def dev():
    assert torch.cuda.is_available(), "CUDA 불가 — torch cu128 설치 확인"
    return "cuda"


def load_pipe(controlnet: bool = False, img2img: bool = False, ip: bool = True):
    global _pipe
    from diffusers import (StableDiffusionXLPipeline, StableDiffusionXLControlNetPipeline, ControlNetModel,
                           StableDiffusionXLImg2ImgPipeline, DPMSolverMultistepScheduler)
    key = (controlnet, img2img, ip)
    if _pipe is not None and _pipe[0] == key:
        return _pipe[1]
    if _pipe is not None:
        # 다른 종류의 파이프라인으로 바꿀 때는 이전 것을 내려 VRAM을 돌려준다
        _pipe = None
        free_cache()
    wait_for_vram()
    kw = dict(torch_dtype=torch.float16, variant="fp16", use_safetensors=True)
    if controlnet:
        cn = ControlNetModel.from_pretrained(CONTROLNET, torch_dtype=torch.float16)
        pipe = StableDiffusionXLControlNetPipeline.from_pretrained(MODEL, controlnet=cn, **kw)
    elif img2img:
        pipe = StableDiffusionXLImg2ImgPipeline.from_pretrained(MODEL, **kw)
    else:
        pipe = StableDiffusionXLPipeline.from_pretrained(MODEL, **kw)
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, use_karras_sigmas=True)
    if ip:
        pipe.load_ip_adapter(IPA_REPO, subfolder="sdxl_models", weight_name="ip-adapter-plus_sdxl_vit-h.safetensors",
                             image_encoder_folder="models/image_encoder")
        pipe.set_ip_adapter_scale(0.55)
    # GPU를 다른 세션(auto-shorts-gen)과 나눠 쓴다 — CPU 오프로드는 Windows에서 사실상 멈춰서(1% util) 쓰지 않고,
    # 대신 wait_for_vram 가드로 여유가 있을 때만 GPU 상주 실행한다. VAE 슬라이싱/타일링으로 디코드 피크만 줄인다.
    pipe.to(dev())
    pipe.vae.enable_slicing()
    pipe.vae.enable_tiling()
    _pipe = (key, pipe)
    return pipe


def style_refs() -> list[Image.Image]:
    e = env_refs()
    if e:
        return e
    files = sorted(glob.glob(str(REF / "*-idle.png")))[:4]
    imgs = []
    for f in files:
        im = Image.open(f).convert("RGBA")
        bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
        bg.alpha_composite(im)
        imgs.append(bg.convert("RGB").resize((384, 384)))
    return imgs


def pose_of(path: Path) -> Image.Image:
    global _pose
    from controlnet_aux import OpenposeDetector
    if _pose is None:
        _pose = OpenposeDetector.from_pretrained("lllyasviel/Annotators")
    im = Image.open(path).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    bg.alpha_composite(im)
    return _pose(bg.convert("RGB"), hand_and_face=False, output_type="pil").resize((1024, 1024))


RAW = os.environ.get("ARTGEN_RAW", "")
# 2026-10-07: 기본은 pixcel-studio 위치 기반 매트(nx) — 배경 없는 참조(ARTGEN_REFS 에 우리 컷아웃)를 쓰면 흰 배경이 나오고
# 그 위에선 rembg 보다 테두리가 또렷하다(불투명 비율 .91 → .995). 배경이 흰색이 아니면(풍경이 나오면) rembg 로 **알리고** 내려간다.
# ARTGEN_CUT=rembg 로 예전 경로 강제.
CUT = os.environ.get("ARTGEN_CUT", "nx")


def nx_cutout(im: Image.Image) -> Image.Image:
    import subprocess
    OUT.mkdir(parents=True, exist_ok=True)
    tmp, res = OUT / "_nx-in.png", OUT / "_nx-out.png"
    im.convert("RGBA").save(tmp)
    r = subprocess.run(["node", str(ROOT.parent / "scripts" / "nx-cutout.mjs"), str(tmp), str(res)], capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        raise RuntimeError("nx-cutout 실패: " + (r.stderr or r.stdout)[-400:])
    print("nx-cutout", r.stdout.strip()[:160])
    return Image.open(res).convert("RGBA").copy()


def cutout(im: Image.Image) -> Image.Image:
    if RAW:
        OUT.mkdir(parents=True, exist_ok=True)
        im.convert("RGBA").save(OUT / "_last-raw.png")
    if CHROMA:
        return chroma_cutout(im)
    if CUT == "nx":
        try:
            return nx_cutout(im)
        except RuntimeError as e:
            print("WARN nx-cutout 거부(배경이 단색이 아님) → rembg:", str(e).splitlines()[-1][:120])
    global _session
    from rembg import remove, new_session
    if _session is None:
        _session = new_session("isnet-general-use")
    return remove(im, session=_session, alpha_matting=False)


def free_cache():
    torch.cuda.empty_cache()


def save(im: Image.Image, name: str) -> Path:
    free_cache()
    OUT.mkdir(parents=True, exist_ok=True)
    p = OUT / name
    im.save(p)
    print("saved", p.relative_to(ROOT))
    return p


def gen_txt(prompt: str, seed: int, pose: Image.Image | None = None, steps: int = 22, size=(1024, 1024), ip_scale=0.55, neg_extra: str = ""):
    pipe = load_pipe(controlnet=pose is not None)
    pipe.set_ip_adapter_scale(ip_scale)
    g = torch.Generator(dev()).manual_seed(seed)
    kwargs = dict(prompt=f"{prompt}, {STYLE}", negative_prompt=(NEG + ", " + neg_extra) if neg_extra else NEG, num_inference_steps=steps, guidance_scale=6.5,
                  generator=g, width=size[0], height=size[1], ip_adapter_image=[style_refs()])
    if pose is not None:
        kwargs.update(image=pose, controlnet_conditioning_scale=0.8)
    return pipe(**kwargs).images[0]


def gen_img2img(src: Image.Image, prompt: str, seed: int, strength: float, steps: int = 24, ip_scale=0.4):
    pipe = load_pipe(img2img=True)
    pipe.set_ip_adapter_scale(ip_scale)
    g = torch.Generator(dev()).manual_seed(seed)
    bg = Image.new("RGBA", src.size, (255, 255, 255, 255))
    bg.alpha_composite(src.convert("RGBA"))
    init = bg.convert("RGB").resize((1024, 1024))
    return pipe(prompt=f"{prompt}, {STYLE}", negative_prompt=NEG, image=init, strength=strength, num_inference_steps=steps,
                guidance_scale=6.0, generator=g, ip_adapter_image=[style_refs()]).images[0]


def cmd_smoke(a):
    pipe = load_pipe(ip=False)
    g = torch.Generator(dev()).manual_seed(1)
    im = pipe(prompt="a knight, " + STYLE, negative_prompt=NEG, num_inference_steps=20, generator=g).images[0]
    save(im, "smoke.png")


def cmd_sample(a):
    prompts = [
        "female paladin with silver plate armor and white cape, halo of light, holding a sword",
        "male lightning mage with goggles and yellow coat, sparks around hands",
        "female fire dragon knight with red scale armor, flame hair",
        "hooded male assassin in black leather with purple scarf, dual daggers",
    ]
    for i, p in enumerate(prompts):
        pose = pose_of(REF / ["garen", "leon", "ari", "nox"][i] + "-idle.png") if False else None
        im = gen_txt(p + ", " + STATE_PROMPT["idle"], BASE_SEED + i)
        save(cutout(im), f"sample-{i + 1}.png")


def cmd_char(a):
    base = a.pose_from or "garen"
    only = set(a.states.split(",")) if a.states else None
    for si, state in enumerate(["idle", "run", "attack", "hit"]):
        if only and state not in only:
            continue
        # --no-pose: ControlNet 없이 글로만 자세 (2026-10-07 — 비버 테마는 치비라 사람 골격이 안 맞고, ControlNet 은 이 GPU 에서 25배 느렸다)
        pose = None if getattr(a, "no_pose", False) else pose_of(REF / f"{base}-{state}.png")
        im = gen_txt(f"{a.prompt}, {STATE_PROMPT[state]}", (a.seed or BASE_SEED) + si * 7, pose=pose, ip_scale=a.ip if getattr(a, "ip", None) is not None else 0.55)
        save(cutout(im), f"char-{a.id}-{state}.png")


def cmd_hero(a):
    seed = a.seed or BASE_SEED
    for mode, n in (("idle", 4), ("attack", 4)):
        for i in range(n):
            pose = pose_of(REF / f"hero-{mode}-{i}.png")
            extra = "standing relaxed, facing viewer, empty hands" if mode == "idle" else "bare-handed punch attack pose, facing right, clenched fists, empty hands"
            # idle 4프레임은 같은 시드(호흡 편차만), attack은 프레임별 시드. 무기는 장비 오버레이가 그리므로 맨손으로 뽑는다
            im = gen_txt(f"{a.prompt}, {extra}", seed if mode == "idle" else seed + 11 + i, pose=pose, size=(832, 1216),
                         neg_extra="sword, weapon, blade, dagger, staff, holding object")
            save(cutout(im), f"hero-{mode}-{i}.png")


def cmd_costume(a):
    """코스튬 = 영웅과 같은 포즈(OpenPose)·같은 시드 계열로 새 의상을 그린다. img2img는 원본 튜닉이 남아 실패했다."""
    seed = a.seed or BASE_SEED
    for mode in ("idle", "attack"):
        for i in range(4):
            pose = pose_of(REF / f"hero-{mode}-{i}.png")
            extra = "standing relaxed, facing viewer, empty hands" if mode == "idle" else "bare-handed punch attack pose, facing right, clenched fists, empty hands"
            im = gen_txt(f"{a.prompt}, {extra}", seed if mode == "idle" else seed + 11 + i, pose=pose, size=(832, 1216),
                         neg_extra="sword, weapon, blade, dagger, staff, holding object")
            save(cutout(im), f"costume-{a.id}-{mode}-{i}.png")


def cmd_recolor(a):
    """고른 그림(투명 PNG)의 색만 바꾼다 — img2img, IP 참조 없이(참조가 털색을 다시 갈색으로 끌었다). 자세·의상·크기는 strength 가 낮을수록 유지.
    2026-10-08 동료 털색 구분용. 출력 art-gen/out/<out>.png (오려낸 뒤)"""
    src = Image.open(a.file).convert("RGBA")
    pipe = load_pipe(img2img=True)
    pipe.set_ip_adapter_scale(a.ip if a.ip is not None else 0.0)
    g = torch.Generator(dev()).manual_seed(a.seed or BASE_SEED)
    bg = Image.new("RGBA", src.size, (255, 255, 255, 255))
    bg.alpha_composite(src)
    init = bg.convert("RGB").resize((1024, 1024))
    im = pipe(prompt=f"{a.prompt}, {STYLE}", negative_prompt=NEG + ", brown fur, tan fur", image=init, strength=a.strength, num_inference_steps=26,
              guidance_scale=7.0, generator=g, ip_adapter_image=[style_refs()]).images[0]
    save(cutout(im), f"{a.out}.png")


def cmd_boss(a):
    src = Image.open(a.file).convert("RGBA")
    seed = a.seed or BASE_SEED
    hit = gen_img2img(src, f"{a.prompt}, recoiling from a heavy blow, staggered backwards, flinching, bright impact flash on body", seed, strength=0.45)
    save(cutout(hit), f"boss-{Path(a.file).stem}-hit.png")
    defeat = gen_img2img(src, f"{a.prompt}, collapsing defeated, falling over, cracked and crumbling body, fading", seed + 1, strength=0.55)
    save(cutout(defeat), f"boss-{Path(a.file).stem}-defeat.png")


NPC_STYLE = (
    "full body from head to feet, standing on the ground, whole figure visible with margin around it, "
    "fantasy mobile game character art, painterly semi-realistic, dramatic rim light, plain white background, no text, no watermark"
)
# monster 와 같은 취지지만 사람을 막지 않는다 — NPC 는 사람이다
NPC_NEG = (
    "cropped, cut off legs, cut off feet, cut off arms, out of frame, close-up, bust shot, portrait crop, waist up, zoomed in, "
    "text, letters, watermark, logo, blurry, lowres, multiple people, crowd, frame, border, background scenery, photo, 3d render"
)


def cmd_npc(a):
    """NPC 전신 1장 — 잘리지 않게 여백을 두고 뽑는다. 화풍 참조는 --ref. 출력 npc-<id>-s<seed>.png"""
    refs = [Image.open(x).convert("RGB").resize((384, 384)) for x in (a.ref.split(",") if a.ref else [])]
    pipe = load_pipe(ip=bool(refs))
    if refs:
        pipe.set_ip_adapter_scale(a.ip if a.ip is not None else 0.45)
    for seed in (a.seeds or [a.seed or BASE_SEED]):
        g = torch.Generator(dev()).manual_seed(seed)
        kw = {"ip_adapter_image": [refs]} if refs else {}
        im = pipe(prompt=f"{a.prompt}, {NPC_STYLE}", negative_prompt=NPC_NEG, num_inference_steps=28, guidance_scale=7.0,
                  generator=g, width=832, height=1216, **kw).images[0]
        save(cutout(im), f"npc-{a.id}-s{seed}.png")


ICON_STYLE = (
    "fantasy mobile game reward item icon, chibi painterly semi-realistic, glossy highlights, rim light, "
    "single object centered, large and readable, plain white background, no text, no watermark"
)
ICON_NEG = "text, letters, watermark, logo, blurry, lowres, multiple objects, character, person, frame, border, background scenery, photo, 3d render"
if THEME == "beaver":
    ICON_STYLE = (
        # 2026-10-07 사용자: "아이콘·UI 조금 더 아케이드 비버 키우기에 맞게" — 굵은 외곽선·단순 덩어리·셀 셰이딩의 아케이드 아이콘
        "bold arcade mobile game item icon, thick dark brown outline, chunky simplified rounded shape, flat cel shading with one glossy highlight, "
        "vivid saturated candy colors, wood and acorn accents, single object centered, large and readable, plain white background, no text, no watermark"
    )
    ICON_NEG = "text, letters, watermark, logo, blurry, lowres, multiple objects, character, person, frame, border, background scenery, photo, dark gritty"


def icon_refs() -> list[Image.Image]:
    """출석 보상 아이콘(public/ui/attendance)을 화풍 앵커로 — 같은 계열로 나와야 한 화면에 섞인다"""
    e = env_refs()
    if e:
        return e
    d = ROOT.parent / "public" / "ui" / "attendance"
    imgs = []
    for f in ["event-chest.png", "gold.png", "skill-orb.png", "enhance-stone.png"]:
        im = Image.open(d / f).convert("RGBA")
        bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
        bg.alpha_composite(im)
        imgs.append(bg.convert("RGB").resize((384, 384)))
    return imgs


def cmd_icon(a):
    """보상 아이콘 — IP-Adapter 참조는 동료가 아니라 기존 UI 아이콘. 출력 art-gen/out/icon-<id>.png (256px, 투명).
    --seeds 를 주면 파이프라인을 한 번만 올려 시드마다 icon-<id>-<seed>.png (2026-10-06, 스킬 아이콘 60장)"""
    pipe = load_pipe(ip=True)
    pipe.set_ip_adapter_scale(a.ip or 0.5)
    refs = icon_refs()
    seeds = a.seeds or [a.seed or BASE_SEED]
    for seed in seeds:
        name = f"icon-{a.id}-{seed}.png" if a.seeds else f"icon-{a.id}.png"
        if a.seeds and (OUT / name).exists():
            continue
        g = torch.Generator(dev()).manual_seed(seed)
        im = pipe(prompt=f"{a.prompt}, {ICON_STYLE}", negative_prompt=ICON_NEG, num_inference_steps=24, guidance_scale=6.5,
                  generator=g, width=1024, height=1024, ip_adapter_image=[refs]).images[0]
        save(cutout(im).resize((256, 256), Image.LANCZOS), name)


# CLIP 77토큰 한계: 자세 지시를 맨 앞에 두고 짧게 — 뒤에 붙는 STYLE 까지 합쳐 70토큰 안쪽 (긴 프롬프트는 뒷부분이 잘려 정면 캐릭터 시트가 나왔다)
HERO_IDLE_RIGHT = "three-quarter view facing right, looking right, ready stance, empty hands, one person"


def cmd_heroidle(a):
    """영웅 대기 1장 — 오른쪽(몬스터 쪽)을 보는 3/4 자세. --pose-from 으로 동료 아틀라스 셀의 OpenPose 를 줄 수 있다.
    base 는 시드 후보를 여러 장 뽑아 고르고, 코스튬(ember/frost)은 고른 시드·포즈로 같은 구도를 받는다. 출력 heroidle-<id>-<seed>.png"""
    pose = pose_of(Path(a.pose_from)) if a.pose_from else None
    for seed in (a.seeds or [a.seed or BASE_SEED]):
        im = gen_txt(f"{HERO_IDLE_RIGHT}, {a.prompt}", seed, pose=pose, size=(832, 1216), ip_scale=a.ip if a.ip is not None else 0.55,
                     neg_extra="weapon, sword, shield, back view, facing left, character sheet, multiple views")
        save(cutout(im), f"heroidle-{a.id}-{seed}{'-pose' if pose is not None else ''}.png")



def cmd_heroattack(a):
    """대기 원화와 **같은 인물**이 검을 든 공격 4프레임 (2026-09-28).
    화살 원정의 검격 시트(generated/hero-attack-sheet.png)는 남색 머리·파란 망토로 대기(갈색 머리·주황 코트)와 다른 사람이었다.
    정체성은 --ref(대기 원화)를 IP-Adapter 로, 포즈는 ref/hero-attack-{i} 의 OpenPose 로, 시드는 대기와 같은 값으로 고정한다.
    출력 heroattack-<id>-<i>.png"""
    im = Image.open(a.ref).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
    ref = bg.convert("RGB").resize((384, 384))
    seed = a.seed or BASE_SEED
    pipe = load_pipe(controlnet=not getattr(a, "no_pose", False))
    pipe.set_ip_adapter_scale(a.ip if a.ip is not None else 0.6)
    # --frames 1,2: 깨진 프레임만 다시(시드를 바꿔) · --tag: 출력 이름 뒤에 붙여 원본을 덮지 않는다
    frames = [int(x) for x in a.frames.split(",")] if getattr(a, "frames", None) else range(4)
    for i in frames:
        # --pose-set: 프레임별 자세 참조 이름 4개 (쉼표). 기본은 hero-attack-{i}. 활은 앞팔을 뻗은 자세(attack-1·3)가 활 팔과 맞는다
        pose_names = (a.pose_set.split(",") if getattr(a, "pose_set", None) else [f"hero-attack-{j}" for j in range(4)])
        pose = None if getattr(a, "no_pose", False) else pose_of(REF / f"{pose_names[i]}.png")
        g = torch.Generator(dev()).manual_seed(seed + (i if getattr(a, "no_pose", False) else 0))
        # --weapon (2026-10-01): 화살 원정은 활만 쓴다 — 검 대신 활을 당기거나 지팡이를 드는 자세.
        # 자세 참조(ref/hero-attack-{i})는 검 찌르기라 활 자세와 맞지 않으므로 --no-pose 로 ControlNet 을 끄고 IP-Adapter 만 쓴다.
        weapon = getattr(a, "weapon", "sword")
        action = ("drawing a large elven longbow fully, arrow nocked on the string, aiming to the right, both arms raised in archery stance"
                  if weapon == "bow" else
                  "holding one long wooden wizard staff with a glowing blue crystal on top, raising it forward, casting a spell, facing right, no bow"
                  if weapon == "staff" else
                  "energetically beating a wooden log drum with two drumsticks, facing right, drumsticks raised mid-strike, cheerful"
                  if weapon == "drum" else
                  "lunging sword slash attack pose, facing right, gripping a steel longsword")
        neg_extra = (", sword, blade, bow, bowstring, arrow" if weapon == "staff" else ", sword, blade") if weapon != "sword" else ""
        out = pipe(prompt=f"{a.prompt}, {action}, {STYLE}",
                   negative_prompt=NEG + ", back view, facing left, character sheet, multiple views, empty hands, bare hands" + neg_extra,
                   num_inference_steps=24, guidance_scale=6.5, generator=g, width=832, height=1216,
                   ip_adapter_image=[[ref]], **({} if pose is None else {"image": pose, "controlnet_conditioning_scale": (a.cn if getattr(a, "cn", None) is not None else 0.8)})).images[0]
        save(cutout(out), f"heroattack-{a.id}-{i}{('-' + a.tag) if getattr(a, 'tag', None) else ''}.png")


PROP_STYLE = (
    "single fantasy weapon, game item illustration, painterly semi-realistic, detailed metal and leather, "
    "held diagonally with the tip pointing to the upper right, centered, plain white background, no hands, no character, no text"
)
PROP_NEG = "hand, arm, person, character, text, letters, watermark, logo, blurry, lowres, multiple weapons, frame, border, background scenery, photo, 3d render"
if THEME == "beaver":
    PROP_STYLE = (
        "single cute game item, 3D toy render look, chunky rounded shape, glossy highlights, vibrant colors, "
        "held diagonally with the tip pointing to the upper right, centered, plain white background, no hands, no character, no text"
    )
    PROP_NEG = "hand, arm, person, character, animal, text, letters, watermark, logo, blurry, lowres, multiple objects, frame, border, background scenery, photo, dark gritty"


def cmd_prop(a):
    """무기·소품 1장 — 화풍 참조는 동료 원화(style_refs), 대각선(좌하→우상) 구도. 출력 prop-<id>.png (512px 투명)"""
    pipe = load_pipe(ip=True)
    pipe.set_ip_adapter_scale(a.ip if a.ip is not None else 0.35)
    g = torch.Generator(dev()).manual_seed(a.seed or BASE_SEED)
    im = pipe(prompt=f"{a.prompt}, {PROP_STYLE}", negative_prompt=PROP_NEG, num_inference_steps=24, guidance_scale=7.0,
              generator=g, width=1024, height=1024, ip_adapter_image=[style_refs()]).images[0]
    save(cutout(im).resize((512, 512), Image.LANCZOS), f"prop-{a.id}.png")


MONSTER_STYLE = (
    "fantasy mobile RPG monster, painterly semi-realistic, full body from head to feet, both feet planted on the ground, "
    "standing upright facing the viewer, whole figure inside the frame with empty space below the feet, "
    "single creature, plain white background, no text, no watermark"
)
if THEME == "beaver":
    MONSTER_STYLE = (
        "cute cartoon mobile game monster, 3D toy render look, chunky rounded shapes, glossy highlights, vibrant colors, "
        "full body from head to feet, whole figure inside the frame with empty space below, standing facing the viewer, "
        "single creature, plain white background, no text, no watermark"
    )
MONSTER_NEG = (
    "cropped, cut off legs, cut off feet, out of frame, close-up, bust shot, portrait crop, waist up, "
    "text, letters, watermark, logo, blurry, lowres, multiple creatures, person, human, frame, border, background scenery, photo"
    + ("" if THEME == "beaver" else ", 3d render")
)


def cmd_monster(a):
    """몬스터 1장 — 기존 몬스터 원화를 IP 참조로 화풍을 맞추고, 발끝까지 들어간 전신으로 뽑는다.
    출력 art-gen/out/monster-<id>-s<seed>.png (512px 투명). 기존 ogre.png 등은 허벅지에서 잘려 있었다 (2026-09-18)."""
    pipe = load_pipe(ip=True)
    pipe.set_ip_adapter_scale(a.ip if a.ip is not None else 0.45)
    refs = []
    for f in (a.ref or "").split(",") if a.ref else []:
        im = Image.open(f).convert("RGBA")
        bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
        bg.alpha_composite(im)
        refs.append(bg.convert("RGB").resize((384, 384)))
    if not refs:
        refs = style_refs()
    for seed in (a.seeds or [a.seed or BASE_SEED]):
        g = torch.Generator(dev()).manual_seed(seed)
        im = pipe(prompt=f"{a.prompt}, {MONSTER_STYLE}", negative_prompt=MONSTER_NEG, num_inference_steps=26,
                  guidance_scale=7.0, generator=g, width=1024, height=1024, ip_adapter_image=[refs]).images[0]
        px = a.px or 512
        save(cutout(im).resize((px, px), Image.LANCZOS), f"monster-{a.id}-s{seed}.png")


BACKDROP_STYLE = (
    "fantasy mobile game UI background plate, distant scenery seen from far away, misty depth, "
    "dark moody palette, soft glow near the horizon, painterly, vertical composition, "
    "empty simple middle area with no focal object, no characters, no text, no watermark"
)
# UI 가 위에 얹히는 판이라 '읽히는 주인공'이 있으면 안 된다 — 인물·글자·강한 대비를 막는다
if THEME == "beaver":
    BACKDROP_STYLE = (
        "cute mobile game background plate, 3D toy render look, lush pine forest and wooden beaver dam with waterfalls and bright blue lake, "
        "soft volumetric light, vibrant saturated colors, painterly, empty simple middle area, no characters, no text, no watermark"
    )
BACKDROP_NEG = (
    "character, person, people, creature, close-up, text, letters, watermark, logo, ui, hud, buttons, frame, border, "
    "high contrast, busy detail, clutter, bright white, lowres, blurry, photo, 3d render"
)


def cmd_backdrop(a):
    """앱 셸 배경판 — 세로 구도(832x1216). UI 가 위에 얹히므로 가운데는 비우고 어둡게. 출력 backdrop-<id>-s<seed>.png"""
    pipe = load_pipe(ip=False)
    for seed in (a.seeds or [a.seed or BASE_SEED]):
        g = torch.Generator(dev()).manual_seed(seed)
        # ARTGEN_BG_NEG: 배경 전용 추가 네거티브(16차: 아이소메트릭·부감 금지)
        neg = BACKDROP_NEG + ((", " + os.environ["ARTGEN_BG_NEG"]) if os.environ.get("ARTGEN_BG_NEG") else "")
        im = pipe(prompt=f"{a.prompt}, {BACKDROP_STYLE}", negative_prompt=neg, num_inference_steps=26,
                  guidance_scale=6.0, generator=g, width=832, height=1216).images[0]
        save(im, f"backdrop-{a.id}-s{seed}.png")


def cmd_cover(a):
    pipe = load_pipe(ip=False)
    g = torch.Generator(dev()).manual_seed(a.seed or BASE_SEED)
    im = pipe(prompt=f"{a.prompt}, square album cover art, vivid painterly illustration, no text",
              negative_prompt="text, letters, watermark, logo, blurry, lowres", num_inference_steps=18, guidance_scale=6.5,
              generator=g, width=1024, height=1024).images[0]
    save(im.resize((512, 512)), f"cover-{a.id}.png")


if CHROMA:
    for _n in ["STYLE", "ICON_STYLE", "NPC_STYLE", "PROP_STYLE", "MONSTER_STYLE"]:
        if _n in globals():
            # 배경 문구를 스타일 맨 앞에 — 뒤에만 두면 IP 참조 크롭의 풍경이 이겨 전체 장면을 그렸다(2026-10-07 거미 여왕 프로브)
            globals()[_n] = "isolated on a " + CHROMA_BG[CHROMA] + ", chroma key studio shot, " + globals()[_n].replace("plain white background", "perfectly flat uniform background color, no gradient, no floor shadow")
    for _n in ["NEG", "ICON_NEG", "NPC_NEG", "PROP_NEG", "MONSTER_NEG"]:
        if _n in globals():
            globals()[_n] = globals()[_n] + ", white background, gradient background, vignette, floor shadow, scenery, landscape, environment, sky, clouds, plants, trees, rocks, ground, grass, water"

# ARTGEN_FACE="facing left"|"facing right" (2026-10-08, 사용자: 캐릭터는 오른쪽 · 몬스터는 왼쪽): 스타일의 "정면" 문구를 측면 보기로 바꾼다
FACE = os.environ.get("ARTGEN_FACE", "")
if FACE:
    MONSTER_STYLE = MONSTER_STYLE.replace("standing facing the viewer", "standing, " + FACE).replace("standing upright facing the viewer", "standing upright, " + FACE)
    STATE_PROMPT["idle"] = STATE_PROMPT["idle"].replace("facing viewer slightly to the right", FACE)   # FACE 문구를 그대로(측면이든 3/4 이든)
    HERO_IDLE_RIGHT = HERO_IDLE_RIGHT.replace("three-quarter view facing right", FACE)
    NEG = NEG + ", front view, facing the viewer, facing camera"
    MONSTER_NEG = MONSTER_NEG + ", front view, facing the viewer, facing camera"

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("smoke").set_defaults(fn=cmd_smoke)
    sub.add_parser("sample").set_defaults(fn=cmd_sample)
    c = sub.add_parser("char"); c.add_argument("id"); c.add_argument("prompt"); c.add_argument("--pose-from"); c.add_argument("--seed", type=int); c.add_argument("--states", help="idle,run,attack,hit 중 일부만"); c.add_argument("--no-pose", action="store_true"); c.add_argument("--ip", type=float); c.set_defaults(fn=cmd_char)
    h = sub.add_parser("hero"); h.add_argument("prompt"); h.add_argument("--seed", type=int); h.set_defaults(fn=cmd_hero)
    k = sub.add_parser("costume"); k.add_argument("id"); k.add_argument("prompt"); k.add_argument("--seed", type=int); k.set_defaults(fn=cmd_costume)
    rc = sub.add_parser("recolor"); rc.add_argument("file"); rc.add_argument("out"); rc.add_argument("prompt"); rc.add_argument("--strength", type=float, default=0.5); rc.add_argument("--seed", type=int); rc.add_argument("--ip", type=float); rc.set_defaults(fn=cmd_recolor)
    b = sub.add_parser("boss"); b.add_argument("file"); b.add_argument("prompt"); b.add_argument("--seed", type=int); b.set_defaults(fn=cmd_boss)
    ic = sub.add_parser("icon"); ic.add_argument("id"); ic.add_argument("prompt"); ic.add_argument("--seed", type=int); ic.add_argument("--seeds", type=int, nargs="*"); ic.add_argument("--ip", type=float); ic.set_defaults(fn=cmd_icon)
    hi = sub.add_parser("heroidle"); hi.add_argument("id"); hi.add_argument("prompt"); hi.add_argument("--seed", type=int); hi.add_argument("--seeds", type=int, nargs="*"); hi.add_argument("--ip", type=float); hi.add_argument("--pose-from"); hi.set_defaults(fn=cmd_heroidle)
    pr = sub.add_parser("prop"); pr.add_argument("id"); pr.add_argument("prompt"); pr.add_argument("--seed", type=int); pr.add_argument("--ip", type=float); pr.set_defaults(fn=cmd_prop)
    ha = sub.add_parser("heroattack"); ha.add_argument("id"); ha.add_argument("prompt"); ha.add_argument("--ref", required=True); ha.add_argument("--seed", type=int); ha.add_argument("--ip", type=float); ha.add_argument("--weapon", choices=["sword", "bow", "staff", "drum"], default="sword"); ha.add_argument("--no-pose", action="store_true"); ha.add_argument("--pose-set"); ha.add_argument("--cn", type=float); ha.add_argument("--frames"); ha.add_argument("--tag"); ha.set_defaults(fn=cmd_heroattack)
    np_ = sub.add_parser("npc"); np_.add_argument("id"); np_.add_argument("prompt"); np_.add_argument("--seed", type=int); np_.add_argument("--seeds", type=int, nargs="*"); np_.add_argument("--ip", type=float); np_.add_argument("--ref"); np_.set_defaults(fn=cmd_npc)
    mo = sub.add_parser("monster"); mo.add_argument("id"); mo.add_argument("prompt"); mo.add_argument("--seed", type=int); mo.add_argument("--seeds", type=int, nargs="*"); mo.add_argument("--ip", type=float); mo.add_argument("--ref"); mo.add_argument("--px", type=int); mo.set_defaults(fn=cmd_monster)
    bd = sub.add_parser("backdrop"); bd.add_argument("id"); bd.add_argument("prompt"); bd.add_argument("--seed", type=int); bd.add_argument("--seeds", type=int, nargs="*"); bd.set_defaults(fn=cmd_backdrop)
    v = sub.add_parser("cover"); v.add_argument("id"); v.add_argument("prompt"); v.add_argument("--seed", type=int); v.set_defaults(fn=cmd_cover)
    args = ap.parse_args()
    args.fn(args)
