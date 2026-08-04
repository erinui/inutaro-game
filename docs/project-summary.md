# erinui / 犬タローゲーム 開発まとめ

最終更新: 2026-07-26

## 1. 目的

この資料は、現在のサイト全体像を短く把握するための概要資料です。

詳細は以下を参照します。

| 資料 | 内容 |
| --- | --- |
| `docs/site-specification.md` | サイト全体の構成、仕様、技術設計、デザインルール |
| `docs/site-structure.md` | ページ階層と導線 |
| `docs/site-improvement-plan.md` | 未着手項目、改善設計、実装手順 |
| `docs/game-design-spec.md` | ゲーム「犬タローの虫さんまって×2」の詳細仕様 |
| `docs/youtube-latest-api.md` | YouTube最新情報取得の設計 |
| `docs/home-latest-content.md` | トップのYouTube、note、SUZURI、LINEスタンプ最新情報表示 |
| `docs/performance-optimization-review.md` | ゲームパフォーマンス改善検討 |
| `docs/directory-structure-review.md` | フォルダ構成、素材整理、公開対象の確認 |

## 2. 現在の全体像

現在は `erinui/inutaro-game` リポジトリで、以下をまとめて管理しています。

- えりぬいシティ トップ
- ゲーム一覧
- ゲーム「犬タローの虫さんまって×2」
- キャラクター紹介
- イラスト
- おしらせ・ブログ
- 利用規約
- プライバシーポリシー
- YouTube最新情報取得ロジック

現在の公開URL:

```text
https://erinui.github.io/inutaro-game/
```

将来的な親ホーム想定:

```text
https://erinui.github.io/
```

## 3. ページ構成

```text
/
├── index.html
│   └── えりぬいシティ トップ
├── games/
│   ├── index.html
│   └── inutaro-mushi/
│       ├── index.html
│       ├── game.js
│       └── style.css
├── pages/
│   ├── characters.html
│   ├── illustrations.html
│   ├── blog.html
│   ├── terms.html
│   └── privacy.html
└── assets/
    ├── home-city/
    ├── characters/
    ├── fonts/
    └── games/inutaro-mushi/
```

トップページは「まちを歩く」マップ型ナビゲーションを中心に、ゲーム、キャラクター、SNS、YouTube、ブログ、グッズ、LINEスタンプへの導線を持ちます。

## 4. 主要機能

| 領域 | 内容 |
| --- | --- |
| トップ | 縦長マップ、YouTube看板、装飾アニメーション、おしらせ、なかまたち |
| ゲーム一覧 | 公開中ゲームと準備中ゲームをカード表示 |
| ゲーム本体 | 40秒の虫さん捕獲ゲーム、固定横画面、保存・共有、音声 |
| キャラクター紹介 | 画像込みプロフィールカード、左右交互配置、犬タローのはみ出し演出 |
| イラスト | 将来のイラスト掲載用ページ。現在は準備中表示 |
| 外部リンク | X、YouTube、note、SUZURI、LINEスタンプ |
| YouTube | マップ看板では最新3本と登録者数を10秒ごとに切り替え、カルーセルでは最新5本とand moreを表示 |
| ブログ・グッズ・LINEスタンプ | note、SUZURI、LINE STOREの最新導線をカルーセルで表示 |

## 5. デザイン方針

- 手描き感のあるポップな公式サイト
- 黒い太線、ステッカー風ラベル、角丸カード
- サイト全体で `けいなんポップ体` を使用
- テキストの白・灰色ドロップシャドウは控え、読みやすさを優先
- トップと下層ページで共通ヘッダーの見た目を統一
- SPでは三本線メニューに集約

## 6. 技術構成

| ファイル | 役割 |
| --- | --- |
| `index.html` | トップページ |
| `home.css` | トップ、下層ページ、共通ヘッダーのスタイル |
| `home.js` | YouTube看板、マップ装飾、最新コンテンツカルーセル |
| `site-nav.js` | SPメニュー |
| `games/index.html` | ゲーム一覧 |
| `games/inutaro-mushi/index.html` | ゲーム本体HTML |
| `games/inutaro-mushi/style.css` | ゲームUI |
| `games/inutaro-mushi/game.js` | ゲームロジック |
| `functions/api/latest-youtube.js` | Cloudflare Pages Functions用YouTube API |
| `scripts/update-youtube-latest.mjs` | GitHub Actions用YouTube更新 |
| `scripts/update-note-latest.mjs` | GitHub Actions用note RSS更新 |
| `scripts/update-suzuri-latest.mjs` | GitHub Actions用SUZURI商品更新 |

## 7. 公開・更新

- 開発元は `main`
- GitHub Pages公開は `main` のルートを前提
- YouTube最新情報は GitHub Actions で4時間ごとの10分に自動更新
- GitHub Pagesでは静的JSONとサムネイル画像を配信
- Cloudflare移管時は `/api/latest-youtube` を動的APIとして利用可能

## 8. 未設定・検討中

| 項目 | 状態 |
| --- | --- |
| イラストページ | 仮ページを設置済み。内容は今後追加 |
| ブログ内製化 | 現在はnoteへの外部導線 |
| Cloudflare移管 | API実装は用意済み。環境変数設定が必要 |
| ルートサイト移行 | `https://erinui.github.io/` 直下運用は今後検討 |
| `drafts/home-wireframe/` | 検討用。本番導線とは分離 |
| `games/inutaro-3d-prototype/` | 試作。本番ゲーム一覧には未掲載 |

## 9. 直近の改善対応計画

2026-07-26時点のサイト全体確認で、実装修正前に以下の対応方針を整理しました。詳細は `docs/site-improvement-plan.md` を参照します。

| 優先度 | 項目 | 方針 |
| --- | --- | --- |
| 高 | OGP・共有URL | 現在の公開URL `https://erinui.github.io/inutaro-game/` に合わせて実装済み |
| 高 | 公開ブランチ記述 | 監査時に見つかった `gh-pages` 前提を `main` 公開前提へ更新済み |
| 高 | `draft-*` クラス名 | 本番トップの検討用命名を `site-*` 系へ整理済み |
| 高 | 未追跡ファイル | 旧素材、検討用、試作を分類して扱いを決める |
| 中 | イラスト導線 | `href="#"` を解消し、仮ページへ接続済み |
| 中 | 固定ページOGP | キャラクター、ブログ、規約、ポリシー、イラストに基本OGPを追加済み |
| 中 | YouTubeリンク | ユーザー向けリンクをハンドルURLへ統一済み |
