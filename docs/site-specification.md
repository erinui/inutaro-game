# erinuiサイト全体 仕様・設計資料

最終更新: 2026-07-05

## 1. この資料の目的

この資料は、現在の `erinui / 犬タローゲーム` サイト全体の構成、仕様、技術設計、デザインルールをまとめたものです。

対象範囲は以下です。

- えりぬいシティのトップページ
- ゲーム一覧ページ
- ゲーム「犬タローの虫さんまってまって」
- キャラクター紹介ページ
- おしらせ・ブログ、利用規約、プライバシーポリシー
- YouTube最新情報取得
- 共通ヘッダー、レスポンシブ、デザインルール
- 開発・公開・更新フロー

ゲーム本体の詳細仕様は `docs/game-design-spec.md`、YouTube取得の詳細は `docs/youtube-latest-api.md` を参照します。

## 2. サイトの基本コンセプト

サイト全体の入口は「えりぬいシティ」です。

ゲーム、キャラクター、SNS、YouTube、ブログ、グッズ、LINEスタンプなどを、まちの中のスポットとして配置し、ユーザーが地図を歩くような気分でコンテンツへ移動できる構成にします。

世界観は以下を重視します。

- 手描き感
- ステッカー感
- 黒い太線とポップな配色
- 子どもっぽすぎず、ゆるく楽しい雰囲気
- 直感的にタップできる導線
- 公式サイトとして必要な最低限の情報整理

## 3. 公開URLとリポジトリ

現在の実装は `erinui/inutaro-game` リポジトリで管理しています。

| 種類 | URL / ブランチ |
| --- | --- |
| ローカル確認 | `http://127.0.0.1:8780/` |
| 現在の公開URL | `https://erinui.github.io/inutaro-game/` |
| 将来的な親ホーム想定 | `https://erinui.github.io/` |
| 開発元ブランチ | `main` |
| GitHub Pages公開ブランチ | `gh-pages` |

将来的に `https://erinui.github.io/` を親ホームとして運用する場合は、`erinui.github.io` 用のリポジトリへ移行、または現在の構成を同期する必要があります。

## 4. ページ階層

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
│   │       └── ゲーム素材・音声
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

## 5. 公開ページ仕様

### 5.1 トップページ

対象ファイル:

```text
index.html
home.css
home.js
site-nav.js
```

役割:

- えりぬいシティの入口
- マップ型ナビゲーション
- ゲーム、キャラクター、SNS、YouTube、ブログ、グッズ、LINEスタンプへの導線
- おしらせカード
- なかまたち紹介への導線

主要セクション:

| セクション | 内容 |
| --- | --- |
| 共通ヘッダー | ロゴ付きブランド、ゲーム、キャラクター、おしらせ |
| ヒーロー | `えりぬいシティ` とサイト説明 |
| まちを歩く | 縦長マップと説明カード |
| おしらせ | ゲーム、ブログ、YouTubeの導線カード |
| なかまたち | キャラクター紹介ページへの導線 |
| フッター | 外部リンク、規約、ポリシー |

### 5.2 トップページのマップ導線

マップは `assets/home-city/map_bg.svg` を背景にし、その上にリンク画像と装飾画像を重ねます。

| 表示 | クラス | 遷移先 | 状態 |
| --- | --- | --- | --- |
| キャラクター | `.map-link-character` | `pages/characters.html` | 設定済み |
| X | `.map-link-sns` | `https://x.com/erikanuinui` | 別タブ |
| LINEスタンプ | `.map-link-linestamp` | `https://store.line.me/emojishop/author/2919902/ja` | 別タブ |
| ゲーム | `.map-link-game` | `games/` | 設定済み |
| グッズ | `.map-link-goods` | `https://suzuri.jp/erikanuinui` | 別タブ |
| ブログ | `.map-link-blog` | `https://note.com/erinui` | 別タブ |
| イラスト | `.map-link-illustrate` | `#` | 未設定 |
| YouTube | `.map-link-youtube` | YouTubeチャンネル | 別タブ |

