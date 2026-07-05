#!/usr/bin/env python3
"""Generate the Android launcher icons from assets/designed-icon.png.

app/android/ is gitignored/regenerable, so its launcher icons revert to the
Capacitor default after `npx cap add android`. Re-run this then:
    py app/scripts/gen-android-icons.py
Writes legacy ic_launcher / ic_launcher_round + the adaptive ic_launcher_foreground
across all mipmap densities and sets the adaptive background to black (matches the
icon). Requires Pillow (same as the favicon/logo pipeline). See MOBILE.md.
"""
import os
from PIL import Image, ImageDraw

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(REPO, 'assets', 'designed-icon.png')
RES = os.path.join(REPO, 'app', 'android', 'app', 'src', 'main', 'res')

# density -> (legacy launcher px, adaptive foreground px @108dp)
D = {'mdpi': (48, 108), 'hdpi': (72, 162), 'xhdpi': (96, 216),
     'xxhdpi': (144, 324), 'xxxhdpi': (192, 432)}


def circle(img):
    m = Image.new('L', img.size, 0)
    ImageDraw.Draw(m).ellipse([0, 0, img.size[0] - 1, img.size[1] - 1], fill=255)
    out = img.copy()
    out.putalpha(m)
    return out


def main():
    src = Image.open(SRC).convert('RGBA')
    for d, (ls, fs) in D.items():
        dd = os.path.join(RES, 'mipmap-' + d)
        if not os.path.isdir(dd):
            print('skip (missing):', dd)
            continue
        sq = src.resize((ls, ls), Image.LANCZOS)
        sq.save(os.path.join(dd, 'ic_launcher.png'))
        circle(sq).save(os.path.join(dd, 'ic_launcher_round.png'))
        # full-bleed foreground (icon already has margins + transparent rounded corners)
        src.resize((fs, fs), Image.LANCZOS).save(os.path.join(dd, 'ic_launcher_foreground.png'))
        print(f'{d}: ic_launcher {ls}px, foreground {fs}px')
    bg = os.path.join(RES, 'values', 'ic_launcher_background.xml')
    with open(bg, 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
                '    <color name="ic_launcher_background">#000000</color>\n</resources>\n')
    print('background -> #000000\nDONE')


if __name__ == '__main__':
    main()
