# 画像素材 生成プロンプト v2（本番用）

> 作成日：2026-11-10 ／ 前版：`asset_prompts_v1.md`（ツール比較用）
> 決定事項（2026-11-10）：①ツールは **ChatGPT**（契約済みの有料プラン）に統一 ②話者アイコンは **64×64 で描き、2倍に拡大して 128×128**（32×32 では表情がつぶれたため。比較画像 `assets_raw/compare/compare_icons.png`） ③導入カードの話者として **秘書（`icon_secretary`）を9人目に追加**（素材は計18枚）

## 進め方
1. **アイコン（③）を最初に作る。** 9人を1枚にまとめて生成する（画風をそろえるため）。気に入るまで生成し直してよい。1枚の中で、特定のキャラクターだけ気に入らない場合は、その人物だけ同じ会話で描き直しを頼む。
2. **結末の絵（④）は、アイコンを作ったのと同じ会話の続きで生成する。** ChatGPT は同じ会話の中なら画風を引き継ぎやすい。会話を分けた場合は、採用したアイコンの画像を添付して「この画風で」と頼む。
3. 保存先とファイル名：`assets_raw/chatgpt/` に、`icons9_1.png`、`end_cash_zero_1.png` のように「名前_番号」で保存する（2回目以降は番号を増やす）。加工はしない。
4. 採用する画像を決めたら、AI（Claude）がドット絵に変換し、`docs/asset_log.md` を書く。オーナーは類似チェックの結果と、規約を確認した日を記入する。

## ③ 話者アイコン9人（3列×3段。正方形 1:1 で生成）

```
Create a single square image: a character sheet of 9 original characters for a satirical office-management video game set in a small Japanese IT outsourcing company.

Layout: a 3-column x 3-row grid of equal square cells separated by thin black lines, one character per cell, all at the same scale, bust shot (head and shoulders), facing the viewer, centered in each cell.

Style: retro 16-bit pixel art look in a cute, comedic manga style (chibi-like proportions, large heads), chunky pixels, bold dark outlines, simple flat shading with at most 2 tones per color, very readable exaggerated facial expressions, minimal detail so each face stays readable when reduced to 64x64 pixels.
Palette: limited, muted office tones (charcoal, navy, gray, beige) with small accents of green and amber.
Background of every cell: one flat solid magenta (#FF00FF), no gradient, no shadow on the background.
No text, letters, numbers, logos or brand names anywhere.

Row 1, left to right:
1. Junior programmer, early 20s, nervous and frightened, a sweat drop, oversized hoodie, hugging a laptop.
2. Veteran programmer, 40s, dead-tired empty eyes, dark circles, messy hair, stubble, headset around the neck.
3. Salesman, 30s, suspiciously refreshing bright smile with eyes closed, slicked hair, navy suit, amber tie, a sparkle on his teeth.
Row 2, left to right:
4. Prime contractor's project manager, 40s, intimidating stern face, glasses, arms crossed, holding a clipboard.
5. Client company executive, 60s, gray hair, smug and demanding grin, pointing a finger at the viewer, expensive striped suit.
6. Owner of a tiny subcontracting company, 50s, balding, glasses, panicking and shouting, loosened green tie, phone at his ear, sweating.
Row 3, left to right:
7. Compliance auditor from a fictional inspection agency, expressionless and cold, neat bob haircut, plain dark suit, a blank ID badge on a lanyard, holding a document folder.
8. The player: CEO of a small IT staffing company, 30s, forced confident grin hiding exhaustion, dark circles, a sweat drop, slightly crooked amber tie.
9. The CEO's secretary, late 20s, calm and composed polite smile, neat ponytail, white blouse and dark vest, holding a tablet, looks like a reliable guide.

All characters must be original and must not resemble any existing game, anime, or real person.
```

