# エリカッテシティ SEO改善計画

作成日: 2026-10-10

状態: 工程0〜2の技術改修を実装・ローカル検証済み。本番反映と検索管理ツールの確認は下記実施記録で区別する。工程3〜5は未完了。

## 実施記録 2026-10-10

- 配信はCloudflare Workersの静的アセット専用Worker `inutaro-game`。GitHub `erinui/inutaro-game` の `main` とWorkers Buildsを連携。ビルドコマンドなし、デプロイコマンド `npx wrangler deploy`、ルート `/` を確認した。
- 変更前の正常Workerバージョンは `370520e1`、ソースは `c941dd7`。本番カスタムドメインは `erinui.com`、検証ホストは `inutaro-game.erikanuinui.workers.dev`。Pages FunctionsとKV等のbindingは稼働していない。外部データは従来どおりGitHub Actions生成の静的JSONを使用する。
- 公開8HTMLのcanonical・OGP/Twitter URLとゲーム共有定数を本番へ変更。本文・内部リンク・素材・ゲーム処理は保持。旧GitHub Pagesのみ、対応する新ページへの移転案内を表示し、キャラクターの有効なアンカーを保持する。ゲームでは開始前の操作領域へ置く。自動転送はしない。
- `sitemap.xml` は8正規URLのみ、`robots.txt` はクロール許可とSitemap宣言。架空のlastmod・priority・changefreqは付けない。
- CloudflareのAlways Use HTTPSをOFFからONへ変更。`http://erinui.com/pages/characters.html?seo-test=1` → 同じパス・クエリのHTTPSへ301を確認。TLSモード・HSTS・証明書設定は変更していない。このスイッチはドメイン全体に適用されるため、今後のサブドメインもHTTPS前提とする。
- 追加課題 SEO-PUBLISH-01: 変更前はルート全体をアセットとして扱い、`/docs/site-specification.md` が200だった。`scripts/build-site.mjs` と `wrangler.jsonc` で公開8ページ・クライアントコード・版管理されたassets・ニュースJSON・検索設定のみを `dist/` に出力する。ソース配置は移動せず、参照URLとファイル内容も維持。docs・tests・scripts・functions・drafts・試作・秘密ファイルを出力しない。ローカル未追跡の素材も含めない。
- `dist/` と `.wrangler/` はGit対象外。ビルドは既存の出力ディレクトリを無断削除・上書きしない。繰り返す場合は新しいチェックアウトを使うか、自分で生成したdistであることを確認してから取り除く。Cloudflareの新規チェックアウトではWranglerのcustom buildが自動実行される。
- Workersの `_headers` で確認済みworkers.devホストとそのバージョンプレビューにのみ `X-Robots-Tag: noindex` を指定。本番ドメインには指定しない。ファイルの存在だけで配信成功とは扱わず、公開後のHTTP応答を別途確認する。
- バージョンURLは `version-inutaro-game.erikanuinui.workers.dev` の形式。ルールは `https://:version-inutaro-game.erikanuinui.workers.dev/*` とし、別Workerや本番ドメインへ広げない。既存のVersion URL有効/無効設定は変更しない。[Cloudflareの形式仕様](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/)
- TDD: canonical・サイトマップ等は変更前13件中12件失敗を確認後、13件成功。既存13件も成功。公開ビルド・プレビュー設定2件は未実装時の失敗を確認後に成功。合計28件。元baselineは維持し、ゲームheadと共有URL定数だけを仕様ID付きの許容差分として検証。
- 320〜1440pxの12幅×7ページ、84ケース、地図矩形、メニュー、カルーセル、装飾、フォント失敗時、YouTube切替を検証し成功。PC/SPの比較画像を目視。Wrangler 4.149.0のdry-runで86公開ファイルの出力と設定の受理を確認。公開前後のHTTP・検索登録結果は別記録とする。
- Search Consoleの本番ドメインプロパティで所有権確認が成功。管理者の承認を得てGoogle確認用TXTを1件追加し、DNS反映を確認した。既存Workerレコードを維持し、GoogleへのCloudflareアカウントアクセス権は付与していない。初回確認はDNS反映前のため失敗し、反映後の確認で成功。確認状態維持のためTXTを削除しない。
- サイトマップ送信は受付済み。ただし初回のGoogle取得は「取得できませんでした／読み込めませんでした」、検出0件。本番XMLは通常UAとGooglebot名UAの双方で200、application/xml、URL表と一致を確認。UA名を使った取得は実Googleクロールの代用ではない。取得成功・登録完了とはまだ扱わず、後続の再処理結果を確認する。
- TOPのURL検査では2026/10/10 19:48:13 JSTのスマートフォンGooglebot取得成功、クロール/インデックス登録許可あり、ユーザー指定canonicalは本番TOPと確認。一方、状態は「クロール済み - インデックス未登録」。TOPのインデックス登録リクエストは実行中。検索結果の表示は未完了。外部プロフィール編集は未実施。
- 初回公開コミット `e43fe23` のWorkers BuildsとGitHub Pagesのbuild/deployが成功。Worker `1e26a7e2` を確認。本番8URLの最終200、canonical・OGP、公開画像、sitemap・robots、HTTP8パスの301、資料/更新スクリプト/テスト/Functions/試作/秘密の404、workers.devのnoindex、旧キャラクターページのアンカー付き移転案内、ゲーム起動・タイマー進行・canvas描画・JS例外なしを確認した。
- 本番ブラウザ向けHTML末尾には既存Cloudflare Web Analyticsビーコンが付加される。本文保護検証ではその既知の末尾スクリプトだけを除外し、8ページの本文ハッシュが変更前と一致することを確認。解析設定は変更していない。

