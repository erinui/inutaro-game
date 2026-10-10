# トップページ最新コンテンツ表示

最終更新: 2026-10-11（SEO・読み込み改善Aはローカル実装、未公開）

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
| ブログ | note RSSと記事ページのOGP画像 | GitHub Actionsで4時間ごとの10分 | `note-latest.json`、`note-thumb-1..6.(png/jpg/webp)` |
| グッズ | SUZURI API v1 | `SUZURI_ACCESS_TOKEN` 登録後、GitHub Actionsで4時間ごとの10分 | `suzuri-latest.json` |
| LINEスタンプ | LINE STORE作者ページの公開情報 | 現在は静的JSONを手動更新 | `line-stamps.json` |

## ブラウザでの読み込み

本番 `erinui.com`、ローカルlocalhost/127.0.0.1、GitHub PagesではYouTubeの静的JSONを先に読み、正常応答ならAPIへアクセスしない。その他のHTTPホストでは既存APIを先に試す。HTTP失敗・ネットワーク例外・JSON解析失敗・無効データの場合は次候補を1回試し、両方失敗時はHTMLの初期表示を保持する。

4ジャンルのJSONは `cache: no-cache` で再検証し、未変更時は保存された本文を再利用する。カード画像はsrc設定前にlazy/asyncを指定し、画面内に入るタイミングで表示する。マップの看板サムネは遅延読み込みにしない。取得件数・10秒表示切替・生成周期・URLは従来どおり。詳細と検証結果は[SEO・読み込みSDD](seo-performance-sdd.md)を参照。

## SUZURIの運用

SUZURI APIはアクセストークンを必要とする。GitHub Repository Secretとして `SUZURI_ACCESS_TOKEN` を登録する。未登録でもワークフローは失敗せず、既存の `suzuri-latest.json` とHTML内の案内カードをそのまま使う。

取得対象は商品名、商品URL、商品画像、税込価格、公開日時。トークンはブラウザ側のJavaScriptやJSONへ書き出さない。

## Noteの運用

`scripts/update-note-latest.mjs` は、note RSSから最新6記事のタイトル、概要、URL、公開日を取得する。その後、各記事ページの `og:image` を取得し、上下の黒帯をトリミングしてサイト内の `assets/home-city/note-thumb-*` として保存する。

- ブログ枠とおしらせ枠は、保存済みの見出し画像を `16:9` のカード画像として表示する。
- 画像が未設定、取得失敗、形式未対応の場合は、既存のブログ建物イラストを表示する。
- 以前の取得結果に含まれなくなったサムネイルは更新時に削除する。
- ブラウザからnoteを直接取得しないため、CORSや外部画像の一時的な表示失敗の影響を受けにくい。

## LINEスタンプの運用

LINE STOREには作者一覧を取得する安定した公開APIがないため、サイト公開中の自動スクレイピングは行わない。`line-stamps.json` に作者ページで確認した販売中作品の名称、商品URL、サムネイルURLを記録する。

新作公開時や販売終了時に、作者ページを確認してJSONを更新する。現在の登録作品は4件であるため、`and more` カードは表示しない。

## 障害時の扱い

- 取得JSONが読み込めない場合は、HTML内の案内カードを残す。
- GitHub Actionsの取得に失敗しても、直前に成功したJSONを表示し続ける。
- 外部サムネイルの読み込みに失敗しても、カード本文と遷移リンクは残す。
