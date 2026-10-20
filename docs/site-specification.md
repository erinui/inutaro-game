# エリカッテシティ サイト全体 仕様・設計資料

最終更新: 2026-10-20（共通デザイン・ゲーム一覧カード・ラベル撤去を現行仕様へ整理）

### 最新状態

共通ヘッダー・下層の背景／傾き整理とゲーム一覧カードは本番公開確認済み（デザイン実装 `4d6d6fe`、検証記録 `5dfa27c`）。ゲーム一覧の補足2件・状態2件、キャラクターの特徴14件のラベル撤去はローカル実装・関連60試験・8幅×2ページの検証まで完了し、GitHub／本番未反映。TOPニュースのカテゴリ、見出し・名前の背景、操作ボタン、ゲームHUD、日付・価格等の通常テキストは維持する。

現在の全体状態は[開発まとめ](project-summary.md)、承認・検証・公開の記録は[TOP改修SDD](top-redesign-sdd.md)第18〜21節、画面寸法は[画面設計書](screen-design-specification.md)を参照する。今回の資料更新はWebソース・Figmaの追加変更や公開を含まない。以下の冒頭追記は工程当時の履歴であり、後続の追加承認を優先する。

2026-10-18 ニュース新着順改修: ニュースは取得済み各カテゴリの全候補を横断し、更新日時または公開日時の降順で最大12件とする。カテゴリ別1件制限とゲーム先頭固定は撤去。日時不明は末尾、12件未満なら実数で終了し、ニュースにAND MOREは設けない。通常カテゴリ枠の件数・取得頻度は維持。`755bf41` / `fd53ee4` でGitHub main・本番へ公開し、CI全187件とPC/SP本番確認が完了。詳細は[TOP改修SDD第16節](top-redesign-sdd.md)を参照。

2026-10-18 TOP v2実装: 最新仕様・検証・公開状態は[TOP改修SDD 2.3](top-redesign-sdd.md)第12〜14節を正本とする。PCは1100px以上で左マップ固定＋右7枠、SPは通常の縦並び。マップ6点は対応見出しへ移動し、X/イラストは従来の直接リンク。下記の旧TOPの寸法・ガイド・直接リンク説明より同SDDを優先する。下層・ゲーム・取得処理の仕様は変更しない。

2026-10-18 TOP設計資料: 新レイアウトの方針・配色・共通パーツは[デザイン設計書](top-redesign-design-spec.md)、PC／SPの寸法・マップ座標・操作状態・実装受入条件は[詳細設計書](top-redesign-detail-spec.md)を参照する。以下の公開サイト記録と区別し、新案の制作には両設計書を優先する。

2026-10-18 新レイアウト変更仕様: TOPの「PC新レイアウト検討」は、[固定マップとレコメンド配置の変更仕様](top-pc-map-recommend-layout-change.md)を参照する。左マップはブラウザ高に合わせて全体表示し、右側は残り幅にレコメンドを配置。マップのスポット選択を対象レコメンドへの自動スクロールに変更する。新案の配置・マップ操作は同資料を優先し、以下の公開サイトの実装記録とは区別する。

旧版記録: 2026-10-11（SEO・読み込み改善Aの本番公開と検証）

2026-09-12資料追加: 現行ソースの画面をFigmaへ再現する作業は、[作成方法](figma-reproduction-method.md) → [下層画面デザイン設計書](screen-design-specification.md) → [Figma作成計画書](figma-screen-production-plan.md)の順に参照する。下層6ページのPC/SP実測と、ゲーム本体の未実証項目を区別している。本資料の既存本文は2026-07-26時点の総合仕様として保持する。

2026-10-10名称改訂: サイト・まちの正式な表示名称を「エリカッテシティ」に確定した。本文中のサイト名称は新名称へ更新したが、その他の実装仕様・測定値は既存の記録を維持する。本改訂は資料更新であり、Webソース・全Figma画面・公開サイトへの反映完了を意味しない。適用範囲は2.1、未反映箇所と手順は[文言反映設計](figma-copy-change-plan.md)を参照。

同日実装・公開追記: S00〜S06の共通名称・メタデータ、TOP/ゲーム一覧の確定文言、背景道路文字、Web主7ページのJP書体をSDD/TDDで反映し、GitHub mainから公開済み。公開7ページのPC/SP、14ケース成功。[実施仕様・公開検証記録](site-design-implementation.md)を参照。問い合わせ/ファンアートの用途変更は保留。既存URL・外部取得データ・ゲームロジックは保持する。

