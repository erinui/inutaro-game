# erinui サイト階層整理

最終更新: 2026-06-20

## 公開サイトの基本方針

GitHub Pages のルートは、ゲーム単体ではなく「erinui」の親ホームページとして使用します。

親ホームページから、ゲーム一覧、キャラクター紹介、ブログ、SNS、利用規約、プライバシーポリシーへ移動できる構成です。

ゲーム一覧は `/games/` に分離し、現在作成中の「犬タローの虫さんまってまって」はその配下の `/games/inutaro-mushi/` に配置します。今後ゲームが増えた場合は、`/games/` にゲームカードを追加して選択できる形で拡張します。

公開URL:

https://erinui.github.io/

## ページ階層

```text
/
├── index.html
│   └── erinui 親ホーム
│
├── games/
│   ├── index.html
│   │   └── ゲーム一覧トップ
│   └── inutaro-mushi/
│       └── index.html
│           └── 犬タローの虫さんまってまって
│
├── pages/
│   ├── characters.html
│   │   └── キャラクター紹介
│   ├── blog.html
│   │   └── おしらせ・ブログ
│   ├── terms.html
│   │   └── 利用規約
│   └── privacy.html
│       └── プライバシーポリシー
│
├── data/
│   └── news.json
│       └── ホームのおしらせ表示データ
│
├── assets/
│   └── 画像・音声・アイコン・補助ライブラリ
│
├── home.css
├── home.js
├── style.css
└── game.js
```

## 公開ページ一覧

| URL | ファイル | 役割 |
| --- | --- | --- |
| `/` | `index.html` | erinui 親ホーム / サイト導線 |
| `/games/` | `games/index.html` | ゲーム一覧トップ |
| `/games/inutaro-mushi/` | `games/inutaro-mushi/index.html` | ゲーム本体 |
| `/pages/characters.html` | `pages/characters.html` | 犬タローなどのキャラクター紹介 |
| `/pages/blog.html` | `pages/blog.html` | おしらせ・制作メモ・更新情報 |
| `/pages/terms.html` | `pages/terms.html` | 利用規約 |
| `/pages/privacy.html` | `pages/privacy.html` | プライバシーポリシー |

## 親ホームページ構成

`index.html` は erinui 全体の入口として扱います。

| セクション | 内容 | 主な遷移先 |
| --- | --- | --- |
| ヘッダー | ブランド、サイト内ナビゲーション | `/games/`, `/pages/characters.html`, `/pages/blog.html`, `#links` |
| ヒーロー | erinui の簡易紹介 | `/games/`, `/pages/characters.html` |
| ページリンク | 現在用意できているページへのカードリンク | ゲーム、キャラクター、ブログ、規約、SNS |
| フッター | サイト名、著作表示 | なし |

親ホームは一旦簡易デザインとし、今あるページへの入口を優先します。

## ゲーム一覧トップ構成

`games/index.html` は、ゲームが並ぶことをメインにしたページです。旧ホームにあったキャラクター紹介、ブログ、SNS導線、規約導線は親ホーム側へ移し、ゲーム一覧ではゲームカードを主役にします。

| セクション | 内容 | 主な遷移先 |
| --- | --- | --- |
| ヘッダー | 親ホーム、固定ページへの導線 | `/`, `/pages/characters.html`, `/pages/blog.html` |
| ページヒーロー | ゲーム一覧の説明 | なし |
| ゲームカード | 公開中ゲームと準備中ゲーム | `/games/inutaro-mushi/` |
| フッター | サイト名、著作表示 | なし |

## ゲームページ構成

`games/inutaro-mushi/index.html` はゲーム本体のページです。

| 要素 | 内容 |
| --- | --- |
| `canvas#game` | ゲーム描画 |
| サウンドボタン | BGM・効果音の一括 ON/OFF |
| ゲーム一覧へ | スタート画面からゲーム一覧へ戻る導線 |
| はじめる | ゲーム開始 |
| あそびかた | 操作方法とゲーム説明を表示 |
| けっかへ | クリア / ゲームオーバー後にリザルト表示 |
| リザルトモーダル | 保存、共有、フォロー、もう一回、ゲーム一覧への導線 |

