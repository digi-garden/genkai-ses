# 06 外部インターフェース設計書

> 版：1.0（2026-10-31） ／ 対象要件：`requirements_v1.12.md`（3.4、3.5、7.2、7.3、7.4） ／ 関連：`01_architecture.md`（4.1 ポート）、`05_data_design.md`
> 目的：ブラウザの機能や外部サービスとのやりとりを決める。どれも `core/ports.ts` のポートとして定義し、`infra` 層に実装を置く。

---

## 1. ストレージ（SaveRepository / SessionRepository）

```ts
interface SaveRepository {
  load(): SaveData;                       // 失敗しても例外を投げず、初期データを返す
  update(fn: (d: SaveData) => SaveData): void;  // メモリ上を更新（書き込みは flush で）
  flush(): void;                          // LocalStorage へ書き込む
  readonly mode: 'local' | 'memory' | 'readonly';
}
interface SessionRepository {
  load(contentHash: string): RuntimeGameState | null;
  save(state: RuntimeGameState): void;
  clear(): void;
}
```

| 状況 | 動き |
|---|---|
| 起動時 | 書き込みテスト（`genkai_ses__probe` を書いて消す）を行う。失敗したら `memory` モードにする（Safari のプライベートモードなど。要件 7.2-4） |
| 書き込みで例外（容量超過など） | 以後は `memory` モードに切り替え、`app_error` を計測に送る（2.2） |
| 保存データの版が新しすぎる | `readonly` モード（05 の 5.3） |
| `memory` モードのとき | タイトル画面の下に「この環境では記録が保存されません」と小さく表示する |

- 例外処理はこの2つの実装の中に閉じ込め、外には例外を出さない。

---

## 2. 計測（GA4）

### 2.1 読み込みと同意の扱い（要件 7.2-5 で「基本設計で決める」とした事項）

**決定：日本など同意が不要な地域では、GA4 をそのまま読み込む。EEA・英国・スイスと推定される環境でだけ、同意バナーを出し、同意されたら読み込む。**

- 地域の推定は、ブラウザのタイムゾーン（`Intl.DateTimeFormat().resolvedOptions().timeZone`）で行う。`Europe/` で始まるもの、および `Atlantic/Reykjavik`、`Atlantic/Canary`、`Atlantic/Madeira`、`Atlantic/Azores`、`Atlantic/Faroe`、`Arctic/Longyearbyen` を対象にする。
- 理由：サーバーを持たない（01 の P1）ので、IP アドレスから国を判定できない。タイムゾーンによる推定は完全ではないが、ターゲット（日本のエンジニア）に余計なバナーを出さずに、対象地域への配慮ができる。
- 日本の外部送信規律は「公表」で足りる（同意は不要）ので、プライバシーポリシーに送信先・情報・目的を書く（要件 7.2-5）。
- バナーの選択は LocalStorage の `genkai_ses_consent_v1`（`'granted' | 'denied'`）に保存する。プライバシーポリシーのモーダルから、いつでも変更できる。
- `VITE_GA_MEASUREMENT_ID` が未設定のとき（プレビュー環境・開発時）は GA4 を読み込まず、送るはずだったイベントを開発者ツールのコンソールに出す。
- 広告ブロッカーで GA4 が読み込めない場合は、何もしない（エラーにしない）。

### 2.2 イベント仕様

要件 7.4-4 の一覧を、GA4 の制約（イベント名は固定の英数字、40文字以内）に合わせて確定する。

| イベント名 | 送るタイミング（04 のイベント） | パラメータ |
|---|---|---|
| `game_start` | `runStarted` | `style_id`、`is_retry`（同じページ表示の中で2回目以降なら true） |
| `heartbeat_10s` | ラン開始から、ページが表示中の時間の累計が10秒に達したとき。ユーザーにつき1回 | ― |
| `funnel_milestone` | `milestoneReached` | `reached_week`（13 / 26 / 39 / 52） |
| `skill_used` | `trumpUsed` | `week_number`、`style_id` |
| `game_over` | `gameOver` | `reason_id`、`week_number`、`sales`、`has_regret` |
| `game_over_reason` | `gameOver` | `reason_id` |
| `game_clear` | `gameClear` | `style_id`、`sales`、`achievement_id`（優先度が最も高い1つ。なければ `none`） |
| `play_duration` | `gameOver` / `gameClear` | `survival_week`、`duration_sec` |
| `drop_at_week` | プレイ中にページが隠れたとき（`visibilitychange` → hidden）。同じランで1回まで | `week_number` |
| `retry_click` | リザルトで［もう1期挑む］を押したとき | `total_plays_in_session` |
| `share_intent_success` | シェア系のボタンを押したとき | `share_type`（`XIntent` / `WebShare` / `CopyImage` / `SaveImage`） |
| `app_error` | 想定外のエラー（08 の 4章） | `error_type`（例：`storage_quota`、`image_render`） |

