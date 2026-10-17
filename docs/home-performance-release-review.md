# 表示速度改善 公開前レビュー・検証記録

対象: ローカルHEAD `8f7563cfcefe7109a1e915fd3d0cf55eb6d34f61` を基準とする性能改修。2026-10-18、本番反映と公開後確認を実施。過去の未公開表記は各工程実施時点の記録。

## N01: 差分レビュー

公開対象は既存の追跡ファイルに、今回のconfig・生成物・変換/検証スクリプト・試験・性能ドキュメントを加えた候補snapshotへ固定する。元からある未追跡のcity画像、map_sns.svg、youtube-latest-thumb.jpg、drafts、3D試作、server-migration-plan.mdは含めない。対象ファイルのフルSHAは非公開の検証証跡に保存する。

| 所見 | 影響 | 対応・試験 |
|---|---|---|
| HP-REVIEW-01 | v1 producerへの切り戻しで、開いたv2ページ用のハッシュ画像を削除し得る | schemaVersionに関係なくハッシュWebPを保持。v1の既存JPG削除契約は維持。回帰試験を先に失敗させて修正 |
| HP-REVIEW-02 | 検査後のコピー中に生成物が変わると、内容と一致しないハッシュURLを公開し得る | 完成した配信出力の全生成物を完全SHAで再検査。コピー中破損を注入する回帰試験を追加 |
| HP-REVIEW-03 | 最初の静的枠に出ない第4〜6件のv2画像情報欠落をsnapshot変換が見逃す | bootstrapへ含める全動画のlocalThumbnail契約を検査。第6件欠落を拒否する回帰試験を追加 |

上記3件はRed→Greenで確認。公開するHTML/CSS/JS/画像の正常出力は変わらず、旧基準の保持manifestは今回のsource差分へ更新した。公開前に全体試験を再実行する。

フォントは全文字cmap・字形・メトリクスを保持する一方、現行で使わないlayout featureを除いた分割である。縦書き・字幅指定等の変更はpolicyで検出して再検証する。初期100KBは現行TOPのデータに対する実測であり、将来の新タイトルでの予算維持を保証しない。旧フォント/旧画像を残し、immutableはハッシュ付きversionedディレクトリだけに限定する方針を維持する。

## N02〜N04の記録

Safari、Node20/Linux CI、Workersプレビュー、復旧artifactの実行結果を追記する。未実行・ローカル代替・実配信の検証を区別する。

Safariは利用者から設定変更の明示許可を受け、リモートオートメーション有効化後、Safari 26.6.2 / macOS 26.6.2で隔離セッション作成成功を確認した。画像・フォント・操作の本試験は別途記録する。

CIは専用候補ブランチでcontents:readの検証jobを実行する。収集APIの秘密情報やpublish処理は使わず、fixtureとビルド・全試験を対象とする。実運用更新と検証で同じ固定WebP導入actionを使い、導入経路の差をなくす。

## N02: Safariの結果

Safari 26.6.2 / macOS 26.6.2、実測viewport 390px・1440px、物理DPR2で8ページずつ比較し、対象の見出し・段落の行ボックスと地図リンク配置の最大差は0px。font loadも正常。透過画像と文字のスクリーンショットを点検した。

狭幅メニューの開閉・リンクフォーカスからのEscape復帰、PCで表示されるカルーセルボタン、ゲーム開始、約10秒ごとの動画0→1→2→統計を確認した。decode完了を保留した場合の前画像維持と、遅い完了が統計を上書きしないことも合格。

試験ではSafariの常時スクロールバー幅をclientWidthで扱い、ボタンクリックが自動でキーボードフォーカスを移さない挙動を考慮した。これらは試験手順の調整で、site-nav.jsやゲーム本体は変更していない。DPR1のSafariと実iPhone/iPadは未確認であり、desktop Safariの狭幅試験を実iOSと同一視しない。

再実行: `HOME_SAFARI_BEFORE=<before証跡> HOME_SAFARI_OUTPUT=<新規出力> node scripts/check-home-safari.mjs`。許可済みのSafari WebDriver設定が必要。スクリプト自身は設定を変更せず、通常タブと隔離された試験ウィンドウだけを使う。