今回の公開単位は工程1・2の技術整備と、配信範囲の限定。metadata原稿・WebSite・専用OGP・ゲーム紹介新設・画像/フォント軽量化は、計画どおり別の確認・公開単位とする。検索順位・登録完了を保証するものではない。

本番ドメイン `https://erinui.com/` を検索エンジンと利用者にとって一貫した公式URLにする。まずドメイン移行と検索登録の確認を整え、次にページの説明、最後に通信量を改善する。検索順位や登録日を保証する計画ではなく、技術的な受入条件と公開後の検索結果を分けて管理する。

## 1. 目的と対象範囲

初期目標は「エリカッテシティ」「えりぬい」「犬タロー」「犬タローの虫さんまって×2」の検索から、目的に合った公式ページを見つけられる状態にすること。「無料ゲーム」など広い一般語は、登録状況と検索需要を計測した後の改善対象とする。

対象は公開8ページのメタ情報、URL設定、ゲーム内共有URL、サイトマップ、検索向けの紹介内容、TOPの画像とフォント配信。ゲーム紹介ページを追加した場合は対象を9ページへ拡張する。

次の内容は変更しない。

- マップの配置、リンク画像の見た目、装飾の動き、YouTube看板の重なり。
- キャラクター名、ゲーム正式名称、既存の本文とデザインの確定原稿。
- ゲームの当たり判定、時間、操作、音声、スコア、保存・共有画像の生成ロジック。
- 外部サービスの作品名、取得件数、更新周期、APIキーや認証設定。
- 未確定の問い合わせ・ファンアート用途、収益化、ランキング、フォルダ再編。

画面に表示する紹介文の追加は工程3で原稿・PC/SP配置を確認してから行う。SEOを理由にキーワードを隠したり、既存の名称やラベルを一括置換したりしない。

## 2. 改善前の状態

2026-10-10に本番のChrome表示とHTTP応答を確認した。

