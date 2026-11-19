# 犬タローゲームの運用手順

最終確認日 2026-11-19。公開、データ更新、ローカルビルド、依存監査、復旧の入口は本書。バージョンはリンク先の固定設定を参照する。サイトの表示仕様は[最新コンテンツ表示](home-latest-content.md)、開発全体は[プロジェクト概要](project-summary.md)に記載する。

## 1. 公開構成と実行時刻

本番は `https://erinui.com/`、Cloudflare Workers Static Assetsの`dist/`を配信する。YouTube・note・SUZURIはGitHub Actionsで取得し、静的JSONとして公開する。ブラウザにAPIキーを渡さず、`functions/api/latest-youtube.js`は現行Workerでは実行しない。LINE作品は`line-stamps.json`を手動更新する。

| 処理 | workflow | 起動条件 |
| --- | --- | --- |
| 収集・隔離画像処理・候補PR作成 | `update-youtube-latest.yml` | UTC `10 */4 * * *`、またはworkflow_dispatch |
| PR検証開始・通常マージ・古いbaseの再取得 | `reconcile-home-updates.yml` | 収集／verify／auditのworkflow_run完了、UTC `40 */4 * * *`、またはworkflow_dispatch |
| 実PRの全回帰検証 | `home-performance-check.yml` | pull_request、または検証用workflow_dispatch |
| 依存監査 | `dependency-audit.yml` | pull_request、週次、またはworkflow_dispatch |

収集予定はJSTの01/05/09/13/17/21時10分、補完予定は同じ各時40分。Actionsの混雑で遅れる場合があり、4時間ごとの収集予定を即時公開の保証とは扱わない。後続イベントが起動しない場合にも定期補完で再判定する。実PR以外の手動検証を必須チェックの代用にしない。

## 2. 収集から本番まで

1. `prepare-provider.mjs`が3サービスを別ジョブで収集する。現在のYouTubeチャンネルIDはworkflowに`UCdnf6zMzSdZuvUxS-CS2REQ`を固定し、最大6件を取得する。通常動画とショートを同じuploads一覧から扱う。
2. `process-update-candidates.mjs`が非root・ネットワーク分離・API秘密情報なしの環境で画像を処理する。
3. `publish-candidates.mjs`が信頼したmainのコードで成果物を再検査し、データPRを作成する。PR作成成功は公開完了を意味しない。既存の対象PRがあれば重複作成を避け、後段のreconcileへ委ねる。
4. `reconcile-home-updates.mjs`が収集元・PR・全変更ファイルを照合し、実際のPRイベントのverify/auditを開始する。
5. 両workflowと両チェックの成功後、正確なhead SHAを指定して通常マージする。main保護、必須verify（GitHub Actions app ID 15368）、最新base必須、未解決conversationの制限を維持する。
6. Cloudflare本番ビルドの同じmain commitでの成功と、配信JSON・画像・TOPを確認する。取得、PR作成、マージ、本番配信の4段階を区別する。

## 3. 自動操作の範囲と権限

対象PRは同一リポジトリの`github-actions[bot]`作成、main向け、タイトル`Update validated home data`、ブランチ`automation/home-latest-{runId}`に限る。成功した正規収集runのbaseを親とする単一commitであることと、全ファイル件数を照合する。

許可する差分は3サービスのJSON・所定のサムネイル、および`tests/fixtures/top-redesign-data-refresh.json`と`tests/fixtures/seo-performance-changes.json`だけ。コード、任意のfixture、ファイル名変更、過去のハッシュWebP削除は拒否する。ソース改修やDependabot PRはこの自動マージの対象外。

| ジョブ | 書き込み権限・秘密情報 |
| --- | --- |
| 各サービスの取得 | contents:read、自サービスのAPI secretのみ |
| 画像処理 | contents:read、API secretなし、外部ネットワークなし |
| 候補保存 | contents/pull-requests:write、actions:writeなし。候補のコードやnative decoderは実行しない |
| reconcile | contents/pull-requests/actions:write。常にmainをcheckoutし、PRコード・成果物を実行しない。API secretや追加の恒久PATは不要 |

リポジトリ全体のauto-merge設定、main保護の解除、管理者bypass、force pushは使わない。

## 4. 失敗・滞留時の確認

