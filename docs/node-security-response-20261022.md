# Node.js セキュリティ対応計画・実施記録（2026-10-22）

状態: **完了**。開発端末・GitHub CI・外部情報更新・Cloudflareの実ビルドと本番配信を確認済み。

## 対応方針

2026-10-21のNode.jsセキュリティ更新に対し、プロジェクトの実行基準を24.22.1へ統一する。
サイトはWorkers Static Assetsであり、Node.jsの公開アプリサーバーはない。
対象は外部API・RSS・画像を取得する更新ジョブ、検証CI、Cloudflareビルド、開発端末。
個別CVEの攻撃成立や侵害を確認したものではない。20系・25系はEOLのため継続使用しない。

## 計画と結果

| 工程 | 実施内容 | 結果 |
| --- | --- | --- |
| バージョン統一 | `.node-version`を24.22.1にし、両workflowから参照 | 完了 |
| 実行時検査 | CI、ビルド、自動更新の入口で旧版・別majorを拒否 | 完了 |
| 開発端末 | 公式macOS版のSHA確認、bash/zshと既存コマンドを切り替え | 完了 |
| CIアクション | checkout/setup-node/upload-artifactをv6、cacheをv5へ更新 | 完了 |
| ローカル検証 | 既存211件、境界値と限定差分、隔離ビルド・note取得 | 成功 |
| Linux CI | 公式Linux版の導入、改ざん拒否、全215件の試験 | 全件合格 |
| 本番データ更新 | YouTube・note・SUZURIの実取得とmain保存 | 全サービス成功 |
| Cloudflareビルド | 公式24.22.1のSHA照合後にnpm・Wrangler・ビルドを実行 | 成功 |
| 公開確認 | 静的268ファイル、8ページ、非公開4パス | 280項目すべて成功 |

ビルド・更新のガードは、基準と同じmajorのそれ以降の安定版minor/patchを許可する。プレリリース・不正形式は拒否する。
画面・ゲーム・収集周期・公開ファイルの許可リストは変更していない。
既存の完全一致テストは今回の限定差分だけを逆適用し、以前の基準を保持する。
自動更新済みJSONは取得日時・YouTube総視聴数以外のpayload一致を確認し、正確なSHAだけを追記登録した。公開データを過去へ戻していない。

## Cloudflareの自動インストール障害と対策

アプリ内ブラウザの保存済みプロファイルで対象アカウントへ接続した。
Cloudflareの自動導入は24.22.1を検出後、`Installing nodejs 24.22.1`で失敗していた。
SKIP_DEPENDENCY_INSTALLだけでは、このツール導入は省略されなかった。

そのため `scripts/deploy-cloudflare.sh` が公式HTTPS配布から24.22.1を取得し、固定SHA-256照合後にのみ展開・実行する。
照合失敗・未対応環境・未知の引数は停止する。`--verify-only`は導入検査だけを行い公開しない。

| Cloudflare設定 | 保存済みの値 |
| --- | --- |
| Production branch | main |
| Build command | 未指定（Wranglerのcustom buildを利用） |
| Deploy command | `bash scripts/deploy-cloudflare.sh` |
| NODE_VERSION | `24.18.0`（自動ツール導入段階だけのブートストラップ用） |
| SKIP_DEPENDENCY_INSTALL | `1` |

ブートストラップ版ではプロジェクトコード・外部データ収集・npm・Wranglerを実行しない。
スクリプトが検証した24.22.1をPATHの先頭へ置き、実行ガードに合格してからnpm・Wrangler・公開ビルドを起動する。
プロジェクトの基準は24.22.1のままであり、本番ログでも実バージョンを確認した。
Cloudflareの公式インストーラーが修正版を扱えるようになったら、修正版の直接指定を検証し、この回避設定を撤去できる。

## 完了証跡