| 番号 | ファイル名 | 役 |
|---|---|---|
| 1 | `icon_dev_junior.webp` | 怯える新人プログラマ |
| 2 | `icon_dev_senior.webp` | 死んだ目をしたベテラン職人 |
| 3 | `icon_sales.webp` | 妙に爽やかな営業マン |
| 4 | `icon_client_pm.webp` | 威圧的な元請けPM |
| 5 | `icon_client_exec.webp` | 無茶振りする客先役員 |
| 6 | `icon_subcontract.webp` | 焦る下請け零細社長 |
| 7 | `icon_inspector.webp` | コンプラ監査組織の監査官 |
| 8 | `icon_player.webp` | プレイヤー社長 |
| 9 | `icon_secretary.webp` | 秘書（導入カードの案内役）※v2 で追加 |

- 比較で良かった表情（v1 の ChatGPT 1回目・2回目）を、各人物の説明に反映している。

## ④ 結末の絵（9種。横長 16:9 で生成）

### 共通の指定（各プロンプトの末尾に付ける）

```
Style: the same retro 16-bit pixel art look and cute, comedic manga style as the character sheet in this conversation; chunky pixels, bold dark outlines, simple flat shading, large simple shapes and low detail so it stays readable when reduced to 320x180 pixels. People, if any, appear small and simple.
Palette: limited; dark charcoal and navy night tones, with small accents of terminal green and amber.
Camera: straight-on or slightly elevated view, clear composition, wide 16:9.
No text, letters, numbers, logos or brand names anywhere (screens, papers, and signs show only abstract shapes).
Must be original and must not resemble any existing game, anime, or artwork.
```

### 各結末のシーン（「Create a single wide 16:9 image for the game-over screen of a satirical office-management video game. Scene: 〜」の〜に入れる）

| ファイル名 | 結末 | シーン（英語） |
|---|---|---|
| `end_cash_zero.webp` | 資金0：黒字倒産 | The CEO sits alone in a dim office, staring at a wall chart whose arrow goes up (the company was profitable), while workers carry out the furniture and red "seized" tags (blank tags, no text) are stuck on desks and computers. Darkly funny irony. |
| `end_client_zero.webp` | 顧客0：契約解除 | A cold meeting room. The client's stern executives across the table slide a thick stack of documents toward the small, pale CEO. Through the window, the client's tall building looms. Thunderclouds outside. |
| `end_dev_zero.webp` | 現場0：全員蒸発 | Everyone vanished: a small IT office at night, completely empty. Monitors still on with abstract green lines, chairs pushed back, a half-drunk coffee cup, a jacket left on a chair, blank envelopes on the desks, one phone lit up with abstract notification icons. No people. ※比較で使った v1 ②の ChatGPT 2回目の画像を採用してもよい |
| `end_legal_zero.webp` | コンプラ0：労務監査局突入 | Auditors in plain dark suits from a fictional inspection agency (blank armbands, no symbols) walk into the office carrying cardboard boxes of documents, while a red rotating warning light flashes outside the window. The CEO freezes in shock behind a desk. |
| `end_cash_max.webp` | 資金100：敵対的買収 | A long boardroom table. Smiling executives in sharp suits raise their hands to vote, while the CEO's empty chair at the head of the table is being pulled away. Piles of money on the table. Comedic coup atmosphere. |
| `end_client_max.webp` | 顧客100：際限なき奴隷 | An endless conveyor belt of task tickets (blank cards) pours out of the client's office door into a cramped room where exhausted engineers and the CEO keep working, chained to their desks with comically long chains made of sticky notes. |
| `end_dev_max.webp` | 現場100：技術オタク化 | The engineers happily ignore a burning calendar (deadline on fire) while building a huge, beautiful, overly complex machine of servers and cables in the middle of the office. The CEO in the corner holds his head. Joyful chaos. |
| `end_legal_max.webp` | コンプラ100：官僚主義崩壊 | The office is buried in towering stacks of approval forms with many blank stamp boxes. The CEO is stamping papers endlessly at a desk, while a client walks away through the door, giving up. Dusty, still atmosphere. |
| `end_clear.webp` | 1期完走 | A commemorative group photo at dawn in front of the office: the exhausted but proud CEO, the secretary, and the engineers hold up bundles of money and give tired smiles and peace signs. Paper confetti in the air. Bittersweet victory. |

- 表現は要件 3.6（露骨な違法用語・実在の団体を想起させる記号を使わない、弱い立場の個人を笑いものにしない、社長自身を道化にする）に合わせている。