| 状態 | 実装の動作・対応 |
| --- | --- |
| SUZURI secret未設定 | スキップし、以前の正常データを保持する |
| 取得・画像検証の失敗 | 当該サービスの旧ファイルを保持する。正規収集run全体が失敗した場合、作成済みPRがあっても自動マージしない |
| PRのverify/auditがaction_required | 対象と差分を照合したreconcileが実PR検証を開始する |
| PR検証中 | 本番を維持し、次の完了イベントまたは定期補完で再確認する |
| PR検証が不合格 | マージせず、reconcileをエラー終了する。失敗ログを確認し、原因修正後に実PR検証を再実行する。全障害の無限リトライは行わない |
| PRのbaseが古い | 信頼した収集元・差分を照合後、PRを閉じ、最新mainから収集を再起動する |
| 収集中にmainが進み、保存前にbase不一致 | 保存処理を失敗させ古い候補を公開しない。次の収集予定、または現在mainからの手動再実行で取り直す |
| 不正な差分・収集元、権限不足、API失敗 | エラー終了し、本番の正常データを維持する。保護を解除して進めない |
| マージ済みだが表示が古い | 同じcommitのCloudflare本番ビルド、配信JSONのfetchedAtと動画ID、画像のHTTP状態・SHAを確認する |

滞留の診断に使うコマンドを示す。`update-youtube-latest.yml` の手動実行は、検証に合格したデータを本番まで公開することがある。必須チェックが全件成功した後も照合が「検証中」の場合は、`reconcile-home-updates.yml` を再実行する。

```sh
pr_number=39 # 確認対象のPR番号に置き換える
gh pr checks "$pr_number" --repo erinui/inutaro-game
gh workflow run reconcile-home-updates.yml --repo erinui/inutaro-game --ref main
# 最新mainからの再収集が必要な場合
gh workflow run update-youtube-latest.yml --repo erinui/inutaro-game --ref main
```

`fetchedAt`は収集日時であり、動画・記事の公開日時やニュースの並び順には使わない。APIキーやtokenをログ・資料に転記しない。

## 5. ビルド用フォントと実行環境

開発・CI・収集のNode.js基準は [`.node-version`](../.node-version)。`node scripts/check-node-version.mjs` で実行版を確認する。Gitは `git --version` で起動できることを確認する。TOPの追加フォントは`build-current-font.py`と`lib/current-font.mjs`で毎回のビルド時に生成する。元TTFの静的コアと、最新4サービスのtitle/excerpt/kindを収録し、字形・送り幅・global boundsを原本と照合する。従来の全文字分割・原本・他ページの書体は保持する。

出力は`assets/versioned/keinann-pop-jp-current.{hash}.woff2`と`home-font-snapshot.{hash}.css`。TOPの末尾のstylesheetで対象文字範囲を優先し、既存ファイルは上書きしない。これらはビルド出力であり、既存manifestへの追記やソース資産の採用作業とは区別する。

CIとCloudflareは、[フォントビルドの依存ファイル](../config/font-build-requirements.txt)にあるFontTools・Brotliを配布物のSHA-256付きで導入する。静的ビルドにはPythonとこの2依存が必要。画像変換ツールは収集後の画像処理で使う。手元の別ブランチに未コミット変更がある場合も、最新mainの分離した作業コピーで以下を実行できる。

```sh
git --version
node scripts/check-node-version.mjs
font_build_dir="$(mktemp -d)"
python3 -m pip install --require-hashes --target "$font_build_dir" -r config/font-build-requirements.txt
PYTHONPATH="$font_build_dir" node scripts/build-site.mjs
PYTHONPATH="$font_build_dir" node scripts/preview-site.mjs --built
```

`build-site.mjs`の出力先は`dist/`。すでに存在する場合は必要な生成物を退避するか、`preview-site.mjs --built`で一時ディレクトリに生成する。プレビューは起動ログに表示されたURLで確認する。Pythonを`INUTARO_FONT_PYTHON`で指定する場合は、同じPythonに対応した依存を導入する。新着タイトルによる手動再分割は不要だが、将来の全データで100,000 bytes以下を無条件に保証するものではない。容量検証は維持し、超過時は失敗として調査する。

## 6. Cloudflareの公開と復旧

