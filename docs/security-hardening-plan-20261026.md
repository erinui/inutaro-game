# 周辺ツール・更新基盤のセキュリティ改修方針（2026-10-26）

状態：2026-10-27にSEC-01〜08の実装をmainへ反映。以下の設計は策定時点の記録であり、最新の実施結果・確認範囲・残件は[運用記録](security-hardening-operations-20261027.md)を参照。2026-10-27の利用者の選択により、更新PR作成を自動化し、検証開始・反映は人が確認する運用を採用した。設計時の完全自動マージの完了条件は、この承認付き運用での保護下の反映確認へ変更。YouTubeキーの管理設定は利用者の希望により確認保留。SUZURI管理側スコープも未確認。
根拠：main `57538d9e9a36aea4567beb2d8af59917c2051e10` の調査。詳細証跡は `.performance-evidence/security-audit-20261026/report.md`。

## 1. 結論と優先順位

既知の脆弱性を除去すると同時に、外部データを扱う処理が侵害された場合の権限範囲を狭める。単なる環境変数削除だけで分離完了とは扱わない。以下のP1/P2/P3は本プロジェクトの対応順で、CVEの重大度ではない。

| ID | 順位 | 修正対象 | 採用方針 |
| --- | --- | --- | --- |
| SEC-01 | P1 | Wrangler / Undici、動的npx | Wrangler固定＋Miniflare内Undiciの限定override＋lockfile |
| SEC-02 | P1 | 開発・CIブラウザ | 修正済み実バイナリへ更新。Playwright版だけで合格としない |
| SEC-03 | P1 | collectorの全環境変数継承、write権限 | provider別ジョブ、画像処理、保存ジョブを分離 |
| SEC-04 | P1 | 外部URL、転送先、容量 | 共通safe-fetchとサービス別URL検査を導入 |
| SEC-05 | P1 | ImageMagick・外部画像 | 現行トリミングを保ち、制限付き・秘密なしの画像処理へ |
| SEC-06 | P2 | Actions参照・監査の不足 | 公式SHA/依存lock、定期・変更時監査、期限付き例外 |
| SEC-07 | P2 | main無保護、自動push | データ更新PRへ移行後にブランチ保護を有効化 |
| SEC-08 | P3 | 公開ヘッダー | 互換性確認を挟み段階的に追加 |

現在の静的公開構成だけを理由にサイト全停止を行う根拠は得ていない。既知のUndici指摘はMiniflareの依存で、通常deploy経路からの攻撃成立は未実証。Node 24.22.1内蔵Undici 7.30.1は別であり修正済み。

## 2. SEC-01：公開ツールの依存を固定する

対象：`scripts/deploy-cloudflare.sh`、新設 `tools/deploy/package.json`・`package-lock.json`、依存監査workflow。

採用候補：Wrangler 4.151.3を固定し、`overrides: { miniflare: { undici: "7.30.1" } }`を指定する。無関係な依存への一括overrideをしない。

2026-10-26に隔離ディレクトリでpackage-lock-only / ignore-scriptsによる依存解決を実施し、Wrangler 4.151.3＋Undici 7.30.1になり、監査指摘0件になることを確認した。これは依存解決と既知勧告の確認だけで、CLI互換性検証・本番反映の合格ではない。証跡：`.performance-evidence/security-audit-20261026/plan-candidate-audit.json`。

| 選択肢 | 判断 |
| --- | --- |
| Wranglerをそのまま最新版へ | 4.152.0にもUndici 7.29.1が残るため単独では不採用 |
| 前回公開済み4.151.3＋限定override | 挙動変更を小さくし、脆弱依存を交換できるため第一候補 |
| 修正済み依存を含む上流版 | 実装時に公開されていれば優先比較。監査と互換性検証後に採用 |
| auditの指摘を無条件で無視 | 不採用。到達性・期限・代替対策を記録できる場合だけ例外審査 |

導入手順：既存の公式Node SHA照合→実バージョン検査→固定lockの`npm ci --prefix tools/deploy --ignore-scripts`→ローカルに導入したWrangler CLIを起動する。npxが不足パッケージを自動取得する経路は廃止する。

