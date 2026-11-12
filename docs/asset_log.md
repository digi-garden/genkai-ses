# 画像素材 生成記録（asset_log）

> 要件 4.2（v1.11）の権利確認手順に基づく記録。素材1枚ごとに1行。

| ファイル名 | ツール・プラン | 生成日 | 規約を確認した日 | プロンプト | 類似チェックの結果 | 変換・修正の内容 | 記入者 |
|---|---|---|---|---|---|---|---|
| （例）icon_sales.webp | ChatGPT Plus | 2026-11-xx | 2026-11-xx | `docs/assets/asset_prompts_v1.md` ① | 画像検索類似なし | 32×32 に縮小、共通パレット24色、4倍拡大 | オーナー／Claude |
| icon_dev_junior.webp | ChatGPT（Plus） | 2026-11-10 | 2026-11-11 | `docs/assets/asset_prompts_v2.md` ③（1番目のセル）／元画像 `icons9_1.png` | 2026-11-11 | `icons9_1.png` を3×3に分割、マゼンタ背景を透過、64×64に縮小、共通パレット32色（#22C55E/#F59E0B/#EF4444 固定）、2倍拡大→128×128、可逆WebP（`tools/pixelize.py`） | Claude |
| icon_dev_senior.webp | ChatGPT（Plus） | 2026-11-10 | 2026-11-11 | `docs/assets/asset_prompts_v2.md` ③（2番目のセル）／元画像 `icons9_1.png` | 2026-11-11 | `icons9_1.png` を3×3に分割、マゼンタ背景を透過、64×64に縮小、共通パレット32色（#22C55E/#F59E0B/#EF4444 固定）、2倍拡大→128×128、可逆WebP（`tools/pixelize.py`） | Claude |
| icon_sales.webp | ChatGPT（Plus） | 2026-11-10 | 2026-11-11 | `docs/assets/asset_prompts_v2.md` ③（3番目のセル）／元画像 `icons9_1.png` | 2026-11-11 | `icons9_1.png` を3×3に分割、マゼンタ背景を透過、64×64に縮小、共通パレット32色（#22C55E/#F59E0B/#EF4444 固定）、2倍拡大→128×128、可逆WebP（`tools/pixelize.py`） | Claude |
| icon_client_pm.webp | ChatGPT（Plus） | 2026-11-10 | 2026-11-11 | `docs/assets/asset_prompts_v2.md` ③（4番目のセル）／元画像 `icons9_1.png` | 2026-11-11 | `icons9_1.png` を3×3に分割、マゼンタ背景を透過、64×64に縮小、共通パレット32色（#22C55E/#F59E0B/#EF4444 固定）、2倍拡大→128×128、可逆WebP（`tools/pixelize.py`） | Claude |
| icon_client_exec.webp | ChatGPT（Plus） | 2026-11-10 | 2026-11-11 | `docs/assets/asset_prompts_v2.md` ③（5番目のセル）／元画像 `icons9_1.png` | 2026-11-11 | `icons9_1.png` を3×3に分割、マゼンタ背景を透過、64×64に縮小、共通パレット32色（#22C55E/#F59E0B/#EF4444 固定）、2倍拡大→128×128、可逆WebP（`tools/pixelize.py`） | Claude |
| icon_subcontract.webp | ChatGPT（Plus） | 2026-11-10 | 2026-11-11 | `docs/assets/asset_prompts_v2.md` ③（6番目のセル）／元画像 `icons9_1.png` | 2026-11-11 | `icons9_1.png` を3×3に分割、マゼンタ背景を透過、64×64に縮小、共通パレット32色（#22C55E/#F59E0B/#EF4444 固定）、2倍拡大→128×128、可逆WebP（`tools/pixelize.py`） | Claude |
| icon_inspector.webp | ChatGPT（Plus） | 2026-11-10 | 2026-11-11 | `docs/assets/asset_prompts_v2.md` ③（7番目のセル）／元画像 `icons9_1.png` | 2026-11-11 | `icons9_1.png` を3×3に分割、マゼンタ背景を透過、64×64に縮小、共通パレット32色（#22C55E/#F59E0B/#EF4444 固定）、2倍拡大→128×128、可逆WebP（`tools/pixelize.py`） | Claude |
| icon_player.webp | ChatGPT（Plus） | 2026-11-10 | 2026-11-11 | `docs/assets/asset_prompts_v2.md` ③（8番目のセル）／元画像 `icons9_1.png` | 2026-11-11 | `icons9_1.png` を3×3に分割、マゼンタ背景を透過、64×64に縮小、共通パレット32色（#22C55E/#F59E0B/#EF4444 固定）、2倍拡大→128×128、可逆WebP（`tools/pixelize.py`） | Claude |
| icon_secretary.webp | ChatGPT（Plus） | 2026-11-10 | 2026-11-11 | `docs/assets/asset_prompts_v2.md` ③（9番目のセル）／元画像 `icons9_1.png` | 2026-11-11 | `icons9_1.png` を3×3に分割、マゼンタ背景を透過、64×64に縮小、共通パレット32色（#22C55E/#F59E0B/#EF4444 固定）、2倍拡大→128×128、可逆WebP（`tools/pixelize.py`） | Claude |
| end_cash_zero.webp | ChatGPT（Plus） | 2026-11-11 | 2026-11-11 | `docs/assets/asset_prompts_v2.md` v2 ④ ＋ 修正指示（下記 修正1）／元画像 `end_cash_zero_2.png` | 2026-11-11 | 16:9に切り抜き、320×180に縮小、共通パレット32色（同上）、4倍拡大→1280×720、可逆WebP（`tools/pixelize.py`） | Claude |
| end_client_zero.webp | ChatGPT（Plus） | 2026-11-10 | 2026-11-11 | `docs/assets/asset_prompts_v2.md` v2 ④／元画像 `end_client_zero.png` | 2026-11-11 | 16:9に切り抜き、320×180に縮小、共通パレット32色（同上）、4倍拡大→1280×720、可逆WebP（`tools/pixelize.py`） | Claude |
| end_dev_zero.webp | ChatGPT（Plus） | 2026-11-10 | 2026-11-11 | `docs/assets/asset_prompts_v2.md` v2 ④／元画像 `end_dev_zero.png` | 2026-11-11 | 16:9に切り抜き、320×180に縮小、共通パレット32色（同上）、4倍拡大→1280×720、可逆WebP（`tools/pixelize.py`） | Claude |
| end_legal_zero.webp | ChatGPT（Plus） | 2026-11-11 | 2026-11-11 | `docs/assets/asset_prompts_v2.md` v2 ④ ＋ 修正指示（下記 修正2）／元画像 `end_legal_zero_2.png` | 2026-11-11 | 16:9に切り抜き、320×180に縮小、共通パレット32色（同上）、4倍拡大→1280×720、可逆WebP（`tools/pixelize.py`） | Claude |
| end_cash_max.webp | ChatGPT（Plus） | 2026-11-11 | 2026-11-11 | `docs/assets/asset_prompts_v2.md` v2 ④ ＋ 作り直し指示（下記 修正3）／元画像 `end_cash_max_2.png` | 2026-11-11 | 16:9に切り抜き、320×180に縮小、共通パレット32色（同上）、4倍拡大→1280×720、可逆WebP（`tools/pixelize.py`） | Claude |
| end_client_max.webp | ChatGPT（Plus） | 2026-11-11 | 2026-11-11 | `docs/assets/asset_prompts_v2.md` v2 ④ ＋ 修正指示（下記 修正4）／元画像 `end_client_max_2.png` | 2026-11-11 | 16:9に切り抜き、320×180に縮小、共通パレット32色（同上）、4倍拡大→1280×720、可逆WebP（`tools/pixelize.py`） | Claude |
| end_dev_max.webp | ChatGPT（Plus） | 2026-11-10 | 2026-11-11 | `docs/assets/asset_prompts_v2.md` v2 ④／元画像 `end_dev_max.png` | 2026-11-11 | 16:9に切り抜き、320×180に縮小、共通パレット32色（同上）、4倍拡大→1280×720、可逆WebP（`tools/pixelize.py`） | Claude |
| end_legal_max.webp | ChatGPT（Plus） | 2026-11-10 | 2026-11-11 | `docs/assets/asset_prompts_v2.md` v2 ④／元画像 `end_legal_max.png` | 2026-11-11 | 16:9に切り抜き、320×180に縮小、共通パレット32色（同上）、4倍拡大→1280×720、可逆WebP（`tools/pixelize.py`） | Claude |
| end_clear.webp | ChatGPT（Plus） | 2026-11-10 | 2026-11-11 | `docs/assets/asset_prompts_v2.md` v2 ④／元画像 `end_clear.png` | 2026-11-11 | 16:9に切り抜き、320×180に縮小、共通パレット32色（同上）、4倍拡大→1280×720、可逆WebP（`tools/pixelize.py`） | Claude |