同日SEO改修追記: 本番ドメインは `https://erinui.com/`。公開8ページのcanonical・OGP/Twitter URL、ゲーム共有URL、sitemap・robots、旧GitHub Pagesの移転案内、Workersの公開出力限定を実装した。HTTP→HTTPS転送はCloudflareで有効化済み。公開確認・検索登録・紹介内容・軽量化の適用状態は[SEO改善計画の実施記録](seo-improvement-plan.md#実施記録-2026-10-10)で区別する。旧工程のURL保持条件は今回の承認済みURL変更には適用しない。

2026-10-11実装追記: [SEOと読み込み改善 SDD実施仕様](seo-performance-sdd.md)に従い、metadata8ページ、TOPだけの静的WebSite JSON-LD、静的JSON優先・no-cache再検証・TOPカード画像lazy/asyncを実装し、コミット `d789296` でGitHub・本番へ公開した。新しい画面内原稿・ページ・CSS変更はない。53件のテスト、84画面、Safari実機、クリーンコピー53件・85ファイル、本番14画面・Googleライブ検査・性能を確認済み。画像/フォント圧縮は候補比較後に保留し、全素材・書体を維持する。自動更新のnote画像取得失敗による既存イラストへの代替は従来仕様であり、Aで元画像を削除したものではない。

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
- 新着順のニュースカード
- キャラクター紹介への導線

1100px以上は左に高さ追従の固定マップ、右に案内と7カテゴリを配置し、未満では縦積みにする。TOPカードは321×432px基準で、表示枚数は残り幅に応じる。旧仕様の「PC常時3枚」を採用しない。

主要セクション:

| セクション | 内容 |
| --- | --- |
| 共通ヘッダー | ロゴ付きブランド、ゲーム、キャラクター、おしらせ |
| ヒーロー | `エリカッテシティ` とサイト説明 |
| まちを歩く | 縦長マップと説明カード |
| ニュース | 取得済み全カテゴリの候補を更新日／公開日の降順で最大12件。カテゴリ別1件制限・ゲーム先頭固定・AND MOREなし |
| キャラクター紹介 | 5キャラを横カルーセル。画像と名前のみ、先頭は紹介ページ先頭、他は対応するarticleアンカー |
| ゲーム | ゲーム導線カード |
| YouTube | 最新5本と、6件目がある場合の `and more` カード |
| ブログ | note RSSと記事OGP画像から最新5記事と、6件目がある場合の `and more` カード |
| グッズ | SUZURI APIから最新5商品と、6件目がある場合の `and more` カード |
| LINEスタンプ | 販売中作品を全件表示。6件目がある場合のみ `and more` カード |
| フッター | 外部リンク、規約、ポリシー |

ニュース→キャラクター紹介→ゲーム→YouTube→ブログ→グッズ→LINEスタンプの順。通常枠の6件目のmoreカード見出しは「まだまだあるよ」。カテゴリの枠付き表示はニュースだけとし、単一カテゴリ枠へ復活させない。

### 5.2 トップページのマップ導線

マップは `assets/home-city/map_bg.svg` を背景にし、その上にリンク画像と装飾画像を重ねます。

| 表示 | クラス | 遷移先 | 状態 |
| --- | --- | --- | --- |
| キャラクター | `.map-link-character` | `#character-title` | ページ内 |
| X | `.map-link-sns` | `https://x.com/erikanuinui` | 別タブ |
| LINEスタンプ | `.map-link-linestamp` | `#line-stamp-title` | ページ内 |
| ゲーム | `.map-link-game` | `#game-title` | ページ内 |
| グッズ | `.map-link-goods` | `#goods-title` | ページ内 |
| ブログ | `.map-link-blog` | `#blog-title` | ページ内 |
| イラスト | `.map-link-illustrate` | `pages/illustrations.html` | 仮ページ |
| YouTube | `.map-link-youtube` | `#youtube-title` | ページ内 |

外部リンクは `target="_blank"` と `rel="noopener noreferrer"` を付けます。マップ6点はおすすめ見出しへ移動し、各カード／「すべて見る」から内部ページ・外部サービスへ遷移します。到着見出しをフォーカスした際の青い枠は撤去済みですが、操作要素のキーボードフォーカス表示は維持します。

### 5.3 マップ装飾

| 装飾 | クラス | 仕様 |
| --- | --- | --- |
| 木 | `.map-decoration-tree-*` | 非リンク装飾。4つ配置 |
| 鳥 | `.map-decoration-bird` | 地図の左端から右端へ一定速度で飛び、端で反転して戻る |
| サスケ | `.map-decoration-sasuke` | クリックすると断続的に歩く |
| ブクロちゃん | `.map-decoration-bukurochan` | クリックすると頭上に `?` が出る |

装飾はリンク導線ではなく、サイトの遊び心を出すための要素です。操作可能な装飾は `button` として実装し、アクセシビリティ用の `aria-label` を付けます。

### 5.4 YouTube看板

YouTube看板は、背景 `map_youtube_bg.svg`、サムネイル／登録者数の画面、前面看板 `map_youtube.svg` の3層を1リンクに内包します。公開用画像の実参照はasset manifestのバインディングを正本とします。

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

カードはTOPと共通の2px黒枠・12px角丸・4px/5px影・16px/18px余白を使います。画像上／本文下、16:9サムネイルの全体表示、PC2列・700px以下1列（最大560px）です。紹介画像はTOPと同じ `gameplay-preview.png`。2026-10-20追加依頼により「公開中／準備中」「プレイ時間 40秒／PC / SP対応」のラベルは撤去。説明本文と操作ボタンは維持し、カードの高さは内容に応じます。上表の状態は作品の状態を整理したもので、画面上のラベルではありません。

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
- 特徴タグ14件は表示しない。本文・名前の黄色背景・画像・アンカーは維持する
- タグ撤去による高さ減少で頭が冒頭文へ近づくため、901px以上のオリジン画像面だけ最小高380px。カード高の固定や全カードの強制同高化はしない

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

トップページの本文ラッパーは `.site-page`。ヒーロー補助ラベルは現行HTMLに設置しません。検討用由来の `draft-*` クラスは本番HTML/CSSから撤去済みです。

ルール:

- 左端は犬タロー オリジン画像付きの「エリカッテシティ」リンク。共通ヘッダーを持つ全7ページで同一画像を使う
- 高さはPC72px、760px以下は64px。ロゴはPC44px高・25px文字、SP44px高・20px文字。画像はPC20×34px、SP18×28px、contain・丸枠/回転なし
- PCナビは枠なし・透明背景、hover/focus-visibleは下線。画像・高さ・余白・ナビの最終CSSはTOP/下層で共有し、本文のデザインとは独立させる
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
  font-display: swap;
}
```

公開用CSSではJPフォントをunicode-range付きの分割WOFF2へバインドし、`font-display: swap`を使用します。原本は以下のパスで保持し、画像・フォント・CSS/JSの配信出力は`config/home-performance-assets.json`でSHAとともに管理します。原本と配信用軽量データを混同しません。

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
- 操作ボタン・見出し・キャラクター名にピル型を使う。補足ラベルはTOPニュースのカテゴリ表示以外に設けない
- 影は `box-shadow` と `drop-shadow` を使い分ける
- Safariで画像の四角い影が目立たないよう、画像自体には `drop-shadow` を使う
- テキストの白・灰色ドロップシャドウは読みにくくなるため、基本的に使わない
- セクション見出しはポップなラベル調で統一する
- 下層6ページもTOPと同じキャラクターパターンを使う。`city-checker-tile.svg`を960×384pxで反復、不透明度0.07、ベース#fff7e8。ページ最小高100svhで背景を描画する
- ページやカード内の丸い背景装飾、下層見出し・ゲーム画像の静的な傾きは使わない。カード内は単色、キャラクター画像面の色分けは維持する
- 下層ページ上部の英語eyebrow等、ゲームの状態・プレイ情報ラベル、キャラクターの特徴タグは撤去。本文・見出し・名前背景・操作ボタン・ゲームHUDは残す。タグ削除後もオリジンの頭が冒頭文と重ならないよう、PCの画像面のみ最小高380pxを確保する

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
| `assets/icon-192.png` | サイトアイコン・OGP。ヘッダーや現在のゲーム紹介画像には使わない |
| `assets/characters/chara_inutaro_origin.png` | 全7ページの共通ヘッダー画像。公開時は既存の軽量 `chara_inutaro_origin-top` WebPへバインド。プロフィール本文は大きい版を維持 |
| `assets/favicon.png` | favicon |
| `assets/apple-touch-icon.png` | iOS用アイコン |
| `assets/fonts/` | サイトフォント |

公開8ページのheadでは、犬タローゲームと共通の32×32 favicon、180×180 Apple用、192×192アイコンを指定します。既存PNGと固定クエリ `v=20260616-icon` を維持し、ページ階層ごとの相対パスを使います。検索結果のアイコン表示はGoogleの再クロール・判断に依存します。変更範囲と検証の正本は[検索用アイコンSDD](seo-favicon-sdd.md)です。

### 8.2 トップページマップ

| パス | 用途 |
| --- | --- |
| `assets/home-city/map_bg.svg` | マップ背景 |
| `assets/home-city/map_character.svg` | キャラクター紹介リンク |
| `assets/home-city/map_sns2.svg` | Xリンク |
| `assets/home-city/map_linestamp.svg` | LINEスタンプリンク |
| `assets/home-city/map_game.svg` | ゲームリンク・TOPの「ゲームをえらぶ」カード |
| `assets/home-city/map_goods.svg` | グッズリンク |
| `assets/home-city/map_note.svg` | ブログリンク |
| `assets/home-city/map_illast.svg` | イラストリンク |
| `assets/home-city/map_youtube.svg` / `map_youtube_bg.svg` | YouTubeの前面看板／画面背景 |
| `assets/home-city/map_decoration_*.png` | 非リンク装飾 |
| `assets/home-city/youtube-latest.json` | YouTube最新情報の静的フォールバック |
| `assets/home-city/youtube-thumb-{id}-{hash}.webp` | schemaVersion 2の保存済みサムネイル。JSONのlocalThumbnail.url・SHA・寸法で参照。旧JPGは初期フォールバック用 |
| `assets/home-city/note-latest.json` | note RSSから取得した最新記事と保存済みサムネイルの参照 |
| `assets/home-city/note-thumb-1..6.(png/jpg/webp)` | note記事ページのOGP画像を保存したブログカルーセル用サムネイル |
| `assets/home-city/suzuri-latest.json` | SUZURI APIから取得した最新商品 |
| `assets/home-city/line-stamps.json` | 現在販売中のLINEスタンプ・絵文字 |

表は入力原本・データの役割。公開ビルドはmanifestに従い`assets/versioned/`の画像とハッシュ付きCSS/JSへ変換します。原本・過去の公開出力は保持し、旧PNGを検索結果だけで一括削除しません。

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
| `assets/games/inutaro-mushi/gameplay-preview.png` | TOPとゲーム一覧に共通のジャンプ・虫のプレイ風景。公開用800×450 WebP、containで全体表示 |
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

公開用参照を含めたローカル確認は以下を基本にします。起動ログのURLを使い、8780等の固定ポートを前提にしません。

```text
node scripts/preview-site.mjs --built
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