`--ignore-scripts`で必要なネイティブツールが動くかは実機検証する。失敗時に全パッケージのスクリプト実行を許可せず、必要なパッケージの導入方法・検証方法を限定して設計し直す。パッケージ導入は秘密情報を扱う前に行う。

合格条件：lockからクリーン導入できる／全Undici実体が修正版／新規High・Criticalなし／CLIの版と依存版を記録／build・`deploy --dry-run`・previewが成功／最終の本番デプロイと静的配信を確認。Cloudflare API tokenをログへ出さない。

## 3. SEC-02：ブラウザの実体を更新する

対象：端末Google Chrome、`.github/workflows/home-performance-check.yml`、新設のブラウザ取得・版検査スクリプト、ブラウザ依存テスト。

- 端末：現在155.0.8059.85。Googleの修正済み安定版へ更新して再起動後の実バージョンも確認する。Chrome for Testingを別途置くだけでは普段使うChromeの対策にならない。
- CI：Playwright 1.62.1同梱Chromiumは151.0.7922.34。
- 調査時の最新Playwright 1.64.1同梱は156.0.8078.4。majorが156でも、Googleの修正済みStable配布156.0.8078.47より古いため、これだけで完了としない。
- 第一候補：Playwright 1.64.1と公式Chrome for Testing Stable 156.0.8078.47を組み合わせ、既存の`CHROME_EXECUTABLE`で指定する。実装時の公式修正情報に照らし、より新しい修正が必要なら対象版を改定する。
- 取得元・OS/CPU・完全な版を固定し、取得物のSHAと実行時の`--version`を記録する。ダウンロードしたファイル自身から得たSHAだけを、独立した本物の証明とは呼ばない。秘密なしの環境で取得する。
- 修正済みの同梱Chromiumが上流から提供されたら、その組み合わせへの復帰を検討する。旧ブラウザは必要な場合だけネットワーク隔離した互換性試験に限定する。

合格条件：端末実行版・CI実行版が修正条件を満たす／既存216テストを出発点に全件実行／ゲーム開始・ジャンプ・音声・キーボード・TOPの取得と代替表示が動く。ブラウザ変更で性能値が変わった場合は旧測定と別世代として記録し、テストの期待値を無条件に緩めない。

## 4. SEC-03：秘密情報・画像処理・書き込み権限の分離

対象：`.github/workflows/update-youtube-latest.yml`、`scripts/update-home-latest.mjs`、各collector、新設の出力受け取り・保存処理。

短期の修正：collectorの環境変数を許可リストで構築し、YouTubeにはYouTubeキーだけ、SUZURIにはSUZURIトークンだけ、noteにはAPI secretを渡さない。画像変換コマンドはさらに小さな環境で起動し、API secret、Git認証、NODE_OPTIONS等の実行注入要因を継承しない。PATHも採用済み実行ファイルだけを指す。

ただし同じジョブ内の環境変数分離は、悪意あるコードが同一ユーザーで他プロセス・Git認証・ファイルを読むことまで防がない。最終構成はrunner/job境界を分ける。

| ジョブ | データ・秘密 | 権限・制約 |
| --- | --- | --- |
| YouTube取得 | YouTubeキーのみ | contents:read、認証をcheckoutに保持しない。取得上限を検証し生画像を出力 |
| note取得 | API secretなし | contents:read。RSS/記事/画像の接続先・容量を検査 |
| SUZURI取得 | SUZURIトークンのみ | contents:read。API応答と公開リンクを検査 |
| 画像処理 | 検証対象画像のみ | API secret・GitHub書き込み権限なし。変換子プロセスのネットワークも遮断 |
| 保存・PR作成 | 検証済み形式の候補一式 | 必要なcontents/PR権限のみ。外部API取得・画像のネイティブデコード・候補コードの実行は行わない |

収集ジョブの自動GITHUB_TOKENも完全な「secretなし」ではないため、contents:readとpersist-credentials:falseを明示する。外部コードの導入はsecretを渡す前に完了させる。

成果物は信用し直す。実行元run ID・base SHAを固定し、通常ファイルのみ、ファイル名・拡張子・件数・合計サイズ・スキーマ・URL・SHAを保存側でも検査する。symlink、`..`、絶対パス、想定外ファイル、スクリプト、巨大JSONを拒否する。成果物のmanifest記載値だけで合格にしない。