- **要件のイベント名からの変更：** `play_duration_seconds` → `play_duration`、`drop_at_week_X` → `drop_at_week`（週番号はパラメータに入れる。GA4 で週ごとに集計しやすくするため）、`retry_click_count` → `retry_click`。
- **全イベントの共通パラメータ**（要件 7.4-4）：`play_count`、`days_since_first_play`、`store_safe`。`days_since_first_play` は、`first_played_at` の日付（ユーザーの端末の時刻）と今日の日付の差（日数）。
- `drop_at_week` は、`gtag` の `transport_type: 'beacon'` で送る（ページが閉じられても届くようにするため）。
- ページビューは、GA4 の初期設定（ページの読み込み時に1回）だけにする。画面の切り替えでは送らない。

### 2.3 Cloudflare Web Analytics
- **JS スニペットを手動で埋め込む方式**にする（v1.1 で変更）。Cloudflare のダッシュボードでサイトを登録してトークンを発行し、`index.html` と結末ページ（5章）の両方に、次のタグを入れる。トークンは公開されても問題ない値なので、環境変数 `VITE_CF_BEACON_TOKEN` としてビルド時に埋め込む。
  ```html
  <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "…"}'></script>
  ```
- 理由：自動で挿入する方式は、Cloudflare のプロキシを通る構成でないと働かない場合があり、送信先も方式によって変わる（自動：自分のドメインの `/cdn-cgi/rum`、手動：`cloudflareinsights.com`）。手動にすれば挙動と CSP（08 の 5.1）が一意に決まる。
- 結末ページにも入れるのは、X から結末ページに来た人（ゲームを始める前に離脱した人も含む）を UU に数えるため。
- UU（要件 1.1-1）と、表示の速さの計測に使う。

---

## 3. シェア（ShareService）

### 3.1 X への投稿（Web Intent）

```
https://x.com/intent/tweet?text={エンコードしたシェア文}&url={エンコードした結末ページの URL}
```

- 結末ページの URL：`{VITE_SITE_ORIGIN}/results/{slug}/?utm_source=x&utm_medium=share`（末尾のスラッシュを付ける。09 検証1）。
- 新しいタブ（スマホでは X アプリ）で開く。`window.open` がブロックされた場合は、同じタブで開く。

### 3.2 シェア文の組み立てと文字数制限

X の上限は、URL（23文字として数える）を含めて **280**。日本語の全角文字は **2文字** として数える（X の文字数の数え方）。要件 3.4-3 の定型文は、会社名が15文字のときに **294** になり、上限を超える（本書の作成時に試算）。そこで、次の順に組み立て、長すぎる場合は行を短くする。

```
1行目  【限界SES社長】
2行目  {会社名}は、第{N}週に「{結末名}」で倒産しました（売上{売上}万）。   ※クリア時は「1期（52週）を完走しました」
3行目  獲得称号：［{称号}］                                         ※称号がなければ省く
4行目  {敗因の一文 または 結末の定型コメント}
（空行）
6行目  誰かこのブラック業界で1年間（52週）生き残ってみてくれ。
7行目  ※会社名は架空です
8行目  #限界SES社長 #SESあるある
```

**長さを超えたときの調整（上から順に、収まるまで適用する）：**
プレイヤーごとに違う内容（称号・敗因）は、シェアしたくなる理由そのものなので、最後まで残す。定型の部分から先に削る。
1. 6行目を「52週生き残れる人いる？」に短くする。
2. 6行目を省く。
3. 2行目の会社名を8文字で切り、「…」を付ける。
4. 4行目（敗因または定型コメント）を15文字で切り、「…」を付ける。
5. 3行目（称号）を省く。

- 試算（会社名15文字、結末名「官僚主義崩壊エンド」、売上5桁、称号「自転車操業マスター」、敗因30文字の最悪のケース）：調整なしで338 → 1. で305 → 2. で282 → **3. で270**（収まる）。通常は 1. だけで収まる（会社名15文字・敗因が短い例で、294 → 約260）。4. と 5. は、想定外の長さに備えた保険。

- 「※会社名は架空です」（v1.11）とハッシュタグは、どの段階でも省かない。
- 文字数は、X の数え方（`twitter-text` のルール）で計算する関数 `weightedLength` を `infra` に用意して判定する。
- **投稿画面の URL の長さ：** 調整後のシェア文（280以内）を URL エンコードしても、投稿画面の URL 全体は最大で約1,290文字（全角128文字＋結末ページの URL の場合の試算）に収まり、一般的な上限の目安（2,000文字）を下回る。このため実行時の判定は入れず、単体テストで「最悪のケースでも 2,000文字以内」であることを確かめる（07 の 2.1）。

### 3.3 画像付きシェア（Web Share API）
- 対象：`navigator.canShare({ files: [file] })` が true の環境。
- **前提：結果画像は、リザルト画面を表示した時点で裏で作っておく**（4章）。ボタンを押してから画像を作ると、その待ち時間の間に「ユーザーの操作による呼び出し」とみなされる期限が切れ、iOS Safari などで `navigator.share()` が `NotAllowedError` になって共有シートが開かないため（基本設計レビュー第3回の指摘1）。
- 画像がまだできていない間は、［画像付きでシェア］ボタンを「準備中…」として押せないようにする。
- 手順：ボタンを押した処理の中で、**`await` をはさまずに**次の2つを続けて呼ぶ。
  1. `navigator.clipboard.writeText(シェア文)`（完了を待たない）
  2. `navigator.share({ files: [作成済みの画像ファイル], title: '限界SES社長' })`
