# 05 データ設計書

> 版：1.0（2026-10-31） ／ 対象要件：`requirements_v1.12.md` ／ 関連：`01_architecture.md`、`04_game_logic.md`
> 目的：カードなどのコンテンツと、ブラウザに保存するデータの形を固める。カードの執筆と実装を並行して進められるようにし、ビルド時に自動で検証できるようにする。

---

## 1. データの全体像

| 区分 | 置き場所 | 形式 | 誰が書くか | 検証 |
|---|---|---|---|---|
| カード | `src/content/cards/*.json` | JSON | 執筆者（オーナー＋AI） | ビルド時（`validate:cards`） |
| スタイル・結末・称号・話者 | `src/content/*.ts` | TypeScript の定数 | 開発者 | 型チェック |
| UI 文言辞書 | `src/content/strings.ts` | TypeScript の定数 | 開発者・執筆者 | 型チェック |
| NG 社名リスト | `src/content/ng_company_names.ts` | TypeScript の定数 | 開発者（報告を受けて追加） | 型チェック |
| SaveData | LocalStorage `genkai_ses_savedata_v1` | JSON | アプリ | 読み込み時（zod） |
| 途中データ | sessionStorage `genkai_ses_session_v1` | JSON | アプリ | 読み込み時（zod） |

- カードだけを JSON にする理由：枚数が多く（Phase 1 で62枚、Phase 2 で100枚以上）、コードを書かない人でも編集しやすいようにするため。また、シミュレータや検証ツールから直接読めるようにするため。

---

## 2. ID の命名ルール

| 対象 | 形式 | 例 |
|---|---|---|
| 通常の共通カード | `n_{内容を表す英語}` | `n_resume_padding` |
| スタイル別カード | `s_{スタイル略称}_{内容}`（略称：`tk` 体育会系、`gb` グレー派遣、`tf` 技術至上） | `s_gb_double_dispatch` |
| 連鎖カード | `c_{内容}` | `c_resume_exposed` |
| 季節固定カード | `f_w{週}_{内容}` | `f_w13_newgrads` |
| 導入カード | `t_{番号}_{内容}` | `t_1_welcome` |
| 結末 | 要件 3.2 の `EndingId`（`cash_zero` など9種） | `dev_zero` |
| 称号 | 英小文字とアンダースコア | `white_company` |
| スタイル | 要件 3.2 の `StyleId` | `gray_broker` |
| 話者アイコン | `icon_{役割}`（要件 4.2 の8種と `icon_secretary` の計9種） | `icon_client_pm` |

- 使える文字は、英小文字・数字・アンダースコアだけ。最大40文字。
- **一度公開した ID は変えない。** SaveData の既読リスト（`seen_card_ids`）と図鑑が ID で記録しているため。カードを削除した場合でも、その ID は再利用しない。
- 結末ページの URL では、ID のアンダースコアをハイフンに置き換える（`dev_zero` → `/results/dev-zero/`）。

---

## 3. カード

### 3.1 ファイルの分け方

| ファイル | 中身 | MVP の枚数 |
|---|---|---|
| `cards/normal.json` | 通常の共通カード | 50 |
| `cards/style.json` | スタイル別カード（各スタイル5枚） | 0（**Phase 2 で15**。基本設計レビュー第4回で、Phase 1 の範囲から外した） |
| `cards/chain.json` | 連鎖カード | 6 |
| `cards/fixed.json` | 季節固定カード | 4 |
| `cards/tutorial.json` | 導入カード | 2 |

- どのファイルも、カードの配列を入れる。`kind` はファイルごとに決まっているが、ファイルの中にも明記する（読み込みの間違いを検出するため）。

### 3.2 カードの例

```json
[
  {
    "id": "n_resume_padding",
    "kind": "normal",
    "opening": true,
    "speaker_name": "営業 爽やか佐藤",
    "speaker_icon": "icon_sales",
    "message": "社長！元請けが「Java3年以上」じゃないと入れないって言ってます。新人の山田くん、半年なんですけど……",
    "choice_left": {
      "text": "正直に伝える",
      "effects": { "cash": -10, "client": -5, "dev": 5, "legal": 5 }
    },
    "choice_right": {
      "text": "経歴を3年に盛る",
      "effects": { "cash": 15, "client": 5, "dev": -10, "legal": -10 },
      "unethical": true,
      "inject_card_id": "c_resume_exposed",
      "inject_delay": [3, 10],
      "regret_text": "新人の経歴をJava歴3年に盛った"
    }
  },
  {
    "id": "c_resume_exposed",
    "kind": "chain",
    "speaker_name": "元請けPM 鬼塚",
    "speaker_icon": "icon_client_pm",
    "message": "（あの時、経歴を盛った新人が……）御社の山田さん、Javaのインターフェースを知らないんですが？ 契約、見直させてもらいますよ。",
    "choice_left": {
      "text": "平謝りして単価を下げる",
      "effects": { "cash": -20, "client": 5, "dev": -5, "legal": 0 }
    },
    "choice_right": {
      "text": "「本人の自己申告です」と突っぱねる",
      "effects": { "cash": 0, "client": -25, "dev": -10, "legal": -10 }
    }
  }
]
```

