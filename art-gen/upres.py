"""upres (2026-11-02, 사용자: "리소스 퀄이 아직 많이 부족") — 늘어나 보이던 배경 · 검을 2배로.
Lanczos 로 키운 뒤 img2img 약한 세기로 디테일만 더한다(구도 · 풀밭 선 · 칼 모양이 움직이지 않게). 검은 원본 알파를 그대로 키워 오려내기 찌꺼기가 없다.
VRAM 가드는 gen.load_pipe 안(모델 적재 직전 1회). 출력 art-gen/out/upres/ — 눈으로 본 뒤 place 로 옮긴다.
  art-gen/.venv/Scripts/python art-gen/upres.py backgrounds|swords [--only id ...] [--strength 0.25]
"""
import argparse, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import torch
from PIL import Image
import gen

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(__file__).parent / "out" / "upres"
BG = {
    "meadow": "dawn meadow, soft green grass, gentle hills, painterly fantasy game background",
    "forest": "shadowy forest, tall trees, dappled moonlight, painterly fantasy game background",
    "ruins": "red ancient ruins, crumbling stone arches, dusty, painterly fantasy game background",
    "volcano": "volcanic canyon, glowing lava, dark rock, painterly fantasy game background",
    "abyss": "abyssal dark castle, purple mist, painterly fantasy game background",
}
BACKDROP = {"hub-backdrop": "ancient stone fortress terrace at dusk, misty valley, painterly game backdrop", "forge-backdrop": "warm forge workshop interior, anvil, embers, painterly game backdrop"}

def img2img(init, prompt, strength, seed):
    pipe = gen.load_pipe(img2img=True, ip=False)
    g = torch.Generator(gen.dev()).manual_seed(seed)
    return pipe(prompt=f"{prompt}, crisp detail, clean edges, high quality", negative_prompt="text, watermark, people, characters, blurry, jpeg artifacts", image=init, strength=strength,
                num_inference_steps=28, guidance_scale=5.5, generator=g).images[0]

def snap8(v):
    return int(v) // 8 * 8

def backgrounds(a):
    jobs = [(k, ROOT / f"public/titans/backgrounds/{k}.webp", p) for k, p in BG.items()] + [(k, ROOT / f"public/ui/bg/{k}.webp", p) for k, p in BACKDROP.items()]
    for k, src, prompt in jobs:
        if a.only and k not in a.only: continue
        out = OUT / f"{k}.png"
        if out.exists(): print("skip", k, flush=True); continue
        im = Image.open(src).convert("RGB")
        w, h = snap8(im.width * 2), snap8(im.height * 2)
        res = img2img(im.resize((w, h), Image.LANCZOS), prompt, a.strength, 20261102)
        OUT.mkdir(parents=True, exist_ok=True); res.save(out); print("ok", k, res.size, flush=True)

def swords(a):
    for i in range(16):
        k = f"s{i:02d}"
        if a.only and k not in a.only: continue
        out = OUT / f"sword-{k}.png"
        if out.exists(): print("skip", k, flush=True); continue
        src = Image.open(ROOT / f"public/forge/swords/{k}.png").convert("RGBA")
        scale = 3
        w, h = snap8(src.width * scale), snap8(src.height * scale)
        big = src.resize((w, h), Image.LANCZOS)
        bg = Image.new("RGBA", big.size, (128, 128, 128, 255)); bg.alpha_composite(big)
        res = img2img(bg.convert("RGB"), "fantasy sword game item, polished metal, centered, single sword", a.strength, 20261102 + i).convert("RGBA")
        res.putalpha(big.getchannel("A"))
        OUT.mkdir(parents=True, exist_ok=True); res.save(out); print("ok", k, res.size, flush=True)

if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"): sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(); p.add_argument("what", choices=["backgrounds", "swords"]); p.add_argument("--only", nargs="*"); p.add_argument("--strength", type=float, default=0.25)
    a = p.parse_args(); (backgrounds if a.what == "backgrounds" else swords)(a)
