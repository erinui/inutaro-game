# トップページ最新コンテンツ表示

最終更新: 2026-08-02

## 目的

トップページのYouTube、ブログ、グッズ、LINEスタンプを、各サービスの最新情報へ直接つながるカルーセルとして表示する。

## 表示ルール

- 取得上限は各ジャンル6件。
- 取得結果が6件ある場合は、先頭5件と `and more` カードを表示する。
- 取得結果が5件以下の場合は、取得できた全件のみを表示する。
- `and more` は各サービスの一覧ページへ別タブで遷移する。
- SPではカードを横スクロール、PCでは左右ボタンで操作する。

## データ元と更新方式

| ジャンル | データ元 | 更新方法 | 表示ファイル |
| --- | --- | --- | --- |
| YouTube | YouTube Data API v3 | GitHub Actionsで4時間ごとの10分 | `youtube-latest.json`、`youtube-thumb-1..5.jpg` |
| ブログ | `https://note.com/erinui/rss` | GitHub Actionsで4時間ごとの10分 | `note-latest.json` |
| グッズ | SUZURI API v1 | `SUZURI_ACCESS_TOKEN` 登録後、GitHub Actionsで4時間ごとの10分 | `suzuri-latest.json` |
| LINEスタンプ | LINE STORE作者ページの公開情報 | 現在は静的JSONを手動更新 | `line-stamps.json` |

## SUZURIの運用

SUZURI APIはアクセストークンを必要とする。GitHub Repository Secretとして `SUZURI_ACCESS_TOKEN` を登録する。未登録でもワークフローは失敗せず、既存の `suzuri-latest.json` とHTML内の案内カードをそのまま使う。

取得対象は商品名、商品URL、商品画像、税込価格、公開日時。トークンはブラウザ側のJavaScriptやJSONへ書き出さない。

## LINEスタンプの運用

LINE STOREには作者一覧を取得する安定した公開APIがないため、サイト公開中の自動スクレイピングは行わない。`line-stamps.json` に作者ページで確認した販売中作品の名称、商品URL、サムネイルURLを記録する。

新作公開時や販売終了時に、作者ページを確認してJSONを更新する。現在の登録作品は4件であるため、`and more` カードは表示しない。

## 障害時の扱い

- 取得JSONが読み込めない場合は、HTML内の案内カードを残す。
- GitHub Actionsの取得に失敗しても、直前に成功したJSONを表示し続ける。
- 外部サムネイルの読み込みに失敗しても、カード本文と遷移リンクは残す。
