# エリカッテシティ サイト全体 仕様・設計資料

最終更新: 2026-10-11（新本番ドメインとSEO・読み込み改善Aのローカル実装を反映）

2026-09-12資料追加: 現行ソースの画面をFigmaへ再現する作業は、[作成方法](figma-reproduction-method.md) → [下層画面デザイン設計書](screen-design-specification.md) → [Figma作成計画書](figma-screen-production-plan.md)の順に参照する。下層6ページのPC/SP実測と、ゲーム本体の未実証項目を区別している。本資料の既存本文は2026-07-26時点の総合仕様として保持する。

2026-10-10名称改訂: サイト・まちの正式な表示名称を「エリカッテシティ」に確定した。本文中のサイト名称は新名称へ更新したが、その他の実装仕様・測定値は既存の記録を維持する。本改訂は資料更新であり、Webソース・全Figma画面・公開サイトへの反映完了を意味しない。適用範囲は2.1、未反映箇所と手順は[文言反映設計](figma-copy-change-plan.md)を参照。

同日実装・公開追記: S00〜S06の共通名称・メタデータ、TOP/ゲーム一覧の確定文言、背景道路文字、Web主7ページのJP書体をSDD/TDDで反映し、GitHub mainから公開済み。公開7ページのPC/SP、14ケース成功。[実施仕様・公開検証記録](site-design-implementation.md)を参照。問い合わせ/ファンアートの用途変更は保留。既存URL・外部取得データ・ゲームロジックは保持する。

