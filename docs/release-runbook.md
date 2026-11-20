# リリース手順書（限界SES社長）

`https://promptlab-games.com/genkai-ses/` への公開と更新の手順。初回の公開（Phase 1-C、2026-11-19〜20）で実際に行った流れと確認結果を記録する。
仕組みの説明は `docs/design/11_platform_integration.md`、Cloudflare と GA4 の設定は `docs/implementation/02_cloudflare_setup.md`。

## 1. 構成のおさらい

```
ブラウザ ─→ promptlab-games.com/genkai-ses/*  ─┐
         └→ staging.promptlab-games.com/genkai-ses/* ─┤ Router Worker（promptlab-games-router）
                                                      │  /genkai-ses を削って転送
                                                      ↓
                    genkai-ses-origin.promptlab-games.com（Cloudflare Pages「genkai-ses」の本番ブランチ develop）
```

- 本番とステージングは**同じ配信元**（develop のビルド）を使う。ステージングは「Router を通した本番の見え方」を先に確かめる場所で、別のビルドではない。
- GA4 は本番のホスト（`promptlab-games.com`）でだけ読み込む。ほかのホストでは、イベントを開発者ツールのコンソールに `[analytics] ...` と出す（06 の 2.1）。
- Cloudflare Web Analytics は、ブランド共通の自動挿入に任せる（トークンは設定しない）。

## 2. 通常の更新（ゲームだけを直すとき）

1. AI が `feature/〇〇` で作業し、プルリクエストを作る。CI（lint、カードの検証、単体テスト、ビルド、容量、E2E）が通ることを確認する。
2. 見た目や操作を確かめたいときは、AI が同じ内容を `preview/phase〇〇` にも push する。Pages のプレビュー URL で確認する（`base` が `/` になる。08 の 6.1）。
3. オーナーがプルリクエストをマージする → develop が本番ブランチなので、Pages が自動でビルドして**そのまま本番に反映**される（数分）。
4. ステージング（`staging.promptlab-games.com/genkai-ses/`）か本番で、変更点を確かめる。

- `docs/` だけの変更では Pages はビルドしない。
- 遊んでいる途中の人は、カードの構造が変わると途中データが破棄される（`content_hash`）。カードの文言や数値だけの変更なら残る。

## 3. 初回の公開（Phase 1-C）の手順と結果

| 順 | 作業 | 担当 | 結果（2026-11-19〜20） |
|---|---|---|---|
| 1 | Router に転送ルールを追加（`/genkai-ses` → 308、`/genkai-ses/*` → オリジン）。テスト 9 件追加 | AI | promptlab-games-router #1。33 件成功 |
| 2 | Portal に `coming-soon` で登録、プライバシーポリシーに計測を追記 | AI | promptlab-games #1 |
| 3 | 2つのプルリクエストのマージ | オーナー | 済 |
| 4 | Pages にカスタムドメイン `genkai-ses-origin.promptlab-games.com` を追加し、Active を待つ | オーナー | 済 |
| 5 | Router のデプロイ（`npm run deploy`）。**4 より後に行う**（先だと `/genkai-ses/` がエラーになる） | オーナー | 済。この時点で本番の URL も開く（一覧には出ない） |
| 6 | ステージングで確認（下の 4章） | AI＋オーナー | 問題なし。指摘 2 件を修正（GA4 を本番のホストだけに：#14、ボタンで選んだ後の予兆ドット：#15） |
| 7 | Portal の掲載を `live` に（トップの一覧、ヘッダー、About、サイトマップ） | AI → オーナー | promptlab-games #2 |
| 8 | 本番で確認（下の 4章） | オーナー＋AI | 問題なし |

## 4. 確認のチェックリスト（要件 8.6）

### AI が確かめること（ブラウザから取得して確認）
- [x] `/genkai-ses` → `/genkai-ses/` に移動し、ゲームが起動する。コンソールにエラーがない
- [x] JavaScript（`max-age=31536000, immutable`）、フォント2種、OGP 画像（`max-age=86400`）が 200 で返る。HTML は `max-age=0, must-revalidate`
- [x] 結末ページ（`/genkai-ses/results/dev-zero` など）が、結末名のタイトルと OGP 画像付きで返る。UTM のクエリが付いていても同じ
- [x] CSP のヘッダーが付いている
- [x] 似た名前のパス（`/genkai-ses-foo/`）はゲームに転送されず、ポータルに行く
- [x] 既存の KANBAN PANIC、OFFICE CLASH、ポータルのトップとプライバシーポリシーが 200
- [x] `robots.txt` が X（Twitterbot）を禁止していない
- 存在しないパス（例：`/genkai-ses/nope.js`）はゲームのトップを返す（Pages の標準の動き。設計どおり）

### オーナーが確かめること（実機・管理画面）
- [x] スマホと PC で1回遊んでリザルトまで進める
- [x] 途中でリロードしても続きから再開できる
- [x] 結末ページの［このブラック業界に挑む］でゲームに戻れる
- [x] プライバシーポリシーにアクセス解析の章が出ている
- [x] ポータルのトップとヘッダーからゲームに入れる
- [x] GA4 の「リアルタイムの概要」に `game_start`、`game_over`、`game_over_reason`、`play_duration` が届く（本番のみ。広告ブロッカーはオフで）
- [x] ［Xでポスト］の下書きに、結末の画像付きのカードが出る

## 5. 戻したいとき
- **ゲームの不具合：** 問題のプルリクエストを GitHub で Revert して、そのプルリクエストをマージする（develop が戻り、自動で再デプロイ）。急ぐときは、Cloudflare Pages › genkai-ses › Deployments で直前のデプロイの「Rollback」でもよい。
- **公開そのものを止める：** Portal の掲載を `coming-soon` に戻す（一覧から消える）。URL ごと止めるときは、Router の転送ルールを外すプルリクエストを作ってデプロイする（他のタイトルには影響しない）。

## 6. 公開後の残り
- GA4 のカスタム定義の登録（`docs/implementation/03_ga4_custom_definitions.md`）。
- X のカードで、画像の左下に X のタイトルの帯が重なり、一枚絵の結末名が一部隠れる。Phase 2 の画像付きシェアの作業で、OGP 画像の結末名の位置を上げることを検討する。