ゲームページからゲーム一覧へ戻る導線は、スタート画面とリザルト画面に配置します。クリア / ゲームオーバー直後の画面には戻るボタンを置かず、まず結果を認識させてからリザルトへ進む流れにします。

## 固定ページ構成

`pages/` 配下はサイト共通ヘッダーとフッターを持つ固定ページです。

| ファイル | 現在の状態 | 今後の拡張 |
| --- | --- | --- |
| `characters.html` | 犬タローの概要と画像を掲載 | 仲間キャラクター、設定、プロフィールを追加 |
| `blog.html` | 準備中表示 | 更新履歴、制作メモ、投稿一覧を追加 |
| `terms.html` | 簡易利用規約を掲載 | 素材利用、禁止事項、免責を詳細化 |
| `privacy.html` | 簡易プライバシーポリシーを掲載 | アクセス解析や外部サービス利用時に更新 |

## データ構成

### `data/news.json`

ホームのおしらせカードを表示するためのデータです。

現在は手動更新の JSON ですが、将来的に X、YouTube、ブログ、ゲーム更新などを同じカード形式で扱えるようにしています。

表示処理は `home.js` が担当します。

## 共通資産

### 画像

| ファイル | 用途 |
| --- | --- |
| `assets/icon-192.png` | サイトアイコン、ホームゲームカード、OGP |
| `assets/favicon.png` | ブラウザアイコン |
| `assets/apple-touch-icon.png` | iOS ホーム画面用アイコン |
| `assets/bg.jpg` | ゲーム背景、ホームヒーロー |
| `assets/player_idle.png` | 犬タロー通常 |
| `assets/player_jump.png` | 犬タロージャンプ |
| `assets/enemy_idle.png` | カラス |
| `assets/hazard_1.png` | カラスの落とし物、落下中 |
| `assets/hazard_2.png` | カラスの落とし物、着弾時 |
| `assets/item_a.png` | カタツムリ |
| `assets/item_b.png` | 蝶 |
| `assets/item_c.png` | トンボ |

### 音声

| ファイル | 用途 |
| --- | --- |
| `assets/bgm.mp3` | BGM |
| `assets/sound_jump.mp3` | ジャンプ効果音 |
| `assets/sound_itemget.mp3` | 虫さん取得効果音 |
| `assets/sound_hazard-hit.mp3` | カラスの落とし物に当たった時の効果音 |

### 補助ライブラリ

| ファイル | 用途 |
| --- | --- |
| `assets/html2canvas.min.js` | 旧リザルトモーダル保存実装で使用していたDOMキャプチャライブラリ。現在のリザルト保存はCanvasで共有用カードを生成 |

## CSS / JS の役割

| ファイル | 対象 | 役割 |
| --- | --- | --- |
| `home.css` | ホーム、固定ページ | サイト共通レイアウト、ホームデザイン、固定ページデザイン |
| `home.js` | ホーム | おしらせ JSON 読み込み、外部リンクの別タブ化 |
| `style.css` | ゲームページ | ゲームUI、モーダル、SP横向きコントローラー、固定横画面モード、あそびかた、リザルト |
| `game.js` | ゲームページ | ゲームロジック、描画、音声、保存、共有 |

## 公開対象外・注意対象

以下は現時点では通常公開・GitHub反映の対象外として扱います。

| パス | 扱い |
| --- | --- |
| `games/inutaro-3d-prototype/` | 3D試作。現在の公開サイト本体には含めない |
| `docs/server-migration-plan.md` | サーバー移行検討メモ。通常の公開反映対象には含めない |

## 今後の推奨階層

ゲーム追加時は、次の形で増やします。

```text
games/
├── inutaro-mushi/
│   └── index.html
└── next-game-slug/
    └── index.html
```

ゲームごとに大きく仕様や実装が異なる場合は、共通 `game.js` へ無理にまとめず、以下のようにゲーム別ファイルへ分けます。

```text
games/
└── next-game-slug/
    ├── index.html
    ├── game.js
    └── style.css
```

ただし、サイト全体のヘッダー、フッター、カードデザイン、固定ページは `home.css` を中心に共通化します。