- 例の文面は、形式を示すための仮のもの。実際の文面は、要件 3.6 の執筆ガイドラインに従って書く（例の「突っぱねる」側のように、社長の責任逃れが報いを受ける構図にする）。

### 3.3 項目の定義と制約（zod スキーマ）

| 項目 | 型 | 必須 | 制約・説明 |
|---|---|---|---|
| `id` | string | ○ | 2章の命名ルール。全カードで重複しない |
| `kind` | `'normal' \| 'chain' \| 'fixed' \| 'tutorial'` | ○ | ファイルの種類と一致する。スタイル別カードは `normal` で、`style_only` を付ける |
| `style_only` | `StyleId` | | `style.json` のカードでは必須。それ以外では指定しない |
| `opening` | boolean | | `normal` のカードのみ。初回プレイで優先して引かれる |
| `fixed_week` | `13 \| 26 \| 39 \| 52` | | `fixed` のカードでは必須 |
| `tutorial_week` | `1 \| 2` | | `tutorial` のカードでは必須（**要件の型への追加**。どの週に出すかを示す） |
| `speaker_name` | string | ○ | 1〜16文字 |
| `speaker_icon` | 話者アイコンの ID | ○ | 要件 4.2 の8種と `icon_secretary`（2026-11-10 追加）の計9種のどれか |
| `message` | string | ○ | 1〜**100文字**（スマホの画面で読み切れる量。02 画面設計書で最終確認する） |
| `message_store_safe` | string | | Web版PoCでは書かない |
| `choice_left` / `choice_right` | Choice | ○ | 下表 |

**Choice**

| 項目 | 型 | 必須 | 制約・説明 |
|---|---|---|---|
| `text` | string | ○ | 1〜**20文字**（ボタンに収まる量） |
| `text_store_safe` | string | | Web版PoCでは書かない |
| `effects` | `{ cash?, client?, dev?, legal? }` | ○ | 各 −100〜100 の整数（要件の範囲）。**変化しない項目は省略してよく、読み込み時に 0 で補う**（`.default(0)`）。4つ以外のキー（`lgal` のような書き間違い）はエラーにする（`z.strictObject`）。**絶対値が40を超える値は警告**を出す（バランスを壊しやすいため） |
| `unethical` | boolean | | true のとき、`inject_card_id` と `regret_text` が必須（要件 3.6-3） |
| `inject_card_id` | string | | `chain` のカードの ID でなければならない |
| `inject_delay` | `[min, max]` | | 1 ≦ min ≦ max ≦ 20 の整数。省略時は `[2, 6]` |
| `regret_text` | string | | `inject_card_id` があるときは必須。1〜30文字。動詞の過去形で終わる一文にする（例：「新人の経歴をJava歴3年に盛った」）。「敗因：第5週『…』」の形で表示する |
| `regret_text_store_safe` | string | | Web版PoCでは書かない |

### 3.4 カード全体の検証（`validate:cards`。要件 7.5-2）

| # | 検査 | 重大度 |
|---|---|---|
| V1 | zod スキーマに合っているか（3.3） | エラー |
| V2 | ID が全カードで重複していないか | エラー |
| V3 | `inject_card_id` の参照先が存在し、`kind: 'chain'` か | エラー |
| V4 | `unethical: true` の選択肢に `inject_card_id` と `regret_text` があるか | エラー |
| V4b | `inject_card_id` を持つすべての選択肢に、`regret_text`（1〜30文字）があるか（`unethical` の有無を問わない。zod の `.refine()` でスキーマに組み込む） | エラー |
| V5 | 季節固定カードが Week 13 / 26 / 39 / 52 に1枚以上ずつあるか | エラー |
| V6 | 導入カードが Week 1 / 2 に1枚ずつあるか | エラー |
| V7 | すべての連鎖カードが、どこかの選択肢（または切り札）から参照されているか | 警告（参照されない連鎖カードは表示されない） |
| V8 | `opening: true` のカードが8枚以上あるか（要件 3.2） | 警告 |
| V9 | 各スタイルの `style_only` カードが5枚ずつあるか（Phase 2 から検査する。Phase 1 では `style.json` が空でもよい） | 警告 |
| V10 | 効果値の絶対値が40を超えていないか | 警告 |
| V11 | 両方の選択肢の効果値がまったく同じでないか（選ぶ意味がなくなる） | 警告 |
| V12 | 文面に NG 社名リストの語が含まれていないか（要件 3.6-5） | エラー |
| V13 | カードの文面と UI 文言に使われている文字の一覧を出力する（フォントのサブセット化に使う） | 情報 |