- [PR #1](https://github.com/erinui/inutaro-game/pull/1): ランタイム統一。main反映 `12a42beb55055e85db0de3c7df7fdac6fa9ce2fe`。
- [PR #2](https://github.com/erinui/inutaro-game/pull/2): Cloudflare導入対策。main反映 `d8956c39a798ad660b7a06b4cc2ffcbc9a0b964d`。
- [最終Linux CI 39639268593](https://github.com/erinui/inutaro-game/actions/runs/39639268593): 215件合格、失敗・skipなし。公式Linux版のSHAと実行検査も成功。
- [本番更新 39637594313](https://github.com/erinui/inutaro-game/actions/runs/39637594313): 24.22.1で3サービスすべてsuccess、保存pushed。生成コミット `804376408bdca3cd811cd81ba783303e23b14caf`。
- [Cloudflare本番ビルド](https://dash.cloudflare.com/4b0c107033ce4f72efdc42b6dc0bac2e/workers/services/view/inutaro-game/production/builds/8a7e003c-9367-4dfb-9b4b-a5dff1759a90): `Official Node.js 24.22.1 linux-x64 SHA-256 verified.`、`Build runtime: Node.js 24.22.1`、277公開ファイル生成、`Success! Build completed.`を確認。
- 初回の検証済み本番配信Version ID: `a04dbe91-253a-428b-800f-a0bc5e5f147d`。`erinui.com`へのデプロイ成功。
- デプロイ後に最新mainから生成した公開ファイルと照合。268静的ファイルはbytes一致、8HTMLは正規URLへの転送とタイトルを確認。`.node-version`・導入スクリプト・対応資料・`.env.local`は公開しない。
- ローカル証跡: `.performance-evidence/node-security-20261022/`（Git対象外）。

## 公式アーカイブと端末設定

- darwin-arm64 SHA-256: `89c682593d76cd44233fa53b1563264e7de9cbb189cad169135c5b4fadfbc0a7`
- linux-x64 SHA-256: `6c172a9ab6718f7b801fb5a7bd486af2ee5e32758086a04b84fcce2aa77095e6`
- `.node-version`更新時は、導入スクリプトの公式SHAと版の整合性検査も更新する。
- 開発端末の公式24.22.1は `~/.local/share/inutaro-node/node-v24.22.1-darwin-arm64/` に導入。
- bash/zsh設定と既存node/npm/npxリンクの変更前情報は `~/.local/share/inutaro-node/` にバックアップ。すでに起動中の旧Node.jsプロセスは再起動時に切り替わる。
- 作業中に導入したHomebrew node@24は24.22.0だったため採用せず除去済み。

## 参照

- https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
- https://developers.cloudflare.com/workers/ci-cd/builds/build-image/

## レビューと再検証（2026-10-22）

PR #1・#2の差分、公式SHA、現行main、Cloudflareの実ビルド・更新履歴をレビューした。
レビューで再現した以下の境界条件を修正し、回帰検査を追加した。

| 指摘 | 修正 |
| --- | --- |
| バージョンガードが将来minorのプレリリースも受け入れる | 3要素の安定版表記と安全な整数だけを解析し、プレリリースと不正形式を拒否 |
| デプロイ引数の2個目以降を無視する | 引数なし、または`--verify-only`の1個だけを許可。余分・空の引数はダウンロード前に拒否 |
| 現行のビルド案内にNode20以降という旧要件が残る | 現在の要件を24.22.1に訂正。過去のNode20/25測定値は履歴として明記 |

元のNode.js導入方式のSHA照合・実行順序・秘密情報の非公開・通常更新の既存ガードに、今回のレビューで追加の阻害事項は見つからなかった。
Cloudflareの`NODE_VERSION`値は準備用であり、実際のプロジェクト処理の版とは区別する。プロバイダー内部の処理やGitHub-hosted runnerの組み込みランタイムのパッチ管理まで保証するものではない。
受け入れ試験は自動更新データの正確なSHA世代を記録するため、データ更新後の再検証ではpayloadを比較して世代を追記する。任意のデータを正規化して合格させない。
再検証はmain `31ad904623beab341bdb5c14f414cb412bda8c2a`のデータを基に実施し、取得日時と総視聴数以外の値が以前の受け入れpayloadと同一であることを確認した。
ローカルの全216テストは合格（失敗・skipなし）。Linux CIと本番再検証の結果は以下に追記する。