既存の`validateOutput`はYouTube画像でdwebpを実行するため、書き込み権限のある保存ジョブにそのまま移さない。ネイティブデコード検証と、保存側の構造・SHA検証を別関数へ分割する。保存側は信頼したmainのスクリプトを実行し、成果物内のコードやworkflowを実行しない。

base SHA後にmainが進んだ場合は古い結果を強制pushしない。最新mainへ追従して検査し直すか、次の更新へ回す。サービス単位で失敗した場合は以前の正常データを保持する。

合格条件：偽のsecretで環境分離を検査／変換からsecretが見えない／取得ジョブにwrite権限なし／保存ジョブで候補プログラムを実行しない／不正artifactを拒否／1サービス失敗・保存失敗・並行更新でも正常データを失わない。

## 5. SEC-04：外部データの入口と公開リンクを制限する

対象：新設 `scripts/lib/safe-fetch.mjs`・`provider-url-policy.mjs`、各collector、`validateOutput`、`home.js`、`scripts/lib/home-youtube-snapshot.mjs`。

通信先と掲載リンクを別に検査する。公開リンクをクリックするための許可と、runnerがHTTP通信するための許可を共用しない。

| 用途 | 許可候補・扱い |
| --- | --- |
| YouTube API | `www.googleapis.com`の対象API pathのみ |
| YouTube画像 | 現行`i.ytimg.com`の動画IDに対応した画像path |
| YouTube掲載先 | `www.youtube.com`のwatch/channel等、プロジェクトが実際に使う形式 |
| note RSS/記事 | `note.com/erinui/`の対象範囲。アカウント違いを拒否 |
| note画像 | 正常なOGPで実測したCDNホストを完全一致で登録。未調査の汎用S3全体や任意httpsを許可しない |
| SUZURI API | `suzuri.jp/api/v1/products` |
| SUZURI掲載先/画像 | 現行`/erikanuinui/`と`lens.suzuri.jp`を出発点に正常データで確定 |

HTTPSのみ、userinfoなし、標準portのみ。URLとして解析後にhostname/pathを検査する。文字列の単純なstartsWith、`note.com.evil.example`、過剰なsubdomain wildcard、二重エンコードの抜け道を使わない。

redirectはmanualで最大3回、各転送先に同じ検査を適用。認証付きAPIは原則redirect拒否とし、認証ヘッダーを別hostへ転送しない。DNS解決先のループバック、private/link-local、IPv6 ULA、IPv4-mapped等の内部宛先を拒否する。検査時と接続時を別のDNS解決にしない。必要なら修正版Undiciを明示依存にし、検査した宛先へ接続を固定しながらTLSのSNI/証明書検証は元のhostnameを維持する。DNS rebindingを防げない単発の事前lookupだけで完了としない。

初期上限案（正常応答を測定後に最終化）：

| 対象 | 上限候補 |
| --- | --- |
| API JSON | 1 MiB |
| RSS / 記事HTML | 各2 MiB |
| 画像 | 1枚10,000,000 bytes、40,000,000 pixels、静止画1枚 |
| provider全体 | 80 MiB、最大6件 |
| 時間 | 通信・受信を通した12秒のdeadline、collector全体180秒 |

Content-Lengthは早期拒否に使い、実際に受信した展開後本文をストリームで数えて超過時に中止する。Content-Lengthなし・虚偽値・chunked・圧縮応答にも同じ上限を適用する。arrayBuffer/textを全量読み終えてからの検査にはしない。

正常な取得先を拒否した場合は前回データを保持し、エラー理由をsecretなしで記録する。取得先を自動で広げたり上限を無制限に戻したりしない。保存時・ビルド時・表示時にも公開リンクの同じ規則を適用する。ブラウザ側で別の規則を複製せず、共有定義から生成する方針とする。

合格条件：正常データ全件受理／HTTP・類似host・別アカウント・private IP・転送先違反を拒否／受信上限を超えるstreamを途中停止／圧縮・タイムアウト・不正JSONで前回表示を維持。テストは管理下のローカルfixtureで行い、実際の内部クラウドAPIへアクセスしない。

## 6. SEC-05：画像処理を制限する