証跡: `.performance-evidence/20261017/release-review/safari-complete/`。

## N03: Node20 / Linux CIの結果

- macOS: 公式SHAを照合したNode20.20.2でクリーン候補をビルドし、**146/146試験合格**。
- GitHub Actions: ubuntu-24.04 / Node20.20.2、共通actionでWebP 1.6.0を導入し、**146/146試験合格**、生成物inventory検査も合格。API秘密情報・publish・mainへのpushは使っていない。
- [CI実行結果](https://github.com/erinui/inutaro-game/actions/runs/39040712225)、検証コミット `03ee0ca8ad2be9d1d758d99ae6eb6ec6986ac1c4`。
- [検証ブランチ](https://github.com/erinui/inutaro-game/tree/codex/home-performance-verification-20261017)。作業元のbranch・indexは変更せず、別の一時checkoutで対象ファイルだけをcommit/pushした。

CI検証対象と現在の配信に関係するsourceの完全SHA一致、公開260ファイルと従来計測対象の完全SHA一致を確認。Mac専用Safari検証helperと結果ドキュメントは別途追加したもので、Linux上でSafariを検証したという意味ではない。

## N04: 配信・復旧検証の結果

Wrangler 4.151.1の実workerd Static Assetsをローカルで使用し、正規8URLの200、versioned CSSのimmutableと完全SHA、HTML/JSON/root旧JSの再検証設定、JSON/旧JSのETag付き304、MIME、非公開パスと欠落資産の404を確認した。`/pages/characters`等の正規URLと、末尾slashからの307を区別して記録。

ローカルHTTPでの検証では、HTTPSのworkers.dev絶対ホストに限定したnoindexの実配信を証明しない。Cloudflare認証が期限切れで再ログインが必要なため、実サービスの検証URL発行とHTTPSヘッダー確認は未完了。本番切り替えは行っていない。

復旧版は旧正常consumer（8f7563c）＋候補の正常v2データ・互換producer＋保持資産を別のcleanなGit fixtureに組み、Node20でビルドした。旧compilerでは新manifestの有効bindingsを空にし、生成物は保持専用として整合を取った。174ハッシュ資産の完全SHAを検査済み。

新版ページからの画像と低頻度文字用フォントの要求を保留し、配信先を復旧版へ変更してから解除した。いずれも復旧版から200・完全SHA一致で取得し、WebPとWOFF2のブラウザdecodeが成功した。さらに復旧aliasを使う実ビルドを2世代作成し、開いた同じページがcanonicalではなく同じalias URLからrevision 1→2を取得、統計表示も更新できた。

証跡: `workers-local-results.json`、`rollback-artifact.json`、`rollback-delays.json`、`alias-updates.json`（いずれも非公開証跡ディレクトリ内）。

## N08: 低速条件の追加調査

Lighthouse 13.5.0の同じ標準モバイル条件を前後各3回へ増やした。中央値はPerformance **70→88**、LCP **20.76→3.84秒**、CLS **0→0.00468**。6Mbps条件のラボ結果とは分ける。

公開候補を変更せず、TOPで共有CSSをインライン化し固定core fontだけをpreloadする試作も比較した。単発比較では88→90、LCP3.86→3.61秒、CLS0.00468→0。2.5秒以下には届かず、HTML肥大と再訪時のCSS再利用のトレードオフもあるため、現行releaseへは採用していない。単発の90を最終スコアと報告しない。

次の調査は同じ412px/DPR1.75のtraceを使い、画像decode、style/layout、動的カード生成の主スレッド時間とリソース競合を切り分ける。CSSの初期読み込み対策だけで残りを解決できるとは判断しない。試作の採用には反復計測・TDD・視覚/CLS・通信量・再訪の検証が必要。

証跡: `lighthouse-three-run-summary.json`、`n08-inline-lighthouse/`。N08は調査継続、公開候補は変更なし。

## 2026-10-18: 本番反映の準備

利用者からCloudflareへのログインと本番反映の明示指示を受領。main `7b1a84af1540fe4d8d20a3209e83dff0717a45b1` までの自動更新を候補へ統合した。変更は3つのJSONの取得日時とYouTube累計視聴数（3094→3129）で、動画6件の内容・順序は同一。新しいlocalThumbnailとschemaVersion 2を保持し、それらを除いたJSONがmainと完全一致することを確認した。

最新データの統合に伴い、固定データの保持試験2件がRedになったため、P0の基準ファイルは置き換えず、今回の差分を厳密な復元fragmentへ追加した。クリーンビルドは260公開ファイル、174保持資産の完全SHA検査合格。本番の変更前HTMLとヘッダーは非公開のローカル証跡へ保存した。

本節は公開準備の記録であり、Cloudflareへのアップロード・本番切り替えの完了記録ではない。アカウント認証後、実サービス上のバージョンと復旧先を確認してから切り替え、公開結果を追記する。

## 2026-10-18: 本番反映・公開後確認

- 公開コミット: `d4d30134e1d802acfec1f09447dca6d4e47595d9`。macOS Node20と[Linux CI](https://github.com/erinui/inutaro-game/actions/runs/39044969997)で146/146合格。mainへfast-forwardで反映。
- 保存済みWrangler OAuthは期限切れでrefreshも失敗したため、新しい認証情報を入力せず、既存のGitHub→Workers Builds連携で公開した。Cloudflare build `454ea660-b4d3-4c5a-89ca-2e281d8bd117` 成功、Worker version `716cf297-5e1a-4012-8c6c-abc6c00c101b`。
- HTTPS本番の259配信ファイル（260出力のうち制御用 `_headers` を除く）が候補の完全SHAと一致。正規8ページ200、versioned資産immutable、HTML/JSON/旧JSは再検証、JSON/旧JSは条件付き304。config/docs/.env/欠落資産は404。本番にnoindexなし、workers.dev検証ホストにはnoindexあり。旧GitHub Pagesの公開処理も成功。
- Chrome 155、390×844/DPR2、6Mbps/1.5Mbps/150ms/CPU4、空キャッシュ・初期30秒の本番単発測定: 36要求、失敗0・未完了0、CDP総転送量691,368 B、フォント84,792 B、最大画像66,458 B、LCP1,108ms、CLS0.049435。zstd/gzip応答8件はCDP dataReceivedの本文byteが0になるため、本文のみの611,183 Bを総量として使わない。各完了要求のencodedDataLength（ヘッダー込み）合計と、未確定本文をその転送量で上限評価した680,388 Bの両方で1MB未満を確認した。
- 通常再訪では21件のversioned資産すべてtransferSize 0、ネットワーク転送なし。JS無効の静的表示で確認し、動画タイマーの追加取得と区別した。
- 本番Lighthouse 13.5.0・標準モバイル・単発: Performance85、LCP3.927秒、CLS0.00468、runtime error/warningなし。低速条件のLCP2.5秒は未達で、別改善N08を継続する。公開前のローカル3回中央値88を本番スコアと置き換えない。
- [既存の新着更新workflow](https://github.com/erinui/inutaro-game/actions/runs/39045269624)を公開後に1回手動実行し、YouTube/note/SUZURIすべてsuccess・保存成功。更新コミット `b4241b391ed4f9561f7aba67936bdcdefdf472ae`。動画のハッシュ画像・schema 2の契約と旧資産保持を確認し、更新後も174資産の完全SHA検査が合格。公開候補146試験と、その後の実データ更新検証は別記録とする。
- 復旧版は旧consumer＋今回の最新正常データ＋174保持資産として再ビルドし、保持集合のSHA照合に合格。新ハッシュ資産のない過去Cloudflareバージョンへの単純rollbackは使用しない。

証跡: `.performance-evidence/20261017/production/`（非公開）。実iOS/DPR1 Safari、PSIの実ユーザーCWV、低速条件LCPの追加改善は未完了。本番公開と、すべての性能目標達成を区別する。
