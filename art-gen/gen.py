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


def cutout(im: Image.Image) -> Image.Image:
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
    for si, state in enumerate(["idle", "run", "attack", "hit"]):
        pose = pose_of(REF / f"{base}-{state}.png")
        im = gen_txt(f"{a.prompt}, {STATE_PROMPT[state]}", (a.seed or BASE_SEED) + si * 7, pose=pose)
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


def cmd_boss(a):
    src = Image.open(a.file).convert("RGBA")
    seed = a.seed or BASE_SEED
    hit = gen_img2img(src, f"{a.prompt}, recoiling from a heavy blow, staggered backwards, flinching, bright impact flash on body", seed, strength=0.45)
    save(cutout(hit), f"boss-{Path(a.file).stem}-hit.png")
    defeat = gen_img2img(src, f"{a.prompt}, collapsing defeated, falling over, cracked and crumbling body, fading", seed + 1, strength=0.55)
    save(cutout(defeat), f"boss-{Path(a.file).stem}-defeat.png")


def cmd_cover(a):
    pipe = load_pipe(ip=False)
    g = torch.Generator(dev()).manual_seed(a.seed or BASE_SEED)
    im = pipe(prompt=f"{a.prompt}, square album cover art, vivid painterly illustration, no text",
              negative_prompt="text, letters, watermark, logo, blurry, lowres", num_inference_steps=18, guidance_scale=6.5,
              generator=g, width=1024, height=1024).images[0]
    save(im.resize((512, 512)), f"cover-{a.id}.png")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("smoke").set_defaults(fn=cmd_smoke)
    sub.add_parser("sample").set_defaults(fn=cmd_sample)
    c = sub.add_parser("char"); c.add_argument("id"); c.add_argument("prompt"); c.add_argument("--pose-from"); c.add_argument("--seed", type=int); c.set_defaults(fn=cmd_char)
    h = sub.add_parser("hero"); h.add_argument("prompt"); h.add_argument("--seed", type=int); h.set_defaults(fn=cmd_hero)
    k = sub.add_parser("costume"); k.add_argument("id"); k.add_argument("prompt"); k.add_argument("--seed", type=int); k.set_defaults(fn=cmd_costume)
    b = sub.add_parser("boss"); b.add_argument("file"); b.add_argument("prompt"); b.add_argument("--seed", type=int); b.set_defaults(fn=cmd_boss)
    v = sub.add_parser("cover"); v.add_argument("id"); v.add_argument("prompt"); v.add_argument("--seed", type=int); v.set_defaults(fn=cmd_cover)
    args = ap.parse_args()
    args.fn(args)