外部リンクは `target="_blank"` と `rel="noopener noreferrer"` を付けます。

### 5.3 マップ装飾

| 装飾 | クラス | 仕様 |
| --- | --- | --- |
| 木 | `.map-decoration-tree-*` | 非リンク装飾。4つ配置 |
| 鳥 | `.map-decoration-bird` | 地図の左端から右端へ一定速度で飛び、端で反転して戻る |
| サスケ | `.map-decoration-sasuke` | クリックすると断続的に歩く |
| ブクロちゃん | `.map-decoration-bukurochan` | クリックすると頭上に `?` が出る |

装飾はリンク導線ではなく、サイトの遊び心を出すための要素です。操作可能な装飾は `button` として実装し、アクセシビリティ用の `aria-label` を付けます。

### 5.4 YouTube看板

YouTube看板は、看板画像 `map_youtube.png` の内側に最新動画サムネイルと登録者数表示を重ねます。

表示内容:

- 最新3本のサムネイル
- チャンネル登録者数
- 10秒ごとに `サムネ1 -> サムネ2 -> サムネ3 -> 登録者数` の順で切り替え

取得優先順:

1. `/api/latest-youtube?maxResults=3`
2. `assets/home-city/youtube-latest.json`
3. HTMLに埋め込まれた初期画像・初期値

GitHub Pagesではサーバー処理が使えないため、GitHub Actionsで静的JSONとサムネイル画像を更新します。

### 5.5 ゲーム一覧ページ

対象ファイル:

```text
games/index.html
home.css
site-nav.js
```

役割:

- 公開中ゲームと準備中ゲームを表示するページ
- サイトトップからゲーム群だけを切り出した入口

現在のカード:

| 状態 | タイトル | 遷移先 |
| --- | --- | --- |
| 公開中 | 犬タローの虫さんまってまって | `games/inutaro-mushi/` |
| 準備中 | 次のゲーム | 未設定 |

今後ゲームを追加する場合は、`games/{slug}/index.html` を追加し、`games/index.html` にカードを増やします。

### 5.6 ゲーム本体ページ

対象ファイル:

```text
games/inutaro-mushi/index.html
games/inutaro-mushi/style.css
games/inutaro-mushi/game.js
```

概要:

- 犬タローを操作して虫さんを捕まえる40秒のブラウザゲーム
- カラスの落とし物に1回当たるとゲームオーバー
- 制限時間終了はクリア
- リザルトでは合計獲得数、虫さん別獲得数、ゲームオーバー時のみ生存時間を表示

主なUI:

| UI | 内容 |
| --- | --- |
| 音符ボタン | BGM・効果音の一括ON/OFF |
| はじめる | ゲーム開始 |
| あそびかた | 操作説明とゲーム説明 |
| けっかへ | クリア / ゲームオーバー後にリザルトへ進む |
| けっかを保存 | 共有用フォーマットの画像を保存 |
| 共有 | 画像付き共有またはURLコピー |
| フォロー | X / YouTubeリンクを表示 |
| もう一回あそぶ | タイトル状態へ戻す |
| ゲーム一覧へ | ゲーム一覧ページへ戻る |

操作:

| 環境 | 操作 |
| --- | --- |
| PC | キーボード、クリック / タップ操作 |
| SP | 固定横画面モード、右側スティック、左側ジャンプボタン |

ゲーム詳細は `docs/game-design-spec.md` を参照します。

### 5.7 キャラクター紹介ページ

対象ファイル:

```text
pages/characters.html
home.css
assets/characters/
```

役割:

- えりぬいシティに登場するキャラクターの紹介
- 画像とプロフィールを一体化したカードで表示

現在のキャラクター:

| キャラクター | 画像 | 備考 |
| --- | --- | --- |
| 犬タロー（オリジン） | `chara_inutaro_origin.png` | 1枚目。画像がカード上部からはみ出す演出 |
| 犬タロー（ぬいちゃん） | `chara_inutaro_nuigurumi.png` | ぬいぐるみ版 |
| えりか | `chara_erika-san.png` | 人間、ぬいぐるみ、二次元などの姿 |
| さすけ | `chara_sasuke.png` | ハムスター |
| ぶくろちゃん | `chara_bukuro.png` | ネコ |

