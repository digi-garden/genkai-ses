# 画像素材の元データ（assets_raw）

ゲームで使う画像の元データと、選定・変換の途中経過。記録は `docs/asset_log.md`、プロンプトは `docs/assets/`。

| フォルダ | 中身 |
|---|---|
| `chatgpt/` | ChatGPT で生成した元画像（加工なし）。採用した画像と、作り直す前の画像の両方を残している |
| `gemini/` | ツール比較（ChatGPT と Gemini）に使った Gemini の生成画像。不採用 |
| `compare/` | ツール比較の並べた画像 |
| `converted/` | 選定のときに作った変換結果とプレビュー画像。**途中経過で、ゲームで使っている最終版ではない** |

## ゲームで使っている画像（正）
- **`src/assets/img/` の18枚が正。** `converted/` の webp は、作り直しと再変換の前の版なので使わない。
- 採用した元画像（`docs/asset_log.md` の「元画像」欄と同じ）
  - アイコン9枚：`chatgpt/icons9_1.png`（3×3）
  - 結末9枚：`chatgpt/end_*.png`。ただし次の4枚は作り直した版を使う：`end_cash_zero_2.png`、`end_cash_max_2.png`、`end_client_max_2.png`、`end_legal_zero_2.png`
- 再変換：`python tools/pixelize.py assets_raw/chatgpt src/assets/img`（作り直した版の対応は `tools/pixelize.py` の SRCMAP）

## 公開物には含めない
ビルド（`dist/`）に入るのは `src/` の画像だけで、このフォルダは含まれない。
