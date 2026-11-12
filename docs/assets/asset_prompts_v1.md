# 画像素材 生成プロンプト v1（ツール比較用）

> 作成日：2026-11-10 ／ 関連：要件 4.2、`docs/design/08_nonfunctional_ops.md` 2.1.1
> 目的：ChatGPT と Gemini（どちらも契約済みの有料プラン）で同じプロンプトを試し、画風が狙いに近い方を選んで、17枚すべてをそのツールで作る。

## 比べ方
1. Gemini は、生成の前に設定で「Media watermark」をオフにする。
2. 同じプロンプトを両方のツールに入れ、それぞれ2回ずつ生成する。
3. 画像を保存する：`assets_raw/chatgpt/`、`assets_raw/gemini/`（ファイル名は自由）。
4. AI（Claude）が、実際の大きさ（32×32、320×180）のドット絵に変換し、並べた比較画像を作る。それを見て選ぶ。

## 判断の観点
- 縮めたときに、表情（怯え・死んだ目・爽やか・威圧など）が読み取れるか
- 8人のタッチ・色味がそろっているか
- 「深夜の社内チャット」風のダークな UI（`#1E1F22` の背景、緑とアンバーの差し色）に合うか
- 文字・ロゴ・既存作品への類似がないか

## プロンプトの共通の約束
- 英語で書く（スタイルの指示が守られやすいため）
- 細部を減らし、大きな形で描かせる（32×32、320×180 に縮めるため）
- 文字・数字・ロゴを入れない（要件 3.6、AI の文字は崩れやすい）
- 作品名・作家名を入れず、「既存作品に似せない」と明記する（要件 4.2）
- アイコンの背景は単色のマゼンタ（#FF00FF）。透明化のときに機械的に抜くため

## ① 話者アイコン（8人を1枚に。横長 3:2 か 16:9）

```
Create a single image: a character sheet of 8 original characters for a satirical office-management video game set in a small Japanese IT outsourcing company.

Layout: a 4-column x 2-row grid of equal square cells, one character per cell, all at the same scale, bust shot (head and shoulders), facing the viewer, centered in each cell.

Style: retro 16-bit pixel art look, chunky pixels, bold dark outlines, simple flat shading with at most 2 tones per color, large heads with very readable facial expressions, minimal detail so each face stays readable when reduced to 32x32 pixels.
Palette: limited, muted office tones (charcoal, navy, gray, beige) with small accents of green and amber.
Background of every cell: one flat solid magenta (#FF00FF), no gradient, no shadow on the background.
No text, letters, numbers, logos or brand names anywhere.

Row 1, left to right:
1. Junior programmer, early 20s, nervous and frightened, a sweat drop, oversized hoodie, hugging a laptop.
2. Veteran programmer, 40s, dead-tired empty eyes, dark circles, messy hair, headset around the neck.
3. Salesman, 30s, suspiciously refreshing bright smile, slicked hair, sharp suit and tie, a sparkle on his teeth.
4. Prime contractor's project manager, 40s, intimidating stern face, glasses, arms crossed, holding a clipboard.
Row 2, left to right:
5. Client company executive, 60s, smug and demanding, pointing a finger, expensive suit.
6. Owner of a tiny subcontracting company, 50s, panicking, loosened tie, phone in hand, sweating.
7. Compliance auditor from a fictional inspection agency, stern and expressionless, plain dark suit, a blank ID badge, holding a document folder.
8. The player: CEO of a small IT staffing company, 30s, forced confident grin hiding exhaustion, slightly crooked tie.

All characters must be original and must not resemble any existing game, anime, or real person.
```

| 番号 | ファイル名（要件 4.2） | 役 |
|---|---|---|
| 1 | `icon_dev_junior.webp` | 怯える新人プログラマ |
| 2 | `icon_dev_senior.webp` | 死んだ目をしたベテラン職人 |
| 3 | `icon_sales.webp` | 妙に爽やかな営業マン |
| 4 | `icon_client_pm.webp` | 威圧的な元請けPM |
| 5 | `icon_client_exec.webp` | 無茶振りする客先役員 |
| 6 | `icon_subcontract.webp` | 焦る下請け零細社長 |
| 7 | `icon_inspector.webp` | コンプラ監査組織の監査官 |
| 8 | `icon_player.webp` | プレイヤー社長 |

## ② 結末の絵：全員蒸発エンド（`end_dev_zero.webp`。16:9）

```
Create a single wide 16:9 image for the game-over screen of a satirical office-management video game.

Scene: "everyone vanished" - a small Japanese IT office at night, completely empty. Rows of desks with monitors still on, showing abstract glowing green lines (no readable text). Chairs pushed back and turned away, a half-drunk coffee cup, a jacket left on a chair, blank envelopes scattered on the desks, a whiteboard with an abstract crossed-out schedule chart, one phone on a desk lit up with abstract notification icons.
Mood: darkly humorous, lonely, quiet.

Style: retro 16-bit pixel art look, chunky pixels, bold dark outlines, simple flat shading, large simple shapes and low detail so it stays readable when reduced to 320x180 pixels.
Palette: limited; dark charcoal and navy night tones, cold monitor light, small accents of terminal green and amber.
Camera: straight-on or slightly elevated side view, clear composition.

No people. No text, letters, numbers, logos or brand names anywhere.
Must be original and must not resemble any existing game, anime, or artwork.
```

## 未決事項
- 導入カードの話者「秘書」のアイコンが、要件 4.2 の8種にない。9人目として追加するか、既存の8人に兼ねさせるかを決める。