| 項目 | 確認結果 | 計画上の扱い |
| --- | --- | --- |
| HTTPS本番 | 公開8ページが最終応答200。画像欠落・JS例外なし | 表示と操作を維持 |
| HTTP版 | TOPが200。HTTPSへ転送されない | 恒久転送を設定 |
| 旧GitHub Pages | 同じTOPを200で公開 | 新URLへの移行シグナルを整備 |
| 正規URL指定 | 公開8ページすべてcanonicalなし | 本番の最終URLを指定 |
| OGP/Twitter画像 | 公開8ページに旧GitHub Pages URLが残る | 本番URLへ更新 |
| ゲーム共有 | `game.js` の `siteUrl` が旧GitHub Pagesを固定指定 | 本番URLへ変更 |
| 下層URL | `.html`から拡張子なしへ307転送 | 本番の最終URLを正規URLとして採用 |
| robots.txt | 200。取得内容はコメントで、Disallowによる禁止はない | 検索許可を維持しSitemapを案内 |
| sitemap.xml | 404 | 公開対象のXMLを追加 |
| www | 名前解決不可 | 正規ホストはwwwなし。www転送は任意の追加設定 |
| ゲーム本体 | canvas中心、h1なし。説明は閉じた案内パネル内 | 独立したゲーム紹介ページを設計 |
| ブログ・イラスト | note案内・準備中のページ | 未確定用途を維持。作品・原稿が揃ってから充実 |
| 構造化データ | 確認した8ページにJSON-LDなし | TOPにWebSiteを追加 |
| TOP通信量 | 計測可能なリソース本文合計10,419,637bytes、59リソース | 軽量化の比較基準 |
| TOP画像 | 描画後48枚、lazy指定0枚 | 画面外のカード画像を遅延読込 |
| 主な大容量素材 | X画像の圧縮後本文約1.84MB、JP WOFF2約1.64MB | 容量削減の優先対象 |

通信量はHTMLを除く `PerformanceResourceTiming.encodedBodySize` の合計で、クロスオリジンで計測できない容量を含まない。画像数は最新JSON反映後の値。測定時の外部データに依存するため、再測定時は使用データも記録する。

390×844px、下り6Mbps、上り1.5Mbps、遅延150ms、CPU4倍の単発模擬測定では、LCP約1.0秒、CLS約0.049、load完了約15.2秒。load完了は初期表示の所要時間ではなく、実ユーザーのCore Web Vitalsでもない。初期表示は維持しながら不要な先行通信を減らす。

外部検索では `site:erinui.com` と「エリカッテシティ」の結果を確認できず、「えりぬい」「犬タロー」に関連するnote記事・SUZURI商品は見つかった。Google/Bingの実順位、Search Consoleの登録状況、検索需要は未確定。検索で見つからないことだけで未登録とは判断しない。

検証記録は個人環境の `seo-audit-20261010/production-audit.json`、`mobile-throttled-lab.json`、`top-mobile.png` に保存している。公開アセットへコピーしない。

## 3. 本番URL設計

正規ホストは `https://erinui.com`。ソースのファイル名と、配信時の正規URLを区別する。ディレクトリ移動や `.html` ファイル名の変更は行わない。

| ページ | ソース | 採用する正規URL |
| --- | --- | --- |
| TOP | `index.html` | `https://erinui.com/` |
| ゲーム一覧 | `games/index.html` | `https://erinui.com/games/` |
| ゲーム本体 | `games/inutaro-mushi/index.html` | `https://erinui.com/games/inutaro-mushi/` |
| キャラクター | `pages/characters.html` | `https://erinui.com/pages/characters` |
| おしらせ・ブログ | `pages/blog.html` | `https://erinui.com/pages/blog` |
| イラスト | `pages/illustrations.html` | `https://erinui.com/pages/illustrations` |
| 利用規約 | `pages/terms.html` | `https://erinui.com/pages/terms` |
| プライバシー | `pages/privacy.html` | `https://erinui.com/pages/privacy` |
| ゲーム紹介 新設案 | `games/inutaro-mushi/about/index.html` | `https://erinui.com/games/inutaro-mushi/about/` |

各HTMLのheadに1個の絶対URL canonicalを置く。`release`、`youtubePanel`、共有用クエリ、フラグメントはcanonicalとサイトマップに含めない。キャラクターへ移動するアンカーなど、利用者の遷移先情報は保持する。

`og:url`はcanonicalと揃え、OGP/Twitter画像とゲーム共有リンクも本番ドメインを使用する。OGPはSNS共有用でありcanonicalの代替ではない。ローカルや旧GitHub Pagesでもメタ情報は本番を示し、`location.origin`から正規URLを生成しない。

画像・CSS・JSの通常参照と既存の内部リンクは相対パスを維持する。本番の拡張子なしURLへ内部リンクも揃える場合は、ローカルプレビューにURL別名解決を追加してから、別の承認済み変更として実施する。工程1では既存の`.html`リンクを一括変更しない。