公開承認後は最新mainを確認し、自動更新JSONを古いローカルデータで上書きせず、承認した差分だけをコミットします。検証ブランチのCI合格後にmainへ通常pushし、Cloudflare本番ビルド・旧GitHub Pages・本番PC/SPを確認します。未公開のラベル撤去に、以前の全209件CI合格や本番確認を流用しません。

## 13. 現在の未設定・検討中項目

| 項目 | 状態 |
| --- | --- |
| ブログ内製化 | 現在はnoteへの導線 |
| ラベル撤去の公開 | ローカル実装・関連60件合格。GitHub／本番反映は別工程 |
| Cloudflare配信 | 移管済み。静的アセットWorkerを使用し、旧Pages FunctionsのAPIは実行しない |
| ルートドメイン運用 | 本番は `https://erinui.com/`。旧GitHub Pagesは移転誘導用 |
| 3Dプロトタイプ | `games/inutaro-3d-prototype/` は試作扱い |
| 検討用ワイヤー | `drafts/home-wireframe/` は検討用で、本番導線とは分離 |
| イラストページ | 仮ページ設置済み。内容は今後追加 |
| OGP・共有URL | `https://erinui.com/` と本番の拡張子なし正規URLを採用済み |
| 固定ページOGP | キャラクター、ブログ、規約、ポリシー、イラストに基本OGP追加済み |
| トップのクラス名 | `draft-*` 命名を本番用へ整理済み |
| 未追跡ファイル | 旧素材、検討用、試作の扱いを分類して整理予定 |

## 14. 改善対応計画

以下は2026-07-26時点の計画履歴で、現在の未設定一覧ではありません。設計経緯は`docs/site-improvement-plan.md`、直近の確定仕様・公開状態は[TOP改修SDD](top-redesign-sdd.md)第15〜21節を参照します。

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
- トップページの「キャラクター紹介」カルーセルと対応アンカー

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
