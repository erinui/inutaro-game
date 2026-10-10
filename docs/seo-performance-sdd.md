# SEOと読み込み改善 SDD実施仕様

作成日: 2026-10-10 / 最終更新: 2026-10-11 / 状態: Aを本番公開・検証済み。B・Cは候補比較後に保留。公開結果は14章。

対象は既存8ページのmetadata、TOPのWebSite構造化データ、読み込み制御、条件付きの資産軽量化。ページ追加・画面内原稿・デザイン編集は行わない。12章は準備、13章は初回ローカル実装、14章は公開指示後の確認として保持する。

## 1. 正本と開始条件

- 目的、調査記録、metadata原稿の正本: [SEO改善計画](seo-improvement-plan.md)。8ページの採用文字列は同資料の「Metadata具体案」に一本化する。
- 実装順・例外処理・受入条件の正本: 本資料。原稿を複製せず、実装開始時に正本からテストfixtureへ転記して照合する。
- 公開URLとbodyの保持記録: `tests/fixtures/seo.json`。文言・リンク・旧素材の保持記録: `tests/fixtures/site-design-baseline.json`。
- 前工程のSDD/TDD記録: [名称・文言改修](site-design-implementation.md)。過去の採用値を今回の値で書き換えない。
- 開始基準コミット: `6a0ee12`。開始時にHEAD・作業差分・動的JSONのハッシュを再記録する。自動更新データの変更と今回の実装差分を区別する。
- 本番は `https://erinui.com/`、Cloudflare Workersの静的アセット配信。APIサーバーは稼働していない。既存の認証・DNS・検索管理・GitHub設定を再構成しない。

| ソース | ローカル確認パス | 本番正規パス |
| --- | --- | --- |
| `index.html` | `/` | `/` |
| `games/index.html` | `/games/` | `/games/` |
| `games/inutaro-mushi/index.html` | `/games/inutaro-mushi/` | `/games/inutaro-mushi/` |
| `pages/characters.html` | `/pages/characters.html` | `/pages/characters` |
| `pages/blog.html` | `/pages/blog.html` | `/pages/blog` |
| `pages/illustrations.html` | `/pages/illustrations.html` | `/pages/illustrations` |
| `pages/terms.html` | `/pages/terms.html` | `/pages/terms` |
| `pages/privacy.html` | `/pages/privacy.html` | `/pages/privacy` |

ローカルサーバーは拡張子なし転送を実装していない。本番URLの転送・ヘッダーは公開HTTPで別途確認する。

## 2. 公開単位と変更境界

| 単位 | 仕様ID | 内容 | 開始・公開条件 |
| --- | --- | --- | --- |
| A1 | SEO-META-01 / SEO-OGP-02 / SEO-DATA-01 | 8ページのheadとTOP WebSite | 仕様と原稿をテスト化してRedを確認 |
| A2 | PERF-DATA-01 / PERF-CACHE-01 / PERF-IMG-01 | 静的JSON優先、再検証キャッシュ、画面外カードのlazy/async | A1のGreenを維持。取得失敗・操作・表示回帰を通過 |
| B | PERF-IMG-02 / PERF-IMG-03 | 同解像度のロスレス画像変換。X画像1素材から開始 | 圧縮量・ブラウザ描画・透過影が合格した素材だけ採用 |
| C | PERF-FONT-01 | 同じTTFからのWOFF2再圧縮。必要時だけ分割 | 字形・文字カバー・字幅・改行・ライセンス保護が合格 |
| 計測のみ | PERF-IMG-04 | 仮画像置換・ニュース再描画の重複取得調査 | A後に実通信を確認。追加実装は原因と限定差分を仕様へ追記してから |

A1とA2はテスト・差分を分けて進め、初回公開は両方合格したAを単位とする。B・Cの効果が不十分でもAの完了を妨げない。B・Cを未検証のままAへ混ぜない。

保持するもの: 8ページ構成、h1・本文・ラベル・ゲーム名、全リンク・アンカー、マップの配置・透過・影・動き、看板の前後レイヤー、カード寸法・並び順・枚数、画像構図、フォントの字形、ゲームロジックと共有処理。

対象外: 新設ページ、記事本文の初期HTML展開、問い合わせ・ファンアート機能、OGP画像制作、API新設、取得周期変更、DNS・Search Console設定変更、Service Worker、全assetsの長期キャッシュ、未使用素材の削除、Figma改修。

## 3. Metadataと構造化データ

### 3.1 Metadata

8ページすべてで以下を満たす。本文へ同じ文字列を置換する処理は作らない。

| 要素 | 採用値・制約 |
| --- | --- |
| `title` / `meta[name=description]` | SEO改善計画のページ別原稿と完全一致。各1件 |
| `og:title` / `twitter:title` | 当該ページのtitleと一致。各1件 |
| `og:description` / `twitter:description` | 当該ページのdescriptionと一致。各1件 |
| `og:site_name` | 全8ページで `エリカッテシティ`。各1件 |
| canonical / `og:url` | `tests/fixtures/seo.json` の本番URLを維持。クエリ・アンカーを含めない |
| `og:image` / `twitter:image` | 現行の本番 `assets/icon-192.png` URLとバージョンを維持 |
| `twitter:card` | 現行の `summary` を維持 |

