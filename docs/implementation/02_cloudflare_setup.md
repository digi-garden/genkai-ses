# Cloudflare・GA4 の設定手順（Phase 0 のオーナー作業）

> 版：1.0（2026-11-11）／ 対象：`01_phase_plan.md` の 0-4・0-5・0-6
> 関連：`docs/design/01_architecture.md` 7.2、`08_nonfunctional_ops.md` 6.1、`11_platform_integration.md` 2章、`06_external_interface.md` 2章
> 所要時間の目安：Cloudflare Pages 1.0h、GA4 と Web Analytics 0.5h、確認 0.3h

この手順は、Cloudflare と Google の管理画面で行う作業です。AI（Claude）は管理画面に接続できないため、オーナーが行います。画面の項目名は、2026-11 時点の名前で書いています。名前が変わっていたら、近い項目を探してください。

---

## 0. 始める前に

- GitHub の `digi-garden/genkai-ses` に、`develop` ブランチと Phase 0 のプルリクエストがあること（AI が作成済み）。
- **プルリクエストのマージは、Pages のプロジェクトを作った後にする**ことをおすすめします。先にマージしても問題はありませんが、最初の本番ビルドを確認しやすくなります。

---

## 1. Cloudflare Pages のプロジェクトを作る（0-4）

### 1.1 作成と GitHub 連携
1. Cloudflare のダッシュボード › **Workers & Pages** › **作成（Create）** › **Pages** › **Git に接続（Connect to Git）**。
2. GitHub の `digi-garden/genkai-ses` を選ぶ。一覧にない場合は、Cloudflare の GitHub App にこのリポジトリへのアクセスを許可する。
3. 設定：

| 項目 | 値 |
|---|---|
| プロジェクト名 | `genkai-ses`（`genkai-ses.pages.dev` になる） |
| 本番ブランチ（Production branch） | `develop` |
| フレームワークのプリセット | なし（None） |
| ビルドコマンド | `npm run build` |
| ビルドの出力先 | `dist` |
| ルートディレクトリ | （空欄のまま） |

4. **環境変数**（この画面、または作成後の Settings › Variables and Secrets）：

| 変数名 | 本番（Production） | プレビュー（Preview） | 説明 |
|---|---|---|---|
| `NODE_VERSION` | `24` | `24` | ブランドの他タイトルの CI と合わせる |
| `VITE_SITE_ORIGIN` | `https://promptlab-games.com` | （設定しない） | OGP とシェア URL の組み立てに使う（Phase 1-B 以降） |
| `VITE_PUBLIC_BASE` | `/genkai-ses` | （設定しない） | 同上 |
| `VITE_GA_MEASUREMENT_ID` | 2章で取得する `G-XXXXXXX` | **設定しない** | プレビューでは計測しない |
| `VITE_CF_BEACON_TOKEN` | 3章で取得するトークン | **設定しない** | 同上 |

   - GA4 と Web Analytics の値は、2章・3章で取得してから追加すれば大丈夫です。追加した後に、本番を再デプロイ（Deployments › 最新の本番 › Retry deployment）すると反映されます。
   - どれも公開されても問題のない値なので、「Secret（暗号化）」ではなく通常の変数（Plaintext）で構いません。

5. **保存してデプロイ**。最初のビルドは、`develop` の内容でビルドされます。

### 1.2 ビルド回数の節約（08 の 6.1。無料枠はアカウント全体で月500回）
作成後に、**Settings › Builds** で次を設定します。

1. **ブランチの制御（Branch control）**
   - 本番ブランチ：`develop`
   - プレビューのブランチ：**カスタム（Custom branches）** にして、対象（Include）に `preview/*` を入れる
   - これで、`feature/〇〇` ブランチやプルリクエストではビルドされず、確認したいときだけ `preview/〇〇` ブランチを使います。
2. **ビルドの対象パス（Build watch paths）**
   - 対象（Include）：`src/*`、`public/*`、`tools/*`、`index.html`、`package.json`、`package-lock.json`、`vite.config.ts`
   - 除外（Exclude）：`docs/*`
   - ※ 入力欄のワイルドカードの書き方（`*` か `**` か）は、画面の説明に合わせてください。

### 1.3 オリジンのカスタムドメイン（Phase 1-C の 1C-4。今やっても可）
- プロジェクト › **Custom domains** › **Set up a custom domain** › `genkai-ses-origin.promptlab-games.com`。
- `promptlab-games.com` が同じ Cloudflare アカウントにあれば、DNS は自動で設定されます。
- このドメインは Router からの転送先で、利用者が直接開く URL ではありません。Router への追加（`promptlab-games-router` のプルリクエスト）は、Phase 1-C で AI が作ります。**Router に追加するまで、`https://promptlab-games.com/genkai-ses/` は Portal の 404 のままです。**

