# GA4 のカスタム定義の一覧（Phase 1 時点）

ゲームから送るイベントのパラメータは、GA4 の管理画面で「カスタム定義」に登録しないと、標準のレポートや探索で使えません（イベントそのものの件数は登録しなくても見えます）。
登録は**登録した日から先のデータ**にだけ効きます（過去のデータには遡りません）。なるべく早く登録してください。

イベントとパラメータの設計は `docs/design/06_external_interface.md` 2.2、送る処理は `src/core/analytics.ts` と `src/ui/App.tsx`。

## 登録の手順
1. GA4 › 左下の **管理**（歯車）› プロパティ「限界SES社長」› **データの表示 › カスタム定義**。
2. 「**カスタム ディメンション**」タブ › **カスタム ディメンションを作成**。下の表 A を1行ずつ登録する。
   - ディメンション名：表の「表示名」（英字。下の注意を参照）
   - 範囲：**イベント**
   - イベント パラメータ：表の「パラメータ」（英字。そのまま入力）
3. 「**カスタム指標**」タブ › **カスタム指標を作成**。下の表 B を1行ずつ登録する（範囲：**イベント**、測定単位：表のとおり）。
   - 「説明」欄は日本語が使えるので、表の「日本語の名前」を入れておくと、後で見分けやすい。
4. 登録後、レポートに出るまで 24〜48 時間かかります。

> **注意（2026-11-20）：** 表示名（ディメンション名・指標名）には、**英字・数字・スペース・アンダースコアしか使えず、先頭は英字**でなければならない（日本語は入力できない）。そのため、表示名は英語にし、日本語の名前は「説明」欄に入れる。

## A. カスタム ディメンション（範囲：イベント）

| 表示名 | 説明（日本語の名前） | パラメータ | 送るイベント | 値の例 |
|---|---|---|---|---|
| Style | 経営スタイル | `style_id` | game_start、skill_used、game_clear | `taiikukai`／`gray_broker`／`tech_first` |
| Is Retry | 再挑戦か | `is_retry` | game_start | `true`／`false`（同じページ表示の中で2回目以降） |
| Ending | 結末 | `reason_id` | game_over、game_over_reason | `dev_zero`、`client_max` など8種 |
| Has Regret | 連鎖で倒産したか | `has_regret` | game_over | `true`／`false` |
| Achievement | 獲得称号 | `achievement_id` | game_clear | `white`、`emperor` など。なければ `none` |
| Week | 週 | `week_number` | skill_used、game_over、drop_at_week | `1`〜`52`（週ごとの分布を見るため、指標ではなくディメンションにする） |
| Milestone Week | 到達した節目 | `reached_week` | funnel_milestone | `13`／`26`／`39`／`52` |
| Share Type | シェアの種類 | `share_type` | share_intent_success | `XIntent`（Phase 2 で `WebShare` など） |
| Error Type | エラーの種類 | `error_type` | app_error | `uncaught`、`unhandled_rejection` など |

## B. カスタム指標（範囲：イベント）

| 表示名 | 説明（日本語の名前） | パラメータ | 測定単位 | 送るイベント | 意味 |
|---|---|---|---|---|---|
| Sales | 売上（万円） | `sales` | 標準 | game_over、game_clear | 累積売上 |
| Survival Week | 生存週数 | `survival_week` | 標準 | play_duration | 倒産した週の前の週まで（クリアは 52） |
| Play Duration | プレイ時間 | `duration_sec` | 秒 | play_duration | ラン開始から終わりまで |
| Play Count | プレイ回数（累計） | `play_count` | 標準 | すべて（共通） | その端末での累計のプレイ回数 |
| Days Since First Play | 初回からの日数 | `days_since_first_play` | 標準 | すべて（共通） | 初めて遊んだ日からの日数 |
| Plays In Session | このページでのプレイ回数 | `total_plays_in_session` | 標準 | retry_click | 同じページ表示の中で何回目か |

- 共通パラメータの `store_safe` は、Web 版では常に `false` なので登録しない（ストア版を出すときに登録する）。
- 上限（イベント範囲のディメンション 50、指標 50）には十分余裕がある。

## C. あわせて設定するもの（任意・おすすめ）
- **キーイベント**：管理 › データの表示 › イベント で、`game_clear` と `share_intent_success` の「キーイベントとしてマーク」をオンにする。KPI（要件 1.1-5 のシェア率など）をホームと各レポートで追いやすくなる。
  - 一覧にまだ出ていないイベント（`game_clear` など）は、1回届いた後に出る。先に設定したいときは「キーイベント › 新しいキーイベント」でイベント名を入力する。
- **データ保持期間**：管理 › データの収集と修正 › データ保持 で「イベントデータの保持」を **14 か月** にする（初期値は 2 か月。探索で長い期間を見るため）。

## 登録後の確かめ方
- 管理 › カスタム定義 に A の 9 件、B の 6 件が並んでいること。
- 翌々日以降、レポート › エンゲージメント › イベント › `game_over` を開き、表の右上の ＋ から「Ending」を追加すると、結末ごとの件数が見えること。