- 1. が成功したら「本文はコピー済みです。貼り付けて投稿してください」と表示する。失敗した場合は、共有シートを閉じた後に、シェア文を選択してコピーできる欄を表示する。
- テキストは `share` に渡さない（共有先によってはテキストが捨てられたり、二重に入ったりするため。要件 3.4 v1.12）。
- ファイル名：`genkai-ses_{結末ID}_{yyyyMMdd}.png`。
- ユーザーが共有シートを閉じた場合（`AbortError`）は、エラーとして扱わない。

### 3.4 画像のコピーと保存
- コピー：`navigator.clipboard.write([new ClipboardItem({ 'image/png': 作成済みの画像 })])`。ボタンを押した処理の中で、`await` をはさまずに呼ぶ（画像は 4章で作成済み）。`ClipboardItem` がないブラウザでは、コピーのボタン自体を出さない。
- 保存：`<a download>` に画像のオブジェクト URL を設定してクリックする。iOS Safari などで保存できない場合は、画像を新しいタブで開き、「長押しで保存してください」と案内する。

---

## 4. 結果画像の生成（ResultImageRenderer）

```ts
interface ResultImageRenderer {
  render(data: ResultReportData): Promise<Blob>;   // PNG
}
```

- Web版の実装は html-to-image（09 検証3）。報告書の部分（幅 600px 固定。02 の S05）を、`pixelRatio: 2` で 1200px 幅の PNG にする。
- 生成の前に `document.fonts.ready` を待つ（要件 7.3-3）。フォントの埋め込み CSS（`getFontEmbedCSS` の結果）は、最初の1回だけ作ってキャッシュする。
- 結末の一枚絵は、読み込み済みの画像をそのまま使う（`img.decode()` で読み込み完了を確認してから生成する）。
- **作るタイミング：** リザルト画面を表示した直後に、裏で1回だけ作り、メモリに保持する（`Blob` と、それを包んだ `File`）。シェア・コピー・保存のボタンは、この作成済みの画像を使い回す（3.3、3.4）。
- 生成に3秒以上かかった場合、または失敗した場合は、画像を使うボタン（画像付きでシェア・画像をコピー・画像を保存）を隠し、［Xでポスト］だけにして、`app_error`（`image_render`）を送る。
- **代替の実装（iOS で問題が出たとき）：** Canvas 2D に直接描く実装に差し替える（09 検証3）。ポートの外側は変えない。

---

## 5. 結末ページと OGP

### 5.1 結末ページの生成（`tools/gen-result-pages.ts`。ビルドの最後に実行）
- 9種の結末ごとに `dist/results/{slug}/index.html` を出力する。JavaScript は使わない。
- スタイルは、ページ内の `<style>` に直接書く（数 KB。SPA の CSS には依存しない）。フォントは端末のフォントを使う（このページのためにフォントを読み込まない）。

### 5.2 `<head>` に入れるタグ

```html
<title>{結末名}｜限界SES社長</title>
<meta name="description" content="{結末の説明}">
<link rel="canonical" href="{origin}/results/{slug}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="限界SES社長">
<meta property="og:title" content="{結末名}｜限界SES社長">
<meta property="og:description" content="誰かこのブラック業界で1年間（52週）生き残ってみてくれ。">
<meta property="og:url" content="{origin}/results/{slug}/">
<meta property="og:image" content="{origin}/ogp/end_{id}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
```

- トップページ（`index.html`）にも同じ形式のタグを入れる（`og:image` はタイトル用の画像）。

### 5.3 OGP 画像の作り方
- 1200×630 の PNG。結末の一枚絵（1280×720）を中央で切り抜き、下部に結末名とゲーム名を重ねる。
- 作成は、素材が揃ったときに手元で1回だけ実行するスクリプト（`npm run ogp`。`sharp` で合成）で行い、`public/ogp/` にコミットする。ビルドのたびには作らない（ビルドを軽くするため）。
- 仮素材の段階でも、同じスクリプトで仮の OGP 画像を作っておく。

---

## 6. 外部への送信の一覧（プライバシーポリシーに書く内容）

| 送信先 | 送る情報 | 目的 | 止める方法 |
|---|---|---|---|
| Google（GA4） | 閲覧したページ、ゲーム内の操作（2.2 のイベント）、端末とブラウザの情報、Cookie の識別子 | 利用状況の分析、ゲームの改善 | EEA などでは同意しないことを選べる。広告ブロッカーやブラウザの設定でも止められる |
| Cloudflare（Web Analytics） | 閲覧したページ、表示の速さ、端末とブラウザの情報（Cookie は使わない） | アクセス数と表示の速さの把握 | ブラウザの設定や拡張機能で止められる |
| X（シェアのボタンを押したときだけ） | 投稿の文面、結末ページの URL | ユーザー自身による投稿 | ボタンを押さなければ送られない |