同日SEO改修追記: 本番ドメインは `https://erinui.com/`。公開8ページのcanonical・OGP/Twitter URL、ゲーム共有URL、sitemap・robots、旧GitHub Pagesの移転案内、Workersの公開出力限定を実装した。HTTP→HTTPS転送はCloudflareで有効化済み。公開確認・検索登録・紹介内容・軽量化の適用状態は[SEO改善計画の実施記録](seo-improvement-plan.md#実施記録-2026-10-10)で区別する。旧工程のURL保持条件は今回の承認済みURL変更には適用しない。

2026-10-11実装追記: [SEOと読み込み改善 SDD実施仕様](seo-performance-sdd.md)に従い、metadata8ページ、TOPだけの静的WebSite JSON-LD、静的JSON優先・no-cache再検証・TOPカード画像lazy/asyncをローカル実装した。新しい画面内原稿・ページ・CSS変更はない。53件のテスト、84画面、Safari実機、性能比較を確認済み。画像/フォント圧縮は候補比較後に保留し、全素材・書体を維持する。GitHub・本番への公開はまだ行っていない。

## 1. この資料の目的

この資料は、現在の `erinui / 犬タローゲーム` サイト全体の構成、仕様、技術設計、デザインルールをまとめたものです。

対象範囲は以下です。

- エリカッテシティのトップページ
- ゲーム一覧ページ
- ゲーム「犬タローの虫さんまって×2」
- キャラクター紹介ページ
- おしらせ・ブログ、利用規約、プライバシーポリシー
- YouTube、note、SUZURI、LINEスタンプの最新情報表示
- 共通ヘッダー、レスポンシブ、デザインルール
- 開発・公開・更新フロー

ゲーム本体の詳細仕様は `docs/game-design-spec.md`、YouTube取得の詳細は `docs/youtube-latest-api.md`、トップの最新情報表示は `docs/home-latest-content.md` を参照します。

## 2. サイトの基本コンセプト

サイト全体の入口は「エリカッテシティ」です。

ゲーム、キャラクター、SNS、YouTube、ブログ、グッズ、LINEスタンプなどを、まちの中のスポットとして配置し、ユーザーが地図を歩くような気分でコンテンツへ移動できる構成にします。

世界観は以下を重視します。

- 手描き感
- ステッカー感
- 黒い太線とポップな配色
- 子どもっぽすぎず、ゆるく楽しい雰囲気
- 直感的にタップできる導線
- 公式サイトとして必要な最低限の情報整理

### 2.1 サイト名称の設計ルール

2026-10-10のユーザー指示により、旧名称「えりぬいシティ」を「エリカッテシティ」へ変更する。名称の正本は本節とし、PC/SP・TOP/下層で別のサイト名称を使わない。

| 設計ID | 適用対象 | ルール |
| --- | --- | --- |
| NAME-01 | TOP H1、共通ヘッダー、サイト名を表示するフッター | 正式表記は `エリカッテシティ`。字間に空白を足した別表記や旧名称を採用しない |
| NAME-02 | サイト・まちを指すガイド見出し、導入文、案内文 | サイト名称部分を新名称へ統一。前後の文章、キャラクター名、ゲーム名は名称変更だけで書き換えない |
| NAME-03 | ページtitle、OGP/Twitter Card、description、アクセシブル名 | 自サイトの名称を記載する箇所のみ新名称へ統一。各ページ名とゲーム正式名称は保持 |
| NAME-04 | マップの道路文字など画像内の旧名称 | 道路・地面・リンクを保持して文字だけを新名称へ変更。Figma改修案は編集可能TEXTを保持。Web背景SVGはその文字のアウトライン出力で更新済み。地面/道路/マスク/viewBoxの一致を受入試験で検証。ファイル名・配置・リンクは保持 |
| NAME-05 | 外部サービス、運営者、技術識別子 | `erinui` / `erikanuinui`、YouTube「えりぬい」・`@えりぬい`、既存URL、リポジトリ名、パス、HTML ID・クラス、API設定は保持 |

ラベル背景は文字幅とpaddingに追従し、文字を旧背景幅へ押し込まない。Figmaでは編集可能なTEXTとオートレイアウト、Webでは既存のinline-flex・fit-contentを利用する。SPは必要に応じて折り返しを許し、長くなった名称でナビや画像を覆わないことを確認する。フォント・配色・線幅・影の変更は本名称改訂には含めない。

過去の検証記録・スクリーンショット・制作当時のFigma区画名は履歴として残す。旧名称が記録にあることと、今後の正式表記に旧名称を採用することを区別する。取得データ中の外部作品名などを一括置換しない。

Figma反映状態: 2026-10-10、「デザイン改修案」のTOP・S01〜S06主画面の共通名称・原稿を参照し、確定範囲をローカルWebへ適用済み。シティガイド見出しは「潮風のかおりエリカッテシティ」で統一し、SPは名前の途中で改行しない。問い合わせ/ファンアートは未確定なので既存ページ・ナビを維持。公開とFigma旧補足画像の更新は別工程。

## 3. 公開URLとリポジトリ

現在の実装は `erinui/inutaro-game` リポジトリで管理しています。

| 種類 | URL / ブランチ |
| --- | --- |
| ローカル確認 | `scripts/preview-site.mjs` が表示する127.0.0.1のURL |
| 本番URL | `https://erinui.com/` |
| 旧公開URL | `https://erinui.github.io/inutaro-game/`（現在も公開） |
| 配信基盤 | Cloudflare Workersの静的アセット専用Worker。Workers BuildsがGitHub mainから `npx wrangler deploy` を実行 |
| リポジトリの反映先 | `main` |
| 旧GitHub Pages公開元 | `main` のルート |

SEO工程0の改修前ソースではOGP・共有URLが旧GitHub Pagesを指し、公開8ページにcanonicalはありませんでした。2026-10-10の工程1・2の公開後は次段落の本番URL設計を適用済みです。改修前の調査と現在の配信を区別します。

正規URL・OGP・ゲーム共有は `https://erinui.com/` を使用します。本番の下層は `.html` から拡張子なしURLへ転送されるため、正規URLはその最終URLを採用します。通常のHTML内画像、CSS、JS、フォントと既存の内部リンクは相対パスを維持します。対応表と変更範囲は[SEO改善計画3章](seo-improvement-plan.md#3-本番url設計)を参照してください。公開用distは `scripts/build-site.mjs` で生成し、資料・サーバー用コード・秘密・試作を配信しません。外部データはGitHub Actions生成の静的JSONを使用し、Pages Functionsは現行Workerでは実行されません。

## 4. ページ階層

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

- エリカッテシティの入口
- マップ型ナビゲーション
- ゲーム、キャラクター、SNS、YouTube、ブログ、グッズ、LINEスタンプへの導線
- おしらせカード
- なかまたち紹介への導線

主要セクション:

| セクション | 内容 |
| --- | --- |
| 共通ヘッダー | ロゴ付きブランド、ゲーム、キャラクター、おしらせ |
| ヒーロー | `エリカッテシティ` とサイト説明 |
| まちを歩く | 縦長マップと説明カード |
| キャラクター紹介 | キャラクター紹介ページへの導線。PCは3枚表示、SPは横スクロール |
| おしらせ | サイト内導線カード |
| ゲーム | ゲーム導線カード |
| YouTube | 最新5本と、6件目がある場合の `and more` カード |
| ブログ | note RSSと記事OGP画像から最新5記事と、6件目がある場合の `and more` カード |
| グッズ | SUZURI APIから最新5商品と、6件目がある場合の `and more` カード |
| LINEスタンプ | 販売中作品を全件表示。6件目がある場合のみ `and more` カード |
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
| イラスト | `.map-link-illustrate` | `pages/illustrations.html` | 仮ページ |
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

取得方針:

- 本番 `erinui.com`、GitHub Pages、localhost/127.0.0.1では、`assets/home-city/youtube-latest.json` を優先し、正常ならAPIへ要求しない
- その他のHTTPホストでは既存 `/api/latest-youtube?maxResults=6` を先に試す。両経路で取得失敗・無効JSONの場合だけ次候補を1回試す。本番WorkersではAPIは稼働していない
- JSON取得前の登録者数表示は `取得中`
- 取得に失敗した場合はHTMLに埋め込まれた初期画像を表示する

GitHub Pagesではサーバー処理が使えないため、GitHub Actionsで静的JSONとサムネイル画像を更新します。

既存4JSONは `cache: no-cache` で毎回再検証し、未変更ならHTTPキャッシュの本文を再利用します。TOPの初期・生成カード画像はlazy/async、ヘッダー・マップ・看板サムネと下層画像は従来の読み込みのままです。URL・表示件数・更新周期・カルーセル寸法は変更しません。

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
| 公開中 | 犬タローの虫さんまって×2 | `games/inutaro-mushi/` |
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

- エリカッテシティに登場するキャラクターの紹介
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

### 5.9 イラスト

対象ファイル:

```text
pages/illustrations.html
```

現在は準備中の仮ページです。

トップマップ上のイラスト導線から遷移できるようにし、`href="#"` の未設定リンクを解消しています。今後、作品を掲載する場合はこのページに作品カードやカテゴリを追加します。

### 5.10 利用規約・プライバシーポリシー

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

共通ヘッダーはトップページと下層ページで基本クラス名を統一しています。

| 種類 | クラス |
| --- | --- |
| ヘッダー | `.site-header` |
| ブランド | `.brand` |
| ナビ | `.site-nav` |

見た目は `home.css` で統一しています。

トップページでは、本文ラッパーに `.site-page`、ヒーロー補助ラベルに `.hero-label` を使用します。検討用由来の `draft-*` クラスは本番HTML/CSSから撤去済みです。

ルール:

- 左端はアイコン付きの「エリカッテシティ」リンク
- 右側はそのページから必要な主要ページだけを表示
- 現在開いているページへの重複リンクは基本的に置かない
- SP幅では三本線メニューに集約
- 開閉時はフェードと軽い移動のアニメーション
- メニュー内リンクを押す、Escキーを押す、PC幅へ戻ると閉じる

開閉制御は `site-nav.js` が担当します。

## 7. デザインルール

### 7.1 フォント

サイト全体のCSS名は `KeinannPop` を使用します。2026-10-10以降、共通CSSを使う主7ページはJP修正版KeinannPOPjpの実データを配信。ゲーム本体S07の専用CSSは旧KeinannPOPのまま保持します。

```css
@font-face {
  font-family: "KeinannPop";
  font-display: block;
}
```

`font-display: block` により、読み込み前に別フォントで一瞬表示される挙動を抑えています。

フォントファイル:

```text
assets/fonts/keinann-pop-jp.woff2
assets/fonts/keinann-pop-jp.ttf
assets/fonts/OFL.txt
assets/fonts/keinann-pop-jp-source.md
```

旧 `keinann-pop.woff2` / `.ttf` / `keinann-pop-readme.pdf` はゲーム本体と履歴用に保持します。新書体の元データ照合・WOFF2変換条件・配布ライセンスは[実施仕様](site-design-implementation.md)に記録します。

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
| `assets/home-city/map_character.svg` | キャラクター紹介リンク |
| `assets/home-city/map_sns.png` | Xリンク |
| `assets/home-city/map_linestamp.png` | LINEスタンプリンク |
| `assets/home-city/map_game.png` | ゲームリンク |
| `assets/home-city/map_goods.png` | グッズリンク |
| `assets/home-city/map_blog.png` | ブログリンク |
| `assets/home-city/map_illastrate.png` | イラストリンク |
| `assets/home-city/map_youtube.png` | YouTube看板 |
| `assets/home-city/map_decoration_*.png` | 非リンク装飾 |
| `assets/home-city/youtube-latest.json` | YouTube最新情報の静的フォールバック |
| `assets/home-city/youtube-thumb-1..5.jpg` | YouTubeカルーセル用最新サムネイル |
| `assets/home-city/note-latest.json` | note RSSから取得した最新記事と保存済みサムネイルの参照 |
| `assets/home-city/note-thumb-1..6.(png/jpg/webp)` | note記事ページのOGP画像を保存したブログカルーセル用サムネイル |
| `assets/home-city/suzuri-latest.json` | SUZURI APIから取得した最新商品 |
| `assets/home-city/line-stamps.json` | 現在販売中のLINEスタンプ・絵文字 |

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
| `home.js` | YouTube看板のデータ反映、最新コンテンツカルーセル、装飾クリック演出 |
| `games/inutaro-mushi/game.js` | ゲームロジック、描画、音声、保存・共有 |
| `functions/api/latest-youtube.js` | Cloudflare Pages Functions用YouTube API |
| `scripts/update-youtube-latest.mjs` | GitHub Actions用YouTube静的データ更新 |
| `scripts/update-note-latest.mjs` | GitHub Actions用note RSS静的データ更新 |
| `scripts/update-suzuri-latest.mjs` | GitHub Actions用SUZURI静的データ更新 |

## 10. 最新コンテンツ更新

GitHub Pages運用時は、`.github/workflows/update-youtube-latest.yml` が定期実行します。

| 項目 | 内容 |
| --- | --- |
| 実行タイミング | 4時間ごとの10分 |
| Cron | `10 */4 * * *` |
| 手動実行 | `workflow_dispatch` 対応 |
| YouTube APIキー | Repository Secret `YOUTUBE_API_KEY` |
| SUZURIトークン | Repository Secret `SUZURI_ACCESS_TOKEN`。未設定時はSUZURI取得をスキップ |
| チャンネルID | Repository Variable `YOUTUBE_CHANNEL_ID`、未設定時は `UCdnf6zMzSdZuvUxS-CS2REQ` |
| 更新対象 | `youtube-latest.json`、`youtube-thumb-1..5.jpg`、`note-latest.json`、`note-thumb-1..6.(png/jpg/webp)`、`suzuri-latest.json` |
| 更新先 | `main` ブランチ |

Cloudflareへ移管した場合は、`functions/api/latest-youtube.js` を使って `/api/latest-youtube` を動的に返す想定です。

`functions/api/latest-youtube.js` はGitHub Pagesでは実行されません。現時点ではCloudflare移管時の将来用実装として扱い、GitHub Pagesでは `.github/workflows/update-youtube-latest.yml` と `scripts/update-youtube-latest.mjs` による静的JSON・画像更新を正とします。

注意:

- YouTube APIキーとSUZURIトークンはフロントエンドに書かない
- 公開統計のみ扱う
- 総再生時間はYouTube Analytics APIとOAuthが必要なため対象外
- LINEスタンプは公開APIを使わず、`line-stamps.json` を手動で更新する

## 11. ゲーム仕様要約

ゲーム「犬タローの虫さんまって×2」の要点です。

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

GitHub Pages反映時は、`main` へコミットして公開反映します。YouTube最新情報もGitHub Actionsから `main` へコミットされます。

## 13. 現在の未設定・検討中項目

| 項目 | 状態 |
| --- | --- |
| ブログ内製化 | 現在はnoteへの導線 |
| Cloudflare移管 | `functions/api/latest-youtube.js` は準備済み。移管時に環境変数設定が必要 |
| ルートドメイン運用 | 現在は `erinui/inutaro-game` 配下。将来的に `erinui.github.io` 直下運用を検討 |
| 3Dプロトタイプ | `games/inutaro-3d-prototype/` は試作扱い |
| 検討用ワイヤー | `drafts/home-wireframe/` は検討用で、本番導線とは分離 |
| イラストページ | 仮ページ設置済み。内容は今後追加 |
| OGP・共有URL | 現在の公開URL `https://erinui.github.io/inutaro-game/` に合わせて更新済み |
| 固定ページOGP | キャラクター、ブログ、規約、ポリシー、イラストに基本OGP追加済み |
| トップのクラス名 | `draft-*` 命名を本番用へ整理済み |
| 未追跡ファイル | 旧素材、検討用、試作の扱いを分類して整理予定 |

## 14. 改善対応計画

2026-07-26時点のサイト全体確認に基づく改善設計と実装手順は、`docs/site-improvement-plan.md` にまとめます。

実装時は以下の順で進めます。

| Phase | 内容 | 主な確認 |
| --- | --- | --- |
| 1 | OGP、共有URL、YouTubeリンク、固定ページOGPの整理 | 実装済み。主要ページHTTP 200、共有URL、外部リンクを確認 |
| 2 | トップページの `draft-*` クラス名整理 | 実装済み。PC/SPヘッダー、メニュー開閉、トップ見た目を確認 |
| 3 | イラスト導線の未設定解消 | 実装済み。`href="#"` が本番導線に残らないことを確認 |
| 4 | 未追跡ファイル、旧素材、検討用ファイルの分類整理 | `git status --short`、画像欠けなし |
| 5 | ブログ内製化、Cloudflare移管など中長期拡張 | 追加仕様ごとの確認 |

## 15. 今後の更新ルール

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