第一段階ではImageMagickのトリミングを維持し、runnerの採用パッケージ版と有効policyを記録する。OSベンダーのセキュリティ修正済みパッケージかを確認する。メジャー番号だけで判断せず、ベンダーのbackport/revisionも考慮する。

- 実データのmagicと寸法を確認し、JPEG/PNG/WebPの必要最小限に限定。HTTPのContent-Typeや拡張子だけで判定しない。
- 動画・複数フレーム・SVG/MVG・PDF/PS・外部delegate・間接ファイル参照を禁止。
- memory 256 MiB、map 512 MiB、disk 1 GiB、thread 2、time 12秒を初期案とし、正常画像で測定して確定。親側タイムアウトとジョブ全体の上限も併用。
- ネットワーク制限はImageMagickのpolicyだけでなく、画像変換の実行境界でも適用。外部APIの取得は変換プロセスに任せない。
- 例外時に、形式不明の入力bytesをそのまま公開する現行fallbackを廃止する。検証済みの元画像だけを許可するか、前回サムネイルを保持する。

Sharpへの置換は第二候補。新しい処理系も脆弱性監査が必要で、トリミング境界・画質・hashが変わる。安全性の改善を理由に画像の期待値をまとめて書き換えず、比較画像と変更範囲をレビューしてから採用する。

合格条件：正常画像で現在の表示・比率・トリミングを保持／偽MIME、異常寸法、破損、多重フレーム、外部参照を拒否／制限超過で旧正常データを保持／ログ・変換環境にAPI secretなし。

## 7. SEC-06・07：再発防止とmain保護

依存：root package/lockに収集・検証用依存、`tools/deploy`に公開ツールを分け、Cloudflareでテスト用ブラウザまで導入しない。通常の静的ビルドは従来どおりNode標準機能で動かす。各導入にnpm ciと監査を適用し、Node内蔵依存・npm依存・ブラウザ実体・OS codecを別々に棚卸しする。

Actions：採用時に公式リポジトリの完全なSHAへ固定するか、利用可能なworkflow dependency lockを採用する。版コメントも残す。固定するだけでは修正を取り込めないので、更新PRと変更時・週次の監査をCIとして導入する。High/Criticalを原則不合格とし、例外は勧告ID・影響・到達条件・代替策・担当・期限を必須にする。依存定義を持たない今のinline npm installは整理する。

main保護の導入順：

1. セキュリティ用ブランチ限定の現CIを、通常PRにも適用できる構成へ変更。外部forkのコードにsecretを渡さない。
2. 最新データの直接main pushを、限定パスの更新PRへ変更。無変更時はPRを作らず、同時実行を一本化する。
3. 更新PRでも安全検査・buildを必須にする。期限やbase不一致で古い結果を強制反映しない。
4. 成功したPRへの自動マージは、所有者・bot・変更ファイル・差分内容を検査した専用経路で行う。同一GITHUB_TOKENのpush/PR作成では後続workflowが起動しない制約も設計時に検証する。専用GitHub App等が必要な場合は最小権限・短命tokenを使い、汎用PATを安易に追加しない。
5. 上記が実運用で成功してからmainへのPR必須・必須CI・force push/削除禁止を有効化。

コードレビュー要件は人数に合わせる。一人運用で自分のPRを承認できず全更新が停止する設定を導入しない。複数人レビューが可能になった時点で必須承認を増やす。更新botにリポジトリ全体を自由に書き換えられる恒久bypassを与える方式は避ける。

secretは利用範囲・実権限・失効/更新方法を一覧化し、不要なものを撤去する。キー制限を提供するサービスでは対象API等を絞る。露出が確認された場合は即失効・再発行し、今回は漏えい未確認のため一斉失効による更新停止は行わない。

合格条件：通常PRで必須CIが確実に動く／botの正常更新が自動反映される／コード変更を含むbot PRは自動反映されない／失敗PR・直接pushを拒否／緊急復旧手順を確認済み。

## 8. SEC-08：公開ヘッダーを段階導入する

対象：`_headers`、必要ならHTML/JSのinline整理、本番・プレビュー検査。

最初に`X-Content-Type-Options: nosniff`、`Referrer-Policy: strict-origin-when-cross-origin`を検証する。iframe埋め込み利用を確認後、`frame-ancestors 'none'`と必要に応じX-Frame-Optionsを設定。Permissions-Policyは使用していない機能だけを禁止する。