- エラーが1つでもあれば、ビルドを失敗させる。警告は表示するだけで、ビルドは続ける。

---

## 4. マスターデータ（TypeScript の定数）

### 4.1 スタイル（`styles.ts`）

```ts
interface StyleDef {
  id: StyleId;
  name: Text;               // 例：{ web: 'グレー派遣ブローカー', store: '多重商流ブローカー' }
  description: Text;        // スタイル選択画面に出す説明
  passives: Passive[];      // 04 の 7.1。例：{ param: 'cash', direction: 'gain', factor: 1.3 }
  trump: {
    name: Text;             // 例：{ web: '多重商流ブースト' }（v1.13 から web 表記も言い換えた表現。store は必要になったときだけ）
    effects: ChoiceEffect;
    inject?: InjectionParam;   // { cardId, delay, regretText: Text }。04 の 6.3 と同じ型
  };
}
type Text = { web: string; store?: string };   // store は Web版PoCでは任意（要件 3.3）
```

- 値は 04 の 7.2 の表のとおり（暫定値）。

### 4.2 結末（`endings.ts`）

| 項目 | 説明 |
|---|---|
| `id` | `EndingId`（9種） |
| `param` / `direction` | 死因のパラメータと向き（`clear` には無い） |
| `title` | 結末名（例：「全員蒸発エンド」） |
| `subtitle` | 補足（例：「退職代行から一斉に連絡が来た」） |
| `selfComment` | 敗因がないときにシェア文の3行目に入れる、定型の自虐コメント（要件 3.4） |
| `image` | `end_{id}.webp`（`src/assets` から import） |
| `ogpImage` | `/ogp/end_{id}.png`（固定パス） |
| `slug` | URL 用（`dev-zero`） |

### 4.3 称号（`achievements.ts`）

| 項目 | 説明 |
|---|---|
| `id` | 04 の 8.3 の表の ID |
| `name` | `Text`（web / store） |
| `description` | 図鑑に出す取得条件の説明 |
| `priority` | 1〜6（小さいほど優先） |
| `hidden` | 取得前は図鑑で条件を伏せるか（初期値は全称号 false） |

- 判定の閾値（65、40、10000、9）は `balance.ts` にまとめて置き、シミュレータから上書きできるようにする。

### 4.4 UI 文言辞書（`strings.ts`）

```ts
export const strings = {
  title: { catchCopy: { web: '今期も、誰もバックれませんように。' } },
  result: { notice: { web: '※会社名はプレイヤーが入力した架空の名称です。本作はフィクションです。' } },
  // …画面ごとにまとめる
} satisfies Record<string, Record<string, Text>>;
```

- 取り出しは `t(text)` 関数で行う。Store-Safe Mode が有効で `store` があれば `store` を返し、それ以外は `web` を返す（要件 7.4-2）。

---

## 5. SaveData（LocalStorage）

### 5.1 形式

```ts
// キー：'genkai_ses_savedata_v1'
interface SaveData {
  schema_version: 1;
  first_played_at: string | null;  // ISO 8601。最初の game_start で設定（それまでは null）
  last_played_at: string | null;
  play_count: number;              // game_start のたびに +1
  sound_enabled: boolean;          // 初期値 false
  last_company_name: string;       // 初期値 ''
  seen_card_ids: string[];         // 既読カード（重複なし）
  heartbeat_sent: boolean;         // 初期値 false
  unlocked_endings: EndingId[];
  unlocked_achievements: string[];
  high_score: { max_weeks: number; max_sales: number };
}
```

- **要件からの変更：** `first_played_at` と `last_played_at` を `null` 許容にした。初めて訪れた人がまだ一度もプレイしていない状態を表すため（D1 / D7 は初回プレイの日を起点にする）。

### 5.2 書き込むタイミング

