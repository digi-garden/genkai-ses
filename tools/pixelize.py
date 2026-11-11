"""ChatGPT で生成した画像を、ゲーム用のドット絵（WebP）に変換する。

docs/design/08_nonfunctional_ops.md 2.1.1、記録は docs/asset_log.md。
使い方（Python 3 と Pillow が必要。pip install pillow）:
    python tools/pixelize.py <元画像のフォルダ> <出力フォルダ>
    例: python tools/pixelize.py assets_raw/chatgpt src/assets/img

- アイコン: icons9_1.png（3×3、背景マゼンタ）を分割 → 透過 → 64×64 → 共通パレット → 2倍（128×128）
- 一枚絵: end_*.png を 16:9 に切り抜き → 320×180 → 共通パレット → 4倍（1280×720）
- 共通パレットは18枚すべての色から作る（32色。UI の差し色3色は固定）。1枚でも差し替えたら全部を変換し直す。
- 作り直した画像は SRCMAP で「結末ID → 元画像の名前」を指定する。
"""
import os
import sys
from PIL import Image

if len(sys.argv) != 3:
    sys.exit(__doc__)
SRC, OUT = sys.argv[1], sys.argv[2]
def cells(im, cols, rows, inset=0.03):
    W,H=im.size; cw,ch=W/cols,H/rows; out=[]
    for r in range(rows):
        for c in range(cols):
            x0,y0=c*cw,r*ch; dx,dy=cw*inset,ch*inset
            cell=im.crop((int(x0+dx),int(y0+dy),int(x0+cw-dx),int(y0+ch-dy)))
            w,h=cell.size; s=min(w,h)
            out.append(cell.crop(((w-s)//2,(h-s)//2,(w-s)//2+s,(h-s)//2+s)))
    return out
def key_magenta(im):
    im=im.convert('RGBA'); px=im.load(); w,h=im.size
    for y in range(h):
        for x in range(w):
            r,g,b,a=px[x,y]
            if r>160 and b>160 and g<120 and abs(r-b)<80: px[x,y]=(0,0,0,0)
    return im
def down_rgba(im,n):
    s=im.resize((n,n),Image.BOX); px=s.load()
    for y in range(n):
        for x in range(n):
            r,g,b,a=px[x,y]; px[x,y]=(r,g,b,255) if a>=140 else (0,0,0,0)
    return s
def crop169(im):
    W,H=im.size; th=int(W*9/16)
    return im.crop((0,(H-th)//2,W,(H-th)//2+th)) if th<=H else im.crop(((W-int(H*16/9))//2,0,(W-int(H*16/9))//2+int(H*16/9),H))

ICON_NAMES=['icon_dev_junior','icon_dev_senior','icon_sales','icon_client_pm','icon_client_exec','icon_subcontract','icon_inspector','icon_player','icon_secretary']
END_IDS=['cash_zero','client_zero','dev_zero','legal_zero','cash_max','client_max','dev_max','legal_max','clear']
ACCENTS=[(0x22,0xC5,0x5E),(0xF5,0x9E,0x0B),(0xEF,0x44,0x44)]

icons=[down_rgba(key_magenta(c),64) for c in cells(Image.open(f'{SRC}/icons9_1.png').convert('RGB'),3,3)]
SRCMAP={'legal_zero':'legal_zero_2','cash_zero':'cash_zero_2','cash_max':'cash_max_2','client_max':'client_max_2'}
ends=[crop169(Image.open(f'{SRC}/end_{SRCMAP.get(e,e)}.png').convert('RGB')).resize((320,180),Image.BOX) for e in END_IDS]

# shared palette: median cut over all opaque pixels, then add fixed accents
pts=[p[:3] for im in icons for p in im.getdata() if p[3]==255]+[p for im in ends for p in im.getdata()]
strip=Image.new('RGB',(len(pts),1)); strip.putdata(pts)
base=strip.quantize(colors=32-len(ACCENTS),method=Image.Quantize.MEDIANCUT).getpalette()[:3*(32-len(ACCENTS))]
pal=base+[c for a in ACCENTS for c in a]
palimg=Image.new('P',(1,1)); palimg.putpalette(pal+[0]*(768-len(pal)))
def q(im): return im.convert('RGB').quantize(palette=palimg,dither=Image.Dither.NONE).convert('RGB')
os.makedirs(OUT,exist_ok=True)
for name,im in zip(ICON_NAMES,icons):
    rgb=q(im); out=Image.new('RGBA',im.size)
    out.putdata([(c[0],c[1],c[2],255) if a[3]==255 else (0,0,0,0) for c,a in zip(rgb.getdata(),im.getdata())])
    out.resize((128,128),Image.NEAREST).save(f'{OUT}/{name}.webp',lossless=True)
for e,im in zip(END_IDS,ends):
    q(im).resize((1280,720),Image.NEAREST).save(f'{OUT}/end_{e}.webp',lossless=True)
for f in sorted(os.listdir(OUT)): print(f, os.path.getsize(os.path.join(OUT,f))//1024,'KB')