CSPはReport-Onlyから始め、ローカル/CIのviolationとブラウザconsoleを収集し、画像CDN・フォント・音声・Cloudflare Analytics・JSON-LD・inline JSON・style操作を確認する。新たな外部レポート送信先は勝手に追加しない。`script-src 'self'`、`object-src 'none'`、`base-uri 'self'`、`form-action 'none'`等を出発点とし、実際に必要な配信元だけ追加する。Analytics等の機能を無言で停止したり、回避のためscript-srcに広範なunsafe-inline/unsafe-evalを加えたりしない。

HSTSは全関連hostとHTTPS運用・復旧経路を確認後、短いmax-ageから開始する。includeSubDomains・preloadは別途全サブドメイン確認が必要で、初回には追加しない。長期HSTSは即時に解除できないため最後に行う。

合格条件：本番とpreviewの実ヘッダーを確認／既存全ページ・ゲーム・音声・外部画像・解析が動く／内部ファイル404維持／コンソールに想定外のCSP違反なし。

## 9. 実施単位・順序・完了条件

| 単位 | 内容 | 次へ進む条件 |
| --- | --- | --- |
| PR-A | 依存固定・Undici・監査、修正済みテストブラウザ | audit、CLI互換、既存回帰・プレビュー成功 |
| PR-B | safe-fetch・URL検査・受信容量制限 | 正常取得、境界値、不正転送、旧データ保持 |
| PR-C | provider/job/画像処理/保存の分離 | secret分離・artifact拒否・権限・失敗復旧を確認 |
| PR-D | データ更新PR・必須CI・依存更新運用 | 実際の定期更新が新経路で成功 |
| 設定変更 | main保護・token権限整理 | PR-D後。正常bot・緊急復旧も確認 |
| PR-E | 防御ヘッダーと運用資料 | Report-Only→enforce、本番機能確認 |
| 端末保守 | 普段使うChrome更新 | 他のPRと独立に早期実施 |

実装時に許可された隔離checkoutを使い、既存の大量のローカル変更・新しい取得データ・生成画像を混ぜない。1つの巨大PRにせず、各単位の変更・検証・復旧先を明確にする。

既存216件を最低限の回帰検証として維持し、新しい安全性の境界検査を追加する。任意の新データを正規化して既存の完全一致試験を通すことはしない。実際の自動更新JSONを使う場合は、世代の差分を確認して正確なhashを追加登録する。

最終完了：既知勧告の解消または期限付き根拠ある例外／修正済みブラウザの実版／秘密情報・write権限の分離／不正URL・超過データ・不正artifactの拒否／3サービスの実取得・保存成功／main保護後の自動更新成功／Cloudflare本番とpreview成功／既存の公開ファイル・内部404を実配信確認／資料と復旧手順を更新。

## 10. 復旧方針と未確定事項

- 不具合があればprovider単位で以前の正常データを維持し、他サービスや画面全体を止めない。
- 公開の復旧は正常な静的成果物を使う。安全でない古い実行環境へ戻して解決しない。現在参照しているhash付き画像を持たない過去版へ単純rollbackしない。
- policy/ヘッダー/依存/権限の各変更を独立して戻せるよう記録する。秘密情報が漏えいした場合はコードrollbackだけで対策完了としない。
- 未確定：note画像CDNの完全な許可集合、CIのImageMagick版とpolicy、Undici overrideの実機互換性、Chrome for TestingとPlaywrightの互換性、GitHubプランとApp運用の条件、Cloudflareの現在の管理設定。
- 実装前の確認で上記を解消する。未確認の項目を「対応済み」と記載しない。

## 参照

- https://github.com/advisories/GHSA-xjj6-f33q-929c
- https://github.com/advisories/GHSA-4qv8-2p9j-2685
- https://github.com/advisories/GHSA-f72v-6w45-q472
- https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#overrides
- https://docs.github.com/en/actions/reference/security/secure-use
- https://googlechromelabs.github.io/chrome-for-testing/
- https://github.com/microsoft/playwright/blob/v1.64.1/packages/playwright-core/browsers.json
- https://imagemagick.org/security-policy/