| きっかけ（04 のイベント） | 更新する項目 |
|---|---|
| `runStarted` | `play_count` +1、`first_played_at`（null なら現在時刻）、`last_played_at`、`last_company_name` |
| `cardShown` | `seen_card_ids` に追加（**メモリ上だけ**で更新し、下の「まとめて保存」で書き込む） |
| `heartbeat_10s` の送信 | `heartbeat_sent = true` |
| `gameOver` / `gameClear` | `unlocked_endings`、`unlocked_achievements`、`high_score`、**まとめて保存** |
| ページが隠れたとき（`visibilitychange` → hidden） | **まとめて保存** |
| 設定画面での操作 | `sound_enabled` |

- `seen_card_ids` を毎ターン書き込まないのは、書き込み回数を減らすため。途中でページを閉じても、`visibilitychange` の時点で保存される。

### 5.3 読み込みと移行

```
raw ← storage.getItem(key)                      // 例外は SaveRepository 内で処理（要件 7.2-4）
if raw is null: return defaults
data ← JSON.parse(raw)（失敗したら defaults）
while data.schema_version < CURRENT:
  data ← migrations[data.schema_version](data)  // 例：migrations[1] は v1 → v2
data ← SaveDataSchema.safeParse(data)（失敗したら defaults）
data.seen_card_ids ← 現存するカードの ID だけに絞る
```

- 移行に失敗した場合や、データが壊れている場合は、初期データで作り直す（要件 3.5）。そのとき、壊れた生データは `genkai_ses_savedata_v1_broken` に1世代だけ退避する（問い合わせ対応のため）。
- `schema_version` が現在より**新しい**場合（古い版のページがキャッシュから開かれたときなど）は、上書きしないように、そのセッションでは読み取り専用で扱う。

---

## 6. 途中データ（sessionStorage）

```ts
// キー：'genkai_ses_session_v1'
interface SessionSnapshot {
  schema_version: 1;
  state: RuntimeGameState;     // 04 の追加項目（rngState、shownChainCardIds）を含む
  saved_at: string;
  content_hash: string;        // カードの「構造」のハッシュ（ビルド時に計算。下記）
}
```

| タイミング | 処理 |
|---|---|
| `step` が `ending` 未設定の状態を返したとき | 上書き保存する |
| `gameOver` / `gameClear` | 削除する |
| タイトル画面の表示時 | 読み込み、検証に通れば「続きから再開」を表示する |

- **復元の条件：** zod の検証に通ること、`content_hash` が現在のカードデータの構造と一致すること。一致しない場合は、カード ID の参照が壊れるおそれがあるので、途中データを破棄する。
- **`content_hash` の計算対象（基本設計レビュー第4回で変更）：** カードの**構造に関わる項目だけ**を対象にする。具体的には、各カードの `id`、`kind`、`style_only`、`fixed_week`、`tutorial_week`、`opening` と、各選択肢の `inject_card_id`。カードの並びは ID 順にそろえてから計算する。
  - 本文・選択肢の文言・話者名・敗因の文言・効果値は、対象に**含めない**。誤字の修正や数値の調整を公開しても、プレイ中のデータは消えない（再開後のカードは新しい文言・数値で表示される）。
  - カードの追加・削除、連鎖のつなぎ替え、季節固定の週の変更など、途中データの参照が壊れうる変更のときだけ、途中データを破棄する。
- **要件からの変更：** `content_hash` を追加した（上の理由のため）。

---

## 7. 型定義のまとめ（要件 3.2 からの差分）

| 型 | 追加・変更 | 理由 | 出典 |
|---|---|---|---|
| `EventCard` | `tutorial_week` を追加 | 導入カードの表示週を示すため | 本書 3.3 |
| `EventCard` | `speaker_icon` を、ファイル名（`icon_sales.webp`）ではなく ID（`icon_sales`）にする | 画像はハッシュ付きの URL で読み込むため（01 の D8）。ID から import 済みの画像を引く | 本書 2章 |
| `RuntimeGameState` | `rngState`、`shownChainCardIds` を追加 | 途中再開での乱数の再現、連鎖は1ランに1回まで | 04 の10章 |
| `PendingInjection` ほか | 敗因の文言（`regretText`）の型を `string` から `Text` に | 切り札の敗因も web / store を持てるようにするため | 04 の10章 |
| 新規 `InjectionParam` | 連鎖の予約の入力をそろえる型（`cardId`、`delay`、`regretText`） | 選択肢と切り札で項目名が違っていたため | 04 の 6.3 |
| `SaveData` | `first_played_at` / `last_played_at` を null 許容に | 未プレイの状態を表すため | 本書 5.1 |
| `SessionSnapshot` | `content_hash` を追加 | 版が変わったときに壊れた途中データを使わないため | 本書 6章 |

- これらは基本設計の完了時に、要件書へまとめて反映する。
