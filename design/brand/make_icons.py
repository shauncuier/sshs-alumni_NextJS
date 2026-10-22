"""The site's logo files, from the association's logo (alumni-council-logo.png in this folder).

The site shows the logo in round white frames (header, footer, login), so public/logo.png
and the small icons get enough white margin to keep the ribbon inside the circle.
icon-512.png is the "maskable" app icon, sized for Android's round safe zone.
Run: python design/brand/make_icons.py   (writes public/logo.png, icon-*.png, favicon.ico)
"""
import os
from pathlib import Path

from PIL import Image, ImageChops

HERE = Path(__file__).parent
PUBLIC = HERE.parents[1] / "public"


def artwork() -> Image.Image:
    src = Image.open(HERE / "alumni-council-logo.png").convert("RGB")
    ink = ImageChops.difference(src, Image.new("RGB", src.size, (255, 255, 255))).convert("L")
    return src.crop(ink.point(lambda v: 255 if v > 18 else 0).getbbox())


def square(art: Image.Image, margin: float) -> Image.Image:
    side = int(max(art.size) * (1 + 2 * margin))
    sq = Image.new("RGB", (side, side), (255, 255, 255))
    sq.paste(art, ((side - art.width) // 2, (side - art.height) // 2))
    return sq


def save(im: Image.Image, size: int, name: str, palette: bool = True) -> None:
    out = im.resize((size, size), Image.LANCZOS)
    if palette:
        out = out.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
    out.save(PUBLIC / name, optimize=True)
    print(name, os.path.getsize(PUBLIC / name) // 1024, "KB")


if __name__ == "__main__":
    art = artwork()
    round_frame = square(art, 0.15)
    save(round_frame, 256, "logo.png")
    save(round_frame, 192, "icon-192.png")
    save(square(art, 0.16), 512, "icon-512.png")
    save(round_frame, 32, "icon-32.png", palette=False)
    round_frame.resize((48, 48), Image.LANCZOS).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print("favicon.ico", os.path.getsize(PUBLIC / "favicon.ico") // 1024, "KB")
