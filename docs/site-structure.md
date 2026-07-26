# erinui サイト階層整理

最終更新: 2026-07-26

## 1. 基本方針

GitHub Pagesのルートは、ゲーム単体ではなく「えりぬいシティ」という親ホームとして扱います。

親ホームから、ゲーム一覧、キャラクター紹介、ブログ、SNS、YouTube、グッズ、LINEスタンプ、規約ページへ移動できる構成です。

現在の公開確認URL:

```text
https://erinui.github.io/inutaro-game/
```

将来的な想定URL:

```text
https://erinui.github.io/
```

現在のリポジトリでは `main` のルートをGitHub Pagesの公開元として扱います。将来的に `https://erinui.github.io/` 直下へ移行するまでは、外部共有用の絶対URLは `https://erinui.github.io/inutaro-game/` を基準にします。

## 2. 現在の階層

```text
/
├── index.html
│   └── えりぬいシティ トップ
│
├── games/
│   ├── index.html
│   │   └── ゲーム一覧
│   └── inutaro-mushi/
│       ├── index.html
│       │   └── 犬タローの虫さんまってまって
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
| `/` | `index.html` | えりぬいシティ トップ |
| `/games/` | `games/index.html` | ゲーム一覧 |
| `/games/inutaro-mushi/` | `games/inutaro-mushi/index.html` | ゲーム本体 |
| `/pages/characters.html` | `pages/characters.html` | キャラクター紹介 |
| `/pages/illustrations.html` | `pages/illustrations.html` | イラスト |
| `/pages/blog.html` | `pages/blog.html` | おしらせ・ブログ |
| `/pages/terms.html` | `pages/terms.html` | 利用規約 |
| `/pages/privacy.html` | `pages/privacy.html` | プライバシーポリシー |

## 4. トップページ導線

トップページは、縦長マップを中心にしたナビゲーションです。

| 導線 | 遷移先 | 備考 |
| --- | --- | --- |
| キャラクター | `pages/characters.html` | サイト内 |
| X | `https://x.com/erikanuinui` | 外部、別タブ |
| LINEスタンプ | `https://store.line.me/emojishop/author/2919902/ja` | 外部、別タブ |
| ゲーム | `games/` | サイト内 |
| グッズ | `https://suzuri.jp/erikanuinui` | 外部、別タブ |
| ブログ | `https://note.com/erinui` | 外部、別タブ |
| イラスト | `pages/illustrations.html` | 仮ページ |
| YouTube | YouTubeチャンネル | 外部、別タブ |

YouTube看板は、最新3本のサムネイルと登録者数を10秒周期で切り替えます。

## 5. 共通ヘッダー

トップページと下層ページでは、共通ヘッダーの基本クラス名を統一しています。

| 種類 | クラス |
| --- | --- |
| ヘッダー | `.site-header` |
| ブランド | `.brand` |
| ナビ | `.site-nav` |

ルール:

- 左端はアイコン付きの「えりぬいシティ」
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
- おしらせ
- なかまたち
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

カードはPCで左右交互、SPで1カラムにします。犬タロー（オリジン）のみ、画像がカード上部からはみ出す演出を持ちます。

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
