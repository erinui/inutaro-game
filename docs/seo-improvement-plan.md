# エリカッテシティ SEO改善計画

作成日: 2026-10-10

状態: 工程0〜2の技術改修を本番公開・検証済み。Search Console所有権、サイトマップ取得成功（8ページ）、TOPのインデックス登録を確認。主要3下層ページは登録リクエスト受付済み。2026-10-11、公開単位A（metadata・WebSite・読み込み制御）をローカル実装・検証済み、未公開。B・Cの圧縮候補は比較後に保留し、素材を保持した。外部プロフィールと公開後の検索評価は未完了。ページ新設・画面内コンテンツ編集は行わない。

実装用の正本は[SEOと読み込み改善 SDD実施仕様](seo-performance-sdd.md)。本計画は原稿・調査・目的を保持し、SDDに取得失敗時の処理、変更境界、TDDケース、既存baselineの限定更新、性能比較、公開・切り戻し手順を定義した。[実装・候補検証記録](seo-performance-sdd.md#13-実装候補検証記録-2026-10-11)に53件/84画面の成功、Safari実機、性能比較、B・Cの保留理由を記録する。公開済みの工程0〜2とローカル実装Aを区別する。

## 方針改訂 2026-10-10

管理者の指示: ページ追加などのコンテンツ編集は行わない。title/description、構造化、高速化の具体案を検討する。

- ページ数は8のまま。ゲーム紹介ページの新設、ブログ/イラストの内容追加、画面内の紹介文・h1・ラベル・カード原稿変更は対象外。
- 既存の地図、色、画像の構図、キャラクター位置、カルーセル幅、動き、リンク先、ゲーム処理を維持する。Figmaのデザイン更新は伴わない。
- 初回のOGP対応はtitle/description/site_nameの整合のみ。新しい共有画像の制作は含めず、現行の画像URL・summaryカード形式を維持する。
- 検索管理と公開8ページの正規URLは維持する。新設ページ向けのsitemap9件目や、初期HTMLへの記事本文展開は行わない。
- この改訂は計画の更新と読み取り検証のみ。サイトソース、素材、本番設定は変更していない。

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
- サイトマップ送信は受付済み。初回のGoogle取得は「取得できませんでした／読み込めませんでした」、検出0件だった。本番XMLは通常UAとGooglebot名UAの双方で200、application/xml、URL表と一致を確認したが、UA名を使った取得は実Googleクロールの代用とはしていない。中断後の23時台JSTに再確認すると「成功しました」、最終読み込み2026/10/10、検出8ページ・動画0件へ変わっていた。再送信やDNS・セキュリティ設定の追加変更はしていない。初回失敗の原因は確定していない。
- TOPの初回URL検査は「クロール済み - インデックス未登録」だったが、登録リクエストが受理され、中断後の再確認では「URL は Google に登録されています／ページはインデックスに登録済みです」へ変わった。前回クロールは2026/10/10 19:48:13 JST、スマートフォンGooglebot、取得成功、クロール/インデックス許可あり。ユーザー指定canonicalは `https://erinui.com/`、Google選択は「検査対象のURL」で一致した。参照元サイトマップも本番XMLを確認。実際の検索語ごとの順位・表示回数は未測定であり、登録から順位を推測しない。
- 初回公開コミット `e43fe23` のWorkers BuildsとGitHub Pagesのbuild/deployが成功。Worker `1e26a7e2` を確認。本番8URLの最終200、canonical・OGP、公開画像、sitemap・robots、HTTP8パスの301、資料/更新スクリプト/テスト/Functions/試作/秘密の404、workers.devのnoindex、旧キャラクターページのアンカー付き移転案内、ゲーム起動・タイマー進行・canvas描画・JS例外なしを確認した。
- 本番ブラウザ向けHTML末尾には既存Cloudflare Web Analyticsビーコンが付加される。本文保護検証ではその既知の末尾スクリプトだけを除外し、8ページの本文ハッシュが変更前と一致することを確認。解析設定は変更していない。
- 中断中のクリーンチェックアウト検証は28/28件成功、Wrangler dry-runも成功。未公開だったプレビューのホストパターン修正 `b0f86d7` を再開後にmainへ反映し、Workers BuildsとGitHub Pagesの全checkが成功した。Worker `7935f48b` が100%でReady。本番8ページ・転送・公開ファイル範囲・ゲーム起動の再試験も成功した。
- 管理画面に表示された実バージョンURL `https://7935f48b-inutaro-game.erikanuinui.workers.dev/` は200かつ `X-Robots-Tag: noindex` を確認。通常workers.devも同様、本番8ページにはnoindexが付かない。プレビューの既存公開設定は変更していない。

### Search Console確認結果（2026-10-10 JST）

| URL | Googleインデックス検査 | 取得・正規URL情報 | 今回の操作 |
| --- | --- | --- | --- |
| `https://erinui.com/` | 登録済み（初回はクロール済み・未登録） | 取得成功、許可あり。指定/Google選択とも本番TOP | 初回リクエスト受付済み。登録済みを確認後は再送信なし |
| `https://erinui.com/pages/characters` | Googleに認識されていない | 登録済みデータのクロール/Google選択URLは該当なし | 公開URLテストを経て登録リクエスト受付、優先クロールキュー追加を確認 |
| `https://erinui.com/games/` | Googleに認識されていない | 登録済みデータのクロール/Google選択URLは該当なし | 公開URLテストを経て登録リクエスト受付、優先クロールキュー追加を確認 |
| `https://erinui.com/games/inutaro-mushi/` | 検出・インデックス未登録 | 本番サイトマップを参照。クロール/Google選択URLは該当なし | 公開URLテストを経て登録リクエスト受付、優先クロールキュー追加を確認 |

主要3下層ページの受付は、登録済みや検索掲載済みを意味しない。公開URLテストの受付結果と、登録済みデータの取得詳細は混同しない。外部プロフィールの編集は未実施。DNS確認値・認証情報は資料に記載しない。

### 次の確認・公開単位

1. 工程2残件: 管理者がX・YouTube・note・SUZURI等の公式サイトURLを確認。未確認の外部サービスへログインしたりプロフィールを書き換えたりしない。
2. 工程3: 下記のmetadata原稿とWebSite構造化データをTDDで整備する。ゲーム紹介ページの新設・画面内原稿追加・専用OGP画像制作は今回の対象外。
3. 工程4: 固定データと画面で画像・フォント軽量化を比較する。現行素材や書体を未検証のまま置換しない。
4. 工程5: 2026-10-17（7日後）、2026-11-07（28日後）、2026-12-05（56日後）に登録・正規URL・検索語・クリックを評価する。これは確認予定であり、自動実行や通知の設定ではない。

公開済みの単位は工程1・2の技術整備と、配信範囲の限定。今後はmetadata・WebSiteと読み込み制御、画像圧縮、フォント検証を小さい公開単位に分ける。専用OGP画像制作・ゲーム紹介新設は改訂方針により対象外。検索順位・登録完了を保証するものではない。

本番ドメイン `https://erinui.com/` を検索エンジンと利用者にとって一貫した公式URLにする。まずドメイン移行と検索登録の確認を整え、次にページの説明、最後に通信量を改善する。検索順位や登録日を保証する計画ではなく、技術的な受入条件と公開後の検索結果を分けて管理する。

## 1. 目的と対象範囲

初期目標は「エリカッテシティ」「えりぬい」「犬タロー」「犬タローの虫さんまって×2」の検索から、目的に合った公式ページを見つけられる状態にすること。「無料ゲーム」など広い一般語は、登録状況と検索需要を計測した後の改善対象とする。

対象は公開8ページのメタ情報、構造化データ、画像とフォント配信、既存データ取得の読み込み方式。公開済みのURL設定、ゲーム共有URL、サイトマップは維持する。ページ数は8のまま。

次の内容は変更しない。

- マップの配置、リンク画像の見た目、装飾の動き、YouTube看板の重なり。
- キャラクター名、ゲーム正式名称、既存の本文とデザインの確定原稿。
- ゲームの当たり判定、時間、操作、音声、スコア、保存・共有画像の生成ロジック。
- 外部サービスの作品名、取得件数、更新周期、APIキーや認証設定。
- 未確定の問い合わせ・ファンアート用途、収益化、ランキング、フォルダ再編。

画面に表示する紹介文の追加は行わない。SEOを理由にキーワードを隠したり、既存の名称やラベルを一括置換したりしない。HTML本文に認める変更は、見た目を維持する画像のloading/decodingや寸法・参照属性など、受入試験で限定した読み込み改善のみ。

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
| ゲーム本体 | canvas中心、h1なし。説明は閉じた案内パネル内 | 当初は紹介ページ新設を検討。改訂後は現行本文を維持しmetadataのみ整備 |
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

ゲーム紹介ページの新設は改訂方針により対象外。

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
| 3 メタ情報 | metadata、WebSite、OGP文言の整合 | 実装・原稿確認者 | 正規URL確定、下記metadata案の確認 | 本文不変・JSON-LD・metadata試験が成功 |
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

### 工程3 title/descriptionと構造化データ

| 仕様ID | 作業 | 方針 |
| --- | --- | --- |
| SEO-META-01 | title・descriptionの見直し | サイト／作者／キャラの関係を自然に説明。公開8HTMLのheadのみ |
| SEO-DATA-01 | TOPにWebSite JSON-LD | nameはエリカッテシティ、urlは本番TOP。余計な別名・法人情報は付けない |
| SEO-OGP-02 | OGP/Twitter文言の整合 | title/descriptionをmetadata案へ揃え、全ページのog:site_nameをエリカッテシティへ。画像・カード形式は維持 |

#### Metadata具体案（未実装）

| ページ | title案 | description案 |
| --- | --- | --- |
| TOP | エリカッテシティ \| えりぬい・犬タローの公式サイト | えりぬいの公式サイト「エリカッテシティ」。犬タローたちのキャラクター紹介、ブラウザゲーム、YouTube動画、noteのブログ、グッズ、LINEスタンプへの入口をまとめています。 |
| キャラクター | 犬タローたちのキャラクター紹介 \| エリカッテシティ | 犬タローのオリジンとぬいちゃん、えりか、さすけ、ぶくろちゃんを紹介。エリカッテシティの仲間たちの姿や性格をご覧いただけます。 |
| ゲーム一覧 | ぬいんてんどう ブラウザゲーム一覧 \| エリカッテシティ | えりぬいのブラウザゲーム一覧「ぬいんてんどう」。犬タローの虫さんまって×2をPC・スマートフォンで遊べます。公開中のゲームと準備中のタイトルをご紹介します。 |
| ゲーム本体 | 犬タローの虫さんまって×2 \| エリカッテシティ | 犬タローを操作し、40秒間で虫さんを捕まえる無料ブラウザゲーム。カラスの落とし物をよけながら遊びます。PC・スマートフォン対応、インストール不要。 |
| おしらせ・ブログ | おしらせ・ブログ \| エリカッテシティ | えりぬいの制作メモや更新情報を読むための案内ページです。ブログを更新しているnoteへのリンクを掲載しています。 |
| イラスト | イラスト \| エリカッテシティ | えりぬいのイラスト紹介ページ。現在は公開準備中です。公開まで、エリカッテシティのほかのページをお楽しみください。 |
| 利用規約 | 利用規約 \| エリカッテシティ | エリカッテシティの利用規約です。ゲームの利用、キャラクターや画像・音声などの素材の取り扱い、サービス変更についての基本ルールをご確認いただけます。 |
| プライバシー | プライバシーポリシー \| エリカッテシティ | エリカッテシティにおける情報の取り扱いについて。ユーザー登録や個人情報入力、ゲーム結果の保存・共有、外部サービス利用時の方針を掲載しています。 |

下4ページのtitleは現行維持。既存のh1・本文・画面内見出し・ゲーム内タイトルはこの文字列へ置き換えない。ゲーム本体のtitleにサイト名を加えるのはブラウザタブと検索メタ情報だけ。準備中ページに存在しない作品一覧や問い合わせ機能があるようには説明しない。プライバシー本文の妥当性見直しはこのmetadata改修とは別作業。

title・descriptionはページ固有の自然な説明にし、固定文字数へ無理に合わせない。Googleが本文や検索語に応じて別のタイトル/説明を生成することがあるため、指定文字列の採用や順位向上を受入条件にはしない。[Googleのtitle仕様](https://developers.google.com/search/docs/appearance/title-link)、[description仕様](https://developers.google.com/search/docs/appearance/snippet)

#### 構造化データの採用範囲

TOPのheadに、静的なJSON-LDを1件追加する。

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://erinui.com/#website",
  "name": "エリカッテシティ",
  "url": "https://erinui.com/",
  "inLanguage": "ja"
}
```

- headのHTML初期応答で読めるようにし、home.jsや外部JSONへ依存させない。canonical・og:site_name・h1と整合させる。
- えりぬいは作者名として使われているため、今回のWebSiteのalternateNameには安易に混在させない。実際のサイト別名が確定してから判断する。
- Person、Organization、Product、レビュー、価格、FAQ、BreadcrumbList、SearchActionは追加しない。企業・販売主体・画面にない機能を架空に構造化しない。
- 全ページに一般的なWebPageを追加するだけでは今回の目的への効果が明確でないため、初回採用はWebSiteに限定する。
- サイト名の希望を伝える設定であり、順位やリッチリザルトの保証ではない。WebSiteはリッチリザルトテストで「対象なし」となる場合があるため、それだけを失敗とはしない。JSON構文・schemaのプロパティ・公開head・URL検査を確認する。[Googleのサイト名仕様](https://developers.google.com/search/docs/appearance/site-names)

ブログ・イラスト本文、外部記事本文、ゲームHUD、カルーセル原稿の追加・変更は行わない。ゲーム本体にh1がないことを理由に、今回の制約に反して追加することもしない。

### 工程4 通信量の改善

#### ソース・配信・変換試作による具体化（未実装）

| 仕様ID | 課題・確認結果 | 採用する変更案 | 保護するもの |
| --- | --- | --- | --- |
| PERF-DATA-01 | 本番のhome.jsはAPIを先に試し、`/api/latest-youtube?maxResults=6` は実応答404。WorkerではAPIが稼働していない | 現行の本番erinui.comでも静的JSONを先に読み、成功時はAPIへアクセスしない。API有効環境を勝手に判定せず、従来の代替経路を整理・保持 | 取得内容・件数・4時間ごとの生成周期・APIキー・看板の10秒切替 |
| PERF-CACHE-01 | fetchStaticDataはno-store。本番JSONはETagとmax-age=0,must-revalidateを配信。同一ETagの条件付きGETが304になることを確認 | fetchのcacheをno-cacheへ変更し、毎回再検証しながら未変更時の本文再送を減らす | 新しいJSONが公開された時に取得できること。長時間固定キャッシュやService Workerは導入しない |
| PERF-IMG-01 | 初期HTMLとcreateLatestCardのimgにlazy指定なし。画面外の全カルーセル画像を先行取得する | 画面外カードの静的/動的imgにloading=lazy、decoding=async。ヘッダー・マップ・最初の看板サムネはeagerを維持 | PC3件表示、SPスクロール、画像枠の16:9、object-fit、全身表示、フォールバック |
| PERF-IMG-04 | YouTube看板の初期サムネはローカルJPEG、JSON反映後はi.ytimg.comの画像URLへ置換される。ニュースも複数データの到着ごとに再描画する | 初回は画面外フォールバック画像のlazyで不要取得を抑える。同じ画像URLの共有・再描画回数を計測し、重複取得が残る場合だけ追加対応 | 看板の即時表示、JSON未取得時の既存カード、ニュースの内容・順序。外部画像URLを無断で別内容へ差し替えない |
| PERF-IMG-02 | map_sns2.svgは2,516,778bytes、2048×2048透過PNGを埋め込む。ほかのmap SVGも同形式 | SVGのviewBox・path・mask・transform・filterを維持し、埋め込みPNGだけを同じ解像度のロスレスWebPへ変換する案を第一候補にする | 画像の構図・余白・座標・輪郭・Safari影、YouTube前後レイヤー |
| PERF-IMG-03 | PNGのキャラクター画像は最大621,820bytes。TOPでは150px枠にも同じ大画像を使う | まず同解像度のロスレス変換を比較。必要ならTOP用の小さい派生画像をpicture/srcsetで用意し、紹介ページは元解像度を維持 | 画像枠・中央配置・犬タローの上はみ出し。参照変更は既存枠の寸法不変を条件とする |
| PERF-FONT-01 | JP WOFF2は1,635,088bytes、font-display:block。ゲームは別の元版WOFF2（2,363,048bytes）を利用 | 同じTTF・全グリフのWOFF2再圧縮を先に比較。効果不足ならunicode-range分割と完全な動的文字カバーを検証 | 本番の字形・字幅・改行・ライセンス・元TTF。ゲームの使用書体も勝手に統一しない |

no-cacheはキャッシュを使わない指定ではなく、保存済み応答を利用する前にサーバーへ再検証する指定。no-storeは保存自体を避ける。今回のETag確認は実HTTPで200→304を確認しており、ブラウザでの304・更新時200・JSON反映は実装後に改めて試験する。[MDN fetch cache](https://developer.mozilla.org/en-US/docs/Web/API/Request/cache)

lazy対象は画面外画像。大画面や直接アンカー遷移でカードが初期表示に入る場合は実際のLCP候補を測り、必要な画像だけeagerへ戻す。全imgへの一括lazyや全画像へのpreload/high指定は行わない。画像枠は既存CSSで予約し、width/height属性を足す場合は固有寸法と現行CSSの競合を試験する。[ブラウザの画像遅延読込](https://web.dev/articles/browser-level-image-lazy-loading)

画像圧縮の試作はメモリ上のみで行い、素材を書き換えていない。削減量はローカルgzip比較であり、本番の実転送量ではない。

| 画像 | 現行SVGのgzip比較値 | 候補SVGのgzip比較値 | デコード画素の確認 |
| --- | ---: | ---: | --- |
| map_sns2.svg | 1,851,782bytes | 918,581bytes（約50%減） | alphaと可視RGBは完全一致。完全透明画素のRGBのみ差があるため、厳密RGBA一致とは扱わない |
| map_goods.svg | 483,875bytes | 171,157bytes（約65%減） | 全RGBA一致 |
| map_character.svg | 406,487bytes | 165,534bytes（約59%減） | 全RGBA一致 |

map_sns2の埋め込みPNG自体は1,868,558→903,242bytes（約52%減）。透明RGB差はブラウザ描画・filter後の差分確認まで保留し、見た目不変を断定しない。候補SVGのブラウザ比較、Safariでの透過影、PC/SP・高DPIの確認は未実施。圧縮案はこれらを通過してから採用する。SVGを丸ごと別の絵へ描き直したり、viewBoxの余白をtrimしたりしない。

font-displayは初回に一括swapへ変更しない。swapは文字を早く表示できる一方、代替書体からの切替で字幅・折返しが変わり得る。再圧縮と読込量削減後に、block/swapの不可視時間・CLS・折返しを比較する。optionalは本番書体へ切り替わらない場合があるため今回の候補から外す。[font-display仕様](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@font-face/font-display)

フォント分割を採用する場合は、現行の全体WOFF2 preloadをそのまま残して全ファイルを二重取得しない。初期表示に必要な文字群だけを優先し、残りはunicode-rangeで補完する。分割は文字の取りこぼしがないことを前提にする。元TTFは代替用であり、通常はWOFF2が成功すれば取得されないため、TTF削除を初期転送量の改善として数えない。

長期immutableはファイル名に内容ハッシュを持つ専用の生成資産に限る追加候補で、初回には導入しない。現在の固定名JSON・note-thumb-N・youtube-thumb-N・全assetsへ一括設定すると更新が見えなくなる恐れがある。現行ETagを利用した再検証を先に採用する。[_headersとfingerprinted assetの仕様](https://developers.cloudflare.com/workers/static-assets/headers/)

#### 実装順と公開単位

1. A: metadata8ページ、TOP WebSite、静的JSON優先、no-cache、画面外カードのlazy/async。まず低リスクのhead・読み込み制御をTDDで実装する。
2. B: map_sns2の埋め込み画像圧縮を1素材で検証・公開し、合格後にほかのmap/キャラクター素材へ広げる。切り戻し用の元素材を保持する。
3. C: フォント再圧縮を比較し、必要な場合だけ分割を追加する。新しい動的作品名・稀な漢字・記号・読み込み失敗を含めて確認する。
4. D: 実際の検索登録と検索語・クリックを既定日程で評価する。長期キャッシュやCSS/JSの細かな圧縮は残る計測上の課題がある場合だけ追加検討する。

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
| 公開8HTML | metadata、TOP JSON-LD、限定した画像読込属性 | canonicalは維持。画面内の確定原稿やアンカーを変更しない |
| `games/inutaro-mushi/game.js` | 前工程で共有URL修正済み。今回は変更しない | ゲームロジックと画像生成処理は保持 |
| `robots.txt` / `sitemap.xml` | 作成・公開済み。今回は8URLを維持 | 新設ページの追加や索引制御の変更は行わない |
| `home.js` / TOP HTML | カード画像の読込方針 | 外部取得・フォールバック・10秒切替を維持 |
| `home.css` / `assets/fonts/` | フォント配信の最適化候補 | 字形、カバレッジ、折返し、ライセンスを確認 |
| `assets/home-city/` / `assets/characters/` | 採用した画像の最適化 | 元素材を保持。未使用の旧素材の整理は別作業 |
| ゲーム紹介ページ・画面内原稿・新規OGP画像 | 今回は対象外 | ページ数8を維持。本文・デザイン編集は行わない |
| `tests/seo.test.mjs` / `tests/fixtures/seo.json` | SEO受入試験とURLの正本 | 工程1・2は作成・成功済み。工程3のJSON-LD等は追加実装時に試験を拡張 |
| `tests/helpers/site-server.mjs` | 既存8ページと検証対象資産の配信 | 新ページの許可は不要。秘密ファイルを許可しない |
| 公開設定 | HTTPS、旧公開対策、プレビュー索引対策 | ホスティング確定後に設定。`_headers`等は必要な場合だけ |
| `scripts/build-site.mjs` / `wrangler.jsonc` / `_headers` | Workersの公開出力とホスト別noindex | SEO-PUBLISH-01として追加。旧GitHub Pagesの配信方式と混同しない |
| 既存の仕様・設計資料 | metadata・構造化・高速化の適用状態 | 計画と実装完了を混同しない |

## 6. SDDとTDDの実装手順

工程0〜2は公開済みの履歴として以下に保持する。これから着手する工程3・4の具体手順と受入ケースは[SDD 7〜11章](seo-performance-sdd.md#7-tdd受入ケース)を使用する。公開設定・URL移行を再実装しない。

1. 工程0で配信条件を確定し、URL対応表・採用metadata・変更可能範囲を `tests/fixtures/seo.json` に定義する。
2. `tests/seo.test.mjs`でcanonical、OGP、共有URL、サイトマップ、JSON-LDを検査し、変更前の失敗を確認する。実装・ネットワーク・テスト起動の失敗を区別する。
3. 工程1・2を最小変更で実装し、ローカルで成功を確認する。公開HTTPの転送はローカルサーバーの成功で代用しない。
4. metadata具体案に対する工程3の受入試験を追加して実装する。headの変更と本文不変、JSON-LD、既存8ページの初期HTMLを確認する。新設ページ・本文追加は行わない。
5. 工程4は素材・読込方式ごとに比較し、小さい単位で変更する。一括で全素材・全フォントを変えない。
6. 現行28件の試験に承認差分を仕様ID付きで追加し、12幅×7主ページの表示回帰とゲーム操作を確認する。PC/SPの目視とSafariの透過影確認も行う。
7. 公開する場合はクリーンなコミット内容でも試験する。公開元・反映先・CloudflareとGitHub Pages双方の配信結果を区別して確認する。
8. 技術的な完了を記録してから検索管理ツールで登録状況を確認し、工程5へ進む。

既存の `site-design-baseline.json` は旧工程の保護記録として残す。SEOで意図的に変更するmetadata、画像読込属性、圧縮資産等だけを仕様ID付きの承認差分として扱い、失敗を消すために全ハッシュ・全リンクを実装後の値で上書きしない。本文原稿・リンク追加は許容差分に含めない。

今回のTDDで追加する条件は次のとおり。

- SEO-META-01/OGP-02: 8ページのtitle/descriptionとOGP/Twitter文言が上表と一致し、og:site_nameは共通、canonicalと画像URLは維持。
- SEO-DATA-01: TOPにWebSiteが1件、JSONとして解析可能、name/url/@idが一致。JS無効でも初期HTMLに存在し、余計な構造化データがない。
- 本文保護: metadata段階は既存bodyハッシュが完全一致。loading/decoding/固有寸法や承認済み参照属性の変更は仕様ID別に限定し、それらだけを除いたDOM・リンク・文言が元baselineと一致する。
- PERF-DATA-01: 静的JSONが正常ならAPIリクエスト0件。APIを利用する代替環境・静的JSON失敗・両方失敗時は従来のフォールバックを失わない。サムネ3枚/10秒、最大6件/AND MORE、取得周期を維持。
- PERF-CACHE-01: ブラウザ再訪時の未変更JSONは再検証でき、変更後は200で新しい内容を描画する。実装を見ただけで304成功とは扱わない。
- PERF-IMG-01: 初期と動的カードでlazy/async、主要初期画像は先行。LCP画像を遅延させない。横スクロール・2ページ目・直接アンカー・JSON失敗・画像失敗・JS無効も確認。
- PERF-IMG-02/03: 画素・透過・構造・表示矩形を比較。SVGの変更は埋め込み画像部分に限定し、背景/枠/文字/path/mask/transformを維持。旧画像のハッシュ保護を単に削除しない。
- PERF-FONT-01: 元TTFと字形・cmap・全グリフ・文字幅を保護。圧縮ファイルのハッシュ差だけで字形変更とみなさず、新規の字形/幅の比較試験も必須。
- 性能: 同じJSON・同じChrome・390×844px・6Mbps/1.5Mbps/150ms・CPU4倍・空キャッシュで最低3回の中央値。再訪は別測定。全リソース容量とスクロール前の初期容量を区別し、時間ごとの読込完了条件も固定する。

## 7. 受入試験

| 区分 | 確認する内容 | 合格基準 |
| --- | --- | --- |
| 正規URL | 既存8ページ | canonicalは1個、対応する本番最終URL。クエリ付きでも不変 |
| metadata | title、description、og:url、画像、ゲーム共有 | 採用原稿・本番URLと一致。旧ホストが残るのは履歴・移転案内のみ |
| HTTP | HTTP/HTTPS、旧公開、`.html`別名 | HTTPSへ恒久転送。最終200、ループなし、パス保持。旧公開は採用した移行案の条件を満たす |
| 404 | 存在しない任意のURL | 404。TOPを200で返すsoft 404を作らない |
| 索引制御 | HTML、HTTPヘッダー、robots | 本番を禁止しない。プレビューのnoindexは本番へ漏れない |
| XML | sitemapの構文とloc | XMLパーサーで成功、重複なし、正規URLのみ、200取得可能 |
| JSON-LD | TOPのWebSite | JSON構文、name/url、実表示との整合。構文・URL検査を実施 |
| 初期HTML | JSを無効化した既存8ページ | 現在の本文と通常のaリンクが残り、metadataとTOP JSON-LDを読める |
| 表示 | 320〜1440pxの既存12幅とゲーム本体 | 横はみ出し・画像欠落・文字切れなし。既存地図矩形は0.5px以内 |
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
| 56日後 | 旧新URLの推移、検索語、端末別性能 | metadata・読み込み制御の再調整を判断。本文追加は対象外 |

観察する検索語は「エリカッテシティ」「えりぬい」「erinui」「犬タロー」「犬タローの虫さんまって×2」。表記ゆれや「虫取り ブラウザゲーム」等は、実際に表示されたクエリを見て追加する。

開始時点が0表示の場合に改善率だけを使わない。新ドメインの表示回数・クリック数、主要URLの登録状態、旧URLの残り方をまず記録する。検索ボリュームや競合難易度は未測定であり、指名語での上位表示や一般語での流入を保証しない。

## 10. 先に確認する事項

| 項目 | 採用する基本方針 | 実行前に必要な確認 |
| --- | --- | --- |
| 本番ホスト | HTTPS・wwwなしのerinui.com | Cloudflareのプロジェクト・公開設定 |
| 旧GitHub Pages | 新canonicalと移転案内、旧公開維持 | HTTP恒久転送が安全に可能か、他ページへの影響 |
| 検索管理 | 新ドメインの所有権と主要URL検査 | 管理者のSearch Console登録状況 |
| metadata | 上表の8ページ案とOGP文言の整合 | 現行本文の事実と一致。画面内原稿は変更しない |
| 構造化 | TOPのWebSiteのみ | サイト名・本番URL・初期HTMLの整合 |
| 共有画像 | 現行のアイコンURL・summary形式を維持 | 新規制作は今回の対象外 |
| 軽量化 | 同じ画質・書体・配置の維持 | 素材ごとの比較と容量目標の評価 |

工程0・1・2の技術整備は公開済み。Aは2026-10-11にローカルで実装・検証を完了し、公開指示を待つ。B・Cは未採用で、画像・フォントは変更しない。外部プロフィール確認と公開後の検索評価は管理作業として残す。検索順位・検索結果の文言採用を保証しない。

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