## 補足

- 生成日は元画像（`assets_raw/chatgpt/`）の保存日時（日本時間）から記入した。
- ツール・プランは正確なプラン名（Plus / Pro など）をオーナーが確認して必要なら書き換える。
- 変換後のファイルは `assets_raw/converted/` にある。実装のフェーズ0で `public/` 側へ配置する。
- 不採用の元画像（`end_cash_zero.png`、`end_legal_zero.png`、`end_cash_max.png`、`end_client_max.png`、比較用の `icons_1/2.png`、`end_dev_zero_1/2.png`、`assets_raw/gemini/`）は記録のため残している。公開物には含めない。

### 修正指示（エンディングの作り直し）

すべて、エンディングを生成したのと同じ ChatGPT の会話で送った。

- **修正1 cash_zero：** 社長を他のエンディングと同じ人物（茶色のツンツン髪、紺のスーツ、オレンジのネクタイ）にし、空になりかけた社長室で通帳（白紙）を見て呆然とする構図に。グラフは残すが主役は社長の表情。赤い札（文字なし）と運び出しは維持。理由：cash_max と見分けにくく、社長が客先役員に見えたため。
- **修正2 legal_zero：** 窓の外の車と赤い回転灯を削除し、窓の外を夜のビル街に。理由：パトカーに見え、要件 3.6 のマイルド表現の方針より強い印象になるため。
- **修正3 cash_max：** 社長が役員2人に両脇を抱えられて会議室から運び出され、投資家たちが挙手で採決し、上座には別の人物が座っている構図に作り直し。グラフはなし。理由：「社長の椅子が撤去される」が小さく、祝勝会に見えたため。
- **修正4 client_max：** 付箋の鎖を「鎖」と分かる形にし、社長を手前中央に大きく描く。結果として金色のデフォルメした金属の鎖・手錠になった。社長自身もつながれており、攻撃的な描写ではないためオーナー判断で採用（2026-11-11）。
