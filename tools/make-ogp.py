"""OGP 画像（1200×630 の PNG）を作る（docs/design/06_external_interface.md 5.3）

使い方（Python 3 と Pillow が必要）:
    python tools/make-ogp.py

- 結末9枚：src/assets/img/end_*.webp（1280×720）の中央を拡大・縮小せずに切り抜き（ドット絵をぼかさないため）、
  下部に結末名とゲーム名を重ねる
- タイトル用1枚：話者アイコン9人を並べ、ゲーム名とキャッチコピーを入れる
- 出力：public/ogp/end_{id}.png、public/ogp/title.png。ビルドのたびには作らず、コミットする
- 結末名は src/content/endings.ts から読む（文言を変えたら、もう一度実行する）
"""
import os
import re
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
FONT = 'assets_raw/fonts/MPLUS1Code[wght].ttf'
BG = (30, 31, 34)
TEXT = (242, 243, 245)
MUTED = (181, 186, 193)
GREEN = (34, 197, 94)
AMBER = (245, 158, 11)

def font(size: int, weight: int) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(FONT, size)
    f.set_variation_by_axes([weight])
    return f

def ending_titles() -> dict[str, str]:
    src = open('src/content/endings.ts', encoding='utf-8').read()
    out = {}
    for m in re.finditer(r"(\w+): \{\s*id: '(\w+)'.*?title: \{ web: '([^']+)' \}", src, re.S):
        out[m.group(2)] = m.group(3)
    return out

def band(img: Image.Image, title: str) -> None:
    overlay = Image.new('RGBA', (W, 170), (20, 21, 24, 225))
    img.paste(overlay, (0, H - 170), overlay)
    d = ImageDraw.Draw(img)
    d.rectangle([0, H - 170, W, H - 166], fill=AMBER)
    f_title = font(64, 700)
    f_game = font(30, 700)
    d.text((56, H - 130), title, font=f_title, fill=TEXT)
    game = '限界SES社長  人月ピラミッドの頂点へ'
    gw = d.textlength(game, font=f_game)
    d.text((W - 56 - gw, H - 52), game, font=f_game, fill=GREEN)

def main() -> None:
    os.makedirs('public/ogp', exist_ok=True)
    titles = ending_titles()
    assert len(titles) == 9, titles
    for eid, title in titles.items():
        art = Image.open(f'src/assets/img/end_{eid}.webp').convert('RGB')
        x = (art.width - W) // 2
        y = (art.height - H) // 2
        img = art.crop((x, y, x + W, y + H)).convert('RGBA')
        band(img, title)
        img.convert('RGB').save(f'public/ogp/end_{eid}.png', optimize=True)
        print(f'public/ogp/end_{eid}.png  {title}')

    # タイトル用
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    icons = sorted(f for f in os.listdir('src/assets/img') if f.startswith('icon_'))
    size = 128
    gap = 8
    grid_w = 3 * size + 2 * gap
    ox, oy = 72, (H - grid_w) // 2
    for i, name in enumerate(icons):
        ic = Image.open(f'src/assets/img/{name}').convert('RGBA')
        bg = Image.new('RGBA', (size, size), (49, 51, 56, 255))
        bg.alpha_composite(ic)
        img.paste(bg.convert('RGB'), (ox + (i % 3) * (size + gap), oy + (i // 3) * (size + gap)))
    tx = ox + grid_w + 64
    d.text((tx, 170), 'PromptLab Games', font=font(28, 500), fill=MUTED)
    d.text((tx, 215), '限界SES社長', font=font(92, 700), fill=TEXT)
    d.text((tx, 330), '人月ピラミッドの頂点へ', font=font(36, 700), fill=MUTED)  # 〜 はフォントにないので付けない
    d.rectangle([tx, 400, tx + 520, 404], fill=AMBER)
    d.text((tx, 425), '今期も、誰もバックれませんように。', font=font(32, 500), fill=GREEN)
    img.save('public/ogp/title.png', optimize=True)
    print('public/ogp/title.png')

if __name__ == '__main__':
    main()
