"""ゲームで使う文字だけに絞ったフォント（woff2）を作る（docs/design/09_tech_spike.md 検証2）

使い方（Python 3、fonttools と brotli が必要。pip install fonttools brotli）:
    python tools/subset-font.py

- 元のフォント：assets_raw/fonts/MPLUS1Code[wght].ttf（可変フォント。OFL-1.1）
- 出力：src/assets/fonts/genkai-400.woff2、genkai-700.woff2、charset.txt（収録した文字）、charset-fallback.txt（元のフォントにない文字）
- 収録する文字：src/ の TypeScript と JSON に出てくる文字すべて＋ASCII＋かな＋よく使う記号
- カードや文言に新しい文字を足したら、もう一度実行する（単体テストが、収録されていない文字を検出して失敗する）
"""
import glob
import io
import os
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

SRC = 'assets_raw/fonts/MPLUS1Code[wght].ttf'
OUT = 'src/assets/fonts'

def collect_chars() -> set[str]:
    chars: set[str] = set()
    for path in glob.glob('src/**/*.ts', recursive=True) + glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.json', recursive=True):
        with open(path, encoding='utf-8') as f:
            chars.update(f.read())
    chars.update(chr(c) for c in range(0x20, 0x7F))           # ASCII
    chars.update(chr(c) for c in range(0x3041, 0x3097))       # ひらがな
    chars.update(chr(c) for c in range(0x30A1, 0x30FB))       # カタカナ
    chars.update('ー・「」『』（）【】、。！？…―〜：；＋－×÷＝％＄＆＠＃☆★○●◎◇◆□■△▲▽▼→←↑↓')
    chars.update(chr(c) for c in range(0xFF10, 0xFF1A))       # 全角数字
    chars.update(chr(c) for c in range(0xFF21, 0xFF3B))       # 全角英大文字
    chars.update(chr(c) for c in range(0xFF41, 0xFF5B))       # 全角英小文字
    return {c for c in chars if c.isprintable() and not c.isspace() or c == ' '}

def main() -> None:
    chars = collect_chars()
    os.makedirs(OUT, exist_ok=True)
    for weight in (400, 700):
        font = TTFont(SRC)
        inst = instancer.instantiateVariableFont(font, {'wght': weight})
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = ['*']
        opts.name_IDs = ['*']
        opts.notdef_outline = True
        sub = subset.Subsetter(options=opts)
        sub.populate(text=''.join(chars))
        sub.subset(inst)
        buf = io.BytesIO()
        inst.flavor = 'woff2'
        inst.save(buf)
        path = os.path.join(OUT, f'genkai-{weight}.woff2')
        with open(path, 'wb') as f:
            f.write(buf.getvalue())
        print(f'{path}: {len(buf.getvalue()) // 1024} KB')
    cmap = TTFont(SRC).getBestCmap()
    covered = sorted(c for c in chars if ord(c) in cmap)
    missing = sorted(c for c in chars if ord(c) not in cmap and c != ' ')
    with open(os.path.join(OUT, 'charset.txt'), 'w', encoding='utf-8') as f:
        f.write(''.join(covered))
    # 元のフォントにない文字（OS のフォントで表示される）。単体テストが、これを「意図して収録していない文字」として扱う
    with open(os.path.join(OUT, 'charset-fallback.txt'), 'w', encoding='utf-8') as f:
        f.write(''.join(missing))
    print(f'収録 {len(covered)} 字（元のフォントにない文字 {len(missing)} 字：{"".join(missing[:40])}）')

if __name__ == '__main__':
    main()
