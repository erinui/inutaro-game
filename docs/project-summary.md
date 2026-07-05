# erinui / 犬タローゲーム 開発まとめ

最終更新: 2026-07-05

## 1. 目的

この資料は、現在のサイト全体像を短く把握するための概要資料です。

詳細は以下を参照します。

| 資料 | 内容 |
| --- | --- |
| `docs/site-specification.md` | サイト全体の構成、仕様、技術設計、デザインルール |
| `docs/site-structure.md` | ページ階層と導線 |
| `docs/game-design-spec.md` | ゲーム「犬タローの虫さんまってまって」の詳細仕様 |
| `docs/youtube-latest-api.md` | YouTube最新情報取得の設計 |
| `docs/performance-optimization-review.md` | ゲームパフォーマンス改善検討 |

## 2. 現在の全体像

現在は `erinui/inutaro-game` リポジトリで、以下をまとめて管理しています。

- えりぬいシティ トップ
- ゲーム一覧
- ゲーム「犬タローの虫さんまってまって」
- キャラクター紹介
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
| 外部リンク | X、YouTube、note、SUZURI、LINEスタンプ |
| YouTube | 最新3本のサムネイルと登録者数を10秒ごとに切り替え |

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
| `home.js` | YouTube看板、マップ装飾 |
| `site-nav.js` | SPメニュー |
| `games/index.html` | ゲーム一覧 |
| `games/inutaro-mushi/index.html` | ゲーム本体HTML |
| `games/inutaro-mushi/style.css` | ゲームUI |
| `games/inutaro-mushi/game.js` | ゲームロジック |
| `functions/api/latest-youtube.js` | Cloudflare Pages Functions用YouTube API |
| `scripts/update-youtube-latest.mjs` | GitHub Actions用YouTube更新 |

## 7. 公開・更新

- 開発元は `main`
- GitHub Pages公開は `gh-pages`
- YouTube最新情報は GitHub Actions で4時間ごとの10分に自動更新
- GitHub Pagesでは静的JSONとサムネイル画像を配信
- Cloudflare移管時は `/api/latest-youtube` を動的APIとして利用可能

## 8. 未設定・検討中

| 項目 | 状態 |
| --- | --- |
| イラストページ | マップ導線はあるが遷移先は未設定 |
| ブログ内製化 | 現在はnoteへの外部導線 |
| Cloudflare移管 | API実装は用意済み。環境変数設定が必要 |
| ルートサイト移行 | `https://erinui.github.io/` 直下運用は今後検討 |
| `drafts/home-wireframe/` | 検討用。本番導線とは分離 |
| `games/inutaro-3d-prototype/` | 試作。本番ゲーム一覧には未掲載 |
