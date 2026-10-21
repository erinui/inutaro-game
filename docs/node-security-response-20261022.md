# Node.js セキュリティ対応計画・実施記録（2026-10-22）

## 目的と範囲

Node.js 2026-10-21のセキュリティ更新に対応する。基準は24.22.1。
公開サイトはWorkers Static AssetsでありNode.jsの公開サーバーはない。
外部API・RSS・画像を取得する更新ジョブ、CI、Cloudflare Builds、開発環境を対象とする。
個別CVEの攻撃成立や侵害を確認したものではない。20系・25系はEOLのため継続使用しない。

## 計画と完了条件

1. `.node-version`を共通基準にし、両workflowで参照する。
2. CI、公開ビルド、自動更新の入口で24.22.1未満と別majorを拒否する。
3. 公式バイナリのSHA-256を照合し、修正版で既存全テストと隔離ビルドを実行する。
4. 取得処理を隔離出力先で検証する。本番データとsecretをログへ出さない。
5. 関係ファイルだけを最新mainへ反映し、CIと本番ビルドのNodeバージョン・成功を確認する。
6. 開発端末も修正版を使用する。既存の別作業の変更は含めない。

## 変更方針

`.node-version`に正確な導入版を記録する。ガードは同じmajorのそれ以降のminor/patchも許可する。
CloudflareのNODE_VERSION環境変数が別値を指定している場合は合わせて更新する。
ガードは公開ファイルや外部データに書き込みを始める前に検査する。
ゲーム、画面、収集周期、APIの利用目的、公開ファイルの許可リストは変更しない。
checkout/setup-node/upload-artifactはv6、cacheはv5へ更新する。各action.ymlのruns.using=node24を公式リポジトリで確認した。アクション自体のパッチレベルはGitHub-hosted runnerが管理するため、setup-nodeの指定とは区別する。
追加のURL制限やsecret分離は今回のランタイム修正とは別の改善として扱う。

## 参照

- https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
- https://developers.cloudflare.com/workers/ci-cd/builds/build-image/

## 実施結果

- 公式darwin-arm64バイナリのSHA-256: `89c682593d76cd44233fa53b1563264e7de9cbb189cad169135c5b4fadfbc0a7`（公式SHASUMSと一致）。
- 修正版24.22.1で既存211件が全件合格。追加した境界値と承認差分の2件も合格。
- 最新mainから作成した隔離候補で、修正前後の公開277ファイルがbytes単位で完全一致。
- 隔離出力先でnoteの実RSS・記事・画像取得と出力検証が成功。本番データの更新はしていない。
- 開発端末は公式24.22.1をユーザー領域へ導入。bash/zshのPATHと既存コマンドリンクを変更し、元設定・元リンク先を `~/.local/share/inutaro-node/` に保存。古い実行中プロセスは再起動まで旧ランタイムのまま。
- Homebrewのnode@24は24.22.0だったため採用せず、今回導入した当該パッケージは除去済み。依存ライブラリが更新されたため、既存コマンドリンクも公式修正版へ統一した。
- GitHub CI・本番ビルド・実更新の検証は続行中。
