# 限界SES社長 〜人月ピラミッドの頂点へ〜

SES 企業の社長として、資金・顧客・現場・コンプラの4つのバランスを取りながら1期（52週）を生き延びる、2択の風刺経営ゲーム。
PromptLab Games のタイトルとして `https://promptlab-games.com/genkai-ses/` で公開する（ブランド共通の Router Worker 経由）。

> 現在：**Phase 0（準備）**。ひな形・CI・公開パスの検証の土台と、確定した画像素材18枚が入っている。ゲーム本体は Phase 1 で実装する。

## ドキュメント

| 資料 | 内容 |
|---|---|
| [`docs/requirements_v1.14.md`](docs/requirements_v1.14.md) | 要件定義書（最新版。過去の版と改訂履歴も `docs/` にある） |
| [`docs/design/00_index.md`](docs/design/00_index.md) | 基本設計の目次と、要件からの変更点の一覧 |
| [`docs/implementation/01_phase_plan.md`](docs/implementation/01_phase_plan.md) | 実装のフェーズ計画（担当・完了条件・工数・削減ライン） |
| [`docs/implementation/02_cloudflare_setup.md`](docs/implementation/02_cloudflare_setup.md) | Cloudflare Pages・GA4・Web Analytics の設定手順 |
| [`docs/asset_log.md`](docs/asset_log.md) | 画像素材の生成と権利確認の記録 |

## 開発

Node.js 24（`.nvmrc`）。

```bash
npm ci
npm run dev          # 開発サーバー（http://localhost:5173/genkai-ses/）
npm run lint         # ESLint ＋ dependency-cruiser（層の依存ルール）
npm test             # 単体テスト（Vitest、カバレッジ付き）
npm run build        # 型チェック → 本番ビルド（dist/）
npm run size         # ビルド結果の容量チェック（予算超過は警告のみ）
npm run preview      # wrangler pages dev で dist を配信（http://localhost:8788/）
npm run test:e2e     # E2E（事前に npm run build が必要）
```

### E2E と公開パス
- 本番ビルドは `base: '/genkai-ses/'`。Router は `/genkai-ses` を削ってオリジン（Pages）に転送するので、E2E も **Router を再現したプロキシ**（`tests/e2e/support/router-proxy.ts`）越しに `wrangler pages dev` を開いて確かめる。
- Playwright のブラウザをダウンロードできない環境では、`E2E_CHANNEL=chrome npm run test:e2e` でインストール済みの Google Chrome を使える。
- `preview/*` ブランチの Pages プレビューでは、`CF_PAGES_BRANCH` を見て `base` を `/` に切り替える（`vite.config.ts`）。

### フォルダ構成（`docs/design/01_architecture.md` 5章）

```
src/
  app/       起動、ポートの組み立て
  core/      ゲームロジック（純粋関数）とポートの型。DOM・乱数・時刻を直接使わない
  content/   カード・文言などのデータ
  infra/     ポートの実装（ストレージ、計測、シェア、画像生成）
  ui/        画面と部品
  assets/    画像素材（Vite がファイル名にハッシュを付ける）
  styles/    Tailwind の @theme（色トークン）
tools/       ビルド・検証用のスクリプト
tests/       unit（Vitest）／ e2e（Playwright）
```

層の依存ルール（`core` は `content` にだけ依存、`ui` は `infra` を直接 import しない、など）は `.dependency-cruiser.cjs` で CI 時に検査する。

### 画像素材
- `src/assets/img/` の18枚（話者アイコン9、結末の一枚絵9）は確定版。ChatGPT で生成し、`tools/pixelize.py`（Python 3 ＋ Pillow）でドット絵に変換した。
- 差し替えるときは、元画像から18枚すべてを変換し直す（共通パレットが変わるため）。手順は `docs/design/08_nonfunctional_ops.md` 2.1.1、記録は `docs/asset_log.md`。

## ブランチと公開

- `develop`：本番（Cloudflare Pages の本番ブランチ）。プルリクエストのマージでだけ更新する。マージはオーナーが行う。
- `feature/〇〇`：作業ブランチ。Pages はビルドしない。
- `preview/〇〇`：Pages のプレビューを作りたいときだけ使う（ビルド回数の節約。`docs/design/08_nonfunctional_ops.md` 6.1）。
- `docs/` だけの変更では Pages はビルドしない（ビルドの対象パスの設定）。

## 既知の事項
- `npm audit` で、開発用の依存（ESLint が使う minimatch）に moderate の脆弱性が出る。本番の依存（`npm audit --omit=dev`）には該当なし。ESLint 側の更新を待つ。
