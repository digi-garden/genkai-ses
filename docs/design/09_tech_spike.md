# 09 技術検証メモ

> 版：1.0（2026-10-31） ／ 対象要件：`requirements_v1.12.md`
> 目的：方式を左右する不確定要素を、設計を固める前に実際に試して確かめる。

---

## 検証1：Cloudflare Pages で、結末ページ（静的HTML）と SPA を両立できるか

### 背景
- 要件 7.3-1 は `_redirects` に `/* /index.html 200` を置くとしている。一方で、3.4 の OGP 用の静的ページ（`/results/{id}/index.html`）が、この SPA フォールバックに飲み込まれないかが未確認だった。
- Cloudflare Pages は、トップレベルに `404.html` がない場合、SPA として扱い、存在しないパスに `index.html` を返す。

### 方法
- `wrangler pages dev`（v4.156.0。Cloudflare Pages のルーティングをローカルで再現する）で、次の2つの構成を比べた。
  - d1：`_redirects` なし
  - d2：`_redirects` に `/* /index.html 200`
- 配置したファイル：`index.html`（SPA）、`results/dev-zero/index.html`（結末ページ）、`assets/a.webp`

### 結果（d1 と d2 で完全に同じ）

| リクエスト | ステータス | 返った内容 |
|---|---|---|
| `/` | 200 | SPA |
| `/play`（存在しないパス） | 200 | SPA |
| `/results/dev-zero` | **308** → `/results/dev-zero/` | （リダイレクト） |
| `/results/dev-zero/` | 200 | **結末ページ（静的HTML）** |
| `/results/unknown`（存在しない結末） | 200 | SPA |
| `/assets/a.webp` | 200 | 画像 |
| `/assets/missing.webp`（存在しない画像） | **200** | **SPA の HTML** |

### 結論
1. **`_redirects` は置かない。** 置かなくても SPA フォールバックが効き、静的ファイルの方が優先される（要件 7.3-1 の「不要なら置かない」に該当）。`404.html` も置かない（置くと SPA フォールバックが止まる）。
2. **シェアする URL は末尾にスラッシュを付ける**（`/results/dev-zero/`）。付けないと 308 リダイレクトが1回はさまる。X のクローラーはリダイレクトを追うが、無駄な往復は避ける。
3. **存在しない画像も 200（HTML）で返る。** 画像の読み込み失敗は、ステータスコードでは判定できない。プリロードは `HTMLImageElement.decode()` の失敗（または `onerror`）で判定する（要件 7.3-4）。
4. 存在しない結末の URL（`/results/unknown`）は SPA に届く。SPA 側で「タイトルへ戻す」処理を入れる。

### 残る確認
- 本番環境での挙動は、初回デプロイ時に同じ表のとおりになるかを確かめる（この検証環境からは Cloudflare のアカウントに接続できないため、ローカルでの再現にとどまる）。

---

## 検証2：日本語に対応した等幅フォントの選定と容量

### 背景
- 要件 4.1 のフォント指定（JetBrains Mono、Fira Code）には日本語の字形がない。日本語部分のフォントを決める必要があった。
- 結果画像（html-to-image）にもフォントを埋め込むため、容量が重要になる。外部の Google Fonts を使うと外部送信が増えるので、自分のサイトに置く（セルフホスト）前提とする。

### 候補と容量（400 Regular、woff2）

| フォント | 日本語 | 等幅 | 全体の容量 | ライセンス |
|---|---|---|---|---|
| **M PLUS 1 Code** | あり | **あり（英数字も等幅）** | 日本語を含む全体で約604KB | OFL-1.1 |
| BIZ UDGothic | あり | 半角のみ等幅に近い | 約1.3MB | OFL-1.1 |
| JetBrains Mono | **なし** | あり | 約56KB（英数字のみ） | OFL-1.1 |

### サブセット化（使う文字だけに絞る）の試算
`pyftsubset` で M PLUS 1 Code を絞り込んだ結果：

| 収録する文字 | 文字数 | 容量 |
|---|---|---|
| ASCII ＋ かな・記号 ＋ JIS第1水準の漢字から1,500字 | 1,945字 | **194KB** |
| ASCII ＋ かな・記号 ＋ JIS第1水準の漢字すべて | 3,504字 | 356KB |

