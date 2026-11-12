"""Render the Kulhad Co. rough cut: camera moves over stills, crossfades, end card.

Usage: python3 render.py  ->  kulhad-co-rough-cut.mp4 (1080x1920, 30fps)
"""
import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).parent
W, H, FPS = 1080, 1920, 30
SHOT, FADE, END = 4.0, 0.6, 4.5   # seconds
SS = 1.5                          # supersample of source for smooth sub-pixel moves
SERIF_B = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"


def ease(t):
    return t * t * (3 - 2 * t)


# Each move returns (zoom, centre_x, centre_y, rotation_deg) for progress p in 0..1.
def potter(p):   # slow push-in on the cup
    e = ease(p); return 1.0 + 0.16 * e, 0.5 + 0.10 * e, 0.5 + 0.07 * e, 0
def rooftop(p):  # lateral dolly left -> right
    return 1.16, 0.43 + 0.14 * p, 0.52, 0
def pour(p):     # push-in toward the cup
    e = ease(p); return 1.0 + 0.18 * e, 0.5 - 0.02 * e, 0.5 + 0.10 * e, 0
def train(p):    # gentle train rocking + slight drift
    return (1.10 + 0.03 * p, 0.5 + 0.006 * math.sin(p * 9.0),
            0.5 + 0.008 * math.sin(p * 14.0), 0.5 * math.sin(p * 7.0))
def soil(p):     # slow downward tilt
    e = ease(p); return 1.14, 0.5, 0.44 + 0.12 * e, 0

SHOTS = [("1-potter", potter), ("2-rooftop", rooftop), ("3-pour", pour),
         ("4-train", train), ("5-soil", soil)]


def load(name):
    im = Image.open(HERE / "stills" / f"{name}.webp").convert("RGB")
    s = max(W / im.width, H / im.height) * SS
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    return im


def frame(im, move, p):
    z, cx, cy, rot = move(p)
    # cover-fit scale: output pixel -> source pixel
    k = min(im.width / W, im.height / H) / z
    a = math.radians(rot)
    ca, sa = math.cos(a) * k, math.sin(a) * k
    sx, sy = cx * im.width, cy * im.height
    m = (ca, -sa, sx - ca * W / 2 + sa * H / 2,
         sa, ca, sy - sa * W / 2 - ca * H / 2)
    return im.transform((W, H), Image.AFFINE, m, Image.BICUBIC)


def end_card_layers():
    bg = Image.new("RGB", (W, H), (22, 11, 6))
    glow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(glow).ellipse((-100, 500, W + 100, 1700), fill=150)
    glow = glow.filter(ImageFilter.GaussianBlur(260))
    bg = Image.composite(Image.new("RGB", (W, H), (74, 36, 16)), bg, glow)
    text = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(text)
    cream = (245, 230, 200, 255)
    d.text((W / 2, 860), "Kulhad Co.", font=ImageFont.truetype(SERIF_B, 150),
           fill=cream, anchor="mm")
    d.multiline_text((W / 2, 1040), "Sipped, then returned\nto the earth.",
                     font=ImageFont.truetype(SERIF, 58), fill=cream,
                     anchor="mm", align="center", spacing=18)
    return bg, text


def main():
    out = HERE / "kulhad-co-rough-cut.mp4"
    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-crf", "18",
         "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out)],
        stdin=subprocess.PIPE)
    ims = [load(n) for n, _ in SHOTS]
    bg, text = end_card_layers()
    step = SHOT - FADE                       # start-to-start spacing
    end_start = len(SHOTS) * step
    total = end_start + END
    black = Image.new("RGB", (W, H), (0, 0, 0))
    for i in range(round(total * FPS)):
        t = i / FPS
        img = None
        for k, (_, move) in enumerate(SHOTS):
            lt = t - k * step
            if 0 <= lt < SHOT:
                f = frame(ims[k], move, lt / SHOT)
                if img is None:
                    img = f
                else:                        # crossfade into the newer shot
                    img = Image.blend(img, f, ease(min(1, lt / FADE)))
        lt = t - end_start
        if lt >= 0:
            card = bg.copy()
            ta = ease(min(1, max(0, (lt - 0.5) / 1.2)))   # text fades in, stays still
            layer = text.copy()
            layer.putalpha(layer.getchannel("A").point(lambda v: int(v * ta)))
            card.paste(layer, (0, 0), layer)
            img = card if img is None else Image.blend(img, card, ease(min(1, lt / FADE)))
        if t < 0.5:
            img = Image.blend(black, img, ease(t / 0.5))
        if total - t < 0.6:
            img = Image.blend(black, img, ease(max(0, (total - t) / 0.6)))
        ff.stdin.write(img.tobytes())
    ff.stdin.close()
    ff.wait()
    print(out, f"{total:.1f}s")


if __name__ == "__main__":
    main()
