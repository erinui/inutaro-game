# セキュリティ改修・運用確認（2026-10-27）

状態：実施中。以下は実装と確認済みの範囲。main保護・新経路の本番更新・CSP強制適用は、実運用検証後に完了記録へ更新する。

## 実装

| 対象 | 対策 | 確認 |
| --- | --- | --- |
| 公開ツール | Wrangler 4.151.3、Miniflare内Undici 7.30.1をlock、動的npx廃止 | PR #4。root/deploy監査0件、CLI dry-runとCloudflare preview成功 |
| 実行環境 | 公式Node.js 24.22.1をSHA照合、実版検査 | 起動前guardとbootstrapを維持 |
| CIブラウザ | Playwright 1.64.1＋公式Chrome for Testing 156.0.8078.47、SHAと実版検査 | 既存216件を維持。実ブラウザ回帰成功 |
| 外部取得 | provider別URL、DNS公開IPと接続先固定、認証API転送禁止、展開後容量・12秒期限 | 不正URL/内部IP/stream超過を拒否する境界試験 |
| 権限 | 3取得ジョブ、ネットワークなしの画像処理、保存ジョブへ分離 | 実CI run 40353898005で全provider成功。branch実行はpublishをスキップ |
| 画像 | JPEG/PNG/WebP・寸法・静止画制限、ImageMagickのresource/delegate/coder policy | 実CIで現在の画像を処理。noteは上下16pxずつの黒帯のみ除去 |
| データ保存 | 通常ファイル/容量/URL/SHA再検査、native decodeなし、限定パスのPR | 失敗時保持・不正成果物拒否・base不一致・検証失敗時非マージを確認 |
| 再発防止 | Actions公式SHA、lock、PR/週次audit、Dependabot | audit0件。必須verifyにも両依存のauditを実行 |
| 防御ヘッダー | nosniff/referrer/frame/permissions、短期HSTS、CSP強制適用 | Report-Onlyの実Cloudflareプレビューで8ページ・259 immutable assets・ゲーム・画像・解析を検証。CSP違反0件 |

更新PRに含めるのはprovider出力と、その正確な世代を記録する2つの受け入れfixture JSONだけ。任意のソース変更を許可する正規化は行わない。画像・コードの過去のhash付きファイルは削除しない。

最新動画の追加で既存フォント分割が100KBの予算を超えていた。元フォント全体の字形・メトリクス・coverageを保ち再分割し、390/1440px×DPR1/2で配置一致、83,160 bytesを確認。新しいデータを古い内容へ戻したり性能基準を緩めたりしていない。

## 権限と秘密情報

- `YOUTUBE_API_KEY`：YouTube取得stepだけ。SUZURI・画像処理・保存に渡さない。
- `SUZURI_ACCESS_TOKEN`：SUZURI取得stepだけ。欠落時はskipし以前の正常データを保持。
- note：API secretなし。対象RSS・記事と実測した画像CDNだけを許可。
- 取得・画像ジョブのGITHUB_TOKENはcontents:read。checkoutの認証を保持しない。
- 保存stepのGITHUB_TOKENはcontents/pull-requests/actionsの必要権限。既存mainの信頼したスクリプトで検査し、候補コード・画像デコーダーを起動しない。
- Cloudflare：静的assetsのみ。runtime secret/bindingなし。ビルド用tokenはCloudflare側で管理。
- 第三者API側のキー制限・tokenスコープは、GitHub secret名からは確認できない。漏えいは未確認であり、一斉失効は実施していない。

## 更新と失敗時の対応

1. 4時間ごと（UTC `10 */4`）または手動で3サービスを取得。
2. 画像処理はネットワークnamespaceを分離し、秘密情報なし・非rootで実行。
3. provider単位で候補を検証。不正・失敗したproviderは以前の正常ファイルを保持。
4. mainが取得開始時点のbaseと異なる場合は古い候補を破棄し、現在のmainから手動で再実行する。force pushしない。
5. データPRを作成し、GITHUB_TOKEN作成PRでも起動するようverifyを明示dispatchする。正確なheadの成功とbase不変を再確認してからマージ。
6. 検証不合格・時間切れではPRを残しマージしない。原因修正後、新しいrunとして取得からやり直す。

成功した更新はCloudflare Buildsで同じmain commitの成功を確認し、実配信JSON・画像・TOPを確認する。将来の新タイトルでフォント予算が超過した場合もCIを緩めず、分割フォントを字形・配置比較後に再生成する。

## 復旧

公開の不具合では、既知の正常な静的versionへCloudflareのrolloutで戻す。現行参照中のhash画像を失う過去ソースへの単純rollbackや、脆弱なNode/Undici/browserへのdowngradeをしない。更新処理だけの不具合ではworkflowを一時停止して旧正常データを配信し、修正PRを同じverifyで検証する。main保護は緊急時にも原則維持し、CIで合格した修正PRで復旧する。

CSPの互換性問題では対象の必要な配信元を調査し、Report-Onlyへ戻す変更をPR化できる。script-srcへunsafe-inline/unsafe-evalや任意hostを追加しない。HSTSはmax-age=300から開始しincludeSubDomains/preloadなし。解除にも最大5分の残存がある。

## 残る端末作業

普段使うGoogle Chromeの155.0.8059.85は、別途配布Chrome for Testingを導入しただけでは更新済みにならない。内部設定URLはブラウザ操作ポリシーで開けず、端末側の更新・再起動・実行版検査は未完了。未保存作業を守るため、再起動の許可待ちとしてサイト側と分けて記録する。

## 証跡

- [依存更新 PR #4](https://github.com/erinui/inutaro-game/pull/4)
- [取得・画像・保存の分離 PR #5](https://github.com/erinui/inutaro-game/pull/5)
- [3サービス実取得と隔離画像処理](https://github.com/erinui/inutaro-game/actions/runs/40353898005)
- [公式Undici勧告](https://github.com/nodejs/undici/security/advisories/GHSA-xjj6-f33q-929c)
- [Google Chrome修正情報](https://chromereleases.googleblog.com/2026/10/stable-channel-update-for-desktop_02018666648.html)
