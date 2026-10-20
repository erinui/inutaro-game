# エリカッテシティ サイト階層整理

最終更新: 2026-10-20（現行のマップ内移動・セクション順・共通化・ラベル撤去を反映）

サイト名称は「エリカッテシティ」。現在の状態は[開発まとめ](project-summary.md)、名称のルールは[総合仕様2.1](site-specification.md#21-サイト名称の設計ルール)を参照する。共通デザイン・ゲーム一覧カードは公開確認済み。補足・状態・特徴ラベル18件の撤去だけはローカル検証済み・GitHub／本番未反映。今回、ページ追加・URL変更・ファイル移動・Figma変更は行っていない。

## 1. 基本方針

本番ドメインのルートは、ゲーム単体ではなく「エリカッテシティ」という親ホームとして扱います。

親ホームから、ゲーム一覧、キャラクター紹介、ブログ、SNS、YouTube、グッズ、LINEスタンプ、規約ページへ移動できる構成です。

本番URL:

```text
https://erinui.com/
```

旧公開URL（現在も公開）:

```text
https://erinui.github.io/inutaro-game/
```

リポジトリの反映先は `main`。本番はCloudflare Workersの静的アセット配信で、Workers Buildsが `npx wrangler deploy` を実行します。`wrangler.jsonc` のcustom buildで `scripts/build-site.mjs` を実行し、公開対象だけをdistへ複製します。ソースの移動や参照パス変更はありません。旧GitHub Pagesはmainのルート公開を維持し、8HTMLの正規URL・外部共有は本番ドメインを指定します。旧ホスト限定の移転案内を `site-migration.js` で表示します。公開・検証状態は[SEO改善計画](seo-improvement-plan.md)を参照します。

SEO追加ファイル: `robots.txt`、`sitemap.xml`、`site-migration.js`、`_headers`、`wrangler.jsonc`、`scripts/build-site.mjs`、`tests/seo.test.mjs`、`tests/site-build.test.mjs`、`tests/fixtures/seo.json`。生成物distとWrangler作業領域はGit対象外。公開ビルドは8HTML、クライアントCSS/JS、版管理されたassets、`data/news.json`と検索/ヘッダー設定だけを含み、docs・tests・scripts・functions・drafts・試作・秘密は含みません。

以下の階層とファイル一覧は既存構成です。`.html`はソースのファイル名で、本番では拡張子なしURLへ転送されます。過去のOGP方針は旧公開時の記録として扱い、新しい改修ではSEO改善計画のURL対応表を優先します。ゲーム紹介の新設案は計画段階で、まだファイルや階層を追加していません。

## 2. 現在の階層

```text
/
├── index.html
│   └── エリカッテシティ トップ
│
├── games/
│   ├── index.html
│   │   └── ゲーム一覧
│   └── inutaro-mushi/
│       ├── index.html
│       │   └── 犬タローの虫さんまって×2
│       ├── game.js
│       │   └── ゲームロジック
│       └── style.css
│           └── ゲーム専用UI
│
├── pages/
│   ├── characters.html
│   │   └── キャラクター紹介
│   ├── illustrations.html
│   │   └── イラスト
│   ├── blog.html
│   │   └── おしらせ・ブログ
│   ├── terms.html
│   │   └── 利用規約
│   └── privacy.html
│       └── プライバシーポリシー
│
├── assets/
│   ├── home-city/
│   ├── characters/
│   ├── fonts/
│   ├── games/
│   │   └── inutaro-mushi/
│   └── アイコン
│
├── functions/
│   └── api/latest-youtube.js
│
├── scripts/
│   └── update-youtube-latest.mjs
│
├── home.css
├── home.js
└── site-nav.js
```

## 3. 公開ページ一覧

| URL | ファイル | 役割 |
| --- | --- | --- |
| `/` | `index.html` | エリカッテシティ トップ |
| `/games/` | `games/index.html` | ゲーム一覧 |
| `/games/inutaro-mushi/` | `games/inutaro-mushi/index.html` | ゲーム本体 |
| `/pages/characters` | `pages/characters.html` | キャラクター紹介 |
| `/pages/illustrations` | `pages/illustrations.html` | イラスト |
| `/pages/blog` | `pages/blog.html` | おしらせ・ブログ |
| `/pages/terms` | `pages/terms.html` | 利用規約 |
| `/pages/privacy` | `pages/privacy.html` | プライバシーポリシー |

表のURLは本番の正規URL。ローカル検証ではソースの`.html`パスを使う。既存の相対リンクをURL表記の整理だけで書き換えない。

## 4. トップページ導線

トップページは1100px以上で左固定マップ＋右情報、未満は縦積みです。マップ6スポットは同じページのおすすめへ移動し、そこにあるカード／「すべて見る」から詳細へ進みます。

| 導線 | 遷移先 | 備考 |
| --- | --- | --- |
| キャラクター | `#character-title` | 紹介ページへはカード／すべて見る |
| X | `https://x.com/erikanuinui` | 外部、別タブ |
| LINEスタンプ | `#line-stamp-title` | 販売作品・作者一覧へはカード／すべて見る |
| ゲーム | `#game-title` | ゲーム本体・一覧へはカード／すべて見る |
| グッズ | `#goods-title` | SUZURIへはカード／すべて見る |
| ブログ | `#blog-title` | noteへはカード／すべて見る |
| イラスト | `pages/illustrations.html` | 仮ページ |
| YouTube | `#youtube-title` | 動画・チャンネルへはカード／すべて見る |

YouTube看板は、最新3本のサムネイルと登録者数を10秒周期で切り替えます。

## 5. 共通ヘッダー

トップページと下層ページでは、共通ヘッダーの基本クラス名を統一しています。

| 種類 | クラス |
| --- | --- |
| ヘッダー | `.site-header` |
| ブランド | `.brand` |
| ナビ | `.site-nav` |

ルール:

- 左端はアイコン付きの「エリカッテシティ」
- ロゴは全7ページで犬タロー オリジン、PC72px／760px以下64px高。hover/focus-visibleは下線で統一
- 右側は主要ページへのリンク
- 現在ページへの重複リンクは置かない
- SPでは三本線メニューへ集約
- 開閉制御は `site-nav.js`

## 6. ページ別構成

### トップ

```text
index.html
```

構成:

- 共通ヘッダー
- ヒーロー
- まちを歩くマップ
- ニュース（新着順・最大12件、カテゴリ表示あり）
- キャラクター紹介
- ゲーム
- YouTube
- ブログ
- グッズ
- LINEスタンプ
- フッター

### ゲーム一覧

```text
games/index.html
```

構成:

- 共通ヘッダー
- ページヒーロー
- ゲームカード
- フッター

カードは画像上／本文下、PC2列・700px以下1列。TOPと同じ枠・影・余白とゲーム風景画像を使う。補足2件・状態2件のラベルはローカルで撤去済み。準備中カードの説明・非操作状態は維持する。

### ゲーム本体

```text
games/inutaro-mushi/index.html
```

構成:

- Canvasゲーム
- サウンドボタン
- スタート画面
- あそびかた
- SP横向きコントローラー
- 結果待機画面
- リザルト
- 保存・共有・フォロー導線

### キャラクター紹介

```text
pages/characters.html
```

構成:

- 共通ヘッダー
- ページヒーロー
- キャラクターカード一覧
- フッター

カードはPCで左右交互、900px以下で画像上・本文下の1カラム。犬タロー（オリジン）のみ、画像がカード上部からはみ出します。特徴タグ14件はローカルで撤去済み、名前の黄色背景は維持。PCオリジン画像面の最小高380pxと検証寸法は[画面設計書](screen-design-specification.md)を参照。

### おしらせ・ブログ

```text
pages/blog.html
```

現在はnoteへの導線ページです。

### 利用規約・プライバシーポリシー

```text
pages/terms.html
pages/privacy.html
```

現在は簡易版です。外部サービス、分析、問い合わせなどを追加する場合は内容を更新します。

## 7. 公開対象外・検討用

| パス | 扱い |
| --- | --- |
| `drafts/home-wireframe/` | ホーム検討用。本番導線からは分離 |
| `games/inutaro-3d-prototype/` | 3D試作。ゲーム一覧には未掲載 |
| `docs/server-migration-plan.md` | サーバー移行検討メモ |

上記のほか、旧マップ素材 `assets/home-city/city_*.png` と `assets/home-city/youtube-latest-thumb.jpg` は未追跡の旧素材候補です。削除、アーカイブ、正式管理のいずれにするかは `docs/site-improvement-plan.md` の方針に従って判断します。

## 8. 拡張ルール

### ゲーム追加

```text
games/
└── new-game-slug/
    ├── index.html
    ├── game.js
    └── style.css

assets/
└── games/
    └── new-game-slug/
        └── ゲーム専用画像・音声
```

追加時は `games/index.html` にカードを追加します。ゲーム専用の画像・音声は、サイト共通素材と混ざらないように `assets/games/{slug}/` に配置します。

### キャラクター追加

追加時は以下を更新します。

- `assets/characters/`
- `pages/characters.html`
- `home.css` のキャラクター別スタイル変数
- 必要に応じてトップの「なかまたち」

### 外部リンク追加・変更

確認箇所:

- トップのマップ
- トップのおしらせ
- フッター
- 固定ページ
- 本資料

## 9. 直近の整理対象

2026-07-26時点で、次に整理する対象は以下です。

| 対象 | 方針 |
| --- | --- |
| OGP・共有URL | 現在の公開URL `https://erinui.github.io/inutaro-game/` に合わせる |
| イラスト導線 | 仮ページ `pages/illustrations.html` に接続済み |
| トップのクラス名 | `site-*` / `.brand` / `.site-nav` 系へ変更済み |
| 固定ページOGP | キャラクター、ブログ、規約、ポリシー、イラストに基本OGP追加済み |
| YouTubeリンク | ユーザー向けリンクをハンドルURLへ統一済み |
| 未追跡ファイル | 旧素材、検討用、試作を分類して扱いを決める |

具体的な実装順序と確認項目は `docs/site-improvement-plan.md` を参照します。