HTTP→HTTPSはCloudflare側の設定を第一候補とする。`.html`の307は現在のホスティングによる動作なので、本番設定を確認してから扱う。307を理由にファイル名を変えたり、ループする追加転送を置いたりしない。

## 4. 工程と担当

担当の「実装」はソース・テスト・資料を扱う作業、「管理者」はCloudflare、Search Console、外部プロフィールの設定を扱う作業。認証情報をチャットや公開リポジトリに貼らない。

| 工程 | 主な内容 | 担当 | 着手条件 | 完了条件 |
| --- | --- | --- | --- | --- |
| 0 設定確認 | 配信基盤、デプロイ元、旧公開、検索管理の確認 | 実装・管理者 | 本計画の確認 | 変更先・切り戻し先と担当が確定 |
| 1 URL移行 | canonical、共有URL、HTTP転送、旧公開対策 | 実装・管理者 | 工程0 | 下記URL試験が成功 |
| 2 検索登録 | sitemap、robots、検索管理ツールの確認 | 実装・管理者 | 工程1 | XML配信・送信・URL検査結果を記録 |
| 3 説明と内容 | metadata、WebSite、ゲーム紹介、OGP | 実装・原稿確認者 | 正規URL確定、追加原稿の確認 | 内容・表示・構造化データの試験が成功 |
| 4 軽量化 | 画像の遅延読込、形式・解像度、フォント | 実装 | 比較用データと画面の固定 | 容量改善と見た目・操作の回帰成功 |
| 5 継続評価 | 登録、正規URL、検索語、クリックの観察 | 管理者・実装 | 本番公開 | 7・28・56日後の結果と次の対応を記録 |

### 工程0 設定確認

- Cloudflare経由の配信は確認済み。Pages / Workers等のホスティング種別、プロジェクト、Git連携、公開ブランチ、ビルド・出力範囲、プレビューURLは管理画面で確認する。
- 新旧サイトのSearch Consoleの所有権と利用できるプロパティを確認する。未登録なら `erinui.com` のドメインプロパティをDNSで確認する。
- 旧GitHub Pagesの配信設定と、ほかの `erinui.github.io` ページへの影響を確認する。
- CloudflareのHTTPS・転送・robotsの設定を変更前に記録する。サイト全体にnoindexを付けない。
- 実装前のURL応答、原稿、地図矩形、カルーセル、共有、通信量を保存する。

### 工程1 URL移行

| 仕様ID | 作業 | 修正対象と影響 |
| --- | --- | --- |
| SEO-URL-01 | 公開8HTMLにcanonicalを追加 | headのみ。表示とアンカー不変 |
| SEO-URL-02 | OGP/Twitter絶対URLを本番へ変更 | 公開8HTML。旧URLの共有キャッシュは再取得時に確認 |
| SEO-SHARE-01 | ゲームのsiteUrlを本番へ変更 | `games/inutaro-mushi/game.js` の共有URL定数。コピー・X共有・Web Shareを確認 |
| SEO-REDIRECT-01 | HTTPからHTTPSへ恒久転送 | Cloudflare管理設定。パス・必要なクエリを保持 |
| SEO-MOVE-01 | 旧GitHub Pagesに新URLを明示 | 旧公開のcanonicalとOGP、新サイトへの案内。設定の分岐は旧ホストに限定 |
| SEO-PREVIEW-01 | 検証用ホストの索引対策 | プレビューのnoindexを確認。本番の応答に付かないことを確認 |

旧ホストはCloudflareの管理下ではないため、新ドメインの転送ルールでGitHub Pagesの応答を変えられない。GitHub Pagesに `_redirects` を置くだけで301になる設計も採用しない。

HTTP恒久転送が安全に実現できる配信方式なら、旧URLごとに対応する新ページへ転送する。実現できなければ、新ドメインへのcanonicalと移転案内を採用し、旧公開を維持する。全ページをTOPへ転送したり、旧ページをすぐ削除したりしない。JSでの自動転送やGitHub PagesのCustom domain変更は、影響範囲を確認して別途判断する。