下4ページのtitleは現行維持。ゲーム本体はブラウザタブのtitleだけにサイト名を加え、画面内ゲーム名・HUDは保持する。検索結果の文字列採用や順位はGoogleの判断であり、実装の合否にはしない。[title仕様](https://developers.google.com/search/docs/appearance/title-link)、[description仕様](https://developers.google.com/search/docs/appearance/snippet)

### 3.2 WebSite

TOPのheadに静的 `script[type="application/ld+json"]` を1件置く。採用オブジェクトはSEO改善計画の「構造化データの採用範囲」に記載した6プロパティと完全一致する。JavaScript無効でも取得できること。

`@id=https://erinui.com/#website`、`name=エリカッテシティ`、`url=https://erinui.com/`。下層7ページには追加しない。alternateName、Person、Organization、Product、FAQ、SearchAction等は追加しない。サイト名はリッチリザルトテストの対象外のため、「対象なし」を実装失敗と扱わず、JSON解析・Schema Markup Validator・URL検査で確認する。[Googleのサイト名仕様](https://developers.google.com/search/docs/appearance/site-names)

## 4. 取得と画像読み込み

### 4.1 YouTube取得順

`home.js` の取得関数だけを限定変更する。APIキー、環境変数、サーバー機能は追加しない。

| 環境 | 第1候補 | 第2候補 | 正常時のAPI通信 |
| --- | --- | --- | --- |
| `erinui.com` | 相対URLの静的JSON | 既存API | 0件 |
| `localhost` / `127.0.0.1` / `*.github.io` | 相対URLの静的JSON | 既存API | 0件 |
| その他のHTTP(S)ホスト | 既存API | 相対URLの静的JSON | 従来どおり第1候補 |
| `file:` | 現行フォールバックを保持 | 読み取りが拒否されても画面を壊さない | ローカルサーバーで通信試験を行う |

静的URLは `assets/home-city/youtube-latest.json`、APIは `/api/latest-youtube?maxResults=6` のまま。未確認ホストに新しい稼働判定・API有効フラグを導入しない。workers.devは今回の静的優先ホスト追加の対象外で、従来の代替経路を保持する。

各候補は1回だけ試す。HTTPエラー、ネットワーク例外、JSON解析失敗、`ok !== true`、`videos` が配列でない応答は候補失敗として次へ進む。正常な空配列は有効な応答とし、既存描画処理の空配列時の挙動を保持する。両候補失敗時は初期HTMLの看板・カードを保持し、未捕捉例外を出さない。リトライ・タイムアウト・ポーリングは新設しない。データの内容や表示規則の再設計はしない。

最大6件取得、5件まで作品表示・6件目AND MORE、看板3サムネと統計の10秒切替、4時間ごとの生成周期、ニュース集約順序を維持する。各候補の失敗捕捉は取得境界で行い、描画コード全体を新規の共通抽象へ置換しない。

### 4.2 静的JSONの再検証

`fetchStaticData` の `cache` は `no-store` から `no-cache` へ変更する。対象はYouTube・note・SUZURI・LINEの既存4JSON。URL、Acceptヘッダー、データ形、生成スクリプトは保持する。

未変更時は保存済み応答を再検証し、変更時は新しい本文を取得する。ブラウザHTTPキャッシュにETagの扱いを任せ、localStorage保存・手動If-None-Match・304のJSON解析分岐は追加しない。ネットワーク上の304と、キャッシュ本文を伴うFetch APIの成功応答を区別して試験する。[MDN cache仕様](https://developer.mozilla.org/en-US/docs/Web/API/Request/cache)

既存 `tests/helpers/site-server.mjs` はETag・304を返さないため、現在のサーバーだけで再検証の成功を証明できない。実装時に専用のテストサーバー `tests/helpers/json-cache-server.mjs` を追加する。実HTTPサーバーから200・ETag・Cache-Controlと条件付き304を返し、要求ヘッダーと本文バイト数を記録する。ブラウザのHTTPキャッシュを使う試験ではPlaywrightのroute interceptionを使わない。変更後のETagと200も確認する。

### 4.3 画像

| 対象 | 読み込み方針 |
| --- | --- |
| TOPの `.character-card img` / `.content-carousel-card img` | 初期HTMLにlazy/async。既存カード画像を対象にし、装飾・マップへ広げない |
| `createLatestCard` が生成するimg | `loading="lazy"` と `decoding="async"` をsrc設定前に指定 |
| ヘッダー、マップ、看板サムネ | eager相当の現行読み込みを保持。全画像へのpreload/high指定はしない |
| 下層ページ画像 | Aでは変更しない。Bの対象素材を共有している場合だけ描画回帰の対象 |
| 画像のないAND MORE等 | 既存プレースホルダーを維持。imgへ作り直さない |

CSSの画像枠・aspect-ratio・object-fitは保持する。Aではwidth/height属性の追加、picture導入、画像URLの置換を行わない。直接アンカーや大画面でlazy対象がLCP候補となる場合は読み込み時間を比較し、悪化した対象だけeager例外としてSDDとテストへ記録する。ブラウザのlazyは取得距離に裁量があるため、「画面外画像へのリクエストが必ず0件」は合格条件にしない。[画像lazyの仕様](https://web.dev/articles/browser-level-image-lazy-loading)

## 5. 条件付き資産改善

### 5.1 画像 B

最初は `assets/home-city/map_sns2.svg` の埋め込みPNGだけを同解像度のロスレスWebPへ変換して比較する。SVGはXMLパーサーで扱い、viewBox・寸法・path・mask・transform・filter・画像配置属性を保持する。丸ごとラスタライズ、余白trim、色・位置の変更はしない。

試作のgzip比較では約50%減。可視RGBとalphaは一致したが、完全透明画素のRGBには差がある。採用条件はalpha完全一致、可視RGB完全一致、透明RGB差の内訳記録、同じブラウザの通常・ホバー・透過影の画素比較で可視差がないこと。ChromeだけでなくSafari実機を含める。WebKit自動試験をSafari実機の完了として記録しない。

合格後に他のマップ、`assets/characters/` を素材単位で検討する。元画像はGit履歴と比較用の非公開出力で保持し、公開assetsに原本コピーを増やさない。新規派生資産を採用する場合は追跡対象へ追加し、公開ビルドの出力・MIMEも検査する。小解像度派生・srcset・pictureは別の採用差分として設計し、同解像度変換と同時には行わない。

### 5.2 フォント C

JPの元TTFを保持し、全グリフのWOFF2再圧縮から比較する。ゲームの別書体は変更しない。TTFのSHA、cmap、グリフ数・アウトライン・advance幅、フォント名、OFLを比較する。単純なWOFF2ハッシュ一致を字形の合否としない。

効果が不足した場合だけunicode-range分割を検討する。静的原稿だけの部分集合にはせず、元cmapの文字を網羅し、動的作品名・稀な漢字・数字・記号で欠落がないことを検査する。分割時は全体WOFF2 preloadとの二重読み込みを避ける。block/swap変更は別比較とし、字幅・改行・CLSを守れなければ現行blockを維持する。optionalと別フォントへの置換は採用しない。

B・Cの採用条件は比較対象の圧縮容量減少と表示・操作保護の両立。効果なし、描画差、文字欠落、Safari未確認なら該当案は保留し、Aへ戻す。7MB/5MBの容量目標は全体の改善目標であり、未達を理由に画質や書体を変えない。

## 6. 実装ファイルとテスト保護

| ファイル | Aで許可する変更 | B・Cでの追加候補 |
| --- | --- | --- |
| 公開8HTML | 指定head要素。TOPだけJSON-LDと指定imgのloading/decoding | 採用した画像参照・フォントpreloadのみ |
| `home.js` | 取得候補の順序・失敗捕捉、cache、生成imgの読込属性 | 重複取得を確認した場合に別途限定 |
| `home.css` / `assets/fonts/` | 変更なし | Cの配信定義・採用WOFF2 |
| `assets/home-city/` / `assets/characters/` | 変更なし | Bで合格した資産だけ |
| `tests/seo.test.mjs` / `tests/fixtures/seo.json` | metadataとJSON-LDの追加条件。URL・旧bodyハッシュは保持 | 採用仕様の明示 |
| `tests/site-design.test.mjs` | title/OGPを新SEO fixtureから参照。本文・リンク保護は維持 | 採用資産の限定差分検査 |
| `tests/fixtures/seo-performance-changes.json`（新規予定） | 仕様ID・ファイル・selector/属性・変更前後値・適用回数を記録 | 採用資産の変更前後SHAと画素/字形試験を追加 |
| `tests/home-loading.test.mjs` / `tests/helpers/json-cache-server.mjs`（新規予定） | 読み込み・再検証・例外処理の受入試験 | 必要な追加条件だけ |
| 仕様・計画資料 | Red/Green結果と実際の採用状態を追記 | 比較結果・保留理由を追記 |

`site-nav.js`、`site-migration.js`、ゲームJS/CSS、robots、sitemap、配信設定、生成スクリプト、GitHub Actions、JSON本文は今回の変更対象から除外する。AのJS参照バージョンを更新する場合はTOPのhome.jsのクエリだけを変更manifestに追加する。変更していないCSS・画像のバージョンを一括更新しない。

### 保持試験の更新方法

1. A1では8ページのbodyハッシュを完全一致のまま検査する。既存デザインfixtureのh1・copy・リンクは変えず、title/OGPの期待値だけ新SEO原稿のfixtureへ寄せる。
2. A2では変更manifestで指定したTOP imgのloading/decodingだけを変更前へ復元してbodyハッシュを照合する。対象selector・一致件数・旧値・新値を検査し、全img属性やbody全体を除外しない。下層7ページは完全一致を維持する。
3. `home.js` の旧ハッシュ保護は削除しない。仕様ID別の明示した変更前後コード片を、各適用回数も確認して逆変換した結果を旧ハッシュと照合する。関数全体を空にする正規化や実装後の全baseline再採取は禁止。別途、取得・操作の振る舞い試験を行う。
4. ゲームHTMLの旧head保護には、今回許可したtitle/description/OGPだけの逆変換を追加する。head全体やゲームコードは除外しない。
5. B・Cは採用資産だけ変更前後SHAと構造・画素・字形の試験を追加し、無関係な素材は旧ハッシュで保護する。自動更新JSONの変更は今回の承認差分へ混ぜない。

## 7. TDD受入ケース

新テストは実装前に追加し、該当仕様がないことによるRedを記録してから最小実装へ進む。起動不良・依存不足・外部サイト停止はRedの証拠にしない。外部データは保存した固定fixtureで再現し、ライブ更新をテスト期待値にしない。

| ケース | 仕様ID | 入力・確認 | 合格条件 |
| --- | --- | --- | --- |
| M01 | SEO-META-01 / SEO-OGP-02 | 8ページ、JS無効、クエリ・アンカー付きURL | title/description/OGP完全一致・各1件、canonical・画像・本文保持 |
| M02 | SEO-DATA-01 | TOPと下層7HTMLをJSON解析 | TOPだけWebSite1件、6プロパティ一致、初期headに存在 |
| D01 | PERF-DATA-01 | 本番ホスト相当、静的JSON正常 | 静的1回、API0回、看板・カード・ニュースへ反映 |
| D02 | PERF-DATA-01 | 静的404/ネットワーク例外/不正JSON/無効データ、API正常 | 各失敗でAPIを1回試し有効データへ切替、例外なし |
| D03 | PERF-DATA-01 | その他ホスト、API失敗、静的正常 | API→静的の順に各1回。API正常時は静的0回 |
| D04 | PERF-DATA-01 | 両候補失敗、JS無効、file表示 | 初期表示・リンク保持、未捕捉例外なし。空配列時もクラッシュなし |
| C01 | PERF-CACHE-01 | ブラウザ同一contextで200→再訪→JSON更新 | 条件付き再検証の304と本文省略、更新ETagの200・新内容描画を記録 |
| C02 | PERF-CACHE-01 | YouTube/note/SUZURI/LINEの4JSON | no-cache・既存URL/Accept保持。失敗時に各既存フォールバック保持 |
| I01 | PERF-IMG-01 | 初期・動的img、AND MORE、画像なし | 指定カードlazy/async、マップ/ヘッダーは非lazy、寸法保持 |
| I02 | PERF-IMG-01 | 横スクロール、次ページ、各セクション直接アンカー | 完全画像が表示される、3枠/見切れ/ボタン位置保持、LCP遅延なし |
| I03 | PERF-IMG-01 | 画像404・JSON失敗・JS無効・低速回線 | 枠が潰れず操作可能。失敗画像を新イラストへ置換しない |
| R01 | 共通保持 | 12幅×7主ページ、PC/SP、ゲーム本体 | 原稿/リンク/地図矩形/はみ出し/影/カルーセル/メニュー/共有/ゲーム操作保持 |
| R02 | 共通保持 | 看板10秒周期、bird、sasuke、bukuro | 切替枚数・周期、移動・反転・クリック演出保持 |
| B01 | PERF-IMG-02/03 | 元画像と候補、通常/hover、PC/SP・DPR1/2 | 構造・alpha・可視画素・矩形・Safari影に差なし、容量減 |
| F01 | PERF-FONT-01 | 元TTF・候補、静的/動的文言、低速/失敗 | 全文字・字形・字幅・改行・ライセンス保持、二重preloadなし |

API順序・JSON失敗の試験は通信差し替えで再現できるが、C01のキャッシュ試験には使わない。実装後の試験件数を記録し、既存28件に追加する件数を準備段階で成功扱いしない。

## 8. 性能と目視の計測条件

- 比較ごとにコミット、JSON/画像のハッシュ、ブラウザ版、viewport、DPR、回線、CPU、キャッシュ状態を保存する。改修前後は同じデータ・同じ環境で最低3回、中央値を使う。
- モバイル基準は390×844、DPR1、下り6Mbps・上り1.5Mbps・遅延150ms・CPU4倍。PCは1440×900、DPR1の同条件で比較し、高DPI表示はDPR2で別途目視する。
- 初期読み込みは `/?youtubePanel=0`、スクロールなし、navigation開始から30秒の固定窓で計測する。30秒で完了しない通信は未完了として報告し、完了した本文サイズだけで改善を断定しない。
- 全閲覧は初期測定後に全セクション・カルーセル2ページ目へ順に移動し、画像の完了を確認して別集計する。初期削減と全閲覧総量の削減を混同しない。
- encodedBodySizeの集計は観測範囲を明示する。外部画像でTiming情報が得られない場合は、ブラウザ通信記録で補うか不明と記載し、0バイトとして合計しない。
- 空キャッシュと再訪を分離する。通信量だけでなくLCP・CLS、低速時の文字・画像表示、メニュー・カルーセル操作を比較する。単発load時間をINPや実ユーザーCWVの証明にしない。
- 同一環境の中央値で初期通信量が減り、LCPが基準より `max(100ms, 5%)` を超えて悪化せず、CLSが基準より0.01を超えて悪化せず0.1以下であることをAの計測上の目安とする。外れた場合は画像eager例外や原因を再検討し、単に許容値を緩めない。
- 画素比較は同じフォント読込完了・固定JSON・固定看板パネル・同じscroll位置で行う。マップ装飾アニメーションの時刻を固定した比較と、通常の動作試験を別に行う。自動差分で文字の輪郭・影・配置を隠す広範囲マスクを使わない。
- 12幅は既存fixtureの320/375/390/430/620/621/760/761/900/901/1024/1440。地図矩形は既存許容差を維持。カルーセル2ページ目、左右ボタン、SP見切れ、キャラクター全身と犬タローの頭はみ出しを目視する。

実ユーザーの指標・検索順位は今回のラボ測定と別記録にする。画像/フォント比較にSafari実機がない場合は該当項目を未検証としてB・Cの公開を止める。

## 9. 実装手順と実行方法

1. HEAD・dirty差分を確認し、ユーザーの未追跡素材は変更しない。固定データと変更前画面・通信を保存する。
2. 原稿をSEO fixtureへ転記。M01/M02を追加し、A1のRedを記録する。保護試験の限定差分も同時に設計する。
3. 8HTMLのheadだけを変更しA1をGreenにする。本文ハッシュ・canonical・リンク保持を確認する。
4. D/C/Iのテストと専用キャッシュサーバーを追加。A2のRed後、取得・cache・img属性だけを実装してGreenにする。
5. 既存回帰、12幅、ゲーム、PC/SP目視、Safari確認、性能比較を行う。Aの結果と保留を記録する。
6. B、Cはそれぞれ実験→受入テスト→限定実装→再比較。採用した項目だけ実装済みへ更新する。
7. 公開の指示を受けてからコミット対象を確認し、クリーンなコミットのビルド・テストを再実行する。GitHubへ送る前に自動更新データとの差分を確認する。

既存の起動コマンドは次のとおり。外部ランタイムの依存ディレクトリとChromeのパスを環境に合わせて指定する。ブラウザ起動に権限が必要な場合は許可された実行環境で試験し、起動できなかった試験を成功としない。

```bash
node --test --test-timeout=60000 tests/seo.test.mjs tests/site-design.test.mjs tests/site-build.test.mjs tests/home-loading.test.mjs
node scripts/check-site-design-layout.mjs
node scripts/preview-site.mjs
```

このMacの既存環境例:

```bash
env NODE_PATH=/Users/ishiharajunpei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules CHROME_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node --test --test-timeout=60000 tests/seo.test.mjs tests/site-design.test.mjs tests/site-build.test.mjs tests/home-loading.test.mjs
```

`tests/home-loading.test.mjs` と実HTTPキャッシュ用サーバーを新設済み。`LAYOUT_TEST_OUTPUT` を指定するとレイアウト結果・スクリーンショットを保存する。準備段階の結果は12章、今回の新仕様の結果は13章に区別する。

追加の検証スクリプトは以下の環境変数で新しい証跡ディレクトリを指定する。検証用サーバー・候補は公開ビルドへ入らない。

| スクリプト | 用途・環境変数 |
| --- | --- |
| `scripts/check-seo-performance.mjs` | `SEO_PERFORMANCE_OUTPUT`。公開ファイルのスナップショット、3回ずつの初期性能、ハッシュ、PC/SP画像。`SEO_PERFORMANCE_URL` を省略するとローカル、指定すると当該URLを測定し結果にもURLを記録 |
| `scripts/check-seo-runtime.mjs` | `SEO_RUNTIME_OUTPUT`。同一オリジンの通信重複、API要求、ゲーム開始・ジャンプ入力・canvasの画素確認 |
| `scripts/check-seo-assets.mjs` | `SEO_ASSET_OUTPUT`。Xの変換・XML/画素比較・Chrome通常/hover。`SEO_KEEP_CANDIDATE_SERVER=1` は比較用サーバーを終了まで保持 |
| `scripts/check-seo-font.py` | 元TTF、候補WOFF2、報告JSONを引数に指定。fontToolsとBrotliが必要。ソースTTFは編集しない |
| `scripts/check-seo-font-layout.mjs` | `SEO_CANDIDATE_URL` / `SEO_FONT_LAYOUT_OUTPUT`。同じ原本の再撮影を対照に含む、TOP・キャラ・ゲーム一覧の字幅/改行/画素比較 |
| `scripts/check-seo-safari.mjs` | `SEO_CANDIDATE_URL` / `SEO_SAFARI_OUTPUT` / `SAFARI_DRIVER_URL`。Safari実機で画像と見出しの比較 |
| `scripts/check-seo-safari-interactions.mjs` | 同上。Safari実機でAのPC/SPとゲームを確認 |

フォント候補を比較用サーバーへ渡す場合は `SEO_FONT_CANDIDATE` に候補ファイルを指定する。画像用 `SEO_IMAGE_CANDIDATE_WEBP` は事前に生成したWebPを指定でき、省略時はSharpで候補を生成する。画像比較も同一原本の再撮影を対照に含める。候補URLの `candidate=original/image/font` は静的画面の比較のためページJSを無効化し、`candidate=interaction` は実際のJSを動かす。WebDriverが実行する検査用JSとは区別する。Safari設定の一時変更は利用者の許可・本人の認証後に限り、セッション削除と検証終了後のOFF復元まで行う。

ビルドの既存CLI `node scripts/build-site.mjs` はdistが存在すると拒否する。既存distを削除せず、検証用にはexport済みのbuildSiteへ新しい出力パスを渡せる。

```bash
node --input-type=module -e 'import { buildSite } from "./scripts/build-site.mjs"; const output = `/tmp/erinui-seo-build-${Date.now()}`; const files = await buildSite(output); console.log(output, files.length);'
```

この出力は公開ビルドのファイル範囲の確認用。転送・本番ヘッダーの確認には代用しない。新規資産はGit追跡対象に入らないとビルドへ含まれないため、採用時に漏れを検査する。認証・トークン・DNS確認値は資料やfixtureに保存しない。

## 10. 公開と切り戻し

A/B/Cを別のレビュー可能な変更単位で保持する。公開は別途の明示指示後に行い、GitHubのメインログインを変更しない。

公開合格条件は、Workers Buildsと旧GitHub Pagesの成功、本番8URLの200・metadata・JSON-LD・noindexなし、HTTP転送、プレビューホストのnoindex、robots/sitemap8件、非公開ファイル404、最新JSON・画像描画・ゲーム操作の確認。既存旧ホストの移転案内も維持する。Schema Markup ValidatorやSearch Consoleの結果は検査日時と対象URLを記録する。

失敗時は今回の該当変更単位のみrevert候補とし、他の作業・最新データ・既存SEO設定を巻き戻さない。公開済みコミットのrevertと再公開、またはCloudflareの直前正常版への復帰を選び、ソースとの整合を確認する。`git reset --hard` やユーザー素材の削除は使わない。

## 11. 実装開始チェックリスト

- [x] 既存8ページと変更しない範囲を確定。
- [x] 原稿の正本、TOP JSON-LD、取得順・失敗時・cache・img対象を明文化。
- [x] 既存fixtureの衝突、ETag試験サーバー不足を特定し、更新方法を定義。
- [x] TDDケース、目視・性能条件、公開・切り戻し単位を定義。
- [x] 資料のリンク・対象ページ・構造化データを照合し、既存28件の基準試験を再実行。
- [x] 実装開始時の基準画面・固定データ・通信を採取。
- [x] 新受入テストを作成し、仕様不足によるRedを記録。
- [x] A実装・Green・回帰・性能比較を完了。
- [x] B・Cの採用可否を比較結果で決定（今回は保留、元資産を保持）。
- [x] 公開指示後のビルド・GitHub反映・本番確認を完了。

Aは本番公開・検証済み。B・Cの候補は本番ソースへ採用しない。

## 12. 準備段階の検証記録

2026-10-10、HEAD `6a0ee12` とローカル資料差分に対して確認した。

| 確認 | 結果 | 意味する範囲 |
| --- | --- | --- |
| 資料3件のローカルリンク | 13参照のファイル存在を確認 | SDD・計画・総合仕様の参照先。Webサービスへの接続成功ではない |
| 公開対象とmetadata原稿 | 8ソース存在、8原稿、URL fixtureとの対応を確認 | ページ漏れ・新設ページなし |
| WebSite採用オブジェクト | JSON解析成功、6プロパティ、name/url一致 | 計画の構文確認。サイトへの組込・Google採用は未実施 |
| 仕様ID | 10IDのSDD記載を確認 | 実装/条件付き採用/計測だけを区別 |
| 既存回帰 | SEO13件・表示等13件・公開ビルド2件、合計28/28成功 | 改修前コードの基準。Aの新受入ケースの成功ではない |
| 差分 | サイトコード・素材・設定・既存fixtureを変更せず、資料のみ更新 | 実装・新規試験作成・コミット・公開は未実施 |

12幅の全画面回帰、Safari実機、画像圧縮候補、フォント候補、性能比較は今回の資料準備では再実行していない。実装時の採取・確認を残し、過去の成功を今回の候補への合格として流用しない。

## 13. 実装・候補検証記録 2026-10-11

基準HEADは `6a0ee12` のまま。作業は10月10日に開始し、翌11日に検証を完了した。原本・比較用出力はCodexのローカル証跡 `seo-implementation-20261010/` 内に保存した。サイトコード変更は公開8HTMLと `home.js` の9ファイル。CSS・全画像・全フォント・動的JSON・ゲームJS/CSS・公開設定の77ファイルは、公開ビルド86ファイルの変更前後SHA比較で一致した。未追跡の利用者素材は変更しない。

### 13.1 AのTDD・保持確認

| 段階 | 結果 |
| --- | --- |
| A1 Red | 既存SEO13件成功、metadata8件とWebSite1件の9件が未実装のため失敗 |
| A1 Green | SEO・表示保持・ビルド37/37件成功。bodyと旧URL保護を維持 |
| A2 Red | 読込用14件のうち11件が未実装のため失敗。既存挙動の3件成功。追加の実通信・障害ケースも実装後に検証 |
| 最終Green | SEO22件・表示保持13件・ビルド2件・読込16件、合計53/53件成功 |
| キャッシュ | 4JSONそれぞれ実ブラウザで初回200、条件付き再訪304、更新後200と新本文の反映を確認。routeによる通信差し替えなし |
| レイアウト | 12幅×7主ページ=84ケース成功。地図矩形、3枠/SP見切れ、矢印、JP書体、メニュー、原稿・リンクを保持 |
| その他回帰 | フォント失敗7画面、カルーセル終端/戻り、sasuke/bukuro、看板の10秒切替[1,2,3,0]を確認 |
| Safari実機 | 390/1440px、DPR2。SPメニュー開閉、PCカルーセル、6カード、サムネdecode、ページ横溢れなし。ゲーム開始・残り時間39・ジャンプキー入力・2,817,360非透明画素を確認 |
| Chrome実動作 | ゲーム開始・残り時間39・ジャンプキー入力・702,104非透明画素、未捕捉JS例外0 |
| PERF-IMG-04 | Aの全閲覧時に観測した同一オリジンでAPI要求0、同一URLの重複要求0。HTML仮画像と実画像は別URLであるため、この記録で全二重読込がないとは断定しない。追加実装なし |

旧baselineを再採取せず、承認したloading/decodingとhome.jsの3コード片、ゲームhead7項目、TOPのJS参照クエリだけを適用回数付きmanifestで逆変換して旧SHAと照合した。カルーセルのSPボタン非表示やsmooth scroll、JS無効でのstyle読込待機、Safariの画面外クリックに起因した検証スクリプトの不具合は、テスト手順を修正した。これらはプロダクトの回帰として数えない。

### 13.2 Aの性能比較

Chrome 155.0.8059.39、8章の6Mbps/150ms/CPU4倍、DPR1、新contextの空キャッシュ、初期30秒窓、各3回の中央値。同じ公開素材・データを利用したローカルHTTP（圧縮なし）の観測結果である。

| 幅 | 同一オリジン本文量 改修前→A | 削減 | LCP中央値 前→A | CLS 前→A |
| --- | --- | --- | --- | --- |
| 390 | 11,429,575→8,782,665 bytes | 23.16% | 7,096→6,500ms | 0.04944→0.04944 |
| 1440 | 11,429,575→10,709,329 bytes | 6.30% | 936→944ms | 0.08493→0.08493 |

Aの比較ゲートを満たすが、SPのLCP絶対値は良好目安2.5秒を達成していない。PCのA測定には1回5,808msの外れ値があるため、中央値だけで常時高速とは説明しない。外部SUZURI/LINE画像はTiming情報が不明であり0バイト扱いしない。本番の圧縮通信量・実ユーザーCWV・INP・検索順位をこのラボ結果から推定しない。公開後に本番HTTPと実ユーザー指標の確認が必要である。

### 13.3 B・Cの判断

| 候補 | 実証結果 | 判断 |
| --- | --- | --- |
| X SVG内PNG→ロスレスWebP | 2048×2048保持、XMLはdata URIのみ変更。alpha差0・可視RGB差0・透明RGB差821,160画素。gzip 1,851,782→918,588 bytes（50.39%減）。Chrome8比較に10〜3,105の画素チャンネル差、Safari SP通常/hoverに451差、PCは0差 | 画像デコードの一致だけでは実表示の一致を証明できない。変更を採用せず原本保持。他素材への展開もしない |
| JP全グリフWOFF2再圧縮 | 元TTF SHA保持、10,222グリフ・9,868文字、アウトライン/ヒント/字幅/name/主要layout一致。1,635,088→1,563,712 bytes（4.37%減）。Safari見出し4比較差0。Chrome8画面の字幅/改行は一致したが、対照の元フォント再撮影にも差が出るケースがある（SP通常DPR1:対照533,318/候補461,103チャンネル差、PC TOP DPR2:対照3/候補37差） | 候補固有の可視差がないことを全画面で確実に証明できず、圧縮効果も限定的。採用保留。元WOFF2/TTF/CSS/preload/OFLを保持し、分割や書体変更を行わない |

B・Cは比較段階でゲートを通らず、ソースの変換・承認資産fixtureの追加へは進んでいない。候補は非公開の証跡にのみ置く。将来再検討する場合は安定した同一原本の対照から開始し、画質・許容差・書体を効果のために緩めない。

Safari 26.6.2実機のリモートオートメーションは、利用者の明示許可と本人のMac認証後に一時ON。全WebDriverセッションを削除し、終了後にチェックボックスOFF（Value:0）を確認して設定を閉じた。検証用サーバー・safaridriverを停止済み。Search Console/DNS/GitHub/本番配信には変更を行っていない。

## 14. 公開・検証記録 2026-10-11

公開指示を受け、直前の53件を再実行して成功。GitHubの自動更新 `253959ef15fe915f5e61f5f8418ed2391f83d8e7` をfast-forwardで取り込んだ。変更は最新JSON3件とnoteの1件目サムネ削除の4ファイルで、Aのソースとは競合しない。noteの画像取得失敗時は既存の建物イラストを表示する仕様を保持し、過去のサムネを復元しない。

旧baselineのハッシュを上書きせず、`seo-performance-changes.json` に取り込んだコミット・旧SHA・採用SHA（削除はnull）を追加し、元baselineとの対応と削除状態を保持試験で検査した。この自動更新はAの圧縮・本文変更として扱わない。取り込み後の53件・84画面・操作試験が成功。実装コミットだけのクリーンなコピーでも53件が成功し、85公開ファイルをビルドした。86→85の差は上記note画像1件の自動更新による削除である。

### 14.1 公開結果

- 実装コミット `d789296` を `erinui/inutaro-game` のmainへ反映。既定GitHubログインは変更せず、erinui認証を操作時だけ指定した。未追跡の旧素材・drafts・3D試作・移行資料・秘密ファイルはコミットへ入れない。
- [Workers Builds](https://dash.cloudflare.com/4b0c107033ce4f72efdc42b6dc0bac2e/workers/services/view/inutaro-game/production/builds/e5b591a1-827a-4103-ab5f-553e995bd5a5)成功、[GitHub Pages build/deploy](https://github.com/erinui/inutaro-game/actions/runs/38066935232)成功。
- 本番8URLの200、title/description/OGP/Twitter完全一致、canonical、TOPだけのWebSite JSON-LDを確認。本文は既知のCloudflare Analytics末尾スクリプトだけを除いてソースとSHA一致。CSS・レイアウト・画像・書体・ゲーム処理はAで変更していない。
- 390/1440px×7主ページ=14ケース成功。ローカル画像欠落0、ページ横溢れ0、未捕捉JS例外0、正常データ時のAPI要求0。SPメニュー、PC3カードを確認。ゲーム開始・残り時間39・ジャンプ入力・非空canvasを確認。
- robots/sitemap8正規URL、HTTP8URLの301、workers.devのnoindex、資料/更新スクリプト/テスト/秘密/Git/Functions/3D試作7パスの404を確認。旧GitHub Pagesの移転案内とキャラクターアンカーを維持。
- 本番4JSONは200・ETag・`public, max-age=0, must-revalidate`、同じETagの条件付きGETは304・本文0 bytesを確認。これはサーバーHTTPの確認で、ブラウザ再訪・更新後200の振る舞いはC01の実ブラウザ試験と区別する。
- 公開検証の初回は検証スクリプトのfixtureキー誤り、次回は非同期ニュース再描画中のDOM参照で停止した。canonicalPath参照と4ジャンルの描画完了待機へ修正して全ケースを再実行した。サイト実装の変更で隠していない。

証跡はローカル `seo-publish-20261011/` に公開前84画面、公開8HTMLと14画面の検査結果、条件付きGET、PC/SPスクリーンショット、本番性能を保存。公開した本文・コードは `d789296` のまま、結果資料と検証ツールの改善は別の記録コミットで反映する。

### 14.2 本番性能と検索確認

`https://erinui.com/` をChrome 155.0.8059.39で測定。390×844/1440×900、DPR1、下り6Mbps・上り1.5Mbps・遅延150ms・CPU4倍、新context、初期30秒、各3回の中央値。全測定で未完了の非lazy画像0。

| 幅 | LCP | CLS | 観測できた同一オリジン本文量 |
| --- | --- | --- | --- |
| 390 | 844ms | 0.04944 | 7,344,263 bytes |
| 1440 | 880ms | 0.08493 | 9,045,056 bytes |

本番は圧縮配信・外部通信・Analyticsがあり、13章の圧縮なしローカル値から削減率を算出しない。SUZURI/LINE外部画像とAnalyticsのTiming情報は不明（SP2/PC3URL）であり、上表は総通信量ではない。ラボのLCP/CLSで実ユーザーCWV・INP・検索順位を保証しない。画像による通信量は依然大きいため、安全な画像最適化は継続検討対象。

Search Consoleを再読み込みしてTOPの登録済み状態を確認。2026-10-11 01:17:36 JSTのライブURL検査はGoogle検査ツール（スマートフォン）の取得成功、クロール許可はい、インデックス登録許可はい、ユーザー指定canonical `https://erinui.com/`。テスト済みHTMLに新title/descriptionとWebSite JSON-LDを確認した。ライブ検査の登録可能は、今回のmetadataが検索結果へ採用済みという意味ではない。WebSiteはリッチリザルト対象ではないため「拡張機能なし」を失敗に数えない。再登録リクエスト・サイトマップ再送・DNS変更は行わない。

今後の管理確認は主要語の表示回数/クリック/検索順位、下層の登録状況、実ユーザー性能。公開直後の観測では新metadataの検索採用や順位改善は判定できない。自動監視や通知の新設は別の指示がある場合だけ行う。

### 14.3 圧縮候補の追加切り分け

本番公開後、X画像の代替案を非公開の候補で検査した。PNGの再エンコード候補はalphaと可視画素に差が出たため不採用。WebPは既存のcwebpで `-lossless -exact -q 100 -m 6 -metadata all` を試し、透明RGBとEXIF/XMPも保持した。[cwebpの公式仕様](https://developers.google.com/speed/webp/docs/cwebp)に基づく、透明画素の保持条件の切り分けであり、設定だけで描画一致を仮定しない。

WebP候補906,160 bytes、SVG gzip 921,148 bytes。2048×2048、alpha・可視RGB・透明RGBの全差0。Chromeの同一原本再撮影は8比較すべて差0だが、候補は通常/hoverでSP DPR1=10、SP DPR2=75、PC DPR1=21、PC DPR2=100チャンネル差が残った。したがって今回の微小差は透明RGBの破棄や単なる再撮影の揺れだけでは説明できず、ブラウザの形式別描画経路は未確定の調査項目として残す。

この代替案も採用ゲートを通らないためSafari再有効化・本番素材変更へ進まない。BとCの保留を継続し、全マップ・キャラ素材への圧縮展開、フォント分割、画質/許容差の緩和は行わない。