カード設計:

- PCでは画像エリアとテキストエリアを左右に分ける
- 1枚目は画像左、テキスト右
- 以降は左右交互
- テキストエリアと画像エリアの比率はカード間で統一
- 画像エリアはキャラクターごとに背景色を変える
- キャラクター名は黄色のピル型ラベルで統一
- SPでは1カラムにし、画像エリアを上、本文を下にする
- 犬タロー（オリジン）のみSPでも上にはみ出す

### 5.8 おしらせ・ブログ

対象ファイル:

```text
pages/blog.html
```

現在はnoteへの導線ページです。

遷移先:

```text
https://note.com/erinui
```

今後、サイト内に記事一覧を持たせる場合は、`pages/blog.html` に記事カードを追加するか、`/blog/` 配下へ個別記事を分離します。

### 5.9 利用規約・プライバシーポリシー

対象ファイル:

```text
pages/terms.html
pages/privacy.html
```

現在は簡易版です。

| ページ | 内容 |
| --- | --- |
| 利用規約 | ゲーム利用、素材の無断転載・再配布禁止、変更・停止の可能性 |
| プライバシーポリシー | 個人情報入力なし、保存・共有は端末機能、外部サービスは移動先の規約に従う |

外部分析、広告、問い合わせフォームなどを追加する場合は更新が必要です。

## 6. 共通ヘッダー・ナビゲーション

共通ヘッダーはトップページと下層ページでHTMLクラス名が異なります。

| ページ | ヘッダークラス | ブランドクラス | ナビクラス |
| --- | --- | --- | --- |
| トップ | `.draft-header` | `.site-brand` | `.nav-links` |
| 下層ページ | `.site-header` | `.brand` | `.site-nav` |

見た目は `home.css` で統一しています。

ルール:

- 左端はアイコン付きの「えりぬいシティ」リンク
- 右側はそのページから必要な主要ページだけを表示
- 現在開いているページへの重複リンクは基本的に置かない
- SP幅では三本線メニューに集約
- 開閉時はフェードと軽い移動のアニメーション
- メニュー内リンクを押す、Escキーを押す、PC幅へ戻ると閉じる

開閉制御は `site-nav.js` が担当します。

## 7. デザインルール

### 7.1 フォント

サイト全体で `KeinannPop` を使用します。

```css
@font-face {
  font-family: "KeinannPop";
  font-display: block;
}
```

`font-display: block` により、読み込み前に別フォントで一瞬表示される挙動を抑えています。

フォントファイル:

```text
assets/fonts/keinann-pop.woff2
assets/fonts/keinann-pop.ttf
assets/fonts/keinann-pop-readme.pdf
```

### 7.2 カラートークン

`home.css` の `:root` で以下を定義しています。

| 変数 | 用途 |
| --- | --- |
| `--ink` | 黒線、本文の基本色 |
| `--paper` | 白系背景 |
| `--sky` | 水色 |
| `--grass` | 緑 |
| `--sun` | 黄色ラベル |
| `--pink` | ピンク装飾 |
| `--mint` | ミント |
| `--orange` | オレンジ |
| `--blue` | 青 |

### 7.3 形状・質感

- 黒い太線のボーダーを基本にする
- カードは角丸を強めにする
- ボタンやラベルはピル型を多用する
- 影は `box-shadow` と `drop-shadow` を使い分ける
- Safariで画像の四角い影が目立たないよう、画像自体には `drop-shadow` を使う
- テキストの白・灰色ドロップシャドウは読みにくくなるため、基本的に使わない
- セクション見出しはポップなラベル調で統一する

### 7.4 レスポンシブ