旧URLのURLプレフィックス `https://erinui.github.io/inutaro-game/` はパス単位なので、Search Consoleのアドレス変更ツールの対象外。`erinui.github.io` 全体を移転した扱いにはしない。今回はページごとの移行シグナルとURL検査を基本とする。[Googleの利用条件](https://support.google.com/webmasters/answer/9370220?hl=ja)

www版は必須にしない。必要な場合だけDNS・TLS証明書を整えてwwwなしへ転送する。未設定のwwwに転送先を向けない。

### 工程2 サイトマップと登録確認

| 仕様ID | 作業 | 受入条件 |
| --- | --- | --- |
| SEO-SITEMAP-01 | ルートに `sitemap.xml` を追加 | 有効なXML。現在の公開8ページの正規URLのみ。各URLは最終200 |
| SEO-ROBOTS-01 | `robots.txt` にSitemapを案内 | 検索を妨げず、管理側の既存ポリシーも意図せず削除しない |
| SEO-INDEX-01 | Search ConsoleでTOP・キャラ・ゲーム一覧・ゲーム本体をURL検査 | 取得可否、登録状態、ユーザー指定／Google選択の正規URLを記録 |
| SEO-INDEX-02 | 外部プロフィールの公式サイトURLを確認 | 管理者がX・YouTube・note・SUZURI等の編集可能な箇所を確認 |

JSON、API、画像、docs、drafts、試作、プレビュー、クエリ付きURLはサイトマップへ含めない。サイトマップ除外はアクセス制限ではない。公開対象外ファイルをサーバーへ出さない確認とは分ける。

`lastmod`は重要な内容を実際に更新した日時が分かる場合だけ記載し、不明なら省略する。4時間ごとの外部データ取得日時を、全ページの更新日時として流用しない。`priority`と`changefreq`を順位向上のために設定しない。

サイトマップを送信し、主要URLに必要なインデックス登録リクエストを行う。毎日の連続リクエストはしない。Bingも確認対象にする場合は、Bing Webmaster Toolsの所有権とサイトマップを同様に整える。

技術的な公開完了と、Google/Bingが実際に登録・採用した状態は別に記録する。サイトマップ送信やリクエストで即時登録は保証されない。[サイトマップの仕様](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

### 工程3 検索向けの説明と紹介ページ

| 仕様ID | 作業 | 方針 |
| --- | --- | --- |
| SEO-META-01 | title・descriptionの見直し | サイト／作者／キャラの関係を自然に説明。公開8HTMLの原稿を事前に確定 |
| SEO-DATA-01 | TOPにWebSite JSON-LD | nameはエリカッテシティ、urlは本番TOP。alternateNameは実際のサイト別名として妥当なものだけ |
| SEO-OGP-01 | 共有用画像の整備 | 既存素材で1200×630px案を作りPC/SP共有時を確認。faviconと分離 |
| SEO-GAME-01 | 独立したゲーム紹介ページ | ゲーム本体を改造せず、説明・操作・プレイ風景画像・プレイ導線を掲載 |

titleの候補は次のとおり。既存の画面内見出しをこの文字列へ自動で置き換えない。

| ページ | title案 | 主な検索意図 |
| --- | --- | --- |
| TOP | エリカッテシティ \| えりぬい・犬タローの公式サイト | サイト名・作者名から公式へ |
| キャラクター | 犬タローたちのキャラクター紹介 \| エリカッテシティ | キャラクターを知る |
| ゲーム一覧 | ブラウザゲーム一覧 ぬいんてんどう \| エリカッテシティ | あそべるゲームを選ぶ |
| ゲーム紹介 | 犬タローの虫さんまって×2 ゲーム紹介 \| エリカッテシティ | 内容・操作・対応端末を調べる |
| ゲーム本体 | 犬タローの虫さんまって×2 \| エリカッテシティ | すぐにプレイする |

キャラクターのdescriptionには犬タロー・えりか・さすけ・ぶくろちゃんを自然に含める。TOPは作者とキャラクター、ゲーム・動画・ブログ・グッズへの公式入口であることを説明する。説明文の長さを固定文字数へ無理に合わせず、重複やキーワードの羅列を避ける。

ゲーム紹介の設計案は共通ヘッダー、正式名のh1、既存のプレイ風景画像、40秒で虫さんを集めるルール、カラスの落とし物、PC/SP操作、無料・ブラウザで遊べる条件、プレイボタンを基本とする。対応条件は実装で確認した範囲だけ記載する。ゲーム一覧に紹介用の補助導線を追加し、既存の直接プレイ導線は維持する。

新設前に原稿とPC/SPのワイヤーを確認し、Figma・画面設計資料に反映する。紹介と本体は異なる用途のページとしてそれぞれ自己canonicalを持つ。本体にh1がないことだけを理由に検索不可とは扱わず、検索用の説明を無理にHUDへ詰め込まない。紹介公開後はサイトマップへ9件目を追加する。

YouTube・note・SUZURI・LINEの取得内容はJSでも検索エンジンが処理できる可能性がある。重要なサイト・キャラ・ゲーム紹介は初期HTMLに置き、外部情報の取得失敗でも意味が残るようにする。全カルーセルを静的HTMLへ生成する変更は、更新フローとの整合を検証してから判断する。

WebSiteの追加はサイト名を伝えるためで、順位やリッチリザルトの保証ではない。サイト内で販売しない外部グッズへ架空の在庫・評価・価格のProduct情報を付けない。実体のない会社情報や検索フォームも追加しない。

ブログとイラストの準備中ページは、SEOを理由に問い合わせ・ファンアートへ変更しない。作品・原稿が揃った後に別計画で充実させる。一律のnoindex化やnote本文の転載は行わない。

### 工程4 通信量の改善

1. 画面外のニュース・各カルーセル画像に `loading="lazy"` を設定する。`home.js`が生成するカードとHTMLの初期カードを両方対象にする。ヘッダー・主要マップ画像は先行表示を維持する。
2. 仮画像の読込後に実画像へ置き換える通信を調べ、画面外の不要な二重読込を抑える。API失敗時の表示を失わない。
3. X画像を第一対象に、ラスターを埋め込んだSVGの内容・透明度・画素寸法を確認する。表示寸法と高DPIに適したWebP/AVIF等を比較し、透過・余白・影・マップ座標を保持する。形式変更のために形を描き直さない。
4. キャラクター画像と他のマップ素材へ対象を広げる。YouTubeのサムネはカードの表示幅に適した取得サイズを検証し、看板とカルーセルの画質を別々に確認する。
5. JP書体は同じ字形を維持して用途別分割を検討する。静的原稿だけのサブセットで動的作品名の漢字を欠落させない。動的テキスト用の補完を用意してから採用する。
6. `font-display: block`とpreloadは文字非表示時間、代替書体、レイアウトシフトを比較して変更を判断する。フォント名・見た目を別書体へ置き換えない。

提案する容量目標は、同じ390×844px・同じJSON・空キャッシュ・同じ待機条件で、TOPの計測可能なリソース本文を第1段階7MB以下、第2段階5MB以下にすること。これは改善目標であり、現時点で達成済みではない。画質・操作を損なう場合は採用せず、比較結果と次の対象を記録する。

単発模擬測定は最低3回の中央値で比較し、LCP・CLSを悪化させない。INPはload時間から推測せず、操作測定と実ユーザーのデータで確認する。Core Web Vitalsの目安はLCP 2.5秒以内、INP 200ms未満、CLS 0.1未満。実ユーザーの評価はラボ測定と分け、Search Console等でデータがある場合に確認する。[Googleの指標](https://developers.google.com/search/docs/appearance/core-web-vitals)

## 5. 修正対象ファイル

| 対象 | 予定する変更 | 注意点 |
| --- | --- | --- |
| 公開8HTML | canonical、metadata、TOP JSON-LD | 画面内の確定原稿やアンカーを勝手に変更しない |
| `games/inutaro-mushi/game.js` | 共有URL定数のみ | ゲームロジックと画像生成処理は保持 |
| `robots.txt` / `sitemap.xml` 新設 | 本番URLの案内 | 管理側robotsの内容と配信結果を確認 |
| `home.js` / TOP HTML | カード画像の読込方針 | 外部取得・フォールバック・10秒切替を維持 |
| `home.css` / `assets/fonts/` | フォント配信の最適化候補 | 字形、カバレッジ、折返し、ライセンスを確認 |
| `assets/home-city/` / `assets/characters/` | 採用した画像の最適化 | 元素材を保持。未使用の旧素材の整理は別作業 |
| `games/inutaro-mushi/about/index.html` 新設案 | ゲーム紹介 | 原稿・画面設計確認後に追加 |
| `tests/seo.test.mjs` / `tests/fixtures/seo.json` 新設予定 | SEO受入試験とURLの正本 | この計画時点では未作成 |
| `tests/helpers/site-server.mjs` | XML/txtと新ページの配信許可 | 個別allowlistとMIMEを追加し、秘密ファイルを許可しない |
| 公開設定 | HTTPS、旧公開対策、プレビュー索引対策 | ホスティング確定後に設定。`_headers`等は必要な場合だけ |
| `scripts/build-site.mjs` / `wrangler.jsonc` / `_headers` | Workersの公開出力とホスト別noindex | SEO-PUBLISH-01として追加。旧GitHub Pagesの配信方式と混同しない |
| 既存の仕様・設計資料 | 新URL・metadata・紹介ページの適用状態 | 計画と実装完了を混同しない |

## 6. SDDとTDDの実装手順

1. 工程0で配信条件を確定し、URL対応表・採用metadata・変更可能範囲を `tests/fixtures/seo.json` に定義する。
2. `tests/seo.test.mjs`でcanonical、OGP、共有URL、サイトマップ、JSON-LDを検査し、変更前の失敗を確認する。実装・ネットワーク・テスト起動の失敗を区別する。
3. 工程1・2を最小変更で実装し、ローカルで成功を確認する。公開HTTPの転送はローカルサーバーの成功で代用しない。
4. 原稿と画面設計の確認後、工程3の受入試験を追加して実装する。追加ページの主導線と初期HTMLを確認する。
5. 工程4は素材・読込方式ごとに比較し、小さい単位で変更する。一括で全素材・全フォントを変えない。
6. 既存13件の仕様試験、12幅×7主ページの表示回帰、新設ページ、ゲーム操作を確認する。PC/SPの目視とSafariの透過影確認も行う。
7. 公開する場合はクリーンなコミット内容でも試験する。公開元・反映先・CloudflareとGitHub Pages双方の配信結果を区別して確認する。
8. 技術的な完了を記録してから検索管理ツールで登録状況を確認し、工程5へ進む。

既存の `site-design-baseline.json` は旧工程の保護記録として残す。SEOで意図的に変更するtitle、共有URL、追加リンク等だけを仕様ID付きの承認差分として扱い、失敗を消すために全ハッシュ・全リンクを実装後の値で上書きしない。

## 7. 受入試験

| 区分 | 確認する内容 | 合格基準 |
| --- | --- | --- |
| 正規URL | 8ページ、公開後は新設ページも検査 | canonicalは1個、対応する本番最終URL。クエリ付きでも不変 |
| metadata | title、description、og:url、画像、ゲーム共有 | 採用原稿・本番URLと一致。旧ホストが残るのは履歴・移転案内のみ |
| HTTP | HTTP/HTTPS、旧公開、`.html`別名 | HTTPSへ恒久転送。最終200、ループなし、パス保持。旧公開は採用した移行案の条件を満たす |
| 404 | 存在しない任意のURL | 404。TOPを200で返すsoft 404を作らない |
| 索引制御 | HTML、HTTPヘッダー、robots | 本番を禁止しない。プレビューのnoindexは本番へ漏れない |
| XML | sitemapの構文とloc | XMLパーサーで成功、重複なし、正規URLのみ、200取得可能 |
| JSON-LD | TOPのWebSite | JSON構文、name/url、実表示との整合。構文・URL検査を実施 |
| 初期HTML | JSを無効化したサイト・キャラ・ゲーム紹介 | 主要説明と通常のaリンクが残る |
| 表示 | 320〜1440pxの既存12幅と新設ページ | 横はみ出し・画像欠落・文字切れなし。既存地図矩形は0.5px以内 |
| 操作 | メニュー、全カルーセル、装飾、動画切替、ゲーム | 既存動作維持。共有URL以外のゲーム処理が不変 |
| 画像 | 新旧PC/SP・高DPI・Safari | 透過、余白、輪郭、影、サムネ全体、全身表示を維持 |
| フォント | 静的原稿と動的作品名、失敗時 | 文字欠落なし。確定字形維持、不可視時間・折返しを比較 |
| 性能 | 固定データ・条件で3回以上 | 容量目標を比較し、LCP/CLSの回帰なし。field dataとは区別 |

Search ConsoleのURL検査では取得可否、登録状況、最終クロール、Google選択の正規URLを記録する。Google選択が指定と異なる場合は理由を調査し、canonicalの存在だけで「検索反映完了」としない。

## 8. 公開と切り戻し

工程1・2、工程3、工程4は分けて公開する。工程1の公開時はHTTPS設定とmetadataを整合させ、工程2の検索管理を直後に確認する。大きなデザイン変更をドメイン移行と同時に行わない。

公開前に各配信先のデプロイ識別子、変更ファイル、Cloudflare設定を記録する。素材の元ファイルと変更前の比較画像を保持する。

canonical誤り、本番noindex、転送ループ、主要導線の不通、画像欠落、ゲーム操作不良は切り戻し対象。静的コード・素材は直前の正常デプロイへ戻し、Cloudflare設定は記録した変更だけを戻す。ユーザーの他の変更や定期取得の最新JSONをまとめて巻き戻さない。

検索結果がすぐ変わらないことだけでは切り戻さない。技術的不具合と、再クロール・正規URL再評価の待機を区別する。

## 9. 公開後の評価

| 時点 | 評価項目 | 判断と次の対応 |
| --- | --- | --- |
| 公開直後 | HTTP・canonical・robots・サイトマップ・操作 | 配信結果を確認し、不具合だけ修正 |
| 7日後 | 主要URLの取得・登録・選択canonical | 未取得／重複／拒否などの理由を分類。登録期限の保証にはしない |
| 28日後 | サイト名・作者名・キャラ名・ゲーム名の表示回数／クリック | ページと検索意図の一致を確認。CTRは表示数・順位を併記 |
| 56日後 | 旧新URLの推移、検索語、紹介ページ、端末別性能 | 原稿・内部導線・作品内容の追加を判断 |

観察する検索語は「エリカッテシティ」「えりぬい」「erinui」「犬タロー」「犬タローの虫さんまって×2」。表記ゆれや「虫取り ブラウザゲーム」等は、実際に表示されたクエリを見て追加する。

開始時点が0表示の場合に改善率だけを使わない。新ドメインの表示回数・クリック数、主要URLの登録状態、旧URLの残り方をまず記録する。検索ボリュームや競合難易度は未測定であり、指名語での上位表示や一般語での流入を保証しない。

## 10. 先に確認する事項

| 項目 | 採用する基本方針 | 実行前に必要な確認 |
| --- | --- | --- |
| 本番ホスト | HTTPS・wwwなしのerinui.com | Cloudflareのプロジェクト・公開設定 |
| 旧GitHub Pages | 新canonicalと移転案内、旧公開維持 | HTTP恒久転送が安全に可能か、他ページへの影響 |
| 検索管理 | 新ドメインの所有権と主要URL検査 | 管理者のSearch Console登録状況 |
| ゲーム紹介 | 独立したaboutページ | 原稿とPC/SPレイアウトの確認 |
| 共有画像 | 既存素材による専用OGP | 切れ・読みやすさ・用途の確認 |
| 軽量化 | 同じ画質・書体・配置の維持 | 素材ごとの比較と容量目標の評価 |

まず工程0・1・2を優先する。画面内の原稿追加や画像形式変更を先行させず、新ドメインを本番とする配信・検索の前提を固める。

## 11. 参考仕様

- [Google URL変更を伴うサイト移転](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
- [Google 正規URLの指定](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google サイト名の構造化データ](https://developers.google.com/search/docs/appearance/site-names)
- [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google site検索の制約](https://developers.google.com/search/docs/monitor-debug/search-operators/all-search-site)
- [Cloudflare HTTPS転送](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/)
- [Cloudflare Workers 静的アセット設定](https://developers.cloudflare.com/workers/static-assets/binding/)
- [Cloudflare Workers 静的アセットのヘッダー設定](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Cloudflare Workers HTML URLの扱い](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)

工程0でWorkers静的アセット運用を確認したため、現行配信にはWorkersの仕様を適用する。Pages Functionsの将来用実装はこのWorkerでは実行されない。