### 結論
1. **フォントは M PLUS 1 Code に一本化する。** 英数字も等幅で、ゲージやコードのような表示と日本語の見た目が揃う。JetBrains Mono は使わない（読み込むフォントが1つで済む）。
2. **ビルド時にサブセット化する。** カード JSON と UI 文言で実際に使う文字に、ASCII・かな・記号を加え、その範囲で絞り込む。想定は約1,500〜2,000字、容量は約150〜200KB。
3. 収録されていない文字（会社名に入力された珍しい漢字など）は、OS の日本語フォントで表示する（`font-family: 'GenkaiMono', ui-monospace, 'Hiragino Sans', 'Noto Sans JP', monospace`）。
4. フォントは `font-display: swap` で読み込み、最初の表示を遅らせない。結果画像を作るときだけ `document.fonts.ready` を待つ（要件 7.3-3）。

---

## 検証3：html-to-image で、日本語フォントを埋め込んだ画像を正しく生成できるか

### 方法
- 検証2で作ったサブセットフォントを読み込んだページで、結果カード（日本語・英数字・記号の混在）を `htmlToImage.toPng`（v1.11.13、pixelRatio 2）で画像にし、同じ要素の画面スクリーンショットと比べた。
- ブラウザ：Chromium（Playwright 1.64）

### 結果
- フォントは正しく埋め込まれ、生成した画像は画面表示とほぼ同じだった（差はアンチエイリアスによるもので、目視では区別できない）。
- 生成時間は**約130ms**、PNG の容量は**約79KB**（1296×352px）。

### 結論と残る確認
1. Chromium（Android Chrome、PC）では、この方式で問題ない。
2. **WebKit（iOS Safari）では未検証。** この検証環境には WebKit のブラウザが入っていない。要件 7.3-3 のとおり、**Week 4 に iOS Safari の実機で確かめる**。
3. **iOS で不具合が出た場合の代替案：** html-to-image を使わず、Canvas 2D に直接描く（`FontFace` で読み込んだフォントを使って `fillText` で文字を、`drawImage` で画像を描く）。結果カードはレイアウトが固定なので、直接描いても工数は小さい（2〜3時間の見込み）。この切り替えができるよう、画像生成は `ResultImageRenderer` インターフェースの裏に隠す（01 アーキテクチャ設計書を参照）。
4. 画像生成のたびにフォントを読み直さないよう、`getFontEmbedCSS` の結果をキャッシュして `fontEmbedCSS` オプションに渡す。

---

## 検証4：ブランド共通の Router 経由で、Cloudflare Pages のリダイレクトが壊れないか（2026-11-01 追加）

### 背景
- 公開先が `https://promptlab-games.com/genkai-ses/` に変わった（要件 v1.13 8章）。共通の Router Worker（`digi-garden/promptlab-games-router`）は、`/genkai-ses` を**削ってから**オリジンに転送し、レスポンスは書き換えない（Router の `src/router.ts` と README で確認）。
- Pages が返すリダイレクトの `Location` が相対パスだと、Router 経由では公開パスが抜ける。

### 方法
- `wrangler pages dev` で、次の2つの形の結末ページを置いて、ヘッダーを確認した。
  - ディレクトリ形式：`results/dev-zero/index.html`
  - ファイル形式：`results2/dev-zero.html`

### 結果

| リクエスト | 結果 | `Location` |
|---|---|---|
| `/results/dev-zero` | 308 | `/results/dev-zero/`（**相対パス**） |
| `/results/dev-zero/` | 200（ページ） | ― |
| `/results2/dev-zero` | 200（ページ） | ― |
| `/results2/dev-zero/` | 308 | `/results2/dev-zero` |
| `/results2/dev-zero.html` | 308 | `/results2/dev-zero` |

- `Location` は相対パスで返る。Router 経由で `promptlab-games.com/genkai-ses/results/dev-zero` を開くと、オリジンは `/results/dev-zero` を受け取り、ブラウザは `promptlab-games.com/results/dev-zero/` に飛ばされる。これはポータルの404になる。

### 結論
1. **結末ページはファイル形式（`results/{slug}.html`）にし、URL は末尾スラッシュなしにする**（`/genkai-ses/results/dev-zero`）。既存タイトルの記事ページ（`/kanban-panic/design` など）も末尾スラッシュなしで、形がそろう。
2. アプリ内のリンク、canonical、`og:url`、シェアする URL は、すべて末尾スラッシュなしで書く。末尾スラッシュ付きで開かれた場合の 308 は、壊れる（ポータルの404）が、こちらから出す URL にはないので許容する。
3. トップの `index.html` 以外に、物理的なディレクトリ＋`index.html` を作らない。
4. 1の結論により、検証1の「シェアする URL は末尾にスラッシュを付ける」は**取り消す**。
5. Router の仕組み（先頭を削る、レスポンスを書き換えない）は変えない（ブランドの方針）。