| 幅 | 方針 |
| --- | --- |
| PC | ヘッダー右側にナビを横並び。トップのマップは左、説明カードは右 |
| タブレット以下 | ヘッダーは三本線メニュー。マップと説明カードは縦並び |
| SP | タップ領域を大きめにし、カードは1カラム |

ゲームページはサイトページとは別に、SPでも横向き固定のゲーム画面として扱います。

## 8. アセット構成

### 8.1 サイト共通

| パス | 用途 |
| --- | --- |
| `assets/icon-192.png` | サイトアイコン、ブランド、OGP |
| `assets/favicon.png` | favicon |
| `assets/apple-touch-icon.png` | iOS用アイコン |
| `assets/fonts/` | サイトフォント |

### 8.2 トップページマップ

| パス | 用途 |
| --- | --- |
| `assets/home-city/map_bg.svg` | マップ背景 |
| `assets/home-city/map_character.png` | キャラクター紹介リンク |
| `assets/home-city/map_sns.png` | Xリンク |
| `assets/home-city/map_linestamp.png` | LINEスタンプリンク |
| `assets/home-city/map_game.png` | ゲームリンク |
| `assets/home-city/map_goods.png` | グッズリンク |
| `assets/home-city/map_blog.png` | ブログリンク |
| `assets/home-city/map_illastrate.png` | イラストリンク（未設定） |
| `assets/home-city/map_youtube.png` | YouTube看板 |
| `assets/home-city/map_decoration_*.png` | 非リンク装飾 |
| `assets/home-city/youtube-latest.json` | YouTube最新情報の静的フォールバック |
| `assets/home-city/youtube-thumb-*.jpg` | YouTube最新サムネイル |

### 8.3 キャラクター紹介

| パス | 用途 |
| --- | --- |
| `assets/characters/chara_inutaro_origin.png` | 犬タロー（オリジン） |
| `assets/characters/chara_inutaro_nuigurumi.png` | 犬タロー（ぬいちゃん） |
| `assets/characters/chara_erika-san.png` | えりか |
| `assets/characters/chara_sasuke.png` | さすけ |
| `assets/characters/chara_bukuro.png` | ぶくろちゃん |

### 8.4 ゲーム素材

| パス | 用途 |
| --- | --- |
| `assets/games/inutaro-mushi/player_idle.png` | 犬タロー通常 |
| `assets/games/inutaro-mushi/player_jump.png` | 犬タロージャンプ |
| `assets/games/inutaro-mushi/enemy_idle.png` | カラス |
| `assets/games/inutaro-mushi/hazard_1.png` | カラスの落とし物 |
| `assets/games/inutaro-mushi/hazard_2.png` | 着弾表示 |
| `assets/games/inutaro-mushi/item_a.png` | カタツムリ |
| `assets/games/inutaro-mushi/item_b.png` | 蝶 |
| `assets/games/inutaro-mushi/item_c.png` | トンボ |
| `assets/games/inutaro-mushi/bg.jpg` | ゲーム背景 |
| `assets/games/inutaro-mushi/bgm.mp3` | BGM |
| `assets/games/inutaro-mushi/sound_jump.mp3` | ジャンプ効果音 |
| `assets/games/inutaro-mushi/sound_itemget.mp3` | 虫さん取得音 |
| `assets/games/inutaro-mushi/sound_hazard-hit.mp3` | ダメージ音 |

## 9. JavaScript設計

| ファイル | 役割 |
| --- | --- |
| `site-nav.js` | 共通ヘッダーのSPメニュー開閉 |
| `home.js` | YouTube看板のデータ反映、10秒ローテーション、装飾クリック演出 |
| `games/inutaro-mushi/game.js` | ゲームロジック、描画、音声、保存・共有 |
| `functions/api/latest-youtube.js` | Cloudflare Pages Functions用YouTube API |
| `scripts/update-youtube-latest.mjs` | GitHub Actions用YouTube静的データ更新 |

## 10. YouTube最新情報更新

GitHub Pages運用時は、`.github/workflows/update-youtube-latest.yml` が定期実行します。

