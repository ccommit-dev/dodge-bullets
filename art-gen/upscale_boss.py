"""
보스 원화 고해상도화 — 512px 대장 4종을 1024px 로 (2026-10-02).

성문 방어 대장이 5배(약 480 CSS px, 폰 DPR 2~3 이면 960~1440 실 픽셀)로 커지면서 512px 원화가 늘어나 흐릿했다.
새로 그리지 않고 **원본을 1024 로 키운 뒤 SDXL img2img(낮은 strength)로 세부를 다시 그린다** — 구도·실루엣·색은 원본 그대로.

  · 알파는 원본 알파를 키워 쓴다(rembg 를 다시 돌리면 실루엣이 바뀌어 SpriteArt 여백표·판정 체감이 달라진다)
  · 가장자리(알파 < 0.9)는 원본을 키운 색과 섞어 흰 배경 번짐(헤일로)을 막는다
  · IP-Adapter·ControlNet 없이 img2img 만 — VRAM 이 적게 든다. GPU 를 ComfyUI 와 함께 쓰므로 적재 직전 여유 7GB 를 기다린다

  art-gen/.venv/Scripts/python art-gen/upscale_boss.py [--strength 0.32] [--seeds 1 2 3]
출력: art-gen/out/boss-hd/<name>-s<seed>.png (1024 RGBA) — 고른 뒤 public/titans/generated/monsters/<name>.png 로 옮긴다.
"""
from __future__ import annotations
import argparse, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gen  # noqa: E402  (HF_HOME·utf-8 stdout·할당자 설정을 함께 가져온다)
import torch  # noqa: E402
from PIL import Image  # noqa: E402

ROOT = Path(__file__).resolve().parent
SRC = ROOT.parent / "public/titans/generated/monsters"
OUT = ROOT / "out/boss-hd"
DETAIL = "highly detailed, sharp crisp outlines, fine painted texture, high resolution game monster art"
BOSSES = {
    "moss-golem-clean": "giant moss-covered stone golem, mossy boulder body, glowing green rune on chest, vines and leaves",
    "wolf-king-clean": "huge ogre king, golden crown, spiked gold plate armor, white fur mantle, skull belt buckle, red loincloth, spiked mace",
    "flame-wyvern-clean": "red fire wyvern dragon, fiery red wings, molten lava scales, roaring with fire, purple crystal tail blade",
    "abyss-titan": "dark armored titan knight, black and gold spiked plate armor, glowing purple crystal on chest, purple void flames, horned helmet",
}
NEG = gen.NEG + ", jpeg artifacts, noise, smudged, painterly blur"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--strength", type=float, default=0.32)
    ap.add_argument("--seeds", type=int, nargs="*", default=[20261002, 20261003, 20261004])
    ap.add_argument("--only", nargs="*")
    ap.add_argument("--min-free", type=float, default=7.0)
    a = ap.parse_args()

    orig_wait = gen.wait_for_vram
    gen.wait_for_vram = lambda *_args, **_kw: orig_wait(a.min_free)   # load_pipe 가 모듈 전역을 부른다
    pipe = gen.load_pipe(img2img=True, ip=False)
    OUT.mkdir(parents=True, exist_ok=True)
    for name, desc in BOSSES.items():
        if a.only and name not in a.only:
            continue
        src = Image.open(SRC / f"{name}.png").convert("RGBA")
        big = src.resize((1024, 1024), Image.LANCZOS)                     # 원본을 키운 것 — 가장자리 색·알파의 기준
        bg = Image.new("RGBA", big.size, (255, 255, 255, 255))
        bg.alpha_composite(big)
        init = bg.convert("RGB")
        alpha = big.getchannel("A")
        # 가장자리 섞기 가중치 — 알파 0.9 이상은 새 그림, 그 아래는 원본 색으로 갈수록 더
        inner = alpha.point(lambda v: 255 if v >= 230 else int(v * 255 / 230))
        for seed in a.seeds:
            g = torch.Generator(gen.dev()).manual_seed(seed)
            out = pipe(prompt=f"{desc}, {DETAIL}, {gen.STYLE}", negative_prompt=NEG, image=init, strength=a.strength,
                       num_inference_steps=36, guidance_scale=5.5, generator=g).images[0]
            rgb = Image.composite(out, big.convert("RGB"), inner)
            res = rgb.convert("RGBA")
            res.putalpha(alpha)
            p = OUT / f"{name}-s{seed}.png"
            res.save(p)
            print("saved", p.relative_to(ROOT), flush=True)
            gen.free_cache()


if __name__ == "__main__":
    main()