---

## 2. GA4 のプロパティを作る（0-5）

1. Google アナリティクス › 管理 › **作成** › **プロパティ**。
   - プロパティ名：`限界SES社長`（他タイトルと分ける。KPI を本作だけで判定するため）
   - タイムゾーン：日本、通貨：日本円
2. **データストリーム** › **ウェブ**。
   - URL：`https://promptlab-games.com`
   - ストリーム名：`genkai-ses`
3. 作成後に表示される **測定 ID（`G-` で始まる）** を、1.1 の `VITE_GA_MEASUREMENT_ID`（本番だけ）に設定する。
4. 同じ画面の **拡張計測機能** の設定（歯車）で、次をオフにする。
   - **ブラウザの履歴イベントに基づくページの変更**：オフ（本作は起動時に URL を整えるため、余分なページビューが送られるのを防ぐ。06 の 2.2「ページビューは読み込み時に1回だけ」）
   - その他（スクロール、離脱クリック、サイト内検索、フォームの操作、動画、ファイルのダウンロード）：オフ（本作で使わず、イベントの一覧を見やすくするため）
5. **データの保持期間**（管理 › データの収集と修正 › データ保持）：**14か月** にする（初期値は2か月。PoC の判定と比較に使うため）。
6. イベントのパラメータをレポートで使うための「カスタム定義」の登録は、イベントを実装する Phase 1-B で、登録する項目の一覧を AI が用意します。

---

## 3. Cloudflare Web Analytics のサイトを登録する（0-5）

1. Cloudflare のダッシュボード › **Analytics & Logs** › **Web Analytics** › **サイトを追加（Add a site）**。
2. ホスト名：`promptlab-games.com`
3. **自動設定（automatic setup）は使わない。** 手動の **JS スニペット** を選ぶ。
   - 自動設定にすると、Cloudflare がドメイン全体（Portal と他タイトル）にタグを入れてしまいます。本作は、本作のページだけに手動で入れる方針です（11 の 3章、06 の 2.3）。
   - もし `promptlab-games.com` ですでに自動設定が有効になっていたら、そのままにせず AI に知らせてください（計測の範囲と CSP の設計を見直します）。
4. 表示されたスニペットの `data-cf-beacon='{"token": "…"}'` の **token の値** を、1.1 の `VITE_CF_BEACON_TOKEN`（本番だけ）に設定する。
   - スニペット自体を貼る必要はありません。ビルド時に AI のコードが埋め込みます（Phase 1-B）。

---

## 4. 確認（0-6）

1. GitHub の Phase 0 のプルリクエストで、**CI（Lint, test, build, and E2E）が緑** になっていることを確認する。
2. プルリクエストを `develop` にマージする。
3. Cloudflare Pages の **Deployments** で、本番のビルドが成功していることを確認する。
4. **本番の URL（`https://genkai-ses.pages.dev/`）では、画面は表示されません。これは正常です。**
   - 本番ビルドは、Router 経由の公開パス `/genkai-ses/` で配信される前提で作っています（JS や画像を `/genkai-ses/assets/…` から読む）。Pages の URL を直接開くと、その場所にファイルがないため、画面が真っ黒になります。
   - 本番の表示を確かめられるのは、1.3 のカスタムドメインと Router をつないだ後（Phase 1-C）です。ローカルと CI では、Router を再現したプロキシで同じ確認をしています（`tests/e2e/base_path.test.ts`）。
5. **プレビューでの確認（推奨）**：GitHub で `preview/phase0` ブランチを作る（`develop` から作成するだけでよい）。数分後に Deployments に `preview/phase0` のプレビュー URL（`https://preview-phase0.genkai-ses.pages.dev/`）が出るので、開いて仮のタイトル画面が表示されることを確認する。確認が終わったら、ブランチは削除して構いません。
6. 計測の値（GA4、Web Analytics）を設定した場合も、Phase 0 の時点ではまだタグを埋め込んでいないので、データは届きません（Phase 1-B で実装し、Phase 1-C の本番確認で DebugView を見ます）。

### 確認の結果を AI に伝えるときの項目
- CI の結果（緑か、失敗ならそのメッセージ）
- 本番ビルドの成否
- プレビュー URL で表示できたか（スクリーンショットがあると確実）
- 1.2 の設定が保存できたか（特にビルドの対象パスの書き方）
- GA4 の測定 ID と Web Analytics のトークンを設定したか（値そのものは伝えなくて構いません）