Workers Buildsは`main`からデプロイする。ProductionとPreviews Baseの`NODE_VERSION`を[`.node-version`](../.node-version)に合わせる。既存のプレビューに個別設定がある場合は、再利用時に同じ値を確認する。[デプロイスクリプト](../scripts/deploy-cloudflare.sh)が公式Node.jsのSHA-256を照合し、実行版を検査してからnpm・Wranglerを起動する。

1. PRの必須`verify`・`audit`とCloudflareプレビューを確認し、通常マージする。データPRの自動処理は第3節の条件を満たす場合に実行する。
2. Cloudflareの本番ビルドで、対象mainコミット、Node.jsの実行版、デプロイ成功を照合する。
3. [ブラウザ固定設定](../config/test-browser.json)のChromeを使い、公開8ページ、CSPの強制適用、ゲーム操作・音声・結果画像、公開アセットのSHA-256、内部ファイルの404を確認する。`npm ci --ignore-scripts --no-fund`でPlaywrightを用意してから実行する。

```sh
CHROME_EXECUTABLE="$(node scripts/install-test-browser.mjs)" \
  REQUIRE_CSP_ENFORCED=1 node scripts/verify-live-site.mjs \
  https://erinui.com "$(mktemp -d)"
```

データ更新を確認する場合は、公開中の3サービスのJSONと、実際にデプロイされたコミットの同じファイルをSHA-256で照合する。公開画面に不具合があれば、Cloudflareで直前の正常な静的配信バージョンへ戻し、修正PRを通す。データ更新の障害は正常データを保持したまま第4節に沿って復旧する。

旧GitHub Pagesは別の公開経路で、現状はmainのルートを参照する。旧URLの移行案内と公開範囲の見直しは別作業として扱う。

## 7. 固定版と依存監査

| 対象 | 参照先 |
| --- | --- |
| Node.jsと公式配布ハッシュ | [`.node-version`](../.node-version)・[デプロイスクリプト](../scripts/deploy-cloudflare.sh) |
| npm・Undici | [ルートlockfile](../package-lock.json)・[デプロイ用lockfile](../tools/deploy/package-lock.json)。Node.js内蔵版は `node -p 'process.versions.undici'` で確認 |
| Pythonフォント依存 | [ハッシュ付きrequirements](../config/font-build-requirements.txt) |
| ImageMagick・WebP | [ImageMagick設定](../config/native-security-baselines.json)・[WebPセットアップ](../.github/actions/setup-home-webp/action.yml) |
| CI用ブラウザ | [Chrome for Testing設定](../config/test-browser.json) |

[Dependency security audit](https://github.com/erinui/inutaro-game/actions/workflows/dependency-audit.yml)は、PRではnpm監査と固定依存の確認、毎週月曜11:24（日本時間）・手動実行では公式の新版照合とPython依存2件・Undiciの照合も行う。保守担当はログで、勧告への該当、新版あり、照合先障害による未判定を区別する。未判定は再実行し、続く場合は照合先を確認する。

## 8. 日付付きの実施記録

- 2026-10-22のNode.js対応と2026-10-27の保護・手動承認の経緯は、それぞれの実施記録を参照する。 [Node.js対応記録](node-security-response-20261022.md) · [10月のセキュリティ運用記録](security-hardening-operations-20261027.md)
- 2026-11-18にデータPR限定の自動検証・通常マージと、最新データ用のフォント生成を反映した。 [復旧記録](youtube-update-recovery-20261118.md) · [PR #31](https://github.com/erinui/inutaro-game/pull/31)
- 2026-11-19に実行環境、画像・フォント依存、週次監査を更新した。データの再取得、公開前チェック、本番への反映とJSONのSHA-256一致を確認した。 [PR #35](https://github.com/erinui/inutaro-game/pull/35) · [PR #36](https://github.com/erinui/inutaro-game/pull/36) · [PR #37](https://github.com/erinui/inutaro-game/pull/37) · [mainの監査](https://github.com/erinui/inutaro-game/actions/runs/44444256573) · [データ更新PR #39](https://github.com/erinui/inutaro-game/pull/39)

YouTube・SUZURIの管理画面でのAPIキー制限確認に関する保留事項は、[10月の記録](security-hardening-operations-20261027.md)に記載する。
