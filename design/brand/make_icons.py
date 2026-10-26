"""The site's logo files, from the association's logo (alumni-council-logo.jpg in this folder).

The site shows the logo in round white frames (header, footer, login), so public/logo.png
and the small icons get enough white margin to keep the ribbon inside the circle.
icon-512.png is the "maskable" app icon, sized for Android's round safe zone.
Run: python design/brand/make_icons.py
(writes public/logo.png, logo-large.webp, icon-*.png, favicon.ico and assets/email/logo.png)
"""
import os
from pathlib import Path

from PIL import Image, ImageChops

HERE = Path(__file__).parent
PUBLIC = HERE.parents[1] / "public"


def artwork() -> Image.Image:
    src = Image.open(HERE / "alumni-council-logo.jpg").convert("RGB")
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
    # The large logo for pages that show it big (the Golden Jubilee page and event header).
    large = square(art, 0.04).resize((800, 800), Image.LANCZOS)
    large.save(PUBLIC / "logo-large.webp", quality=88, method=6)
    print("logo-large.webp", os.path.getsize(PUBLIC / "logo-large.webp") // 1024, "KB")
    # The crest in email headers (lib/email.ts sends it as an inline image).
    email = HERE.parents[1] / "assets" / "email" / "logo.png"
    round_frame.resize((96, 96), Image.LANCZOS).save(email, optimize=True)
    print("assets/email/logo.png", os.path.getsize(email) // 1024, "KB")