| 項目 | 内容 |
| --- | --- |
| 実行タイミング | 4時間ごとの10分 |
| Cron | `10 */4 * * *` |
| 手動実行 | `workflow_dispatch` 対応 |
| APIキー | Repository Secret `YOUTUBE_API_KEY` |
| チャンネルID | Repository Variable `YOUTUBE_CHANNEL_ID`、未設定時は `UCdnf6zMzSdZuvUxS-CS2REQ` |
| 更新対象 | `youtube-latest.json`、`youtube-thumb-1.jpg`、`youtube-thumb-2.jpg`、`youtube-thumb-3.jpg` |
| 更新先 | `gh-pages` ブランチ |

Cloudflareへ移管した場合は、`functions/api/latest-youtube.js` を使って `/api/latest-youtube` を動的に返す想定です。

注意:

- APIキーはフロントエンドに書かない
- 公開統計のみ扱う
- 総再生時間はYouTube Analytics APIとOAuthが必要なため対象外

## 11. ゲーム仕様要約

ゲーム「犬タローの虫さんまってまって」の要点です。

| 項目 | 内容 |
| --- | --- |
| プレイ時間 | 40秒 |
| 目的 | 虫さんをできるだけ捕まえる |
| アイテム | カタツムリ、蝶、トンボ |
| 危険要素 | カラスの落とし物 |
| クリア | 制限時間終了 |
| ゲームオーバー | カラスの落とし物に1回当たる |
| 結果表示 | クリア / ゲームオーバー後に `けっかへ` で表示 |
| リザルト | 合計、虫さん別獲得数、ゲームオーバー時の時間 |
| 単位 | 虫さんの数は `ひき` |
| 音声 | BGM、ジャンプ、虫さん取得、ダメージ |
| SP操作 | 固定横画面、右スティック、左ジャンプ |

## 12. 開発・確認フロー

ローカル確認は以下を基本にします。

```text
http://127.0.0.1:8780/
```

確認対象:

- PC幅のトップページ
- SP幅のトップページ
- ゲーム一覧
- キャラクター紹介
- ゲーム本体
- SP横固定ゲーム画面
- YouTube看板のフォールバック表示
- 外部リンクの別タブ遷移

GitHub Pages反映時は、`main` へコミットした後、公開用 `gh-pages` へ反映します。

## 13. 現在の未設定・検討中項目

| 項目 | 状態 |
| --- | --- |
| イラストページ | マップ画像はあるが遷移先は `#` のまま |
| ブログ内製化 | 現在はnoteへの導線 |
| Cloudflare移管 | `functions/api/latest-youtube.js` は準備済み。移管時に環境変数設定が必要 |
| ルートドメイン運用 | 現在は `erinui/inutaro-game` 配下。将来的に `erinui.github.io` 直下運用を検討 |
| 3Dプロトタイプ | `games/inutaro-3d-prototype/` は試作扱い |
| 検討用ワイヤー | `drafts/home-wireframe/` は検討用で、本番導線とは分離 |

## 14. 今後の更新ルール

### 外部リンクを追加・変更する場合

確認箇所:

- `index.html` のマップリンク
- `index.html` のおしらせカード
- `index.html` のフッター
- `pages/blog.html` など該当ページ
- 必要に応じて `docs/site-specification.md`

### ゲームを追加する場合

推奨構成:

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

追加時に更新するもの:

- `games/index.html`
- トップページのマップまたはおしらせ
- OGP / メタ情報
- 必要に応じてゲーム別仕様書

### キャラクターを追加する場合

更新対象:

- `assets/characters/`
- `pages/characters.html`
- `home.css` のキャラクター別背景・画像サイズ変数
- トップページの「なかまたち」表示

### デザインルールを変える場合

優先して確認するもの:

- `home.css` の共通トークン
- 共通ヘッダー
- ページヒーロー
- セクションタイトル
- カードのボーダー、影、角丸
- SPメニュー
- キャラクターカード

変更後はトップ、ゲーム一覧、キャラクター紹介、固定ページで統一感が崩れていないか確認します。
